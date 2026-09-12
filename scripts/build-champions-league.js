"use strict";

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const sourcePath = path.join(root, "data/sources/champions-league-2026-27.json");
const brandingPath = path.join(root, "data/sources/champions-team-branding-2026-27.json");
const refereeAssignmentsPath = path.join(root, "data/sources/champions-referee-assignments-2026-27.json");
const probableFormationsPath = path.join(root, "data/sources/champions-probable-formations-md01-2026-27.json");
const outputPath = path.join(root, "data/normalized/champions-league-2026-27.json");
const source = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
const results = JSON.parse(fs.readFileSync(path.join(root, "data/sources/champions-results-md01-2026-27.json"), "utf8"));
const resultById = new Map(results.fixtures.map(item => [item.fixtureId, item]));
if (resultById.size !== results.fixtures.length) throw new Error("Risultati Champions duplicati");
for (const result of results.fixtures) {
  if (!source.fixtures.some(f => f.id === result.fixtureId && f.matchday === results.matchday) || result.status !== "finished" || ![result.score?.home, result.score?.away].every(n => Number.isInteger(n) && n >= 0) || !result.sourceUrl?.startsWith("https://")) throw new Error("Risultato Champions non valido");
  for (const side of ["home", "away"]) if (result.scorers[side].length !== result.score[side]) throw new Error("Marcatori Champions incoerenti");
}
const branding = JSON.parse(fs.readFileSync(brandingPath, "utf8"));
const refereeAssignmentsSource = JSON.parse(fs.readFileSync(refereeAssignmentsPath, "utf8"));
const probableFormationsSource = JSON.parse(fs.readFileSync(probableFormationsPath, "utf8"));

const fail = message => { throw new Error(`Champions League: ${message}`); };
if (source.schemaVersion !== 1 || source.season !== "2026-27" || source.phase !== "league") fail("fonte non valida");
if (!source.source?.url?.startsWith("https://www.uefa.com/")) fail("fonte UEFA ufficiale mancante");
if (!Array.isArray(source.fixtures) || source.fixtures.length !== source.expected?.fixtures) fail(`attese ${source.expected?.fixtures} gare, trovate ${source.fixtures?.length || 0}`);

