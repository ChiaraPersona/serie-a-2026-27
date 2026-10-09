"use strict";

const OUTCOMES = ["1", "X", "2"];
const SCORE_LIMIT = 10;
const CLASSIFICATIONS = {
  COHERENT: "COHERENT_WITH_PREVALENT",
  ALTERNATIVE: "ALTERNATIVE_TO_PREVALENT",
  MULTI: "COMPATIBLE_WITH_MULTIPLE_SCENARIOS",
  UNDETERMINED: "NOT_DETERMINABLE",
};

const LABELS = {
  [CLASSIFICATIONS.COHERENT]: "Coerente con lo scenario prevalente",
  [CLASSIFICATIONS.ALTERNATIVE]: "Alternativa allo scenario prevalente",
  [CLASSIFICATIONS.MULTI]: "Compatibile con più scenari",
  [CLASSIFICATIONS.UNDETERMINED]: "Non determinabile dai dati disponibili",
};

const finite = value => value !== null && value !== undefined && value !== "" && Number.isFinite(Number(value));
const round = (value, digits = 2) => Number(Number(value).toFixed(digits));
const upper = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim();
const outcomeForScore = ({ home, away }) => home > away ? "1" : home < away ? "2" : "X";

function parseRange(value) {
  const match = String(value || "").match(/(\d+)\s*-\s*(\d+)/);
  return match ? { min: Number(match[1]), max: Number(match[2]) } : null;
}

function sideFromVariant(variant) {
  const normalized = upper(variant);
  if (/SQUADRA\s*1\b|CASA/.test(normalized)) return "home";
  if (/SQUADRA\s*2\b|OSPITE/.test(normalized)) return "away";
  return null;
}

function scorePredicateForLeg(leg) {
  const market = upper(leg?.betSelection?.market?.name || leg?.market);
  const variant = upper(leg?.betSelection?.market?.variant || leg?.variant);
  const selection = upper(leg?.betSelection?.market?.selection || leg?.selection);
  const thresholdValue = leg?.betSelection?.market?.threshold ?? leg?.threshold;
  const threshold = finite(thresholdValue) ? Number(thresholdValue) : null;

  if (market === "1X2 ESITO FINALE" && OUTCOMES.includes(selection)) {
    return { predicate: score => outcomeForScore(score) === selection, basis: "RESULT_LOGIC", eventKey: `result:${selection}` };
  }
  if (market === "DOPPIA CHANCE") {
    const allowed = selection === "1X" ? ["1", "X"] : selection === "X2" ? ["X", "2"] : selection === "12" ? ["1", "2"] : null;
    if (allowed) return { predicate: score => allowed.includes(outcomeForScore(score)), basis: "RESULT_LOGIC", eventKey: `double-chance:${selection}` };
  }
  if (market === "DRAW NO BET" && ["1", "2"].includes(selection)) {
    return { predicate: score => outcomeForScore(score) === selection, basis: "RESULT_LOGIC_WITH_PUSH", eventKey: `dnb:${selection}`, pushOutcomes: ["X"] };
  }
  if (market === "UNDER/OVER" && threshold !== null && ["OVER", "UNDER"].includes(selection)) {
    return { predicate: score => selection === "OVER" ? score.home + score.away > threshold : score.home + score.away < threshold, basis: "SCORE_LOGIC", eventKey: `total:${selection.toLowerCase()}:${threshold}` };
  }
  if (market === "U/O SQUADRA X" && threshold !== null && ["OVER", "UNDER"].includes(selection)) {
    const side = sideFromVariant(variant);
    if (side) return { predicate: score => selection === "OVER" ? score[side] > threshold : score[side] < threshold, basis: "SCORE_LOGIC", eventKey: `${side}:${selection.toLowerCase()}:${threshold}` };
  }
  if (market === "MULTIGOAL") {
    const range = parseRange(selection);
    if (range) return { predicate: score => score.home + score.away >= range.min && score.home + score.away <= range.max, basis: "SCORE_LOGIC", eventKey: `total:range:${range.min}-${range.max}` };
  }
  if (market === "MULTIGOAL SQUADRA X") {
    const side = sideFromVariant(variant), range = parseRange(selection);
    if (side && range) return { predicate: score => score[side] >= range.min && score[side] <= range.max, basis: "SCORE_LOGIC", eventKey: `${side}:range:${range.min}-${range.max}` };
  }
  if (market === "GOAL/NOGOAL") {
    if (selection === "GOAL") return { predicate: score => score.home > 0 && score.away > 0, basis: "SCORE_LOGIC", eventKey: "btts:yes" };
    if (selection === "NOGOAL" || selection === "NO GOAL") return { predicate: score => score.home === 0 || score.away === 0, basis: "SCORE_LOGIC", eventKey: "btts:no" };
  }
  if (market === "CASA: SEGNA GOAL" || market === "OSPITE: SEGNA GOAL") {
    const side = market.startsWith("CASA") ? "home" : "away";
    if (["SI", "SÌ"].includes(selection)) return { predicate: score => score[side] > 0, basis: "SCORE_LOGIC", eventKey: `${side}:scores:yes` };
    if (selection === "NO") return { predicate: score => score[side] === 0, basis: "SCORE_LOGIC", eventKey: `${side}:scores:no` };
  }
  return null;
}

