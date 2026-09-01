"use strict";

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const historyPath = path.join(root, "data/normalized/uefa-europe-history-2023-26.json");
const reportPath = path.join(root, "data/generated/uefa-1x2-backtest.json");
const modelPath = path.join(root, "data/normalized/uefa-1x2-model-2026-27.json");
const history = JSON.parse(fs.readFileSync(historyPath, "utf8"));
const matches = history.matches.slice().sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));

const fail = message => { throw new Error(`Backtest UEFA 1X2: ${message}`); };
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const round = (value, digits = 5) => value == null ? null : Number(value.toFixed(digits));
const outcomeIndex = match => match.score90.home > match.score90.away ? 0 : match.score90.home === match.score90.away ? 1 : 2;
const outcomeScore = match => match.score90.home > match.score90.away ? 1 : match.score90.home === match.score90.away ? 0.5 : 0;
const competitionNames = { ucl: "Champions League", uel: "Europa League", uecl: "Conference League" };

if (matches.length !== 1469) fail(`attese 1469 gare, trovate ${matches.length}`);
if (new Set(matches.map(match => match.id)).size !== matches.length) fail("ID partita duplicati");

function predict(ratings, match, params) {
  const homeRating = ratings.get(match.homeTeam.id) ?? 1500;
  const awayRating = ratings.get(match.awayTeam.id) ?? 1500;
  const ratingGap = homeRating - awayRating + params.homeAdvantage;
  const homeShare = 1 / (1 + 10 ** (-ratingGap / 400));
  const draw = clamp(params.drawBase * Math.exp(-Math.abs(ratingGap) / params.drawScale), 0.12, 0.34);
  const home = (1 - draw) * homeShare;
  return { home, draw, away: 1 - home - draw, ratingGap };
}

function shrinkRatings(ratings, factor) {
  for (const [teamId, rating] of ratings) ratings.set(teamId, 1500 + (rating - 1500) * factor);
}

function runSequence(sequence, params, initialState = null, collectPredictions = false) {
  const ratings = new Map(initialState?.ratings || []);
  let activeSeason = initialState?.activeSeason || null;
  const predictions = [];
  let index = 0;
  while (index < sequence.length) {
    const date = sequence[index].date;
    const batch = [];
    while (index < sequence.length && sequence[index].date === date) batch.push(sequence[index++]);
    const season = batch[0].season;
    if (season !== activeSeason) {
      if (activeSeason != null) shrinkRatings(ratings, params.seasonRetention);
      activeSeason = season;
    }
    const pending = batch.map(match => ({ match, probability: predict(ratings, match, params) }));
    if (collectPredictions) predictions.push(...pending.map(({ match, probability }) => ({ match, probability })));
    for (const { match, probability } of pending) {
      const expectedScore = probability.home + 0.5 * probability.draw;
      const delta = params.kFactor * params.competitionUpdateWeights[match.competitionCode] * (outcomeScore(match) - expectedScore);
      ratings.set(match.homeTeam.id, (ratings.get(match.homeTeam.id) ?? 1500) + delta);
      ratings.set(match.awayTeam.id, (ratings.get(match.awayTeam.id) ?? 1500) - delta);
    }
  }
  return { ratings: [...ratings], activeSeason, predictions };
}

function baselineProbabilities(trainingMatches) {
  const counts = [0, 0, 0];
  for (const match of trainingMatches) counts[outcomeIndex(match)] += 1;
  return counts.map(count => count / trainingMatches.length);
}

function metrics(predictions) {
  if (!predictions.length) return null;
  let logLoss = 0, brier = 0, correct = 0;
  const calibrationCells = Array.from({ length: 10 }, () => ({ count: 0, probability: 0, observed: 0 }));
  for (const { match, probability } of predictions) {
    const probs = [probability.home, probability.draw, probability.away];
    const actual = outcomeIndex(match);
    logLoss -= Math.log(clamp(probs[actual], 1e-12, 1));
    brier += probs.reduce((sum, value, index) => sum + (value - (index === actual ? 1 : 0)) ** 2, 0);
    const predicted = probs.indexOf(Math.max(...probs));
    if (predicted === actual) correct += 1;
    probs.forEach((value, outcome) => {
      const cell = calibrationCells[Math.min(9, Math.floor(value * 10))];
      cell.count += 1;
      cell.probability += value;
      cell.observed += outcome === actual ? 1 : 0;
    });
  }
  const calibration = calibrationCells.map((cell, index) => ({ ...cell, index })).filter(cell => cell.count).map(cell => ({
    bin: `${cell.index * 10}-${(cell.index + 1) * 10}%`,
    count: cell.count,
    meanProbability: round(cell.probability / cell.count, 4),
    observedRate: round(cell.observed / cell.count, 4)
  }));
  const calibrationError = calibration.reduce((sum, cell) => sum + cell.count * Math.abs(cell.meanProbability - cell.observedRate), 0) / (predictions.length * 3);
  return {
    matches: predictions.length,
    logLoss: round(logLoss / predictions.length),
    brier: round(brier / predictions.length),
    accuracyPct: round(correct * 100 / predictions.length, 2),
    calibrationError: round(calibrationError),
    calibration
  };
}

