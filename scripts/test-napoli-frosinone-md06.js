"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = relative => JSON.parse(fs.readFileSync(path.join(root, relative), "utf8"));
const matchId = "napoli-frosinone-2026-27-md-06";
const kickoff = new Date("2026-10-10T20:45:00+02:00");

const official = read("data/sources/official-lineups-2026-27.json").fixtures.find(row => row.matchId === matchId);
const prediction = read("data/normalized/predictions.json").predictions.find(row => row.matchId === matchId);
const schedina = read("data/normalized/schedina-md06.json");
const catalog = schedina.marketCatalog.matches.find(row => row.matchId === matchId);
const report = read("output/reports/napoli-frosinone-md06-official-pre-match-2026-10-10.json");

assert(official && prediction && catalog && report, "Napoli-Frosinone MD6: artifact missing");
assert(new Date(official.retrievedAt) < kickoff, "Official lineup retrieval must be pre-kickoff");
assert.deepEqual(official.teams.map(team => [team.teamId, team.formation, team.players.length, team.substitutes.length]), [
  ["napoli", "3-4-2-1", 11, 10],
  ["frosinone", "4-2-3-1", 11, 14],
]);
assert.deepEqual(official.teams[0].players.map(player => player.playerId), [
  "alex-meret", "benoit-badiashile", "amir-rrahmani", "rafa-marin", "leonardo-spinazzola",
  "stanislav-lobotka", "kevin-de-bruyne", "giovanni-di-lorenzo", "noa-lang", "david-neres", "rasmus-h-jlund",
]);
assert.deepEqual(official.teams[1].players.map(player => player.playerId), [
  "lorenzo-palmisani", "anthony-oyono", "gabriele-calvani", "giorgio-cittadini", "gabriele-bracaglia",
  "giacomo-calo", "patrizio-masini", "fares-ghedjemis", "romano-schmid", "giorgi-kvernadze", "antonio-raimondo",
]);
assert(official.teams.flatMap(team => team.players).every(player => player.playerId), "Unresolved starter identity");
const unresolved = official.teams.flatMap(team => team.substitutes).filter(player => !player.playerId);
assert.deepEqual(unresolved.map(player => player.sourceName), ["Milton Pereyra"]);
assert.equal(prediction.dataQuality.probableLineups, "22/22 titolari ufficiali confermati");
assert.equal(prediction.engineVersion, "4.13.0");
assert.equal(prediction.playerMarketModelVersion, 2);

const officialOutfield = new Set(official.teams.flatMap(team => team.players.slice(1).map(player => player.playerId)));
const modeled = new Set(prediction.shooters.allPlayers.map(player => player.playerId));
assert.deepEqual([...modeled].sort(), [...officialOutfield].sort(), "Player Market V2 must contain exactly the official outfield starters");
assert.equal(report.starters.length, 22);
assert.equal(report.starters.filter(player => !player.goalkeeper).length, 20);
assert.equal(report.substitutes.length, 24);

for (const goalkeeper of report.starters.filter(player => player.goalkeeper)) {
  assert.equal(goalkeeper.expectedMinutes, null);
  assert.equal(goalkeeper.projectedShots, null);
  assert(Object.values(goalkeeper.probabilities).every(value => value === null));
}
for (const player of report.starters.filter(player => !player.goalkeeper)) {
  const p = player.probabilities;
  assert(p.shots1Plus >= p.shots2Plus && p.shots2Plus >= p.shots3Plus && p.shots3Plus >= p.shots4Plus, `${player.name}: shot thresholds not monotonic`);
  assert(p.sot1Plus >= p.sot2Plus, `${player.name}: SOT thresholds not monotonic`);
}
for (const team of prediction.shooters.teamTotals) {
  const playerShots = prediction.shooters.allPlayers.filter(player => player.teamId === team.teamId).reduce((sum, player) => sum + player.projectedShots, 0);
  const playerSot = prediction.shooters.allPlayers.filter(player => player.teamId === team.teamId).reduce((sum, player) => sum + player.projectedShotsOnTarget, 0);
  assert(Math.abs(playerShots - team.projectedShots) <= 0.11, `${team.teamId}: shots do not reconcile`);
  assert(Math.abs(playerSot - team.projectedShotsOnTarget) <= 0.11, `${team.teamId}: SOT do not reconcile`);
}
for (const substitute of report.substitutes) {
  assert.equal(substitute.starterProbabilityPct, 0);
  assert.equal(substitute.entryProbabilityPct, null);
  assert.equal(substitute.expectedMinutes, null);
  assert.equal(substitute.projectedShots, null);
  assert.equal(substitute.projectedShotsOnTarget, null);
}

assert.equal(Object.values(prediction.probabilities.final).reduce((sum, value) => sum + value, 0), 100);
const selectedIds = new Set(catalog.suggestions);
const selected = catalog.selections.filter(selection => selectedIds.has(selection.selectionId));
assert.equal(selected.length, 17);
const selectedPlayerIds = selected.map(selection => selection.playerId || selection.betSelection?.market?.subject?.id).filter(Boolean);
assert(selectedPlayerIds.every(playerId => officialOutfield.has(playerId)), "A selected player forecast belongs to a bench player");
for (const benchPlayerId of ["vanja-milinkovic-savic", "billy-gilmour", "matteo-politano", "scott-mctominay", "lorenzo-lucca", "ilario-monterisi", "tomas-bobcek", "alessio-zerbin"]) {
  assert(!selectedPlayerIds.includes(benchPlayerId), `${benchPlayerId}: bench player still selected`);
}

const slipLegs = schedina.slips.flatMap(slip => slip.legs || []);
assert(!slipLegs.some(leg => leg.matchId === matchId), "Napoli-Frosinone must not be injected into existing slips");

console.log(JSON.stringify({
  matchId, officialStarters: officialOutfield.size + 2, modeledOutfield: modeled.size,
  substitutes: report.substitutes.length, selectedForecasts: selected.length,
  playerTotalsReconciled: true, preKickoffOnly: true, slipLegsChangedForMatch: false,
}, null, 2));
