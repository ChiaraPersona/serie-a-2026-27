"use strict";
const { independentPoissonScoreMatrix, deriveMarkets, distributionDiagnostics } = require("./distribution");
const { assertResearchState } = require("./contracts");
const value = (vector, key) => vector.features[key]?.value ?? null;

function registry(createdAt, configuration = {}) {
  return {
    schemaVersion: 1, createdAt, ladder: ["M0 League Average", "M1 Goals", "M2 xG", "M3 xG + shots/SOT process", "M4 advanced future candidate"],
    models: [
      ["league-poisson-r0", "LEAGUE_AVERAGE_BASELINE", ["GOAL_HISTORY", "HOME_AWAY"], "EXECUTABLE", "As-of league venue means; historical league fallback for opening round; no tuned coefficients"],
      ["goals-poisson-r0", "TEAM_GOALS_BASELINE", ["GOAL_HISTORY", "HOME_AWAY", "MATURITY"], configuration.priorEquivalentMatches != null ? "EXECUTABLE_EXPLICIT_RESEARCH_CONFIGURATION" : "AWAITING_RESEARCH_CONFIGURATION", "Multiplicative attack x opposing defense; explicit shrinkage required, not optimized or validated"],
      ["xg-poisson-r0", "XG_BASELINE", ["XG_PROCESS", "HOME_AWAY", "MATURITY"], configuration.priorEquivalentMatches != null && configuration.minimumXGCoverage != null ? "EXECUTABLE_EXPLICIT_RESEARCH_CONFIGURATION" : "AWAITING_RESEARCH_CONFIGURATION", "Explicit xG coverage/shrinkage policy required; unavailable xG never replaced by goals"],
      ["process-poisson-r0", "PROCESS_BASELINE", ["GOAL_HISTORY", "XG_PROCESS", "SHOT_PROCESS", "SOT_PROCESS", "CHANCE_QUALITY", "DEFENSIVE_SUPPRESSION", "MATCHUP"], "INTERFACE_ONLY", "Layer B awaits temporal ablation; no final coefficients"]
    ].map(([id, name, featureGroups, implementationStatus, notes]) => ({ id, name, version: "r0.1", featureGroups, distribution: "INDEPENDENT_POISSON", fitted: false, state: "RESEARCH", research: true, production: false, createdAt, trainingCutoff: null, training: null, implementationStatus, configuration, notes })),
    dependencyCandidates: ["DIXON_COLES", "BIVARIATE_POISSON", "NEGATIVE_BINOMIAL"].map(id => ({ id, state: "RESEARCH", status: "FUTURE_ONLY", fitted: false, training: null })),
    promotionRequirements: ["valid walk-forward", "no leakage", "sufficient temporal sample", "better than naive baseline OOS", "calibrated 1X2", "acceptable goal MAE", "score-distribution improvement", "no severe consistency failure", "separate human decision"],
    promotionDisabled: true, thresholds: null
  };
}

function shrink(current, n, prior, priorEquivalentMatches) {
  if (!Number.isFinite(prior) || !Number.isFinite(n) || n < 0 || !(priorEquivalentMatches > 0) || !Number.isFinite(priorEquivalentMatches)) throw new Error("Explicit positive research shrinkage policy required");
  if (current == null || !n) return prior;
  return (current * n + prior * priorEquivalentMatches) / (n + priorEquivalentMatches);
}

function buildPrediction(model, vector, lambdaHome, lambdaAway, diagnostics) {
  if (![lambdaHome, lambdaAway].every(v => Number.isFinite(v) && v >= 0)) return null;
  const scoreMatrix = independentPoissonScoreMatrix(lambdaHome, lambdaAway);
  const markets = deriveMarkets(scoreMatrix);
  return { modelId: model.id, modelVersion: model.version, state: "RESEARCH", generationClass: vector.generationClass, matchId: vector.matchId, targetMatchday: vector.targetMatchday, dataCutoff: vector.dataCutoff,
    lambdaHome, lambdaAway, scoreMatrix, outcomeProbabilities: markets.outcomes, btts: markets.btts, overUnder: markets.overUnder,
    diagnostics: { ...diagnostics, ...distributionDiagnostics(scoreMatrix), matrixTailMass: scoreMatrix.tailMass, rawXGIsLambda: false, conditionalIndependenceAssumed: true, assumptionValidated: false } };
}

