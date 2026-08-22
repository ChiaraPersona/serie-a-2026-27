const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = path.resolve(__dirname, "..");
const data = JSON.parse(fs.readFileSync(path.join(root, "data/normalized/schedina.json"), "utf8"));
const predictions = JSON.parse(fs.readFileSync(path.join(root, "data/normalized/predictions.json"), "utf8"));
const poissonQuantile = (lambda, target) => {
  let term = Math.exp(-lambda), cumulative = term;
  if (cumulative >= target) return 0;
  for (let goals = 1; goals <= 8; goals += 1) {
    term *= lambda / goals;
    cumulative += term;
    if (cumulative >= target) return goals;
  }
  return 8;
};
assert.strictEqual(data.slips.length, 8, "La pagina deve contenere otto schedine");
assert.deepStrictEqual(data.slips.map(slip => slip.legs.length), [3, 3, 6, 8, 8, 10, 4, 6], "Numero selezioni dopo il filtro prudenziale inatteso");
assert.strictEqual(new Set(data.slips[2].legs.map(leg => leg.matchId)).size, 6, "Supernova deve conservare sei partite diverse dopo il filtro");
for (const slip of data.slips.slice(0, 3)) {
  assert(!slip.legs.some(leg => leg.marketFamily === "Marcatori"), `${slip.id}: le prime tre schedine non devono contenere marcatori`);
  assert(slip.legs.some(leg => leg.marketFamily === "Esito"), `${slip.id}: manca un esito coperto`);
}
assert.deepStrictEqual(data.slips.slice(0, 3).map(slip => slip.excludedLegsCount), [3, 3, 4], "Il filtro prudenziale non ha escluso le gambe attese");
assert(data.slips.slice(0, 3).every(slip => slip.legs.every(leg => leg.expectedValuePct >= -10)), "Una schedina mista contiene ancora una gamba sotto −10% EV");
assert(data.slips.slice(0, 2).every(slip => slip.qualityStatus === "qualificata" && slip.expectedValuePct >= 0), "Scintilla e Bagliore devono superare il filtro prudenziale");
for (const slip of data.slips) {
  assert(slip.combinedOdds > 1, `${slip.id}: quota totale non valida`);
  if (!["single-market-full-round", "exact-score", "exact-score-multi"].includes(slip.type)) assert(slip.marketFamilies.length >= 3, `${slip.id}: varietà mercati insufficiente`);
  assert(slip.jointModelProbabilityPct > 0, `${slip.id}: probabilità modello non valida`);
  assert(slip.fairOdds > 1, `${slip.id}: quota equa non valida`);
  assert(Number.isFinite(slip.expectedValuePct), `${slip.id}: EV stimato non valido`);
  assert(["qualificata", "editoriale", "laboratorio"].includes(slip.qualityStatus), `${slip.id}: classificazione prudenziale mancante`);
  assert(slip.weakestLeg?.label && Number.isFinite(slip.weakestLeg.expectedValuePct), `${slip.id}: gamba più fragile non identificata`);
  for (const leg of slip.legs) {
    assert.strictEqual(leg.coherent, true, `${slip.id}/${leg.matchId}: selezione incoerente con il pronostico`);
    assert(leg.odds >= 1.10, `${slip.id}/${leg.matchId}: quota inferiore a 1,10`);
    assert.notStrictEqual(leg.selection, "12", `${slip.id}/${leg.matchId}: esito 12 non ammesso`);
    assert(leg.modelProbabilityPct > 0, `${slip.id}/${leg.matchId}: probabilità della selezione non calcolata`);
    assert(leg.fairOdds > 1 && Number.isFinite(leg.expectedValuePct), `${slip.id}/${leg.matchId}: quota equa o EV individuale mancanti`);
  }
}
const multigoal = data.slips.find(item => item.id === "costellazione");
assert(multigoal, "Schedina Multigol casa/ospite mancante");
assert.strictEqual(new Set(multigoal.legs.map(leg => leg.matchId)).size, 10, "La Multigol deve coprire tutte le dieci partite");
assert.deepStrictEqual(multigoal.marketFamilies, ["Multigol casa/ospite"], "La Multigol deve usare il solo mercato casa/ospite");
assert(multigoal.legs.every(leg => leg.market === "MULTIGOAL CASA + MULTIGOAL OSPITE"), "Mercato inatteso nella Multigol");
assert(multigoal.jointModelProbabilityPct > 0 && multigoal.fairOdds > 1, "Metriche quantitative Multigol mancanti");
assert.strictEqual(multigoal.selectionPolicy.type, "poisson-narrow", "Policy Multigol prudenziale non dichiarata");
for (const leg of multigoal.legs) {
  const ranges = leg.selection.match(/^(\d+)-(\d+)\/(\d+)-(\d+)$/)?.slice(1).map(Number);
  const prediction = predictions.predictions.find(item => item.matchId === leg.matchId);
  const central = prediction.scoreForecast.primary.score.split("-").map(Number);
  assert(ranges && ranges[1] - ranges[0] <= 2 && ranges[3] - ranges[2] <= 2, `${leg.matchId}: intervallo Multigol troppo ampio`);
  assert(central[0] >= ranges[0] && central[0] <= ranges[1] && central[1] >= ranges[2] && central[1] <= ranges[3], `${leg.matchId}: risultato centrale fuori dall'intervallo`);
  assert(ranges[1] <= poissonQuantile(prediction.expectedGoals.home, 0.9) && ranges[3] <= poissonQuantile(prediction.expectedGoals.away, 0.9), `${leg.matchId}: coda estrema oltre il 90° percentile`);
  assert(leg.modelProbabilityPct >= 55, `${leg.matchId}: copertura Multigol inferiore al 55%`);
}
const frosinoneJuventus = multigoal.legs.find(leg => leg.matchId === "frosinone-juventus-2026-27-md-01");
assert.strictEqual(frosinoneJuventus.selection, "0-2/0-2", "Frosinone-Juventus: intervallo ancora troppo largo");
for (const id of ["prisma", "quasar"]) {
  const playerSlip = data.slips.find(item => item.id === id);
  assert.strictEqual(playerSlip.type, "player-only", `${id}: tipo schedina errato`);
  assert(playerSlip.legs.every(leg => leg.marketScope === "player"), `${id}: contiene una selezione non riferita a un giocatore`);
  assert(playerSlip.legs.every(leg => /MARCATORE|TIRI.*GIOCATORE|ASSIST/.test(leg.market)), `${id}: mercato giocatore non ammesso`);
  assert(playerSlip.marketFamilies.includes("Gol o assist giocatore"), `${id}: manca il mercato gol o assist`);
  assert(playerSlip.marketFamilies.includes("Assist giocatore"), `${id}: manca il mercato assist`);
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
const playerShotLegs = shotLegs.filter(leg => /GIOCATORE/.test(leg.market));
const teamShotLegs = data.slips.slice(0, 3).flatMap(slip => slip.legs).filter(leg => /TIRI/.test(leg.market) && !/GIOCATORE/.test(leg.market));
assert(playerShotLegs.length > 0 && playerShotLegs.every(leg => Boolean(leg.player)), "Ogni mercato tiri giocatore deve indicare il giocatore");
assert(teamShotLegs.some(leg => leg.marketFamily === "Tiri in porta"), "Mancano i tiri in porta non riferiti ai giocatori");
const firstThreeFamilies = new Set(data.slips.slice(0, 3).flatMap(slip => slip.marketFamilies));
for (const family of ["Vince o quasi", "Under/Over", "Corner", "Tiri in porta", "Cartellini"]) {
  assert(firstThreeFamilies.has(family), `Manca il nuovo mercato ${family} nelle prime tre schedine`);
}
for (const leg of allLegs.filter(item => item.marketFamily === "Marcatori")) {
  assert.match(leg.label, /marcatore · sostituto incluso$/i, `${leg.matchId}: etichetta marcatore incompleta`);
}
for (const leg of allLegs.filter(item => item.marketScope !== "player")) {
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
