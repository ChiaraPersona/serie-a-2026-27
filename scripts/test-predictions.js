"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "..");
const dataset = JSON.parse(fs.readFileSync(path.join(root, "data/normalized/predictions.json"), "utf8"));

assert.strictEqual(dataset.predictions.length, 10, "Il motore deve coprire le 10 gare con quote della prima giornata");
assert.strictEqual(dataset.engine.weights.market + dataset.engine.weights.historical + dataset.engine.weights.tactical + dataset.engine.weights.objectives, 1, "I pesi non sommano a 1");
assert(!JSON.stringify(dataset).toLowerCase().includes("meteo"), "Il meteo non deve entrare nel dataset del motore");
for (const prediction of dataset.predictions) {
  assert.strictEqual(prediction.engineVersion, dataset.engine.version, `${prediction.matchId}: deve usare la versione condivisa del motore`);
  const probabilities = Object.values(prediction.probabilities.final);
  assert(Math.abs(probabilities.reduce((total, value) => total + value, 0) - 100) <= 0.2, `${prediction.matchId}: probabilita non normalizzate`);
  assert(prediction.exactScores.length === 3 && new Set(prediction.exactScores.map(item => item.score)).size === 3, `${prediction.matchId}: risultati esatti non validi`);
  assert(["1", "X", "2"].includes(prediction.verdict.outcome), `${prediction.matchId}: verdetto non valido`);
  assert(prediction.surprise.value >= 0 && prediction.surprise.value <= 100, `${prediction.matchId}: fattore sorpresa fuori scala`);
  assert(prediction.confidence.value >= 0 && prediction.confidence.value <= 100, `${prediction.matchId}: confidenza fuori scala`);
  assert(prediction.market.valueCandidates.every(candidate => candidate.fairOdds > 1 && candidate.odds > 1), `${prediction.matchId}: quote non valide`);
}
console.log(`OK motore pronostici ${dataset.engine.version}: ${dataset.predictions.length} partite, meteo escluso, fattore sorpresa validato`);
