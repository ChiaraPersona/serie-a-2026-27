"use strict";

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const root = path.resolve(__dirname, "../../..");
const reportDate = "2026-10-09";
const analysisPath = "data/analysis/serie-a-md06-phase-5c-volume-validation-2026-10-09.json";
const reportPath = "output/reports/serie-a-md06-phase-5c-volume-validation-2026-10-09.md";
const targetFamilies = ["sot-over-match", "sot-over-team", "corner-over-match", "corner-over-team"];
const protectedPaths = [
  "scripts/predictions/engine.js",
  "data/normalized/predictions.json",
  "data/normalized/schedina-md06.json",
  "data/normalized/odds/sisal/serie-a.json",
  "data/normalized/mycombo.json",
  "js/pages/betting.js",
  "scripts/md06-market-catalog.js",
  "scripts/build-md06-betting-decision-package.mjs",
  ...[1, 2, 3, 4, 5].map(matchday => `data/normalized/schedina-md${String(matchday).padStart(2, "0")}.json`),
  "data/normalized/champions-predictions.json",
  "data/normalized/champions-schedina.json"
].filter(relative => fs.existsSync(path.join(root, relative)));

function readJson(relative) {
  return JSON.parse(fs.readFileSync(path.join(root, relative), "utf8"));
}

function sha256File(relative) {
  return crypto.createHash("sha256").update(fs.readFileSync(path.join(root, relative))).digest("hex");
}

function captureProtected() {
  return Object.fromEntries(protectedPaths.map(relative => [relative, sha256File(relative)]));
}

function assertProtectedUnchanged(before) {
  const after = captureProtected();
  const changedFiles = Object.keys(before).filter(relative => before[relative] !== after[relative]);
  if (changedFiles.length) throw new Error(`Protected production files changed: ${changedFiles.join(", ")}`);
  return { checkedFiles: Object.keys(before).length, changedFiles, hashes: after };
}

function git(args) {
  return execFileSync("git", args, { cwd: root, encoding: "utf8", maxBuffer: 256 * 1024 * 1024 }).trim();
}

function round(value, digits = 4) {
  if (!Number.isFinite(value)) return null;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function mean(values) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

function quantile(values, probability) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const index = (sorted.length - 1) * probability;
  const lower = Math.floor(index), upper = Math.ceil(index);
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
}

function erf(value) {
  const sign = value < 0 ? -1 : 1;
  const x = Math.abs(value);
  const t = 1 / (1 + 0.3275911 * x);
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return sign * y;
}

function normalCdf(value) {
  return 0.5 * (1 + erf(value / Math.sqrt(2)));
}

function normalOverProbability(meanValue, sd, threshold) {
  return 1 - normalCdf((threshold - meanValue) / sd);
}

function logLoss(probability, outcome) {
  const p = Math.min(1 - 1e-15, Math.max(1e-15, probability));
  return -(outcome * Math.log(p) + (1 - outcome) * Math.log(1 - p));
}

function calibration(rows, probabilityKey, bins = 5) {
  const output = [];
  for (let index = 0; index < bins; index += 1) {
    const low = index / bins, high = (index + 1) / bins;
    const selected = rows.filter(row => row[propertyKey(probabilityKey)] >= low && (index === bins - 1 ? row[propertyKey(probabilityKey)] <= high : row[propertyKey(probabilityKey)] < high));
    output.push({
      bin: `${low.toFixed(1)}-${high.toFixed(1)}`,
      n: selected.length,
      meanProbability: round(mean(selected.map(row => row[propertyKey(probabilityKey)]))),
      observedFrequency: round(mean(selected.map(row => row.outcome)))
    });
  }
  return output;
}

function propertyKey(key) {
  return key;
}

function ece(rows, probabilityKey, bins = 5) {
  if (!rows.length) return null;
  return calibration(rows, probabilityKey, bins).reduce((sum, bin) => sum + (bin.n / rows.length) * Math.abs((bin.meanProbability ?? 0) - (bin.observedFrequency ?? 0)), 0);
}

function meanMetrics(rows, prefix) {
  const errors = rows.map(row => row[`${prefix}Mean`] - row.actual);
  const covered = rows.map(row => row.actual >= row[`${prefix}P20`] && row.actual <= row[`${prefix}P80`] ? 1 : 0);
  return {
    n: rows.length,
    mae: round(mean(errors.map(Math.abs))),
    rmse: round(Math.sqrt(mean(errors.map(error => error ** 2)))),
    biasPredictedMinusActual: round(mean(errors)),
    p20P80Coverage: round(mean(covered))
  };
}

function probabilityMetrics(rows, probabilityKey) {
  const usable = rows.filter(row => !row.push);
  return {
    n: usable.length,
    pushesExcluded: rows.length - usable.length,
    brier: round(mean(usable.map(row => (row[probabilityKey] - row.outcome) ** 2))),
    logLoss: round(mean(usable.map(row => logLoss(row[probabilityKey], row.outcome)))),
    ece: round(ece(usable, probabilityKey)),
    meanProbability: round(mean(usable.map(row => row[probabilityKey]))),
    observedOverFrequency: round(mean(usable.map(row => row.outcome))),
    calibration: calibration(usable, probabilityKey)
  };
}

function makeRng(seed = 0x5c2026) {
  let state = seed >>> 0;
  return () => {
    state ^= state << 13; state ^= state >>> 17; state ^= state << 5;
    return (state >>> 0) / 4294967296;
  };
}

function clusterBootstrap(rows, statistic, iterations = 1000, seed = 0x5c2026) {
  const byCluster = new Map();
  for (const row of rows) {
    if (!byCluster.has(row.matchId)) byCluster.set(row.matchId, []);
    byCluster.get(row.matchId).push(row);
  }
  const ids = [...byCluster.keys()];
  if (ids.length < 2) return { status: "INSUFFICIENT", clusters: ids.length, iterations: 0, low: null, high: null };
  const random = makeRng(seed);
  const values = [];
  for (let iteration = 0; iteration < iterations; iteration += 1) {
    const sample = [];
    for (let index = 0; index < ids.length; index += 1) {
      const id = ids[Math.floor(random() * ids.length)];
      sample.push(...byCluster.get(id));
    }
    const value = statistic(sample);
    if (Number.isFinite(value)) values.push(value);
  }
  return { status: "CLUSTER_BOOTSTRAP_DIAGNOSTIC", clusters: ids.length, iterations: values.length, low: round(quantile(values, 0.025)), high: round(quantile(values, 0.975)) };
}

