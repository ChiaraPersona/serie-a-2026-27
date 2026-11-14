"use strict";

function rotationHistory(matches, target, teamId) {
  const prior = matches.filter(match => match.competition === target.competition && match.season === target.season &&
    match.status === "finished" && match.date && target.date && match.date < target.date &&
    [match.homeTeam, match.awayTeam].includes(teamId))
    .sort((a, b) => b.date.localeCompare(a.date));
  const appearances = match => match.playerStats?.[match.homeTeam === teamId ? "home" : "away"] ?? [];
  const recentIds = new Set(prior.slice(0, 4).flatMap(match => appearances(match).filter(player => player.minutes > 0).map(player => player.playerId)));
  const starts = new Map(), swaps = new Map(), discipline = new Map();
  for (const match of prior) {
    const players = appearances(match);
    const starters = new Set(players.filter(player => player.playerId && player.starter === true && player.minutes > 0).map(player => player.playerId));
    if (match.resultCoverage?.substitutions === "complete" && Array.isArray(match.substitutions)) {
      for (const id of starters) starts.set(id, (starts.get(id) ?? 0) + 1);
      for (const swap of match.substitutions) {
        if (swap.team !== teamId || !starters.has(swap.playerOutId) || !swap.playerInId ||
          !Number.isFinite(swap.minute) || swap.minute <= 0 || swap.minute >= 90) continue;
        const choices = swaps.get(swap.playerOutId) ?? new Map();
        const events = choices.get(swap.playerInId) ?? [];
        if (events.some(event => event.matchId === match.id)) continue;
        events.push({ matchId: match.id, minute: swap.minute });
        choices.set(swap.playerInId, events);
        swaps.set(swap.playerOutId, choices);
      }
    }
    if (match.resultCoverage?.bookings !== "complete" || !Array.isArray(match.bookings) ||
      match.bookings.some(event => event.team === teamId && (!event.playerId || event.eventType === "unknown"))) continue;
    const yellows = new Set(match.bookings.filter(event => event.team === teamId && event.eventType === "yellow").map(event => event.playerId));
    for (const player of players.filter(player => player.playerId && player.minutes > 0)) {
      const sample = discipline.get(player.playerId) ?? { name: player.player, minutes: 0, yellows: 0, matchIds: [] };
      sample.minutes += player.minutes;
      sample.yellows += Number(yellows.has(player.playerId));
      sample.matchIds.push(match.id);
      discipline.set(player.playerId, sample);
    }
  }
  return { recentIds, starts, swaps, discipline };
}

function replacementBonus(candidate, startingIds, history, verifiedBench) {
  const choices = history.swaps.get(candidate.playerId);
  if (!choices) return { points: 0 };
  const available = verifiedBench ?? history.recentIds;
  const alternatives = [...choices].filter(([id, events]) => events.length >= 2 &&
    !startingIds.has(id) && available.has(id) && history.discipline.get(id)?.minutes >= 90)
    .sort((a, b) => b[1].length - a[1].length);
  if (!alternatives.length || alternatives[0][1].length === alternatives[1]?.[1].length) return { points: 0 };
  const [playerId, events] = alternatives[0];
  const sample = history.discipline.get(playerId);
  const minutes = 90 - events.reduce((sum, event) => sum + event.minute, 0) / events.length;
  const priorStarts = history.starts.get(candidate.playerId);
  const recurrence = events.length / (priorStarts + 2);
  const yellowRate = (sample.yellows * 90 + 0.18 * 450) / (sample.minutes + 450);
  return {
    playerId, name: sample.name, minutes, priorStarts, recurrence, yellowRate,
    availability: verifiedBench ? "VERIFIED_BENCH" : "RECENT_TEAM_APPEARANCE",
    swapMatchIds: events.map(event => event.matchId), cardMatchIds: sample.matchIds,
    points: 100 * recurrence * minutes / 90 * yellowRate
  };
}

module.exports = { rotationHistory, replacementBonus };
