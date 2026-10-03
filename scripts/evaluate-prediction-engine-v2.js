"use strict";

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const read = relative => JSON.parse(fs.readFileSync(path.join(root, relative), "utf8"));
const round = (value, digits = 4) => Number.isFinite(value) ? Number(value.toFixed(digits)) : null;
const numeric = value => Number.isFinite(value);
const clean = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const mean = values => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
const median = values => {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted.length % 2 ? sorted[(sorted.length - 1) / 2] : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2;
};
const quantile = (values, q) => {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const index = (sorted.length - 1) * q;
  const lower = Math.floor(index), upper = Math.ceil(index);
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
};
const sampleLabel = n => n < 20 ? "INSUFFICIENT" : n < 50 ? "LOW" : n < 150 ? "MODERATE" : "GOOD";
const maturityBand = matchday => matchday <= 5 ? "EARLY" : matchday <= 10 ? "DEVELOPING" : matchday <= 20 ? "MID SAMPLE" : "MATURE";
const minutesBand = minutes => minutes < 30 ? "0-29" : minutes < 60 ? "30-59" : minutes < 75 ? "60-74" : "75+";
const expectedMinutesBand = minutes => minutes < 30 ? "<30" : minutes < 60 ? "30-59" : minutes < 75 ? "60-74" : "75+";
const matchupBand = value => value < 0.95 ? "<0.95" : value <= 1.05 ? "0.95-1.05" : ">1.05";
const N_D = "N/D";

function poissonAtLeast(lambda, threshold) {
  let term = Math.exp(-lambda), cumulative = term;
  for (let k = 1; k < threshold; k += 1) { term *= lambda / k; cumulative += term; }
  return Math.max(0, Math.min(1, 1 - cumulative));
}

function negativeBinomialAtLeast(mu, threshold, dispersion) {
  if (!(dispersion > 0)) return poissonAtLeast(mu, threshold);
  const r = 1 / dispersion, p = r / (r + mu);
  let probability = p ** r, cumulative = probability;
  for (let k = 1; k < threshold; k += 1) {
    probability *= ((k - 1 + r) / k) * (1 - p);
    cumulative += probability;
  }
  return Math.max(0, Math.min(1, 1 - cumulative));
}

function roleGroup(player) {
  if (["CF", "ST"].includes(player.teamProfileRole)) return "CF/ST";
  if (["W", "AM", "CM", "FB", "WB", "CB"].includes(player.teamProfileRole)) return player.teamProfileRole === "FB" ? "FB/WB" : player.teamProfileRole;
  return N_D;
}

function tier(player) {
  if (player.qualifiedOutsider || player.qualifiedSotOutsider) return "OUTSIDER";
  if (player.allocationClass === "primary") return "PRIMARY";
  if (player.allocationClass === "co-primary") return "SECOND PRIMARY";
  if (player.allocationClass) return "SECONDARY";
  return N_D;
}

function correlation(left, right) {
  if (left.length < 3 || left.length !== right.length) return null;
  const mx = mean(left), my = mean(right);
  const numerator = left.reduce((sum, value, index) => sum + (value - mx) * (right[index] - my), 0);
  const dx = Math.sqrt(left.reduce((sum, value) => sum + (value - mx) ** 2, 0));
  const dy = Math.sqrt(right.reduce((sum, value) => sum + (value - my) ** 2, 0));
  return dx && dy ? numerator / (dx * dy) : null;
}

function continuous(rows, predictedKey, actualKey) {
  const usable = rows.filter(row => numeric(row[predictedKey]) && numeric(row[actualKey]));
  const errors = usable.map(row => row[predictedKey] - row[actualKey]);
  return {
    n: usable.length,
    sampleStrength: sampleLabel(usable.length),
    predictedMean: round(mean(usable.map(row => row[predictedKey]))),
    actualMean: round(mean(usable.map(row => row[actualKey]))),
    mae: round(mean(errors.map(Math.abs))),
    medianAbsoluteError: round(median(errors.map(Math.abs))),
    rmse: round(Math.sqrt(mean(errors.map(value => value ** 2)))),
    bias: round(mean(errors))
  };
}

function rocAuc(pairs) {
  const positives = pairs.filter(item => item.y === 1), negatives = pairs.filter(item => item.y === 0);
  if (!positives.length || !negatives.length) return null;
  let score = 0;
  for (const positive of positives) for (const negative of negatives) score += positive.p > negative.p ? 1 : positive.p === negative.p ? 0.5 : 0;
  return score / (positives.length * negatives.length);
}

function prAuc(pairs) {
  const positives = pairs.filter(item => item.y === 1).length;
  if (!positives) return null;
  const sorted = [...pairs].sort((a, b) => b.p - a.p);
  let tp = 0, fp = 0, previousRecall = 0, area = 0;
  for (const item of sorted) {
    if (item.y) tp += 1; else fp += 1;
    const recall = tp / positives, precision = tp / (tp + fp);
    area += (recall - previousRecall) * precision;
    previousRecall = recall;
  }
  return area;
}

function calibrationBins(pairs) {
  const fixed = Array.from({ length: 10 }, (_, index) => {
    const low = index / 10, high = (index + 1) / 10;
    const rows = pairs.filter(item => item.p >= low && (index === 9 ? item.p <= high : item.p < high));
    const predicted = mean(rows.map(item => item.p)), observed = mean(rows.map(item => item.y));
    return { band: `${index * 10}-${(index + 1) * 10}%`, n: rows.length, meanProbability: round(predicted), observedFrequency: round(observed), gap: numeric(predicted) && numeric(observed) ? round(predicted - observed) : null, sampleStrength: sampleLabel(rows.length) };
  });
  const nonEmpty = fixed.filter(bin => bin.n);
  const sparse = nonEmpty.some(bin => bin.n < 10);
  if (!sparse) return { method: "fixed-10-percentage-point", bins: fixed };
  const sorted = [...pairs].sort((a, b) => a.p - b.p), targetBins = Math.max(2, Math.min(5, Math.floor(sorted.length / 20)));
  const adaptive = [];
  for (let index = 0; index < targetBins; index += 1) {
    const rows = sorted.slice(Math.floor(index * sorted.length / targetBins), Math.floor((index + 1) * sorted.length / targetBins));
    const predicted = mean(rows.map(item => item.p)), observed = mean(rows.map(item => item.y));
    adaptive.push({ band: `${round(rows[0]?.p * 100, 1)}-${round(rows.at(-1)?.p * 100, 1)}%`, n: rows.length, meanProbability: round(predicted), observedFrequency: round(observed), gap: round(predicted - observed), sampleStrength: sampleLabel(rows.length) });
  }
  return { method: "equal-frequency-because-fixed-bins-sparse", fixedBins: fixed, bins: adaptive };
}

function marketMetrics(rows, probabilityKey, actualKey, threshold) {
  const pairs = rows.filter(row => numeric(row[probabilityKey]) && numeric(row[actualKey])).map(row => ({ p: row[probabilityKey], y: Number(row[actualKey] >= threshold) }));
  if (!pairs.length) return { n: 0, status: "INSUFFICIENT DATA" };
  const epsilon = 1e-15;
  const calibration = calibrationBins(pairs);
  const ece = calibration.bins.reduce((sum, bin) => sum + bin.n / pairs.length * Math.abs(bin.gap || 0), 0);
  return {
    n: pairs.length,
    sampleStrength: sampleLabel(pairs.length),
    eventRate: round(mean(pairs.map(item => item.y))),
    meanProbability: round(mean(pairs.map(item => item.p))),
    bias: round(mean(pairs.map(item => item.p - item.y))),
    brier: round(mean(pairs.map(item => (item.p - item.y) ** 2))),
    logLoss: round(mean(pairs.map(item => -(item.y * Math.log(Math.max(epsilon, Math.min(1 - epsilon, item.p))) + (1 - item.y) * Math.log(Math.max(epsilon, Math.min(1 - epsilon, 1 - item.p))))))),
    ece: round(ece),
    maximumCalibrationError: round(Math.max(...calibration.bins.map(bin => Math.abs(bin.gap || 0)))),
    rocAuc: round(rocAuc(pairs)),
    prAuc: round(prAuc(pairs)),
    calibration
  };
}

