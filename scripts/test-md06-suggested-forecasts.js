"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { pairRelation } = require("./md06-scenario-coherence");
const {
  assessSuggestion,
  canonicalThresholdIdentity,
  compareInterest,
  conservativeExpectedValuePct,
  interestTuple,
} = require("./md06-suggested-forecasts");

const root = path.resolve(__dirname, "..");
const read = relative => JSON.parse(fs.readFileSync(path.join(root, relative), "utf8"));
const sha256 = relative => crypto.createHash("sha256").update(fs.readFileSync(path.join(root, relative))).digest("hex");
const clone = value => JSON.parse(JSON.stringify(value));
const schedina = read("data/normalized/schedina-md06.json");
const report = read("output/reports/serie-a-md06-definitive-selection-2026-10-10.json");
const ui = fs.readFileSync(path.join(root, "js/pages/betting.js"), "utf8");
const rows = schedina.marketCatalog.matches.flatMap(match => match.selections);
const suggestions = rows.filter(leg => leg.suggestionAnalysis?.suggested);
const added = rows.filter(leg => String(leg.catalogOrigin || "").startsWith("statistical-"));
const validated = added.filter(leg => leg.catalogOrigin === "statistical-model-validated");
const blocked = added.filter(leg => leg.catalogOrigin === "statistical-b-not-modelled");

assert.equal(schedina.marketCatalog.schemaVersion, 4);
assert.equal(rows.length, 1446);
assert.equal(new Set(rows.map(leg => leg.selectionId)).size, rows.length);
assert.equal(added.length, 1063);
assert.equal(validated.length, 671);
assert.equal(blocked.length, 392);
assert(blocked.every(leg => leg.coverageClassification === "B" && leg.betSelection.evaluation.status === "NOT_MODELLED"));
assert(!blocked.some(leg => leg.suggestionAnalysis.suggested), "NOT_MODELLED promosso nei pronostici");
assert(validated.every(leg => leg.coverageClassification === "A" && leg.betSelection.evaluation.kind === "DISCRETE_COUNT_TEMPORAL_HOLDOUT"));
assert.equal(suggestions.length, 82);
assert.equal(suggestions.filter(leg => Number(leg.betSelection.evaluation.expectedValuePct) < 0).length, 70);
assert.equal(suggestions.filter(leg => Number(leg.betSelection.evaluation.expectedValuePct) < 2).length, 72);
assert(suggestions.every(leg => leg.suggestionAnalysis.version === 2));
assert(suggestions.every(leg => leg.suggestionAnalysis.criteria.includes("EV_INFORMATION_ONLY")));
assert(suggestions.every(leg => leg.betSelection.evaluation.status !== "NOT_MODELLED"));
assert(suggestions.every(leg => Number.isFinite(leg.betSelection.quote.decimal) && leg.betSelection.quote.availability === "AVAILABLE_AT_SNAPSHOT"));
assert(suggestions.every(leg => Number.isFinite(leg.betSelection.evaluation.modelProbabilityPct) && Number.isFinite(leg.betSelection.evaluation.prudentProbabilityPct)));
assert(suggestions.every(leg => Number.isFinite(conservativeExpectedValuePct(leg))));
assert(suggestions.every(leg => ["Alta", "Media", "Bassa"].includes(leg.betSelection.operational.reliability.level)));
assert(suggestions.some(leg => ["shots", "sot", "corners"].includes(leg.suggestionAnalysis.family)));
assert(!suggestions.some(leg => leg.suggestionAnalysis.family === "cards"));
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
assert.equal(report.invariants.catalogSelections, 1446);
assert.equal(report.coverage.comparison.previousSuggestions, 32);
assert.equal(report.coverage.totalSuggestions, 82);
assert.equal(report.coverage.negativeEvSuggestions, 70);
assert.equal(report.coverage.recoveredFromEconomicExclusion, 72);
assert.equal(report.statisticalMarkets.families.reduce((sum, row) => sum + row.selected, 0), 51);
assert(report.thresholdCases.some(item => ["shots", "sot", "corners"].some(family => item.canonicalIdentity.startsWith(`${family}:`)) && item.alternatives.some(leg => leg.selected)));

console.log("OK selezione MD06: 82 pronostici sportivi, 70 a EV negativo, EV fuori da ammissione e ranking, modelli invariati");
