"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = relative => JSON.parse(fs.readFileSync(path.join(root, relative), "utf8"));
const matchId = "como-roma-2026-27-md-06";
const kickoff = new Date("2026-10-11T12:30:00+02:00");

const official = read("data/sources/official-lineups-2026-27.json").fixtures.find(row => row.matchId === matchId);
const prediction = read("data/normalized/predictions.json").predictions.find(row => row.matchId === matchId);
const directory = read("data/teams/index.json");

assert(official && prediction, "Como-Roma MD6: artifact missing");
assert(new Date(official.retrievedAt) < kickoff, "Official lineup retrieval must be pre-kickoff");
assert.deepEqual(official.teams.map(team => [team.teamId, team.formation, team.players.length, team.substitutes.length]), [
  ["como", "4-2-3-1", 11, 0],
  ["roma", "3-4-1-2", 11, 0],
]);
assert(official.teams.flatMap(team => team.players).every(player => player.playerId), "Unresolved official starter identity");
assert.equal(prediction.dataQuality.probableLineups, "22/22 titolari ufficiali confermati");
assert.equal(prediction.engineVersion, "4.13.0");
assert.equal(prediction.playerMarketModelVersion, 2);

const officialOutfield = new Set(official.teams.flatMap(team => team.players.slice(1).map(player => player.playerId)));
const modeled = new Set(prediction.shooters.allPlayers.map(player => player.playerId));
assert.deepEqual([...modeled].sort(), [...officialOutfield].sort(), "Player Market V2 must contain exactly the official outfield starters");
for (const playerId of ["kaiki", "maxence-caqueret"]) assert(modeled.has(playerId), `${playerId}: official starter missing from shots/SOT`);
for (const playerId of ["alex-valle", "martin-baturina"]) assert(!modeled.has(playerId), `${playerId}: old probable starter still present`);

for (const team of prediction.shooters.teamTotals) {
  const players = prediction.shooters.allPlayers.filter(player => player.teamId === team.teamId);
  const shots = players.reduce((sum, player) => sum + player.projectedShots, 0);
  const sot = players.reduce((sum, player) => sum + player.projectedShotsOnTarget, 0);
  assert(Math.abs(shots - team.projectedShots) <= 0.02, `${team.teamId}: shots do not reconcile`);
  assert(Math.abs(sot - team.projectedShotsOnTarget) <= 0.02, `${team.teamId}: SOT do not reconcile`);
  for (const player of players) {
    assert(player.shotProbabilities.over05 >= player.shotProbabilities.over15);
    assert(player.shotProbabilities.over15 >= player.shotProbabilities.over25);
    assert(player.shotOnTargetProbabilities.over05 >= player.shotOnTargetProbabilities.over15);
  }
}

assert.deepEqual(prediction.likelyBooked.map(player => [player.playerId, player.riskScore]), [
  ["evan-ndicka", 68],
  ["mario-hermoso", 65],
  ["gianluca-mancini", 61],
  ["jacobo-ramon", 61],
  ["kaiki", 57],
]);
assert(prediction.likelyBooked.every(player => player.riskScoreSemantics === "COMPARATIVE_HEURISTIC_NOT_PROBABILITY"));
assert(prediction.likelyBooked.every(player => player.calibratedProbability == null));

for (const teamId of ["como", "roma"]) {
  const lineup = directory.officialLineups[`${matchId}:${teamId}`];
  assert.equal(lineup.status, "official");
  assert.equal(lineup.players.length, 11);
  assert.equal(lineup.substitutes.length, 0);
}

console.log(JSON.stringify({
  matchId,
  officialStarters: 22,
  modeledOutfield: modeled.size,
  shotsAndSotReconciled: true,
  likelyBooked: prediction.likelyBooked.map(player => `${player.name}:${player.riskScore}`),
  cardProbabilitiesInvented: false,
  preKickoffOnly: true,
}, null, 2));
