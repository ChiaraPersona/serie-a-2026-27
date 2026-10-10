"use strict";
const { normalizePlayerName } = require("../player-identity");
const { attachBetSelection, selectionIdFor } = require("../betting-selection-contract");

const ENGINE_VERSION = "4.13.0";
const PLAYER_MARKET_MODEL_VERSION = 2;
const OUTCOMES = ["1", "X", "2"];
const WEIGHTS = Object.freeze({ venueHistorical: 0.46, overallHistorical: 0.25, recentForm: 0.16, tacticalMatchup: 0.07, probableLineup: 0.05, objectives: 0.01 });

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const round = (value, digits = 1) => Number(value.toFixed(digits));
const sum = values => values.reduce((total, value) => total + value, 0);
const normalize = values => {
  const total = sum(values);
  if (!Number.isFinite(total) || total <= 0) return [1 / 3, 1 / 3, 1 / 3];
  return values.map(value => value / total);
};
const probabilityObject = values => {
  const first = round(values[0] * 100, 1);
  const second = round(values[1] * 100, 1);
  const third = round(100 - first - second, 1);
  return Object.fromEntries(OUTCOMES.map((outcome, index) => [outcome, [first, second, third][index]]));
};

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

function findOverUnder25(oddsEvent) {
  return oddsEvent?.markets?.find(market => market.marketName === "UNDER/OVER" && Number(market.threshold) === 2.5) || null;
}

function marketGoalExpectation(market) {
  const under = market?.selections?.find(selection => selection.name === "UNDER" && selection.status === "open");
  const over = market?.selections?.find(selection => selection.name === "OVER" && selection.status === "open");
  if (!(under?.odds > 1) || !(over?.odds > 1)) return null;
  const overProbability = (1 / over.odds) / (1 / under.odds + 1 / over.odds);
  let low = 0.5, high = 5.5;
  for (let i = 0; i < 40; i += 1) {
    const lambda = (low + high) / 2;
    const underProbability = Math.exp(-lambda) * (1 + lambda + (lambda ** 2) / 2);
    if (1 - underProbability < overProbability) low = lambda;
    else high = lambda;
  }
  return round((low + high) / 2, 2);
}

function attackChannels(profile) {
  const ids = new Set([...(profile?.playingStyle || []), ...(profile?.strengths || [])].map(item => item.id));
  const scores = { left: 1, central: 1, right: 1 };
  if (ids.has("attaccano-dalla-sinistra")) scores.left += 3;
  if (ids.has("attaccano-dalla-destra")) scores.right += 3;
  if (ids.has("attaccano-al-centro")) scores.central += 3;
  if (ids.has("giocano-in-ampiezza") || ids.has("attaccare-sulle-fasce")) { scores.left += 1.25; scores.right += 1.25; }
  if (ids.has("tentano-spesso-il-cross")) { scores.left += 0.8; scores.right += 0.8; }
  if (ids.has("tentano-spesso-passaggi-filtranti") || ids.has("creare-occasioni-tramite-passaggi-filtranti")) scores.central += 1.2;
  const total = sum(Object.values(scores));
  const percentages = Object.fromEntries(Object.entries(scores).map(([key, value]) => [key, round(value / total * 100, 1)]));
  const dominant = Object.entries(percentages).sort((a, b) => b[1] - a[1])[0][0];
  return { ...percentages, dominant };
}

function matchupMultiplier(attacker, defender) {
  const channels = attackChannels(attacker);
  const attackIds = new Set([...(attacker?.playingStyle || []), ...(attacker?.strengths || [])].map(item => item.id));
  const weaknessIds = new Set((defender?.weaknesses || []).map(item => item.id));
  let multiplier = 1;
  if (weaknessIds.has("difendersi-da-attacchi-sulle-fasce")) multiplier += ((channels.left + channels.right) / 100) * 0.12;
  if (weaknessIds.has("difendersi-da-passaggi-filtranti")) multiplier += (channels.central / 100) * 0.1;
  if (weaknessIds.has("difendersi-da-tiri-da-lontano") && attackIds.has("tentano-tiri-da-lontano")) multiplier += 0.05;
  if (weaknessIds.has("impedire-agli-avversari-di-creare-occasioni")) multiplier += 0.055;
  if (attackIds.has("creare-occasioni-da-gol")) multiplier += 0.035;
  return round(clamp(multiplier, 0.92, 1.18), 3);
}

function poisson(k, lambda) {
  let factorial = 1;
  for (let i = 2; i <= k; i += 1) factorial *= i;
  return Math.exp(-lambda) * (lambda ** k) / factorial;
}

function poissonAtLeast(lambda, threshold) {
  if (!(lambda >= 0) || threshold < 1) return null;
  return round(clamp(1 - sum(Array.from({ length: threshold }, (_, k) => poisson(k, lambda))), 0, 1), 4);
}

function scoreMatrix(homeGoals, awayGoals, maxGoals = 7, calibration = null) {
  const scores = [];
  for (let home = 0; home <= maxGoals; home += 1) {
    for (let away = 0; away <= maxGoals; away += 1) {
      const calibrationFactor = calibration?.factors?.[`${home}-${away}`] || 1;
      scores.push({ home, away, probability: poisson(home, homeGoals) * poisson(away, awayGoals) * calibrationFactor });
    }
  }
  const total = sum(scores.map(score => score.probability));
  return scores.map(score => ({ ...score, probability: score.probability / total }));
}

function profileGoals(profile, fallbackFor, fallbackAgainst) {
  const formationAppearances = profile?.formation?.appearances || 0;
  const formationFor = Number.isFinite(profile?.formation?.goalsFor) && formationAppearances ? profile.formation.goalsFor / formationAppearances : null;
  const formationAgainst = Number.isFinite(profile?.formation?.goalsAgainst) && formationAppearances ? profile.formation.goalsAgainst / formationAppearances : null;
  return {
    for: profile?.derived?.goalsPerGame ?? formationFor ?? fallbackFor,
    against: formationAgainst ?? fallbackAgainst
  };
}

function weightedGeometric(values) {
  const available = values.filter(item => Number.isFinite(item.value) && item.value > 0 && item.weight > 0);
  const totalWeight = sum(available.map(item => item.weight));
  if (!totalWeight) return 1;
  return Math.exp(sum(available.map(item => Math.log(item.value) * item.weight)) / totalWeight);
}

function regressedRatio(rate, baseline, reliability = 0.72) {
  if (!(rate >= 0) || !(baseline > 0)) return null;
  return clamp(1 + (rate / baseline - 1) * reliability, 0.48, 1.8);
}

function divisionAdjustedRate(profile, type, leagueOverall) {
  const goals = profileGoals(profile, leagueOverall, leagueOverall);
  const serieB = profile?.competition !== "Serie A";
  const raw = type === "for" ? goals.for : goals.against;
  if (!serieB) return raw;
  return type === "for" ? raw * 0.51 : raw * 1.29;
}

function lineupImpact(team, squad) {
  const candidates = lineupPlayers(team, squad);
  if (candidates.length !== 11) return { attack: 1, defenceWeakness: 1, resolved: candidates.filter(item => item.player).length, status: "N/D" };
  const baselines = { Attaccante: 0.58, Centrocampista: 0.24, Difensore: 0.075, Portiere: 0 };
  let observedAttack = 0, baselineAttack = 0;
  const defensiveReliability = [];
  for (const candidate of candidates) {
    const baseline = baselines[candidate.role] ?? 0.2;
    const totals = candidate.player?.previousSeason?.totals || {};
    const per90 = totals.per90 || {};
    const reliability = totals.minutes ? clamp(totals.minutes / 1800, 0.3, 1) : 0.25;
    const production = (per90.goals ?? baseline * 0.72) + (per90.assists ?? baseline * 0.22) * 0.55 + (per90.shotsOnTarget ?? baseline * 0.65) * 0.15;
    observedAttack += production * reliability + baseline * (1 - reliability);
    baselineAttack += baseline;
    if (candidate.role === "Portiere" || candidate.role === "Difensore") defensiveReliability.push(reliability);
  }
  const attackRatio = baselineAttack ? observedAttack / baselineAttack : 1;
  const continuity = defensiveReliability.length ? sum(defensiveReliability) / defensiveReliability.length : 0.7;
  return {
    attack: round(clamp(1 + (attackRatio - 1) * 0.08, 0.93, 1.08), 3),
    defenceWeakness: round(clamp(1 + (0.72 - continuity) * 0.08, 0.96, 1.04), 3),
    resolved: candidates.filter(item => item.player).length,
    status: candidates.filter(item => item.player).length >= 8 ? "usable" : "limited"
  };
}

function objectiveGoalFactors(homeObjective, awayObjective) {
  const score = objective => objective
    ? objective.motivationStart * 0.55 + objective.ambition * 0.2 + objective.expectation * 0.15 - objective.pressure * 0.1
    : 50;
  const delta = clamp((score(homeObjective) - score(awayObjective)) / 100, -0.5, 0.5);
  return { home: 1 + delta * 0.025, away: 1 - delta * 0.025 };
}

function headToHeadGoalFactors(history, homeTeamId, leagueSummary) {
  const meetings = history?.previousMeetings || [];
  if (!meetings.length) return { home: 1, away: 1, sample: 0, requested: 5, status: "unavailable", usedInModel: false, record: { wins: 0, draws: 0, losses: 0 }, goals: { for: 0, against: 0, averageTotal: null } };
  let weightTotal = 0, goalsFor = 0, goalsAgainst = 0, wins = 0, draws = 0, losses = 0;
  meetings.forEach((meeting, index) => {
    const currentHomeWasHome = meeting.homeTeam?.id === homeTeamId;
    const scored = currentHomeWasHome ? meeting.score.home : meeting.score.away;
    const conceded = currentHomeWasHome ? meeting.score.away : meeting.score.home;
    const competitionWeight = meeting.competition === "Serie B" ? 0.8 : meeting.competition === "Coppa Italia" ? 0.72 : 1;
    const weight = (0.6 ** index) * competitionWeight;
    weightTotal += weight;
    goalsFor += scored * weight;
    goalsAgainst += conceded * weight;
    if (scored > conceded) wins += 1;
    else if (scored === conceded) draws += 1;
    else losses += 1;
  });
  const weightedFor = goalsFor / weightTotal;
  const weightedAgainst = goalsAgainst / weightTotal;
  const reliability = meetings.length / 5;
  const balance = clamp((weightedFor - weightedAgainst) / Math.max(1, weightedFor + weightedAgainst), -0.6, 0.6);
  const leagueTotal = (leagueSummary?.homeGoalsPerMatch || 1.28) + (leagueSummary?.awayGoalsPerMatch || 1.15);
  const averageTotal = (goalsFor + goalsAgainst) / weightTotal;
  const edge = balance * 0.05 * reliability;
  const tempo = clamp((averageTotal / leagueTotal - 1) * 0.035 * reliability, -0.02, 0.02);
  return {
    home: round(clamp((1 + edge) * (1 + tempo), 0.95, 1.05), 3),
    away: round(clamp((1 - edge) * (1 + tempo), 0.95, 1.05), 3),
    sample: meetings.length,
    requested: 5,
    status: meetings.length === 5 ? "complete" : "limited",
    usedInModel: true,
    record: { wins, draws, losses },
    goals: { for: round(weightedFor, 2), against: round(weightedAgainst, 2), averageTotal: round(averageTotal, 2) },
    method: "Ultimi cinque precedenti ufficiali con decadimento 0,60, peso Serie B 0,80 e Coppa Italia 0,72; correzione complessiva limitata al 5% per lato e validata fuori campione."
  };
}

function xgExpectedGoals(homeProfile, awayProfile, summary) {
  if (!homeProfile || !awayProfile || !summary) return null;
  const leagueHome = summary.homeXgPerMatch;
  const leagueAway = summary.awayXgPerMatch;
  const leagueOverall = (leagueHome + leagueAway) / 2;
  const component = (profile, venue, type, venueBaseline) => weightedGeometric([
    { value: regressedRatio(profile[venue][type], venueBaseline), weight: WEIGHTS.venueHistorical },
    { value: regressedRatio(profile.overall[type], leagueOverall, 0.62), weight: WEIGHTS.overallHistorical },
    { value: regressedRatio(profile.recent[type], leagueOverall, 0.48), weight: WEIGHTS.recentForm }
  ]);
  return {
    home: leagueHome * component(homeProfile, "home", "for", leagueHome) * component(awayProfile, "away", "against", leagueHome),
    away: leagueAway * component(awayProfile, "away", "for", leagueAway) * component(homeProfile, "home", "against", leagueAway)
  };
}

function expectedGoals({ homeVenue, awayVenue, homeProfile, awayProfile, homeRecent, awayRecent, homeXgProfile, awayXgProfile, xgLeagueSummary, homeTeam, awayTeam, homeSquad, awaySquad, homeObjective, awayObjective, headToHead, leagueSummary }) {
  const leagueHome = leagueSummary?.homeGoalsPerMatch || 1.28;
  const leagueAway = leagueSummary?.awayGoalsPerMatch || 1.15;
  const leagueOverall = (leagueHome + leagueAway) / 2;
  const homeLineup = lineupImpact(homeTeam, homeSquad);
  const awayLineup = lineupImpact(awayTeam, awaySquad);
  const objectiveFactors = objectiveGoalFactors(homeObjective, awayObjective);
  const headToHeadFactors = headToHeadGoalFactors(headToHead, homeTeam?.id, leagueSummary);

  const homeAttackStrength = weightedGeometric([
    { value: homeVenue ? regressedRatio(homeVenue.goalsFor / homeVenue.played, leagueHome) : null, weight: WEIGHTS.venueHistorical },
    { value: regressedRatio(divisionAdjustedRate(homeProfile, "for", leagueOverall), leagueOverall, 0.62), weight: WEIGHTS.overallHistorical },
    { value: homeRecent ? regressedRatio(homeRecent.goalsFor, leagueOverall, 0.48) : null, weight: WEIGHTS.recentForm }
  ]);
  const homeDefenceWeakness = weightedGeometric([
    { value: homeVenue ? regressedRatio(homeVenue.goalsAgainst / homeVenue.played, leagueAway) : null, weight: WEIGHTS.venueHistorical },
    { value: regressedRatio(divisionAdjustedRate(homeProfile, "against", leagueOverall), leagueOverall, 0.62), weight: WEIGHTS.overallHistorical },
    { value: homeRecent ? regressedRatio(homeRecent.goalsAgainst, leagueOverall, 0.48) : null, weight: WEIGHTS.recentForm }
  ]);
  const awayAttackStrength = weightedGeometric([
    { value: awayVenue ? regressedRatio(awayVenue.goalsFor / awayVenue.played, leagueAway) : null, weight: WEIGHTS.venueHistorical },
    { value: regressedRatio(divisionAdjustedRate(awayProfile, "for", leagueOverall), leagueOverall, 0.62), weight: WEIGHTS.overallHistorical },
    { value: awayRecent ? regressedRatio(awayRecent.goalsFor, leagueOverall, 0.48) : null, weight: WEIGHTS.recentForm }
  ]);
  const awayDefenceWeakness = weightedGeometric([
    { value: awayVenue ? regressedRatio(awayVenue.goalsAgainst / awayVenue.played, leagueHome) : null, weight: WEIGHTS.venueHistorical },
    { value: regressedRatio(divisionAdjustedRate(awayProfile, "against", leagueOverall), leagueOverall, 0.62), weight: WEIGHTS.overallHistorical },
    { value: awayRecent ? regressedRatio(awayRecent.goalsAgainst, leagueOverall, 0.48) : null, weight: WEIGHTS.recentForm }
  ]);
  const homeShotFactor = clamp(((homeProfile?.summary?.shotsPerGame || 12.5) / 12.5) ** 0.08, 0.95, 1.05);
  const awayShotFactor = clamp(((awayProfile?.summary?.shotsPerGame || 12.5) / 12.5) ** 0.08, 0.95, 1.05);
  const homeContext = matchupMultiplier(homeProfile, awayProfile) * homeShotFactor * homeLineup.attack * awayLineup.defenceWeakness * objectiveFactors.home * headToHeadFactors.home;
  const awayContext = matchupMultiplier(awayProfile, homeProfile) * awayShotFactor * awayLineup.attack * homeLineup.defenceWeakness * objectiveFactors.away * headToHeadFactors.away;
  let home = leagueHome * homeAttackStrength * awayDefenceWeakness * homeContext;
  let away = leagueAway * awayAttackStrength * homeDefenceWeakness * awayContext;
  const xgExpected = xgExpectedGoals(homeXgProfile, awayXgProfile, xgLeagueSummary);
  const xgWeight = xgExpected ? 0.25 : 0;
  if (xgExpected) {
    home = home ** (1 - xgWeight) * (xgExpected.home * homeContext) ** xgWeight;
    away = away ** (1 - xgWeight) * (xgExpected.away * awayContext) ** xgWeight;
  }
  home = clamp(home, 0.28, 3.5);
  away = clamp(away, 0.24, 3.3);
  return {
    home: round(home, 2),
    away: round(away, 2),
    total: round(home + away, 2),
    method: "Forze relative attacco/difesa, forma recente corretta per avversario, xG Understat al 25% quando coperti entrambi i club, matchup, probabili XI, obiettivi e correttivo H2H limitato; quote escluse.",
    components: {
      home: { attackStrength: round(homeAttackStrength, 3), defenceWeakness: round(homeDefenceWeakness, 3), lineup: homeLineup },
      away: { attackStrength: round(awayAttackStrength, 3), defenceWeakness: round(awayDefenceWeakness, 3), lineup: awayLineup },
      recentForm: { home: homeRecent, away: awayRecent },
      objectiveFactors: { home: round(objectiveFactors.home, 3), away: round(objectiveFactors.away, 3) },
      headToHead: headToHeadFactors,
      xg: {
        weight: xgWeight,
        status: xgExpected ? "used" : "fallback-goals",
        homeRaw: xgExpected ? round(xgExpected.home * homeContext, 3) : null,
        awayRaw: xgExpected ? round(xgExpected.away * awayContext, 3) : null,
        source: xgExpected ? "Understat 2025-26" : null
      }
    }
  };
}

function technicalProbabilities(matrix) {
  return normalize([
    sum(matrix.filter(score => score.home > score.away).map(score => score.probability)),
    sum(matrix.filter(score => score.home === score.away).map(score => score.probability)),
    sum(matrix.filter(score => score.home < score.away).map(score => score.probability))
  ]);
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
  return softmaxOutcome(score(homeProfile) * matchupMultiplier(homeProfile, awayProfile) + 1.3, score(awayProfile) * matchupMultiplier(awayProfile, homeProfile), 0.35);
}

