"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "..");
const dataset = JSON.parse(fs.readFileSync(path.join(root, "data/normalized/predictions.json"), "utf8"));
const mvpHistory = JSON.parse(fs.readFileSync(path.join(root, "data/sources/player-mvp-history-2025-26.json"), "utf8"));
const myComboSource = JSON.parse(fs.readFileSync(path.join(root, "data/sources/mycombo-serie-a-2026-27-md-01.json"), "utf8"));

assert.strictEqual(dataset.predictions.length, 10, "Il motore deve coprire le 10 gare con quote della prima giornata");
assert.strictEqual(Object.keys(myComboSource.matches).length, 10, "Le MyCombo devono coprire tutte le 10 gare della prima giornata");
assert(!Object.hasOwn(dataset.engine.weights, "market"), "Le quote non devono entrare nei pesi del modello");
assert(Math.abs(Object.values(dataset.engine.weights).reduce((total, value) => total + value, 0) - 1) < 1e-9, "I pesi non sommano a 1");
assert(dataset.engine.weights.venueHistorical + dataset.engine.weights.overallHistorical + dataset.engine.weights.recentForm >= 0.8, "I dati storici devono guidare le lambda");
assert(dataset.engine.weights.probableLineup > dataset.engine.weights.objectives, "Le formazioni devono pesare piu degli obiettivi");
assert(Math.abs(Object.values(dataset.engine.mvpModel.weights).reduce((total, value) => total + value, 0) - 1) < 1e-9, "I pesi MVP non sommano a 1");
assert(mvpHistory.coverage.awards >= 370 && mvpHistory.coverage.completionPct >= 97, "Copertura MVP ufficiali insufficiente");
assert.strictEqual(dataset.engine.mvpModel.officialHistory.provider, "Lega Serie A", "Lo storico MVP deve usare la fonte ufficiale");
assert.strictEqual(dataset.engine.scoreModel.type, "poisson", "Il modello punteggi selezionato deve essere Poisson");
assert.strictEqual(dataset.engine.scoreModel.calibration, "none", "La calibrazione empirica monostagionale deve restare disattivata");
assert.strictEqual(dataset.engine.validation.multiSeason.decision.calibrationRecommendation, "adopt-poisson", "La scelta del modello deve seguire il backtest pluristagionale");
assert.strictEqual(dataset.engine.validation.multiSeason.decision.xgRecommendation, "adopt-xg-blend-25", "Il peso xG deve seguire il backtest pluristagionale");
assert.strictEqual(dataset.engine.promotedTeamModel.attackFactor, 0.51, "Fattore offensivo neopromosse non validato");
assert.strictEqual(dataset.engine.promotedTeamModel.defenceWeaknessFactor, 1.29, "Fattore difensivo neopromosse non validato");
assert(dataset.predictions.every(prediction => prediction.dataQuality.missing.some(item => item.includes("meteo"))), "Il meteo non verificabile deve essere dichiarato N/D");
assert(dataset.predictions.every(prediction => !prediction.dataQuality.missing.some(item => item.includes("indisponibili"))), "Il monitor indisponibili aggiornato deve raggiungere tutte le letture");
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
  assert(prediction.scoreForecast?.primary?.score && prediction.scoreForecast?.modal?.score && prediction.scoreForecast?.display?.length === 3, `${prediction.matchId}: gerarchia risultato assente`);
  assert.strictEqual(prediction.scoreForecast.primary.outcome, prediction.verdict.outcome, `${prediction.matchId}: risultato principale incoerente con il verdetto`);
  assert(prediction.scoreForecast.coherentWithVerdict, `${prediction.matchId}: coerenza risultato/verdetto non dichiarata`);
  assert.strictEqual(prediction.scoreForecast.forcedOutcomeScenarios, false, `${prediction.matchId}: scenario sorpresa forzato`);
  assert(!prediction.scoreForecast.display.some(item => /sorpresa/i.test(item.label)), `${prediction.matchId}: etichetta sorpresa nei risultati esatti`);
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
  const pricingErrors = prediction.recommendations.pricingErrors;
  assert(pricingErrors.length <= 3, `${prediction.matchId}: troppi errori di quota esposti`);
  assert(pricingErrors.every(error => error.odds > 3.5), `${prediction.matchId}: errore di quota non superiore a 3.50`);
  assert(pricingErrors.every(error => error.edgePct >= 5 && error.expectedValuePct >= 15 && error.conservativeExpectedValuePct > 0), `${prediction.matchId}: errore di quota non robusto`);
  assert(pricingErrors.every(error => error.family !== "player"), `${prediction.matchId}: mercato giocatore privo di frequenze partita-per-partita esposto come errore`);
  assert(!pricingErrors.length || prediction.dataQuality.completenessPct >= 72, `${prediction.matchId}: errore di quota esposto con dati incompleti`);
  assert(pricingErrors.every(error => error.pricingEligible !== false), `${prediction.matchId}: mercato a esiti sovrapposti esposto come errore`);
  assert(pricingErrors.every(error => error.scenarioCompatible === true), `${prediction.matchId}: errore di quota incoerente con il risultato pronosticato`);
  assert.strictEqual(new Set(pricingErrors.map(error => error.pricingMarketKey)).size, pricingErrors.length, `${prediction.matchId}: gli errori di quota devono appartenere a mercati diversi`);
  assert.strictEqual(new Set(pricingErrors.map(error => error.pricingThemeKey)).size, pricingErrors.length, `${prediction.matchId}: errori di quota semanticamente sovrapposti`);
  assert.strictEqual(prediction.scenarios.length, 3, `${prediction.matchId}: scenari incompleti`);
  const configuredMyCombo = Boolean(myComboSource.matches[prediction.matchId]);
  assert.strictEqual(prediction.playerMarkets.status, "available", `${prediction.matchId}: disponibilita mercati giocatore incoerente con lo snapshot`);
  if (configuredMyCombo) {
    assert.deepStrictEqual(prediction.combinations.map(combo => combo.tier), ["Safe", "Balanced", "Aggressive"], `${prediction.matchId}: profili MyCombo incompleti`);
    const portfolioSelectionIds = prediction.combinations.flatMap(combo => combo.legs.map(leg => leg.providerSelectionId));
    assert.strictEqual(new Set(portfolioSelectionIds).size, portfolioSelectionIds.length, `${prediction.matchId}: le tre MyCombo devono usare proposte diverse`);
    for (const combo of prediction.combinations) {
      assert(combo.legs.length >= 5, `${prediction.matchId}/${combo.tier}: numero gambe insufficiente`);
      assert(combo.legs.every(leg => leg.odds > 1 && leg.odds < 1.8), `${prediction.matchId}/${combo.tier}: ogni quota deve essere inferiore a 1.80`);
      assert.strictEqual(new Set(combo.legs.map(leg => leg.providerSelectionId)).size, combo.legs.length, `${prediction.matchId}/${combo.tier}: selectionId ripetuti`);
      assert.strictEqual(new Set(combo.legs.map(leg => leg.overlapKey)).size, combo.legs.length, `${prediction.matchId}/${combo.tier}: esiti sovrapponibili`);
      assert(Math.abs(combo.odds - combo.targetOdds) / combo.targetOdds <= 0.2, `${prediction.matchId}/${combo.tier}: quota combinata lontana dal target`);
      const product = combo.legs.reduce((total, leg) => total * leg.odds, 1);
      assert(Math.abs(combo.odds - product) < 0.011, `${prediction.matchId}/${combo.tier}: moltiplicazione quote incoerente`);
    }
  }
  assert.strictEqual(prediction.teamProjections.length, 2, `${prediction.matchId}: proiezioni squadra incomplete`);
  assert(prediction.matchProjection?.shotsTotal && prediction.matchProjection?.shotsOnTarget && prediction.matchProjection?.corners, `${prediction.matchId}: totale volumi assente`);
  for (const projection of prediction.teamProjections) {
    for (const metric of [projection.shotsTotal, projection.shotsOnTarget, projection.corners, projection.fouls, projection.cards].filter(Boolean)) assert(metric.min <= metric.central && metric.central <= metric.max, `${prediction.matchId}/${projection.teamId}: intervallo volume non valido`);
    const channelTotal = projection.attackChannels.left + projection.attackChannels.central + projection.attackChannels.right;
    assert(Math.abs(channelTotal - 100) <= 0.2, `${prediction.matchId}/${projection.teamId}: canali offensivi non normalizzati`);
    for (const metric of [projection.shotsTotal, projection.shotsOnTarget, projection.corners]) {
      assert.strictEqual(metric.interval, "p20-p80", `${prediction.matchId}/${projection.teamId}: intervallo volume non storico`);
      assert(metric.inputs.reduce((total, input) => total + input.weightPct, 0) >= 99.8, `${prediction.matchId}/${projection.teamId}: pesi volume non normalizzati`);
    }
  }
  for (const key of ["shotsTotal", "shotsOnTarget", "corners"]) assert(Math.abs(prediction.matchProjection[key].central - prediction.teamProjections.reduce((total, projection) => total + projection[key].central, 0)) <= 0.11, `${prediction.matchId}/${key}: totale non riconciliato`);
  assert.strictEqual(prediction.likelyBooked.length, 5, `${prediction.matchId}: servono cinque probabili ammoniti`);
  assert.strictEqual(prediction.likelyBooked.filter(candidate => candidate.possibleFirstBooked).length, 1, `${prediction.matchId}: serve un solo possibile primo ammonito`);
  assert.strictEqual(new Set(prediction.likelyBooked.map(candidate => candidate.teamId)).size, 2, `${prediction.matchId}: la gerarchia ammoniti deve rappresentare entrambe le squadre`);
  assert(prediction.mvpCandidate?.name && prediction.mvpCandidate?.teamId, `${prediction.matchId}: candidato MVP assente`);
  assert(prediction.mvpCandidate.score >= 0 && prediction.mvpCandidate.score <= 100, `${prediction.matchId}: indice MVP non valido`);
  assert.deepStrictEqual(Object.keys(prediction.mvpCandidate.components), Object.keys(dataset.engine.mvpModel.weights), `${prediction.matchId}: componenti MVP incomplete`);
  assert(["official", "N/D"].includes(prediction.mvpCandidate.mvpHistory.status), `${prediction.matchId}: storico MVP non dichiarato`);
  if (prediction.mvpCandidate.mvpHistory.status === "official") assert(Number.isInteger(prediction.mvpCandidate.mvpHistory.awards), `${prediction.matchId}: premi MVP ufficiali non numerici`);
  const homeWin = prediction.probabilities.final["1"] / 100;
  const awayWin = prediction.probabilities.final["2"] / 100;
  const favorite = homeWin >= awayWin ? { teamId: prediction.teamProjections[0].teamId, probability: homeWin, opponent: awayWin } : { teamId: prediction.teamProjections[1].teamId, probability: awayWin, opponent: homeWin };
  if (favorite.probability >= 0.5 && favorite.probability - favorite.opponent >= 0.15) assert.strictEqual(prediction.mvpCandidate.teamId, favorite.teamId, `${prediction.matchId}: MVP incoerente con favorita netta`);
}
const torinoMilan = dataset.predictions.find(prediction => prediction.matchId === "torino-milan-2026-27-md-01");
assert.strictEqual(torinoMilan.mvpCandidate.teamId, "milan", "Torino-Milan: il candidato MVP principale deve seguire il Milan favorito");
assert.strictEqual(torinoMilan.mvpCandidate.mvpHistory.sourceUrl, dataset.sources.find(source => source.label.includes("Player of the Match"))?.url, "Torino-Milan: disponibilità dello storico MVP non esposta");
if (torinoMilan.mvpCandidate.mvpHistory.status === "N/D") assert.strictEqual(torinoMilan.mvpCandidate.mvpHistory.awards, null, "Torino-Milan: premi MVP non disponibili inventati");
assert.strictEqual(torinoMilan.teamProjections[0].venue, "home", "Torino-Milan: Torino non usa il campione casa");
assert.strictEqual(torinoMilan.teamProjections[1].venue, "away", "Torino-Milan: Milan non usa il campione trasferta");
assert.strictEqual(torinoMilan.teamProjections[0].shotsTotal.inputs[0].source, "home-for", "Torino-Milan: produzione Torino casa non collegata");
assert.strictEqual(torinoMilan.teamProjections[1].shotsTotal.inputs[0].source, "away-for", "Torino-Milan: produzione Milan trasferta non collegata");
const goalTotals = dataset.predictions.map(prediction => prediction.expectedGoals.total);
assert(Math.max(...goalTotals) >= 3 && Math.min(...goalTotals) <= 2.4, "Il motore non deve imporre sempre lo stesso profilo di gol");
const modalScores = dataset.predictions.map(prediction => prediction.exactScores[0].score);
assert(dataset.predictions.filter(prediction => prediction.expectedGoals.components.xg.status === "used").length >= 5, "Copertura xG insufficiente sulla prima giornata");
assert(new Set(modalScores).size >= 4, "I punteggi modali devono variare fra le partite");
assert(modalScores.filter(score => score === "1-1").length <= 4, "L'1-1 non deve dominare artificialmente la giornata");
console.log(`OK motore pronostici ${dataset.engine.version}: ${dataset.predictions.length} partite, dati mancanti dichiarati, fattore sorpresa validato`);
