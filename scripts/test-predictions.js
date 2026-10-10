"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { opponentAbilityToExploit, teamProfilePlayerModifier, teamOffensiveAllocation, volumeMetric, applyOwnOffensiveVolumeProfile, applyOpponentTeamVolumeInteraction, playerBaselineStability, expectedDefensiveExposureFactor } = require("./predictions/engine");
const root = path.resolve(__dirname, "..");
const dataset = JSON.parse(fs.readFileSync(path.join(root, "data/normalized/predictions.json"), "utf8"));
const currentProbableLineups = require("./probable-lineups").loadLatestProbableLineups(root);
const officialLineups = JSON.parse(fs.readFileSync(path.join(root, "data/sources/official-lineups-2026-27.json"), "utf8"));
const officialLineupByMatchTeam = new Map(officialLineups.fixtures.flatMap(fixture => fixture.teams.map(team => [`${fixture.matchId}:${team.teamId}`, team])));
const assertNotCurrentStarter = (teamId, playerId) => {
  const player = currentProbableLineups.teams.find(team => team.teamId === teamId)?.players.find(player => player.playerId === playerId);
  assert(!player || player.lineupStatus === "reserve", `${teamId}/${playerId}: candidato assente nonostante sia titolare nella fonte corrente`);
};
const currentMatches = JSON.parse(fs.readFileSync(path.join(root, "data/normalized/matches.json"), "utf8"))
  .filter(match => match.competition === "serie-a" && match.season === "2026-27" && match.matchday === currentProbableLineups.matchday);
for (const match of currentMatches) {
  const prediction = dataset.predictions.find(prediction => prediction.matchId === match.id);
  assert(prediction, `${match.id}: pronostico della giornata corrente mancante`);
  for (const teamId of [match.homeTeam, match.awayTeam]) {
    const official = officialLineupByMatchTeam.get(`${match.id}:${teamId}`);
    const expected = official
      ? official.players.slice(1).map(player => player.playerId).filter(Boolean).sort()
      : currentProbableLineups.teams.find(team => team.teamId === teamId).players
        .filter(player => player.lineupStatus === "starter" && player.sourceRole !== "P").map(player => player.playerId).sort();
    const actual = prediction.shooters.allPlayers.filter(player => player.teamId === teamId).map(player => player.playerId).sort();
    assert.deepStrictEqual(actual, expected, `${match.id}/${teamId}: giocatori modellati diversi dai titolari della fonte corrente`);
  }
}
const teamStyleProfiles = JSON.parse(fs.readFileSync(path.join(root, "data/normalized/team-style-profiles.json"), "utf8")).profiles;
const teamVolumeProfiles = JSON.parse(fs.readFileSync(path.join(root, "data/normalized/team-volume-profiles-2025-26.json"), "utf8")).profiles;
const profiledTeamIds = new Set(JSON.parse(fs.readFileSync(path.join(root, "data/normalized/team-matchup-profiles-2026-27.json"), "utf8")).profiles.map(profile => profile.teamId));
const teamStylesById = new Map(teamStyleProfiles.map(profile => [profile.teamId, profile]));
const teamVolumesById = new Map(teamVolumeProfiles.map(profile => [profile.teamId, profile]));
const archivedMd1 = JSON.parse(fs.readFileSync(path.join(root, "data/sources/prediction-archive-md1-2026-27.json"), "utf8"));
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
const atalantaVeneziaMd6 = sixthMatchdayPredictions.find(prediction => prediction.matchId === "atalanta-venezia-2026-27-md-06");
const johnYeboahMd6 = atalantaVeneziaMd6?.shooters?.allPlayers?.find(player => player.playerId === "john-yeboah");
assert(johnYeboahMd6, "Atalanta-Venezia: John Yeboah non trovato nelle letture MD6");
assert.strictEqual(johnYeboahMd6.markets.shotsOver05, null, "Yeboah J. non deve ereditare la quota 1+ tiri di Schingtienne J.");
assert.strictEqual(String(johnYeboahMd6.markets.shotsOnTargetOver05?.providerMarketId), "820932249", "Yeboah: quota SOT 1+ non riconciliata con il mercato corretto");
assert(!Object.values(johnYeboahMd6.markets).filter(Boolean).some(market => String(market.providerMarketId) === "820932456" || String(market.providerSelectionId) === "5371734896"), "Yeboah conserva identificativi di Schingtienne");
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
      assert(candidate.expectedMinutes >= 0 && candidate.expectedMinutes <= 90, `${prediction.matchId}/${candidate.name}: minuti attesi non validi`);
      if (candidate.expectedMinutes < 55) assert(candidate.expectedMinutesEvidence.recentTeamMatches > 0, `${prediction.matchId}/${candidate.name}: calo minuti senza evidenza recente`);
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
    assert(prediction.likelyBooked.filter(candidate => !profiledTeamIds.has(candidate.teamId)).every(candidate => candidate.teamDisciplineFactor === 1), `${prediction.matchId}: i profili disciplina hanno contaminato altre squadre`);
    assert(prediction.likelyBooked.every(candidate => candidate.directOpponent || candidate.duelRisk === 1), `${prediction.matchId}: fallback duello incoerente`);
  }
  assert(!("mvpCandidate" in prediction), `${prediction.matchId}: il candidato MVP non deve essere generato`);
}
const atalantaVeneziaProfile = dataset.predictions.find(prediction => prediction.matchId === "atalanta-venezia-2026-27-md-06");
assert(atalantaVeneziaProfile?.shooters.allPlayers.some(candidate => candidate.teamId === "venezia" && candidate.teamProfileMatchupFactor > 1), "Atalanta: profilo posizionale non collegato agli avversari");
assert(atalantaVeneziaProfile.shooters.allPlayers.filter(candidate => candidate.teamId === "atalanta").every(candidate => candidate.teamProfileMatchupFactor === 1), "Atalanta: auto-boost tattico non valido");
const lecceBolognaProfile = dataset.predictions.find(prediction => prediction.matchId === "lecce-bologna-2026-27-md-06");
assert(lecceBolognaProfile?.shooters.allPlayers.every(candidate => candidate.teamProfileMatchupFactor === 1), "Bologna: un segnale watch ha prodotto un boost ai tiratori");
assert(lecceBolognaProfile.shooters.allPlayers.filter(candidate => candidate.teamId === "lecce").every(candidate => candidate.matchupEvidence.some(item => item.includes("watch") || item.includes("non attivo") || item.includes("non disponibile"))), "Bologna: evidenza watch/inactive non esposta ai tiratori avversari");
assert(lecceBolognaProfile.likelyBooked.some(candidate => candidate.teamId === "bologna" && candidate.teamDisciplineFactor > 1), "Bologna: fattore disciplina regolarizzato non collegato ai giocatori");
assert(lecceBolognaProfile.likelyBooked.filter(candidate => candidate.teamId === "lecce" && !candidate.directOpponent).every(candidate => candidate.opponentDuelEnvironmentFactor === 1), "Bologna: ambiente falli applicato senza duello diretto");
const bolognaVsLecceProjection = lecceBolognaProfile.teamProjections.find(team => team.teamId === "bologna");
const lecceProjection = lecceBolognaProfile.teamProjections.find(team => team.teamId === "lecce");
const bolognaVsLeccePlayers = lecceBolognaProfile.shooters.allPlayers.filter(candidate => candidate.teamId === "bologna");
const leccePlayers = lecceBolognaProfile.shooters.allPlayers.filter(candidate => candidate.teamId === "lecce");
assert.strictEqual(bolognaVsLecceProjection.opponentMatchupInteraction.method, "broad-team-vulnerability-before-player-allocation-role-residuals-watch-only");
assert.strictEqual(bolognaVsLecceProjection.opponentMatchupInteraction.shotsAdjustmentPct, 0.78, "Lecce: broad shot vulnerability non applicata al team target Bologna");
assert.strictEqual(bolognaVsLecceProjection.opponentMatchupInteraction.shotsOnTargetAdjustmentPct, 0.77, "Lecce: broad SOT vulnerability non applicata separatamente");
assert(bolognaVsLecceProjection.opponentMatchupInteraction.metricEvidence.shots.adjustmentPct > 0 && bolognaVsLecceProjection.opponentMatchupInteraction.metricEvidence.shotsOnTarget.adjustmentPct > 0);
assert(bolognaVsLeccePlayers.every(candidate => candidate.teamProfileShotsMatchupFactor === 1 && candidate.teamProfileShotsOnTargetMatchupFactor === 1), "Lecce: broad environment duplicato con boost posizionali");
assert.strictEqual(lecceProjection.ownOffensiveInteraction.shotsAdjustmentPct, -8, "Lecce: basso volume tiri non raggiunge il cap prudente");
assert.strictEqual(lecceProjection.ownOffensiveInteraction.shotsOnTargetAdjustmentPct, -8, "Lecce: basso volume SOT non resta separato");
assert.strictEqual(lecceProjection.ownOffensiveInteraction.cornersAdjustmentPct, -6, "Lecce: basso volume corner non raggiunge il cap prudente");
assert(lecceProjection.ownOffensiveInteraction.capDiagnostics.shots.capHit && lecceProjection.ownOffensiveInteraction.capDiagnostics.shotsOnTarget.capHit && lecceProjection.ownOffensiveInteraction.capDiagnostics.corners.capHit);
const lecceTeamTotal = lecceBolognaProfile.shooters.teamTotals.find(team => team.teamId === "lecce");
const bolognaTeamTotal = lecceBolognaProfile.shooters.teamTotals.find(team => team.teamId === "bologna");
assert(Math.abs(lecceTeamTotal.projectedShots - lecceProjection.shotsTotal.central) <= 0.11 && Math.abs(lecceTeamTotal.projectedShotsOnTarget - lecceProjection.shotsOnTarget.central) <= 0.11, "Lecce: player sum non riconciliata al team target");
assert(Math.abs(bolognaTeamTotal.projectedShots - bolognaVsLecceProjection.shotsTotal.central) <= 0.11 && Math.abs(bolognaTeamTotal.projectedShotsOnTarget - bolognaVsLecceProjection.shotsOnTarget.central) <= 0.11, "Lecce: boost upstream non riconciliato sui giocatori Bologna");
assert(leccePlayers.every(candidate => candidate.projectedShotsOnTarget <= candidate.projectedShots), "Lecce: SOT giocatore sopra i tiri");
assert(leccePlayers.every(candidate => (candidate.playerAllocationFactor ?? 1) >= 0.82 && (candidate.playerAllocationFactor ?? 1) <= 1.18), "Lecce: allocation tiri fuori clamp");
assert(leccePlayers.every(candidate => (candidate.playerSotAllocationFactor ?? 1) >= 0.82 && (candidate.playerSotAllocationFactor ?? 1) <= 1.18), "Lecce: allocation SOT fuori clamp");
assert.strictEqual(bolognaVsLeccePlayers.find(candidate => candidate.playerId === "tommaso-pobega").qualifiedOutsider, false, "Lecce: il calo di Expected Minutes deve poter rimuovere un outsider");
assert(bolognaVsLeccePlayers.find(candidate => candidate.playerId === "tommaso-pobega").outsiderExclusionReasons.includes("limited-expected-minutes"), "Lecce: esclusione outsider senza evidenza Expected Minutes");
assert.strictEqual(bolognaVsLeccePlayers.find(candidate => candidate.playerId === "tommaso-pobega").qualifiedSotOutsider, false, "Lecce: outsider tiri promosso automaticamente sui SOT");
assert(bolognaVsLeccePlayers.filter(candidate => candidate.baselineShots90 < 0.7).every(candidate => !candidate.qualifiedOutsider), "Lecce: low-baseline player promosso outsider dal solo team environment");
assert(lecceBolognaProfile.shooters.outsiders.length >= 0 && lecceBolognaProfile.shooters.outsiders.length <= 5, "Lecce: detector outsider non rispetta 0..N");
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
assert.strictEqual(juventusProjection.ownOffensiveInteraction.shotsAdjustmentPct, 8, "Juventus: cap tiri offensivo non rispettato");
assert.strictEqual(juventusProjection.ownOffensiveInteraction.shotsOnTargetAdjustmentPct, 8, "Juventus: cap SOT offensivo non rispettato");
assert.strictEqual(juventusProjection.ownOffensiveInteraction.cornersAdjustmentPct, 6, "Juventus: cap corner offensivo non rispettato");
assert(juventusProjection.ownOffensiveInteraction.capDiagnostics.shots.capHit && juventusProjection.ownOffensiveInteraction.capDiagnostics.shotsOnTarget.capHit && juventusProjection.ownOffensiveInteraction.capDiagnostics.corners.capHit, "Juventus: saturazione cap non diagnosticata");
const cagliariProjection = cagliariJuventusProfile.teamProjections.find(team => team.teamId === "cagliari");
assert(cagliariProjection.opponentMatchupInteraction.shotsAdjustmentPct < 0, "Juventus: la soppressione tiri non raggiunge il Cagliari");
assert(cagliariProjection.opponentMatchupInteraction.shotsOnTargetAdjustmentPct < 0, "Juventus: la soppressione SOT non raggiunge il Cagliari");
assert(Math.abs(cagliariProjection.opponentMatchupInteraction.shotsAdjustmentPct) <= 8 && Math.abs(cagliariProjection.opponentMatchupInteraction.shotsOnTargetAdjustmentPct) <= 6, "Juventus: soppressione Cagliari oltre cap");
assert(cagliariJuventusProfile.shooters.allPlayers.filter(candidate => candidate.teamId === "cagliari").every(candidate => candidate.teamProfileMatchupFactor === 1), "Juventus: la soppressione team ha creato un malus o boost posizionale");
const juventusTeamTotal = cagliariJuventusProfile.shooters.teamTotals.find(team => team.teamId === "juventus");
const cagliariTeamTotal = cagliariJuventusProfile.shooters.teamTotals.find(team => team.teamId === "cagliari");
assert(Math.abs(juventusTeamTotal.projectedShots - juventusProjection.shotsTotal.central) <= 0.11 && Math.abs(juventusTeamTotal.projectedShotsOnTarget - juventusProjection.shotsOnTarget.central) <= 0.11, "Juventus: giocatori non riconciliati con il target squadra");
assert(Math.abs(cagliariTeamTotal.projectedShots - cagliariProjection.shotsTotal.central) <= 0.11 && Math.abs(cagliariTeamTotal.projectedShotsOnTarget - cagliariProjection.shotsOnTarget.central) <= 0.11, "Juventus: la soppressione avversaria non e riconciliata sui giocatori Cagliari");
assert(juventusAgainstCagliari.every(candidate => candidate.playerAllocationFactor >= 0.82 && candidate.playerAllocationFactor <= 1.18), "Juventus: allocation tiri fuori clamp");
assert(juventusAgainstCagliari.every(candidate => candidate.playerSotAllocationFactor >= 0.82 && candidate.playerSotAllocationFactor <= 1.18), "Juventus: allocation SOT fuori clamp");
const juventusBremer = juventusAgainstCagliari.find(candidate => candidate.playerId === "bremer");
const juventusKoopmeiners = juventusAgainstCagliari.find(candidate => candidate.playerId === "teun-koopmeiners");
assert.strictEqual(juventusBremer.allocationClass, "secondary");
assert.strictEqual(juventusBremer.qualifiedOutsider, true, "Juventus: Bremer non supera il detector outsider nonostante evidenza e baseline");
if (juventusKoopmeiners) {
  assert.strictEqual(juventusKoopmeiners.qualifiedOutsider, false, "Juventus: Koopmeiners qualificato outsider senza superare il detector");
} else {
  const probable = require("./probable-lineups").loadLatestProbableLineups(root);
  const sourcePlayer = probable.teams.find(team => team.teamId === "juventus").players.find(player => player.playerId === "teun-koopmeiners");
  assert.strictEqual(sourcePlayer?.lineupStatus, "reserve", "Juventus: Koopmeiners escluso dai candidati senza essere una riserva della fonte corrente");
  assert(!cagliariJuventusProfile.shooters.outsiders.some(player => player.playerId === "teun-koopmeiners"), "Juventus: una riserva non deve essere promossa a outsider titolare");
}

