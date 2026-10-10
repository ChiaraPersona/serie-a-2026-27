"use strict";

const { pairRelation } = require("./md06-scenario-coherence");

const FAMILY_ORDER = Object.freeze(["shots", "sot", "corners", "cards", "goals-results", "other"]);
const FAMILY_LABELS = Object.freeze({ shots: "Tiri totali", sot: "Tiri in porta", corners: "Corner", cards: "Cartellini", "goals-results": "Gol e risultati", other: "Altri mercati autorizzati" });
const RELIABILITY_RANK = Object.freeze({ Alta: 3, Media: 2, Bassa: 1 });
const finite = value => value !== null && value !== undefined && value !== "" && Number.isFinite(Number(value));
const upper = value => String(value || "").trim().toUpperCase().replace(/\s+/g, " ");

function suggestedFamily(leg) {
  const descriptor = upper(`${leg.marketFamily || ""} ${leg.market || ""} ${leg.variant || ""}`);
  if (descriptor.includes("TIRI IN PORTA")) return "sot";
  if (descriptor.includes("TIRI TOTALI")) return "shots";
  if (descriptor.includes("CORNER") || descriptor.includes("ANGOLO")) return "corners";
  if (descriptor.includes("CARTELL") || descriptor.includes("AMMON")) return "cards";
  if (/ESITO|DRAW NO BET|UNDER\/OVER|GOL\/NO GOL|GOL SQUADRA|MULTIGOAL|MULTIGOL|GOALS/.test(descriptor)) return "goals-results";
  return "other";
}

function verifiedQuote(leg) {
  const contract = leg?.betSelection, quote = contract?.quote || {};
  return contract?.selectionId === leg?.selectionId
    && contract?.identity?.status === "VERIFIED_PROVIDER_IDS"
    && Boolean(contract.identity.providerMarketId) && Boolean(contract.identity.providerSelectionId)
    && finite(quote.decimal) && Number(quote.decimal) >= 1
    && Boolean(quote.verifiedAt) && Boolean(quote.source?.provider)
    && quote.availability === "AVAILABLE_AT_SNAPSHOT";
}

function modelTarget(leg) {
  return String(leg?.betSelection?.compatibility?.modelTarget || leg?.betSelection?.evaluation?.provenance?.modelTarget || "");
}

function conservativeExpectedValuePct(leg) {
  const evaluation = leg?.betSelection?.evaluation || {};
  if (finite(evaluation.conservativeExpectedValuePct)) return Number(evaluation.conservativeExpectedValuePct);
  if (evaluation.probabilitySemantics !== "ABSOLUTE_EVENT" || !finite(evaluation.prudentProbabilityPct) || !finite(leg?.betSelection?.quote?.decimal)) return null;
  return Number(((Number(evaluation.prudentProbabilityPct) / 100 * Number(leg.betSelection.quote.decimal) - 1) * 100).toFixed(1));
}

function settlementIsSupported(leg) {
  const evaluation = leg?.betSelection?.evaluation || {};
  if (evaluation.probabilitySemantics === "ABSOLUTE_EVENT") return true;
  return evaluation.probabilitySemantics === "CONDITIONAL_ON_NO_DRAW"
    && evaluation.settlement?.type === "PUSH_ON_OUTCOME"
    && evaluation.expectedValueBasis === "P_WIN_TIMES_DECIMAL_ODDS_PLUS_P_PUSH_MINUS_ONE"
    && finite(evaluation.prudentProbabilityPct);
}

function canonicalEntity(leg) {
  const target = modelTarget(leg).toLowerCase();
  const descriptor = `${target} ${String(leg.variant || "").toLowerCase()}`;
  if (/score\.home|team-goal.*home|squadra 1/.test(descriptor)) return "home";
  if (/score\.away|team-goal.*away|squadra 2/.test(descriptor)) return "away";
  return String(leg?.lineupEligibility?.playerId || leg?.playerId || leg?.playerName || "match").toLowerCase();
}

function canonicalThresholdIdentity(leg) {
  const target = modelTarget(leg).toLowerCase(), family = suggestedFamily(leg), entity = canonicalEntity(leg);
  if (/^(goals:over:|score\.total\.gt:)/.test(target)) return "goals:match:over";
  if (/^score\.(home|away)\.gt:/.test(target)) return `goals:${entity}:over`;
  if (/^score\.total\.inclusive:/.test(target)) return "goals:match:range";
  if (/^score\.(home|away)\.inclusive:/.test(target)) return `goals:${entity}:range`;
  const hasThreshold = leg.threshold !== null && leg.threshold !== undefined && leg.threshold !== "";
  if (!hasThreshold && !/^\d+(?:[.,]\d+)?\s*[-+]\s*\d*/.test(String(leg.selection || ""))) return null;
  const direction = /UNDER|MENO DI/.test(upper(`${leg.selection} ${leg.label}`)) ? "under" : /OVER|ALMENO|\+/.test(upper(`${leg.selection} ${leg.label}`)) ? "over" : "threshold";
  const scope = String(leg.marketScope || "match").toLowerCase();
  return `${family}:${scope}:${entity}:${direction}:${upper(leg.marketFamily || leg.market)}`;
}

