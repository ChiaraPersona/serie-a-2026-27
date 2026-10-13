"use strict";

const assert = require("assert");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const auditDate = "2026-10-13";
const read = relative => JSON.parse(fs.readFileSync(path.join(root, relative), "utf8"));
const sha256File = relative => crypto.createHash("sha256").update(fs.readFileSync(path.join(root, relative))).digest("hex");

const audit = read(`data/analysis/champions/historical-recovery-audit-${auditDate}.json`);
const dataset = read(`data/analysis/champions/historical-evaluation-dataset-${auditDate}.json`);
const phase8 = read("data/analysis/champions/model-calibration-audit-2026-10-11.json");
const control = read("data/analysis/champions/model-calibration-control-2026-10-11.json");
const report = fs.readFileSync(path.join(root, `output/reports/champions-historical-recovery-audit-${auditDate}.md`), "utf8");

assert.strictEqual(audit.status, "PARTIAL");
assert.strictEqual(audit.gate.value, "PARTIAL");
assert.strictEqual(audit.identityResolution.exactNameOnlyReviewed, 37);
assert.strictEqual(audit.identityResolution.resolvedVerified, 37);
assert.strictEqual(audit.identityResolution.uncertain, 0);
for (const item of audit.identityResolution.cases) {
  assert.strictEqual(item.status, "resolved_verified", `${item.requestedPlayer}: identità non risolta`);
  assert(item.uefaPlayerId && item.dateOfBirth && item.nationality && item.sourceUrl);
  assert(item.nameMatch && item.clubMatch && item.idMatch);
}
assert.strictEqual(audit.identityResolution.mikaMedina.status, "resolved_verified_alias");
assert.strictEqual(audit.identityResolution.mikaMedina.resolvedPlayer, "Mika Mármol Medina");
assert.strictEqual(audit.identityResolution.mikaMedina.uefaPlayerId, "250123956");
assert.strictEqual(audit.identityResolution.mikaMedina.providerPlayerId, "332573");

assert.strictEqual(audit.uefaRegistryDiscrepancies.total, 33);
assert.deepStrictEqual(audit.uefaRegistryDiscrepancies.countsByClassification, {
  uefa_list_b_registration_after_or_missing_from_frozen_registry: 26,
  uefa_list_a_registry_delta_timing_unresolved: 5,
  transfer_then_uefa_list_a_registration: 1,
  verified_alias_internal_identity_gap: 1
});
assert.strictEqual(audit.uefaRegistryDiscrepancies.confirmedRealErrors, 0);

assert.strictEqual(audit.historicalRecovery.matchReportsRecovered, 12);
assert.strictEqual(audit.historicalRecovery.previousCompleteMatches, 6);
assert.strictEqual(audit.historicalRecovery.totalMatchesWithActuals, 18);
assert.strictEqual(audit.historicalRecovery.recoveredReportsReconcileShotsAndSot, true);
assert.strictEqual(audit.historicalRecovery.matchDiagnostics.length, 12);
for (const match of audit.historicalRecovery.matchDiagnostics) {
  assert(match.participants >= 22, `${match.fixtureId}: partecipanti insufficienti`);
  assert(match.reconciliation.every(side => side.shotsExact && side.sotExact), `${match.fixtureId}: mancata riconciliazione`);
}
assert.strictEqual(audit.historicalRecovery.forecastInventory.gitVersions, 11);
assert.strictEqual(audit.historicalRecovery.forecastInventory.allVersionsSerializeTopFiveOnly, true);
assert.strictEqual(audit.historicalRecovery.forecastInventory.reconstructedForecastsUsed, false);

assert.strictEqual(dataset.summary.fixtures, 18);
assert.strictEqual(dataset.summary.validFixtures, 18);
assert.strictEqual(dataset.summary.originalForecastCandidates, 101);
assert.strictEqual(dataset.summary.validObservations, 94);
assert.strictEqual(dataset.summary.incompleteObservations, 7);
assert.strictEqual(dataset.summary.actualPlayerObservations, 516);
assert.strictEqual(dataset.summary.actualOnlyBeyondTop5, 422);
assert.strictEqual(dataset.summary.originalForecastsBeyondTop5, 0);
assert.strictEqual(dataset.partitions.training.rows.length, 0);
assert.strictEqual(dataset.partitions.calibration.rows.length, 0);
assert.strictEqual(dataset.partitions.test.rows.length, 94);
assert.strictEqual(dataset.partitions.incomplete.rows.length, 7);
assert.strictEqual(dataset.partitions.actualOnlyBeyondTop5.rows.length, 422);

