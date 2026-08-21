const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = path.resolve(__dirname, "..");
const data = JSON.parse(fs.readFileSync(path.join(root, "data/normalized/schedina.json"), "utf8"));
assert.strictEqual(data.slips.length, 8, "La pagina deve contenere otto schedine");
assert.deepStrictEqual(data.slips.map(slip => slip.legs.length), [6, 6, 10, 8, 8, 10, 4, 6], "Numero selezioni inatteso");
assert.strictEqual(new Set(data.slips[2].legs.map(leg => leg.matchId)).size, 10, "Supernova deve coprire tutte le dieci partite");
for (const slip of data.slips.slice(0, 3)) {
  assert(!slip.legs.some(leg => leg.marketFamily === "Marcatori"), `${slip.id}: le prime tre schedine non devono contenere marcatori`);
  assert(slip.legs.some(leg => leg.marketFamily === "Esito"), `${slip.id}: manca un esito coperto`);
}
assert(data.slips[0].jointModelProbabilityPct > 20, "Scintilla non mantiene il profilo prudente");
assert(data.slips[1].jointModelProbabilityPct > 5, "Bagliore non mantiene il profilo prudente");
assert(data.slips[2].jointModelProbabilityPct > 0.9, "Supernova non mantiene il profilo prudente sulle dieci gare");
for (const slip of data.slips) {
  assert(slip.combinedOdds > 1, `${slip.id}: quota totale non valida`);
  if (!["single-market-full-round", "exact-score", "exact-score-multi"].includes(slip.type)) assert(slip.marketFamilies.length >= 3, `${slip.id}: varietà mercati insufficiente`);
  assert(slip.jointModelProbabilityPct > 0, `${slip.id}: probabilità modello non valida`);
  assert(slip.fairOdds > 1, `${slip.id}: quota equa non valida`);
  assert(Number.isFinite(slip.expectedValuePct), `${slip.id}: EV stimato non valido`);
  for (const leg of slip.legs) {
    assert.strictEqual(leg.coherent, true, `${slip.id}/${leg.matchId}: selezione incoerente con il pronostico`);
    assert(leg.odds > 1, `${slip.id}/${leg.matchId}: quota non valida`);
    assert(leg.modelProbabilityPct > 0, `${slip.id}/${leg.matchId}: probabilità della selezione non calcolata`);
  }
}
const multigoal = data.slips.find(item => item.id === "costellazione");
assert(multigoal, "Schedina Multigol casa/ospite mancante");
assert.strictEqual(new Set(multigoal.legs.map(leg => leg.matchId)).size, 10, "La Multigol deve coprire tutte le dieci partite");
assert.deepStrictEqual(multigoal.marketFamilies, ["Multigol casa/ospite"], "La Multigol deve usare il solo mercato casa/ospite");
assert(multigoal.legs.every(leg => leg.market === "MULTIGOAL CASA + MULTIGOAL OSPITE"), "Mercato inatteso nella Multigol");
assert(multigoal.jointModelProbabilityPct > 0 && multigoal.fairOdds > 1, "Metriche quantitative Multigol mancanti");
for (const id of ["prisma", "quasar"]) {
  const playerSlip = data.slips.find(item => item.id === id);
  assert.strictEqual(playerSlip.type, "player-only", `${id}: tipo schedina errato`);
  assert(playerSlip.legs.every(leg => leg.marketScope === "player"), `${id}: contiene una selezione non riferita a un giocatore`);
  assert(playerSlip.legs.every(leg => /MARCATORE|TIRI.*GIOCATORE/.test(leg.market)), `${id}: mercato giocatore non ammesso`);
}
const exactScore = data.slips.find(item => item.id === "quadrante");
assert.strictEqual(exactScore.legs.length, 4, "Quadrante deve contenere quattro risultati esatti");
assert(exactScore.legs.every(leg => leg.selection === leg.predictedScore), "Un risultato esatto non coincide con lo scenario centrale");
const exactMulti = data.slips.find(item => item.id === "ventaglio");
assert.strictEqual(exactMulti.legs.length, 6, "Ventaglio deve contenere sei multiesiti");
assert(exactMulti.legs.every(leg => leg.selection.split("/").map(item => item.trim()).includes(leg.predictedScore)), "Un multiesito non contiene il risultato previsto");
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
  assert(slip.jointModelProbabilityPct > 0, `${id}: probabilità congiunta non ricalcolata`);
  assert(slip.fairOdds > 1, `${id}: quota equa non ricalcolata`);
  assert(Number.isFinite(slip.expectedValuePct), `${id}: EV non ricalcolato`);
}
const shell = fs.readFileSync(path.join(root, "schedina.html"), "utf8");
assert.match(shell, /data-page="betting"/, "Shell Schedina non generata");
assert.match(shell, /fantacalcio\.html[^]*schedina\.html/, "Schedina non è accanto a Fantacalcio nella navigazione");
console.log(`Schedina valida: ${data.slips.map(slip => `${slip.name} ${slip.combinedOdds.toFixed(2)}`).join(" · ")}`);
