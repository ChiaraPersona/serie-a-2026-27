"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { pairRelation } = require("./md06-scenario-coherence");
const {
  assessSuggestion,
  canonicalThresholdIdentity,
  conservativeExpectedValuePct,
  interestTuple,
} = require("./md06-suggested-forecasts");
const { chooseShotsThreshold, chooseSotThreshold, isCompatibleIndividualMarket, isSupportedDuoMarket } = require("./md06-player-forecast-integration");

const root = path.resolve(__dirname, "..");
const read = relative => JSON.parse(fs.readFileSync(path.join(root, relative), "utf8"));
const sha256 = relative => crypto.createHash("sha256").update(fs.readFileSync(path.join(root, relative))).digest("hex");
const clone = value => JSON.parse(JSON.stringify(value));
const schedina = read("data/normalized/schedina-md06.json");
const report = read("output/reports/serie-a-md06-definitive-selection-2026-10-10.json");
const oddsSnapshot = read("data/normalized/odds/sisal/serie-a.json");
const ui = fs.readFileSync(path.join(root, "js/pages/betting.js"), "utf8");
const rows = schedina.marketCatalog.matches.flatMap(match => match.selections);
const suggestions = rows.filter(leg => leg.suggestionAnalysis?.suggested);
const added = rows.filter(leg => String(leg.catalogOrigin || "").startsWith("statistical-"));
const validated = added.filter(leg => leg.catalogOrigin === "statistical-model-validated");
const blocked = added.filter(leg => leg.catalogOrigin === "statistical-b-not-modelled");
const playerForecasts = rows.filter(leg => leg.catalogOrigin === "prediction-v2-player-forecast");
const baselineSuggestions = suggestions.filter(leg => leg.suggestionAnalysis?.baselineApproved === true);
const isDrawNoBet = leg => /^draw-no-bet:/.test(String(leg?.betSelection?.compatibility?.modelTarget || "").toLowerCase()) || /DRAW NO BET/i.test(`${leg.marketFamily || ""} ${leg.market || ""}`);