function objectiveProbabilities(homeObjective, awayObjective) {
  const score = objective => objective
    ? objective.motivationStart * 0.55 + objective.ambition * 0.2 + objective.expectation * 0.15 - objective.pressure * 0.1
    : 50;
  return softmaxOutcome(score(homeObjective) + 0.8, score(awayObjective), 0.4);
}

function surpriseFactor({ final, market, historical, dataCompleteness, crossCompetition }) {
  const marketAvailable = Array.isArray(market) && market.length === OUTCOMES.length;
  const marketReference = marketAvailable ? market : final;
  const favoriteIndex = marketReference.indexOf(Math.max(...marketReference));
  const oppositeIndex = favoriteIndex === 0 ? 2 : favoriteIndex === 2 ? 0 : (final[0] < final[2] ? 0 : 2);
  const upsetProbability = final[oppositeIndex] + final[1] * 0.45;
  const ambiguity = clamp((1 - Math.max(...final) - 0.2) / 0.47, 0, 1);
  const disagreement = marketAvailable ? clamp(Math.abs(historical[favoriteIndex] - marketReference[favoriteIndex]) / 0.22, 0, 1) : 0;
  const uncertainty = clamp((1 - dataCompleteness) + (crossCompetition ? 0.2 : 0), 0, 1);
  const value = Math.round(100 * (0.38 * clamp(upsetProbability / 0.5, 0, 1) + 0.27 * ambiguity + 0.2 * disagreement + 0.15 * uncertainty));
  return {
    value,
    level: value >= 67 ? "alto" : value >= 42 ? "medio" : "basso",
    upsetOutcome: OUTCOMES[oppositeIndex],
    upsetProbabilityPct: round(final[oppositeIndex] * 100, 1),
    explanation: marketAvailable
      ? "Misura apertura della gara, probabilita dell'esito sfavorito, divergenza tra mercato e dati tecnici e incompletezza prepartita. Non seleziona automaticamente l'outsider."
      : "Misura apertura della gara, probabilita dell'esito sfavorito e incompletezza prepartita. La componente di divergenza dal mercato resta disattivata finche non sono disponibili quote verificate."
  };
}

function confidence(final, surprise, dataCompleteness) {
  const ordered = [...final].sort((a, b) => b - a);
  const separation = clamp((ordered[0] - ordered[1]) / 0.25, 0, 1);
  const value = Math.round(100 * (0.42 * dataCompleteness + 0.33 * separation + 0.25 * (1 - surprise.value / 100)));
  return { value, level: value >= 72 ? "alta" : value >= 52 ? "moderata" : "prudente" };
}

function exactScores(matrix, expectedTotal) {
  const ordered = [...matrix].sort((a, b) => b.probability - a.probability || a.home + a.away - b.home - b.away);
  const selected = ordered.slice(0, 3);
  if (expectedTotal >= 2.55 && !selected.some(score => score.home + score.away >= 3)) {
    const openScore = ordered.find(score => score.home + score.away >= 3 && !selected.includes(score));
    if (openScore) selected[2] = openScore;
  }
  if (expectedTotal <= 2.3 && !selected.some(score => score.home + score.away <= 1)) {
    const tightScore = ordered.find(score => score.home + score.away <= 1 && !selected.includes(score));
    if (tightScore) selected[2] = tightScore;
  }
  return selected
    .map((score, index) => ({ score: `${score.home}-${score.away}`, probabilityPct: round(score.probability * 100, 1), rank: index + 1 }));
}

function scoreForecast(matrix, final) {
  const orderedScores = [...matrix].sort((a, b) => b.probability - a.probability || a.home + a.away - b.home - b.away);
  const outcomeOf = score => score.home > score.away ? "1" : score.home === score.away ? "X" : "2";
  const outcomeProbability = outcome => final[OUTCOMES.indexOf(outcome)];
  const outcomeOrder = OUTCOMES.map((outcome, index) => ({ outcome, probability: final[index] })).sort((a, b) => b.probability - a.probability);
  const decorate = (score, label) => {
    const outcome = outcomeOf(score);
    return {
      score: `${score.home}-${score.away}`,
      outcome,
      label,
      probabilityPct: round(score.probability * 100, 1),
      conditionalProbabilityPct: round(score.probability / outcomeProbability(outcome) * 100, 1),
      isAbsoluteMode: score === orderedScores[0]
    };
  };
  const expectedHome = sum(matrix.map(score => score.home * score.probability));
  const expectedAway = sum(matrix.map(score => score.away * score.probability));
  const primaryScore = matrix.find(score => score.home === Math.round(expectedHome) && score.away === Math.round(expectedAway));
  const modalScore = orderedScores[0];
  const primary = decorate(primaryScore, "Risultato esatto centrale");
  const modal = decorate(modalScore, "Moda assoluta");
  const display = [primary];
  if (modal.score !== primary.score) display.push(modal);
  for (const score of orderedScores) {
    if (display.length === 3) break;
    if (!display.some(item => item.score === `${score.home}-${score.away}`)) display.push(decorate(score, "Altro risultato probabile"));
  }
  return {
    primary,
    modal,
    alternatives: display.slice(1),
    display,
    coherentWithVerdict: primary.outcome === outcomeOrder[0].outcome,
    forcedOutcomeScenarios: false,
    selection: {
      type: "rounded-expected-goals",
      expectedHome: round(expectedHome),
      expectedAway: round(expectedAway)
    },
    method: "Il risultato esatto centrale arrotonda separatamente i gol attesi delle due squadre. La moda assoluta e mostrata a parte; il criterio centrale riduce la concentrazione artificiale sugli 1-0 nel confronto walk-forward pluristagionale."
  };
}

function scoreProfile(matrix, exact) {
  const bands = [
    { id: "tight", label: "0-1 gol", probabilityPct: round(matrixProbability(matrix, score => score.home + score.away <= 1) * 100, 1) },
    { id: "balanced", label: "2-3 gol", probabilityPct: round(matrixProbability(matrix, score => score.home + score.away >= 2 && score.home + score.away <= 3) * 100, 1) },
    { id: "open", label: "4+ gol", probabilityPct: round(matrixProbability(matrix, score => score.home + score.away >= 4) * 100, 1) }
  ];
  const topThreeCoveragePct = round(sum(exact.map(item => item.probabilityPct)), 1);
  const ordered = [...matrix].sort((a, b) => b.probability - a.probability);
  return {
    bands,
    dominantBand: [...bands].sort((a, b) => b.probabilityPct - a.probabilityPct)[0].id,
    topThreeCoveragePct,
    modalGapPct: round((ordered[0].probability - ordered[1].probability) * 100, 1),
    interpretation: "Il primo punteggio e soltanto la moda della distribuzione, non un risultato centrale o certo."
  };
}

const cleanName = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
const PLAYER_NAME_ALIASES = Object.freeze({ belardi: "leonardo balerdi" });

function resolvePlayer(lineupName, squad) {
  const sourceTarget = cleanName(lineupName);
  const target = PLAYER_NAME_ALIASES[sourceTarget] || sourceTarget;
  const targetTokens = target.split(" ");
  const candidates = (squad?.players || []).map(player => ({
    player,
    normalized: [player.name, ...(player.identityAliases || [])].map(cleanName)
  }));
  const names = candidate => candidate.normalized;
  return candidates.find(candidate => names(candidate).includes(target))?.player
    || candidates.find(candidate => names(candidate).some(name => name.endsWith(` ${target}`)))?.player
    || candidates.find(candidate => names(candidate).some(name => targetTokens.every(token => name.split(" ").includes(token))))?.player
    || candidates.find(candidate => {
      if (targetTokens.length < 2) return false;
      return names(candidate).some(name => {
        const candidateTokens = name.split(" ");
        return targetTokens.every(token => candidateTokens.includes(token)
          || (token.length <= 3 && candidateTokens.some(candidateToken => candidateToken.startsWith(token))));
      });
    })?.player
    || null;
}

function inferredLineupRole(team, index) {
  const units = String(team?.probableLineup?.formation || team?.preferredFormation || "4-3-3").split("-").map(Number);
  if (index === 0) return "Portiere";
  if (index <= units[0]) return "Difensore";
  if (index <= units[0] + (units[1] || 0) + (units.length === 4 ? units[2] || 0 : 0)) return "Centrocampista";
  return "Attaccante";
}

function lineupPlayers(team, squad) {
  return (team?.probableLineup?.players || []).map((name, index) => {
    const player = resolvePlayer(name, squad);
    return { name, teamId: team.id, index, role: player?.role || inferredLineupRole(team, index), detailedRole: player?.detailedRole || null, player };
  });
}

const PLAYER_VOLUME_PRIORS = Object.freeze({
  Portiere: { shots: 0.01, shotsOnTarget: 0, foulsCommitted: 0.04 },
  Difensore: { shots: 0.65, shotsOnTarget: 0.18, foulsCommitted: 0.95 },
  Centrocampista: { shots: 1.35, shotsOnTarget: 0.42, foulsCommitted: 1.15 },
  Attaccante: { shots: 2.35, shotsOnTarget: 0.86, foulsCommitted: 0.82 }
});

function playerMarketQuote(oddsEvent, candidate, marketCode, threshold) {
  const names = [candidate.name, candidate.player?.name].filter(Boolean).map(cleanName);
  // A lineup alias such as "Yeboah J." must never turn the isolated initial
  // into a surname and match an unrelated provider label (for example
  // "Schingtienne J."). If the player's real surname is absent, fail closed.
  const surnames = new Set(names.map(name => name.split(" ").at(-1)).filter(surname => surname?.length > 1));
  const matches = (oddsEvent?.markets || []).filter(market =>
    String(market.marketCode) === marketCode &&
    market.status === "open" &&
    Number(market.threshold) === threshold
  ).map(market => {
    const variant = cleanName(market.variantName);
    let score = 0;
    for (const surname of surnames) if (variant.split(" ").includes(surname)) score += 7;
    for (const name of names) for (const token of name.split(" ").slice(0, -1)) if (token.length > 2 && variant.split(" ").includes(token)) score += 2;
    return { market, score };
  }).filter(item => item.score >= 7).sort((left, right) => right.score - left.score);
  if (!matches.length || (matches[1] && matches[1].score === matches[0].score && matches[1].market.variantName !== matches[0].market.variantName)) return null;
  const market = matches[0].market;
  const selection = market.selections?.find(item => item.status === "open" && item.odds > 1 && cleanName(item.name) === "over");
  return selection ? {
    providerMarketId: market.providerMarketId,
    providerSelectionId: selection.providerSelectionId,
    marketCode: String(market.marketCode),
    selection: selection.name,
    threshold,
    odds: selection.odds,
    replacementIncluded: /SOST|DUO|INC TS/i.test(`${market.marketName} ${market.variantName}`)
  } : null;
}

function scalePlayerVolume(candidates, key, teamCentral) {
  const raw = candidates.filter(candidate => candidate.role !== "Portiere").map(candidate => {
    const totals = candidate.player?.previousSeason?.totals || {};
    const per90 = totals.per90 || {};
    const minutes = Number(totals.minutes || 0);
    const prior = PLAYER_VOLUME_PRIORS[candidate.role] || PLAYER_VOLUME_PRIORS.Centrocampista;
    const reliability = clamp(minutes / (minutes + 900), 0, 0.82);
    const observed = Number.isFinite(per90[key]) ? per90[key] : prior[key];
    return { candidate, minutes, observed, reliability, value: (observed * reliability + prior[key] * (1 - reliability)) * 0.94 };
  });
  const total = sum(raw.map(item => item.value));
  const factor = total && Number.isFinite(teamCentral) ? clamp(teamCentral / total, 0.72, 1.35) : 1;
  return raw.map(item => ({ ...item, projection: round(item.value * factor, 2) }));
}

function playerBaselineStability({ historicalBaseline, historicalObserved, historicalMinutes, current, key, roleContinuity = true, includePersistence = false }) {
  const coverageKey = `${key}Coverage`;
  const currentMinutes = Number(current?.minutes || 0);
  const currentValue = Number(current?.[key]);
  const currentCoverage = Number(current?.[coverageKey] || 0);
  const hasCurrent = currentMinutes > 0 && currentCoverage > 0 && Number.isFinite(currentValue);
  const currentPer90 = hasCurrent ? currentValue * 90 / currentMinutes : null;
  const sequence = Array.isArray(current?.[`${key}Sequence`]) ? current[`${key}Sequence`].filter(Number.isFinite) : [];
  const onePlusMatches = sequence.filter(value => value >= 1).length;
  const onePlusShare = sequence.length ? onePlusMatches / sequence.length : null;
  const firstWindow = sequence.length >= 5 ? sequence.slice(0, 2) : sequence.slice(0, Math.max(1, Math.floor(sequence.length / 2)));
  const recentWindow = sequence.length >= 5 ? sequence.slice(-3) : sequence.slice(Math.max(1, Math.floor(sequence.length / 2)));
  const windowMean = values => values.length ? sum(values) / values.length : null;
  const firstWindowMean = windowMean(firstWindow);
  const recentWindowMean = windowMean(recentWindow);
  const trend = firstWindowMean > 0 && recentWindowMean <= firstWindowMean * 0.5 ? "declining" : firstWindowMean > 0 && recentWindowMean >= firstWindowMean * 1.5 ? "rising" : "stable-or-unclear";
  const persistenceLevel = onePlusShare == null ? "unknown" : trend === "declining" && onePlusShare <= 0.6 ? "low" : onePlusShare >= 0.8 ? "high" : onePlusShare >= 0.6 ? "medium" : "low";
  const currentPersistence = { sequence, onePlusMatches, onePlusShare: onePlusShare == null ? null : round(onePlusShare), level: persistenceLevel, firstWindowMean: firstWindowMean == null ? null : round(firstWindowMean), recentWindowMean: recentWindowMean == null ? null : round(recentWindowMean), trend, modelEffect: "diagnostic-current-weight-already-controlled-by-aggregate-agreement" };
  const historicalSampleReliability = clamp(Number(historicalMinutes || 0) / (Number(historicalMinutes || 0) + 900), 0, 0.82);
  const currentSampleReliability = hasCurrent ? clamp(currentMinutes / (currentMinutes + 900), 0, 0.35) : 0;
  if (!hasCurrent) return {
    value: historicalBaseline, score: null, level: "unknown", historicalCurrentAgreement: null,
    historicalSample: { minutes: historicalMinutes || 0, per90: round(historicalObserved), reliability: round(historicalSampleReliability) },
    currentSample: { minutes: 0, per90: null, reliability: 0, coverage: 0 },
    roleContinuity: roleContinuity ? "current-roster-role-consistent" : "unknown",
    confidence: historicalSampleReliability >= 0.65 ? "medium" : "low",
    evidence: ["campione current non disponibile: baseline storica/role prior preservata"],
    method: "sample-reliability-separated-from-historical-current-agreement"
  };
  const denominator = Math.max(Math.abs(historicalObserved), Math.abs(currentPer90), key === "shotsOnTarget" ? 0.15 : 0.4);
  const agreement = clamp(1 - Math.abs(currentPer90 - historicalObserved) / denominator, 0, 1);
  const score = clamp(agreement * 0.85 + (roleContinuity ? 1 : 0.5) * 0.15, 0, 1);
  const level = score >= 0.8 ? "high" : score >= 0.55 ? "medium" : "low";
  const stabilityDampening = 0.55 + 0.45 * agreement;
  const effectiveCurrentWeight = currentSampleReliability * stabilityDampening;
  const value = historicalBaseline * (1 - effectiveCurrentWeight) + currentPer90 * effectiveCurrentWeight;
  return {
    value, score: round(score), level, historicalCurrentAgreement: round(agreement),
    historicalSample: { minutes: historicalMinutes || 0, per90: round(historicalObserved), reliability: round(historicalSampleReliability) },
    currentSample: { minutes: currentMinutes, per90: round(currentPer90), reliability: round(currentSampleReliability), coverage: currentCoverage, ...(includePersistence ? { persistence: currentPersistence } : {}) },
    roleContinuity: roleContinuity ? "current-roster-role-consistent" : "unknown",
    confidence: currentMinutes >= 270 && historicalMinutes >= 900 ? "medium" : "medium-low",
    evidence: [`storico ${round(historicalObserved)} /90 su ${historicalMinutes || 0} minuti`, `current ${round(currentPer90)} /90 su ${currentMinutes} minuti`, ...(includePersistence ? [`persistenza current ${persistenceLevel}${trend === "declining" ? "/declining" : ""}: ${onePlusMatches}/${sequence.length} gare con almeno 1`] : []), `peso current effettivo ${round(effectiveCurrentWeight * 100, 1)}% dopo agreement`],
    method: "historical-baseline-plus-current-signal-weighted-by-sample-and-agreement-without-multiplicative-double-count"
  };
}

const EXPECTED_MINUTES_PRIORS = Object.freeze({ Difensore: 79, Centrocampista: 76, Attaccante: 74, Portiere: 90 });
const EXPECTED_MINUTES_POLICY = Object.freeze({
  historicalEquivalentAppearances: 12,
  currentStarterEquivalentMatches: 5,
  recentWindowMatches: 5,
  maximumHistoricalWeight: 0.76,
  maximumCurrentStarterWeight: 0.5
});

