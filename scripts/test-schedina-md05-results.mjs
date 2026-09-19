import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { settleLeg } from "../js/pages/betting-settlement.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = file => JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));
const matches = read("data/normalized/matches.json");
const schedina = read("data/normalized/schedina-md05.json");
const matchById = new Map(matches.map(match => [match.id, match]));
const legs = schedina.slips.flatMap(slip => slip.legs);

const expectedResults = new Map([
  ["monza-sassuolo-2026-27-md-05", [2, 1]],
  ["bologna-torino-2026-27-md-05", [1, 1]],
  ["udinese-cagliari-2026-27-md-05", [0, 1]],
  ["roma-inter-2026-27-md-05", [2, 2]]
]);

for (const [matchId, [home, away]] of expectedResults) {
  const match = matchById.get(matchId);
  assert.equal(match?.status, "finished", `${matchId}: stato non finale`);
  assert.deepEqual(match.score, { home, away }, `${matchId}: risultato errato`);
}

const findLeg = label => legs.find(leg => leg.label === label);
const settlement = label => settleLeg(findLeg(label), matchById.get(findLeg(label).matchId));

assert.equal(settlement("Sassuolo vincente").status, "lost");
assert.equal(settlement("Sassuolo meno di 6,5 corner").status, "won");
assert.equal(settlement("Sassuolo meno di 5,5 corner").status, "won");
assert.equal(settlement("Armand Laurienté assist · sostituto incluso").status, "lost");
assert.equal(settlement("Sebastiano Esposito gol o assist · sostituto incluso").status, "won");
assert.equal(settlement("Casa 0–2 gol · Ospite 1–3 gol").status, "won");
assert.equal(settlement("Rafik Belghali riceve un cartellino · sostituto incluso").status, "won");
assert.equal(settlement("Arthur Theate riceve un cartellino · sostituto incluso").status, "lost");
assert.equal(settlement("Zé Pedro riceve un cartellino · sostituto incluso").status, "lost");
assert.equal(settlement("Christian Kabasele riceve un cartellino · sostituto incluso").status, "lost");
assert.equal(settlement("Nikola Vlasic almeno 1 tiri · sostituto incluso").status, "unavailable");
assert.equal(settlement("Keinan Davis almeno 1 tiri in porta · sostituto incluso").status, "unavailable");

console.log("Risultati MD05 verificati per Monza-Sassuolo, Bologna-Torino, Udinese-Cagliari e Roma-Inter; liquidazione Schedina coperta sui mercati disponibili.");
