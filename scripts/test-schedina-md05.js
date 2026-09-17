"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "..");
const read = file => JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));
const data = read("data/normalized/schedina-md05.json");
const predictions = read("data/normalized/predictions.json").predictions.filter(item => item.matchId.endsWith("-md-05"));
const source = read("data/sources/mycombo-serie-a-2026-27-md-05.json");
const legs = data.slips.flatMap(slip => slip.legs);

assert.equal(data.matchday, 5);
assert.equal(data.slips.length, 8);
assert.equal(legs.length, 45);
assert.equal(Object.keys(source.matches).length, 10);
assert.equal(source.constraints.minLegOddsInclusive, 1.15);
assert(!data.slips.some(slip => ["exact-score", "exact-score-multi"].includes(slip.type)));
assert(!legs.some(leg => /^RISULTATO ESATTO/.test(leg.market)));
assert.equal(new Set(legs.map(leg => String(leg.providerSelectionId))).size, legs.length);
assert(legs.every(leg => leg.odds >= 1.10 && leg.selection !== "12" && leg.coherent));

for (const prediction of predictions) {
  const combo = prediction.combinations.find(item => item.tier === "Safe");
  assert(combo?.legs.length >= 2, `${prediction.matchId}: MyCombo della Schedina assente`);
  assert(combo.legs.every(leg => leg.odds >= 1.15), `${prediction.matchId}: quota MyCombo sotto 1,15`);
  assert.equal(new Set(combo.legs.map(leg => leg.overlapKey)).size, combo.legs.length, `${prediction.matchId}: mercato ripetuto`);
  const semanticKeys = combo.legs.flatMap(leg => leg.semanticKeys || []);
  assert.equal(new Set(semanticKeys).size, semanticKeys.length, `${prediction.matchId}: macro-scenario ripetuto`);
}

console.log(`Schedina MD05 valida: ${data.slips.length} proposte, ${legs.length} selezioni e ${predictions.length} MyCombo distinte.`);
