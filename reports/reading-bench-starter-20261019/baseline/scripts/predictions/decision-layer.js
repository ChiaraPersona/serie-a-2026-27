"use strict";

const DECISION_LAYER_VERSION = "1.0.0";

const PROFILE_LIMITS = Object.freeze({
  Safe: { maxAverageRisk: 42, maxEventRisk: 58, maxStrongDependencies: 1, minPrudentExpectedValuePct: 0 },
  Balanced: { maxAverageRisk: 56, maxEventRisk: 72, maxStrongDependencies: 2, minPrudentExpectedValuePct: 0 },
  Aggressive: { maxAverageRisk: 72, maxEventRisk: 88, maxStrongDependencies: 3, minPrudentExpectedValuePct: 0 }
});

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const round = (value, digits = 2) => Number(value.toFixed(digits));
const sum = values => values.reduce((total, value) => total + value, 0);

function poisson(k, lambda) {
  let factorial = 1;
  for (let index = 2; index <= k; index += 1) factorial *= index;
  return Math.exp(-lambda) * (lambda ** k) / factorial;
}

function scoreMatrix(expectedGoals, maxGoals = 7) {
  const rows = [];
  for (let home = 0; home <= maxGoals; home += 1) {
    for (let away = 0; away <= maxGoals; away += 1) {
      rows.push({ home, away, probability: poisson(home, expectedGoals.home) * poisson(away, expectedGoals.away) });
    }
  }
  const total = sum(rows.map(row => row.probability));
  return rows.map(row => ({ ...row, probability: row.probability / total }));
}

function probability(matrix, predicate) {
  return sum(matrix.filter(predicate).map(row => row.probability));
}

function outcome(score) {
  return score.home > score.away ? "1" : score.home < score.away ? "2" : "X";
}

function rangePredicate(selection, accessor = score => score.home + score.away) {
  const range = String(selection || "").match(/^(\d+)-(\d+)$/)?.slice(1).map(Number);
  return range ? score => accessor(score) >= range[0] && accessor(score) <= range[1] : null;
}

function marketPredicate(market, selection, threshold, variant = "") {
  const name = String(market || "").toUpperCase();
  const pick = String(selection || "").toUpperCase().replace(/\s+/g, "");
  const line = Number(threshold ?? String(market || "").match(/(\d+(?:\.\d+)?)/)?.[1]);
  if (name === "1X2" || name.includes("1X2 ESITO FINALE")) return score => outcome(score) === pick;
  if (name.includes("DOPPIA CHANCE") || name === "DOUBLE-CHANCE") return score => pick.includes(outcome(score));
  if (name.includes("DRAW NO BET") || name === "DRAW-NO-BET") return score => outcome(score) === "X" || outcome(score) === pick;
  if (name.includes("UNDER/OVER") || name === "GOALS") {
    return Number.isFinite(line) ? score => pick === "OVER" ? score.home + score.away > line : score.home + score.away < line : null;
  }
  if (name.includes("GOAL/NOGOAL") || name === "BTTS") return score => pick === "GOAL" ? score.home > 0 && score.away > 0 : score.home === 0 || score.away === 0;
  if (name.includes("CASA: SEGNA") || (name.includes("TEAM-GOAL") && /CASA/i.test(variant))) return score => pick === "SI" ? score.home > 0 : score.home === 0;
  if (name.includes("OSPITE: SEGNA") || (name.includes("TEAM-GOAL") && /OSPITE/i.test(variant))) return score => pick === "SI" ? score.away > 0 : score.away === 0;
  if (name === "MULTIGOAL") return rangePredicate(pick);
  if (name.includes("MULTIGOAL SQUADRA X")) {
    const accessor = /SQUADRA 1/i.test(variant) ? score => score.home : /SQUADRA 2/i.test(variant) ? score => score.away : null;
    return accessor ? rangePredicate(pick, accessor) : null;
  }
  return null;
}

function rowPredicate(row) {
  if (row.family === "goals") return marketPredicate("goals", row.selection, row.market.match(/(\d+(?:\.\d+)?)/)?.[1]);
  if (row.family === "team-goal") return marketPredicate("team-goal", row.selection, null, row.market);
  return marketPredicate(row.family, row.selection, row.threshold, row.market);
}