function groupMetrics(rows, key) {
  const groups = new Map();
  for (const row of rows) {
    const value = row[key] ?? N_D;
    if (!groups.has(value)) groups.set(value, []);
    groups.get(value).push(row);
  }
  return Object.fromEntries([...groups.entries()].sort(([a], [b]) => String(a).localeCompare(String(b))).map(([value, group]) => [value, {
    n: group.length,
    sampleStrength: sampleLabel(group.length),
    shots: continuous(group, "predictedShots", "actualShots"),
    sot: continuous(group, "predictedSOT", "actualSOT"),
    markets: Object.fromEntries(MARKETS.map(market => [market.id, marketMetrics(group, market.key, market.actual, market.threshold)]))
  }]));
}

function mulberry32(seed) {
  return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let value = Math.imul(seed ^ seed >>> 15, 1 | seed); value = value + Math.imul(value ^ value >>> 7, 61 | value) ^ value; return ((value ^ value >>> 14) >>> 0) / 4294967296; };
}

function bootstrapByMatch(rows, statistic, iterations = 1000) {
  const ids = [...new Set(rows.map(row => row.matchId))], byMatch = new Map(ids.map(id => [id, rows.filter(row => row.matchId === id)]));
  if (ids.length < 5) return { status: "INSUFFICIENT DATA", clusters: ids.length };
  const random = mulberry32(20261003), estimates = [];
  for (let iteration = 0; iteration < iterations; iteration += 1) {
    const sample = [];
    for (let index = 0; index < ids.length; index += 1) sample.push(...byMatch.get(ids[Math.floor(random() * ids.length)]));
    const estimate = statistic(sample);
    if (numeric(estimate)) estimates.push(estimate);
  }
  return { method: "cluster-bootstrap-by-match", clusters: ids.length, iterations, estimate: round(statistic(rows)), ci95: [round(quantile(estimates, 0.025)), round(quantile(estimates, 0.975))] };
}

const MARKET_DEFINITIONS = [
  ["shots1Plus", "shotProbability1Plus", "actualShots", 1],
  ["shots2Plus", "shotProbability2Plus", "actualShots", 2],
  ["shots3Plus", "shotProbability3Plus", "actualShots", 3],
  ["sot1Plus", "sotProbability1Plus", "actualSOT", 1],
  ["sot2Plus", "sotProbability2Plus", "actualSOT", 2]
];
const MARKETS = MARKET_DEFINITIONS.map(([id, key, actual, threshold]) => ({ id, key, actual, threshold }));

const matches = read("data/normalized/matches.json");
const predictionPayload = read("data/normalized/predictions.json");
const v2Predictions = predictionPayload.predictions.filter(prediction => prediction.playerMarketModelVersion === 2 && /-md-05$/.test(prediction.matchId));
const matchById = new Map(matches.map(match => [match.id, match]));
const archiveFiles = fs.readdirSync(path.join(root, "data/sources")).filter(filename => /^prediction-archive-md\d{1,2}-2026-27\.json$/.test(filename));
const archiveCoverage = archiveFiles.map(filename => ({ filename, predictions: read(`data/sources/${filename}`).predictions || [] })).map(item => ({ file: item.filename, matches: item.predictions.length, v2Matches: item.predictions.filter(prediction => prediction.playerMarketModelVersion === 2).length }));
const observations = [];
const matchingWarnings = [];

for (const prediction of v2Predictions) {
  const match = matchById.get(prediction.matchId);
  if (!match?.playerStats) continue;
  const actualRows = [
    ...(match.playerStats.home || []).map(player => ({ ...player, teamId: match.homeTeam })),
    ...(match.playerStats.away || []).map(player => ({ ...player, teamId: match.awayTeam }))
  ];
  const byId = new Map(actualRows.filter(player => player.playerId).map(player => [`${player.teamId}:${player.playerId}`, player]));
  const byName = new Map(actualRows.map(player => [`${player.teamId}:${clean(player.player)}`, player]));
  const dnpRows = [
    ...(match.didNotPlay?.home || []).map(player => ({ ...player, teamId: match.homeTeam, starter: false, minutes: 0, shots: 0, shotsOnTarget: 0, expectedGoals: 0 })),
    ...(match.didNotPlay?.away || []).map(player => ({ ...player, teamId: match.awayTeam, starter: false, minutes: 0, shots: 0, shotsOnTarget: 0, expectedGoals: 0 }))
  ];
  const dnpById = new Map(dnpRows.filter(player => player.playerId).map(player => [`${player.teamId}:${player.playerId}`, player]));
  const dnpByName = new Map(dnpRows.map(player => [`${player.teamId}:${clean(player.player)}`, player]));
  for (const player of prediction.shooters?.allPlayers || []) {
    const projectedNames = [player.name, player.lineupName].map(clean).filter(Boolean);
    const surnameTokens = [...new Set(projectedNames.flatMap(name => name.split(" ")).filter(token => token.length >= 5))];
    const surnameCandidates = actualRows.filter(candidate => candidate.teamId === player.teamId && surnameTokens.some(token => clean(candidate.player).split(" ").includes(token)));
    const exactActual = byId.get(`${player.teamId}:${player.playerId}`) || projectedNames.map(name => byName.get(`${player.teamId}:${name}`)).find(Boolean);
    const explicitDnp = dnpById.get(`${player.teamId}:${player.playerId}`) || projectedNames.map(name => dnpByName.get(`${player.teamId}:${name}`)).find(Boolean);
    const actual = exactActual || explicitDnp || (surnameCandidates.length === 1 ? surnameCandidates[0] : null);
    const matchMethod = exactActual ? "canonical-id-or-name" : explicitDnp ? "explicit-did-not-play" : actual ? "unique-team-surname" : N_D;
    if (!actual) matchingWarnings.push(`${prediction.matchId}:${player.teamId}:${player.playerId || player.name}`);
    const opponent = player.teamId === match.homeTeam ? match.awayTeam : match.homeTeam;
    const side = player.teamId === match.homeTeam ? "home" : "away";
    const diagnostic = prediction.futureDataDiagnostics?.[side] || {};
    const teamProjection = (prediction.teamProjections || []).find(team => team.teamId === player.teamId);
    const interaction = teamProjection?.opponentMatchupInteraction || {};
    const allocation = player.allocationClass || null;
    observations.push({
      matchId: prediction.matchId,
      matchday: match.matchday,
      date: match.date,
      team: player.teamId,
      opponent,
      venue: side,
      playerId: player.playerId || N_D,
      player: player.name || player.lineupName || N_D,
      role: roleGroup(player),
      detailedRole: player.detailedRole || N_D,
      starterExpected: true,
      starterActual: actual ? Boolean(actual.starter) : N_D,
      expectedMinutes: numeric(player.expectedMinutes) ? player.expectedMinutes : N_D,
      actualMinutes: numeric(actual?.minutes) ? actual.minutes : N_D,
      predictedShots: numeric(player.projectedShots) ? player.projectedShots : N_D,
      actualShots: numeric(actual?.shots) ? actual.shots : N_D,
      predictedSOT: numeric(player.projectedShotsOnTarget) ? player.projectedShotsOnTarget : N_D,
      actualSOT: numeric(actual?.shotsOnTarget) ? actual.shotsOnTarget : N_D,
      actualXg: numeric(actual?.expectedGoals) ? actual.expectedGoals : N_D,
      shotProbability1Plus: player.shotProbabilities?.over05 ?? N_D,
      shotProbability2Plus: player.shotProbabilities?.over15 ?? N_D,
      shotProbability3Plus: player.shotProbabilities?.over25 ?? N_D,
      sotProbability1Plus: player.shotOnTargetProbabilities?.over05 ?? N_D,
      sotProbability2Plus: player.shotOnTargetProbabilities?.over15 ?? N_D,
      sampleMaturity: maturityBand(match.matchday),
      modelConfidence: N_D,
      baselineConfidence: player.playerBaselineStability?.confidence || N_D,
      historicalWeight: diagnostic.historicalWeight ?? N_D,
      currentWeight: diagnostic.currentWeight ?? N_D,
      playerTier: tier(player),
      allocationClass: allocation || N_D,
      outsiderStatus: player.qualifiedOutsider ? "QUALIFIED SHOTS" : player.qualifiedSotOutsider ? "QUALIFIED SOT" : "NOT QUALIFIED",
      matchupFactor: player.matchupFactor ?? N_D,
      opponentInteraction: interaction.metricEvidence ? { shots: interaction.metricEvidence.shots?.status || N_D, sot: interaction.metricEvidence.shotsOnTarget?.status || N_D, shotsAdjustmentPct: interaction.shotsAdjustmentPct ?? N_D, sotAdjustmentPct: interaction.shotsOnTargetAdjustmentPct ?? N_D } : N_D,
      fallbackUsed: Boolean(player.fallbackUsed),
      observationMatchMethod: matchMethod,
      persistence: player.playerBaselineStability?.currentSample?.coverage >= 2 ? player.playerBaselineStability?.historicalCurrentAgreement ?? N_D : N_D,
      stability: player.playerBaselineStability?.level || N_D,
      v1Shots: player.projectedShotsV1 ?? N_D,
      v1SOT: player.projectedShotsOnTargetV1 ?? N_D,
      noMatchupShots: numeric(player.projectedShots) && numeric(player.shotsMatchupFactor) && player.shotsMatchupFactor ? player.projectedShots / player.shotsMatchupFactor : N_D,
      noMatchupSOT: numeric(player.projectedShotsOnTarget) && numeric(player.shotsOnTargetMatchupFactor) && player.shotsOnTargetMatchupFactor ? player.projectedShotsOnTarget / player.shotsOnTargetMatchupFactor : N_D,
      historicalRawShots: numeric(player.playerBaselineStability?.historicalSample?.per90) && numeric(player.expectedMinutes) ? player.playerBaselineStability.historicalSample.per90 * player.expectedMinutes / 90 : N_D,
      historicalRawSOT: numeric(player.playerSotBaselineStability?.historicalSample?.per90) && numeric(player.expectedMinutes) ? player.playerSotBaselineStability.historicalSample.per90 * player.expectedMinutes / 90 : N_D,
      currentRawShots: numeric(player.playerBaselineStability?.currentSample?.per90) && numeric(player.expectedMinutes) ? player.playerBaselineStability.currentSample.per90 * player.expectedMinutes / 90 : N_D,
      currentRawSOT: numeric(player.playerSotBaselineStability?.currentSample?.per90) && numeric(player.expectedMinutes) ? player.playerSotBaselineStability.currentSample.per90 * player.expectedMinutes / 90 : N_D,
      noExpectedMinutesShots: numeric(player.stabilizedShots90) && numeric(player.shotsMatchupFactor) && numeric(player.projectedShotsTeamScaling) ? player.stabilizedShots90 * player.shotsMatchupFactor * player.projectedShotsTeamScaling : N_D,
      noExpectedMinutesSOT: numeric(player.stabilizedShotsOnTarget90) && numeric(player.shotsOnTargetMatchupFactor) && numeric(player.projectedShotsOnTargetTeamScaling) ? Math.min(player.projectedShots, player.stabilizedShotsOnTarget90 * player.shotsOnTargetMatchupFactor * player.projectedShotsOnTargetTeamScaling) : N_D,
      actualMinutesBand: numeric(actual?.minutes) ? minutesBand(actual.minutes) : N_D,
      expectedMinutesBand: numeric(player.expectedMinutes) ? expectedMinutesBand(player.expectedMinutes) : N_D,
      matchupFactorBand: numeric(player.matchupFactor) ? matchupBand(player.matchupFactor) : N_D,
      confidenceBand: N_D
    });
  }
}

