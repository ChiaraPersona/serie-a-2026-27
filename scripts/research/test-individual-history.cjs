'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { prematch, summarize, observedRows } = require('./verify-individual-history.cjs');
const fixture = { players: [{ playerId: 'p1', teamId: 't1', probabilities: { shots1Plus: 0, sot1Plus: 0.5 } }] };
const observed = { playerId: 'p1', teamId: 't1', starter: true, shots: 0, sot: null };
test('both archive availability and forecast generation must precede kickoff', () => {
  const kickoff = Date.parse('2026-11-01T18:00:00Z');
  assert(prematch('2026-11-01T17:00:00Z', '2026-11-01T16:00:00Z', kickoff));
  assert(!prematch('2026-11-01T18:00:00Z', '2026-11-01T16:00:00Z', kickoff));
  assert(!prematch('2026-11-01T17:00:00Z', '2026-11-01T19:00:00Z', kickoff));
  assert(!prematch('invalid', '2026-11-01T16:00:00Z', kickoff));
});
test('true zero is observed while null SOT remains unavailable', () => {
  const { rows, exclusions } = observedRows(fixture, [observed]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].p, 0);
  assert.equal(rows[0].y, 0);
  assert.equal(exclusions.OBSERVATION_UNAVAILABLE, 1);
});
test('reject another team, duplicate IDs and nonstarters without name fallback', () => {
  for (const actual of [[{ ...observed, teamId: 't2' }], [observed, observed], [{ ...observed, starter: false }]]) {
    assert.equal(observedRows(fixture, actual).rows.length, 0);
  }
});
test('impossible SOT greater than total shots is excluded', () => {
  const r = observedRows(fixture, [{ ...observed, sot: 1 }]);
  assert.equal(r.rows.length, 0);
  assert.equal(r.exclusions.INCONSISTENT_SHOTS_AND_SOT, 1);
});
test('empty metrics are unknown and probabilities at one enter the last bin', () => {
  assert.equal(summarize([]).brier, null);
  const s = summarize([{ matchId: 'm', p: 1, y: 1 }]);
  assert.equal(s.brier, 0);
  assert.equal(s.bins.at(-1).n, 1);
  assert.equal(s.gapFixtureBootstrap95, null);
});
test('fixture bootstrap is deterministic and preserves constant cluster gap', () => {
  const rows = Array.from({ length: 10 }, (_, i) => ({ matchId: `m${i}`, p: 0.5, y: 0 }));
  const s = summarize(rows);
  assert.deepEqual(s.gapFixtureBootstrap95, [0.5, 0.5]);
  assert.deepEqual(s, summarize(rows));
});
