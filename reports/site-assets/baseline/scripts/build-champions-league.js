"use strict";

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const sourcePath = path.join(root, "data/sources/champions-league-2026-27.json");
const brandingPath = path.join(root, "data/sources/champions-team-branding-2026-27.json");
const refereeAssignmentsPaths = [
  "data/sources/champions-referee-assignments-2026-27.json",
  "data/sources/champions-referee-assignments-md02-2026-27.json",
  "data/sources/champions-referee-assignments-md03-2026-27.json"
].map(relativePath => path.join(root, relativePath));
const probableFormationsPaths = [1, 2].map(matchday => path.join(root, `data/sources/champions-probable-formations-md${String(matchday).padStart(2, "0")}-2026-27.json`));
const officialFormationsPaths = [1, 2].map(matchday => path.join(root, `data/sources/champions-official-formations-md${String(matchday).padStart(2, "0")}-2026-27.json`));
const outputPath = path.join(root, "data/normalized/champions-league-2026-27.json");
const fixturesArg = process.argv.indexOf("--fixtures");
const targetFixtureIds = new Set(fixturesArg >= 0 ? String(process.argv[fixturesArg + 1] || "").split(",").map(value => value.trim()).filter(Boolean) : []);
const baselineFromHead = process.argv.includes("--baseline-head");
const source = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
const results = JSON.parse(fs.readFileSync(path.join(root, "data/sources/champions-results-md01-2026-27.json"), "utf8"));
  const md02Path=path.join(root,'data/sources/champions-results-md02-2026-27.json');
  const md02Results=fs.existsSync(md02Path)?JSON.parse(fs.readFileSync(md02Path,'utf8')):null;
  const md03Path=path.join(root,'data/sources/champions-results-md03-2026-27.json');
  const md03Results=fs.existsSync(md03Path)?JSON.parse(fs.readFileSync(md03Path,'utf8')):null;
  const resultById = new Map([...results.fixtures,...(md02Results?.fixtures||[]),...(md03Results?.fixtures||[])].map(item => [item.fixtureId, item]));
  if (resultById.size !== results.fixtures.length+(md02Results?.fixtures.length||0)+(md03Results?.fixtures.length||0)) throw new Error("Risultati Champions duplicati");
for (const batch of [results, md02Results, md03Results].filter(Boolean)) for (const result of batch.fixtures) {
  if (!source.fixtures.some(f => f.id === result.fixtureId && f.matchday === batch.matchday) || result.status !== 'finished' || ![result.score?.home,result.score?.away].every(n=>Number.isInteger(n)&&n>=0) || !result.sourceUrl?.startsWith('https://')) throw new Error('Risultato Champions non valido');
}
if (process.argv.includes('--results-only')) {
  const previous=JSON.parse(fs.readFileSync(outputPath,'utf8'));
  const latest=md03Results||md02Results||results;
  const output={...previous,generatedAt:latest.verifiedAt,resultsSource:latest.source,resultsCoverageNote:latest.coverageNote,summary:{...previous.summary,finished:resultById.size},fixtures:previous.fixtures.map(f=>resultById.has(f.id)?{...f,status:'finished',score:resultById.get(f.id).score,matchReport:resultById.get(f.id)}:f)};
  fs.writeFileSync(outputPath,JSON.stringify(output,null,2));
  console.log('OK Champions risultati: '+resultById.size+' gare concluse');
  return;
}
for (const result of results.fixtures) {
  if (!source.fixtures.some(f => f.id === result.fixtureId && f.matchday === results.matchday) || result.status !== "finished" || ![result.score?.home, result.score?.away].every(n => Number.isInteger(n) && n >= 0) || !result.sourceUrl?.startsWith("https://")) throw new Error("Risultato Champions non valido");
  for (const side of ["home", "away"]) if (result.scorers[side].length !== result.score[side]) throw new Error("Marcatori Champions incoerenti");
}
const branding = JSON.parse(fs.readFileSync(brandingPath, "utf8"));
const refereeAssignmentsSources = refereeAssignmentsPaths.map(filePath => JSON.parse(fs.readFileSync(filePath, "utf8")));
const probableFormationsSources = probableFormationsPaths.map(filePath => JSON.parse(fs.readFileSync(filePath, "utf8")));
const officialFormationsSources = officialFormationsPaths.map(filePath => JSON.parse(fs.readFileSync(filePath, "utf8")));

