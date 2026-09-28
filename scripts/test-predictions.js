"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { opponentAbilityToExploit, teamProfilePlayerModifier, teamOffensiveAllocation, applyOpponentTeamVolumeInteraction, playerBaselineStability, expectedDefensiveExposureFactor } = require("./predictions/engine");
const root = path.resolve(__dirname, "..");
const dataset = JSON.parse(fs.readFileSync(path.join(root, "data/normalized/predictions.json"), "utf8"));
const archivedMd1 = JSON.parse(fs.readFileSync(path.join(root, "data/sources/prediction-archive-md1-2026-27.json"), "utf8"));
const mvpHistory = JSON.parse(fs.readFileSync(path.join(root, "data/sources/player-mvp-history-2025-26.json"), "utf8"));
const myComboSource = JSON.parse(fs.readFileSync(path.join(root, "data/sources/mycombo-serie-a-2026-27-md-01.json"), "utf8"));
const myComboMd2Path = path.join(root, "data/sources/mycombo-serie-a-2026-27-md-02.json");
const myComboMd2Source = fs.existsSync(myComboMd2Path) ? JSON.parse(fs.readFileSync(myComboMd2Path, "utf8")) : { matches: {} };
const myComboMd3Path = path.join(root, "data/sources/mycombo-serie-a-2026-27-md-03.json");
const myComboMd3Source = fs.existsSync(myComboMd3Path) ? JSON.parse(fs.readFileSync(myComboMd3Path, "utf8")) : { matches: {} };
const myComboMd4Path = path.join(root, "data/sources/mycombo-serie-a-2026-27-md-04.json");
const myComboMd4Source = fs.existsSync(myComboMd4Path) ? JSON.parse(fs.readFileSync(myComboMd4Path, "utf8")) : { matches: {} };
const myComboMd5Path = path.join(root, "data/sources/mycombo-serie-a-2026-27-md-05.json");
const myComboMd5Source = fs.existsSync(myComboMd5Path) ? JSON.parse(fs.readFileSync(myComboMd5Path, "utf8")) : { matches: {} };
const allMyComboMatches = { ...myComboSource.matches, ...myComboMd2Source.matches, ...myComboMd3Source.matches, ...myComboMd4Source.matches, ...myComboMd5Source.matches };
const officialLineups = JSON.parse(fs.readFileSync(path.join(root, "data/sources/official-lineups-2026-27.json"), "utf8"));
const identityAliases = JSON.parse(fs.readFileSync(path.join(root, "data/sources/player-identity-aliases-2026-27.json"), "utf8"));
const previewMd3Path = path.join(root, "data/generated/prediction-preview-md03-2026-27.json");
const cleanName = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
const identitiesById = new Map(identityAliases.players.map(player => [`${player.teamId}:${player.playerId}`, player]));
const officialStartersByMatch = new Map(officialLineups.fixtures.map(fixture => [fixture.matchId, new Set(fixture.teams.flatMap(team => team.players.flatMap(player => {
  const identity = identitiesById.get(`${team.teamId}:${player.playerId}`);
  return [player.currentName, player.sourceName, identity?.canonicalName, ...(identity?.aliases || [])].filter(Boolean).map(cleanName);
})))]));

if (fs.existsSync(previewMd3Path)) {
  const previewMd3 = JSON.parse(fs.readFileSync(previewMd3Path, "utf8"));
  assert.strictEqual(previewMd3.mode, "exploratory-preview", "La MD3 deve restare un'anteprima esplorativa");
  assert.strictEqual(previewMd3.publicationStatus, "not-published", "La MD3 esplorativa non deve risultare pubblicata");
  assert.strictEqual(previewMd3.matchday, 3, "Giornata anteprima errata");
  assert.strictEqual(previewMd3.predictions.length, 10, "L'anteprima MD3 deve contenere dieci partite");
  assert(previewMd3.predictions.every(prediction => prediction.decisionSupport?.version === "1.0.0"), "L'anteprima MD3 deve usare il nuovo livello decisionale");
  assert(previewMd3.predictions.every(prediction => prediction.matchId.endsWith("-md-03")), "L'anteprima MD3 contiene altre giornate");
  assert(previewMd3.predictions.every(prediction => prediction.market.status === "unavailable" && prediction.probabilities.marketNoMargin === null), "L'anteprima MD3 non deve inventare quote");
}

