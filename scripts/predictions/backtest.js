"use strict";

const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const root = path.resolve(__dirname, "..", "..");
const inputPath = path.join(root, "data", "normalized", "referee-matches", "2025-26", "serie-a.json");
const outputPath = path.join(root, "data", "generated", "prediction-backtest-2025-26.json");
const source = JSON.parse(fs.readFileSync(inputPath, "utf8"));
const matches = source.matches
  .filter(match => match.status === "STATUS_FULL_TIME" && Number.isFinite(match.score?.home) && Number.isFinite(match.score?.away))
  .sort((a, b) => a.matchday - b.matchday || new Date(a.date) - new Date(b.date));
const providerToTeam = new Map(matches.flatMap(match => [
  [String(match.homeTeam.id), match.homeTeam.slug],
  [String(match.awayTeam.id), match.awayTeam.slug]
]));

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const sum = values => values.reduce((total, value) => total + value, 0);
const mean = values => values.length ? sum(values) / values.length : null;
const round = (value, digits = 4) => Number(value.toFixed(digits));
const normalize = values => {
  const total = sum(values);
  return values.map(value => value / total);
};

function loadHeadToHeadArchive() {
  const scoreboardsRoot = path.join(root, "data", "raw", "head-to-head", "espn", "scoreboards");
  if (!fs.existsSync(scoreboardsRoot)) return [];
  const competitions = { "ita.1.json.gz": "Serie A", "ita.2.json.gz": "Serie B", "ita.coppa_italia.json.gz": "Coppa Italia" };
  const events = new Map();
  for (const season of fs.readdirSync(scoreboardsRoot)) {
    const seasonPath = path.join(scoreboardsRoot, season);
    if (!fs.statSync(seasonPath).isDirectory()) continue;
    for (const file of fs.readdirSync(seasonPath).filter(name => competitions[name])) {
      const raw = JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(seasonPath, file))));
      for (const event of raw.payload?.events || []) {
        if (!event.status?.type?.completed || events.has(String(event.id))) continue;
        const competitors = event.competitions?.[0]?.competitors || [];
        const home = competitors.find(row => row.homeAway === "home");
        const away = competitors.find(row => row.homeAway === "away");
        const homeTeamId = providerToTeam.get(String(home?.team?.id));
        const awayTeamId = providerToTeam.get(String(away?.team?.id));
        const homeScore = Number(home?.score), awayScore = Number(away?.score);
        if (!homeTeamId || !awayTeamId || !Number.isFinite(homeScore) || !Number.isFinite(awayScore) || !event.date) continue;
        events.set(String(event.id), {
          id: String(event.id),
          date: event.date,
          competition: competitions[file],
          homeTeamId,
          awayTeamId,
          homeScore,
          awayScore,
          pairKey: [homeTeamId, awayTeamId].sort().join("|")
        });
      }
    }
  }
  return [...events.values()].sort((a, b) => new Date(a.date) - new Date(b.date));
}

const headToHeadArchive = loadHeadToHeadArchive();

function headToHeadMeetings(match) {
  const pairKey = [match.homeTeam.slug, match.awayTeam.slug].sort().join("|");
  const cutoff = new Date(match.date).getTime();
  return headToHeadArchive
    .filter(event => event.pairKey === pairKey && new Date(event.date).getTime() < cutoff)
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 5);
}