function resultThesisIdentity(leg) {
  const target = modelTarget(leg).toLowerCase();
  if (!/(^1x2:|^draw-no-bet:|^double-chance:)/.test(target)) return null;
  const outcome = upper(leg.selection);
  if (outcome === "1" || outcome === "1X") return "result:home";
  if (outcome === "2" || outcome === "X2") return "result:away";
  if (outcome === "X") return "result:draw";
  return `result:${outcome}`;
}

function minimumSportsSupportPct(leg) {
  if (leg?.scenarioAnalysis?.classification === "COHERENT_WITH_PREVALENT") return 0;
  const family = suggestedFamily(leg);
  const identity = canonicalThresholdIdentity(leg) || "";
  const reliability = leg?.betSelection?.operational?.reliability?.level;
  let minimum = 45;
  if (["shots", "sot", "corners"].includes(family) && !identity) minimum = 38;
  else if (identity.endsWith(":range")) minimum = 55;
  else if (identity.endsWith(":over")) minimum = family === "goals-results" ? 50 : 45;
  if (reliability === "Bassa") minimum += 5;
  return minimum;
}

function assessSuggestion(leg) {
  const reasons = [], evaluation = leg?.betSelection?.evaluation || {};
  const reliability = leg?.betSelection?.operational?.reliability?.level;
  const scenario = leg?.scenarioAnalysis || {}, family = suggestedFamily(leg);
  const statisticalFamily = ["shots", "sot", "corners", "cards"].includes(family);
  const validatedStatisticalModel = statisticalFamily && evaluation.kind === "DISCRETE_COUNT_TEMPORAL_HOLDOUT";
  const conservativeEv = conservativeExpectedValuePct(leg);
  if (!verifiedQuote(leg)) reasons.push("QUOTE_NOT_VERIFIED_AT_SNAPSHOT");
  if (evaluation.status === "NOT_MODELLED" || !finite(evaluation.modelProbabilityPct)) reasons.push("NOT_MODELLED");
  if (!finite(evaluation.prudentProbabilityPct)) reasons.push("ROBUST_PROBABILITY_NOT_AVAILABLE");
  if (!Object.hasOwn(RELIABILITY_RANK, reliability)) reasons.push("RELIABILITY_NOT_ASSESSED");
  if (!settlementIsSupported(leg)) reasons.push("SETTLEMENT_NOT_SUPPORTED");
  if (!["COHERENT_WITH_PREVALENT", "COMPATIBLE_WITH_MULTIPLE_SCENARIOS"].includes(scenario.classification)) reasons.push("NOT_COHERENT_WITH_PREVALENT_SCENARIO");
  if (!scenario.scoreMask && !validatedStatisticalModel) reasons.push("NO_COMPARABLE_SCORE_EVENT");
  if (statisticalFamily && !validatedStatisticalModel) reasons.push("STATISTICAL_FAMILY_NOT_VALIDATED");
  if (finite(evaluation.prudentProbabilityPct) && Number(evaluation.prudentProbabilityPct) < minimumSportsSupportPct(leg)) reasons.push("SPORTS_SUPPORT_BELOW_MARKET_STANDARD");
  return { eligible: reasons.length === 0, reasons, conservativeExpectedValuePct: conservativeEv };
}

function scenarioRank(leg) {
  return leg?.scenarioAnalysis?.classification === "COHERENT_WITH_PREVALENT" ? 3
    : leg?.scenarioAnalysis?.classification === "COMPATIBLE_WITH_MULTIPLE_SCENARIOS" ? 2
      : 0;
}

function resultFormRank(leg) {
  const target = modelTarget(leg).toLowerCase();
  if (/^1x2:/.test(target)) return 3;
  if (/^draw-no-bet:/.test(target)) return 2;
  if (/^double-chance:/.test(target)) return 1;
  return 0;
}

function interestTuple(leg, rankingMode = "probability-first") {
  const evaluation = leg.betSelection.evaluation;
  const reliability = RELIABILITY_RANK[leg.betSelection.operational.reliability.level] || 0;
  const prudent = Number(evaluation.prudentProbabilityPct);
  const central = Number(evaluation.modelProbabilityPct);
  if (rankingMode === "solidity-first") return [scenarioRank(leg), resultFormRank(leg), reliability, prudent, central];
  return [scenarioRank(leg), resultFormRank(leg), prudent, reliability, central];
}