function scoreDomain(predicate) {
  let mask = 0n;
  const outcomes = new Set();
  for (let home = 0; home <= SCORE_LIMIT; home += 1) {
    for (let away = 0; away <= SCORE_LIMIT; away += 1) {
      if (!predicate({ home, away })) continue;
      const index = BigInt(home * (SCORE_LIMIT + 1) + away);
      mask |= 1n << index;
      outcomes.add(outcomeForScore({ home, away }));
    }
  }
  return { scoreMask: `0x${mask.toString(16)}`, compatibleOutcomes: OUTCOMES.filter(outcome => outcomes.has(outcome)) };
}

function buildMatchScenario(prediction) {
  const final = prediction?.probabilities?.final || {};
  const probabilities = { "1": Number(final["1"]), X: Number(final.X), "2": Number(final["2"]) };
  if (!OUTCOMES.every(outcome => finite(probabilities[outcome]))) throw new Error(`${prediction?.matchId || "N/D"}: probabilità 1X2 mancanti`);
  const probabilitySumPct = round(OUTCOMES.reduce((sum, outcome) => sum + probabilities[outcome], 0), 6);
  const maxProbability = Math.max(...OUTCOMES.map(outcome => probabilities[outcome]));
  const prevalentOutcomes = OUTCOMES.filter(outcome => Math.abs(probabilities[outcome] - maxProbability) <= 1e-9);
  const modal = prediction?.scoreForecast?.modal || prediction?.exactScores?.find(score => score.rank === 1) || prediction?.exactScores?.[0] || null;
  const expectedGoals = {
    home: finite(prediction?.expectedGoals?.home) ? Number(prediction.expectedGoals.home) : null,
    away: finite(prediction?.expectedGoals?.away) ? Number(prediction.expectedGoals.away) : null,
    total: finite(prediction?.expectedGoals?.total) ? Number(prediction.expectedGoals.total) : null,
  };
  const dominantBand = (prediction?.scoreProfile?.bands || []).find(band => band.id === prediction?.scoreProfile?.dominantBand) || null;
  const prevalent = prevalentOutcomes.length === 1 ? prevalentOutcomes[0] : null;
  const description = prevalent
    ? `Prevale ${prevalent} al ${probabilities[prevalent].toFixed(1)}%; xG ${expectedGoals.home ?? "N/D"}-${expectedGoals.away ?? "N/D"}.`
    : `Parità numerica tra ${prevalentOutcomes.join(" e ")}; xG ${expectedGoals.home ?? "N/D"}-${expectedGoals.away ?? "N/D"}.`;
  return {
    version: 1,
    source: "predictions.probabilities.final",
    predictionGeneratedAt: prediction.generatedAt || null,
    modelVersion: prediction.engineVersion || null,
    probabilities,
    probabilitySumPct,
    sumWithinTolerance: Math.abs(probabilitySumPct - 100) <= 0.01,
    prevalentOutcome: prevalent,
    prevalentOutcomes,
    numericalTie: prevalentOutcomes.length > 1,
    modalExactScore: modal ? { score: modal.score || null, outcome: modal.outcome || (modal.score ? outcomeForScore({ home: Number(String(modal.score).split("-")[0]), away: Number(String(modal.score).split("-")[1]) }) : null), probabilityPct: finite(modal.probabilityPct) ? Number(modal.probabilityPct) : null } : null,
    centralExactScore: prediction?.scoreForecast?.primary ? { score: prediction.scoreForecast.primary.score, outcome: prediction.scoreForecast.primary.outcome, probabilityPct: prediction.scoreForecast.primary.probabilityPct } : null,
    expectedGoals,
    goalDistribution: { bands: prediction?.scoreProfile?.bands || [], dominantBand: dominantBand ? { id: dominantBand.id, label: dominantBand.label, probabilityPct: dominantBand.probabilityPct } : null },
    description,
  };
}

