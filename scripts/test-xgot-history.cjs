"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const zlib = require("node:zlib");
const crypto = require("node:crypto");
const { reconcile, TOLERANCE } = require("./import-xgot-history.cjs");
const root = path.resolve(__dirname, "..");
const read = p => JSON.parse(fs.readFileSync(path.join(root, p), "utf8"));
function example() {
  return { header: { teams: [{ id: 1 }, { id: 2 }] }, content: {
    shotmap: { shots: [{ id: 11, teamId: 1, playerId: 99, period: "FirstHalf", isOnTarget: true,
      isBlocked: false, isSavedOffLine: false, isOwnGoal: false, expectedGoalsOnTarget: 0.234 }] },
    stats: { Periods: { All: { stats: [{ stats: [
      { key: "expected_goals_on_target", rawStats: [{ value: 0.23 }, { value: 0 }] },
      { key: "total_shots", rawStats: [{ value: 1 }, { value: 0 }] },
      { key: "ShotsOnTarget", rawStats: [{ value: 1 }, { value: 0 }] }
    ] }] } } }
  } };
}
assert.deepEqual(reconcile(example()).reasons, []);
for (const [change, reason] of [
  [d => d.content.shotmap.shots.push(d.content.shotmap.shots[0]), "duplicate-shot-id"],
  [d => { d.content.shotmap.shots[0].expectedGoalsOnTarget = null; }, "invalid-shot-xgot"],
  [d => { d.content.shotmap.shots[0].expectedGoalsOnTarget = 0.3; }, "xgot-total-mismatch"],
  [d => { d.content.shotmap.shots[0].isBlocked = true; }, "sot-count-mismatch"],
  [d => { d.content.shotmap.shots[0].playerId = 0; }, "invalid-provider-player-id"],
  [d => { d.content.shotmap.shots[0].period = "ExtraFirstHalf"; }, "unsupported-extra-time"],
  [d => { delete d.content.stats; }, "xgot-total-mismatch"]
]) {
  const d = example(); change(d);
  assert(reconcile(d).reasons.some(r => r.includes(reason)), reason);
}
const lineClearance = example();
lineClearance.content.shotmap.shots[0].isSavedOffLine = true;
lineClearance.content.shotmap.shots[0].isBlocked = true;
assert.deepEqual(reconcile(lineClearance).reasons, [], "Last-line blocks count as SOT");
const history = read("data/normalized/xgot-history.json");
const audit = read("data/analysis/xgot/history-audit.json");
for (const input of audit.identityInputs) {
  assert.equal(crypto.createHash("sha256").update(fs.readFileSync(path.join(root, input.path))).digest("hex"), input.sha256);
}
assert.equal(history.predictiveUseApproved, false);
assert.equal(history.fullSeasonVerified, false);
assert.equal(history.matches.length + audit.quarantine.length, history.summary.candidateMatches);
const ids = new Set();
for (const m of history.matches) {
  assert(!ids.has(m.providerMatchId)); ids.add(m.providerMatchId);
  const bytes = fs.readFileSync(path.join(root, m.source.rawPath));
  assert.equal(crypto.createHash("sha256").update(bytes).digest("hex"), m.source.sha256);
  const raw = JSON.parse(zlib.gunzipSync(bytes));
  assert.equal(raw.payload.general.finished, true);
  assert.deepEqual(reconcile(raw.payload).reasons, []);
  assert.equal(m.availableAt, raw.retrievedAt);
  assert.equal(m.date, raw.payload.general.matchTimeUTCDate.slice(0, 10));
  for (const t of m.teams) {
    assert(Math.abs(t.xgot - t.reportedXgot) <= TOLERANCE);
    assert(Math.abs(t.players.reduce((sum, p) => sum + p.xgot, 0) - t.xgot) < 1e-9);
    assert.equal(t.players.reduce((sum, p) => sum + p.shots, 0), t.shots);
    assert.equal(t.players.reduce((sum, p) => sum + p.shotsOnTarget, 0), t.shotsOnTarget);
    assert.equal(new Set(t.shotEvidence.map(s => s.id)).size, t.shots);
    for (const p of t.players) {
      assert(p.playerId !== undefined);
      if (!p.playerId) assert.equal(p.identityStatus, "unresolved");
      if (p.minutes === null) assert.equal(p.xgotPer90, null);
      assert(p.xgot >= 0 && p.xgot <= p.shotsOnTarget);
    }
  }
}
for (const m of audit.quarantine) {
  assert(!ids.has(m.providerMatchId));
  assert(m.reasons.length > 0);
}
console.log(`OK xGOT history: ${history.matches.length} reconciled fixtures, ${audit.quarantine.length} quarantined; provenance, conservation, missing data and rejection cases`);