if (refereeAssignmentsSource.schemaVersion !== 1 || refereeAssignmentsSource.season !== source.season || refereeAssignmentsSource.matchday !== 1) fail("fonte designazioni arbitrali non valida");
if (!Array.isArray(refereeAssignmentsSource.assignments) || refereeAssignmentsSource.assignments.length !== 18) fail("attese 18 designazioni per la prima giornata");
if (refereeAssignmentsSource.verification?.designationsProvider !== "UEFA" || refereeAssignmentsSource.verification?.status !== "confirmed") fail("conferma UEFA delle designazioni mancante");
if (refereeAssignmentsSource.methodology?.modelUsage !== "informational-only") fail("uso prudenziale delle statistiche arbitrali non dichiarato");
if (!Array.isArray(refereeAssignmentsSource.watchlist) || refereeAssignmentsSource.watchlist.length !== 5) fail("watchlist arbitrale incompleta");
const refereeAssignments = new Map();
const refereeMetrics = ["yellowCardsPerMatch", "redCardsPerMatch", "foulsPerMatch", "penaltiesPerMatch"];
for (const assignment of refereeAssignmentsSource.assignments) {
  if (!assignment.fixtureId || refereeAssignments.has(assignment.fixtureId)) fail("designazione con ID mancante o duplicato");
  if (!source.fixtures.some(fixture => fixture.id === assignment.fixtureId && fixture.matchday === 1)) fail(`${assignment.fixtureId}: designazione senza gara della prima giornata`);
  if (!['assigned', 'pending'].includes(assignment.status)) fail(`${assignment.fixtureId}: stato designazione non valido`);
  if (assignment.status === "pending") {
    if (assignment.referee !== null || assignment.statistics !== null) fail(`${assignment.fixtureId}: designazione pendente con dati valorizzati`);
  } else {
    if (!assignment.referee?.name || !assignment.referee?.countryFlag) fail(`${assignment.fixtureId}: arbitro o nazionalità mancanti`);
    if (!assignment.statistics || !refereeMetrics.every(metric => assignment.statistics[metric]?.display)) fail(`${assignment.fixtureId}: medie arbitrali incomplete`);
    for (const metric of refereeMetrics) {
      const value = assignment.statistics[metric].value;
      if (value !== null && (!Number.isFinite(value) || value < 0)) fail(`${assignment.fixtureId}: ${metric} non valida`);
    }
  }
  refereeAssignments.set(assignment.fixtureId, assignment);
}
if (new Set(refereeAssignmentsSource.watchlist.map(item => item.fixtureId)).size !== refereeAssignmentsSource.watchlist.length) fail("watchlist arbitrale con gare duplicate");
if (refereeAssignmentsSource.watchlist.some(item => !item.reason || refereeAssignments.get(item.fixtureId)?.status !== "assigned")) fail("watchlist arbitrale con gara o motivazione non valida");
const godinho = refereeAssignments.get("ucl-2026-27-md01-01")?.context;
const kabakov = refereeAssignments.get("ucl-2026-27-md01-05")?.context;
const massa = refereeAssignments.get("ucl-2026-27-md01-09")?.context;
if (godinho?.alternateStatistics?.yellowCardsPerMatch !== 6.43) fail("copertura alternativa Godinho mancante");
if (kabakov?.cardsSampleMatches !== 24 || kabakov?.foulsPredictionEligible !== false) fail("cautela sul dato falli di Kabakov mancante");
if (massa?.alternateStatistics?.yellowCardsPerMatch !== 4.73 || massa?.alternateStatistics?.foulsPerMatch !== 27.64) fail("campione alternativo Massa mancante");
const refereeWatchlist = new Map(refereeAssignmentsSource.watchlist.map(item => [item.fixtureId, item.reason]));

if (probableFormationsSource.schemaVersion !== 1 || probableFormationsSource.season !== source.season || probableFormationsSource.matchday !== 1 || probableFormationsSource.status !== "editorial-probable") fail("fonte moduli probabili non valida");
if (!Array.isArray(probableFormationsSource.fixtures) || probableFormationsSource.fixtures.length !== 18) fail("attesi 18 moduli probabili per la prima giornata");
const formationPattern = /^(?:[1-5]-){2,3}[1-5]$/;
const confidenceBands = new Set(["very-high", "medium-high", "lower"]);
const probableFormations = new Map();
for (const item of probableFormationsSource.fixtures) {
  const fixture = source.fixtures.find(candidate => candidate.id === item.fixtureId);
  if (!fixture || fixture.matchday !== 1) fail(`${item.fixtureId}: moduli probabili senza gara della prima giornata`);
  if (probableFormations.has(item.fixtureId)) fail(`${item.fixtureId}: moduli probabili duplicati`);
  if (fixture.homeTeam !== item.homeTeam || fixture.awayTeam !== item.awayTeam) fail(`${item.fixtureId}: squadre dei moduli probabili non coerenti con il calendario`);
  if (!confidenceBands.has(item.confidenceBand) || !Array.isArray(item.uncertainSides) || item.uncertainSides.some(side => !["home", "away"].includes(side)) || new Set(item.uncertainSides).size !== item.uncertainSides.length) fail(`${item.fixtureId}: confidenza XI non valida`);
  for (const formation of [item.homeFormation, item.awayFormation]) {
    if (!formationPattern.test(formation) || formation.split("-").reduce((sum, value) => sum + Number(value), 0) !== 10) fail(`${item.fixtureId}: modulo probabile non valido`);
  }
  const normalizePlayers = (players, venue) => {
    if (players == null) return null;
    if (!Array.isArray(players) || players.length !== 11 || new Set(players).size !== 11 || players.some(name => typeof name !== "string" || !name.trim())) fail(`${item.fixtureId}: undici probabile ${venue} non valido`);
    return players;
  };
  const normalizeNotes = (notes, venue) => {
    if (notes == null) return [];
    if (!Array.isArray(notes) || notes.some(note => typeof note !== "string" || !note.trim())) fail(`${item.fixtureId}: note ${venue} non valide`);
    return notes;
  };
  probableFormations.set(item.fixtureId, {
    status: probableFormationsSource.status,
    updatedAt: probableFormationsSource.updatedAt,
    source: probableFormationsSource.source,
    lineupConfidence: { band: item.confidenceBand, uncertainSides: item.uncertainSides },
    home: { team: item.homeTeam, formation: item.homeFormation, players: normalizePlayers(item.homePlayers, "casa"), notes: normalizeNotes(item.homeNotes, "casa") },
    away: { team: item.awayTeam, formation: item.awayFormation, players: normalizePlayers(item.awayPlayers, "trasferta"), notes: normalizeNotes(item.awayNotes, "trasferta") }
  });
}

