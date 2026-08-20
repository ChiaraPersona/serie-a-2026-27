"use strict";

const ENGINE_VERSION = "4.8.0";
const OUTCOMES = ["1", "X", "2"];
const WEIGHTS = Object.freeze({ venueHistorical: 0.46, overallHistorical: 0.25, recentForm: 0.16, tacticalMatchup: 0.07, probableLineup: 0.05, objectives: 0.01 });
const MVP_WEIGHTS = Object.freeze({ resultScenario: 0.3, individualProduction: 0.2, historicalRating: 0.15, officialMvpHistory: 0.15, tacticalFit: 0.1, opponentHistory: 0.05, dataReliability: 0.05 });

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
  const bestFor = outcome => orderedScores.find(score => outcomeOf(score) === outcome);
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
  const primaryScore = bestFor(outcomeOrder[0].outcome);
  const modalScore = orderedScores[0];
  const primary = decorate(primaryScore, "Risultato principale");
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
    method: "Il risultato principale e il punteggio piu probabile condizionato all'esito 1X2 favorito; gli altri due sono i punteggi successivi piu probabili della matrice, senza forzare pareggio o sorpresa."
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

function resolvePlayer(lineupName, squad) {
  const target = cleanName(lineupName);
  const targetTokens = target.split(" ");
  const candidates = (squad?.players || []).map(player => ({ player, normalized: cleanName(player.name) }));
  return candidates.find(candidate => candidate.normalized === target)?.player
    || candidates.find(candidate => candidate.normalized.endsWith(` ${target}`))?.player
    || candidates.find(candidate => targetTokens.every(token => candidate.normalized.split(" ").includes(token)))?.player
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

function playerSide(candidate) {
  const role = cleanName(candidate.detailedRole);
  if (role.includes("destro")) return "right";
  if (role.includes("sinistro")) return "left";
  return "central";
}

function bookingCandidates(homeTeam, awayTeam, homeSquad, awaySquad, homeProfile, awayProfile) {
  const rows = [
    ...lineupPlayers(homeTeam, homeSquad).map(candidate => ({ ...candidate, opponentProfile: awayProfile })),
    ...lineupPlayers(awayTeam, awaySquad).map(candidate => ({ ...candidate, opponentProfile: homeProfile }))
  ].filter(candidate => candidate.role !== "Portiere").map(candidate => {
    const per90 = candidate.player?.previousSeason?.totals?.per90 || {};
    const minutes = candidate.player?.previousSeason?.totals?.minutes || 0;
    const side = playerSide(candidate);
    const opponentChannels = attackChannels(candidate.opponentProfile);
    const facedChannel = side === "right" ? opponentChannels.left : side === "left" ? opponentChannels.right : opponentChannels.central;
    const roleBase = candidate.role === "Difensore" ? 1.15 : candidate.role === "Centrocampista" ? 0.95 : 0.48;
    const observed = (per90.cards ?? per90.yellowCards ?? 0.12) * 3.6 + (per90.foulsCommitted ?? 1.05) * 0.42;
    const reliability = minutes ? clamp(minutes / 1800, 0.35, 1) : 0.3;
    const duelLoad = facedChannel / 100 * 1.15 + (candidate.opponentProfile?.playingStyle || []).some(item => item.id === "aggressivi") * 0.14;
    const raw = roleBase + observed * (0.55 + reliability * 0.45) + duelLoad;
    const riskScore = Math.round(clamp(raw * 19, 12, 88));
    const evidence = [];
    if (per90.cards != null) evidence.push(`${round(per90.cards, 2)} cartellini/90`);
    if (per90.foulsCommitted != null) evidence.push(`${round(per90.foulsCommitted, 2)} falli/90`);
    evidence.push(`duelli sul canale ${side === "left" ? "sinistro" : side === "right" ? "destro" : "centrale"}`);
    return { name: candidate.name, teamId: candidate.teamId, role: candidate.role, riskScore, evidence, dataStatus: candidate.player ? "verified-history" : "role-baseline" };
  }).sort((a, b) => b.riskScore - a.riskScore || a.name.localeCompare(b.name, "it"));

  const selected = rows.slice(0, 5);
  for (const teamId of [homeTeam.id, awayTeam.id]) {
    if (!selected.some(candidate => candidate.teamId === teamId)) {
      const replacement = rows.find(candidate => candidate.teamId === teamId && !selected.includes(candidate));
      if (replacement) selected[selected.length - 1] = replacement;
    }
  }
  return selected.sort((a, b) => b.riskScore - a.riskScore).map((candidate, index) => ({ ...candidate, rank: index + 1, possibleFirstBooked: index === 0 }));
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

function teamProjection(team, profile, opponentProfile, squad, disciplineProfile, volumeProfile, opponentVolumeProfile, venue, outcomeProbability, opponentProbability, expectedGoal) {
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
  const discipline = disciplineBaseline(profile, disciplineProfile);
  return {
    teamId: team.id,
    venue,
    attackChannels: channels,
    shotsTotal,
    shotsOnTarget,
    corners,
    fouls: discipline.fouls == null ? null : rangeMetric(discipline.fouls, 2.4, 3),
    cards: discipline.yellowCards == null ? null : rangeMetric(discipline.yellowCards, 0.85, 0),
    expectedGoals: expectedGoal,
    basis: "Volumi ESPN 2025/26 prodotti e concessi per sede (45% squadra, 35% avversaria), ultime otto gare con peso 20%, matchup, possesso e probabile XI. Intervallo p20-p80 osservato."
  };
}

function previousSerieA(candidate) {
  return (candidate.player?.previousSeason?.totalsByCompetition || []).some(row => cleanName(row.competition) === "serie a");
}

function rateFromTotals(totals, per90, key) {
  if (Number.isFinite(per90[key])) return per90[key];
  if (Number.isFinite(totals[key]) && totals.appearances > 0) return totals[key] / totals.appearances;
  return null;
}

function officialMvpProfile(candidate, history, opponentTeamId, sourceUrl) {
  const key = cleanName(candidate.player?.name || candidate.name);
  const record = history?.get(key) || null;
  const eligible = Boolean(record || previousSerieA(candidate));
  const totals = candidate.player?.previousSeason?.totals || {};
  if (!eligible) return { season: "2025-26", provider: "Lega Serie A", award: "Panini Player of the Match", status: "N/D", awards: null, recentAwards: null, opponentAwards: null, appearances: totals.appearances ?? null, starts: totals.starts ?? null, minutes: totals.minutes ?? null, ratePerStartPct: null, awardsPer1000Minutes: null, sourceUrl };
  const awards = record?.awards || 0;
  const starts = totals.starts || 0;
  const appearances = totals.appearances || 0;
  const minutes = totals.minutes || 0;
  const opponentAwards = (record?.matches || []).filter(match => (match.homeTeamId === candidate.teamId && match.awayTeamId === opponentTeamId) || (match.awayTeamId === candidate.teamId && match.homeTeamId === opponentTeamId)).length;
  return {
    season: "2025-26",
    provider: "Lega Serie A",
    award: "Panini Player of the Match",
    status: "official",
    awards,
    recentAwards: record?.recentAwards || 0,
    opponentAwards,
    appearances: appearances || null,
    starts: starts || null,
    minutes: minutes || null,
    ratePerStartPct: starts ? round(awards / starts * 100, 1) : appearances ? round(awards / appearances * 100, 1) : null,
    awardsPer1000Minutes: minutes ? round(awards / minutes * 1000, 2) : null,
    sourceUrl
  };
}

function mvpCandidate(homeTeam, awayTeam, homeSquad, awaySquad, homeProfile, awayProfile, final, expected, mvpHistory, fantasyHistory, mvpSourceUrl) {
  const candidates = [
    ...lineupPlayers(homeTeam, homeSquad).map(candidate => ({ ...candidate, teamProbability: final[0], expectedGoals: expected.home, profile: homeProfile, opponentTeamId: awayTeam.id })),
    ...lineupPlayers(awayTeam, awaySquad).map(candidate => ({ ...candidate, teamProbability: final[2], expectedGoals: expected.away, profile: awayProfile, opponentTeamId: homeTeam.id }))
  ].map(candidate => {
    const per90 = candidate.player?.previousSeason?.totals?.per90 || {};
    const totals = candidate.player?.previousSeason?.totals || {};
    const minutes = totals.minutes || 0;
    const appearances = totals.appearances || 0;
    const normalized = cleanName(candidate.name);
    const leaderRating = candidate.profile?.leaders?.rating?.find(item => cleanName(item.player).endsWith(normalized) || normalized.endsWith(cleanName(item.player).split(" ").at(-1)))?.value || 0;
    const historyKey = cleanName(candidate.player?.name || candidate.name);
    const fantasy = fantasyHistory?.get(historyKey)?.fantasyScoring || null;
    const history = officialMvpProfile(candidate, mvpHistory, candidate.opponentTeamId, mvpSourceUrl);
    const goals = rateFromTotals(totals, per90, "goals");
    const assists = rateFromTotals(totals, per90, "assists");
    const shotsOnTarget = rateFromTotals(totals, per90, "shotsOnTarget");
    const productionScore = clamp((goals ?? 0.12) / 0.7 * 55 + (assists ?? 0.08) / 0.4 * 20 + (shotsOnTarget ?? 0.4) / 1.5 * 25, 0, 100);
    const rating = fantasy?.averageRating ?? (leaderRating || null);
    const ratingScore = rating == null ? 50 : clamp((rating - 5.7) / 1.1 * 100, 0, 100);
    const mvpFrequency = history.ratePerStartPct ?? (history.appearances ? history.awards / history.appearances * 100 : null);
    const mvpHistoryScore = history.status === "official" ? clamp(15 + (mvpFrequency || 0) / 20 * 60 + (history.recentAwards || 0) / 3 * 25, 15, 100) : 50;
    const opponentScore = history.status === "official" ? clamp(20 + (history.opponentAwards || 0) * 32, 20, 100) : 50;
    const roleFit = candidate.role === "Attaccante" ? 12 : candidate.role === "Centrocampista" ? 7 : candidate.role === "Portiere" ? 4 : 5;
    const tacticalScore = clamp(38 + candidate.expectedGoals * 22 + roleFit + (candidate.role === "Portiere" ? (1 - candidate.teamProbability) * 12 : 0), 25, 95);
    const dataReliability = clamp((candidate.player ? 35 : 10) + (minutes || appearances ? 25 : 5) + (rating != null ? 20 : 5) + (history.status === "official" ? 20 : 5), 0, 100);
    const components = {
      resultScenario: round(candidate.teamProbability * 100, 1),
      individualProduction: round(productionScore, 1),
      historicalRating: round(ratingScore, 1),
      officialMvpHistory: round(mvpHistoryScore, 1),
      tacticalFit: round(tacticalScore, 1),
      opponentHistory: round(opponentScore, 1),
      dataReliability: round(dataReliability, 1)
    };
    const score = sum(Object.entries(MVP_WEIGHTS).map(([key, weight]) => components[key] * weight));
    return { ...candidate, score, per90, totals, goals, assists, shotsOnTarget, rating, history, components };
  }).sort((a, b) => b.score - a.score);

  const favorite = final[0] >= final[2] ? { teamId: homeTeam.id, probability: final[0], opponentProbability: final[2] } : { teamId: awayTeam.id, probability: final[2], opponentProbability: final[0] };
  const favoriteRule = favorite.probability >= 0.5 && favorite.probability - favorite.opponentProbability >= 0.15;
  const best = favoriteRule ? candidates.find(candidate => candidate.teamId === favorite.teamId) || candidates[0] : candidates[0];
  const overallBest = candidates[0];
  const surprise = favoriteRule && overallBest.teamId !== best.teamId ? overallBest : null;
  const evidence = [];
  if (best.per90.goals != null) evidence.push(`${round(best.per90.goals, 2)} gol/90`);
  else if (Number.isFinite(best.totals.goals) && best.totals.appearances) evidence.push(`${best.totals.goals} gol in ${best.totals.appearances} presenze`);
  if (best.per90.assists != null) evidence.push(`${round(best.per90.assists, 2)} assist/90`);
  if (best.per90.shotsOnTarget != null) evidence.push(`${round(best.per90.shotsOnTarget, 2)} tiri in porta/90`);
  else if (Number.isFinite(best.totals.shotsOnTarget)) evidence.push(`${best.totals.shotsOnTarget} tiri in porta stagionali`);
  evidence.push(best.history.status === "official"
    ? `${best.history.awards} MVP ufficiali${best.history.ratePerStartPct != null ? ` · ${best.history.ratePerStartPct}% sulle titolarità` : ""}`
    : "storico MVP Serie A: N/D");
  if (best.history.recentAwards) evidence.push(`${best.history.recentAwards} MVP nelle ultime 10 giornate`);
  evidence.push(`scenario squadra ${round(best.teamProbability * 100, 1)}% vittoria · ${round(best.expectedGoals, 2)} gol attesi`);
  return {
    name: best.name,
    teamId: best.teamId,
    role: best.role,
    score: round(best.score, 1),
    evidence,
    confidence: best.components.dataReliability >= 75 ? "alta" : best.components.dataReliability >= 55 ? "moderata" : "prudente",
    weights: MVP_WEIGHTS,
    components: best.components,
    mvpHistory: best.history,
    selectionRule: favoriteRule ? "favorite-over-50-gap-15" : "scenario-weighted",
    surpriseCandidate: surprise ? { name: surprise.name, teamId: surprise.teamId, role: surprise.role, score: round(surprise.score, 1), mvpHistory: surprise.history } : null
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

function evaluateMarketRow({ market, selection, family, label, predicate, matrices, marketProbability, dataCompleteness, pushPredicate = null }) {
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

function marketEvaluation(oddsEvent, matrices, dataCompleteness) {
  const rows = [];
  const main = findMainOneXTwo(oddsEvent);
  const mainNoMargin = noMarginMap(main);
  for (const outcome of OUTCOMES) rows.push(evaluateMarketRow({
    market: main, selection: outcome, family: "1x2", label: "1X2",
    predicate: conditionForOutcome(outcome), matrices, marketProbability: mainNoMargin[outcome], dataCompleteness
  }));

  const doubleChance = findMarket(oddsEvent, "DOPPIA CHANCE");
  for (const selection of ["1X", "12", "X2"]) rows.push(evaluateMarketRow({
    market: doubleChance, selection, family: "double-chance", label: "Doppia chance",
    predicate: conditionForDoubleChance(selection), matrices,
    marketProbability: sum(selection.split("").map(outcome => mainNoMargin[outcome] || 0)), dataCompleteness
  }));

  const drawNoBet = findMarket(oddsEvent, "DRAW NO BET");
  const drawNoBetNoMargin = noMarginMap(drawNoBet);
  for (const selection of ["1", "2"]) rows.push(evaluateMarketRow({
    market: drawNoBet, selection, family: "draw-no-bet", label: "Draw No Bet",
    predicate: conditionForOutcome(selection), pushPredicate: conditionForOutcome("X"), matrices,
    marketProbability: drawNoBetNoMargin[selection], dataCompleteness
  }));

  for (const threshold of [1.5, 2.5, 3.5]) {
    const market = findMarket(oddsEvent, "UNDER/OVER", threshold);
    const prices = noMarginMap(market);
    for (const selection of ["UNDER", "OVER"]) rows.push(evaluateMarketRow({
      market, selection, family: "goals", label: `Under/Over ${threshold}`,
      predicate: conditionForGoals(selection, threshold), matrices, marketProbability: prices[selection], dataCompleteness
    }));
  }

  const bothTeamsScore = findMarket(oddsEvent, "GOAL/NOGOAL");
  const bothTeamsScorePrices = noMarginMap(bothTeamsScore);
  for (const selection of ["GOAL", "NOGOAL"]) rows.push(evaluateMarketRow({
    market: bothTeamsScore, selection, family: "btts", label: "Goal/No Goal",
    predicate: conditionForBothTeamsScore(selection), matrices, marketProbability: bothTeamsScorePrices[selection], dataCompleteness
  }));

  for (const [marketName, side, label] of [["CASA: SEGNA GOAL", "home", "Casa segna"], ["OSPITE: SEGNA GOAL", "away", "Ospite segna"]]) {
    const market = findMarket(oddsEvent, marketName);
    const prices = noMarginMap(market);
    for (const selection of ["SI", "NO"]) rows.push(evaluateMarketRow({
      market, selection, family: "team-goal", label,
      predicate: conditionForTeamScore(side, selection), matrices, marketProbability: prices[selection], dataCompleteness
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
  const pricingErrors = available.filter(row => row.edgePct >= 8 && row.conservativeExpectedValuePct > 0)
    .sort((a, b) => b.edgePct - a.edgePct).slice(0, 3);
  const verifiedPlayerMarkets = (oddsEvent?.markets || []).filter(market => market.marketScope === "player" && openSelections(market).length);
  return {
    rows: available,
    selections: { primary, secondary, avoid, pricingErrors },
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

function configuredComboPortfolio(oddsEvent, config) {
  if (!config?.portfolios?.length) return null;
  const constraints = config.constraints || {};
  const maximum = constraints.maxLegOddsExclusive ?? 1.8;
  const tolerance = constraints.targetTolerancePct ?? 20;
  const selectionIndex = new Map();
  for (const market of oddsEvent?.markets || []) {
    for (const selection of market.selections || []) {
      selectionIndex.set(String(selection.providerSelectionId), { market, selection });
    }
  }
  return config.portfolios.map(portfolio => {
    const targetOdds = constraints.targets?.[portfolio.tier];
    if (!(targetOdds > 1)) throw new Error(`${oddsEvent.canonicalMatchId}/${portfolio.tier}: target MyCombo non valido`);
    const overlapKeys = new Set();
    const selectionIds = new Set();
    const legs = portfolio.legs.map(leg => {
      const resolved = selectionIndex.get(String(leg.providerSelectionId));
      if (!resolved) throw new Error(`${oddsEvent.canonicalMatchId}/${portfolio.tier}: quota Sisal mancante ${leg.providerSelectionId}`);
      const { market, selection } = resolved;
      if (selection.status !== "open" || !(selection.odds > 1 && selection.odds < maximum)) {
        throw new Error(`${oddsEvent.canonicalMatchId}/${portfolio.tier}: quota ${selection.odds} non inferiore a ${maximum}`);
      }
      if (!leg.overlapKey || overlapKeys.has(leg.overlapKey)) {
        throw new Error(`${oddsEvent.canonicalMatchId}/${portfolio.tier}: esito sovrapponibile ${leg.overlapKey || "senza chiave"}`);
      }
      if (selectionIds.has(String(selection.providerSelectionId))) {
        throw new Error(`${oddsEvent.canonicalMatchId}/${portfolio.tier}: selectionId duplicato ${selection.providerSelectionId}`);
      }
      overlapKeys.add(leg.overlapKey);
      selectionIds.add(String(selection.providerSelectionId));
      return {
        label: leg.label,
        market: market.marketName,
        variant: market.variantName,
        threshold: market.threshold,
        selection: selection.name,
        providerSelectionId: selection.providerSelectionId,
        odds: selection.odds,
        overlapKey: leg.overlapKey,
        marketScope: market.marketScope
      };
    });
    const odds = round(legs.reduce((product, leg) => product * leg.odds, 1), 2);
    const distancePct = round(Math.abs(odds - targetOdds) / targetOdds * 100, 1);
    if (distancePct > tolerance) {
      throw new Error(`${oddsEvent.canonicalMatchId}/${portfolio.tier}: quota ${odds} oltre la tolleranza del ${tolerance}% dal target ${targetOdds}`);
    }
    return {
      tier: portfolio.tier,
      risk: portfolio.tier === "Safe" ? "relativo inferiore" : portfolio.tier === "Balanced" ? "medio" : "elevato",
      targetOdds,
      odds,
      distancePct,
      legs,
      selection: legs.map(leg => leg.label).join(" + "),
      logic: portfolio.logic,
      probabilityStatus: "N/D: la quota combinata e il profilo di rischio non sono una probabilita congiunta indipendente."
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

function comboPortfolio(oddsEvent, matrices, dataCompleteness, config) {
  const configured = configuredComboPortfolio(oddsEvent, config);
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
  if (!market) throw new Error(`Mercato 1X2 principale assente: ${input.match.id}`);
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
  const dataCompleteness = clamp(0.52 + completedSections * 0.035 + (lineupsComplete ? 0.12 : 0) - (crossCompetition ? 0.08 : 0), 0.45, 0.86);
  const surprise = surpriseFactor({ final, market: market.probabilities, historical: parts.historical, dataCompleteness, crossCompetition });
  const confidenceResult = confidence(final, surprise, dataCompleteness);
  const orderedOutcomes = OUTCOMES.map((outcome, index) => ({ outcome, probability: final[index] })).sort((a, b) => b.probability - a.probability);
  const topTwo = new Set(orderedOutcomes.slice(0, 2).map(item => item.outcome));
  const doubleChance = topTwo.has("1") && topTwo.has("X") ? "1X" : topTwo.has("X") && topTwo.has("2") ? "X2" : "12";
  const matrices = sensitivityMatrices(expected, matrix, null);
  const evaluatedMarkets = marketEvaluation(input.oddsEvent, matrices, dataCompleteness);
  const valueCandidates = evaluatedMarkets.rows.filter(row => row.family === "1x2");
  const teamProjections = [
    teamProjection(input.homeTeam, input.homeProfile, input.awayProfile, input.homeSquad, input.homeDiscipline, input.homeVolume, input.awayVolume, "home", final[0], final[2], expected.home),
    teamProjection(input.awayTeam, input.awayProfile, input.homeProfile, input.awaySquad, input.awayDiscipline, input.awayVolume, input.homeVolume, "away", final[2], final[0], expected.away)
  ];
  const matchProjection = {
    shotsTotal: combineVolumeMetric(teamProjections[0].shotsTotal, teamProjections[1].shotsTotal),
    shotsOnTarget: combineVolumeMetric(teamProjections[0].shotsOnTarget, teamProjections[1].shotsOnTarget),
    corners: combineVolumeMetric(teamProjections[0].corners, teamProjections[1].corners),
    basis: "Somma delle medie squadra; intervallo p20-p80 del totale con varianze indipendenti."
  };
  const exact = exactScores(matrix, expected.total);
  const forecast = scoreForecast(matrix, final);
  return {
    matchId: input.match.id,
    generatedAt: input.generatedAt,
    status: "preliminary",
    engineVersion: ENGINE_VERSION,
    probabilities: {
      final: probabilityObject(final),
      marketNoMargin: probabilityObject(market.probabilities),
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
    likelyBooked: bookingCandidates(input.homeTeam, input.awayTeam, input.homeSquad, input.awaySquad, input.homeProfile, input.awayProfile),
    mvpCandidate: mvpCandidate(input.homeTeam, input.awayTeam, input.homeSquad, input.awaySquad, input.homeProfile, input.awayProfile, final, expected, input.mvpHistory, input.fantasyHistory, input.mvpSourceUrl),
    scenarios: matchScenarios(input, final, expected),
    marketComparison: evaluatedMarkets.rows,
    recommendations: evaluatedMarkets.selections,
    combinations: comboPortfolio(input.oddsEvent, matrices, dataCompleteness, input.myComboConfig),
    playerMarkets: evaluatedMarkets.playerMarkets,
    market: {
      provider: "Sisal",
      sourceUrl: input.oddsSourceUrl,
      retrievedAt: input.oddsRetrievedAt,
      overroundPct: market.overroundPct,
      selections: market.selections,
      valueCandidates,
      role: "Confronto esterno: le quote non entrano nei gol attesi ne nelle probabilita del modello."
    },
    dataQuality: {
      completenessPct: Math.round(dataCompleteness * 100),
      crossCompetitionBaseline: crossCompetition,
      updatedAt: String(input.generatedAt || "").slice(0, 10),
      probableLineups: lineupsComplete ? "20/20 titolari proiettati; fonte editoriale da riconfermare" : "N/D",
      missing: [
        "forma ufficiale 2026/27",
        ...(input.reading?.sections?.availability?.content ? [] : ["indisponibili verificati"]),
        ...(input.reading?.sections?.referee?.content ? [] : ["designazione arbitrale"]),
        "meteo attendibile alla data della gara",
        ...(evaluatedMarkets.playerMarkets.status === "available" ? [] : ["quote giocatore verificate"])
      ]
    }
  };
}

module.exports = { ENGINE_VERSION, OUTCOMES, WEIGHTS, MVP_WEIGHTS, attackChannels, findMainOneXTwo, marketProbabilities, predictMatch };
