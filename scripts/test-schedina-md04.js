"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "..");
const read = file => JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));
const data = read("data/normalized/schedina-md04.json");
const matches = read("data/normalized/matches.json");
const openRound = matches.filter(match => match.competition === "serie-a" && match.matchday === 4 && match.status !== "finished");
const legs = data.slips.flatMap(slip => slip.legs);

assert.equal(data.matchday, 4);
assert.equal(data.slips.length, 8);
assert.deepEqual(data.slips.map(slip => slip.legs.length), [3, 3, 5, 8, 8, openRound.length, 4, 4]);
assert.equal(data.oddsRetrievedAt, "2026-09-12T12:26:23.806Z");
assert(!data.slips.some(slip => ["exact-score", "exact-score-multi"].includes(slip.type)));
assert(!legs.some(leg => /^RISULTATO ESATTO/.test(leg.market)));
assert.equal(new Set(legs.map(leg => String(leg.providerSelectionId))).size, legs.length);
assert(legs.every(leg => leg.odds >= 1.10 && leg.selection !== "12" && leg.coherent));
const cardSlips = data.slips.filter(slip => slip.type === "player-cards");
assert.equal(cardSlips.length, 2);
for (const slip of cardSlips) {
  assert.equal(slip.legs.length, 4);
  assert.equal(new Set(slip.legs.map(leg => leg.matchId)).size, 4);
  assert(slip.legs.every(leg => leg.marketFamily === "Ammoniti" && leg.marketScope === "player"));
}
assert(!legs.some(leg => leg.matchId === "venezia-fiorentina-2026-27-md-04"));
console.log(`Schedina MD04 valida: ${data.slips.length} proposte, ${legs.length} selezioni, due poker ammoniti.`);