function kickoffInstant(match) {
  return new Date(`${match.date}T${match.kickoff}:00+02:00`);
}

function reconstructAuthenticForecasts(matches, results) {
  const resultById = new Map(results.matches.map(match => [match.matchId, match]));
  const targets = matches.filter(match => match.competition === "serie-a" && match.season === "2026-27" && match.matchday >= 1 && match.matchday <= 5 && resultById.has(match.id));
  const commitCache = new Map();
  const rows = [];
  for (const match of targets) {
    const kickoff = kickoffInstant(match);
    const log = git(["log", "-1", `--before=${kickoff.toISOString()}`, "--format=%H|%cI", "--", "data/normalized/predictions.json"]);
    if (!log) continue;
    const [commit, committedAt] = log.split("|");
    if (!commitCache.has(commit)) commitCache.set(commit, JSON.parse(git(["show", `${commit}:data/normalized/predictions.json`])));
    const document = commitCache.get(commit);
    const prediction = document.predictions.find(item => item.matchId === match.id);
    const generatedAt = prediction ? new Date(prediction.generatedAt) : null;
    const generatedAtPrecision = prediction && /T\d{2}:\d{2}/.test(String(prediction.generatedAt)) ? "TIMESTAMP" : "DATE_ONLY";
    if (!prediction || !prediction.matchProjection || !Array.isArray(prediction.teamProjections) || generatedAt >= kickoff || new Date(committedAt) >= kickoff) continue;
    rows.push({
      matchId: match.id,
      matchday: match.matchday,
      date: match.date,
      kickoff: match.kickoff,
      kickoffAt: kickoff.toISOString(),
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      forecastCommit: commit,
      committedAt,
      generatedAt: prediction.generatedAt,
      generatedAtPrecision,
      leadHours: generatedAtPrecision === "TIMESTAMP" ? round((kickoff - generatedAt) / 36e5, 2) : null,
      commitLeadMinutes: round((kickoff - new Date(committedAt)) / 6e4, 1),
      engineVersion: prediction.engineVersion || document.engine?.version || null,
      inputAvailabilityEvidence: "PARTIAL_SERIALIZED_PROVENANCE",
      prediction,
      actual: resultById.get(match.id)
    });
  }
  return { rows, commitsRead: commitCache.size, targets: targets.length };
}

function historicalValues(profileMap, teamId, metric, pooledValues) {
  const key = metric === "shotsOnTarget" ? "shotsOnTarget" : "wonCorners";
  const values = profileMap.get(teamId)?.venues?.overall?.[key]?.for?.values;
  return Array.isArray(values) && values.length ? { values, source: "TEAM_2025_26" } : { values: pooledValues, source: "POOLED_LEAGUE_2025_26" };
}

function convolve(left, right) {
  const values = [];
  for (const a of left) for (const b of right) values.push(a + b);
  return values;
}

function buildMeanObservations(forecasts, profiles) {
  const profileMap = new Map(profiles.profiles.map(profile => [profile.teamId, profile]));
  const families = Object.fromEntries(targetFamilies.map(family => [family, []]));
  const pooled = Object.fromEntries(["shotsOnTarget", "corners"].map(metric => {
    const key = metric === "shotsOnTarget" ? "shotsOnTarget" : "wonCorners";
    return [metric, profiles.profiles.flatMap(profile => profile.venues.overall[key].for.values)];
  }));
  const baselineFallbackTeams = new Set();
  for (const forecast of forecasts) {
    for (const metric of ["shotsOnTarget", "corners"]) {
      const prefix = metric === "shotsOnTarget" ? "sot" : "corner";
      const matchMetric = forecast.prediction.matchProjection[metric];
      const homeMetric = forecast.prediction.teamProjections.find(team => team.teamId === forecast.homeTeam)?.[metric];
      const awayMetric = forecast.prediction.teamProjections.find(team => team.teamId === forecast.awayTeam)?.[metric];
      const actualHome = Number(forecast.actual.teamStats.home[metric === "corners" ? "corners" : "shotsOnTarget"]);
      const actualAway = Number(forecast.actual.teamStats.away[metric === "corners" ? "corners" : "shotsOnTarget"]);
      if (![matchMetric?.central, matchMetric?.sd, homeMetric?.central, homeMetric?.sd, awayMetric?.central, awayMetric?.sd, actualHome, actualAway].every(Number.isFinite)) continue;
      const homeBaseline = historicalValues(profileMap, forecast.homeTeam, metric, pooled[metric]);
      const awayBaseline = historicalValues(profileMap, forecast.awayTeam, metric, pooled[metric]);
      if (homeBaseline.source === "POOLED_LEAGUE_2025_26") baselineFallbackTeams.add(forecast.homeTeam);
      if (awayBaseline.source === "POOLED_LEAGUE_2025_26") baselineFallbackTeams.add(forecast.awayTeam);
      const matchBaseline = convolve(homeBaseline.values, awayBaseline.values);
      const common = {
        matchId: forecast.matchId, matchday: forecast.matchday, date: forecast.date, kickoff: forecast.kickoff,
        homeTeam: forecast.homeTeam, awayTeam: forecast.awayTeam, generatedAt: forecast.generatedAt,
        committedAt: forecast.committedAt, forecastCommit: forecast.forecastCommit, leadHours: forecast.leadHours,
        engineVersion: forecast.engineVersion, inputAvailabilityEvidence: forecast.inputAvailabilityEvidence
      };
      families[`${prefix}-over-match`].push({
        ...common, side: "match", metric, actual: actualHome + actualAway,
        modelMean: matchMetric.central, modelSd: matchMetric.sd, modelP20: matchMetric.min, modelP80: matchMetric.max,
        modelIntervalLabel: matchMetric.interval, modelSampleSize: matchMetric.sampleSize,
        baselineMean: mean(matchBaseline), baselineP20: quantile(matchBaseline, 0.2), baselineP80: quantile(matchBaseline, 0.8),
        baselineValues: matchBaseline,
        baselineSource: `${homeBaseline.source}+${awayBaseline.source}`
      });
      for (const [side, teamId, teamMetric, actual, baselineValues] of [
        ["home", forecast.homeTeam, homeMetric, actualHome, homeBaseline],
        ["away", forecast.awayTeam, awayMetric, actualAway, awayBaseline]
      ]) families[`${prefix}-over-team`].push({
        ...common, side, teamId, metric, actual,
        modelMean: teamMetric.central, modelSd: teamMetric.sd, modelP20: teamMetric.min, modelP80: teamMetric.max,
        modelIntervalLabel: teamMetric.interval, modelSampleSize: teamMetric.sampleSize,
        baselineMean: mean(baselineValues.values), baselineP20: quantile(baselineValues.values, 0.2), baselineP80: quantile(baselineValues.values, 0.8),
        baselineValues: baselineValues.values,
        baselineSource: baselineValues.source
      });
    }
  }
  return { families, baselineFallbackTeams: [...baselineFallbackTeams].sort() };
}