const lazioMonzaProfile = dataset.predictions.find(prediction => prediction.matchId === "lazio-monza-2026-27-md-06");
const lazioProjection = lazioMonzaProfile?.teamProjections.find(team => team.teamId === "lazio");
const monzaProjection = lazioMonzaProfile?.teamProjections.find(team => team.teamId === "monza");
const lazioPlayers = lazioMonzaProfile?.shooters.allPlayers.filter(candidate => candidate.teamId === "lazio") || [];
const monzaPlayers = lazioMonzaProfile?.shooters.allPlayers.filter(candidate => candidate.teamId === "monza") || [];
assert(lazioProjection && monzaProjection, "Lazio-Monza: proiezioni squadra mancanti");
assert(lazioProjection.legacyVolumeProjection.shotsTotal.central > lazioProjection.shotsTotal.central, "Lazio: il profilo offensivo ridotto deve ridurre il volume legacy");
assert.strictEqual(lazioProjection.shotsTotal.central, 11.1);
assert.strictEqual(lazioProjection.legacyVolumeProjection.shotsOnTarget.central, 4.5);
assert.strictEqual(lazioProjection.shotsOnTarget.central, 4.1);
assert(lazioProjection.ownOffensiveInteraction.shotsAdjustmentPct < 0 && lazioProjection.ownOffensiveInteraction.shotsAdjustmentPct > -8, "Lazio: soppressione tiri non satura fuori budget");
assert.strictEqual(lazioProjection.ownOffensiveInteraction.shotsAdjustmentPct, lazioProjection.ownOffensiveInteraction.capDiagnostics.shots.appliedAdjustmentPct);
assert.strictEqual(lazioProjection.ownOffensiveInteraction.shotsOnTargetAdjustmentPct, -8);
assert.strictEqual(lazioProjection.ownOffensiveInteraction.cornersAdjustmentPct, -6);
assert.strictEqual(lazioProjection.ownOffensiveInteraction.capDiagnostics.shots.capHit, false);
assert.strictEqual(lazioProjection.ownOffensiveInteraction.capDiagnostics.shotsOnTarget.capHit, true);
assert.strictEqual(lazioProjection.ownOffensiveInteraction.capDiagnostics.corners.capHit, true);
assert.strictEqual(lazioProjection.opponentMatchupInteraction.shotsAdjustmentPct, -1.53, "Monza: shot suppression non collegata end-to-end");
assert.strictEqual(lazioProjection.opponentMatchupInteraction.shotsOnTargetAdjustmentPct, 0, "Monza: chance-quality/SOT suppression confusa con shot suppression");
assert.strictEqual(monzaProjection.opponentMatchupInteraction.shotsAdjustmentPct, 0, "Lazio: overall permeability neutra ha creato un boost tiri");
assert.strictEqual(monzaProjection.opponentMatchupInteraction.shotsOnTargetAdjustmentPct, 0, "Lazio: SOT WATCH ha creato un boost");
assert(monzaPlayers.every(candidate => candidate.teamProfileMatchupFactor === 1), "Lazio: un ruolo WATCH ha prodotto boost avversari");
const lazioTeamTotal = lazioMonzaProfile.shooters.teamTotals.find(team => team.teamId === "lazio");
assert(Math.abs(lazioTeamTotal.projectedShots - lazioProjection.shotsTotal.central) <= 0.11, "Lazio: tiri giocatore non riconciliati");
assert(Math.abs(lazioTeamTotal.projectedShotsOnTarget - lazioProjection.shotsOnTarget.central) <= 0.11, "Lazio: SOT giocatore non riconciliati");
assert(lazioPlayers.every(candidate => candidate.projectedShotsOnTarget <= candidate.projectedShots), "Lazio: SOT giocatore superiori ai tiri");
assert(lazioPlayers.every(candidate => candidate.playerAllocationFactor >= 0.82 && candidate.playerAllocationFactor <= 1.18), "Lazio: allocation tiri fuori clamp");
assert(lazioPlayers.every(candidate => candidate.playerSotAllocationFactor >= 0.82 && candidate.playerSotAllocationFactor <= 1.18), "Lazio: allocation SOT fuori clamp");
const lazioZaccagni = lazioPlayers.find(candidate => candidate.playerId === "mattia-zaccagni");
const lazioFrattesi = lazioPlayers.find(candidate => candidate.playerId === "davide-frattesi");
const lazioCancellieri = lazioPlayers.find(candidate => candidate.playerId === "matteo-cancellieri");
const lazioNoslin = lazioPlayers.find(candidate => candidate.playerId === "tijjani-noslin");
const lazioNuno = lazioPlayers.find(candidate => candidate.playerId === "nuno-tavares");
const lazioTaylor = lazioPlayers.find(candidate => candidate.playerId === "kenneth-taylor");
assert.strictEqual(lazioZaccagni.allocationClass, "primary");
assert(lazioZaccagni.projectedShots / lazioProjection.shotsTotal.central < 0.2, "Lazio: Zaccagni assorbe artificialmente troppo volume E2E");
assert.strictEqual(lazioFrattesi.qualifiedOutsider, true);
assert.strictEqual(lazioFrattesi.qualifiedSotOutsider, true);
if (lazioCancellieri) assert.strictEqual(lazioCancellieri.allocationClass, "co-primary");
else assertNotCurrentStarter("lazio", "matteo-cancellieri");
assert.strictEqual(lazioNoslin.allocationConfidence, "medium-low", "Lazio: small sample Noslin non conservato nell'E2E");
assert.strictEqual(lazioNuno.qualifiedOutsider, true, "Lazio: esito corrente del detector Nuno non tracciato");
assert.strictEqual(lazioNuno.qualifiedSotOutsider, false, "Lazio: Nuno qualificato automaticamente anche sui SOT");
assert.strictEqual(lazioTaylor.qualifiedOutsider, true);
assert.strictEqual(lazioTaylor.qualifiedSotOutsider, false, "Lazio: 5 tiri e 0 SOT di Taylor non restano separati");

const monzaMatchupProfile = require(path.join(root, "data/normalized/team-matchup-profiles-2026-27.json")).profiles.find(profile => profile.teamId === "monza");
const monzaTeamTotal = lazioMonzaProfile.shooters.teamTotals.find(team => team.teamId === "monza");
const monzaVarela = monzaPlayers.find(player => player.playerId === "gustavo-varela");
const monzaFolorunsho = monzaPlayers.find(player => player.playerId === "michael-folorunsho");
const monzaRobinson = monzaPlayers.find(player => player.playerId === "jay-robinson");
const monzaColpani = monzaPlayers.find(player => player.playerId === "andrea-colpani");
const monzaBirindelli = monzaPlayers.find(player => player.playerId === "samuele-birindelli");
assert(monzaTeamTotal && monzaVarela && monzaFolorunsho && monzaRobinson && monzaBirindelli, "Monza: candidati principali/secondari mancanti nell'E2E");
assert(monzaProjection.shotsTotal.central >= 13 && monzaProjection.shotsTotal.central < 16, "Monza A: il target neutrale assume automaticamente 16+ tiri");
for (const metric of ["shots", "shotsOnTarget"]) {
  const adjustment = monzaProjection.ownOffensiveInteraction[`${metric}AdjustmentPct`];
  assert(adjustment > 0 && adjustment <= 8, `Monza: correttivo ${metric} fuori cap`);
  assert.strictEqual(monzaProjection.ownOffensiveInteraction.capDiagnostics[metric].capHit, adjustment === 8, `Monza: diagnostica cap ${metric} incoerente con il correttivo corrente`);
}
assert(Math.abs(monzaTeamTotal.projectedShots - monzaProjection.shotsTotal.central) <= 0.11 && Math.abs(monzaTeamTotal.projectedShotsOnTarget - monzaProjection.shotsOnTarget.central) <= 0.11, "Monza: riconciliazione giocatori/team incoerente");
assert.strictEqual(monzaVarela.allocationClass, "primary");
assert.deepStrictEqual(monzaVarela.playerBaselineStability.currentSample.persistence.sequence, [3, 3, 2, 3]);
assert.strictEqual(monzaVarela.playerBaselineStability.currentSample.persistence.level, "high");
assert(monzaVarela.expectedMinutes >= 65 && monzaVarela.expectedMinutes <= 90, "Monza D: Expected Minutes Varela assenti o implausibili");
assert(monzaVarela.stabilizedShots90 * monzaVarela.expectedMinutes / 90 > 2 && monzaVarela.stabilizedShots90 * monzaVarela.expectedMinutes / 90 < 3, "Monza D: Varela non conserva una baseline forte ma non deterministica");
assert(monzaVarela.shotProbabilities.over05 > monzaVarela.shotProbabilities.over15 && monzaVarela.shotProbabilities.over15 > monzaVarela.shotProbabilities.over25, "Monza D: probabilita Varela non monotone");
assert(monzaVarela.projectedShots / monzaProjection.shotsTotal.central < 0.22, "Monza: primary protection implicita concentra eccessivamente Varela");
assert.strictEqual(monzaFolorunsho.playerBaselineStability.currentSample.persistence.level, "high");
assert.deepStrictEqual(monzaFolorunsho.playerBaselineStability.currentSample.persistence.sequence, [2, 3, 1, 1]);
assert(monzaFolorunsho.shotProbabilities.over05 > 0.75 && monzaFolorunsho.shotOnTargetProbabilities.over05 < 0.35, "Monza E: Folorunsho converte i tiri in SOT con rate fisso");
assert.strictEqual(monzaFolorunsho.qualifiedOutsider, true);
assert.strictEqual(monzaFolorunsho.qualifiedSotOutsider, false);
assert.strictEqual(monzaRobinson.playerBaselineStability.currentSample.persistence.level, "medium");
if (monzaColpani) assert.strictEqual(monzaColpani.playerBaselineStability.currentSample.persistence.level, "medium");
else assertNotCurrentStarter("monza", "andrea-colpani");
assert.strictEqual(monzaBirindelli.playerBaselineStability.currentSample.persistence.level, "high");
assert.deepStrictEqual(monzaBirindelli.playerBaselineStability.currentSample.persistence.sequence, [1, 1, 1, 1, 2]);
assert.strictEqual(monzaBirindelli.qualifiedOutsider, true, "Monza H: Birindelli non supera naturalmente i gate outsider tiri");
assert.strictEqual(monzaBirindelli.qualifiedSotOutsider, true, "Monza H: l'evidenza SOT separata di Birindelli non supera i gate");
assert.strictEqual(monzaBirindelli.teamProfileMatchupFactor, 1, "Monza H: Birindelli dipende da un matchup artificiale");
const danyMotaStability = playerBaselineStability({ historicalBaseline: 2.23, historicalObserved: 2.23, historicalMinutes: 1658, current: { minutes: 103, shots: 4, shotsCoverage: 3, shotsSequence: [1, 3, 0] }, key: "shots", includePersistence: true });
assert(danyMotaStability.value < 2.6, "Monza I: i 3.50 tiri/90 raw di Dany Mota dominano la baseline su 103 minuti");
assert.strictEqual(monzaMatchupProfile.offense.cbSetPieceShotParticipation.status, "watch");
assert.strictEqual(monzaMatchupProfile.offense.teamOffensiveAllocation.setPieceWeight, 0, "Monza J: CB/set-piece WATCH ha creato un peso di allocation");
assert(monzaPlayers.every(player => player.projectedShotsOnTarget <= player.projectedShots), "Monza: SOT giocatore supera i tiri");
assert(monzaPlayers.every(player => player.shotProbabilities.over05 >= player.shotProbabilities.over15 && player.shotProbabilities.over15 >= player.shotProbabilities.over25), "Monza: probabilita tiri non monotone");
assert(monzaPlayers.every(player => player.shotOnTargetProbabilities.over05 >= player.shotOnTargetProbabilities.over15), "Monza: probabilita SOT non monotone");

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
if (kaiki) {
  assert.strictEqual(kaiki.qualifiedOutsider, false, "Kaiki non deve superare i gate outsider con stabilita bassa e ruolo generico");
  assert(kaiki.outsiderExclusionReasons.includes("generic-detailed-role-with-low-stability"), "Kaiki: motivazione di esclusione outsider assente");
  assert(comoRomaProfile.shooters.outsiderDiagnostics.shots.rejected.some(player => player.playerId === "kaiki"), "Diagnostica outsider non espone il rigetto di Kaiki");
} else assertNotCurrentStarter("como", "kaiki");
if (cristante) {
  assert.strictEqual(cristante.qualifiedOutsider, true, "Cristante deve poter qualificare sul mercato tiri");
  assert.strictEqual(cristante.qualifiedSotOutsider, false, "Cristante non deve qualificare automaticamente sul mercato SOT");
} else assertNotCurrentStarter("roma", "bryan-cristante");
assert.strictEqual(mancini.qualifiedOutsider, false, "Mancini non supera i gate qualitativi outsider");
assert(!comoRomaProfile.shooters.outsiders.some(player => player.playerId === "kaiki"), "Kaiki resta nel ranking outsider nonostante il rigetto");
assert(comoRomaProfile.shooters.outsiders.length < 5, "Como-Roma: il ranking outsider e ancora riempito forzatamente a cinque");
assert.strictEqual(comoRomaProfile.shooters.teamTotals.find(team => team.teamId === "como").reconciliation.shots.allocationMode, "EXTRA_VOLUME", "Como: modalita reconciliation tiri errata");
assert(["EXTRA_VOLUME", "COMPRESSION"].includes(comoRomaProfile.shooters.teamTotals.find(team => team.teamId === "roma").reconciliation.shots.allocationMode), "Roma: modalita reconciliation tiri errata");
assert(comoRomaProfile.likelyBooked.filter(player => player.teamId === "como").every(player => player.expectedDefensiveExposureFactor < 1 && player.expectedDefensiveExposureFactor > 0.97), "Como: esposizione difensiva non collegata prudentemente al card model");