function headToHeadFactors(match, league, configuration) {
  if (!configuration?.cap) return { home: 1, away: 1, sample: 0 };
  const meetings = headToHeadMeetings(match);
  if (!meetings.length) return { home: 1, away: 1, sample: 0 };
  const competitionWeight = { "Serie A": 1, "Serie B": configuration.lowerDivisionWeight, "Coppa Italia": configuration.cupWeight };
  let weightTotal = 0, goalsFor = 0, goalsAgainst = 0;
  meetings.forEach((meeting, index) => {
    const currentHomeWasHome = meeting.homeTeamId === match.homeTeam.slug;
    const scored = currentHomeWasHome ? meeting.homeScore : meeting.awayScore;
    const conceded = currentHomeWasHome ? meeting.awayScore : meeting.homeScore;
    const venueWeight = currentHomeWasHome ? 1 : configuration.oppositeVenueWeight;
    const weight = (configuration.decay ** index) * (competitionWeight[meeting.competition] || 0.7) * venueWeight;
    weightTotal += weight;
    goalsFor += scored * weight;
    goalsAgainst += conceded * weight;
  });
  const weightedFor = goalsFor / weightTotal;
  const weightedAgainst = goalsAgainst / weightTotal;
  const reliability = meetings.length / 5;
  const balance = clamp((weightedFor - weightedAgainst) / Math.max(1, weightedFor + weightedAgainst), -0.6, 0.6);
  const averageTotal = (goalsFor + goalsAgainst) / weightTotal;
  const leagueTotal = league.home + league.away;
  const edge = balance * configuration.cap * reliability;
  const tempo = clamp((averageTotal / leagueTotal - 1) * configuration.tempoCap * reliability, -configuration.tempoCap, configuration.tempoCap);
  return {
    home: clamp((1 + edge) * (1 + tempo), 1 - configuration.cap, 1 + configuration.cap),
    away: clamp((1 - edge) * (1 + tempo), 1 - configuration.cap, 1 + configuration.cap),
    sample: meetings.length
  };
}

function poisson(goals, lambda) {
  let factorial = 1;
  for (let index = 2; index <= goals; index += 1) factorial *= index;
  return Math.exp(-lambda) * (lambda ** goals) / factorial;
}

function matrix(homeLambda, awayLambda, calibration = null, maxGoals = 8) {
  const rows = [];
  for (let home = 0; home <= maxGoals; home += 1) {
    for (let away = 0; away <= maxGoals; away += 1) {
      rows.push({
        home,
        away,
        probability: poisson(home, homeLambda) * poisson(away, awayLambda) * (calibration?.[`${home}-${away}`] || 1)
      });
    }
  }
  const total = sum(rows.map(row => row.probability));
  return rows.map(row => ({ ...row, probability: row.probability / total }));
}

function oneXTwo(rows) {
  return normalize([
    sum(rows.filter(row => row.home > row.away).map(row => row.probability)),
    sum(rows.filter(row => row.home === row.away).map(row => row.probability)),
    sum(rows.filter(row => row.home < row.away).map(row => row.probability))
  ]);
}

function scoreCalibration(history, league, exponent) {
  if (!exponent) return null;
  const counts = new Map();
  history.forEach(match => {
    const key = `${match.score.home}-${match.score.away}`;
    counts.set(key, (counts.get(key) || 0) + 1);
  });
  const factors = {};
  for (let home = 0; home <= 8; home += 1) {
    for (let away = 0; away <= 8; away += 1) {
      const key = `${home}-${away}`;
      const expected = history.length * poisson(home, league.home) * poisson(away, league.away);
      factors[key] = clamp(((counts.get(key) || 0) + 4) / (expected + 4), 0.45, 2.2) ** exponent;
    }
  }
  return factors;
}

function leagueRates(history) {
  const priorMatches = 80;
  const priorHome = 1.45;
  const priorAway = 1.15;
  return {
    home: (sum(history.map(match => match.score.home)) + priorMatches * priorHome) / (history.length + priorMatches),
    away: (sum(history.map(match => match.score.away)) + priorMatches * priorAway) / (history.length + priorMatches)
  };
}

function teamRows(history, teamId, venue = null) {
  return history.filter(match => {
    if (venue === "home") return match.homeTeam.slug === teamId;
    if (venue === "away") return match.awayTeam.slug === teamId;
    return match.homeTeam.slug === teamId || match.awayTeam.slug === teamId;
  });
}

