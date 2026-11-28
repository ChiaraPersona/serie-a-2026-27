'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { logPMF, tail, fitAlpha, describe, compare, temporalSplit } = require('./diagnose-individual-shots.cjs');
test('Poisson and negative binomial masses sum to one and retain the same mean', () => {
  for (const alpha of [0, 0.1, 0.7, 2]) {
    const mass = Array.from({ length: 300 }, (_, k) => Math.exp(logPMF(2, k, alpha)));
    assert(Math.abs(mass.reduce((a, b) => a + b, 0) - 1) < 1e-9);
    assert(Math.abs(mass.reduce((a, p, k) => a + p * k, 0) - 2) < 1e-8);
  }
});
test('zero, missing values and threshold ordering remain distinct', () => {
  assert.equal(tail(null, 1), null);
  assert.equal(tail(-1, 1), null);
  assert.equal(tail(0, 1), 0);
  assert.equal(logPMF(0, 0), 0);
  assert.equal(logPMF(0, 1), -Infinity);
  for (const a of [0, 0.2, 1]) assert(tail(2, 1, a) >= tail(2, 2, a) && tail(2, 2, a) >= tail(2, 3, a));
  assert(Math.abs(tail(2, 1) - (1 - Math.exp(-2))) < 1e-12);
});
test('dispersion fit detects overdispersion without changing the original mean', () => {
  const concentrated = Array.from({ length: 100 }, () => ({ mu: 2, actual: 2 }));
  const dispersed = Array.from({ length: 100 }, (_, i) => ({ mu: 2, actual: i < 90 ? 0 : 20 }));
  assert.equal(fitAlpha(concentrated).alpha, 0);
  assert(fitAlpha(dispersed).alpha > 0);
  assert(dispersed.every(r => r.mu === 2));
});
test('temporal training excludes the target matchday and other engine versions', () => {
  const rs = [{ modelVersion: 'a', matchday: 7 }, { modelVersion: 'a', matchday: 9 }, { modelVersion: 'b', matchday: 7 }];
  const s = temporalSplit(rs, 'a', 9);
  assert.deepEqual(s.train, [rs[0]]);
  assert.deepEqual(s.test, [rs[1]]);
});
test('oracle actual minutes is only descriptive and zero errors remain numeric', () => {
  const s = describe([{ matchId: 'm', mu: 2, actual: 1, expectedMinutes: 80, actualMinutes: 40 }]);
  assert.equal(s.minutes.oracleActualMinutesCountMAE, 0);
  assert.equal(s.minutes.sameSampleOriginalCountMAE, 1);
  assert.equal(s.minutes.oracleWarning, 'POSTMATCH_DIAGNOSTIC_ONLY_NOT_A_FORECAST_OR_CAUSAL_EFFECT');
  assert.equal(describe([]).countMAE, null);
});
test('paired comparisons use identical rows and preserve unknown empty metrics', () => {
  assert.equal(compare([], 'negativeBinomial', 1).pairedDelta, null);
  const rows = Array.from({ length: 10 }, (_, i) => ({ matchId: `m${i}`, actual: 0, original: { 1: 0.5 }, negativeBinomial: { probabilities: { 1: 0.5 } } }));
  const s = compare(rows, 'negativeBinomial', 1);
  assert.equal(s.pairedDelta, 0);
  assert.deepEqual(s.pairedFixtureBootstrap95, [0, 0]);
});
