"use strict";

const FEATURE_GROUPS = ["GOAL_HISTORY", "XG_PROCESS", "SHOT_PROCESS", "SOT_PROCESS", "CHANCE_QUALITY", "DEFENSIVE_SUPPRESSION", "HOME_AWAY", "MATURITY", "MATCHUP"];
const PROMOTION_STATES = ["RESEARCH", "SHADOW", "CANDIDATE", "PRODUCTION"];
const ERROR_COMPONENTS = ["GOAL_STRENGTH_ERROR", "TEAM_PROCESS_ERROR", "GOAL_CONVERSION_ERROR", "DISTRIBUTION_ERROR", "DEPENDENCE_ERROR"];
const SIDES = {
  goalsFor: "GOAL_HISTORY", goalsAgainst: "GOAL_HISTORY", failedToScoreRate: "GOAL_HISTORY", cleanSheetRate: "GOAL_HISTORY", bttsRate: "GOAL_HISTORY", over15Rate: "GOAL_HISTORY", over25Rate: "GOAL_HISTORY", over35Rate: "GOAL_HISTORY",
  historicalGoalsFor: "GOAL_HISTORY", historicalGoalsAgainst: "GOAL_HISTORY", venueGoalsFor: "HOME_AWAY", venueGoalsAgainst: "HOME_AWAY", historicalVenueGoalsFor: "HOME_AWAY", historicalVenueGoalsAgainst: "HOME_AWAY",
  currentXGF: "XG_PROCESS", currentXGA: "XG_PROCESS", venueXGF: "XG_PROCESS", venueXGA: "XG_PROCESS", historicalXGF: "XG_PROCESS", historicalXGA: "XG_PROCESS", historicalVenueXGF: "XG_PROCESS", historicalVenueXGA: "XG_PROCESS",
  baselineShots: "SHOT_PROCESS", shotsAllowed: "SHOT_PROCESS", predictedTeamShots: "SHOT_PROCESS", baselineSOT: "SOT_PROCESS", sotAllowed: "SOT_PROCESS", predictedTeamSOT: "SOT_PROCESS",
  xGPerShot: "CHANCE_QUALITY", xGAllowedPerShot: "CHANCE_QUALITY", shotQuality: "CHANCE_QUALITY", finishingResidual: "CHANCE_QUALITY", goalkeepingResidual: "CHANCE_QUALITY",
  shotSuppression: "DEFENSIVE_SUPPRESSION", shotVulnerability: "DEFENSIVE_SUPPRESSION", sotSuppression: "DEFENSIVE_SUPPRESSION", sotVulnerability: "DEFENSIVE_SUPPRESSION", chanceQualitySuppression: "DEFENSIVE_SUPPRESSION", chanceQualityVulnerability: "DEFENSIVE_SUPPRESSION",
  ownShotAdjustmentPct: "MATCHUP", ownSotAdjustmentPct: "MATCHUP", opponentShotAdjustmentPct: "MATCHUP", opponentSotAdjustmentPct: "MATCHUP",
  isHome: "HOME_AWAY", currentMatches: "MATURITY", venueMatches: "MATURITY", xgCoverage: "MATURITY", xgaCoverage: "MATURITY", venueXgCoverage: "MATURITY", venueXgaCoverage: "MATURITY", sampleMaturity: "MATURITY", offensiveMaturity: "MATURITY", defensiveMaturity: "MATURITY", historicalWeight: "MATURITY", currentWeight: "MATURITY"
};
const FEATURE_DEFINITIONS = {
  ...Object.fromEntries(["home", "away"].flatMap(side => Object.entries(SIDES).map(([name, group]) => [`${side}.${name}`, { group, type: "number|null" }]))),
  ...Object.fromEntries(Object.entries({ homeGoalsAverage: "GOAL_HISTORY", awayGoalsAverage: "GOAL_HISTORY", totalGoalsAverage: "GOAL_HISTORY", homeAdvantage: "HOME_AWAY", homeXGAverage: "XG_PROCESS", awayXGAverage: "XG_PROCESS", currentMatches: "MATURITY", historicalHomeGoalsAverage: "GOAL_HISTORY", historicalAwayGoalsAverage: "GOAL_HISTORY", historicalHomeXGAverage: "XG_PROCESS", historicalAwayXGAverage: "XG_PROCESS" }).map(([name, group]) => [`league.${name}`, { group, type: "number|null" }])),
  "context.matchday": { group: "HOME_AWAY", type: "number|null" }
};

