"use strict";

const assert = require("assert");
const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const { canonicalMatchHash, makeSnapshot, validateSnapshot, actualForSnapshot, marketMetrics, toKickoffUtc } = require("./predictions/snapshot-core");

const root = path.resolve(__dirname, "..");
const snapshotFile = path.join(root, "data/predictions/snapshots/2026-27/md-06.json");
const manifestFile = path.join(root, "data/predictions/snapshots/manifest.json");
const reportFile = path.join(root, "data/analysis/prediction-continuous-evaluation-v2.json");
const match = { id: "home-away-2026-27-md-06", season: "2026-27", competition: "serie-a", matchday: 6, date: "2026-10-11", kickoff: "15:00", status: "scheduled", homeTeam: "home", awayTeam: "away" };
const player = { playerId: "p1", name: "Player One", teamId: "home", expectedMinutes: 80, projectedShots: 1.2, projectedShotsOnTarget: 0.4, shotProbabilities: { over05: 0.7, over15: 0.35, over25: 0.12 }, shotOnTargetProbabilities: { over05: 0.3, over15: 0.08 }, playerBaselineStability: { level: "medium", confidence: "medium", historicalCurrentAgreement: 0.8 } };
const prediction = { matchId: match.id, engineVersion: "frozen-engine", playerMarketModelVersion: 2, teamMatchupProfileVersion: 2, futureDataDiagnostics: { dataCutoff: { matchdayExclusive: 6, targetMatchIdExcluded: match.id, completedOnly: true }, home: {}, away: {} }, expectedGoals: { home: 1, away: 1 }, teamProjections: [{ teamId: "home", shotsTotal: { central: 12 }, shotsOnTarget: { central: 4 }, expectedGoals: 1 }, { teamId: "away", shotsTotal: { central: 10 }, shotsOnTarget: { central: 3 }, expectedGoals: 0.8 }], shooters: { allPlayers: [player] } };
const testSnapshot = makeSnapshot({ prediction, match, generatedAt: "2026-10-01T10:00:00.000Z", officialLineups: { fixtures: [] }, teams: { teams: [] }, matches: [], priorStandings: { rows: [] } });
assert.deepEqual(validateSnapshot(testSnapshot), []);
assert.equal(testSnapshot.lineupState, "UNKNOWN");
const probable = makeSnapshot({ prediction, match, generatedAt: "2026-10-01T10:00:00.000Z", officialLineups: { fixtures: [] }, teams: { teams: [{ id: "home", projectedLineup: { status: "probable", players: Array(11).fill("Home") } }, { id: "away", projectedLineup: { status: "probable", players: Array(11).fill("Away") } }] }, matches: [], priorStandings: { rows: [] } });
assert.equal(probable.lineupState, "PROBABLE");
const official = makeSnapshot({ prediction, match, generatedAt: "2026-10-01T10:00:00.000Z", officialLineups: { fixtures: [{ matchId: match.id, teams: [{ teamId: "home", players: Array(11).fill({}) }, { teamId: "away", players: Array(11).fill({}) }] }] }, teams: { teams: [] }, matches: [], priorStandings: { rows: [] } });
assert.equal(official.lineupState, "OFFICIAL");
assert.equal(testSnapshot.prediction.players[0].modelConfidence, "N/D");
assert.equal(testSnapshot.prediction.players[0].probabilities.shots4Plus, null);
assert.equal(testSnapshot.prediction.teamProjections[0].goalFeatures.seasonGoalsScoredPerMatch, null);
assert.equal("actual" in testSnapshot, false);
assert.equal("actualOutcome" in testSnapshot, false);
assert(!/actual(Home|Away|Shots|SOT|Minutes|XG)/i.test(JSON.stringify(testSnapshot.prediction)), "actuals serializzati nel blocco pre-match");
assert.equal(testSnapshot.integrity.sha256, canonicalMatchHash(testSnapshot));
assert.match(testSnapshot.snapshotId, /-home-away-2026-27-md-06-player-market-v2$/);
assert.equal(testSnapshot.engineVersion, "frozen-engine");
assert.equal(testSnapshot.modelVersion, "player-market-v2");
assert.equal(testSnapshot.snapshotSchemaVersion, 3);
const tampered = structuredClone(testSnapshot); tampered.prediction.expectedGoals.home = 9;
assert(validateSnapshot(tampered).includes("hash mismatch"), "hash tampering non rilevato");
const duplicatePlayerPrediction = structuredClone(prediction); duplicatePlayerPrediction.shooters.allPlayers.push(structuredClone(player));
const duplicatePlayerSnapshot = makeSnapshot({ prediction: duplicatePlayerPrediction, match, generatedAt: "2026-10-01T10:00:00.000Z", officialLineups: { fixtures: [] }, teams: { teams: [] }, matches: [], priorStandings: { rows: [] } });
assert(validateSnapshot(duplicatePlayerSnapshot).includes("duplicate projected player identity within match"));
const targetIncluded = structuredClone(testSnapshot); targetIncluded.dataCutoff.matchdayExclusive = 7;
assert(validateSnapshot(targetIncluded).some(reason => reason.includes("cutoff")), "target leakage non rilevato");
const joined = actualForSnapshot(testSnapshot, { ...match, status: "finished", score: { home: 2, away: 1 }, teamStats: { home: { shots: 12, shotsOnTarget: 5 }, away: { shots: 9, shotsOnTarget: 2 } }, playerStats: { home: [{ playerId: "p1", player: "Player One", minutes: 90, shots: 2, shotsOnTarget: 1, starter: true }], away: [] }, didNotPlay: { home: [], away: [] } });
assert.equal(joined.matchId, testSnapshot.matchId);
assert.equal(joined.actual.homeGoals, 2);
assert.equal(joined.exactScoreFeatures.actualHomeGoals, 2);
assert.equal(joined.exactScoreFeatures.X_home.teamId, "home");
assert.equal(joined.exactScoreFeatures.X_away.teamId, "away");
assert.equal(joined.exactScoreFeatures.X_home.goalFeatures.currentSeasonMatches, 0);
assert(!Object.hasOwn(joined.exactScoreFeatures.X_home, "actualHomeGoals"));
assert(!Object.hasOwn(testSnapshot.prediction.teamProjections[0].goalFeatures, "actualHomeGoals"));
assert.throws(() => actualForSnapshot(testSnapshot, { ...match, id: "different-match-id", status: "finished", score: { home: 1, away: 0 } }), /CANONICAL_MATCH_ID_MISMATCH/);
assert.equal(actualForSnapshot(testSnapshot, { ...match, status: "postponed" }), null, "una gara rinviata non deve contaminare l'evaluation");
const zeroIsData = marketMetrics([{ p: 0.1, actual: 0 }], "p", "actual", 1);
assert.equal(zeroIsData.n, 1);
assert.equal(zeroIsData.eventRate, 0);
assert.equal(toKickoffUtc(match), Date.parse("2026-10-11T13:00:00.000Z"));