assert.strictEqual(dataset.predictions.length, 49, "Il motore deve conservare le giornate precedenti e coprire la quinta giornata di Serie A");
const firstMatchdayPredictions = dataset.predictions.filter(prediction => prediction.matchId.endsWith("-md-01"));
const secondMatchdayPredictions = dataset.predictions.filter(prediction => prediction.matchId.endsWith("-md-02"));
const fourthMatchdayPredictions = dataset.predictions.filter(prediction => prediction.matchId.endsWith("-md-04"));
const fifthMatchdayPredictions = dataset.predictions.filter(prediction => prediction.matchId.endsWith("-md-05"));
const sixthMatchdayPredictions = dataset.predictions.filter(prediction => prediction.matchId.endsWith("-md-06"));
const romaInterPrediction = fifthMatchdayPredictions.find(prediction => prediction.matchId === "roma-inter-2026-27-md-05");
const cupPredictions = dataset.predictions.filter(prediction => prediction.matchId.startsWith("r16-"));
assert.strictEqual(firstMatchdayPredictions.length, 10, "Devono restare disponibili i 10 pronostici archiviati della prima giornata");
assert.strictEqual(secondMatchdayPredictions.length, 10, "Devono essere disponibili i 10 pronostici tecnici della seconda giornata");
assert.strictEqual(fourthMatchdayPredictions.length, 9, "Devono restare disponibili i 9 pronostici tecnici pre-partita della quarta giornata");
assert.strictEqual(fifthMatchdayPredictions.length, 10, "Devono essere disponibili i 10 pronostici tecnici della quinta giornata");
assert.strictEqual(sixthMatchdayPredictions.length, 10, "Dopo la chiusura della quinta giornata devono essere disponibili i 10 pronostici preliminari della sesta");
assert.deepStrictEqual(
  [romaInterPrediction.expectedGoals.components.home.lineup.resolved, romaInterPrediction.expectedGoals.components.away.lineup.resolved],
  [11, 11],
  "Roma-Inter deve risolvere tutti i titolari ufficiali, incluse le abbreviazioni dei due Martinez"
);
assert(fifthMatchdayPredictions.every(prediction => prediction.shooters?.totalShots?.length === 5 && prediction.shooters?.shotsOnTarget?.length === 5), "Tutte le dieci letture della quinta giornata devono avere cinque tiratori per tiri totali e tiri in porta");
assert.strictEqual(cupPredictions.length, 0, "I pronostici delle Letture di Coppa rimosse non devono essere rigenerati");
assert.deepStrictEqual(firstMatchdayPredictions.map(({ decisionSupport, ...prediction }) => prediction), archivedMd1.predictions, "Il nucleo dei pronostici conclusi MD1 deve restare identico allo snapshot pubblicato");
assert.strictEqual(Object.keys(myComboSource.matches).length, 10, "Le MyCombo devono coprire tutte le 10 gare della prima giornata");
if (fs.existsSync(myComboMd2Path)) assert.strictEqual(Object.keys(myComboMd2Source.matches).length, 10, "Le MyCombo devono coprire tutte le 10 gare della seconda giornata");
if (fs.existsSync(myComboMd3Path)) assert.strictEqual(Object.keys(myComboMd3Source.matches).length, 10, "Le MyCombo devono coprire tutte le 10 gare della terza giornata");
if (fs.existsSync(myComboMd4Path)) assert.strictEqual(Object.keys(myComboMd4Source.matches).length, 9, "Le MyCombo MD4 devono coprire le nove gare ancora aperte");
if (fs.existsSync(myComboMd5Path)) assert.strictEqual(Object.keys(myComboMd5Source.matches).length, 10, "Le MyCombo MD5 devono coprire tutte le dieci gare");
assert(!Object.hasOwn(dataset.engine.weights, "market"), "Le quote non devono entrare nei pesi del modello");
assert(Math.abs(Object.values(dataset.engine.weights).reduce((total, value) => total + value, 0) - 1) < 1e-9, "I pesi non sommano a 1");
assert(dataset.engine.weights.venueHistorical + dataset.engine.weights.overallHistorical + dataset.engine.weights.recentForm >= 0.8, "I dati storici devono guidare le lambda");
assert(dataset.engine.weights.probableLineup > dataset.engine.weights.objectives, "Le formazioni devono pesare piu degli obiettivi");
assert(Math.abs(Object.values(dataset.engine.mvpModel.weights).reduce((total, value) => total + value, 0) - 1) < 1e-9, "I pesi MVP non sommano a 1");
assert(mvpHistory.coverage.awards >= 370 && mvpHistory.coverage.completionPct >= 97, "Copertura MVP ufficiali insufficiente");
assert.strictEqual(dataset.engine.mvpModel.officialHistory.provider, "Lega Serie A", "Lo storico MVP deve usare la fonte ufficiale");
assert.strictEqual(dataset.engine.scoreModel.type, "poisson", "Il modello punteggi selezionato deve essere Poisson");
assert.strictEqual(dataset.engine.scoreModel.calibration, "none", "La calibrazione empirica monostagionale deve restare disattivata");
assert.strictEqual(dataset.engine.decisionLayer.version, "1.0.0", "Versione del livello decisionale assente");
assert.deepStrictEqual(Object.keys(dataset.engine.decisionLayer.profileLimits), ["Safe", "Balanced", "Aggressive"], "Profili di rischio incompleti");
assert.strictEqual(dataset.engine.validation.multiSeason.decision.calibrationRecommendation, "adopt-poisson", "La scelta del modello deve seguire il backtest pluristagionale");
assert.strictEqual(dataset.engine.validation.multiSeason.decision.xgRecommendation, "adopt-xg-blend-25", "Il peso xG deve seguire il backtest pluristagionale");
assert.strictEqual(dataset.engine.promotedTeamModel.attackFactor, 0.51, "Fattore offensivo neopromosse non validato");
assert.strictEqual(dataset.engine.promotedTeamModel.defenceWeaknessFactor, 1.29, "Fattore difensivo neopromosse non validato");
assert(dataset.predictions.every(prediction => prediction.dataQuality.missing.some(item => item.includes("meteo"))), "Il meteo non verificabile deve essere dichiarato N/D");
assert(dataset.predictions.filter(prediction => !prediction.matchId.endsWith("-md-06")).every(prediction => !prediction.dataQuality.missing.some(item => item.includes("indisponibili"))), "Il monitor indisponibili aggiornato deve raggiungere tutte le letture archiviate fino alla quinta giornata");
for (const prediction of dataset.predictions) {
  if (["-md-05", "-md-06"].some(suffix => prediction.matchId.endsWith(suffix))) assert.strictEqual(prediction.engineVersion, dataset.engine.version, `${prediction.matchId}: deve usare la versione corrente del motore`);
  else if (prediction.matchId.endsWith("-md-04")) assert.strictEqual(prediction.engineVersion, "4.12.0", `${prediction.matchId}: lo snapshot MD4 deve conservare la propria versione`);
  else assert.strictEqual(prediction.engineVersion, "4.11.0", `${prediction.matchId}: lo snapshot archiviato deve conservare la propria versione`);
  const probabilities = Object.values(prediction.probabilities.final);
  assert.strictEqual(Number(probabilities.reduce((total, value) => total + value, 0).toFixed(1)), 100, `${prediction.matchId}: probabilita 1X2 non esattamente normalizzate`);
  assert.deepStrictEqual(prediction.probabilities.final, prediction.probabilities.historical, `${prediction.matchId}: 1X2 e matrice punteggi devono condividere la stessa distribuzione`);
  assert(prediction.expectedGoals.components.home.lineup.resolved >= 0 && prediction.expectedGoals.components.away.lineup.resolved >= 0, `${prediction.matchId}: diagnostica probabili XI assente`);
  assert(["used", "fallback-goals"].includes(prediction.expectedGoals.components.xg.status), `${prediction.matchId}: diagnostica xG assente`);
  assert(prediction.headToHead.usedInModel && prediction.headToHead.sample >= 1 && prediction.headToHead.sample <= 5, `${prediction.matchId}: storico H2H non collegato`);
  assert(prediction.headToHead.home >= 0.95 && prediction.headToHead.home <= 1.05 && prediction.headToHead.away >= 0.95 && prediction.headToHead.away <= 1.05, `${prediction.matchId}: correttivo H2H oltre il limite del 5%`);
  assert(prediction.exactScores.length === 3 && new Set(prediction.exactScores.map(item => item.score)).size === 3, `${prediction.matchId}: risultati esatti non validi`);
  assert(prediction.scoreForecast?.primary?.score && prediction.scoreForecast?.modal?.score && prediction.scoreForecast?.display?.length === 3, `${prediction.matchId}: gerarchia risultato assente`);
  if (["-md-04", "-md-05"].some(suffix => prediction.matchId.endsWith(suffix))) {
    assert.strictEqual(prediction.scoreForecast.primary.label, "Risultato esatto centrale", `${prediction.matchId}: risultato centrale non dichiarato`);
    assert.strictEqual(prediction.scoreForecast.selection?.type, "rounded-expected-goals", `${prediction.matchId}: selettore del risultato centrale assente`);
    assert.strictEqual(prediction.scoreForecast.primary.score, `${Math.round(prediction.expectedGoals.home)}-${Math.round(prediction.expectedGoals.away)}`, `${prediction.matchId}: risultato centrale non coerente con i gol attesi`);
    assert.match(prediction.scoreForecast.method, /gol attesi delle due squadre/, `${prediction.matchId}: metodo del risultato centrale non dichiarato`);
  }
  assert.strictEqual(prediction.scoreForecast.coherentWithVerdict, prediction.scoreForecast.primary.outcome === prediction.verdict.outcome, `${prediction.matchId}: indicatore di coerenza risultato/verdetto errato`);
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
  if (prediction.market.status === "available") {
    assert(prediction.market.valueCandidates.every(candidate => candidate.fairOdds > 1 && candidate.odds > 1), `${prediction.matchId}: quote non valide`);
    assert(prediction.marketComparison.length >= 16, `${prediction.matchId}: confronto mercati incompleto`);
    assert(prediction.marketComparison.every(candidate => candidate.providerSelectionId && candidate.marketNoMarginPct !== null), `${prediction.matchId}: mercato senza quota disponibile o probabilita depurata`);
    assert(prediction.marketComparison.every(candidate => Math.abs(candidate.expectedValuePct - ((candidate.modelProbabilityPct / 100) * candidate.odds - 1) * 100) <= 1.5 || candidate.family === "draw-no-bet"), `${prediction.matchId}: valore atteso incoerente`);
  } else {
    assert.strictEqual(prediction.probabilities.marketNoMargin, null, `${prediction.matchId}: probabilita di mercato inventate`);
    assert.strictEqual(prediction.marketComparison.length, 0, `${prediction.matchId}: confronto mercato presente senza quote`);
    assert.strictEqual(prediction.market.valueCandidates.length, 0, `${prediction.matchId}: value bet presente senza quote`);
    assert(prediction.dataQuality.missing.includes("quote 1X2 verificate"), `${prediction.matchId}: assenza quote non dichiarata`);
  }
  const removedRecommendationKey = ["pricing", "Errors"].join("");
  assert(!Object.hasOwn(prediction.recommendations, removedRecommendationKey), `${prediction.matchId}: campo raccomandazioni rimosso ancora presente`);
  assert.strictEqual(prediction.scenarios.length, 3, `${prediction.matchId}: scenari incompleti`);
  assert.strictEqual(prediction.decisionSupport?.version, dataset.engine.decisionLayer.version, `${prediction.matchId}: livello decisionale non allineato`);
  assert.strictEqual(prediction.decisionSupport.scenario.scenarios.length, 3, `${prediction.matchId}: scenari quantitativi incompleti`);
  assert(Math.abs(prediction.decisionSupport.scenario.scenarios.reduce((total, scenario) => total + scenario.estimatedProbabilityPct, 0) - 100) <= 0.2, `${prediction.matchId}: probabilita scenari non normalizzate`);
  assert(prediction.decisionSupport.correlationGraph.summary && Array.isArray(prediction.decisionSupport.correlationGraph.edges), `${prediction.matchId}: grafo correlazioni assente`);
  const configuredMyCombo = Boolean(allMyComboMatches[prediction.matchId]);
  assert.strictEqual(prediction.playerMarkets.status, prediction.market.status === "available" ? "available" : "N/D", `${prediction.matchId}: disponibilita mercati giocatore incoerente con lo snapshot`);
  if (configuredMyCombo) {
    assert.deepStrictEqual(prediction.combinations.map(combo => combo.tier), ["Safe", "Balanced", "Aggressive"], `${prediction.matchId}: profili MyCombo incompleti`);
    for (const combo of prediction.combinations) {
      const riskAssessment = prediction.decisionSupport.portfolios.find(portfolio => portfolio.tier === combo.tier);
      assert(riskAssessment && typeof riskAssessment.allowed === "boolean", `${prediction.matchId}/${combo.tier}: controllo rischio assente`);
      const configuredSource = myComboMd5Source.matches[prediction.matchId] ? myComboMd5Source : myComboMd4Source.matches[prediction.matchId] ? myComboMd4Source : myComboMd3Source.matches[prediction.matchId] ? myComboMd3Source : myComboMd2Source.matches[prediction.matchId] ? myComboMd2Source : myComboSource;
      const limits = configuredSource.constraints.tierLimits[combo.tier];
      const informationalRisk = configuredSource.constraints.riskPolicy === "informativa";
      if (combo.qualityStatus === "nd") {
        assert.strictEqual(combo.legs.length, 0, `${prediction.matchId}/${combo.tier}: un profilo N/D non deve occupare spazio con gambe`);
        assert(combo.unavailableReason, `${prediction.matchId}/${combo.tier}: motivazione N/D assente`);
        continue;
      }
      assert(combo.legs.length >= limits.minimum && combo.legs.length <= limits.maximum, `${prediction.matchId}/${combo.tier}: numero gambe fuori limite`);
      const minimumLegOdds = configuredSource.constraints.minLegOddsInclusive ?? 1;
      const maximumLegOdds = configuredSource.constraints.maxLegOddsInclusive ?? configuredSource.constraints.maxLegOddsExclusive ?? 1.8;
      assert(combo.legs.every(leg => leg.odds >= minimumLegOdds && (configuredSource.constraints.maxLegOddsInclusive != null ? leg.odds <= maximumLegOdds : leg.odds < maximumLegOdds)), `${prediction.matchId}/${combo.tier}: quota individuale fuori limite`);
      assert.strictEqual(new Set(combo.legs.map(leg => leg.providerSelectionId)).size, combo.legs.length, `${prediction.matchId}/${combo.tier}: selectionId ripetuti`);
      assert.strictEqual(new Set(combo.legs.map(leg => leg.overlapKey)).size, combo.legs.length, `${prediction.matchId}/${combo.tier}: mercati ripetuti o esiti sovrapponibili`);
      if (configuredSource.constraints.semanticOverlapPolicy) {
        const semanticKeys = combo.legs.flatMap(leg => leg.semanticKeys || []);
        assert.strictEqual(new Set(semanticKeys).size, semanticKeys.length, `${prediction.matchId}/${combo.tier}: scenari di base ripetuti o annidati`);
      }
      if (configuredSource.constraints.quotaPolicy !== "orientativa") {
        assert(Math.abs(combo.odds - combo.targetOdds) / combo.targetOdds <= configuredSource.constraints.targetTolerancePct / 100, `${prediction.matchId}/${combo.tier}: quota combinata lontana dal target`);
      } else {
        assert.strictEqual(combo.quotaPolicy, "orientativa", `${prediction.matchId}/${combo.tier}: riferimento quota non dichiarato come orientativo`);
      }
      const product = combo.legs.reduce((total, leg) => total * leg.odds, 1);
      assert(Math.abs(combo.odds - product) < 0.011, `${prediction.matchId}/${combo.tier}: moltiplicazione quote incoerente`);
      if (informationalRisk && !Number.isFinite(combo.prudentProbabilityPct)) {
        assert(String(combo.probabilityStatus).startsWith("N/D"), `${prediction.matchId}/${combo.tier}: indisponibilita delle metriche non dichiarata`);
      } else {
        assert(Number.isFinite(combo.prudentProbabilityPct) && Number.isFinite(combo.fairOdds) && Number.isFinite(combo.prudentExpectedValuePct), `${prediction.matchId}/${combo.tier}: metriche prudenziali mancanti`);
        assert(combo.weakestLeg?.label, `${prediction.matchId}/${combo.tier}: gamba fragile non identificata`);
      }
      assert(!combo.legs.some(leg => /falli (?:commessi|subiti).*sostituto incluso/i.test(leg.label)), `${prediction.matchId}/${combo.tier}: i mercati falli non includono il sostituto`);
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
  const officialStarters = officialStartersByMatch.get(prediction.matchId);
  if (officialStarters) assert(prediction.likelyBooked.every(candidate => officialStarters.has(cleanName(candidate.name))), `${prediction.matchId}: probabile ammonito fuori dall'XI ufficiale`);
  if (officialStarters && prediction.shooters) assert([...prediction.shooters.totalShots, ...prediction.shooters.shotsOnTarget].every(candidate => officialStarters.has(cleanName(candidate.lineupName))), `${prediction.matchId}: tiratore fuori dall'XI ufficiale`);
  if (prediction.playerMarketModelVersion === 2) {
    assert.strictEqual(prediction.shooters.allPlayers.length, 20, `${prediction.matchId}: V2 deve proiettare i dieci giocatori di movimento per squadra`);
    assert(prediction.shooters.outsiders.length <= 5, `${prediction.matchId}: ranking outsider oltre il limite espositivo`);
    for (const candidate of prediction.shooters.allPlayers) {
      assert(candidate.matchupFactor >= 0.82 && candidate.matchupFactor <= 1.18, `${prediction.matchId}/${candidate.name}: matchup fuori bound`);
      assert(candidate.teamProfileMatchupFactor >= 1 && candidate.teamProfileMatchupFactor <= 1.04, `${prediction.matchId}/${candidate.name}: profilo squadra troppo aggressivo`);
      assert(candidate.teamProfileShotsOnTargetMatchupFactor >= 1 && candidate.teamProfileShotsOnTargetMatchupFactor <= 1.04, `${prediction.matchId}/${candidate.name}: profilo SOT squadra troppo aggressivo`);
      const allocationFactor = candidate.playerAllocationFactor ?? 1;
      assert(allocationFactor >= 0.84 && allocationFactor <= 1.16, `${prediction.matchId}/${candidate.name}: allocation factor fuori bound`);
      assert(candidate.shotsMatchupFactor >= 0.82 && candidate.shotsMatchupFactor <= 1.18, `${prediction.matchId}/${candidate.name}: matchup tiri fuori bound`);
      assert(candidate.shotsOnTargetMatchupFactor >= 0.82 && candidate.shotsOnTargetMatchupFactor <= 1.18, `${prediction.matchId}/${candidate.name}: matchup SOT fuori bound`);
      assert(candidate.expectedMinutes >= 55 && candidate.expectedMinutes <= 90, `${prediction.matchId}/${candidate.name}: minuti attesi non validi`);
      assert(["low", "medium", "high"].includes(candidate.substitutionRisk), `${prediction.matchId}/${candidate.name}: rischio sostituzione non valido`);
      assert(candidate.projectedShotsOnTarget <= candidate.projectedShots + 0.001, `${prediction.matchId}/${candidate.name}: SOT sopra i tiri`);
      const shots = candidate.shotProbabilities;
      const sot = candidate.shotOnTargetProbabilities;
      assert(Object.values({ ...shots, ...sot }).every(value => value >= 0 && value <= 1), `${prediction.matchId}/${candidate.name}: probabilita fuori scala`);
      assert(shots.over05 >= shots.over15 && shots.over15 >= shots.over25, `${prediction.matchId}/${candidate.name}: soglie tiri non monotone`);
      assert(sot.over05 >= sot.over15, `${prediction.matchId}/${candidate.name}: soglie SOT non monotone`);
      if (candidate.teamProfileMatchupFactor > 1) {
        assert(candidate.teamId !== "atalanta", `${prediction.matchId}/${candidate.name}: Atalanta non deve applicare a se stessa la propria vulnerabilita`);
        assert(candidate.baselineShots90 >= 0.7, `${prediction.matchId}/${candidate.name}: boost senza baseline sufficiente`);
        assert(candidate.teamProfileConfidence, `${prediction.matchId}/${candidate.name}: boost senza confidence`);
      }
    }
    for (const total of prediction.shooters.teamTotals) {
      const team = prediction.teamProjections.find(item => item.teamId === total.teamId);
      assert(Math.abs(total.projectedShots - team.shotsTotal.central) <= 0.11, `${prediction.matchId}/${total.teamId}: tiri giocatore non riconciliati`);
      assert(Math.abs(total.projectedShotsOnTarget - team.shotsOnTarget.central) <= 0.11, `${prediction.matchId}/${total.teamId}: SOT giocatore non riconciliati`);
    }
    assert(prediction.likelyBooked.every(candidate => candidate.refereeFactor >= 0.9 && candidate.refereeFactor <= 1.1), `${prediction.matchId}: fattore arbitro fuori bound`);
    assert(prediction.likelyBooked.every(candidate => candidate.duelRisk >= 0.92 && candidate.duelRisk <= 1.12), `${prediction.matchId}: duel risk fuori bound`);
    assert(prediction.likelyBooked.every(candidate => candidate.opponentDuelEnvironmentFactor >= 0.98 && candidate.opponentDuelEnvironmentFactor <= 1.03), `${prediction.matchId}: ambiente duello squadra fuori bound`);
    assert(prediction.likelyBooked.every(candidate => candidate.teamDisciplineFactor >= 0.95 && candidate.teamDisciplineFactor <= 1.05), `${prediction.matchId}: fattore disciplina squadra fuori bound`);
    assert(prediction.likelyBooked.filter(candidate => !["atalanta", "bologna", "cagliari", "como", "fiorentina", "roma"].includes(candidate.teamId)).every(candidate => candidate.teamDisciplineFactor === 1), `${prediction.matchId}: i profili disciplina hanno contaminato altre squadre`);
    assert(prediction.likelyBooked.every(candidate => candidate.directOpponent || candidate.duelRisk === 1), `${prediction.matchId}: fallback duello incoerente`);
  }
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
const atalantaVeneziaProfile = dataset.predictions.find(prediction => prediction.matchId === "atalanta-venezia-2026-27-md-06");
assert(atalantaVeneziaProfile?.shooters.allPlayers.some(candidate => candidate.teamId === "venezia" && candidate.teamProfileMatchupFactor > 1), "Atalanta: profilo posizionale non collegato agli avversari");
assert(atalantaVeneziaProfile.shooters.allPlayers.filter(candidate => candidate.teamId === "atalanta").every(candidate => candidate.teamProfileMatchupFactor === 1), "Atalanta: auto-boost tattico non valido");
const lecceBolognaProfile = dataset.predictions.find(prediction => prediction.matchId === "lecce-bologna-2026-27-md-06");
assert(lecceBolognaProfile?.shooters.allPlayers.every(candidate => candidate.teamProfileMatchupFactor === 1), "Bologna: un segnale watch ha prodotto un boost ai tiratori");
assert(lecceBolognaProfile.shooters.allPlayers.filter(candidate => candidate.teamId === "lecce").every(candidate => candidate.matchupEvidence.some(item => item.includes("watch") || item.includes("non attivo") || item.includes("non disponibile"))), "Bologna: evidenza watch/inactive non esposta ai tiratori avversari");
assert(lecceBolognaProfile.likelyBooked.some(candidate => candidate.teamId === "bologna" && candidate.teamDisciplineFactor > 1), "Bologna: fattore disciplina regolarizzato non collegato ai giocatori");
assert(lecceBolognaProfile.likelyBooked.filter(candidate => candidate.teamId === "lecce" && !candidate.directOpponent).every(candidate => candidate.opponentDuelEnvironmentFactor === 1), "Bologna: ambiente falli applicato senza duello diretto");
assert(dataset.predictions.every(prediction => prediction.likelyBooked.every(candidate => candidate.opponentDuelEnvironmentFactor == null || candidate.opponentDuelEnvironmentFactor === 1 || candidate.directOpponent)), "Ambiente falli squadra applicato senza avversario diretto identificato");
assert(dataset.predictions.filter(prediction => prediction.playerMarketModelVersion === 2 && !prediction.matchId.includes("atalanta") && !prediction.matchId.includes("cagliari") && !prediction.matchId.includes("fiorentina")).every(prediction => prediction.shooters.allPlayers.every(candidate => candidate.teamProfileMatchupFactor === 1)), "I profili attivi hanno contaminato altre squadre");

const cagliariJuventusProfile = dataset.predictions.find(prediction => prediction.matchId === "cagliari-juventus-2026-27-md-06");
const juventusAgainstCagliari = cagliariJuventusProfile?.shooters.allPlayers.filter(candidate => candidate.teamId === "juventus") || [];
const activeCagliariMatchupPlayers = juventusAgainstCagliari.filter(candidate => candidate.teamProfileShotsMatchupFactor > 1);
assert(activeCagliariMatchupPlayers.length >= 2, "Cagliari: il matchup attivo non raggiunge tiratori con baseline credibile");
assert(activeCagliariMatchupPlayers.every(candidate => candidate.teamProfileShotsMatchupFactor > candidate.teamProfileShotsOnTargetMatchupFactor), "Cagliari: il boost tiri deve superare quello SOT");
assert(juventusAgainstCagliari.filter(candidate => candidate.teamProfileRole === "CB" || candidate.teamProfileRole === "FB").every(candidate => candidate.teamProfileMatchupFactor === 1), "Cagliari: un ruolo WATCH ha prodotto boost");
assert(juventusAgainstCagliari.some(candidate => candidate.baselineShots90 < 1 && candidate.teamProfileMatchupFactor === 1), "Cagliari: manca il controllo sulla baseline bassa");
assert(cagliariJuventusProfile.shooters.allPlayers.filter(candidate => candidate.teamId === "cagliari").every(candidate => candidate.teamProfileMatchupFactor === 1), "Cagliari: auto-boost tattico non valido");
const juventusProjection = cagliariJuventusProfile.teamProjections.find(team => team.teamId === "juventus");
assert(juventusProjection.opponentMatchupInteraction.shotsAdjustmentPct > juventusProjection.opponentMatchupInteraction.shotsOnTargetAdjustmentPct, "Cagliari: il volume squadra SOT segue automaticamente il boost tiri");
assert(juventusProjection.opponentMatchupInteraction.shotsAdjustmentPct > 0 && juventusProjection.opponentMatchupInteraction.shotsOnTargetAdjustmentPct === 0, "Cagliari: ELEVATED tiri e NORMAL SOT devono produrre comportamenti opposti");
assert.strictEqual(juventusProjection.opponentMatchupInteraction.method, "single-dampened-budget");

const highExploit = opponentAbilityToExploit({ summary: { shotsPerGame: 16, possessionPct: 59, passSuccessPct: 89, aerialWonPerGame: 15 }, attackChannels: { left: 36, central: 28, right: 36 } }, { shotsTotal: { central: 17 }, corners: { central: 8 } });
const lowExploit = opponentAbilityToExploit({ summary: { shotsPerGame: 9, possessionPct: 42, passSuccessPct: 78, aerialWonPerGame: 8 }, attackChannels: { left: 20, central: 60, right: 20 } }, { shotsTotal: { central: 9 }, corners: { central: 3 } });
for (const feature of ["general", "territorial", "wide", "setPiece"]) assert(highExploit[feature] > lowExploit[feature], `Ability to exploit ${feature} non distingue gli scenari sintetici`);

const cagliariMatchupProfile = require(path.join(root, "data/normalized/team-matchup-profiles-2026-27.json")).profiles.find(profile => profile.teamId === "cagliari");
const lowBaselineCm = teamProfilePlayerModifier({ role: "Centrocampista", detailedRole: "centrocampista centrale" }, 0.4, 0.1, cagliariMatchupProfile, highExploit);
const highBaselineCm = teamProfilePlayerModifier({ role: "Centrocampista", detailedRole: "centrocampista centrale" }, 2, 0.4, cagliariMatchupProfile, highExploit);
assert.strictEqual(lowBaselineCm.shotFactor, 1, "Un CM senza propensione e stato creato dal matchup");
assert(highBaselineCm.shotFactor > 1 && highBaselineCm.shotFactor > highBaselineCm.sotFactor, "Un CM con baseline credibile non distingue tiri e SOT");
assert(highBaselineCm.shotFactor < 1.08 ** 4 && highBaselineCm.shotFactor <= 1.18, "Il budget non impedisce il double counting");
const highBaselineCmLowAbility = teamProfilePlayerModifier({ role: "Centrocampista", detailedRole: "centrocampista centrale" }, 2, 0.4, cagliariMatchupProfile, lowExploit);
assert(highBaselineCm.shotFactor > highBaselineCmLowAbility.shotFactor, "Ability to exploit non modula il matchup giocatore");
const lowShotCb = teamProfilePlayerModifier({ role: "Difensore", detailedRole: "difensore centrale" }, 0.2, 0.02, cagliariMatchupProfile, highExploit);
const setPieceCb = teamProfilePlayerModifier({ role: "Difensore", detailedRole: "difensore centrale" }, 0.9, 0.2, cagliariMatchupProfile, highExploit);
assert.strictEqual(lowShotCb.shotFactor, 1);
assert.strictEqual(setPieceCb.shotFactor, 1, "Il CB piazzato resta WATCH finche il campione non consente l'attivazione");

const comoMatchupProfile = require(path.join(root, "data/normalized/team-matchup-profiles-2026-27.json")).profiles.find(profile => profile.teamId === "como");
const comoRomaProfile = dataset.predictions.find(prediction => prediction.matchId === "como-roma-2026-27-md-06");
const comoProjection = comoRomaProfile?.teamProjections.find(team => team.teamId === "como");
const romaAgainstComoProjection = comoRomaProfile?.teamProjections.find(team => team.teamId === "roma");
const comoPlayers = comoRomaProfile?.shooters.allPlayers.filter(player => player.teamId === "como") || [];
assert(comoProjection.ownOffensiveInteraction.shotsAdjustmentPct > 0 && comoProjection.ownOffensiveInteraction.shotsAdjustmentPct <= 10, "Como: volume offensivo current non integrato prudentemente");
assert(comoProjection.ownOffensiveInteraction.shotsOnTargetAdjustmentPct > 0 && comoProjection.ownOffensiveInteraction.shotsOnTargetAdjustmentPct <= 8, "Como: SOT adjustment fuori budget");
assert(comoProjection.ownOffensiveInteraction.cornersAdjustmentPct > 0 && comoProjection.ownOffensiveInteraction.cornersAdjustmentPct <= 10, "Como: corner opportunity non integrata");
assert(comoProjection.ownOffensiveInteraction.capDiagnostics.shots.capHit, "Como: saturazione cap tiri non diagnosticata");
assert(dataset.diagnostics.capSaturation.teamProjections > 0 && dataset.diagnostics.capSaturation.hits.shots > 0, "Frequenza aggregata dei cap non disponibile");
assert(Math.abs(comoPlayers.reduce((total, player) => total + player.projectedShotsV1, 0) - comoProjection.legacyVolumeProjection.shotsTotal.central) <= 0.11, "Como: V1 non conserva il volume legacy");
assert(Math.abs(comoPlayers.reduce((total, player) => total + player.projectedShots, 0) - comoProjection.shotsTotal.central) <= 0.11, "Como: V2 non riconcilia il volume allocato");
assert(comoPlayers.every(player => player.playerAllocationFactor >= 0.84 && player.playerAllocationFactor <= 1.16), "Como: allocation factor fuori clamp");
const nicoPaz = comoPlayers.find(player => player.playerId === "nico-paz");
const baturina = comoPlayers.find(player => player.playerId === "martin-baturina");
const jacoboRamon = comoPlayers.find(player => player.playerId === "jacobo-ramon");
const chalobah = comoPlayers.find(player => player.playerId === "trevoh-chalobah");
const kaiki = comoPlayers.find(player => player.playerId === "kaiki");
const romaPlayers = comoRomaProfile.shooters.allPlayers.filter(player => player.teamId === "roma");
const cristante = romaPlayers.find(player => player.playerId === "bryan-cristante");
const mancini = romaPlayers.find(player => player.playerId === "gianluca-mancini");
assert.strictEqual(nicoPaz.allocationClass, "primary");
assert.strictEqual(nicoPaz.outsiderScore, null, "Il primary shooter non deve essere etichettato outsider");
assert.strictEqual(baturina.allocationClass, "secondary");
assert(baturina.playerAllocationFactor > 1, "Como: secondary shooter con evidence non valorizzato");
assert(jacoboRamon.playerAllocationFactor > chalobah.playerAllocationFactor, "Como: il CB con baseline piazzati superiore non beneficia piu del CB low-volume");
assert(comoRomaProfile.shooters.allPlayers.filter(player => player.teamId === "roma").every(player => player.teamProfileMatchupFactor === 1), "Como: una vulnerabilita difensiva WATCH ha prodotto boost");
assert(romaAgainstComoProjection.opponentMatchupInteraction.shotsAdjustmentPct > 0 && romaAgainstComoProjection.opponentMatchupInteraction.shotsOnTargetAdjustmentPct === 0, "Como: ELEVATED tiri e NORMAL SOT non sono indipendenti");
assert.strictEqual(romaAgainstComoProjection.opponentMatchupInteraction.metricEvidence.shots.active, true, "Como: evidenza tiri ACTIVE non esposta");
assert.strictEqual(romaAgainstComoProjection.opponentMatchupInteraction.metricEvidence.shotsOnTarget.active, false, "Como: SOT NORMAL non resta neutro");
assert.strictEqual(comoRomaProfile.dataQuality.probableLineups, "22/22 titolari proiettati; fonte editoriale da riconfermare", "Como-Roma: conteggio XI dinamico errato");
assert.deepStrictEqual(comoRomaProfile.dataQuality.outfieldPlayersModeled, { modeled: 20, expected: 20, complete: true }, "Como-Roma: conteggio giocatori di movimento errato");
assert.strictEqual(kaiki.qualifiedOutsider, false, "Kaiki non deve superare i gate outsider con stabilita bassa e ruolo generico");
assert(kaiki.outsiderExclusionReasons.includes("generic-detailed-role-with-low-stability"), "Kaiki: motivazione di esclusione outsider assente");
assert.strictEqual(cristante.qualifiedOutsider, true, "Cristante deve poter qualificare sul mercato tiri");
assert.strictEqual(cristante.qualifiedSotOutsider, false, "Cristante non deve qualificare automaticamente sul mercato SOT");
assert.strictEqual(mancini.qualifiedOutsider, false, "Mancini non supera i gate qualitativi outsider");
assert(!comoRomaProfile.shooters.outsiders.some(player => player.playerId === "kaiki"), "Kaiki resta nel ranking outsider nonostante il rigetto");
assert(comoRomaProfile.shooters.outsiders.length < 5, "Como-Roma: il ranking outsider e ancora riempito forzatamente a cinque");
assert(comoRomaProfile.shooters.outsiderDiagnostics.shots.rejected.some(player => player.playerId === "kaiki"), "Diagnostica outsider non espone il rigetto di Kaiki");
assert.strictEqual(comoRomaProfile.shooters.teamTotals.find(team => team.teamId === "como").reconciliation.shots.allocationMode, "EXTRA_VOLUME", "Como: modalita reconciliation tiri errata");
assert.strictEqual(comoRomaProfile.shooters.teamTotals.find(team => team.teamId === "roma").reconciliation.shots.allocationMode, "COMPRESSION", "Roma: modalita reconciliation tiri errata");
assert(comoRomaProfile.likelyBooked.filter(player => player.teamId === "como").every(player => player.expectedDefensiveExposureFactor < 1 && player.expectedDefensiveExposureFactor > 0.97), "Como: esposizione difensiva non collegata prudentemente al card model");

for (const status of ["watch", "inactive", "unknown"]) {
  const neutralProfile = JSON.parse(JSON.stringify(comoMatchupProfile));
  neutralProfile.vulnerabilities.signals.totalShotVulnerability.status = status;
  const neutralInteraction = applyOpponentTeamVolumeInteraction(
    { summary: { shotsPerGame: 15, possessionPct: 58, passSuccessPct: 86, aerialWonPerGame: 12 }, attackChannels: { left: 33, central: 34, right: 33 } },
    neutralProfile,
    { min: 11, central: 14, max: 18 },
    { min: 3, central: 5, max: 7 },
    { min: 3, central: 5, max: 7 }
  );
  assert.strictEqual(neutralInteraction.shotsAdjustmentPct, 0, `Como: segnale ${status} non neutro nel volume squadra`);
}

const syntheticBaselines = [3, 0.4, 2, 1.8, 1.6, 1.5, 1.4, 1.2, 1.1, 1];
const syntheticIds = ["nico-paz", "luis-milla", "anastasios-douvikas", "martin-baturina", "assane-diao", "lucas-da-cunha", "yan-couto", "jacobo-ramon", "trevoh-chalobah", "maximo-perrone"];
const syntheticRoles = ["AM", "CM", "CF", "AM", "AM", "CM", "FB", "CB", "CB", "CM"];
const syntheticRows = syntheticBaselines.map((value, index) => ({ projectedShots: value, baselineShots90: value, playerId: syntheticIds[index], teamProfileRole: syntheticRoles[index] }));
const syntheticAllocation = teamOffensiveAllocation(syntheticRows, "projectedShots", 23, comoMatchupProfile);
assert.strictEqual(Number(syntheticAllocation.values.reduce((total, value) => total + value, 0).toFixed(6)), 23);
assert.strictEqual(syntheticAllocation.extraVolume, 8, "L'allocation deve operare sul solo extra-volume rispetto alle baseline");
assert(syntheticAllocation.values.every((value, index) => value >= syntheticBaselines[index]), "Un extra-volume positivo non deve riscrivere o ridurre le baseline individuali");
assert(syntheticAllocation.values[0] - syntheticBaselines[0] > syntheticAllocation.values[1] - syntheticBaselines[1], "Il primary non assorbe piu extra-volume del giocatore da 0.4/90");
assert(syntheticAllocation.values[1] < 0.6, "Il giocatore da 0.4/90 viene promosso artificialmente dal team volume");
assert(syntheticAllocation.factors.every(factor => factor >= 0.84 && factor <= 1.16), "Il budget allocation sintetico supera il clamp");
const setPieceRows = [
  { projectedShots: 0.15, baselineShots90: 0.15, playerId: "cb-low", teamProfileRole: "CB" },
  { projectedShots: 0.9, baselineShots90: 0.9, playerId: "cb-target", teamProfileRole: "CB" },
  ...syntheticRows.slice(2)
];
const setPieceAllocation = teamOffensiveAllocation(setPieceRows, "projectedShots", 18, comoMatchupProfile);
assert(setPieceAllocation.factors[1] > setPieceAllocation.factors[0], "Il CB target sui piazzati non beneficia piu del CB da 0.15/90");

const stableBaseline = playerBaselineStability({ historicalBaseline: 1.4, historicalObserved: 1.4, historicalMinutes: 2100, current: { minutes: 321, shots: 5, shotsCoverage: 5 }, key: "shots" });
const breakoutBaseline = playerBaselineStability({ historicalBaseline: 1.2, historicalObserved: 1.2, historicalMinutes: 2100, current: { minutes: 252, shots: 14, shotsCoverage: 5 }, key: "shots" });
assert.strictEqual(stableBaseline.level, "high", "Baseline storico e current coerenti devono risultare stabili");
assert(Math.abs(stableBaseline.value - 1.4) < 0.03, "La stabilizzazione altera una baseline coerente");
assert.strictEqual(breakoutBaseline.level, "low", "Un breakout current molto distante non deve sembrare stabile");
assert(breakoutBaseline.value > 1.2 && breakoutBaseline.value < 5, "Il breakout deve essere riconosciuto ma shrinkato, non azzerato o preso integralmente");
assert(breakoutBaseline.currentSample.reliability < breakoutBaseline.historicalSample.reliability, "Affidabilita del campione e agreement storico-current non sono separati");

const fiorentinaMatchupProfile = require(path.join(root, "data/normalized/team-matchup-profiles-2026-27.json")).profiles.find(profile => profile.teamId === "fiorentina");
const fiorentinaLowSotCm = teamProfilePlayerModifier({ role: "Centrocampista", detailedRole: "centrocampista centrale" }, 2, 0.1, fiorentinaMatchupProfile, highExploit);
const fiorentinaHighSotCm = teamProfilePlayerModifier({ role: "Centrocampista", detailedRole: "centrocampista centrale" }, 2, 0.75, fiorentinaMatchupProfile, highExploit);
assert.strictEqual(fiorentinaLowSotCm.shotFactor, 1, "Fiorentina: la vulnerabilita SOT non deve diventare boost tiri");
assert.strictEqual(fiorentinaLowSotCm.sotFactor, 1, "Fiorentina: un giocatore senza baseline SOT credibile non deve essere creato dal matchup");
assert.strictEqual(fiorentinaHighSotCm.shotFactor, 1, "Fiorentina: pipeline tiri e SOT non sono separate");
assert(fiorentinaHighSotCm.sotFactor > 1 && fiorentinaHighSotCm.sotFactor < 1.08, "Fiorentina: boost SOT attivo assente o fuori budget");
assert(highBaselineCm.shotFactor > fiorentinaHighSotCm.shotFactor && fiorentinaHighSotCm.sotFactor > highBaselineCm.sotFactor, "Cagliari e Fiorentina non distinguono correttamente volume tiri e qualita SOT");

const genoaFiorentinaProfile = dataset.predictions.find(prediction => prediction.matchId === "genoa-fiorentina-2026-27-md-06");
const fiorentinaProjection = genoaFiorentinaProfile?.teamProjections.find(team => team.teamId === "fiorentina");
const genoaProjection = genoaFiorentinaProfile?.teamProjections.find(team => team.teamId === "genoa");
const fiorentinaPlayers = genoaFiorentinaProfile?.shooters.allPlayers.filter(player => player.teamId === "fiorentina") || [];
const genoaPlayers = genoaFiorentinaProfile?.shooters.allPlayers.filter(player => player.teamId === "genoa") || [];
assert(fiorentinaProjection.ownOffensiveInteraction.shotsAdjustmentPct > 0 && fiorentinaProjection.ownOffensiveInteraction.shotsAdjustmentPct <= 6, "Fiorentina: volume tiri current fuori budget");
assert(fiorentinaProjection.ownOffensiveInteraction.shotsOnTargetAdjustmentPct > fiorentinaProjection.ownOffensiveInteraction.shotsAdjustmentPct && fiorentinaProjection.ownOffensiveInteraction.shotsOnTargetAdjustmentPct <= 8, "Fiorentina: budget tiri e SOT non distinti");
assert.strictEqual(fiorentinaProjection.ownOffensiveInteraction.cornersAdjustmentPct, 0, "Fiorentina: i corner non devono ereditare il cap tiri senza segnale attivo");
assert(Math.abs(fiorentinaPlayers.reduce((total, player) => total + player.projectedShotsV1, 0) - fiorentinaProjection.legacyVolumeProjection.shotsTotal.central) <= 0.11, "Fiorentina: V1 non conserva scalePlayerVolume");
assert(Math.abs(fiorentinaPlayers.reduce((total, player) => total + player.projectedShots, 0) - fiorentinaProjection.shotsTotal.central) <= 0.11, "Fiorentina: V2 non riconcilia i tiri senza quote rigide di ruolo");
assert(genoaProjection.opponentMatchupInteraction.shotsAdjustmentPct < genoaProjection.opponentMatchupInteraction.shotsOnTargetAdjustmentPct, "Fiorentina: la vulnerabilita SOT avversaria e stata trasformata in volume tiri");
assert(genoaProjection.opponentMatchupInteraction.shotsAdjustmentPct === 0 && genoaProjection.opponentMatchupInteraction.shotsOnTargetAdjustmentPct > 0, "Fiorentina: NORMAL tiri ed ELEVATED SOT devono produrre comportamenti opposti");
assert(genoaPlayers.some(player => player.teamProfileShotsOnTargetMatchupFactor > player.teamProfileShotsMatchupFactor), "Fiorentina: nessun tiratore avversario credibile riceve il segnale SOT");
assert(genoaPlayers.filter(player => player.teamProfileRole === "CB").every(player => player.teamProfileShotsMatchupFactor === 1 && player.teamProfileShotsOnTargetMatchupFactor === 1), "Fiorentina: i centrali WATCH sono stati attivati");
assert(genoaPlayers.filter(player => player.baselineShotsOnTarget90 < 0.2).every(player => player.teamProfileShotsOnTargetMatchupFactor === 1), "Fiorentina: il matchup crea SOT per baseline individuali troppo basse");
const mastantuono = fiorentinaPlayers.find(player => player.playerId === "franco-mastantuono");
const atta = fiorentinaPlayers.find(player => player.playerId === "arthur-atta");
const ndour = fiorentinaPlayers.find(player => player.playerId === "cher-ndour");
const alexJimenez = fiorentinaPlayers.find(player => player.playerId === "alex-jimenez");
assert(mastantuono.stabilizedShots90 > mastantuono.baselineShots90 && mastantuono.stabilizedShots90 < mastantuono.playerBaselineStability.currentSample.per90, "Mastantuono: breakout current non stabilizzato correttamente");
assert.strictEqual(mastantuono.allocationClass, "primary");
assert.strictEqual(mastantuono.outsiderScore, null, "Mastantuono primary non deve diventare outsider");
assert.strictEqual(ndour.playerBaselineStability.level, "high", "Ndour: storico e current coerenti non risultano stabili");
assert(atta.outsiderScore > alexJimenez.outsiderScore && atta.sotOutsiderScore > alexJimenez.sotOutsiderScore, "Fiorentina: un difensore low-volume viene promosso sopra Atta");
assert(genoaFiorentinaProfile.shooters.sotOutsiders.some(player => player.playerId === "arthur-atta"), "Fiorentina: ranking outsider SOT non espone Atta");

const transitionStrong = opponentAbilityToExploit({ summary: { shotsPerGame: 18, possessionPct: 35, passSuccessPct: 75, aerialWonPerGame: 10 }, strengths: [{ id: "contropiede" }], attackChannels: { left: 20, central: 60, right: 20 } }, { shotsTotal: { central: 18 }, corners: { central: 3 } });
const transitionWeak = opponentAbilityToExploit({ summary: { shotsPerGame: 9, possessionPct: 35, passSuccessPct: 75, aerialWonPerGame: 10 }, attackChannels: { left: 20, central: 60, right: 20 } }, { shotsTotal: { central: 9 }, corners: { central: 3 } });
assert(transitionStrong.transition > transitionWeak.transition, "Basso possesso e transition efficiency vengono confusi");
assert.strictEqual(romaAgainstComoProjection.opponentMatchupInteraction.method, "evidence-weighted-marginal-shot-sot-correction", "Como: policy di correzione marginale non applicata");
const lowExposure = expectedDefensiveExposureFactor(65);
const highExposure = expectedDefensiveExposureFactor(45);
assert(highExposure > lowExposure, "Una maggiore esposizione difensiva non aumenta leggermente il rischio");
assert(highExposure - lowExposure < 0.05, "Expected defensive exposure ha un impatto eccessivo");
assert.strictEqual(fourthMatchdayPredictions.filter(prediction => prediction.scoreForecast.primary.score === "1-0").length, 0, "La quarta giornata non deve ereditare la concentrazione artificiale sugli 1-0");
const milanVenezia = dataset.predictions.find(prediction => prediction.matchId === "milan-venezia-2026-27-md-02");
const fiorentinaFrosinone = dataset.predictions.find(prediction => prediction.matchId === "fiorentina-frosinone-2026-27-md-02");
const monzaUdinese = dataset.predictions.find(prediction => prediction.matchId === "monza-udinese-2026-27-md-02");
const sassuoloTorino = dataset.predictions.find(prediction => prediction.matchId === "sassuolo-torino-2026-27-md-02");
const napoliComo = dataset.predictions.find(prediction => prediction.matchId === "napoli-como-2026-27-md-02");
const cagliariInter = dataset.predictions.find(prediction => prediction.matchId === "cagliari-inter-2026-27-md-02");
const lazioGenoa = dataset.predictions.find(prediction => prediction.matchId === "lazio-genoa-2026-27-md-02");
const lecceRoma = dataset.predictions.find(prediction => prediction.matchId === "lecce-roma-2026-27-md-02");
assert(milanVenezia.combinations.every(combo => !combo.legs.some(leg => leg.selection === "12")), "Milan-Venezia: il 12 non deve sostituire il più probabile 1X");
assert(milanVenezia.combinations.every(combo => !combo.legs.some(leg => leg.selection?.startsWith("UNDER") && /U\/O 1\.5 (?:TEAM|SQUADRA) 1/i.test(leg.variant || ""))), "Milan-Venezia: evitare Under 1,5 casa contro la neopromossa");
const torinoMilan = dataset.predictions.find(prediction => prediction.matchId === "torino-milan-2026-27-md-01");
assert.strictEqual(torinoMilan.mvpCandidate.teamId, "milan", "Torino-Milan: il candidato MVP principale deve seguire il Milan favorito");
assert.strictEqual(torinoMilan.mvpCandidate.mvpHistory.sourceUrl, dataset.sources.find(source => source.label.includes("Player of the Match"))?.url, "Torino-Milan: disponibilità dello storico MVP non esposta");
if (torinoMilan.mvpCandidate.mvpHistory.status === "N/D") assert.strictEqual(torinoMilan.mvpCandidate.mvpHistory.awards, null, "Torino-Milan: premi MVP non disponibili inventati");
assert.strictEqual(torinoMilan.teamProjections[0].venue, "home", "Torino-Milan: Torino non usa il campione casa");
assert.strictEqual(torinoMilan.teamProjections[1].venue, "away", "Torino-Milan: Milan non usa il campione trasferta");
assert.strictEqual(torinoMilan.teamProjections[0].shotsTotal.inputs[0].source, "home-for", "Torino-Milan: produzione Torino casa non collegata");
assert.strictEqual(torinoMilan.teamProjections[1].shotsTotal.inputs[0].source, "away-for", "Torino-Milan: produzione Milan trasferta non collegata");
assert(secondMatchdayPredictions.every(prediction => prediction.market.status === "available" && prediction.market.provider === "Sisal"), "La seconda giornata deve usare le quote Sisal importate");
assert(secondMatchdayPredictions.every(prediction => !prediction.dataQuality.missing.includes("quote 1X2 verificate")), "Le quote Sisal della seconda giornata non devono risultare mancanti");
assert.strictEqual(milanVenezia.dataQuality.probableLineups, "22/22 titolari ufficiali confermati", "Milan-Venezia deve usare gli XI ufficiali della seconda giornata");
assert.strictEqual(fiorentinaFrosinone.dataQuality.probableLineups, "22/22 titolari ufficiali confermati", "Fiorentina-Frosinone deve usare gli XI ufficiali della seconda giornata");
assert.strictEqual(monzaUdinese.dataQuality.probableLineups, "22/22 titolari ufficiali confermati", "Monza-Udinese deve usare gli XI ufficiali della seconda giornata");
assert.strictEqual(sassuoloTorino.dataQuality.probableLineups, "22/22 titolari ufficiali confermati", "Sassuolo-Torino deve usare gli XI ufficiali della seconda giornata");
assert.strictEqual(napoliComo.dataQuality.probableLineups, "22/22 titolari ufficiali confermati", "Napoli-Como deve usare gli XI ufficiali della seconda giornata");
assert.strictEqual(cagliariInter.dataQuality.probableLineups, "22/22 titolari ufficiali confermati", "Cagliari-Inter deve usare gli XI ufficiali della seconda giornata");
assert.strictEqual(lazioGenoa.dataQuality.probableLineups, "22/22 titolari ufficiali confermati", "Lazio-Genoa deve usare gli XI ufficiali della seconda giornata");
assert.strictEqual(lecceRoma.dataQuality.probableLineups, "22/22 titolari ufficiali confermati", "Lecce-Roma deve usare gli XI ufficiali della seconda giornata");
assert(secondMatchdayPredictions.filter(prediction => !officialStartersByMatch.has(prediction.matchId)).every(prediction => prediction.dataQuality.probableLineups.includes("proiettati")), "Le altre formazioni della seconda giornata devono restare proiezioni editoriali");
assert.strictEqual(fourthMatchdayPredictions.filter(prediction => prediction.market.status === "available" && prediction.market.provider === "Sisal").length, 9, "Le nove gare aperte della quarta giornata devono usare le quote Sisal importate");
assert(fourthMatchdayPredictions.every(prediction => prediction.expectedGoals.components.recentForm.home.currentSeasonMatches >= 3 && prediction.expectedGoals.components.recentForm.away.currentSeasonMatches >= 3), "La quarta giornata deve usare almeno tre gare concluse 2026/27 per squadra nella forma recente");
assert(firstMatchdayPredictions.every(prediction => (prediction.expectedGoals.components.recentForm.home?.currentSeasonMatches ?? 0) === 0 && (prediction.expectedGoals.components.recentForm.away?.currentSeasonMatches ?? 0) === 0), "I pronostici archiviati della prima giornata non devono usare risultati futuri");
assert(secondMatchdayPredictions.every(prediction => prediction.expectedGoals.components.recentForm.home.currentSeasonMatches === 1 && prediction.expectedGoals.components.recentForm.away.currentSeasonMatches === 1), "La seconda giornata deve usare una gara conclusa 2026/27 per squadra nella forma recente");
const goalTotals = firstMatchdayPredictions.map(prediction => prediction.expectedGoals.total);
assert(Math.max(...goalTotals) >= 3 && Math.min(...goalTotals) <= 2.4, "Il motore non deve imporre sempre lo stesso profilo di gol");
const modalScores = firstMatchdayPredictions.map(prediction => prediction.exactScores[0].score);
assert(dataset.predictions.filter(prediction => prediction.expectedGoals.components.xg.status === "used").length >= 5, "Copertura xG insufficiente sulla prima giornata");
assert(new Set(modalScores).size >= 4, "I punteggi modali devono variare fra le partite");
assert(modalScores.filter(score => score === "1-1").length <= 4, "L'1-1 non deve dominare artificialmente la prima giornata");
assert(new Set(secondMatchdayPredictions.map(prediction => prediction.scoreForecast.primary.score)).size >= 4, "I risultati principali della seconda giornata devono variare fra le partite");
console.log(`OK motore pronostici ${dataset.engine.version}: ${dataset.predictions.length} partite, dati mancanti dichiarati, fattore sorpresa validato`);
