"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { isUnderPlayableSelection, isIndividualPlayerFoulMarket, isCornerPeriodMarket, isPlayableSelection } = require("./betting-market-policy");

const root = path.resolve(__dirname, "..");
const read = relative => JSON.parse(fs.readFileSync(path.join(root, relative), "utf8"));
const normalized = read("data/normalized/schedina-md06.json");
const source = read("data/sources/schedina-serie-a-2026-27-md-06.json");
const myCombo = read("data/sources/mycombo-serie-a-2026-27-md-06.json");
const odds = read("data/normalized/odds/sisal/serie-a.json");
const predictions = read("data/normalized/predictions.json").predictions.filter(row => row.matchId.endsWith("-md-06"));
const review = read("output/reports/serie-a-md05-betting-decision-review-2026-10-09.json");
const selection = read("output/reports/serie-a-md06-betting-selection-2026-10-09.json");
const selectionMarkdown = fs.readFileSync(path.join(root, "output/reports/serie-a-md06-betting-selection-2026-10-09.md"), "utf8");
const page = fs.readFileSync(path.join(root, "js/pages/betting.js"), "utf8");

assert.equal(normalized.matchday, 6);
assert(normalized.slips.length > 0, "MD6 deve poter produrre un numero variabile ma non vuoto di schedine quando esistono profili espliciti");
assert.equal(source.slips.length, normalized.slips.length);
assert.equal(normalized.slips.reduce((sum, slip) => sum + slip.legs.length, 0), source.slips.reduce((sum, slip) => sum + slip.picks.length, 0));
assert.equal(normalized.coverage.qualifiedProfiles, 0, "MD6 non deve qualificare automaticamente le schedine");
assert(normalized.slips.every(slip => ["EV_CALCOLABILE", "EV_NON_CALCOLABILE"].includes(slip.validationStatus)));
assert.deepEqual(review.totals, { won: 26, lost: 17, void: 2, unavailable: 0, pending: 0 });
assert.equal(review.slips.length, 8);
assert.equal(selection.summary.matchesAnalyzed, 10);
assert.equal(selection.summary.actionableCandidates, 26);
assert.equal(selection.rules.duoEvCertified, 0);
assert.equal(selection.rules.underMarketsPlayable, false);
assert.equal(selection.rules.individualPlayerFoulsPlayable, false);
assert.equal(selection.rules.cornerPeriodMarketsPlayable, false);
assert.equal(selection.rules.overMarketsRemainEligible, true);
assert.equal(selection.myCombo.matches, 10);
assert(!selectionMarkdown.includes("Probabilità congiunta: 0.0%"), "N/D non deve essere serializzato come probabilità zero");
assert(!selectionMarkdown.includes("| 0.0% | N/D | N/D | INCOMPATIBILE_DUO"), "P modello DUO mancante non deve diventare zero");

const oddsSelections = new Set(odds.events.flatMap(event => event.markets.flatMap(market => market.selections.map(selection => selection.providerSelectionId))));
for (const slip of normalized.slips) {
  assert(slip.legs.length >= 2 && slip.legs.length <= 4, `${slip.id}: lunghezza impropria`);
  assert.equal(new Set(slip.legs.map(leg => leg.matchId)).size, slip.legs.length, `${slip.id}: partita duplicata`);
  assert(slip.legs.every(leg => oddsSelections.has(leg.providerSelectionId)), `${slip.id}: quota non presente nello snapshot`);
  assert(slip.legs.every(leg => leg.marketUpdatedAt), `${slip.id}: timestamp quota mancante`);
  assert(!slip.legs.some(leg => /CARTELLIN/i.test(leg.market)), `${slip.id}: cartellini non autorizzati`);
  assert(!slip.legs.some(isUnderPlayableSelection), `${slip.id}: selezione Under ancora giocabile`);
  assert(!slip.legs.some(isIndividualPlayerFoulMarket), `${slip.id}: falli individuali ancora giocabili`);
  assert(!slip.legs.some(isCornerPeriodMarket), `${slip.id}: corner per tempo ancora giocabile`);
}

