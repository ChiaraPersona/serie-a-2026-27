/** Offline research only. All model inputs are team-level; raw observed xG is not lambda. */
export type GenerationClass = "PROSPECTIVE" | "RETROSPECTIVE";
export type FeatureGroup = "GOAL_HISTORY" | "XG_PROCESS" | "SHOT_PROCESS" | "SOT_PROCESS" | "CHANCE_QUALITY" | "DEFENSIVE_SUPPRESSION" | "HOME_AWAY" | "MATURITY" | "MATCHUP";
export interface DataCutoff { mode: "asOfMatchday"; matchdayExclusive: number; targetMatchIdExcluded: string; completedOnly: true; effectiveDateExclusive: string }
export interface FeatureProvenance {
  source: string; sourceHash: string; cutoff: DataCutoff;
  period: "CURRENT" | "HISTORICAL" | "MIXED" | "CONTEXT" | "UNAVAILABLE";
  kind: "OBSERVED" | "PREDICTED" | "CONTEXT" | "UNAVAILABLE";
  availability: "AVAILABLE" | "UNAVAILABLE"; matchesUsed: string[]; sample: number;
  availableBefore: string | null; competition: string | null; season: string | null; note: string | null;
}
export interface ExactScoreFeatureVector {
  schemaVersion: 1; matchId: string; homeTeam: string; awayTeam: string; targetMatchday: number;
  generationClass: GenerationClass; retrospective: boolean; dataCutoff: DataCutoff;
  scenario: "PREDICTED PROCESS"; predictionEligible: true;
  features: Record<string, { value: number | null; group: FeatureGroup; provenance: FeatureProvenance }>;
  diagnostics: { promotedTeams: string[]; historicalCompetitionPolicy: string; warnings: string[] };
}
export interface TrainingProvenance { matchIds: string[]; matchdays: number[]; firstMD: number; lastMD: number; cutoff: string; featureSet: string[]; objective: string }
export interface GoalStrengthLayer {
  leagueEnvironment: { homeGoalsAverage: number | null; awayGoalsAverage: number | null; homeAdvantage: number | null };
  homeAttackStrength: number | null; awayAttackStrength: number | null;
  homeDefensiveStrength: number | null; awayDefensiveStrength: number | null;
  priorPolicy: { priorEquivalentMatches: number | null; promotedFallback: string; historicalCompetition: string | null };
}
export interface ProcessAdjustmentLayer { lambdaHomeBefore: number; lambdaAwayBefore: number; lambdaHomeAfter: number | null; lambdaAwayAfter: number | null; featureGroups: FeatureGroup[]; ablationId: string; coefficients: null | Record<string, number>; training: TrainingProvenance | null }
export interface ScoreMatrix { cells: number[][]; maxHomeGoals: number; maxAwayGoals: number; representedMass: number; tailMass: number; tailBound: number; distribution: string }
export interface ResearchPrediction { lambdaHome: number; lambdaAway: number; scoreMatrix: ScoreMatrix; outcomeProbabilities: { home: number; draw: number; away: number }; diagnostics: object; modelId: string; modelVersion: string; state: "RESEARCH" }
export interface ResearchModel { modelId: string; modelVersion: string; predictMatch(features: ExactScoreFeatureVector): ResearchPrediction | null }
export interface DependencyDistributionCandidate { id: "DIXON_COLES" | "BIVARIATE_POISSON" | "NEGATIVE_BINOMIAL"; status: "FUTURE_ONLY"; transform(lambdaHome: number, lambdaAway: number, training: TrainingProvenance): ScoreMatrix }
export interface ErrorDecomposition { matchId: string; goalStrengthError: number | null; teamProcessError: number | null; goalConversionError: number | null; distributionError: number | null; dependenceError: number | null; identifiability: string }
export interface OracleProcessScenario { scenario: "ORACLE TEAM PROCESS"; predictionEligible: false; generationClass: "RETROSPECTIVE"; counterfactual: { source: "TARGET_ACTUAL_OFFLINE_ONLY"; homeShots: number | null; awayShots: number | null; homeSOT: number | null; awaySOT: number | null } }