if (fs.existsSync(snapshotFile) && fs.existsSync(manifestFile) && fs.existsSync(reportFile)) {
  const matchday = JSON.parse(fs.readFileSync(snapshotFile, "utf8"));
  const manifest = JSON.parse(fs.readFileSync(manifestFile, "utf8"));
  const report = JSON.parse(fs.readFileSync(reportFile, "utf8"));
  assert.equal(matchday.snapshots.length, matchday.snapshotCount);
  assert.equal(new Set(matchday.snapshots.map(row => row.matchId)).size, matchday.snapshots.length);
  for (const row of matchday.snapshots) {
    assert.deepEqual(validateSnapshot(row), []);
    assert.equal(row.dataCutoff.matchdayExclusive, row.matchday);
    assert(row.prediction.teamProjections.every(team => team.goalFeatures.matchesUsed.every(id => {
      const targetDay = Number(id.match(/-md-(\d+)$/)?.[1]); return targetDay < row.matchday;
    })));
    assert(!Object.hasOwn(row.prediction, "actual"));
    assert(row.prediction.teamProjections.every(team => team.goalFeatures.matchesUsed.every(id => Number(id.match(/-md-(\d+)$/)?.[1]) < row.matchday)), "feature goal con target/future data");
    assert(manifest.snapshots.some(entry => entry.snapshotId === row.snapshotId && entry.hash === row.integrity.sha256));
  }
  const originalContent = fs.readFileSync(snapshotFile, "utf8");
  const rerun = spawnSync(process.execPath, [path.join(root, "scripts/snapshot-predictions.js"), "--matchday", "6"], { cwd: root, encoding: "utf8" });
  assert.notEqual(rerun.status, 0, "il comando ha sovrascritto uno snapshot esistente senza flag");
  assert.match(rerun.stderr, /SNAPSHOT_ALREADY_EXISTS/);
  assert.equal(fs.readFileSync(snapshotFile, "utf8"), originalContent, "contenuto immutabile alterato dal rerun");
  assert.equal(report.metadata.modelFrozen, true);
  assert.equal(report.metadata.productionBehaviorChanged, false);
  assert.equal(report.modelChangeGate.status, "CLOSED");
  assert(report.temporalCoverage.maturityCoverage);
  assert(report.modelEvidenceMaturityCoverage.teamProfileRecords >= 2);
  assert.notEqual(report.temporalCoverage.maturityCoverage, report.modelEvidenceMaturityCoverage);
  assert(report.exactScoreDataset.every(row => row.matchId && Number.isInteger(row.actualHomeGoals) && Number.isInteger(row.actualAwayGoals)));
  assert(report.pending.every(row => !["FINISHED", "AWARDED"].includes(row.status)));
}
console.log("OK immutable snapshots: schema, as-of cutoff, target/future exclusion, hash, canonical join, missing data, lineup, exact-score features and gates");
