"use strict";

const fs = require("fs");
const path = require("path");
const { ENGINE_VERSION, PLAYER_MARKET_MODEL_VERSION, WEIGHTS, predictMatch } = require("./predictions/engine");
const { DECISION_LAYER_VERSION, PROFILE_LIMITS, enrichPrediction } = require("./predictions/decision-layer");
const { loadPlayerIdentities } = require("./player-identity");

const root = path.resolve(__dirname, "..");
const read = relative => JSON.parse(fs.readFileSync(path.join(root, relative), "utf8"));
const matches = read("data/normalized/matches.json");
const readings = read("data/normalized/readings.json");
const standings = read("data/normalized/standings-2025-26.json");
const styles = read("data/normalized/team-style-profiles.json");
const discipline = read("data/normalized/team-referee-profiles.json");
const historicalMatches = read("data/normalized/referee-matches/2025-26/serie-a.json").matches;
const objectives = read("data/team-objectives.json");
const teams = read("data/teams/index.json").teams;
const odds = read("data/normalized/odds/sisal/serie-a.json");
const headToHead = read("data/generated/head-to-head/first-leg-2026-27.json");
const understatXg = read("data/normalized/understat-serie-a-xg.json");
const volumeProfiles = read("data/normalized/team-volume-profiles-2025-26.json");
const teamMatchupProfiles = read("data/normalized/team-matchup-profiles-2026-27.json");
const refereeAggregates = read("data/generated/referee-stats/2025-26/aggregates.json");
const officialLineups = read("data/sources/official-lineups-2026-27.json");
const predictionArchiveFiles = fs.readdirSync(path.join(root, "data", "sources"))
  .filter(filename => /^prediction-archive-md\d{1,2}-2026-27\.json$/.test(filename))
  .sort();
const predictionArchive = {
  predictions: predictionArchiveFiles.flatMap(filename => read(`data/sources/${filename}`).predictions || [])
};
const myComboFiles = fs.readdirSync(path.join(root, "data/sources"))
  .filter(filename => /^mycombo-serie-a-2026-27-md-\d{2}\.json$/.test(filename))
  .sort();
const myComboSources = process.env.SERIE_A_DISABLE_MYCOMBO === "1"
  ? []
  : myComboFiles.map(filename => ({ filename, ...read(`data/sources/${filename}`) }));
const myComboSource = {
  constraints: myComboSources.at(-1)?.constraints || {},
  matches: Object.assign({}, ...myComboSources.map(source => source.matches || {}))
};
const backtestPath = path.join(root, "data/generated/prediction-backtest-2025-26.json");
const backtest = fs.existsSync(backtestPath) ? JSON.parse(fs.readFileSync(backtestPath, "utf8")) : null;
const multiSeasonBacktestPath = path.join(root, "data/generated/prediction-backtest-multiseason.json");
const multiSeasonBacktest = fs.existsSync(multiSeasonBacktestPath) ? JSON.parse(fs.readFileSync(multiSeasonBacktestPath, "utf8")) : null;
const openingBacktestPath = path.join(root, "data/generated/prediction-backtest-opening-rounds.json");
const openingBacktest = fs.existsSync(openingBacktestPath) ? JSON.parse(fs.readFileSync(openingBacktestPath, "utf8")) : null;
const generatedAt = new Date().toISOString();
const previewMatchday = Number(process.env.SERIE_A_PREDICTION_PREVIEW_MATCHDAY);
const previewMode = Number.isInteger(previewMatchday) && previewMatchday > 0;

