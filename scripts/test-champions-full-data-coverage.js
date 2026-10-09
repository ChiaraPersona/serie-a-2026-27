"use strict";

const assert = require("assert");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const builder = require("./build-champions-player-stats");
const importer = require("./import-champions-pilot-stats");

const root = path.resolve(__dirname, "..");
const read = relative => JSON.parse(fs.readFileSync(path.join(root, relative), "utf8"));
const hashFile = relative => crypto.createHash("sha256").update(fs.readFileSync(path.join(root, relative))).digest("hex");
const hashJson = value => crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
const data = read("data/normalized/champions-player-stats-2026-27.json");
const audit = read("data/analysis/champions/full-data-coverage-audit-2026-10-09.json");
const control = read("data/analysis/champions/full-data-control-2026-10-09.json");
const batches = read("data/analysis/champions/full-data-batches-2026-10-09.json");
const contextControl = read("data/analysis/champions/aek-context-control-2026-10-04.json");
const registry = builder.squadTeams();

assert.equal(registry.length, 36);
assert.equal(data.teams.length, 36);
assert.deepEqual(new Set(data.teams.map(team => team.id)), new Set(registry.map(team => team.id)));
assert.equal(audit.phase, "6");
assert.equal(audit.summary.teams, 36);
assert.equal(audit.summary.duplicateObservations, 0);
assert.equal(audit.summary.failedTeams, 0);
assert.equal(audit.summary.shotsExactMatches, 209);
assert.equal(audit.summary.shotsOnTargetExactMatches, 209);
assert.equal(audit.summary.shotsComparableMatches, 209);
assert.equal(audit.summary.shotsOnTargetComparableMatches, 209);
assert.equal(importer.annualCalendarLeagueStarts["nor.1"], "2026-01-01");
assert.equal(importer.teams.find(team => team.id === "fenerbahce").league, "tur.1");
assert.equal(importer.teams.find(team => team.id === "galatasaray").league, "tur.1");
assert.equal(audit.teams.find(team => team.teamId === "viking").effectivePeriod.from, "2026-01-01");

const observationIds = [];
for (const team of data.teams) {
  assert.equal(new Set(team.players.map(player => builder.normalize(player.name))).size, team.players.length, `${team.id}: nomi duplicati`);
  const providerIds = team.players.map(player => player.providerPlayerId).filter(Boolean);
  assert.equal(new Set(providerIds).size, providerIds.length, `${team.id}: ESPN ID duplicati`);
  assert.ok(data.teamSnapshots[team.id], `${team.id}: snapshot metadata mancante`);
  for (const player of team.players.filter(player => player.currentSeason)) {
    const bucketKeys = player.currentSeason.entries.map(entry => `${entry.teamId}|${entry.competitionType}|${entry.competition}`);
    assert.equal(new Set(bucketKeys).size, bucketKeys.length, `${team.id}/${player.name}: bucket competizione duplicato`);
    const scope = player.currentSeason.totalsScope || { teamId: team.espnTeamId, competitionType: "domestic-league", competition: null };
    const primary = player.currentSeason.entries.filter(entry => (entry.teamId || team.espnTeamId) === scope.teamId
      && entry.competitionType === scope.competitionType
      && (!scope.competition || entry.competition === scope.competition));
    if (team.id !== "aek-athens") {
      assert.deepEqual(player.currentSeason.totals, builder.currentAggregate(primary), `${team.id}/${player.name}: totali principali contaminati`);
    }
  }
}

for (const team of audit.teams) {
  assert.equal(team.coverage.registeredPlayers, team.coverage.registeredActive + team.coverage.registeredNoAppearance + team.coverage.identityUnresolved);
  for (const match of team.matches) {
    assert.ok(match.date <= "2026-10-09", `${team.team}/${match.matchId}: future leakage`);
    assert.ok(match.date >= team.effectivePeriod.from, `${team.team}/${match.matchId}: fuori periodo effettivo`);
    assert.ok(["exact", "not_comparable_missing_provider_value"].includes(match.reconciliation.shots.status));
    assert.ok(["exact", "not_comparable_missing_provider_value"].includes(match.reconciliation.shotsOnTarget.status));
    if (match.reconciliation.shots.status === "exact") assert.equal(match.reconciliation.shots.residual, 0);
    else assert.equal(match.reconciliation.shots.residual, null);
    if (match.reconciliation.shotsOnTarget.status === "exact") assert.equal(match.reconciliation.shotsOnTarget.residual, 0);
    else assert.equal(match.reconciliation.shotsOnTarget.residual, null);
    for (const player of match.players) {
      observationIds.push(player.observationId);
      if (player.classification === "played_not_registered") {
        assert.equal(player.predictionCandidateEligible, false);
        assert.equal(player.exclusionReason, "not_in_registered_champions_squad");
      }
    }
  }
  for (const player of team.classifications.identityUnresolved) {
    assert.equal(player.providerPlayerId, null);
    assert.equal(player.status, "open");
  }
}
assert.equal(observationIds.length, new Set(observationIds).size, "contributi statistici duplicati");

assert.equal(batches.batches.length, 5);
assert.equal(batches.summary.teams, 29);
assert.equal(new Set(batches.batches.flatMap(batch => batch.teams.map(team => team.teamId))).size, 29);
assert.equal(batches.batches.slice(0, 3).every(batch => batch.status === "PASS"), true);
assert.equal(batches.batches.slice(3).every(batch => batch.status === "PARTIAL"), true);

for (const [teamId, snapshot] of Object.entries(control.protectedTeamSnapshots)) {
  const team = data.teams.find(item => item.id === teamId);
  assert.equal(hashJson(team), snapshot.sha256, `${teamId}: squadra validata modificata`);
  assert.equal(data.teamSnapshots[teamId].asOf, snapshot.asOf, `${teamId}: as-of modificato`);
}
for (const item of Object.values(control.protectedFiles)) assert.equal(hashFile(item.path), item.sha256, `${item.path}: invariante modificata`);
for (const raw of control.protectedRawSnapshots) assert.equal(hashFile(raw.path), raw.sha256, `${raw.path}: raw preesistente sovrascritto`);

assert.equal(contextControl.expectedTeamShots, 11.01);
assert.equal(contextControl.expectedTeamSot, 3.91);
assert.equal(contextControl.players.every((player, index) => player.expectedMinutes === (index === 0 ? 90 : 84.6)), true);
const nullable = builder.currentAggregate([{ appearances: 1, shots: null, shotsOnTarget: 0 }]);
assert.equal(nullable.shots, null);
assert.equal(nullable.shotsOnTarget, 0);
assert.equal(audit.gate, "CHAMPIONS FULL-DATA COVERAGE GATE = PARTIAL");

console.log(`Champions full-data coverage: OK · ${audit.summary.teams}/36 squadre · ${audit.summary.shotsExactMatches}/${audit.summary.matches} gare riconciliate · gate PARTIAL`);
