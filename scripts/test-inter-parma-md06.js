"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = relative => JSON.parse(fs.readFileSync(path.join(root, relative), "utf8"));
const matchId = "inter-parma-2026-27-md-06";

const official = read("data/sources/official-lineups-2026-27.json").fixtures.find(row => row.matchId === matchId);
const prediction = read("data/normalized/predictions.json").predictions.find(row => row.matchId === matchId);
const schedina = read("data/normalized/schedina-md06.json");
const catalog = schedina.marketCatalog.matches.find(row => row.matchId === matchId);
const report = read("output/reports/inter-parma-md06-official-pre-match-2026-10-10.json");

assert(official && prediction && catalog && report, "Inter-Parma MD6: artifact missing");
assert.deepEqual(official.teams.map(team => [team.teamId, team.formation, team.players.length, team.substitutes.length]), [
  ["inter", "3-5-2", 11, 12],
  ["parma", "3-4-2-1", 11, 13],
]);

const unresolved = official.teams.flatMap(team => team.substitutes.map(player => ({ teamId: team.teamId, ...player }))).filter(player => !player.playerId);
assert.deepEqual(unresolved.map(player => `${player.teamId}:${player.sourceName}`), ["parma:D. Diallo"]);
assert.equal(prediction.dataQuality.probableLineups, "22/22 titolari ufficiali confermati");
assert.equal(prediction.engineVersion, "4.13.0");
assert.equal(prediction.playerMarketModelVersion, 2);

const officialOutfield = new Set(official.teams.flatMap(team => team.players.slice(1).map(player => player.playerId)));
const modeled = new Set(prediction.shooters.allPlayers.map(player => player.playerId));
assert.deepEqual([...modeled].sort(), [...officialOutfield].sort(), "Player Market V2 must contain exactly the 20 official outfield starters");

assert.equal(report.starters.length, 22);
assert.equal(report.starters.filter(player => !player.goalkeeper).length, 20);
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
for (const substitute of report.substitutes) {
  assert.equal(substitute.starterProbabilityPct, 0);
  assert.equal(substitute.entryProbabilityPct, null);
  assert.equal(substitute.expectedMinutes, null);
  assert.equal(substitute.projectedShots, null);
  assert.equal(substitute.projectedShotsOnTarget, null);
}

const selectedIds = new Set(catalog.suggestions);
const selected = catalog.selections.filter(selection => selectedIds.has(selection.selectionId));
assert.equal(selected.length, 18);
const selectedPlayerIds = selected.map(selection => selection.playerId || selection.betSelection?.market?.subject?.id).filter(Boolean);
assert(selectedPlayerIds.every(playerId => officialOutfield.has(playerId)), "A selected player forecast belongs to a bench player");
for (const benchPlayerId of ["lautaro-martinez", "nicolo-barella", "ange-yoan-bonny", "manuel-akanji", "alessandro-bastoni", "sascha-britschgi", "adrian-bernabe", "jose-david-romero"]) {
  assert(!selectedPlayerIds.includes(benchPlayerId), `${benchPlayerId}: bench player still selected`);
}

const slipLegs = schedina.slips.flatMap(slip => slip.legs || []);
assert(!slipLegs.some(leg => leg.matchId === matchId), "Inter-Parma must not be injected into existing slips");

console.log(JSON.stringify({
  matchId,
  officialStarters: officialOutfield.size + 2,
  modeledOutfield: modeled.size,
  substitutes: report.substitutes.length,
  selectedForecasts: selected.length,
  slipLegsChangedForMatch: false,
}, null, 2));
