"use strict";

const assert = require("assert");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const root = path.resolve(__dirname, "..");
const asOf = "2026-10-09";
const read = relative => JSON.parse(fs.readFileSync(path.join(root, relative), "utf8"));
const sha256 = buffer => crypto.createHash("sha256").update(buffer).digest("hex");
const sha256File = relative => sha256(fs.readFileSync(path.join(root, relative)));
const sha256Json = value => sha256(Buffer.from(JSON.stringify(value)));

const control = read(`data/analysis/champions/data-recovery-control-${asOf}.json`);
const phase6 = read(`data/analysis/champions/full-data-coverage-audit-${asOf}.json`);
const audit = read(`data/analysis/champions/data-recovery-audit-${asOf}.json`);
const identities = read(`data/analysis/champions/player-identity-recovery-${asOf}.json`);
const uefa = read(`data/analysis/champions/uefa-squad-audit-${asOf}.json`);
const domestic = read("data/normalized/champions-domestic-recovery-2026-27.json");
const stats = read("data/normalized/champions-player-stats-2026-27.json");
const manifest = read(`data/raw/champions-recovery/${asOf}/manifest.json`);

assert.strictEqual(audit.status, "PARTIAL");
assert.strictEqual(audit.invariants.productionModelChanged, false);
assert.strictEqual(audit.invariants.uiChanged, false);
assert.strictEqual(audit.invariants.predictionsChanged, false);
assert.strictEqual(audit.invariants.leagueStrengthChanged, false);
assert.strictEqual(audit.invariants.predictionCandidateEligibilityChanged, false);
assert.strictEqual(audit.summary.diagnosticTeams, 36);
assert.strictEqual(audit.diagnostics.length, 36);
assert.strictEqual(audit.matchAudit.length, 7);
assert(audit.matchAudit.every(match => match.originalRawPreserved && !match.independentlyComparable));
assert(audit.matchAudit.every(match => match.shots === null && match.shotsOnTarget === null));
assert.strictEqual(manifest.activeSnapshots, 172);
assert.strictEqual(manifest.scopeCounts["uefa-squads"], 36);
assert.strictEqual(manifest.supersededSnapshots.length, 12);
for (const relative of manifest.activeSnapshotFiles) {
  const snapshot = JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(root, `data/raw/champions-recovery/${asOf}`, relative))));
  assert(snapshot.retrievedAt, `retrievedAt assente: ${relative}`);
  assert(snapshot.retrievedAt.slice(0, 10) <= asOf, `Snapshot oltre cutoff: ${relative}`);
}

assert.strictEqual(identities.cases.length, 65);
assert.strictEqual(identities.summary.initialUnresolved, 65);
assert.strictEqual(identities.summary.resolved + identities.summary.remainingUnresolved, 65);
assert.strictEqual(identities.summary.remainingUnresolved, 1);
assert.deepStrictEqual(identities.cases.filter(item => item.status === "open").map(item => item.player), ["Mika Medina"]);
assert(identities.cases.filter(item => item.status === "open").every(item => item.providerPlayerId === null && item.uefaPlayerId === null));
assert(identities.cases.filter(item => item.status === "resolved").every(item => item.confidence === "high" && item.resolutionMethod));

const allowed = new Set(["uefa_list_a_verified", "uefa_list_b_verified", "uefa_not_registered_verified", "uefa_eligibility_unknown"]);
assert.strictEqual(uefa.cases.length, 74);
assert(uefa.cases.every(item => allowed.has(item.uefaRegistrationStatus)));
assert(uefa.cases.every(item => item.predictionCandidateEligible === false));
assert.strictEqual(uefa.summary.uefa_not_registered_verified, 0);
assert.strictEqual(Object.values(uefa.summary).reduce((sum, value) => sum + value, 0), 74);

const outsideEligibility = phase6.teams.flatMap(team => team.classifications.playedNotRegistered.map(player => ({
  teamId: team.teamId,
  providerPlayerId: player.providerPlayerId,
  player: player.player,
  predictionCandidateEligible: player.predictionCandidateEligible
})));
assert.strictEqual(sha256Json(outsideEligibility), control.predictionCandidateEligibility.sha256);

assert.strictEqual(domestic.teams.length, 4);
assert.deepStrictEqual(domestic.teams.map(team => team.team).sort(), ["Sabah", "Shakhtar Donetsk", "Slavia Praha", "Slovan Bratislava"]);
assert(domestic.teams.every(team => ["PASS", "PARTIAL"].includes(team.status)));
const sabah = domestic.teams.find(team => team.team === "Sabah");
assert.strictEqual(sabah.matches, 2);
assert(sabah.observations.some(item => item.starter && item.minutes === null));
const slavia = domestic.teams.find(team => team.team === "Slavia Praha");
assert.strictEqual(slavia.matches, 10);
assert(slavia.observations.every(item => item.date <= asOf));
assert(slavia.observations.some(item => item.shots === null));
assert(slavia.reconciliation.every(item => item.playerSeriesComplete === false && item.exact === false));
const shakhtar = domestic.teams.find(team => team.team === "Shakhtar Donetsk");
assert.strictEqual(shakhtar.matches, 5);
assert(shakhtar.observations.length > 0);
assert(shakhtar.observations.every(item => item.shots === null && item.shotsOnTarget === null));
const slovan = domestic.teams.find(team => team.team === "Slovan Bratislava");
assert.strictEqual(slovan.players.length, 27);
assert(slovan.players.every(item => Number.isFinite(item.minutes)));

for (const item of Object.values(control.protectedFiles)) assert.strictEqual(sha256File(item.path), item.sha256, `File protetto mutato: ${item.path}`);
for (const item of control.protectedRawSnapshots) assert.strictEqual(sha256File(item.path), item.sha256, `Raw protetto mutato: ${item.path}`);
for (const [teamId, expected] of Object.entries(control.protectedTeamSnapshots)) {
  const team = stats.teams.find(item => item.id === teamId);
  assert(team, `Squadra protetta assente: ${teamId}`);
  assert.strictEqual(sha256Json(team), expected.sha256, `Snapshot squadra mutato: ${teamId}`);
}

const forbiddenDiagnosticKeys = new Set(["coefficient", "coefficientValue", "modelWeight", "rankingScore"]);
for (const item of audit.diagnostics) for (const key of Object.keys(item)) assert(!forbiddenDiagnosticKeys.has(key), `Chiave modellistica vietata: ${key}`);

console.log(`Champions data recovery test: PASS · ${identities.summary.resolved}/65 identità · ${74 - uefa.summary.uefa_eligibility_unknown}/74 UEFA · ${control.protectedRawSnapshots.length} raw protetti`);
