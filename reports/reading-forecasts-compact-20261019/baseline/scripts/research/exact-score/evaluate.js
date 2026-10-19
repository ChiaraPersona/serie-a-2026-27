"use strict";
const { deriveMarkets, scoreProbability, actualScoreRank, distributionDiagnostics, validateMatrix } = require("./distribution");
const mean = values => values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
const EPSILON = 1e-15;

function logLoss(p, epsilon = EPSILON) {
  if (!Number.isFinite(p) || p < 0 || p > 1 || !(epsilon > 0 && epsilon < 1)) throw new Error("Invalid evaluation probability/epsilon");
  return -Math.log(Math.max(epsilon, p));
}
const scoreSurprise = logLoss;
function rankedProbabilityScore(probabilities, actualIndex) {
  if (probabilities.length !== 3 || probabilities.some(p => !Number.isFinite(p) || p < 0 || p > 1) || Math.abs(probabilities.reduce((a, b) => a + b, 0) - 1) > 1e-9 || !Number.isInteger(actualIndex) || actualIndex < 0 || actualIndex > 2) throw new Error("Invalid ordered 1X2 distribution");
  let cumulative = 0, result = 0;
  for (let k = 0; k < 2; k++) { cumulative += probabilities[k]; result += (cumulative - Number(actualIndex <= k)) ** 2; }
  return result / 2; // normalized RPS; explicit ordinal order HOME / DRAW / AWAY
}
function calibration(rows, bins = 10) {
  if (!Number.isInteger(bins) || bins < 1) throw new Error("Invalid calibration bins");
  const available = rows.filter(row => Number.isFinite(row.p) && Number.isFinite(row.y));
  if (available.some(row => row.p < 0 || row.p > 1 || ![0, 1].includes(row.y))) throw new Error("Invalid binary calibration input");
  const buckets = Array.from({ length: bins }, (_, index) => {
    const subset = available.filter(row => Math.min(bins - 1, Math.floor(row.p * bins)) === index);
    return { lower: index / bins, upper: (index + 1) / bins, n: subset.length, predicted: mean(subset.map(row => row.p)), observed: mean(subset.map(row => row.y)) };
  });
  return { n: available.length, status: available.length ? "DESCRIPTIVE_ONLY" : "UNAVAILABLE", bins: buckets, ece: available.length ? buckets.filter(b => b.n).reduce((n, b) => n + b.n / available.length * Math.abs(b.predicted - b.observed), 0) : null };
}
function binaryMetrics(rows) {
  return { n: rows.length, brier: mean(rows.map(row => (row.p - row.y) ** 2)), logLoss: mean(rows.map(row => logLoss(row.y ? row.p : 1 - row.p))), calibration: calibration(rows), ece: calibration(rows).ece };
}
function continuousMetrics(rows) {
  return { n: rows.length, mae: mean(rows.map(row => Math.abs(row.p - row.y))), rmse: rows.length ? Math.sqrt(mean(rows.map(row => (row.p - row.y) ** 2))) : null, bias: mean(rows.map(row => row.p - row.y)) };
}
function goalCalibration(rows, edges = [0, 0.5, 1, 1.5, 2, 3, 4, Infinity]) {
  return edges.slice(0, -1).map((lower, i) => { const subset = rows.filter(row => row.p >= lower && row.p < edges[i + 1]); return { lower, upper: Number.isFinite(edges[i + 1]) ? edges[i + 1] : null, n: subset.length, predicted: mean(subset.map(row => row.p)), observed: mean(subset.map(row => row.y)) }; });
}
function matchDiagnostic(prediction, row) {
  if (prediction.matchId !== row.matchId || prediction.targetMatchday !== row.targetMatchday || prediction.generationClass !== row.generationClass || JSON.stringify(prediction.dataCutoff) !== JSON.stringify(row.dataCutoff)) throw new Error("Prediction/evaluation identity, class or cutoff mismatch");
  if (row.actual?.availability !== "AVAILABLE") return null;
  if (row.targetMatchday >= 6) throw new Error("MD6+ actual evaluation forbidden in this phase");
  const h = row.actual.actualHomeGoals, a = row.actual.actualAwayGoals;
  if (![h, a].every(v => Number.isInteger(v) && v >= 0)) throw new Error("Missing/invalid actual is not zero");
  validateMatrix(prediction.scoreMatrix);
  const derived = deriveMarkets(prediction.scoreMatrix), info = distributionDiagnostics(prediction.scoreMatrix);
  const p = scoreProbability(prediction.scoreMatrix, h, a), rank = actualScoreRank(prediction.scoreMatrix, h, a);
  const outcomeIndex = h > a ? 0 : h === a ? 1 : 2;
  const probabilities = [derived.outcomes.home, derived.outcomes.draw, derived.outcomes.away];
  return { matchId: row.matchId, matchday: row.targetMatchday, generationClass: row.generationClass, modelId: prediction.modelId, lambdaHome: prediction.lambdaHome, lambdaAway: prediction.lambdaAway,
    ...info, actualScore: `${h}-${a}`, actualHomeGoals: h, actualAwayGoals: a, actualScoreProbability: p, actualScoreRank: rank, rankScope: "REPRESENTED_SUPPORT_DETERMINISTIC_TIES_HOME_THEN_AWAY", outsideRepresentedSupport: rank == null,
    exactHit: info.modalScore === `${h}-${a}`, top3Hit: info.top3.some(score => score.score === `${h}-${a}`), top5Hit: info.top5.some(score => score.score === `${h}-${a}`), scoreLogLoss: p == null ? null : logLoss(p), scoreSurprise: p == null ? null : scoreSurprise(p),
    outcomeProbabilities: derived.outcomes, actualOutcomeIndex: outcomeIndex, multiclassBrier: probabilities.reduce((n, probability, index) => n + (probability - Number(index === outcomeIndex)) ** 2, 0), outcomeLogLoss: logLoss(probabilities[outcomeIndex]), rps: rankedProbabilityScore(probabilities, outcomeIndex), btts: derived.btts, actualBTTS: Number(h > 0 && a > 0), overUnder: derived.overUnder, totalGoalProbabilities: derived.totalGoals,
    lowScoreProbabilities: Object.fromEntries([[0, 0], [1, 0], [0, 1], [1, 1]].map(([home, away]) => [`${home}-${away}`, scoreProbability(prediction.scoreMatrix, home, away)])),
    featureDiagnostics: row.vector.diagnostics, modelDiagnostics: prediction.diagnostics, matrixValidation: validateMatrix(prediction.scoreMatrix), actualContext: row.actual.context, tailMass: prediction.scoreMatrix.tailMass,
    errorDecomposition: { goalStrengthError: null, teamProcessError: null, goalConversionError: null, distributionError: null, dependenceError: null, identifiability: "INTERFACE_ONLY: requires controlled layer/counterfactual comparisons" } };
}
function evaluateModel(predictions, rows, model) {
  const classes = new Set(rows.map(row => row.generationClass));
  if (classes.size > 1) throw new Error("Prospective and retrospective metrics cannot be pooled");
  const ids = new Set();
  for (const p of predictions) { if (ids.has(p.matchId) || p.modelId !== model.id) throw new Error("Duplicate prediction or model mismatch"); ids.add(p.matchId); }
  const byId = new Map(rows.map(row => [row.matchId, row]));
  const diagnostics = predictions.map(p => { if (!byId.has(p.matchId)) throw new Error("Unknown evaluation match"); return matchDiagnostic(p, byId.get(p.matchId)); }).filter(Boolean);
  const goals = side => diagnostics.map(d => ({ p: d[`lambda${side}`], y: d[`actual${side}Goals`] }));
  const totals = diagnostics.map(d => ({ p: d.lambdaHome + d.lambdaAway, y: d.actualHomeGoals + d.actualAwayGoals }));
  const outcomeCalibration = Object.fromEntries(["home", "draw", "away"].map((side, index) => [side, calibration(diagnostics.map(d => ({ p: d.outcomeProbabilities[side], y: Number(d.actualOutcomeIndex === index) })))]));
  const totalBins = Object.fromEntries(["0", "1", "2", "3", "4+"].map(bin => [bin, calibration(diagnostics.map(d => ({ p: d.totalGoalProbabilities[bin], y: Number(bin === "4+" ? d.actualHomeGoals + d.actualAwayGoals >= 4 : d.actualHomeGoals + d.actualAwayGoals === Number(bin)) })))]));
  const lowScores = Object.fromEntries(["0-0", "1-0", "0-1", "1-1"].map(score => [score, binaryMetrics(diagnostics.map(d => ({ p: d.lowScoreProbabilities[score], y: Number(d.actualScore === score) })))]));
  return { model: { id: model.id, version: model.version, state: model.state, configuration: model.configuration }, generationClass: [...classes][0] || null, sample: diagnostics.length, matchIds: diagnostics.map(d => d.matchId), temporalCoverage: [...new Set(diagnostics.map(d => d.matchday))].sort((a, b) => a - b),
    goalMAE: { home: continuousMetrics(goals("Home")), away: continuousMetrics(goals("Away")), total: continuousMetrics(totals) }, scoreLogLoss: mean(diagnostics.map(d => d.scoreLogLoss).filter(Number.isFinite)), exactHitRate: mean(diagnostics.map(d => Number(d.exactHit))), top3Coverage: mean(diagnostics.map(d => Number(d.top3Hit))), top5Coverage: mean(diagnostics.map(d => Number(d.top5Hit))), actualScoreRank: { mean: mean(diagnostics.map(d => d.actualScoreRank).filter(Number.isFinite)), unavailable: diagnostics.filter(d => d.actualScoreRank == null).length },
    oneXtwo: { multiclassBrier: mean(diagnostics.map(d => d.multiclassBrier)), logLoss: mean(diagnostics.map(d => d.outcomeLogLoss)), rps: mean(diagnostics.map(d => d.rps)), rpsOrder: ["HOME", "DRAW", "AWAY"], rpsNormalization: "sum cumulative errors / (K-1)", calibration: outcomeCalibration },
    btts: binaryMetrics(diagnostics.map(d => ({ p: d.btts.yes, y: d.actualBTTS }))), overUnder: Object.fromEntries([1.5, 2.5, 3.5].map(line => [line, binaryMetrics(diagnostics.map(d => ({ p: d.overUnder[line].over, y: Number(d.actualHomeGoals + d.actualAwayGoals > line) })))])),
    calibration: { goalHome: goalCalibration(goals("Home")), goalAway: goalCalibration(goals("Away")), totalGoalBins: totalBins }, lowScores, drawDiagnostic: outcomeCalibration.draw,
    uncertainty: { status: "NOT_ESTIMATED", unit: "MATCH_OR_MATCHDAY_CLUSTER", reason: "Insufficient prospective temporal evidence; retrospective descriptive metrics do not establish improvement", outcomesIndependent: false },
    caution: "Exact score hit rate is a secondary metric.", evaluationEpsilon: EPSILON, matchDiagnostics: diagnostics };
}

