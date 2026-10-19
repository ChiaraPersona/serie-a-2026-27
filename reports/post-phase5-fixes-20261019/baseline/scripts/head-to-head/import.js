const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const ROOT = path.resolve(__dirname, "../..");
const MATCHES_FILE = path.join(ROOT, "data/normalized/matches.json");
const COMPLETED_TEAMS_FILE = path.join(ROOT, "data/sources/team-pages/completed-teams-2026-27.json");
const REMAINING_TEAMS_FILE = path.join(ROOT, "data/sources/team-pages/remaining-teams-2026-27.json");
const RAW_ROOT = path.join(ROOT, "data/raw/head-to-head/espn");
const OUTPUT_FILE = path.join(ROOT, "data/generated/head-to-head/first-leg-2026-27.json");
const SUMMARY_FILE = path.join(ROOT, "data/generated/head-to-head/first-leg-2026-27-summary.json");
const REPORT_FILE = path.join(ROOT, "data/generated/head-to-head/import-report.json");
const LEAGUES = [
  { id: "ita.1", name: "Serie A" },
  { id: "ita.2", name: "Serie B" },
  { id: "ita.coppa_italia", name: "Coppa Italia" }
];
const DEFAULT_SEASONS = Array.from({ length: 27 }, (_, index) => `${1999 + index}-${String(index).padStart(2, "0")}`);
const args = process.argv.slice(2);
const option = (name, fallback = null) => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1] : fallback;
};
const flag = name => args.includes(`--${name}`);
const ensure = file => fs.mkdirSync(path.dirname(file), { recursive: true });
const read = file => JSON.parse(fs.readFileSync(file, "utf8"));
const write = (file, value) => {
  ensure(file);
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
};
const writeGzip = (file, value) => {
  ensure(file);
  fs.writeFileSync(file, zlib.gzipSync(Buffer.from(JSON.stringify(value))));
};
const readGzip = file => JSON.parse(zlib.gunzipSync(fs.readFileSync(file)));
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function request(url, attempts = 3) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30000);
    try {
      const response = await fetch(url, {
        headers: { accept: "application/json", "user-agent": "serie-a-2026-27-h2h-importer/1.0" },
        signal: controller.signal
      });
      if (!response.ok) throw new Error(`ESPN ${response.status}: ${url}`);
      return await response.json();
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await sleep(750 * attempt);
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError;
}

async function cachedRequest(url, file, refresh) {
  if (!refresh && fs.existsSync(file)) return readGzip(file);
  const retrievedAt = new Date().toISOString();
  const payload = await request(url);
  const raw = { retrievedAt, url, payload };
  writeGzip(file, raw);
  return raw;
}

function teamMap() {
  const completed = read(COMPLETED_TEAMS_FILE).teams;
  const remaining = read(REMAINING_TEAMS_FILE).teams;
  const configured = { ...completed, ...remaining, milan: { name: "Milan", espnTeamId: "103" } };
  const providerAliases = { venezia: ["241"] };
  const teams = new Map(Object.entries(configured).map(([id, team]) => [id, {
    id,
    name: team.name,
    espnTeamId: String(team.espnTeamId),
    espnTeamIds: [String(team.espnTeamId), ...(providerAliases[id] || [])]
  }]));
  if (teams.size !== 20) throw new Error(`Mapping ESPN incompleto: ${teams.size}/20 squadre.`);
  return teams;
}

function firstLegPairs(selectedPair) {
  const matches = read(MATCHES_FILE).filter(match => match.matchday <= 19);
  const pairs = matches.map(match => ({
    fixtureId: match.id,
    matchday: match.matchday,
    date: match.date,
    homeTeamId: match.homeTeam,
    awayTeamId: match.awayTeam,
    pairKey: [match.homeTeam, match.awayTeam].sort().join("|")
  }));
  if (!selectedPair) return pairs;
  const wanted = selectedPair.split(",").map(value => value.trim()).sort().join("|");
  return pairs.filter(pair => pair.pairKey === wanted);
}

const rangeFor = season => {
  const startYear = Number(season.slice(0, 4));
  if (!Number.isInteger(startYear)) throw new Error(`Stagione non valida: ${season}`);
  return `${startYear}0801-${startYear + 1}0731`;
};

const competitionFor = event => event.competitions?.[0];
const participantsFor = event => competitionFor(event)?.competitors || [];
const pairKeyForEvent = (event, providerToLocal) => {
  const ids = participantsFor(event).map(row => providerToLocal.get(String(row.team?.id))).filter(Boolean);
  return ids.length === 2 ? ids.sort().join("|") : null;
};