function expectedMinutes(candidate, current = null) {
  const totals = candidate.player?.previousSeason?.totals || {};
  const prior = EXPECTED_MINUTES_PRIORS[candidate.role] || 76;
  const appearances = Number(totals.appearances || 0);
  const starts = Number(totals.starts || 0);
  const substituteAppearances = Number(totals.substituteAppearances || 0);
  const estimatedStarterMinutes = Number(totals.minutes || 0) - substituteAppearances * 22;
  const historical = starts > 0 ? clamp(estimatedStarterMinutes / starts, 45, 90) : prior;
  const historyWeight = clamp(appearances / (appearances + EXPECTED_MINUTES_POLICY.historicalEquivalentAppearances), 0, EXPECTED_MINUTES_POLICY.maximumHistoricalWeight);
  let estimate = prior * (1 - historyWeight) + historical * historyWeight;
  if (current?.starterAppearances) {
    const currentAverage = current.starterMinutes / current.starterAppearances;
    const currentWeight = clamp(current.starterAppearances / (current.starterAppearances + EXPECTED_MINUTES_POLICY.currentStarterEquivalentMatches), 0, EXPECTED_MINUTES_POLICY.maximumCurrentStarterWeight);
    estimate = estimate * (1 - currentWeight) + currentAverage * currentWeight;
  }
  const recentTeamMatches = Number(current?.recentTeamMatches || 0);
  const recentAverageMinutes = Number.isFinite(current?.recentAverageMinutes) ? current.recentAverageMinutes : null;
  const recentWeight = recentAverageMinutes == null
    ? 0
    : clamp(recentTeamMatches / (recentTeamMatches + EXPECTED_MINUTES_POLICY.currentStarterEquivalentMatches), 0, EXPECTED_MINUTES_POLICY.maximumCurrentStarterWeight);
  if (recentWeight > 0) estimate = estimate * (1 - recentWeight) + recentAverageMinutes * recentWeight;
  estimate = round(clamp(estimate, 0, 90), 1);
  const completionRate = starts ? Number(totals.completeMatches || 0) / starts : null;
  const substitutedRate = starts ? Number(totals.substitutedOff || 0) / starts : null;
  const substitutionRisk = estimate >= 82 && (substitutedRate == null || substitutedRate < 0.42)
    ? "low"
    : estimate < 70 || (substitutedRate != null && substitutedRate >= 0.68)
      ? "high"
      : "medium";
  return {
    expectedMinutes: estimate,
    minutesFactor: round(estimate / 90, 3),
    substitutionRisk,
    likelyReplacement: null,
    evidence: {
      priorMinutes: prior,
      appearances,
      starts,
      minutesPerAppearance: Number.isFinite(totals.minutesPerAppearance) ? totals.minutesPerAppearance : null,
      completeMatches: Number.isFinite(totals.completeMatches) ? totals.completeMatches : null,
      substitutedOff: Number.isFinite(totals.substitutedOff) ? totals.substitutedOff : null,
      substituteAppearances,
      completionRate: completionRate == null ? null : round(completionRate, 3),
      substitutedRate: substitutedRate == null ? null : round(substitutedRate, 3),
      currentStarterAppearances: current?.starterAppearances || 0,
      recentTeamMatches,
      recentAppearances: current?.recentAppearances || 0,
      recentStarts: current?.recentStarts || 0,
      recentAverageMinutes: recentAverageMinutes == null ? null : round(recentAverageMinutes, 1),
      recentWeight: round(recentWeight, 3),
      lastAppearanceMatchday: current?.lastAppearanceMatchday || null,
      fallbackUsed: appearances === 0 && !current?.starterAppearances && recentAverageMinutes == null,
      policy: EXPECTED_MINUTES_POLICY
    }
  };
}

function opponentShotConcession(volumeProfile, venue) {
  const opponentVenue = venue === "home" ? "away" : "home";
  const sample = volumeProfile?.venues?.[opponentVenue]?.totalShots?.against;
  return sample?.matches ? sample.mean : null;
}

function matchupRole(candidate) {
  const detail = cleanName(candidate.detailedRole);
  if (/centravanti|prima punta|punta centrale|attaccante centrale/.test(detail)) return "CF";
  if (/seconda punta|trequartista/.test(detail)) return "AM";
  if (/ala/.test(detail) || (candidate.role === "Attaccante" && /esterno/.test(detail))) return "W";
  if (/terzino/.test(detail) || (candidate.role === "Difensore" && /esterno/.test(detail))) return "FB";
  if (/difensore centrale|centrale difensivo/.test(detail)) return "CB";
  if (candidate.role === "Centrocampista" && (!detail || /centrocampista|centrale|mediano|mezzala|interno/.test(detail))) return "CM";
  if (candidate.role === "Difensore") return "CB";
  if (candidate.role === "Centrocampista") return "CM";
  if (candidate.role === "Attaccante") return "CF";
  return null;
}

function opponentAbilityToExploit(teamProfile, teamProjection = {}) {
  const channels = attackChannels(teamProfile);
  const shots = teamProjection?.shotsTotal?.central ?? teamProfile?.summary?.shotsPerGame ?? 10.5;
  const corners = teamProjection?.corners?.central ?? 4;
  const possession = teamProfile?.summary?.possessionPct ?? 50;
  const passAccuracy = teamProfile?.summary?.passSuccessPct ?? 82;
  const aerials = teamProfile?.summary?.aerialWonPerGame ?? 11;
  const wideShare = (channels.left + channels.right) / 100;
  const score = (value, low, high) => clamp((value - low) / (high - low), 0, 1);
  const volume = score(shots, 9, 17);
  const control = 0.55 * score(possession, 42, 60) + 0.45 * score(passAccuracy, 78, 90);
  const cornerPressure = score(corners, 3, 8);
  const wide = 0.45 * score(wideShare, 0.4, 0.75) + 0.3 * cornerPressure + 0.25 * volume;
  const territorial = 0.45 * control + 0.4 * volume + 0.15 * cornerPressure;
  const setPiece = 0.6 * cornerPressure + 0.4 * score(aerials, 8, 16);
  const general = 0.6 * volume + 0.4 * control;
  const shotsPer10PctPossession = possession > 0 ? shots / (possession / 10) : null;
  const directStyle = (teamProfile?.playingStyle || []).some(item => item.id === "contropiede") || (teamProfile?.strengths || []).some(item => item.id === "contropiede") ? 1 : 0;
  const transition = 0.75 * score(shotsPer10PctPossession, 1.5, 4.5) + 0.25 * directStyle;
  return {
    general: round(general, 3),
    territorial: round(territorial, 3),
    wide: round(wide, 3),
    setPiece: round(setPiece, 3),
    transition: round(transition, 3),
    inputs: { possessionPct: possession, passAccuracyPct: passAccuracy, projectedTeamShots: shots, projectedCorners: corners, wideAttackShare: round(wideShare), aerialWonPerGame: aerials, shotsPer10PctPossession: round(shotsPer10PctPossession), directStyle },
    method: "feature-specific-0-to-1-strength-proxies"
  };
}

function abilityForRole(role, ability) {
  if (!ability) return 1;
  if (role === "W" || role === "AM") return 0.35 * ability.general + 0.3 * ability.territorial + 0.35 * ability.wide;
  if (role === "CM" || role === "DM") return 0.4 * ability.general + 0.45 * ability.territorial + 0.15 * ability.wide;
  if (role === "FB") return 0.3 * ability.general + 0.35 * ability.territorial + 0.35 * ability.wide;
  if (role === "CB") return 0.25 * ability.general + 0.15 * ability.territorial + 0.6 * ability.setPiece;
  return 0.5 * ability.general + 0.35 * ability.territorial + 0.15 * ability.setPiece;
}

function teamProfilePlayerModifier(candidate, baselineShots90, baselineShotsOnTarget90, opponentTeamMatchupProfile, abilityToExploit) {
  const role = matchupRole(candidate);
  const policy = role ? opponentTeamMatchupProfile?.vulnerabilities?.positionalShotVulnerability?.[role] : null;
  const neutral = (confidence, evidence) => ({ factor: 1, shotFactor: 1, sotFactor: 1, role, confidence, abilityToExploit: null, shotBoostPct: 0, sotBoostPct: 0, evidence });
  if (policy?.status === "watch") return {
    ...neutral(policy.confidence || null, [`profilo ${role} in watch: segnale osservato senza effetto sul modello`])
  };
  if (policy && !policy.active) return {
    ...neutral(policy.confidence || null, [`profilo ${role} sperimentale o non attivo`])
  };
  if (policy && !(baselineShots90 >= policy.minimumBaselineShots90)) return {
    ...neutral(policy.confidence || null, [`profilo ${role} non applicato: baseline ${round(baselineShots90, 2)} sotto soglia ${policy.minimumBaselineShots90}`])
  };
  if (!policy) return {
    ...neutral(null, ["profilo posizionale specifico non disponibile"])
  };
  const baselineEligibility = clamp(baselineShots90 / policy.minimumBaselineShots90, 0, 1);
  const interactionEnabled = Boolean(opponentTeamMatchupProfile?.modelPolicy?.interactionPolicy?.enabled);
  const roleAbility = interactionEnabled ? clamp(abilityForRole(role, abilityToExploit), 0, 1) : 1;
  const shotBoostPct = policy.effectiveMaxBoostPct * baselineEligibility * roleAbility;
  const minimumBaselineSot90 = policy.minimumBaselineSot90 ?? 0;
  const sotEligibility = baselineShotsOnTarget90 > 0
    ? minimumBaselineSot90 > 0 ? (baselineShotsOnTarget90 >= minimumBaselineSot90 ? 1 : 0) : baselineEligibility
    : 0;
  const sotBoostPct = (policy.effectiveMaxSotBoostPct ?? policy.effectiveMaxBoostPct) * sotEligibility * roleAbility;
  return {
    factor: round(1 + shotBoostPct / 100, 4),
    shotFactor: round(1 + shotBoostPct / 100, 4),
    sotFactor: round(1 + sotBoostPct / 100, 4),
    role,
    confidence: policy.confidence,
    abilityToExploit: interactionEnabled ? { ...abilityToExploit, roleScore: round(roleAbility, 3) } : null,
    shotBoostPct: round(shotBoostPct, 2),
    sotBoostPct: round(sotBoostPct, 2),
    evidence: [`profilo ${role} vs ${opponentTeamMatchupProfile.teamName}: tiri +${round(shotBoostPct, 2)}%, SOT +${round(sotBoostPct, 2)}%`, `baseline SOT ${round(baselineShotsOnTarget90, 2)} /90; soglia ruolo ${minimumBaselineSot90 || "N/D"}`, ...(interactionEnabled ? [`ability to exploit ${round(roleAbility * 100, 1)}%; budget unico dampened`] : []), `confidence ${policy.confidence}, campione ${policy.sampleSize}, volatilita ${opponentTeamMatchupProfile.volatility.shotsAllowed}`]
  };
}

function playerMatchup(candidate, teamProfile, opponentProfile, opponentVolumeProfile, venue, baselineShots90, baselineShotsOnTarget90, opponentTeamMatchupProfile, teamProjection) {
  const side = playerSide(candidate);
  const channels = attackChannels(teamProfile);
  const channelShare = channels[side] / 100;
  const weaknessIds = new Set((opponentProfile?.weaknesses || []).map(item => item.id));
  const attackIds = new Set([...(teamProfile?.playingStyle || []), ...(teamProfile?.strengths || [])].map(item => item.id));
  let factor = 1 + (channelShare - 1 / 3) * 0.18;
  const evidence = [`canale ${side}: ${round(channelShare * 100, 1)}%`];
  const wide = side !== "central";
  if (wide && weaknessIds.has("difendersi-da-attacchi-sulle-fasce")) {
    factor += 0.045;
    evidence.push("vulnerabilita avversaria sulle fasce");
  }
  if (!wide && weaknessIds.has("difendersi-da-passaggi-filtranti")) {
    factor += 0.04;
    evidence.push("vulnerabilita avversaria centrale");
  }
  if (weaknessIds.has("difendersi-da-tiri-da-lontano") && attackIds.has("tentano-tiri-da-lontano") && candidate.role !== "Attaccante") {
    factor += 0.035;
    evidence.push("incrocio favorevole sui tiri da lontano");
  }
  const conceded = opponentShotConcession(opponentVolumeProfile, venue);
  if (Number.isFinite(conceded)) {
    const volumeFactor = clamp(1 + (conceded / 12.5 - 1) * 0.35, 0.94, 1.06);
    factor *= volumeFactor;
    evidence.push(`${round(conceded, 1)} tiri concessi/gara nel campione di sede`);
  } else evidence.push("volume concesso N/D: componente neutra");
  const genericMatchupFactor = round(clamp(factor, 0.82, 1.18), 3);
  const abilityToExploit = opponentTeamMatchupProfile?.modelPolicy?.interactionPolicy?.enabled ? opponentAbilityToExploit(teamProfile, teamProjection) : null;
  const teamSpecific = teamProfilePlayerModifier(candidate, baselineShots90, baselineShotsOnTarget90, opponentTeamMatchupProfile, abilityToExploit);
  return {
    matchupFactor: round(clamp(genericMatchupFactor * teamSpecific.shotFactor, 0.82, 1.18), 3),
    shotsMatchupFactor: round(clamp(genericMatchupFactor * teamSpecific.shotFactor, 0.82, 1.18), 3),
    shotsOnTargetMatchupFactor: round(clamp(genericMatchupFactor * teamSpecific.sotFactor, 0.82, 1.18), 3),
    genericMatchupFactor,
    teamProfileMatchupFactor: teamSpecific.shotFactor,
    teamProfileShotsMatchupFactor: teamSpecific.shotFactor,
    teamProfileShotsOnTargetMatchupFactor: teamSpecific.sotFactor,
    teamProfileRole: teamSpecific.role,
    teamProfileConfidence: teamSpecific.confidence,
    opponentAbilityToExploit: teamSpecific.abilityToExploit,
    teamProfileShotBoostPct: teamSpecific.shotBoostPct,
    teamProfileSotBoostPct: teamSpecific.sotBoostPct,
    matchupEvidence: [...evidence, ...teamSpecific.evidence],
    side
  };
}

function teamOffensiveAllocation(rows, key, teamCentral, teamMatchupProfile) {
  const baselineValues = rows.map(row => Math.max(0, row[key]));
  const rawTotal = sum(baselineValues);
  const teamScaling = rawTotal > 0 && Number.isFinite(teamCentral) ? teamCentral / rawTotal : 1;
  const uniformValues = baselineValues.map(value => value * teamScaling);
  const extraVolume = Math.max(0, Number.isFinite(teamCentral) ? teamCentral - rawTotal : 0);
  const suppressedVolume = Math.max(0, Number.isFinite(teamCentral) ? rawTotal - teamCentral : 0);
  const allocationMode = extraVolume > 0.000001 ? "EXTRA_VOLUME" : suppressedVolume > 0.000001 ? "COMPRESSION" : "NEUTRAL";
  const allocation = teamMatchupProfile?.offense?.teamOffensiveAllocation;
  const distribution = teamMatchupProfile?.offense?.shotsForRoleDistribution;
  if (!allocation?.enabled || !distribution || !(rawTotal > 0) || !Number.isFinite(teamCentral)) return { values: uniformValues, rawTotal, teamScaling, extraVolume: round(extraVolume, 3), suppressedVolume: round(suppressedVolume, 3), allocationMode, factors: rows.map(() => 1), classifications: rows.map(() => "legacy-uniform"), evidence: rows.map(() => ["team offensive allocation non attiva"]) };
  const isSot = key.toLowerCase().includes("ontarget");
  const roleShares = isSot ? distribution.shotsOnTargetShareByRole : distribution.shareByRole;
  const playerShareKey = isSot ? "shotsOnTargetShare" : "shotsShare";
  const playerById = new Map((distribution.playerDistribution || []).map(player => [player.playerId, player]));
  const baselineShares = rows.map(row => Math.max(0, row[key]) / rawTotal);
  const lineupPlayerEvidence = rows.map(row => playerById.get(row.playerId)?.[playerShareKey] || 0);
  const playerEvidenceWithPrior = lineupPlayerEvidence.map((value, index) => value + baselineShares[index] * 0.25);
  const lineupPlayerEvidenceTotal = sum(playerEvidenceWithPrior);
  const playerTargets = lineupPlayerEvidenceTotal > 0 ? playerEvidenceWithPrior.map(value => value / lineupPlayerEvidenceTotal) : baselineShares;
  const roleRawTotals = new Map();
  rows.forEach((row, index) => roleRawTotals.set(row.teamProfileRole, (roleRawTotals.get(row.teamProfileRole) || 0) + baselineShares[index]));
  const roleTargets = rows.map((row, index) => {
    const roleTotal = roleRawTotals.get(row.teamProfileRole) || 0;
    const roleShare = roleShares?.[row.teamProfileRole];
    return Number.isFinite(roleShare) && roleTotal > 0 ? roleShare * baselineShares[index] / roleTotal : baselineShares[index];
  });
  const roleTargetTotal = sum(roleTargets);
  const normalizedRoleTargets = roleTargetTotal > 0 ? roleTargets.map(value => value / roleTargetTotal) : baselineShares;
  const cornerStrength = clamp((teamMatchupProfile.offense?.teamSetPieceOpportunityVolume?.shrunkCornersPerGame || 4) / 8, 0, 1);
  const setPieceScores = rows.map(row => {
    const detail = cleanName(row.detailedRole);
    const explicitCentreBack = row.teamProfileRole === "CB" && /difensore centrale|centrale difensivo/.test(detail);
    const explicitFullback = row.teamProfileRole === "FB" && /terzino|esterno difensivo/.test(detail);
    if (!explicitCentreBack && !explicitFullback) return 0;
    const baseline = isSot ? row.baselineShotsOnTarget90 : row.baselineShots90;
    const floor = isSot ? 0.05 : 0.15;
    const range = isSot ? 0.35 : 0.75;
    return clamp((baseline - floor) / range, 0, 1) * cornerStrength;
  });
  const setPieceTotal = sum(setPieceScores);
  const setPieceTargets = setPieceTotal > 0 ? setPieceScores.map(value => value / setPieceTotal) : baselineShares;
  const playerWeight = allocation.playerWeight ?? 0.6;
  const roleWeight = allocation.roleWeight ?? 0.3;
  const setPieceWeight = allocation.setPieceWeight ?? 0.1;
  const weightTotal = playerWeight + roleWeight + setPieceWeight || 1;
  const evidenceTargets = rows.map((row, index) => (playerTargets[index] * playerWeight + normalizedRoleTargets[index] * roleWeight + setPieceTargets[index] * setPieceWeight) / weightTotal);
  const currentWeight = clamp(allocation.currentEvidenceWeight || 0, 0, 0.5);
  const tierById = new Map((teamMatchupProfile.offense?.shooterStructure?.playerTiers || []).map(player => [player.playerId, player]));
  const tierKey = isSot ? "sotTier" : "shotTier";
  const tierWeights = { primary: 1, "co-primary": 0.9, secondary: 0.65, occasional: 0.25, "low-volume": 0.05 };
  const classifications = rows.map(row => tierById.get(row.playerId)?.[tierKey]?.tier || ((playerById.get(row.playerId)?.[isSot ? "shotsOnTarget" : "shots"] || 0) > 0 ? "secondary" : "low-volume"));
  const breadthScores = rows.map((row, index) => Math.sqrt(Math.max(baselineShares[index], 0)) * (tierWeights[classifications[index]] ?? 0.25));
  const breadthTotal = sum(breadthScores);
  const breadthTargets = breadthTotal > 0 ? breadthScores.map(value => value / breadthTotal) : baselineShares;
  const breadthWeight = clamp(allocation.expansionBreadthWeight || 0, 0, 0.35);
  const evidenceWithBreadth = evidenceTargets.map((target, index) => target * (1 - breadthWeight) + breadthTargets[index] * breadthWeight);
  const targetShares = baselineShares.map((share, index) => share * (1 - currentWeight) + evidenceWithBreadth[index] * currentWeight);
  const [minFactor, maxFactor] = allocation.factorClamp || [0.85, 1.15];
  const stabilityScores = rows.map(row => clamp(row.playerBaselineStability?.score ?? row.playerBaselineStability?.currentWeight ?? 0.5, 0, 1));
  const retentionWeights = classifications.map((classification, index) => (tierWeights[classification] ?? 0.25) * 0.6 + stabilityScores[index] * 0.4 + 0.35);
  const removalScores = baselineValues.map((value, index) => value / Math.max(retentionWeights[index], 0.1));
  const removalTotal = sum(removalScores);
  let values = extraVolume > 0
    ? baselineValues.map((value, index) => value + extraVolume * targetShares[index])
    : suppressedVolume > 0 && removalTotal > 0
      ? baselineValues.map((value, index) => Math.max(0, value - suppressedVolume * removalScores[index] / removalTotal))
      : [...uniformValues];
  values = values.map((value, index) => clamp(value, uniformValues[index] * minFactor, uniformValues[index] * maxFactor));
  for (let iteration = 0; iteration < 6; iteration += 1) {
    const residual = teamCentral - sum(values);
    if (Math.abs(residual) <= 0.000001) break;
    const rooms = values.map((value, index) => residual > 0
      ? Math.max(0, uniformValues[index] * maxFactor - value)
      : Math.max(0, value - uniformValues[index] * minFactor));
    const totalRoom = sum(rooms);
    if (!(totalRoom > 0)) break;
    values = values.map((value, index) => value + Math.sign(residual) * Math.min(rooms[index], Math.abs(residual) * rooms[index] / totalRoom));
  }
  const factors = values.map((value, index) => uniformValues[index] > 0 ? value / uniformValues[index] : 1);
  const evidence = rows.map((row, index) => [
    `allocation ${classifications[index]}: fattore ${round(factors[index], 3)}`,
    extraVolume > 0
      ? `allocation applicata a ${round(extraVolume, 2)} tiri extra; baseline individuale preservata`
      : `soppressione team di ${round(suppressedVolume, 2)} tiri prima della riallocazione; retention tier ${round(retentionWeights[index], 3)}`,
    `current evidence weight ${round(currentWeight * 100, 1)}%`,
    `ruolo ${row.teamProfileRole || "N/D"}; quota ruolo ${Number.isFinite(roleShares?.[row.teamProfileRole]) ? round(roleShares[row.teamProfileRole] * 100, 1) : "N/D"}%`,
    ...(setPieceScores[index] > 0 ? [`opportunita piazzati: ${teamMatchupProfile.offense.teamSetPieceOpportunityVolume.shrunkCornersPerGame} corner/gara shrinkati`] : [])
  ]);
  return { values, rawTotal, teamScaling, extraVolume: round(extraVolume, 3), suppressedVolume: round(suppressedVolume, 3), allocationMode, factors, classifications, evidence, method: allocation.method, confidence: currentWeight >= 0.4 ? "medium" : "medium-low" };
}