function thresholdGrid(audit) {
  return Object.fromEntries(targetFamilies.map(family => [family, [...new Set(audit.classifications.filter(row => row.family === family).map(row => Number(row.threshold)))].sort((a, b) => a - b)]));
}

function buildThresholdRows(observations, thresholds) {
  return observations.flatMap(observation => thresholds.map(threshold => {
    const centralProbability = normalOverProbability(observation.modelMean, observation.modelSd, threshold);
    const baselineProbability = observation.baselineValues.filter(value => value > threshold).length / observation.baselineValues.length;
    const push = Number.isInteger(threshold) && observation.actual === threshold;
    return {
      matchId: observation.matchId,
      side: observation.side,
      teamId: observation.teamId || null,
      threshold,
      thresholdType: Number.isInteger(threshold) ? "integer" : "half",
      actual: observation.actual,
      outcome: observation.actual > threshold ? 1 : 0,
      push,
      centralProbability,
      prudentProbability: centralProbability * 0.92,
      baselineProbability
    };
  }));
}

function thresholdBreakdown(rows) {
  return [...new Set(rows.map(row => row.threshold))].sort((a, b) => a - b).map(threshold => {
    const selected = rows.filter(row => row.threshold === threshold);
    return {
      threshold,
      thresholdType: selected[0].thresholdType,
      n: selected.filter(row => !row.push).length,
      pushesExcluded: selected.filter(row => row.push).length,
      observedOverFrequency: round(mean(selected.filter(row => !row.push).map(row => row.outcome))),
      central: probabilityMetrics(selected, "centralProbability"),
      prudent092: probabilityMetrics(selected, "prudentProbability"),
      baseline2025_26: probabilityMetrics(selected, "baselineProbability")
    };
  });
}

function summarizeFamily(family, observations, thresholds) {
  const thresholdRows = buildThresholdRows(observations, thresholds);
  const modelMean = meanMetrics(observations, "model");
  const baselineMean = meanMetrics(observations, "baseline");
  const central = probabilityMetrics(thresholdRows, "centralProbability");
  const prudent = probabilityMetrics(thresholdRows, "prudentProbability");
  const baseline = probabilityMetrics(thresholdRows, "baselineProbability");
  const meanAbsError = rows => mean(rows.map(row => Math.abs(row.modelMean - row.actual)));
  const brier = (rows, key) => mean(rows.filter(row => !row.push).map(row => (row[key] - row.outcome) ** 2));
  const versions = Object.entries(observations.reduce((acc, row) => (acc[row.engineVersion] = (acc[row.engineVersion] || 0) + 1, acc), {})).map(([version, n]) => ({ version, n }));
  return {
    family,
    gate: "INSUFFICIENT_DATA",
    independentMatchClusters: new Set(observations.map(row => row.matchId)).size,
    observations: observations.length,
    engineVersions: versions,
    meanAccuracy: {
      model: modelMean,
      baseline2025_26: baselineMean,
      uncertainty95: {
        modelMAE: clusterBootstrap(observations, meanAbsError),
        modelBias: clusterBootstrap(observations, rows => mean(rows.map(row => row.modelMean - row.actual))),
        modelCoverage: clusterBootstrap(observations, rows => mean(rows.map(row => row.actual >= row.modelP20 && row.actual <= row.modelP80 ? 1 : 0)))
      }
    },
    probabilityCalibration: {
      gridSource: "CURRENT_MD6_SISAL_COMMERCIAL_THRESHOLDS_APPLIED_RETROSPECTIVELY",
      thresholds,
      central,
      prudent092: prudent,
      baseline2025_26: baseline,
      pairedPrudentMinusBaselineBrier: round(prudent.brier - baseline.brier),
      uncertainty95: {
        prudentBrier: clusterBootstrap(thresholdRows, rows => brier(rows, "prudentProbability"), 1000, 0x5c3000 + targetFamilies.indexOf(family)),
        baselineBrier: clusterBootstrap(thresholdRows, rows => brier(rows, "baselineProbability"), 1000, 0x5c4000 + targetFamilies.indexOf(family)),
        prudentMinusBaselineBrier: clusterBootstrap(thresholdRows, rows => brier(rows, "prudentProbability") - brier(rows, "baselineProbability"), 1000, 0x5c5000 + targetFamilies.indexOf(family)),
        prudentECE: clusterBootstrap(thresholdRows, rows => ece(rows.filter(row => !row.push), "prudentProbability"), 1000, 0x5c6000 + targetFamilies.indexOf(family))
      },
      byThreshold: thresholdBreakdown(thresholdRows)
    }
  };
}