const byId = items => new Map(items.map(item => [item.teamId || item.team || item.matchId || item.canonicalMatchId, item]));
const playerKey = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
const readingByMatch = byId(readings);
const styleByTeam = byId(styles.profiles);
const disciplineByTeam = byId(discipline.profiles);
const objectiveByTeam = byId(objectives.teams);
const oddsByMatch = byId(odds.events);
const headToHeadByMatch = new Map(headToHead.fixtures.map(fixture => [fixture.fixtureId, fixture]));
const pairKey = (homeTeam, awayTeam) => [homeTeam, awayTeam].sort().join("|");
const headToHeadByPair = new Map(headToHead.fixtures.map(fixture => [pairKey(fixture.homeTeamId, fixture.awayTeamId), fixture]));
const homeByTeam = byId(standings.homeRows);
const awayByTeam = byId(standings.awayRows);
const teamById = new Map(teams.map(team => [team.id, team]));
const squadsByTeam = new Map(teams.map(team => [team.id, read(`data/generated/team-pages/${team.id}-squad.json`)]));
const identityRegistry = loadPlayerIdentities(root);
for (const identity of identityRegistry.payload.players) {
  const squad = squadsByTeam.get(identity.teamId);
  if (!squad) continue;
  const player = squad.players.find(entry => entry.id === identity.playerId);
  if (player) player.identityAliases = identity.aliases;
  else squad.players.push({ id: identity.playerId, name: identity.canonicalName, role: null, detailedRole: null, identityAliases: identity.aliases });
}
const volumeByTeam = byId(volumeProfiles.profiles);
const teamMatchupByTeam = byId(teamMatchupProfiles.profiles);
const refereeRows = refereeAggregates.referees.filter(row => row.competition === "serie-a" && row.stage === "regular-season");
const refereeBySlug = new Map(refereeRows.map(row => [row.refereeSlug, row]));
const refereeLeagueAverage = {
  yellowCardsPerMatch: refereeRows.reduce((total, row) => total + row.yellowCards, 0) / refereeRows.reduce((total, row) => total + row.matches, 0),
  foulsPerMatch: refereeRows.reduce((total, row) => total + row.fouls, 0) / refereeRows.reduce((total, row) => total + row.matches, 0)
};
const standingsByTeam = new Map(standings.rows.map(row => [row.team, row]));
const meanStandingPoints = standings.rows.reduce((total, row) => total + row.points, 0) / standings.rows.length;
const understatTeamIds = {
  "AC Milan": "milan", Inter: "inter", "Parma Calcio 1913": "parma", Roma: "roma", Verona: "verona"
};
const canonicalTeamId = name => understatTeamIds[name] || String(name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const xgMatches = understatXg.matches.filter(match => match.season === "2025-26").map(match => ({
  ...match,
  homeTeamId: canonicalTeamId(match.homeTeam.name),
  awayTeamId: canonicalTeamId(match.awayTeam.name)
}));
const xgLeagueSummary = {
  homeXgPerMatch: xgMatches.reduce((total, match) => total + match.xg.home, 0) / xgMatches.length,
  awayXgPerMatch: xgMatches.reduce((total, match) => total + match.xg.away, 0) / xgMatches.length
};

function xgProfile(teamId) {
  const rows = xgMatches.filter(match => match.homeTeamId === teamId || match.awayTeamId === teamId);
  if (!rows.length) return null;
  const rate = (selected, type) => selected.reduce((total, match) => {
    const atHome = match.homeTeamId === teamId;
    return total + (type === "for" ? (atHome ? match.xg.home : match.xg.away) : (atHome ? match.xg.away : match.xg.home));
  }, 0) / selected.length;
  const home = rows.filter(match => match.homeTeamId === teamId);
  const away = rows.filter(match => match.awayTeamId === teamId);
  const recent = [...rows].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 8);
  return {
    teamId,
    season: "2025-26",
    matches: rows.length,
    home: { matches: home.length, for: rate(home, "for"), against: rate(home, "against") },
    away: { matches: away.length, for: rate(away, "for"), against: rate(away, "against") },
    overall: { for: rate(rows, "for"), against: rate(rows, "against") },
    recent: { matches: recent.length, for: rate(recent, "for"), against: rate(recent, "against") },
    source: understatXg.source
  };
}
const xgProfiles = new Map(teams.map(team => [team.id, xgProfile(team.id)]));

