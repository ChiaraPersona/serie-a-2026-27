"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const data = JSON.parse(fs.readFileSync(path.join(root, "data/normalized/champions-pilot-predictions-2026-27.json"), "utf8"));
assert.strictEqual(data.status, "experimental-pilot-partial-odds");
assert.strictEqual(data.fixtures.length, 4);
assert.strictEqual(data.coverage.teams, 8);
assert(data.coverage.completeSourceMatches >= 300);
assert.strictEqual(data.coverage.oddsMatched, 4);
assert.strictEqual(data.coverage.resultOdds, 4);
assert.strictEqual(data.coverage.goalOdds, 4);
assert.strictEqual(data.coverage.requestedVolumeOdds, 0);
assert.strictEqual(data.coverage.referees, 0);
assert.strictEqual(data.coverage.probableLineups, 0);
for (const fixture of data.fixtures) {
  assert.strictEqual(fixture.teamProjections.length, 2, `${fixture.fixtureId}: proiezioni squadra`);
  assert(Math.abs(fixture.probabilities.home + fixture.probabilities.draw + fixture.probabilities.away - 100) < 0.01, `${fixture.fixtureId}: 1X2 non normalizzato`);
  assert.strictEqual(fixture.goals.length, 3, `${fixture.fixtureId}: soglie gol`);
  assert.strictEqual(fixture.cards.lines.length, 3, `${fixture.fixtureId}: soglie cartellini`);
  assert.strictEqual(fixture.cards.refereeAdjustment, null, `${fixture.fixtureId}: correttivo arbitro inventato`);
  assert(fixture.market.result1x2.every(row => Number.isFinite(row.odds) && Number.isFinite(row.edgePct)), `${fixture.fixtureId}: confronto 1X2 Sisal`);
  assert(fixture.goals.every(row => row.market && Number.isFinite(row.market.overOdds)), `${fixture.fixtureId}: confronto gol Sisal`);
  assert.strictEqual(fixture.market.requestedVolumeMarketsAvailable, false, `${fixture.fixtureId}: quote volumi non pubblicate da Sisal`);
  assert.strictEqual(fixture.exactScores.length, 3, `${fixture.fixtureId}: risultati esatti`);
  for (const team of fixture.teamProjections) {
    for (const metric of [team.shotsTotal, team.shotsOnTarget, team.corners, team.cards]) {
      assert(Number.isFinite(metric.central) && metric.min <= metric.central && metric.central <= metric.max, `${fixture.fixtureId}/${team.team}: volume non valido`);
    }
    assert(team.shotsOnTarget.central <= team.shotsTotal.central, `${fixture.fixtureId}/${team.team}: tiri in porta oltre tiri totali`);
    assert.deepStrictEqual(Object.keys(team.lines), ["shotsTotal", "shotsOnTarget", "corners"]);
  }
}
console.log(`OK pronostici pilot Champions: ${data.fixtures.length} gare · sei famiglie mercato · dati mancanti espliciti`);
