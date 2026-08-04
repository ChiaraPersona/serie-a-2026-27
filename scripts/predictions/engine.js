"use strict";

const ENGINE_VERSION = "4.2.0";
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
  return type === "for" ? raw * 0.62 : raw * 1.18;
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

function expectedGoals({ homeVenue, awayVenue, homeProfile, awayProfile, homeRecent, awayRecent, homeTeam, awayTeam, homeSquad, awaySquad, homeObjective, awayObjective, headToHead, leagueSummary }) {
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
  let home = leagueHome * homeAttackStrength * awayDefenceWeakness * matchupMultiplier(homeProfile, awayProfile) * homeShotFactor * homeLineup.attack * awayLineup.defenceWeakness * objectiveFactors.home * headToHeadFactors.home;
  let away = leagueAway * awayAttackStrength * homeDefenceWeakness * matchupMultiplier(awayProfile, homeProfile) * awayShotFactor * awayLineup.attack * homeLineup.defenceWeakness * objectiveFactors.away * headToHeadFactors.away;
  home = clamp(home, 0.28, 3.5);
  away = clamp(away, 0.24, 3.3);
  return {
    home: round(home, 2),
    away: round(away, 2),
    total: round(home + away, 2),
    method: "Forze relative attacco/difesa, forma recente corretta per avversario, matchup, probabili XI, obiettivi e correttivo H2H limitato; quote escluse.",
    components: {
      home: { attackStrength: round(homeAttackStrength, 3), defenceWeakness: round(homeDefenceWeakness, 3), lineup: homeLineup },
      away: { attackStrength: round(awayAttackStrength, 3), defenceWeakness: round(awayDefenceWeakness, 3), lineup: awayLineup },
      objectiveFactors: { home: round(objectiveFactors.home, 3), away: round(objectiveFactors.away, 3) },
      headToHead: headToHeadFactors
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

function disciplineBaseline(profile, disciplineProfile) {
  const rows = disciplineProfile?.rows || [];
  const appearances = sum(rows.map(row => row.appearances || 0));
  const fouls = appearances
    ? sum(rows.map(row => (row.foulsAwardedAgainstPerAppearance || 0) * (row.appearances || 0))) / appearances
    : null;
  const yellowCards = profile?.modelInputs?.numeric?.yellowCardsPerGame ?? null;
  return { fouls, yellowCards };
}

function teamProjection(team, profile, opponentProfile, squad, disciplineProfile, outcomeProbability, opponentProbability, expectedGoal) {
  const players = lineupPlayers(team, squad);
  const channels = attackChannels(profile);
  const matchup = matchupMultiplier(profile, opponentProfile);
  const possession = profile?.summary?.possessionPct ?? 50;
  const baseShots = profile?.summary?.shotsPerGame ?? 10.5;
  const gameState = clamp(1 + (opponentProbability - outcomeProbability) * 0.16, 0.9, 1.1);
  const shots = clamp(baseShots * matchup * gameState * (0.94 + possession / 850), 6, 22);
  const shotsOnTarget = clamp(shots * shotAccuracy(players), 1.5, 9);
  const wideShare = (channels.left + channels.right) / 100;
  const corners = clamp(1.7 + shots * 0.19 + wideShare * 1.15 + ((profile?.playingStyle || []).some(item => item.id === "tentano-spesso-il-cross") ? 0.55 : 0), 2, 9.5);
  const discipline = disciplineBaseline(profile, disciplineProfile);
  return {
    teamId: team.id,
    attackChannels: channels,
    shotsTotal: rangeMetric(shots, 2.1, 4),
    shotsOnTarget: rangeMetric(shotsOnTarget, 1.15, 1),
    corners: rangeMetric(corners, 1.35, 1),
    fouls: discipline.fouls == null ? null : rangeMetric(discipline.fouls, 2.4, 3),
    cards: discipline.yellowCards == null ? null : rangeMetric(discipline.yellowCards, 0.85, 0),
    expectedGoals: expectedGoal,
    basis: "Profili 2025/26, rendimento casa/trasferta, possesso, canali offensivi, vulnerabilita avversarie e disciplina storica."
  };
}

function mvpCandidate(homeTeam, awayTeam, homeSquad, awaySquad, homeProfile, awayProfile, final, expected) {
  const candidates = [
    ...lineupPlayers(homeTeam, homeSquad).map(candidate => ({ ...candidate, teamProbability: final[0], expectedGoals: expected.home, profile: homeProfile })),
    ...lineupPlayers(awayTeam, awaySquad).map(candidate => ({ ...candidate, teamProbability: final[2], expectedGoals: expected.away, profile: awayProfile }))
  ].filter(candidate => candidate.role !== "Portiere").map(candidate => {
    const per90 = candidate.player?.previousSeason?.totals?.per90 || {};
    const minutes = candidate.player?.previousSeason?.totals?.minutes || 0;
    const normalized = cleanName(candidate.name);
    const leaderRating = candidate.profile?.leaders?.rating?.find(item => cleanName(item.player).endsWith(normalized) || normalized.endsWith(cleanName(item.player).split(" ").at(-1)))?.value || 0;
    const production = (per90.goals ?? 0.08) * 5 + (per90.assists ?? 0.06) * 3 + (per90.shotsOnTarget ?? 0.35) * 0.8;
    const roleBoost = candidate.role === "Attaccante" ? 0.75 : candidate.role === "Centrocampista" ? 0.4 : 0.12;
    const score = production + roleBoost + candidate.teamProbability * 1.8 + candidate.expectedGoals * 0.45 + Math.max(0, leaderRating - 6.4) * 1.2 + clamp(minutes / 2200, 0, 1) * 0.25;
    return { ...candidate, score, per90 };
  }).sort((a, b) => b.score - a.score);
  const best = candidates[0];
  const evidence = [];
  if (best.per90.goals != null) evidence.push(`${round(best.per90.goals, 2)} gol/90`);
  if (best.per90.assists != null) evidence.push(`${round(best.per90.assists, 2)} assist/90`);
  if (best.per90.shotsOnTarget != null) evidence.push(`${round(best.per90.shotsOnTarget, 2)} tiri in porta/90`);
  evidence.push(`produzione attesa squadra ${round(best.expectedGoals, 2)} gol`);
  return { name: best.name, teamId: best.teamId, role: best.role, evidence, confidence: best.player ? "moderata" : "prudente" };
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
  return {
    rows: available,
    selections: { primary, secondary, avoid, pricingErrors },
    playerMarkets: { status: "N/D", reason: "Nessuna quota giocatore verificata nello snapshot; titolarita e minutaggio restano proiezioni editoriali." }
  };
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

function comboPortfolio(oddsEvent, matrices, dataCompleteness) {
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
    teamProjection(input.homeTeam, input.homeProfile, input.awayProfile, input.homeSquad, input.homeDiscipline, final[0], final[2], expected.home),
    teamProjection(input.awayTeam, input.awayProfile, input.homeProfile, input.awaySquad, input.awayDiscipline, final[2], final[0], expected.away)
  ];
  const exact = exactScores(matrix, expected.total);
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
    scoreProfile: scoreProfile(matrix, exact),
    verdict: {
      outcome: orderedOutcomes[0].outcome,
      doubleChance,
      label: orderedOutcomes[0].probability >= 0.5 ? `Prevalenza ${orderedOutcomes[0].outcome}` : `Equilibrio con lieve prevalenza ${orderedOutcomes[0].outcome}`
    },
    confidence: confidenceResult,
    surprise,
    teamProjections,
    likelyBooked: bookingCandidates(input.homeTeam, input.awayTeam, input.homeSquad, input.awaySquad, input.homeProfile, input.awayProfile),
    mvpCandidate: mvpCandidate(input.homeTeam, input.awayTeam, input.homeSquad, input.awaySquad, input.homeProfile, input.awayProfile, final, expected),
    scenarios: matchScenarios(input, final, expected),
    marketComparison: evaluatedMarkets.rows,
    recommendations: evaluatedMarkets.selections,
    combinations: comboPortfolio(input.oddsEvent, matrices, dataCompleteness),
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
        "quote giocatore verificate"
      ]
    }
  };
}

module.exports = { ENGINE_VERSION, OUTCOMES, WEIGHTS, attackChannels, findMainOneXTwo, marketProbabilities, predictMatch };
