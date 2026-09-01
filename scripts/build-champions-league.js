"use strict";

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const sourcePath = path.join(root, "data/sources/champions-league-2026-27.json");
const outputPath = path.join(root, "data/normalized/champions-league-2026-27.json");
const source = JSON.parse(fs.readFileSync(sourcePath, "utf8"));

const fail = message => { throw new Error(`Champions League: ${message}`); };
if (source.schemaVersion !== 1 || source.season !== "2026-27" || source.phase !== "league") fail("fonte non valida");
if (!source.source?.url?.startsWith("https://www.uefa.com/")) fail("fonte UEFA ufficiale mancante");
if (!Array.isArray(source.fixtures) || source.fixtures.length !== source.expected?.fixtures) fail(`attese ${source.expected?.fixtures} gare, trovate ${source.fixtures?.length || 0}`);

const ids = new Set();
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
    competition: "champions-league",
    phase: "league",
    season: source.season,
    timezone: "Europe/Rome",
    status: "scheduled",
    score: null
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
fs.writeFileSync(outputPath, JSON.stringify({
  schemaVersion: 1,
  season: source.season,
  competition: source.competition,
  phase: source.phase,
  generatedAt: source.source.retrievedAt,
  source: source.source,
  summary: { teams: teamList.length, matchdays: matchdays.size, fixtures: fixtures.length },
  teams: teamList,
  fixtures
}, null, 2));
console.log(`OK Champions League: ${fixtures.length} gare · ${teamList.length} squadre · ${matchdays.size} giornate`);