function recentForm(teamId, targetMatch) {
  const currentSeason = matches
    .filter(match => match.competition === "serie-a" && match.season === "2026-27" && match.status === "finished" && match.score && match.matchday < targetMatch.matchday && (match.homeTeam === teamId || match.awayTeam === teamId))
    .sort((a, b) => b.matchday - a.matchday)
    .map(match => ({
      date: match.date,
      atHome: match.homeTeam === teamId,
      opponent: match.homeTeam === teamId ? match.awayTeam : match.homeTeam,
      goalsFor: match.homeTeam === teamId ? match.score.home : match.score.away,
      goalsAgainst: match.homeTeam === teamId ? match.score.away : match.score.home,
      season: "2026-27"
    }));
  const historical = historicalMatches.filter(match => match.homeTeam.slug === teamId || match.awayTeam.slug === teamId)
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .map(match => {
      const atHome = match.homeTeam.slug === teamId;
      return {
        date: match.date,
        atHome,
        opponent: atHome ? match.awayTeam.slug : match.homeTeam.slug,
        goalsFor: atHome ? match.score.home : match.score.away,
        goalsAgainst: atHome ? match.score.away : match.score.home,
        season: "2025-26"
      };
    });
  const rows = [...currentSeason, ...historical].slice(0, 8);
  if (!rows.length) return null;
  let weightTotal = 0, goalsFor = 0, goalsAgainst = 0;
  rows.forEach((match, index) => {
    const opponentStrength = (standingsByTeam.get(match.opponent)?.points || meanStandingPoints) / meanStandingPoints;
    const weight = 0.82 ** index;
    weightTotal += weight;
    goalsFor += match.goalsFor * (opponentStrength ** 0.25) * weight;
    goalsAgainst += match.goalsAgainst / (opponentStrength ** 0.25) * weight;
  });
  return { matches: rows.length, goalsFor: goalsFor / weightTotal, goalsAgainst: goalsAgainst / weightTotal, decay: 0.82, opponentAdjusted: true, currentSeasonMatches: currentSeason.length };
}

function currentPlayerPerformance(teamId, targetMatch) {
  const rows = matches.filter(match =>
    match.competition === "serie-a" &&
    match.season === "2026-27" &&
    match.status === "finished" &&
    match.matchday < targetMatch.matchday &&
    (match.homeTeam === teamId || match.awayTeam === teamId)
  );
  const aggregate = {};
  for (const match of rows) {
    const side = match.homeTeam === teamId ? "home" : "away";
    for (const player of match.playerStats?.[side] || []) {
      if (!(player.minutes > 0)) continue;
      const key = player.playerId || playerKey(player.player);
      const current = aggregate[key] || { appearances: 0, minutes: 0, foulsCommitted: 0, foulsCommittedCoverage: 0, foulsWon: 0, foulsWonCoverage: 0, shots: 0, shotsCoverage: 0, shotsOnTarget: 0, shotsOnTargetCoverage: 0, starterAppearances: 0, starterMinutes: 0 };
      current.appearances += 1;
      current.minutes += player.minutes;
      if (player.foulsCommitted != null) { current.foulsCommitted += player.foulsCommitted; current.foulsCommittedCoverage += 1; }
      if (player.foulsWon != null) { current.foulsWon += player.foulsWon; current.foulsWonCoverage += 1; }
      if (player.shots != null) { current.shots += player.shots; current.shotsCoverage += 1; }
      if (player.shotsOnTarget != null) { current.shotsOnTarget += player.shotsOnTarget; current.shotsOnTargetCoverage += 1; }
      if (player.starter) {
        current.starterAppearances += 1;
        current.starterMinutes += player.minutes;
      }
      aggregate[key] = current;
      aggregate[playerKey(player.player)] = current;
    }
  }
  return aggregate;
}

const nextScheduledMatchday = matches
  .filter(match => match.competition === "serie-a" && match.season === "2026-27" && match.status !== "finished")
  .reduce((minimum, match) => Math.min(minimum, match.matchday), Infinity);
const leagueTargetMatches = matches
  .filter(match => match.competition === "serie-a" && match.season === "2026-27" && (previewMode ? match.matchday === previewMatchday : oddsByMatch.has(match.id) || match.matchday === nextScheduledMatchday))
  .sort((a, b) => a.matchday - b.matchday || a.id.localeCompare(b.id));
const targetMatches = leagueTargetMatches;
const predictionMatches = matches;
const existingPredictionsPath = path.join(root, "data/normalized/predictions.json");
const existingPredictionByMatch = fs.existsSync(existingPredictionsPath)
  ? new Map(JSON.parse(fs.readFileSync(existingPredictionsPath, "utf8")).predictions.map(prediction => [prediction.matchId, prediction]))
  : new Map();

const officialReferenceByTeam = new Map(officialLineups.fixtures
  .flatMap(fixture => fixture.teams.map(lineup => [lineup.teamId, {
    formation: lineup.formation,
    players: lineup.players.map(player => player.currentName || player.sourceName),
    context: `Riferimento dalla formazione ufficiale della ${fixture.matchday}ª giornata`,
    status: "reference",
    referenceMatchId: fixture.matchId,
    updatedAt: fixture.date,
    source: { provider: officialLineups.provider || "Distinta ufficiale", scope: `Formazione ufficiale ${fixture.label}`, retrievedAt: fixture.date }
  }])));
