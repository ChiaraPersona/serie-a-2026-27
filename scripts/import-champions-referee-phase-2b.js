"use strict";

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const root = path.resolve(__dirname, "..");
const snapshotDate = "2026-10-13";
const rawRoot = path.join(root, "data/raw/champions-referee-phase-2b", snapshotDate);
const outRoot = path.join(root, "data/analysis/champions/referee-phase-2b");
const existingSummaryRoot = path.join(root, "data/raw/champions-pilot/espn/summaries");
const existingRegistryPath = path.join(root, "data/sources/champions-referees/registry-2026-27.json");
const seasons = [
  { season: "2021-22", seasonYear: 2022, espnStartYear: 2021, expected: 125, target: false },
  { season: "2022-23", seasonYear: 2023, espnStartYear: 2022, expected: 125, target: true },
  { season: "2023-24", seasonYear: 2024, espnStartYear: 2023, expected: 125, target: true },
  { season: "2024-25", seasonYear: 2025, espnStartYear: 2024, expected: 189, target: true },
  { season: "2025-26", seasonYear: 2026, espnStartYear: 2025, expected: 189, target: true }
];

const ensure = file => fs.mkdirSync(path.dirname(file), { recursive: true });
const writeJson = (file, value) => { ensure(file); fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`); };
const writeGzip = (file, value) => { ensure(file); fs.writeFileSync(file, zlib.gzipSync(Buffer.from(JSON.stringify(value)))); };
const readGzip = file => JSON.parse(zlib.gunzipSync(fs.readFileSync(file)).toString("utf8"));
const sha256 = file => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
const rel = file => path.relative(root, file).replaceAll("\\", "/");
const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
const finite = value => Number.isFinite(value);
const number = value => {
  const parsed = Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
};
const round = (value, digits = 6) => value == null ? null : Number(value.toFixed(digits));

function normalize(value) {
  return String(value || "").replace(/[øØ]/g, "o").replace(/[æÆ]/g, "ae").replace(/[ß]/g, "ss")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

const aliases = new Map(Object.entries({
  "ac milan": "milan", "milan ac": "milan", "internazionale": "inter", "inter milan": "inter", "fc internazionale milano": "inter",
  "fc bayern munchen": "bayern munchen", "bayern munich": "bayern munchen", "paris saint germain": "paris saint germain",
  "paris saint germain fc": "paris saint germain", "psg": "paris saint germain", "sporting lisbon": "sporting cp",
  "sporting clube de portugal": "sporting cp", "fc copenhagen": "kobenhavn", "fc kobenhavn": "kobenhavn", "copenhagen": "kobenhavn", "kobenhavn": "kobenhavn",
  "red star belgrade": "crvena zvezda", "fk crvena zvezda": "crvena zvezda", "rb leipzig": "leipzig",
  "bayer 04 leverkusen": "bayer leverkusen", "borussia monchengladbach": "monchengladbach", "shakhtar donetsk": "shakhtar donetsk",
  "man city": "manchester city", "man united": "manchester united", "atletico madrid": "atletico de madrid",
  "athletic club": "athletic bilbao", "olympiacos": "olympiakos", "olympiacos fc": "olympiakos",
  "marseille": "olympique marseille", "slavia prague": "slavia praha", "sparta prague": "sparta praha",
  "bodo glimt": "bodo glimt", "qarabag fk": "qarabag", "young boys": "young boys", "bsc young boys": "young boys",
  "club brugge": "club brugge", "club brugge kv": "club brugge", "psv eindhoven": "psv", "psv": "psv",
  "dynamo kyiv": "dynamo kiev", "dinamo kiev": "dynamo kiev", "benfica": "benfica", "sl benfica": "benfica",
  "fc porto": "porto", "porto": "porto", "celtic fc": "celtic", "celtic": "celtic",
  "gnk dinamo": "dinamo zagreb", "dinamo zagreb": "dinamo zagreb", "fc salzburg": "salzburg", "rb salzburg": "salzburg", "ssc napoli": "napoli"
}));

function teamKey(value) {
  let key = normalize(value);
  key = key.replace(/\b(f|c|a|s|k|v|fc|cf|afc|sc|sk|fk|rsc|ssc|ac|as|ss|sv|bv|calcio|football club|futebol clube)\b/g, " ").replace(/\s+/g, " ").trim();
  return aliases.get(normalize(value)) || aliases.get(key) || key;
}

function tokens(value) { return new Set(teamKey(value).split(" ").filter(token => token.length > 1)); }
function similarity(left, right) {
  const a = teamKey(left), b = teamKey(right);
  if (a === b) return 1;
  if (a.includes(b) || b.includes(a)) return 0.9;
  const ta = tokens(a), tb = tokens(b);
  const intersection = [...ta].filter(token => tb.has(token)).length;
  const union = new Set([...ta, ...tb]).size;
  return union ? intersection / union : 0;
}

async function requestJson(url, attempts = 4) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, { headers: { accept: "application/json", "user-agent": "serie-a-2026-27-referee-phase-2b/1.0" } });
      if (!response.ok) throw new Error(`${response.status} ${url}`);
      return await response.json();
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await sleep(attempt * 600);
    }
  }
  throw lastError;
}

async function cached(url, file) {
  if (fs.existsSync(file)) return readGzip(file);
  const wrapper = { retrievedAt: new Date().toISOString(), url, payload: await requestJson(url) };
  writeGzip(file, wrapper);
  return wrapper;
}

async function parallel(items, limit, worker) {
  let cursor = 0;
  const output = new Array(items.length);
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      output[index] = await worker(items[index], index);
    }
  }));
  return output;
}

function listFiles(directory, predicate = () => true) {
  if (!fs.existsSync(directory)) return [];
  const output = [];
  const visit = current => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const target = path.join(current, entry.name);
      if (entry.isDirectory()) visit(target);
      else if (predicate(target)) output.push(target);
    }
  };
  visit(directory);
  return output;
}

function eventInfo(event) {
  const competition = event.competitions?.[0] || {};
  const side = homeAway => competition.competitors?.find(row => row.homeAway === homeAway);
  const home = side("home"), away = side("away");
  return {
    eventId: String(event.id), date: String(event.date || competition.date || "").slice(0, 10), kickoffUtc: competition.date || event.date || null,
    home: { id: String(home?.team?.id || ""), name: home?.team?.displayName || home?.team?.name || null, score: number(home?.score) },
    away: { id: String(away?.team?.id || ""), name: away?.team?.displayName || away?.team?.name || null, score: number(away?.score) }
  };
}

function matchScore(official, candidate) {
  const home = similarity(official.homeTeam.name, candidate.home.name);
  const away = similarity(official.awayTeam.name, candidate.away.name);
  const expectedScore = official.scoreTotal || official.score90;
  const scoreBonus = candidate.home.score === expectedScore.home && candidate.away.score === expectedScore.away ? 0.5 : 0;
  return { total: home + away + scoreBonus, home, away, scoreBonus };
}

function matchOfficialToEspn(officialMatches, events) {
  const used = new Set();
  const rows = [];
  const unmatched = [];
  for (const official of officialMatches) {
    const candidates = events.map(eventInfo).filter(candidate => candidate.date === official.date && !used.has(candidate.eventId))
      .map(candidate => ({ candidate, score: matchScore(official, candidate) }))
      .sort((a, b) => b.score.total - a.score.total || a.candidate.eventId.localeCompare(b.candidate.eventId));
    const best = candidates[0], second = candidates[1];
    const accepted = best && best.score.home >= 0.5 && best.score.away >= 0.5 && best.score.total >= 1.5 && (!second || best.score.total - second.score.total >= 0.2);
    if (!accepted) {
      unmatched.push({ official, candidates: candidates.slice(0, 3) });
      continue;
    }
    used.add(best.candidate.eventId);
    rows.push({ official, espn: best.candidate, matchScore: round(best.score.total, 3), nameScores: { home: round(best.score.home, 3), away: round(best.score.away, 3) } });
  }
  return { rows, unmatched };
}

function officialTeam(value) {
  return {
    id: String(value?.id || ""),
    name: value?.translations?.displayOfficialName?.EN || value?.internationalName || null,
    countryCode: value?.countryCode || null
  };
}

function parseOfficial(row, season) {
  return {
    uefaMatchId: String(row.id), season: season.season, targetSeason: season.target,
    date: row.kickOffTime?.date || null, kickoffUtc: row.kickOffTime?.dateTime || null,
    roundName: row.round?.translations?.name?.EN || row.round?.metaData?.name || null,
    matchday: row.matchday?.sequenceNumber == null ? null : Number(row.matchday.sequenceNumber),
    homeTeam: officialTeam(row.homeTeam), awayTeam: officialTeam(row.awayTeam),
    score90: row.score?.regular ? { home: row.score.regular.home, away: row.score.regular.away } : null,
    scoreTotal: row.score?.total ? { home: row.score.total.home, away: row.score.total.away } : null
  };
}

function statsMap(row) {
  return Object.fromEntries((row?.statistics || row?.stats || []).map(stat => [stat.name, number(stat.value ?? stat.displayValue)]));
}

function keyEventCards(payload) {
  return (payload.keyEvents || []).filter(event => ["yellow-card", "red-card"].includes(event.type?.type)).map(event => {
    const secondYellow = event.type.type === "red-card" && /second yellow/i.test(event.text || "");
    return {
      eventId: String(event.id || ""), teamId: String(event.team?.id || ""), athleteId: event.participants?.[0]?.athlete?.id ? String(event.participants[0].athlete.id) : null,
      athleteName: event.participants?.[0]?.athlete?.displayName || null, minute: event.clock?.displayValue || null,
      elapsedMinute: finite(number(event.clock?.value)) ? Math.ceil(number(event.clock.value) / 60) : null,
      type: event.type.type === "yellow-card" ? "ordinary-yellow" : secondYellow ? "second-yellow" : "direct-red",
      text: event.text || null
    };
  });
}

function penaltyEvents(payload) {
  return (payload.keyEvents || []).filter(event => !event.shootout && (event.penaltyKick || String(event.type?.type || "").startsWith("penalty---")))
    .map(event => ({ eventId: String(event.id || ""), teamId: String(event.team?.id || ""), athleteId: event.participants?.[0]?.athlete?.id ? String(event.participants[0].athlete.id) : null, result: event.type?.type || null, minute: event.clock?.displayValue || null }));
}

function matchLength(payload) {
  return (payload.keyEvents || []).some(event => ["start-extra-time", "end-extra-time", "start-2nd-half-extra-time"].includes(event.type?.type)) ? 120 : 90;
}

function substitutionIndex(payload) {
  const index = new Map();
  for (const event of (payload.keyEvents || []).filter(item => item.type?.type === "substitution")) {
    const minute = Math.min(matchLength(payload), Math.ceil((event.clock?.value || 0) / 60));
    const entrant = event.participants?.[0]?.athlete?.id, exit = event.participants?.[1]?.athlete?.id;
    if (entrant) index.set(String(entrant), { ...(index.get(String(entrant)) || {}), in: minute });
    if (exit) index.set(String(exit), { ...(index.get(String(exit)) || {}), out: minute });
  }
  return index;
}

function parseSummary(link, wrapper) {
  const payload = wrapper.payload;
  const competition = payload.header?.competitions?.[0] || {};
  const refereeName = payload.gameInfo?.officials?.find(row => row.order === 1)?.fullName || payload.gameInfo?.officials?.[0]?.fullName || null;
  const cards = keyEventCards(payload), penalties = penaltyEvents(payload), duration = matchLength(payload), substitutions = substitutionIndex(payload);
  const boxByTeam = new Map((payload.boxscore?.teams || []).map(row => [String(row.team?.id || ""), { name: row.team?.displayName || null, stats: statsMap(row) }]));
  const players = [];
  const excludedDiscipline = [];
  const rosterByAthlete = new Map();
  for (const teamRoster of payload.rosters || []) {
    const teamId = String(teamRoster.team?.id || "");
    for (const row of teamRoster.roster || []) {
      const athleteId = row.athlete?.id ? String(row.athlete.id) : null;
      if (!athleteId) continue;
      const playerStats = statsMap(row);
      const appeared = (playerStats.appearances || 0) > 0;
      const sub = substitutions.get(athleteId) || {};
      const playerCards = cards.filter(card => card.athleteId === athleteId);
      const dismissalMinute = playerCards.filter(card => card.type !== "ordinary-yellow" && finite(card.elapsedMinute))
        .reduce((minimum, card) => minimum == null ? card.elapsedMinute : Math.min(minimum, card.elapsedMinute), null);
      const startMinute = row.starter ? 0 : finite(sub.in) ? sub.in : null;
      const observedExitMinute = finite(sub.out) && finite(dismissalMinute) ? Math.min(sub.out, dismissalMinute) : finite(sub.out) ? sub.out : dismissalMinute;
      const endMinute = finite(observedExitMinute) ? Math.min(duration, observedExitMinute) : appeared ? duration : null;
      const minutesPlayed = finite(startMinute) && finite(endMinute) ? Math.max(0, endMinute - startMinute) : null;
      const record = {
        matchId: `ucl:${link.official.season}:${link.official.uefaMatchId}`, season: link.official.season, kickoffUtc: link.official.kickoffUtc,
        playerId: `espn-player:${athleteId}`, providerPlayerId: athleteId, playerName: row.athlete?.displayName || row.athlete?.fullName || null,
        teamId: teamId, teamName: teamRoster.team?.displayName || null, role: row.position?.name || row.position?.displayName || null,
        appeared, starter: Boolean(row.starter), minutesPlayed, minutesPolicy: minutesPlayed == null ? "UNAVAILABLE" : "DERIVED_FROM_STARTER_SUBSTITUTION_AND_DISMISSAL_CLOCK_POST_MATCH_ONLY",
        yellowCards: playerCards.filter(card => card.type === "ordinary-yellow").length,
        secondYellowCards: playerCards.filter(card => card.type === "second-yellow").length,
        directRedCards: playerCards.filter(card => card.type === "direct-red").length,
        totalCards: playerCards.length, foulsCommitted: playerStats.foulsCommitted,
        providerStats: { yellowCards: playerStats.yellowCards, redCards: playerStats.redCards, appearances: playerStats.appearances },
        roleTemporalStatus: "POST_MATCH_ROSTER_METADATA_NOT_PROVEN_PRE_KICKOFF",
        participationTemporalStatus: "POST_MATCH_OUTCOME_ONLY",
        source: { provider: "ESPN", eventId: link.espn.eventId, rawPath: rel(wrapper.__file), retrievedAt: wrapper.retrievedAt }
      };
      rosterByAthlete.set(athleteId, record);
      if (appeared) players.push(record);
      else if (playerCards.length) excludedDiscipline.push({ athleteId, playerName: record.playerName, teamId, reason: "ROSTERED_BUT_DID_NOT_APPEAR", cards: playerCards });
    }
  }
  for (const card of cards) if (!card.athleteId || !rosterByAthlete.has(card.athleteId)) excludedDiscipline.push({ ...card, reason: card.athleteId ? "ATHLETE_NOT_IN_ROSTER" : "NO_ATHLETE_PARTICIPANT" });

  const side = homeAway => competition.competitors?.find(row => row.homeAway === homeAway);
  const teams = ["home", "away"].map(homeAway => {
    const eventSide = side(homeAway), teamId = String(eventSide?.team?.id || ""), teamPlayers = players.filter(player => player.teamId === teamId);
    const box = boxByTeam.get(teamId)?.stats || {};
    const teamPenalties = penalties.filter(event => event.teamId === teamId);
    return {
      homeAway, providerTeamId: teamId, teamName: eventSide?.team?.displayName || eventSide?.team?.name || null,
      score: number(eventSide?.score), yellowCards: teamPlayers.reduce((sum, player) => sum + player.yellowCards, 0),
      secondYellowCards: teamPlayers.reduce((sum, player) => sum + player.secondYellowCards, 0),
      directRedCards: teamPlayers.reduce((sum, player) => sum + player.directRedCards, 0),
      totalCards: teamPlayers.reduce((sum, player) => sum + player.totalCards, 0),
      foulsCommitted: box.foulsCommitted, penaltiesAwarded: teamPenalties.length,
      providerBoxscore: { yellowCards: box.yellowCards, redCards: box.redCards, penaltyKickShots: box.penaltyKickShots },
      appearedPlayers: teamPlayers.length,
      individualFoulsSum: teamPlayers.every(player => finite(player.foulsCommitted)) ? teamPlayers.reduce((sum, player) => sum + player.foulsCommitted, 0) : null
    };
  });
  return { refereeName, cards, penalties, players, excludedDiscipline, teams, duration, boxscoreTeams: boxByTeam.size };
}

function refereeKey(name) { return normalize(name); }
function slug(name) { return normalize(name).replaceAll(" ", "-") || "unknown"; }

function makeRefereeRegistry(matches) {
  const existing = JSON.parse(fs.readFileSync(existingRegistryPath, "utf8"));
  const existingByName = new Map();
  for (const referee of existing.referees) for (const name of [referee.name, ...(referee.aliases || [])]) existingByName.set(refereeKey(name), referee.id);
  const groups = new Map();
  for (const match of matches) {
    if (!match.refereeName) continue;
    const key = refereeKey(match.refereeName);
    if (!groups.has(key)) groups.set(key, { key, names: new Set(), matches: [] });
    groups.get(key).names.add(match.refereeName);
    groups.get(key).matches.push(match);
  }
  const usedIds = new Set();
  const referees = [...groups.values()].sort((a, b) => a.key.localeCompare(b.key)).map(group => {
    const displayName = [...group.names].sort((a, b) => a.length - b.length || a.localeCompare(b))[0];
    let id = existingByName.get(group.key) || `uefa-referee:und:${slug(displayName)}`;
    if (usedIds.has(id)) id = `${id}-${crypto.createHash("sha1").update(group.key).digest("hex").slice(0, 8)}`;
    usedIds.add(id);
    return {
      id, displayName, aliases: [...group.names].filter(name => name !== displayName).sort(), countryIso3: existing.referees.find(row => row.id === id)?.countryIso3 || null,
      identityBasis: existingByName.has(group.key) ? "EXISTING_MD2_CANONICAL_ID_EXACT_NORMALIZED_NAME" : "ESPN_OFFICIAL_NORMALIZED_NAME_COUNTRY_UNAVAILABLE",
      matches: group.matches.length, firstKickoff: group.matches.map(row => row.kickoffUtc).sort()[0], lastKickoff: group.matches.map(row => row.kickoffUtc).sort().at(-1)
    };
  });
  return { referees, byName: new Map(referees.flatMap(referee => [referee.displayName, ...(referee.aliases || [])].map(name => [refereeKey(name), referee.id]))) };
}

function accumulator() { return { matches: 0, yellowCards: 0, secondYellowCards: 0, directRedCards: 0, totalCards: 0, foulsCommitted: 0, foulsMatches: 0, penaltiesAwarded: 0, minutes: 0, minuteMatches: 0 }; }
function updateAccumulator(state, row) {
  state.matches += 1;
  for (const key of ["yellowCards", "secondYellowCards", "directRedCards", "totalCards", "penaltiesAwarded"]) state[key] += row[key] || 0;
  if (finite(row.foulsCommitted)) { state.foulsCommitted += row.foulsCommitted; state.foulsMatches += 1; }
  if (finite(row.minutesPlayed)) { state.minutes += row.minutesPlayed; state.minuteMatches += 1; }
}
function priorFeatures(state, kind, usable = true) {
  if (!state || state.matches === 0) return { status: "UNAVAILABLE_NO_STRICTLY_PRIOR_SAMPLE", usable: false, matches: 0, values: null, featureCells: { candidate: 5, verified: 0, unverified: 0, unavailable: 5 } };
  const values = {
    yellowCardsPerMatch: round(state.yellowCards / state.matches), totalCardsPerMatch: round(state.totalCards / state.matches),
    foulsPerMatch: state.foulsMatches ? round(state.foulsCommitted / state.foulsMatches) : null,
    penaltiesPerMatch: round(state.penaltiesAwarded / state.matches), minutesPerAppearance: state.minuteMatches ? round(state.minutes / state.minuteMatches) : null
  };
  const present = [state.matches, values.yellowCardsPerMatch, values.totalCardsPerMatch, values.foulsPerMatch, kind === "player" ? values.minutesPerAppearance : values.penaltiesPerMatch].filter(finite).length;
  return {
    status: usable ? "VERIFIED_STRICTLY_PRIOR_MATCHES" : "DERIVED_PRIOR_BUT_CURRENT_ASSIGNMENT_PUBLICATION_NOT_VERIFIED",
    usable, matches: state.matches, values,
    featureCells: { candidate: 5, verified: usable ? present : 0, unverified: usable ? 0 : present, unavailable: 5 - present }
  };
}

function attachRollingFeatures(matches, teamRows, playerRows) {
  const teamState = new Map(), refereeState = new Map(), playerState = new Map();
  const matchById = new Map(matches.map(match => [match.matchId, match]));
  const teamByMatch = new Map(), playerByMatch = new Map();
  for (const row of teamRows) { if (!teamByMatch.has(row.matchId)) teamByMatch.set(row.matchId, []); teamByMatch.get(row.matchId).push(row); }
  for (const row of playerRows) { if (!playerByMatch.has(row.matchId)) playerByMatch.set(row.matchId, []); playerByMatch.get(row.matchId).push(row); }
  const sorted = [...matches].sort((a, b) => a.kickoffUtc.localeCompare(b.kickoffUtc) || a.matchId.localeCompare(b.matchId));
  for (let cursor = 0; cursor < sorted.length;) {
    const kickoff = sorted[cursor].kickoffUtc;
    const batch = [];
    while (cursor < sorted.length && sorted[cursor].kickoffUtc === kickoff) batch.push(sorted[cursor++]);
    for (const match of batch) {
      const sides = teamByMatch.get(match.matchId) || [];
      const home = sides.find(row => row.homeAway === "home"), away = sides.find(row => row.homeAway === "away");
      match.preMatchFeatures = {
        homeTeamPriorUcl: priorFeatures(teamState.get(home?.uefaTeamId), "team"),
        awayTeamPriorUcl: priorFeatures(teamState.get(away?.uefaTeamId), "team"),
        refereePriorUcl: priorFeatures(refereeState.get(match.refereeId), "referee", false),
        refereeAssignmentTiming: "NOT_SOURCE_TIMESTAMPED_PRE_KICKOFF",
        outcomeFieldsExcluded: true
      };
      for (const row of sides) {
        const opponent = sides.find(other => other !== row);
        row.preMatchFeatures = {
          teamPriorUcl: priorFeatures(teamState.get(row.uefaTeamId), "team"),
          opponentPriorUcl: priorFeatures(teamState.get(opponent?.uefaTeamId), "team"),
          refereePriorUcl: priorFeatures(refereeState.get(match.refereeId), "referee", false)
        };
      }
      for (const row of playerByMatch.get(match.matchId) || []) {
        row.preMatchFeatures = { playerPriorUcl: priorFeatures(playerState.get(row.playerId), "player"), actualParticipationUsedAsFeature: false, actualMinutesUsedAsFeature: false };
      }
    }
    for (const match of batch) {
      const sides = teamByMatch.get(match.matchId) || [];
      for (const row of sides) {
        if (!teamState.has(row.uefaTeamId)) teamState.set(row.uefaTeamId, accumulator());
        updateAccumulator(teamState.get(row.uefaTeamId), row);
      }
      if (!refereeState.has(match.refereeId)) refereeState.set(match.refereeId, accumulator());
      updateAccumulator(refereeState.get(match.refereeId), match.cards);
      for (const row of playerByMatch.get(match.matchId) || []) {
        if (!playerState.has(row.playerId)) playerState.set(row.playerId, accumulator());
        updateAccumulator(playerState.get(row.playerId), row);
      }
    }
  }
  return { matches: sorted, teamRows, playerRows };
}

function featureCoverage(rows, selectors) {
  const totals = { candidate: 0, verified: 0, unverified: 0, unavailable: 0 };
  for (const row of rows) for (const select of selectors) {
    const cells = select(row)?.featureCells;
    if (cells) for (const key of Object.keys(totals)) totals[key] += cells[key] || 0;
  }
  return { ...totals, verifiedPct: totals.candidate ? round(totals.verified / totals.candidate * 100, 2) : null };
}

function buildSplits(matches) {
  const target = matches.filter(match => match.targetSeason);
  return [
    { id: "fold-1", trainSeasons: ["2022-23"], validationSeason: "2023-24" },
    { id: "fold-2", trainSeasons: ["2022-23", "2023-24"], validationSeason: "2024-25" },
    { id: "fold-3", trainSeasons: ["2022-23", "2023-24", "2024-25"], validationSeason: "2025-26" }
  ].map(fold => ({
    ...fold,
    trainMatchIds: target.filter(match => fold.trainSeasons.includes(match.season)).map(match => match.matchId),
    validationMatchIds: target.filter(match => match.season === fold.validationSeason).map(match => match.matchId),
    chronologyPass: Math.max(...target.filter(match => fold.trainSeasons.includes(match.season)).map(match => Date.parse(match.kickoffUtc))) < Math.min(...target.filter(match => match.season === fold.validationSeason).map(match => Date.parse(match.kickoffUtc)))
  }));
}

async function main() {
  const rawFiles = [];
  const officialBySeason = new Map();
  for (const config of seasons) {
    const url = `https://match.uefa.com/v5/matches?competitionId=1&seasonYear=${config.seasonYear}&phase=TOURNAMENT&order=ASC&offset=0&limit=250`;
    const file = path.join(rawRoot, "uefa", `${config.season}.json.gz`);
    const wrapper = await cached(url, file); rawFiles.push(file);
    if (!Array.isArray(wrapper.payload) || wrapper.payload.length !== config.expected) throw new Error(`${config.season}: UEFA ${wrapper.payload?.length} != ${config.expected}`);
    officialBySeason.set(config.season, wrapper.payload.map(row => parseOfficial(row, config)));
  }

  const scoreboardByYear = new Map();
  for (const year of [...new Set(seasons.flatMap(config => [config.espnStartYear, config.espnStartYear + 1]))].sort()) {
    const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/uefa.champions/scoreboard?dates=${year}&limit=1000`;
    const file = path.join(rawRoot, "espn-scoreboards", `${year}.json.gz`);
    const wrapper = await cached(url, file); rawFiles.push(file);
    scoreboardByYear.set(year, wrapper.payload.events || []);
  }

  const links = [];
  const matchFailures = [];
  for (const config of seasons) {
    const official = officialBySeason.get(config.season);
    const events = [...scoreboardByYear.get(config.espnStartYear), ...scoreboardByYear.get(config.espnStartYear + 1)];
    const linked = matchOfficialToEspn(official, events);
    links.push(...linked.rows);
    matchFailures.push(...linked.unmatched.map(row => ({ season: config.season, ...row })));
  }
  if (matchFailures.length) {
    writeJson(path.join(outRoot, "matching-failures.json"), matchFailures);
    throw new Error(`UEFA/ESPN matching failed for ${matchFailures.length} matches`);
  }
  if (new Set(links.map(link => link.espn.eventId)).size !== links.length) throw new Error("Duplicate ESPN event IDs after matching");

  const existingSummaryById = new Map(listFiles(existingSummaryRoot, file => file.endsWith(".json.gz")).map(file => [path.basename(file, ".json.gz"), file]));
  const phaseSummaryById = new Map(listFiles(path.join(rawRoot, "espn-summaries"), file => file.endsWith(".json.gz")).map(file => [path.basename(file, ".json.gz"), file]));
  const summaries = await parallel(links, 6, async (link, index) => {
    const eventId = link.espn.eventId;
    let file = phaseSummaryById.get(eventId) || existingSummaryById.get(eventId);
    let wrapper;
    if (file) wrapper = readGzip(file);
    else {
      file = path.join(rawRoot, "espn-summaries", link.official.season, `${eventId}.json.gz`);
      const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/uefa.champions/summary?event=${eventId}`;
      wrapper = await cached(url, file);
      if ((index + 1) % 50 === 0) console.log(`Fetched/loaded ${index + 1}/${links.length} summaries`);
    }
    wrapper.__file = file;
    rawFiles.push(file);
    return { link, wrapper, parsed: parseSummary(link, wrapper) };
  });

  const provisionalMatches = summaries.map(({ link, wrapper, parsed }) => ({
    matchId: `ucl:${link.official.season}:${link.official.uefaMatchId}`,
    uefaMatchId: link.official.uefaMatchId, espnEventId: link.espn.eventId, season: link.official.season, targetSeason: link.official.targetSeason,
    date: link.official.date, kickoffUtc: link.official.kickoffUtc, roundName: link.official.roundName, matchday: link.official.matchday,
    homeTeam: link.official.homeTeam, awayTeam: link.official.awayTeam, score90: link.official.score90, scoreTotal: link.official.scoreTotal,
    refereeName: parsed.refereeName, refereeId: null, refereeAssignmentTemporalStatus: "NOT_SOURCE_TIMESTAMPED_PRE_KICKOFF",
    cards: {
      yellowCards: parsed.teams.reduce((sum, row) => sum + row.yellowCards, 0),
      secondYellowCards: parsed.teams.reduce((sum, row) => sum + row.secondYellowCards, 0),
      directRedCards: parsed.teams.reduce((sum, row) => sum + row.directRedCards, 0),
      totalCards: parsed.teams.reduce((sum, row) => sum + row.totalCards, 0),
      foulsCommitted: parsed.teams.every(row => finite(row.foulsCommitted)) ? parsed.teams.reduce((sum, row) => sum + row.foulsCommitted, 0) : null,
      penaltiesAwarded: parsed.penalties.length
    },
    excludedDisciplineEvents: parsed.excludedDiscipline,
    matchDurationMinutes: parsed.duration,
    source: {
      fixture: { provider: "UEFA match feed", rawPath: rel(path.join(rawRoot, "uefa", `${link.official.season}.json.gz`)), url: `https://match.uefa.com/v5/matches?competitionId=1&seasonYear=${seasons.find(row => row.season === link.official.season).seasonYear}&phase=TOURNAMENT`, retrievedAt: readGzip(path.join(rawRoot, "uefa", `${link.official.season}.json.gz`)).retrievedAt },
      report: { provider: "ESPN", rawPath: rel(wrapper.__file), url: wrapper.url, retrievedAt: wrapper.retrievedAt },
      matching: { score: link.matchScore, homeNameScore: link.nameScores.home, awayNameScore: link.nameScores.away }
    }
  }));

  const registry = makeRefereeRegistry(provisionalMatches);
  for (const match of provisionalMatches) match.refereeId = registry.byName.get(refereeKey(match.refereeName)) || null;
  const provisionalTeams = [];
  const provisionalPlayers = [];
  for (const { link, parsed } of summaries) {
    const matchId = `ucl:${link.official.season}:${link.official.uefaMatchId}`;
    const match = provisionalMatches.find(row => row.matchId === matchId);
    for (const team of parsed.teams) {
      const official = team.homeAway === "home" ? link.official.homeTeam : link.official.awayTeam;
      provisionalTeams.push({
        matchId, season: match.season, targetSeason: match.targetSeason, kickoffUtc: match.kickoffUtc, homeAway: team.homeAway,
        uefaTeamId: official.id, providerTeamId: team.providerTeamId, teamName: official.name,
        yellowCards: team.yellowCards, secondYellowCards: team.secondYellowCards, directRedCards: team.directRedCards, totalCards: team.totalCards,
        foulsCommitted: team.foulsCommitted, penaltiesAwarded: team.penaltiesAwarded, providerBoxscore: team.providerBoxscore,
        individualFoulsSum: team.individualFoulsSum, appearedPlayers: team.appearedPlayers,
        source: match.source.report
      });
    }
    for (const player of parsed.players) {
      const officialTeam = parsed.teams.find(team => team.providerTeamId === player.teamId)?.homeAway === "home" ? link.official.homeTeam : link.official.awayTeam;
      provisionalPlayers.push({ ...player, uefaTeamId: officialTeam.id, teamName: officialTeam.name, targetSeason: match.targetSeason });
    }
  }

  const enriched = attachRollingFeatures(provisionalMatches, provisionalTeams, provisionalPlayers);
  const targetMatches = enriched.matches.filter(match => match.targetSeason);
  const targetTeams = enriched.teamRows.filter(row => row.targetSeason);
  const targetPlayers = enriched.playerRows.filter(row => row.targetSeason);
  const splits = buildSplits(enriched.matches);
  const matchFeatureCoverage = featureCoverage(targetMatches, [row => row.preMatchFeatures.homeTeamPriorUcl, row => row.preMatchFeatures.awayTeamPriorUcl, row => row.preMatchFeatures.refereePriorUcl]);
  const teamFeatureCoverage = featureCoverage(targetTeams, [row => row.preMatchFeatures.teamPriorUcl, row => row.preMatchFeatures.opponentPriorUcl, row => row.preMatchFeatures.refereePriorUcl]);
  const playerFeatureCoverage = featureCoverage(targetPlayers, [row => row.preMatchFeatures.playerPriorUcl]);

  const bySeason = Object.fromEntries(seasons.filter(config => config.target).map(config => {
    const matches = targetMatches.filter(match => match.season === config.season);
    const teamRows = targetTeams.filter(row => row.season === config.season);
    const playerRows = targetPlayers.filter(row => row.season === config.season);
    return [config.season, {
      matches: matches.length, referees: new Set(matches.map(match => match.refereeId).filter(Boolean)).size,
      matchCardsComplete: matches.filter(match => [match.cards.yellowCards, match.cards.secondYellowCards, match.cards.directRedCards, match.cards.totalCards].every(finite)).length,
      matchFoulsComplete: matches.filter(match => finite(match.cards.foulsCommitted)).length,
      teamRows: teamRows.length, teamCardsComplete: teamRows.filter(row => [row.yellowCards, row.secondYellowCards, row.directRedCards, row.totalCards].every(finite)).length,
      teamFoulsComplete: teamRows.filter(row => finite(row.foulsCommitted)).length,
      playerAppearances: playerRows.length, playerCardsComplete: playerRows.filter(row => [row.yellowCards, row.secondYellowCards, row.directRedCards, row.totalCards].every(finite)).length,
      playerFoulsComplete: playerRows.filter(row => finite(row.foulsCommitted)).length, playerMinutesAvailable: playerRows.filter(row => finite(row.minutesPlayed)).length
    }];
  }));

  const duplicateMatchIds = targetMatches.length - new Set(targetMatches.map(row => row.matchId)).size;
  const duplicateTeamKeys = targetTeams.length - new Set(targetTeams.map(row => `${row.matchId}|${row.uefaTeamId}`)).size;
  const duplicatePlayerKeys = targetPlayers.length - new Set(targetPlayers.map(row => `${row.matchId}|${row.playerId}`)).size;
  const chronologyFailures = splits.filter(split => !split.chronologyPass).length;
  const quality = {
    schemaVersion: 1, phase: "Champions referee integration 2B", generatedFromRawAt: snapshotDate,
    scope: { targetSeasons: seasons.filter(row => row.target).map(row => row.season), burnInSeasons: ["2021-22"], qualificationsExcluded: true },
    coverage: {
      bySeason, matches: targetMatches.length, teamRows: targetTeams.length, playerAppearances: targetPlayers.length,
      refereesIdentified: new Set(targetMatches.map(match => match.refereeId).filter(Boolean)).size,
      refereeAssignmentsPresent: targetMatches.filter(match => match.refereeId).length,
      refereeAssignmentsPreMatchTimestampVerified: targetMatches.filter(match => match.refereeAssignmentTemporalStatus === "VERIFIED_PRE_KICKOFF").length,
      excludedBenchStaffOrUnresolvedCardEvents: targetMatches.reduce((sum, match) => sum + match.excludedDisciplineEvents.length, 0),
      preMatchFeatureCoverage: { matchTotals: matchFeatureCoverage, teamCards: teamFeatureCoverage, individualCards: playerFeatureCoverage }
    },
    integrity: {
      duplicateMatchIds, duplicateTeamKeys, duplicatePlayerKeys, chronologyFailures,
      cardArithmeticFailures: targetMatches.filter(match => match.cards.totalCards !== match.cards.yellowCards + match.cards.secondYellowCards + match.cards.directRedCards).map(match => match.matchId),
      teamToMatchCardFailures: targetMatches.filter(match => targetTeams.filter(row => row.matchId === match.matchId).reduce((sum, row) => sum + row.totalCards, 0) !== match.cards.totalCards).map(match => match.matchId),
      playerToTeamCardFailures: targetTeams.filter(team => targetPlayers.filter(player => player.matchId === team.matchId && player.uefaTeamId === team.uefaTeamId).reduce((sum, player) => sum + player.totalCards, 0) !== team.totalCards).map(team => `${team.matchId}|${team.uefaTeamId}`)
    },
    targetDefinitions: {
      yellowCards: "Ordinary yellow-card key events assigned to athletes recorded as having appeared; includes a first yellow before a later second-yellow dismissal.",
      secondYellowCards: "Red-card key events whose source text explicitly says Second yellow card.",
      directRedCards: "Other red-card key events assigned to athletes recorded as having appeared.",
      totalCards: "yellowCards + secondYellowCards + directRedCards. Provider boxscore yellow/red counts are retained separately and never substituted.",
      benchStaffPolicy: "Events for rostered non-participants, staff or unresolved participants are excluded from individual/team/model targets and reported separately.",
      minutes: "Derived after the match from starter, substitution and dismissal clocks (capped at 90/120, excluding added-time precision); outcome/exposure only, never a pre-match feature."
    },
    antiLeakage: {
      status: chronologyFailures || duplicateMatchIds || duplicateTeamKeys || duplicatePlayerKeys ? "FAIL" : "PASS_WITH_DOCUMENTED_EXCLUSIONS",
      rules: [
        "Rolling features use only matches with kickoff strictly earlier than the current kickoff; simultaneous matches are updated as one batch.",
        "Actual starters, appearances, substitutions and minutes are post-match outcome/exposure fields and never pre-match features.",
        "The current match boxscore, events and player statistics are target data only.",
        "Historical referee names identify the actual official, but no source publication timestamp proves when the designation became available; referee features are blocked for strict training.",
        "Role metadata from the post-match roster is not admitted as a timestamp-verified feature."
      ]
    },
    rollingOrigin: { folds: splits.map(split => ({ id: split.id, trainSeasons: split.trainSeasons, validationSeason: split.validationSeason, trainMatches: split.trainMatchIds.length, validationMatches: split.validationMatchIds.length, chronologyPass: split.chronologyPass })) },
    baselineSpecifications: {
      totalCardsNoReferee: "Competition/season intercept plus strictly-prior home and away team disciplinary rates; referee identity and referee priors omitted.",
      teamCardsNoReferee: "Strictly-prior team and opponent disciplinary rates with venue indicator; referee omitted.",
      individualCardsNoReferee: "Conditional-on-appearance research baseline using strictly-prior player card/foul exposure only; actual participation and minutes are outcomes, not predictors.",
      status: "SPECIFIED_NOT_FITTED"
    },
    calibrationReadiness: {
      totalCards: { status: "READY_FOR_BASELINE_CALIBRATION_ONLY", refereeEffect: "BLOCKED_ASSIGNMENT_PUBLICATION_TIMESTAMPS", noModelTrained: true },
      teamCards: { status: "READY_FOR_BASELINE_CALIBRATION_ONLY", refereeEffect: "BLOCKED_ASSIGNMENT_PUBLICATION_TIMESTAMPS", noModelTrained: true },
      individualCardsConditionalOnAppearance: { status: "PARTIAL_RESEARCH_READY", blocker: "Actual participant universe is post-match; role and lineup availability are not timestamp-certified.", noModelTrained: true },
      individualCardsUnconditional: { status: "NOT_READY", blocker: "No timestamp-certified pre-match lineup/participation model.", noModelTrained: true }
    },
    sources: {
      fixtures: "UEFA match feed, phase=TOURNAMENT",
      refereeMatchTeamPlayerData: "ESPN public match summary feed",
      rawManifest: "data/raw/champions-referee-phase-2b/2026-10-13/manifest.json"
    }
  };

  const uniqueRaw = [...new Set(rawFiles.map(file => path.resolve(file)))].sort();
  const manifest = {
    schemaVersion: 1, capturedForPhase: "2B", snapshotDate,
    files: uniqueRaw.map(file => ({ path: rel(file), sha256: sha256(file), bytes: fs.statSync(file).size, sourceReuse: !file.startsWith(rawRoot) }))
  };
  writeJson(path.join(rawRoot, "manifest.json"), manifest);
  writeJson(path.join(outRoot, "referee-registry.json"), { schemaVersion: 1, idPolicy: "Reuse an exact normalized-name MD2 canonical ID; otherwise assign immutable uefa-referee:und:<normalized-name>. Country enrichment must not change the ID.", referees: registry.referees });
  writeJson(path.join(outRoot, "match-totals.json"), { schemaVersion: 1, targetDefinitions: quality.targetDefinitions, matches: targetMatches });
  writeJson(path.join(outRoot, "team-cards.json"), { schemaVersion: 1, targetDefinitions: quality.targetDefinitions, rows: targetTeams });
  writeJson(path.join(outRoot, "individual-cards.json"), { schemaVersion: 1, targetDefinitions: quality.targetDefinitions, rows: targetPlayers });
  writeJson(path.join(outRoot, "rolling-origin-splits.json"), { schemaVersion: 1, folds: splits, baselineSpecifications: quality.baselineSpecifications });
  writeJson(path.join(outRoot, "quality-report.json"), quality);
  const staleFailurePath = path.join(outRoot, "matching-failures.json");
  if (fs.existsSync(staleFailurePath)) fs.unlinkSync(staleFailurePath);
  console.log(`Phase 2B imported: ${targetMatches.length} target matches, ${targetTeams.length} team rows, ${targetPlayers.length} player appearances, ${quality.coverage.refereesIdentified} referees`);
}

main().catch(error => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