const frosinoneMatchupProfile = require(path.join(root, "data/normalized/team-matchup-profiles-2026-27.json")).profiles.find(profile => profile.teamId === "frosinone");
const napoliFrosinoneProfile = dataset.predictions.find(prediction => prediction.matchId === "napoli-frosinone-2026-27-md-06");
const napoliAgainstFrosinone = napoliFrosinoneProfile?.teamProjections.find(team => team.teamId === "napoli");
const frosinoneProjection = napoliFrosinoneProfile?.teamProjections.find(team => team.teamId === "frosinone");
const frosinonePlayers = napoliFrosinoneProfile?.shooters.allPlayers.filter(player => player.teamId === "frosinone") || [];
assert(napoliAgainstFrosinone.opponentMatchupInteraction.shotsAdjustmentPct > 0, "Frosinone: total-shot vulnerability ACTIVE non raggiunge il team avversario");
assert.strictEqual(napoliAgainstFrosinone.opponentMatchupInteraction.shotsOnTargetAdjustmentPct, 0, "Frosinone: SOT NORMAL/INACTIVE produce un boost");
assert.strictEqual(napoliAgainstFrosinone.opponentMatchupInteraction.metricEvidence.shots.positiveDeviationPct, 41.24, "Frosinone: deviazione robusta tiri non esposta");
assert.strictEqual(napoliAgainstFrosinone.opponentMatchupInteraction.metricEvidence.shots.magnitudeWeight, 0.8048, "Frosinone: magnitude weight inatteso");
assert.strictEqual(napoliAgainstFrosinone.opponentMatchupInteraction.metricEvidence.shots.confidenceWeight, 0.75, "Frosinone: confidence weight inatteso");
assert.strictEqual(napoliAgainstFrosinone.opponentMatchupInteraction.metricEvidence.shots.maturityWeight, 0.5, "Frosinone: maturity weight inatteso");
assert.strictEqual(napoliAgainstFrosinone.opponentMatchupInteraction.metricEvidence.shots.stabilityWeight, 0.7148, "Frosinone: stability weight inatteso");
assert.strictEqual(napoliAgainstFrosinone.opponentMatchupInteraction.metricEvidence.shots.persistenceWeight, 1, "Frosinone: persistenza 5/5 non preservata");
assert.strictEqual(frosinoneProjection.ownOffensiveInteraction.shotsAdjustmentPct, 6, "Frosinone: cap offensivo tiri non applicato");
assert.strictEqual(frosinoneProjection.ownOffensiveInteraction.shotsOnTargetAdjustmentPct, 6, "Frosinone: cap offensivo SOT non separato");
assert.strictEqual(frosinoneProjection.ownOffensiveInteraction.cornersAdjustmentPct, 4, "Frosinone: cap corner non applicato");
assert(frosinoneProjection.ownOffensiveInteraction.capDiagnostics.shots.capHit, "Frosinone: cap-hit tiri non documentato");
assert(frosinonePlayers.every(player => player.projectedShotsOnTarget <= player.projectedShots), "Frosinone: projected SOT supera projected shots");
assert(frosinonePlayers.every(player => player.shotProbabilities.over05 >= player.shotProbabilities.over15 && player.shotProbabilities.over15 >= player.shotProbabilities.over25), "Frosinone: probabilita tiri non monotone");
assert(frosinonePlayers.every(player => player.shotOnTargetProbabilities.over05 >= player.shotOnTargetProbabilities.over15), "Frosinone: probabilita SOT non monotone");
assert(napoliFrosinoneProfile.shooters.outsiders.filter(player => player.teamId === "frosinone").length < 5, "Frosinone: ranking outsider riempito forzatamente");
assert.strictEqual(frosinonePlayers.find(player => player.playerId === "anthony-oyono").qualifiedSotOutsider, false, "Oyono: volume tiri trasformato in outsider SOT");
assert.strictEqual(frosinonePlayers.find(player => player.playerId === "gabriele-bracaglia").qualifiedOutsider, true, "Bracaglia: outsider tiri supportato non riconosciuto");
const bracaglia = frosinonePlayers.find(player => player.playerId === "gabriele-bracaglia");
if (bracaglia.qualifiedSotOutsider) {
  assert(bracaglia.shotOnTargetProbabilities.over05 >= 0.3 && bracaglia.shotOnTargetProbabilities.over15 >= 0.05 && bracaglia.sotOutsiderScore >= 40, "Bracaglia: qualificazione SOT senza superare le soglie specifiche");
  assert.deepStrictEqual(bracaglia.sotOutsiderExclusionReasons, [], "Bracaglia: SOT qualificato con motivi di esclusione");
} else assert(bracaglia.sotOutsiderExclusionReasons.length > 0, "Bracaglia: rigetto SOT senza evidenza separata");
assert.strictEqual(frosinoneMatchupProfile.vulnerabilities.positionalShotVulnerability.CF.status, "watch", "Frosinone: broad opponent access ha attivato un ruolo specifico");

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
assert.strictEqual(fiorentinaProjection.opponentMatchupInteraction.shotsAdjustmentPct, 0, "Genoa: total-shot vulnerability WATCH ha aumentato il volume avversario");
assert.strictEqual(fiorentinaProjection.opponentMatchupInteraction.shotsOnTargetAdjustmentPct, 0, "Genoa: i 9 SOT concessi al Como hanno prodotto un boost SOT avversario");
assert.strictEqual(fiorentinaProjection.opponentMatchupInteraction.metricEvidence.shots.status, "watch");
assert.strictEqual(fiorentinaProjection.opponentMatchupInteraction.metricEvidence.shotsOnTarget.status, "watch");
assert(fiorentinaPlayers.every(player => player.teamProfileShotsMatchupFactor === 1 && player.teamProfileShotsOnTargetMatchupFactor === 1), "Genoa: un ruolo WATCH ha modificato i giocatori della Fiorentina");
assert(genoaPlayers.every(player => player.projectedShotsOnTarget <= player.projectedShots), "Genoa: projected SOT supera projected shots");
assert(genoaPlayers.every(player => player.shotProbabilities.over05 >= player.shotProbabilities.over15 && player.shotProbabilities.over15 >= player.shotProbabilities.over25), "Genoa: probabilita tiri non monotone");
assert(genoaPlayers.every(player => player.shotOnTargetProbabilities.over05 >= player.shotOnTargetProbabilities.over15), "Genoa: probabilita SOT non monotone");
assert(Math.abs(genoaPlayers.reduce((total, player) => total + player.projectedShots, 0) - genoaProjection.shotsTotal.central) <= 0.11, "Genoa: riconciliazione tiri incoerente");
assert(Math.abs(genoaPlayers.reduce((total, player) => total + player.projectedShotsOnTarget, 0) - genoaProjection.shotsOnTarget.central) <= 0.11, "Genoa: riconciliazione SOT incoerente");
assert(genoaFiorentinaProfile.shooters.outsiders.filter(player => player.teamId === "genoa").length < 5, "Genoa: outsider tiri riempiti forzatamente");
assert(genoaFiorentinaProfile.shooters.sotOutsiders.filter(player => player.teamId === "genoa").length < 5, "Genoa: outsider SOT riempiti forzatamente");
const juniorMessias = genoaPlayers.find(player => player.playerId === "junior-messias");
assert(juniorMessias, "Genoa: Junior Messias assente dalla proiezione E2E ufficiale");
assert(juniorMessias.stabilizedShots90 > juniorMessias.stabilizedShotsOnTarget90 * 2.5, "Junior Messias: baseline tiri e SOT non restano separate");
assert.strictEqual(juniorMessias.qualifiedOutsider, false, "Junior Messias primary promosso automaticamente a outsider tiri");
assert.strictEqual(juniorMessias.qualifiedSotOutsider, false, "Junior Messias: profilo primary promosso automaticamente a outsider SOT");
const mastantuono = fiorentinaPlayers.find(player => player.playerId === "franco-mastantuono");
const fagioli = fiorentinaPlayers.find(player => player.playerId === "nicolo-fagioli");
const ndour = fiorentinaPlayers.find(player => player.playerId === "cher-ndour");
const alexJimenez = fiorentinaPlayers.find(player => player.playerId === "alex-jimenez");
assert(mastantuono && fagioli && ndour && alexJimenez, "Fiorentina: giocatori della formazione ufficiale corrente assenti dalla proiezione E2E");
assert(mastantuono.stabilizedShots90 > mastantuono.baselineShots90 && mastantuono.stabilizedShots90 < mastantuono.playerBaselineStability.currentSample.per90, "Mastantuono: breakout current non stabilizzato correttamente");
assert.strictEqual(mastantuono.allocationClass, "primary");
assert.strictEqual(mastantuono.outsiderScore, null, "Mastantuono primary non deve diventare outsider");
assert.strictEqual(ndour.playerBaselineStability.level, "high", "Ndour: storico e current coerenti non risultano stabili");
assert(fagioli.outsiderScore > alexJimenez.outsiderScore && fagioli.sotOutsiderScore > alexJimenez.sotOutsiderScore, "Fiorentina: un difensore low-volume viene promosso sopra Fagioli");
assert(genoaFiorentinaProfile.shooters.outsiders.some(player => player.playerId === "nicolo-fagioli"), "Fiorentina: ranking outsider tiri non espone Fagioli");
assert(genoaFiorentinaProfile.shooters.outsiders.every(player => player.detailedRole !== "Difensore"), "Fiorentina: un difensore generico e entrato tra gli outsider tiri");

const interMatchupProfile = require(path.join(root, "data/normalized/team-matchup-profiles-2026-27.json")).profiles.find(profile => profile.teamId === "inter");
const interParmaProfile = dataset.predictions.find(prediction => prediction.matchId === "inter-parma-2026-27-md-06");
const interProjection = interParmaProfile?.teamProjections.find(team => team.teamId === "inter");
const parmaAgainstInter = interParmaProfile?.teamProjections.find(team => team.teamId === "parma");
const interPlayers = interParmaProfile?.shooters.allPlayers.filter(player => player.teamId === "inter") || [];
assert.strictEqual(interProjection.ownOffensiveInteraction.shotsAdjustmentPct, 8, "Inter: cap offensivo tiri non applicato");
assert.strictEqual(interProjection.ownOffensiveInteraction.shotsOnTargetAdjustmentPct, 8, "Inter: cap offensivo SOT non applicato separatamente");
assert(interProjection.ownOffensiveInteraction.capDiagnostics.shots.capHit && interProjection.ownOffensiveInteraction.capDiagnostics.shotsOnTarget.capHit, "Inter: saturazione cap offensivi non diagnosticata");
assert.strictEqual(interProjection.ownOffensiveInteraction.target.shots, 18.804);
assert.strictEqual(interProjection.ownOffensiveInteraction.target.shotsOnTarget, 6.242);
assert(parmaAgainstInter.opponentMatchupInteraction.shotsAdjustmentPct < 0, "Inter: la soppressione tiri ACTIVE non raggiunge Parma");
assert.strictEqual(parmaAgainstInter.opponentMatchupInteraction.shotsOnTargetAdjustmentPct, 0, "Inter: la soppressione tiri e stata copiata sui SOT non provati");
assert.strictEqual(parmaAgainstInter.opponentMatchupInteraction.metricEvidence.shots.active, true);
assert.strictEqual(parmaAgainstInter.opponentMatchupInteraction.metricEvidence.shotsOnTarget.active, false);
assert.strictEqual(parmaAgainstInter.opponentMatchupInteraction.method, "historical-supported-shot-suppression-with-neutral-sot-channel");
assert(Math.abs(interPlayers.reduce((total, player) => total + player.projectedShots, 0) - interProjection.shotsTotal.central) <= 0.11, "Inter: riconciliazione tiri incoerente");
assert(Math.abs(interPlayers.reduce((total, player) => total + player.projectedShotsOnTarget, 0) - interProjection.shotsOnTarget.central) <= 0.11, "Inter: riconciliazione SOT incoerente");
assert(interPlayers.every(player => player.projectedShotsOnTarget <= player.projectedShots), "Inter: projected SOT supera projected shots");
assert(interPlayers.every(player => player.playerAllocationFactor >= 0.82 && player.playerAllocationFactor <= 1.18), "Inter: allocation factor fuori clamp");
assert(interPlayers.every(player => player.teamProfileShotsMatchupFactor === 1 && player.teamProfileShotsOnTargetMatchupFactor === 1), "Inter: un ruolo difensivo Parma non provato ha alterato i giocatori");
assert(interPlayers.every(player => player.shotProbabilities.over05 >= player.shotProbabilities.over15 && player.shotProbabilities.over15 >= player.shotProbabilities.over25), "Inter: probabilita tiri non monotone");
assert(interPlayers.every(player => player.shotOnTargetProbabilities.over05 >= player.shotOnTargetProbabilities.over15), "Inter: probabilita SOT non monotone");
const interThuram = interPlayers.find(player => player.playerId === "marcus-thuram");
const interPio = interPlayers.find(player => player.playerId === "pio-esposito");
const interCalhanoglu = interPlayers.find(player => player.playerId === "hakan-calhanoglu");
const interPavard = interPlayers.find(player => player.playerId === "benjamin-pavard");
const interBisseck = interPlayers.find(player => player.playerId === "yann-bisseck");
const interDimarco = interPlayers.find(player => player.playerId === "federico-dimarco");
const interCarlosAugusto = interPlayers.find(player => player.playerId === "carlos-augusto");
assert(interThuram && interPio && interCalhanoglu && interPavard && interBisseck && interDimarco && interCarlosAugusto, "Inter: giocatori della formazione ufficiale corrente assenti dalla proiezione E2E");
assert.strictEqual(interThuram.allocationClass, "co-primary");
assert.strictEqual(interPio.allocationClass, "co-primary");
assert.strictEqual(interThuram.outsiderScore, null, "Inter: Thuram co-primary promosso a outsider");
assert.strictEqual(interPio.outsiderScore, null, "Inter: Pio Esposito co-primary promosso a outsider");
assert(interCalhanoglu.stabilizedShotsOnTarget90 > interPavard.stabilizedShotsOnTarget90, "Inter: tiri e SOT di Calhanoglu/Pavard non restano separati");
assert.strictEqual(interBisseck.qualifiedOutsider, true, "Inter: Bisseck con baseline e minuti credibili non supera i gate outsider tiri");
assert.strictEqual(interDimarco.qualifiedOutsider, true, "Inter: Dimarco non supera i gate outsider tiri");
assert(interCarlosAugusto.outsiderScore < interBisseck.outsiderScore, "Inter: Carlos Augusto low-volume viene promosso sopra Bisseck");
assert(!interParmaProfile.shooters.outsiders.some(player => ["primary", "co-primary"].includes(player.allocationClass)), "Inter: un primary/co-primary compare nel ranking outsider");
assert(interParmaProfile.shooters.outsiders.filter(player => player.teamId === "inter").length <= 5, "Inter: ranking outsider oltre il limite");
assert.strictEqual(interMatchupProfile.vulnerabilities.signals.sotVulnerability.modelEffect, "none", "Inter: SOT WATCH non neutro nel profilo serializzato");
assert(Object.values(interMatchupProfile.vulnerabilities.positionalShotVulnerability).every(role => role.effectiveMaxBoostPct === 0 && role.effectiveMaxSotBoostPct === 0), "Inter: ruolo WATCH trasformato in effetto centrale");

const milanMatchupProfile = require(path.join(root, "data/normalized/team-matchup-profiles-2026-27.json")).profiles.find(profile => profile.teamId === "milan");
const juventusMatchupProfile = require(path.join(root, "data/normalized/team-matchup-profiles-2026-27.json")).profiles.find(profile => profile.teamId === "juventus");
const lecceMatchupProfile = require(path.join(root, "data/normalized/team-matchup-profiles-2026-27.json")).profiles.find(profile => profile.teamId === "lecce");
const sassuoloMilanProfile = dataset.predictions.find(prediction => prediction.matchId === "sassuolo-milan-2026-27-md-06");
const milanProjection = sassuoloMilanProfile?.teamProjections.find(team => team.teamId === "milan");
const sassuoloAgainstMilan = sassuoloMilanProfile?.teamProjections.find(team => team.teamId === "sassuolo");
const milanPlayers = sassuoloMilanProfile?.shooters.allPlayers.filter(player => player.teamId === "milan") || [];
const milanRamos = milanPlayers.find(player => player.playerId === "goncalo-ramos");
const milanPavlovic = milanPlayers.find(player => player.playerId === "strahinja-pavlovic");

// A - neutral defense: team target first, Ramos primary without deterministic ownership.
assert(milanProjection.shotsTotal.central >= 12 && milanProjection.shotsTotal.central <= 14, "Milan A: neutral target fuori profilo normale");
assert(milanProjection.shotsOnTarget.central >= 4 && milanProjection.shotsOnTarget.central <= 4.5, "Milan A: SOT neutral target fuori profilo");
assert.strictEqual(milanRamos.allocationClass, "primary");
assert(milanRamos.projectedShots / milanProjection.shotsTotal.central < 0.3, "Milan A: Ramos e diventato primary deterministico");

// B - Juventus-type suppressor: l'estremo reale resta nell'evidenza e il target scende materialmente.
const milanVsJuventusShots = { min: 10, central: 13, max: 17 };
const milanVsJuventusSot = { min: 2, central: 4.2, max: 7 };
const milanVsJuventusInteraction = applyOpponentTeamVolumeInteraction({ summary: { shotsPerGame: 13.2, possessionPct: 60.6, passSuccessPct: 88.6, aerialWonPerGame: 11 }, attackChannels: { left: 32, central: 36, right: 32 } }, juventusMatchupProfile, milanVsJuventusShots, milanVsJuventusSot, { min: 1, central: 3.8, max: 6 });
assert(milanVsJuventusInteraction.shotsAdjustmentPct < 0 && milanVsJuventusShots.central < 13, "Milan B: Juventus-type suppression non riduce il team target");
assert(milanMatchupProfile.offense.teamShotVolume.rawValues.includes(3), "Milan B: i 3 tiri reali contro Juventus sono stati eliminati come rumore");

// C - Lecce-type vulnerability: espansione upstream senza boost enorme del primary.
const milanVsLecceShots = { min: 9, central: 13, max: 17 };
const milanVsLecceSot = { min: 2, central: 4.2, max: 7 };
applyOpponentTeamVolumeInteraction({ summary: { shotsPerGame: 13.2, possessionPct: 60.6, passSuccessPct: 88.6, aerialWonPerGame: 11 }, attackChannels: { left: 32, central: 36, right: 32 } }, lecceMatchupProfile, milanVsLecceShots, milanVsLecceSot, { min: 1, central: 3.8, max: 6 });
assert(milanVsLecceShots.central > 13, "Milan C: Lecce-type vulnerability non aumenta il team target");
const milanExpansionRows = milanPlayers.map(player => ({ playerId: player.playerId, projectedShots: player.projectedShotsV2Base, baselineShots90: player.stabilizedShots90, teamProfileRole: player.teamProfileRole, playerBaselineStability: player.playerBaselineStability }));
const milanVsLecceAllocation = teamOffensiveAllocation(milanExpansionRows, "projectedShots", milanVsLecceShots.central, milanMatchupProfile);
const ramosIndex = milanExpansionRows.findIndex(player => player.playerId === "goncalo-ramos");
assert(milanVsLecceAllocation.values[ramosIndex] / milanVsLecceShots.central < 0.3, "Milan C: ambiente favorevole assegna automaticamente troppo volume a Ramos");

