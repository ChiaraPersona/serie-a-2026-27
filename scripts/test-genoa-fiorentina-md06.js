"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { isPlayableSelection, isUnderPlayableSelection } = require("./betting-market-policy");

const root = path.resolve(__dirname, "..");
const read = relative => JSON.parse(fs.readFileSync(path.join(root, relative), "utf8"));
const matchId = "genoa-fiorentina-2026-27-md-06";
const official = read("data/sources/official-lineups-2026-27.json").fixtures.find(fixture => fixture.matchId === matchId);
const prediction = read("data/normalized/predictions.json").predictions.find(row => row.matchId === matchId);
const myCombo = read("data/sources/mycombo-serie-a-2026-27-md-06.json").matches[matchId];
const sourceLegs = read("data/sources/schedina-serie-a-2026-27-md-06.json").slips.flatMap(slip => slip.picks).filter(leg => leg.matchId === matchId);
const normalizedLegs = read("data/normalized/schedina-md06.json").slips.flatMap(slip => slip.legs).filter(leg => leg.matchId === matchId);
const teams = new Map(read("data/teams/index.json").teams.map(team => [team.id, team]));

assert(official, "Distinta ufficiale Genoa-Fiorentina assente");
assert.deepEqual(official.teams.map(team => [team.teamId, team.formation, team.players.length, team.substitutes.length]), [
  ["genoa", "3-4-2-1", 11, 13],
  ["fiorentina", "4-3-3", 11, 11],
]);
assert.deepEqual(official.teams.flatMap(team => team.substitutes.filter(player => player.playerId === null).map(player => `${team.teamId}:${player.sourceName}`)), [
  "genoa:Klisys",
  "genoa:Lafont",
  "genoa:Wiafe",
  "fiorentina:Mazzeo",
]);

assert(prediction, "Pronostico Genoa-Fiorentina assente");
assert.equal(prediction.dataQuality.probableLineups, "22/22 titolari ufficiali confermati");
for (const lineup of official.teams) {
  const expected = lineup.players.slice(1).map(player => player.playerId).filter(Boolean).sort();
  const actual = prediction.shooters.allPlayers.filter(player => player.teamId === lineup.teamId).map(player => player.playerId).sort();
  assert.deepEqual(actual, expected, `${lineup.teamId}: tiratori non allineati alla formazione ufficiale`);
  assert.equal(teams.get(lineup.teamId).probableLineup.status, "official", `${lineup.teamId}: stato distinta non ufficiale`);
  assert.equal(teams.get(lineup.teamId).probableLineup.matchId, matchId, `${lineup.teamId}: distinta associata alla gara errata`);
}

assert.equal(myCombo.length, 3, "Servono tre profili MyCombo mirati");
for (const portfolio of myCombo) {
  assert(portfolio.legs.length >= 3 && portfolio.legs.length <= 8, `${portfolio.tier}: numero gambe non valido`);
  assert(portfolio.legs.every(leg => isPlayableSelection(leg, { matchday: 6 })), `${portfolio.tier}: selezione non giocabile`);
  assert(!portfolio.legs.some(isUnderPlayableSelection), `${portfolio.tier}: Under giocabile presente`);
  const rendered = prediction.combinations.find(combo => combo.tier === portfolio.tier);
  assert.deepEqual(rendered.legs.map(leg => leg.selectionId), portfolio.legs.map(leg => leg.selectionId), `${portfolio.tier}: MyCombo non propagata nel pronostico`);
}

assert.equal(sourceLegs.length, 2, "Le due Schedine devono contenere una selezione Genoa-Fiorentina ciascuna");
assert.equal(normalizedLegs.length, 2, "Propagazione Schedina Genoa-Fiorentina incompleta");
assert.deepEqual(normalizedLegs.map(leg => leg.selectionId).sort(), sourceLegs.map(leg => leg.selectionId).sort());
assert([...sourceLegs, ...normalizedLegs].every(leg => leg.betSelection.operational.playability.status === "PLAYABLE"), "Selezione Genoa-Fiorentina non giocabile propagata");
assert(![...sourceLegs, ...normalizedLegs].some(isUnderPlayableSelection), "Under Genoa-Fiorentina presente in Schedina");

console.log("OK Genoa-Fiorentina MD6: distinta ufficiale, pronostico, 3 MyCombo e 2 selezioni Schedina validate");
