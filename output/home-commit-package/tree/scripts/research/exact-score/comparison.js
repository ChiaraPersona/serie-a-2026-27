"use strict";
const { logLoss, evaluateModel } = require("./evaluate");
const { scoreProbability } = require("./distribution");
const mean = values => values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
const median = values => { if (!values.length) return null; const sorted = [...values].sort((a, b) => a - b), i = Math.floor(sorted.length / 2); return sorted.length % 2 ? sorted[i] : (sorted[i - 1] + sorted[i]) / 2; };
const METRICS = {
  scoreLogLoss: ["LOWER", d => d.scoreLogLoss], oneXtwoRPS: ["LOWER", d => d.rps], meanGoalMAE: ["LOWER", d => (Math.abs(d.lambdaHome - d.actualHomeGoals) + Math.abs(d.lambdaAway - d.actualAwayGoals)) / 2],
  homeGoalsMAE: ["LOWER", d => Math.abs(d.lambdaHome - d.actualHomeGoals)], awayGoalsMAE: ["LOWER", d => Math.abs(d.lambdaAway - d.actualAwayGoals)], totalGoalsMAE: ["LOWER", d => Math.abs(d.lambdaHome + d.lambdaAway - d.actualHomeGoals - d.actualAwayGoals)],
  homeGoalsRMSE: ["LOWER", d => (d.lambdaHome - d.actualHomeGoals) ** 2, "RMSE"], awayGoalsRMSE: ["LOWER", d => (d.lambdaAway - d.actualAwayGoals) ** 2, "RMSE"], totalGoalsRMSE: ["LOWER", d => (d.lambdaHome + d.lambdaAway - d.actualHomeGoals - d.actualAwayGoals) ** 2, "RMSE"],
  actualScoreProbability: ["HIGHER", d => d.actualScoreProbability], exactHitRate: ["HIGHER", d => Number(d.exactHit)], top3Coverage: ["HIGHER", d => Number(d.top3Hit)], top5Coverage: ["HIGHER", d => Number(d.top5Hit)],
  meanActualScoreRank: ["LOWER", d => d.actualScoreRank], medianActualScoreRank: ["LOWER", d => d.actualScoreRank, "MEDIAN"], oneXtwoLogLoss: ["LOWER", d => d.outcomeLogLoss],
  bttsBrier: ["LOWER", d => (d.btts.yes - d.actualBTTS) ** 2], bttsLogLoss: ["LOWER", d => logLoss(d.actualBTTS ? d.btts.yes : d.btts.no)],
  over15Brier: ["LOWER", d => (d.overUnder[1.5].over - Number(d.actualHomeGoals + d.actualAwayGoals > 1.5)) ** 2], over25Brier: ["LOWER", d => (d.overUnder[2.5].over - Number(d.actualHomeGoals + d.actualAwayGoals > 2.5)) ** 2], over35Brier: ["LOWER", d => (d.overUnder[3.5].over - Number(d.actualHomeGoals + d.actualAwayGoals > 3.5)) ** 2]
};
const PRIMARY = ["scoreLogLoss", "oneXtwoRPS", "meanGoalMAE", "top3Coverage"];
function contributions(diagnostics) { return diagnostics.map(d => Object.fromEntries(Object.entries(METRICS).map(([key, [, getter]]) => [key, getter(d)]))); }
function aggregate(values, key) { const valid = values.map(row => row[key]).filter(Number.isFinite), stat = METRICS[key][2]; return stat === "MEDIAN" ? median(valid) : stat === "RMSE" ? (valid.length ? Math.sqrt(mean(valid)) : null) : mean(valid); }
function metricsFor(diagnostics) { const values = contributions(diagnostics); return Object.fromEntries(Object.keys(METRICS).map(key => [key, aggregate(values, key)])); }

