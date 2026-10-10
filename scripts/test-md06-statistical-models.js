"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {
  MARKET_MODELS,
  reconstructPriorSeason,
  countPmf,
  convolve,
  buildStatisticalModelArtifact,
} = require("./md06-statistical-models");

const root = path.resolve(__dirname, "..");
const read = relative => JSON.parse(fs.readFileSync(path.join(root, relative), "utf8"));
const artifact = read("data/analysis/serie-a-md06-statistical-models-2026-10-10.json");
const odds = read("data/normalized/odds/sisal/serie-a.json");

assert.equal(reconstructPriorSeason().length, 380, "Lo storico ricostruito deve contenere l'intera Serie A 2025/26");
assert.deepEqual(artifact.dataCoverage, { historicalMatches: 380, currentMatches: 50, historicalTeamPerformances: 760 });
assert.equal(artifact.validation.trainingMatches, 190);
assert.equal(artifact.validation.holdoutMatches, 190);

const subfamilies = Object.values(artifact.validation.subfamilies);
assert.equal(subfamilies.length, 9);
assert(subfamilies.every(row => row.matchClusters === 190 && row.gate === "PASS"), "Una sottofamiglia non supera il gate aggregato");
assert(subfamilies.every(row => Object.values(row.thresholds).some(threshold => threshold.gate === "PASS")), "Manca una soglia validata in una sottofamiglia promossa");

const poisson = countPmf(3.5, Infinity, 35);
const negativeBinomial = countPmf(12, 8, 70);
const total = convolve(poisson, negativeBinomial);
for (const [name, pmf] of [["Poisson", poisson], ["negative-binomial", negativeBinomial], ["convoluzione", total]]) {
  assert(Math.abs(pmf.reduce((sum, value) => sum + value, 0) - 1) < 1e-10, `${name}: massa non normalizzata`);
  assert(pmf.every(value => value >= 0 && value <= 1), `${name}: probabilita fuori dominio`);
}

const selectionToMarket = new Map(odds.events.flatMap(event => event.markets.flatMap(market => market.selections.map(selection => [String(selection.providerSelectionId), String(market.marketCode)]))));
const evaluations = Object.entries(artifact.evaluations);
assert.equal(evaluations.length, 676);
for (const [providerSelectionId, evaluation] of evaluations) {
  assert(MARKET_MODELS[selectionToMarket.get(providerSelectionId)], `${providerSelectionId}: mercato non autorizzato promosso`);
  assert.equal(evaluation.validation.gate, "PASS");
  assert.equal(evaluation.validation.exactThreshold.gate, "PASS");
  assert(evaluation.prudentProbabilityPct <= evaluation.modelProbabilityPct);
  assert(["Media", "Bassa"].includes(evaluation.reliability));
}

const rebuilt = buildStatisticalModelArtifact();
assert.deepEqual(rebuilt.validation, artifact.validation, "La validazione non e deterministica");
assert.deepEqual(rebuilt.evaluations, artifact.evaluations, "Le probabilita MD6 non sono deterministiche");
assert.match(artifact.blocked.playerShotsAndSot, /entrambi i tempi/);
assert.match(artifact.blocked.duo, /sostituto/);
assert.match(artifact.blocked.cards, /panchina/);

console.log("OK modelli statistici MD06: 380 gare storiche, holdout 190, 9 sottofamiglie e 676 quote valutate");