const fail = message => { throw new Error(`Champions League: ${message}`); };
if (source.schemaVersion !== 1 || source.season !== "2026-27" || source.phase !== "league") fail("fonte non valida");
if (!source.source?.url?.startsWith("https://www.uefa.com/")) fail("fonte UEFA ufficiale mancante");
if (!Array.isArray(source.fixtures) || source.fixtures.length !== source.expected?.fixtures) fail(`attese ${source.expected?.fixtures} gare, trovate ${source.fixtures?.length || 0}`);

const refereeAssignments = new Map();
const refereeMetrics = ["yellowCardsPerMatch", "redCardsPerMatch", "foulsPerMatch", "penaltiesPerMatch"];
for (const refereeAssignmentsSource of refereeAssignmentsSources) {
  const expectedAssignments = source.fixtures.filter(fixture => fixture.matchday === refereeAssignmentsSource.matchday);
  if (refereeAssignmentsSource.schemaVersion !== 1 || refereeAssignmentsSource.season !== source.season || !Number.isInteger(refereeAssignmentsSource.matchday)) fail("fonte designazioni arbitrali non valida");
  if (!Array.isArray(refereeAssignmentsSource.assignments) || refereeAssignmentsSource.assignments.length !== expectedAssignments.length) fail(`attese ${expectedAssignments.length} designazioni per la giornata ${refereeAssignmentsSource.matchday}`);
  if (refereeAssignmentsSource.verification?.designationsProvider !== "UEFA" || refereeAssignmentsSource.verification?.status !== "confirmed") fail("conferma UEFA delle designazioni mancante");
  if (refereeAssignmentsSource.methodology?.modelUsage !== "informational-only") fail("uso prudenziale delle statistiche arbitrali non dichiarato");
  if (!Array.isArray(refereeAssignmentsSource.watchlist)) fail("watchlist arbitrale non valida");
  for (const assignment of refereeAssignmentsSource.assignments) {
    if (!assignment.fixtureId || refereeAssignments.has(assignment.fixtureId)) fail("designazione con ID mancante o duplicato");
    if (!source.fixtures.some(fixture => fixture.id === assignment.fixtureId && fixture.matchday === refereeAssignmentsSource.matchday)) fail(`${assignment.fixtureId}: designazione senza gara della giornata ${refereeAssignmentsSource.matchday}`);
    if (!["assigned", "pending"].includes(assignment.status)) fail(`${assignment.fixtureId}: stato designazione non valido`);
    if (assignment.status === "pending") {
      if (assignment.referee !== null || assignment.statistics !== null) fail(`${assignment.fixtureId}: designazione pendente con dati valorizzati`);
    } else {
      if (!assignment.referee?.name || (!assignment.referee?.countryFlag && refereeAssignmentsSource.matchday !== 3)) fail(`${assignment.fixtureId}: arbitro o nazionalità mancanti`);
      if (assignment.statistics !== null && !refereeMetrics.every(metric => assignment.statistics[metric]?.display)) fail(`${assignment.fixtureId}: medie arbitrali incomplete`);
      for (const metric of refereeMetrics) {
        const value = assignment.statistics?.[metric]?.value;
        if (value !== undefined && value !== null && (!Number.isFinite(value) || value < 0)) fail(`${assignment.fixtureId}: ${metric} non valida`);
      }
      if (assignment.assistants !== undefined && (!Array.isArray(assignment.assistants) || assignment.assistants.length !== 2 || assignment.assistants.some(name => !name))) fail(`${assignment.fixtureId}: assistenti non validi`);
      for (const role of ["fourthOfficial", "var", "avar"]) if (assignment[role] !== undefined && !assignment[role]) fail(`${assignment.fixtureId}: ${role} non valido`);
    }
    refereeAssignments.set(assignment.fixtureId, assignment);
  }
}
const refereeWatchlistRows = refereeAssignmentsSources.flatMap(item => item.watchlist);
if (new Set(refereeWatchlistRows.map(item => item.fixtureId)).size !== refereeWatchlistRows.length) fail("watchlist arbitrale con gare duplicate");
if (refereeWatchlistRows.some(item => !item.reason || refereeAssignments.get(item.fixtureId)?.status !== "assigned")) fail("watchlist arbitrale con gara o motivazione non valida");
const godinho = refereeAssignments.get("ucl-2026-27-md01-01")?.context;
const kabakov = refereeAssignments.get("ucl-2026-27-md01-05")?.context;
const massa = refereeAssignments.get("ucl-2026-27-md01-09")?.context;
if (godinho?.alternateStatistics?.yellowCardsPerMatch !== 6.43) fail("copertura alternativa Godinho mancante");
if (kabakov?.cardsSampleMatches !== 24 || kabakov?.foulsPredictionEligible !== false) fail("cautela sul dato falli di Kabakov mancante");
if (massa?.alternateStatistics?.yellowCardsPerMatch !== 4.73 || massa?.alternateStatistics?.foulsPerMatch !== 27.64) fail("campione alternativo Massa mancante");
const refereeWatchlist = new Map(refereeWatchlistRows.map(item => [item.fixtureId, item.reason]));