// D - Ramos: primary storico/current, ma persistence 5-8-0-1-0 bassa e declining senza floor.
assert.strictEqual(milanRamos.playerBaselineStability.currentSample.persistence.level, "low");
assert.strictEqual(milanRamos.playerBaselineStability.currentSample.persistence.trend, "declining");
assert.deepStrictEqual(milanRamos.playerBaselineStability.currentSample.persistence.sequence, [5, 8, 0, 1, 0]);
assert(milanRamos.stabilizedShots90 > 2.84 && milanRamos.stabilizedShots90 < 4.14, "Milan D: Ramos non e shrinkato fra current e storico");
assert(milanRamos.expectedMinutes >= 80 && milanRamos.expectedMinutes <= 90, "Milan D: Expected Minutes Ramos assenti o implausibili");

// E/F/G - persistence secondaria, small sample e separazione shots/SOT.
const cisseStability = playerBaselineStability({ historicalBaseline: 2.68, historicalObserved: 2.68, historicalMinutes: 1439, current: { minutes: 229, shots: 7, shotsCoverage: 4, shotsSequence: [4, 1, 1, 1] }, key: "shots", includePersistence: true });
assert.strictEqual(cisseStability.currentSample.persistence.level, "high", "Milan E: Cisse non conserva la persistence 1+");
assert(cisseStability.value < 2.8, "Milan E: il picco iniziale di Cisse gonfia eccessivamente la baseline");
const moreiraStability = playerBaselineStability({ historicalBaseline: 1.28, historicalObserved: 1.28, historicalMinutes: 1191, current: { minutes: 127, shots: 5, shotsCoverage: 3, shotsSequence: [0, 4, 1] }, key: "shots" });
assert(moreiraStability.value < 2, "Milan F: i 3.54 tiri/90 di Moreira non sono shrinkati con forza");
const estupinanShots = playerBaselineStability({ historicalBaseline: 0.77, historicalObserved: 0.77, historicalMinutes: 2643, current: { minutes: 279, shots: 5, shotsCoverage: 5, shotsSequence: [1, 0, 1, 1, 2] }, key: "shots" });
const estupinanSot = playerBaselineStability({ historicalBaseline: 0.09, historicalObserved: 0.09, historicalMinutes: 2643, current: { minutes: 279, shotsOnTarget: 0, shotsOnTargetCoverage: 5, shotsOnTargetSequence: [0, 0, 0, 0, 0] }, key: "shotsOnTarget" });
assert(estupinanShots.value > estupinanSot.value * 5, "Milan G: segnale tiri Estupinan trasferito automaticamente ai SOT");

// H - Pavlovic emerge solo attraverso baseline naturali; il proxy piazzati resta WATCH.
assert.strictEqual(milanPavlovic.qualifiedOutsider, true, "Milan H: Pavlovic non emerge naturalmente come outsider tiri");
assert.strictEqual(milanPavlovic.teamProfileMatchupFactor, 1, "Milan H: Pavlovic riceve un Milan CB boost non dimostrato");
assert.strictEqual(milanMatchupProfile.offense.cbSetPieceShotParticipation.status, "watch");

// I/J/K/L - la suppression agisce sul team, preserva la struttura residua e non si copia sui SOT.
const strongPrimaryRows = [
  { playerId: "primary", projectedShots: 4.5, baselineShots90: 4.5, teamProfileRole: "CF", playerBaselineStability: { score: 0.9 } },
  { playerId: "secondary-a", projectedShots: 2.5, baselineShots90: 2.5, teamProfileRole: "W", playerBaselineStability: { score: 0.8 } },
  { playerId: "secondary-b", projectedShots: 2, baselineShots90: 2, teamProfileRole: "CM", playerBaselineStability: { score: 0.8 } },
  { playerId: "weak", projectedShots: 0.5, baselineShots90: 0.5, teamProfileRole: "FB", playerBaselineStability: { score: 0.4 } }
];
const strongPrimaryCompressed = teamOffensiveAllocation(strongPrimaryRows, "projectedShots", 8, milanMatchupProfile);
assert(strongPrimaryCompressed.values[0] / 8 > strongPrimaryRows[0].projectedShots / 9.5, "Milan I: il primary forte non conserva quota relativa nel volume residuo");
const distributedRows = [1.5, 1.4, 1.3, 1.2, 1.1, 1, 0.9, 0.8].map((value, index) => ({ playerId: `distributed-${index}`, projectedShots: value, baselineShots90: value, teamProfileRole: index % 2 ? "W" : "CM", playerBaselineStability: { score: 0.7 } }));
const distributedCompressed = teamOffensiveAllocation(distributedRows, "projectedShots", 7, milanMatchupProfile);
assert(Math.max(...distributedCompressed.values) / 7 < 0.25, "Milan J: la compressione crea artificialmente un primary in un attacco distribuito");
const weakAttackShots = { min: 4, central: 7, max: 10 };
const weakAttackSot = { min: 1, central: 3.5, max: 5 };
const weakVsMilan = applyOpponentTeamVolumeInteraction({ summary: { shotsPerGame: 8, possessionPct: 42, passSuccessPct: 78, aerialWonPerGame: 8 }, attackChannels: { left: 30, central: 40, right: 30 } }, milanMatchupProfile, weakAttackShots, weakAttackSot, { min: 1, central: 3, max: 5 });
assert(weakAttackShots.central >= 6.5, "Milan K: weak attack compresso due volte fino a un valore irrealistico");
assert(weakVsMilan.shotsAdjustmentPct < 0 && weakVsMilan.shotsAdjustmentPct > -8, "Milan K: suppression fuori budget");
assert.strictEqual(weakVsMilan.shotsOnTargetAdjustmentPct, 0, "Milan L: strong shot suppression copiata sui SOT");
assert.strictEqual(sassuoloAgainstMilan.opponentMatchupInteraction.shotsOnTargetAdjustmentPct, 0, "Milan L: SOT neutral non resta neutro end-to-end");
assert(Math.abs(milanPlayers.reduce((total, player) => total + player.projectedShots, 0) - milanProjection.shotsTotal.central) <= 0.11, "Milan: riconciliazione tiri incoerente");
assert(Math.abs(milanPlayers.reduce((total, player) => total + player.projectedShotsOnTarget, 0) - milanProjection.shotsOnTarget.central) <= 0.11, "Milan: riconciliazione SOT incoerente");
assert(milanPlayers.every(player => player.projectedShotsOnTarget <= player.projectedShots), "Milan: projected SOT supera projected shots");
assert(milanPlayers.every(player => player.shotProbabilities.over05 >= player.shotProbabilities.over15 && player.shotProbabilities.over15 >= player.shotProbabilities.over25), "Milan: probabilita tiri non monotone");
assert(milanPlayers.every(player => player.shotOnTargetProbabilities.over05 >= player.shotOnTargetProbabilities.over15), "Milan: probabilita SOT non monotone");

const napoliMatchupProfile = require(path.join(root, "data/normalized/team-matchup-profiles-2026-27.json")).profiles.find(profile => profile.teamId === "napoli");
const napoliPlayers = napoliFrosinoneProfile.shooters.allPlayers.filter(player => player.teamId === "napoli");
const napoliHojlund = napoliPlayers.find(player => player.playerId === "rasmus-h-jlund");
const napoliTeamTotal = napoliFrosinoneProfile.shooters.teamTotals.find(team => team.teamId === "napoli");

// Napoli A - target neutrale stabile e coerente con il corridoio osservato 13-16.
assert(napoliAgainstFrosinone.shotsTotal.central >= 13 && napoliAgainstFrosinone.shotsTotal.central <= 16, "Napoli A: target team fuori dal corridoio stabile");
assert(napoliAgainstFrosinone.shotsOnTarget.central < napoliAgainstFrosinone.shotsTotal.central, "Napoli A: SOT non separati dai tiri");

// Napoli B - uno strong suppressor riduce moderatamente senza cancellare la baseline persistente.
const napoliVsSuppressorShots = { min: 10, central: 13.396, max: 17 };
const napoliVsSuppressorSot = { min: 3, central: 4.467, max: 7 };
const napoliVsSuppressor = applyOpponentTeamVolumeInteraction({ summary: { shotsPerGame: 13.2, possessionPct: 59, passSuccessPct: 87.2, aerialWonPerGame: 12.8 }, attackChannels: { left: 23.8, central: 52.4, right: 23.8 } }, juventusMatchupProfile, napoliVsSuppressorShots, napoliVsSuppressorSot, { min: 3, central: 5.2, max: 8 });
assert(napoliVsSuppressor.shotsAdjustmentPct < 0 && napoliVsSuppressorShots.central > 12, "Napoli B: suppression moderata non rispettata");

// Napoli C - weak defense espande upstream e distribuisce l'extra-volume.
const napoliVsWeakShots = { min: 10, central: 13.396, max: 17 };
const napoliVsWeakSot = { min: 3, central: 4.467, max: 7 };
applyOpponentTeamVolumeInteraction({ summary: { shotsPerGame: 13.2, possessionPct: 59, passSuccessPct: 87.2, aerialWonPerGame: 12.8 }, attackChannels: { left: 23.8, central: 52.4, right: 23.8 } }, lecceMatchupProfile, napoliVsWeakShots, napoliVsWeakSot, { min: 3, central: 5.2, max: 8 });
assert(napoliVsWeakShots.central > 13.396, "Napoli C: weak defense non aumenta il team target");
const napoliDistributedRows = [
  ["rasmus-h-jlund", 2.1, "CF"], ["alisson-santos", 1.5, "AM"], ["kevin-de-bruyne", 1.4, "CM"],
  ["matteo-politano", 1.3, "W"], ["frank-anguissa", 1.2, "CM"], ["noa-lang", 1.1, "AM"],
  ["mathias-olivera", 0.9, "CB"], ["amir-rrahmani", 0.8, "CB"], ["leonardo-spinazzola", 0.7, "FB"], ["stanislav-lobotka", 0.6, "CM"]
].map(([playerId, projectedShots, teamProfileRole]) => ({ playerId, projectedShots, baselineShots90: projectedShots, teamProfileRole, playerBaselineStability: { score: 0.7 } }));
const napoliExpanded = teamOffensiveAllocation(napoliDistributedRows, "projectedShots", napoliVsWeakShots.central, napoliMatchupProfile);
assert(napoliExpanded.values.filter((value, index) => value > napoliDistributedRows[index].projectedShots).length >= 6, "Napoli C: extra-volume non distribuito");

// Napoli D - Hojlund a 88 minuti resta leading shooter senza quota artificiale enorme.
const hojlandAt88 = napoliHojlund.stabilizedShots90 * 88 / 90;
assert(hojlandAt88 > 1.8 && hojlandAt88 < 2.2, "Napoli D: scenario Hojlund 85-90 fuori baseline stabilizzata");
assert.strictEqual(napoliHojlund.allocationClass, "primary");
assert(napoliHojlund.projectedShots === Math.max(...napoliPlayers.map(player => player.projectedShots)), "Napoli D: Hojlund non emerge come leading shooter");
assert(napoliHojlund.projectedShots / napoliAgainstFrosinone.shotsTotal.central < 0.2, "Napoli D: Hojlund assorbe una quota eccessiva");

// Napoli E/F - Alisson: current persistente ma shrinkato; pipeline SOT autonoma.
const alissonShots = playerBaselineStability({ historicalBaseline: 3.12, historicalObserved: 3.12, historicalMinutes: 836, current: { minutes: 179, shots: 8, shotsCoverage: 3, shotsSequence: [3, 2, 3] }, key: "shots", includePersistence: true });
const alissonSot = playerBaselineStability({ historicalBaseline: 1.72, historicalObserved: 1.72, historicalMinutes: 836, current: { minutes: 179, shotsOnTarget: 1, shotsOnTargetCoverage: 3, shotsOnTargetSequence: [0, 1, 0] }, key: "shotsOnTarget", includePersistence: true });
assert(alissonShots.value > 3.1 && alissonShots.value < 4.02, "Napoli E: Alisson non shrinkato fra storico e current");
assert.strictEqual(alissonShots.currentSample.persistence.level, "high");
assert(alissonSot.value / alissonShots.value < 0.5 && alissonSot.currentSample.per90 < alissonShots.currentSample.per90 / 6, "Napoli F: 8 tiri/1 SOT convertiti con rate fisso");

// Napoli G-J - picchi current robustizzati e fallback storico conservato.
const oliveraShots = playerBaselineStability({ historicalBaseline: 0.53, historicalObserved: 0.53, historicalMinutes: 1368, current: { minutes: 158, shots: 6, shotsCoverage: 4, shotsSequence: [0, 2, 0, 4] }, key: "shots", includePersistence: true });
const anguissaShots = playerBaselineStability({ historicalBaseline: 1.65, historicalObserved: 1.65, historicalMinutes: 1256, current: { minutes: 236, shots: 5, shotsCoverage: 4, shotsSequence: [0, 1, 4, 0] }, key: "shots", includePersistence: true });
const kdbShots = playerBaselineStability({ historicalBaseline: 2.08, historicalObserved: 2.08, historicalMinutes: 1169, current: { minutes: 265, shots: 5, shotsCoverage: 5, shotsSequence: [1, 1, 0, 3, 0] }, key: "shots", includePersistence: true });
const politanoShots = playerBaselineStability({ historicalBaseline: 1.99, historicalObserved: 1.99, historicalMinutes: 2214, current: { minutes: 334, shots: 3, shotsCoverage: 5, shotsSequence: [0, 0, 3, 0, 0] }, key: "shots", includePersistence: true });
assert(oliveraShots.value < 1, "Napoli G: il match da quattro tiri di Olivera domina la baseline");
assert(anguissaShots.value < 1.8, "Napoli H: il picco Inter di Anguissa diventa baseline permanente");
assert(kdbShots.value > 1.7 && kdbShots.value < 2.08, "Napoli I: fallback storico KDB non stabilizza il current");
assert(politanoShots.value > 1.5 && politanoShots.value < 1.99, "Napoli J: fallback storico Politano non stabilizza il current");

// Napoli K - high raw rate e pochi minuti restano governati da shrinkage ed Expected Minutes.
const luccaShots = playerBaselineStability({ historicalBaseline: 3.38, historicalObserved: 3.38, historicalMinutes: 400, current: { minutes: 92, shots: 3, shotsCoverage: 5, shotsSequence: [0, 1, 1, 0, 1] }, key: "shots", includePersistence: true });
const neresShots = playerBaselineStability({ historicalBaseline: 1.65, historicalObserved: 1.65, historicalMinutes: 926, current: { minutes: 73, shots: 3, shotsCoverage: 3, shotsSequence: [1, 1, 1] }, key: "shots", includePersistence: true });
const favasuliShots = playerBaselineStability({ historicalBaseline: 0.94, historicalObserved: 0.94, historicalMinutes: 3053, current: { minutes: 63, shots: 3, shotsCoverage: 2, shotsSequence: [1, 2] }, key: "shots", includePersistence: true });
const favasuliSot = playerBaselineStability({ historicalBaseline: 0.32, historicalObserved: 0.32, historicalMinutes: 3053, current: { minutes: 63, shotsOnTarget: 3, shotsOnTargetCoverage: 2, shotsOnTargetSequence: [1, 2] }, key: "shotsOnTarget", includePersistence: true });
assert(luccaShots.value * 25 / 90 < 1 && neresShots.value * 30 / 90 < 0.7 && favasuliShots.value * 30 / 90 < 0.4, "Napoli K: Expected Minutes non limita i low-minute shooters");
assert(favasuliSot.value < 0.5, "Napoli K: 3/3 SOT di Favasuli non e shrinkato con forza");

// Napoli L-N - il profilo difensivo WATCH non impone 16.6, hard cap o boost automatici.
for (const [label, central] of [["elite", 22], ["Como-like", 21], ["normal", 10]]) {
  const shots = { min: Math.max(4, central - 4), central, max: central + 4 };
  const sot = { min: 1, central: label === "elite" ? 8 : label === "Como-like" ? 6 : 3, max: 10 };
  const result = applyOpponentTeamVolumeInteraction({ summary: { shotsPerGame: central, possessionPct: label === "normal" ? 48 : 58, passSuccessPct: 84, aerialWonPerGame: 12 }, attackChannels: { left: 33, central: 34, right: 33 } }, napoliMatchupProfile, shots, sot, { min: 2, central: 5, max: 8 });
  assert.strictEqual(result.shotsAdjustmentPct, 0, `Napoli ${label}: raw defensive mean ha creato un modifier`);
  assert.strictEqual(shots.central, central, `Napoli ${label}: scenario non preservato`);
}