function classifySelectionScenario(leg, scenario) {
  const evaluation = leg?.betSelection?.evaluation || {};
  const modelled = evaluation.status !== "NOT_MODELLED" && finite(evaluation.modelProbabilityPct);
  const predicateInfo = scorePredicateForLeg(leg);
  const domain = predicateInfo ? scoreDomain(predicateInfo.predicate) : null;
  const compatibleOutcomes = domain?.compatibleOutcomes || (modelled ? [...OUTCOMES] : null);
  const pushOutcomes = predicateInfo?.pushOutcomes || [];
  const basis = !modelled ? "NOT_MODELLED" : predicateInfo?.basis || "MARGINAL_DISTRIBUTION_NOT_JOINT_WITH_1X2";
  let classification = CLASSIFICATIONS.UNDETERMINED;
  if (modelled && scenario.prevalentOutcome && compatibleOutcomes?.length) {
    classification = compatibleOutcomes.includes(scenario.prevalentOutcome)
      ? compatibleOutcomes.length === 1 ? CLASSIFICATIONS.COHERENT : CLASSIFICATIONS.MULTI
      : CLASSIFICATIONS.ALTERNATIVE;
  } else if (modelled && scenario.numericalTie && compatibleOutcomes?.length) {
    classification = compatibleOutcomes.some(outcome => scenario.prevalentOutcomes.includes(outcome)) ? CLASSIFICATIONS.MULTI : CLASSIFICATIONS.ALTERNATIVE;
  }
  const reason = classification === CLASSIFICATIONS.COHERENT
    ? `L'evento si realizza soltanto nello scenario ${scenario.prevalentOutcome}, che ha la probabilità 1X2 più alta.`
    : classification === CLASSIFICATIONS.ALTERNATIVE
      ? `L'evento non include lo scenario prevalente ${scenario.prevalentOutcome || scenario.prevalentOutcomes.join("/")}; resta una lettura alternativa.`
      : classification === CLASSIFICATIONS.MULTI
        ? basis === "MARGINAL_DISTRIBUTION_NOT_JOINT_WITH_1X2"
          ? "L'evento usa una distribuzione marginale distinta dalla 1X2 ed è logicamente possibile con più esiti finali."
          : `L'evento è compatibile con più esiti finali (${compatibleOutcomes.join("/")}), incluso lo scenario prevalente.`
        : "La probabilità specifica non è disponibile; la relazione con lo scenario prevalente non viene stimata.";
  return {
    version: 1,
    classification,
    label: LABELS[classification],
    prevalentOutcome: scenario.prevalentOutcome,
    compatibleOutcomes,
    pushOutcomes,
    basis,
    eventKey: predicateInfo?.eventKey || null,
    eventProbabilityPct: modelled ? Number(evaluation.modelProbabilityPct) : null,
    scoreMask: domain?.scoreMask || null,
    reason,
  };
}