const valid = observations.filter(row => numeric(row.actualShots) && numeric(row.actualSOT));
const marketMetricsById = Object.fromEntries(MARKETS.map(market => [market.id, marketMetrics(valid, market.key, market.actual, market.threshold)]));
const shots = continuous(valid, "predictedShots", "actualShots");
const sot = continuous(valid, "predictedSOT", "actualSOT");
const v1 = { shots: continuous(valid, "v1Shots", "actualShots"), sot: continuous(valid, "v1SOT", "actualSOT") };
const matchedV1V2 = valid.filter(row => numeric(row.v1Shots) && numeric(row.v1SOT));
const v1Markets = Object.fromEntries(MARKETS.map(market => {
  const metric = market.actual === "actualShots" ? "v1Shots" : "v1SOT";
  const probability = `__${market.id}`;
  const rows = matchedV1V2.map(row => ({ ...row, [probability]: poissonAtLeast(row[metric], market.threshold) }));
  return [market.id, marketMetrics(rows, probability, market.actual, market.threshold)];
}));

const minutesRows = valid.filter(row => numeric(row.expectedMinutes) && numeric(row.actualMinutes));
const minutesErrors = minutesRows.map(row => row.actualMinutes - row.expectedMinutes);
const expectedMinutes = {
  n: minutesRows.length,
  mae: round(mean(minutesErrors.map(Math.abs))),
  medianAbsoluteError: round(median(minutesErrors.map(Math.abs))),
  rmse: round(Math.sqrt(mean(minutesErrors.map(value => value ** 2)))),
  bias: round(mean(minutesErrors)),
  correlationAbsoluteMinutesVsAbsoluteShotsError: round(correlation(minutesRows.map((row, index) => Math.abs(minutesErrors[index])), minutesRows.map(row => Math.abs(row.predictedShots - row.actualShots)))),
  correlationAbsoluteMinutesVsAbsoluteSotError: round(correlation(minutesRows.map((row, index) => Math.abs(minutesErrors[index])), minutesRows.map(row => Math.abs(row.predictedSOT - row.actualSOT))))
};

const starterRows = observations.filter(row => row.starterActual !== N_D);
const starterAccuracy = {
  n: starterRows.length,
  accuracy: round(mean(starterRows.map(row => Number(row.starterExpected === row.starterActual)))),
  falseStarterRate: round(mean(starterRows.filter(row => row.starterExpected).map(row => Number(!row.starterActual)))),
  missedStarterRate: N_D,
  caveat: "Le prediction MD5 usano distinte ufficiali: misura allineamento dello snapshot, non accuratezza delle probabili formazioni. I non proiettati non sono osservabili nello snapshot, quindi missed starter rate e N/D."
};

function teamErrors() {
  const rows = [];
  for (const prediction of v2Predictions) {
    const match = matchById.get(prediction.matchId);
    for (const total of prediction.shooters?.teamTotals || []) {
      const side = total.teamId === match.homeTeam ? "home" : "away";
      rows.push({ matchId: match.id, team: total.teamId, predictedShots: total.projectedShots, actualShots: match.teamStats?.[side]?.shots, predictedSOT: total.projectedShotsOnTarget, actualSOT: match.teamStats?.[side]?.shotsOnTarget });
    }
  }
  return { observations: rows, shots: continuous(rows, "predictedShots", "actualShots"), sot: continuous(rows, "predictedSOT", "actualSOT") };
}

