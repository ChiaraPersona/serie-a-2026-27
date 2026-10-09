"use strict";

const assert = require("assert");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { isUnderPlayableSelection, isIndividualPlayerFoulMarket, isCornerPeriodMarket, isDoubleChance12Selection, isPlayableSelection } = require("./betting-market-policy");
const { resolveLineupEligibility } = require("./md06-market-catalog");

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
const groupBAudit = read("output/reports/serie-a-md06-group-b-audit-2026-10-09.json");
const page = fs.readFileSync(path.join(root, "js/pages/betting.js"), "utf8");
const matches = read("data/normalized/matches.json");

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
assert.equal(selection.rules.doubleChance12Playable, false);
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

const catalog = normalized.marketCatalog;
assert(catalog, "Catalogo mercati MD6 assente");
assert.deepEqual(catalog.totals, {
  initialVisible: 35,
  excludedByPolicy: 1,
  excludedByLineup: 2,
  retainedInitial: 32,
  groupARequested: 128,
  groupARecovered: 128,
  groupARejected: 0,
  dnbRequested: 20,
  dnbRecovered: 20,
  dnbRejected: 0,
  groupB2Requested: 203,
  groupB2Recovered: 203,
  groupB2Rejected: 0,
  finalSelections: 383,
  evaluated: 367,
  notModelled: 16,
  scenarioCounts: {
    COHERENT_WITH_PREVALENT: 20,
    ALTERNATIVE_TO_PREVALENT: 50,
    COMPATIBLE_WITH_MULTIPLE_SCENARIOS: 297,
    NOT_DETERMINABLE: 16,
  },
});
assert.deepEqual(Object.fromEntries(catalog.matches.map(match => [match.matchId, match.total])), {
  "genoa-fiorentina-2026-27-md-06": 34,
  "inter-parma-2026-27-md-06": 35,
  "napoli-frosinone-2026-27-md-06": 39,
  "como-roma-2026-27-md-06": 40,
  "lazio-monza-2026-27-md-06": 39,
  "lecce-bologna-2026-27-md-06": 39,
  "sassuolo-milan-2026-27-md-06": 38,
  "cagliari-juventus-2026-27-md-06": 39,
  "atalanta-venezia-2026-27-md-06": 41,
  "torino-udinese-2026-27-md-06": 39,
});
const catalogSelections = catalog.matches.flatMap(match => match.selections);
assert.equal(new Set(catalogSelections.map(leg => leg.selectionId)).size, catalogSelections.length, "Catalogo MD6 con duplicati");
assert(catalogSelections.every(leg => leg.betSelection.identity.status === "VERIFIED_PROVIDER_IDS"), "Identità provider non verificata nel catalogo");
assert(catalogSelections.every(leg => leg.betSelection.quote.availability === "AVAILABLE_AT_SNAPSHOT" && Number.isFinite(leg.betSelection.quote.decimal) && leg.betSelection.quote.decimal >= 1), "Quota non valida nel catalogo");
assert(!catalogSelections.some(isUnderPlayableSelection), "Under presente nel catalogo");
assert(!catalogSelections.some(isIndividualPlayerFoulMarket), "Fallo individuale presente nel catalogo");
assert(!catalogSelections.some(isCornerPeriodMarket), "Corner per tempo presente nel catalogo");
assert(!catalogSelections.some(isDoubleChance12Selection), "Doppia chance 12 presente nel catalogo");
assert(catalogSelections.some(leg => /1X2 CORNER/.test(leg.market) && /T\.R\./.test(leg.variant)), "Corner 1X2 T.R. non conservato");
assert(catalogSelections.some(leg => Number(leg.betSelection.evaluation.expectedValuePct) < 0), "Gli EV negativi validi non devono essere eliminati");
assert(!catalogSelections.some(leg => /ESPOSITO P\.|HUTCHINSON O\./.test(leg.variant || "")), "Panchinari prioritari ancora presenti");
assert(catalogSelections.filter(leg => leg.betSelection.market.scope === "player").every(leg => ["official-starter", "probable-starter"].includes(leg.lineupEligibility.status)), "Mercato giocatore senza titolarità ammessa");
const recoveredGroupA = catalogSelections.filter(leg => leg.catalogOrigin === "gruppo-a");
assert.equal(recoveredGroupA.length, 128);
for (const leg of recoveredGroupA) {
  const evaluation = leg.betSelection.evaluation;
  assert(Math.abs(evaluation.fairOdds - 100 / evaluation.modelProbabilityPct) <= 0.06, `${leg.selectionId}: quota equa incoerente`);
  const expectedEv = (evaluation.modelProbabilityPct / 100 * leg.betSelection.quote.decimal - 1) * 100;
  assert(Math.abs(evaluation.expectedValuePct - expectedEv) <= Math.max(0.2, leg.betSelection.quote.decimal * 0.06), `${leg.selectionId}: EV incoerente`);
}
const preserved = catalogSelections.filter(leg => !["dnb-b1", "gruppo-b2"].includes(leg.catalogOrigin));
assert.equal(preserved.length, 160, "Il catalogo precedente deve restare composto da 160 righe");
assert.equal(preserved.filter(leg => Number.isFinite(leg.betSelection.evaluation.expectedValuePct)).length, 144, "Le 144 valutazioni esistenti devono restare valutate");
assert.equal(preserved.filter(leg => !Number.isFinite(leg.betSelection.evaluation.expectedValuePct)).length, 16, "Le 16 righe NOT_MODELLED devono restare tali");
assert(preserved.filter(leg => !Number.isFinite(leg.betSelection.evaluation.expectedValuePct)).every(leg => leg.betSelection.evaluation.kind === "NOT_MODELLED"), "Le righe senza modello devono essere dichiarate NOT_MODELLED");
const preservedMetricsDigest = crypto.createHash("sha256").update(JSON.stringify(preserved.map(leg => [leg.selectionId, leg.betSelection.evaluation.modelProbabilityPct, leg.betSelection.evaluation.fairOdds, leg.betSelection.evaluation.expectedValuePct, leg.betSelection.evaluation.status]).sort((left, right) => left[0].localeCompare(right[0])))).digest("hex");
assert.equal(preservedMetricsDigest, "c9e4b627ad5e583ef0c63acae734d54034633d464a46d1177d8e55820ff432ad", "Identità o metriche delle 160 righe Fase 5A alterate");