assert.equal(schedina.marketCatalog.schemaVersion, 4);
assert.equal(rows.length, 1542);
assert.equal(new Set(rows.map(leg => leg.selectionId)).size, rows.length);
assert.equal(added.length, 1064);
assert.equal(validated.length, 671);
assert.equal(blocked.length, 393);
assert(blocked.every(leg => leg.coverageClassification === "B" && leg.betSelection.evaluation.status === "NOT_MODELLED"));
assert(!blocked.some(leg => leg.suggestionAnalysis.suggested), "NOT_MODELLED promosso nei pronostici");
assert(validated.every(leg => leg.coverageClassification === "A" && leg.betSelection.evaluation.kind === "DISCRETE_COUNT_TEMPORAL_HOLDOUT"));
assert.equal(suggestions.length, 175);
assert.equal(baselineSuggestions.length, 80);
assert.equal(playerForecasts.length, 95);
assert.equal(playerForecasts.filter(leg => leg.suggestionAnalysis.family === "shots").length, 61);
assert.equal(playerForecasts.filter(leg => leg.suggestionAnalysis.family === "sot").length, 34);
assert.equal(suggestions.filter(leg => Number.isFinite(leg.betSelection.evaluation.expectedValuePct) && leg.betSelection.evaluation.expectedValuePct < 0).length, 68);
assert.equal(suggestions.filter(leg => Number.isFinite(leg.betSelection.evaluation.expectedValuePct) && leg.betSelection.evaluation.expectedValuePct < 2).length, 70);
assert(suggestions.every(leg => [2, 3].includes(leg.suggestionAnalysis.version)));
assert(baselineSuggestions.every(leg => leg.suggestionAnalysis.criteria.includes("EV_INFORMATION_ONLY")));
assert(playerForecasts.every(leg => leg.suggestionAnalysis.criteria === "APPROVED_BASELINE_PLUS_STRUCTURED_READING_V2_NO_EV_GATE"));
assert(suggestions.every(leg => leg.betSelection.evaluation.status !== "NOT_MODELLED"));
assert(baselineSuggestions.every(leg => Number.isFinite(leg.betSelection.quote.decimal) && leg.betSelection.quote.availability === "AVAILABLE_AT_SNAPSHOT"));
assert(playerForecasts.every(leg => Number.isFinite(leg.betSelection.quote.decimal) && leg.betSelection.quote.availability === "AVAILABLE_AT_SNAPSHOT"));
assert(playerForecasts.every(leg => leg.betSelection.identity.status === "VERIFIED_PROVIDER_IDS" && leg.betSelection.identity.providerMarketId && leg.betSelection.identity.providerSelectionId));
assert(playerForecasts.every(leg => leg.betSelection.evaluation.modelProbabilityPct === null && leg.betSelection.evaluation.expectedValuePct === null && leg.betSelection.evaluation.prudentProbabilityPct === null));
assert(playerForecasts.every(leg => Number.isFinite(leg.betSelection.evaluation.individualReference?.modelProbabilityPct) && leg.betSelection.evaluation.individualReference.appliedToDuo === false));
assert(baselineSuggestions.every(leg => Number.isFinite(leg.betSelection.evaluation.modelProbabilityPct)));
assert(baselineSuggestions.every(leg => Number.isFinite(leg.betSelection.evaluation.prudentProbabilityPct)));
assert(baselineSuggestions.every(leg => Number.isFinite(conservativeExpectedValuePct(leg))));
assert(suggestions.every(leg => ["Alta", "Media", "Bassa"].includes(leg.betSelection.operational.reliability.level)));
assert(suggestions.some(leg => ["shots", "sot", "corners"].includes(leg.suggestionAnalysis.family)));
assert(!suggestions.some(leg => leg.suggestionAnalysis.family === "cards"));
assert(!suggestions.some(isDrawNoBet), "Draw No Bet promosso nei pronostici");
assert(playerForecasts.every(leg => leg.betSelection.market.bookmakerSemantics?.duo === true && leg.betSelection.market.bookmakerSemantics?.substituteIncluded === true), "Semantica DUO assente");
assert(playerForecasts.filter(leg => leg.suggestionAnalysis.family === "sot").every(leg => leg.betSelection.market.bookmakerSemantics?.postsAndCrossbarIncluded === true), "Pali/traverse non dichiarati sui SOT");
assert(playerForecasts.every(leg => /DUO|SOST/i.test(leg.betSelection.compatibility.bookmakerTarget || "")), "Contratto DUO non conservato");
assert.equal(new Set(playerForecasts.map(leg => `${leg.matchId}:${leg.playerId}:${leg.suggestionAnalysis.family}`)).size, playerForecasts.length, "Più soglie per giocatore e statistica");
const oddsEvents = new Map(oddsSnapshot.events.map(event => [event.canonicalMatchId, event]));
for (const leg of playerForecasts) {
  const semantics = leg.betSelection.market.bookmakerSemantics;
  const expectedCode = leg.suggestionAnalysis.family === "shots" ? "28507" : "28506";
  assert.equal(semantics.marketCode, expectedCode, `${leg.selectionId}: codice mercato errato`);
  const providerMarket = oddsEvents.get(leg.matchId)?.markets.find(market => String(market.providerMarketId) === String(leg.providerMarketId));
  assert(providerMarket, `${leg.selectionId}: mercato assente dallo snapshot`);
  assert.equal(String(providerMarket.marketCode), expectedCode, `${leg.selectionId}: codice snapshot errato`);
  assert.equal(Number(providerMarket.threshold), Number(leg.threshold), `${leg.selectionId}: soglia snapshot errata`);
  assert.deepEqual(providerMarket.providerPlayerIds.map(String), [semantics.providerPlayerId], `${leg.selectionId}: provider player ID non univoco`);
  const providerSelection = providerMarket.selections.find(selection => String(selection.providerSelectionId) === String(leg.providerSelectionId));
  assert(providerSelection && providerSelection.status === "open" && providerSelection.name === "OVER", `${leg.selectionId}: selezione OVER non verificata`);
  assert.equal(Number(providerSelection.odds), Number(leg.odds), `${leg.selectionId}: quota diversa dallo snapshot`);
  assert.equal(leg.betSelection.quote.verifiedAt, oddsSnapshot.retrievedAt, `${leg.selectionId}: data snapshot non conservata`);
}
assert.equal(isCompatibleIndividualMarket({ marketScope: "player", marketName: "U/O TIRI TOTALI GIOCATORE (DUO) INC TS", variantName: "ROSSI E SUO SOST." }, "shots"), false);
assert.equal(isSupportedDuoMarket({ marketScope: "player", marketCode: "28507", marketName: "U/O TIRI TOTALI GIOCATORE (DUO) INC TS", variantName: "ROSSI U/O 2.5 SOMMA TIRI E SUO SOST. INCL. T.S." }, "shots"), true);
assert.equal(isSupportedDuoMarket({ marketScope: "player", marketCode: "28506", marketName: "U/O TIRI IN PORTA GIOCATORE (DUO) INC PALI TRAVERSE INC TS", variantName: "ROSSI U/O 1.5 SOMMA TIRI IN PORTA INC PALI E TRAVERSE E SUO SOST. INCL. T.S." }, "sot"), true);
assert.equal(isCompatibleIndividualMarket({ marketScope: "player", marketName: "GIOCATORE ALMENO X TIRI TOTALI NEI 2 TEMPI SI/NO", variantName: "ROSSI IN ENTRAMBI I TEMPI" }, "shots"), false);
assert.equal(isCompatibleIndividualMarket({ marketScope: "player", marketName: "U/O TIRI IN PORTA GIOCATORE", variantName: "ROSSI U/O 0.5" }, "sot"), true);
assert.deepEqual(chooseShotsThreshold({ shotProbabilities: { over05: 0.94, over15: 0.74, over25: 0.49 } }), { count: 3, probability: 0.49, probabilityKey: "over25" });
assert.deepEqual(chooseSotThreshold({ shotOnTargetProbabilities: { over05: 0.62, over15: 0.21 } }), { count: 1, probability: 0.62, probabilityKey: "over05" });
assert(suggestions.every(leg => !Object.hasOwn(leg.suggestionAnalysis, "motivation")), "Le motivazioni descrittive non devono essere serializzate");