function reconcilePlayerVolumes(rows, key, teamCentral, capKey = null, teamMatchupProfile = null) {
  const result = teamOffensiveAllocation(rows, key, teamCentral, teamMatchupProfile);
  const allocationActive = Boolean(teamMatchupProfile?.offense?.teamOffensiveAllocation?.enabled);
  const teamScaling = result.teamScaling;
  let values = result.values;
  if (capKey) {
    for (let iteration = 0; iteration < 4; iteration += 1) {
      values = values.map((value, index) => Math.min(value, rows[index][capKey]));
      const missing = teamCentral - sum(values);
      if (missing <= 0.001) break;
      const eligible = values.map((value, index) => ({ index, room: rows[index][capKey] - value })).filter(item => item.room > 0.001);
      const room = sum(eligible.map(item => item.room));
      if (!room) break;
      for (const item of eligible) values[item.index] += missing * item.room / room;
    }
  }
  rows.forEach((row, index) => {
    row[key] = round(values[index], 2);
    row[`${key}TeamScaling`] = round(teamScaling, 3);
    if (key === "projectedShots") row.teamScaling = round(teamScaling, 3);
    if (key === "projectedShots" && allocationActive) {
      row.playerAllocationFactor = round(result.factors[index], 3);
      row.allocationClass = result.classifications[index];
      row.allocationConfidence = result.confidence || null;
      row.allocationEvidence = result.evidence[index];
    }
    if (key === "projectedShotsOnTarget" && allocationActive) row.playerSotAllocationFactor = round(result.factors[index], 3);
  });
  return {
    preReconciliation: round(result.rawTotal, 3),
    teamTarget: round(teamCentral, 3),
    postReconciliation: round(sum(rows.map(row => row[key])), 3),
    extraVolume: result.extraVolume,
    suppressedVolume: result.suppressedVolume,
    allocationMode: result.allocationMode,
    teamScaling: round(teamScaling, 4),
    capKey
  };
}

function outsiderQualification(row, market) {
  const isSot = market === "shots-on-target";
  const stability = isSot ? row.playerSotBaselineStability : row.playerBaselineStability;
  const score = isSot ? row.sotOutsiderScore : row.outsiderScore;
  const historicalReliability = clamp(stability?.historicalSample?.reliability || 0, 0, 1);
  const currentReliability = clamp(stability?.currentSample?.reliability || 0, 0, 1);
  const stabilityScore = clamp(stability?.score || 0, 0, 1);
  const expectedMinutesReliability = clamp((row.expectedMinutes - 45) / 45, 0, 1);
  const genericDetailedRole = !row.detailedRole || cleanName(row.detailedRole) === cleanName(row.role);
  const roleSpecificity = genericDetailedRole ? 0 : 1;
  const evidenceScore = 0.4 * stabilityScore + 0.25 * historicalReliability + 0.15 * currentReliability + 0.1 * expectedMinutesReliability + 0.1 * roleSpecificity;
  const confidence = evidenceScore >= 0.74 ? "high" : evidenceScore >= 0.58 ? "medium" : "low";
  const reasons = [];
  if (historicalReliability === 0 && currentReliability < 0.25) reasons.push("missing-history-and-limited-current-sample");
  if (evidenceScore < 0.58) reasons.push("insufficient-combined-evidence");
  if (genericDetailedRole && stabilityScore < 0.7) reasons.push("generic-detailed-role-with-low-stability");
  if (row.expectedMinutes < 65 && row.substitutionRisk === "high") reasons.push("limited-expected-minutes");
  if (isSot) {
    if (!(score >= 40)) reasons.push("sot-score-below-quality-floor");
    if (!(row.shotOnTargetProbabilities.over05 >= 0.3)) reasons.push("sot-1plus-probability-below-floor");
    if (!(row.shotOnTargetProbabilities.over15 >= 0.05)) reasons.push("sot-2plus-probability-below-floor");
  } else {
    if (!(score >= 45)) reasons.push("shot-score-below-quality-floor");
    if (!(row.shotProbabilities.over05 >= 0.55)) reasons.push("shot-1plus-probability-below-floor");
    if (!(row.shotProbabilities.over15 >= 0.2)) reasons.push("shot-2plus-probability-below-floor");
  }
  return {
    qualified: reasons.length === 0,
    confidence,
    evidenceScore: round(evidenceScore, 3),
    exclusionReasons: reasons,
    evidence: {
      historicalReliability: round(historicalReliability, 3),
      currentReliability: round(currentReliability, 3),
      baselineStability: round(stabilityScore, 3),
      expectedMinutesReliability: round(expectedMinutesReliability, 3),
      roleSpecificity
    }
  };
}

function playerDataStatus(candidate, minutes) {
  if (!candidate.player) return "role-baseline";
  if (minutes >= 1800) return "strong-history";
  if (minutes >= 700) return "verified-history";
  return "limited-history";
}

function shooterCandidates(homeTeam, awayTeam, homeSquad, awaySquad, teamProjections, oddsEvent, homeProfile, awayProfile, homeVolume, awayVolume, homeCurrentPlayers, awayCurrentPlayers, homeTeamMatchupProfile, awayTeamMatchupProfile) {
  const rows = [];
  const reconciliationByTeam = new Map();
  for (const [team, squad, venue, teamProfile, opponentProfile, opponentVolume, currentPlayers, ownTeamMatchupProfile, opponentTeamMatchupProfile] of [
    [homeTeam, homeSquad, "home", homeProfile, awayProfile, awayVolume, homeCurrentPlayers, homeTeamMatchupProfile, awayTeamMatchupProfile],
    [awayTeam, awaySquad, "away", awayProfile, homeProfile, homeVolume, awayCurrentPlayers, awayTeamMatchupProfile, homeTeamMatchupProfile]
  ]) {
    const candidates = lineupPlayers(team, squad);
    const projection = teamProjections.find(item => item.teamId === team.id);
    const shotsV1 = scalePlayerVolume(candidates, "shots", projection?.legacyVolumeProjection?.shotsTotal?.central ?? projection?.shotsTotal?.central);
    const sotV1 = scalePlayerVolume(candidates, "shotsOnTarget", projection?.legacyVolumeProjection?.shotsOnTarget?.central ?? projection?.shotsOnTarget?.central);
    const teamRows = shotsV1.map((item, index) => {
      const candidate = item.candidate;
      const totals = candidate.player?.previousSeason?.totals || {};
      const per90 = totals.per90 || {};
      const current = currentPlayers?.[candidate.player?.id] || currentPlayers?.[cleanName(candidate.name)] || null;
      const minutes = expectedMinutes(candidate, current);
      const includePersistence = Boolean(ownTeamMatchupProfile?.modelPolicy?.playerPersistenceDiagnostics);
      const shotStability = playerBaselineStability({ historicalBaseline: item.value, historicalObserved: item.observed, historicalMinutes: item.minutes, current, key: "shots", includePersistence });
      const sotStability = playerBaselineStability({ historicalBaseline: sotV1[index]?.value || 0, historicalObserved: sotV1[index]?.observed || 0, historicalMinutes: sotV1[index]?.minutes || 0, current, key: "shotsOnTarget", includePersistence });
      const shotBase = shotStability.value;
      const sotBase = Math.min(shotBase, sotStability.value);
      const matchup = playerMatchup(candidate, teamProfile, opponentProfile, opponentVolume, venue, shotBase, sotBase, opponentTeamMatchupProfile, projection);
      return {
        name: candidate.player?.name || candidate.name,
        lineupName: candidate.name,
        playerId: candidate.player?.id || null,
        team: team.name,
        teamId: team.id,
        venue,
        role: candidate.role,
        detailedRole: candidate.detailedRole,
        side: matchup.side,
        projectedShotsV1: item.projection,
        projectedShotsOnTargetV1: sotV1[index]?.projection || 0,
        projectedShotsV2Base: shotBase * matchup.genericMatchupFactor * minutes.minutesFactor,
        projectedShotsOnTargetV2Base: sotBase * matchup.genericMatchupFactor * minutes.minutesFactor,
        projectedShots: shotBase * matchup.shotsMatchupFactor * minutes.minutesFactor,
        projectedShotsOnTarget: sotBase * matchup.shotsOnTargetMatchupFactor * minutes.minutesFactor,
        baselineShots90: round(item.value, 2),
        baselineShotsOnTarget90: round(sotV1[index]?.value || 0, 2),
        stabilizedShots90: round(shotBase, 2),
        stabilizedShotsOnTarget90: round(sotBase, 2),
        playerBaselineStability: shotStability,
        playerSotBaselineStability: sotStability,
        matchupAdjustedShots90: round(shotBase * matchup.matchupFactor, 2),
        matchupFactor: matchup.matchupFactor,
        shotsMatchupFactor: matchup.shotsMatchupFactor,
        shotsOnTargetMatchupFactor: matchup.shotsOnTargetMatchupFactor,
        genericMatchupFactor: matchup.genericMatchupFactor,
        teamProfileMatchupFactor: matchup.teamProfileMatchupFactor,
        teamProfileShotsMatchupFactor: matchup.teamProfileShotsMatchupFactor,
        teamProfileShotsOnTargetMatchupFactor: matchup.teamProfileShotsOnTargetMatchupFactor,
        teamProfileRole: matchup.teamProfileRole,
        teamProfileConfidence: matchup.teamProfileConfidence,
        opponentAbilityToExploit: matchup.opponentAbilityToExploit,
        teamProfileShotBoostPct: matchup.teamProfileShotBoostPct,
        teamProfileSotBoostPct: matchup.teamProfileSotBoostPct,
        matchupEvidence: matchup.matchupEvidence,
        expectedMinutes: minutes.expectedMinutes,
        minutesFactor: minutes.minutesFactor,
        substitutionRisk: minutes.substitutionRisk,
        likelyReplacement: minutes.likelyReplacement,
        expectedMinutesEvidence: minutes.evidence,
        playerMatchesUsed: current?.appearances || 0,
        playerMinutesUsed: current?.minutes || 0,
        currentPlayerEvidence: current ? {
          shots: current.shotsCoverage ? current.shots : null,
          shotsOnTarget: current.shotsOnTargetCoverage ? current.shotsOnTarget : null,
          expectedGoals: current.expectedGoalsCoverage ? round(current.expectedGoals, 3) : null,
          expectedGoalsPer90: Number.isFinite(current.expectedGoalsPer90) ? round(current.expectedGoalsPer90, 3) : null,
          expectedGoalsPerShot: Number.isFinite(current.expectedGoalsPerShot) ? round(current.expectedGoalsPerShot, 3) : null,
          modelStatus: "diagnostic-only-no-new-xg-coefficient"
        } : null,
        signalStatus: shotStability.level,
        signalEvidence: shotStability.evidence,
        fallbackUsed: Boolean(minutes.evidence.fallbackUsed),
        opponentInteractionApplied: Boolean(matchup.teamProfileRole && matchup.teamProfileConfidence !== "unknown"),
        foulsCommittedPer90: Number.isFinite(per90.foulsCommitted) ? round(per90.foulsCommitted, 2) : null,
        minutes: item.minutes,
        dataStatus: playerDataStatus(candidate, item.minutes),
        markets: {
          shotsOver05: playerMarketQuote(oddsEvent, candidate, "28507", 0.5),
          shotsOnTargetOver05: playerMarketQuote(oddsEvent, candidate, "28506", 0.5)
        }
      };
    });
    reconcilePlayerVolumes(teamRows, "projectedShotsV2Base", projection?.shotsTotal?.central, null, ownTeamMatchupProfile);
    reconcilePlayerVolumes(teamRows, "projectedShotsOnTargetV2Base", projection?.shotsOnTarget?.central, "projectedShotsV2Base", ownTeamMatchupProfile);
    const shotsReconciliation = reconcilePlayerVolumes(teamRows, "projectedShots", projection?.shotsTotal?.central, null, ownTeamMatchupProfile);
    const sotReconciliation = reconcilePlayerVolumes(teamRows, "projectedShotsOnTarget", projection?.shotsOnTarget?.central, "projectedShots", ownTeamMatchupProfile);
    reconciliationByTeam.set(team.id, { shots: shotsReconciliation, shotsOnTarget: sotReconciliation });
    for (const row of teamRows) {
      row.shotProbabilities = { over05: poissonAtLeast(row.projectedShots, 1), over15: poissonAtLeast(row.projectedShots, 2), over25: poissonAtLeast(row.projectedShots, 3) };
      row.shotOnTargetProbabilities = { over05: poissonAtLeast(row.projectedShotsOnTarget, 1), over15: poissonAtLeast(row.projectedShotsOnTarget, 2) };
      const boostPct = row.baselineShots90 ? round((row.matchupAdjustedShots90 / row.baselineShots90 - 1) * 100, 1) : 0;
      const roleEligible = (row.role === "Difensore" || row.role === "Centrocampista") && row.allocationClass !== "primary";
      row.outsiderScore = roleEligible ? round(clamp(100 * (
        0.22 * clamp(row.baselineShots90 / 1.5, 0, 1) +
        0.2 * clamp((row.matchupFactor - 0.94) / 0.24, 0, 1) +
        0.17 * clamp((row.expectedMinutes - 60) / 30, 0, 1) +
        0.13 * clamp(boostPct / 18, 0, 1) +
        0.11 * row.shotProbabilities.over15 +
        0.05 * row.shotOnTargetProbabilities.over05 +
        0.08 * clamp(((row.playerAllocationFactor || 1) - 0.85) / 0.3, 0, 1) +
        0.04 * (row.allocationClass === "secondary" ? clamp(ownTeamMatchupProfile?.offense?.secondaryShooterBreadth?.secondaryShooterShare || 0, 0, 1) : 0)
      ), 0, 100), 1) : null;
      row.sotOutsiderScore = roleEligible ? round(clamp(100 * (
        0.32 * clamp(row.stabilizedShotsOnTarget90 / 0.75, 0, 1) +
        0.18 * clamp((row.teamProfileShotsOnTargetMatchupFactor - 1) / 0.08, 0, 1) +
        0.18 * clamp((row.expectedMinutes - 60) / 30, 0, 1) +
        0.17 * row.shotOnTargetProbabilities.over05 +
        0.1 * row.shotOnTargetProbabilities.over15 +
        0.05 * clamp(row.playerSotBaselineStability?.score || 0, 0, 1)
      ), 0, 100), 1) : null;
      row.outsiderEvidence = roleEligible ? {
        baselineShots90: row.baselineShots90,
        matchupAdjustedShots90: row.matchupAdjustedShots90,
        matchupBoostPct: boostPct,
        expectedMinutes: row.expectedMinutes,
        shots1PlusProbability: row.shotProbabilities.over05,
        shots2PlusProbability: row.shotProbabilities.over15,
        shotsOnTarget1PlusProbability: row.shotOnTargetProbabilities.over05,
        shotsOnTarget2PlusProbability: row.shotOnTargetProbabilities.over15,
        baselineShotsOnTarget90: row.baselineShotsOnTarget90,
        stabilizedShotsOnTarget90: row.stabilizedShotsOnTarget90,
        sotOutsiderScore: row.sotOutsiderScore,
        playerBaselineStability: row.playerBaselineStability,
        playerSotBaselineStability: row.playerSotBaselineStability,
        opponentAbilityToExploit: row.opponentAbilityToExploit,
        playerAllocationFactor: row.playerAllocationFactor,
        allocationClass: row.allocationClass,
        allocationConfidence: row.allocationConfidence,
        allocationEvidence: row.allocationEvidence,
        matchupEvidence: row.matchupEvidence
      } : null;
      if (roleEligible) {
        const shotQualification = outsiderQualification(row, "shots");
        const sotQualification = outsiderQualification(row, "shots-on-target");
        row.outsiderConfidence = shotQualification.confidence;
        row.qualifiedOutsider = shotQualification.qualified;
        row.outsiderExclusionReasons = shotQualification.exclusionReasons;
        row.outsiderQualificationEvidence = shotQualification;
        row.sotOutsiderConfidence = sotQualification.confidence;
        row.qualifiedSotOutsider = sotQualification.qualified;
        row.sotOutsiderExclusionReasons = sotQualification.exclusionReasons;
        row.sotOutsiderQualificationEvidence = sotQualification;
      } else {
        row.outsiderConfidence = null;
        row.qualifiedOutsider = false;
        row.outsiderExclusionReasons = ["role-or-primary-not-eligible"];
        row.outsiderQualificationEvidence = null;
        row.sotOutsiderConfidence = null;
        row.qualifiedSotOutsider = false;
        row.sotOutsiderExclusionReasons = ["role-or-primary-not-eligible"];
        row.sotOutsiderQualificationEvidence = null;
      }
    }
    rows.push(...teamRows);
  }
  const ranked = (key, marketKey) => [...rows]
    .sort((left, right) => right[key] - left[key] || left.name.localeCompare(right.name, "it"))
    .slice(0, 5)
    .map((row, index) => ({ ...row, rank: index + 1, marketKey }));
  return {
    totalShots: ranked("projectedShots", "shotsOver05"),
    shotsOnTarget: ranked("projectedShotsOnTarget", "shotsOnTargetOver05"),
    outsiders: rows.filter(row => row.qualifiedOutsider && row.dataStatus !== "role-baseline").sort((a, b) => b.outsiderScore - a.outsiderScore || a.name.localeCompare(b.name, "it")).slice(0, 5).map((row, index) => ({ ...row, outsiderRank: index + 1 })),
    sotOutsiders: rows.filter(row => row.qualifiedSotOutsider && row.dataStatus !== "role-baseline").sort((a, b) => b.sotOutsiderScore - a.sotOutsiderScore || a.name.localeCompare(b.name, "it")).slice(0, 5).map((row, index) => ({ ...row, sotOutsiderRank: index + 1 })),
    outsiderDiagnostics: {
      eligibleCandidates: rows.filter(row => row.outsiderScore != null).length,
      shots: {
        qualified: rows.filter(row => row.qualifiedOutsider).map(row => row.playerId),
        rejected: rows.filter(row => row.outsiderScore != null && !row.qualifiedOutsider).map(row => ({ ...(row.playerId ? { playerId: row.playerId } : {}), name: row.name, confidence: row.outsiderConfidence, reasons: row.outsiderExclusionReasons }))
      },
      shotsOnTarget: {
        qualified: rows.filter(row => row.qualifiedSotOutsider).map(row => row.playerId),
        rejected: rows.filter(row => row.sotOutsiderScore != null && !row.qualifiedSotOutsider).map(row => ({ ...(row.playerId ? { playerId: row.playerId } : {}), name: row.name, confidence: row.sotOutsiderConfidence, reasons: row.sotOutsiderExclusionReasons }))
      }
    },
    allPlayers: rows,
    teamTotals: [homeTeam.id, awayTeam.id].map(teamId => ({
      teamId,
      projectedShots: round(sum(rows.filter(row => row.teamId === teamId).map(row => row.projectedShots)), 2),
      projectedShotsOnTarget: round(sum(rows.filter(row => row.teamId === teamId).map(row => row.projectedShotsOnTarget)), 2),
      reconciliation: reconciliationByTeam.get(teamId)
    }))
  };
}

