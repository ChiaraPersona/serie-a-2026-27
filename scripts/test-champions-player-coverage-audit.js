"use strict";

const assert = require("assert");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const builder = require("./build-champions-player-stats");

const root = path.resolve(__dirname, "..");
const read = relative => JSON.parse(fs.readFileSync(path.join(root, relative), "utf8"));
const hashFile = relative => crypto.createHash("sha256").update(fs.readFileSync(path.join(root, relative))).digest("hex");
const hashJson = value => crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
const batch = ["arsenal", "inter", "bayern-munchen", "real-madrid", "paris-saint-germain", "bodo-glimt"];
const audit = read("data/analysis/champions/player-coverage-audit-2026-10-09.json");
const data = read("data/normalized/champions-player-stats-2026-27.json");
const source = read("data/sources/champions-pilot-match-stats-2025-27.json");
const configs = new Map(source.teams.map(team => [team.id, team]));
const espn = builder.collectEspnRows({ season: "2026-27", asOf: "2026-10-09" });

assert.equal(audit.phase, "5B");
assert.equal(audit.scope.importedDuringAudit, false);
assert.equal(audit.scope.otherTeamsProcessed, false);
assert.deepEqual(new Set(audit.scope.selectedTeams), new Set(batch));
assert.equal(audit.summary.matches, 36);
assert.equal(audit.summary.duplicateObservations, 0);
assert.equal(audit.summary.shotsExactMatches, 36);
assert.equal(audit.summary.shotsOnTargetExactMatches, 36);

const allObservationIds = [];
for (const teamAudit of audit.teams) {
  const team = data.teams.find(item => item.id === teamAudit.teamId);
  const config = configs.get(teamAudit.teamId);
  assert.ok(team && config, `${teamAudit.teamId}: configurazione o dataset mancante`);
  assert.equal(
    teamAudit.coverage.registeredPlayers,
    teamAudit.coverage.registeredActive + teamAudit.coverage.registeredNoAppearance + teamAudit.coverage.identityUnresolved,
    `${teamAudit.team}: classificazione rosa incompleta`
  );

  const targetMatchIds = new Set(teamAudit.matches.map(match => match.matchId));
  const rawKeys = [];
  for (const [providerPlayerId, rows] of espn.matchesByAthlete) {
    for (const row of rows) {
      if (row.teamId === config.espnTeamId && row.league === config.league && targetMatchIds.has(row.matchId)) {
        rawKeys.push(`${teamAudit.teamId}:${row.matchId}:${providerPlayerId}`);
      }
    }
  }
  const auditKeys = teamAudit.matches.flatMap(match => match.players.map(player => player.observationId));
  assert.deepEqual(new Set(auditKeys), new Set(rawKeys), `${teamAudit.team}: partecipanti raw non rappresentati`);
  assert.equal(auditKeys.length, new Set(auditKeys).size, `${teamAudit.team}: contributo contato due volte`);
  allObservationIds.push(...auditKeys);

  const registeredIds = new Set(team.players.map(player => player.providerPlayerId).filter(Boolean));
  for (const match of teamAudit.matches) {
    assert.ok(match.date >= "2026-07-01" && match.date <= "2026-10-09", `${teamAudit.team}: future leakage`);
    assert.equal(match.reconciliation.shots.status, "exact", `${teamAudit.team}/${match.matchId}: tiri non riconciliati`);
    assert.equal(match.reconciliation.shots.residual, 0, `${teamAudit.team}/${match.matchId}: residuo tiri`);
    assert.equal(match.reconciliation.shotsOnTarget.status, "exact", `${teamAudit.team}/${match.matchId}: SOT non riconciliati`);
    assert.equal(match.reconciliation.shotsOnTarget.residual, 0, `${teamAudit.team}/${match.matchId}: residuo SOT`);
    for (const player of match.players) {
      if (player.classification === "played_not_registered") {
        assert.equal(registeredIds.has(player.providerPlayerId), false, `${teamAudit.team}/${player.player}: fuori rosa presente nella vista registrata`);
        assert.equal(player.predictionCandidateEligible, false, `${teamAudit.team}/${player.player}: fuori rosa eleggibile per errore`);
        assert.equal(player.exclusionReason, "not_in_registered_champions_squad");
      }
    }
  }
  for (const player of teamAudit.classifications.identityUnresolved) {
    const normalized = team.players.find(item => item.id === player.playerId);
    assert.equal(player.providerPlayerId, null);
    assert.equal(player.status, "open");
    assert.equal(normalized.providerPlayerId, null);
    assert.equal(normalized.currentSeason, null);
    assert.equal(normalized.identitySource, "unresolved");
  }
}
assert.equal(allObservationIds.length, new Set(allObservationIds).size, "osservazione duplicata tra squadre o partite");

const resolved = audit.teams.flatMap(team => team.identityReview.resolvedFromHistorical)
  .map(player => `${player.player}:${player.providerPlayerId}`).sort();
assert.deepEqual(resolved, ["Arthur Vignaud:417263", "Bastian Assomo:422013", "David Boly:403981", "Sacha Boey:287225"]);
const unresolved = audit.teams.flatMap(team => team.identityReview.unresolved).map(player => player.player).sort();
assert.deepEqual(unresolved, ["Diego Villalba", "Gabriel Valero", "Javi Navarro", "Kasper Solhaug", "Mathias Blix Olsen", "Matias Jaiteh"]);

const nullable = builder.currentAggregate([{ appearances: 1, shots: null, shotsOnTarget: 0 }]);
assert.equal(nullable.shots, null);
assert.equal(nullable.shotsOnTarget, 0);

const aek = data.teams.find(team => team.id === "aek-athens");
const aekMatches = source.matches.filter(match => match.season === "2026-27" && (match.home?.providerTeamId === "887" || match.away?.providerTeamId === "887"));
assert.equal(data.teamSnapshots["aek-athens"].asOf, "2026-10-03");
assert.equal(hashJson(aek), "f2f3deb29a908c2637510dbfecf2d754ff2ebe1086ef16bae0da1d545ef9d308");
assert.equal(hashJson(aekMatches), "207c225e9b37d95be6134de09e880e767823048c62c572a2268da418d0d04a94");
assert.equal(hashFile("data/normalized/champions-player-stats-2025-26.json"), "4c09d7f109f9d5a3b769c153ed4c051cc7a99adb588a11f7c3a7cb3b348ef692");
assert.equal(hashFile("scripts/build-champions-pilot-predictions.js"), "135788a773b8607db7f1386a1c9d6b5d2fb8560fdab914d652318bfe95691be5");
assert.equal(hashFile("data/analysis/champions/league-strength-2026-10-03.json"), "82a4975c77509a1b49faa1b63ee84c08cade57cccd2edbf07625215644563d22");
assert.equal(audit.gate, "CHAMPIONS PLAYER-COVERAGE GATE = PASS");

console.log(`Champions player coverage audit: OK · ${audit.summary.matches} gare · ${audit.summary.playerMatchObservations} osservazioni · ${audit.summary.uniquePlayedNotRegistered} fuori rosa`);
