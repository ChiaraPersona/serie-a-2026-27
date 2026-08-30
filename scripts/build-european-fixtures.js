"use strict";

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const sourcePath = path.join(root, "data/sources/european-fixtures-2026-27.json");
const outputPath = path.join(root, "data/normalized/european-fixtures-2026-27.json");
const source = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
const teams = new Set(JSON.parse(fs.readFileSync(path.join(root, "data/normalized/teams.json"), "utf8")).map(team => team.id));
const labels = {
  "champions-league": "Champions League",
  "europa-league": "Europa League",
  "conference-league": "Conference League"
};

if (source.schemaVersion !== 1 || source.season !== "2026-27" || !Array.isArray(source.fixtures) || !source.expectedFixturesByTeam) throw new Error("Fonte impegni europei non valida");
const expectedTotal = Object.values(source.expectedFixturesByTeam).reduce((total, count) => total + count, 0);
if (source.fixtures.length !== expectedTotal) throw new Error(`Attese ${expectedTotal} gare europee, trovate ${source.fixtures.length}`);
const ids = new Set();
const counts = new Map();
const fixtures = source.fixtures.map((fixture, index) => {
  if (!fixture.id || ids.has(fixture.id)) throw new Error(`ID europeo mancante o duplicato alla riga ${index + 1}`);
  ids.add(fixture.id);
  if (!teams.has(fixture.teamId)) throw new Error(`${fixture.id}: squadra Serie A sconosciuta ${fixture.teamId}`);
  if (!labels[fixture.competition]) throw new Error(`${fixture.id}: competizione sconosciuta ${fixture.competition}`);
  if (!/^202[67]-\d{2}-\d{2}$/.test(fixture.date) || !/^\d{2}:\d{2}$/.test(fixture.kickoff)) throw new Error(`${fixture.id}: data o orario non valido`);
  const leaguePhaseMatchday = Number(fixture.id.match(/-(\d{2})$/)?.[1]);
  if (!Number.isInteger(leaguePhaseMatchday) || leaguePhaseMatchday < 1) throw new Error(`${fixture.id}: giornata europea non ricavabile`);
  const involved = [fixture.homeTeam, fixture.awayTeam].filter(name => String(name).toLocaleLowerCase("it") === fixture.teamId);
  if (involved.length !== 1) throw new Error(`${fixture.id}: la squadra ${fixture.teamId} deve comparire una sola volta`);
  counts.set(fixture.teamId, (counts.get(fixture.teamId) || 0) + 1);
  return {
    ...fixture,
    leaguePhaseMatchday,
    season: source.season,
    competitionLabel: labels[fixture.competition],
    timezone: "Europe/Rome",
    status: "scheduled",
    workloadOnly: true,
    predictionEligible: false,
    source: source.source
  };
}).sort((left, right) => `${left.date}T${left.kickoff}`.localeCompare(`${right.date}T${right.kickoff}`) || left.id.localeCompare(right.id));

for (const [teamId, expected] of Object.entries(source.expectedFixturesByTeam)) {
  if (counts.get(teamId) !== expected) throw new Error(`${teamId}: attese ${expected} gare europee, trovate ${counts.get(teamId) || 0}`);
  const matchdays = fixtures.filter(fixture => fixture.teamId === teamId).map(fixture => fixture.leaguePhaseMatchday).sort((left, right) => left - right);
  if (matchdays.join(",") !== Array.from({ length: expected }, (_, index) => index + 1).join(",")) throw new Error(`${teamId}: giornate europee mancanti o duplicate`);
}
if (counts.size !== Object.keys(source.expectedFixturesByTeam).length) throw new Error(`Attese ${Object.keys(source.expectedFixturesByTeam).length} squadre italiane, trovate ${counts.size}`);

fs.writeFileSync(outputPath, JSON.stringify({
  schemaVersion: 1,
  season: source.season,
  generatedAt: source.source.retrievedAt,
  scope: source.scope,
  source: source.source,
  fixtures
}, null, 2));
console.log(`OK impegni europei: ${fixtures.length} gare · ${[...counts.entries()].map(([team, count]) => `${team} ${count}`).join(" · ")}`);
