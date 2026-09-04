"use strict";

const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = path.resolve(__dirname, "..");
const read = relative => JSON.parse(fs.readFileSync(path.join(root, relative), "utf8"));
const data = read("data/normalized/schedina-md03.json");
const odds = read("data/normalized/odds/sisal/serie-a.json");
const predictions = read("data/normalized/predictions.json").predictions;
const predictionById = new Map(predictions.map(item => [item.matchId, item]));
const eventById = new Map(odds.events.map(item => [item.canonicalMatchId, item]));

assert.strictEqual(data.matchday, 3, "La pagina deve riferirsi alla terza giornata");
assert.strictEqual(data.slips.length, 8, "La terza giornata deve conservare le otto tipologie");
assert.deepStrictEqual(data.slips.map(slip => slip.legs.length), [3, 3, 5, 8, 8, 10, 4, 6], "Matrice MD3 inattesa");
assert.strictEqual(data.oddsRetrievedAt, odds.retrievedAt, "Schedine e quote devono usare lo stesso dataset Sisal");
assert.strictEqual(odds.events.length, 10, "Lo snapshot Sisal deve coprire tutte le partite");

const unavailable = data.slips.filter(slip => slip.qualityStatus === "nd");
assert.strictEqual(unavailable.length, 0, "Lo snapshot Sisal aggiornato copre anche le due schedine giocatore");
const playerOnly = data.slips.filter(slip => slip.type === "player-only");
assert.deepStrictEqual(playerOnly.map(slip => slip.legs.length), [8, 8], "Le due schedine giocatore devono avere otto selezioni");
assert(playerOnly.every(slip => slip.marketFamilies.length >= 3), "Le schedine giocatore devono mantenere varietà di mercato");

const allLegs = data.slips.flatMap(slip => slip.legs);
assert.strictEqual(new Set(allLegs.map(leg => String(leg.providerSelectionId))).size, allLegs.length, "Una selezione Sisal è ripetuta tra schedine");
for (const leg of allLegs) {
  assert.strictEqual(leg.coherent, true, `${leg.matchId}: selezione incoerente`);
  assert(leg.odds >= 1.10, `${leg.matchId}: quota sotto 1,10`);
  assert.notStrictEqual(leg.selection, "12", `${leg.matchId}: selezione 12 vietata`);
  assert(predictionById.has(leg.matchId), `${leg.matchId}: pronostico assente`);
  assert.strictEqual(String(predictionById.get(leg.matchId).market.retrievedAt), String(eventById.get(leg.matchId).retrievedAt), `${leg.matchId}: snapshot evento incoerente`);
}

for (const slip of data.slips.slice(0, 3)) {
  assert.strictEqual(slip.type, "mixed-markets", `${slip.id}: deve essere una schedina mista`);
  assert(slip.marketFamilies.length >= 3, `${slip.id}: varietà mercati insufficiente`);
  assert(slip.legs.every(leg => leg.expectedValuePct >= -10), `${slip.id}: gamba sotto il filtro prudenziale`);
}
assert(data.slips[0].combinedOdds >= 4 && data.slips[0].combinedOdds <= 6, "Scintilla III fuori fascia");
assert(data.slips[1].combinedOdds >= 6 && data.slips[1].combinedOdds <= 10, "Bagliore III fuori fascia");
assert(data.slips[2].combinedOdds >= 5 && data.slips[2].combinedOdds <= 10, "Supernova III fuori fascia");
assert.strictEqual(data.slips[2].marketFamilies.length, 5, "Supernova III deve avere cinque famiglie");

const multigoal = data.slips.find(slip => slip.type === "single-market-full-round");
assert(multigoal && multigoal.legs.length === 10 && new Set(multigoal.legs.map(leg => leg.matchId)).size === 10, "Costellazione III deve coprire tutte le partite");
assert(multigoal.legs.every(leg => leg.modelProbabilityPct >= 55), "Policy Multigol prudenziale non rispettata");
const exact = data.slips.find(slip => slip.type === "exact-score");
assert(exact && exact.legs.length === 4 && exact.legs.every(leg => leg.selection === leg.predictedScore), "Quadrante III incoerente");
const multi = data.slips.find(slip => slip.type === "exact-score-multi");
assert(multi && multi.legs.length === 6 && multi.legs.every(leg => leg.selection.split("/").map(item => item.trim()).includes(leg.predictedScore)), "Ventaglio III incoerente");

console.log(`Schedina MD03 valida: 8 proposte, ${allLegs.length} selezioni uniche e 2 profili giocatore coperti.`);
