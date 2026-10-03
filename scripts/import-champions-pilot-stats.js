"use strict";

const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const root = path.resolve(__dirname, "..");
const rawRoot = path.join(root, "data/raw/champions-pilot/espn");
const outputPath = path.join(root, "data/sources/champions-pilot-match-stats-2025-27.json");
const teams = [
  { id: "aek-athens", name: "AEK Athens", espnTeamId: "887", league: "gre.1", leagueName: "Super League Greece", baselineKind: "domestic" },
  { id: "arsenal", name: "Arsenal", espnTeamId: "359", league: "eng.1", leagueName: "Premier League", baselineKind: "domestic" },
  { id: "aston-villa", name: "Aston Villa", espnTeamId: "362", league: "eng.1", leagueName: "Premier League", baselineKind: "domestic" },
  { id: "atletico-de-madrid", name: "Atlético de Madrid", espnTeamId: "1068", league: "esp.1", leagueName: "LaLiga", baselineKind: "domestic" },
  { id: "barcelona", name: "Barcelona", espnTeamId: "83", league: "esp.1", leagueName: "LaLiga", baselineKind: "domestic" },
  { id: "bayern-munchen", name: "Bayern München", espnTeamId: "132", league: "ger.1", leagueName: "Bundesliga", baselineKind: "domestic" },
  { id: "bodo-glimt", name: "Bodø/Glimt", espnTeamId: "2980", league: "nor.1", leagueName: "Eliteserien", baselineKind: "domestic" },
  { id: "borussia-dortmund", name: "Borussia Dortmund", espnTeamId: "124", league: "ger.1", leagueName: "Bundesliga", baselineKind: "domestic" },
  { id: "club-brugge", name: "Club Brugge", espnTeamId: "570", league: "bel.1", leagueName: "Pro League", baselineKind: "domestic" },
  { id: "como", name: "Como", espnTeamId: "2572", league: "ita.1", leagueName: "Serie A", baselineKind: "domestic" },
  { id: "fenerbahce", name: "Fenerbahçe", espnTeamId: "436", league: "uefa.europa", leagueName: "UEFA Europa League", baselineKind: "uefa-fallback" },
  { id: "feyenoord", name: "Feyenoord", espnTeamId: "142", league: "ned.1", leagueName: "Eredivisie", baselineKind: "domestic" },
  { id: "galatasaray", name: "Galatasaray", espnTeamId: "432", league: "uefa.champions", leagueName: "UEFA Champions League", baselineKind: "uefa-fallback" },
  { id: "inter", name: "Inter", espnTeamId: "110", league: "ita.1", leagueName: "Serie A", baselineKind: "domestic" },
  { id: "lask", name: "LASK", espnTeamId: "4411", league: "aut.1", leagueName: "Bundesliga austriaca", baselineKind: "domestic" },
  { id: "leipzig", name: "Leipzig", espnTeamId: "11420", league: "ger.1", leagueName: "Bundesliga", baselineKind: "domestic" },
  { id: "lens", name: "Lens", espnTeamId: "175", league: "fra.1", leagueName: "Ligue 1", baselineKind: "domestic" },
  { id: "lille", name: "Lille", espnTeamId: "166", league: "fra.1", leagueName: "Ligue 1", baselineKind: "domestic" },
  { id: "liverpool", name: "Liverpool", espnTeamId: "364", league: "eng.1", leagueName: "Premier League", baselineKind: "domestic" },
  { id: "manchester-city", name: "Manchester City", espnTeamId: "382", league: "eng.1", leagueName: "Premier League", baselineKind: "domestic" },
  { id: "manchester-united", name: "Manchester United", espnTeamId: "360", league: "eng.1", leagueName: "Premier League", baselineKind: "domestic" },
  { id: "napoli", name: "Napoli", espnTeamId: "114", league: "ita.1", leagueName: "Serie A", baselineKind: "domestic" },
  { id: "paris-saint-germain", name: "Paris Saint-Germain", espnTeamId: "160", league: "fra.1", leagueName: "Ligue 1", baselineKind: "domestic" },
  { id: "porto", name: "Porto", espnTeamId: "437", league: "por.1", leagueName: "Primeira Liga", baselineKind: "domestic" },
  { id: "psv-eindhoven", name: "PSV Eindhoven", espnTeamId: "148", league: "ned.1", leagueName: "Eredivisie", baselineKind: "domestic" },
  { id: "real-betis", name: "Real Betis", espnTeamId: "244", league: "esp.1", leagueName: "LaLiga", baselineKind: "domestic" },
  { id: "real-madrid", name: "Real Madrid", espnTeamId: "86", league: "esp.1", leagueName: "LaLiga", baselineKind: "domestic" },
  { id: "roma", name: "Roma", espnTeamId: "104", league: "ita.1", leagueName: "Serie A", baselineKind: "domestic" },
  { id: "sabah", name: "Sabah", espnTeamId: "21922", league: "uefa.europa.conf_qual", leagueName: "Qualificazioni UEFA Conference League", baselineKind: "uefa-fallback" },
  { id: "shakhtar-donetsk", name: "Shakhtar Donetsk", espnTeamId: "493", league: "uefa.europa.conf", leagueName: "UEFA Conference League", baselineKind: "uefa-fallback" },
  { id: "slavia-praha", name: "Slavia Praha", espnTeamId: "494", league: "uefa.champions", leagueName: "UEFA Champions League", baselineKind: "uefa-fallback" },
  { id: "slovan-bratislava", name: "Slovan Bratislava", espnTeamId: "521", league: "uefa.europa.conf", leagueName: "UEFA Conference League", baselineKind: "uefa-fallback" },
  { id: "sporting-cp", name: "Sporting CP", espnTeamId: "2250", league: "por.1", leagueName: "Primeira Liga", baselineKind: "domestic" },
  { id: "stuttgart", name: "Stuttgart", espnTeamId: "134", league: "ger.1", leagueName: "Bundesliga", baselineKind: "domestic" },
  { id: "viking", name: "Viking", espnTeamId: "510", league: "nor.1", leagueName: "Eliteserien", baselineKind: "domestic" },
  { id: "villarreal", name: "Villarreal", espnTeamId: "102", league: "esp.1", leagueName: "LaLiga", baselineKind: "domestic" }
];
const seasonBounds = {
  "2025-26": { from: "2025-07-01", to: "2026-06-30" },
  "2026-27": { from: "2026-07-01", to: null }
};
const requiredStats = ["totalShots", "shotsOnTarget", "wonCorners", "foulsCommitted", "yellowCards"];

