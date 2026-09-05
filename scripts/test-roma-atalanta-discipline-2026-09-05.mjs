import assert from "node:assert/strict";
import fs from "node:fs";

const read = relative => JSON.parse(fs.readFileSync(new URL(`../${relative}`, import.meta.url), "utf8"));
const matchId = "roma-atalanta-2026-27-md-03";
const predictions = read("data/normalized/predictions.json");
const source = read("data/sources/mycombo-serie-a-2026-27-md-03.json");
const prediction = predictions.predictions.find(item => item.matchId === matchId);

assert.ok(prediction, "Pronostico Roma-Atalanta assente");
assert.equal(prediction.engineVersion, "4.11.0");
assert.deepEqual(prediction.likelyBooked.slice(0, 2).map(item => item.name), ["Hermoso", "Mancini"]);
for (const player of prediction.likelyBooked.filter(item => item.teamId === "roma" && ["Hermoso", "Mancini"].includes(item.name))) {
  assert.equal(player.dataStatus, "verified-history-current");
  assert.ok(player.evidence.some(item => item.includes("2026/27:")), `${player.name}: evidenza recente assente`);
}

const expectedSelections = {
  Safe: "5300522211",
  Balanced: "5296310099",
  Aggressive: "5300522123"
};
for (const portfolio of source.matches[matchId]) {
  assert.ok(portfolio.legs.some(leg => leg.providerSelectionId === expectedSelections[portfolio.tier]), `${portfolio.tier}: gamba disciplinare assente`);
}
for (const portfolio of prediction.combinations) {
  assert.ok(portfolio.legs.every(leg => leg.odds >= 1.1 && leg.odds <= 1.85), `${portfolio.tier}: quota singola fuori intervallo`);
  assert.ok(portfolio.legs.some(leg => leg.semanticKeys.some(key => key.startsWith("discipline-"))), `${portfolio.tier}: disciplina non propagata`);
}

console.log("Roma-Atalanta: falli recenti integrati nei possibili ammoniti e tre MyCombo disciplinari propagate.");
