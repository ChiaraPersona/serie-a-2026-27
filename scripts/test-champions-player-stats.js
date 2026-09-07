"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { PLAYER_FIELDS, round } = require("./team-pages/model");

const root = path.resolve(__dirname, "..");
const data = JSON.parse(fs.readFileSync(path.join(root, "data/normalized/champions-player-stats-2025-26.json"), "utf8"));
const players = data.teams.flatMap(team => team.players.map(player => ({ ...player, team: team.team })));

assert.strictEqual(data.season, "2025/26");
assert.strictEqual(data.summary.teams, 36);
assert.strictEqual(data.summary.players, 970);
assert.strictEqual(data.summary.complete, 731);
assert.strictEqual(data.summary.partial, 0);
assert.strictEqual(data.summary.unavailable, 239);
assert.strictEqual(data.summary.complete + data.summary.partial + data.summary.unavailable, data.summary.players);
assert.strictEqual(data.summary.copiedSerieATeams, 4);
assert(data.summary.sourceMatchesWithRosters >= 4000);
assert.strictEqual(data.teams.filter(team => team.sourceMode === "copied-serie-a").length, 4);

for (const player of players) {
  assert(["complete", "partial", "unavailable"].includes(player.dataQuality));
  if (!player.previousSeason) {
    assert.strictEqual(player.dataQuality, "unavailable");
    assert(player.unmatchedReason, `${player.team}/${player.name}: N/D senza motivazione`);
    continue;
  }
  assert(player.providerPlayerId || player.sourceMode === "copied-serie-a", `${player.team}/${player.name}: ID provider mancante`);
  const totals = player.previousSeason.totals;
  assert.strictEqual(totals.appearances, player.previousSeason.entries.reduce((sum, entry) => sum + entry.appearances, 0));
  for (const field of PLAYER_FIELDS) assert(Object.hasOwn(totals, field), `${player.team}/${player.name}: campo ${field} mancante`);
  assert(Object.hasOwn(totals, "per90"));
  if (totals.minutes && totals.goals !== null) assert.strictEqual(totals.per90.goals, round(totals.goals * 90 / totals.minutes));
}

console.log(`Statistiche giocatori Champions: ${data.summary.complete} complete · ${data.summary.unavailable} N/D su ${data.summary.players}.`);
