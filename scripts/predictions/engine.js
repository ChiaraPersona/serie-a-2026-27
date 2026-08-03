"use strict";

const ENGINE_VERSION = "1.0.0";
const OUTCOMES = ["1", "X", "2"];
const WEIGHTS = Object.freeze({ market: 0.65, historical: 0.25, tactical: 0.06, objectives: 0.04 });

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const round = (value, digits = 1) => Number(value.toFixed(digits));
const sum = values => values.reduce((total, value) => total + value, 0);
const normalize = values => {
  const total = sum(values);
  if (!Number.isFinite(total) || total <= 0) return [1 / 3, 1 / 3, 1 / 3];
  return values.map(value => value / total);
};
const probabilityObject = values => Object.fromEntries(OUTCOMES.map((outcome, index) => [outcome, round(values[index] * 100, 1)]));

function findMainOneXTwo(oddsEvent) {
  return oddsEvent?.markets?.find(market => market.marketCode === "3" || market.marketCode === 3)
    || oddsEvent?.markets?.find(market => market.marketName === "1X2 ESITO FINALE" && market.variantName === "ESITO FINALE 1X2")
    || null;
}

function marketProbabilities(market) {
  if (!market) return null;
  const selections = OUTCOMES.map(outcome => market.selections?.find(selection => selection.name === outcome && selection.status === "open"));
  if (selections.some(selection => !selection || !(selection.odds > 1))) return null;
  const probabilities = normalize(selections.map(selection => 1 / selection.odds));
  return {
    probabilities,
    overroundPct: round((sum(selections.map(selection => 1 / selection.odds)) - 1) * 100, 2),
    selections: Object.fromEntries(selections.map((selection, index) => [OUTCOMES[index], {
      providerSelectionId: selection.providerSelectionId,
      odds: selection.odds
    }]))
  };
}

function poisson(k, lambda) {
  let factorial = 1;
  for (let i = 2; i <= k; i += 1) factorial *= i;
  return Math.exp(-lambda) * (lambda ** k) / factorial;
}

function scoreMatrix(homeGoals, awayGoals, maxGoals = 7) {
  const scores = [];
  for (let home = 0; home <= maxGoals; home += 1) {
    for (let away = 0; away <= maxGoals; away += 1) {
      scores.push({ home, away, probability: poisson(home, homeGoals) * poisson(away, awayGoals) });
    }
  }
  const total = sum(scores.map(score => score.probability));
  return scores.map(score => ({ ...score, probability: score.probability / total }));
}

function profileGoals(profile, fallbackFor, fallbackAgainst) {
  const appearances = profile?.formation?.appearances || profile?.summary?.appearances || 0;
  return {
    for: profile?.derived?.goalsPerGame ?? (appearances ? profile.formation.goalsFor / appearances : fallbackFor),
    against: appearances ? profile.formation.goalsAgainst / appearances : fallbackAgainst
  };
}

function expectedGoals({ homeVenue, awayVenue, homeProfile, awayProfile, leagueSummary }) {
  const leagueHome = leagueSummary?.homeGoalsPerMatch || 1.28;
  const leagueAway = leagueSummary?.awayGoalsPerMatch || 1.15;
  const homeStyle = profileGoals(homeProfile, leagueHome, leagueAway);
  const awayStyle = profileGoals(awayProfile, leagueAway, leagueHome);
  const homeAttack = homeVenue ? homeVenue.goalsFor / homeVenue.played : homeStyle.for;
  const homeDefence = homeVenue ? homeVenue.goalsAgainst / homeVenue.played : homeStyle.against;
  const awayAttack = awayVenue ? awayVenue.goalsFor / awayVenue.played : awayStyle.for;
  const awayDefence = awayVenue ? awayVenue.goalsAgainst / awayVenue.played : awayStyle.against;
  return {
    home: round(clamp((homeAttack * 0.45) + (awayDefence * 0.35) + (homeStyle.for * 0.2), 0.25, 3.2), 2),
    away: round(clamp((awayAttack * 0.45) + (homeDefence * 0.35) + (awayStyle.for * 0.2), 0.2, 3), 2)
  };
}