const ensure = file => fs.mkdirSync(path.dirname(file), { recursive: true });
const writeJson = (file, value) => { ensure(file); fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`); };
const readGzip = file => JSON.parse(zlib.gunzipSync(fs.readFileSync(file)).toString("utf8"));
const writeGzip = (file, value) => { ensure(file); fs.writeFileSync(file, zlib.gzipSync(Buffer.from(JSON.stringify(value)))); };
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function request(url, attempts = 3) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30000);
    try {
      const response = await fetch(url, { headers: { accept: "application/json", "user-agent": "serie-a-2026-27-champions-pilot/1.0" }, signal: controller.signal });
      if (!response.ok) throw new Error(`ESPN ${response.status}: ${url}`);
      return await response.json();
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await sleep(attempt * 500);
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError;
}

function option(argv, name) {
  const index = argv.indexOf(name);
  return index === -1 ? null : argv[index + 1];
}

function isoDate(value, label) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || "")) || Number.isNaN(Date.parse(`${value}T00:00:00Z`))) {
    throw new Error(`${label}: data non valida ${value || "N/D"}; usa YYYY-MM-DD`);
  }
  return value;
}

function parseArgs(argv = process.argv.slice(2), today = new Date().toISOString().slice(0, 10)) {
  const asOf = isoDate(option(argv, "--as-of") || today, "--as-of");
  const teamIds = (option(argv, "--teams") || option(argv, "--team") || "")
    .split(",").map(value => value.trim()).filter(Boolean);
  const league = option(argv, "--league");
  const seasonIds = (option(argv, "--season") || "2025-26,2026-27")
    .split(",").map(value => value.trim()).filter(Boolean);
  for (const season of seasonIds) if (!seasonBounds[season]) throw new Error(`Stagione non supportata: ${season}`);
  let selectedTeams = teamIds.length ? teams.filter(team => teamIds.includes(team.id)) : [...teams];
  if (teamIds.length && selectedTeams.length !== new Set(teamIds).size) {
    const known = new Set(selectedTeams.map(team => team.id));
    throw new Error(`Team non configurato: ${teamIds.filter(id => !known.has(id)).join(", ")}`);
  }
  if (league) selectedTeams = selectedTeams.filter(team => team.league === league);
  if (!selectedTeams.length) throw new Error("Nessuna squadra selezionata");
  const seasons = seasonIds.map(id => {
    const bounds = seasonBounds[id];
    const to = bounds.to ? bounds.to : asOf;
    if (to < bounds.from) throw new Error(`${id}: as-of ${asOf} precedente all'inizio stagione ${bounds.from}`);
    return { id, from: bounds.from, to, dates: `${bounds.from.replaceAll("-", "")}-${to.replaceAll("-", "")}` };
  });
  return { asOf, league, refresh: argv.includes("--refresh"), selectedTeams, seasons };
}

