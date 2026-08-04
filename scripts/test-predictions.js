"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "..");
const dataset = JSON.parse(fs.readFileSync(path.join(root, "data/normalized/predictions.json"), "utf8"));

assert.strictEqual(dataset.predictions.length, 10, "Il motore deve coprire le 10 gare con quote della prima giornata");
assert(!Object.hasOwn(dataset.engine.weights, "market"), "Le quote non devono entrare nei pesi del modello");
assert(Math.abs(Object.values(dataset.engine.weights).reduce((total, value) => total + value, 0) - 1) < 1e-9, "I pesi non sommano a 1");
assert(dataset.engine.weights.venueHistorical + dataset.engine.weights.overallHistorical + dataset.engine.weights.recentForm >= 0.8, "I dati storici devono guidare le lambda");
assert(dataset.engine.weights.probableLineup > dataset.engine.weights.objectives, "Le formazioni devono pesare piu degli obiettivi");
assert.strictEqual(dataset.engine.scoreModel.type, "poisson", "Il modello punteggi selezionato deve essere Poisson");
assert.strictEqual(dataset.engine.scoreModel.calibration, "none", "La calibrazione empirica monostagionale deve restare disattivata");
assert.strictEqual(dataset.engine.validation.multiSeason.decision.calibrationRecommendation, "adopt-poisson", "La scelta del modello deve seguire il backtest pluristagionale");
assert.strictEqual(dataset.engine.validation.multiSeason.decision.xgRecommendation, "adopt-xg-blend-25", "Il peso xG deve seguire il backtest pluristagionale");
assert.strictEqual(dataset.engine.promotedTeamModel.attackFactor, 0.51, "Fattore offensivo neopromosse non validato");
assert.strictEqual(dataset.engine.promotedTeamModel.defenceWeaknessFactor, 1.29, "Fattore difensivo neopromosse non validato");
assert(dataset.predictions.every(prediction => prediction.dataQuality.missing.some(item => item.includes("meteo"))), "Il meteo non verificabile deve essere dichiarato N/D");
for (const prediction of dataset.predictions) {
  assert.strictEqual(prediction.engineVersion, dataset.engine.version, `${prediction.matchId}: deve usare la versione condivisa del motore`);
  const probabilities = Object.values(prediction.probabilities.final);
  assert.strictEqual(Number(probabilities.reduce((total, value) => total + value, 0).toFixed(1)), 100, `${prediction.matchId}: probabilita 1X2 non esattamente normalizzate`);
  assert.deepStrictEqual(prediction.probabilities.final, prediction.probabilities.historical, `${prediction.matchId}: 1X2 e matrice punteggi devono condividere la stessa distribuzione`);
  assert(prediction.expectedGoals.components.home.lineup.resolved >= 0 && prediction.expectedGoals.components.away.lineup.resolved >= 0, `${prediction.matchId}: diagnostica probabili XI assente`);
  assert(["used", "fallback-goals"].includes(prediction.expectedGoals.components.xg.status), `${prediction.matchId}: diagnostica xG assente`);
  assert(prediction.headToHead.usedInModel && prediction.headToHead.sample >= 1 && prediction.headToHead.sample <= 5, `${prediction.matchId}: storico H2H non collegato`);
  assert(prediction.headToHead.home >= 0.95 && prediction.headToHead.home <= 1.05 && prediction.headToHead.away >= 0.95 && prediction.headToHead.away <= 1.05, `${prediction.matchId}: correttivo H2H oltre il limite del 5%`);
  assert(prediction.exactScores.length === 3 && new Set(prediction.exactScores.map(item => item.score)).size === 3, `${prediction.matchId}: risultati esatti non validi`);
  assert(prediction.scoreProfile.bands.length === 3 && Math.abs(prediction.scoreProfile.bands.reduce((total, band) => total + band.probabilityPct, 0) - 100) <= 0.2, `${prediction.matchId}: fasce gol non normalizzate`);
  assert(prediction.scoreProfile.topThreeCoveragePct < 60, `${prediction.matchId}: i punteggi modali non devono essere presentati come previsione quasi certa`);
  assert(prediction.modelValidation?.method === "walk-forward" && prediction.modelValidation.matches === 190, `${prediction.matchId}: backtest fuori campione assente`);
  assert(prediction.modelValidation.multiSeason?.matches >= 1000 && prediction.modelValidation.multiSeason.selectedScoreModel === "poisson", `${prediction.matchId}: validazione pluristagionale assente`);
  assert(prediction.modelValidation.openingRounds?.recommendation === "adopt-regularized-carry-over", `${prediction.matchId}: validazione avvio campionato assente`);
  if (prediction.expectedGoals.total >= 2.55) assert(prediction.exactScores.some(item => item.score.split("-").map(Number).reduce((total, value) => total + value, 0) >= 3), `${prediction.matchId}: scenario aperto assente nonostante il volume atteso`);
  assert(["1", "X", "2"].includes(prediction.verdict.outcome), `${prediction.matchId}: verdetto non valido`);
  assert(prediction.surprise.value >= 0 && prediction.surprise.value <= 100, `${prediction.matchId}: fattore sorpresa fuori scala`);
  assert(prediction.confidence.value >= 0 && prediction.confidence.value <= 100, `${prediction.matchId}: confidenza fuori scala`);
  assert(prediction.market.valueCandidates.every(candidate => candidate.fairOdds > 1 && candidate.odds > 1), `${prediction.matchId}: quote non valide`);
  assert(prediction.marketComparison.length >= 16, `${prediction.matchId}: confronto mercati incompleto`);
  assert(prediction.marketComparison.every(candidate => candidate.providerSelectionId && candidate.marketNoMarginPct !== null), `${prediction.matchId}: mercato senza quota disponibile o probabilita depurata`);
  assert(prediction.marketComparison.every(candidate => Math.abs(candidate.expectedValuePct - ((candidate.modelProbabilityPct / 100) * candidate.odds - 1) * 100) <= 1.5 || candidate.family === "draw-no-bet"), `${prediction.matchId}: valore atteso incoerente`);
  assert.strictEqual(prediction.scenarios.length, 3, `${prediction.matchId}: scenari incompleti`);
  assert(prediction.playerMarkets.status === "N/D", `${prediction.matchId}: i mercati giocatore non verificati devono restare N/D`);
  assert.strictEqual(prediction.teamProjections.length, 2, `${prediction.matchId}: proiezioni squadra incomplete`);
  for (const projection of prediction.teamProjections) {
    for (const metric of [projection.shotsTotal, projection.shotsOnTarget, projection.corners, projection.fouls, projection.cards].filter(Boolean)) assert(metric.min <= metric.central && metric.central <= metric.max, `${prediction.matchId}/${projection.teamId}: intervallo volume non valido`);
    const channelTotal = projection.attackChannels.left + projection.attackChannels.central + projection.attackChannels.right;
    assert(Math.abs(channelTotal - 100) <= 0.2, `${prediction.matchId}/${projection.teamId}: canali offensivi non normalizzati`);
  }
  assert.strictEqual(prediction.likelyBooked.length, 5, `${prediction.matchId}: servono cinque probabili ammoniti`);
  assert.strictEqual(prediction.likelyBooked.filter(candidate => candidate.possibleFirstBooked).length, 1, `${prediction.matchId}: serve un solo possibile primo ammonito`);
  assert.strictEqual(new Set(prediction.likelyBooked.map(candidate => candidate.teamId)).size, 2, `${prediction.matchId}: la gerarchia ammoniti deve rappresentare entrambe le squadre`);
  assert(prediction.mvpCandidate?.name && prediction.mvpCandidate?.teamId, `${prediction.matchId}: candidato MVP assente`);
}
const goalTotals = dataset.predictions.map(prediction => prediction.expectedGoals.total);
assert(Math.max(...goalTotals) >= 3 && Math.min(...goalTotals) <= 2.4, "Il motore non deve imporre sempre lo stesso profilo di gol");
const modalScores = dataset.predictions.map(prediction => prediction.exactScores[0].score);
assert(dataset.predictions.filter(prediction => prediction.expectedGoals.components.xg.status === "used").length >= 5, "Copertura xG insufficiente sulla prima giornata");
assert(new Set(modalScores).size >= 4, "I punteggi modali devono variare fra le partite");
assert(modalScores.filter(score => score === "1-1").length <= 4, "L'1-1 non deve dominare artificialmente la giornata");
console.log(`OK motore pronostici ${dataset.engine.version}: ${dataset.predictions.length} partite, dati mancanti dichiarati, fattore sorpresa validato`);
