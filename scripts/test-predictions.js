"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "..");
const dataset = JSON.parse(fs.readFileSync(path.join(root, "data/normalized/predictions.json"), "utf8"));
const archivedMd1 = JSON.parse(fs.readFileSync(path.join(root, "data/sources/prediction-archive-md1-2026-27.json"), "utf8"));
const mvpHistory = JSON.parse(fs.readFileSync(path.join(root, "data/sources/player-mvp-history-2025-26.json"), "utf8"));
const myComboSource = JSON.parse(fs.readFileSync(path.join(root, "data/sources/mycombo-serie-a-2026-27-md-01.json"), "utf8"));
const myComboMd2Path = path.join(root, "data/sources/mycombo-serie-a-2026-27-md-02.json");
const myComboMd2Source = fs.existsSync(myComboMd2Path) ? JSON.parse(fs.readFileSync(myComboMd2Path, "utf8")) : { matches: {} };
const myComboMd3Path = path.join(root, "data/sources/mycombo-serie-a-2026-27-md-03.json");
const myComboMd3Source = fs.existsSync(myComboMd3Path) ? JSON.parse(fs.readFileSync(myComboMd3Path, "utf8")) : { matches: {} };
const allMyComboMatches = { ...myComboSource.matches, ...myComboMd2Source.matches, ...myComboMd3Source.matches };
const officialLineups = JSON.parse(fs.readFileSync(path.join(root, "data/sources/official-lineups-2026-27.json"), "utf8"));
const previewMd3Path = path.join(root, "data/generated/prediction-preview-md03-2026-27.json");
const cleanName = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
const officialStartersByMatch = new Map(officialLineups.fixtures.map(fixture => [fixture.matchId, new Set(fixture.teams.flatMap(team => team.players.map(player => cleanName(player.currentName || player.sourceName))))]));

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

assert.strictEqual(dataset.predictions.length, 33, "Il motore deve coprire le prime tre giornate e le tre gare di Coppa");
const firstMatchdayPredictions = dataset.predictions.filter(prediction => prediction.matchId.endsWith("-md-01"));
const secondMatchdayPredictions = dataset.predictions.filter(prediction => prediction.matchId.endsWith("-md-02"));
const thirdMatchdayPredictions = dataset.predictions.filter(prediction => prediction.matchId.endsWith("-md-03"));
const cupPredictions = dataset.predictions.filter(prediction => ["r16-3", "r16-6", "r16-7"].includes(prediction.matchId));
assert.strictEqual(firstMatchdayPredictions.length, 10, "Devono restare disponibili i 10 pronostici archiviati della prima giornata");
assert.strictEqual(secondMatchdayPredictions.length, 10, "Devono essere disponibili i 10 pronostici tecnici della seconda giornata");
assert.strictEqual(thirdMatchdayPredictions.length, 10, "Devono essere disponibili i 10 pronostici tecnici della terza giornata");
assert.strictEqual(cupPredictions.length, 3, "Devono essere disponibili i tre pronostici tecnici dei Sedicesimi di Coppa");
assert(cupPredictions.every(prediction => prediction.market.status === "unavailable" && prediction.combinations.length === 0), "Le gare di Coppa senza quote devono conservare mercati e MyCombo N/D");
assert.deepStrictEqual(firstMatchdayPredictions.map(({ decisionSupport, ...prediction }) => prediction), archivedMd1.predictions, "Il nucleo dei pronostici conclusi MD1 deve restare identico allo snapshot pubblicato");
assert.strictEqual(Object.keys(myComboSource.matches).length, 10, "Le MyCombo devono coprire tutte le 10 gare della prima giornata");
if (fs.existsSync(myComboMd2Path)) assert.strictEqual(Object.keys(myComboMd2Source.matches).length, 10, "Le MyCombo devono coprire tutte le 10 gare della seconda giornata");
if (fs.existsSync(myComboMd3Path)) assert.strictEqual(Object.keys(myComboMd3Source.matches).length, 10, "Le MyCombo devono coprire tutte le 10 gare della terza giornata");
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
      const configuredSource = myComboMd3Source.matches[prediction.matchId] ? myComboMd3Source : myComboMd2Source.matches[prediction.matchId] ? myComboMd2Source : myComboSource;
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
assert(thirdMatchdayPredictions.every(prediction => prediction.market.status === "available" && prediction.market.provider === "Sisal"), "La terza giornata deve usare le quote Sisal importate");
assert(thirdMatchdayPredictions.every(prediction => prediction.expectedGoals.components.recentForm.home.currentSeasonMatches === 2 && prediction.expectedGoals.components.recentForm.away.currentSeasonMatches === 2), "La terza giornata deve usare due gare concluse 2026/27 per squadra nella forma recente");
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