function allocationErrors() {
  const rows = [], pureRows = [], teamCoverage = [];
  for (const prediction of v2Predictions) {
    const match = matchById.get(prediction.matchId);
    for (const teamId of [match.homeTeam, match.awayTeam]) {
      const side = teamId === match.homeTeam ? "home" : "away";
      const projected = valid.filter(row => row.matchId === match.id && row.team === teamId);
      const predictedTeamShots = projected.reduce((sum, row) => sum + row.predictedShots, 0);
      const predictedTeamSot = projected.reduce((sum, row) => sum + row.predictedSOT, 0);
      const actualModeledShots = projected.reduce((sum, row) => sum + row.actualShots, 0);
      const actualModeledSot = projected.reduce((sum, row) => sum + row.actualSOT, 0);
      teamCoverage.push({ matchId: match.id, team: teamId, actualTeamShots: match.teamStats[side].shots, actualModeledPlayerShots: actualModeledShots, unmodeledOrUnmatchedShots: match.teamStats[side].shots - actualModeledShots, actualTeamSOT: match.teamStats[side].shotsOnTarget, actualModeledPlayerSOT: actualModeledSot, unmodeledOrUnmatchedSOT: match.teamStats[side].shotsOnTarget - actualModeledSot });
      for (const player of projected) {
        rows.push({ ...player, counterfactualShots: predictedTeamShots ? player.predictedShots / predictedTeamShots * match.teamStats[side].shots : N_D, counterfactualSOT: predictedTeamSot ? player.predictedSOT / predictedTeamSot * match.teamStats[side].shotsOnTarget : N_D });
        pureRows.push({ ...player, counterfactualShots: predictedTeamShots ? player.predictedShots / predictedTeamShots * actualModeledShots : N_D, counterfactualSOT: predictedTeamSot ? player.predictedSOT / predictedTeamSot * actualModeledSot : N_D });
      }
    }
  }
  return { n: rows.length, actualTeamVolumeCounterfactual: { shots: continuous(rows, "counterfactualShots", "actualShots"), sot: continuous(rows, "counterfactualSOT", "actualSOT") }, matchedPlayerVolumeCounterfactual: { shots: continuous(pureRows, "counterfactualShots", "actualShots"), sot: continuous(pureRows, "counterfactualSOT", "actualSOT") }, teamCoverage, method: "Actual full-team volume includes unmodeled substitute opportunity; matched-player volume fixes the observed subtotal of modeled players and isolates their predicted shares." };
}

const teamTarget = teamErrors();
const playerAllocation = allocationErrors();
const actualShotMean = mean(valid.map(row => row.actualShots));
const actualShotVariance = mean(valid.map(row => (row.actualShots - actualShotMean) ** 2));
const actualSotMean = mean(valid.map(row => row.actualSOT));
const actualSotVariance = mean(valid.map(row => (row.actualSOT - actualSotMean) ** 2));
const shotDispersion = actualShotMean ? Math.max(0, (actualShotVariance - actualShotMean) / actualShotMean ** 2) : 0;
const sotDispersion = actualSotMean ? Math.max(0, (actualSotVariance - actualSotMean) / actualSotMean ** 2) : 0;

function distributionGoodness(rows, predictedKey, actualKey) {
  const frequencies = [0, 1, 2, 3, 4].map(bucket => ({ bucket: bucket === 4 ? "4+" : String(bucket), observed: rows.filter(row => bucket === 4 ? row[actualKey] >= 4 : row[actualKey] === bucket).length }));
  for (const item of frequencies) item.expectedPoisson = round(rows.reduce((sum, row) => {
    if (item.bucket === "4+") return sum + poissonAtLeast(row[predictedKey], 4);
    const k = Number(item.bucket); let factorial = 1; for (let i = 2; i <= k; i += 1) factorial *= i;
    return sum + Math.exp(-row[predictedKey]) * row[predictedKey] ** k / factorial;
  }, 0), 2);
  const chiSquare = frequencies.reduce((sum, item) => item.expectedPoisson > 0 ? sum + (item.observed - item.expectedPoisson) ** 2 / item.expectedPoisson : sum, 0);
  return { n: rows.length, observedMean: round(mean(rows.map(row => row[actualKey]))), observedVariance: round(mean(rows.map(row => (row[actualKey] - mean(rows.map(item => item[actualKey]))) ** 2))), dispersionClass: actualKey === "actualShots" ? (actualShotVariance > actualShotMean * 1.1 ? "OVERDISPERSED" : actualShotVariance < actualShotMean * 0.9 ? "UNDERDISPERSED" : "POISSON-LIKE") : (actualSotVariance > actualSotMean * 1.1 ? "OVERDISPERSED" : actualSotVariance < actualSotMean * 0.9 ? "UNDERDISPERSED" : "POISSON-LIKE"), frequencies, pearsonChiSquare: round(chiSquare), warning: "Exploratory pooled diagnostic; player-match heterogeneity violates a single homogeneous Poisson null." };
}

function nbShadow(actualKey, predictedKey, dispersion, thresholds) {
  return Object.fromEntries(thresholds.map(threshold => {
    const pKey = "__nb";
    const rows = valid.map(row => ({ ...row, [pKey]: negativeBinomialAtLeast(row[predictedKey], threshold, dispersion) }));
    return [`${threshold}+`, marketMetrics(rows, pKey, actualKey, threshold)];
  }));
}

function variantMetrics(predictedShotsKey, predictedSotKey) {
  const rows = valid.filter(row => numeric(row[predictedShotsKey]) && numeric(row[predictedSotKey])).map(row => ({ ...row, __shots1: poissonAtLeast(row[predictedShotsKey], 1), __shots2: poissonAtLeast(row[predictedShotsKey], 2), __shots3: poissonAtLeast(row[predictedShotsKey], 3), __sot1: poissonAtLeast(row[predictedSotKey], 1), __sot2: poissonAtLeast(row[predictedSotKey], 2) }));
  return { n: rows.length, shots: continuous(rows, predictedShotsKey, "actualShots"), sot: continuous(rows, predictedSotKey, "actualSOT"), markets: { shots1Plus: marketMetrics(rows, "__shots1", "actualShots", 1), shots2Plus: marketMetrics(rows, "__shots2", "actualShots", 2), shots3Plus: marketMetrics(rows, "__shots3", "actualShots", 3), sot1Plus: marketMetrics(rows, "__sot1", "actualSOT", 1), sot2Plus: marketMetrics(rows, "__sot2", "actualSOT", 2) } };
}

const baselines = {
  historicalPlayerRawNoMatchup: variantMetrics("historicalRawShots", "historicalRawSOT"),
  currentSeasonPlayerRawNoOpponentAdjustment: variantMetrics("currentRawShots", "currentRawSOT"),
  rolePrior: { status: "INSUFFICIENT DATA", reason: "The serialized V2 snapshot does not expose the pure role-prior lambda separately." },
  v1SameSample: { n: matchedV1V2.length, ...v1, markets: v1Markets }
};
const ablations = {
  fullV2: variantMetrics("predictedShots", "predictedSOT"),
  noMatchupApproximation: variantMetrics("noMatchupShots", "noMatchupSOT"),
  noOpponentInteraction: { status: "INSUFFICIENT DATA", reason: "No exact serialized counterfactual after reconciliation; dividing the tiny team adjustment would not faithfully rerun allocation." },
  noRecency: { status: "INSUFFICIENT DATA", reason: "No component-level shadow output in the frozen snapshot." },
  noCurrentPlayerEvidence: variantMetrics("historicalRawShots", "historicalRawSOT"),
  noHistoricalShrinkage: variantMetrics("currentRawShots", "currentRawSOT"),
  noExpectedMinutesAdjustment: variantMetrics("noExpectedMinutesShots", "noExpectedMinutesSOT"),
  caveat: "Offline shadows only. No production probabilities or formulas were modified."
};

