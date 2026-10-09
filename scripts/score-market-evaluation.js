"use strict";

const {
  scoreMatrix,
  sensitivityMatrices,
  matrixProbability,
  configuredScorePredicate,
  conditionForOutcome,
} = require("./predictions/engine");

const finite = value => value !== null && value !== undefined && value !== "" && Number.isFinite(Number(value));
const round = (value, digits = 2) => Number(Number(value).toFixed(digits));

function b2FamilyForMarket(market, selection) {
  if (market?.marketName === "MULTIGOAL") return "multigoal-match";
  if (market?.marketName === "MULTIGOAL SQUADRA X") return "multigoal-team";
  if (market?.marketName === "U/O SQUADRA X" && selection?.name === "OVER") return "team-goals-over";
  return null;
}

function configuredLeg(market, selection) {
  return {
    market: market.marketName,
    variant: market.variantName,
    threshold: market.threshold,
    selection: selection.name,
  };
}

function primaryScore(prediction) {
  const values = String(prediction?.scoreForecast?.primary?.score || "").split("-").map(Number);
  return values.length === 2 && values.every(Number.isInteger) ? { home: values[0], away: values[1] } : null;
}

function isPrimaryScoreCompatible(prediction, market, selection) {
  const score = primaryScore(prediction);
  const predicate = configuredScorePredicate(configuredLeg(market, selection));
  return Boolean(score && predicate && predicate(score));
}

function predicateIdFor(market, selection) {
  const compact = String(selection.name || "").replace(/\s+/g, "").toUpperCase();
  if (market.marketName === "MULTIGOAL") return `score.total.inclusive:${compact}`;
  const side = /SQUADRA 1\b/.test(market.variantName || "") ? "home" : /SQUADRA 2\b/.test(market.variantName || "") ? "away" : "unknown";
  if (market.marketName === "MULTIGOAL SQUADRA X") return `score.${side}.inclusive:${compact}`;
  if (market.marketName === "U/O SQUADRA X") return `score.${side}.gt:${market.threshold}`;
  return null;
}

function evaluateDerivedScoreMarket({ prediction, market, selection }) {
  if (!finite(prediction?.expectedGoals?.home) || !finite(prediction?.expectedGoals?.away)) throw new Error("Gol attesi non disponibili per la derivazione B2");
  const predicate = configuredScorePredicate(configuredLeg(market, selection));
  if (!predicate) throw new Error(`Predicato B2 non disponibile: ${market.marketName} / ${market.variantName} / ${selection.name}`);
  const centralMatrix = scoreMatrix(Number(prediction.expectedGoals.home), Number(prediction.expectedGoals.away), 7, null);
  const matrices = sensitivityMatrices(prediction.expectedGoals, centralMatrix, null);
  const probabilities = matrices.map(matrix => matrixProbability(matrix, predicate));
  const central = probabilities[0];
  const prudent = Math.min(...probabilities);
  const quote = Number(selection.odds);
  return {
    kind: "DERIVED_B2_SCORE_MATRIX",
    centralProbabilityPct: round(central * 100, 1),
    prudentProbabilityPct: round(prudent * 100, 1),
    fairOdds: round(1 / Math.max(0.0001, prudent), 2),
    expectedValuePct: round((prudent * quote - 1) * 100, 1),
    probabilitySemantics: "ABSOLUTE_EVENT",
    fairOddsBasis: "PRUDENT_PROBABILITY",
    expectedValueBasis: "PRUDENT_PROBABILITY_TIMES_DECIMAL_ODDS_MINUS_ONE",
    predicateId: predicateIdFor(market, selection),
    sensitivityProbabilityPct: probabilities.map(probability => round(probability * 100, 1)),
    matrixCellSums: matrices.map(matrix => matrix.reduce((sum, cell) => sum + cell.probability, 0)),
  };
}

function validateCanonicalDnb({ prediction, row, market, selection }) {
  const centralMatrix = scoreMatrix(Number(prediction.expectedGoals.home), Number(prediction.expectedGoals.away), 7, null);
  const matrices = sensitivityMatrices(prediction.expectedGoals, centralMatrix, null);
  const winPredicate = conditionForOutcome(selection.name);
  const pushPredicate = conditionForOutcome("X");
  const win = matrices.map(matrix => matrixProbability(matrix, winPredicate));
  const push = matrices.map(matrix => matrixProbability(matrix, pushPredicate));
  const conditional = win.map((probability, index) => probability / Math.max(0.0001, 1 - push[index]));
  const expectedValues = win.map((probability, index) => probability * Number(selection.odds) + push[index] - 1);
  const actual = {
    modelProbabilityPct: round(conditional[0] * 100, 1),
    prudentProbabilityPct: round(Math.min(...conditional) * 100, 1),
    fairOdds: round(1 / conditional[0], 2),
    expectedValuePct: round(expectedValues[0] * 100, 1),
    conservativeExpectedValuePct: round(Math.min(...expectedValues) * 100, 1),
  };
  const expected = {
    modelProbabilityPct: Number(row.modelProbabilityPct),
    prudentProbabilityPct: Number(row.conservativeProbabilityPct),
    fairOdds: Number(row.fairOdds),
    expectedValuePct: Number(row.expectedValuePct),
    conservativeExpectedValuePct: Number(row.conservativeExpectedValuePct),
  };
  const differences = Object.fromEntries(Object.keys(actual).map(key => [key, round(actual[key] - expected[key], 4)]));
  const valid = Object.entries(differences).every(([key, value]) => Math.abs(value) <= (key === "fairOdds" ? 0.02 : 0.11));
  return {
    valid,
    actual,
    expected,
    differences,
    probabilitySemantics: "CONDITIONAL_ON_NO_DRAW",
    fairOddsBasis: "CENTRAL_CONDITIONAL_ON_NO_DRAW",
    expectedValueBasis: "P_WIN_TIMES_DECIMAL_ODDS_PLUS_P_PUSH_MINUS_ONE",
    settlement: {
      type: "PUSH_ON_OUTCOME",
      pushOutcome: "X",
      settledPeriod: "FULL_TIME",
      expectedValueFormula: "P(win) * decimalOdds + P(push) - 1",
    },
  };
}

module.exports = {
  b2FamilyForMarket,
  configuredLeg,
  primaryScore,
  isPrimaryScoreCompatible,
  predicateIdFor,
  evaluateDerivedScoreMarket,
  validateCanonicalDnb,
};
