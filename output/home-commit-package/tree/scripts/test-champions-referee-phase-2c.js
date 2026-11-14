"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const read = file => JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));
const finite = value => Number.isFinite(Number(value));
const unique = values => new Set(values).size;

const matches = read("data/analysis/champions/referee-phase-2b/match-totals.json").matches;
const teams = read("data/analysis/champions/referee-phase-2b/team-cards.json").rows;
const splits = read("data/analysis/champions/referee-phase-2b/rolling-origin-splits.json").folds;
const evidence = read("data/analysis/champions/referee-phase-2c/designation-evidence.json");
const calibration = read("data/analysis/champions/referee-phase-2c/calibration-results.json");
const predictions = read("data/analysis/champions/referee-phase-2c/oos-predictions.json").rows;

assert.strictEqual(matches.length, 628);
assert.strictEqual(teams.length, 1256);
assert.strictEqual(evidence.rows.length, 628);
assert.strictEqual(unique(evidence.rows.map(row => row.matchId)), 628);
assert.strictEqual(evidence.summary.originalTimestampVerified, 6);
assert.strictEqual(evidence.summary.indirectPreKickoff, 475);
assert.strictEqual(evidence.summary.notVerifiable, 147);
assert.strictEqual(evidence.summary.usablePreKickoff, 481);
assert.strictEqual(evidence.summary.usableAdvance48h, 33);
assert.strictEqual(evidence.summary.rejectedBecauseCurrentArchiveContentWasUpdatedAtOrAfterKickoff, 53);

for (const row of evidence.rows) {
  if (row.status === "ORIGINAL_TIMESTAMP_VERIFIED") {
    assert.ok(Date.parse(row.publishedUpperBound) < Date.parse(row.kickoffUtc), row.matchId);
    assert.strictEqual(row.authority, "UEFA");
  } else if (row.status === "INDIRECT_PRE_KICKOFF") {
    assert.ok(Date.parse(row.publishedAt) < Date.parse(row.kickoffUtc), row.matchId);
    assert.ok(Date.parse(row.evidenceUpdatedAt) < Date.parse(row.kickoffUtc), row.matchId);
    assert.ok(row.leadHours > 0 && row.leadHours <= 14 * 24, row.matchId);
  } else {
    assert.strictEqual(row.horizons.preKickoff, false);
    assert.strictEqual(row.horizons.advance48h, false);
  }
}

const matchById = new Map(matches.map(row => [row.matchId, row]));
for (const fold of splits) {
  const latestTrain = Math.max(...fold.trainMatchIds.map(id => Date.parse(matchById.get(id).kickoffUtc)));
  const earliestTest = Math.min(...fold.validationMatchIds.map(id => Date.parse(matchById.get(id).kickoffUtc)));
  assert.ok(latestTrain < earliestTest, `${fold.id}: outer-fold chronology`);
}

assert.strictEqual(calibration.status, "RESEARCH_ONLY_NOT_INTEGRATED");
assert.strictEqual(calibration.data.historicalMatches, 628);
assert.strictEqual(calibration.data.teamRows, 1256);
assert.strictEqual(calibration.data.outerOosMatches, 503);
assert.strictEqual(calibration.data.outerOosTeamRows, 1006);
assert.ok(calibration.featurePolicy.excluded.includes("actual lineups/participants"));
assert.ok(calibration.featurePolicy.excluded.includes("actual minutes"));
assert.ok(calibration.featurePolicy.excluded.includes("current-match events/statistics"));
for (const level of ["match", "team"]) {
  for (const target of ["yellowCards", "secondYellowCards", "directRedCards", "totalCards"])
    assert.strictEqual(calibration.targetSummary[level][target].n, level === "match" ? 628 : 1256);
  assert.ok(calibration.tuning.filter(row => row.level === level).every(row => row.innerTrainN > 0 && row.innerValidationN > 0));
  assert.strictEqual(calibration.results[level].baselineA.metrics.n, level === "match" ? 503 : 1006);
  assert.strictEqual(calibration.results[level].refereeB.metrics.n, level === "match" ? 503 : 1006);
  assert.strictEqual(calibration.results[level].refereeB.segments.designationCertifiedSubset.preKickoff.n, level === "match" ? 379 : 758);
  assert.strictEqual(calibration.results[level].refereeB.segments.designationCertifiedSubset.advance48h.n, level === "match" ? 16 : 32);
}

for (const row of matches)
  assert.strictEqual(row.cards.totalCards, row.cards.yellowCards + row.cards.secondYellowCards + row.cards.directRedCards);
for (const row of teams)
  assert.strictEqual(row.totalCards, row.yellowCards + row.secondYellowCards + row.directRedCards);

const keys = predictions.map(row => [row.level, row.target, row.model, row.foldId, row.matchId, row.teamId || "", row.homeAway || ""].join("|"));
assert.strictEqual(unique(keys), keys.length);
for (const row of predictions) {
  assert.ok(finite(row.predictedMean) && row.predictedMean > 0);
  assert.ok(finite(row.negativeLogScore) && row.negativeLogScore >= 0);
  for (const value of Object.values(row.overProbabilities)) assert.ok(finite(value) && value >= 0 && value <= 1);
}

for (const level of ["match", "team"]) {
  const a = predictions.filter(row => row.level === level && row.model === "baseline_no_referee");
  const b = predictions.filter(row => row.level === level && row.model === "referee_hierarchical");
  const key = row => `${row.matchId}:${row.teamId || ""}:${row.homeAway || ""}`;
  assert.deepStrictEqual(a.map(key).sort(), b.map(key).sort(), `${level}: identical A/B sample`);
}

console.log("Phase 2C integrity PASS: 628 inputs, 503 match OOS, 1006 team OOS, temporal designation guard and A/B identity PASS");
