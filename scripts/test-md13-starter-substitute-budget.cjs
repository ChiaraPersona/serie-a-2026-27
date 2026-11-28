'use strict';
const fs = require('node:fs'), assert = require('node:assert/strict'), crypto = require('node:crypto');
const { apply } = require('./predictions/starter-substitute-budget.cjs');
const { allocateMinutes } = require('./predictions/starter-substitute-budget-core.cjs');
const { allocateMinutes: prototypeMinutes } = require('./research/prototype-starter-substitute-budget.cjs');
const { evaluateCandidate } = require('./md06-player-forecast-integration');
const read = f => JSON.parse(fs.readFileSync(f));
const policy = read('data/sources/serie-a-starter-substitute-budget-policy.json');
const before = read('output/md13-starter-substitute-budget/before.json'), data = read('data/normalized/predictions.json');
const audit = read('output/md13-starter-substitute-budget/audit.json'), ids = new Set(audit.targets);
assert.deepEqual(data.predictions.filter(p => !ids.has(p.matchId)), before.predictions.predictions.filter(p => !ids.has(p.matchId)));
const unchanged = { matchId: 'outside' };
assert.equal(apply({ prediction: unchanged, match: { id: 'outside' }, policy }), unchanged);
const started = { id: audit.targets[0], date: '2020-01-01', kickoff: '12:00', status: 'scheduled' };
assert.equal(apply({ prediction: unchanged, match: started, policy }), unchanged);
const bench = [{ playerId: 'b', role: 'Difensore', namedBenchSamples: 4, entries: 3, totalEntryMinutes: 80 }];
const starters = Array.from({ length: 10 }, (_, i) => ({ playerId: String(i), role: 'Difensore', expectedMinutes: 85 }));
assert.deepEqual(allocateMinutes(starters, bench), prototypeMinutes(starters, bench));
for (const p of data.predictions.filter(p => ids.has(p.matchId))) {
  assert.equal(p.shooters.starterSubstituteBudget.statisticallyValidated, false);
  for (const team of p.shooters.starterSubstituteBudget.teams) {
    const players = p.shooters.allPlayers.filter(r => r.teamId === team.teamId);
    if (team.status === 'COMPLETE') {
      assert(Math.abs(team.budget.starterShots + team.budget.substituteShots - team.target) < 1e-8);
      assert(Math.abs(team.minutes.starterMinutes + team.minutes.substituteMinutes - 900) < 1e-6);
      for (const row of players) {
        assert(row.shotProbabilities.over05 >= row.shotProbabilities.over15 && row.shotProbabilities.over15 >= row.shotProbabilities.over25);
        assert.equal(Number((1 - Math.exp(-row.projectedShots)).toFixed(4)), row.shotProbabilities.over05);
        assert(row.expectedMinutesByMetric.sot >= 0);
      }
    } else for (const row of players) assert.equal(row.projectedShots, null);
  }
}
const catalog = read('data/normalized/reading-md13-market-catalog.json').marketCatalog;
const schedina = read('data/normalized/schedina-md13.json').marketCatalog;
assert.deepEqual(catalog, schedina);
for (const m of before.reading.marketCatalog.matches.filter(m => !ids.has(m.matchId))) assert.deepEqual(catalog.matches.find(q => q.matchId === m.matchId), m);
const official = read('data/sources/official-lineups-2026-27.json');
for (const match of catalog.matches.filter(m => ids.has(m.matchId))) for (const leg of match.selections) {
  if (leg.catalogOrigin === 'prediction-v2-player-forecast') {
    assert.equal(leg.modelProbabilityPct, null); assert.equal(leg.betSelection.evaluation.modelProbabilityPct, null);
    assert.equal(leg.betSelection.evaluation.individualReference.appliedToDuo, false);
    if (leg.suggestionAnalysis?.suggested) assert(leg.odds && leg.providerMarketId && leg.providerSelectionId);
  }
  const f = official.fixtures.find(f => f.matchId === match.matchId);
  if (f && leg.marketScope === 'player' && leg.playerId) assert(f.teams.some(t => t.players.some(p => p.playerId === leg.playerId)), 'Nonstarter operational leg');
}
for (const [file, expected] of Object.entries(audit.protectedHashes)) assert.equal(crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'), expected);
const player = data.predictions.find(p => p.matchId === 'inter-genoa-2026-27-md-13').shooters.allPlayers.find(p => p.playerId === 'marcus-thuram');
assert.equal(evaluateCandidate(player, 'sot', ['primary-sot'], { eligible: true }).expectedMinutes, player.expectedMinutesByMetric.sot);
console.log(JSON.stringify({ status: 'PASS', updatedFixtures: ids.size, completeTeams: audit.teams.filter(t => t.status === 'COMPLETE').length,
  unavailableTeams: audit.teams.filter(t => t.status !== 'COMPLETE').map(t => t.teamId), preservedFixtures: audit.preserved }));