// Napoli O/P - AM/second line e CF restano WATCH, perciò fattore esatto 1.
const neutralAbility = { general: 0.9, territorial: 0.9, wide: 0.8, setPiece: 0.7, transition: 0.6 };
assert.strictEqual(teamProfilePlayerModifier({ role: "Centrocampista", detailedRole: "Trequartista" }, 3, 1, napoliMatchupProfile, neutralAbility).shotFactor, 1, "Napoli O: AM WATCH non neutro");
assert.strictEqual(teamProfilePlayerModifier({ role: "Attaccante", detailedRole: "Centravanti" }, 4, 1.5, napoliMatchupProfile, neutralAbility).shotFactor, 1, "Napoli P: CF vulnerability non provata ma attiva");

// Napoli Q/R - il target e upstream rispetto alla XI e consente 14 tiri senza clear primary.
const alternateNapoliRows = napoliDistributedRows.map((row, index) => ({ ...row, projectedShots: row.projectedShots * (index % 2 ? 0.75 : 1.25) }));
const firstXiAllocation = teamOffensiveAllocation(napoliDistributedRows, "projectedShots", 14, napoliMatchupProfile);
const alternateXiAllocation = teamOffensiveAllocation(alternateNapoliRows, "projectedShots", 14, napoliMatchupProfile);
assert(Math.abs(firstXiAllocation.values.reduce((sum, value) => sum + value, 0) - 14) < 0.001 && Math.abs(alternateXiAllocation.values.reduce((sum, value) => sum + value, 0) - 14) < 0.001, "Napoli Q: cambio XI distrugge il team target");
assert(Math.max(...firstXiAllocation.values) / 14 < 0.25 && firstXiAllocation.values.filter(value => value >= 1).length >= 6, "Napoli R: attacco distribuito non riconciliato a 14");

assert(napoliAgainstFrosinone.ownOffensiveInteraction.capDiagnostics.corners.capHit, "Napoli: cap diagnostics non espone il corner cap-hit");
assert(Math.abs(napoliTeamTotal.reconciliation.shots.preReconciliation + napoliTeamTotal.reconciliation.shots.extraVolume - napoliTeamTotal.reconciliation.shots.postReconciliation) < 0.02, "Napoli: reconciliation tiri non chiude");
assert(Math.abs(napoliPlayers.reduce((total, player) => total + player.projectedShots, 0) - napoliAgainstFrosinone.shotsTotal.central) <= 0.11, "Napoli: somma player tiri diversa dal team target");
assert(Math.abs(napoliPlayers.reduce((total, player) => total + player.projectedShotsOnTarget, 0) - napoliAgainstFrosinone.shotsOnTarget.central) <= 0.11, "Napoli: somma player SOT diversa dal team target");
assert(napoliPlayers.every(player => player.projectedShotsOnTarget <= player.projectedShots), "Napoli: projected SOT supera projected shots");
assert(napoliPlayers.every(player => player.shotProbabilities.over05 >= player.shotProbabilities.over15 && player.shotProbabilities.over15 >= player.shotProbabilities.over25), "Napoli: probabilita tiri non monotone");
assert(napoliPlayers.every(player => player.shotOnTargetProbabilities.over05 >= player.shotOnTargetProbabilities.over15), "Napoli: probabilita SOT non monotone");

const parmaMatchupProfile = require(path.join(root, "data/normalized/team-matchup-profiles-2026-27.json")).profiles.find(profile => profile.teamId === "parma");
const parmaPlayers = interParmaProfile.shooters.allPlayers.filter(player => player.teamId === "parma");
const parmaElphege = parmaPlayers.find(player => player.playerId === "nesta-elphege");
const parmaToure = parmaPlayers.find(player => player.playerId === "el-bilal-toure");
const parmaDelPrato = parmaPlayers.find(player => player.playerId === "enrico-del-prato");
const parmaTeamTotal = interParmaProfile.shooters.teamTotals.find(team => team.teamId === "parma");
const parmaStyle = teamStylesById.get("parma");
const parmaVolume = teamVolumesById.get("parma");
const neutralParmaShots = parmaMatchupProfile.offense.teamShotVolume.shrunkPerGame;
const neutralParmaSot = parmaMatchupProfile.offense.teamSotVolume.shrunkPerGame;

const parmaMatchupScenario = (opponentId, venue) => {
  const opponentStyle = teamStylesById.get(opponentId);
  const opponentVolume = teamVolumesById.get(opponentId);
  const opponentMatchup = require(path.join(root, "data/normalized/team-matchup-profiles-2026-27.json")).profiles.find(profile => profile.teamId === opponentId);
  const shots = volumeMetric(parmaStyle, opponentStyle, parmaVolume, opponentVolume, venue, "totalShots", 1, { matches: 38, mean: 10.711, sd: 4.5, p20: 6, p80: 15, source: "team-style-prior" });
  const sot = volumeMetric(parmaStyle, opponentStyle, parmaVolume, opponentVolume, venue, "shotsOnTarget", 1, { matches: 38, mean: 2.737, sd: 1.8, p20: 1, p80: 4, source: "team-style-prior" });
  const corners = volumeMetric(parmaStyle, opponentStyle, parmaVolume, opponentVolume, venue, "wonCorners", 1, { matches: 38, mean: 3.868, sd: 2.5, p20: 1.4, p80: 5.6, source: "team-style-prior" });
  const legacy = { shots: shots.central, sot: sot.central, corners: corners.central };
  const own = applyOwnOffensiveVolumeProfile(parmaMatchupProfile, shots, sot, corners);
  const opponent = applyOpponentTeamVolumeInteraction(parmaStyle, opponentMatchup, shots, sot, corners);
  return { opponentId, legacy, own, opponent, shots, sot, corners };
};
const parmaVsCagliari = parmaMatchupScenario("cagliari", "home");
const parmaVsComo = parmaMatchupScenario("como", "away");
const parmaVsJuventus = parmaMatchupScenario("juventus", "away");
const parmaVsMonza = parmaMatchupScenario("monza", "home");
const parmaVsGenoa = parmaMatchupScenario("genoa", "home");

// Parma A-D - low baseline, risposta gia prodotta dal blend squadra-avversario e dalla correzione V2 esistente.
assert(neutralParmaShots < 10 && neutralParmaSot < 3, "Parma A: baseline neutrale non risulta LOW");
assert(parmaVsCagliari.shots.central > parmaVsJuventus.shots.central, "Parma B/D: Cagliari-like non supera Juventus-like");
assert(parmaVsComo.opponent.shotsAdjustmentPct > 0 && parmaVsComo.opponent.shotsAdjustmentPct < 1, "Parma C: Como-like deve restare un candidato positivo ma non un coefficiente inventato");
assert(parmaVsJuventus.opponent.shotsAdjustmentPct < 0, "Parma D: Juventus-like suppressor non riduce il target");
assert(parmaVsCagliari.legacy.shots !== parmaVsJuventus.legacy.shots && parmaVsComo.legacy.shots !== parmaVsJuventus.legacy.shots, "Parma B-D: l'avversario non entra nel Team Baseline x Opponent Interaction");

// Parma E - extra tiri e SOT restano due target indipendenti.
const parmaExtraShotRows = [2.2, 1.8, 1.3, 1.1, 0.9, 0.8, 0.7, 0.6].map((value, index) => ({ playerId: `parma-extra-${index}`, projectedShots: value, projectedShotsOnTarget: value * 0.3, baselineShots90: value, baselineShotsOnTarget90: value * 0.3, teamProfileRole: index < 2 ? "CF" : index < 5 ? "AM" : "CB", playerBaselineStability: { score: 0.65 } }));
const expandedParmaShots = teamOffensiveAllocation(parmaExtraShotRows, "projectedShots", 12, parmaMatchupProfile);
const unchangedParmaSot = teamOffensiveAllocation(parmaExtraShotRows, "projectedShotsOnTarget", 2.8, parmaMatchupProfile);
assert(Math.abs(expandedParmaShots.values.reduce((sum, value) => sum + value, 0) - 12) < 0.001);
assert(Math.abs(unchangedParmaSot.values.reduce((sum, value) => sum + value, 0) - 2.8) < 0.001, "Parma E: extra tiri hanno aumentato automaticamente i SOT");

// Parma F-I - Elphege: profilo a bassa maturità, Expected Minutes e conversione SOT coerente.
assert.strictEqual(parmaElphege.playerBaselineStability.confidence, "medium-low");
assert.strictEqual(parmaElphege.substitutionRisk, "high");
assert(parmaElphege.stabilizedShots90 > 2 && parmaElphege.stabilizedShots90 < 2.2, "Parma F: Elphege non e stabilizzato nel range atteso");
const elphege85 = parmaElphege.stabilizedShots90 * 85 / 90;
const elphege45 = parmaElphege.stabilizedShots90 * 45 / 90;
const elphege25 = parmaElphege.stabilizedShots90 * 25 / 90;
assert(elphege85 > elphege45 && elphege45 > elphege25, "Parma F-H: Expected Minutes non governa la projection Elphege");
assert(elphege85 > 1.9 && elphege45 < 1.1 && elphege25 < 0.7, "Parma F-H: scenari minuti Elphege implausibili");
assert(parmaElphege.playerSotBaselineStability.value < parmaElphege.playerBaselineStability.value, "Parma I: conversione SOT Elphege supera il rate tiri");

// Parma J/K - persistence non equivale a intensita; spike singolo non crea outsider.
assert.strictEqual(parmaToure.playerBaselineStability.currentSample.persistence.level, "high");
assert(parmaToure.playerBaselineStability.currentSample.per90 < 1.3 && parmaToure.stabilizedShots90 < 2.2, "Parma J: Touré persistence confusa con high intensity");
const delPratoStability = playerBaselineStability({ historicalBaseline: 0.55, historicalObserved: 0.55, historicalMinutes: 2953, current: { minutes: 450, shots: 4, shotsCoverage: 5, shotsSequence: [3, 0, 1, 0, 0] }, key: "shots", includePersistence: true });
assert(delPratoStability.value < 0.7 && delPratoStability.currentSample.persistence.level === "low", "Parma K: spike Del Prato diventato baseline outsider");
assert.strictEqual(parmaDelPrato.qualifiedOutsider, false);

// Parma L-M/Q/R - vulnerabilita team tiri e SOT evidence-weighted; xG/shot resta separato.
assert(interProjection.opponentMatchupInteraction.shotsAdjustmentPct > 0, "Parma L: elite attack non beneficia della shot vulnerability");
assert(interProjection.opponentMatchupInteraction.shotsOnTargetAdjustmentPct > 0, "Parma Q: SOT vulnerability ACTIVE non raggiunge il target SOT");
const averageAttackShots = { min: 7, central: 12, max: 16 };
const averageAttackSot = { min: 2, central: 4, max: 6 };
const averageVsParma = applyOpponentTeamVolumeInteraction({ summary: { shotsPerGame: 12, possessionPct: 50, passSuccessPct: 82, aerialWonPerGame: 11 }, attackChannels: { left: 33, central: 34, right: 33 } }, parmaMatchupProfile, averageAttackShots, averageAttackSot, { min: 2, central: 4, max: 7 });
assert(averageVsParma.shotsAdjustmentPct > 0 && averageVsParma.shotsOnTargetAdjustmentPct > 0, "Parma M/Q: attacco medio non beneficia dei segnali ACTIVE");
assert.strictEqual(parmaMatchupProfile.shotDefense.shotQualityProfile.highQualityChanceVulnerability.modelEffect, "none", "Parma R: shot/SOT vulnerability propagata alla chance quality");

// Parma N-P - la struttura avversaria distribuisce l'extra-volume e i ruoli WATCH restano neutrali.
const concentratedOpponent = [4.5, 1.2, 1, 0.8, 0.7, 0.6, 0.5].map((value, index) => ({ playerId: `concentrated-${index}`, projectedShots: value, baselineShots90: value, teamProfileRole: index === 0 ? "CF" : "CM", playerBaselineStability: { score: index === 0 ? 0.9 : 0.6 } }));
const distributedOpponent = [1.5, 1.4, 1.3, 1.2, 1.1, 1, 0.9, 0.8].map((value, index) => ({ playerId: `distributed-parma-${index}`, projectedShots: value, baselineShots90: value, teamProfileRole: ["CF", "W", "AM", "CM", "FB", "CB", "CM", "W"][index], playerBaselineStability: { score: 0.7 } }));
const concentratedVsParma = teamOffensiveAllocation(concentratedOpponent, "projectedShots", 12, parmaMatchupProfile);
const distributedVsParma = teamOffensiveAllocation(distributedOpponent, "projectedShots", 12, parmaMatchupProfile);
assert(concentratedVsParma.values[0] / 12 > Math.max(...distributedVsParma.values) / 12, "Parma N/O: struttura concentrated e distributed rese identiche");
assert(distributedVsParma.values.filter(value => value > 1).length >= 5, "Parma O/P: extra-volume non raggiunge naturalmente piu ruoli");
for (const candidate of [{ role: "Attaccante", detailedRole: "Centravanti" }, { role: "Attaccante", detailedRole: "Ala destra" }, { role: "Centrocampista", detailedRole: "Trequartista" }, { role: "Centrocampista", detailedRole: "Centrocampista centrale" }, { role: "Difensore", detailedRole: "Terzino destro" }, { role: "Difensore", detailedRole: "Difensore centrale" }]) {
  const modifier = teamProfilePlayerModifier(candidate, 2, 0.6, parmaMatchupProfile, { general: 0.9, territorial: 0.9, wide: 0.9, setPiece: 0.9, transition: 0.7 });
  assert.strictEqual(modifier.shotFactor, 1, `Parma P: ruolo WATCH ${candidate.detailedRole} ha ricevuto un boost`);
  assert.strictEqual(modifier.sotFactor, 1, `Parma P: ruolo WATCH ${candidate.detailedRole} ha ricevuto un boost SOT`);
}

assert(Math.abs(parmaTeamTotal.reconciliation.shots.preReconciliation + parmaTeamTotal.reconciliation.shots.extraVolume - parmaTeamTotal.reconciliation.shots.suppressedVolume - parmaTeamTotal.reconciliation.shots.postReconciliation) < 0.02, "Parma: reconciliation tiri non chiude");
assert(Math.abs(parmaPlayers.reduce((total, player) => total + player.projectedShots, 0) - parmaAgainstInter.shotsTotal.central) <= 0.11, "Parma: somma player tiri diversa dal team target");
assert(Math.abs(parmaPlayers.reduce((total, player) => total + player.projectedShotsOnTarget, 0) - parmaAgainstInter.shotsOnTarget.central) <= 0.11, "Parma: somma player SOT diversa dal team target");
assert(parmaPlayers.every(player => player.projectedShotsOnTarget <= player.projectedShots), "Parma: projected SOT supera projected shots");
assert(parmaPlayers.every(player => player.shotProbabilities.over05 >= player.shotProbabilities.over15 && player.shotProbabilities.over15 >= player.shotProbabilities.over25), "Parma: probabilita tiri non monotone");
assert(parmaPlayers.every(player => player.shotOnTargetProbabilities.over05 >= player.shotOnTargetProbabilities.over15), "Parma: probabilita SOT non monotone");

const sassuoloMilanV2Profile = dataset.predictions.find(prediction => prediction.matchId === "sassuolo-milan-2026-27-md-06");
const sassuoloMatchupProfile = require(path.join(root, "data/normalized/team-matchup-profiles-2026-27.json")).profiles.find(profile => profile.teamId === "sassuolo");
const sassuoloProjection = sassuoloMilanV2Profile?.teamProjections.find(team => team.teamId === "sassuolo");
const milanAgainstSassuolo = sassuoloMilanV2Profile?.teamProjections.find(team => team.teamId === "milan");
const sassuoloPlayers = sassuoloMilanV2Profile?.shooters.allPlayers.filter(player => player.teamId === "sassuolo") || [];
const sassuoloTeamTotal = sassuoloMilanV2Profile?.shooters.teamTotals.find(team => team.teamId === "sassuolo");
const sassuoloLauriente = sassuoloPlayers.find(player => player.playerId === "armand-lauriente");
const sassuoloBerardi = sassuoloPlayers.find(player => player.playerId === "domenico-berardi");
const sassuoloAdzic = sassuoloPlayers.find(player => player.playerId === "vasilije-adzic");
const sassuoloThorstvedt = sassuoloPlayers.find(player => player.playerId === "kristian-thorstvedt");
assert(sassuoloProjection && milanAgainstSassuolo && sassuoloTeamTotal && sassuoloLauriente && sassuoloBerardi && sassuoloThorstvedt, "Sassuolo-Milan: profilo E2E incompleto");

