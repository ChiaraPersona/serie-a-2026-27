"use strict";
const assert = require("node:assert/strict"), fs = require("node:fs"), path = require("node:path"), zlib = require("node:zlib");
const { ROOT } = require("./xgot-validation.cjs");
const { aggregateEvidence } = require("./research/xgot/diagnose.cjs");
const { earlier, featureFactors } = require("./research/xgot/model-v2.cjs");
const { captureEligibility } = require("./research/xgot/prospective.cjs");
const read = p => JSON.parse(fs.readFileSync(path.join(ROOT, p), "utf8"));
const original = read("data/normalized/xgot-reconciled-history.json");
assert(!original.matches.some(m => m.providerMatchId === "4535290"));
const source = JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(ROOT, "data/raw/xgot/fotmob/matches/4535290.json.gz")))).payload;
const evidence = aggregateEvidence(source);
assert.equal(evidence.strictAccepted, false);
assert.equal(evidence.evidenceGrade, "aggregate-keeper-corroborated");
const tampered = structuredClone(source);
for (const p of Object.values(tampered.content.playerStats)) for (const s of (p.stats || []).flatMap(g => Object.values(g.stats || {}))) {
  if (s.key === "expected_goals_on_target_faced" && typeof s.stat.value === "number") s.stat.value += 0.02;
}
assert.equal(aggregateEvidence(tampered).evidenceGrade, "quarantined", "Aggregate discrepancy cannot be repaired by tolerance widening");
assert.deepEqual(read("data/analysis/xgot/validation-v1-frozen/held-out-predictions.json"), read("data/analysis/xgot/validation/held-out-predictions.json"), "Extraction repair changed v1 team predictions");
const data = read("data/normalized/xgot-team-research-v2.json");
const ids = new Set();
for (const m of data.matches) {
  assert(!ids.has(m.providerMatchId)); ids.add(m.providerMatchId);
  assert(["shot-reconciled", "aggregate-keeper-corroborated"].includes(m.evidenceGrade));
  assert.equal(m.predictiveUseApproved, false);
}
const target = { date: "2026-11-07", teams: [{ providerTeamId: "1" }, { providerTeamId: "2" }] };
const synthetic = Array.from({ length: 6 }, (_, i) => ({ providerMatchId: String(i + 1), date: `2026-10-${10 + i}`,
  kickoffUtc: `2026-10-${10 + i}T18:00:00Z`, availableAt: "2026-11-06T10:00:00Z", competition: "test",
  teams: [{ providerTeamId: "1", xgot: 1, shotsOnTarget: 4, xg: 1 }, { providerTeamId: "2", xgot: 1, shotsOnTarget: 4, xg: 1 }] }));
for (const variant of ["quality", "execution"]) assert.deepEqual(featureFactors(target, synthetic, variant).factors, [1, 1]);
assert.equal(earlier(synthetic, target, "2026-11-06T09:00:00Z").length, 0, "Unacquired input leaked into capture");
const future = { ...synthetic[0], date: target.date };
assert.equal(earlier([future], target).length, 0);
const fixture = { status: "scheduled", date: "2026-11-07", kickoff: "15:00" };
const baseline = { generatedAt: "2026-11-06T10:00:00Z", expectedGoals: { home: 1, away: 1 } };
assert.equal(captureEligibility(fixture, baseline, "2026-11-06T11:00:00Z"), null);
assert.equal(captureEligibility({ ...fixture, status: "finished" }, baseline, "2026-11-06T11:00:00Z"), "started-or-not-scheduled");
assert.equal(captureEligibility(fixture, baseline, "2026-11-08T11:00:00Z"), "started-or-not-scheduled");
assert.equal(captureEligibility(fixture, { ...baseline, generatedAt: "2026-11-06T12:00:00Z" }, "2026-11-06T11:00:00Z"), "missing-future-or-stale-baseline");
console.log(`OK xGOT v2: ${data.matches.length} distinct graded observations; aggregate/shot separation, preserved v1 forecasts, normalized features, acquisition cutoff and capture eligibility`);