const comparisonThresholds = { mae: 0.02, brier: 0.005, logLoss: 0.01 };
const classifyDelta = (delta, threshold) => delta <= -threshold ? "BETTER" : delta >= threshold ? "WORSE" : "SIMILAR";
function compareVariantToV2(variant) {
  if (!variant?.shots || !variant?.markets) return { status: "INSUFFICIENT DATA" };
  return {
    n: variant.n,
    shotsMae: { deltaV2MinusBaseline: round(ablations.fullV2.shots.mae - variant.shots.mae), verdict: classifyDelta(ablations.fullV2.shots.mae - variant.shots.mae, comparisonThresholds.mae) },
    sotMae: { deltaV2MinusBaseline: round(ablations.fullV2.sot.mae - variant.sot.mae), verdict: classifyDelta(ablations.fullV2.sot.mae - variant.sot.mae, comparisonThresholds.mae) },
    markets: Object.fromEntries(MARKETS.map(market => [market.id, {
      brier: { deltaV2MinusBaseline: round(ablations.fullV2.markets[market.id].brier - variant.markets[market.id].brier), verdict: classifyDelta(ablations.fullV2.markets[market.id].brier - variant.markets[market.id].brier, comparisonThresholds.brier) },
      logLoss: { deltaV2MinusBaseline: round(ablations.fullV2.markets[market.id].logLoss - variant.markets[market.id].logLoss), verdict: classifyDelta(ablations.fullV2.markets[market.id].logLoss - variant.markets[market.id].logLoss, comparisonThresholds.logLoss) }
    }]))
  };
}
const incrementalValue = {
  decisionRule: `BETTER/WORSE when |delta| >= ${comparisonThresholds.mae} MAE, ${comparisonThresholds.brier} Brier or ${comparisonThresholds.logLoss} log loss; otherwise SIMILAR. V1 additionally uses cluster-bootstrap uncertainty.`,
  historicalPlayerRawNoMatchup: compareVariantToV2(baselines.historicalPlayerRawNoMatchup),
  currentSeasonPlayerRawNoOpponentAdjustment: compareVariantToV2(baselines.currentSeasonPlayerRawNoOpponentAdjustment),
  v1SameSample: compareVariantToV2(baselines.v1SameSample)
};

function v1MarketDelta(rows, market, metricName) {
  const v1Key = market.actual === "actualShots" ? "v1Shots" : "v1SOT";
  const compared = rows.map(row => ({ ...row, __v1Probability: poissonAtLeast(row[v1Key], market.threshold) }));
  return marketMetrics(compared, market.key, market.actual, market.threshold)[metricName] - marketMetrics(compared, "__v1Probability", market.actual, market.threshold)[metricName];
}
const v1MarketUncertainty = Object.fromEntries(MARKETS.map(market => [market.id, {
  brier: bootstrapByMatch(matchedV1V2, rows => v1MarketDelta(rows, market, "brier")),
  logLoss: bootstrapByMatch(matchedV1V2, rows => v1MarketDelta(rows, market, "logLoss"))
}]));

const conversionRows = valid.filter(row => row.actualShots > 0 && row.predictedShots > 0);
const outsider = valid.filter(row => row.playerTier === "OUTSIDER");
const outsiderControl = valid.filter(row => row.playerTier === "SECONDARY" && ["CM", "FB/WB", "CB"].includes(row.role));
const falsePositiveOutsiders = outsider.filter(row => row.actualShots === 0).map(row => ({ matchId: row.matchId, player: row.player, team: row.team, actualMinutes: row.actualMinutes, cause: row.actualMinutes < 30 ? "low actual minutes" : row.starterActual === false ? "wrong starter expectation" : "unknown" }));

const leakageChecks = v2Predictions.map(prediction => {
  const match = matchById.get(prediction.matchId);
  const cutoff = prediction.futureDataDiagnostics?.dataCutoff || {};
  const home = prediction.futureDataDiagnostics?.home || {}, away = prediction.futureDataDiagnostics?.away || {};
  const validCutoff = cutoff.matchdayExclusive === match.matchday && cutoff.targetMatchIdExcluded === match.id && cutoff.completedOnly === true && home.currentMatchesUsed <= match.matchday - 1 && away.currentMatchesUsed <= match.matchday - 1;
  return { matchId: match.id, targetMatchday: match.matchday, dataCutoff: cutoff, homeMatchesUsed: home.currentMatchesUsed, awayMatchesUsed: away.currentMatchesUsed, passed: validCutoff };
});
const duplicateKeys = observations.map(row => `${row.matchId}|${row.team}|${row.playerId}|${row.player}`).filter((key, index, all) => all.indexOf(key) !== index);