const duo = normalized.slips.find(slip => slip.validationStatus === "EV_NON_CALCOLABILE");
assert(duo.legs.every(leg => leg.compatibility === "INCOMPATIBILE_DUO" && leg.expectedValuePct == null));
assert.equal(duo.jointModelProbabilityPct, null);
assert.equal(duo.expectedValuePct, null);
assert(duo.legs.every(leg => Number.isFinite(leg.individualV2ProbabilityPct)), "P V2 individuale deve restare visibile");

const compatible = normalized.slips.find(slip => slip.validationStatus === "EV_CALCOLABILE");
assert(compatible.legs.every(leg => leg.compatibility === "COMPATIBILE"));
assert(Number.isFinite(compatible.jointModelProbabilityPct));
assert(Number.isFinite(compatible.expectedValuePct));

assert.equal(Object.keys(myCombo.matches).length, 10);
for (const [matchId, portfolios] of Object.entries(myCombo.matches)) {
  assert.equal(portfolios.length, 3, `${matchId}: servono tre profili MyCombo`);
  const safe = portfolios.find(portfolio => portfolio.tier === "Safe");
  assert(safe && safe.legs.length >= 3 && safe.legs.length <= 6, `${matchId}: Safe non deve forzare dieci esiti`);
  assert(!portfolios.flatMap(portfolio => portfolio.legs || []).some(isUnderPlayableSelection), `${matchId}: Under ancora presente nella MyCombo MD6`);
  assert(!portfolios.flatMap(portfolio => portfolio.legs || []).some(isIndividualPlayerFoulMarket), `${matchId}: falli individuali ancora presenti nella MyCombo MD6`);
  assert(!portfolios.flatMap(portfolio => portfolio.legs || []).some(isCornerPeriodMarket), `${matchId}: corner per tempo ancora presente nella MyCombo MD6`);
}
for (const prediction of predictions) {
  const safe = prediction.combinations.find(combo => combo.tier === "Safe");
  assert(safe?.legs?.length >= 3 && safe.legs.length <= 6, `${prediction.matchId}: MyCombo Safe non integrata`);
  assert(!prediction.combinations.flatMap(combo => combo.legs || []).some(isUnderPlayableSelection), `${prediction.matchId}: Under propagato nelle combinazioni operative`);
  assert(!prediction.combinations.flatMap(combo => combo.legs || []).some(isIndividualPlayerFoulMarket), `${prediction.matchId}: falli individuali propagati nelle combinazioni operative`);
  assert(!prediction.combinations.flatMap(combo => combo.legs || []).some(isCornerPeriodMarket), `${prediction.matchId}: corner per tempo propagato nelle combinazioni operative`);
}