function compareInterest(left, right, rankingMode = "probability-first") {
  const a = interestTuple(left, rankingMode), b = interestTuple(right, rankingMode);
  for (let index = 0; index < Math.max(a.length, b.length); index += 1) if (a[index] !== b[index]) return b[index] - a[index];
  return String(left.selectionId).localeCompare(String(right.selectionId));
}

function thresholdTargetPct(leg) {
  const identity = canonicalThresholdIdentity(leg) || "";
  if (identity.endsWith(":range")) return 68;
  if (["shots", "sot", "corners"].includes(suggestedFamily(leg))) return 50;
  if (identity.endsWith(":over")) return 58;
  return 55;
}

function thresholdBalanceTuple(leg) {
  const evaluation = leg.betSelection.evaluation;
  const prudent = Number(evaluation.prudentProbabilityPct);
  const central = Number(evaluation.modelProbabilityPct);
  const reliability = RELIABILITY_RANK[leg.betSelection.operational.reliability.level] || 0;
  const quote = Number(leg.betSelection.quote.decimal);
  const target = thresholdTargetPct(leg);
  const quoteCompromise = Number.isFinite(quote) ? Math.min(3, Math.log2(Math.max(1, quote))) : 0;
  return [reliability, -Math.abs(prudent - target), quoteCompromise, prudent, central];
}

function compareThresholdBalance(left, right) {
  const a = thresholdBalanceTuple(left), b = thresholdBalanceTuple(right);
  for (let index = 0; index < a.length; index += 1) if (a[index] !== b[index]) return b[index] - a[index];
  return String(left.selectionId).localeCompare(String(right.selectionId));
}

function marginalSportsSupportScore(leg, familySelectionsAlreadyAccepted = 0) {
  const prudent = Number(leg.betSelection.evaluation.prudentProbabilityPct);
  const reliability = RELIABILITY_RANK[leg.betSelection.operational.reliability.level] || 0;
  const coherenceBonus = leg.scenarioAnalysis.classification === "COHERENT_WITH_PREVALENT" ? 12 : 0;
  const reliabilityBonus = reliability === 3 ? 6 : reliability === 2 ? 3 : 0;
  return prudent + coherenceBonus + reliabilityBonus - familySelectionsAlreadyAccepted * 7;
}

function minimumMarginalSportsSupportScore(leg) {
  return ["shots", "sot", "corners"].includes(suggestedFamily(leg)) ? 45 : 48;
}

function chooseSuggestions(match, rankingMode = "probability-first") {
  const assessments = new Map(match.selections.map(leg => [leg.selectionId, assessSuggestion(leg)]));
  const admitted = match.selections.filter(leg => assessments.get(leg.selectionId).eligible);
  const thresholdGroups = new Map();
  for (const leg of admitted) {
    const key = canonicalThresholdIdentity(leg);
    if (!key) continue;
    const group = thresholdGroups.get(key) || [];
    group.push(leg);
    thresholdGroups.set(key, group);
  }
  const thresholdWinners = new Map();
  const rejected = new Map();
  for (const [key, group] of thresholdGroups) {
    const ranked = group.slice().sort(compareThresholdBalance);
    thresholdWinners.set(key, ranked[0].selectionId);
    for (const leg of ranked.slice(1)) rejected.set(leg.selectionId, "CANONICAL_THRESHOLD_BALANCE_NOT_SELECTED");
  }
  const candidates = admitted
    .filter(leg => {
      const key = canonicalThresholdIdentity(leg);
      return !key || thresholdWinners.get(key) === leg.selectionId;
    })
    .sort((left, right) => compareInterest(left, right, rankingMode));
  const thresholdSeen = new Set(), thesisSeen = new Set(), accepted = [], familyCounts = new Map();
  for (const leg of candidates) {
    const thresholdKey = canonicalThresholdIdentity(leg), thesisKey = resultThesisIdentity(leg);
    const family = suggestedFamily(leg), familyCount = familyCounts.get(family) || 0;
    if (marginalSportsSupportScore(leg, familyCount) < minimumMarginalSportsSupportScore(leg)) {
      rejected.set(leg.selectionId, "MARGINAL_SPORTS_SUPPORT_BELOW_PORTFOLIO_STANDARD");
      continue;
    }
    if (thresholdKey && thresholdSeen.has(thresholdKey)) { rejected.set(leg.selectionId, "CANONICAL_THRESHOLD_ALREADY_SELECTED"); continue; }
    if (thesisKey && thesisSeen.has(thesisKey)) { rejected.set(leg.selectionId, "RESULT_THESIS_ALREADY_SELECTED"); continue; }
    const equivalent = accepted.find(other => pairRelation(leg, other).type === "EQUIVALENT_OVERLAP");
    if (equivalent) { rejected.set(leg.selectionId, "EQUIVALENT_EVENT_ALREADY_SELECTED"); continue; }
    const implication = accepted.find(other => pairRelation(leg, other).type === "LOGICAL_IMPLICATION");
    if (implication) { rejected.set(leg.selectionId, "LOGICAL_IMPLICATION_WITH_HIGHER_RANKED_SELECTION"); continue; }
    const exclusive = accepted.find(other => pairRelation(leg, other).type === "MUTUALLY_EXCLUSIVE");
    if (exclusive) { rejected.set(leg.selectionId, "MUTUALLY_EXCLUSIVE_WITH_HIGHER_RANKED_SELECTION"); continue; }
    accepted.push(leg);
    familyCounts.set(family, familyCount + 1);
    if (thresholdKey) thresholdSeen.add(thresholdKey);
    if (thesisKey) thesisSeen.add(thesisKey);
  }
  return { accepted, assessments, rejected };
}