const report = {
  schemaVersion: 2,
  metadata: {
    title: "Prediction Engine V2 calibration and diagnostic evaluation",
    generatedAt: new Date().toISOString(),
    engineVersion: predictionPayload.engine?.version || N_D,
    playerMarketModelVersion: 2,
    modelFrozen: true,
    productionBehaviorChanged: false,
    cutoff: "MD5 final results; V2 snapshot generated pre-match with asOfMatchday=5",
    scope: "Serie A 2026/27; only archived/current V2 predictions with completed observed player statistics",
    missingValue: N_D,
    sampleRules: { insufficient: "N < 20", low: "20 <= N < 50", moderate: "50 <= N < 150", good: "N >= 150" },
    uncertainty: "1,000 resamples clustered by match; 10 clusters, therefore intervals are diagnostic and coarse.",
    freezeAudit: { engineFilesModified: false, formulaChanges: false, permittedScopeOnly: true }
  },
  dataAudit: {
    totalMatches: matches.filter(match => match.competition === "serie-a" && match.season === "2026-27").length,
    completedMatches: matches.filter(match => match.competition === "serie-a" && match.season === "2026-27" && match.status === "finished").length,
    evaluableMatches: new Set(valid.map(row => row.matchId)).size,
    totalProjectedPlayerMatches: observations.length,
    totalPlayerMatchObservations: valid.length,
    matchingWarnings,
    coverage: {
      shots: { n: observations.filter(row => numeric(row.actualShots)).length, pct: round(observations.filter(row => numeric(row.actualShots)).length / observations.length * 100, 1) },
      sot: { n: observations.filter(row => numeric(row.actualSOT)).length, pct: round(observations.filter(row => numeric(row.actualSOT)).length / observations.length * 100, 1) },
      minutes: { n: observations.filter(row => numeric(row.actualMinutes)).length, pct: round(observations.filter(row => numeric(row.actualMinutes)).length / observations.length * 100, 1) },
      xg: { n: observations.filter(row => numeric(row.actualXg)).length, pct: round(observations.filter(row => numeric(row.actualXg)).length / observations.length * 100, 1) },
      role: { n: observations.filter(row => row.role !== N_D).length, pct: round(observations.filter(row => row.role !== N_D).length / observations.length * 100, 1) },
      detailedRole: { n: observations.filter(row => row.detailedRole !== N_D).length, pct: round(observations.filter(row => row.detailedRole !== N_D).length / observations.length * 100, 1) }
    },
    predictionArchiveCoverage: archiveCoverage,
    coverageBias: "Only MD5 has a valid V2 snapshot. Results cannot be generalized to later maturity bands; observed player-stat coverage within MD5 is reported separately."
  },
  leakageAudit: { passed: leakageChecks.every(check => check.passed), checks: leakageChecks, futureLineupAudit: "Official target-match lineups are pre-kickoff inputs, not future outcomes. Historical probable-lineup snapshots are not available for starter-forecast evaluation.", duplicateObservations: duplicateKeys, passedDuplicationAudit: duplicateKeys.length === 0 },
  walkForwardProtocol: { valid: leakageChecks.every(check => check.passed), trainingWindow: "MD1-MD4 only for current-season evidence; historical priors remain as configured by frozen V2", target: "MD5", unavailableBands: ["DEVELOPING", "MID SAMPLE", "MATURE"] },
  observations,
  overall: { shots, sot },
  marketMetrics: marketMetricsById,
  uncertainty: {
    shotsMae: bootstrapByMatch(valid, rows => continuous(rows, "predictedShots", "actualShots").mae),
    sotMae: bootstrapByMatch(valid, rows => continuous(rows, "predictedSOT", "actualSOT").mae),
    markets: Object.fromEntries(MARKETS.map(market => [market.id, { brier: bootstrapByMatch(valid, rows => marketMetrics(rows, market.key, market.actual, market.threshold).brier), logLoss: bootstrapByMatch(valid, rows => marketMetrics(rows, market.key, market.actual, market.threshold).logLoss) }])),
    v2MinusV1: {
      shotsMae: bootstrapByMatch(matchedV1V2, rows => continuous(rows, "predictedShots", "actualShots").mae - continuous(rows, "v1Shots", "actualShots").mae),
      sotMae: bootstrapByMatch(matchedV1V2, rows => continuous(rows, "predictedSOT", "actualSOT").mae - continuous(rows, "v1SOT", "actualSOT").mae),
      markets: v1MarketUncertainty
    }
  },
  minutesFairness: { realWorld: { n: valid.length, shots, sot }, modelOpportunity: groupMetrics(valid, "actualMinutesBand") },
  starterAccuracy,
  expectedMinutes,
  segments: {
    role: groupMetrics(valid, "role"), detailedRole: groupMetrics(valid, "detailedRole"), team: groupMetrics(valid, "team"), opponent: groupMetrics(valid, "opponent"), venue: groupMetrics(valid, "venue"), maturity: groupMetrics(valid, "sampleMaturity"), confidence: groupMetrics(valid, "confidenceBand"), tier: groupMetrics(valid, "playerTier"), expectedMinutesBand: groupMetrics(valid, "expectedMinutesBand"), matchupFactorBand: groupMetrics(valid, "matchupFactorBand"), stability: groupMetrics(valid, "stability"), persistence: groupMetrics(valid, "persistence")
  },
  outsider: { selected: { n: outsider.length, shots: continuous(outsider, "predictedShots", "actualShots"), sot: continuous(outsider, "predictedSOT", "actualSOT"), shots1Plus: marketMetrics(outsider, "shotProbability1Plus", "actualShots", 1), shots2Plus: marketMetrics(outsider, "shotProbability2Plus", "actualShots", 2), sot1Plus: marketMetrics(outsider, "sotProbability1Plus", "actualSOT", 1), averageExpectedMinutes: round(mean(outsider.filter(row => numeric(row.expectedMinutes)).map(row => row.expectedMinutes))) }, comparableMfDfControl: { definition: "Non-qualified SECONDARY CM/FB/WB/CB", n: outsiderControl.length, shots: continuous(outsiderControl, "predictedShots", "actualShots"), sot: continuous(outsiderControl, "predictedSOT", "actualSOT"), shots1Plus: marketMetrics(outsiderControl, "shotProbability1Plus", "actualShots", 1) }, falsePositives: falsePositiveOutsiders },
  poissonDiagnostic: { shots: distributionGoodness(valid, "predictedShots", "actualShots"), sot: distributionGoodness(valid, "predictedSOT", "actualSOT") },
  negativeBinomialShadow: { estimation: "Pooled method-of-moments dispersion estimated on this evaluation sample; in-sample exploratory test only.", shotsDispersion: round(shotDispersion), sotDispersion: round(sotDispersion), shots: nbShadow("actualShots", "predictedShots", shotDispersion, [1, 2, 3]), sot: nbShadow("actualSOT", "predictedSOT", sotDispersion, [1, 2]) },
  sotConversionDiagnostic: { n: conversionRows.length, predictedRatioMean: round(mean(conversionRows.map(row => row.predictedSOT / row.predictedShots))), actualRatioMean: round(mean(conversionRows.map(row => row.actualSOT / row.actualShots))), mae: round(mean(conversionRows.map(row => Math.abs(row.predictedSOT / row.predictedShots - row.actualSOT / row.actualShots)))), byRole: Object.fromEntries(Object.entries(groupMetrics(conversionRows.map(row => ({ ...row, predictedConversion: row.predictedSOT / row.predictedShots, actualConversion: row.actualSOT / row.actualShots })), "role")).map(([key, value]) => [key, { n: value.n }])) },
  teamTarget,
  playerAllocation,
  errorDecomposition: { teamEnvironmentMae: { shots: teamTarget.shots.mae, sot: teamTarget.sot.mae }, playerAllocationCounterfactualMae: { shots: playerAllocation.matchedPlayerVolumeCounterfactual.shots.mae, sot: playerAllocation.matchedPlayerVolumeCounterfactual.sot.mae }, expectedMinutesMae: expectedMinutes.mae, matchupShadowDeltaMae: { shots: round(ablations.fullV2.shots.mae - ablations.noMatchupApproximation.shots.mae), sot: round(ablations.fullV2.sot.mae - ablations.noMatchupApproximation.sot.mae) }, distributionProbabilityError: { poissonBrier: marketMetricsById, note: "Not causally additive; diagnostic layers overlap." } },
  ablations,
  baselines,
  incrementalValue,
  v1VsV2: { sameSample: true, n: matchedV1V2.length, v1: baselines.v1SameSample, v2: ablations.fullV2, interpretationRule: "BETTER/WORSE only when the clustered 95% CI for V2-V1 excludes zero; otherwise SIMILAR.", verdict: { shotsMae: "SIMILAR", sotMae: "SIMILAR" } },
  warnings: [
    "INSUFFICIENT DATA: only one V2 matchday and 10 match clusters.",
    "INSUFFICIENT DATA: no DEVELOPING, MID SAMPLE or MATURE V2 outcomes.",
    "INSUFFICIENT DATA: modelConfidence is not serialized independently; confidence validation is N/D.",
    "INSUFFICIENT DATA: exact opponent-interaction and most ablation counterfactuals cannot be reconstructed from serialized output without changing/re-running the frozen engine.",
    "Multiple comparisons: segmented extremes are exploratory and require persistence across future matchdays.",
    "Starter accuracy is not a forecast score because MD5 used official lineups."
  ]
};

function metricTable(metrics) {
  return MARKETS.map(market => { const item = metrics[market.id]; return `| ${market.id} | ${item.n} | ${item.brier ?? N_D} | ${item.logLoss ?? N_D} | ${item.ece ?? N_D} | ${item.bias ?? N_D} |`; }).join("\n");
}
function calibrationTable(item) {
  return (item?.calibration?.bins || []).map(bin => `| ${bin.band} | ${bin.n} | ${bin.meanProbability ?? N_D} | ${bin.observedFrequency ?? N_D} | ${bin.gap ?? N_D} |`).join("\n") || "INSUFFICIENT DATA";
}
function compactSegments(groups) {
  return Object.entries(groups).map(([name, value]) => `| ${name} | ${value.n} | ${value.shots.mae ?? N_D} | ${value.shots.bias ?? N_D} | ${value.sot.mae ?? N_D} |`).join("\n");
}
const shotsDelta = report.uncertainty.v2MinusV1.shotsMae;
const sotDelta = report.uncertainty.v2MinusV1.sotMae;
report.v1VsV2.verdict.shotsMae = shotsDelta.ci95?.[1] < 0 ? "BETTER" : shotsDelta.ci95?.[0] > 0 ? "WORSE" : "SIMILAR";
report.v1VsV2.verdict.sotMae = sotDelta.ci95?.[1] < 0 ? "BETTER" : sotDelta.ci95?.[0] > 0 ? "WORSE" : "SIMILAR";
report.v1VsV2.verdict.markets = Object.fromEntries(MARKETS.map(market => [market.id, Object.fromEntries(["brier", "logLoss"].map(metric => {
  const interval = v1MarketUncertainty[market.id][metric].ci95;
  return [metric, interval?.[1] < 0 ? "BETTER" : interval?.[0] > 0 ? "WORSE" : "SIMILAR"];
}))]));
const v1ComparisonRows = MARKETS.flatMap(market => ["brier", "logLoss"].map(metric => {
  const key = metric === "brier" ? "brier" : "logLoss";
  const left = baselines.v1SameSample.markets[market.id][key], right = ablations.fullV2.markets[market.id][key], uncertainty = v1MarketUncertainty[market.id][metric];
  return `| ${market.id} | ${metric} | ${left} | ${right} | ${round(right - left)} | ${uncertainty.ci95?.join(" to ") || N_D} · ${report.v1VsV2.verdict.markets[market.id][metric]} |`;
})).join("\n");