function teamRate(history, teamId, venue, type, baseline, priorMatches) {
  const rows = teamRows(history, teamId, venue);
  const goals = sum(rows.map(match => {
    const atHome = match.homeTeam.slug === teamId;
    if (type === "for") return atHome ? match.score.home : match.score.away;
    return atHome ? match.score.away : match.score.home;
  }));
  return (goals + baseline * priorMatches) / (rows.length + priorMatches);
}

function pointsBefore(history) {
  const table = new Map();
  const row = team => {
    if (!table.has(team)) table.set(team, { played: 0, points: 0 });
    return table.get(team);
  };
  history.forEach(match => {
    const home = row(match.homeTeam.slug), away = row(match.awayTeam.slug);
    home.played += 1;
    away.played += 1;
    if (match.score.home > match.score.away) home.points += 3;
    else if (match.score.home < match.score.away) away.points += 3;
    else { home.points += 1; away.points += 1; }
  });
  return table;
}

function recentRate(history, teamId, type, baseline) {
  const table = pointsBefore(history);
  const leaguePpg = sum([...table.values()].map(row => row.points)) / Math.max(1, sum([...table.values()].map(row => row.played)));
  const rows = teamRows(history, teamId).slice(-8).reverse();
  if (!rows.length) return baseline;
  let weighted = 0, weights = 0;
  rows.forEach((match, index) => {
    const atHome = match.homeTeam.slug === teamId;
    const opponent = atHome ? match.awayTeam.slug : match.homeTeam.slug;
    const opponentRow = table.get(opponent);
    const opponentPpg = opponentRow ? (opponentRow.points + 4.5) / (opponentRow.played + 3) : leaguePpg;
    const opponentFactor = clamp((opponentPpg / Math.max(0.5, leaguePpg)) ** 0.2, 0.82, 1.18);
    const goals = type === "for"
      ? (atHome ? match.score.home : match.score.away) * opponentFactor
      : (atHome ? match.score.away : match.score.home) / opponentFactor;
    const weight = 0.82 ** index;
    weighted += goals * weight;
    weights += weight;
  });
  return (weighted + baseline * 2.5) / (weights + 2.5);
}

function weightedGeometric(items) {
  const totalWeight = sum(items.map(item => item.weight));
  return Math.exp(sum(items.map(item => Math.log(clamp(item.value, 0.35, 2.4)) * item.weight)) / totalWeight);
}

function predict(history, match, parameters, baselineOnly = false, headToHeadConfiguration = null) {
  const league = leagueRates(history);
  if (baselineOnly) {
    const rows = matrix(league.home, league.away);
    return { homeLambda: league.home, awayLambda: league.away, rows, probabilities: oneXTwo(rows) };
  }
  const homeId = match.homeTeam.slug, awayId = match.awayTeam.slug;
  const overallBaseline = (league.home + league.away) / 2;
  const strength = (rate, baseline, reliability) => 1 + (rate / baseline - 1) * reliability;
  const homeAttack = weightedGeometric([
    { value: strength(teamRate(history, homeId, "home", "for", league.home, 4), league.home, parameters.venueReliability), weight: parameters.venueWeight },
    { value: strength(teamRate(history, homeId, null, "for", overallBaseline, 7), overallBaseline, parameters.overallReliability), weight: parameters.overallWeight },
    { value: strength(recentRate(history, homeId, "for", overallBaseline), overallBaseline, parameters.recentReliability), weight: parameters.recentWeight }
  ]);
  const homeDefence = weightedGeometric([
    { value: strength(teamRate(history, homeId, "home", "against", league.away, 4), league.away, parameters.venueReliability), weight: parameters.venueWeight },
    { value: strength(teamRate(history, homeId, null, "against", overallBaseline, 7), overallBaseline, parameters.overallReliability), weight: parameters.overallWeight },
    { value: strength(recentRate(history, homeId, "against", overallBaseline), overallBaseline, parameters.recentReliability), weight: parameters.recentWeight }
  ]);
  const awayAttack = weightedGeometric([
    { value: strength(teamRate(history, awayId, "away", "for", league.away, 4), league.away, parameters.venueReliability), weight: parameters.venueWeight },
    { value: strength(teamRate(history, awayId, null, "for", overallBaseline, 7), overallBaseline, parameters.overallReliability), weight: parameters.overallWeight },
    { value: strength(recentRate(history, awayId, "for", overallBaseline), overallBaseline, parameters.recentReliability), weight: parameters.recentWeight }
  ]);
  const awayDefence = weightedGeometric([
    { value: strength(teamRate(history, awayId, "away", "against", league.home, 4), league.home, parameters.venueReliability), weight: parameters.venueWeight },
    { value: strength(teamRate(history, awayId, null, "against", overallBaseline, 7), overallBaseline, parameters.overallReliability), weight: parameters.overallWeight },
    { value: strength(recentRate(history, awayId, "against", overallBaseline), overallBaseline, parameters.recentReliability), weight: parameters.recentWeight }
  ]);
  const headToHead = headToHeadFactors(match, league, headToHeadConfiguration);
  const homeLambda = clamp(league.home * homeAttack * awayDefence * headToHead.home, 0.3, 3.5);
  const awayLambda = clamp(league.away * awayAttack * homeDefence * headToHead.away, 0.25, 3.3);
  const rows = matrix(homeLambda, awayLambda, scoreCalibration(history, league, parameters.calibrationExponent));
  return { homeLambda, awayLambda, rows, probabilities: oneXTwo(rows), headToHeadSample: headToHead.sample };
}