async function parallel(items, limit, worker) {
  const output = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next++;
      output[index] = await worker(items[index], index);
    }
  }));
  return output;
}

function eventTeam(event, side, providerToLocal) {
  const row = participantsFor(event).find(item => item.homeAway === side);
  const localId = providerToLocal.get(String(row?.team?.id));
  return { id: localId || null, providerId: row?.team?.id ? String(row.team.id) : null, name: row?.team?.displayName || row?.team?.name || null };
}

const statValue = (summary, providerTeamId, name) => {
  const team = summary.boxscore?.teams?.find(row => String(row.team?.id) === String(providerTeamId));
  const raw = team?.statistics?.find(stat => stat.name === name)?.displayValue;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
};

function normalizeDetail(candidate, raw, providerToLocal) {
  const event = candidate.event;
  const summary = raw.payload;
  const homeTeam = eventTeam(event, "home", providerToLocal);
  const awayTeam = eventTeam(event, "away", providerToLocal);
  const keyEvents = summary.keyEvents || [];
  const goals = keyEvents.filter(item => item.scoringPlay && !item.shootout).map(item => ({
    playerId: item.participants?.[0]?.athlete?.id ? String(item.participants[0].athlete.id) : null,
    player: item.participants?.[0]?.athlete?.displayName || null,
    teamId: providerToLocal.get(String(item.team?.id)) || null,
    team: item.team?.displayName || null,
    minute: item.clock?.displayValue || null,
    type: item.type?.type || null,
    ownGoal: /own goal/i.test(`${item.type?.text || ""} ${item.text || ""}`),
    text: item.text || null
  }));
  const bookings = keyEvents.filter(item => /yellow/.test(item.type?.type || "")).map(item => ({
    playerId: item.participants?.[0]?.athlete?.id ? String(item.participants[0].athlete.id) : null,
    player: item.participants?.[0]?.athlete?.displayName || null,
    teamId: providerToLocal.get(String(item.team?.id)) || null,
    team: item.team?.displayName || null,
    minute: item.clock?.displayValue || null,
    type: item.type?.type || null,
    text: item.text || null
  }));
  const score = {
    home: Number(participantsFor(event).find(item => item.homeAway === "home")?.score),
    away: Number(participantsFor(event).find(item => item.homeAway === "away")?.score)
  };
  const expectedGoals = Number.isFinite(score.home) && Number.isFinite(score.away) ? score.home + score.away : null;
  const expectedBookingValues = [homeTeam, awayTeam].map(team => statValue(summary, team.providerId, "yellowCards"));
  const expectedBookings = expectedBookingValues.some(value => value === null) ? null : expectedBookingValues.reduce((sum, value) => sum + value, 0);
  const missingFields = [];
  if (expectedGoals !== null && goals.length !== expectedGoals) missingFields.push("goalEvents");
  if (expectedBookings === null || bookings.length !== expectedBookings) missingFields.push("bookingEvents");
  if (goals.some(goal => !goal.player)) missingFields.push("goalScorer");
  if (bookings.some(card => !card.player)) missingFields.push("bookedPlayer");
  return {
    providerFixtureId: String(event.id),
    competition: candidate.league.name,
    date: event.date || competitionFor(event)?.date || null,
    homeTeam,
    awayTeam,
    score,
    goals,
    bookings,
    coverage: { expectedGoals, goalEvents: goals.length, expectedBookings, bookingEvents: bookings.length, missingFields },
    source: { provider: "ESPN", url: `https://www.espn.com/soccer/match/_/gameId/${event.id}`, summaryUrl: candidate.summaryUrl, retrievedAt: raw.retrievedAt }
  };
}