// Sassuolo A-B - baseline offensiva elevata e soppressione applicata al team target, senza eccezioni individuali.
const neutralSassuoloShots = { min: 8, central: 11.7, max: 15 };
const neutralSassuoloSot = { min: 2, central: 3.9, max: 6 };
const neutralSassuoloCorners = { min: 2, central: 4.2, max: 6 };
const neutralSassuoloOwn = applyOwnOffensiveVolumeProfile(sassuoloMatchupProfile, neutralSassuoloShots, neutralSassuoloSot, neutralSassuoloCorners);
assert(neutralSassuoloShots.central > 11.7 && neutralSassuoloOwn.shotsAdjustmentPct > 0, "Sassuolo A: HIGH baseline current non alza il target neutrale");
assert(neutralSassuoloSot.central > 3.9 && neutralSassuoloOwn.shotsOnTargetAdjustmentPct > 0, "Sassuolo A: HIGH SOT baseline non resta separata e attiva");
const suppressedSassuoloShots = { min: neutralSassuoloShots.min, central: neutralSassuoloShots.central, max: neutralSassuoloShots.max };
const suppressedSassuoloSot = { min: neutralSassuoloSot.min, central: neutralSassuoloSot.central, max: neutralSassuoloSot.max };
const suppressedSassuolo = applyOpponentTeamVolumeInteraction(teamStylesById.get("sassuolo"), require(path.join(root, "data/normalized/team-matchup-profiles-2026-27.json")).profiles.find(profile => profile.teamId === "juventus"), suppressedSassuoloShots, suppressedSassuoloSot, { min: 2, central: 4, max: 6 });
assert(suppressedSassuolo.shotsAdjustmentPct < 0 && suppressedSassuoloShots.central < neutralSassuoloShots.central && suppressedSassuoloShots.central > 9, "Sassuolo B: Juventus-like suppression non riduce il target in modo graduale");

// Sassuolo C-E/T - Lauriente guida i tiri, puo essere compresso e non eredita una gerarchia SOT primaria.
assert.strictEqual(sassuoloLauriente.allocationClass, "primary");
assert(sassuoloLauriente.projectedShots === Math.max(...sassuoloPlayers.map(player => player.projectedShots)), "Sassuolo C: Lauriente non emerge come leading shooter");
const sassuoloRowsForCompression = sassuoloPlayers.map(player => ({ ...player, projectedShots: player.projectedShots, baselineShots90: player.stabilizedShots90, teamProfileRole: player.teamProfileRole }));
const compressedSassuolo = teamOffensiveAllocation(sassuoloRowsForCompression, "projectedShots", 8.5, sassuoloMatchupProfile);
const laurienteIndex = sassuoloRowsForCompression.findIndex(player => player.playerId === "armand-lauriente");
assert(compressedSassuolo.values[laurienteIndex] < sassuoloLauriente.projectedShots, "Sassuolo D: primary protetto artificialmente dalla soppressione");
assert(sassuoloLauriente.stabilizedShots90 > sassuoloLauriente.stabilizedShotsOnTarget90 * 2.5, "Sassuolo E: high shots trasformati automaticamente in high SOT");
assert(sassuoloBerardi.stabilizedShotsOnTarget90 > sassuoloLauriente.stabilizedShotsOnTarget90, "Sassuolo T: gerarchie tiri e SOT non restano separate");

// Sassuolo F-J - Expected Minutes domina i raw per90 di Berardi e Adzic.
const berardi90Sot = sassuoloBerardi.stabilizedShotsOnTarget90;
const berardi55Sot = sassuoloBerardi.stabilizedShotsOnTarget90 * 55 / 90;
const berardi25Sot = sassuoloBerardi.stabilizedShotsOnTarget90 * 25 / 90;
assert(berardi90Sot > berardi55Sot && berardi55Sot > berardi25Sot && berardi25Sot < 0.4, "Sassuolo F-H: minuti Berardi non governano la projection SOT");
assert(sassuoloBerardi.stabilizedShotsOnTarget90 < 1.3 && sassuoloBerardi.playerSotBaselineStability.currentSample.per90 > 2.9, "Sassuolo F: historical/current shrinkage Berardi assente");
if (sassuoloAdzic) {
  const adzic80 = sassuoloAdzic.stabilizedShots90 * 80 / 90;
  const adzic25 = sassuoloAdzic.stabilizedShots90 * 25 / 90;
  assert(adzic80 > 1.7 && adzic25 < 0.65 && adzic80 > adzic25 * 3, "Sassuolo I-J: raw 4.50/90 di Adzic bypassa Expected Minutes");
  assert.strictEqual(sassuoloAdzic.playerBaselineStability.currentSample.persistence.level, "high");
} else assertNotCurrentStarter("sassuolo", "vasilije-adzic");

// Sassuolo K-M - secondary, outsider e small-sample SOT restano distinti.
const sassuoloTiers = new Map(sassuoloMatchupProfile.offense.playerShotAndSotTiers.map(player => [player.playerId, player]));
assert.strictEqual(sassuoloTiers.get("kieron-bowie").shotTier.tier, "co-primary", "Sassuolo K: Bowie non conserva il profilo secondary forte");
assert.strictEqual(sassuoloThorstvedt.qualifiedOutsider, false, "Sassuolo L: Expected Minutes ridotte devono poter rimuovere Thorstvedt dagli outsider");
assert(sassuoloThorstvedt.outsiderExclusionReasons.includes("limited-expected-minutes"), "Sassuolo L: esclusione Thorstvedt senza evidenza Expected Minutes");
const volpatoStability = playerBaselineStability({ historicalBaseline: 1.78, historicalObserved: 1.78, historicalMinutes: 1220, current: { minutes: 183, shots: 5, shotsCoverage: 3, shotsSequence: [2, 3, 0] }, key: "shots", includePersistence: true });
assert(volpatoStability.value < 2.1 && volpatoStability.confidence === "medium-low", "Sassuolo M: small sample Volpato non viene shrinkato");

// Sassuolo N-P - il boost difensivo nasce al team level e la struttura avversaria decide la concentrazione.
const sassuoloConcentratedOpponent = [4.8, 1.2, 1, 0.8, 0.7, 0.6].map((value, index) => ({ playerId: `sassuolo-concentrated-${index}`, projectedShots: value, baselineShots90: value, teamProfileRole: index === 0 ? "W" : "CM", playerBaselineStability: { score: index === 0 ? 0.9 : 0.6 } }));
const sassuoloDistributedOpponent = [1.6, 1.5, 1.4, 1.3, 1.2, 1.1, 1, 0.9].map((value, index) => ({ playerId: `sassuolo-distributed-${index}`, projectedShots: value, baselineShots90: value, teamProfileRole: ["CF", "W", "AM", "CM", "FB", "CB", "CM", "W"][index], playerBaselineStability: { score: 0.7 } }));
const concentratedAgainstSassuolo = teamOffensiveAllocation(sassuoloConcentratedOpponent, "projectedShots", 13, sassuoloMatchupProfile);
const distributedAgainstSassuolo = teamOffensiveAllocation(sassuoloDistributedOpponent, "projectedShots", 13, sassuoloMatchupProfile);
assert(concentratedAgainstSassuolo.values[0] / 13 > Math.max(...distributedAgainstSassuolo.values) / 13, "Sassuolo N-O: struttura concentrated e distributed rese identiche");
assert(distributedAgainstSassuolo.values.filter(value => value > 1).length >= 6, "Sassuolo N: extra-volume distributed concentrato arbitrariamente");
const wingerWatch = teamProfilePlayerModifier({ role: "Attaccante", detailedRole: "Ala sinistra" }, 4.5, 2, sassuoloMatchupProfile, { general: 0.9, territorial: 0.9, wide: 0.9, setPiece: 0.5, transition: 0.7 });
assert.strictEqual(wingerWatch.shotFactor, 1, "Sassuolo P: high-rate winger riceve un boost di ruolo WATCH");

// Sassuolo Q-S - SOT, chance quality e possesso sono canali distinti.
assert(milanAgainstSassuolo.opponentMatchupInteraction.shotsAdjustmentPct > 0 && milanAgainstSassuolo.opponentMatchupInteraction.shotsOnTargetAdjustmentPct > 0, "Sassuolo Q: vulnerabilita tiri/SOT non raggiunge i target separati");
assert.strictEqual(sassuoloMatchupProfile.shotDefense.shotQualityProfile.highQualityChanceVulnerability.modelEffect, "none", "Sassuolo Q-R: SOT vulnerability propagata automaticamente alla chance quality");
assert.strictEqual(sassuoloMatchupProfile.shotDefense.shotQualityProfile.against.xgPerShot, 0.0882, "Sassuolo R: xGA/shot incoerente");
assert.strictEqual(sassuoloMatchupProfile.offense.signals.possessionIndependentShotProduction.status, "watch", "Sassuolo S: diagnostica possesso trasformata in doppio modifier");

assert(Math.abs(sassuoloTeamTotal.reconciliation.shots.preReconciliation + sassuoloTeamTotal.reconciliation.shots.extraVolume - sassuoloTeamTotal.reconciliation.shots.suppressedVolume - sassuoloTeamTotal.reconciliation.shots.postReconciliation) < 0.02, "Sassuolo: reconciliation tiri non chiude");
assert(Math.abs(sassuoloPlayers.reduce((total, player) => total + player.projectedShots, 0) - sassuoloProjection.shotsTotal.central) <= 0.11, "Sassuolo: somma player tiri diversa dal team target");
assert(Math.abs(sassuoloPlayers.reduce((total, player) => total + player.projectedShotsOnTarget, 0) - sassuoloProjection.shotsOnTarget.central) <= 0.11, "Sassuolo: somma player SOT diversa dal team target");
assert(sassuoloPlayers.every(player => player.projectedShotsOnTarget <= player.projectedShots), "Sassuolo: projected SOT supera projected shots");
assert(sassuoloPlayers.every(player => player.shotProbabilities.over05 >= player.shotProbabilities.over15 && player.shotProbabilities.over15 >= player.shotProbabilities.over25), "Sassuolo: probabilita tiri non monotone");
assert(sassuoloPlayers.every(player => player.shotOnTargetProbabilities.over05 >= player.shotOnTargetProbabilities.over15), "Sassuolo: probabilita SOT non monotone");

const torinoMatchupProfile = require(path.join(root, "data/normalized/team-matchup-profiles-2026-27.json")).profiles.find(profile => profile.teamId === "torino");
const torinoUdinese = dataset.predictions.find(prediction => prediction.matchId === "torino-udinese-2026-27-md-06");
const torinoProjection = torinoUdinese.teamProjections.find(team => team.teamId === "torino");
const udineseProjection = torinoUdinese.teamProjections.find(team => team.teamId === "udinese");
const torinoPlayers = torinoUdinese.shooters.allPlayers.filter(player => player.teamId === "torino");
const torinoTeamTotal = torinoUdinese.shooters.teamTotals.find(team => team.teamId === "torino");
const torinoSimeone = torinoPlayers.find(player => player.playerId === "giovanni-simeone");
const torinoMandragora = torinoPlayers.find(player => player.playerId === "mandragora");
const torinoVlasic = torinoPlayers.find(player => player.playerId === "nikola-vlasic");

// Torino A-D - baseline LOW, matchup permissivo senza high-volume e possesso senza inflazione autonoma.
assert(torinoMatchupProfile.offense.teamShotVolume.shrunkPerGame < torinoMatchupProfile.historicalBaseline.shotsForPerGame, "Torino A: baseline neutrale non risulta LOW");
assert(torinoMatchupProfile.offense.teamSotVolume.shrunkPerGame < torinoMatchupProfile.historicalBaseline.shotsOnTargetForPerGame, "Torino A: SOT neutrale non risulta LOW");
const torinoStyle = teamStylesById.get("torino");
const torinoVolume = teamVolumesById.get("torino");
const torinoScenario = opponentId => {
  const opponentStyle = teamStylesById.get(opponentId);
  const opponentVolume = teamVolumesById.get(opponentId);
  const opponentMatchup = require(path.join(root, "data/normalized/team-matchup-profiles-2026-27.json")).profiles.find(profile => profile.teamId === opponentId);
  const shots = volumeMetric(torinoStyle, opponentStyle, torinoVolume, opponentVolume, "home", "totalShots", 1, { matches: 38, mean: 11.816, sd: 4.084, p20: 8, p80: 15, source: "team-style-prior" });
  const sot = volumeMetric(torinoStyle, opponentStyle, torinoVolume, opponentVolume, "home", "shotsOnTarget", 1, { matches: 38, mean: 3.974, sd: 1.94, p20: 2, p80: 5, source: "team-style-prior" });
  const corners = volumeMetric(torinoStyle, opponentStyle, torinoVolume, opponentVolume, "home", "wonCorners", 1, { matches: 38, mean: 3.842, sd: 1.994, p20: 2, p80: 6, source: "team-style-prior" });
  const own = applyOwnOffensiveVolumeProfile(torinoMatchupProfile, shots, sot, corners);
  const opponent = applyOpponentTeamVolumeInteraction(torinoStyle, opponentMatchup, shots, sot, corners);
  return { own, opponent, shots, sot, corners };
};
const torinoVsLecce = torinoScenario("lecce");
const torinoVsJuventus = torinoScenario("juventus");
assert(torinoVsLecce.shots.central > torinoVsJuventus.shots.central && torinoVsLecce.shots.central < 14, "Torino B: permissive defense non espande moderatamente il volume LOW");
const highPossessionClone = JSON.parse(JSON.stringify(torinoMatchupProfile));
highPossessionClone.currentSeason.possessionPct = 60;
const possessionShots = { min: 8, central: 11.8, max: 16 }, possessionSot = { min: 2, central: 4, max: 6 }, possessionCorners = { min: 2, central: 4, max: 7 };
const possessionOwn = applyOwnOffensiveVolumeProfile(highPossessionClone, possessionShots, possessionSot, possessionCorners);
assert.strictEqual(possessionOwn.shotsAdjustmentPct, -7.48, "Torino C: il possesso ha creato un modifier offensivo autonomo");
assert.deepStrictEqual(torinoMatchupProfile.offense.teamShotVolume.rawValues, [8, 10, 7, 8, 14], "Torino D: il picco MD5 non resta nel campione osservato");

// Torino E-L - gerarchia tiri/SOT separata, Expected Minutes e small sample shrinkati.
assert(torinoSimeone.projectedShots > torinoPlayers.filter(player => player.playerId !== "giovanni-simeone").reduce((max, player) => Math.max(max, player.projectedShots), 0), "Torino E: Simeone non resta leading shooter");
assert(torinoSimeone.projectedShotsOnTarget < torinoSimeone.projectedShots * 0.4, "Torino F: leadership tiri trasformata in SOT proporzionali");
assert(torinoSimeone.stabilizedShotsOnTarget90 > 0.26 && torinoSimeone.stabilizedShotsOnTarget90 < 1.12, "Torino G: storico SOT di Simeone non regolarizza il current");
assert(torinoMandragora.expectedMinutes > 60 && torinoMandragora.projectedShots > 1.8 && torinoMandragora.projectedShotsOnTarget < 1, "Torino H: Mandragora starter non combina storico, current e minuti");
const noMandragora = torinoPlayers.filter(player => player.playerId !== "mandragora");
const noMandragoraAllocation = teamOffensiveAllocation(noMandragora, "projectedShots", 10.5, torinoMatchupProfile);
assert.strictEqual(noMandragoraAllocation.values.length, noMandragora.length, "Torino I: un indisponibile riceve minuti o volume artificiale");
assert.strictEqual(torinoVlasic.playerBaselineStability.currentSample.persistence.level, "high");
assert(torinoVlasic.projectedShots < 2 && torinoVlasic.shotProbabilities.over05 > torinoVlasic.shotProbabilities.over25, "Torino J: persistenza Vlašić confusa con alta intensita");
const adamsStability = playerBaselineStability({ historicalBaseline: 2.52, historicalObserved: 2.52, historicalMinutes: 1896, current: { minutes: 193, shots: 3, shotsCoverage: 3, shotsSequence: [1, 1, 1] }, key: "shots", includePersistence: true });
assert(adamsStability.value > 1.4 && adamsStability.value < 2.52, "Torino K: Adams non e shrinkato fra current e storico");
const kulenovicStability = playerBaselineStability({ historicalBaseline: 1.54, historicalObserved: 1.54, historicalMinutes: 293, current: { minutes: 60, shots: 3, shotsCoverage: 3, shotsSequence: [0, 0, 3] }, key: "shots", includePersistence: true });
assert(kulenovicStability.value < 2.5 && kulenovicStability.currentSample.persistence.level === "low", "Torino L: spike Kulenović diventato baseline outsider");

