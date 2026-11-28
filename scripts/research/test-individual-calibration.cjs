'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { adjust, fit, split, paired } = require('./calibrate-individual-probabilities.cjs');
test('logit correction preserves threshold order, endpoints and unknown values', () => {
  assert.equal(adjust(null, -0.3), null);
  assert.equal(adjust(1.5, -0.3), null);
  assert.equal(adjust(0, -0.3), 0);
  assert.equal(adjust(1, -0.3), 1);
  assert(adjust(0.8, -0.3) > adjust(0.5, -0.3));
  assert(adjust(0.5, -0.3) > adjust(0.2, -0.3));
  assert(adjust(0.8, -0.3) < 0.8);
});
const training = () => Array.from({ length: 100 }, (_, i) => ({ matchId: `m${i}`, playerId: 'p', target: 'shots1Plus', p: 0.8, y: i < 50 ? 1 : 0 }));
test('fit reduces overestimated probabilities and is invariant to repeated target weight', () => {
  const rows = training(), intercept = fit(rows);
  assert(intercept < 0);
  assert(adjust(0.8, intercept) > 0.5 && adjust(0.8, intercept) < 0.8);
  assert(Math.abs(intercept - fit(rows.flatMap(r => [r, { ...r, target: 'shots2Plus' }]))) < 1e-10);
});
test('fixed endpoint probabilities cannot create a spurious intercept gradient', () => {
  assert(Math.abs(fit([{ matchId: 'm', playerId: 'p', target: 'shots1Plus', p: 0, y: 1 }])) < 1e-10);
});
test('temporal split excludes validation outcomes and other versions from fitting', () => {
  const rows = [{ modelVersion: 'v1', matchday: 7, y: 0 }, { modelVersion: 'v1', matchday: 9, y: 1 }, { modelVersion: 'v2', matchday: 7, y: 1 }];
  const s = split(rows, 9, 'v1');
  assert.deepEqual(s.train, [rows[0]]);
  assert.deepEqual(s.test, [rows[1]]);
  assert.deepEqual(split([{ ...rows[0] }, { ...rows[1], y: 0 }, rows[2]], 9, 'v1').train, s.train);
});
test('no data remains unknown and identity calibration has zero paired difference', () => {
  assert.equal(paired([], new Map()).brierDelta, null);
  const rows = training().map(r => ({ ...r, matchday: 9 }));
  const s = paired(rows, new Map([[9, 0]]));
  assert.equal(s.brierDelta, 0);
  assert.deepEqual(s.pairedFixtureBootstrap95, [0, 0]);
});
