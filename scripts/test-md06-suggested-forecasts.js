"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { pairRelation } = require("./md06-scenario-coherence");
const { canonicalThresholdIdentity, compareInterest, conservativeExpectedValuePct } = require("./md06-suggested-forecasts");

const root = path.resolve(__dirname, "..");
const schedina = JSON.parse(fs.readFileSync(path.join(root, "data/normalized/schedina-md06.json"), "utf8"));
const report = JSON.parse(fs.readFileSync(path.join(root, "output/reports/serie-a-md06-definitive-selection-2026-10-10.json"), "utf8"));
const ui = fs.readFileSync(path.join(root, "js/pages/betting.js"), "utf8");
const rows = schedina.marketCatalog.matches.flatMap(match => match.selections);
const suggestions = rows.filter(leg => leg.suggestionAnalysis?.suggested);
const added = rows.filter(leg => leg.catalogOrigin === "statistical-b-not-modelled");

assert.equal(schedina.marketCatalog.schemaVersion, 4);
assert.equal(rows.length, 1446);
assert.equal(new Set(rows.map(leg => leg.selectionId)).size, rows.length);
assert.equal(added.length, 1063);
assert(added.every(leg => leg.coverageClassification === "B" && leg.betSelection.evaluation.status === "NOT_MODELLED"));
assert(!added.some(leg => leg.suggestionAnalysis.suggested), "NOT_MODELLED promosso nei pronostici");
assert.equal(suggestions.length, 12);
assert(suggestions.every(leg => leg.suggestionAnalysis.version === 2));
assert(suggestions.every(leg => leg.betSelection.evaluation.status !== "NOT_MODELLED"));
assert(suggestions.every(leg => Number.isFinite(leg.betSelection.quote.decimal) && leg.betSelection.quote.availability === "AVAILABLE_AT_SNAPSHOT"));
assert(suggestions.every(leg => Number(leg.betSelection.evaluation.expectedValuePct) >= 2));
assert(suggestions.every(leg => Number.isFinite(conservativeExpectedValuePct(leg))));
assert(suggestions.every(leg => ["Alta", "Media", "Bassa"].includes(leg.betSelection.operational.reliability.level)));
assert(!suggestions.some(leg => ["shots", "sot", "corners", "cards"].includes(leg.suggestionAnalysis.family)));
assert(suggestions.every(leg => !Object.hasOwn(leg.suggestionAnalysis, "motivation")), "Le motivazioni descrittive non devono essere serializzate");

for (const match of schedina.marketCatalog.matches) {
  const picks = match.selections.filter(leg => leg.suggestionAnalysis?.suggested).sort((left, right) => left.suggestionAnalysis.rank - right.suggestionAnalysis.rank);
  assert.deepEqual(picks.map(leg => leg.suggestionAnalysis.rank), picks.map((_, index) => index + 1), `${match.matchId}: ranking non contiguo`);
  assert.deepEqual([...picks].sort(compareInterest).map(leg => leg.selectionId), picks.map(leg => leg.selectionId), `${match.matchId}: ordinamento non deterministico`);
  const thresholdKeys = picks.map(canonicalThresholdIdentity).filter(Boolean);
  assert.equal(new Set(thresholdKeys).size, thresholdKeys.length, `${match.matchId}: più soglie della stessa identità canonica`);
  for (let left = 0; left < picks.length; left += 1) for (let right = left + 1; right < picks.length; right += 1) {
    assert(!["MUTUALLY_EXCLUSIVE", "EQUIVALENT_OVERLAP", "LOGICAL_IMPLICATION"].includes(pairRelation(picks[left], picks[right]).type), `${match.matchId}: coppia incompatibile o ridondante`);
  }
}

const torino = schedina.marketCatalog.matches.find(match => match.matchId === "torino-udinese-2026-27-md-06");
const torinoOvers = torino.selections.filter(leg => canonicalThresholdIdentity(leg) === "goals:match:over" && leg.betSelection.evaluation.status !== "NOT_MODELLED");
const selectedOver = torinoOvers.find(leg => leg.suggestionAnalysis.suggested);
assert.equal(selectedOver.label, "Over 2,5 gol", "Il caso rappresentativo deve scegliere la soglia intermedia");
assert.notEqual(Number(selectedOver.threshold), Math.min(...torinoOvers.map(leg => Number(leg.threshold))), "Scelta sistematica della soglia più bassa");
assert.notEqual(selectedOver.betSelection.quote.decimal, Math.max(...torinoOvers.map(leg => leg.betSelection.quote.decimal)), "Scelta sistematica della quota più alta");

const inter = schedina.marketCatalog.matches.find(match => match.matchId === "inter-parma-2026-27-md-06");
assert(!inter.selections.find(leg => leg.label === "Parma vincente").suggestionAnalysis.suggested);
assert(!suggestions.some(leg => leg.label === "Inter vincente") || !suggestions.some(leg => leg.label === "Parma vincente"));

assert(!ui.includes("Pronostici suggeriti"));
assert(!ui.includes("Tutti i mercati"));
assert(!ui.includes("data-market-mode="));
assert(!ui.includes("betting-suggestion-reason"));
assert(!ui.includes("P centrale"));
assert.match(ui, /Pronostici selezionati/);
assert.match(ui, /Quota Sisal/);
assert.match(ui, />EV</);

assert.equal(report.invariants.certifiedSelections, 383);
assert(report.invariants.certifiedSelectionIdsPreserved && report.invariants.certifiedContractsUnchanged);
assert.equal(report.invariants.catalogSelections, 1446);
assert.equal(report.coverage.previousSuggestions ?? report.coverage.comparison.previousSuggestions, 24);
assert.equal(report.coverage.totalSuggestions, 12);
assert.equal(report.statisticalMarkets.families.reduce((sum, row) => sum + row.selected, 0), 0);
assert(report.thresholdCases.some(item => item.canonicalIdentity === "goals:match:over" && item.alternatives.some(leg => leg.label === "Over 2,5 gol" && leg.selected)));

console.log("OK selezione definitiva MD06: catalogo 1446 invariato, 12 pronostici quotati/modellati, soglie canoniche e UI unica");