function projectionForClassification(classification, prediction) {
  const metric = classification.family.startsWith("sot") || classification.family === "both-teams-sot" ? "shotsOnTarget" : "corners";
  if (classification.family.endsWith("-match")) return { metric, side: "match", distribution: prediction.matchProjection?.[metric] };
  const side = /SQUADRA 1\b/i.test(classification.variantName) ? 0 : /SQUADRA 2\b/i.test(classification.variantName) ? 1 : null;
  return { metric, side: side === 0 ? "home" : side === 1 ? "away" : null, distribution: side == null ? null : prediction.teamProjections?.[side]?.[metric] };
}

function flattenOdds(odds) {
  const map = new Map();
  for (const event of odds.events) for (const market of event.markets) for (const selection of market.selections) {
    map.set(String(selection.providerSelectionId), { event, market, selection });
  }
  return map;
}

function catalogSelectionIds(schedina) {
  return new Set(schedina.marketCatalog.matches.flatMap(match => match.selections.map(selection => selection.selectionId)));
}

function simulateMd6(audit, predictions, odds, schedina) {
  const predictionMap = new Map(predictions.predictions.map(prediction => [prediction.matchId, prediction]));
  const oddsMap = flattenOdds(odds);
  const catalogIds = catalogSelectionIds(schedina);
  const simulations = [];
  for (const classification of audit.classifications.filter(row => targetFamilies.includes(row.family))) {
    const prediction = predictionMap.get(classification.matchId);
    const projection = prediction ? projectionForClassification(classification, prediction) : {};
    const threshold = Number(classification.threshold);
    const distribution = projection.distribution;
    const probability = Number.isFinite(distribution?.central) && Number.isFinite(distribution?.sd) && distribution.sd > 0 ? normalOverProbability(distribution.central, distribution.sd, threshold) : null;
    const prudent = Number.isFinite(probability) ? probability * 0.92 : null;
    const quote = oddsMap.get(String(classification.providerSelectionId));
    simulations.push({
      selectionId: classification.selectionId,
      providerSelectionId: classification.providerSelectionId,
      matchId: classification.matchId,
      fixture: classification.fixture,
      family: classification.family,
      marketName: classification.marketName,
      variantName: classification.variantName,
      selection: classification.selection,
      threshold,
      odds: classification.odds,
      reconciliation: {
        normalizationStatus: classification.normalizationStatus,
        eventMatch: quote?.event?.canonicalMatchId === classification.matchId,
        marketMatch: String(quote?.market?.providerMarketId) === String(classification.providerMarketId),
        selectionMatch: String(quote?.selection?.providerSelectionId) === String(classification.providerSelectionId),
        oddsMatch: Number(quote?.selection?.odds) === Number(classification.odds),
        quoteStatus: quote?.selection?.status || null
      },
      distribution: distribution ? { metric: projection.metric, side: projection.side, mean: distribution.central, sd: distribution.sd, p20: distribution.min, p80: distribution.max, interval: distribution.interval, sampleSize: distribution.sampleSize, dataStatus: distribution.dataStatus } : null,
      diagnostic: Number.isFinite(probability) ? {
        centralProbability: round(probability),
        prudentProbability092: round(prudent),
        fairOddsFromPrudent: round(1 / Math.max(0.0001, prudent), 2),
        expectedValuePctDiagnostic: round((prudent * classification.odds - 1) * 100, 2),
        method: "EXACT_REPRODUCTION_OF_CONFIGURED_VOLUME_ASSESSMENT_NORMAL_CDF"
      } : null,
      gate: "INSUFFICIENT_DATA",
      currentCatalogContainsSelection: catalogIds.has(classification.selectionId),
      recommendation: false,
      catalogAction: "NO_CHANGE",
      limitations: ["NO_COMPLETED_PROSPECTIVE_VOLUME_SNAPSHOT", "NORMAL_APPROXIMATION_FOR_DISCRETE_COUNT", "NO_INDEPENDENT_CALIBRATION_SET", "DIAGNOSTIC_ONLY"]
    });
  }
  const joint = audit.classifications.filter(row => row.family === "both-teams-sot").map(classification => {
    const prediction = predictionMap.get(classification.matchId);
    const threshold = Number(classification.variantName.match(/ALMENO\s+(\d+(?:\.\d+)?)/i)?.[1]);
    const marginals = prediction?.teamProjections?.map(team => {
      const metric = team.shotsOnTarget;
      return Number.isFinite(metric?.central) && Number.isFinite(metric?.sd) && metric.sd > 0 ? 1 - normalCdf((threshold - 0.5 - metric.central) / metric.sd) : null;
    }) || [];
    const probability = marginals.length === 2 && marginals.every(Number.isFinite) ? marginals[0] * marginals[1] : null;
    return {
      selectionId: classification.selectionId, providerSelectionId: classification.providerSelectionId, matchId: classification.matchId,
      fixture: classification.fixture, variantName: classification.variantName, threshold, odds: classification.odds,
      marginalProbabilities: marginals.map(value => round(value)), diagnosticProbabilityUnderIndependence: round(probability),
      prudentProbability090: round(Number.isFinite(probability) ? probability * 0.9 : null),
      method: "CURRENT_CONFIGURED_VOLUME_ASSESSMENT_PRODUCT_OF_NORMAL_MARGINALS_WITH_0_5_CONTINUITY_CORRECTION",
      gate: "INSUFFICIENT_DATA", recommendation: false, catalogAction: "NO_CHANGE",
      limitations: ["UNVALIDATED_TEAM_INDEPENDENCE", "NO_JOINT_PROSPECTIVE_SAMPLE", "DISCRETE_COUNTS_APPROXIMATED_BY_NORMAL"]
    };
  });
  const corner1x2 = audit.classifications.filter(row => row.family === "corner-1x2-fulltime").map(classification => ({
    selectionId: classification.selectionId, providerSelectionId: classification.providerSelectionId, matchId: classification.matchId,
    fixture: classification.fixture, selection: classification.selection, odds: classification.odds,
    diagnosticProbability: null, distributionAvailable: false, gate: "INSUFFICIENT_DATA", recommendation: false, catalogAction: "NO_CHANGE",
    limitations: ["NO_JOINT_DISCRETE_CORNER_DISTRIBUTION", "NO_DIFFERENTIAL_1X2_PROBABILITY_IN_CURRENT_METHOD"]
  }));
  return { simulations, joint, corner1x2 };
}

