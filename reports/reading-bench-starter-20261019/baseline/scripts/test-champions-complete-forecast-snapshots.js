"use strict";

const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { evaluateSnapshots, freezeCandidate, sha256File, zonedLocalToUtc } = require("./champions/complete-forecast-snapshots");

const root = path.resolve(__dirname, "..");
const read = relative => JSON.parse(fs.readFileSync(path.join(root, relative), "utf8"));
const candidate = read("data/analysis/champions/complete-forecast-candidate-2026-10-13.json");
const original = read("data/normalized/champions-player-markets-md01-2026-27.json");
const phase8Control = read("data/analysis/champions/model-calibration-control-2026-10-11.json");

assert.strictEqual(candidate.summary.supportedTeams, 36);
assert.strictEqual(candidate.summary.registrationEligiblePlayers, 970);
assert.strictEqual(candidate.identityOverlay.resolved.length, 38);
assert.strictEqual(candidate.identityOverlay.ambiguousListA.length, 5);
assert(candidate.identityOverlay.ambiguousListA.every(item => item.automaticError === false));
const mika = candidate.identityOverlay.resolved.find(item => item.internalPlayerId === "mika-medina");
assert.strictEqual(mika.canonicalName, "Mika Mármol Medina");
assert.strictEqual(mika.uefaPlayerId, "250123956");
assert(candidate.fixtures.every(fixture => fixture.chronologyStatus === "POST_KICKOFF_RECALCULATION"));
assert(candidate.summary.completeForecastRows > 101);
assert.strictEqual(candidate.summary.potentialSubstitutesWithForecast, 0);
assert.strictEqual(candidate.summary.eventProbabilitiesProduced, 0);
assert.strictEqual(candidate.summary.completeForAllRegisteredPlayers, false);

assert.strictEqual(original.fixtures.length, 18);
assert(original.fixtures.every(fixture => fixture.shooters.totalShots.length === 5 && fixture.shooters.shotsOnTarget.length === 5));
assert.strictEqual(candidate.fixtures.length, original.fixtures.length);

for (const item of Object.values(phase8Control.protectedFiles)) {
  assert.strictEqual(sha256File(path.join(root, item.path)), item.sha256, `Protected file changed: ${item.path}`);
}
for (const item of phase8Control.protectedRawSnapshots) {
  assert.strictEqual(sha256File(path.join(root, item.path)), item.sha256, `Protected raw changed: ${item.path}`);
}

assert.strictEqual(zonedLocalToUtc("2026-10-14", "18:45", "Europe/Rome"), "2026-10-14T16:45:00.000Z");
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "champions-freeze-test-"));
const syntheticFixture = {
  ...candidate.fixtures[0],
  fixtureId: "synthetic-future-fixture",
  date: "2099-01-01",
  kickoff: "21:00",
  kickoffAt: "2099-01-01T20:00:00.000Z",
  chronologyStatus: "PREMATCH_CANDIDATE",
  coverage: { ...candidate.fixtures[0].coverage, completeForAllRegisteredPlayers: true },
  players: candidate.fixtures[0].players.slice(0, 2).map(player => ({ ...player, expectedMinutes: 60, projectedShots: 1, projectedShotsOnTarget: 0.5, forecastStatus: "produced-existing-formula" }))
};
const synthetic = { ...candidate, generatedAt: "2099-01-01T10:00:00.000Z", fixtures: [syntheticFixture] };
const first = freezeCandidate({ candidate: synthetic, outputRoot: temp, evaluationWindow: "calibration" });
const second = freezeCandidate({ candidate: synthetic, outputRoot: temp, evaluationWindow: "calibration" });
assert.strictEqual(first[0].status, "FROZEN");
assert.strictEqual(second[0].status, "ALREADY_FROZEN_IDENTICAL");
assert.throws(() => freezeCandidate({ candidate: { ...synthetic, model: { ...synthetic.model, version: "changed" } }, outputRoot: temp, evaluationWindow: "calibration" }), /immutable snapshot conflict/);
const late = freezeCandidate({ candidate: { ...synthetic, generatedAt: "2099-01-02T10:00:00.000Z" }, outputRoot: path.join(temp, "late") });
assert.strictEqual(late[0].status, "REJECTED_AFTER_KICKOFF_OR_UNVERIFIED");
const incomplete = freezeCandidate({ candidate: { ...synthetic, fixtures: [{ ...syntheticFixture, coverage: { ...syntheticFixture.coverage, completeForAllRegisteredPlayers: false } }] }, outputRoot: path.join(temp, "incomplete") });
assert.strictEqual(incomplete[0].status, "REJECTED_INCOMPLETE_PLAYER_FORECAST_COVERAGE");

const frozen = JSON.parse(fs.readFileSync(first[0].path, "utf8"));
const actuals = frozen.players.map((player, index) => ({ fixtureId: frozen.fixtureId, teamId: player.teamId, playerId: player.internalPlayerId, shots: index + 1, shotsOnTarget: index }));
const evaluation = evaluateSnapshots([frozen, { ...frozen, evaluationWindow: "test", fixtureId: "no-actual-fixture" }], actuals);
assert.strictEqual(evaluation.calibrationExecuted, false);
assert.strictEqual(evaluation.windows.calibration.observations, 2);
assert.strictEqual(evaluation.windows.test.observations, 0);
assert.strictEqual(evaluation.windows.calibration.brierShotsAtLeast1.status, "NOT_CALCULATED_NO_ORIGINAL_PROBABILITIES");

console.log(`Champions complete snapshots: PASS · ${candidate.summary.supportedTeams} squadre · ${candidate.summary.registrationEligiblePlayers} registrati · ${candidate.summary.completeForecastRows} forecast · gate PARTIAL`);