function splitDateInterval(from, to, maxDays = 31) {
  const ranges = [];
  let cursor = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T00:00:00Z`);
  while (cursor <= end) {
    const rangeStart = new Date(cursor);
    const rangeEnd = new Date(Math.min(end.getTime(), rangeStart.getTime() + (maxDays - 1) * 86400000));
    const startText = rangeStart.toISOString().slice(0, 10);
    const endText = rangeEnd.toISOString().slice(0, 10);
    ranges.push({ from: startText, to: endText, dates: `${startText.replaceAll("-", "")}-${endText.replaceAll("-", "")}` });
    cursor = new Date(rangeEnd.getTime() + 86400000);
  }
  return ranges;
}

function calendarYears(from, to) {
  const start = Number(from.slice(0, 4));
  const end = Number(to.slice(0, 4));
  return Array.from({ length: end - start + 1 }, (_, index) => String(start + index));
}

async function cached(url, file, { refresh = false, fallback = null, metadata = {} } = {}) {
  if (!refresh && fs.existsSync(file)) return readGzip(file);
  if (!refresh && fallback && fs.existsSync(fallback)) return readGzip(fallback);
  const value = { retrievedAt: new Date().toISOString(), url, ...metadata, payload: await request(url) };
  writeGzip(file, value);
  return value;
}

const competition = event => event.competitions?.[0];
const competitors = event => competition(event)?.competitors || [];
const isFinished = event => ["STATUS_FINAL", "STATUS_FULL_TIME", "STATUS_FINAL_AET", "STATUS_FINAL_PEN"].includes(event.status?.type?.name);
const number = value => {
  const text = String(value ?? "").trim();
  if (!text || ["--", "-", "N/A", "null"].includes(text)) return null;
  const parsed = Number(text.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
};
const stats = row => Object.fromEntries((row?.statistics || []).map(item => [item.name, number(item.displayValue)]));
const cleanStats = values => {
  const output = Object.fromEntries(requiredStats.map(key => [key, values[key] ?? null]));
  const placeholder = ["totalShots", "shotsOnTarget", "wonCorners", "foulsCommitted"].every(key => output[key] === 0);
  if (placeholder) for (const key of ["totalShots", "shotsOnTarget", "wonCorners", "foulsCommitted"]) output[key] = null;
  return output;
};

async function parallel(items, limit, worker) {
  let next = 0;
  const output = new Array(items.length);
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next++;
      output[index] = await worker(items[index]);
    }
  }));
  return output;
}

function eventDate(event) {
  return event.date?.slice(0, 10) || null;
}

function eventHasTeam(event, providerTeamIds) {
  return competitors(event).some(side => providerTeamIds.has(String(side.team?.id || "")));
}

function summaryEventDate(payload) {
  return payload?.header?.competitions?.[0]?.date?.slice(0, 10) || null;
}

async function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  const selectedProviderTeamIds = new Set(args.selectedTeams.map(team => team.espnTeamId));
  const selectedLeagues = [...new Set(args.selectedTeams.map(team => team.league))];
  const jobs = [];
  const scoreboards = [];
  for (const season of args.seasons) {
    for (const league of selectedLeagues) {
      for (const year of calendarYears(season.from, season.to)) {
        const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/${league}/scoreboard?dates=${year}&limit=1000`;
        const versioned = path.join(rawRoot, "scoreboards", season.id, league, `${year}-as-of-${args.asOf}.json.gz`);
        const raw = await cached(url, versioned, { refresh: args.refresh, metadata: { season: season.id, league, asOf: args.asOf, calendarYear: year, dateInterval: { from: season.from, to: season.to } } });
        const eligible = (raw.payload.events || []).filter(event => {
          const date = eventDate(event);
          return date && date >= season.from && date <= season.to;
        });
        const selected = eligible.filter(event => eventHasTeam(event, selectedProviderTeamIds));
        scoreboards.push({ season: season.id, league, calendarYear: year, dateInterval: { from: season.from, to: season.to }, retrievedAt: raw.retrievedAt, url, events: raw.payload.events?.length || 0, eligibleEvents: eligible.length, selectedTeamEvents: selected.length });
        for (const event of selected) {
          if (!isFinished(event)) continue;
          jobs.push({ season: season.id, league, event });
        }
      }
    }
  }
  const uniqueJobs = [...new Map(jobs.map(job => [String(job.event.id), job])).values()];
  const imported = await parallel(uniqueJobs, 6, async job => {
    const eventId = String(job.event.id);
    const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/${job.league}/summary?event=${eventId}`;
    const versioned = job.season === "2026-27"
      ? path.join(rawRoot, "summaries", job.season, job.league, args.asOf, `${eventId}.json.gz`)
      : path.join(rawRoot, "summaries", job.season, job.league, `${eventId}.json.gz`);
    const legacy = path.join(rawRoot, "summaries", job.season, job.league, `${eventId}.json.gz`);
    const raw = await cached(url, versioned, { refresh: args.refresh, fallback: legacy, metadata: { season: job.season, league: job.league, eventId, eventDate: eventDate(job.event), asOf: args.asOf } });
    const date = eventDate(job.event) || summaryEventDate(raw.payload);
    if (!date || date > args.asOf) throw new Error(`${eventId}: evento successivo all'as-of ${args.asOf}`);
    const boxscore = raw.payload.boxscore?.teams || [];
    const sides = ["home", "away"].map(homeAway => {
      const eventSide = competitors(job.event).find(item => item.homeAway === homeAway);
      const providerTeamId = String(eventSide?.team?.id || "");
      const boxSide = boxscore.find(item => String(item.team?.id || "") === providerTeamId);
      const values = cleanStats(stats(boxSide));
      return {
        homeAway,
        providerTeamId,
        name: eventSide?.team?.displayName || eventSide?.team?.name || null,
        score: number(eventSide?.score),
        statistics: values
      };
    });
    const missing = sides.flatMap(side => requiredStats.filter(key => side.statistics[key] == null).map(key => `${side.homeAway}.${key}`));
    return {
      eventId,
      season: job.season,
      league: job.league,
      date,
      home: sides[0],
      away: sides[1],
      coverage: missing.length ? "partial" : "complete",
      missing,
      source: { provider: "ESPN", url: `https://www.espn.com/soccer/match/_/gameId/${eventId}`, summaryUrl: url, retrievedAt: raw.retrievedAt }
    };
  });
  const importedMatches = imported.filter(match => match.home.score != null && match.away.score != null);
  const previous = fs.existsSync(outputPath) ? JSON.parse(fs.readFileSync(outputPath, "utf8")) : { matches: [], scoreboards: [] };
  const selectedSeasonIds = new Set(args.seasons.map(season => season.id));
  const selectedLeagueSet = new Set(selectedLeagues);
  const replaced = (previous.matches || []).filter(match => !(
    selectedSeasonIds.has(match.season)
    && selectedLeagueSet.has(match.league)
    && (selectedProviderTeamIds.has(match.home?.providerTeamId) || selectedProviderTeamIds.has(match.away?.providerTeamId))
  ));
  const matches = [...new Map([...replaced, ...importedMatches].map(match => [`${match.season}|${match.league}|${match.eventId}`, match])).values()]
    .sort((a, b) => a.date.localeCompare(b.date) || a.eventId.localeCompare(b.eventId));
  const teamCoverage = teams.map(team => {
    const rows = matches.filter(match => match.home.providerTeamId === team.espnTeamId || match.away.providerTeamId === team.espnTeamId);
    return { teamId: team.id, team: team.name, matches: rows.length, completeMatches: rows.filter(row => row.coverage === "complete").length, baselineKind: team.baselineKind };
  });
  const output = {
    schemaVersion: 2,
    scope: "Champions League 2026/27: profili quantitativi delle 36 partecipanti, con baseline domestica quando disponibile e fallback UEFA esplicito",
    retrievedAt: [...matches.map(match => match.source.retrievedAt)].sort().at(-1) || null,
    asOf: args.asOf,
    cutoffDate: args.asOf,
    dateIntervals: args.seasons.map(({ id, from, to }) => ({ season: id, from, to })),
    lastImport: {
      asOf: args.asOf,
      retrievedAt: importedMatches.map(match => match.source.retrievedAt).filter(Boolean).sort().at(-1) || null,
      teams: args.selectedTeams.map(team => team.id),
      leagues: selectedLeagues,
      seasons: args.seasons.map(season => season.id),
      matches: importedMatches.length
    },
    teams,
    seasons: Object.entries(seasonBounds).map(([id, bounds]) => ({ id, dates: `${bounds.from.replaceAll("-", "")}-${(bounds.to || args.asOf).replaceAll("-", "")}` })),
    metrics: requiredStats,
    summary: { matches: matches.length, completeMatches: matches.filter(match => match.coverage === "complete").length, teams: teams.length },
    teamCoverage,
    scoreboards: [...(previous.scoreboards || []).filter(item => !(selectedSeasonIds.has(item.season) && selectedLeagueSet.has(item.league))), ...scoreboards],
    matches
  };
  writeJson(outputPath, output);
  console.log(`OK import Champions as-of ${args.asOf}: ${importedMatches.length} gare · ${args.selectedTeams.length} squadre (${args.selectedTeams.map(team => team.id).join(", ")})`);
  return output;
}

if (require.main === module) main().catch(error => { console.error(error.stack || error.message); process.exitCode = 1; });

module.exports = { teams, seasonBounds, parseArgs, splitDateInterval, calendarYears, eventDate, eventHasTeam, cleanStats, main };
