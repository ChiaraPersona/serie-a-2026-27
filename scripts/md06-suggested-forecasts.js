"use strict";

const { pairRelation } = require("./md06-scenario-coherence");

const FAMILY_ORDER = Object.freeze(["shots", "sot", "corners", "cards", "goals-results", "other"]);
const FAMILY_LABELS = Object.freeze({ shots: "Tiri totali", sot: "Tiri in porta", corners: "Corner", cards: "Cartellini", "goals-results": "Gol e risultati", other: "Altri mercati autorizzati" });
const finite = value => value !== null && value !== undefined && value !== "" && Number.isFinite(Number(value));

function suggestedFamily(leg) {
  const descriptor = `${leg.marketFamily || ""} ${leg.market || ""} ${leg.variant || ""}`.toUpperCase();
  if (descriptor.includes("TIRI IN PORTA")) return "sot";
  if (descriptor.includes("TIRI TOTALI")) return "shots";
  if (descriptor.includes("CORNER") || descriptor.includes("ANGOLO")) return "corners";
  if (descriptor.includes("CARTELL") || descriptor.includes("AMMON")) return "cards";
  if (/ESITO|DRAW NO BET|UNDER\/OVER|GOL\/NO GOL|GOL SQUADRA|MULTIGOL|GOALS/.test(descriptor)) return "goals-results";
  return "other";
}