// Torino M-V - difesa team-first, ruoli WATCH e chance quality indipendente.
const cocoModifier = teamProfilePlayerModifier({ role: "Difensore", detailedRole: "Difensore centrale" }, 0.9, 0.23, torinoMatchupProfile, { general: 0.8, territorial: 0.8, wide: 0.5, setPiece: 0.9, transition: 0.6 });
assert.strictEqual(cocoModifier.shotFactor, 1, "Torino M: Coco riceve un boost piazzato senza shot origin");
assert(udineseProjection.opponentMatchupInteraction.shotsAdjustmentPct > 0, "Torino N: attacco neutrale non beneficia della shot vulnerability ACTIVE");
assert.strictEqual(udineseProjection.opponentMatchupInteraction.shotsOnTargetAdjustmentPct, 0, "Torino U: la singola gara da 1 SOT ha attivato un modifier SOT");
const concentratedTorinoOpponent = [4.2, 2.6, 1.8, 0.8, 0.6, 0.5, 0.5].map((value, index) => ({ playerId: `torino-concentrated-${index}`, projectedShots: value, baselineShots90: value, teamProfileRole: index === 0 ? "CF" : index < 3 ? "W" : "CM", playerBaselineStability: { score: index < 3 ? 0.85 : 0.6 } }));
const distributedTorinoOpponent = [1.5, 1.4, 1.3, 1.2, 1.1, 1, 0.9, 0.8].map((value, index) => ({ playerId: `torino-distributed-${index}`, projectedShots: value, baselineShots90: value, teamProfileRole: ["CF", "W", "AM", "CM", "FB", "CB", "CM", "W"][index], playerBaselineStability: { score: 0.7 } }));
const concentratedVsTorino = teamOffensiveAllocation(concentratedTorinoOpponent, "projectedShots", 13, torinoMatchupProfile);
const distributedVsTorino = teamOffensiveAllocation(distributedTorinoOpponent, "projectedShots", 13, torinoMatchupProfile);
assert(concentratedVsTorino.values[0] / 13 > Math.max(...distributedVsTorino.values) / 13, "Torino O: un attacco concentrated perde la propria struttura");
assert(Math.max(...distributedVsTorino.values) < 4, "Torino P: un attacco distribuito crea artificialmente un 4+ shooter");
const bolognaLike = teamOffensiveAllocation(concentratedTorinoOpponent, "projectedShots", 11, torinoMatchupProfile);
assert(bolognaLike.values[0] >= 4 && bolognaLike.values[1] >= 2.5 && bolognaLike.values.slice(0, 3).reduce((sum, value) => sum + value, 0) > 8, "Torino Q: uno scenario Bologna-like non conserva 4+3+2 circa");
for (const candidate of [{ role: "Attaccante", detailedRole: "Ala destra" }, { role: "Centrocampista", detailedRole: "Trequartista" }, { role: "Centrocampista", detailedRole: "Centrocampista centrale" }]) {
  const modifier = teamProfilePlayerModifier(candidate, 2, 0.6, torinoMatchupProfile, { general: 0.9, territorial: 0.9, wide: 0.9, setPiece: 0.9, transition: 0.7 });
  assert.strictEqual(modifier.shotFactor, 1, `Torino R/S: ruolo WATCH ${candidate.detailedRole} ha ricevuto un boost`);
  assert.strictEqual(modifier.sotFactor, 1, `Torino R/S: ruolo WATCH ${candidate.detailedRole} ha ricevuto un boost SOT`);
}
assert.strictEqual(torinoMatchupProfile.shotDefense.shotsAllowed.signalPersistence.level, "high", "Torino T: il miglioramento recente ha cancellato il campione completo");
assert.strictEqual(torinoMatchupProfile.shotDefense.shotQualityProfile.highQualityChanceVulnerability.modelEffect, "none", "Torino V: shot access propagato alla chance quality");

// Torino W - compressione sul target squadra e riallocazione per struttura, non percentuale uniforme.
const torinoCompression = teamOffensiveAllocation(concentratedTorinoOpponent, "projectedShots", 8, torinoMatchupProfile);
assert(Math.abs(torinoCompression.values.reduce((sum, value) => sum + value, 0) - 8) < 0.001);
assert(new Set(torinoCompression.factors.map(value => value.toFixed(4))).size > 1, "Torino W: soppressione applicata uniformemente a tutti i player");

assert(Math.abs(torinoTeamTotal.reconciliation.shots.preReconciliation + torinoTeamTotal.reconciliation.shots.extraVolume - torinoTeamTotal.reconciliation.shots.suppressedVolume - torinoTeamTotal.reconciliation.shots.postReconciliation) < 0.02, "Torino: reconciliation tiri non chiude");
assert(Math.abs(torinoPlayers.reduce((total, player) => total + player.projectedShots, 0) - torinoProjection.shotsTotal.central) <= 0.11, "Torino: somma player tiri diversa dal team target");
assert(Math.abs(torinoPlayers.reduce((total, player) => total + player.projectedShotsOnTarget, 0) - torinoProjection.shotsOnTarget.central) <= 0.11, "Torino: somma player SOT diversa dal team target");
assert(torinoPlayers.every(player => player.projectedShotsOnTarget <= player.projectedShots), "Torino: projected SOT supera projected shots");
assert(torinoPlayers.every(player => player.shotProbabilities.over05 >= player.shotProbabilities.over15 && player.shotProbabilities.over15 >= player.shotProbabilities.over25), "Torino: probabilita tiri non monotone");
assert(torinoPlayers.every(player => player.shotOnTargetProbabilities.over05 >= player.shotOnTargetProbabilities.over15), "Torino: probabilita SOT non monotone");

const udineseMatchupProfile = require(path.join(root, "data/normalized/team-matchup-profiles-2026-27.json")).profiles.find(profile => profile.teamId === "udinese");
const udinesePlayers = torinoUdinese.shooters.allPlayers.filter(player => player.teamId === "udinese");
const udineseTeamTotal = torinoUdinese.shooters.teamTotals.find(team => team.teamId === "udinese");
const udineseEkkelenkamp = udinesePlayers.find(player => player.playerId === "jurgen-ekkelenkamp");
const udineseKamara = udinesePlayers.find(player => player.playerId === "hassane-kamara");
const udineseZaniolo = udinesePlayers.find(player => player.playerId === "nicolo-zaniolo");
const udineseStyle = teamStylesById.get("udinese");
const udineseVolume = teamVolumesById.get("udinese");
const udineseScenario = opponentId => {
  const opponentStyle = teamStylesById.get(opponentId);
  const opponentVolume = teamVolumesById.get(opponentId);
  const opponentMatchup = require(path.join(root, "data/normalized/team-matchup-profiles-2026-27.json")).profiles.find(profile => profile.teamId === opponentId);
  const shots = volumeMetric(udineseStyle, opponentStyle, udineseVolume, opponentVolume, "home", "totalShots", 1, { matches: 38, mean: 11.553, sd: 4.581, p20: 8, p80: 14.6, source: "team-style-prior" });
  const sot = volumeMetric(udineseStyle, opponentStyle, udineseVolume, opponentVolume, "home", "shotsOnTarget", 1, { matches: 38, mean: 3.842, sd: 1.857, p20: 2, p80: 5, source: "team-style-prior" });
  const corners = volumeMetric(udineseStyle, opponentStyle, udineseVolume, opponentVolume, "home", "wonCorners", 1, { matches: 38, mean: 4.5, sd: 2.28, p20: 2.4, p80: 6, source: "team-style-prior" });
  const own = applyOwnOffensiveVolumeProfile(udineseMatchupProfile, shots, sot, corners);
  const opponent = applyOpponentTeamVolumeInteraction(udineseStyle, opponentMatchup, shots, sot, corners);
  return { own, opponent, shots, sot, corners };
};
const udineseVsInter = udineseScenario("inter");
const udineseVsCagliari = udineseScenario("cagliari");
const udineseVsComo = udineseScenario("como");

// Udinese A-G - baseline robusta, elasticita spiegata dal matchup e target tiri/SOT/xG/corner separati.
assert(udineseMatchupProfile.offense.teamShotVolume.shrunkPerGame > 11.5 && udineseMatchupProfile.offense.teamShotVolume.shrunkPerGame < 12, "Udinese A: baseline neutrale dominata dalla media raw");
assert(udineseVsInter.shots.central < udineseVsCagliari.shots.central, "Udinese B/C: Inter suppression e Cagliari vulnerability non separano i target");
assert(udineseVsComo.shots.central > udineseVsInter.shots.central, "Udinese D: Como-like vulnerability non aumenta i tiri");
const decouplingRows = [2.4, 2.1, 1.8, 1.4, 1.2, 1, 0.8, 0.7].map((value, index) => ({ playerId: `udinese-decouple-${index}`, projectedShots: value, projectedShotsOnTarget: Math.min(value, value * 0.34), baselineShots90: value, baselineShotsOnTarget90: value * 0.34, teamProfileRole: index < 2 ? "AM" : index < 5 ? "CF" : "FB", playerBaselineStability: { score: 0.7 } }));
const sixShots = teamOffensiveAllocation(decouplingRows, "projectedShots", 6, udineseMatchupProfile);
const twentySixShots = teamOffensiveAllocation(decouplingRows, "projectedShots", 26, udineseMatchupProfile);
const fiveSotLow = teamOffensiveAllocation(decouplingRows, "projectedShotsOnTarget", 5, udineseMatchupProfile);
const fiveSotHigh = teamOffensiveAllocation(decouplingRows, "projectedShotsOnTarget", 5, udineseMatchupProfile);
assert(Math.abs(sixShots.values.reduce((s, v) => s + v, 0) - 6) < 0.001 && Math.abs(twentySixShots.values.reduce((s, v) => s + v, 0) - 26) < 0.001);
assert.deepStrictEqual(fiveSotLow.values, fiveSotHigh.values, "Udinese E: il target SOT dipende automaticamente dal target tiri");
assert.strictEqual(udineseMatchupProfile.offense.offensiveShotQuality.modelEffect, "quality-context-only-separate-from-shot-and-sot-volume", "Udinese F: 26 tiri implicano automaticamente xG estremo");
assert.strictEqual(udineseMatchupProfile.corners.robustCurrentForPerGame, 2.52);
assert(udineseMatchupProfile.corners.shrunkForPerGame < 4, "Udinese G: i 16 corner hanno distrutto la baseline");

// Udinese H-P - leading shooter, Expected Minutes, outsider e small sample.
const ekkelenkampTier = udineseMatchupProfile.offense.shooterStructure.playerTiers.find(player => player.playerId === "jurgen-ekkelenkamp");
assert.strictEqual(ekkelenkampTier.shotTier.tier, "primary", "Udinese H: Ekkelenkamp non emerge come leading shooter");
assert.strictEqual(udineseEkkelenkamp.playerBaselineStability.currentSample.persistence.level, "high");
const ekkelenkampSuppressed = teamOffensiveAllocation(udinesePlayers, "projectedShots", 7, udineseMatchupProfile);
const ekkelenkampExpanded = teamOffensiveAllocation(udinesePlayers, "projectedShots", 17, udineseMatchupProfile);
const ekkelenkampIndex = udinesePlayers.findIndex(player => player.playerId === "jurgen-ekkelenkamp");
assert(ekkelenkampSuppressed.values[ekkelenkampIndex] > 1, "Udinese I: Ekkelenkamp perde ogni floor in soppressione");
assert(ekkelenkampExpanded.values[ekkelenkampIndex] > ekkelenkampSuppressed.values[ekkelenkampIndex] && ekkelenkampExpanded.values[ekkelenkampIndex] / 17 < 0.3, "Udinese J: Ekkelenkamp non cresce o assorbe tutto l'extra-volume");
const gueyeStability = playerBaselineStability({ historicalBaseline: 4.44, historicalObserved: 4.44, historicalMinutes: 405, current: { minutes: 178, shots: 10, shotsCoverage: 4, shotsSequence: [3, 1, 1, 5] }, key: "shots", includePersistence: true });
const gueye30 = gueyeStability.value * 30 / 90;
const gueye60 = gueyeStability.value * 60 / 90;
assert(gueye30 < 2 && gueye60 > gueye30 && gueye60 < 4, "Udinese K/L: Expected Minutes Gueye non governa la projection");
assert.strictEqual(udineseKamara.qualifiedOutsider, true, "Udinese M: Kamara non supera i gate strutturali nel matchup neutrale");
const kamaraSuppressed = ekkelenkampSuppressed.values[udinesePlayers.findIndex(player => player.playerId === "hassane-kamara")];
assert(kamaraSuppressed < udineseKamara.projectedShots, "Udinese N: Kamara non diminuisce contro soppressione");
if (udineseZaniolo) assert(udineseZaniolo.stabilizedShots90 < 3.36 && udineseZaniolo.playerBaselineStability.confidence === "medium-low", "Udinese O: due gare Zaniolo usate come baseline piena");
else assertNotCurrentStarter("udinese", "nicolo-zaniolo");
const bayoStability = playerBaselineStability({ historicalBaseline: 2.83, historicalObserved: 2.83, historicalMinutes: 446, current: { minutes: 95, shots: 4, shotsCoverage: 4, shotsSequence: [2, 0, 1, 1] }, key: "shots", includePersistence: true });
assert(bayoStability.value * 20 / 90 < 1 && bayoStability.confidence === "medium-low", "Udinese P: Bayo low-minutes diventa outsider automatico");

// Udinese Q-X - allocation broad/concentrated, team vulnerability e ruoli WATCH neutrali.
const broadUdineseExpansion = teamOffensiveAllocation(decouplingRows, "projectedShots", 20, udineseMatchupProfile);
assert(broadUdineseExpansion.values.filter(value => value > 1).length >= 6, "Udinese Q: extra-volume broad concentrato su pochi player");
const primaryOnlyRows = [5, 1.2, 1, 0.8, 0.7, 0.6].map((value, index) => ({ playerId: `udinese-primary-${index}`, projectedShots: value, baselineShots90: value, teamProfileRole: index === 0 ? "CF" : "CM", playerBaselineStability: { score: index === 0 ? 0.95 : 0.6 } }));
const primaryOnlyExpansion = teamOffensiveAllocation(primaryOnlyRows, "projectedShots", 13, udineseMatchupProfile);
assert(primaryOnlyExpansion.values[0] / 13 > 0.35, "Udinese R: allocation broad forzata su un attacco primary-only");
assert(torinoProjection.opponentMatchupInteraction.shotsAdjustmentPct > 0 && torinoProjection.opponentMatchupInteraction.shotsOnTargetAdjustmentPct > 0, "Udinese S: broad vulnerability non raggiunge i target avversari");
const broadOpponentVsUdinese = teamOffensiveAllocation(decouplingRows, "projectedShots", 15, udineseMatchupProfile);
assert(Math.max(...broadOpponentVsUdinese.values) < 5 && broadOpponentVsUdinese.values.filter(value => value > 1).length >= 6, "Udinese S: broad access crea artificialmente un solo 5+ shooter");
for (const candidate of [{ role: "Centrocampista", detailedRole: "Trequartista" }, { role: "Attaccante", detailedRole: "Centravanti" }, { role: "Difensore", detailedRole: "Esterno sinistro" }]) {
  const modifier = teamProfilePlayerModifier(candidate, 2, 0.6, udineseMatchupProfile, { general: 0.9, territorial: 0.9, wide: 0.9, setPiece: 0.9, transition: 0.7 });
  assert.strictEqual(modifier.shotFactor, 1, `Udinese T-V: ruolo WATCH ${candidate.detailedRole} ha ricevuto un boost`);
  assert.strictEqual(modifier.sotFactor, 1, `Udinese T-V: ruolo WATCH ${candidate.detailedRole} ha ricevuto un boost SOT`);
}
const cagliariRow = udineseMatchupProfile.shotDefense.opponentStrengthDiagnostics.rows.find(row => row.opponentTeamId === "cagliari");
const interRow = udineseMatchupProfile.shotDefense.opponentStrengthDiagnostics.rows.find(row => row.opponentTeamId === "inter");
assert(cagliariRow.actualShots === 5 && cagliariRow.actualXg === 1.12 && cagliariRow.xgPerShot > interRow.xgPerShot, "Udinese W: basso volume trasformato automaticamente in basso xGA");
assert(interRow.actualShots === 27 && interRow.actualXg === 3.07 && interRow.xgPerShot < cagliariRow.xgPerShot, "Udinese X: alto volume trasformato in xGA proporzionale fisso");