function walkForwardFolds(rows) {
  if (new Set(rows.map(r => r.generationClass)).size > 1) throw new Error("Mixed fold generation classes");
  if (new Set(rows.map(r => r.matchId)).size !== rows.length) throw new Error("Duplicate fold target identity");
  return [...new Set(rows.map(row => row.targetMatchday))].sort((a, b) => a - b).map(md => {
    const tests = rows.filter(row => row.targetMatchday === md);
    const cutoff = Math.min(...tests.map(row => Date.parse(row.dataCutoff.effectiveDateExclusive)));
    return { id: `through-md${md - 1}-test-md${md}`, trainThroughMatchday: md - 1, cutoff: new Date(cutoff).toISOString(),
      trainingMatchIds: rows.filter(row => row.targetMatchday < md && row.actual?.availability === "AVAILABLE" && Number.isFinite(Date.parse(row.actual.completedBy)) && Date.parse(row.actual.completedBy) < cutoff).map(row => row.matchId), testMatchIds: tests.map(row => row.matchId), targetMatchday: md, randomSplit: false };
  });
}

function correlationMatrix(vectors, keys, { minimumSample = 30, highCollinearityThreshold = 0.9 } = {}) {
  if (!Number.isInteger(minimumSample) || minimumSample < 3 || !(highCollinearityThreshold > 0 && highCollinearityThreshold <= 1)) throw new Error("Invalid redundancy diagnostic options");
  return keys.flatMap((left, i) => keys.slice(i).map(right => {
    const rows = vectors.map(v => [v.features[left]?.value, v.features[right]?.value]).filter(pair => pair.every(Number.isFinite));
    const mx = mean(rows.map(r => r[0])), my = mean(rows.map(r => r[1]));
    const dx = rows.reduce((n, r) => n + (r[0] - mx) ** 2, 0), dy = rows.reduce((n, r) => n + (r[1] - my) ** 2, 0);
    const r = rows.length >= minimumSample && dx > 0 && dy > 0 ? rows.reduce((n, row) => n + (row[0] - mx) * (row[1] - my), 0) / Math.sqrt(dx * dy) : null;
    return { left, right, n: rows.length, correlation: r, highCollinearity: r == null ? null : left !== right && Math.abs(r) >= highCollinearityThreshold, status: r == null ? "INSUFFICIENT_OR_CONSTANT" : "DESCRIPTIVE", automaticallyRemoved: false };
  }));
}