function validateFeatureVector(vector, matches) {
  if (vector.schemaVersion !== 1 || !["PROSPECTIVE", "RETROSPECTIVE"].includes(vector.generationClass)) throw new Error("Invalid feature schema or generation class");
  const cutoff = vector.dataCutoff;
  if (cutoff?.matchdayExclusive !== vector.targetMatchday || cutoff?.targetMatchIdExcluded !== vector.matchId || cutoff?.completedOnly !== true || !Number.isFinite(Date.parse(cutoff?.effectiveDateExclusive))) throw new Error("Invalid target cutoff");
  const byId = new Map(matches.map(match => [match.id, match]));
  const target = byId.get(vector.matchId);
  if (!target || target.matchday !== vector.targetMatchday || target.homeTeam !== vector.homeTeam || target.awayTeam !== vector.awayTeam || target.competition !== "serie-a" || target.season !== "2026-27" || !Number.isInteger(vector.targetMatchday) || vector.targetMatchday < 1 || vector.retrospective !== (vector.generationClass === "RETROSPECTIVE") || vector.scenario !== "PREDICTED PROCESS" || vector.predictionEligible !== true || vector.counterfactual) throw new Error("Invalid canonical feature identity, generation class or scenario");
  if (Object.keys(vector.features).length !== Object.keys(FEATURE_DEFINITIONS).length) throw new Error("Incomplete feature contract");
  for (const [key, definition] of Object.entries(FEATURE_DEFINITIONS)) {
    const feature = vector.features[key];
    if (!feature || feature.group !== definition.group || (feature.value !== null && !Number.isFinite(feature.value))) throw new Error(`Invalid feature ${key}`);
    const p = feature.provenance;
    if (!p?.source || !p.sourceHash || JSON.stringify(p.cutoff) !== JSON.stringify(cutoff) || !["CURRENT", "HISTORICAL", "MIXED", "CONTEXT", "UNAVAILABLE"].includes(p.period) || !["OBSERVED", "PREDICTED", "CONTEXT", "UNAVAILABLE"].includes(p.kind) || !["AVAILABLE", "UNAVAILABLE"].includes(p.availability) || !Number.isInteger(p.sample) || p.sample < 0 || !Array.isArray(p.matchesUsed) || new Set(p.matchesUsed).size !== p.matchesUsed.length) throw new Error(`Invalid provenance ${key}`);
    if ((feature.value === null) !== (p.availability === "UNAVAILABLE")) throw new Error(`Missing is not zero: ${key}`);
    if (p.availableBefore != null && (!Number.isFinite(Date.parse(p.availableBefore)) || Date.parse(p.availableBefore) >= Date.parse(cutoff.effectiveDateExclusive))) throw new Error(`Source timestamp leakage: ${key}`);
    for (const id of p.matchesUsed || []) {
      const match = byId.get(id);
      if (!match || id === vector.matchId || match.matchday >= cutoff.matchdayExclusive || match.status !== "finished" || match.competition !== "serie-a" || match.season !== "2026-27" || !match.date || Date.parse(`${match.date}T23:59:59Z`) >= Date.parse(cutoff.effectiveDateExclusive)) throw new Error(`Target/future/source leakage: ${key}:${id}`);
    }
    if (p.period === "HISTORICAL" && (p.season !== "2025-26" || p.competition !== "serie-a")) throw new Error(`Cross-competition prior cannot be treated as Serie A: ${key}`);
    if (p.historicalMatchesUsed && (p.period !== "HISTORICAL" || !Array.isArray(p.historicalMatchesUsed) || p.historicalMatchesUsed.length !== p.sample || new Set(p.historicalMatchesUsed).size !== p.historicalMatchesUsed.length)) throw new Error(`Invalid historical match provenance: ${key}`);
  }
  const encoded = JSON.stringify(vector.features);
  if (/playerId|expectedMinutes|sisal|sportium|bookmaker|impliedProbability|actualHomeGoals|actualAwayGoals/i.test(encoded)) throw new Error("Forbidden player, quote, or actual feature");
  return true;
}

