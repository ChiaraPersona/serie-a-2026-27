"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { validateFeatureVector } = require("./contracts");
const { loadInputs } = require("./run");
const {
  root,
  snapshotRelative,
  manifestRelative,
  evaluationRelative,
  validationRelative,
  modelOrder,
  read,
  write,
  fileHash,
  payloadHash,
  predictionHash,
  hashManifest,
  captureProtectedHashes,
  marketsFromMatrix,
  validateProspectiveSnapshot,
} = require("./prospective-md06");

function run() {
  let assertions = 0;
  const check = (condition, message) => { assert(condition, message); assertions++; };
  const snapshot = read(snapshotRelative);
  const manifest = read(manifestRelative);
  const evaluation = read(evaluationRelative);
  const frozenInputs = read("data/analysis/exact-score-research/exact-score-prospective-inputs.json");
  const forensic = read("output/reports/sisal-md06-1x2-ev-forensic-audit-2026-10-09.json");
  const inputs = loadInputs();
  const failures = validateProspectiveSnapshot(snapshot);
  check(failures.length === 0, failures.join("; "));
  check(snapshot.status === "FROZEN", "all MD6 matches must be frozen");
  check(snapshot.matchCount === 10 && snapshot.predictionCount === 40, "expected 10 matches and 40 predictions");
  check(snapshot.matches.every(row => row.predictions.length === 4 && modelOrder.every(label => row.predictions.some(prediction => prediction.modelLabel === label))), "four models per match");
  check(snapshot.matches.every(row => Date.parse(snapshot.createdAt) < Date.parse(row.kickoff.utc)), "container generated before every kickoff");
  check(snapshot.matches.every(row => row.predictions.every(prediction => Date.parse(prediction.generatedAt) < Date.parse(row.kickoff.utc) && Date.parse(prediction.frozenAt) < Date.parse(row.kickoff.utc))), "each prediction generated and frozen before kickoff");
  check(snapshot.matches.every(row => row.predictions.every(prediction => prediction.snapshotHash === predictionHash(prediction))), "prediction hashes");
  check(snapshot.integrity.sha256 === payloadHash(snapshot), "container hash");
  check(manifest.snapshotFileSHA256 === fileHash(snapshotRelative) && manifest.containerHash === snapshot.integrity.sha256, "manifest hashes");
  check(manifest.snapshots.length === 40 && new Set(manifest.snapshots.map(row => row.snapshotId)).size === 40, "manifest record coverage");
  check(manifest.snapshots.every(row => snapshot.matches.some(match => match.matchId === row.matchId && match.predictions.some(prediction => prediction.snapshotId === row.snapshotId && prediction.snapshotHash === row.hash))), "manifest joins");
  check(snapshot.inputs.prospectiveVectorsFileHash === fileHash("data/analysis/exact-score-research/exact-score-prospective-inputs.json"), "frozen prospective input file hash");
  const frozenVectorByMatch = new Map(frozenInputs.rows.map(row => [row.matchId, row.vector]));
  check(snapshot.matches.every(row => JSON.stringify(row.sharedFeatureVector.vector) === JSON.stringify(frozenVectorByMatch.get(row.matchId))), "predictions use canonical frozen prospective vectors without reconstruction");
  const forensicByMatch = new Map(forensic.fixtures.map(row => [row.matchId, row]));
  check(snapshot.matches.every(row => ["M0", "M1", "M2"].every(label => {
    const frozen = row.predictions.find(prediction => prediction.modelLabel === label);
    const diagnostic = forensicByMatch.get(row.matchId)?.diagnosticResearchModels?.[label]?.matrix;
    return diagnostic && Math.abs(frozen.lambdaHome - diagnostic.lambdaHome) < 1e-12 && Math.abs(frozen.lambdaAway - diagnostic.lambdaAway) < 1e-12;
  })), "canonical M0/M1/M2 outputs match the prior frozen-vector forensic recomputation");
  check(snapshot.matches.every(row => ["M1", "M2"].every(label => {
    const adapter = row.predictions.find(prediction => prediction.modelLabel === label)?.diagnostics?.contractAdapter;
    return adapter?.metadataOnly === true && adapter.frozenFeaturesChanged === false && adapter.modelFormulaChanged === false && adapter.canonicalGuardChanged === false;
  })), "M1/M2 prospective adapter is metadata-only");
  check(snapshot.matches.every(row => row.predictions.every(prediction => JSON.stringify(marketsFromMatrix(prediction.scoreMatrix)) === JSON.stringify(prediction.probabilities))), "markets derive from each matrix");
  check(snapshot.matches.every(row => row.predictions.every(prediction => Math.abs(Object.values(prediction.probabilities.oneXTwo).reduce((sum, value) => sum + value, 0) - 1) < 1e-9)), "1X2 normalization");
  check(snapshot.matches.every(row => row.predictions.every(prediction => Math.abs(prediction.probabilities.btts.yes + prediction.probabilities.btts.no - 1) < 1e-9)), "BTTS normalization");
  check(snapshot.matches.every(row => row.predictions.every(prediction => Math.abs(prediction.probabilities.overUnder2_5.over + prediction.probabilities.overUnder2_5.under - 1) < 1e-9)), "O/U normalization");
  check(snapshot.matches.every(row => row.predictions.every(prediction => prediction.cutoff.matchdayExclusive === 6 && prediction.cutoff.targetMatchIdExcluded === row.matchId && prediction.cutoff.completedOnly === true)), "cutoff target exclusion");
  for (const row of snapshot.matches) {
    check(validateFeatureVector(row.sharedFeatureVector.vector, inputs.matches), `${row.matchId} feature vector`);
    const researchPayload = JSON.stringify({ vector: row.sharedFeatureVector, predictions: row.predictions.filter(prediction => prediction.modelLabel !== "ENGINE_4.13.0") });
    check(!/sisal|bookmaker|impliedProbability|actualHomeGoals|actualAwayGoals/i.test(researchPayload), `${row.matchId} quote/actual leakage`);
    const sourceIds = Object.values(row.sharedFeatureVector.vector.features).flatMap(feature => feature.provenance.matchesUsed || []);
    check(sourceIds.every(id => inputs.matches.find(match => match.id === id)?.matchday < 6), `${row.matchId} future match leakage`);
  }
  check(snapshot.inputs.immutableAssetsBefore.every(row => fs.existsSync(path.join(root, row.file)) && fileHash(row.file) === row.sha256), "existing immutable snapshots unchanged");
  check(snapshot.productionIntegrity.status === "PASS" && snapshot.productionIntegrity.changedFiles.length === 0 && snapshot.productionIntegrity.immutableSourceAssetsChanged.length === 0, "recorded production integrity");
  const currentProtected = captureProtectedHashes();
  check(hashManifest(currentProtected) === snapshot.productionIntegrity.manifestAfter, "current production manifest matches frozen audit");
  check(evaluation.integrity.sha256 === payloadHash(evaluation), "evaluation hash");
  check(evaluation.predictionRecalculation === false, "evaluator must not recalculate predictions");
  check(evaluation.status === "PENDING" && evaluation.commonSample.n === 0 && evaluation.metrics === null, "pre-result evaluation must remain pending");
  check(modelOrder.every(label => evaluation.models[label] === null), "no fictitious pre-result metrics");
  const validation = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    status: "PASS",
    assertions,
    scope: ["canonical frozen inputs", "M0/M1/M2 formula parity", "leakage", "probability normalization", "score matrix", "1X2", "BTTS", "Over/Under 2.5", "cutoff", "hash", "immutability", "common sample", "production integrity"],
    snapshotFile: snapshotRelative,
    snapshotContainerHash: snapshot.integrity.sha256,
    manifestFile: manifestRelative,
    evaluationFile: evaluationRelative,
    commonSample: evaluation.commonSample.n,
    evaluationStatus: evaluation.status,
    productionIntegrity: snapshot.productionIntegrity,
    knownPreexistingBaselineFailure: {
      status: "DOCUMENTED_NOT_RERUN",
      test: "scripts/research/exact-score/test-baselines.js repository historical freeze guard",
      reason: "The October 3 tmp baseline compares the current repository with an old whole-repository inventory; it is unrelated to the focused MD6 prospective checks and was documented in the preceding forensic audit.",
    },
  };
  write(validationRelative, validation);
  return validation;
}

if (require.main === module) {
  try { console.log(JSON.stringify(run(), null, 2)); }
  catch (error) { console.error(error.stack || error.message); process.exitCode = 1; }
}
module.exports = { run };
