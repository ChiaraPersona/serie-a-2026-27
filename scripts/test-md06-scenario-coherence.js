"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { buildMatchScenario, classifySelectionScenario, annotateCatalogMatches, pairRelation, CLASSIFICATIONS } = require("./md06-scenario-coherence");

const root = path.resolve(__dirname, "..");
const read = relative => JSON.parse(fs.readFileSync(path.join(root, relative), "utf8"));
const schedina = read("data/normalized/schedina-md06.json");
const predictionsData = read("data/normalized/predictions.json");
const predictions = predictionsData.predictions.filter(prediction => prediction.matchId.endsWith("-md-06"));
const predictionByMatch = new Map(predictions.map(prediction => [prediction.matchId, prediction]));
const catalog = schedina.marketCatalog;
const rows = catalog.matches.flatMap(match => match.selections);

assert.equal(catalog.schemaVersion, 2, "Il catalogo deve esporre lo scenario schema v2");
assert.equal(catalog.matches.length, 10, "Devono essere presenti dieci scenari partita");
assert.equal(rows.length, 383, "Nessuna selezione può essere rimossa");
assert.equal(new Set(rows.map(row => row.selectionId)).size, 383, "I selectionId devono restare unici");
assert(rows.every(row => row.scenarioAnalysis?.classification), "Ogni riga deve avere una classificazione scenario");

for (const match of catalog.matches) {
  const prediction = predictionByMatch.get(match.matchId);
  assert(prediction, `${match.matchId}: previsione V2 assente`);
  const rebuiltScenario = buildMatchScenario(prediction);
  assert.deepEqual({ ...match.scenario, classificationCounts: undefined }, { ...rebuiltScenario, classificationCounts: undefined }, `${match.matchId}: scenario non riproducibile`);
  assert(Math.abs(match.scenario.probabilitySumPct - 100) <= 0.01, `${match.matchId}: 1X2 non normalizzata`);
  assert.equal(match.scenario.prevalentOutcomes.length, 1, `${match.matchId}: scenario prevalente non univoco`);
  assert(match.scenario.modalExactScore?.score, `${match.matchId}: moda esatta assente`);
  assert.notEqual(match.scenario.modalExactScore, match.scenario.centralExactScore, `${match.matchId}: moda e risultato centrale devono essere oggetti distinti`);
  const count = Object.values(match.scenario.classificationCounts).reduce((sum, value) => sum + value, 0);
  assert.equal(count, match.total, `${match.matchId}: conteggi classificazione incompleti`);
}

const counts = rows.reduce((result, row) => ({ ...result, [row.scenarioAnalysis.classification]: (result[row.scenarioAnalysis.classification] || 0) + 1 }), {});
assert.deepEqual(counts, {
  [CLASSIFICATIONS.ALTERNATIVE]: 50,
  [CLASSIFICATIONS.COHERENT]: 20,
  [CLASSIFICATIONS.MULTI]: 297,
  [CLASSIFICATIONS.UNDETERMINED]: 16,
}, "Totali classificazione inattesi");

const unmodelled = rows.filter(row => row.betSelection?.evaluation?.status === "NOT_MODELLED");
assert.equal(unmodelled.length, 16);
assert(unmodelled.every(row => row.scenarioAnalysis.classification === CLASSIFICATIONS.UNDETERMINED), "NOT_MODELLED non deve ricevere una probabilità o classificazione assertiva");
assert(unmodelled.every(row => row.scenarioAnalysis.eventProbabilityPct === null), "NOT_MODELLED non deve ricevere probabilità inventate");

const genoa = catalog.matches.find(match => match.matchId.startsWith("genoa-fiorentina"));
assert.equal(genoa.scenario.prevalentOutcome, "2", "Genoa-Fiorentina deve avere 2 come scenario prevalente");
const genoaResults = genoa.selections.filter(row => row.betSelection?.market?.name === "1X2 ESITO FINALE");
assert.equal(genoaResults.find(row => row.selection === "2").scenarioAnalysis.classification, CLASSIFICATIONS.COHERENT);
assert(genoaResults.filter(row => row.selection !== "2").every(row => row.scenarioAnalysis.classification === CLASSIFICATIONS.ALTERNATIVE));
const genoaOver = genoa.selections.find(row => row.market === "UNDER/OVER" && row.selection === "OVER");
assert.equal(genoaOver.scenarioAnalysis.classification, CLASSIFICATIONS.MULTI, "Un Over non può diventare alternativo solo per l'esito 1X2");

const recomputed = annotateCatalogMatches({ catalogMatches: catalog.matches, predictions });
assert.deepEqual(recomputed, catalog.matches, "L'annotazione deve essere idempotente");

const homeResult = genoaResults.find(row => row.selection === "1");
const awayResult = genoaResults.find(row => row.selection === "2");
assert.equal(pairRelation(homeResult, awayResult).type, "MUTUALLY_EXCLUSIVE", "1 e 2 devono essere reciprocamente esclusivi");
const homeDnb = genoa.selections.find(row => row.betSelection?.market?.name === "DRAW NO BET" && row.selection === "1");
assert.equal(pairRelation(homeResult, homeDnb).type, "EQUIVALENT_OVERLAP", "Vittoria casa e DNB casa condividono lo stesso evento vincente");
assert.equal(pairRelation(awayResult, homeDnb).type, "MUTUALLY_EXCLUSIVE", "Vittoria ospite e DNB casa non possono vincere insieme");

const report = read("output/reports/serie-a-md06-scenario-coherence-2026-10-10.json");
assert.equal(report.invariants.quoteProbabilityEvOrderUnchanged, true);
assert.equal(report.numericalAudit.inconsistencies.length, 0);
assert.equal(report.numericalAudit.b2Checked, 203);
assert.equal(report.numericalAudit.canonical1x2Checked, 30);

console.log("OK coerenza scenario MD06: 10 partite, 383 selezioni, 20 coerenti, 50 alternative, 297 multi-scenario, 16 N/D");
