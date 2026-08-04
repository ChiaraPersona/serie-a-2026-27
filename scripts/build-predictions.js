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
const backtestPath = path.join(root, "data/generated/prediction-backtest-2025-26.json");
const backtest = fs.existsSync(backtestPath) ? JSON.parse(fs.readFileSync(backtestPath, "utf8")) : null;
const multiSeasonBacktestPath = path.join(root, "data/generated/prediction-backtest-multiseason.json");
const multiSeasonBacktest = fs.existsSync(multiSeasonBacktestPath) ? JSON.parse(fs.readFileSync(multiSeasonBacktestPath, "utf8")) : null;
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
        dixonColesRecommendation: multiSeasonBacktest.decision.recommendation,
        calibrationRecommendation: multiSeasonBacktest.decision.calibrationRecommendation
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
    goalModel: "Forze relative casa/trasferta e complessive, ultime otto gare corrette per avversario, probabile XI, divisione di provenienza, matrice Poisson selezionata con backtest pluristagionale e correttivo H2H limitato al 5% per lato.",
    scoreModel: {
      type: "poisson",
      calibration: "none",
      reason: "La correzione empirica per singolo punteggio e stata rimossa: nel walk-forward su quattro stagioni peggiora lo score log-loss rispetto a Poisson.",
      validationReport: "data/generated/prediction-backtest-multiseason.json"
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
        decision: multiSeasonBacktest.decision
      } : null
    } : null,
    volumeModel: "Stima per squadra tiri totali, tiri nello specchio e corner come intervalli, senza imporre una partita ricca o povera di gol.",
    playerModel: "I cinque probabili ammoniti e il candidato MVP provengono dalle probabili formazioni e dallo storico individuale disponibile.",
    limitations: ["Quote disponibili in un solo snapshot del 3 agosto 2026.", "Forma ufficiale 2026/27 non ancora disponibile: la forma recente usa le ultime otto gare 2025/26.", "Indisponibili, arbitri e meteo saranno integrati soltanto quando verificati.", "Le probabili formazioni sono proiezioni editoriali e non distinte ufficiali.", "Il backtest pluristagionale copre il nucleo statistico retrodatabile, ma non probabili XI, indisponibili e tattica per assenza di snapshot storici.", "Il correttivo H2H e limitato al 5% per lato: il vantaggio fuori campione e positivo ma modesto, quindi non deve dominare il pronostico."]
  },
  sources: [
    { label: "Lega Serie A - programma prime cinque giornate", url: "https://www.legaseriea.it/serie-a/news/date-orari-e-programmazione-tv-delle-prime-cinque-giornate" },
    { label: "Sisal - quote Serie A", url: odds.sourceUrl },
    { label: "Calciomercato.com - proiezione formazioni 20 squadre", url: teams.find(team => team.probableLineup?.source?.url)?.probableLineup.source.url },
    { label: "ESPN - ultimi cinque scontri diretti", url: "data/generated/head-to-head/first-leg-2026-27.json" }
  ],
  predictions
};

fs.writeFileSync(path.join(root, "data/normalized/predictions.json"), `${JSON.stringify(output, null, 2)}\n`);
console.log(`OK pronostici preliminari: ${predictions.length} · motore ${ENGINE_VERSION}`);