function technicalProbabilities(matrix) {
  return normalize([
    sum(matrix.filter(score => score.home > score.away).map(score => score.probability)),
    sum(matrix.filter(score => score.home === score.away).map(score => score.probability)),
    sum(matrix.filter(score => score.home < score.away).map(score => score.probability))
  ]);
}

function calibratedScoreMatrix(matrix, sourceProbabilities, targetProbabilities) {
  const outcomeIndex = score => score.home > score.away ? 0 : score.home === score.away ? 1 : 2;
  const adjusted = matrix.map(score => {
    const index = outcomeIndex(score);
    return { ...score, probability: score.probability * targetProbabilities[index] / sourceProbabilities[index] };
  });
  const total = sum(adjusted.map(score => score.probability));
  return adjusted.map(score => ({ ...score, probability: score.probability / total }));
}

function softmaxOutcome(homeScore, awayScore, drawBase = 0.29) {
  const difference = clamp((homeScore - awayScore) / 18, -1.4, 1.4);
  return normalize([Math.exp(0.28 + difference), Math.exp(drawBase), Math.exp(-difference)]);
}

function tacticalProbabilities(homeProfile, awayProfile) {
  const score = profile => {
    const numeric = profile?.modelInputs?.numeric || {};
    return (numeric.goalsPerGame || 1.1) * 4
      + (numeric.shotsPerGame || 10) * 0.22
      + (numeric.possessionPct || 50) * 0.035
      + (profile?.summary?.rating || 6.5) * 1.5;
  };
  return softmaxOutcome(score(homeProfile) + 1.3, score(awayProfile), 0.35);
}

function objectiveProbabilities(homeObjective, awayObjective) {
  const score = objective => objective
    ? objective.motivationStart * 0.55 + objective.ambition * 0.2 + objective.expectation * 0.15 - objective.pressure * 0.1
    : 50;
  return softmaxOutcome(score(homeObjective) + 0.8, score(awayObjective), 0.4);
}

function combineSignals(parts) {
  return normalize(OUTCOMES.map((_, index) =>
    parts.market[index] * WEIGHTS.market
    + parts.historical[index] * WEIGHTS.historical
    + parts.tactical[index] * WEIGHTS.tactical
    + parts.objectives[index] * WEIGHTS.objectives
  ));
}

function surpriseFactor({ final, market, historical, dataCompleteness, crossCompetition }) {
  const favoriteIndex = market.indexOf(Math.max(...market));
  const oppositeIndex = favoriteIndex === 0 ? 2 : favoriteIndex === 2 ? 0 : (final[0] < final[2] ? 0 : 2);
  const upsetProbability = final[oppositeIndex] + final[1] * 0.45;
  const ambiguity = clamp((1 - Math.max(...final) - 0.2) / 0.47, 0, 1);
  const disagreement = clamp(Math.abs(historical[favoriteIndex] - market[favoriteIndex]) / 0.22, 0, 1);
  const uncertainty = clamp((1 - dataCompleteness) + (crossCompetition ? 0.2 : 0), 0, 1);
  const value = Math.round(100 * (0.38 * clamp(upsetProbability / 0.5, 0, 1) + 0.27 * ambiguity + 0.2 * disagreement + 0.15 * uncertainty));
  return {
    value,
    level: value >= 67 ? "alto" : value >= 42 ? "medio" : "basso",
    upsetOutcome: OUTCOMES[oppositeIndex],
    upsetProbabilityPct: round(final[oppositeIndex] * 100, 1),
    explanation: "Misura apertura della gara, probabilita dell'esito sfavorito, divergenza tra mercato e dati tecnici e incompletezza prepartita. Non seleziona automaticamente l'outsider."
  };
}

function confidence(final, surprise, dataCompleteness) {
  const ordered = [...final].sort((a, b) => b - a);
  const separation = clamp((ordered[0] - ordered[1]) / 0.25, 0, 1);
  const value = Math.round(100 * (0.42 * dataCompleteness + 0.33 * separation + 0.25 * (1 - surprise.value / 100)));
  return { value, level: value >= 72 ? "alta" : value >= 52 ? "moderata" : "prudente" };
}