assert.equal(isUnderPlayableSelection({ selection: "OVER", label: "Over 2,5 gol" }), false, "Gli Over devono restare eleggibili");
assert.equal(isUnderPlayableSelection({ selection: "UNDER", label: "Under 2,5 gol" }), true);
assert(odds.events.flatMap(event => event.markets).flatMap(market => market.selections || []).some(selection => selection.name === "UNDER"), "Gli Under devono restare nello snapshot statistico delle quote");
assert.equal(isPlayableSelection({matchId:"test-md-06",market:"U/O FALLI COMMESSI GIOCATORE",selection:"OVER"},{matchday:6}),false);
assert.equal(isPlayableSelection({matchId:"test-md-06",market:"U/O FALLI SUBITI SQUADRA",selection:"OVER"},{matchday:6}),true,"i falli aggregati di squadra devono restare disponibili");
assert.equal(isPlayableSelection({matchId:"test-md-06",market:"1 TEMPO: 1X2 CORNER",variant:"1T CORNER 1X2",selection:"1"},{matchday:6}),false,"i corner del primo tempo devono essere esclusi");
assert.equal(isPlayableSelection({matchId:"test-md-06",market:"CORNER: ESITO 1 TEMPO/FINALE",selection:"1/1"},{matchday:6}),false,"i corner primo tempo/finale devono essere esclusi");
assert.equal(isPlayableSelection({matchId:"test-md-06",market:"ALMENO X CORNER IN ENTRAMBI I TEMPI",selection:"SI"},{matchday:6}),false,"i corner in entrambi i tempi devono essere esclusi");
assert.equal(isPlayableSelection({matchId:"test-md-06",market:"CORNER NEI MINUTI X-Y",variant:"CORNER PRIMI 10 MINUTI",selection:"SI"},{matchday:6}),false,"i corner su finestra temporale devono essere esclusi");
assert.equal(isPlayableSelection({matchId:"test-md-06",market:"U/O CORNER",variant:"U/O 9.5 CORNER",selection:"OVER"},{matchday:6}),true,"i corner dell'intera partita devono restare eleggibili");
assert.equal(isPlayableSelection({matchId:"test-md-06",market:"U/O CORNER SQUADRA 1",variant:"U/O 4.5 CORNER CASA",selection:"OVER"},{matchday:6}),true,"i corner squadra sull'intera partita devono restare eleggibili");
assert.equal(isPlayableSelection({matchId:"test-md-06",market:"1X2 CORNER",variant:"CALCI D'ANGOLO 1X2 T.R.",selection:"1"},{matchday:6}),true,"l'1X2 corner a tempo regolamentare deve restare eleggibile");
assert(myCombo.constraints.individualFoulSelectionPolicy.active,"policy falli individuali MD6 non serializzata");
assert(myCombo.constraints.individualFoulSelectionPolicy.previousPlayableLegOccurrencesRemoved>0,"migrazione dei falli individuali preesistenti non tracciata");
assert(myCombo.constraints.cornerPeriodSelectionPolicy.active,"policy corner per tempo MD6 non serializzata");
assert(myCombo.constraints.cornerPeriodSelectionPolicy.previousPlayableLegOccurrencesRemoved>0,"migrazione dei corner per tempo preesistenti non tracciata");
const oddsMarkets=odds.events.flatMap(event=>event.markets||[]);
assert(oddsMarkets.some(isCornerPeriodMarket),"i corner per tempo devono restare nello snapshot quote e nelle analisi");
assert(oddsMarkets.some(market=>/CORNER/.test(market.marketName||"")&&!isCornerPeriodMarket(market)),"i corner dell'intera partita devono restare nello snapshot quote");
const playableFullMatchCorners=Object.values(myCombo.matches).flatMap(portfolios=>portfolios.flatMap(portfolio=>portfolio.legs||[])).filter(leg=>/CORNER/.test(leg.market||"")&&!isCornerPeriodMarket(leg));
assert(playableFullMatchCorners.length>0,"la rigenerazione deve conservare almeno un corner dell'intera partita giocabile");

assert(page.includes('load("schedina-md06.json")'));
assert(page.includes("myComboRoundContent(predictionData.predictions||[],matchById,teamById,number)"));
assert(page.includes("MyCombo per partita"));
assert(page.includes("betting-workspace"));
assert(page.includes("data-mycombo-open-all"));
assert(!page.includes("MyCombo · scegli tra"));
assert(!page.includes("betting-leg-number"),"la numerazione decorativa delle selezioni non deve essere renderizzata");

const protectedArchives = [
  "data/normalized/schedina.json",
  "data/normalized/schedina-md02.json",
  "data/normalized/schedina-md03.json",
  "data/normalized/schedina-md04.json",
  "data/normalized/schedina-md05.json",
  ...[1, 2, 3, 4, 5].flatMap(matchday => {
    const suffix = String(matchday).padStart(2, "0");
    return [
      `data/sources/schedina-serie-a-2026-27-md-${suffix}.json`,
      `data/sources/mycombo-serie-a-2026-27-md-${suffix}.json`,
    ];
  }),
  "data/normalized/schedina-champions-md01.json",
  "data/sources/schedina-champions-md01-snapshot.json",
];
for (const archive of protectedArchives) {
  const diff = execFileSync("git", ["diff", "--numstat", "--", archive], { cwd: root, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
  assert.equal(diff, "", `${archive}: archivio storico alterato`);
}

console.log(`OK Schedina MD06: ${normalized.slips.length} schedine/${normalized.slips.reduce((sum, slip) => sum + slip.legs.length, 0)} gambe, zero Under/falli individuali/corner per tempo giocabili, corner intera partita eleggibili, DUO non certificato, archivi invariati`);