function playerSide(candidate) {
  const role = cleanName(candidate.detailedRole);
  if (role.includes("destro") || role.includes("destra")) return "right";
  if (role.includes("sinistro") || role.includes("sinistra")) return "left";
  return "central";
}

function directDuel(candidate, opponents) {
  const side = playerSide(candidate);
  if (side === "central" || !candidate.detailedRole || !["Difensore", "Centrocampista"].includes(candidate.role)) return null;
  const facedSide = side === "right" ? "left" : "right";
  const eligible = opponents.filter(opponent =>
    opponent.detailedRole && playerSide(opponent) === facedSide && opponent.role !== "Portiere" &&
    Number.isFinite(opponent.player?.previousSeason?.totals?.per90?.foulsWon)
  ).sort((left, right) => right.player.previousSeason.totals.per90.foulsWon - left.player.previousSeason.totals.per90.foulsWon);
  if (eligible.length !== 1) return null;
  const opponent = eligible[0];
  return { name: opponent.player?.name || opponent.name, foulsWonPer90: round(opponent.player.previousSeason.totals.per90.foulsWon, 2) };
}

function refereeCardFactor(profile, leagueAverage) {
  if (!profile || !(profile.matches > 0) || !leagueAverage) return { factor: 1, evidence: ["arbitro N/D: fattore neutro"], reliability: 0 };
  const reliability = profile.matches / (profile.matches + 12);
  const cardRatio = profile.yellowCardsPerMatch / leagueAverage.yellowCardsPerMatch;
  const foulRatio = profile.foulsPerMatch / leagueAverage.foulsPerMatch;
  const blendedRatio = cardRatio * 0.7 + foulRatio * 0.3;
  const factor = clamp(1 + (blendedRatio - 1) * 0.18 * reliability, 0.9, 1.1);
  return {
    factor: round(factor, 3),
    reliability: round(reliability, 3),
    evidence: [
      `${round(profile.yellowCardsPerMatch, 2)} gialli/gara vs ${round(leagueAverage.yellowCardsPerMatch, 2)} media lega`,
      `${round(profile.foulsPerMatch, 2)} falli/gara vs ${round(leagueAverage.foulsPerMatch, 2)} media lega`,
      `${profile.matches} gare arbitrate; regressione verso la media ${round((1 - reliability) * 100, 1)}%`
    ]
  };
}

function expectedDefensiveExposureFactor(expectedPossessionPct, maxImpactPct = 6, confidence = 1, reliability = 1) {
  if (!Number.isFinite(expectedPossessionPct)) return 1;
  const defensiveShare = 1 - expectedPossessionPct / 100;
  const leagueRelative = defensiveShare / 0.5 - 1;
  const rawFactor = clamp(1 + leagueRelative * maxImpactPct / 100 * confidence, 0.97, 1.03);
  return round(1 + (rawFactor - 1) * reliability, 4);
}

function bookingCandidates(homeTeam, awayTeam, homeSquad, awaySquad, homeProfile, awayProfile, homeCurrentDiscipline, awayCurrentDiscipline, refereeProfile, refereeLeagueAverage, homeTeamMatchupProfile, awayTeamMatchupProfile) {
  const homePlayers = lineupPlayers(homeTeam, homeSquad);
  const awayPlayers = lineupPlayers(awayTeam, awaySquad);
  const referee = refereeCardFactor(refereeProfile, refereeLeagueAverage);
  const rows = [
    ...homePlayers.map(candidate => ({ ...candidate, opponentProfile: awayProfile, opponents: awayPlayers, currentDiscipline: homeCurrentDiscipline, teamMatchupProfile: homeTeamMatchupProfile, opponentTeamMatchupProfile: awayTeamMatchupProfile })),
    ...awayPlayers.map(candidate => ({ ...candidate, opponentProfile: homeProfile, opponents: homePlayers, currentDiscipline: awayCurrentDiscipline, teamMatchupProfile: awayTeamMatchupProfile, opponentTeamMatchupProfile: homeTeamMatchupProfile }))
  ].filter(candidate => candidate.role !== "Portiere").map(candidate => {
    const per90 = candidate.player?.previousSeason?.totals?.per90 || {};
    const minutes = candidate.player?.previousSeason?.totals?.minutes || 0;
    const current = candidate.currentDiscipline?.[candidate.player?.id] || candidate.currentDiscipline?.[cleanName(candidate.name)] || null;
    const currentWeight = current?.foulsCommittedCoverage ? current.appearances / (current.appearances + 6) : 0;
    const historicalCards = per90.cards ?? per90.yellowCards ?? 0.12;
    const historicalFouls = per90.foulsCommitted ?? 1.05;
    const currentFouls = current?.foulsCommittedCoverage ? current.foulsCommitted * 90 / current.minutes : historicalFouls;
    const estimatedCards = historicalCards;
    const estimatedFouls = historicalFouls * (1 - currentWeight) + currentFouls * currentWeight;
    const side = playerSide(candidate);
    const opponentChannels = attackChannels(candidate.opponentProfile);
    const facedChannel = side === "right" ? opponentChannels.left : side === "left" ? opponentChannels.right : opponentChannels.central;
    const roleBase = candidate.role === "Difensore" ? 1.15 : candidate.role === "Centrocampista" ? 0.95 : 0.48;
    const observed = estimatedCards * 3.6 + estimatedFouls * 0.42;
    const reliability = minutes ? clamp(minutes / 1800, 0.35, 1) : 0.3;
    const channelLoad = facedChannel / 100 * 1.15 + (candidate.opponentProfile?.playingStyle || []).some(item => item.id === "aggressivi") * 0.14;
    const directOpponent = directDuel(candidate, candidate.opponents);
    const duelRisk = directOpponent ? round(clamp(1 + (directOpponent.foulsWonPer90 - 1.25) * 0.09, 0.92, 1.12), 3) : 1;
    const opponentDuelEnvironmentFactor = directOpponent ? clamp(candidate.opponentTeamMatchupProfile?.discipline?.foulIntensity?.directDuelEnvironmentFactor ?? 1, 0.98, 1.03) : 1;
    const teamDisciplineFactor = clamp(candidate.teamMatchupProfile?.discipline?.modelFactor ?? 1, 0.95, 1.05);
    const baseDefensiveExposureFactor = candidate.teamMatchupProfile?.discipline?.expectedDefensiveExposure?.factor ?? 1;
    const defensiveExposureReliability = 1 - currentWeight * 0.5;
    const defensiveExposureFactor = clamp(1 + (baseDefensiveExposureFactor - 1) * defensiveExposureReliability, 0.97, 1.03);
    const historicalRaw = roleBase + observed * (0.55 + reliability * 0.45) + channelLoad;
    const raw = historicalRaw * duelRisk * opponentDuelEnvironmentFactor * referee.factor * teamDisciplineFactor * defensiveExposureFactor;
    const riskScore = Math.round(clamp(raw * 19, 12, 88));
    const evidence = [];
    if (per90.cards != null) evidence.push(`${round(estimatedCards, 2)} cartellini/90${current?.minutes ? " stimati" : ""}`);
    if (per90.foulsCommitted != null) evidence.push(`${round(estimatedFouls, 2)} falli/90${current?.minutes ? " stimati" : ""}`);
    if (current?.foulsCommittedCoverage) evidence.push(`2026/27: ${round(currentFouls, 2)} falli/90 in ${current.appearances} ${current.appearances === 1 ? "presenza" : "presenze"}`);
    evidence.push(`duelli sul canale ${side === "left" ? "sinistro" : side === "right" ? "destro" : "centrale"}`);
    const duelEvidence = directOpponent
      ? [`opposizione laterale ${candidate.name} - ${directOpponent.name}`, `${directOpponent.foulsWonPer90} falli subiti/90 dall'avversario diretto`]
      : ["avversario diretto non identificabile con affidabilita: fallback al canale"];
    const squad = candidate.teamId === homeTeam.id ? homeSquad : awaySquad;
    const identityMatches = (squad?.players || []).filter(player => [player.name, ...(player.identityAliases || [])].some(name => normalizePlayerName(name) === normalizePlayerName(candidate.name)));
    const identity = identityMatches.length === 1 ? identityMatches[0] : null;
    return {
      name: candidate.name,
      playerName: candidate.name,
      detailedRole: candidate.detailedRole ?? null,
      playerId: identity?.id ?? null,
      identityResolution: identity ? normalizePlayerName(identity.name) === normalizePlayerName(candidate.name) ? "CANONICAL_ID" : "VERIFIED_ALIAS" : identityMatches.length > 1 ? "COLLISION" : "UNRESOLVED_NAME_ONLY",
      riskScoreSemantics: "COMPARATIVE_HEURISTIC_NOT_PROBABILITY",
      calibratedProbability: null,
      refereeFactorSource: !refereeProfile ? "NO_DESIGNATION_AVAILABLE" : referee.reliability ? "DESIGNATED_REFEREE_HISTORICAL_SAMPLE" : "INSUFFICIENT_REFEREE_EVIDENCE",
      teamId: candidate.teamId,
      role: candidate.role,
      riskScore,
      riskComponents: {
        roleBase: round(roleBase, 3),
        historicalDiscipline: round(observed, 3),
        historyReliability: round(reliability, 3),
        currentSeasonWeight: round(currentWeight, 3),
        attackChannelLoad: round(channelLoad, 3),
        duelRisk,
        opponentDuelEnvironmentFactor: round(opponentDuelEnvironmentFactor, 3),
        refereeFactor: referee.factor,
        teamDisciplineFactor: round(teamDisciplineFactor, 3),
        expectedDefensiveExposureFactor: round(defensiveExposureFactor, 4),
        defensiveExposureReliability: round(defensiveExposureReliability, 3)
      },
      directOpponent: directOpponent?.name || null,
      opponentFoulsWonPer90: directOpponent?.foulsWonPer90 ?? null,
      duelRisk,
      opponentDuelEnvironmentFactor: round(opponentDuelEnvironmentFactor, 3),
      duelEvidence,
      refereeFactor: referee.factor,
      refereeEvidence: referee.evidence,
      teamDisciplineFactor: round(teamDisciplineFactor, 3),
      expectedDefensiveExposureFactor: round(defensiveExposureFactor, 4),
      defensiveExposureEvidence: candidate.teamMatchupProfile?.discipline?.expectedDefensiveExposure?.evidence || ["esposizione difensiva specifica N/D: fattore neutro"],
      teamDisciplineEvidence: candidate.teamMatchupProfile ? [`profilo squadra regolarizzato: ${candidate.teamMatchupProfile.discipline.shrunk.foulsCommittedPerGame} falli e ${candidate.teamMatchupProfile.discipline.shrunk.yellowCardsPerGame} gialli/gara`] : ["profilo squadra specifico N/D: fattore neutro"],
      evidence: [...evidence, ...duelEvidence, ...(opponentDuelEnvironmentFactor !== 1 ? [`ambiente falli avversario applicato solo al duello diretto: ${round(opponentDuelEnvironmentFactor, 3)}`] : []), ...referee.evidence, ...(candidate.teamMatchupProfile ? [`fattore disciplina squadra ${round(teamDisciplineFactor, 3)}`, `esposizione difensiva ${round(defensiveExposureFactor, 4)} con attenuazione anti-double-count`] : [])],
      dataStatus: current?.foulsCommittedCoverage ? "verified-history-current" : playerDataStatus(candidate, minutes)
    };
  }).sort((a, b) => b.riskScore - a.riskScore || a.name.localeCompare(b.name, "it"));

  const seenCardIdentities = new Set();
  const uniqueRows = rows.filter(candidate => {
    if (!candidate.playerId) return true;
    const key = `${candidate.teamId}:${candidate.playerId}`;
    if (seenCardIdentities.has(key)) return false;
    seenCardIdentities.add(key); return true;
  });
  const selected = uniqueRows.slice(0, 5);
  for (const teamId of [homeTeam.id, awayTeam.id]) {
    if (!selected.some(candidate => candidate.teamId === teamId)) {
      const replacement = uniqueRows.find(candidate => candidate.teamId === teamId && !selected.includes(candidate));
      if (replacement) selected[selected.length - 1] = replacement;
    }
  }
  return selected.sort((a, b) => b.riskScore - a.riskScore).map((candidate, index) => ({ ...candidate, rank: index + 1, possibleFirstBooked: index === 0, firstBookedHeuristic: index === 0, firstBookedProbability: null }));
}

function shotAccuracy(players) {
  const totals = players.map(candidate => candidate.player?.previousSeason?.totals).filter(stats => stats?.shots > 0 && stats?.shotsOnTarget != null);
  const shots = sum(totals.map(stats => stats.shots));
  return shots ? clamp(sum(totals.map(stats => stats.shotsOnTarget)) / shots, 0.25, 0.48) : 0.34;
}

function rangeMetric(value, spread, min = 0) {
  return { min: Math.max(min, Math.floor(value - spread)), central: round(value, 1), max: Math.ceil(value + spread) };
}

function volumePrior(metric, profile, players, channels) {
  const shots = profile?.summary?.shotsPerGame ?? 10.5;
  if (metric === "totalShots") return { matches: profile?.summary?.appearances || 0, mean: shots, sd: 3.6, p20: Math.max(4, shots - 3.1), p80: shots + 3.1, source: "team-style-prior" };
  if (metric === "shotsOnTarget") {
    const mean = shots * shotAccuracy(players);
    return { matches: profile?.summary?.appearances || 0, mean, sd: 1.65, p20: Math.max(0, mean - 1.4), p80: mean + 1.4, source: "lineup-accuracy-prior" };
  }
  const wideShare = (channels.left + channels.right) / 100;
  const mean = 1.7 + shots * 0.19 + wideShare * 1.15 + ((profile?.playingStyle || []).some(item => item.id === "tentano-spesso-il-cross") ? 0.55 : 0);
  return { matches: profile?.summary?.appearances || 0, mean, sd: 2.05, p20: Math.max(0, mean - 1.75), p80: mean + 1.75, source: "shot-width-prior" };
}