const ids = new Set();
const officialSource = JSON.parse(fs.readFileSync(path.join(root, "data/sources/champions-official-formations-md01-2026-27.json"), "utf8"));
for (const item of officialSource.fixtures) {
  const editorial = probableFormations.get(item.fixtureId);
  if (!editorial || item.status !== "official" || !item.source?.url) fail("formazione ufficiale non valida");
  for (const side of ["home", "away"]) {
    const team = item[side];
    if (team.team !== editorial[side].team || team.players.length !== 11 || new Set(team.players).size !== 11 || (team.formation !== null && (!formationPattern.test(team.formation) || team.formation.split("-").reduce((a,b)=>a+Number(b),0)!==10))) fail(`${item.fixtureId}: XI ufficiale non valido`);
  }
  probableFormations.set(item.fixtureId, { ...item, editorialProjection: editorial, lineupConfidence: { band: "very-high", uncertainSides: [] } });
}
const matchups = new Set();
const teams = new Map();
const matchdays = new Map();
const fixtures = source.fixtures.map((fixture, index) => {
  if (!fixture.id || ids.has(fixture.id)) fail(`ID mancante o duplicato alla riga ${index + 1}`);
  ids.add(fixture.id);
  if (!Number.isInteger(fixture.matchday) || fixture.matchday < 1 || fixture.matchday > source.expected.matchdays) fail(`${fixture.id}: giornata non valida`);
  if (!/^202[67]-\d{2}-\d{2}$/.test(fixture.date) || !["18:45", "21:00"].includes(fixture.kickoff)) fail(`${fixture.id}: data o orario non valido`);
  if (!fixture.homeTeam || !fixture.awayTeam || fixture.homeTeam === fixture.awayTeam) fail(`${fixture.id}: squadre non valide`);
  const matchup = [fixture.homeTeam, fixture.awayTeam].sort((a, b) => a.localeCompare(b, "it")).join("::");
  if (matchups.has(matchup)) fail(`${fixture.id}: incrocio duplicato ${matchup}`);
  matchups.add(matchup);
  matchdays.set(fixture.matchday, (matchdays.get(fixture.matchday) || 0) + 1);
  for (const [team, venue] of [[fixture.homeTeam, "home"], [fixture.awayTeam, "away"]]) {
    const record = teams.get(team) || { fixtures: 0, home: 0, away: 0, matchdays: new Set() };
    record.fixtures += 1;
    record[venue] += 1;
    if (record.matchdays.has(fixture.matchday)) fail(`${team}: due gare nella giornata ${fixture.matchday}`);
    record.matchdays.add(fixture.matchday);
    teams.set(team, record);
  }
  return {
    ...fixture,
    probableFormation: probableFormations.get(fixture.id) || null,
    refereeAssignment: refereeAssignments.get(fixture.id) || null,
    refereeAttention: refereeWatchlist.get(fixture.id) || null,
    competition: "champions-league",
    phase: "league",
    season: source.season,
    timezone: "Europe/Rome",
    status: resultById.get(fixture.id)?.status || "scheduled",
    score: resultById.get(fixture.id)?.score || null,
    matchReport: resultById.get(fixture.id) || null
  };
}).sort((a, b) => a.matchday - b.matchday || `${a.date}T${a.kickoff}`.localeCompare(`${b.date}T${b.kickoff}`) || a.id.localeCompare(b.id));