function pairedBootstrap(oldDiagnostics, newDiagnostics, config, unit) {
  if (oldDiagnostics.length !== newDiagnostics.length || oldDiagnostics.some((d, i) => d.matchId !== newDiagnostics[i].matchId)) throw new Error("Paired bootstrap requires identical ordered match sample");
  const oldValues = contributions(oldDiagnostics), newValues = contributions(newDiagnostics);
  const groups = new Map();
  oldDiagnostics.forEach((d, i) => { const key = unit === "MATCHDAY" ? d.matchday : d.matchId; if (!groups.has(key)) groups.set(key, []); groups.get(key).push(i); });
  const minimum = unit === "MATCHDAY" ? config.minimumMatchdayClusters : config.minimumMatchClusters;
  if (groups.size < minimum) return { status: "INSUFFICIENT", unit, clusters: groups.size, intervals: null };
  let state = config.seed >>> 0;
  const random = () => { state = (1664525 * state + 1013904223) >>> 0; return state / 4294967296; };
  const ids = [...groups.keys()], samples = Object.fromEntries(Object.keys(METRICS).map(key => [key, []]));
  for (let iteration = 0; iteration < config.iterations; iteration++) {
    const indices = ids.flatMap(() => groups.get(ids[Math.floor(random() * ids.length)]));
    const oldDraw = indices.map(i => oldValues[i]), newDraw = indices.map(i => newValues[i]);
    for (const key of Object.keys(METRICS)) { const oldMean = aggregate(oldDraw, key), newMean = aggregate(newDraw, key); if (oldMean != null && newMean != null) samples[key].push(newMean - oldMean); }
  }
  const alpha = config.familyAlpha / (config.primaryMetricCount * config.comparisonCount);
  const percentile = (values, probability) => { const position = probability * (values.length - 1), index = Math.floor(position), fraction = position - index; return values[index] + fraction * ((values[index + 1] ?? values[index]) - values[index]); };
  return { status: unit === "MATCHDAY" ? "EXPLORATORY_VERY_FEW_MATCHDAYS" : "EXPLORATORY_PAIRED_MATCH_BOOTSTRAP", unit, clusters: groups.size, iterations: config.iterations, seed: config.seed, allDerivedMarketsStayInMatchCluster: true,
    intervals: Object.fromEntries(Object.entries(samples).map(([key, values]) => { values.sort((a, b) => a - b); return [key, values.length ? { ci95: [percentile(values, 0.025), percentile(values, 0.975)], familyAdjustedCI: PRIMARY.includes(key) ? [percentile(values, alpha / 2), percentile(values, 1 - alpha / 2)] : null } : null]; })),
    familyAdjustment: { method: "BONFERRONI_3_COMPARISONS_4_PRIMARY_METRICS", confidence: 1 - alpha, primaryMetrics: PRIMARY }, warning: unit === "MATCHDAY" ? "Only five or fewer matchdays: unstable clustered intervals, not confirmatory evidence" : "Retrospective revised data and repeated teams: match resampling does not resolve temporal/source uncertainty" };
}
function compare(oldEvaluation, newEvaluation, config) {
  const oldMetrics = metricsFor(oldEvaluation.matchDiagnostics), newMetrics = metricsFor(newEvaluation.matchDiagnostics);
  const delta = Object.fromEntries(Object.keys(METRICS).map(key => [key, { value: oldMetrics[key] == null || newMetrics[key] == null ? null : newMetrics[key] - oldMetrics[key], improvementDirection: METRICS[key][0], old: oldMetrics[key], new: newMetrics[key] }]));
  const match = pairedBootstrap(oldEvaluation.matchDiagnostics, newEvaluation.matchDiagnostics, config.bootstrap, "MATCH");
  const matchday = pairedBootstrap(oldEvaluation.matchDiagnostics, newEvaluation.matchDiagnostics, config.bootstrap, "MATCHDAY");
  const core = ["scoreLogLoss", "oneXtwoRPS", "meanGoalMAE"];
  const ci = key => match.intervals?.[key]?.familyAdjustedCI;
  let status = "INSUFFICIENT";
  if (core.every(key => ci(key) && ci(key)[1] < 0)) status = "BETTER";
  else if (core.every(key => ci(key) && ci(key)[0] > 0)) status = "WORSE";
  else if (oldEvaluation.sample > 0 && PRIMARY.every(key => oldEvaluation.matchDiagnostics.every((d, i) => METRICS[key][1](d) === METRICS[key][1](newEvaluation.matchDiagnostics[i])))) status = "SIMILAR";
  return { older: oldEvaluation.model.id, newer: newEvaluation.model.id, sample: oldEvaluation.sample, delta, status, rule: config.inferenceRule, bootstrap: { match, matchday } };
}