function assertTrainingBoundary(training, target, matches) {
  if (!training || !Array.isArray(training.matchIds) || !Array.isArray(training.matchdays) || training.matchIds.length !== training.matchdays.length || !training.matchIds.length || !training.featureSet?.length || !training.objective || !Number.isFinite(Date.parse(training.cutoff))) throw new Error("Incomplete learned-parameter provenance");
  if (new Set(training.matchIds).size !== training.matchIds.length || training.matchIds.includes(target.matchId) || training.matchdays.some(md => !Number.isInteger(md) || md < 1 || md >= target.targetMatchday) || training.firstMD !== Math.min(...training.matchdays) || training.lastMD !== Math.max(...training.matchdays) || Date.parse(training.cutoff) >= Date.parse(target.dataCutoff.effectiveDateExclusive)) throw new Error("Training target/future leakage");
  if (!Array.isArray(matches)) throw new Error("Canonical training matches required to verify learned-parameter provenance");
  const byId = new Map(matches.map(match => [match.id, match]));
  training.matchIds.forEach((id, index) => {
    const row = byId.get(id);
    if (!row || row.matchday !== training.matchdays[index] || row.status !== "finished" || row.competition !== "serie-a" || row.season !== "2026-27" || row.resultCoverage?.awarded || !row.date || Date.parse(`${row.date}T23:59:59Z`) >= Date.parse(training.cutoff)) throw new Error("Training match provenance/date leakage");
  });
  return true;
}

function assertResearchState(model, gate) {
  if (model.state !== "RESEARCH" || model.production !== false) throw new Error("Promotion prohibited in this framework phase");
  if (!["INSUFFICIENT", "COLLECTING", "READY_FOR_BASELINE_MODEL"].includes(gate)) throw new Error("Unknown exact-score data gate");
  return true;
}

function oracleTeamProcess(vector, actual, { offline = false } = {}) {
  if (!offline || vector.generationClass !== "RETROSPECTIVE") throw new Error("Oracle process allowed only in retrospective offline research");
  const copy = structuredClone(vector);
  copy.scenario = "ORACLE TEAM PROCESS";
  copy.predictionEligible = false;
  // Kept outside normal feature contract so it cannot enter a real predictMatch call.
  copy.counterfactual = { source: "TARGET_ACTUAL_OFFLINE_ONLY", homeShots: actual.homeShots ?? null, awayShots: actual.awayShots ?? null, homeSOT: actual.homeSOT ?? null, awaySOT: actual.awaySOT ?? null };
  return copy;
}

function ablateFeatureGroups(vector, groups) {
  if (!Array.isArray(groups) || groups.some(group => !FEATURE_GROUPS.includes(group))) throw new Error("Unknown ablation feature group");
  const copy = structuredClone(vector), selected = new Set(groups);
  for (const feature of Object.values(copy.features)) if (!selected.has(feature.group)) {
    feature.value = null;
    feature.provenance.availability = "UNAVAILABLE";
    feature.provenance.note = `${feature.provenance.note || ""}; ABLATION_MASKED`.replace(/^; /, "");
  }
  copy.diagnostics.ablation = { includedGroups: groups, sourceVectorUnchanged: true };
  return copy;
}

module.exports = { FEATURE_GROUPS, FEATURE_DEFINITIONS, PROMOTION_STATES, ERROR_COMPONENTS, validateFeatureVector, assertTrainingBoundary, assertResearchState, oracleTeamProcess, ablateFeatureGroups };