const formationPattern = /^(?:[1-5]-){2,3}[1-5]$/;
const confidenceBands = new Set(["very-high", "medium-high", "lower", "not-rated"]);
const probableFormations = new Map();
for (const probableFormationsSource of probableFormationsSources) {
  const expectedFixtures = source.fixtures.filter(fixture => fixture.matchday === probableFormationsSource.matchday);
  if (probableFormationsSource.schemaVersion !== 1 || probableFormationsSource.season !== source.season || !Number.isInteger(probableFormationsSource.matchday) || probableFormationsSource.status !== "editorial-probable") fail("fonte moduli probabili non valida");
  if (!Array.isArray(probableFormationsSource.fixtures) || probableFormationsSource.fixtures.length !== expectedFixtures.length) fail(`attesi ${expectedFixtures.length} moduli probabili per la giornata ${probableFormationsSource.matchday}`);
  for (const item of probableFormationsSource.fixtures) {
    const fixture = source.fixtures.find(candidate => candidate.id === item.fixtureId);
    if (!fixture || fixture.matchday !== probableFormationsSource.matchday) fail(`${item.fixtureId}: moduli probabili senza gara della giornata ${probableFormationsSource.matchday}`);
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
    const normalizeAvailability = (values, venue, label) => {
      if (values == null) return null;
      if (!Array.isArray(values) || values.some(value => typeof value !== "string" || !value.trim())) fail(`${item.fixtureId}: ${label} ${venue} non validi`);
      return values;
    };
    const side = (venue, label) => {
      const unavailable = normalizeAvailability(item[`${venue}Unavailable`], label, "indisponibili");
      const doubts = normalizeAvailability(item[`${venue}Doubts`], label, "dubbi");
      const notes = normalizeNotes(item[`${venue}Notes`], label);
      if (unavailable !== null) notes.push(`Indisponibili: ${unavailable.length ? unavailable.join(", ") : "nessuno"}.`);
      if (doubts !== null) notes.push(`In dubbio: ${doubts.length ? doubts.join(", ") : "nessuno"}.`);
      return {
        team: item[`${venue}Team`],
        formation: item[`${venue}Formation`],
        players: normalizePlayers(item[`${venue}Players`], label),
        notes,
        ...(unavailable !== null || doubts !== null ? { availability: { unavailable: unavailable || [], doubts: doubts || [] } } : {})
      };
    };
    probableFormations.set(item.fixtureId, {
      status: probableFormationsSource.status,
      updatedAt: probableFormationsSource.updatedAt,
      source: probableFormationsSource.source,
      lineupConfidence: { band: item.confidenceBand, uncertainSides: item.uncertainSides },
      home: side("home", "casa"),
      away: side("away", "trasferta")
    });
  }
}

