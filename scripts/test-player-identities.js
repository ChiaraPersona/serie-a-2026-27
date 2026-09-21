"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { loadPlayerIdentities } = require("./player-identity");

const root = path.resolve(__dirname, "..");
const read = relative => JSON.parse(fs.readFileSync(path.join(root, relative), "utf8"));
const identities = loadPlayerIdentities(root);
const known = new Set(identities.payload.players.map(player => `${player.teamId}:${player.playerId}`));
for (const team of read("data/teams/index.json").teams) {
  for (const player of read(`data/teams/${team.id}.json`).squad) known.add(`${team.id}:${player.id}`);
}

const matches = read("data/normalized/matches.json")
  .filter(match => match.competition === "serie-a" && match.season === "2026-27" && match.status === "finished");
let playerRows = 0;
for (const match of matches) {
  for (const side of ["home", "away"]) {
    const teamId = match[`${side}Team`];
    for (const player of match.playerStats?.[side] || []) {
      playerRows += 1;
      assert.ok(player.playerId, `${match.id}: ${player.player} senza playerId`);
      assert.ok(known.has(`${teamId}:${player.playerId}`), `${match.id}: ${teamId}/${player.playerId} fuori dal registro identità`);
    }
  }
}

const official = read("data/sources/official-lineups-2026-27.json");
let officialRows = 0;
for (const fixture of official.fixtures) {
  for (const team of fixture.teams) {
    for (const player of [...(team.players || []), ...(team.substitutes || [])]) {
      officialRows += 1;
      assert.ok(player.playerId, `${fixture.matchId}: ${team.teamId}/${player.sourceName} senza playerId`);
      assert.ok(known.has(`${team.teamId}:${player.playerId}`), `${fixture.matchId}: ${team.teamId}/${player.playerId} fuori dal registro identità`);
    }
  }
}

const probable = read("data/sources/probable-lineups-md5-2026-27.json");
assert.equal(probable.coverage.unmatched, 0, "probabili MD5 con identità non collegata");
assert.ok(probable.teams.flatMap(team => team.players).every(player => player.playerId), "playerId nullo nelle probabili MD5");

const predictions = read("data/normalized/predictions.json");
const predictionNulls = [];
function findPredictionNulls(value, location = "predictions") {
  if (Array.isArray(value)) return value.forEach((entry, index) => findPredictionNulls(entry, `${location}[${index}]`));
  if (!value || typeof value !== "object") return;
  if (Object.hasOwn(value, "playerId") && value.playerId === null) predictionNulls.push(location);
  for (const [key, entry] of Object.entries(value)) findPredictionNulls(entry, `${location}.${key}`);
}
findPredictionNulls(predictions);
assert.deepEqual(predictionNulls, [], `pronostici con playerId nullo: ${predictionNulls.join(", ")}`);

console.log(`Identità collegate: ${playerRows} righe calciatore in ${matches.length} referti, ${officialRows} righe di formazioni ufficiali, zero null.`);
