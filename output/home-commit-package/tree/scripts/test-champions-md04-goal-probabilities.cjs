'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { buildTeamCatalog } = require('./build-champions-md04.cjs');
const { readJsonFile } = require('./sisal/dataset-store.cjs');
const { scoreMatrix, matrixProbability } = require('./predictions/engine');
async function run() {
  const scenarios = JSON.parse(fs.readFileSync('data/generated/champions-shared-scenarios.json', 'utf8'));
  const odds = readJsonFile('data/normalized/odds/sisal/champions-league.json');
  const fixture = scenarios.fixtures.find(f => f.status === 'preliminary' && odds.events.some(e => e.canonicalMatchId === f.fixtureId && e.markets.some(m => m.marketCode === '7989' && Number(m.threshold) === 2.5)));
  assert(fixture, 'Real scenario with quoted goals line');
  const event = odds.events.find(e => e.canonicalMatchId === fixture.fixtureId);
  const market = event.markets.find(m => String(m.marketCode) === '7989' && Number(m.threshold) === 2.5 && m.selections.some(s => s.name === 'OVER') && m.selections.some(s => s.name === 'UNDER'));
  assert(market, 'Both complementary provider selections available');
  const matches = await buildTeamCatalog({ fixtures: [fixture] }, { ...odds, events: [{ ...event, markets: [market] }] });
  const legs = matches[0].selections;
  assert.equal(legs.length, 2);
  const total = legs.reduce((sum, leg) => sum + leg.modelProbabilityPct, 0);
  assert(Math.abs(total - 100) < 1e-9, `Over/Under 2.5 must sum to 100%, got ${total}%`);
  assert(legs.every(leg => leg.modelProbabilityPct > 0 && leg.modelProbabilityPct < 100), 'Positive finite Poisson means give nonzero probabilities on both sides');
  const all = await buildTeamCatalog(scenarios, odds);
  let checked = 0, complementary = 0;
  for (const match of all) {
    const scenario = scenarios.fixtures.find(f => f.fixtureId === match.matchId);
    const matrix = scenario.status === 'preliminary' ? scoreMatrix(scenario.expectedGoals.home, scenario.expectedGoals.away, 7, null) : null;
    const groups = new Map();
    for (const leg of match.selections.filter(l => l.suggestionAnalysis.family === 'goals')) {
      const expected = matrixProbability(matrix, score => leg.selection === 'OVER' ? score.home + score.away > Number(leg.threshold) : score.home + score.away < Number(leg.threshold)) * 100;
      assert(Math.abs(leg.modelProbabilityPct - expected) < 1e-9);
      assert.equal(leg.betSelection.evaluation.provenance.adapterVersion, 'MD04_GOALS_SCORE_OBJECT_V1');
      assert.equal(leg.betSelection.quote.decimal, leg.odds);
      assert.equal(leg.modelProbability, expected / 100);
      checked++;
      if (!groups.has(leg.providerMarketId)) groups.set(leg.providerMarketId, []);
      groups.get(leg.providerMarketId).push(leg);
    }
    for (const group of groups.values()) if (group.length === 2 && Number(group[0].threshold) % 1 === 0.5) {
      assert(Math.abs(group.reduce((sum, l) => sum + l.modelProbabilityPct, 0) - 100) < 1e-9); complementary++;
    }
  }
  assert(checked > 2 && complementary > 1, 'Full archived scenario coverage exercised without rewriting history');
  console.log(`OK ${checked} goal probabilities, ${complementary} complementary pairs; actual builder and unchanged Poisson matrix agree`);
}
run().catch(error => { console.error(error.message); process.exitCode = 1; });
