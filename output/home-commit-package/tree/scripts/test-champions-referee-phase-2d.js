"use strict";

const assert = require("assert");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const read = file => JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));
const hash = file => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
const unique = values => new Set(values).size;
const finite = value => Number.isFinite(Number(value));

const matches = read("data/analysis/champions/referee-phase-2d/dataset/match-totals.json").matches;
const teams = read("data/analysis/champions/referee-phase-2d/dataset/team-cards.json").rows;
const players = read("data/analysis/champions/referee-phase-2d/dataset/individual-cards.json").rows;
const quality = read("data/analysis/champions/referee-phase-2d/dataset/quality-report.json");
const evidence = read("data/analysis/champions/referee-phase-2d/designation-evidence.json");
const calibration = read("data/analysis/champions/referee-phase-2d/calibration-results.json");
const predictions = read("data/analysis/champions/referee-phase-2d/final-holdout-predictions.json").rows;
const manifest = read("data/analysis/champions/referee-phase-2d/designation-source-manifest.json");

assert.strictEqual(matches.length, 753);
assert.strictEqual(teams.length, 1506);
assert.strictEqual(players.length, 23119);
assert.strictEqual(unique(matches.map(row => row.matchId)), 753);
assert.strictEqual(unique(teams.map(row => `${row.matchId}:${row.homeAway}`)), 1506);
assert.strictEqual(unique(players.map(row => `${row.matchId}:${row.playerId}`)), 23119);
assert.deepStrictEqual(Object.fromEntries(["2021-22", "2022-23", "2023-24", "2024-25", "2025-26"].map(season => [season, matches.filter(row => row.season === season).length])), {
  "2021-22": 125, "2022-23": 125, "2023-24": 125, "2024-25": 189, "2025-26": 189
});
assert.strictEqual(quality.integrity.duplicateMatchIds, 0);
assert.strictEqual(quality.integrity.duplicateTeamKeys, 0);
assert.strictEqual(quality.integrity.duplicatePlayerKeys, 0);
assert.deepStrictEqual(quality.integrity.cardArithmeticFailures, []);
assert.deepStrictEqual(quality.integrity.teamToMatchCardFailures, []);
assert.deepStrictEqual(quality.integrity.playerToTeamCardFailures, []);

assert.strictEqual(evidence.rows.length, 753);
assert.strictEqual(evidence.summary.originalTimestampVerified, 7);
assert.strictEqual(evidence.summary.indirectPreKickoff, 582);
assert.strictEqual(evidence.summary.notVerifiable, 164);
assert.strictEqual(evidence.summary.usablePreKickoff, 589);
assert.strictEqual(evidence.summary.usableAdvance48h, 38);
for (const row of evidence.rows) {
  if (row.status === "ORIGINAL_TIMESTAMP_VERIFIED") assert.ok(Date.parse(row.publishedUpperBound) < Date.parse(row.kickoffUtc), row.matchId);
  if (row.status === "INDIRECT_PRE_KICKOFF") {
    assert.ok(Date.parse(row.publishedAt) < Date.parse(row.kickoffUtc), row.matchId);
    assert.ok(Date.parse(row.evidenceUpdatedAt) < Date.parse(row.kickoffUtc), row.matchId);
  }
}
for (const row of manifest.files) {
  const file = path.join(root, row.path);
  assert.ok(fs.existsSync(file), row.path);
  assert.strictEqual(hash(file), row.sha256, row.path);
}

assert.strictEqual(calibration.status, "RESEARCH_ONLY_NOT_INTEGRATED");
assert.strictEqual(calibration.dataset.matches, 753);
assert.strictEqual(calibration.dataset.teamRows, 1506);
assert.strictEqual(calibration.splitPlan.finalHoldoutSeason, "2025-26");
assert.ok(calibration.splitPlan.developmentFolds.every(fold => fold.validation !== "2025-26" && !fold.train.includes("2025-26")));
assert.ok(!calibration.splitPlan.finalTrainSeasons.includes("2025-26"));
assert.strictEqual(calibration.marketVerdicts.refereeEffect, "DO_NOT_ACTIVATE");

for (const level of ["match", "team"]) {
  const result = calibration.results[level];
  assert.strictEqual(result.sample.finalHoldoutMatches, 189);
  assert.strictEqual(result.sample.finalHoldoutRows, level === "match" ? 189 : 378);
  const shrinkage = result.selectionOnDevelopmentOnly.shrinkageCandidates.map(row => row.shrinkage);
  assert.ok(shrinkage.includes("NULL_EFFECT"));
  assert.ok(shrinkage.includes(80));
  assert.ok(shrinkage.some(value => typeof value === "number" && value > 80));
  assert.strictEqual(result.finalHoldout.decisionCriterion.passed, false);
  assert.strictEqual(result.finalHoldout.horizons.preKickoff.n, level === "match" ? 133 : 266);
  assert.strictEqual(result.finalHoldout.horizons.advance48h.n, level === "match" ? 5 : 10);
}

const keys = predictions.map(row => [row.level, row.model, row.matchId, row.teamId || "", row.homeAway || ""].join("|"));
assert.strictEqual(unique(keys), keys.length);
for (const row of predictions) {
  assert.strictEqual(row.season, "2025-26");
  assert.ok(finite(row.predictedMean) && row.predictedMean > 0);
  assert.ok(finite(row.negativeLogScore));
  for (const probability of Object.values(row.overProbabilities)) assert.ok(probability >= 0 && probability <= 1);
}
for (const level of ["match", "team"]) {
  const identity = row => `${row.matchId}:${row.teamId || ""}:${row.homeAway || ""}`;
  const samples = ["historical_baseline", "no_referee", "referee_selected"].map(model => predictions.filter(row => row.level === level && row.model === model).map(identity).sort());
  assert.deepStrictEqual(samples[0], samples[1]);
  assert.deepStrictEqual(samples[1], samples[2]);
}

for (const row of matches) assert.strictEqual(row.cards.totalCards, row.cards.yellowCards + row.cards.secondYellowCards + row.cards.directRedCards);
for (const row of teams) assert.strictEqual(row.totalCards, row.yellowCards + row.secondYellowCards + row.directRedCards);

console.log("Phase 2D integrity PASS: 753 matches, locked 2025-26 holdout, expanded shrinkage grid, temporal and A/B identity guards PASS");