function selectMatchSuggestions(match, { rankingMode = "probability-first" } = {}) {
  const { accepted, assessments, rejected } = chooseSuggestions(match, rankingMode);
  const acceptedIds = new Set(accepted.map(leg => leg.selectionId));
  const rankById = new Map(accepted.map((leg, index) => [leg.selectionId, index + 1]));
  const annotated = match.selections.map(leg => {
    const assessment = assessments.get(leg.selectionId), suggested = acceptedIds.has(leg.selectionId);
    const validatedStatisticalModel = leg?.betSelection?.evaluation?.kind === "DISCRETE_COUNT_TEMPORAL_HOLDOUT";
    const reasons = suggested ? [] : assessment.eligible ? [rejected.get(leg.selectionId) || "LOWER_RANKED"] : assessment.reasons;
    return { ...leg, suggestionAnalysis: {
      version: 2,
      suggested,
      rank: rankById.get(leg.selectionId) || null,
      family: suggestedFamily(leg),
      familyLabel: FAMILY_LABELS[suggestedFamily(leg)],
      criteria: "SPORTS_COHERENCE_VALIDATED_MODEL_RELIABILITY_AND_BALANCED_CANONICAL_THRESHOLD_WITH_EV_INFORMATION_ONLY",
      reasons,
      conservativeExpectedValuePct: assessment.conservativeExpectedValuePct,
      canonicalThresholdIdentity: canonicalThresholdIdentity(leg),
      resultThesisIdentity: resultThesisIdentity(leg),
      rankingMode,
      rankingTuple: suggested ? interestTuple(leg, rankingMode) : null,
      heuristicDisclosure: validatedStatisticalModel
        ? "Discrete count probability validated on a temporal holdout; final portfolio selection remains an operational rule."
        : "Operational portfolio rule applied to an existing probability model.",
      quoteAvailability: "AVAILABLE_AT_2026_10_09_SNAPSHOT_CURRENT_NOT_VERIFIED",
    } };
  });
  const suggestions = annotated.filter(leg => leg.suggestionAnalysis.suggested).sort((left, right) => left.suggestionAnalysis.rank - right.suggestionAnalysis.rank);
  const byFamily = Object.fromEntries(FAMILY_ORDER.map(family => [family, suggestions.filter(leg => leg.suggestionAnalysis.family === family).length]));
  return { ...match, selections: annotated, suggestions: suggestions.map(leg => leg.selectionId), suggestionSummary: { total: suggestions.length, byFamily } };
}

function annotateSuggestedForecasts(catalogMatches, options = {}) {
  const matches = catalogMatches.map(match => selectMatchSuggestions(match, options));
  const all = matches.flatMap(match => match.selections).filter(leg => leg.suggestionAnalysis.suggested);
  return { matches, totals: { suggestions: all.length, byFamily: Object.fromEntries(FAMILY_ORDER.map(family => [family, all.filter(leg => leg.suggestionAnalysis.family === family).length])) } };
}

module.exports = {
  FAMILY_ORDER,
  FAMILY_LABELS,
  RELIABILITY_RANK,
  suggestedFamily,
  verifiedQuote,
  conservativeExpectedValuePct,
  canonicalThresholdIdentity,
  resultThesisIdentity,
  minimumSportsSupportPct,
  assessSuggestion,
  interestTuple,
  compareInterest,
  resultFormRank,
  thresholdTargetPct,
  thresholdBalanceTuple,
  compareThresholdBalance,
  marginalSportsSupportScore,
  minimumMarginalSportsSupportScore,
  chooseSuggestions,
  selectMatchSuggestions,
  annotateSuggestedForecasts,
};
