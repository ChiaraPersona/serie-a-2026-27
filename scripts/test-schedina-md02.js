const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = path.resolve(__dirname, "..");
const read = relative => JSON.parse(fs.readFileSync(path.join(root, relative), "utf8"));
const data = read("data/normalized/schedina-md02.json");
const predictions = read("data/normalized/predictions.json").predictions;
const predictionById = new Map(predictions.map(prediction => [prediction.matchId, prediction]));

assert.strictEqual(data.matchday, 2, "La pagina deve riferirsi alla seconda giornata");
assert.strictEqual(data.slips.length, 6, "Devono essere pubblicate soltanto le sei MyCombo qualificate");
assert.deepStrictEqual(data.coverage, {fixtures:10,profilesEvaluated:30,qualifiedProfiles:6,unavailableProfiles:24}, "Copertura MD2 inattesa");

for (const slip of data.slips) {
  assert.strictEqual(slip.qualityStatus, "qualificata", `${slip.id}: profilo non qualificato pubblicato`);
  assert(slip.legs.length >= 2 && slip.legs.length <= 8, `${slip.id}: numero di gambe fuori dai soli limiti tecnici`);
  assert(slip.expectedValuePct >= 0, `${slip.id}: EV prudenziale negativo`);
  assert.strictEqual(slip.risk.status, "allowed", `${slip.id}: portafoglio non ammesso`);
  assert.strictEqual(slip.risk.contradictions, 0, `${slip.id}: contiene contraddizioni`);
  assert.strictEqual(new Set(slip.legs.map(leg => leg.providerSelectionId)).size, slip.legs.length, `${slip.id}: selezioni duplicate`);
  assert(slip.legs.every(leg => leg.odds >= 1.10), `${slip.id}: quota gamba sotto 1,10`);
  assert(!slip.legs.some(leg => leg.market === "DOPPIA CHANCE" && leg.selection === "12"), `${slip.id}: doppia chance 12 esclusa dalla policy`);

  const prediction = predictionById.get(slip.legs[0].matchId);
  assert(prediction, `${slip.id}: pronostico di origine assente`);
  const tier = slip.eyebrow.split("·").at(-1).trim();
  const combo = prediction.combinations.find(candidate => candidate.tier === tier && candidate.qualityStatus === "qualificata");
  assert(combo, `${slip.id}: MyCombo qualificata di origine assente`);
  assert.strictEqual(slip.combinedOdds, combo.odds, `${slip.id}: quota diversa dalla MyCombo`);
  assert.strictEqual(slip.jointModelProbabilityPct, combo.prudentProbabilityPct, `${slip.id}: probabilità prudenziale diversa dalla MyCombo`);
}

console.log("Schedina MD2: 6 MyCombo qualificate, gambe flessibili e 24 profili N/D verificati.");