for (const match of schedina.marketCatalog.matches) {
  const picks = match.selections.filter(leg => leg.suggestionAnalysis?.suggested).sort((left, right) => left.suggestionAnalysis.rank - right.suggestionAnalysis.rank);
  assert.deepEqual(picks.map(leg => leg.suggestionAnalysis.rank), picks.map((_, index) => index + 1), `${match.matchId}: ranking non contiguo`);
  const baseline = picks.filter(leg => leg.suggestionAnalysis.baselineApproved);
  const integrated = picks.filter(leg => leg.catalogOrigin === "prediction-v2-player-forecast");
  assert(picks.indexOf(integrated[0]) >= baseline.length || !integrated.length, `${match.matchId}: le aggiunte V2 devono seguire la baseline approvata`);
  const thresholdKeys = picks.map(canonicalThresholdIdentity).filter(Boolean);
  assert.equal(new Set(thresholdKeys).size, thresholdKeys.length, `${match.matchId}: più soglie della stessa identità canonica`);
  for (let left = 0; left < picks.length; left += 1) for (let right = left + 1; right < picks.length; right += 1) {
    assert(!["MUTUALLY_EXCLUSIVE", "EQUIVALENT_OVERLAP", "LOGICAL_IMPLICATION"].includes(pairRelation(picks[left], picks[right]).type), `${match.matchId}: coppia incompatibile o ridondante`);
  }
}

const genoa = schedina.marketCatalog.matches.find(match => match.matchId === "genoa-fiorentina-2026-27-md-06");
const genoaMatchShots = genoa.selections.filter(leg => canonicalThresholdIdentity(leg) === "shots:match:match:over:TIRI TOTALI" && leg.betSelection.evaluation.status !== "NOT_MODELLED");
const selectedShots = genoaMatchShots.find(leg => leg.suggestionAnalysis.suggested);
assert.equal(selectedShots.label, "Partita Over 23,5 tiri totali", "Il caso rappresentativo deve scegliere una soglia intermedia");
assert.notEqual(Number(selectedShots.threshold), Math.min(...genoaMatchShots.map(leg => Number(leg.threshold))), "Scelta sistematica della soglia più bassa");
assert.notEqual(Number(selectedShots.threshold), Math.max(...genoaMatchShots.map(leg => Number(leg.threshold))), "Scelta sistematica della soglia più alta");
assert.notEqual(selectedShots.betSelection.quote.decimal, Math.max(...genoaMatchShots.map(leg => leg.betSelection.quote.decimal)), "Scelta sistematica della quota più alta");

const inter = schedina.marketCatalog.matches.find(match => match.matchId === "inter-parma-2026-27-md-06");
const interWin = inter.selections.find(leg => leg.label === "Inter vincente");
const parmaWin = inter.selections.find(leg => leg.label === "Parma vincente");
assert(interWin.suggestionAnalysis.suggested, "Inter vincente coerente con lo scenario prevalente deve essere selezionato anche con EV negativo");
assert(Number(interWin.betSelection.evaluation.expectedValuePct) < 0);
assert(!parmaWin.suggestionAnalysis.suggested, "Parma vincente contrario allo scenario prevalente non deve essere promosso");