function actualOutcome(match) {
  return match.score.home > match.score.away ? 0 : match.score.home === match.score.away ? 1 : 2;
}

function goalBand(home, away) {
  const total = home + away;
  return total <= 1 ? 0 : total <= 3 ? 1 : 2;
}

function evaluate(parameters, fromMatchday, toMatchday, baselineOnly = false, headToHeadConfiguration = null) {
  const rows = matches.filter(match => match.matchday >= fromMatchday && match.matchday <= toMatchday).map(match => {
    const history = matches.filter(previous => previous.matchday < match.matchday);
    const prediction = predict(history, match, parameters, baselineOnly, headToHeadConfiguration);
    const outcome = actualOutcome(match);
    const outcomeProbability = clamp(prediction.probabilities[outcome], 1e-8, 1);
    const actualScoreProbability = clamp(prediction.rows.find(row => row.home === match.score.home && row.away === match.score.away)?.probability || 1e-8, 1e-8, 1);
    const orderedScores = [...prediction.rows].sort((a, b) => b.probability - a.probability);
    const bandProbabilities = [0, 0, 0];
    prediction.rows.forEach(score => { bandProbabilities[goalBand(score.home, score.away)] += score.probability; });
    const actualBand = goalBand(match.score.home, match.score.away);
    return {
      matchday: match.matchday,
      matchId: match.id,
      actual: `${match.score.home}-${match.score.away}`,
      predictedMode: `${orderedScores[0].home}-${orderedScores[0].away}`,
      oneXTwoLogLoss: -Math.log(outcomeProbability),
      oneXTwoBrier: sum(prediction.probabilities.map((probability, index) => (probability - Number(index === outcome)) ** 2)),
      oneXTwoHit: Number(prediction.probabilities.indexOf(Math.max(...prediction.probabilities)) === outcome),
      scoreLogLoss: -Math.log(actualScoreProbability),
      modeHit: Number(orderedScores[0].home === match.score.home && orderedScores[0].away === match.score.away),
      topThreeHit: Number(orderedScores.slice(0, 3).some(score => score.home === match.score.home && score.away === match.score.away)),
      goalBandBrier: sum(bandProbabilities.map((probability, index) => (probability - Number(index === actualBand)) ** 2)),
      goalBandHit: Number(bandProbabilities.indexOf(Math.max(...bandProbabilities)) === actualBand),
      totalGoalsAbsoluteError: Math.abs(prediction.homeLambda + prediction.awayLambda - match.score.home - match.score.away),
      headToHeadSample: prediction.headToHeadSample || 0
    };
  });
  const metrics = {
    matches: rows.length,
    oneXTwoLogLoss: round(mean(rows.map(row => row.oneXTwoLogLoss))),
    oneXTwoBrier: round(mean(rows.map(row => row.oneXTwoBrier))),
    oneXTwoAccuracyPct: round(mean(rows.map(row => row.oneXTwoHit)) * 100, 1),
    scoreLogLoss: round(mean(rows.map(row => row.scoreLogLoss))),
    exactModeHitPct: round(mean(rows.map(row => row.modeHit)) * 100, 1),
    exactTopThreeHitPct: round(mean(rows.map(row => row.topThreeHit)) * 100, 1),
    goalBandBrier: round(mean(rows.map(row => row.goalBandBrier))),
    goalBandAccuracyPct: round(mean(rows.map(row => row.goalBandHit)) * 100, 1),
    totalGoalsMae: round(mean(rows.map(row => row.totalGoalsAbsoluteError))),
    headToHeadCoveragePct: round(mean(rows.map(row => Number(row.headToHeadSample > 0))) * 100, 1),
    completeHeadToHeadCoveragePct: round(mean(rows.map(row => Number(row.headToHeadSample === 5))) * 100, 1),
    averageHeadToHeadSample: round(mean(rows.map(row => row.headToHeadSample)), 2)
  };
  return { metrics, rows };
}