function dependency(matrix, first, second) {
  const firstProbability = probability(matrix, first);
  const secondProbability = probability(matrix, second);
  const intersection = probability(matrix, score => first(score) && second(score));
  const denominator = Math.sqrt(firstProbability * (1 - firstProbability) * secondProbability * (1 - secondProbability));
  const score = denominator > 0 ? (intersection - firstProbability * secondProbability) / denominator : 0;
  const symmetricDifference = probability(matrix, item => first(item) !== second(item));
  const redundant = symmetricDifference < 0.01;
  const contradictory = intersection < 0.005;
  const type = redundant ? "redundant" : contradictory ? "conflicting" : score >= 0.25 ? "positive" : score <= -0.25 ? "negative" : "neutral";
  return {
    type,
    correlation: round(score, 3),
    intersectionProbabilityPct: round(intersection * 100, 1)
  };
}

function correlationGraph(matrix, rows) {
  const nodes = rows.map(row => ({
    id: row.id,
    market: row.market,
    selection: row.selection,
    probabilityPct: row.modelProbabilityPct,
    predicate: rowPredicate(row)
  })).filter(node => node.predicate);
  const edges = [];
  for (let first = 0; first < nodes.length; first += 1) {
    for (let second = first + 1; second < nodes.length; second += 1) {
      const relation = dependency(matrix, nodes[first].predicate, nodes[second].predicate);
      if (relation.type !== "neutral") edges.push({ from: nodes[first].id, to: nodes[second].id, ...relation });
    }
  }
  return {
    method: "Dipendenza binaria calcolata sulla stessa matrice Poisson del pronostico; le quote restano escluse.",
    nodes: nodes.map(({ predicate, ...node }) => node),
    edges,
    summary: {
      positive: edges.filter(edge => edge.type === "positive").length,
      negative: edges.filter(edge => edge.type === "negative").length,
      redundant: edges.filter(edge => edge.type === "redundant").length,
      conflicting: edges.filter(edge => edge.type === "conflicting").length
    }
  };
}

function scenarioAnalysis(prediction, matrix, graph) {
  const homeWin = Number(prediction.probabilities.final["1"] || 0);
  const awayWin = Number(prediction.probabilities.final["2"] || 0);
  const favoriteOutcome = homeWin >= awayWin ? "1" : "2";
  const favoriteWins = score => outcome(score) === favoriteOutcome;
  const definitions = [
    { id: "A", label: "Controllo della favorita", predicate: score => favoriteWins(score) && score.home + score.away <= 3 },
    { id: "B", label: "Vittoria aperta della favorita", predicate: score => favoriteWins(score) && score.home + score.away >= 4 },
    { id: "C", label: "Resistenza o sorpresa", predicate: score => !favoriteWins(score) }
  ];
  const marketRows = new Map((prediction.marketComparison || []).map(row => [row.id, row]));
  const scenarios = definitions.map(definition => {
    const scenarioProbability = probability(matrix, definition.predicate);
    const compatibleMarketIds = [];
    const incompatibleMarketIds = [];
    for (const node of graph.nodes) {
      const predicate = rowPredicate(marketRows.get(node.id));
      if (!predicate || scenarioProbability <= 0) continue;
      const conditional = probability(matrix, score => definition.predicate(score) && predicate(score)) / scenarioProbability;
      const baseline = probability(matrix, predicate);
      if (conditional >= baseline + 0.08) compatibleMarketIds.push(node.id);
      else if (conditional <= baseline - 0.08) incompatibleMarketIds.push(node.id);
    }
    return {
      id: definition.id,
      label: definition.label,
      estimatedProbabilityPct: round(scenarioProbability * 100, 1),
      compatibleMarketIds,
      incompatibleMarketIds
    };
  });
  const correction = round(100 - sum(scenarios.map(item => item.estimatedProbabilityPct)), 1);
  scenarios[scenarios.length - 1].estimatedProbabilityPct = round(scenarios.at(-1).estimatedProbabilityPct + correction, 1);
  return { favoriteOutcome, scenarios };
}

