"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { isUnderPlayableSelection } = require("./betting-market-policy");

const root = path.resolve(__dirname, "..");
const read = relative => JSON.parse(fs.readFileSync(path.join(root, relative), "utf8"));
const matchId = "genoa-fiorentina-2026-27-md-06";
const official = read("data/sources/official-lineups-2026-27.json").fixtures.find(fixture => fixture.matchId === matchId);
const prediction = read("data/normalized/predictions.json").predictions.find(row => row.matchId === matchId);
const sourceLegs = read("data/sources/schedina-serie-a-2026-27-md-06.json").slips.flatMap(slip => slip.picks).filter(leg => leg.matchId === matchId);
const normalized = read("data/normalized/schedina-md06.json");
const normalizedLegs = normalized.slips.flatMap(slip => slip.legs).filter(leg => leg.matchId === matchId);
const catalogMatch = normalized.marketCatalog.matches.find(match => match.matchId === matchId);
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

assert(catalogMatch, "Catalogo Pronostici selezionati Genoa-Fiorentina assente");
const selected = catalogMatch.selections
  .filter(leg => leg.suggestionAnalysis?.suggested)
  .sort((left, right) => left.suggestionAnalysis.rank - right.suggestionAnalysis.rank);
const selectedNonPlayerIds = selected
  .filter(leg => leg.catalogOrigin !== "prediction-v2-player-forecast")
  .map(leg => leg.selectionId);
assert.deepEqual(selectedNonPlayerIds, [
  "bet:sisal:genoa-fiorentina-2026-27-md-06:5367456140",
  "bet:sisal:genoa-fiorentina-2026-27-md-06:5337222708",
  "bet:sisal:genoa-fiorentina-2026-27-md-06:5337164992",
  "bet:sisal:genoa-fiorentina-2026-27-md-06:5369497842",
  "bet:sisal:genoa-fiorentina-2026-27-md-06:5369524035",
  "bet:sisal:genoa-fiorentina-2026-27-md-06:5337194687",
  "bet:sisal:genoa-fiorentina-2026-27-md-06:5337194592",
  "bet:sisal:genoa-fiorentina-2026-27-md-06:5337194619",
], "I pronostici selezionati non legati ai giocatori non sono stati preservati");
const selectedPlayerIds = selected
  .filter(leg => leg.catalogOrigin === "prediction-v2-player-forecast")
  .map(leg => leg.selectionId);
assert.deepEqual(selectedPlayerIds, [
  "forecast:v2:genoa-fiorentina-2026-27-md-06:nicolo-fagioli:shots:1",
  "forecast:v2:genoa-fiorentina-2026-27-md-06:leo-stigard:shots:1",
  "forecast:v2:genoa-fiorentina-2026-27-md-06:franco-mastantuono:shots:3",
  "forecast:v2:genoa-fiorentina-2026-27-md-06:milutin-osmajic:shots:2",
  "forecast:v2:genoa-fiorentina-2026-27-md-06:johan-vasquez:shots:1",
  "forecast:v2:genoa-fiorentina-2026-27-md-06:junior-messias:shots:3",
  "forecast:v2:genoa-fiorentina-2026-27-md-06:leo-stigard:sot:1",
  "forecast:v2:genoa-fiorentina-2026-27-md-06:franco-mastantuono:sot:2",
  "forecast:v2:genoa-fiorentina-2026-27-md-06:milutin-osmajic:sot:2",
], "I pronostici tiri/SOT non riflettono i titolari ufficiali");
assert.equal(selected.length, 17, "Numero inatteso di Pronostici selezionati per Genoa-Fiorentina");
assert.deepEqual(selected.map(leg => leg.suggestionAnalysis.rank), selected.map((_, index) => index + 1), "Ranking dei Pronostici selezionati non contiguo");
assert(!selected.some(leg => /mateo-pellegrino|vitinha|tommaso-baldanzi/.test(leg.selectionId)), "Un non titolare è rimasto nei pronostici tiri/SOT");

assert.equal(sourceLegs.length, 2, "Le due Schedine devono contenere una selezione Genoa-Fiorentina ciascuna");
assert.equal(normalizedLegs.length, 2, "Propagazione Schedina Genoa-Fiorentina incompleta");
assert.deepEqual(normalizedLegs.map(leg => leg.selectionId).sort(), sourceLegs.map(leg => leg.selectionId).sort());
assert([...sourceLegs, ...normalizedLegs].every(leg => leg.betSelection.operational.playability.status === "PLAYABLE"), "Selezione Genoa-Fiorentina non giocabile propagata");
assert(![...sourceLegs, ...normalizedLegs].some(isUnderPlayableSelection), "Under Genoa-Fiorentina presente in Schedina");

console.log("OK Genoa-Fiorentina MD6: distinta ufficiale, 17 Pronostici selezionati e 2 selezioni Schedina validate");
