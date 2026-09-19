"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "..");
const read = file => JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));
const data = read("data/normalized/schedina-md05.json");
const predictions = read("data/normalized/predictions.json").predictions.filter(item => item.matchId.endsWith("-md-05") && item.matchId !== "monza-sassuolo-2026-27-md-05");
const source = read("data/sources/mycombo-serie-a-2026-27-md-05.json");
const renderer = fs.readFileSync(path.join(root, "js/pages/betting.js"), "utf8");
const legs = data.slips.flatMap(slip => slip.legs);

assert.equal(data.matchday, 5);
assert.equal(data.slips.length, 8);
assert.equal(legs.length, 45);
assert.equal(Object.keys(source.matches).length, 10);
assert.equal(source.constraints.minLegOddsInclusive, 1.15);
assert.equal(source.constraints.displayedComboLegs, null);
assert.deepEqual(source.constraints.excludedMarketNames, ["ARBITRO CONSULTA MONITOR VAR INC TS", "RIGORE SI/NO"]);
assert.deepEqual(source.constraints.excludedMarketPatterns, ["HANDICAP", "AH", "ASIATICO"]);
assert(!Object.values(source.matches).flatMap(portfolios => portfolios).flatMap(portfolio => portfolio.legs || []).some(leg => /\bHANDICAP\b|\bAH\b|\bASIATIC[OA]\b/i.test(`${leg.overlapKey || ""} ${leg.label || ""} ${(leg.semanticKeys || []).join(" ")}`)), "Sono rimasti handicap nelle MyCombo MD05");
assert(!data.slips.some(slip => ["exact-score", "exact-score-multi"].includes(slip.type)));
assert(!legs.some(leg => /^RISULTATO ESATTO/.test(leg.market)));
assert.equal(new Set(legs.map(leg => String(leg.providerSelectionId))).size, legs.length);
assert(legs.every(leg => leg.odds >= 1.10 && leg.selection !== "12" && leg.coherent));
assert(!data.slips.some(slip => /scintilla|bagliore|supernova|prisma|quasar|costellazione/i.test(`${slip.id} ${slip.name}`)), "Sono rimasti nomi di costellazioni nella Schedina MD05");
assert.deepEqual(data.slips.map(slip => slip.name), [
  "Tre mercati prudenti",
  "Tre mercati a quota intermedia",
  "Cinque mercati · cinque partite",
  "Otto gol, assist e tiri · gruppo 1",
  "Otto gol, assist e tiri · gruppo 2",
  "Multigol casa/ospite · 10 partite",
  "Poker ammoniti 1",
  "Poker ammoniti 2"
]);
assert(renderer.includes("MyCombo compatibili · 5ª giornata"));
assert(renderer.indexOf("${myCombo}${roundContent") > renderer.indexOf("const myCombo="), "Le MyCombo devono precedere le schedine nella pagina MD05");

for (const prediction of predictions) {
  const combo = prediction.combinations.find(item => item.tier === "Safe");
  assert(combo?.legs.length >= 2 && combo.legs.length <= 4, `${prediction.matchId}: la MyCombo Safe deve contenere da 2 a 4 eventi`);
  assert(combo.legs.every(leg => leg.odds >= 1.15), `${prediction.matchId}: quota MyCombo sotto 1,15`);
  assert(!combo.legs.some(leg => /MONITOR VAR|RIGORE SI\/NO/i.test(leg.market)), `${prediction.matchId}: mercato VAR o rigore vietato`);
  assert(!combo.legs.some(leg => /\bHANDICAP\b|\bAH\b|\bASIATIC[OA]\b/i.test(`${leg.market || ""} ${leg.variant || ""} ${leg.overlapKey || ""} ${leg.label || ""} ${(leg.semanticKeys || []).join(" ")}`)), `${prediction.matchId}: handicap vietato`);
  assert.equal(new Set(combo.legs.map(leg => leg.overlapKey)).size, combo.legs.length, `${prediction.matchId}: mercato ripetuto`);
  const semanticKeys = combo.legs.flatMap(leg => leg.semanticKeys || []);
  assert.equal(new Set(semanticKeys).size, semanticKeys.length, `${prediction.matchId}: macro-scenario ripetuto`);
}

console.log(`Schedina MD05 valida: ${data.slips.length} proposte, ${legs.length} selezioni e ${predictions.length} MyCombo distinte.`);