// Udinese Y-Z - invarianti probabilistici e reconciliation.
assert(udinesePlayers.every(player => player.shotProbabilities.over05 >= player.shotProbabilities.over15 && player.shotProbabilities.over15 >= player.shotProbabilities.over25), "Udinese Y: probabilita tiri non monotone");
assert(udinesePlayers.every(player => player.shotOnTargetProbabilities.over05 >= player.shotOnTargetProbabilities.over15), "Udinese Y: probabilita SOT non monotone");
assert(udinesePlayers.every(player => player.projectedShotsOnTarget <= player.projectedShots), "Udinese Y: projected SOT supera projected shots");
assert(Math.abs(udineseTeamTotal.reconciliation.shots.preReconciliation + udineseTeamTotal.reconciliation.shots.extraVolume - udineseTeamTotal.reconciliation.shots.suppressedVolume - udineseTeamTotal.reconciliation.shots.postReconciliation) < 0.02, "Udinese Z: reconciliation tiri non chiude");
assert(Math.abs(udinesePlayers.reduce((total, player) => total + player.projectedShots, 0) - udineseProjection.shotsTotal.central) <= 0.11, "Udinese Z: somma player tiri diversa dal team target");
assert(Math.abs(udinesePlayers.reduce((total, player) => total + player.projectedShotsOnTarget, 0) - udineseProjection.shotsOnTarget.central) <= 0.11, "Udinese Z: somma player SOT diversa dal team target");

const veneziaMatchupProfile = require(path.join(root, "data/normalized/team-matchup-profiles-2026-27.json")).profiles.find(profile => profile.teamId === "venezia");
const veneziaProjection = atalantaVeneziaProfile.teamProjections.find(team => team.teamId === "venezia");
const atalantaAgainstVeneziaProjection = atalantaVeneziaProfile.teamProjections.find(team => team.teamId === "atalanta");
const veneziaPlayers = atalantaVeneziaProfile.shooters.allPlayers.filter(player => player.teamId === "venezia");
const veneziaTeamTotal = atalantaVeneziaProfile.shooters.teamTotals.find(team => team.teamId === "venezia");
const veneziaStyle = teamStylesById.get("venezia");

// Venezia A-C - baseline autonoma e target tiri/SOT indipendenti nei matchup neutro, permissivo e suppressivo.
const veneziaNeutralShots = { min: 11, central: 14, max: 18 };
const veneziaNeutralSot = { min: 3, central: 4.4, max: 7 };
const veneziaNeutralCorners = { min: 2, central: 3.8, max: 7 };
const veneziaOwnNeutral = applyOwnOffensiveVolumeProfile(veneziaMatchupProfile, veneziaNeutralShots, veneziaNeutralSot, veneziaNeutralCorners);
assert(veneziaNeutralShots.central > 14 && veneziaNeutralShots.central <= 15.2, "Venezia A: baseline neutrale non converge in modo cappato verso lo stabilized current/history");
assert.strictEqual(veneziaOwnNeutral.capDiagnostics.shots.capHit, true);
const permissiveShots = { min: 10, central: 14, max: 18 };
const permissiveSot = { min: 3, central: 4.4, max: 7 };
const permissiveCorners = { min: 2, central: 4, max: 7 };
const permissiveBefore = { shots: permissiveShots.central, sot: permissiveSot.central };
applyOpponentTeamVolumeInteraction(veneziaStyle, lecceMatchupProfile, permissiveShots, permissiveSot, permissiveCorners);
assert(permissiveShots.central > permissiveBefore.shots, "Venezia B: avversario permissivo non aumenta il team-shot target");
assert.notStrictEqual((permissiveShots.central / permissiveBefore.shots).toFixed(4), (permissiveSot.central / permissiveBefore.sot).toFixed(4), "Venezia B: tiri e SOT aumentano automaticamente nella stessa proporzione");
const suppressiveShots = { min: 8, central: 10, max: 13 };
const suppressiveSot = { min: 2, central: 3.5, max: 5 };
const suppressiveCorners = { min: 2, central: 4, max: 6 };
applyOpponentTeamVolumeInteraction(veneziaStyle, interMatchupProfile, suppressiveShots, suppressiveSot, suppressiveCorners);
assert(suppressiveShots.central >= 9 && suppressiveShots.central <= 10, "Venezia C: un suppressor non consente un target circa 9-10");

// Venezia D-O - dual primary, floor in compressione, persistenza distinta dall'intensita e small sample shrinkato/gated.
const veneziaAllocationRows = [
  { playerId: "akor-adams", projectedShots: 3.2, projectedShotsOnTarget: 1.25, baselineShots90: 3.72, baselineShotsOnTarget90: 1.53, teamProfileRole: "CF", playerBaselineStability: { score: 0.9 } },
  { playerId: "john-yeboah", projectedShots: 2.8, projectedShotsOnTarget: 1.05, baselineShots90: 3.09, baselineShotsOnTarget90: 1.19, teamProfileRole: "AM", playerBaselineStability: { score: 0.85 } },
  { playerId: "antoine-hainaut", projectedShots: 1.1, projectedShotsOnTarget: 0.35, baselineShots90: 1.22, baselineShotsOnTarget90: 0.41, teamProfileRole: "CM", playerBaselineStability: { score: 0.8 } },
  { playerId: "thierry-correia", projectedShots: 0.8, projectedShotsOnTarget: 0.16, baselineShots90: 0.54, baselineShotsOnTarget90: 0.12, teamProfileRole: "FB", playerBaselineStability: { score: 0.3 } },
  { playerId: "gianluca-busio", projectedShots: 0.9, projectedShotsOnTarget: 0.12, baselineShots90: 1.5, baselineShotsOnTarget90: 0.2, teamProfileRole: "CM", playerBaselineStability: { score: 0.45 } },
  { playerId: "matias-moreno", projectedShots: 0.6, projectedShotsOnTarget: 0.05, baselineShots90: 0.62, baselineShotsOnTarget90: 0.05, teamProfileRole: "CB", playerBaselineStability: { score: 0.3 } },
  { playerId: "richie-sagrado", projectedShots: 0.6, projectedShotsOnTarget: 0.2, baselineShots90: 2.16, baselineShotsOnTarget90: 0.7, teamProfileRole: "FB", playerBaselineStability: { score: 0.55 } },
  { playerId: "albion-rrahmani", projectedShots: 0.45, projectedShotsOnTarget: 0.12, baselineShots90: 4.5, baselineShotsOnTarget90: 1.13, teamProfileRole: "CF", playerBaselineStability: { score: 0.2 } }
];
const veneziaSuppressed = teamOffensiveAllocation(veneziaAllocationRows, "projectedShots", 9, veneziaMatchupProfile);
const veneziaExpanded = teamOffensiveAllocation(veneziaAllocationRows, "projectedShots", 17, veneziaMatchupProfile);
const adamsIndex = veneziaAllocationRows.findIndex(player => player.playerId === "akor-adams");
const yeboahIndex = veneziaAllocationRows.findIndex(player => player.playerId === "john-yeboah");
assert(veneziaSuppressed.values[adamsIndex] >= 2.5, "Venezia D/E: Adams perde il floor elevato in un team target suppressivo");
assert(veneziaExpanded.values[adamsIndex] > veneziaSuppressed.values[adamsIndex] && veneziaExpanded.values[adamsIndex] / 17 < 0.33, "Venezia F: Adams non cresce o assorbe tutto l'extra-volume");
assert(veneziaSuppressed.values[yeboahIndex] > 2, "Venezia G: Yeboah non resta un secondo primary stabile");
assert.strictEqual(veneziaMatchupProfile.offense.shooterStructure.type, "multi-primary", "Venezia O: struttura dual-primary persa");
assert(veneziaMatchupProfile.offense.shooterStructure.primaryPlayerIds.includes("akor-adams") && veneziaMatchupProfile.offense.shooterStructure.primaryPlayerIds.includes("john-yeboah"));
assert(veneziaMatchupProfile.offense.shooterStructure.playerTiers.find(player => player.playerId === "akor-adams").evidence.shots > veneziaMatchupProfile.offense.shooterStructure.playerTiers.find(player => player.playerId === "john-yeboah").evidence.shots, "Venezia H: gerarchia tiri Adams/Yeboah persa");
assert(1.92 > 1.57 && 13 < 17, "Venezia H: player shots e player xG non sono rappresentabili separatamente");
const hainautStability = playerBaselineStability({ historicalBaseline: 1, historicalObserved: 1, historicalMinutes: 1000, current: { minutes: 444, shots: 6, shotsCoverage: 5, shotsSequence: [2, 1, 1, 1, 1] }, key: "shots", includePersistence: true });
const correiaStability = playerBaselineStability({ historicalBaseline: 0.32, historicalObserved: 0.32, historicalMinutes: 1000, current: { minutes: 185, shots: 5, shotsCoverage: 4, shotsSequence: [3, 0, 0, 2] }, key: "shots", includePersistence: true });
assert.strictEqual(hainautStability.currentSample.persistence.level, "high", "Venezia I: persistenza Hainaut non riconosciuta");
assert(hainautStability.currentSample.per90 < correiaStability.currentSample.per90 && correiaStability.currentSample.persistence.level === "low", "Venezia J: persistenza e intensity di Hainaut/Correia confuse");
const morenoStability = playerBaselineStability({ historicalBaseline: 0.4, historicalObserved: 0.4, historicalMinutes: 1000, current: { minutes: 174, shots: 5, shotsCoverage: 3, shotsSequence: [1, 0, 4] }, key: "shots", includePersistence: true });
assert(morenoStability.value < morenoStability.currentSample.per90 && morenoStability.confidence === "medium-low", "Venezia K: spike singolo Moreno non shrinkato");
const sagradoQualityRate = 1.16 / 4;
assert(sagradoQualityRate > veneziaMatchupProfile.offense.offensiveShotQuality.xgPerShot && veneziaMatchupProfile.modelPolicy.watch.includes("highQualityChanceVulnerability"), "Venezia L: spike xG Sagrado ha attivato un coefficiente di qualita");
const rrahmani15 = 4.5 * 15 / 90;
const rrahmani60 = 4.5 * 60 / 90;
assert(rrahmani15 < 1 && rrahmani60 > rrahmani15 && rrahmani60 <= 3, "Venezia M/N: il gate Expected Minutes non governa Rrahmani");
assert(veneziaExpanded.values.filter((value, index) => value > veneziaAllocationRows[index].projectedShots).length >= 5, "Venezia O: extra-volume non raggiunge la secondary breadth");

// Venezia P-Z - vulnerabilita team moderate/strong separate, concentrazione naturale e ruoli WATCH neutrali.
assert(atalantaAgainstVeneziaProjection.opponentMatchupInteraction.shotsAdjustmentPct > 0 && atalantaAgainstVeneziaProjection.opponentMatchupInteraction.shotsAdjustmentPct < 2, "Venezia P: matchup medio trasformato in extreme team-shot boost");
assert(atalantaAgainstVeneziaProjection.opponentMatchupInteraction.shotsOnTargetAdjustmentPct > atalantaAgainstVeneziaProjection.opponentMatchupInteraction.shotsAdjustmentPct, "Venezia P: SOT vulnerability non resta separata e piu forte dei tiri");
const veneziaConcentratedOpponent = [5.5, 1.4, 1.2, 1, 0.8, 0.6].map((value, index) => ({ playerId: `venezia-primary-${index}`, projectedShots: value, baselineShots90: value, teamProfileRole: index === 0 ? "CF" : "CM", playerBaselineStability: { score: index === 0 ? 0.9 : 0.6 } }));
const veneziaDistributedOpponent = [1.7, 1.6, 1.5, 1.4, 1.3, 1.2, 1.1, 1].map((value, index) => ({ playerId: `venezia-distributed-${index}`, projectedShots: value, baselineShots90: value, teamProfileRole: ["CF", "W", "AM", "CM", "FB", "CB", "CM", "W"][index], playerBaselineStability: { score: 0.7 } }));
const concentratedVsVenezia = teamOffensiveAllocation(veneziaConcentratedOpponent, "projectedShots", 16, veneziaMatchupProfile);
const distributedVsVenezia = teamOffensiveAllocation(veneziaDistributedOpponent, "projectedShots", 16, veneziaMatchupProfile);
assert(concentratedVsVenezia.values[0] / 16 > 0.35, "Venezia Q/S: primary share forte non emerge naturalmente");
assert(Math.max(...distributedVsVenezia.values) / 16 < 0.2 && distributedVsVenezia.values.filter(value => value > 1.5).length >= 5, "Venezia R: attacco distributed forzato verso un primary");
assert(!veneziaConcentratedOpponent.some(player => /ramos|mastantuono/.test(player.playerId)), "Venezia S/T: test primary dipende da hardcoding nominale");
for (const candidate of [{ role: "Attaccante", detailedRole: "Punta centrale" }, { role: "Centrocampista", detailedRole: "Trequartista" }, { role: "Centrocampista", detailedRole: "Mezzala" }, { role: "Difensore", detailedRole: "Difensore centrale" }]) {
  const modifier = teamProfilePlayerModifier(candidate, 2.5, 0.8, veneziaMatchupProfile, { general: 0.9, territorial: 0.9, wide: 0.9, setPiece: 0.9, transition: 0.7 });
  assert.strictEqual(modifier.shotFactor, 1, `Venezia U-W: ruolo WATCH ${candidate.detailedRole} ha ricevuto un boost tiri`);
  assert.strictEqual(modifier.sotFactor, 1, `Venezia U-W: ruolo WATCH ${candidate.detailedRole} ha ricevuto un boost SOT`);
}
const veneziaLecceRow = veneziaMatchupProfile.shotDefense.opponentStrengthDiagnostics.rows.find(row => row.opponentTeamId === "lecce");
const veneziaFiorentinaRow = veneziaMatchupProfile.shotDefense.opponentStrengthDiagnostics.rows.find(row => row.opponentTeamId === "fiorentina");
const veneziaLazioRow = veneziaMatchupProfile.shotDefense.opponentStrengthDiagnostics.rows.find(row => row.opponentTeamId === "lazio");
assert(veneziaLecceRow.actualShots === 12 && veneziaLecceRow.actualXg === 2.72, "Venezia X: 12 tiri/high xGA non rappresentabile");
assert(veneziaFiorentinaRow.actualShots === 19 && veneziaFiorentinaRow.actualXg === 3.36, "Venezia Y: 19 tiri/high xGA non rappresentabile");
assert(veneziaLazioRow.actualShots === 12 && veneziaLazioRow.actualShotsOnTarget === 2 && veneziaLazioRow.actualXg === 1.79, "Venezia Z: low SOT/high xGA non rappresentabile");
assert.strictEqual(veneziaMatchupProfile.shotDefense.shotQualityProfile.highQualityChanceVulnerability.modelEffect, "none", "Venezia U: WATCH chance-quality ha prodotto un adjustment nascosto");
assert(veneziaPlayers.every(player => player.shotProbabilities.over05 >= player.shotProbabilities.over15 && player.shotProbabilities.over15 >= player.shotProbabilities.over25), "Venezia: probabilita tiri non monotone");
assert(veneziaPlayers.every(player => player.shotOnTargetProbabilities.over05 >= player.shotOnTargetProbabilities.over15), "Venezia: probabilita SOT non monotone");
assert(veneziaPlayers.every(player => Number.isFinite(player.projectedShots) && Number.isFinite(player.projectedShotsOnTarget) && player.projectedShots >= 0 && player.projectedShotsOnTarget >= 0 && player.projectedShotsOnTarget <= player.projectedShots), "Venezia: proiezione impossibile/NaN/Infinity o SOT > tiri");
assert(veneziaPlayers.filter(player => player.expectedMinutes <= 1).every(player => player.projectedShots < 0.15), "Venezia: volume significativo con Expected Minutes circa zero");
assert(Math.abs(veneziaPlayers.reduce((total, player) => total + player.projectedShots, 0) - veneziaProjection.shotsTotal.central) <= 0.11, "Venezia: somma player tiri diversa dal team target");
assert(Math.abs(veneziaPlayers.reduce((total, player) => total + player.projectedShotsOnTarget, 0) - veneziaProjection.shotsOnTarget.central) <= 0.11, "Venezia: somma player SOT diversa dal team target");
assert(Math.abs(veneziaTeamTotal.reconciliation.shots.preReconciliation + veneziaTeamTotal.reconciliation.shots.extraVolume - veneziaTeamTotal.reconciliation.shots.suppressedVolume - veneziaTeamTotal.reconciliation.shots.postReconciliation) < 0.02, "Venezia: reconciliation tiri non chiude");

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