const officialLineupByMatchTeam = new Map(officialLineups.fixtures.flatMap(fixture => fixture.teams.map(lineup => [
  `${fixture.matchId}:${lineup.teamId}`,
  {
    formation: lineup.formation,
    players: lineup.players.map(player => player.currentName || player.sourceName),
    context: `Formazione ufficiale della ${fixture.matchday}ª giornata`,
    status: "official",
    matchId: fixture.matchId,
    updatedAt: fixture.retrievedAt || fixture.date,
    source: {
      provider: fixture.provider || officialLineups.provider || "Distinta ufficiale",
      scope: `Formazione ufficiale ${fixture.label}`,
      url: fixture.sourceUrl || officialLineups.sourceUrl || null,
      retrievedAt: fixture.retrievedAt || fixture.date
    }
  }
])));
const teamForMatch = (team, match) => {
  const fixtureOfficial = officialLineupByMatchTeam.get(`${match.id}:${team?.id}`);
  if (fixtureOfficial) return { ...team, probableLineup: fixtureOfficial };
  if (team?.probableLineup?.status !== "official" || team.probableLineup.matchId === match.id) return team;
  return { ...team, probableLineup: team.projectedLineup || officialReferenceByTeam.get(team.id) || null };
};

const generatedPredictions = targetMatches.map(match => {
  const homeTeam = teamForMatch(teamById.get(match.homeTeam), match);
  const awayTeam = teamForMatch(teamById.get(match.awayTeam), match);
  const predictionGeneratedAt = existingPredictionByMatch.get(match.id)?.generatedAt || [generatedAt, homeTeam?.probableLineup?.source?.retrievedAt, awayTeam?.probableLineup?.source?.retrievedAt].filter(Boolean).sort().at(-1);
  const prediction = predictMatch({
    match,
    reading: readingByMatch.get(match.id),
    homeVenue: homeByTeam.get(match.homeTeam),
    awayVenue: awayByTeam.get(match.awayTeam),
    homeProfile: styleByTeam.get(match.homeTeam),
    awayProfile: styleByTeam.get(match.awayTeam),
    homeRecent: recentForm(match.homeTeam, match),
    awayRecent: recentForm(match.awayTeam, match),
    homeXgProfile: xgProfiles.get(match.homeTeam),
    awayXgProfile: xgProfiles.get(match.awayTeam),
    xgLeagueSummary,
    homeDiscipline: disciplineByTeam.get(match.homeTeam),
    awayDiscipline: disciplineByTeam.get(match.awayTeam),
    homeVolume: volumeByTeam.get(match.homeTeam),
    awayVolume: volumeByTeam.get(match.awayTeam),
    homeObjective: objectiveByTeam.get(match.homeTeam),
    awayObjective: objectiveByTeam.get(match.awayTeam),
    headToHead: headToHeadByMatch.get(match.id) || headToHeadByPair.get(pairKey(match.homeTeam, match.awayTeam)),
    homeTeam,
    awayTeam,
    homeSquad: squadsByTeam.get(match.homeTeam),
    awaySquad: squadsByTeam.get(match.awayTeam),
    homeCurrentDiscipline: currentPlayerPerformance(match.homeTeam, match),
    awayCurrentDiscipline: currentPlayerPerformance(match.awayTeam, match),
    homeCurrentPlayers: currentPlayerPerformance(match.homeTeam, match),
    awayCurrentPlayers: currentPlayerPerformance(match.awayTeam, match),
    homeTeamMatchupProfile: teamMatchupByTeam.get(match.homeTeam) || null,
    awayTeamMatchupProfile: teamMatchupByTeam.get(match.awayTeam) || null,
    refereeProfile: refereeBySlug.get(match.refereeAssignment?.referee?.slug) || null,
    refereeLeagueAverage,
    leagueSummary: standings.summary,
    oddsEvent: oddsByMatch.get(match.id),
    oddsRetrievedAt: oddsByMatch.get(match.id)?.retrievedAt || null,
    oddsSourceUrl: odds.sourceUrl,
    myComboConfig: myComboSource.matches[match.id]
      ? { constraints: myComboSource.constraints, portfolios: myComboSource.matches[match.id] }
      : null,
    generatedAt: predictionGeneratedAt
  });
  const validation = backtest?.headToHead?.outOfSample?.selected;
  const withoutHeadToHead = backtest?.headToHead?.outOfSample?.withoutHeadToHead;
  return validation ? {
    ...prediction,
    modelValidation: {
      season: backtest.season,
      method: backtest.methodology.type,
      matches: validation.metrics.matches,
      oneXTwoLogLoss: validation.metrics.oneXTwoLogLoss,
      oneXTwoBrier: validation.metrics.oneXTwoBrier,
      oneXTwoAccuracyPct: validation.metrics.oneXTwoAccuracyPct,
      exactTopThreeHitPct: validation.metrics.exactTopThreeHitPct,
      improvementVsWithoutHeadToHeadPct: validation.improvementVsWithoutHeadToHeadPct,
      withoutHeadToHead,
      headToHeadConfiguration: validation.configuration,
      scope: `${backtest.methodology.modelScope} Il correttivo H2H e ricostruito senza usare incontri successivi alla gara stimata.`,
      multiSeason: multiSeasonBacktest ? {
        method: multiSeasonBacktest.methodology.type,
        matches: multiSeasonBacktest.archive.outOfSamplePredictions,
        testSeasons: multiSeasonBacktest.methodology.testSeasons,
        selectedScoreModel: "poisson",
        poisson: multiSeasonBacktest.variants.poisson.aggregate,
        empirical: multiSeasonBacktest.variants.empirical.aggregate,
        xgBlend25: multiSeasonBacktest.variants["xg-blend-25"].aggregate,
        dixonColesRecommendation: multiSeasonBacktest.decision.recommendation,
        calibrationRecommendation: multiSeasonBacktest.decision.calibrationRecommendation
      } : null,
      openingRounds: openingBacktest ? {
        method: openingBacktest.methodology.type,
        validationMatches: openingBacktest.samples.validation,
        firstRoundMatches: openingBacktest.samples.firstRoundValidation,
        configuration: openingBacktest.regularized.configuration,
        validation: openingBacktest.regularized.validation,
        firstRound: openingBacktest.regularized.firstRound,
        improvementVsCurrentPct: openingBacktest.regularizedImprovementVsCurrentPct,
        recommendation: openingBacktest.recommendation
      } : null
    }
  } : prediction;
});

