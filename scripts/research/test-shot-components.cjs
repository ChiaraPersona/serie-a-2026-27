'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { namedFunction, allocationEngine, playerStages, countSummary, reserveBudget } = require('./audit-shot-components.cjs');
test('extract only named top-level allocation functions', () => {
  const source = 'function a(){return 1;}\nfunction b(){return 2;}\n';
  assert.equal(namedFunction(source, 'a').trim(), 'function a(){return 1;}');
  assert.equal(namedFunction(source, 'missing'), null);
});
test('isolated original allocation conserves target and does not mutate supplied rows', () => {
  const source = fs.readFileSync('scripts/predictions/engine.js', 'utf8');
  const engine = allocationEngine(source);
  const rows = [{ playerId: 'a', projectedShots: 1 }, { playerId: 'b', projectedShots: 3 }];
  const prior = JSON.stringify(rows);
  const out = engine.apply(rows, 10, null);
  assert.deepEqual(out, [2.5, 7.5]);
  assert.equal(JSON.stringify(rows), prior);
  assert.equal(out.reduce((a, b) => a + b, 0), 10);
});
test('isolated VM provides no filesystem or module loader to allocation code', () => {
  const source = 'const cleanName = v=>v;\nfunction reconcilePlayerVolumes(rows){require("fs").writeFileSync("forbidden","x");}\nfunction next(){}';
  assert.throws(() => allocationEngine(source).apply([{ projectedShots: 1 }], 1, null), /require is not defined/);
});
test('stage trace preserves zeros and rejects unknown input instead of inventing factors', () => {
  const p = { playerBaselineStability: { value: 2 }, baselineShots90: 1, minutesFactor: 0.8, shotsMatchupFactor: 1.1, projectedShots: 2.1 };
  assert.equal(playerStages(p).baselineExposure, 1.6);
  assert(Math.abs(playerStages(p).rawFull - 1.76) < 1e-12);
  assert.equal(playerStages({ ...p, shotsMatchupFactor: undefined }), null);
  assert.equal(playerStages({ ...p, playerBaselineStability: { value: 0 } }).baselineExposure, 0);
  assert.equal(countSummary([], 'final').bias, null);
});
test('substitute reserve conserves player plus substitute budget and preserves shares', () => {
  const values = [1, 2, 3].map(mu => reserveBudget(mu, 6, 12, 0.25));
  assert.equal(values.reduce((a, b) => a + b, 0), 9);
  assert.equal(values[1] / values[0], 2);
  assert.equal(values.reduce((a, b) => a + b, 0) + 12 * 0.25, 12);
  assert.equal(reserveBudget(0, 6, 12, 0.25), 0);
  assert.equal(reserveBudget(1, 0, 12, 0.25), null);
  assert.equal(reserveBudget(1, 6, 12, null), null);
  assert.equal(reserveBudget(1, 6, 12, 1.1), null);
});