function gateDefinition() {
  return {
    statusPriority: ["INSUFFICIENT_DATA", "FAIL", "PARTIAL", "PASS"],
    prerequisites: {
      minimumIndependentCompletedMatchClusters: 100,
      minimumNonPushObservationsPerCommercialThreshold: 30,
      minimumObservationsPerTeam: 10,
      timestampVerifiedPct: 100,
      duplicatesAllowed: 0,
      independentTemporalHoldoutRequired: true,
      completeInputVintageEvidenceRequired: true
    },
    pass: {
      probability: "95% cluster-bootstrap upper bound of Brier(model)-Brier(baseline) < 0; ECE <= 0.05 and upper 95% bound <= 0.08",
      mean: "absolute bias <= 0.50 team / 1.00 match and p20-p80 coverage between 0.50 and 0.70",
      stability: "no commercially material threshold or team subgroup fails the baseline with adequate N"
    },
    partial: "All prerequisites met, but evidence passes only prespecified thresholds/segments and remains stable after multiplicity-aware review.",
    fail: "Prerequisites met and independent evidence shows material underperformance, miscalibration, or instability.",
    insufficientData: "Any prerequisite is unmet; descriptive metrics cannot certify reliability."
  };
}

function formatNumber(value, digits = 3) {
  return Number.isFinite(value) ? value.toFixed(digits) : "N/D";
}

function familyLabel(family) {
  return ({
    "sot-over-match": "SOT partita",
    "sot-over-team": "SOT squadra",
    "corner-over-match": "Corner partita",
    "corner-over-team": "Corner squadra"
  })[family] || family;
}

