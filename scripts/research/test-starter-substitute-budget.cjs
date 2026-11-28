'use strict';
const { test } = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs');
const { cappedMinutes, allocateMinutes, rotationEvidence, jointBudget, baselineEngine, individualEvidence } = require('./prototype-starter-substitute-budget.cjs');
function starters() { return Array.from({ length: 10 }, (_, i) => ({ playerId: `s${i}`, role: i < 4 ? 'Difensore' : i < 8 ? 'Centrocampista' : 'Attaccante', expectedMinutes: 75 })); }
function bench() { return ['Difensore', 'Centrocampista', 'Attaccante'].map((role, i) => ({ playerId: `b${i}`, role, namedBenchSamples: 4, entries: 4, totalEntryMinutes: 100 })); }
test('capacity-constrained minutes preserve unknown residual without exceeding capacities', () => {
  const r = cappedMinutes(100, [{ playerId: 'a', weight: 3, capacity: 20 }, { playerId: 'b', weight: 1, capacity: 30 }]);
  assert.equal(r.unassignedMinutes, 50);
  assert(r.allocations.every(p => p.minutes <= p.capacity));
  assert.equal(cappedMinutes(10, []).unassignedMinutes, 10);
});
test('outfield budget conserves 900 minutes and respects role-compatible slots', () => {
  const r = allocateMinutes(starters(), bench());
  assert.equal(r.status, 'COMPLETE');
  assert.equal(r.starterMinutes + r.substituteMinutes, 900);
  assert.equal(r.substituteMinutes, 150);
  assert(r.slots.every(slot => starters().find(p => p.playerId === slot.starterId).role === bench().find(p => p.playerId === slot.substituteId).role));
  for (const s of starters()) assert(Math.abs(r.slots.filter(x => x.starterId === s.playerId).reduce((n, x) => n + x.minutes, 0) - 15) < 1e-9);
});
test('missing compatible reserves and duplicate identities cause abstention', () => {
  assert.equal(allocateMinutes(starters(), []).status, 'ABSTAIN');
  assert.equal(allocateMinutes(starters(), [...bench(), bench()[0]]).status, 'ABSTAIN');
  const invalid = starters(); invalid[1].playerId = invalid[0].playerId;
  assert.equal(allocateMinutes(invalid, bench()).status, 'ABSTAIN');
});
test('rotation features exclude target, later matchdays and data not yet available', () => {
  const match = (id, md, date, minutes) => ({ id, matchday: md, date, status: 'finished', homeTeam: 't', awayTeam: 'u',
    playerStats: { home: [{ playerId: 'b', starter: false, minutes, shots: 0 }] }, didNotPlay: { home: [] } });
  const history = [match('old', 7, '2026-10-01', 20), match('target', 9, '2026-10-10', 40), match('late', 8, '2026-10-12', 50)];
  const e = rotationEvidence(history, 't', 'b', 9, '2026-10-10T12:00:00Z');
  assert.equal(e.namedBenchSamples, 1); assert.equal(e.totalEntryMinutes, 20); assert.equal(e.current.shots, 0);
  assert.deepEqual(e.evidenceMatchIds, ['old']);
});
test('joint shot budget preserves total team shots and relative starter shares', () => {
  const r = jointBudget(12, [{ playerId: 'a', raw: 1 }, { playerId: 'b', raw: 2 }], [{ playerId: 'c', raw: 1 }]);
  assert.equal(r.starterShots + r.substituteShots, 12);
  assert.equal(r.starters[1].projectedShots / r.starters[0].projectedShots, 2);
  assert.equal(jointBudget(12, [{ raw: null }], []).status, 'ABSTAIN');
});
test('individual rates require real historical or current observations', () => {
  assert.equal(individualEvidence({}, { minutes: 90, shots: null, shotsCoverage: 0 }), null);
  assert.equal(individualEvidence({}, { minutes: 90, shots: 0, shotsCoverage: 2 }), 'OBSERVED_CURRENT_WITH_EXISTING_ROLE_REGULARIZATION');
  assert.equal(individualEvidence({ previousSeason: { totals: { minutes: 900, per90: { shots: 0 } } } }, null), 'OBSERVED_HISTORICAL');
});
test('existing baseline functions run isolated and leave roster inputs unchanged', () => {
  const model = baselineEngine(fs.readFileSync('scripts/predictions/engine.js', 'utf8'));
  const member = { id: 'b', role: 'Attaccante', previousSeason: { totals: { minutes: 1200, per90: { shots: 2 } } } };
  const before = JSON.stringify(member), result = model.rate(member, { minutes: 180, shots: 3, shotsCoverage: 2 });
  assert(Number.isFinite(result.value) && result.value > 0); assert.equal(JSON.stringify(member), before);
});
test('conditional recent minutes ignore DNP and bench appearances without turning missing data into zero', () => {
  const games = [
    { id: 'one', matchday: 5, date: '2026-10-01', status: 'finished', homeTeam: 't', awayTeam: 'u', playerStats: { home: [{ playerId: 'p', starter: true, minutes: 90, shots: 1 }] } },
    { id: 'two', matchday: 6, date: '2026-10-02', status: 'finished', homeTeam: 't', awayTeam: 'u', playerStats: { home: [{ playerId: 'p', starter: false, minutes: 20, shots: 0 }] } },
    { id: 'three', matchday: 7, date: '2026-10-03', status: 'finished', homeTeam: 't', awayTeam: 'u', playerStats: { home: [] }, didNotPlay: { home: [{ playerId: 'p' }] } },
    { id: 'four', matchday: 8, date: '2026-10-04', status: 'finished', homeTeam: 't', awayTeam: 'u', playerStats: { home: [{ playerId: 'p', starter: true, minutes: 80, shots: 1 }] } }
  ];
  const c = rotationEvidence(games, 't', 'p', 9, '2026-10-05T12:00:00Z').current;
  assert.equal(c.starterAppearances, 2); assert.equal(c.starterMinutes, 170);
  assert.equal(c.recentTeamMatches, 2); assert.equal(c.recentAverageMinutes, 85);
  assert.equal(rotationEvidence([], 't', 'p', 9, '2026-10-05T12:00:00Z').current.recentAverageMinutes, null);
});
test('unchanged expected-minute function responds to conditional recent-start input', () => {
  const model = baselineEngine(fs.readFileSync('scripts/predictions/engine.js', 'utf8'));
  const member = { role: 'Attaccante', previousSeason: { totals: { minutes: 2700, appearances: 30, starts: 30, substituteAppearances: 0 } } };
  const conditional = model.minutes(member, { starterAppearances: 2, starterMinutes: 170, recentTeamMatches: 2, recentAverageMinutes: 85 });
  const unconditional = model.minutes(member, { starterAppearances: 2, starterMinutes: 170, recentTeamMatches: 5, recentAverageMinutes: 34 });
  assert(conditional.expectedMinutes > unconditional.expectedMinutes + 10);
  assert(conditional.expectedMinutes <= 90);
});
