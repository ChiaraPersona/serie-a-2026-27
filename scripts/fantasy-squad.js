(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.FantasySquad = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const roleLimits = { P: 3, D: 8, C: 8, A: 6 };
  const roleLabels = { P: "Portieri", D: "Difensori", C: "Centrocampisti", A: "Attaccanti" };
  const strategies = {
    prudent: { label: "Prudente", quality: .4, reliability: .32, value: .1, calendar: .18 },
    balanced: { label: "Bilanciata", quality: .4, reliability: .16, value: .22, calendar: .22 },
    upside: { label: "Potenziale", quality: .5, reliability: .08, value: .3, calendar: .12 }
  };

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const number = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
  const roleBudgetShares = { P: .07, D: .17, C: .23, A: .53 };

  function normalizeState(state, players, budget = 500) {
    const available = new Map(players.map(player => [player.id, player]));
    const entries = [];
    for (const raw of Array.isArray(state?.entries) ? state.entries : []) {
      if (!available.has(raw.playerId) || entries.some(entry => entry.playerId === raw.playerId)) continue;
      const player = available.get(raw.playerId);
      if (entries.filter(entry => available.get(entry.playerId)?.role === player.role).length >= roleLimits[player.role]) continue;
      entries.push({ playerId: raw.playerId, main: Boolean(raw.main), price: Math.max(0, Math.round(number(raw.price))) });
    }
    return { version: 1, budget: clamp(Math.round(number(state?.budget, budget)), 100, 2000), entries };
  }

  function summarize(state, players) {
    const byId = new Map(players.map(player => [player.id, player]));
    const counts = { P: 0, D: 0, C: 0, A: 0 };
    let spent = 0;
    let mains = 0;
    const entries = state.entries.flatMap(entry => {
      const player = byId.get(entry.playerId);
      if (!player) return [];
      counts[player.role] += 1;
      spent += number(entry.price);
      if (entry.main) mains += 1;
      return [{ ...entry, player }];
    });
    return {
      entries,
      counts,
      missing: Object.fromEntries(Object.keys(roleLimits).map(role => [role, Math.max(0, roleLimits[role] - counts[role])])),
      total: entries.length,
      mains,
      spent,
      remaining: state.budget - spent,
      overBudget: spent > state.budget
    };
  }

  function reliabilityScore(player) {
    return player.reliability === "Alta" ? 100 : player.reliability === "Media" ? 68 : 35;
  }

  function targetPrice(player, budget) {
    const independentValue = Number.isFinite(Number(player.quotations?.fvm)) ? Number(player.quotations.fvm) : number(player.value500, 1);
    return Math.max(1, Math.round(independentValue * budget / 500));
  }

  function calendarScore(player, data, mains) {
    const team = data.teams.find(item => item.id === player.teamId);
    const fixtures = team?.calendar?.fixtures?.slice(0, 8) || [];
    if (!fixtures.length) return 50;
    const opening = fixtures.reduce((sum, fixture) => sum + number(fixture.ease, 50), 0) / fixtures.length;
    const sameRoleMains = mains.filter(item => item.player.role === player.role);
    if (!sameRoleMains.length) return clamp(opening, 0, 100);
    let opportunities = 0;
    let covered = 0;
    for (const main of sameRoleMains) {
      const mainTeam = data.teams.find(item => item.id === main.player.teamId);
      const mainFixtures = mainTeam?.calendar?.fixtures?.slice(0, 8) || [];
      fixtures.forEach((fixture, index) => {
        if (number(mainFixtures[index]?.ease, 50) < 48) {
          opportunities += 1;
          if (number(fixture.ease, 50) >= 48) covered += 1;
        }
      });
    }
    const complement = opportunities ? covered / opportunities * 100 : 55;
    return clamp(opening * .55 + complement * .45, 0, 100);
  }

  function recommendationScore(player, data, state, strategyId) {
    const strategy = strategies[strategyId] || strategies.balanced;
    const summary = summarize(state, data.players);
    const mains = summary.entries.filter(entry => entry.main);
    const price = targetPrice(player, state.budget);
    const roleReference = Math.max(1, state.budget * roleBudgetShares[player.role] / roleLimits[player.role]);
    const value = clamp((player.score / Math.max(price, 1)) * roleReference, 0, 100);
    const calendar = calendarScore(player, data, mains);
    const teamDuplication = summary.entries.filter(entry => entry.player.teamId === player.teamId).length;
    const diversityPenalty = teamDuplication * 4;
    const score = player.score * strategy.quality + reliabilityScore(player) * strategy.reliability + value * strategy.value + calendar * strategy.calendar - diversityPenalty;
    return { score: Math.round(clamp(score, 0, 100) * 10) / 10, price, calendar: Math.round(calendar), value: Math.round(value) };
  }

  function recommendations(data, state, strategyId = "balanced", limitPerRole = 3) {
    const summary = summarize(state, data.players);
    const selected = new Set(summary.entries.map(entry => entry.playerId));
    const missingTotal = Object.values(summary.missing).reduce((sum, value) => sum + value, 0);
    const affordableAverage = missingTotal ? Math.max(1, summary.remaining / missingTotal) : 0;
    const roles = {};
    for (const role of Object.keys(roleLimits)) {
      if (!summary.missing[role]) { roles[role] = []; continue; }
      roles[role] = data.players
        .filter(player => player.role === role && !selected.has(player.id))
        .map(player => ({ player, ...recommendationScore(player, data, state, strategyId) }))
        .filter(item => summary.remaining > 0 && (item.price <= Math.max(affordableAverage * 2.4, state.budget * roleBudgetShares[role] / Math.max(1, summary.missing[role])) || item.player.score >= 72))
        .sort((a, b) => b.score - a.score || a.price - b.price || b.player.score - a.player.score)
        .slice(0, limitPerRole);
    }
    return { strategy: strategies[strategyId] || strategies.balanced, roles, summary };
  }

  return { roleLimits, roleLabels, strategies, normalizeState, summarize, targetPrice, calendarScore, recommendationScore, recommendations };
});
