"use strict";

const fs = require("fs");
const path = require("path");
const { ENGINE_VERSION, WEIGHTS, predictMatch } = require("./predictions/engine");

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
const backtestPath = path.join(root, "data/generated/prediction-backtest-2025-26.json");
const backtest = fs.existsSync(backtestPath) ? JSON.parse(fs.readFileSync(backtestPath, "utf8")) : null;
const multiSeasonBacktestPath = path.join(root, "data/generated/prediction-backtest-multiseason.json");
const multiSeasonBacktest = fs.existsSync(multiSeasonBacktestPath) ? JSON.parse(fs.readFileSync(multiSeasonBacktestPath, "utf8")) : null;
const openingBacktestPath = path.join(root, "data/generated/prediction-backtest-opening-rounds.json");
const openingBacktest = fs.existsSync(openingBacktestPath) ? JSON.parse(fs.readFileSync(openingBacktestPath, "utf8")) : null;
const generatedAt = odds.retrievedAt || new Date().toISOString();

const byId = items => new Map(items.map(item => [item.teamId || item.team || item.matchId || item.canonicalMatchId, item]));
const readingByMatch = byId(readings);
const styleByTeam = byId(styles.profiles);
const disciplineByTeam = byId(discipline.profiles);
const objectiveByTeam = byId(objectives.teams);
const oddsByMatch = byId(odds.events);
const headToHeadByMatch = new Map(headToHead.fixtures.map(fixture => [fixture.fixtureId, fixture]));
const homeByTeam = byId(standings.homeRows);
const awayByTeam = byId(standings.awayRows);
const teamById = new Map(teams.map(team => [team.id, team]));
const squadsByTeam = new Map(teams.map(team => [team.id, read(`data/generated/team-pages/${team.id}-squad.json`)]));
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

function recentForm(teamId) {
  const rows = historicalMatches.filter(match => match.homeTeam.slug === teamId || match.awayTeam.slug === teamId)
    .sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 8);
  if (!rows.length) return null;
  let weightTotal = 0, goalsFor = 0, goalsAgainst = 0;
  rows.forEach((match, index) => {
    const atHome = match.homeTeam.slug === teamId;
    const opponent = atHome ? match.awayTeam.slug : match.homeTeam.slug;
    const opponentStrength = (standingsByTeam.get(opponent)?.points || meanStandingPoints) / meanStandingPoints;
    const weight = 0.82 ** index;
    weightTotal += weight;
    goalsFor += (atHome ? match.score.home : match.score.away) * (opponentStrength ** 0.25) * weight;
    goalsAgainst += (atHome ? match.score.away : match.score.home) / (opponentStrength ** 0.25) * weight;
  });
  return { matches: rows.length, goalsFor: goalsFor / weightTotal, goalsAgainst: goalsAgainst / weightTotal, decay: 0.82, opponentAdjusted: true };
}

const targetMatches = matches
  .filter(match => match.competition === "serie-a" && match.season === "2026-27" && oddsByMatch.has(match.id))
  .sort((a, b) => a.matchday - b.matchday || a.id.localeCompare(b.id));

const predictions = targetMatches.map(match => {
  const prediction = predictMatch({
    match,
    reading: readingByMatch.get(match.id),
    homeVenue: homeByTeam.get(match.homeTeam),
    awayVenue: awayByTeam.get(match.awayTeam),
    homeProfile: styleByTeam.get(match.homeTeam),
    awayProfile: styleByTeam.get(match.awayTeam),
    homeRecent: recentForm(match.homeTeam),
    awayRecent: recentForm(match.awayTeam),
    homeXgProfile: xgProfiles.get(match.homeTeam),
    awayXgProfile: xgProfiles.get(match.awayTeam),
    xgLeagueSummary,
    homeDiscipline: disciplineByTeam.get(match.homeTeam),
    awayDiscipline: disciplineByTeam.get(match.awayTeam),
    homeObjective: objectiveByTeam.get(match.homeTeam),
    awayObjective: objectiveByTeam.get(match.awayTeam),
    headToHead: headToHeadByMatch.get(match.id),
    homeTeam: teamById.get(match.homeTeam),
    awayTeam: teamById.get(match.awayTeam),
    homeSquad: squadsByTeam.get(match.homeTeam),
    awaySquad: squadsByTeam.get(match.awayTeam),
    leagueSummary: standings.summary,
    oddsEvent: oddsByMatch.get(match.id),
    oddsRetrievedAt: odds.retrievedAt,
    oddsSourceUrl: odds.sourceUrl,
    generatedAt
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

const output = {
  schemaVersion: 1,
  competition: "serie-a",
  season: "2026-27",
  generatedAt,
  engine: {
    version: ENGINE_VERSION,
    principle: "Un'unica matrice dei punteggi indipendente dalle quote genera 1X2, gol e mercati collegati.",
    weights: WEIGHTS,
    surpriseFactor: "Apertura della gara, probabilita dell'esito sfavorito, divergenza mercato-dati e incompletezza prepartita. Non determina da solo il verdetto.",
    spatialModel: "Valuta separatamente sviluppo a sinistra, al centro e a destra e lo incrocia con le vulnerabilita avversarie.",
    goalModel: "Forze relative casa/trasferta e complessive, ultime otto gare corrette per avversario, xG Understat al 25% quando sono coperti entrambi i club, probabile XI, divisione di provenienza, matrice Poisson e correttivo H2H limitato al 5% per lato.",
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
      openingRounds: openingBacktest
    } : null,
    volumeModel: "Stima per squadra tiri totali, tiri nello specchio e corner come intervalli, senza imporre una partita ricca o povera di gol.",
    playerModel: "I cinque probabili ammoniti e il candidato MVP provengono dalle probabili formazioni e dallo storico individuale disponibile.",
    limitations: [`Quote disponibili nello snapshot Sisal del ${String(odds.retrievedAt).slice(0, 10)}.`, "Forma ufficiale 2026/27 non ancora disponibile: la forma recente usa le ultime otto gare 2025/26.", "Gli xG Understat 2025/26 coprono 17 squadre su 20; negli incontri con una neopromossa non coperta resta attivo il fallback sui gol.", "Le indisponibilita derivano dal monitor editoriale aggiornato e i casi da valutare non sono trasformati in assenze certe; arbitri e meteo saranno integrati soltanto quando verificati.", "Le probabili formazioni sono proiezioni editoriali e non distinte ufficiali.", "Il backtest pluristagionale non include probabili XI, indisponibili e tattica per assenza di snapshot storici.", "Il correttivo H2H e limitato al 5% per lato: il vantaggio fuori campione e positivo ma modesto, quindi non deve dominare il pronostico."]
  },
  sources: [
    { label: "Lega Serie A - programma prime cinque giornate", url: "https://www.legaseriea.it/serie-a/news/date-orari-e-programmazione-tv-delle-prime-cinque-giornate" },
    { label: "Sisal - quote Serie A", url: odds.sourceUrl },
    { label: `${teams.find(team => team.probableLineup?.source)?.probableLineup.source.provider || "Fonte editoriale"} - probabili formazioni 20 squadre`, url: teams.find(team => team.probableLineup?.source?.url)?.probableLineup.source.url },
    { label: "ESPN - ultimi cinque scontri diretti", url: "data/generated/head-to-head/first-leg-2026-27.json" }
  ],
  predictions
};

fs.writeFileSync(path.join(root, "data/normalized/predictions.json"), `${JSON.stringify(output, null, 2)}\n`);
console.log(`OK pronostici preliminari: ${predictions.length} · motore ${ENGINE_VERSION}`);
