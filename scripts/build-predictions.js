"use strict";

const fs = require("fs");
const path = require("path");
const { ENGINE_VERSION, WEIGHTS, MVP_WEIGHTS, predictMatch } = require("./predictions/engine");
const { DECISION_LAYER_VERSION, PROFILE_LIMITS, enrichPrediction } = require("./predictions/decision-layer");

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
const mvpHistory = read("data/sources/player-mvp-history-2025-26.json");
const fantasy = read("data/generated/fantacalcio-advice.json");
const volumeProfiles = read("data/normalized/team-volume-profiles-2025-26.json");
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
const mvpHistoryByPlayer = new Map(mvpHistory.players.map(player => [player.normalizedName, player]));
const fantasyHistoryByPlayer = new Map(fantasy.players.map(player => [playerKey(player.name), player]));
const volumeByTeam = byId(volumeProfiles.profiles);
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
const teamForMatch = (team, match) => {
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
    mvpHistory: mvpHistoryByPlayer,
    fantasyHistory: fantasyHistoryByPlayer,
    mvpSourceUrl: mvpHistory.sourceUrl,
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

const archivedPredictionByMatch = new Map(predictionArchive.predictions.map(prediction => [prediction.matchId, prediction]));
const generatedCurrent = generatedPredictions.filter(prediction => !archivedPredictionByMatch.has(prediction.matchId));
const basePredictions = previewMode
  ? generatedPredictions
  : [...predictionArchive.predictions, ...generatedCurrent].sort((left, right) => {
      const leftMatch = predictionMatches.find(match => match.id === left.matchId);
      const rightMatch = predictionMatches.find(match => match.id === right.matchId);
      return (leftMatch?.matchday || 99) - (rightMatch?.matchday || 99) || left.matchId.localeCompare(right.matchId);
    });
const predictions = basePredictions.map(enrichPrediction);

const output = {
  schemaVersion: 1,
  competition: "serie-a",
  competitions: ["serie-a"],
  season: "2026-27",
  ...(previewMode ? { mode: "exploratory-preview", matchday: previewMatchday, publicationStatus: "not-published" } : {}),
  generatedAt,
  engine: {
    version: ENGINE_VERSION,
    principle: "Un'unica matrice dei punteggi indipendente dalle quote genera 1X2, gol e mercati collegati.",
    weights: WEIGHTS,
    surpriseFactor: "Apertura della gara, probabilita dell'esito sfavorito, divergenza mercato-dati e incompletezza prepartita. Non determina da solo il verdetto.",
    spatialModel: "Valuta separatamente sviluppo a sinistra, al centro e a destra e lo incrocia con le vulnerabilita avversarie.",
    goalModel: "Forze relative casa/trasferta e complessive, ultime otto gare corrette per avversario, xG Understat al 25% quando sono coperti entrambi i club, probabile XI, divisione di provenienza, matrice Poisson e correttivo H2H limitato al 5% per lato.",
    scoreSelectionModel: "Il risultato principale e selezionato dentro l'esito 1X2 piu probabile; gli altri due sono i punteggi successivi piu probabili della matrice, senza imporre uno scenario sorpresa.",
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
    playerModel: "Il candidato MVP combina scenario 1X2, produzione e pagelle storiche, compatibilita tattica e storico ufficiale Panini Player of the Match; con favorita oltre il 50% e divario di almeno 15 punti, il candidato principale proviene normalmente dalla favorita.",
    mvpModel: {
      weights: MVP_WEIGHTS,
      officialHistory: {
        provider: mvpHistory.provider,
        award: mvpHistory.award,
        season: mvpHistory.season,
        sourceUrl: mvpHistory.sourceUrl,
        awards: mvpHistory.coverage.awards,
        expectedLeagueMatches: mvpHistory.coverage.expectedLeagueMatches,
        completionPct: mvpHistory.coverage.completionPct,
        missingPolicy: "N/D per chi non dispone di uno storico Serie A comparabile; zero soltanto per chi ha giocato la Serie A 2025/26 senza vincere il premio."
      },
      selectionRule: "La favorita con probabilita di vittoria >=50% e vantaggio >=15 punti fornisce il candidato principale; l'eventuale miglior punteggio avversario resta alternativa sorpresa."
    },
    limitations: [`Quote Sisal datate per singolo evento; ultimo aggiornamento disponibile ${String(odds.retrievedAt).slice(0, 10)}. Le gare senza snapshot vengono pronosticate senza confronto mercato.`, "La forma recente della seconda giornata include il risultato concluso della prima e completa il campione con le gare 2025/26, sempre con taglio temporale per giornata.", "Gli xG Understat 2025/26 coprono 17 squadre su 20; negli incontri con una neopromossa non coperta resta attivo il fallback sui gol.", "Le indisponibilita derivano dal monitor editoriale aggiornato e i casi da valutare non sono trasformati in assenze certe; arbitri e meteo saranno integrati soltanto quando verificati.", "Per la seconda giornata le formazioni ufficiali della prima sono usate soltanto come riferimento tecnico, non come distinte confermate.", "Il backtest pluristagionale non include probabili XI, indisponibili e tattica per assenza di snapshot storici.", "Il correttivo H2H e limitato al 5% per lato: il vantaggio fuori campione e positivo ma modesto, quindi non deve dominare il pronostico."]
  },
  sources: [
    { label: "Lega Serie A - programma prime cinque giornate", url: "https://www.legaseriea.it/serie-a/news/date-orari-e-programmazione-tv-delle-prime-cinque-giornate" },
    { label: "Sisal - quote Serie A", url: odds.sourceUrl },
    ...myComboSources.map(source => ({ label: `MyCombo editoriali - ${source.filename} · selezioni Sisal ${source.updatedAt}`, url: `data/sources/${source.filename}` })),
    { label: `${teams.find(team => team.probableLineup?.source)?.probableLineup.source.provider || "Fonte editoriale"} - probabili formazioni 20 squadre`, url: teams.find(team => team.probableLineup?.source?.url)?.probableLineup.source.url },
    { label: "ESPN - ultimi cinque scontri diretti", url: "data/generated/head-to-head/first-leg-2026-27.json" },
    { label: `${volumeProfiles.source.provider} - tiri, tiri in porta e corner ${volumeProfiles.season}`, url: "data/normalized/team-volume-profiles-2025-26.json" },
    { label: `${mvpHistory.provider} - ${mvpHistory.award} ${mvpHistory.season}`, url: mvpHistory.sourceUrl }
  ],
  predictions
};

const outputPath = previewMode
  ? path.join(root, "data/generated", `prediction-preview-md${String(previewMatchday).padStart(2, "0")}-2026-27.json`)
  : path.join(root, "data/normalized/predictions.json");
fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(`OK pronostici preliminari: ${predictions.length} · motore ${ENGINE_VERSION} · ${path.relative(root, outputPath)}`);