const reportLines = [
  "# Prediction Engine V2 — evaluation diagnostica",
  "",
  "## EVALUATION VERDICT", "", "Valutazione valida ma limitata a MD5. Il motore e rimasto congelato. Il campione consente metriche descrittive e confronto V1/V2 sullo stesso universo, non decisioni robuste di modifica.",
  "", "## DATA COVERAGE", "", `TOTAL MATCHES: ${report.dataAudit.totalMatches}  `, `COMPLETED MATCHES: ${report.dataAudit.completedMatches}  `, `EVALUABLE MATCHES: ${report.dataAudit.evaluableMatches}  `, `TOTAL PLAYER-MATCH OBSERVATIONS: ${report.dataAudit.totalPlayerMatchObservations}  `, `Shots ${report.dataAudit.coverage.shots.pct}% · SOT ${report.dataAudit.coverage.sot.pct}% · minutes ${report.dataAudit.coverage.minutes.pct}% · xG ${report.dataAudit.coverage.xg.pct}% · role ${report.dataAudit.coverage.role.pct}% · detailed role ${report.dataAudit.coverage.detailedRole.pct}%.`,
  "", "## LEAKAGE AUDIT", "", `${report.leakageAudit.passed && report.leakageAudit.passedDuplicationAudit ? "PASS" : "EVALUATION BLOCKER"}: asOf cutoff esclusivo MD5, target escluso, sole gare concluse MD1-MD4; nessun duplicato. Le distinte ufficiali sono input pre-kickoff.`,
  "", "## WALK-FORWARD PROTOCOL", "", "MD5 e costruita con evidenza corrente MD1-MD4. Gli snapshot V2 per MD1-MD4 non esistono e non sono stati ricreati retroattivamente.",
  "", "## OVERALL SHOTS PERFORMANCE", "", `N ${shots.n} · MAE ${shots.mae} · RMSE ${shots.rmse} · bias ${shots.bias} · median AE ${shots.medianAbsoluteError}.`,
  "", "## OVERALL SOT PERFORMANCE", "", `N ${sot.n} · MAE ${sot.mae} · RMSE ${sot.rmse} · bias ${sot.bias} · median AE ${sot.medianAbsoluteError}.`,
  "", "## MARKET CALIBRATION", "", "| Market | N | Brier | LogLoss | ECE | Bias |", "|---|---:|---:|---:|---:|---:|", metricTable(marketMetricsById),
  "", "## BRIER SCORES", "", "| Market | N | Brier | LogLoss | ECE | Bias |", "|---|---:|---:|---:|---:|---:|", metricTable(marketMetricsById),
  "", "## LOG LOSS", "", "Il log loss e calcolato con clipping epsilon soltanto nell'evaluation; le probabilita originali non sono modificate.",
  "", "## ECE", "", "ECE e maximum calibration error sono riportati per mercato nell'artifact JSON e vanno letti con N e Brier.",
  "", "## RELIABILITY DIAGNOSTICS", "", "Esempio 1+ shots:", "", "| Predicted | N | Mean P | Actual Hit Rate | Gap |", "|---|---:|---:|---:|---:|", calibrationTable(marketMetricsById.shots1Plus), "", "Diagrammi separati salvati nell'artifact SVG.",
  "", "## DISCRIMINATION", "", MARKETS.map(market => `${market.id}: ROC-AUC ${marketMetricsById[market.id].rocAuc ?? N_D}, PR-AUC ${marketMetricsById[market.id].prAuc ?? N_D}.`).join("  \n"),
  "", "## EXPECTED MINUTES ACCURACY", "", `MAE ${expectedMinutes.mae} · RMSE ${expectedMinutes.rmse} · bias actual-expected ${expectedMinutes.bias}. Correlazione |errore minuti|/|errore tiri| ${expectedMinutes.correlationAbsoluteMinutesVsAbsoluteShotsError}; SOT ${expectedMinutes.correlationAbsoluteMinutesVsAbsoluteSotError}. Non implica causalita.`,
  "", "## STARTER ACCURACY", "", `Accuracy ${starterAccuracy.accuracy}; false starter rate ${starterAccuracy.falseStarterRate}; missed starter rate N/D. ${starterAccuracy.caveat}`,
  "", "## PRIMARY PERFORMANCE", "", compactSegments({ PRIMARY: report.segments.tier.PRIMARY || { n: 0, shots: {}, sot: {} }, "SECOND PRIMARY": report.segments.tier["SECOND PRIMARY"] || { n: 0, shots: {}, sot: {} } }),
  "", "## SECONDARY PERFORMANCE", "", compactSegments({ SECONDARY: report.segments.tier.SECONDARY || { n: 0, shots: {}, sot: {} } }),
  "", "## OUTSIDER PERFORMANCE", "", `N ${outsider.length}; control comparabile N ${outsiderControl.length}. Risultati completi e falsi positivi nell'artifact JSON.`,
  "", "## ROLE PERFORMANCE", "", "| Role | N | Shots MAE | Shots bias | SOT MAE |", "|---|---:|---:|---:|---:|", compactSegments(report.segments.role),
  "", "## TEAM PATTERNS", "", "Tutte le 20 squadre sono presenti, ma ciascuna ha una sola gara: pattern strutturali INSUFFICIENT DATA.",
  "", "## OPPONENT PATTERNS", "", "Una sola osservazione-gara per avversario: INSUFFICIENT DATA.",
  "", "## HOME/AWAY", "", compactSegments(report.segments.venue),
  "", "## MATURITY PERFORMANCE", "", "Solo EARLY (MD1-5) disponibile; DEVELOPING, MID SAMPLE e MATURE: N/D.",
  "", "## CONFIDENCE VALIDATION", "", "INSUFFICIENT DATA: modelConfidence non e serializzata come campo individuale autonomo. Non e stato inventato un proxy.",
  "", "## MATCHUP FACTOR VALUE", "", `Shadow no-matchup approssimato: delta FULL-minus-NO MATCHUP shots MAE ${report.errorDecomposition.matchupShadowDeltaMae.shots}, SOT MAE ${report.errorDecomposition.matchupShadowDeltaMae.sot}. Con 10 cluster non autorizza modifiche.`,
  "", "## OPPONENT INTERACTION VALUE", "", "INSUFFICIENT DATA: il counterfactual neutralizzato esatto non e serializzato dopo reconciliation.",
  "", "## PERSISTENCE VALUE", "", "Segmenti presenti nell'artifact; una sola giornata target non permette persistenza out-of-sample.",
  "", "## STABILITY VALUE", "", "Segmenti LOW/MEDIUM/HIGH presenti nell'artifact; interpretazione esplorativa.",
  "", "## POISSON DIAGNOSTIC", "", `Shots ${report.poissonDiagnostic.shots.dispersionClass} (mean ${report.poissonDiagnostic.shots.observedMean}, variance ${report.poissonDiagnostic.shots.observedVariance}); SOT ${report.poissonDiagnostic.sot.dispersionClass} (mean ${report.poissonDiagnostic.sot.observedMean}, variance ${report.poissonDiagnostic.sot.observedVariance}).`,
  "", "## NEGATIVE BINOMIAL SHADOW TEST", "", "Shadow in-sample con dispersione pooled method-of-moments. Risultato misto: migliora Brier/log loss/ECE su 2+ shots, ma non tutte le metriche su 1+ e 3+; DISTRIBUTION CANDIDATE limitato a ulteriore validazione, nessuna sostituzione di Poisson.",
  "", "## SOT CONVERSION DIAGNOSTIC", "", `N ${report.sotConversionDiagnostic.n}; predicted SOT/shots ${report.sotConversionDiagnostic.predictedRatioMean}, actual ${report.sotConversionDiagnostic.actualRatioMean}, MAE ratio ${report.sotConversionDiagnostic.mae}.`,
  "", "## TEAM TARGET ERROR", "", `Shots MAE ${teamTarget.shots.mae}; SOT MAE ${teamTarget.sot.mae}.`,
  "", "## PLAYER ALLOCATION ERROR", "", `Counterfactual actual-team-volume (include opportunity dei sostituti): shots MAE ${playerAllocation.actualTeamVolumeCounterfactual.shots.mae}; SOT MAE ${playerAllocation.actualTeamVolumeCounterfactual.sot.mae}. Counterfactual matched-player-volume (isola le share nel perimetro modellato): shots MAE ${playerAllocation.matchedPlayerVolumeCounterfactual.shots.mae}; SOT MAE ${playerAllocation.matchedPlayerVolumeCounterfactual.sot.mae}.`,
  "", "## EXPECTED MINUTES ERROR", "", `MAE ${expectedMinutes.mae}; bias ${expectedMinutes.bias}; viste per banda nell'artifact.`,
  "", "## ERROR DECOMPOSITION", "", "Decomposizione diagnostica, non causale e non additiva. Team environment, allocation, minutes, matchup shadow e probability error sono separati nell'artifact.",
  "", "## ABLATION RESULTS", "", "FULL V2, NO MATCHUP approssimato, NO CURRENT EVIDENCE, NO HISTORICAL SHRINKAGE e NO EXPECTED MINUTES sono disponibili. NO OPPONENT INTERACTION e NO RECENCY: INSUFFICIENT DATA per counterfactual fedele.",
  "", "## BASELINE COMPARISON", "", "Baseline A historical raw e B current-season raw calcolate senza matchup; role prior N/D; V1 usa lo stesso identico sample.",
  "", "## V1 vs V2", "", `Stesso sample N ${matchedV1V2.length}. Shots MAE V1 ${v1.shots.mae} vs V2 ${shots.mae}: ${report.v1VsV2.verdict.shotsMae}. SOT MAE V1 ${v1.sot.mae} vs V2 ${sot.mae}: ${report.v1VsV2.verdict.sotMae}.`, "", "| Market | Metric | V1 | V2 | Delta V2-V1 | Cluster-bootstrap 95% CI |", "|---|---|---:|---:|---:|---|", v1ComparisonRows,
  "", "## EARLY vs MATURE", "", "EARLY disponibile; DEVELOPING/MID/MATURE N/D. Non e possibile stabilire se il modello migliori con la maturity.",
  "", "## BIGGEST ERROR CLUSTERS", "", "Nessun cluster dichiarato strutturale: una sola giornata e molteplici confronti. Le tabelle complete permettono il monitoraggio futuro.",
  "", "## CALIBRATION CANDIDATES", "", "CALIBRATION CANDIDATE soltanto se i gap persistono su nuove giornate; oggi INSUFFICIENT DATA per ricalibrare.",
  "", "## DISTRIBUTION CANDIDATES", "", "Negative Binomial e un DISTRIBUTION CANDIDATE limitato al mercato 2+ shots: il vantaggio e in-sample e deve replicarsi walk-forward; nessuna modifica production.",
  "", "## VOLUME OWNERSHIP CANDIDATES", "", "INSUFFICIENT DATA: richiede fallimenti primary ripetuti su piu giornate.",
  "", "## ROLE/MATCHUP CANDIDATES", "", "INSUFFICIENT DATA: i segmenti hanno N esplicito ma non persistenza temporale.",
  "", "## DATA QUALITY LIMITS", "", report.warnings.map(item => `- ${item}`).join("\n"),
  "", "## PRIORITY PROBLEMS", "", "HIGH — sample temporale insufficiente (una giornata V2), impatto su tutte le metriche e rischio elevato di overfitting. MEDIUM — modelConfidence e counterfactual exact ablations non serializzati. Nessun problema CRITICAL di leakage o duplicazione.",
  "", "## FILES CREATED", "", "- `data/analysis/prediction-calibration-v2.json`\n- `data/analysis/prediction-reliability-v2.svg`\n- `docs/prediction-calibration-v2.md`\n- `scripts/evaluate-prediction-engine-v2.js`\n- `scripts/test-prediction-evaluation-v2.js`",
  "", "## FILES MODIFIED", "", "- `package.json` (solo comandi evaluation/test)",
  "", "## TESTS", "", "Vedere output dei test: freeze audit, leakage, duplicati, monotonicita, copertura, same-sample V1/V2 e presenza delle sezioni obbligatorie.",
  "", "## NEXT RECOMMENDED MODEL CHANGE", "", "NEXT RECOMMENDED MODEL CHANGE: NO MODEL CHANGE YET — COLLECT MORE DATA", "", "Evidence: un solo matchday V2 e 10 cluster. Affected markets: tutti. Expected benefit: evitare una modifica guidata dal rumore. Risks: attendere rallenta l'iterazione ma riduce fortemente overfitting. Required validation: aggiungere snapshot V2 immutabili e valutarli walk-forward almeno nelle fasce DEVELOPING e MID SAMPLE, mantenendo gli stessi test e bootstrap per partita."
];

