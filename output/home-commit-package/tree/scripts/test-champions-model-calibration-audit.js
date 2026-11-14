"use strict";

const assert = require("assert");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const auditDate = "2026-10-11";
const dataAsOf = "2026-10-09";
const read = file => JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));
const sha256 = buffer => crypto.createHash("sha256").update(buffer).digest("hex");
const sha256File = file => sha256(fs.readFileSync(path.join(root, file)));
const sha256Json = value => sha256(Buffer.from(JSON.stringify(value)));

const control = read(`data/analysis/champions/model-calibration-control-${auditDate}.json`);
const audit = read(`data/analysis/champions/model-calibration-audit-${auditDate}.json`);
const phase6 = read(`data/analysis/champions/full-data-coverage-audit-${dataAsOf}.json`);
const report = fs.readFileSync(path.join(root, `output/reports/champions-model-calibration-audit-${auditDate}.md`), "utf8");

assert.strictEqual(audit.status, "PARTIAL");
assert.strictEqual(audit.gate.value, "CHAMPIONS MODEL-CALIBRATION GATE = PARTIAL");
assert.strictEqual(audit.identityAudit.structuralContaminationDetected, false);
assert.strictEqual(audit.identityAudit.atletico.uefaClubId, "50124");
assert.strictEqual(audit.identityAudit.atletico.bodyDeclaresAtletico, true);
assert.strictEqual(audit.identityAudit.atletico.bodyDeclaresAthleticClub, false);
assert.strictEqual(audit.identityAudit.crossClubProviderIdentities.structuralConflicts, 0);
assert.strictEqual(audit.identityAudit.joeyVeerman.providerPlayerId, "240912");
assert.strictEqual(audit.identityAudit.joeyVeerman.decision, "chronologically-consistent-club-change");
assert.deepStrictEqual(audit.identityAudit.joeyVeerman.intervals.map(item => item.team), ["PSV Eindhoven", "Borussia Dortmund"]);
assert.strictEqual(audit.identityAudit.exactNameOnlyResolutions.count, 37);
assert.strictEqual(audit.identityAudit.uefaVerifiedOutsideInternalRegistry.count, 33);
assert.strictEqual(audit.identityAudit.mikaMedina.status, "open");
assert.strictEqual(audit.identityAudit.mikaMedina.providerPlayerId, null);
assert.strictEqual(audit.identityAudit.mikaMedina.uefaPlayerId, null);

assert.strictEqual(audit.evaluationDataset.candidateMatches, 18);
assert.strictEqual(audit.evaluationDataset.admittedMatches, 6);
assert.strictEqual(audit.evaluationDataset.excludedMatches, 12);
assert.strictEqual(audit.evaluationDataset.candidatePlayerObservations, 101);
assert.strictEqual(audit.evaluationDataset.admittedPlayerObservations, 30);
assert.strictEqual(audit.evaluationDataset.shotsObservations, 30);
assert.strictEqual(audit.evaluationDataset.shotsOnTargetObservations, 30);
assert(audit.evaluationDataset.selectionScope.includes("not a full-XI evaluation"));
assert(audit.evaluationDataset.walkForwardStatus.includes("not identifiable"));
assert(audit.evaluationDataset.fixtures.every(fixture => fixture.predictionSnapshot));
for (const fixture of audit.evaluationDataset.fixtures) {
  const kickoff = new Date(`${fixture.date}T${fixture.kickoff}:00+02:00`);
  assert(new Date(fixture.predictionSnapshot.committedAt) < kickoff, `Commit non pre-match: ${fixture.fixtureId}`);
  assert(new Date(fixture.predictionSnapshot.generatedAt) < kickoff, `Generazione non pre-match: ${fixture.fixtureId}`);
}
for (const row of audit.evaluationDataset.admittedObservations) {
  assert(row.playerId && row.providerPlayerId && row.matchId);
  assert(Number.isFinite(row.actualMinutes) && Number.isFinite(row.actualShots) && Number.isFinite(row.actualSot));
  assert(Number.isFinite(row.predictedShots) && Number.isFinite(row.predictedSot));
  assert.strictEqual(row.exclusionReason, null);
}

assert.strictEqual(audit.models.A.status, "EVALUATED_LIMITED");
assert.strictEqual(audit.models.A.pointMetrics.overall.shots.n, 30);
assert.strictEqual(audit.models.A.pointMetrics.overall.shots.sampleUse, "descriptive-small");
assert.strictEqual(audit.models.A.brier.status, "NOT_CALCULATED");
assert.strictEqual(audit.models.B.status, "CHRONOLOGY_BLOCKED");
assert.strictEqual(audit.models.B.pointMetrics, null);
assert.strictEqual(audit.models.C.status, "UNCALIBRATED");
assert.strictEqual(audit.models.C.pointMetrics, null);
assert.strictEqual(audit.pairedComparison.commonObservationsABC, 0);
assert.strictEqual(audit.pairedComparison.status, "NOT_RUN");

assert.strictEqual(audit.invariants.productionModelChanged, false);
assert.strictEqual(audit.invariants.protectedFilesChanged, false);
assert.strictEqual(audit.invariants.protectedRawChanged, false);
assert.strictEqual(audit.invariants.predictionCandidateEligibilityChanged, false);
assert.strictEqual(audit.invariants.calibrationActivated, false);
assert.strictEqual(audit.invariants.htmlOrUiChanged, false);
for (const item of Object.values(control.protectedFiles)) assert.strictEqual(sha256File(item.path), item.sha256, `File protetto mutato: ${item.path}`);
for (const item of control.protectedRawSnapshots) assert.strictEqual(sha256File(item.path), item.sha256, `Raw protetto mutato: ${item.path}`);
const outsideEligibility = phase6.teams.flatMap(team => team.classifications.playedNotRegistered.map(player => ({
  teamId: team.teamId,
  providerPlayerId: player.providerPlayerId,
  player: player.player,
  predictionCandidateEligible: player.predictionCandidateEligible
})));
assert.strictEqual(sha256Json(outsideEligibility), control.predictionCandidateEligibility.sha256);

for (const section of ["A.", "B.", "C.", "D.", "E.", "F.", "G.", "H.", "I.", "J."]) assert(report.includes(`## ${section}`), `Sezione report assente: ${section}`);
assert(report.includes("CHAMPIONS MODEL-CALIBRATION GATE = PARTIAL"));
assert(report.includes("Brier score: **NON CALCOLATO**"));
assert(report.includes("Confronto paired A/B/C: **NON ESEGUITO**"));
assert(report.includes("non è un backtest dell'intero XI"));

console.log(`Champions model-calibration audit: PASS · ${audit.evaluationDataset.admittedMatches}/18 match · ${audit.evaluationDataset.admittedPlayerObservations} osservazioni · gate ${audit.status}`);
