"use strict";

const ENGINE_VERSION = "2.0.0";
const OUTCOMES = ["1", "X", "2"];
const WEIGHTS = Object.freeze({ market: 0.35, historical: 0.3, tactical: 0.25, objectives: 0.1 });

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

function expectedGoals({ homeVenue, awayVenue, homeProfile, awayProfile, leagueSummary, oddsEvent }) {
  const leagueHome = leagueSummary?.homeGoalsPerMatch || 1.28;
  const leagueAway = leagueSummary?.awayGoalsPerMatch || 1.15;
  const homeStyle = profileGoals(homeProfile, leagueHome, leagueAway);
  const awayStyle = profileGoals(awayProfile, leagueAway, leagueHome);
  const homeAttack = homeVenue ? homeVenue.goalsFor / homeVenue.played : homeStyle.for;
  const homeDefence = homeVenue ? homeVenue.goalsAgainst / homeVenue.played : homeStyle.against;
  const awayAttack = awayVenue ? awayVenue.goalsFor / awayVenue.played : awayStyle.for;
  const awayDefence = awayVenue ? awayVenue.goalsAgainst / awayVenue.played : awayStyle.against;
  let home = clamp(((homeAttack * 0.38) + (awayDefence * 0.27) + (homeStyle.for * 0.25) + (leagueHome * 0.1)) * matchupMultiplier(homeProfile, awayProfile), 0.3, 3.4);
  let away = clamp(((awayAttack * 0.38) + (homeDefence * 0.27) + (awayStyle.for * 0.25) + (leagueAway * 0.1)) * matchupMultiplier(awayProfile, homeProfile), 0.25, 3.2);
  const modelTotal = home + away;
  const marketTotal = marketGoalExpectation(findOverUnder25(oddsEvent));
  const blendedTotal = marketTotal ? modelTotal * 0.75 + marketTotal * 0.25 : modelTotal;
  home *= blendedTotal / modelTotal;
  away *= blendedTotal / modelTotal;
  return { home: round(home, 2), away: round(away, 2), modelTotal: round(modelTotal, 2), marketTotal, blendedTotal: round(blendedTotal, 2) };
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
  return softmaxOutcome(score(homeProfile) * matchupMultiplier(homeProfile, awayProfile) + 1.3, score(awayProfile) * matchupMultiplier(awayProfile, homeProfile), 0.35);
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

function teamProjection(team, profile, opponentProfile, squad, outcomeProbability, opponentProbability, expectedGoal) {
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
  return {
    teamId: team.id,
    attackChannels: channels,
    shotsTotal: rangeMetric(shots, 2.1, 4),
    shotsOnTarget: rangeMetric(shotsOnTarget, 1.15, 1),
    corners: rangeMetric(corners, 1.35, 1),
    expectedGoals: expectedGoal,
    basis: "Profilo tiri 2025/26, possesso, canali offensivi, vulnerabilita avversarie e scenario partita."
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
  const teamProjections = [
    teamProjection(input.homeTeam, input.homeProfile, input.awayProfile, input.homeSquad, final[0], final[2], expected.home),
    teamProjection(input.awayTeam, input.awayProfile, input.homeProfile, input.awaySquad, final[2], final[0], expected.away)
  ];
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
    exactScores: exactScores(finalScoreMatrix, expected.blendedTotal),
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

module.exports = { ENGINE_VERSION, OUTCOMES, WEIGHTS, attackChannels, findMainOneXTwo, marketProbabilities, predictMatch };
