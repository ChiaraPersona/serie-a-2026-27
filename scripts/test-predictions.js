"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "..");
const dataset = JSON.parse(fs.readFileSync(path.join(root, "data/normalized/predictions.json"), "utf8"));

assert.strictEqual(dataset.predictions.length, 10, "Il motore deve coprire le 10 gare con quote della prima giornata");
assert(Math.abs(dataset.engine.weights.market + dataset.engine.weights.historical + dataset.engine.weights.tactical + dataset.engine.weights.objectives - 1) < 1e-9, "I pesi non sommano a 1");
assert(dataset.engine.weights.market < 0.5, "Le quote non devono essere il segnale dominante assoluto");
assert(dataset.engine.weights.historical + dataset.engine.weights.tactical >= 0.5, "Storico e tattica devono pesare almeno quanto meta modello");
assert(!JSON.stringify(dataset).toLowerCase().includes("meteo"), "Il meteo non deve entrare nel dataset del motore");
for (const prediction of dataset.predictions) {
  assert.strictEqual(prediction.engineVersion, dataset.engine.version, `${prediction.matchId}: deve usare la versione condivisa del motore`);
  const probabilities = Object.values(prediction.probabilities.final);
  assert(Math.abs(probabilities.reduce((total, value) => total + value, 0) - 100) <= 0.2, `${prediction.matchId}: probabilita non normalizzate`);
  assert(prediction.exactScores.length === 3 && new Set(prediction.exactScores.map(item => item.score)).size === 3, `${prediction.matchId}: risultati esatti non validi`);
  if (prediction.expectedGoals.blendedTotal >= 2.55) assert(prediction.exactScores.some(item => item.score.split("-").map(Number).reduce((total, value) => total + value, 0) >= 3), `${prediction.matchId}: scenario aperto assente nonostante il volume atteso`);
  assert(["1", "X", "2"].includes(prediction.verdict.outcome), `${prediction.matchId}: verdetto non valido`);
  assert(prediction.surprise.value >= 0 && prediction.surprise.value <= 100, `${prediction.matchId}: fattore sorpresa fuori scala`);
  assert(prediction.confidence.value >= 0 && prediction.confidence.value <= 100, `${prediction.matchId}: confidenza fuori scala`);
  assert(prediction.market.valueCandidates.every(candidate => candidate.fairOdds > 1 && candidate.odds > 1), `${prediction.matchId}: quote non valide`);
  assert.strictEqual(prediction.teamProjections.length, 2, `${prediction.matchId}: proiezioni squadra incomplete`);
  for (const projection of prediction.teamProjections) {
    for (const metric of [projection.shotsTotal, projection.shotsOnTarget, projection.corners]) assert(metric.min <= metric.central && metric.central <= metric.max, `${prediction.matchId}/${projection.teamId}: intervallo volume non valido`);
    const channelTotal = projection.attackChannels.left + projection.attackChannels.central + projection.attackChannels.right;
    assert(Math.abs(channelTotal - 100) <= 0.2, `${prediction.matchId}/${projection.teamId}: canali offensivi non normalizzati`);
  }
  assert.strictEqual(prediction.likelyBooked.length, 5, `${prediction.matchId}: servono cinque probabili ammoniti`);
  assert.strictEqual(prediction.likelyBooked.filter(candidate => candidate.possibleFirstBooked).length, 1, `${prediction.matchId}: serve un solo possibile primo ammonito`);
  assert.strictEqual(new Set(prediction.likelyBooked.map(candidate => candidate.teamId)).size, 2, `${prediction.matchId}: la gerarchia ammoniti deve rappresentare entrambe le squadre`);
  assert(prediction.mvpCandidate?.name && prediction.mvpCandidate?.teamId, `${prediction.matchId}: candidato MVP assente`);
}
const goalTotals = dataset.predictions.map(prediction => prediction.expectedGoals.blendedTotal);
assert(Math.max(...goalTotals) >= 3 && Math.min(...goalTotals) <= 2.4, "Il motore non deve imporre sempre lo stesso profilo di gol");
console.log(`OK motore pronostici ${dataset.engine.version}: ${dataset.predictions.length} partite, meteo escluso, fattore sorpresa validato`);
