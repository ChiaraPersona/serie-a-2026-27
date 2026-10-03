"use strict";

// Prespecified before looking at M1/M2 results. These are experimental research policies.
const BASELINE_RESEARCH_CONFIG = Object.freeze({
  id: "goals-xg-hierarchical-r1", status: "EXPERIMENTAL", version: "r1.0",
  priorEquivalentMatches: 12, minimumXGCoverage: 1,
  hierarchy: "HISTORICAL_VENUE_OR_LEAGUE -> NON_VENUE_CURRENT -> VENUE_CURRENT",
  shrinkagePrincipleSource: "scripts/build-team-matchup-profiles.js: shrink / data/sources/team-matchup-profiles-2026-27.json: methodology.priorEquivalentMatches=12",
  shrinkageRationale: "Reuse n/(n+12) pseudo-count principle, without importing or changing production. Apply separately to disjoint non-venue and venue observations; no duplicated current matches.",
  lastNForm: false, finishingAdjustment: false, goalkeepingAdjustment: false, parameterSearch: false,
  bootstrap: { iterations: 4000, seed: 20261003, familyAlpha: 0.05, primaryMetricCount: 4, comparisonCount: 3, minimumMatchClusters: 2, minimumMatchdayClusters: 2 },
  diagnostics: { extremeLambdaLow: 0.25, extremeLambdaHigh: 4, largeDisagreementLambda: 0.5, largeDisagreementOutcome: 0.15, largeResidualGoalsPerMatch: 0.5, minimumTeamMatches: 10, calibrationMinimumBinCount: 10 },
  leader: { rule: "PRESPECIFIED_WEIGHTED_ORDINAL_RANKS", priorities: { scoreLogLoss: 5, oneXtwoRPS: 4, meanGoalMAE: 3, topCoverage: 2, calibrationECE: 1 }, qualifier: "NOT VALIDATED PROSPECTIVELY", exactHitUsed: false },
  inferenceRule: "BETTER/WORSE require family-adjusted paired intervals to agree for score LogLoss, RPS and mean goal MAE; mixed or zero-crossing intervals are INSUFFICIENT. SIMILAR only for identical primary per-match contributions; no equivalence margin inferred.",
  sensitivity: { enabled: false, reason: "No parameter search or full-sample policy selection" },
  complexity: { fittedCoefficients: 0, shrinkageHyperparameters: 1, coveragePolicies: 1, individualOrTeamOverrides: 0 }
});

function studyConfiguration(overrides = {}) {
  const config = structuredClone(BASELINE_RESEARCH_CONFIG);
  for (const name of ["priorEquivalentMatches", "minimumXGCoverage"]) if (overrides[name] != null) config[name] = overrides[name];
  if (!(config.priorEquivalentMatches > 0) || !Number.isFinite(config.priorEquivalentMatches) || !(config.minimumXGCoverage > 0 && config.minimumXGCoverage <= 1)) throw new Error("Invalid experimental research policy");
  config.callerOverrides = Object.keys(overrides).filter(key => ["priorEquivalentMatches", "minimumXGCoverage"].includes(key));
  return config;
}
module.exports = { BASELINE_RESEARCH_CONFIG, studyConfiguration };