function commonSample(predictionsByModel, rows) {
  const sets = Object.values(predictionsByModel).map(predictions => new Set(predictions.map(p => p.matchId)));
  return sets.length ? rows.filter(row => row.actual?.availability === "AVAILABLE" && sets.every(set => set.has(row.matchId))) : [];
}

function clusterBootstrap(diagnostics, statistic, { unit, iterations, minimumClusters, seed = 7 } = {}) {
  if (!["MATCH", "MATCHDAY"].includes(unit) || !Number.isInteger(iterations) || iterations < 1 || !Number.isInteger(minimumClusters) || minimumClusters < 2) throw new Error("Explicit clustered-bootstrap policy required");
  const ids = [...new Set(diagnostics.map(d => unit === "MATCHDAY" ? d.matchday : d.matchId))];
  if (ids.length < minimumClusters) return { status: "INSUFFICIENT", clusters: ids.length, unit, interval: null };
  let state = seed >>> 0;
  const random = () => { state = (1664525 * state + 1013904223) >>> 0; return state / 4294967296; };
  const samples = [];
  for (let i = 0; i < iterations; i++) {
    const draw = ids.map(() => ids[Math.floor(random() * ids.length)]).flatMap(id => diagnostics.filter(d => (unit === "MATCHDAY" ? d.matchday : d.matchId) === id));
    const result = statistic(draw); if (Number.isFinite(result)) samples.push(result);
  }
  samples.sort((a, b) => a - b);
  return { status: samples.length ? "DESCRIPTIVE" : "UNAVAILABLE", clusters: ids.length, unit, iterations, seed, interval: samples.length ? [samples[Math.floor(0.025 * (samples.length - 1))], samples[Math.floor(0.975 * (samples.length - 1))]] : null };
}