function bootstrapDifference(modelRows, baselineRows, metric, iterations = 2000) {
  let state = 20260804;
  const random = () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
  const differences = [];
  for (let iteration = 0; iteration < iterations; iteration += 1) {
    let difference = 0;
    for (let index = 0; index < modelRows.length; index += 1) {
      const sampled = Math.floor(random() * modelRows.length);
      difference += baselineRows[sampled][metric] - modelRows[sampled][metric];
    }
    differences.push(difference / modelRows.length);
  }
  differences.sort((a, b) => a - b);
  return {
    meanImprovement: round(mean(differences)),
    confidenceInterval95: [round(differences[Math.floor(iterations * 0.025)]), round(differences[Math.floor(iterations * 0.975)])],
    interpretation: "Valori positivi favoriscono il modello; un intervallo che include zero non dimostra un vantaggio stabile."
  };
}

const parameterGrid = [];
for (const venueWeight of [0.35, 0.46, 0.55]) {
  for (const recentWeight of [0.08, 0.16, 0.24]) {
    for (const venueReliability of [0.55, 0.7]) {
      for (const calibrationExponent of [0, 0.35, 0.55]) {
        parameterGrid.push({
          venueWeight,
          overallWeight: 0.25,
          recentWeight,
          venueReliability,
          overallReliability: 0.62,
          recentReliability: 0.48,
          calibrationExponent
        });
      }
    }
  }
}

const ranked = parameterGrid.map(parameters => {
  const result = evaluate(parameters, 9, 19);
  return {
    parameters,
    metrics: result.metrics,
    selectionScore: result.metrics.oneXTwoLogLoss * 0.7 + result.metrics.goalBandBrier * 0.3
  };
}).sort((a, b) => a.selectionScore - b.selectionScore);