function volumeMetric(profile, opponentProfile, volumeProfile, opponentVolumeProfile, venue, metric, context, prior) {
  const opponentVenue = venue === "home" ? "away" : "home";
  const teamVenue = volumeProfile?.venues?.[venue]?.[metric]?.for || null;
  const opponentVenueAgainst = opponentVolumeProfile?.venues?.[opponentVenue]?.[metric]?.against || null;
  const recent = volumeProfile?.recent?.[metric]?.for || null;
  const sources = [
    { id: teamVenue?.matches ? `${venue}-for` : prior.source, stats: teamVenue?.matches ? teamVenue : prior, weight: 0.45, mean: teamVenue?.mean ?? prior.mean },
    { id: `${opponentVenue}-opponent-against`, stats: opponentVenueAgainst, weight: 0.35, mean: opponentVenueAgainst?.mean },
    { id: "recent-8", stats: recent, weight: 0.2, mean: recent?.weightedMean ?? recent?.mean }
  ].filter(source => Number.isFinite(source.mean) && Number.isFinite(source.stats?.p20) && Number.isFinite(source.stats?.p80));
  const totalWeight = sum(sources.map(source => source.weight));
  const normalized = sources.map(source => ({ ...source, weight: source.weight / totalWeight }));
  const rawMean = sum(normalized.map(source => source.mean * source.weight));
  const rawP20 = sum(normalized.map(source => source.stats.p20 * source.weight));
  const rawP80 = sum(normalized.map(source => source.stats.p80 * source.weight));
  const rawVariance = sum(normalized.map(source => source.weight * ((source.stats.sd || 0) ** 2 + (source.mean - rawMean) ** 2)));
  const limits = metric === "totalShots" ? [4, 24] : metric === "shotsOnTarget" ? [0, 12] : [0, 12];
  const central = clamp(rawMean * context, limits[0], limits[1]);
  const p20 = clamp(rawP20 * context, limits[0], limits[1]);
  const p80 = clamp(rawP80 * context, limits[0], limits[1]);
  return {
    min: Math.floor(Math.min(p20, central)),
    central: round(central, 1),
    max: Math.ceil(Math.max(p80, central)),
    interval: "p20-p80",
    sd: round(Math.sqrt(rawVariance) * context, 2),
    sampleSize: sum(normalized.map(source => source.stats.matches || 0)),
    dataStatus: teamVenue?.matches && opponentVenueAgainst?.matches ? "venue-history" : "partial-history",
    inputs: normalized.map(source => ({ source: source.id, weightPct: round(source.weight * 100, 1), mean: round(source.mean, 2), matches: source.stats.matches || 0 }))
  };
}

function combineVolumeMetric(home, away) {
  const central = home.central + away.central;
  const sd = Math.sqrt((home.sd || 0) ** 2 + (away.sd || 0) ** 2);
  return {
    min: Math.max(0, Math.floor(central - sd * 0.84)),
    central: round(central, 1),
    max: Math.ceil(central + sd * 0.84),
    interval: "p20-p80-independent",
    sd: round(sd, 2),
    sampleSize: Math.min(home.sampleSize || 0, away.sampleSize || 0),
    dataStatus: home.dataStatus === "venue-history" && away.dataStatus === "venue-history" ? "venue-history" : "partial-history"
  };
}

function disciplineBaseline(profile, disciplineProfile) {
  const rows = disciplineProfile?.rows || [];
  const appearances = sum(rows.map(row => row.appearances || 0));
  const fouls = appearances
    ? sum(rows.map(row => (row.foulsAwardedAgainstPerAppearance || 0) * (row.appearances || 0))) / appearances
    : null;
  const yellowCards = profile?.modelInputs?.numeric?.yellowCardsPerGame ?? null;
  return { fouls, yellowCards };
}

function applyOpponentTeamVolumeInteraction(profile, opponentTeamMatchupProfile, shotsTotal, shotsOnTarget, corners) {
  const policy = opponentTeamMatchupProfile?.modelPolicy?.interactionPolicy;
  if (!policy?.enabled) return { abilityToExploit: null, shotsAdjustmentPct: 0, shotsOnTargetAdjustmentPct: 0, metricEvidence: null, method: "inactive" };
  const ability = opponentAbilityToExploit(profile, { shotsTotal, shotsOnTarget, corners });
  const confidence = value => ({ high: 1, "medium-high": 0.9, medium: 0.75, "medium-low": 0.55, low: 0.3, "very-low": 0.15 }[value] || 0);
  const maturity = opponentTeamMatchupProfile.confidence?.maturityWeight ?? 0;
  const suppression = policy.direction === "suppression";
  const shotsPersistence = suppression
    ? opponentTeamMatchupProfile.shotDefense?.generalShotSuppression?.signalStability?.persistence?.shareInSignalDirection ?? 0
    : opponentTeamMatchupProfile.shotDefense?.defensiveMetricSignals?.shotsAllowed?.persistence?.shareInSignalDirection ?? opponentTeamMatchupProfile.shotDefense?.shotsAllowed?.signalPersistence?.shareAboveBaseline ?? 0;
  const sotPersistence = suppression
    ? opponentTeamMatchupProfile.shotDefense?.generalSotSuppression?.signalStability?.persistence?.shareInSignalDirection ?? 0
    : opponentTeamMatchupProfile.shotDefense?.defensiveMetricSignals?.shotsOnTargetAllowed?.persistence?.shareInSignalDirection ?? opponentTeamMatchupProfile.shotDefense?.shotsOnTargetAllowed?.signalPersistence?.shareAboveBaseline ?? 0;
  const shotsConfidence = confidence(opponentTeamMatchupProfile.vulnerabilities?.signals?.totalShotVulnerability?.confidence);
  const sotConfidence = confidence(opponentTeamMatchupProfile.vulnerabilities?.signals?.sotVulnerability?.confidence);
  const exploitation = 0.55 * ability.general + 0.45 * ability.territorial;
  const shotsStability = suppression
    ? opponentTeamMatchupProfile.shotDefense?.generalShotSuppression?.signalStability?.score ?? 0
    : opponentTeamMatchupProfile.shotDefense?.defensiveMetricSignals?.shotsAllowed?.score ?? 0;
  const sotStability = suppression
    ? opponentTeamMatchupProfile.shotDefense?.generalSotSuppression?.signalStability?.score ?? 0
    : opponentTeamMatchupProfile.shotDefense?.defensiveMetricSignals?.shotsOnTargetAllowed?.score ?? 0;
  const strengthResistance = 0.9 + 0.1 * exploitation;
  const activeVulnerabilityMetric = (signal, metric, stability, persistence, confidenceWeight, maxPct) => {
    const neutralLevels = new Set(["normal", "unconfirmed", "unknown", "not-proven", "none-proven", "suppressed"]);
    const level = signal?.level || "unknown";
    const active = signal?.status === "active" && !neutralLevels.has(level);
    const historicalMean = metric?.historical?.mean ?? metric?.historicalMean ?? null;
    const robustMean = metric?.robustCurrentMean ?? metric?.current?.robustMean ?? metric?.shrunk?.robustCurrentMean ?? null;
    const deviation = active && Number.isFinite(historicalMean) && historicalMean > 0 && Number.isFinite(robustMean)
      ? Math.max(0, robustMean / historicalMean - 1)
      : 0;
    const magnitude = deviation > 0 ? deviation / (deviation + 0.1) : 0;
    const adjustmentPct = active
      ? maxPct * confidenceWeight * maturity * stability * (0.75 + 0.25 * persistence) * exploitation * magnitude
      : 0;
    return {
      active,
      level,
      status: signal?.status || "unknown",
      historicalMean,
      robustCurrentMean: robustMean,
      positiveDeviationPct: round(deviation * 100, 2),
      magnitudeWeight: round(magnitude, 4),
      confidenceWeight: round(confidenceWeight, 4),
      maturityWeight: round(maturity, 4),
      stabilityWeight: round(stability, 4),
      persistenceWeight: round(persistence, 4),
      abilityToExploitWeight: round(exploitation, 4),
      adjustmentPct
    };
  };
  const shotsEvidence = activeVulnerabilityMetric(opponentTeamMatchupProfile.vulnerabilities?.signals?.totalShotVulnerability, opponentTeamMatchupProfile.shotDefense?.shotsAllowed, shotsStability, shotsPersistence, shotsConfidence, policy.teamShotMaxAdjustmentPct || 0);
  const sotEvidence = activeVulnerabilityMetric(opponentTeamMatchupProfile.vulnerabilities?.signals?.sotVulnerability, opponentTeamMatchupProfile.shotDefense?.shotsOnTargetAllowed, sotStability, sotPersistence, sotConfidence, policy.teamSotMaxAdjustmentPct || 0);
  const shotsAdjustmentPct = suppression
    ? -policy.teamShotMaxAdjustmentPct * shotsConfidence * maturity * shotsStability * (0.75 + 0.25 * shotsPersistence) * strengthResistance
    : shotsEvidence.adjustmentPct;
  const shotsOnTargetAdjustmentPct = suppression
    ? -policy.teamSotMaxAdjustmentPct * sotConfidence * maturity * sotStability * (0.75 + 0.25 * sotPersistence) * strengthResistance
    : sotEvidence.adjustmentPct;
  const scaleMetric = (metric, pct) => {
    const factor = 1 + pct / 100;
    const precision = suppression ? 1 : 2;
    metric.min = round(metric.min * factor, precision);
    metric.central = round(metric.central * factor, precision);
    metric.max = round(metric.max * factor, precision);
  };
  scaleMetric(shotsTotal, shotsAdjustmentPct);
  scaleMetric(shotsOnTarget, shotsOnTargetAdjustmentPct);
  return { abilityToExploit: ability, direction: suppression ? "suppression" : "vulnerability", shotsAdjustmentPct: round(shotsAdjustmentPct, 2), shotsOnTargetAdjustmentPct: round(shotsOnTargetAdjustmentPct, 2), metricEvidence: { shots: { ...shotsEvidence, adjustmentPct: round(shotsAdjustmentPct, 2) }, shotsOnTarget: { ...sotEvidence, adjustmentPct: round(shotsOnTargetAdjustmentPct, 2) } }, signalStability: { shots: round(shotsStability, 4), shotsOnTarget: round(sotStability, 4) }, method: policy.method, doubleCountControl: "marginal opponent correction after own-volume estimate; each metric uses one evidence-weighted budget and is reconciled only through the existing player scaling" };
}

function applyOwnOffensiveVolumeProfile(ownTeamMatchupProfile, shotsTotal, shotsOnTarget, corners) {
  const allocation = ownTeamMatchupProfile?.offense?.teamOffensiveAllocation;
  const inactiveCapDiagnostics = { shots: { capHit: false }, shotsOnTarget: { capHit: false }, corners: { capHit: false } };
  if (!allocation?.enabled) return { shotsAdjustmentPct: 0, shotsOnTargetAdjustmentPct: 0, cornersAdjustmentPct: 0, capDiagnostics: inactiveCapDiagnostics, method: "inactive" };
  const desiredAdjustment = (metric, target, maxPct) => {
    const uncappedPct = Number.isFinite(target) && metric.central > 0 ? (target / metric.central - 1) * 100 : 0;
    const cappedPct = clamp(uncappedPct, -maxPct, maxPct);
    return { uncappedPct, cappedPct, capHit: Math.abs(uncappedPct - cappedPct) > 1e-9, capPct: maxPct, capSide: uncappedPct > maxPct ? "upper" : uncappedPct < -maxPct ? "lower" : null };
  };
  const shotsCap = desiredAdjustment(shotsTotal, ownTeamMatchupProfile.offense.teamShotVolume?.shrunkPerGame, allocation.teamShotMaxAdjustmentPct || 0);
  const sotCap = desiredAdjustment(shotsOnTarget, ownTeamMatchupProfile.offense.teamSotVolume?.shrunkPerGame, allocation.teamSotMaxAdjustmentPct || 0);
  const cornersCap = desiredAdjustment(corners, ownTeamMatchupProfile.offense.teamSetPieceOpportunityVolume?.shrunkCornersPerGame, allocation.cornerMaxAdjustmentPct ?? allocation.teamShotMaxAdjustmentPct ?? 0);
  const shotsAdjustmentPct = shotsCap.cappedPct;
  const shotsOnTargetAdjustmentPct = sotCap.cappedPct;
  const cornersAdjustmentPct = cornersCap.cappedPct;
  const scaleMetric = (metric, pct) => {
    const factor = 1 + pct / 100;
    metric.min = round(metric.min * factor, 1);
    metric.central = round(metric.central * factor, 1);
    metric.max = round(metric.max * factor, 1);
  };
  scaleMetric(shotsTotal, shotsAdjustmentPct);
  scaleMetric(shotsOnTarget, shotsOnTargetAdjustmentPct);
  scaleMetric(corners, cornersAdjustmentPct);
  const capDiagnostic = item => ({ uncappedAdjustmentPct: round(item.uncappedPct, 2), appliedAdjustmentPct: round(item.cappedPct, 2), capPct: item.capPct, capHit: item.capHit, capSide: item.capSide });
  return { shotsAdjustmentPct: round(shotsAdjustmentPct, 2), shotsOnTargetAdjustmentPct: round(shotsOnTargetAdjustmentPct, 2), cornersAdjustmentPct: round(cornersAdjustmentPct, 2), capDiagnostics: { shots: capDiagnostic(shotsCap), shotsOnTarget: capDiagnostic(sotCap), corners: capDiagnostic(cornersCap) }, method: allocation.method, target: { shots: ownTeamMatchupProfile.offense.teamShotVolume?.shrunkPerGame, shotsOnTarget: ownTeamMatchupProfile.offense.teamSotVolume?.shrunkPerGame, corners: ownTeamMatchupProfile.offense.teamSetPieceOpportunityVolume?.shrunkCornersPerGame }, doubleCountControl: "one capped team-volume adjustment followed by one share-allocation budget" };
}

function teamProjection(team, profile, opponentProfile, squad, disciplineProfile, volumeProfile, opponentVolumeProfile, venue, outcomeProbability, opponentProbability, expectedGoal, opponentTeamMatchupProfile, ownTeamMatchupProfile) {
  const players = lineupPlayers(team, squad);
  const channels = attackChannels(profile);
  const matchup = matchupMultiplier(profile, opponentProfile);
  const possession = profile?.summary?.possessionPct ?? 50;
  const gameState = clamp(1 + (opponentProbability - outcomeProbability) * 0.16, 0.9, 1.1);
  const wideShare = (channels.left + channels.right) / 100;
  const shotsContext = clamp(1 + (matchup - 1) * 0.55 + (gameState - 1) * 0.65 + (possession - 50) * 0.002, 0.86, 1.14);
  const historicalShots = volumeProfile?.venues?.[venue]?.totalShots?.for?.mean || profile?.summary?.shotsPerGame || 10.5;
  const historicalOnTarget = volumeProfile?.venues?.[venue]?.shotsOnTarget?.for?.mean || historicalShots * 0.34;
  const lineupAccuracyFactor = clamp(shotAccuracy(players) / clamp(historicalOnTarget / historicalShots, 0.2, 0.55), 0.9, 1.1);
  const onTargetContext = clamp(shotsContext * lineupAccuracyFactor, 0.82, 1.2);
  const cornerContext = clamp(1 + (shotsContext - 1) * 0.45 + (wideShare - 0.55) * 0.15 + ((profile?.playingStyle || []).some(item => item.id === "tentano-spesso-il-cross") ? 0.04 : 0), 0.86, 1.16);
  const shotsTotal = volumeMetric(profile, opponentProfile, volumeProfile, opponentVolumeProfile, venue, "totalShots", shotsContext, volumePrior("totalShots", profile, players, channels));
  const shotsOnTarget = volumeMetric(profile, opponentProfile, volumeProfile, opponentVolumeProfile, venue, "shotsOnTarget", onTargetContext, volumePrior("shotsOnTarget", profile, players, channels));
  shotsOnTarget.central = Math.min(shotsOnTarget.central, shotsTotal.central);
  shotsOnTarget.max = Math.min(shotsOnTarget.max, shotsTotal.max);
  const corners = volumeMetric(profile, opponentProfile, volumeProfile, opponentVolumeProfile, venue, "wonCorners", cornerContext, volumePrior("wonCorners", profile, players, channels));
  const legacyVolumeProjection = ownTeamMatchupProfile?.offense?.teamOffensiveAllocation?.enabled ? { shotsTotal: { ...shotsTotal }, shotsOnTarget: { ...shotsOnTarget }, corners: { ...corners } } : null;
  const ownOffensiveInteraction = applyOwnOffensiveVolumeProfile(ownTeamMatchupProfile, shotsTotal, shotsOnTarget, corners);
  const opponentMatchupInteraction = applyOpponentTeamVolumeInteraction(profile, opponentTeamMatchupProfile, shotsTotal, shotsOnTarget, corners);
  shotsOnTarget.central = Math.min(shotsOnTarget.central, shotsTotal.central);
  shotsOnTarget.max = Math.min(shotsOnTarget.max, shotsTotal.max);
  const discipline = disciplineBaseline(profile, disciplineProfile);
  return {
    teamId: team.id,
    venue,
    attackChannels: channels,
    shotsTotal,
    shotsOnTarget,
    corners,
    legacyVolumeProjection,
    ownOffensiveInteraction,
    opponentMatchupInteraction,
    fouls: discipline.fouls == null ? null : rangeMetric(discipline.fouls, 2.4, 3),
    cards: discipline.yellowCards == null ? null : rangeMetric(discipline.yellowCards, 0.85, 0),
    expectedGoals: expectedGoal,
    basis: "Volumi ESPN 2025/26 prodotti e concessi per sede (45% squadra, 35% avversaria), ultime otto gare con peso 20%, matchup, possesso e probabile XI. Intervallo p20-p80 osservato."
  };
}

const scoreOutcome = score => score.home > score.away ? "1" : score.home === score.away ? "X" : "2";
const matrixProbability = (matrix, predicate) => sum(matrix.filter(predicate).map(score => score.probability));
const conditionForOutcome = outcome => score => scoreOutcome(score) === outcome;
const conditionForDoubleChance = selection => score => selection.includes(scoreOutcome(score));
const conditionForGoals = (selection, threshold) => score => selection === "UNDER"
  ? score.home + score.away < threshold
  : score.home + score.away > threshold;
const conditionForBothTeamsScore = selection => score => selection === "GOAL"
  ? score.home > 0 && score.away > 0
  : score.home === 0 || score.away === 0;
const conditionForTeamScore = (side, selection) => score => selection === "SI"
  ? score[side] > 0
  : score[side] === 0;

function findMarket(oddsEvent, marketName, threshold = null) {
  return oddsEvent?.markets?.find(market => market.marketName === marketName
    && (threshold === null || Number(market.threshold) === Number(threshold))) || null;
}

function openSelections(market) {
  return (market?.selections || []).filter(selection => selection.status === "open" && selection.odds > 1);
}

function noMarginMap(market) {
  const selections = openSelections(market);
  const raw = selections.map(selection => 1 / selection.odds);
  const total = sum(raw);
  return Object.fromEntries(selections.map((selection, index) => [selection.name, total ? raw[index] / total : null]));
}

function sensitivityMatrices(expected, centralMatrix, calibration) {
  return [
    centralMatrix,
    scoreMatrix(expected.home * 0.9, expected.away * 1.1, 7, calibration),
    scoreMatrix(expected.home * 1.1, expected.away * 0.9, 7, calibration),
    scoreMatrix(expected.home * 0.9, expected.away * 0.9, 7, calibration),
    scoreMatrix(expected.home * 1.1, expected.away * 1.1, 7, calibration)
  ];
}