function formatReport(artifact) {
  const lines = [
    "# Serie A 2026/27 — Fase 5C: validazione statistica SOT e corner",
    "",
    `Generato: ${artifact.generatedAt} · data report: ${reportDate}`,
    "",
    "**Esito operativo: 0 dei 110 mercati B3 sono recuperabili in sicurezza oggi.** Le metriche retrospettive sono diagnostiche; il campione prospettico completato è 0 e ogni famiglia resta `INSUFFICIENT_DATA`. Catalogo, Engine V2, quote, MyCombo, UI, MD1–MD5, Champions e DUO non sono stati modificati.",
    "",
    "## 1. Inventario e autenticità pre-partita",
    "",
    `- Gare concluse MD1–MD5 con statistiche SOT/corner complete: **${artifact.inventory.completedMatchesWithActuals}**.`,
    `- Previsioni autentiche recuperate dal Git e committate prima del kickoff: **${artifact.inventory.authenticPrematchForecasts}/${artifact.inventory.completedMatchesWithActuals}**. \`generatedAt\` preciso: **${artifact.inventory.generatedAtTimestampPrecision}**; solo data: **${artifact.inventory.generatedAtDateOnlyPrecision}**.`,
    `- Commit distinti letti: **${artifact.inventory.forecastCommitsRead}**; versioni Engine: ${artifact.inventory.engineVersions.map(row => `${row.version} (${row.matches})`).join(", ")}.`,
    `- Snapshot prospettici MD6 immutabili: **${artifact.inventory.prospectiveSnapshots}**; con esito disponibile/evaluabile: **${artifact.inventory.prospectiveEvaluated}**.`,
    `- Baseline 2025/26: profilo squadra quando disponibile; fallback pooled di lega per: **${artifact.inventory.baseline.pooledLeagueFallbackTeams.join(", ") || "nessuna"}**.`,
    "- L’autenticità temporale della previsione è provata dal commit; la disponibilità temporale di ogni singolo input sorgente è solo parzialmente dimostrabile dai campi serializzati. Questo impedisce una certificazione anti-leakage completa.",
    "",
    "La griglia delle soglie è quella commerciale Sisal MD6 corrente. È applicata retrospettivamente alle previsioni autentiche MD1–MD5; **non** viene presentata come storico delle quote offerte in quelle giornate.",
    "",
    "## 2. Distribuzione corrente (`configuredVolumeAssessment`)",
    "",
    "- SOT/corner squadra e partita: approssimazione Normale con media `central` e deviazione standard `sd`; `P(Over)=1-CDF((soglia-media)/sd)`.",
    "- Mercati partita: media come somma delle medie squadra e deviazione standard ottenuta assumendo varianze indipendenti. Mercati squadra: marginale della singola squadra.",
    "- Haircut: probabilità marginale × **0,92**; congiunta “entrambe” × **0,90** dopo il prodotto delle marginali.",
    "- Clamp: nessuno nella probabilità del singolo volume; solo il calcolo della quota equa usa `max(0,0001, prudentProbability)`. La log loss di questo audit usa un clamp numerico 1e-15 esclusivamente per evitare log(0).",
    "- Soglie mezze: la formula coincide con il confine continuo tra i due interi. Soglie intere: non viene modellata la massa di pareggio/push; servirebbe una distribuzione discreta o una regola condizionata al non-push.",
    "- Natura discreta: la Normale ammette supporto negativo e non modella overdispersione, asimmetria, code o dipendenza tra le squadre. La coerenza commerciale va quindi dimostrata empiricamente, non presunta.",
    "",
    "## 3. Accuratezza delle medie e calibrazione delle probabilità",
    "",
    "Le due domande sono separate: MAE/RMSE/bias/copertura valutano la previsione del conteggio; Brier/log loss/ECE valutano le probabilità Over sulle soglie MD6.",
    "",
    "| Famiglia | Cluster gara | Osservazioni conteggio | MAE modello | RMSE | Bias | Copertura p20–p80 | MAE baseline | Brier prudente | Brier baseline | ECE prudente | Gate |",
    "|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|"
  ];
  for (const family of targetFamilies) {
    const row = artifact.validation[family];
    lines.push(`| ${familyLabel(family)} | ${row.independentMatchClusters} | ${row.observations} | ${formatNumber(row.meanAccuracy.model.mae)} | ${formatNumber(row.meanAccuracy.model.rmse)} | ${formatNumber(row.meanAccuracy.model.biasPredictedMinusActual)} | ${formatNumber(row.meanAccuracy.model.p20P80Coverage)} | ${formatNumber(row.meanAccuracy.baseline2025_26.mae)} | ${formatNumber(row.probabilityCalibration.prudent092.brier)} | ${formatNumber(row.probabilityCalibration.baseline2025_26.brier)} | ${formatNumber(row.probabilityCalibration.prudent092.ece)} | **${row.gate}** |`);
  }
  lines.push("", "Intervalli diagnostici al 95% (bootstrap a cluster gara, 1.000 repliche):");
  for (const family of targetFamilies) {
    const row = artifact.validation[family], meanCi = row.meanAccuracy.uncertainty95, probabilityCi = row.probabilityCalibration.uncertainty95;
    lines.push(`- ${familyLabel(family)}: MAE [${formatNumber(meanCi.modelMAE.low)}, ${formatNumber(meanCi.modelMAE.high)}]; bias [${formatNumber(meanCi.modelBias.low)}, ${formatNumber(meanCi.modelBias.high)}]; copertura [${formatNumber(meanCi.modelCoverage.low)}, ${formatNumber(meanCi.modelCoverage.high)}]; Brier prudente [${formatNumber(probabilityCi.prudentBrier.low)}, ${formatNumber(probabilityCi.prudentBrier.high)}]; ΔBrier vs baseline [${formatNumber(probabilityCi.prudentMinusBaselineBrier.low)}, ${formatNumber(probabilityCi.prudentMinusBaselineBrier.high)}]; ECE prudente [${formatNumber(probabilityCi.prudentECE.low)}, ${formatNumber(probabilityCi.prudentECE.high)}].`);
  }
  lines.push("", "Le righe soglia della stessa gara non vengono considerate indipendenti. La baseline usa esclusivamente i valori squadra 2025/26; per i totali partita usa la convoluzione indipendente delle due distribuzioni storiche.", "", "### Calibration curve prudente ×0,92", "", "| Famiglia | Bin | N | Probabilità media | Frequenza osservata |", "|---|---|---:|---:|---:|");
  for (const family of targetFamilies) for (const bin of artifact.validation[family].probabilityCalibration.prudent092.calibration) lines.push(`| ${familyLabel(family)} | ${bin.bin} | ${bin.n} | ${formatNumber(bin.meanProbability)} | ${formatNumber(bin.observedFrequency)} |`);
  lines.push("", "### Metriche per soglia", "");
  for (const family of targetFamilies) {
    lines.push(`#### ${familyLabel(family)}`, "", "| Soglia | N | Frequenza Over | Brier centrale | Brier ×0,92 | Log loss ×0,92 | ECE ×0,92 | Brier baseline |", "|---:|---:|---:|---:|---:|---:|---:|---:|");
    for (const row of artifact.validation[family].probabilityCalibration.byThreshold) lines.push(`| ${row.threshold} | ${row.n} | ${formatNumber(row.observedOverFrequency)} | ${formatNumber(row.central.brier)} | ${formatNumber(row.prudent092.brier)} | ${formatNumber(row.prudent092.logLoss)} | ${formatNumber(row.prudent092.ece)} | ${formatNumber(row.baseline2025_26.brier)} |`);
    lines.push("");
  }
  lines.push(
    "## 4. Controlli anti-leakage",
    "",
    `- Disponibilità pre-kickoff provata dal timestamp esatto del commit: **${artifact.antiLeakage.timestampVerifiedViaCommit}/${artifact.antiLeakage.forecasts}**; commit successivi o uguali al kickoff: **${artifact.antiLeakage.invalidCommitTimestamps}**. Il \`generatedAt\` è preciso in ${artifact.antiLeakage.generatedAtTimestampPrecision} casi e date-only in ${artifact.antiLeakage.generatedAtDateOnlyPrecision}.`,
    `- Duplicati per partita: **${artifact.antiLeakage.duplicateForecasts}**.`,
    "- Training/test: la baseline 2025/26 è temporalmente precedente; l’Engine è valutato su MD1–MD5. Tuttavia le versioni del motore cambiano nel periodo e non esiste ancora un holdout prospettico completato.",
    "- Le soglie MD6 sono fissate senza usare gli esiti MD1–MD5, ma costituiscono una griglia diagnostica retrospettiva; non sono state usate per rifittare formule o haircut.",
    "- Nessuna calibrazione è stata scelta e poi valutata sullo stesso campione. Gli haircut 0,92/0,90 sono soltanto misurati, non ottimizzati.",
    "- Conclusione anti-leakage: timestamp/duplicati **PASS**; provenienza completa degli input e test temporale indipendente **NON DISPONIBILI**.",
    "",
    "## 5. Gate quantitativo",
    "",
    "Prerequisiti: ≥100 cluster gara conclusi, ≥30 non-push per soglia, ≥10 osservazioni per squadra, 100% timestamp verificati, zero duplicati, holdout temporale indipendente e provenienza completa degli input. Per `PASS`: limite superiore 95% di ΔBrier modello-baseline < 0, ECE ≤0,05 con limite superiore ≤0,08, bias assoluto ≤0,50 squadra/≤1,00 partita, copertura p20–p80 tra 0,50 e 0,70 e nessuna instabilità materiale per soglia/squadra.",
    "",
    "Il campione ha solo 50 cluster, 5 osservazioni per squadra, versioni Engine multiple, 0 esiti prospettici MD6 e nessun holdout indipendente: la classificazione corretta è `INSUFFICIENT_DATA`, anche se una metrica descrittiva fosse favorevole.",
    "",
    "| Famiglia | Gate | Motivo vincolante | Recuperabili ora |",
    "|---|---|---|---:|",
    ...targetFamilies.map(family => `| ${familyLabel(family)} | **INSUFFICIENT_DATA** | 50 < 100 cluster; 0 prospettici; 5 < 10 per squadra; input vintage parziale | 0 |`),
    "| Entrambe almeno X SOT | **INSUFFICIENT_DATA** | prodotto di marginali con indipendenza non validata | 0 |",
    "| Corner 1X2 T.R. | **INSUFFICIENT_DATA** | distribuzione discreta congiunta del differenziale assente | 0 |",
    "",
    "## 6. Simulazione diagnostica dei 110 B3",
    "",
    `Riconciliati: **${artifact.md6Simulation.reconciled110}/${artifact.md6Simulation.total110}**. Distribuzione marginale disponibile: **${artifact.md6Simulation.withDistribution}/${artifact.md6Simulation.total110}**. Inseriti nel catalogo: **${artifact.md6Simulation.inCatalog}**. Raccomandazioni generate: **0**.`,
    "",
    "| ID Sisal | Partita | Famiglia | Soglia | Quota | Media/SD | P centrale | P prudente | EV diagnostico | Gate |",
    "|---|---|---|---:|---:|---|---:|---:|---:|---|"
  );
  for (const row of artifact.md6Simulation.rows) lines.push(`| ${row.providerSelectionId} | ${row.fixture} | ${familyLabel(row.family)} | ${row.threshold} | ${formatNumber(row.odds, 2)} | ${row.distribution ? `${formatNumber(row.distribution.mean, 2)} / ${formatNumber(row.distribution.sd, 2)}` : "N/D"} | ${formatNumber(row.diagnostic?.centralProbability)} | ${formatNumber(row.diagnostic?.prudentProbability092)} | ${formatNumber(row.diagnostic?.expectedValuePctDiagnostic, 2)}% | ${row.gate} |`);
  lines.push(
    "",
    "Le probabilità e gli EV sopra riproducono la metodologia esistente solo a scopo diagnostico. Non sono stati serializzati nel catalogo e non costituiscono consigli di gioco.",
    "",
    "## 7. Distribuzioni congiunte/differenziali separate",
    "",
    `- **Entrambe almeno X SOT (15):** la funzione corrente calcola due marginali Normali con correzione di continuità 0,5, le moltiplica (indipendenza) e applica 0,90. Tutte le 15 sono simulate nel JSON, ma restano \`INSUFFICIENT_DATA\`: non c’è validazione della dipendenza congiunta.`,
    `- **Corner 1X2 T.R. (5):** nessuna probabilità diagnostica è calcolabile con la metodologia corrente. Servono distribuzione congiunta discreta e differenziale home-away, inclusa la massa del pareggio.`,
    "- **DUO:** esclusi integralmente dall’analisi, come richiesto.",
    "",
    "## 8. Numero recuperabile e fase successiva",
    "",
    "- Recuperabili in sicurezza adesso: **0/110**.",
    "- Tecnicamente simulabili ma non autorizzabili: **110/110**.",
    "- Congiunti SOT da mantenere separati: **15**; corner 1X2 senza distribuzione: **5**.",
    "- Fase successiva: congelare per ogni giornata pre-kickoff l’intera distribuzione volume (media, SD, intervalli, versione e hash); attendere almeno 100 gare concluse; valutare un holdout temporale senza rifit; solo dopo confrontare Normale, Poisson/Negative Binomial e modelli congiunti discreti. Nessun cambio formula prima del gate.",
    "",
    "## 9. Isolamento produzione",
    "",
    `File protetti verificati: **${artifact.productionIsolation.checkedFiles}**; hash cambiati: **${artifact.productionIsolation.changedFiles.length}**. Totali catalogo rimasti ${artifact.catalogInvariant.finalSelections}/${artifact.catalogInvariant.evaluated}/${artifact.catalogInvariant.notModelled}.`,
    ""
  );
  return lines.join("\n");
}