function redundancyGroup(leg) {
  const family = String(leg.marketFamily || "");
  if (["Esito", "Draw No Bet"].includes(family)) return "RESULT";
  if (["Under/Over", "Multigoal partita"].includes(family)) return "TOTAL_GOALS";
  if (["Gol/No Gol"].includes(family)) return "BTTS";
  if (["Gol squadra", "Multigoal squadra", "Gol squadra · Over"].includes(family)) {
    const side = /SQUADRA 1\b/i.test(leg.variant || "") ? "1" : /SQUADRA 2\b/i.test(leg.variant || "") ? "2" : String(leg.label || "").split(" ")[0];
    return `TEAM_GOALS:${side}`;
  }
  return `${suggestedFamily(leg)}:${family || leg.market || "other"}`;
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

function assessSuggestion(leg) {
  const reasons = [];
  const evaluation = leg?.betSelection?.evaluation || {}, reliability = leg?.betSelection?.operational?.reliability?.level;
  const scenario = leg?.scenarioAnalysis || {};
  if (!verifiedQuote(leg)) reasons.push("QUOTE_NOT_VERIFIED_AT_SNAPSHOT");
  if (evaluation.status === "NOT_MODELLED" || !finite(evaluation.modelProbabilityPct)) reasons.push("NOT_MODELLED");
  if (!finite(evaluation.prudentProbabilityPct)) reasons.push("ROBUST_PROBABILITY_NOT_AVAILABLE");
  if (!['Alta', 'Media'].includes(reliability)) reasons.push("RELIABILITY_BELOW_MEDIA");
  if (evaluation.probabilitySemantics !== "ABSOLUTE_EVENT") reasons.push("NON_ABSOLUTE_PROBABILITY");
  if (!["COHERENT_WITH_PREVALENT", "COMPATIBLE_WITH_MULTIPLE_SCENARIOS"].includes(scenario.classification)) reasons.push("NOT_COHERENT_WITH_PREVALENT_SCENARIO");
  if (!scenario.scoreMask) reasons.push("NO_COMPARABLE_SCORE_EVENT");
  if (finite(evaluation.modelProbabilityPct) && Number(evaluation.modelProbabilityPct) < 50) reasons.push("CENTRAL_PROBABILITY_BELOW_HALF");
  if (finite(evaluation.prudentProbabilityPct) && Number(evaluation.prudentProbabilityPct) < 50) reasons.push("PRUDENT_PROBABILITY_BELOW_HALF");
  if (["shots", "sot", "corners", "cards"].includes(suggestedFamily(leg))) reasons.push("STATISTICAL_FAMILY_NOT_VALIDATED");
  return { eligible: reasons.length === 0, reasons };
}

const mask = leg => BigInt(String(leg.scenarioAnalysis.scoreMask).startsWith("0x") ? leg.scenarioAnalysis.scoreMask : `0x${leg.scenarioAnalysis.scoreMask}`);
const strictSuperset = (left, right) => { const a = mask(left), b = mask(right); return a !== b && (a & b) === b; };
const score = leg => [Number(leg.betSelection.evaluation.prudentProbabilityPct), Number(leg.betSelection.evaluation.modelProbabilityPct), String(leg.selectionId)];
const preferredOrder = (left, right) => score(right)[0] - score(left)[0] || score(right)[1] - score(left)[1] || score(left)[2].localeCompare(score(right)[2]);

function motivation(leg) {
  const evaluation = leg.betSelection.evaluation, scenario = leg.scenarioAnalysis;
  const relation = scenario.classification === "COHERENT_WITH_PREVALENT" ? "coerente con lo scenario prevalente" : "compatibile con più esiti della partita";
  return `P centrale ${Number(evaluation.modelProbabilityPct).toFixed(1)}%; P prudente ${Number(evaluation.prudentProbabilityPct).toFixed(1)}%, ancora sopra il 50% nelle sensibilità V2; affidabilità ${leg.betSelection.operational.reliability.level}; ${relation}.`;
}

function selectMatchSuggestions(match) {
  const assessed = match.selections.map(leg => ({ leg, assessment: assessSuggestion(leg) }));
  const candidates = assessed.filter(item => item.assessment.eligible).map(item => item.leg).sort(preferredOrder);
  const equivalentSeen = new Set();
  const unique = candidates.filter(leg => {
    const key = `${redundancyGroup(leg)}:${leg.scenarioAnalysis.scoreMask}`;
    if (equivalentSeen.has(key)) return false;
    equivalentSeen.add(key);
    return true;
  });
  const nonRedundant = unique.filter(leg => !unique.some(other => other !== leg && redundancyGroup(other) === redundancyGroup(leg) && strictSuperset(leg, other)));
  const accepted = [];
  for (const leg of nonRedundant.sort(preferredOrder)) {
    const exclusive = accepted.find(other => pairRelation(leg, other).type === "MUTUALLY_EXCLUSIVE");
    if (!exclusive) accepted.push(leg);
  }
  const acceptedIds = new Set(accepted.map(leg => leg.selectionId));
  const annotated = match.selections.map(leg => {
    const assessment = assessed.find(item => item.leg.selectionId === leg.selectionId).assessment;
    const suggested = acceptedIds.has(leg.selectionId);
    let reasons = assessment.reasons;
    if (assessment.eligible && !suggested) reasons = ["REDUNDANT_OR_WEAKER_THAN_SELECTED_EQUIVALENT"];
    return { ...leg, suggestionAnalysis: { version: 1, suggested, family: suggestedFamily(leg), familyLabel: FAMILY_LABELS[suggestedFamily(leg)], criteria: "VERIFIED_SNAPSHOT_QUOTE_AND_VALIDATED_ABSOLUTE_V2_AND_RELIABILITY_MEDIA_AND_PRUDENT_MAJORITY_AND_SCENARIO_COHERENCE", reasons, motivation: suggested ? motivation(leg) : null, quoteAvailability: "AVAILABLE_AT_2026_10_09_SNAPSHOT_CURRENT_NOT_VERIFIED" } };
  });
  const suggestions = annotated.filter(leg => leg.suggestionAnalysis.suggested).sort((left, right) => FAMILY_ORDER.indexOf(left.suggestionAnalysis.family) - FAMILY_ORDER.indexOf(right.suggestionAnalysis.family) || preferredOrder(left, right));
  const byFamily = Object.fromEntries(FAMILY_ORDER.map(family => [family, suggestions.filter(leg => leg.suggestionAnalysis.family === family).length]));
  return { ...match, selections: annotated, suggestions: suggestions.map(leg => leg.selectionId), suggestionSummary: { total: suggestions.length, byFamily } };
}

function annotateSuggestedForecasts(catalogMatches) {
  const matches = catalogMatches.map(selectMatchSuggestions);
  const all = matches.flatMap(match => match.selections).filter(leg => leg.suggestionAnalysis.suggested);
  return { matches, totals: { suggestions: all.length, byFamily: Object.fromEntries(FAMILY_ORDER.map(family => [family, all.filter(leg => leg.suggestionAnalysis.family === family).length])) } };
}

module.exports = { FAMILY_ORDER, FAMILY_LABELS, suggestedFamily, redundancyGroup, assessSuggestion, selectMatchSuggestions, annotateSuggestedForecasts };