function constantPredictions(sequence, probabilities) {
  return sequence.map(match => ({ match, probability: { home: probabilities[0], draw: probabilities[1], away: probabilities[2] } }));
}

function evaluate(trainMatches, testMatches, params) {
  const trained = runSequence(trainMatches, params);
  const evaluated = runSequence(testMatches, params, trained, true);
  const result = { overall: metrics(evaluated.predictions), byCompetition: {}, byConfidence: {} };
  for (const code of Object.keys(competitionNames)) result.byCompetition[code] = metrics(evaluated.predictions.filter(item => item.match.competitionCode === code));
  result.byConfidence.balanced = metrics(evaluated.predictions.filter(item => Math.max(item.probability.home, item.probability.draw, item.probability.away) < 0.5));
  result.byConfidence.moderate = metrics(evaluated.predictions.filter(item => { const top = Math.max(item.probability.home, item.probability.draw, item.probability.away); return top >= 0.5 && top < 0.6; }));
  result.byConfidence.strong = metrics(evaluated.predictions.filter(item => Math.max(item.probability.home, item.probability.draw, item.probability.away) >= 0.6));
  return result;
}

function baselineEvaluation(trainMatches, testMatches) {
  const probabilities = baselineProbabilities(trainMatches);
  const predictions = constantPredictions(testMatches, probabilities);
  return {
    probabilities: { home: round(probabilities[0]), draw: round(probabilities[1]), away: round(probabilities[2]) },
    overall: metrics(predictions),
    byCompetition: Object.fromEntries(Object.keys(competitionNames).map(code => [code, metrics(predictions.filter(item => item.match.competitionCode === code))]))
  };
}

function modelPredictions(trainMatches, testMatches, params) {
  const trained = runSequence(trainMatches, params);
  return runSequence(testMatches, params, trained, true).predictions;
}

function bootstrapImprovements(modelItems, baselineProbabilities, iterations = 4000, seed = 20260902) {
  const rows = modelItems.map(({ match, probability }) => {
    const actual = outcomeIndex(match);
    const model = [probability.home, probability.draw, probability.away];
    const baselineLog = -Math.log(clamp(baselineProbabilities[actual], 1e-12, 1));
    const modelLog = -Math.log(clamp(model[actual], 1e-12, 1));
    const baselineBrier = baselineProbabilities.reduce((sum, value, index) => sum + (value - (index === actual ? 1 : 0)) ** 2, 0);
    const modelBrier = model.reduce((sum, value, index) => sum + (value - (index === actual ? 1 : 0)) ** 2, 0);
    return { logLoss: baselineLog - modelLog, brier: baselineBrier - modelBrier };
  });
  let randomState = seed >>> 0;
  const random = () => {
    randomState += 0x6D2B79F5;
    let value = randomState;
    value = Math.imul(value ^ value >>> 15, value | 1);
    value ^= value + Math.imul(value ^ value >>> 7, value | 61);
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
  const samples = { logLoss: [], brier: [] };
  for (let iteration = 0; iteration < iterations; iteration += 1) {
    let logLoss = 0, brier = 0;
    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[Math.floor(random() * rows.length)];
      logLoss += row.logLoss;
      brier += row.brier;
    }
    samples.logLoss.push(logLoss / rows.length);
    samples.brier.push(brier / rows.length);
  }
  const interval = values => {
    values.sort((a, b) => a - b);
    const at = quantile => values[Math.floor((values.length - 1) * quantile)];
    return { lower95: round(at(0.025)), median: round(at(0.5)), upper95: round(at(0.975)) };
  };
  return { matches: rows.length, iterations, logLoss: interval(samples.logLoss), brier: interval(samples.brier) };
}

const train2023 = matches.filter(match => match.season === "2023-24");
const validation2024 = matches.filter(match => match.season === "2024-25");
const trainThrough2024 = matches.filter(match => match.season !== "2025-26");
const holdout2025 = matches.filter(match => match.season === "2025-26");

