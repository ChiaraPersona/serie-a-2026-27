"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const read = relative => JSON.parse(fs.readFileSync(path.join(root, relative), "utf8"));
const assignments = read("data/sources/champions-referee-assignments-md02-2026-27.json");
const registry = read("data/sources/champions-referees/registry-2026-27.json");
const history = read("data/normalized/champions-referee-history-2026-10-13.json");
const report = read("data/analysis/champions/referee-coverage-2026-10-13.json");

assert.equal(assignments.assignments.length, 18);
assert.equal(registry.referees.length, 18);
assert.equal(history.referees.length, 18);
assert.equal(new Set(registry.referees.map(item => item.id)).size, 18);
assert.equal(new Set(assignments.assignments.map(item => item.refereeId)).size, 18);
assert.deepEqual(new Set(assignments.assignments.map(item => item.refereeId)), new Set(registry.referees.map(item => item.id)));
assert(history.officialVerification.checks.every(item => item.confirmed));

for (const referee of history.referees) {
  assert(referee.career.matches > 0, `${referee.name}: campione carriera vuoto`);
  assert.equal(referee.career.totalCards.definition, "yellowCards + redCards");
  assert.equal(referee.career.overCardFrequencies.over3_5.frequency, null);
  assert.equal(referee.last10.matches, 10, `${referee.name}: ultime 10 incomplete`);
  assert.equal(referee.last10.matchLog.length, 10);
  assert(referee.seasonCompetitionSamples.every(row => ["current", "historical"].includes(row.periodScope)));
  assert(referee.seasonCompetitionSamples.every(row => ["champions-league", "national-leagues", "other-competitions"].includes(row.competitionGroup)));
  assert.equal(referee.sourceConsistency.seasonCompetitionMatches, referee.seasonCompetitionSamples.reduce((sum, row) => sum + row.matches, 0));
  for (const match of referee.last10.matchLog) {
    if (match.yellowCards != null && match.redCards != null) assert.equal(match.totalCards, match.yellowCards + match.redCards);
  }
  for (const key of ["over3_5", "over4_5", "over5_5"]) {
    const rate = referee.last10.overCardFrequencies[key];
    assert.equal(rate.matches, 10);
    assert.equal(rate.frequency, rate.hits / rate.matches);
  }
}

assert.equal(report.coverage.expected, 18);
assert.equal(report.coverage.officialDesignations, 18);
assert.equal(report.coverage.statisticalProfiles, 18);
assert.equal(report.coverage.fullLast10, 18);
assert.equal(report.coverage.careerYellowCards, 18);
assert.equal(report.coverage.careerRedCards, 18);
assert.equal(report.coverage.careerFouls, 18);
assert.equal(report.coverage.careerPenalties, 18);
assert.equal(report.coverage.careerOver3_5, 0);
assert.equal(report.coverage.careerOver4_5, 18);
assert.equal(report.coverage.careerOver5_5, 18);
assert.equal(report.coverage.careerHomeAway, 18);
assert.equal(report.coverage.last10Over3_5_4_5_5, 18);
assert.equal(report.coverage.last10HomeAway, 0);
assert.equal(report.coverage.sourceInternalConsistency, 17);
assert.deepEqual(history.referees.filter(item => item.sourceConsistency.status !== "consistent").map(item => item.name), ["Nicholas Walsh"]);
assert(fs.existsSync(path.join(root, "data/raw/champions-referees/2026-10-13/uefa/official-md02-designations.html.gz")));
for (const referee of registry.referees) assert(fs.existsSync(path.join(root, `data/raw/champions-referees/2026-10-13/footymetrics/${referee.providers.footymetrics.id}.html.gz`)));

console.log(`OK archivio arbitri Champions: ${report.coverage.officialDesignations}/18 UEFA · ${report.coverage.statisticalProfiles}/18 profili · ${report.coverage.fullLast10}/18 ultime 10`);