async function main() {
  const refresh = flag("refresh");
  const selectedPair = option("pair");
  const seasons = option("seasons")?.split(",").map(value => value.trim()).filter(Boolean) || DEFAULT_SEASONS;
  const teams = teamMap();
  const providerToLocal = new Map([...teams.values()].flatMap(team => team.espnTeamIds.map(providerId => [providerId, team.id])));
  const pairs = firstLegPairs(selectedPair);
  if (!pairs.length) throw new Error(`Nessuna partita di andata trovata${selectedPair ? ` per ${selectedPair}` : ""}.`);
  const wantedPairs = new Set(pairs.map(pair => pair.pairKey));
  const candidates = [];
  const errors = [];
  for (const season of seasons) {
    for (const league of LEAGUES) {
      const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/${league.id}/scoreboard?dates=${rangeFor(season)}&limit=1000`;
      const file = path.join(RAW_ROOT, "scoreboards", season, `${league.id}.json.gz`);
      try {
        const raw = await cachedRequest(url, file, refresh);
        for (const event of raw.payload.events || []) {
          if (!event.status?.type?.completed) continue;
          const pairKey = pairKeyForEvent(event, providerToLocal);
          if (!pairKey || !wantedPairs.has(pairKey)) continue;
          candidates.push({ event, league, season, pairKey, summaryUrl: `https://site.api.espn.com/apis/site/v2/sports/soccer/${league.id}/summary?event=${event.id}` });
        }
      } catch (error) {
        errors.push({ scope: "scoreboard", season, competition: league.name, message: error.message });
      }
    }
    console.log(`Calendari ${season}: ${candidates.length} precedenti candidati`);
  }
  const uniqueCandidates = [...new Map(candidates.map(candidate => [String(candidate.event.id), candidate])).values()];
  const selected = [...wantedPairs].flatMap(pairKey => uniqueCandidates.filter(candidate => candidate.pairKey === pairKey).sort((a, b) => new Date(b.event.date) - new Date(a.event.date)).slice(0, 5));
  const details = (await parallel(selected, 4, async (candidate, index) => {
    const file = path.join(RAW_ROOT, "summaries", `${candidate.event.id}.json.gz`);
    try {
      const raw = await cachedRequest(candidate.summaryUrl, file, refresh);
      if ((index + 1) % 25 === 0 || index + 1 === selected.length) console.log(`Dettagli: ${index + 1}/${selected.length}`);
      return normalizeDetail(candidate, raw, providerToLocal);
    } catch (error) {
      errors.push({ scope: "summary", fixtureId: String(candidate.event.id), message: error.message });
      return null;
    }
  })).filter(Boolean);
  const byPair = new Map();
  for (const detail of details) {
    const key = [detail.homeTeam.id, detail.awayTeam.id].sort().join("|");
    if (!byPair.has(key)) byPair.set(key, []);
    byPair.get(key).push(detail);
  }
  const retrievedAt = new Date().toISOString();
  const fixtures = pairs.map(pair => ({
    ...pair,
    homeTeam: teams.get(pair.homeTeamId),
    awayTeam: teams.get(pair.awayTeamId),
    previousMeetings: (byPair.get(pair.pairKey) || []).sort((a, b) => new Date(b.date) - new Date(a.date)),
    coverage: { requested: 5, available: (byPair.get(pair.pairKey) || []).length }
  }));
  const incompleteFixtures = fixtures.filter(fixture => fixture.coverage.available < 5);
  const eventGaps = details.filter(detail => detail.coverage.missingFields.length);
  const output = { schemaVersion: 1, season: "2026-27", scope: "first-leg", competitions: LEAGUES.map(league => league.name), seasonsSearched: seasons, retrievedAt, fixtures };
  const report = {
    provider: "ESPN",
    retrievedAt,
    requestedFixtures: pairs.length,
    requestedHistoricalMatches: pairs.length * 5,
    importedHistoricalMatches: details.length,
    completeFixtures: fixtures.length - incompleteFixtures.length,
    incompleteFixtures: incompleteFixtures.map(fixture => ({ fixtureId: fixture.fixtureId, available: fixture.coverage.available })),
    eventCoverageGaps: eventGaps.map(detail => ({ providerFixtureId: detail.providerFixtureId, missingFields: detail.coverage.missingFields })),
    errors
  };
  if (!selectedPair) {
    write(OUTPUT_FILE, output);
    write(SUMMARY_FILE, { schemaVersion: output.schemaVersion, season: output.season, scope: output.scope, retrievedAt: output.retrievedAt, fixtures: output.fixtures.map(fixture => ({ fixtureId: fixture.fixtureId, coverage: fixture.coverage })) });
    write(REPORT_FILE, report);
  } else {
    const pilotRoot = path.join(ROOT, "data/generated/head-to-head/pilots");
    const slug = selectedPair.split(",").map(value => value.trim()).join("-");
    write(path.join(pilotRoot, `${slug}.json`), output);
    write(path.join(pilotRoot, `${slug}-report.json`), report);
  }
  console.log(JSON.stringify(report, null, 2));
}

if (require.main === module) main().then(() => process.exit(0)).catch(error => {
  console.error(`Import scontri diretti fallito: ${error.stack || error.message}`);
  process.exit(1);
});

module.exports = { rangeFor, normalizeDetail, firstLegPairs };