for (const row of dataset.partitions.test.rows) {
  assert(row.fixtureId && row.matchId && row.teamId && row.playerId && row.stableObservationId);
  assert.strictEqual(row.partition, "test");
  assert.strictEqual(row.chronologyStatus, "VALID_PREMATCH_FORECAST");
  assert.strictEqual(row.predictionStatus, "original_git_committed_pre_kickoff");
  assert([row.predictedShots, row.predictedSot, row.actualMinutes, row.actualShots, row.actualSot].every(Number.isFinite));
  const fixture = dataset.fixtures.find(item => item.fixtureId === row.fixtureId);
  const kickoff = new Date(`${fixture.date}T${fixture.kickoff}:00+02:00`);
  assert(new Date(row.predictionAvailableAt) < kickoff, `${row.stableObservationId}: commit non pre-match`);
  assert(new Date(row.predictionGeneratedAt) < kickoff, `${row.stableObservationId}: generazione non pre-match`);
}
assert(dataset.partitions.actualOnlyBeyondTop5.rows.every(row => !row.originalForecastAvailable));
assert(dataset.partitions.actualOnlyBeyondTop5.rows.every(row => [row.minutes, row.shots, row.shotsOnTarget].every(Number.isFinite)));

for (const oldRow of phase8.evaluationDataset.admittedObservations) {
  const current = dataset.partitions.test.rows.find(row => row.fixtureId === oldRow.fixtureId && row.teamId === oldRow.teamId && row.playerId === oldRow.playerId);
  assert(current, `${oldRow.fixtureId}/${oldRow.playerId}: riga Fase 8 persa`);
  for (const pair of [["predictedShots", "predictedShots"], ["predictedSot", "predictedSot"], ["actualMinutes", "actualMinutes"], ["actualShots", "actualShots"], ["actualSot", "actualSot"]]) {
    assert.strictEqual(current[pair[0]], oldRow[pair[1]], `${oldRow.fixtureId}/${oldRow.playerId}: regressione ${pair[0]}`);
  }
}

assert.deepStrictEqual(audit.metrics.shots, { n: 94, mae: 1.428, rmse: 1.831, bias: 0.145 });
assert.deepStrictEqual(audit.metrics.shotsOnTarget, { n: 94, mae: 0.837, rmse: 1.032, bias: 0.071 });
assert.strictEqual(audit.metrics.brier.status, "NOT_CALCULATED");
assert.strictEqual(audit.metrics.pairedComparisons.status, "NOT_RUN");

assert.deepStrictEqual(audit.invariants.phase8ProtectedFilesChanged, []);
assert.deepStrictEqual(audit.invariants.phase8ProtectedRawChanged, []);
assert.strictEqual(audit.invariants.productionModelChanged, false);
assert.strictEqual(audit.invariants.serieAV2Changed, false);
assert.strictEqual(audit.invariants.md6Changed, false);
assert.strictEqual(audit.invariants.calibrationActivated, false);
for (const item of Object.values(control.protectedFiles)) assert.strictEqual(sha256File(item.path), item.sha256, `File protetto mutato: ${item.path}`);
for (const item of control.protectedRawSnapshots) assert.strictEqual(sha256File(item.path), item.sha256, `Raw protetto mutato: ${item.path}`);
for (const item of audit.historicalRecovery.rawSnapshots) assert.strictEqual(sha256File(item.path), item.sha256, `Raw Fase 9 mutato: ${item.path}`);

for (let section = 1; section <= 8; section += 1) assert(report.includes(`## ${section}.`), `Sezione report ${section} assente`);
assert(report.includes("Brier: **NON CALCOLATO**"));
assert(report.includes("Ricostruzioni retroattive usate | 0"));
assert(report.includes("**PARTIAL**"));

console.log("Champions historical recovery audit: PASS · 18/18 partite · 94 osservazioni valide · 37/37 identità · gate PARTIAL");