function goalDispersion(rows) {
  const diagnostic = values => { const average = mean(values), variance = values.length > 1 ? values.reduce((n, v) => n + (v - average) ** 2, 0) / (values.length - 1) : null; return { n: values.length, mean: average, variance, varianceMeanRatio: average > 0 && variance != null ? variance / average : null, status: "DESCRIPTIVE_NOT_PROOF_OF_PERSISTENT_OVERDISPERSION" }; };
  const valid = rows.filter(row => row.actual?.availability === "AVAILABLE");
  return { home: diagnostic(valid.map(row => row.actual.actualHomeGoals)), away: diagnostic(valid.map(row => row.actual.actualAwayGoals)), byMatchday: Object.fromEntries([...new Set(valid.map(r => r.targetMatchday))].map(md => [md, { home: diagnostic(valid.filter(r => r.targetMatchday === md).map(r => r.actual.actualHomeGoals)), away: diagnostic(valid.filter(r => r.targetMatchday === md).map(r => r.actual.actualAwayGoals)) }])) };
}

module.exports = { logLoss, scoreSurprise, rankedProbabilityScore, calibration, binaryMetrics, continuousMetrics, goalCalibration, matchDiagnostic, evaluateModel, walkForwardFolds, correlationMatrix, commonSample, clusterBootstrap, goalDispersion };