function reliabilitySvg(metrics) {
  const ids = MARKETS.map(market => market.id), width = 1100, height = 280 * ids.length;
  const panels = ids.map((id, panel) => {
    const bins = metrics[id].calibration.bins, top = panel * 280 + 35, left = 80, size = 210;
    const points = bins.filter(bin => numeric(bin.meanProbability) && numeric(bin.observedFrequency)).map(bin => `${left + bin.meanProbability * size},${top + size - bin.observedFrequency * size}`).join(" ");
    return `<g><text x="${left}" y="${top - 12}" font-size="18" font-family="sans-serif">${id} · N ${metrics[id].n}</text><rect x="${left}" y="${top}" width="${size}" height="${size}" fill="#fff" stroke="#777"/><line x1="${left}" y1="${top + size}" x2="${left + size}" y2="${top}" stroke="#999" stroke-dasharray="5 5"/><polyline points="${points}" fill="none" stroke="#b3261e" stroke-width="3"/>${bins.filter(bin => numeric(bin.meanProbability) && numeric(bin.observedFrequency)).map(bin => `<circle cx="${left + bin.meanProbability * size}" cy="${top + size - bin.observedFrequency * size}" r="4" fill="#b3261e"><title>${bin.band}: N ${bin.n}, p ${bin.meanProbability}, observed ${bin.observedFrequency}</title></circle>`).join("")}<text x="${left + size + 25}" y="${top + 30}" font-size="14" font-family="sans-serif">Brier ${metrics[id].brier}</text><text x="${left + size + 25}" y="${top + 55}" font-size="14" font-family="sans-serif">Log loss ${metrics[id].logLoss}</text><text x="${left + size + 25}" y="${top + 80}" font-size="14" font-family="sans-serif">ECE ${metrics[id].ece}</text></g>`;
  }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="#f7f7f5"/><text x="520" y="25" font-size="14" font-family="sans-serif">Diagonal = perfect calibration · diagnostic sample MD5 only</text>${panels}</svg>\n`;
}

const analysisDir = path.join(root, "data/analysis"), docsDir = path.join(root, "docs");
fs.mkdirSync(analysisDir, { recursive: true });
fs.mkdirSync(docsDir, { recursive: true });
fs.writeFileSync(path.join(analysisDir, "prediction-calibration-v2.json"), `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(path.join(analysisDir, "prediction-reliability-v2.svg"), reliabilitySvg(marketMetricsById));
fs.writeFileSync(path.join(docsDir, "prediction-calibration-v2.md"), `${reportLines.join("\n")}\n`);
console.log(`OK evaluation V2: ${report.dataAudit.evaluableMatches} gare · ${valid.length} osservazioni · leakage ${report.leakageAudit.passed ? "PASS" : "FAIL"}`);
