const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = path.resolve(__dirname, "..");
const data = JSON.parse(fs.readFileSync(path.join(root, "data/normalized/schedina.json"), "utf8"));
assert.strictEqual(data.slips.length, 5, "La pagina deve contenere cinque schedine");
assert.deepStrictEqual(data.slips.map(slip => slip.legs.length), [6, 6, 10, 8, 8], "Numero selezioni inatteso");
assert.strictEqual(new Set(data.slips[2].legs.map(leg => leg.matchId)).size, 10, "Supernova deve coprire tutte le dieci partite");
for (const slip of data.slips) {
  assert(slip.combinedOdds > 1, `${slip.id}: quota totale non valida`);
  assert(slip.marketFamilies.length >= 3, `${slip.id}: varietà mercati insufficiente`);
  if (slip.jointModelProbabilityPct !== null) assert(slip.jointModelProbabilityPct > 0, `${slip.id}: probabilità modello non valida`);
  for (const leg of slip.legs) {
    assert.strictEqual(leg.coherent, true, `${slip.id}/${leg.matchId}: selezione incoerente con il pronostico`);
    assert(leg.odds > 1, `${slip.id}/${leg.matchId}: quota non valida`);
  }
}
const selectionIds = data.slips.flatMap(slip => slip.legs.map(leg => leg.providerSelectionId));
assert.strictEqual(new Set(selectionIds).size, selectionIds.length, "Una selezione Sisal è ripetuta tra schedine diverse");
const allLegs = data.slips.flatMap(slip => slip.legs);
assert(allLegs.some(leg => leg.marketFamily === "Marcatori"), "Mancano i mercati marcatori richiesti");
assert(!allLegs.some(leg => /GOAL\/NOGOAL|SEGNA GOAL/.test(leg.market)), "Goal/No Goal o gol squadra non devono sostituire i marcatori");
const shotLegs = allLegs.filter(leg => /TIRI/.test(leg.market));
assert(shotLegs.length > 0, "Mancano i mercati tiri giocatore");
assert(shotLegs.every(leg => /GIOCATORE/.test(leg.market)), "Tiri e tiri in porta devono riferirsi a un giocatore, non a squadra o partita");
assert(shotLegs.every(leg => Boolean(leg.player)), "Ogni mercato tiri deve indicare il giocatore");
for (const leg of allLegs.filter(item => item.marketFamily === "Marcatori")) {
  assert.match(leg.label, /marcatore · sostituto incluso$/i, `${leg.matchId}: etichetta marcatore incompleta`);
}
for (const leg of allLegs.filter(item => item.marketFamily !== "Marcatori" && !/Tiri.*giocatore/.test(item.marketFamily))) {
  assert(!/sostituto incluso/i.test(leg.label), `${leg.matchId}: sostituto incluso usato fuori dai marcatori`);
}
for (const id of ["prisma", "quasar"]) {
  const slip = data.slips.find(item => item.id === id);
  assert.deepStrictEqual(new Set(slip.legs.map(leg => leg.matchId)).size, 8, `${id}: le otto gambe devono appartenere a partite diverse`);
  assert(slip.marketFamilies.length >= 3, `${id}: servono almeno tre famiglie di mercato`);
  assert.strictEqual(slip.jointModelProbabilityPct, null, `${id}: la probabilità congiunta deve restare N/D`);
}
const shell = fs.readFileSync(path.join(root, "schedina.html"), "utf8");
assert.match(shell, /data-page="betting"/, "Shell Schedina non generata");
assert.match(shell, /fantacalcio\.html[^]*schedina\.html/, "Schedina non è accanto a Fantacalcio nella navigazione");
console.log(`Schedina valida: ${data.slips.map(slip => `${slip.name} ${slip.combinedOdds.toFixed(2)}`).join(" · ")}`);