function lambdaSummary(values) {
  const average = mean(values), variance = values.length > 1 ? values.reduce((n, v) => n + (v - average) ** 2, 0) / (values.length - 1) : null;
  return { n: values.length, mean: average, median: median(values), min: values.length ? Math.min(...values) : null, max: values.length ? Math.max(...values) : null, std: variance == null ? null : Math.sqrt(variance), betweenMatchVariance: variance, distinctValues: new Set(values).size, collapseAssessment: variance === 0 ? "EXACT_COLLAPSE" : "NONZERO_VARIATION_NO_NEAR_COLLAPSE_THRESHOLD_INFERRED" };
}
function binarySummary(diagnostics, probability, actual) {
  const predicted = mean(diagnostics.map(probability)), observed = mean(diagnostics.map(actual));
  return { n: diagnostics.length, predicted, observed, actualMinusPredicted: predicted == null ? null : observed - predicted, status: "EXPLORATORY" };
}
function exploratoryCalibration(evaluation, minimumBinCount) {
  const selected = { homeWin: evaluation.oneXtwo.calibration.home, draw: evaluation.oneXtwo.calibration.draw, awayWin: evaluation.oneXtwo.calibration.away, btts: evaluation.btts.calibration, over25: evaluation.overUnder[2.5].calibration };
  const reliability = Object.fromEntries(Object.entries(selected).map(([key, diagnostic]) => [key, { ...diagnostic, status: "EXPLORATORY_SMALL_RETROSPECTIVE_SAMPLE", bins: diagnostic.bins.map(bin => ({ ...bin, sufficientForStandaloneInference: false, countMeetsDiagnosticMinimum: bin.n >= minimumBinCount, interpretation: bin.n >= minimumBinCount ? "EXPLORATORY" : "DESCRIPTIVE_ONLY" })) }]));
  for (const side of ["Home", "Away"]) reliability[`goals${side}`] = { status: "DESCRIPTIVE_GOAL_RANGES", bins: evaluation.calibration[`goal${side}`].map(bin => ({ ...bin, countMeetsDiagnosticMinimum: bin.n >= minimumBinCount, inference: null })) };
  return reliability;
}
function selectLeader(evaluations, config) {
  if (evaluations.length < 2 || !evaluations[0].sample) return { id: null, qualifier: config.leader.qualifier, rule: config.leader.rule, rankings: [] };
  const candidates = evaluations.map(e => { const metrics = metricsFor(e.matchDiagnostics); return { id: e.model.id, values: { scoreLogLoss: metrics.scoreLogLoss, oneXtwoRPS: metrics.oneXtwoRPS, meanGoalMAE: metrics.meanGoalMAE, topCoverage: -(metrics.top3Coverage + metrics.top5Coverage) / 2, calibrationECE: mean([e.oneXtwo.calibration.home.ece, e.oneXtwo.calibration.draw.ece, e.oneXtwo.calibration.away.ece, e.btts.ece, e.overUnder[2.5].ece]) }, rankScore: 0, ranks: {} }; });
  for (const [key, weight] of Object.entries(config.leader.priorities)) {
    const sorted = [...candidates].sort((a, b) => a.values[key] - b.values[key]);
    for (const candidate of candidates) { const ties = sorted.map((entry, index) => entry.values[key] === candidate.values[key] ? index + 1 : null).filter(Number.isFinite), rank = mean(ties); candidate.ranks[key] = rank; candidate.rankScore += rank * weight; }
  }
  candidates.sort((a, b) => a.rankScore - b.rankScore || a.values.scoreLogLoss - b.values.scoreLogLoss || a.id.localeCompare(b.id));
  return { id: candidates[0].id, qualifier: config.leader.qualifier, rule: config.leader.rule, priorities: config.leader.priorities, rankings: candidates, statisticalWinner: null, exactHitUsed: false };
}