const ids = new Set();
for (const officialSource of officialFormationsSources) {
  if (officialSource.schemaVersion !== 1 || officialSource.season !== source.season || !Number.isInteger(officialSource.matchday) || !Array.isArray(officialSource.fixtures)) fail("fonte formazioni ufficiali non valida");
  for (const item of officialSource.fixtures) {
    const editorial = probableFormations.get(item.fixtureId);
    const calendarFixture = source.fixtures.find(fixture => fixture.id === item.fixtureId);
    if (!editorial || !calendarFixture || calendarFixture.matchday !== officialSource.matchday || item.status !== "official" || !item.source?.url) fail("formazione ufficiale non valida");
    for (const side of ["home", "away"]) {
      const team = item[side];
      if (team.team !== editorial[side].team || team.players.length !== 11 || new Set(team.players).size !== 11 || (team.formation !== null && (!formationPattern.test(team.formation) || team.formation.split("-").reduce((a,b)=>a+Number(b),0)!==10))) fail(`${item.fixtureId}: XI ufficiale non valido`);
    }
    probableFormations.set(item.fixtureId, { ...item, editorialProjection: editorial, lineupConfidence: { band: "very-high", uncertainSides: [] } });
  }
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
const generatedOutput = {
  schemaVersion: 1,
  season: source.season,
  competition: source.competition,
  phase: source.phase,
  generatedAt: (md03Results || md02Results || results).verifiedAt,
  resultsSource: (md03Results || md02Results || results).source,
  resultsCoverageNote: (md03Results || md02Results || results).coverageNote,
  source: source.source,
  refereeAssignmentsSource: refereeAssignmentsSources[0].source,
  refereeAssignmentsSources: refereeAssignmentsSources.map(item => ({
    matchday: item.matchday,
    source: item.source,
    supportingSources: item.supportingSources || [],
    verification: item.verification,
    methodology: item.methodology
  })),
  refereeVerification: refereeAssignmentsSources[0].verification,
  refereeMethodology: refereeAssignmentsSources[0].methodology,
  refereeWatchlist: refereeWatchlistRows,
  probableFormationsSource: probableFormationsSources[0].source,
  probableFormationsSources: probableFormationsSources.map(item => ({ matchday: item.matchday, updatedAt: item.updatedAt, status: item.status, source: item.source })),
  officialFormationsSources: officialFormationsSources.map(item => ({ matchday: item.matchday, updatedAt: item.updatedAt || null, source: item.source || null, fixtures: item.fixtures.length })),
  summary: { teams: teamList.length, matchdays: matchdays.size, fixtures: fixtures.length, finished: resultById.size },
  teams: teamList,
  teamBranding,
  brandingSource: branding.source,
  fixtures
};
let finalOutput = generatedOutput;
if (targetFixtureIds.size) {
  const previousOutput = baselineFromHead
    ? JSON.parse(execFileSync("git", ["show", "HEAD:data/normalized/champions-league-2026-27.json"], { cwd: root, encoding: "utf8" }))
    : JSON.parse(fs.readFileSync(outputPath, "utf8"));
  const generatedById = new Map(generatedOutput.fixtures.map(fixture => [fixture.id, fixture]));
  for (const fixtureId of targetFixtureIds) if (!generatedById.has(fixtureId) || !previousOutput.fixtures.some(fixture => fixture.id === fixtureId)) fail(`${fixtureId}: target selettivo non valido`);
  finalOutput = {
    ...previousOutput,
    summary: {...previousOutput.summary,finished:generatedOutput.summary.finished},
    officialFormationsSources: generatedOutput.officialFormationsSources,
    fixtures: previousOutput.fixtures.map(fixture => targetFixtureIds.has(fixture.id) ? generatedById.get(fixture.id) : fixture)
  };
}
fs.writeFileSync(outputPath, JSON.stringify(finalOutput, null, 2));
require('./build-champions-md3-referees').build();
console.log(`OK Champions League: ${fixtures.length} gare · ${teamList.length} squadre · ${matchdays.size} giornate`);
