"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = relative => JSON.parse(fs.readFileSync(path.join(root, relative), "utf8"));

const schedina = read("data/normalized/schedina-md06.json");
const officialLineups = read("data/sources/official-lineups-2026-27.json");
const officialStartersByMatch = new Map((officialLineups.fixtures || [])
  .filter(fixture => Number(fixture.matchday) === 6)
  .map(fixture => [
    fixture.matchId,
    new Set((fixture.teams || []).flatMap(team => (team.players || []).map(player => player.playerId).filter(Boolean))),
  ]));

const selectedPlayerForecasts = schedina.marketCatalog.matches
  .flatMap(match => match.selections || [])
  .filter(leg => leg.catalogOrigin === "prediction-v2-player-forecast" && leg.suggestionAnalysis?.suggested);
const refreshedMatchIds = new Set([
  "lazio-monza-2026-27-md-06",
  "lecce-bologna-2026-27-md-06",
  "sassuolo-milan-2026-27-md-06",
]);

for (const leg of selectedPlayerForecasts) {
  const officialStarters = officialStartersByMatch.get(leg.matchId);
  if (!officialStarters) continue;
  assert(officialStarters.has(leg.playerId), `${leg.selectionId}: giocatore non presente nell'undici ufficiale`);
  if (refreshedMatchIds.has(leg.matchId)) {
    assert.equal(leg.lineupEligibility?.status, "official-starter", `${leg.selectionId}: titolarita ufficiale non applicata`);
  }
}

const targetMatchId = "lecce-bologna-2026-27-md-06";
const targetSelections = selectedPlayerForecasts.filter(leg => leg.matchId === targetMatchId);
assert(!targetSelections.some(leg => leg.playerId === "federico-bernardeschi"), "Bernardeschi non titolare ancora presente nei Pronostici selezionati");
assert(!targetSelections.some(leg => leg.playerId === "joel-monteiro"), "Monteiro non titolare ancora presente nei Pronostici selezionati");
assert(targetSelections.some(leg => leg.selectionId === "forecast:v2:lecce-bologna-2026-27-md-06:nicolo-cambiaghi:shots:2"), "Sostituzione modellistica Cambiaghi 2+ tiri assente");

const sassuoloMilanSelections = selectedPlayerForecasts.filter(leg => leg.matchId === "sassuolo-milan-2026-27-md-06");
assert(sassuoloMilanSelections.length > 0, "Pronostici giocatore Sassuolo-Milan assenti");
assert(!sassuoloMilanSelections.some(leg => leg.playerId === "kristian-thorstvedt"), "Thorstvedt in panchina ancora presente nei Pronostici selezionati");
for (const leg of sassuoloMilanSelections) {
  assert.equal(leg.lineupEligibility?.source, "Diretta.it", `${leg.selectionId}: fonte specifica della formazione ufficiale non propagata`);
  assert.equal(leg.lineupEligibility?.sourceUpdatedAt, "2026-10-11T17:16:47+02:00", `${leg.selectionId}: timestamp specifico della formazione ufficiale non propagato`);
}

console.log(`OK Schedina MD06: ${selectedPlayerForecasts.length} pronostici giocatore verificati contro le formazioni ufficiali disponibili; Sassuolo-Milan usa fonte e timestamp della fixture.`);
