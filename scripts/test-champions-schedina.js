const fs = require("fs");
const path = require("path");
const assert = require("assert");
const root = path.resolve(__dirname, "..");
const data = JSON.parse(fs.readFileSync(path.join(root, "data/normalized/schedina-champions-md01.json"), "utf8"));

assert.equal(data.slips.length, 2);
assert.ok(data.exclusions.includes("risultati esatti"));
const legs = data.slips.flatMap(slip => {
  assert.equal(slip.legs.length, 4, `${slip.id}: non è un poker`);
  assert.equal(new Set(slip.legs.map(leg => leg.matchId)).size, 4, `${slip.id}: partita ripetuta`);
  return slip.legs;
});
assert.equal(new Set(legs.map(leg => leg.player)).size, 8, "giocatori ripetuti");
assert.equal(new Set(legs.map(leg => leg.matchId)).size, 8, "partite ripetute tra i due poker");
assert.ok(legs.every(leg => leg.marketCode === "28576" && leg.replacementIncluded && leg.odds > 1));
assert.ok(legs.every(leg => !/RISULTATO ESATTO/i.test(`${leg.marketName} ${leg.variantName}`)));
console.log("Schedina Champions: OK");