const dnb = catalogSelections.filter(leg => leg.catalogOrigin === "dnb-b1");
assert.equal(dnb.length, 20);
assert(dnb.every(leg => leg.market === "DRAW NO BET" && leg.betSelection.evaluation.kind === "CANONICAL_DIRECT"), "DNB non marcati come valutazioni canoniche dirette");
assert(dnb.every(leg => leg.betSelection.evaluation.probabilitySemantics === "CONDITIONAL_ON_NO_DRAW"), "Semantica condizionata DNB assente");
assert(dnb.every(leg => leg.betSelection.evaluation.settlement?.pushOutcome === "X" && leg.betSelection.evaluation.settlement?.settledPeriod === "FULL_TIME"), "Rimborso sul pareggio DNB non serializzato");
const expectedDnbIds = new Set(predictions.flatMap(prediction => (prediction.marketComparison || []).filter(row => row.family === "draw-no-bet").map(row => `bet:sisal:${prediction.matchId}:${row.providerSelectionId}`)));
assert.deepEqual(new Set(dnb.map(leg => leg.selectionId)), expectedDnbIds, "I 20 DNB non coincidono con le valutazioni canoniche esistenti");

const b2 = catalogSelections.filter(leg => leg.catalogOrigin === "gruppo-b2");
assert.equal(b2.length, 203);
assert.deepEqual(Object.fromEntries(["multigoal-match", "multigoal-team", "team-goals-over"].map(family => [family, b2.filter(leg => leg.derivedMarketFamily === family).length])), {
  "multigoal-match": 105,
  "multigoal-team": 71,
  "team-goals-over": 27,
});
assert(b2.every(leg => leg.betSelection.evaluation.kind === "DERIVED_B2_SCORE_MATRIX"), "B2 non marcati come derivazioni dalla matrice punteggi");
assert(b2.every(leg => leg.betSelection.evaluation.fairOddsBasis === "PRUDENT_PROBABILITY" && leg.betSelection.evaluation.expectedValueBasis === "PRUDENT_PROBABILITY_TIMES_DECIMAL_ODDS_MINUS_ONE"), "Base prudente B2 non dichiarata");
for (const leg of b2) {
  const evaluation = leg.betSelection.evaluation;
  assert(Math.abs(evaluation.fairOdds - 100 / evaluation.prudentProbabilityPct) <= 0.03, `${leg.selectionId}: fair B2 non coerente con P prudente`);
  const expectedEv = (evaluation.prudentProbabilityPct / 100 * leg.betSelection.quote.decimal - 1) * 100;
  assert(Math.abs(evaluation.expectedValuePct - expectedEv) <= Math.max(0.2, leg.betSelection.quote.decimal * 0.06), `${leg.selectionId}: EV B2 non coerente con P prudente`);
}
const auditedB2 = groupBAudit.classifications.filter(row => row.level === "B2");
assert.equal(auditedB2.length, 203);
assert(auditedB2.every(row => row.normalizationStatus === "VERIFIED_EXACT"), "L'audit B2 contiene identità raw non riconciliate");
assert.deepEqual(new Set(b2.map(leg => leg.selectionId)), new Set(auditedB2.map(row => row.selectionId)), "L'integrazione B2 diverge dai 203 esiti auditati");
for (const match of catalog.matches) {
  const evs = match.selections.map(leg => leg.betSelection.evaluation.expectedValuePct);
  const firstMissing = evs.findIndex(value => !Number.isFinite(value));
  const evaluated = firstMissing < 0 ? evs : evs.slice(0, firstMissing);
  assert(evaluated.every((value, index) => index === 0 || evaluated[index - 1] >= value), `${match.matchId}: ordine EV non decrescente`);
  if (firstMissing >= 0) assert(evs.slice(firstMissing).every(value => !Number.isFinite(value)), `${match.matchId}: NOT_MODELLED mescolati agli EV`);
}
assert.equal(catalog.sources.modelVersion, "4.13.0");
assert.equal(catalog.sources.predictionsGeneratedAt, read("data/normalized/predictions.json").generatedAt);
assert.equal(catalog.sources.oddsRetrievedAt, odds.retrievedAt);
assert.equal(catalog.sources.officialFixturesAvailable, 0);