function exactScores(matrix) {
  return [...matrix]
    .sort((a, b) => b.probability - a.probability || a.home + a.away - b.home - b.away)
    .slice(0, 3)
    .map((score, index) => ({ score: `${score.home}-${score.away}`, probabilityPct: round(score.probability * 100, 1), rank: index + 1 }));
}

function predictMatch(input) {
  const market = marketProbabilities(findMainOneXTwo(input.oddsEvent));
  if (!market) throw new Error(`Mercato 1X2 principale assente: ${input.match.id}`);
  const expected = expectedGoals(input);
  const matrix = scoreMatrix(expected.home, expected.away);
  const parts = {
    market: market.probabilities,
    historical: technicalProbabilities(matrix),
    tactical: tacticalProbabilities(input.homeProfile, input.awayProfile),
    objectives: objectiveProbabilities(input.homeObjective, input.awayObjective)
  };
  const final = combineSignals(parts);
  const finalScoreMatrix = calibratedScoreMatrix(matrix, parts.historical, final);
  const crossCompetition = input.homeProfile?.competition !== "Serie A" || input.awayProfile?.competition !== "Serie A";
  const completedSections = Object.values(input.reading?.sections || {}).filter(section => section?.content).length;
  const dataCompleteness = clamp(0.62 + completedSections * 0.035 - (crossCompetition ? 0.08 : 0), 0.5, 0.9);
  const surprise = surpriseFactor({ final, market: parts.market, historical: parts.historical, dataCompleteness, crossCompetition });
  const confidenceResult = confidence(final, surprise, dataCompleteness);
  const orderedOutcomes = OUTCOMES.map((outcome, index) => ({ outcome, probability: final[index] })).sort((a, b) => b.probability - a.probability);
  const topTwo = new Set(orderedOutcomes.slice(0, 2).map(item => item.outcome));
  const doubleChance = topTwo.has("1") && topTwo.has("X") ? "1X" : topTwo.has("X") && topTwo.has("2") ? "X2" : "12";
  const valueCandidates = OUTCOMES.map((outcome, index) => {
    const odds = market.selections[outcome].odds;
    const edgePct = round((final[index] * odds - 1) * 100, 1);
    return { outcome, odds, fairOdds: round(1 / final[index], 2), edgePct, qualifies: edgePct >= 5 && confidenceResult.value >= 52 };
  });
  return {
    matchId: input.match.id,
    generatedAt: input.generatedAt,
    status: "preliminary",
    engineVersion: ENGINE_VERSION,
    probabilities: {
      final: probabilityObject(final),
      marketNoMargin: probabilityObject(parts.market),
      historical: probabilityObject(parts.historical),
      tactical: probabilityObject(parts.tactical),
      objectives: probabilityObject(parts.objectives)
    },
    expectedGoals: expected,
    exactScores: exactScores(finalScoreMatrix),
    verdict: {
      outcome: orderedOutcomes[0].outcome,
      doubleChance,
      label: orderedOutcomes[0].probability >= 0.5 ? `Prevalenza ${orderedOutcomes[0].outcome}` : `Equilibrio con lieve prevalenza ${orderedOutcomes[0].outcome}`
    },
    confidence: confidenceResult,
    surprise,
    market: {
      provider: "Sisal",
      retrievedAt: input.oddsRetrievedAt,
      overroundPct: market.overroundPct,
      selections: market.selections,
      valueCandidates
    },
    dataQuality: {
      completenessPct: Math.round(dataCompleteness * 100),
      crossCompetitionBaseline: crossCompetition,
      missing: [
        "forma ufficiale 2026/27",
        ...(input.reading?.sections?.availability?.content ? [] : ["indisponibili verificati"]),
        ...(input.reading?.sections?.referee?.content ? [] : ["designazione arbitrale"])
      ]
    }
  };
}

module.exports = { ENGINE_VERSION, OUTCOMES, WEIGHTS, findMainOneXTwo, marketProbabilities, predictMatch };