function evaluateMarketRow({ market, selection, family, label, predicate, matrices, marketProbability, dataCompleteness, pushPredicate = null, primaryScore = null }) {
  const quote = openSelections(market).find(item => item.name === selection);
  if (!quote) return null;
  const probabilities = matrices.map(matrix => matrixProbability(matrix, predicate));
  const pushProbabilities = pushPredicate ? matrices.map(matrix => matrixProbability(matrix, pushPredicate)) : matrices.map(() => 0);
  const displayProbabilities = pushPredicate
    ? probabilities.map((probability, index) => probability / Math.max(0.0001, 1 - pushProbabilities[index]))
    : probabilities;
  const probability = displayProbabilities[0];
  const conservativeProbability = Math.min(...displayProbabilities);
  const expectedValues = probabilities.map((winProbability, index) => pushPredicate
    ? winProbability * quote.odds + pushProbabilities[index] - 1
    : winProbability * quote.odds - 1);
  const expectedValue = expectedValues[0];
  const conservativeExpectedValue = Math.min(...expectedValues);
  const width = Math.max(...displayProbabilities) - Math.min(...displayProbabilities);
  const edge = marketProbability == null ? null : probability - marketProbability;
  const qualifies = expectedValue >= 0.03 && conservativeExpectedValue > 0 && dataCompleteness >= 0.58 && width <= 0.14;
  return {
    id: `${family}:${selection}:${market.threshold ?? "main"}`,
    family,
    scenarioCompatible: primaryScore ? predicate(primaryScore) || Boolean(pushPredicate?.(primaryScore)) : null,
    market: label,
    selection,
    providerSelectionId: quote.providerSelectionId,
    odds: quote.odds,
    modelProbabilityPct: round(probability * 100, 1),
    conservativeProbabilityPct: round(conservativeProbability * 100, 1),
    fairOdds: round(1 / probability, 2),
    marketNoMarginPct: marketProbability == null ? null : round(marketProbability * 100, 1),
    edgePct: edge == null ? null : round(edge * 100, 1),
    expectedValuePct: round(expectedValue * 100, 1),
    conservativeExpectedValuePct: round(conservativeExpectedValue * 100, 1),
    sensitivityWidthPct: round(width * 100, 1),
    confidence: dataCompleteness >= 0.72 && width <= 0.08 ? "Alta" : dataCompleteness >= 0.58 && width <= 0.14 ? "Media" : "Bassa",
    qualifies,
    classification: qualifies ? "value" : probability >= 0.65 && expectedValue <= 0 ? "probabile ma senza valore" : conservativeExpectedValue <= 0 && expectedValue > 0 ? "fragile" : "neutrale"
  };
}

function marketEvaluation(oddsEvent, matrices, dataCompleteness, primaryScore) {
  const rows = [];
  const main = findMainOneXTwo(oddsEvent);
  const mainNoMargin = noMarginMap(main);
  for (const outcome of OUTCOMES) rows.push(evaluateMarketRow({
    market: main, selection: outcome, family: "1x2", label: "1X2",
    predicate: conditionForOutcome(outcome), matrices, marketProbability: mainNoMargin[outcome], dataCompleteness, primaryScore
  }));

  const doubleChance = findMarket(oddsEvent, "DOPPIA CHANCE");
  for (const selection of ["1X", "12", "X2"]) rows.push(evaluateMarketRow({
    market: doubleChance, selection, family: "double-chance", label: "Doppia chance",
    predicate: conditionForDoubleChance(selection), matrices,
    marketProbability: sum(selection.split("").map(outcome => mainNoMargin[outcome] || 0)), dataCompleteness, primaryScore
  }));

  const drawNoBet = findMarket(oddsEvent, "DRAW NO BET");
  const drawNoBetNoMargin = noMarginMap(drawNoBet);
  for (const selection of ["1", "2"]) rows.push(evaluateMarketRow({
    market: drawNoBet, selection, family: "draw-no-bet", label: "Draw No Bet",
    predicate: conditionForOutcome(selection), pushPredicate: conditionForOutcome("X"), matrices,
    marketProbability: drawNoBetNoMargin[selection], dataCompleteness, primaryScore
  }));

  for (const threshold of [1.5, 2.5, 3.5]) {
    const market = findMarket(oddsEvent, "UNDER/OVER", threshold);
    const prices = noMarginMap(market);
    for (const selection of ["UNDER", "OVER"]) rows.push(evaluateMarketRow({
      market, selection, family: "goals", label: `Under/Over ${threshold}`,
      predicate: conditionForGoals(selection, threshold), matrices, marketProbability: prices[selection], dataCompleteness, primaryScore
    }));
  }

  const bothTeamsScore = findMarket(oddsEvent, "GOAL/NOGOAL");
  const bothTeamsScorePrices = noMarginMap(bothTeamsScore);
  for (const selection of ["GOAL", "NOGOAL"]) rows.push(evaluateMarketRow({
    market: bothTeamsScore, selection, family: "btts", label: "Goal/No Goal",
    predicate: conditionForBothTeamsScore(selection), matrices, marketProbability: bothTeamsScorePrices[selection], dataCompleteness, primaryScore
  }));

  for (const [marketName, side, label] of [["CASA: SEGNA GOAL", "home", "Casa segna"], ["OSPITE: SEGNA GOAL", "away", "Ospite segna"]]) {
    const market = findMarket(oddsEvent, marketName);
    const prices = noMarginMap(market);
    for (const selection of ["SI", "NO"]) rows.push(evaluateMarketRow({
      market, selection, family: "team-goal", label,
      predicate: conditionForTeamScore(side, selection), matrices, marketProbability: prices[selection], dataCompleteness, primaryScore
    }));
  }

  const available = rows.filter(Boolean);
  const ranked = available.filter(row => row.qualifies)
    .sort((a, b) => b.conservativeExpectedValuePct - a.conservativeExpectedValuePct || b.modelProbabilityPct - a.modelProbabilityPct);
  const primary = ranked.filter(row => row.modelProbabilityPct >= 55 && row.sensitivityWidthPct <= 14).slice(0, 2);
  const primaryIds = new Set(primary.map(row => row.id));
  const secondary = ranked.filter(row => !primaryIds.has(row.id)).slice(0, 3);
  const avoid = available.filter(row => row.classification === "probabile ma senza valore" || row.classification === "fragile")
    .sort((a, b) => b.modelProbabilityPct - a.modelProbabilityPct).slice(0, 3);
  const verifiedPlayerMarkets = (oddsEvent?.markets || []).filter(market => market.marketScope === "player" && openSelections(market).length);
  return {
    rows: available,
    selections: { primary, secondary, avoid },
    playerMarkets: verifiedPlayerMarkets.length
      ? {
          status: "available",
          markets: verifiedPlayerMarkets.length,
          selections: verifiedPlayerMarkets.reduce((total, market) => total + openSelections(market).length, 0),
          note: "Quote giocatore presenti nello snapshot Sisal; titolarita e minutaggio restano proiezioni editoriali e non viene attribuito un EV modellistico non verificato."
        }
      : { status: "N/D", reason: "Nessuna quota giocatore verificata nello snapshot; titolarita e minutaggio restano proiezioni editoriali." }
  };
}

function normalCdf(value) {
  const sign = value < 0 ? -1 : 1;
  const x = Math.abs(value) / Math.sqrt(2);
  const t = 1 / (1 + 0.3275911 * x);
  const erf = sign * (1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x));
  return 0.5 * (1 + erf);
}

function configuredScorePredicate(leg) {
  const compact = String(leg.selection || "").replace(/\s+/g, "").toUpperCase();
  if (leg.market === "1X2 ESITO FINALE") return conditionForOutcome(compact);
  if (leg.market === "DOPPIA CHANCE") return conditionForDoubleChance(compact);
  if (leg.market === "UNDER/OVER") return conditionForGoals(compact, Number(leg.threshold));
  if (leg.market === "GOAL/NOGOAL") return conditionForBothTeamsScore(compact);
  if (leg.market === "CASA: SEGNA GOAL") return conditionForTeamScore("home", compact);
  if (leg.market === "OSPITE: SEGNA GOAL") return conditionForTeamScore("away", compact);
  if (leg.market === "MULTIGOAL") {
    const range = compact.match(/^(\d+)-(\d+)$/)?.slice(1).map(Number);
    return range ? score => score.home + score.away >= range[0] && score.home + score.away <= range[1] : null;
  }
  if (leg.market === "MULTIGOAL SQUADRA X") {
    const range = compact.match(/^(\d+)-(\d+)$/)?.slice(1).map(Number);
    const side = /SQUADRA 1\b/.test(leg.variant) ? "home" : /SQUADRA 2\b/.test(leg.variant) ? "away" : null;
    return range && side ? score => score[side] >= range[0] && score[side] <= range[1] : null;
  }
  if (leg.market === "U/O SQUADRA X") {
    const side = /SQUADRA 1\b/.test(leg.variant) ? "home" : /SQUADRA 2\b/.test(leg.variant) ? "away" : null;
    return side ? score => compact === "OVER" ? score[side] > Number(leg.threshold) : compact === "UNDER" ? score[side] < Number(leg.threshold) : false : null;
  }
  if (["COMBO: DC + U/O", "COMBO: 1X2 + U/O", "COMBO: DC + GOAL/NOGOAL"].includes(leg.market)) {
    return comboPredicate(String(leg.selection), Number(leg.threshold));
  }
  if (leg.market === "COMBO: U/O CASA + U/O OSPITE") {
    const thresholds = [...String(leg.variant).matchAll(/U\/O\s+(\d+(?:\.\d+)?)/gi)].map(match => Number(match[1]));
    const parts = compact.split("+");
    return thresholds.length === 2 && parts.length === 2 ? score => [score.home, score.away].every((goals, index) => parts[index] === "OVER" ? goals > thresholds[index] : parts[index] === "UNDER" ? goals < thresholds[index] : false) : null;
  }
  return null;
}

function configuredVolumeAssessment(leg, projections) {
  const metricKey = leg.market.includes("TIRI IN PORTA") ? "shotsOnTarget"
    : leg.market.includes("TIRI TOTALI") ? "shotsTotal"
      : leg.market.includes("CORNER") ? "corners" : null;
  if (!metricKey) return null;
  if (["ENTRAMBE LE SQUADRE ALMENO X TIRI IN PORTA", "ENTRAMBE ALMENO X CORNER"].includes(leg.market)) {
    const threshold = Number(String(leg.variant).match(/ALMENO\s+(\d+(?:\.\d+)?)/i)?.[1]);
    if (!Number.isFinite(threshold) || leg.selection !== "SI") return null;
    const probabilities = projections.teams.map(team => {
      const metric = team?.[metricKey];
      const mean = Number(metric?.central), sd = Number(metric?.sd);
      return Number.isFinite(mean) && Number.isFinite(sd) && sd > 0 ? 1 - normalCdf((threshold - 0.5 - mean) / sd) : null;
    });
    if (probabilities.some(value => !Number.isFinite(value))) return null;
    const probability = probabilities[0] * probabilities[1];
    return { probability, prudentProbability: probability * 0.9, method: "volumi squadra" };
  }
  if (!/^U\/O (?:TIRI TOTALI|TIRI IN PORTA|CORNER)(?: SQUADRA X)?$/.test(leg.market)) return null;
  const side = /SQUADRA 1\b/.test(leg.variant) ? 0 : /SQUADRA 2\b/.test(leg.variant) ? 1 : null;
  const metric = side == null ? projections.match?.[metricKey] : projections.teams?.[side]?.[metricKey];
  const mean = Number(metric?.central), sd = Number(metric?.sd), threshold = Number(leg.threshold);
  if (![mean, sd, threshold].every(Number.isFinite) || sd <= 0) return null;
  const under = normalCdf((threshold - mean) / sd);
  const probability = leg.selection === "OVER" ? 1 - under : leg.selection === "UNDER" ? under : null;
  return Number.isFinite(probability) ? { probability, prudentProbability: probability * 0.92, method: "volume previsto" } : null;
}

function assessConfiguredPortfolio(legs, matrices, dataCompleteness, projections) {
  const assessed = legs.map(leg => {
    const scorePredicate = configuredScorePredicate(leg);
    if (scorePredicate) {
      const probabilities = matrices.map(matrix => matrixProbability(matrix, scorePredicate));
      return { leg, scorePredicate, probability: probabilities[0], prudentProbability: Math.min(...probabilities), method: "matrice punteggi" };
    }
    const volume = configuredVolumeAssessment(leg, projections);
    return volume ? { leg, scorePredicate: null, ...volume } : null;
  });
  if (assessed.some(item => !item)) return null;
  const scorePredicates = assessed.filter(item => item.scorePredicate).map(item => item.scorePredicate);
  const volumeAssessments = assessed.filter(item => !item.scorePredicate);
  const scoreProbabilities = scorePredicates.length
    ? matrices.map(matrix => matrixProbability(matrix, score => scorePredicates.every(predicate => predicate(score))))
    : matrices.map(() => 1);
  const centralProbability = scoreProbabilities[0] * volumeAssessments.reduce((product, item) => product * item.probability, 1);
  const dependencyHaircut = 0.95 ** Math.max(0, volumeAssessments.length - 1);
  const completenessHaircut = clamp(0.9 + (dataCompleteness - 0.58) * 0.15, 0.88, 0.95);
  const prudentProbability = Math.min(...scoreProbabilities)
    * volumeAssessments.reduce((product, item) => product * item.prudentProbability, 1)
    * dependencyHaircut * completenessHaircut;
  const legMetrics = assessed.map(item => ({
    providerSelectionId: item.leg.providerSelectionId,
    probabilityPct: round(item.probability * 100, 1),
    prudentProbabilityPct: round(item.prudentProbability * 100, 1),
    fairOdds: round(1 / Math.max(0.0001, item.prudentProbability), 2),
    expectedValuePct: round((item.prudentProbability * item.leg.odds - 1) * 100, 1),
    method: item.method
  }));
  return { centralProbability, prudentProbability, legMetrics };
}

