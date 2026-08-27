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
assert.strictEqual(data.slips.length, 2, "La seconda giornata deve contenere due schedine distinte");
assert.strictEqual(data.oddsRetrievedAt, odds.retrievedAt, "Schedine e quote devono usare lo stesso snapshot Sisal");

const allLegs = data.slips.flatMap(slip => slip.legs);
assert.strictEqual(new Set(allLegs.map(leg => String(leg.providerSelectionId))).size, allLegs.length, "Una selezione Sisal è ripetuta tra schedine");
assert.strictEqual(new Set(allLegs.map(leg => leg.matchId)).size, allLegs.length, "Una partita è ripetuta tra le due schedine");
for (const slip of data.slips) {
  assert.strictEqual(slip.type, "mixed-markets", `${slip.id}: deve essere una schedina completa, non una MyCombo per partita`);
  assert(slip.legs.length >= 4 && slip.legs.length <= 6, `${slip.id}: numero di selezioni non prudenziale`);
  assert.strictEqual(new Set(slip.legs.map(leg => leg.matchId)).size, slip.legs.length, `${slip.id}: una partita compare più volte`);
  assert(slip.marketFamilies.length >= 3, `${slip.id}: varietà mercati insufficiente`);
  assert(slip.marketFamilies.includes("Esito"), `${slip.id}: manca un esito coperto`);
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

assert(data.slips[0].combinedOdds >= 10 && data.slips[0].combinedOdds <= 20, "La prima schedina deve restare nella fascia quota 10–20");
assert(data.slips[1].combinedOdds >= 20 && data.slips[1].combinedOdds <= 35, "La seconda schedina deve restare nella fascia quota 20–35");

console.log(`Schedina MD2 valida: 2 schedine distinte, ${allLegs.length} selezioni uniche, snapshot ${data.oddsRetrievedAt}.`);