function annotateCatalogMatches({ catalogMatches, predictions }) {
  const predictionByMatch = new Map((predictions || []).map(prediction => [prediction.matchId, prediction]));
  return (catalogMatches || []).map(match => {
    const prediction = predictionByMatch.get(match.matchId);
    if (!prediction) throw new Error(`${match.matchId}: previsione V2 congelata non trovata`);
    const scenario = buildMatchScenario(prediction);
    if (!scenario.sumWithinTolerance) throw new Error(`${match.matchId}: probabilità 1X2 pari a ${scenario.probabilitySumPct}, non a 100`);
    const selections = (match.selections || []).map(leg => ({ ...leg, scenarioAnalysis: classifySelectionScenario(leg, scenario) }));
    const classificationCounts = selections.reduce((counts, leg) => {
      const key = leg.scenarioAnalysis.classification;
      counts[key] = (counts[key] || 0) + 1;
      return counts;
    }, Object.fromEntries(Object.values(CLASSIFICATIONS).map(key => [key, 0])));
    return { ...match, scenario: { ...scenario, classificationCounts }, selections };
  });
}

function pairRelation(left, right) {
  const a = left?.scenarioAnalysis, b = right?.scenarioAnalysis;
  if (!a || !b) return { type: "NOT_DIRECTLY_COMPARABLE" };
  const leftMarketId = left?.betSelection?.identity?.providerMarketId;
  const rightMarketId = right?.betSelection?.identity?.providerMarketId;
  if (leftMarketId && leftMarketId === rightMarketId && left.selectionId !== right.selectionId) return { type: "MUTUALLY_EXCLUSIVE", basis: "SAME_BOOKMAKER_MARKET" };
  if (a.scoreMask && b.scoreMask) {
    const leftMask = BigInt(a.scoreMask), rightMask = BigInt(b.scoreMask), intersection = leftMask & rightMask;
    if (intersection === 0n) return { type: "MUTUALLY_EXCLUSIVE", basis: "DISJOINT_SCORE_EVENTS" };
    const leftSubset = intersection === leftMask;
    const rightSubset = intersection === rightMask;
    if (leftSubset && rightSubset) return { type: "EQUIVALENT_OVERLAP", basis: "IDENTICAL_SCORE_EVENT" };
    if (leftSubset || rightSubset) return { type: "LOGICAL_IMPLICATION", basis: leftSubset ? "LEFT_IMPLIES_RIGHT" : "RIGHT_IMPLIES_LEFT" };
    return { type: "COMPATIBLE_CORRELATED", basis: "OVERLAPPING_SCORE_EVENTS" };
  }
  const leftOutcomes = a.compatibleOutcomes || [], rightOutcomes = b.compatibleOutcomes || [];
  if (leftOutcomes.length && rightOutcomes.length && !leftOutcomes.some(outcome => rightOutcomes.includes(outcome))) return { type: "MUTUALLY_EXCLUSIVE", basis: "DISJOINT_RESULT_OUTCOMES" };
  const leftKeys = left?.betSelection?.overlap?.semanticKeys || [], rightKeys = right?.betSelection?.overlap?.semanticKeys || [];
  if (leftKeys.some(key => rightKeys.includes(key))) return { type: "COMPATIBLE_CORRELATED", basis: "SHARED_SEMANTIC_KEY" };
  return { type: "NOT_DIRECTLY_COMPARABLE", basis: "DISTINCT_MARGINAL_DISTRIBUTIONS" };
}

module.exports = {
  OUTCOMES,
  CLASSIFICATIONS,
  LABELS,
  SCORE_LIMIT,
  buildMatchScenario,
  classifySelectionScenario,
  annotateCatalogMatches,
  pairRelation,
  scorePredicateForLeg,
};