{
  const matchById = new Map([["alpha-beta-2026-27-md-06", { id: "alpha-beta-2026-27-md-06", homeTeam: "alpha", awayTeam: "beta" }]]);
  const leg = { matchId: "alpha-beta-2026-27-md-06", marketScope: "player", variant: "ROSSI M. U/O 0.5", betSelection: { market: { scope: "player", variant: "ROSSI M. U/O 0.5" } } };
  const probableLineups = { provider: "Probabile", importedAt: "2026-10-09", teams: [{ teamId: "alpha", players: [{ playerId: "mario-rossi", currentName: "Mario Rossi", sourceName: "Rossi", lineupStatus: "starter" }] }] };
  const officialLineups = { provider: "Ufficiale", retrievedAt: "2026-10-10", fixtures: [{ matchId: "alpha-beta-2026-27-md-06", matchday: 6, teams: [{ teamId: "alpha", players: [{ playerId: "altro", currentName: "Altro Giocatore" }] }, { teamId: "beta", players: [] }] }] };
  assert.equal(resolveLineupEligibility({ leg, matchId: leg.matchId, matchById, probableLineups, officialLineups }).status, "official-nonstarter", "La formazione ufficiale deve prevalere sulla probabile");
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
assert.equal(isPlayableSelection({matchId:"test-md-06",market:"DOPPIA CHANCE",selection:"12"},{matchday:6}),false,"la doppia chance 12 deve essere esclusa");
assert.equal(isPlayableSelection({matchId:"test-md-06",market:"DOPPIA CHANCE",selection:"1X"},{matchday:6}),true,"la doppia chance 1X deve restare eleggibile");
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
assert(page.includes("data.marketCatalog?.matches"), "La workspace MD6 non usa il catalogo normalizzato");
assert(!page.includes("data-market-filter"), "La barra filtri deve essere rimossa");
assert(!page.includes("data-market-sort"), "Il menu di ordinamento deve essere rimosso");
assert(page.includes("markets.sort(marketEntryOrder)"), "Ordinamento automatico per EV assente");
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
