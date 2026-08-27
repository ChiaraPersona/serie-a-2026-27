"use strict";

const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = path.resolve(__dirname, "..");
const read = relative => JSON.parse(fs.readFileSync(path.join(root, relative), "utf8"));
const data = read("data/normalized/schedina-md02.json");
const odds = read("data/normalized/odds/sisal/serie-a.json");
const predictions = read("data/normalized/predictions.json").predictions;
const predictionById = new Map(predictions.map(item => [item.matchId, item]));

assert.strictEqual(data.matchday, 2, "La pagina deve riferirsi alla seconda giornata");
assert.strictEqual(data.slips.length, 8, "La seconda giornata deve replicare le otto tipologie della prima");
assert.deepStrictEqual(data.slips.map(slip => slip.legs.length), [3, 3, 5, 8, 8, 10, 4, 6], "La scomposizione MD2 deve coincidere con la MD1");
assert.strictEqual(data.oddsRetrievedAt, odds.retrievedAt, "Schedine e quote devono usare lo stesso snapshot Sisal");

const allLegs = data.slips.flatMap(slip => slip.legs);
assert.strictEqual(new Set(allLegs.map(leg => String(leg.providerSelectionId))).size, allLegs.length, "Una selezione Sisal è ripetuta tra schedine");
for (const slip of data.slips) {
  assert(slip.combinedOdds > 1 && slip.jointModelProbabilityPct > 0 && slip.fairOdds > 1, `${slip.id}: metriche quantitative incomplete`);
  assert(Number.isFinite(slip.expectedValuePct), `${slip.id}: EV mancante`);
  assert(["qualificata", "editoriale", "laboratorio"].includes(slip.qualityStatus), `${slip.id}: qualità non dichiarata`);
  assert(slip.weakestLeg?.label && Number.isFinite(slip.weakestLeg.expectedValuePct), `${slip.id}: gamba fragile non identificata`);
  for (const leg of slip.legs) {
    assert.strictEqual(leg.coherent, true, `${slip.id}/${leg.matchId}: selezione incoerente`);
    assert(leg.odds >= 1.10, `${slip.id}/${leg.matchId}: quota sotto 1,10`);
    assert.notStrictEqual(leg.selection, "12", `${slip.id}/${leg.matchId}: selezione 12 vietata`);
    assert(predictionById.has(leg.matchId), `${slip.id}/${leg.matchId}: pronostico assente`);
  }
}

for (const slip of data.slips.slice(0, 3)) {
  assert.strictEqual(slip.type, "mixed-markets", `${slip.id}: deve essere una schedina mista`);
  assert(slip.marketFamilies.length >= 3, `${slip.id}: varietà mercati insufficiente`);
  assert(slip.legs.every(leg => leg.expectedValuePct >= -10), `${slip.id}: gamba sotto il filtro prudenziale`);
  assert(slip.marketFamilies.includes("Esito"), `${slip.id}: manca un esito coperto`);
}
assert(data.slips[0].combinedOdds >= 4 && data.slips[0].combinedOdds <= 6, "Scintilla II non rispetta la fascia quota MD1");
assert(data.slips[1].combinedOdds >= 6 && data.slips[1].combinedOdds <= 10, "Bagliore II non rispetta la fascia quota MD1");
assert(data.slips[2].combinedOdds >= 5 && data.slips[2].combinedOdds <= 10, "Supernova II non rispetta la fascia quota MD1");
assert.strictEqual(data.slips[2].marketFamilies.length, 5, "Supernova II deve conservare cinque famiglie di mercato come la MD1");

for (const slip of data.slips.slice(3, 5)) {
  assert.strictEqual(slip.type, "player-only", `${slip.id}: tipo giocatore errato`);
  assert.strictEqual(slip.legs.length, 8, `${slip.id}: servono otto selezioni`);
  assert.strictEqual(new Set(slip.legs.map(leg => leg.matchId)).size, 8, `${slip.id}: le selezioni devono appartenere a otto gare diverse`);
  assert(slip.legs.every(leg => leg.marketScope === "player" && leg.player), `${slip.id}: mercato non riferito a un giocatore`);
  for (const family of ["Assist giocatore", "Gol o assist giocatore", "Marcatori"]) assert(slip.marketFamilies.includes(family), `${slip.id}: manca ${family}`);
}

const multigoal = data.slips.find(slip => slip.type === "single-market-full-round");
assert(multigoal && multigoal.legs.length === 10 && new Set(multigoal.legs.map(leg => leg.matchId)).size === 10, "Costellazione II deve coprire tutte le partite");
assert(multigoal.legs.every(leg => leg.market === "MULTIGOAL CASA + MULTIGOAL OSPITE" && leg.modelProbabilityPct >= 55), "Policy Multigol prudenziale non rispettata");

const exact = data.slips.find(slip => slip.type === "exact-score");
assert(exact && exact.legs.length === 4 && exact.legs.every(leg => leg.selection === leg.predictedScore), "Quadrante II non coincide con gli scenari centrali");
const multi = data.slips.find(slip => slip.type === "exact-score-multi");
assert(multi && multi.legs.length === 6 && multi.legs.every(leg => leg.selection.split("/").map(item => item.trim()).includes(leg.predictedScore)), "Ventaglio II non include sempre lo scenario centrale");

console.log(`Schedina MD2 valida: stessa matrice MD1, 8 proposte e ${allLegs.length} selezioni uniche, snapshot ${data.oddsRetrievedAt}.`);