function portfolioAssessment(combo, matrix) {
  if (!combo?.legs?.length || combo.qualityStatus === "nd") return { tier: combo?.tier, status: "N/D", allowed: false, reasons: [combo?.unavailableReason || "Portafoglio non disponibile."] };
  const limits = PROFILE_LIMITS[combo.tier] || PROFILE_LIMITS.Balanced;
  const predicates = combo.legs.map(leg => marketPredicate(leg.market, leg.selection, leg.threshold, leg.variant));
  const eventRisks = combo.legs.map((leg, index) => {
    const modelProbability = Number(leg.prudentProbabilityPct);
    const risk = Number.isFinite(modelProbability) ? clamp(100 - modelProbability, 0, 100) : predicates[index] ? 65 : 82;
    return { providerSelectionId: leg.providerSelectionId, label: leg.label, riskScore: round(risk, 1), modeled: Number.isFinite(modelProbability) };
  });
  const dependencies = [];
  for (let first = 0; first < predicates.length; first += 1) {
    for (let second = first + 1; second < predicates.length; second += 1) {
      if (!predicates[first] || !predicates[second]) continue;
      const relation = dependency(matrix, predicates[first], predicates[second]);
      if (relation.type !== "neutral") dependencies.push({ first: combo.legs[first].providerSelectionId, second: combo.legs[second].providerSelectionId, ...relation });
    }
  }
  const averageRisk = sum(eventRisks.map(event => event.riskScore)) / eventRisks.length;
  const maxEventRisk = Math.max(...eventRisks.map(event => event.riskScore));
  const strongDependencies = dependencies.filter(item => item.type === "redundant" || (item.type === "positive" && item.correlation >= 0.55)).length;
  const contradictions = dependencies.filter(item => item.type === "conflicting").length;
  const riskScore = clamp(averageRisk + strongDependencies * 6 + contradictions * 15, 0, 100);
  const reasons = [];
  if (averageRisk > limits.maxAverageRisk) reasons.push(`Rischio medio ${round(averageRisk, 1)} oltre il limite ${limits.maxAverageRisk}.`);
  if (maxEventRisk > limits.maxEventRisk) reasons.push(`Gamba a rischio ${round(maxEventRisk, 1)} oltre il limite ${limits.maxEventRisk}.`);
  if (strongDependencies > limits.maxStrongDependencies) reasons.push(`${strongDependencies} dipendenze forti oltre il limite ${limits.maxStrongDependencies}.`);
  if (contradictions) reasons.push(`${contradictions} coppie di eventi incompatibili.`);
  if (!Number.isFinite(combo.prudentExpectedValuePct)) reasons.push("EV prudenziale non disponibile.");
  else if (combo.prudentExpectedValuePct < limits.minPrudentExpectedValuePct) reasons.push(`EV prudenziale ${combo.prudentExpectedValuePct}% sotto il limite ${limits.minPrudentExpectedValuePct}%.`);
  return {
    tier: combo.tier,
    status: reasons.length ? "outside-limits" : "allowed",
    allowed: reasons.length === 0,
    riskScore: round(riskScore, 1),
    riskLevel: riskScore >= 70 ? "alto" : riskScore >= 45 ? "medio" : "basso",
    averageRisk: round(averageRisk, 1),
    maxEventRisk: round(maxEventRisk, 1),
    strongDependencies,
    contradictions,
    limits,
    reasons,
    events: eventRisks,
    dependencies
  };
}

function enrichPrediction(prediction) {
  if (!prediction?.expectedGoals || !Number.isFinite(prediction.expectedGoals.home) || !Number.isFinite(prediction.expectedGoals.away)) return prediction;
  const matrix = scoreMatrix(prediction.expectedGoals);
  const graph = correlationGraph(matrix, prediction.marketComparison || []);
  const scenario = scenarioAnalysis(prediction, matrix, graph);
  return {
    ...prediction,
    decisionSupport: {
      version: DECISION_LAYER_VERSION,
      principle: "Probabilita dal motore Poisson/xG; scenari, dipendenze e rischio sono un livello successivo e non modificano i gol attesi.",
      scenario,
      correlationGraph: graph,
      portfolios: (prediction.combinations || []).map(combo => portfolioAssessment(combo, matrix))
    }
  };
}

module.exports = {
  DECISION_LAYER_VERSION,
  PROFILE_LIMITS,
  correlationGraph,
  enrichPrediction,
  marketPredicate,
  portfolioAssessment,
  scoreMatrix
};
