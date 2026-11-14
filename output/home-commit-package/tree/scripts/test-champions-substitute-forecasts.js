"use strict";

const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { freezeCandidate } = require("./champions/complete-forecast-snapshots");
const { POLICY, chronologicalEvidence, conserveTeamVolume, estimateExpectedMinutes, playedMinutes } = require("./champions/substitute-minutes");

const root = path.resolve(__dirname, "..");
const candidate = JSON.parse(fs.readFileSync(path.join(root, "data/analysis/champions/substitute-forecast-candidate-2026-10-13.json"), "utf8"));

const stat = (name, value) => ({ name, value });
assert.equal(playedMinutes({ starter: true, subbedOut: true, stats: [stat("appearances", 1)], plays: [{ substitution: true, clock: { displayValue: "71'" } }] }), 71);
assert.equal(playedMinutes({ starter: false, subbedIn: true, subbedOut: false, stats: [stat("appearances", 1)], plays: [{ substitution: true, clock: { displayValue: "64'" } }] }), 26);
assert.equal(playedMinutes({ starter: false, subbedIn: true, subbedOut: true, stats: [stat("appearances", 1)], plays: [{ substitution: true, clock: { displayValue: "20'" } }, { substitution: true, clock: { displayValue: "75'" } }] }), 55);

const base = { season: "2025-26", competitionCode: "uefa.champions", competitionType: "uefa-competition", retrievedAt: "2026-09-01T10:00:00Z", sourceUrl: "https://example.invalid/evidence", providerTeamId: "1", team: "Test" };
const starterEvidence = [80, 70, 90].map((minutes, index) => ({ ...base, matchId: `s${index}`, date: `2026-08-0${index + 1}`, starter: true, namedBench: false, entered: false, minutes }));
const starter = estimateExpectedMinutes(starterEvidence, "starter", "2026-09-08T16:45:00Z");
assert.equal(starter.status, "evaluable");
assert.equal(starter.expectedMinutes, 80);

const substituteEvidence = [
  { entered: true, minutes: 30 },
  { entered: false, minutes: null },
  { entered: true, minutes: 20 },
  { entered: false, minutes: null }
].map((row, index) => ({ ...base, ...row, matchId: `b${index}`, date: `2026-08-1${index}`, starter: false, namedBench: true }));
const substitute = estimateExpectedMinutes(substituteEvidence, "potential-substitute", "2026-09-08T16:45:00Z");
assert.equal(substitute.status, "evaluable");
assert.equal(substitute.entryProbability, 0.5);
assert.equal(substitute.conditionalMinutesIfUsed, 25);
assert.equal(substitute.expectedMinutes, 12.5);

const late = { ...base, matchId: "late", date: "2026-08-20", retrievedAt: "2026-09-09T00:00:00Z", starter: true, namedBench: false, entered: false, minutes: 90 };
assert.equal(chronologicalEvidence([...starterEvidence, late], "2026-09-08T16:45:00Z").some(row => row.matchId === "late"), false);
assert.equal(POLICY.serieACoefficientsReused, false);
assert.deepEqual(conserveTeamVolume([{ projection: 1 }, { projection: 3 }], 10).map(row => row.projection), [2.5, 7.5]);

assert.equal(candidate.schemaVersion, 2);
assert.equal(candidate.summary.supportedTeams, 36);
assert.equal(candidate.summary.fixtures, 18);
assert.equal(candidate.summary.starters, 396);
assert.equal(candidate.summary.potentialSubstitutes, 289);
assert(candidate.summary.startersWithExpectedMinutes > 0);
assert(candidate.summary.potentialSubstitutesWithExpectedMinutes > 0);
assert(candidate.summary.nonEvaluablePlayers > 0);
assert.equal(candidate.summary.eventProbabilitiesProduced, 0);
assert.equal(candidate.summary.completeForSnapshotUniverse, true);
assert(candidate.dataVersion["selected-chronological-minute-evidence"]);

for (const fixture of candidate.fixtures) {
  assert.equal(fixture.chronologyStatus, "POST_KICKOFF_RECALCULATION");
  assert.equal(fixture.coverage.completeForSnapshotUniverse, true);
  assert.equal(new Set(fixture.players.map(player => player.stablePlayerId)).size, fixture.players.length);
  for (const team of fixture.teamMinutes) {
    assert(team.allocatedExpectedMinutes <= 990);
    assert(team.allocatedExpectedMinutes >= 0);
  }
  for (const reconciliation of fixture.volumeReconciliation) {
    assert(Math.abs(reconciliation.shots.delta) <= 0.02);
    assert(Math.abs(reconciliation.shotsOnTarget.delta) <= 0.02);
  }
  for (const player of fixture.players) {
    assert.equal(player.eventProbabilities, null);
    if (Number.isFinite(player.expectedMinutes)) assert(player.expectedMinutes >= 0 && player.expectedMinutes <= 90);
    if (player.forecastStatus === "produced-champions-minutes-extension") {
      assert(Number.isFinite(player.projectedShots));
      assert(Number.isFinite(player.projectedShotsOnTarget));
      assert(player.projectedShotsOnTarget <= player.projectedShots);
    }
    if (player.minutesEstimate?.status === "not-evaluable") {
      assert.equal(player.expectedMinutes, null);
      assert.equal(player.projectedShots, null);
      assert.equal(player.projectedShotsOnTarget, null);
    }
  }
}

const rejectionRoot = path.join(os.tmpdir(), `champions-phase11-rejected-${process.pid}`);
assert.equal(fs.existsSync(rejectionRoot), false);
const rejected = freezeCandidate({ candidate, outputRoot: rejectionRoot, evaluationWindow: "unassigned" });
assert.equal(rejected.length, 18);
assert(rejected.every(row => row.status === "REJECTED_AFTER_KICKOFF_OR_UNVERIFIED"));
assert.equal(fs.existsSync(rejectionRoot), false);

console.log(`Champions Phase 11 tests: OK · starters ${candidate.summary.startersWithExpectedMinutes}/${candidate.summary.starters} · substitutes ${candidate.summary.potentialSubstitutesWithExpectedMinutes}/${candidate.summary.potentialSubstitutes} · non evaluable ${candidate.summary.nonEvaluablePlayers}`);