const updateProfiles = [
  { id: "flat", weights: { ucl: 1, uel: 1, uecl: 1 } },
  { id: "mild", weights: { ucl: 1, uel: 0.86, uecl: 0.72 } },
  { id: "provisional", weights: { ucl: 1, uel: 0.78, uecl: 0.62 } },
  { id: "strong", weights: { ucl: 1, uel: 0.7, uecl: 0.5 } }
];
const candidates = [];
for (const homeAdvantage of [40, 60, 80, 100]) {
  for (const kFactor of [20, 30, 40]) {
    for (const drawBase of [0.22, 0.26, 0.3, 0.34]) {
      for (const drawScale of [250, 400, 600]) {
        for (const seasonRetention of [0.7, 0.8, 0.9, 1]) {
          for (const profile of updateProfiles) {
            const params = { homeAdvantage, kFactor, drawBase, drawScale, seasonRetention, competitionWeightProfile: profile.id, competitionUpdateWeights: profile.weights };
            const result = evaluate(train2023, validation2024, params);
            candidates.push({ params, logLoss: result.overall.logLoss, brier: result.overall.brier, calibrationError: result.overall.calibrationError, uclLogLoss: result.byCompetition.ucl.logLoss });
          }
        }
      }
    }
  }
}
candidates.sort((a, b) => a.logLoss - b.logLoss || a.brier - b.brier || a.calibrationError - b.calibrationError);
const selected = candidates[0];
const validationBaseline = baselineEvaluation(train2023, validation2024);
const validationModel = evaluate(train2023, validation2024, selected.params);
const holdoutBaseline = baselineEvaluation(trainThrough2024, holdout2025);
const holdoutModel = evaluate(trainThrough2024, holdout2025, selected.params);
const holdoutPredictions = modelPredictions(trainThrough2024, holdout2025, selected.params);
const holdoutBaselineVector = baselineProbabilities(trainThrough2024);
const bootstrap = {
  overall: bootstrapImprovements(holdoutPredictions, holdoutBaselineVector),
  ucl: bootstrapImprovements(holdoutPredictions.filter(item => item.match.competitionCode === "ucl"), holdoutBaselineVector, 4000, 20260903)
};
const improvements = {
  overallLogLoss: round(holdoutBaseline.overall.logLoss - holdoutModel.overall.logLoss),
  overallBrier: round(holdoutBaseline.overall.brier - holdoutModel.overall.brier),
  uclLogLoss: round(holdoutBaseline.byCompetition.ucl.logLoss - holdoutModel.byCompetition.ucl.logLoss),
  uclBrier: round(holdoutBaseline.byCompetition.ucl.brier - holdoutModel.byCompetition.ucl.brier)
};
const gatePassed = improvements.overallLogLoss > 0 && improvements.overallBrier > 0 && improvements.uclLogLoss > 0 && improvements.uclBrier > 0
  && holdoutModel.overall.calibrationError <= 0.04 && holdoutModel.byCompetition.ucl.calibrationError <= 0.06
  && bootstrap.overall.logLoss.lower95 > 0 && bootstrap.overall.brier.lower95 > 0;

const finalState = runSequence(matches, selected.params);
const ratings = finalState.ratings.map(([teamId, rating]) => ({ teamId, rating: round(rating, 2) })).sort((a, b) => b.rating - a.rating);
const generatedAt = "2026-09-02";
const report = {
  schemaVersion: 1,
  generatedAt,
  method: "Nested chronological walk-forward Elo 1X2",
  selection: { train: "2023-24", validation: "2024-25", candidates: candidates.length, objective: "minimum validation log-loss" },
  holdoutProtocol: { train: "2023-24 + 2024-25", test: "2025-26", frozenParameters: true },
  selectedParameters: selected.params,
  validation: { baseline: validationBaseline, model: validationModel },
  holdout: { baseline: holdoutBaseline, model: holdoutModel, improvements, bootstrap },
  probabilityGate: {
    passed: gatePassed,
    rule: "Il modello deve migliorare log-loss e Brier sull'intero holdout e sulle gare Champions, rispettare ECE <= 0,04 complessivo e <= 0,06 Champions, e avere intervalli bootstrap complessivi al 95% sopra zero.",
    status: gatePassed ? "eligible-for-current-fixture-prototype" : "disabled"
  },
  topCandidates: candidates.slice(0, 10)
};

fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(modelPath, `${JSON.stringify({
  schemaVersion: 1,
  generatedAt,
  status: report.probabilityGate.status,
  trainingMatches: matches.length,
  historyThrough: matches.at(-1).date,
  parameters: selected.params,
  probabilityGate: report.probabilityGate,
  holdoutSummary: { baseline: holdoutBaseline.overall, model: holdoutModel.overall, championsBaseline: holdoutBaseline.byCompetition.ucl, championsModel: holdoutModel.byCompetition.ucl, improvements, bootstrap },
  ratings
}, null, 2)}\n`);

console.log(`OK backtest UEFA 1X2: ${candidates.length} configurazioni · holdout ${holdout2025.length} gare · gate ${gatePassed ? "SUPERATO" : "NON SUPERATO"}`);
console.log(`Holdout log-loss ${holdoutBaseline.overall.logLoss} -> ${holdoutModel.overall.logLoss}; Brier ${holdoutBaseline.overall.brier} -> ${holdoutModel.overall.brier}`);
console.log(`Champions log-loss ${holdoutBaseline.byCompetition.ucl.logLoss} -> ${holdoutModel.byCompetition.ucl.logLoss}; Brier ${holdoutBaseline.byCompetition.ucl.brier} -> ${holdoutModel.byCompetition.ucl.brier}`);