function main() {
  const before = captureProtected();
  const matches = readJson("data/normalized/matches.json");
  const results = readJson("data/sources/match-results-2026-27.json");
  const profiles = readJson("data/normalized/team-volume-profiles-2025-26.json");
  const predictions = readJson("data/normalized/predictions.json");
  const odds = readJson("data/normalized/odds/sisal/serie-a.json");
  const snapshots = readJson("data/predictions/snapshots/2026-27/md-06.json");
  const audit = readJson("output/reports/serie-a-md06-group-b-audit-2026-10-09.json");
  const schedina = readJson("data/normalized/schedina-md06.json");
  if (schedina.marketCatalog.totals.finalSelections !== 383 || schedina.marketCatalog.totals.evaluated !== 367 || schedina.marketCatalog.totals.notModelled !== 16) throw new Error("Unexpected MD6 catalog invariant");
  const reconstruction = reconstructAuthenticForecasts(matches, results);
  const observationBuild = buildMeanObservations(reconstruction.rows, profiles);
  const observations = observationBuild.families;
  const grids = thresholdGrid(audit);
  const validation = Object.fromEntries(targetFamilies.map(family => [family, summarizeFamily(family, observations[family], grids[family])]));
  const simulated = simulateMd6(audit, predictions, odds, schedina);
  const duplicates = reconstruction.rows.length - new Set(reconstruction.rows.map(row => row.matchId)).size;
  const invalidCommitTimestamps = reconstruction.rows.filter(row => new Date(row.committedAt) >= new Date(row.kickoffAt)).length;
  const preciseGeneratedAt = reconstruction.rows.filter(row => row.generatedAtPrecision === "TIMESTAMP").length;
  const invalidPreciseGeneratedAt = reconstruction.rows.filter(row => row.generatedAtPrecision === "TIMESTAMP" && new Date(row.generatedAt) >= new Date(row.kickoffAt)).length;
  const versionCounts = Object.entries(reconstruction.rows.reduce((acc, row) => (acc[row.engineVersion] = (acc[row.engineVersion] || 0) + 1, acc), {})).map(([version, matches]) => ({ version, matches }));
  const reconciled110 = simulated.simulations.filter(row => row.reconciliation.normalizationStatus === "VERIFIED_EXACT"
    && row.reconciliation.eventMatch && row.reconciliation.marketMatch && row.reconciliation.selectionMatch
    && row.reconciliation.oddsMatch && row.reconciliation.quoteStatus === "open").length;
  const isolation = assertProtectedUnchanged(before);
  const artifact = {
    schemaVersion: 1,
    phase: "5C",
    generatedAt: new Date().toISOString(),
    researchOnly: true,
    productionChangeAuthorized: false,
    conclusion: "NO_MODEL_CHANGE_YET — COLLECT_MORE_PROSPECTIVE_DATA",
    inventory: {
      completedMatchesWithActuals: reconstruction.targets,
      authenticPrematchForecasts: reconstruction.rows.length,
      generatedAtTimestampPrecision: preciseGeneratedAt,
      generatedAtDateOnlyPrecision: reconstruction.rows.length - preciseGeneratedAt,
      forecastCommitsRead: reconstruction.commitsRead,
      engineVersions: versionCounts,
      prospectiveSnapshots: snapshots.snapshots.length,
      prospectiveEvaluated: snapshots.snapshots.filter(snapshot => results.matches.some(result => result.matchId === snapshot.matchId && result.status === "finished")).length,
      baseline: { source: "data/normalized/team-volume-profiles-2025-26.json", season: profiles.season, teams: profiles.profiles.length, teamMatchValues: profiles.profiles.reduce((sum, profile) => sum + profile.matches, 0), pooledLeagueFallbackTeams: observationBuild.baselineFallbackTeams }
    },
    currentMethod: {
      source: "scripts/predictions/engine.js#configuredVolumeAssessment",
      marginalFormula: "1 - normalCdf((threshold - mean) / sd)",
      jointFormula: "product(1 - normalCdf((threshold - 0.5 - teamMean) / teamSd))",
      haircuts: { marginal: 0.92, joint: 0.90 },
      probabilityClamp: null,
      fairOddsFloor: 0.0001,
      variance: "match SD serializzato dalla somma di varianze squadra indipendenti",
      discreteCountLimitation: true,
      integerThresholdPushModelled: false,
      halfThresholdsInCurrent110: true
    },
    authenticForecasts: reconstruction.rows.map(({ prediction, actual, ...row }) => ({ ...row, forecast: { matchProjection: prediction.matchProjection, teamProjections: prediction.teamProjections }, observed: { home: { shotsOnTarget: actual.teamStats.home.shotsOnTarget, corners: actual.teamStats.home.corners }, away: { shotsOnTarget: actual.teamStats.away.shotsOnTarget, corners: actual.teamStats.away.corners } } })),
    antiLeakage: {
      forecasts: reconstruction.rows.length,
      timestampVerifiedViaCommit: reconstruction.rows.length - invalidCommitTimestamps,
      invalidCommitTimestamps,
      generatedAtTimestampPrecision: preciseGeneratedAt,
      generatedAtDateOnlyPrecision: reconstruction.rows.length - preciseGeneratedAt,
      invalidPreciseGeneratedAt,
      duplicateForecasts: duplicates,
      trainingTestSeparation: "BASELINE_2025_26_PRECEDES_TEST_2026_27_MD1_MD5",
      currentEngineEvaluation: "RETROSPECTIVE_AUTHENTIC_FORECAST_ARTIFACTS_MULTIPLE_ENGINE_VERSIONS",
      independentTemporalHoldout: false,
      completeInputVintageEvidence: false,
      thresholdGridUsesTargetOutcomes: false,
      fittedOnEvaluationSample: false
    },
    gateDefinition: gateDefinition(),
    validation,
    md6Simulation: {
      sourceAudit: "output/reports/serie-a-md06-group-b-audit-2026-10-09.json",
      total110: simulated.simulations.length,
      reconciled110,
      withDistribution: simulated.simulations.filter(row => row.distribution && row.diagnostic).length,
      inCatalog: simulated.simulations.filter(row => row.currentCatalogContainsSelection).length,
      recoverableNow: 0,
      potentiallyRecoverableAfterIndependentGate: simulated.simulations.length,
      rows: simulated.simulations
    },
    separateFamilies: {
      bothTeamsSot: { count: simulated.joint.length, gate: "INSUFFICIENT_DATA", rows: simulated.joint },
      corner1x2Fulltime: { count: simulated.corner1x2.length, gate: "INSUFFICIENT_DATA", rows: simulated.corner1x2 },
      duo: { analyzed: false, count: 0, reason: "EXCLUDED_BY_PHASE_5C_SCOPE" }
    },
    catalogInvariant: { finalSelections: 383, evaluated: 367, notModelled: 16 },
    productionIsolation: isolation,
    recommendations: [
      "Freeze full pre-kickoff volume distributions and hashes for every matchday.",
      "Collect at least 100 completed independent match clusters and at least 10 observations per team.",
      "Use a prespecified temporal holdout; do not tune and certify on the same sample.",
      "Compare Normal with discrete Poisson/Negative-Binomial candidates only in a later research phase.",
      "Build and validate a joint bivariate/discrete difference model before both-team or corner-1X2 use."
    ]
  };
  fs.mkdirSync(path.dirname(path.join(root, analysisPath)), { recursive: true });
  fs.mkdirSync(path.dirname(path.join(root, reportPath)), { recursive: true });
  fs.writeFileSync(path.join(root, analysisPath), `${JSON.stringify(artifact, null, 2)}\n`);
  fs.writeFileSync(path.join(root, reportPath), formatReport(artifact));
  assertProtectedUnchanged(before);
  console.log(JSON.stringify({ authenticPrematchForecasts: artifact.inventory.authenticPrematchForecasts, prospectiveEvaluated: artifact.inventory.prospectiveEvaluated, simulations: artifact.md6Simulation.total110, reconciled: artifact.md6Simulation.reconciled110, recoverableNow: 0, gates: Object.fromEntries(targetFamilies.map(family => [family, artifact.validation[family].gate])), productionChangedFiles: 0 }));
}

if (require.main === module) main();
module.exports = { normalCdf, normalOverProbability, meanMetrics, probabilityMetrics, gateDefinition, formatReport };
