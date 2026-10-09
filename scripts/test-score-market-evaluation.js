"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { scoreMatrix, configuredScorePredicate } = require("./predictions/engine");
const { evaluateDerivedScoreMarket, validateCanonicalDnb } = require("./score-market-evaluation");
const { buildMd06MarketCatalog } = require("./md06-market-catalog");

const root = path.resolve(__dirname, "..");
const read = relative => JSON.parse(fs.readFileSync(path.join(root, relative), "utf8"));
const predictionsData = read("data/normalized/predictions.json");
const predictions = predictionsData.predictions.filter(row => row.matchId.endsWith("-md-06"));
const odds = read("data/normalized/odds/sisal/serie-a.json");
const normalized = read("data/normalized/schedina-md06.json");
const predictionByMatch = new Map(predictions.map(row => [row.matchId, row]));
const quoteBySelectionId = new Map(odds.events.flatMap(event => event.markets.flatMap(market => (market.selections || []).map(selection => [String(selection.providerSelectionId), { event, market, selection }]))));

for (const expected of [{ home: 1.7, away: 1.1 }, { home: 0.82, away: 2.35 }]) {
  const total = scoreMatrix(expected.home, expected.away, 7, null).reduce((sum, cell) => sum + cell.probability, 0);
  assert(Math.abs(total - 1) < 1e-12, "La matrice punteggi deve essere normalizzata");
}

const inclusive = configuredScorePredicate({ market: "MULTIGOAL", selection: "2-4" });
assert(inclusive({ home: 2, away: 0 }) && inclusive({ home: 3, away: 1 }), "Gli estremi Multigoal devono essere inclusivi");
assert(!inclusive({ home: 1, away: 0 }) && !inclusive({ home: 4, away: 1 }), "Il Multigoal non deve includere celle esterne all'intervallo");

const homeRange = configuredScorePredicate({ market: "MULTIGOAL SQUADRA X", variant: "MULTIGOAL SQUADRA 1 MULTIESITI", selection: "1-2" });
const awayRange = configuredScorePredicate({ market: "MULTIGOAL SQUADRA X", variant: "MULTIGOAL SQUADRA 2 MULTIESITI", selection: "1-2" });
assert(homeRange({ home: 2, away: 4 }) && !awayRange({ home: 2, away: 4 }), "Il lato casa/trasferta deve restare distinto");
assert(!homeRange({ home: 4, away: 2 }) && awayRange({ home: 4, away: 2 }), "Il lato trasferta non deve usare i gol di casa");

const over15 = configuredScorePredicate({ market: "U/O SQUADRA X", variant: "U/O 1.5 SQUADRA 1", threshold: 1.5, selection: "OVER" });
const over25 = configuredScorePredicate({ market: "U/O SQUADRA X", variant: "U/O 2.5 SQUADRA 1", threshold: 2.5, selection: "OVER" });
assert(!over15({ home: 1, away: 0 }) && over15({ home: 2, away: 0 }), "Over 1.5 deve richiedere almeno due gol");
assert(!over25({ home: 2, away: 0 }) && over25({ home: 3, away: 0 }), "Over 2.5 deve richiedere almeno tre gol");

const homologous = [];
for (const prediction of predictions) for (const combo of prediction.combinations || []) for (const leg of combo.legs || []) {
  if (![leg.probabilityPct, leg.prudentProbabilityPct, leg.fairOdds, leg.expectedValuePct].every(Number.isFinite)) continue;
  if (!(leg.market === "MULTIGOAL" || leg.market === "MULTIGOAL SQUADRA X" || (leg.market === "U/O SQUADRA X" && leg.selection === "OVER"))) continue;
  const quote = quoteBySelectionId.get(String(leg.providerSelectionId));
  assert(quote, `${leg.selectionId}: quota omologa non trovata`);
  const evaluated = evaluateDerivedScoreMarket({ prediction, market: quote.market, selection: quote.selection });
  assert(Math.abs(evaluated.centralProbabilityPct - leg.probabilityPct) <= 0.11, `${leg.selectionId}: P centrale non riprodotta`);
  assert(Math.abs(evaluated.prudentProbabilityPct - leg.prudentProbabilityPct) <= 0.11, `${leg.selectionId}: P prudente non riprodotta`);
  assert(Math.abs(evaluated.fairOdds - leg.fairOdds) <= 0.02, `${leg.selectionId}: fair non riprodotta`);
  assert(Math.abs(evaluated.expectedValuePct - leg.expectedValuePct) <= 0.11, `${leg.selectionId}: EV non riprodotto`);
  assert.equal(evaluated.prudentProbabilityPct, Math.min(...evaluated.sensitivityProbabilityPct), `${leg.selectionId}: prudenza non basata sul minimo delle sensibilità`);
  homologous.push(leg.selectionId);
}
assert.equal(homologous.length, 4, "Devono essere riprodotte le quattro valutazioni B2 omologhe già serializzate");

const dnbRows = [];
for (const prediction of predictions) for (const row of prediction.marketComparison || []) {
  if (row.family !== "draw-no-bet") continue;
  const quote = quoteBySelectionId.get(String(row.providerSelectionId));
  const validation = validateCanonicalDnb({ prediction, row, market: quote.market, selection: quote.selection });
  assert(validation.valid, `${prediction.matchId}/${row.selection}: DNB non riprodotto`);
  assert.equal(validation.settlement.pushOutcome, "X");
  const naiveConditionalEv = (row.modelProbabilityPct / 100 * quote.selection.odds - 1) * 100;
  assert(Math.abs(naiveConditionalEv - row.expectedValuePct) > 0.2, `${prediction.matchId}/${row.selection}: l'EV DNB non deve essere trattato come mercato binario senza push`);
  dnbRows.push(row);
}
assert.equal(dnbRows.length, 20, "Devono essere verificati 20 DNB canonici");

const args = {
  predictionsData,
  odds,
  matches: read("data/normalized/matches.json"),
  schedinaSlips: normalized.slips,
  probableLineups: read("data/sources/probable-lineups-md6-2026-27.json"),
  officialLineups: read("data/sources/official-lineups-2026-27.json"),
  matchday: 6,
};
const first = buildMd06MarketCatalog(args);
const second = buildMd06MarketCatalog(args);
delete first.generatedAt;
delete second.generatedAt;
assert.deepEqual(first, second, "La rigenerazione del catalogo deve essere stabile a parità di input");

console.log(`OK score markets MD06: ${homologous.length} omologhi B2, ${dnbRows.length} DNB con push, matrici e predicati verificati`);
