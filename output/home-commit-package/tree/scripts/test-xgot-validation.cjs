"use strict";
const assert = require("node:assert/strict"), fs = require("node:fs"), path = require("node:path"), crypto = require("node:crypto"), zlib = require("node:zlib");
const { ROOT } = require("./xgot-validation.cjs");
const { reconcile } = require("./import-xgot-history.cjs");
const { previous, buildInput, xgotProjection, loadRows, pairedCI } = require("./research/xgot/run.cjs");
const read = file => JSON.parse(fs.readFileSync(path.join(ROOT, file), "utf8"));
const approved = read("data/normalized/xgot-reconciled-history.json");
const audit = read("data/analysis/xgot/reconciliation.json");
const report = read("data/analysis/xgot/validation/report.json");
const testForecasts = read("data/analysis/xgot/validation/held-out-predictions.json").forecasts;
const validIds = new Set(approved.matches.map(m => m.providerMatchId));
assert.equal(validIds.size, approved.matches.length);
assert.equal(approved.matches.length + audit.quarantine.length, 1138);
assert.equal(audit.fixtureIdentityRegistry.filter(m => m.fixtureId).length, 1138);
assert.equal(audit.summary.existingIdentityConflicts, 0);
for (const source of [...audit.inputs, ...report.inputs]) {
  const current=crypto.createHash("sha256").update(fs.readFileSync(path.join(ROOT,source.path))).digest("hex");
  if(current!==source.sha256&&source.path==='scripts/predictions/engine.js'){
    assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT,'data/predictions/xgot-prospective/methods',source.path))).digest('hex'),source.sha256,source.path);
  }else assert.equal(current,source.sha256,source.path);
}
for (const m of approved.matches) {
  const raw = JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(ROOT, m.source.rawPath))));
  assert.deepEqual(reconcile(raw.payload).reasons, []);
  assert.equal(m.scope, "regulation-time");
  assert(m.fixtureId && m.teams.every(t => t.historicalTeamId));
  for (const p of m.players) {
    if (!p.playerId) assert.equal(p.identityStatus, "unresolved");
    if (p.verification === "quarantined-player-value") assert.equal(p.xgot, null);
    if (p.observedShotEvents === 0 && p.publishedXgot === null) assert.equal(p.xgot, null, "Missing player observations must remain null");
  }
}
for (const m of audit.quarantine) assert(!validIds.has(m.providerMatchId));
const pool = loadRows();
const first = testForecasts.find(m => m.competition === "serie-a");
assert(first);
const target = pool.find(m => m.providerMatchId === first.providerMatchId);
const history = previous(pool, target);
assert(history.every(m => m.date < target.date));
const changed = structuredClone(pool);
for (const m of changed) if (m.date >= target.date) { m.score = { home: 99, away: 88 }; for (const t of m.teams) { t.xgot = 99; t.baselineXg = 99; } }
const alteredHistory = previous(changed, target);
assert.deepEqual(buildInput(target, history), buildInput(target, alteredHistory), "Future outcomes leaked into baseline");
assert.deepEqual(xgotProjection(target, history), xgotProjection(target, alteredHistory), "Future xGOT leaked into candidate");
const sameDay = { ...history[0], competition: target.competition, date: target.date };
assert(!previous([sameDay], target).length, "Same-day embargo failed");
for (const m of testForecasts) {
  assert.equal(m.season, "2025-26");
  assert(m.latestHistoryDate < m.date);
  for (const model of [m.baseline, m.candidate]) {
    assert(model.p.every(p => p > 0 && p < 1));
    assert(Math.abs(model.p.reduce((n, p) => n + p, 0) - 1) < 1e-9);
  }
}
for (const c of report.competitions) {
  assert.equal(c.selectedWeight, c.developmentRanking[0].weight, "Test set used for weight selection");
  assert.equal(c.testFixtures, testForecasts.filter(m => m.competition === c.competition).length);
  assert.equal(c.predictiveUseApproved, false);
  assert.equal(c.retrospectiveResearchGatePassed, Object.values(c.gates).every(Boolean));
  if (c.baseline) assert(c.baseline.logLoss > 0 && c.baseline.brier >= 0);
}
const identical = [{ date: "2025-08-01", baseline: { logLoss: 1 }, candidate: { logLoss: 1 } }];
assert.equal(pairedCI(identical).lower95, 0);
assert.equal(pairedCI(identical).upper95, 0);
assert.equal(report.predictiveUseApproved, false);
assert.equal(report.individualAndDuoMarketsValidated, false);
console.log(`OK xGOT validation: ${approved.matches.length} reconciled matches; historical IDs, quarantine, hashes, missing observations, chronological holdout, future-data mutation and probability checks`);