const withoutMvpCandidate = prediction => {
  const { mvpCandidate, ...rest } = prediction;
  return rest;
};
const archivedPredictions = predictionArchive.predictions.map(withoutMvpCandidate);
const archivedPredictionByMatch = new Map(archivedPredictions.map(prediction => [prediction.matchId, prediction]));
const generatedCurrent = generatedPredictions.filter(prediction => !archivedPredictionByMatch.has(prediction.matchId));
const basePredictions = previewMode
  ? generatedPredictions
  : [...archivedPredictions, ...generatedCurrent].sort((left, right) => {
      const leftMatch = predictionMatches.find(match => match.id === left.matchId);
      const rightMatch = predictionMatches.find(match => match.id === right.matchId);
      return (leftMatch?.matchday || 99) - (rightMatch?.matchday || 99) || left.matchId.localeCompare(right.matchId);
    });
const predictions = basePredictions.map(enrichPrediction);
const capSaturation = generatedPredictions.flatMap(prediction => prediction.teamProjections || []).reduce((summary, projection) => {
  summary.teamProjections += 1;
  for (const metric of ["shots", "shotsOnTarget", "corners"]) {
    if (projection.ownOffensiveInteraction?.capDiagnostics?.[metric]?.capHit) summary.hits[metric] += 1;
  }
  return summary;
}, { teamProjections: 0, hits: { shots: 0, shotsOnTarget: 0, corners: 0 } });
capSaturation.frequencyPct = Object.fromEntries(Object.entries(capSaturation.hits).map(([metric, hits]) => [metric, capSaturation.teamProjections ? Math.round(hits / capSaturation.teamProjections * 1000) / 10 : 0]));