if (teams.size !== source.expected.teams) fail(`attese ${source.expected.teams} squadre, trovate ${teams.size}`);
if (matchdays.size !== source.expected.matchdays) fail(`attese ${source.expected.matchdays} giornate, trovate ${matchdays.size}`);
for (let matchday = 1; matchday <= source.expected.matchdays; matchday += 1) {
  const expectedPerMatchday = source.expected.fixtures / source.expected.matchdays;
  if (matchdays.get(matchday) !== expectedPerMatchday) fail(`giornata ${matchday}: attese ${expectedPerMatchday} gare, trovate ${matchdays.get(matchday) || 0}`);
}
for (const [team, record] of teams) {
  if (record.fixtures !== source.expected.fixturesPerTeam || record.home !== 4 || record.away !== 4 || record.matchdays.size !== source.expected.matchdays) {
    fail(`${team}: calendario incoerente (${record.fixtures} gare, ${record.home} casa, ${record.away} trasferta)`);
  }
}

const teamList = [...teams.keys()].sort((a, b) => a.localeCompare(b, "it"));
if (branding.schemaVersion !== 1 || branding.season !== source.season || !Array.isArray(branding.teams)) fail("branding squadre non valido");
if (branding.teams.length !== teamList.length) fail(`attesi ${teamList.length} profili branding, trovati ${branding.teams.length}`);
const teamBranding = branding.teams.map(item => {
  if (!teamList.includes(item.team)) fail(`branding per squadra estranea: ${item.team}`);
  if (!/^\d+$/.test(item.uefaTeamId) || !/^[a-z0-9-]+$/.test(item.slug)) fail(`${item.team}: ID UEFA o slug branding non valido`);
  if (!Array.isArray(item.colors) || item.colors.length !== 2 || item.colors.some(color => !/^#[0-9a-f]{6}$/i.test(color))) fail(`${item.team}: palette non valida`);
  const logo = `assets/images/champions/${item.slug}.png`;
  const absoluteLogo = path.join(root, logo);
  if (!fs.existsSync(absoluteLogo) || fs.statSync(absoluteLogo).size < 100) fail(`${item.team}: logo locale mancante o vuoto`);
  return {
    team: item.team,
    uefaTeamId: item.uefaTeamId,
    slug: item.slug,
    colors: item.colors,
    shortName: item.team.split(/\s+/).map(part => part[0]).join("").slice(0, 3).toUpperCase(),
    logo,
    sourceUrl: branding.source.urlTemplate.replace("{uefaTeamId}", item.uefaTeamId)
  };
}).sort((a, b) => a.team.localeCompare(b.team, "it"));
if (new Set(teamBranding.map(item => item.team)).size !== teamList.length) fail("branding con squadre duplicate");
if (teamList.some(team => !teamBranding.some(item => item.team === team))) fail("branding incompleto");
fs.writeFileSync(outputPath, JSON.stringify({
  schemaVersion: 1,
  season: source.season,
  competition: source.competition,
  phase: source.phase,
  generatedAt: results.verifiedAt,
  resultsSource: results.source,
  resultsCoverageNote: results.coverageNote,
  source: source.source,
  refereeAssignmentsSource: refereeAssignmentsSource.source,
  refereeVerification: refereeAssignmentsSource.verification,
  refereeMethodology: refereeAssignmentsSource.methodology,
  refereeWatchlist: refereeAssignmentsSource.watchlist,
  probableFormationsSource: probableFormationsSource.source,
  summary: { teams: teamList.length, matchdays: matchdays.size, fixtures: fixtures.length, finished: resultById.size },
  teams: teamList,
  teamBranding,
  brandingSource: branding.source,
  fixtures
}, null, 2));
console.log(`OK Champions League: ${fixtures.length} gare · ${teamList.length} squadre · ${matchdays.size} giornate`);