function createModel(model, configuration = {}, gate = "INSUFFICIENT") {
  assertResearchState(model, gate);
  return { modelId: model.id, modelVersion: model.version, predictMatch(vector) {
    if (vector.scenario !== "PREDICTED PROCESS" || vector.predictionEligible !== true || vector.counterfactual) throw new Error("Oracle input cannot enter pre-match prediction interface");
    const league = (side, xg = false) => {
      const key = side === "home" ? "Home" : "Away";
      return value(vector, `league.${side}${xg ? "XG" : "Goals"}Average`) ?? (xg ? null : value(vector, `league.historical${key}GoalsAverage`));
    };
    const lh = league("home"), la = league("away");
    const diagnostics = { label: vector.generationClass === "RETROSPECTIVE" ? "RETROSPECTIVE RESEARCH ONLY" : "PROSPECTIVE RESEARCH ONLY", configuration, training: null, priorPolicy: "Historical Serie A venue prior; promoted/no-Serie-A-history falls back explicitly to league", layers: { goalStrength: null, processAdjustment: "NOT_APPLIED", goalDistribution: "INDEPENDENT_POISSON" } };
    if (model.name === "LEAGUE_AVERAGE_BASELINE") return buildPrediction(model, vector, lh, la, { ...diagnostics, leagueFallbackUsed: value(vector, "league.currentMatches") === 0, layers: { ...diagnostics.layers, goalStrength: { leagueHome: lh, leagueAway: la, homeAttackStrength: 1, awayAttackStrength: 1, homeDefensiveStrength: 1, awayDefensiveStrength: 1 } } });
    if (model.name === "PROCESS_BASELINE") return null;
    if (!(configuration.priorEquivalentMatches > 0)) return null;
    const xg = model.name === "XG_BASELINE";
    const baseH = xg ? league("home", true) : lh, baseA = xg ? league("away", true) : la;
    if (!(baseH > 0) || !(baseA > 0)) return null;
    if (xg && (!(configuration.minimumXGCoverage > 0 && configuration.minimumXGCoverage <= 1) || ["home", "away"].some(side => ["venueXgCoverage", "venueXgaCoverage"].some(name => (value(vector, `${side}.${name}`) ?? -1) < configuration.minimumXGCoverage)))) return null;
    const strength = (side, attack) => {
      const base = (side === "home") === attack ? baseH : baseA;
      const key = `${side}.${xg ? (attack ? "venueXGF" : "venueXGA") : (attack ? "venueGoalsFor" : "venueGoalsAgainst")}`;
      const prior = xg ? base : value(vector, `${side}.historicalVenueGoals${attack ? "For" : "Against"}`) ?? base;
      const n = vector.features[key].provenance.sample;
      return shrink(value(vector, key), n, prior, configuration.priorEquivalentMatches) / base;
    };
    const homeAttackStrength = strength("home", true), awayAttackStrength = strength("away", true), homeDefensiveStrength = strength("home", false), awayDefensiveStrength = strength("away", false);
    // Explicit experimental multiplicative interaction, never an unvalidated arithmetic average.
    return buildPrediction(model, vector, baseH * homeAttackStrength * awayDefensiveStrength, baseA * awayAttackStrength * homeDefensiveStrength,
      { ...diagnostics, xgAsFeature: xg, layers: { ...diagnostics.layers, goalStrength: { leagueHome: baseH, leagueAway: baseA, homeAttackStrength, awayAttackStrength, homeDefensiveStrength, awayDefensiveStrength } } });
  } };
}

function futureDependencyDistribution() { throw new Error("Dependency model FUTURE_ONLY: requires separate fitting and out-of-sample validation"); }
function processAdjustment() { return { status: "INTERFACE_ONLY", lambdaHomeAdjustment: null, lambdaAwayAdjustment: null, coefficients: null, training: null }; }
module.exports = { registry, createModel, shrink, futureDependencyDistribution, processAdjustment };