function enrichBaselineEvaluation(evaluation, predictionsByModel, rows, models, config, xgAudit) {
  const commonEvaluations = evaluation.retrospective.models;
  const byId = new Map(rows.map(row => [row.matchId, row]));
  const availableEvaluations = models.filter(model => predictionsByModel[model.id]).map(model => evaluateModel(predictionsByModel[model.id], rows, model));
  const names = { "league-poisson-r0": "M0", "goals-poisson-r0": "M1", "xg-poisson-r0": "M2" };
  for (const e of [...commonEvaluations, ...availableEvaluations]) {
    e.actualScoreRank.median = median(e.matchDiagnostics.map(d => d.actualScoreRank).filter(Number.isFinite));
    e.actualScoreProbability = { mean: mean(e.matchDiagnostics.map(d => d.actualScoreProbability).filter(Number.isFinite)), median: median(e.matchDiagnostics.map(d => d.actualScoreProbability).filter(Number.isFinite)) };
    e.primaryMetrics = metricsFor(e.matchDiagnostics);
  }
  evaluation.commonSample = { ...evaluation.sameSample, label: "COMMON SAMPLE", throughMatchday: Math.max(...rows.map(row => row.targetMatchday)) };
  evaluation.modelAvailableSample = Object.fromEntries(availableEvaluations.map(e => [names[e.model.id], e]));
  for (const e of commonEvaluations) evaluation[names[e.model.id]] = e;
  evaluation.deltas = {}; evaluation.bootstrap = {};
  for (const [oldId, newId] of [["M0", "M1"], ["M0", "M2"], ["M1", "M2"]]) {
    if (!evaluation[oldId] || !evaluation[newId]) continue;
    const result = compare(evaluation[oldId], evaluation[newId], config);
    evaluation.deltas[`${newId}_minus_${oldId}`] = { ...result, bootstrap: undefined };
    evaluation.bootstrap[`${newId}_minus_${oldId}`] = result.bootstrap;
  }
  evaluation.xgCoverage = xgAudit;
  evaluation.researchConfig = config;
  evaluation.calibration = {}; evaluation.lowScore = {}; evaluation.lambdaDistribution = {}; evaluation.extremeLambda = {}; evaluation.teamDiagnostics = {}; evaluation.matchdayDiagnostics = {}; evaluation.maturityDiagnostics = {}; evaluation.biasDiagnostics = {}; evaluation.scorelineFrequency = {};
  const scoreCounts = new Map();
  for (const d of commonEvaluations[0]?.matchDiagnostics || []) scoreCounts.set(d.actualScore, (scoreCounts.get(d.actualScore) || 0) + 1);
  for (const e of commonEvaluations) {
    const id = names[e.model.id], diagnostics = e.matchDiagnostics;
    evaluation.calibration[id] = exploratoryCalibration(e, config.diagnostics.calibrationMinimumBinCount);
    evaluation.lowScore[id] = Object.fromEntries(["0-0", "1-0", "0-1", "1-1"].map(score => [score, binarySummary(diagnostics, d => d.lowScoreProbabilities[score], d => Number(d.actualScore === score))]));
    evaluation.lambdaDistribution[id] = { home: lambdaSummary(diagnostics.map(d => d.lambdaHome)), away: lambdaSummary(diagnostics.map(d => d.lambdaAway)) };
    evaluation.extremeLambda[id] = { thresholds: { low: config.diagnostics.extremeLambdaLow, high: config.diagnostics.extremeLambdaHigh }, diagnosticOnly: true, clampingApplied: false, matches: diagnostics.filter(d => [d.lambdaHome, d.lambdaAway].some(lambda => lambda < config.diagnostics.extremeLambdaLow || lambda > config.diagnostics.extremeLambdaHigh)).map(d => ({ matchId: d.matchId, lambdaHome: d.lambdaHome, lambdaAway: d.lambdaAway })) };
    evaluation.biasDiagnostics[id] = { homeGoalsActualMinusLambda: mean(diagnostics.map(d => d.actualHomeGoals - d.lambdaHome)), awayGoalsActualMinusLambda: mean(diagnostics.map(d => d.actualAwayGoals - d.lambdaAway)), totalGoalsActualMinusLambda: mean(diagnostics.map(d => d.actualHomeGoals + d.actualAwayGoals - d.lambdaHome - d.lambdaAway)),
      draw: binarySummary(diagnostics, d => d.outcomeProbabilities.draw, d => Number(d.actualOutcomeIndex === 1)), btts: binarySummary(diagnostics, d => d.btts.yes, d => d.actualBTTS), over25: binarySummary(diagnostics, d => d.overUnder[2.5].over, d => Number(d.actualHomeGoals + d.actualAwayGoals > 2.5)), signConvention: "ACTUAL_MINUS_PREDICTED" };
    evaluation.scorelineFrequency[id] = [...scoreCounts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([score, count]) => { const [h, a] = score.split("-").map(Number); const matrices = predictionsByModel[e.model.id].filter(p => e.matchIds.includes(p.matchId)); return { score, actualCount: count, actualFrequency: count / e.sample, predictedMeanProbability: mean(matrices.map(p => scoreProbability(p.scoreMatrix, h, a))), status: "EXPLORATORY" }; });
    const teamRows = new Map();
    for (const d of diagnostics) for (const side of ["home", "away"]) {
      const teamId = byId.get(d.matchId).vector[`${side}Team`], home = side === "home";
      if (!teamRows.has(teamId)) teamRows.set(teamId, []);
      teamRows.get(teamId).push({ predictedGF: home ? d.lambdaHome : d.lambdaAway, actualGF: home ? d.actualHomeGoals : d.actualAwayGoals, predictedGA: home ? d.lambdaAway : d.lambdaHome, actualGA: home ? d.actualAwayGoals : d.actualHomeGoals });
    }
    evaluation.teamDiagnostics[id] = [...teamRows].sort((a, b) => a[0].localeCompare(b[0])).map(([team, observations]) => ({ team, n: observations.length, status: observations.length >= config.diagnostics.minimumTeamMatches ? "DESCRIPTIVE" : "EXPLORATORY_INSUFFICIENT_TEAM_SAMPLE", predictedGF: observations.reduce((n, r) => n + r.predictedGF, 0), actualGF: observations.reduce((n, r) => n + r.actualGF, 0), predictedGA: observations.reduce((n, r) => n + r.predictedGA, 0), actualGA: observations.reduce((n, r) => n + r.actualGA, 0), goalMAE: mean(observations.map(r => Math.abs(r.predictedGF - r.actualGF))), concededMAE: mean(observations.map(r => Math.abs(r.predictedGA - r.actualGA))), inference: null }));
    evaluation.matchdayDiagnostics[id] = Object.fromEntries(e.temporalCoverage.map(md => [md, { n: diagnostics.filter(d => d.matchday === md).length, metrics: metricsFor(diagnostics.filter(d => d.matchday === md)), label: md === 1 ? "PRIOR_ONLY" : "AS_OF_CURRENT_AND_PRIOR", status: "EXPLORATORY" }]));
    const maturityLabel = d => { const components = Object.values(d.modelDiagnostics.components || {}); const labels = [...new Set(components.map(c => c.maturity.label))]; return labels.length === 1 ? labels[0] : labels.length ? "MIXED_OBSERVED_MATURITY" : d.modelDiagnostics.leagueFallbackUsed ? "PRIOR_ONLY" : "LEAGUE_CURRENT"; };
    evaluation.maturityDiagnostics[id] = Object.fromEntries([...new Set(diagnostics.map(maturityLabel))].map(label => [label, { n: diagnostics.filter(d => maturityLabel(d) === label).length, metrics: metricsFor(diagnostics.filter(d => maturityLabel(d) === label)), status: "EXPLORATORY" }]));
  }
  const modelDiagnostics = Object.fromEntries(commonEvaluations.map(e => [names[e.model.id], new Map(e.matchDiagnostics.map(d => [d.matchId, d]))]));
  evaluation.matchLevelDeltas = evaluation.commonSample.matchIds.map(matchId => {
    const d = Object.fromEntries(Object.entries(modelDiagnostics).map(([name, map]) => [name, map.get(matchId)]));
    return { matchId, matchday: d.M0?.matchday ?? Object.values(d)[0].matchday, actualScore: d.M0?.actualScore ?? Object.values(d)[0].actualScore, actualScoreProbability: Object.fromEntries(Object.entries(d).map(([name, value]) => [name, value.actualScoreProbability])), scoreLogLoss: Object.fromEntries(Object.entries(d).map(([name, value]) => [name, value.scoreLogLoss])), deltasVsM0: Object.fromEntries(Object.entries(d).filter(([name]) => name !== "M0").map(([name, value]) => [name, d.M0 ? value.scoreLogLoss - d.M0.scoreLogLoss : null])) };
  });
  evaluation.winLossMatches = Object.fromEntries(["M1", "M2"].filter(name => modelDiagnostics[name] && modelDiagnostics.M0).map(name => { const sorted = [...evaluation.matchLevelDeltas].sort((a, b) => a.deltasVsM0[name] - b.deltasVsM0[name]); return [name, { largestImprovement: sorted.find(r => r.deltasVsM0[name] < 0) || null, largestDeterioration: [...sorted].reverse().find(r => r.deltasVsM0[name] > 0) || null }]; }));
  evaluation.disagreement = modelDiagnostics.M1 && modelDiagnostics.M2 ? evaluation.commonSample.matchIds.map(matchId => { const m1 = modelDiagnostics.M1.get(matchId), m2 = modelDiagnostics.M2.get(matchId), home = m2.lambdaHome - m1.lambdaHome, away = m2.lambdaAway - m1.lambdaAway, outcomes = Object.fromEntries(["home", "draw", "away"].map(key => [key, m2.outcomeProbabilities[key] - m1.outcomeProbabilities[key]]));
    return { matchId, matchday: m1.matchday, lambdaHomeM1: m1.lambdaHome, lambdaHomeM2: m2.lambdaHome, lambdaAwayM1: m1.lambdaAway, lambdaAwayM2: m2.lambdaAway, deltaLambdaHome: home, deltaLambdaAway: away, modalM1: m1.modalScore, modalM2: m2.modalScore, modalChanged: m1.modalScore !== m2.modalScore, oneXtwoM1: m1.outcomeProbabilities, oneXtwoM2: m2.outcomeProbabilities, deltaOneXtwo: outcomes, largeDifference: Math.max(Math.abs(home), Math.abs(away)) >= config.diagnostics.largeDisagreementLambda || Math.max(...Object.values(outcomes).map(Math.abs)) >= config.diagnostics.largeDisagreementOutcome, diagnosticOnly: true }; }).sort((a, b) => Math.max(Math.abs(b.deltaLambdaHome), Math.abs(b.deltaLambdaAway)) - Math.max(Math.abs(a.deltaLambdaHome), Math.abs(a.deltaLambdaAway))) : [];
  const latest = Math.max(...rows.map(row => row.targetMatchday));
  evaluation.regressionDiagnostics = rows.filter(row => row.targetMatchday === latest).flatMap(row => ["home", "away"].map(side => { const f = key => row.vector.features[`${side}.${key}`].value; const finishing = f("finishingResidual"), prevention = f("goalkeepingResidual"); return { team: row.vector[`${side}Team`], targetMatchday: latest, cutoff: row.dataCutoff, n: f("currentMatches"), GFPerMatch: f("goalsFor"), xGFPerMatch: f("currentXGF"), GAPerMatch: f("goalsAgainst"), xGAPerMatch: f("currentXGA"), GFMinusXGF: finishing, GAMinusXGA: prevention, largeResidual: (finishing != null && Math.abs(finishing) >= config.diagnostics.largeResidualGoalsPerMatch) || (prevention != null && Math.abs(prevention) >= config.diagnostics.largeResidualGoalsPerMatch), label: "REGRESSION_DIAGNOSTIC_ONLY", lambdaAdjustment: false, matchesUsed: row.vector.features[`${side}.finishingResidual`].provenance.matchesUsed }; })).sort((a, b) => a.team.localeCompare(b.team));
  evaluation.M3Feasibility = { status: "REQUIRES_PROSPECTIVE_PROCESS_DATA", reconstructible: ["observed previous-match shots/SOT", "previous-match xGF/xGA", "paired historical xG per shot", "goal/xG/shots/SOT season-to-date aggregates"], reconstructionLabel: "RETROSPECTIVE_RECONSTRUCTION",
    notReconstructibleFromFrozenHistoricalInputs: ["pre-match V2 predicted team shots/SOT MD1–MD5", "original pre-match lineups/player allocation", "original V2 opponent suppression/matchup states"], prospectiveMD6PlusNeeded: ["immutable pre-kickoff team predictions and complete feature vectors", "actual team process only after completion and only for later authorized evaluation", "new process coefficients and temporal ablation in a separate prompt"], fakeV2SnapshotsCreated: 0,
    errorDecomposition: "M2 vs future M3 predicted process vs offline oracle can compare layers on a common frozen sample; oracle never enters real predictions", M3Implemented: false };
  evaluation.leaderSelection = selectLeader(commonEvaluations, config);
  evaluation.currentRetrospectiveLeader = evaluation.leaderSelection.id;
  evaluation.leaderCaution = config.leader.qualifier;
  const clearImprovement = ["M1_minus_M0", "M2_minus_M0"].some(key => evaluation.deltas[key]?.status === "BETTER");
  evaluation.nextAction = clearImprovement ? "CONTINUE RESEARCH + PROSPECTIVE COLLECTION" : "REVIEW GOAL-STRENGTH BASELINES";
  evaluation.processNextAction = "WAIT FOR PROSPECTIVE PROCESS DATA";
  evaluation.uncertainty = { status: "EXPLORATORY_RETROSPECTIVE_BOOTSTRAP", prospectiveValidation: false, outcomesIndependent: false, warning: "N<=50 and <=5 matchdays; source revisions and cross-provider xG comparability unresolved" };
  evaluation.limits = evaluation.limits.filter(limit => !limit.startsWith("Goals/xG require") && !limit.startsWith("Historical xG,"));
  evaluation.limits.push("Historical Understat xG prior available; current/historical provider scale comparability unverified", "Model configuration prespecified; no search, fitting, or prospective model validation", "Paired match bootstrap exploratory; <=5 matchday clusters cannot establish temporal robustness");
  return evaluation;
}
module.exports = { METRICS, PRIMARY, mean, median, metricsFor, pairedBootstrap, compare, lambdaSummary, selectLeader, enrichBaselineEvaluation };