const selected = ranked[0];
const test = evaluate(selected.parameters, 20, 38);
const baseline = evaluate(selected.parameters, 20, 38, true);
const configuredCoreParameters = {
  venueWeight: 0.46,
  overallWeight: 0.25,
  recentWeight: 0.16,
  venueReliability: 0.7,
  overallReliability: 0.62,
  recentReliability: 0.48,
  calibrationExponent: 0.55
};
const configuredCore = evaluate(configuredCoreParameters, 20, 38);
const noHeadToHeadTraining = evaluate(configuredCoreParameters, 9, 19);
const headToHeadGrid = [{ cap: 0, decay: 0.72, lowerDivisionWeight: 0.8, cupWeight: 0.72, oppositeVenueWeight: 0.85, tempoCap: 0.02 }];
for (const cap of [0.015, 0.025, 0.035, 0.05]) {
  for (const decay of [0.6, 0.72, 0.85]) {
    for (const oppositeVenueWeight of [0.75, 1]) {
      headToHeadGrid.push({ cap, decay, lowerDivisionWeight: 0.8, cupWeight: 0.72, oppositeVenueWeight, tempoCap: Math.min(0.02, cap * 0.5) });
    }
  }
}
const rankedHeadToHead = headToHeadGrid.map(configuration => {
  const result = evaluate(configuredCoreParameters, 9, 19, false, configuration);
  return {
    configuration,
    metrics: result.metrics,
    selectionScore: result.metrics.oneXTwoLogLoss * 0.7 + result.metrics.goalBandBrier * 0.3
  };
}).sort((a, b) => a.selectionScore - b.selectionScore);
const selectedHeadToHead = rankedHeadToHead[0];
const headToHeadTest = evaluate(configuredCoreParameters, 20, 38, false, selectedHeadToHead.configuration);
const productionHeadToHeadConfiguration = { cap: 0.05, decay: 0.72, lowerDivisionWeight: 1, cupWeight: 1, oppositeVenueWeight: 1, tempoCap: 0.02 };
const productionHeadToHeadTest = evaluate(configuredCoreParameters, 20, 38, false, productionHeadToHeadConfiguration);
const improvementPct = (baselineValue, modelValue) => round((baselineValue - modelValue) / baselineValue * 100, 1);
const output = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  competition: source.competition,
  season: source.season,
  methodology: {
    type: "walk-forward",
    leakageControl: "Ogni pronostico usa soltanto partite di giornate precedenti. Le giornate 9-19 selezionano i parametri; le giornate 20-38 restano fuori campione.",
    trainingWindow: { fromMatchday: 9, toMatchday: 19, matches: 110 },
    testWindow: { fromMatchday: 20, toMatchday: 38, matches: test.metrics.matches },
    baseline: "Poisson dinamico con sole medie gol casa/trasferta note prima della giornata.",
    modelScope: "Nucleo statistico di forza casa/trasferta, forza complessiva, forma recente e calibrazione punteggi. Probabili XI, tattica e obiettivi non sono retrodatabili senza snapshot storici.",
    selectionMetric: "70% log-loss 1X2 + 30% Brier delle fasce gol.",
    candidateConfigurations: parameterGrid.length
  },
  selectedParameters: selected.parameters,
  trainingMetrics: selected.metrics,
  outOfSample: {
    model: test.metrics,
    baseline: baseline.metrics,
    configuredV4Core: {
      parameters: configuredCoreParameters,
      metrics: configuredCore.metrics,
      improvementVsBaselinePct: {
        oneXTwoLogLoss: improvementPct(baseline.metrics.oneXTwoLogLoss, configuredCore.metrics.oneXTwoLogLoss),
        oneXTwoBrier: improvementPct(baseline.metrics.oneXTwoBrier, configuredCore.metrics.oneXTwoBrier),
        scoreLogLoss: improvementPct(baseline.metrics.scoreLogLoss, configuredCore.metrics.scoreLogLoss),
        goalBandBrier: improvementPct(baseline.metrics.goalBandBrier, configuredCore.metrics.goalBandBrier)
      },
      pairedBootstrap: {
        oneXTwoLogLoss: bootstrapDifference(configuredCore.rows, baseline.rows, "oneXTwoLogLoss"),
        oneXTwoBrier: bootstrapDifference(configuredCore.rows, baseline.rows, "oneXTwoBrier"),
        scoreLogLoss: bootstrapDifference(configuredCore.rows, baseline.rows, "scoreLogLoss")
      }
    },
    improvementVsBaselinePct: {
      oneXTwoLogLoss: improvementPct(baseline.metrics.oneXTwoLogLoss, test.metrics.oneXTwoLogLoss),
      oneXTwoBrier: improvementPct(baseline.metrics.oneXTwoBrier, test.metrics.oneXTwoBrier),
      scoreLogLoss: improvementPct(baseline.metrics.scoreLogLoss, test.metrics.scoreLogLoss),
      goalBandBrier: improvementPct(baseline.metrics.goalBandBrier, test.metrics.goalBandBrier),
      totalGoalsMae: improvementPct(baseline.metrics.totalGoalsMae, test.metrics.totalGoalsMae)
    },
    pairedBootstrap: {
      oneXTwoLogLoss: bootstrapDifference(test.rows, baseline.rows, "oneXTwoLogLoss"),
      oneXTwoBrier: bootstrapDifference(test.rows, baseline.rows, "oneXTwoBrier"),
      scoreLogLoss: bootstrapDifference(test.rows, baseline.rows, "scoreLogLoss")
    }
  },
  headToHead: {
    status: selectedHeadToHead.configuration.cap > 0 ? "validated" : "rejected-by-training",
    archiveEvents: headToHeadArchive.length,
    leakageControl: "Per ogni gara sono usati soltanto eventi H2H con data precedente al calcio d'inizio.",
    candidateConfigurations: headToHeadGrid.length,
    selectionWindow: { fromMatchday: 9, toMatchday: 19, withoutHeadToHead: noHeadToHeadTraining.metrics, selected: selectedHeadToHead },
    outOfSample: {
      withoutHeadToHead: configuredCore.metrics,
      selected: {
        configuration: selectedHeadToHead.configuration,
        metrics: headToHeadTest.metrics,
        improvementVsWithoutHeadToHeadPct: {
          oneXTwoLogLoss: improvementPct(configuredCore.metrics.oneXTwoLogLoss, headToHeadTest.metrics.oneXTwoLogLoss),
          oneXTwoBrier: improvementPct(configuredCore.metrics.oneXTwoBrier, headToHeadTest.metrics.oneXTwoBrier),
          scoreLogLoss: improvementPct(configuredCore.metrics.scoreLogLoss, headToHeadTest.metrics.scoreLogLoss),
          goalBandBrier: improvementPct(configuredCore.metrics.goalBandBrier, headToHeadTest.metrics.goalBandBrier)
        },
        pairedBootstrap: {
          oneXTwoLogLoss: bootstrapDifference(headToHeadTest.rows, configuredCore.rows, "oneXTwoLogLoss"),
          oneXTwoBrier: bootstrapDifference(headToHeadTest.rows, configuredCore.rows, "oneXTwoBrier"),
          scoreLogLoss: bootstrapDifference(headToHeadTest.rows, configuredCore.rows, "scoreLogLoss")
        }
      },
      productionRule: {
        configuration: productionHeadToHeadConfiguration,
        metrics: productionHeadToHeadTest.metrics,
        improvementVsWithoutHeadToHeadPct: {
          oneXTwoLogLoss: improvementPct(configuredCore.metrics.oneXTwoLogLoss, productionHeadToHeadTest.metrics.oneXTwoLogLoss),
          oneXTwoBrier: improvementPct(configuredCore.metrics.oneXTwoBrier, productionHeadToHeadTest.metrics.oneXTwoBrier),
          scoreLogLoss: improvementPct(configuredCore.metrics.scoreLogLoss, productionHeadToHeadTest.metrics.scoreLogLoss),
          goalBandBrier: improvementPct(configuredCore.metrics.goalBandBrier, productionHeadToHeadTest.metrics.goalBandBrier)
        }
      }
    }
  },
  caveats: [
    "Una sola stagione non basta per dichiarare il modello stabilmente calibrato.",
    "Il test misura il nucleo statistico, non i segnali prepartita privi di snapshot storici.",
    "Il risultato esatto resta un mercato ad alta dispersione: top-3 hit e log-loss sono piu informativi della sola moda."
  ]
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(`OK backtest ${source.season}: ${test.metrics.matches} gare fuori campione, log-loss 1X2 ${test.metrics.oneXTwoLogLoss}`);
