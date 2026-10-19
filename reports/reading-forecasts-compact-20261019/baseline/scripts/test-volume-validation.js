"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const artifactPath = path.join(root, "data/analysis/serie-a-md06-phase-5c-volume-validation-2026-10-09.json");
const reportPath = path.join(root, "output/reports/serie-a-md06-phase-5c-volume-validation-2026-10-09.md");

function main() {
  assert(fs.existsSync(artifactPath), "Missing Phase 5C JSON artifact");
  assert(fs.existsSync(reportPath), "Missing Phase 5C report");
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
  const report = fs.readFileSync(reportPath, "utf8");
  const expected = { "sot-over-match": 32, "sot-over-team": 25, "corner-over-match": 21, "corner-over-team": 32 };
  assert.strictEqual(artifact.inventory.completedMatchesWithActuals, 50);
  assert.strictEqual(artifact.inventory.authenticPrematchForecasts, 50);
  assert.strictEqual(artifact.inventory.prospectiveSnapshots, 10);
  assert.strictEqual(artifact.inventory.prospectiveEvaluated, 0);
  assert.strictEqual(artifact.antiLeakage.timestampVerifiedViaCommit, 50);
  assert.strictEqual(artifact.antiLeakage.invalidCommitTimestamps, 0);
  assert.strictEqual(artifact.antiLeakage.generatedAtTimestampPrecision, 41);
  assert.strictEqual(artifact.antiLeakage.generatedAtDateOnlyPrecision, 9);
  assert.strictEqual(artifact.antiLeakage.invalidPreciseGeneratedAt, 0);
  assert.strictEqual(artifact.antiLeakage.duplicateForecasts, 0);
  assert.strictEqual(artifact.antiLeakage.independentTemporalHoldout, false);
  assert.strictEqual(artifact.currentMethod.haircuts.marginal, 0.92);
  assert.strictEqual(artifact.currentMethod.haircuts.joint, 0.90);
  assert.strictEqual(artifact.currentMethod.integerThresholdPushModelled, false);
  assert.deepStrictEqual(artifact.catalogInvariant, { finalSelections: 383, evaluated: 367, notModelled: 16 });
  assert.deepStrictEqual(artifact.productionIsolation.changedFiles, []);
  assert.strictEqual(artifact.md6Simulation.total110, 110);
  assert.strictEqual(artifact.md6Simulation.reconciled110, 110);
  assert.strictEqual(artifact.md6Simulation.withDistribution, 110);
  assert.strictEqual(artifact.md6Simulation.inCatalog, 0);
  assert.strictEqual(artifact.md6Simulation.recoverableNow, 0);
  for (const [family, count] of Object.entries(expected)) {
    assert.strictEqual(artifact.md6Simulation.rows.filter(row => row.family === family).length, count, `${family} simulation count`);
    assert.strictEqual(artifact.validation[family].gate, "INSUFFICIENT_DATA");
    assert.strictEqual(artifact.validation[family].independentMatchClusters, 50);
    assert.strictEqual(artifact.validation[family].observations, family.endsWith("-team") ? 100 : 50);
    assert(artifact.validation[family].probabilityCalibration.byThreshold.every(row => row.thresholdType === "half"));
  }
  assert(artifact.md6Simulation.rows.every(row => row.recommendation === false && row.catalogAction === "NO_CHANGE" && row.gate === "INSUFFICIENT_DATA"));
  assert(artifact.md6Simulation.rows.every(row => row.reconciliation.normalizationStatus === "VERIFIED_EXACT"
    && row.reconciliation.eventMatch && row.reconciliation.marketMatch && row.reconciliation.selectionMatch
    && row.reconciliation.oddsMatch && row.reconciliation.quoteStatus === "open"));
  assert.strictEqual(artifact.separateFamilies.bothTeamsSot.count, 15);
  assert.strictEqual(artifact.separateFamilies.corner1x2Fulltime.count, 5);
  assert(artifact.separateFamilies.corner1x2Fulltime.rows.every(row => row.diagnosticProbability === null));
  assert.deepStrictEqual(artifact.separateFamilies.duo, { analyzed: false, count: 0, reason: "EXCLUDED_BY_PHASE_5C_SCOPE" });
  assert(report.includes("0 dei 110 mercati B3 sono recuperabili in sicurezza oggi"));
  assert(report.includes("NO_COMPLETED_PROSPECTIVE_VOLUME_SNAPSHOT") === false, "Internal limitation codes should stay in JSON");
  assert(report.includes("DUO:** esclusi integralmente"));
  console.log(JSON.stringify({ assertions: 35, authenticForecasts: 50, simulations: 110, joint: 15, corner1x2: 5, recoverableNow: 0, status: "PASS" }));
}

if (require.main === module) main();
module.exports = { main };