function configuredComboPortfolio(oddsEvent, config, matrices, dataCompleteness, projections) {
  if (!config?.portfolios?.length) return null;
  const constraints = config.constraints || {};
  const informationalRisk = constraints.riskPolicy === "informativa";
  const minimum = constraints.minLegOddsInclusive ?? 1;
  const maximum = constraints.maxLegOddsExclusive ?? 1.8;
  const maximumInclusive = constraints.maxLegOddsInclusive;
  const flexibleQuota = constraints.quotaPolicy === "orientativa";
  const tolerance = constraints.targetTolerancePct ?? 20;
  const selectionIndex = new Map();
  for (const market of oddsEvent?.markets || []) {
    for (const selection of market.selections || []) {
      selectionIndex.set(String(selection.providerSelectionId), { market, selection });
    }
  }
  const portfolioSelectionIds = new Set();
  return config.portfolios.map(portfolio => {
    const targetOdds = portfolio.targetOdds ?? constraints.referenceOdds?.[portfolio.tier] ?? constraints.targets?.[portfolio.tier];
    const scenario = portfolio.scenario || null;
    const risk = portfolio.risk || (portfolio.tier === "Safe" ? "relativo inferiore" : portfolio.tier === "Balanced" ? "medio" : "elevato");
    if (!(targetOdds > 1)) throw new Error(`${oddsEvent.canonicalMatchId}/${portfolio.tier}: target MyCombo non valido`);
    if (portfolio.status === "N/D" || !portfolio.legs?.length) return {
      tier: portfolio.tier,
      scenario,
      risk,
      targetOdds,
      odds: null,
      legs: [],
      selection: null,
      logic: null,
      qualityStatus: "nd",
      probabilityStatus: "N/D",
      unavailableReason: portfolio.reason || "Nessuna combinazione supera i vincoli prudenziali."
    };
    const overlapKeys = new Set();
    const semanticKeys = new Set();
    const selectionIds = new Set();
    let unavailableReason = null;
    const legs = portfolio.legs.map(leg => {
      const resolved = selectionIndex.get(String(leg.providerSelectionId));
      if (!resolved) {
        unavailableReason = `Quota Sisal non più disponibile nello snapshot aggiornato (${leg.providerSelectionId}).`;
        return null;
      }
      const { market, selection } = resolved;
      const oddsInRange = selection.odds >= minimum && (Number.isFinite(maximumInclusive) ? selection.odds <= maximumInclusive : selection.odds < maximum);
      if (selection.status !== "open" || !oddsInRange) {
        unavailableReason = `Quota ${selection.odds} fuori dall'intervallo ammesso ${minimum}-${Number.isFinite(maximumInclusive) ? maximumInclusive : maximum}.`;
        return null;
      }
      if (!leg.overlapKey || overlapKeys.has(leg.overlapKey)) {
        throw new Error(`${oddsEvent.canonicalMatchId}/${portfolio.tier}: esito sovrapponibile ${leg.overlapKey || "senza chiave"}`);
      }
      const legSemanticKeys = Array.isArray(leg.semanticKeys) ? leg.semanticKeys : [];
      if (constraints.semanticOverlapPolicy && legSemanticKeys.some(key => semanticKeys.has(key))) {
        throw new Error(`${oddsEvent.canonicalMatchId}/${portfolio.tier}: scenario semantico ripetuto ${legSemanticKeys.find(key => semanticKeys.has(key))}`);
      }
      if (selectionIds.has(String(selection.providerSelectionId))) {
        throw new Error(`${oddsEvent.canonicalMatchId}/${portfolio.tier}: selectionId duplicato ${selection.providerSelectionId}`);
      }
      if (!constraints.allowCrossTierSelectionReuse && portfolioSelectionIds.has(String(selection.providerSelectionId))) {
        throw new Error(`${oddsEvent.canonicalMatchId}/${portfolio.tier}: proposta gia usata in un'altra MyCombo ${selection.providerSelectionId}`);
      }
      overlapKeys.add(leg.overlapKey);
      legSemanticKeys.forEach(key => semanticKeys.add(key));
      selectionIds.add(String(selection.providerSelectionId));
      return {
        label: leg.label,
        market: market.marketName,
        variant: market.variantName,
        threshold: market.threshold,
        selection: selection.name,
        providerMarketId: market.providerMarketId,
        providerSelectionId: selection.providerSelectionId,
        odds: selection.odds,
        marketUpdatedAt: market.updatedAt,
        overlapKey: leg.overlapKey,
        semanticKeys: legSemanticKeys,
        marketScope: market.marketScope,
        sourceBetSelection: leg.betSelection || null,
        marketObject: market,
        selectionObject: selection,
      };
    });
    if (unavailableReason) return {
      tier: portfolio.tier,
      scenario,
      risk,
      targetOdds,
      odds: null,
      legs: [],
      selection: null,
      logic: null,
      qualityStatus: "nd",
      probabilityStatus: "N/D",
      unavailableReason
    };
    const odds = round(legs.reduce((product, leg) => product * leg.odds, 1), 2);
    const distancePct = round(Math.abs(odds - targetOdds) / targetOdds * 100, 1);
    if (!flexibleQuota && distancePct > tolerance) {
      return {
        tier: portfolio.tier,
        scenario,
        risk,
        targetOdds,
        odds: null,
        legs: [],
        selection: null,
        logic: null,
        qualityStatus: "nd",
        probabilityStatus: "N/D",
        unavailableReason: `Quota ${odds} oltre la tolleranza del ${tolerance}% dal target ${targetOdds}.`
      };
    }
    legs.forEach(leg => portfolioSelectionIds.add(String(leg.providerSelectionId)));
    const assessment = assessConfiguredPortfolio(legs, matrices, dataCompleteness, projections);
    const legMetrics = new Map((assessment?.legMetrics || []).map(item => [String(item.providerSelectionId), item]));
    const enrichedLegs = legs.map(leg => {
      const metrics = legMetrics.get(String(leg.providerSelectionId)) || {};
      const selectionId = selectionIdFor({
        matchId: oddsEvent.canonicalMatchId,
        provider: config.quoteSource?.provider || constraints.provider || "Sisal",
        providerSelectionId: leg.providerSelectionId,
      });
      const assessment = config.selectionAssessments?.[selectionId] || null;
      const sourceOperational = leg.sourceBetSelection?.operational || {};
      const sourceCompatibility = leg.sourceBetSelection?.compatibility || null;
      const enriched = {
        label: leg.label,
        market: leg.market,
        variant: leg.variant,
        threshold: leg.threshold,
        selection: leg.selection,
        providerMarketId: leg.providerMarketId,
        providerSelectionId: leg.providerSelectionId,
        odds: leg.odds,
        marketUpdatedAt: leg.marketUpdatedAt,
        overlapKey: leg.overlapKey,
        semanticKeys: leg.semanticKeys,
        marketScope: leg.marketScope,
        ...metrics,
      };
      return attachBetSelection(enriched, {
        matchId: oddsEvent.canonicalMatchId,
        provider: config.quoteSource?.provider || constraints.provider || "Sisal",
        marketObject: leg.marketObject,
        selectionObject: leg.selectionObject,
        quoteSource: config.quoteSource,
        classification: assessment?.classification ?? sourceOperational.classification,
        classificationReason: assessment?.classificationReason ?? sourceOperational.classificationReason,
        reliability: assessment?.reliability ?? sourceOperational.reliability,
        compatibility: assessment?.compatibility ?? sourceCompatibility ?? { status: "NOT_EVALUATED", reason: "Compatibilità specifica non valutata per la MyCombo." },
        modelProbabilityPct: metrics.probabilityPct,
        fairOdds: metrics.fairOdds,
        expectedValuePct: metrics.expectedValuePct,
        evaluationStatus: metrics.method ? "MODELLED_LEG" : "NOT_MODELLED",
        warnings: assessment?.warnings || leg.sourceBetSelection?.warnings,
        risks: assessment?.risks || leg.sourceBetSelection?.risks,
      });
    });
    const weakestLeg = enrichedLegs.filter(leg => Number.isFinite(leg.prudentProbabilityPct)).sort((a, b) => a.prudentProbabilityPct - b.prudentProbabilityPct)[0] || null;
    const prudentProbabilityPct = assessment ? round(assessment.prudentProbability * 100, 2) : null;
    const prudentExpectedValuePct = assessment ? round((assessment.prudentProbability * odds - 1) * 100, 1) : null;
    return {
      tier: portfolio.tier,
      scenario,
      risk,
      targetOdds,
      quotaPolicy: flexibleQuota ? "orientativa" : "target",
      eligibilityPolicy: constraints.eligibilityPolicy || null,
      riskPolicy: constraints.riskPolicy || null,
      odds,
      distancePct,
      legs: enrichedLegs,
      selection: enrichedLegs.map(leg => leg.label).join(" + "),
      logic: portfolio.logic,
      probabilityPct: assessment ? round(assessment.centralProbability * 100, 2) : null,
      prudentProbabilityPct,
      fairOdds: assessment ? round(1 / Math.max(0.0001, assessment.prudentProbability), 2) : null,
      prudentExpectedValuePct,
      qualityStatus: !assessment ? (informationalRisk ? "editoriale" : "nd") : prudentExpectedValuePct >= 0 ? "qualificata" : prudentExpectedValuePct >= -10 ? "da valutare" : "editoriale",
      weakestLeg: weakestLeg ? { label: weakestLeg.label, prudentProbabilityPct: weakestLeg.prudentProbabilityPct } : null,
      probabilityMethod: assessment ? "Stima prudenziale: congiunzione esatta dei mercati gol, volumi modellati e penalita per dipendenze residue." : null,
      probabilityStatus: assessment ? null : "N/D · stima congiunta non supportata"
    };
  });
}

function comboPredicate(selection, threshold) {
  const [first, second] = selection.split(" + ");
  const predicates = [];
  if (["1", "X", "2"].includes(first)) predicates.push(conditionForOutcome(first));
  else if (["1X", "12", "X2"].includes(first)) predicates.push(conditionForDoubleChance(first));
  if (["U", "UNDER"].includes(second)) predicates.push(conditionForGoals("UNDER", threshold));
  if (["O", "OVER"].includes(second)) predicates.push(conditionForGoals("OVER", threshold));
  if (["GOAL", "NOGOAL"].includes(second)) predicates.push(conditionForBothTeamsScore(second));
  return predicates.length === 2 ? score => predicates.every(predicate => predicate(score)) : null;
}

function comboPortfolio(oddsEvent, matrices, dataCompleteness, config, projections) {
  const configured = configuredComboPortfolio(oddsEvent, config, matrices, dataCompleteness, projections);
  if (configured) return configured;
  if (dataCompleteness < 0.58) return [];
  const candidates = [];
  for (const market of (oddsEvent?.markets || []).filter(item => ["COMBO: DC + U/O", "COMBO: 1X2 + U/O", "COMBO: DC + GOAL/NOGOAL"].includes(item.marketName))) {
    for (const selection of openSelections(market)) {
      const predicate = comboPredicate(selection.name, Number(market.threshold));
      if (!predicate) continue;
      const probabilities = matrices.map(matrix => matrixProbability(matrix, predicate));
      const evs = probabilities.map(probability => probability * selection.odds - 1);
      candidates.push({
        market: market.marketName,
        selection: selection.name,
        providerSelectionId: selection.providerSelectionId,
        odds: selection.odds,
        probabilityPct: round(probabilities[0] * 100, 1),
        prudentProbabilityPct: round(Math.min(...probabilities) * 100, 1),
        expectedValuePct: round(evs[0] * 100, 1),
        prudentExpectedValuePct: round(Math.min(...evs) * 100, 1)
      });
    }
  }
  const eligible = candidates.filter(candidate => candidate.expectedValuePct >= 3 && candidate.prudentExpectedValuePct > 0);
  const used = new Set();
  const pick = (tier, predicate, risk) => {
    const selected = eligible.filter(candidate => !used.has(candidate.providerSelectionId) && predicate(candidate))
      .sort((a, b) => b.prudentProbabilityPct - a.prudentProbabilityPct || b.prudentExpectedValuePct - a.prudentExpectedValuePct)[0];
    if (!selected) return null;
    used.add(selected.providerSelectionId);
    return { tier, risk, ...selected, logic: "Quota combinata gia presente nello snapshot; probabilita congiunta calcolata sulla matrice dei punteggi, senza moltiplicare eventi correlati." };
  };
  return [
    pick("Safe", candidate => candidate.prudentProbabilityPct >= 58 && candidate.odds <= 2, "relativo inferiore"),
    pick("Balanced", candidate => candidate.prudentProbabilityPct >= 38 && candidate.prudentProbabilityPct < 65 && candidate.odds >= 1.6 && candidate.odds <= 3.5, "medio"),
    pick("Aggressive", candidate => candidate.prudentProbabilityPct >= 18 && candidate.prudentProbabilityPct < 45 && candidate.odds >= 2.5, "elevato")
  ].filter(Boolean);
}

function matchScenarios(input, final, expected) {
  const favorite = final[0] >= final[2] ? input.homeTeam.name : input.awayTeam.name;
  const outsider = final[0] >= final[2] ? input.awayTeam.name : input.homeTeam.name;
  const totalTone = expected.total >= 2.65 ? "ritmo e volume offensivo sopra la media" : "gara tendenzialmente controllata e con margini ridotti";
  return [
    {
      id: "A", label: "Scenario principale",
      description: `${favorite} prova a imporre il proprio matchup; il modello vede ${totalTone}.`,
      improves: expected.total >= 2.65 ? "Over e Goal, se il vantaggio iniziale non spegne il ritmo." : "Under e protezioni sull'esito favorito.",
      worsens: expected.total >= 2.65 ? "Under bassi e risultati bloccati." : "Over alti e mercati di goleada."
    },
    {
      id: "B", label: "Scenario alternativo",
      description: `${outsider} segna per primo oppure lo 0-0 resiste oltre l'intervallo, costringendo la favorita a cambiare altezza e volume.`,
      improves: "Tiri e corner della squadra costretta a inseguire; live Over se aumentano davvero ritmo e occasioni.",
      worsens: "1X2 prepartita della favorita e combinazioni che richiedono controllo immediato."
    },
    {
      id: "C", label: "Scenario di rottura",
      description: "Espulsione, infortunio nel riscaldamento, XI inatteso o condizioni ambientali anomale invalidano parte delle ipotesi prepartita.",
      improves: "Solo mercati rivalutati dopo la nuova informazione e con prezzo ancora disponibile.",
      worsens: "Mercati giocatore, cartellini e combinazioni correlate costruite sulle formazioni attuali."
    }
  ];
}

function predictMatch(input) {
  const market = marketProbabilities(findMainOneXTwo(input.oddsEvent));
  const expected = expectedGoals(input);
  const matrix = scoreMatrix(expected.home, expected.away, 7);
  const parts = {
    historical: technicalProbabilities(matrix),
    tactical: tacticalProbabilities(input.homeProfile, input.awayProfile),
    objectives: objectiveProbabilities(input.homeObjective, input.awayObjective)
  };
  const final = parts.historical;
  const crossCompetition = input.homeProfile?.competition !== "Serie A" || input.awayProfile?.competition !== "Serie A";
  const completedSections = Object.values(input.reading?.sections || {}).filter(section => section?.content).length;
  const lineupsComplete = input.homeTeam?.probableLineup?.players?.length === 11 && input.awayTeam?.probableLineup?.players?.length === 11;
  const lineupsOfficial = input.homeTeam?.probableLineup?.status === "official" && input.awayTeam?.probableLineup?.status === "official";
  const dataCompleteness = clamp(0.52 + completedSections * 0.035 + (lineupsComplete ? 0.12 : 0) - (crossCompetition ? 0.08 : 0), 0.45, 0.86);
  const surprise = surpriseFactor({ final, market: market?.probabilities, historical: parts.historical, dataCompleteness, crossCompetition });
  const confidenceResult = confidence(final, surprise, dataCompleteness);
  const orderedOutcomes = OUTCOMES.map((outcome, index) => ({ outcome, probability: final[index] })).sort((a, b) => b.probability - a.probability);
  const topTwo = new Set(orderedOutcomes.slice(0, 2).map(item => item.outcome));
  const doubleChance = topTwo.has("1") && topTwo.has("X") ? "1X" : topTwo.has("X") && topTwo.has("2") ? "X2" : "12";
  const matrices = sensitivityMatrices(expected, matrix, null);
  const forecast = scoreForecast(matrix, final);
  const [primaryHome, primaryAway] = forecast.primary.score.split("-").map(Number);
  const evaluatedMarkets = marketEvaluation(input.oddsEvent, matrices, dataCompleteness, { home: primaryHome, away: primaryAway });
  const valueCandidates = evaluatedMarkets.rows.filter(row => row.family === "1x2");
  const teamProjections = [
    teamProjection(input.homeTeam, input.homeProfile, input.awayProfile, input.homeSquad, input.homeDiscipline, input.homeVolume, input.awayVolume, "home", final[0], final[2], expected.home, input.awayTeamMatchupProfile, input.homeTeamMatchupProfile),
    teamProjection(input.awayTeam, input.awayProfile, input.homeProfile, input.awaySquad, input.awayDiscipline, input.awayVolume, input.homeVolume, "away", final[2], final[0], expected.away, input.homeTeamMatchupProfile, input.awayTeamMatchupProfile)
  ];
  const matchProjection = {
    shotsTotal: combineVolumeMetric(teamProjections[0].shotsTotal, teamProjections[1].shotsTotal),
    shotsOnTarget: combineVolumeMetric(teamProjections[0].shotsOnTarget, teamProjections[1].shotsOnTarget),
    corners: combineVolumeMetric(teamProjections[0].corners, teamProjections[1].corners),
    basis: "Somma delle medie squadra; intervallo p20-p80 del totale con varianze indipendenti."
  };
  const exact = exactScores(matrix, expected.total);
  const shooters = shooterCandidates(input.homeTeam, input.awayTeam, input.homeSquad, input.awaySquad, teamProjections, input.oddsEvent, input.homeProfile, input.awayProfile, input.homeVolume, input.awayVolume, input.homeCurrentPlayers, input.awayCurrentPlayers, input.homeTeamMatchupProfile, input.awayTeamMatchupProfile);
  const lineupCandidates = [...lineupPlayers(input.homeTeam, input.homeSquad), ...lineupPlayers(input.awayTeam, input.awaySquad)];
  const lineupExpected = (input.homeTeam?.probableLineup?.players?.length || 0) + (input.awayTeam?.probableLineup?.players?.length || 0);
  const lineupResolved = lineupCandidates.filter(candidate => candidate.player).length;
  const outfieldExpected = lineupCandidates.filter(candidate => candidate.role !== "Portiere").length;
  const outfieldModeled = shooters.allPlayers.length;
  return {
    matchId: input.match.id,
    generatedAt: input.generatedAt,
    status: "preliminary",
    engineVersion: ENGINE_VERSION,
    playerMarketModelVersion: PLAYER_MARKET_MODEL_VERSION,
    teamMatchupProfileVersion: 2,
    probabilities: {
      final: probabilityObject(final),
      marketNoMargin: market ? probabilityObject(market.probabilities) : null,
      historical: probabilityObject(parts.historical),
      tactical: probabilityObject(parts.tactical),
      objectives: probabilityObject(parts.objectives)
    },
    expectedGoals: expected,
    headToHead: expected.components.headToHead,
    exactScores: exact,
    scoreForecast: forecast,
    scoreProfile: scoreProfile(matrix, exact),
    verdict: {
      outcome: orderedOutcomes[0].outcome,
      doubleChance,
      label: orderedOutcomes[0].probability >= 0.5 ? `Prevalenza ${orderedOutcomes[0].outcome}` : `Equilibrio con lieve prevalenza ${orderedOutcomes[0].outcome}`
    },
    confidence: confidenceResult,
    surprise,
    matchProjection,
    teamProjections,
    shooters,
    likelyBooked: bookingCandidates(input.homeTeam, input.awayTeam, input.homeSquad, input.awaySquad, input.homeProfile, input.awayProfile, input.homeCurrentDiscipline, input.awayCurrentDiscipline, input.refereeProfile, input.refereeLeagueAverage, input.homeTeamMatchupProfile, input.awayTeamMatchupProfile),
    scenarios: matchScenarios(input, final, expected),
    marketComparison: evaluatedMarkets.rows,
    recommendations: evaluatedMarkets.selections,
    combinations: comboPortfolio(input.oddsEvent, matrices, dataCompleteness, input.myComboConfig, { teams: teamProjections, match: matchProjection }),
    playerMarkets: evaluatedMarkets.playerMarkets,
    market: {
      status: market ? "available" : "unavailable",
      provider: market ? "Sisal" : null,
      sourceUrl: market ? input.oddsSourceUrl : null,
      retrievedAt: market ? input.oddsRetrievedAt : null,
      overroundPct: market?.overroundPct ?? null,
      selections: market?.selections ?? null,
      valueCandidates,
      role: market
        ? "Confronto esterno: le quote non entrano nei gol attesi ne nelle probabilita del modello."
        : "N/D: nessuna quota verificata disponibile; il pronostico usa soltanto il modello tecnico."
    },
    dataQuality: {
      completenessPct: Math.round(dataCompleteness * 100),
      crossCompetitionBaseline: crossCompetition,
      updatedAt: String(input.generatedAt || "").slice(0, 10),
      probableLineups: lineupExpected > 0
        ? `${lineupResolved}/${lineupExpected} titolari ${lineupsOfficial ? "ufficiali confermati" : "proiettati; fonte editoriale da riconfermare"}`
        : "N/D",
      lineupResolved: { resolved: lineupResolved, expected: lineupExpected, complete: lineupExpected > 0 && lineupResolved === lineupExpected },
      outfieldPlayersModeled: { modeled: outfieldModeled, expected: outfieldExpected, complete: outfieldExpected > 0 && outfieldModeled === outfieldExpected },
      missing: [
        "forma ufficiale 2026/27",
        ...(input.reading?.sections?.availability?.content ? [] : ["indisponibili verificati"]),
        ...(input.reading?.sections?.referee?.content ? [] : ["designazione arbitrale"]),
        "meteo attendibile alla data della gara",
        ...(market ? [] : ["quote 1X2 verificate"]),
        ...(evaluatedMarkets.playerMarkets.status === "available" ? [] : ["quote giocatore verificate"])
      ]
    }
  };
}

module.exports = { ENGINE_VERSION, PLAYER_MARKET_MODEL_VERSION, OUTCOMES, WEIGHTS, attackChannels, findMainOneXTwo, marketProbabilities, opponentAbilityToExploit, teamProfilePlayerModifier, teamOffensiveAllocation, volumeMetric, applyOwnOffensiveVolumeProfile, applyOpponentTeamVolumeInteraction, playerBaselineStability, expectedMinutes, poissonAtLeast, expectedDefensiveExposureFactor, scoreMatrix, sensitivityMatrices, matrixProbability, configuredScorePredicate, conditionForOutcome, predictMatch };