const output = {
  schemaVersion: 1,
  competition: "serie-a",
  competitions: ["serie-a"],
  season: "2026-27",
  ...(previewMode ? { mode: "exploratory-preview", matchday: previewMatchday, publicationStatus: "not-published" } : {}),
  generatedAt,
  diagnostics: {
    capSaturation: {
      scope: "current-generated-team-projections",
      ...capSaturation
    }
  },
  engine: {
    version: ENGINE_VERSION,
    playerMarketModelVersion: PLAYER_MARKET_MODEL_VERSION,
    teamMatchupProfileVersion: teamMatchupProfiles.schemaVersion,
    principle: "Un'unica matrice dei punteggi indipendente dalle quote genera 1X2, gol e mercati collegati.",
    weights: WEIGHTS,
    surpriseFactor: "Apertura della gara, probabilita dell'esito sfavorito, divergenza mercato-dati e incompletezza prepartita. Non determina da solo il verdetto.",
    spatialModel: "Valuta separatamente sviluppo a sinistra, al centro e a destra e lo incrocia con le vulnerabilita avversarie.",
    playerMarketModel: {
      version: PLAYER_MARKET_MODEL_VERSION,
      formula: "baseline individuale regolarizzata per ruolo x fattore matchup [0,82; 1,18] x minuti attesi/90 x scaling squadra riconciliato",
      probabilities: "Poisson sulle proiezioni individuali V2; SOT deriva dallo storico SOT/90 e viene vincolato ai tiri dello stesso giocatore.",
      expectedMinutes: "Media da titolare storica depurata con 22 minuti per presenza dalla panchina, prior di ruolo e massimo peso storico 76%; forma 2026/27 massimo 50%.",
      cardRisk: "Disciplina storica e corrente, ruolo, carico canale, duello diretto quando identificabile e fattore arbitro regredito sulla media di lega.",
      compatibility: "I campi projectedShotsV1 e projectedShotsOnTargetV1 conservano la stima precedente per confronto."
    },
    goalModel: "Forze relative casa/trasferta e complessive, ultime otto gare corrette per avversario, xG Understat al 25% quando sono coperti entrambi i club, probabile XI, divisione di provenienza, matrice Poisson e correttivo H2H limitato al 5% per lato.",
    scoreSelectionModel: "Il risultato esatto centrale arrotonda separatamente i gol attesi delle due squadre; la moda assoluta e gli altri punteggi probabili restano alternative distinte.",
    decisionLayer: {
      version: DECISION_LAYER_VERSION,
      order: "probabilita -> scenari -> correlazioni -> rischio portafoglio -> selezione -> verifica post-partita",
      probabilityPolicy: "Gli scenari e il rischio non ricalibrano le probabilita e non entrano nei gol attesi.",
      correlationMethod: "Dipendenza binaria fra mercati calcolata sulla matrice dei punteggi.",
      profileLimits: PROFILE_LIMITS,
      performanceDashboard: "data/generated/prediction-performance-dashboard.json"
    },
    scoreModel: {
      type: "poisson",
      calibration: "none",
      reason: "La correzione empirica per singolo punteggio e stata rimossa: nel walk-forward su quattro stagioni peggiora lo score log-loss rispetto a Poisson.",
      validationReport: "data/generated/prediction-backtest-multiseason.json"
    },
    xgModel: {
      provider: understatXg.provider,
      season: "2025-26",
      weightWhenAvailable: 0.25,
      coveredTeams: [...xgProfiles.values()].filter(Boolean).length,
      totalTeams: teams.length,
      fallback: "Poisson sui gol quando una delle due squadre non ha storico xG di Serie A.",
      validationReport: "data/generated/prediction-backtest-multiseason.json"
    },
    promotedTeamModel: {
      attackFactor: 0.51,
      defenceWeaknessFactor: 1.29,
      method: "Carry-over regolarizzato Serie B-Serie A, selezionato su dieci stagioni e validato sulle tre successive.",
      validationReport: "data/generated/prediction-backtest-opening-rounds.json"
    },
    validation: backtest ? {
      season: backtest.season,
      method: backtest.methodology.type,
      outOfSampleMatches: backtest.outOfSample.configuredV4Core.metrics.matches,
      configuredCore: backtest.outOfSample.configuredV4Core,
      baseline: backtest.outOfSample.baseline,
      headToHeadStatus: backtest.headToHead.status,
      headToHead: backtest.headToHead.outOfSample.selected,
      scope: backtest.methodology.modelScope,
      multiSeason: multiSeasonBacktest ? {
        method: multiSeasonBacktest.methodology.type,
        testSeasons: multiSeasonBacktest.methodology.testSeasons,
        outOfSampleMatches: multiSeasonBacktest.archive.outOfSamplePredictions,
        poisson: multiSeasonBacktest.variants.poisson.aggregate,
        empirical: multiSeasonBacktest.variants.empirical.aggregate,
        dixonColes: multiSeasonBacktest.variants["dixon-coles"].aggregate,
        xgBlend25: multiSeasonBacktest.variants["xg-blend-25"].aggregate,
        decision: multiSeasonBacktest.decision
      } : null,
      openingRounds: openingBacktest,
      uncertainty: multiSeasonBacktest ? {
        variants: Object.keys(multiSeasonBacktest.decision.uncertaintyComparison || {}),
        recommendation: multiSeasonBacktest.decision.uncertaintyRecommendation,
        decision: "La miscela di lambda non viene adottata se non migliora simultaneamente log-loss 1X2 e score log-loss con bootstrap favorevole."
      } : null
    } : null,
    volumeModel: {
      provider: volumeProfiles.source.provider,
      season: volumeProfiles.season,
      coverage: volumeProfiles.coverage,
      teamWeight: 0.45,
      opponentAllowedWeight: 0.35,
      recentWeight: 0.2,
      recentMatches: 8,
      recentDecay: 0.82,
      venueSplit: true,
      interval: "p20-p80 storico; per il totale varianze squadra trattate come indipendenti",
      fallback: "Profilo WhoScored, precisione della probabile formazione e stile offensivo quando manca lo storico Serie A della squadra."
    },
    playerVolumeModel: "Tiri e tiri in porta dei titolari: frequenze per 90 minuti 2025/26 regolarizzate verso una prior di ruolo, poi scalate sul volume previsto della squadra; i falli/90 restano visibili come base disciplinare e i dati mancanti usano una baseline dichiarata.",
    limitations: [`Quote Sisal datate per singolo evento; ultimo aggiornamento disponibile ${String(odds.retrievedAt).slice(0, 10)}. Le gare senza snapshot vengono pronosticate senza confronto mercato.`, "La forma recente della seconda giornata include il risultato concluso della prima e completa il campione con le gare 2025/26, sempre con taglio temporale per giornata.", "Gli xG Understat 2025/26 coprono 17 squadre su 20; negli incontri con una neopromossa non coperta resta attivo il fallback sui gol.", "Le indisponibilita derivano dal monitor editoriale aggiornato e i casi da valutare non sono trasformati in assenze certe; arbitri e meteo saranno integrati soltanto quando verificati.", "Per la seconda giornata le formazioni ufficiali della prima sono usate soltanto come riferimento tecnico, non come distinte confermate.", "Il backtest pluristagionale non include probabili XI, indisponibili e tattica per assenza di snapshot storici.", "Il correttivo H2H e limitato al 5% per lato: il vantaggio fuori campione e positivo ma modesto, quindi non deve dominare il pronostico."]
  },
  sources: [
    { label: "Lega Serie A - programma prime cinque giornate", url: "https://www.legaseriea.it/serie-a/news/date-orari-e-programmazione-tv-delle-prime-cinque-giornate" },
    { label: "Sisal - quote Serie A", url: odds.sourceUrl },
    ...myComboSources.map(source => ({ label: `MyCombo editoriali - ${source.filename} · selezioni Sisal ${source.updatedAt}`, url: `data/sources/${source.filename}` })),
    { label: `${teams.find(team => team.probableLineup?.source)?.probableLineup.source.provider || "Fonte editoriale"} - probabili formazioni 20 squadre`, url: teams.find(team => team.probableLineup?.source?.url)?.probableLineup.source.url },
    { label: "ESPN - ultimi cinque scontri diretti", url: "data/generated/head-to-head/first-leg-2026-27.json" },
    { label: `${volumeProfiles.source.provider} - tiri, tiri in porta e corner ${volumeProfiles.season}`, url: "data/normalized/team-volume-profiles-2025-26.json" }
  ],
  predictions
};

const outputPath = previewMode
  ? path.join(root, "data/generated", `prediction-preview-md${String(previewMatchday).padStart(2, "0")}-2026-27.json`)
  : path.join(root, "data/normalized/predictions.json");
fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(`OK pronostici preliminari: ${predictions.length} · motore ${ENGINE_VERSION} · ${path.relative(root, outputPath)}`);