const positiveEvClone = clone(interWin);
positiveEvClone.betSelection.evaluation.expectedValuePct = 50;
positiveEvClone.betSelection.evaluation.conservativeExpectedValuePct = 40;
const negativeEvClone = clone(interWin);
negativeEvClone.betSelection.evaluation.expectedValuePct = -50;
negativeEvClone.betSelection.evaluation.conservativeExpectedValuePct = -60;
assert.deepEqual(
  { eligible: assessSuggestion(negativeEvClone).eligible, reasons: assessSuggestion(negativeEvClone).reasons },
  { eligible: assessSuggestion(positiveEvClone).eligible, reasons: assessSuggestion(positiveEvClone).reasons },
  "L'EV non deve modificare ammissione o motivi di esclusione",
);
assert.deepEqual(interestTuple(negativeEvClone), interestTuple(positiveEvClone), "L'EV non deve modificare l'ordinamento");
const highQuoteClone = clone(interWin);
highQuoteClone.betSelection.quote.decimal = 20;
assert.deepEqual(interestTuple(highQuoteClone), interestTuple(interWin), "La quota non deve modificare l'ordinamento generale");

assert(!ui.includes("Pronostici suggeriti"));
assert(!ui.includes("Tutti i mercati"));
assert(!ui.includes("data-market-mode="));
assert(!ui.includes("betting-suggestion-reason"));
assert(!ui.includes("P centrale"));
assert.match(ui, /Pronostici selezionati/);
assert.match(ui, /Quota Sisal/);
assert.match(ui, />EV</);

assert.equal(sha256("data/analysis/serie-a-md06-statistical-models-2026-10-10.json"), "25f04262cb5a016ff79385f7c87d05b60bc2b5152d87e8e72f2fe2dbf2b0c22a", "Artefatto dei modelli statistici modificato");
assert.equal(sha256("scripts/md06-statistical-models.js"), "283b8a89e1601280f60e76c5ac716c95cb776ac26a4ea218416c2f9d411d9cff", "Implementazione dei modelli statistici modificata");
assert.equal(report.invariants.certifiedSelections, 383);
assert(report.invariants.certifiedSelectionIdsPreserved && report.invariants.certifiedContractsUnchanged);
assert.equal(report.invariants.catalogSelections, 1542);
assert.equal(report.coverage.comparison.previousSuggestions, 82);
assert.equal(report.coverage.comparison.removedDrawNoBet, 2);
assert.equal(report.coverage.comparison.preservedApprovedNonDnb, 80);
assert.equal(report.coverage.comparison.newPlayerShots, 61);
assert.equal(report.coverage.comparison.newPlayerSot, 34);
assert.equal(report.coverage.comparison.newPlayerCards, 0);
assert.equal(report.coverage.comparison.newCardsOvers, 0);
assert.equal(report.coverage.totalSuggestions, 175);
assert.equal(report.coverage.quotedSuggestions, 175);
assert.equal(report.coverage.unquotedSuggestions, 0);
assert.equal(report.coverage.negativeEvSuggestions, 68);
assert.equal(report.coverage.recoveredFromEconomicExclusion, 70);
assert.equal(report.statisticalMarkets.families.reduce((sum, row) => sum + row.selected, 0), 146);
assert(report.thresholdCases.some(item => ["shots", "sot", "corners"].some(family => item.canonicalIdentity.startsWith(`${family}:`)) && item.alternatives.some(leg => leg.selected)));

const yeboah = playerForecasts.filter(leg => leg.playerId === "john-yeboah");
assert.deepEqual(yeboah.map(leg => [leg.suggestionAnalysis.family, leg.providerMarketId, leg.providerSelectionId, leg.betSelection.market.bookmakerSemantics.providerPlayerId]).sort(), [
  ["shots", "820932205", "5371733876", "307273"],
  ["sot", "820938089", "5371743856", "307273"],
]);
assert(!yeboah.some(leg => leg.betSelection.market.bookmakerSemantics.providerPlayerId === "628786"), "Yeboah ancora associato a Schingtienne");

console.log("OK selezione MD06: 80 baseline non-DNB + 95 tiri/SOT DUO quotati, probabilità/EV DUO N/D, cartellini non forzati, modelli invariati");
