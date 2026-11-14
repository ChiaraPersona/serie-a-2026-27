"use strict";

// Research only. Keep the formula aligned with backtest-uefa-1x2.js.
const finite = value => typeof value === "number" && Number.isFinite(value);
const round = value => value == null ? null : Number(value.toFixed(5));
function predict(home, away, p) {
  const gap = home - away + p.homeAdvantage;
  const share = 1 / (1 + 10 ** (-gap / 400));
  const draw = Math.max(0.12, Math.min(0.34, p.drawBase * Math.exp(-Math.abs(gap) / p.drawScale)));
  return { home: (1 - draw) * share, draw, away: (1 - draw) * (1 - share) };
}
function loss(probability, home, away) {
  const actual = home > away ? 0 : home === away ? 1 : 2;
  const values = [probability.home, probability.draw, probability.away];
  return { logLoss: -Math.log(Math.max(1e-12, values[actual])), brier: values.reduce((sum, v, i) => sum + (v - Number(i === actual)) ** 2, 0) };
}
function metrics(rows, key) {
  if (!rows.length) return null;
  return Object.fromEntries(["logLoss", "brier"].map(metric => [metric, round(rows.reduce((sum, row) => sum + row[key][metric], 0) / rows.length)]));
}
function replay({ model, fixtures, teamMap, asOf }) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(asOf) || model.historyThrough >= asOf || model.generatedAt > asOf) throw new Error("Invalid temporal cutoff");
  const ids = new Map(teamMap.teams.map(team => [team.team, String(team.uefaTeamId)]));
  if (ids.size !== 36 || teamMap.teams.some(team => !team.uefaTeamId)) throw new Error("Expected 36 canonical UEFA identities");
  const frozen = new Map(model.ratings.map(row => [String(row.teamId), row.rating]));
  const ratings = new Map(frozen);
  const matches = fixtures.filter(f => f.status === "finished" && f.date < asOf && f.date > model.historyThrough).sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  if (new Set(matches.map(f => f.id)).size !== matches.length) throw new Error("Duplicate fixture");
  const rows = [], counts = new Map();
  let activeSeason = null;
  for (let index = 0; index < matches.length;) {
    const date = matches[index].date, batch = [];
    while (index < matches.length && matches[index].date === date) batch.push(matches[index++]);
    const season = batch[0].season;
    if (!season || batch.some(f => f.season !== season)) throw new Error("Missing or mixed season");
    if (season !== activeSeason) {
      for (const [id, value] of ratings) ratings.set(id, 1500 + (value - 1500) * model.parameters.seasonRetention);
      activeSeason = season;
    }
    const pending = batch.map(f => {
      const homeId = ids.get(f.homeTeam), awayId = ids.get(f.awayTeam);
      if (!homeId || !awayId || !Number.isInteger(f.score?.home) || !Number.isInteger(f.score?.away) || f.score.home < 0 || f.score.away < 0) throw new Error(`Invalid fixture ${f.id}`);
      const home = ratings.get(homeId) ?? 1500, away = ratings.get(awayId) ?? 1500;
      const probability = predict(home, away, model.parameters);
      const baseline = predict(frozen.get(homeId) ?? 1500, frozen.get(awayId) ?? 1500, model.parameters);
      return { f, homeId, awayId, home, away, probability, baseline };
    });
    for (const { f, homeId, awayId, home, away, probability, baseline } of pending) {
      rows.push({ fixtureId: f.id, date, homeTeam: f.homeTeam, awayTeam: f.awayTeam, score: f.score, preMatchRatings: { home, away }, updatedProbabilities: probability, frozenProbabilities: baseline, updated: loss(probability, f.score.home, f.score.away), frozen: loss(baseline, f.score.home, f.score.away) });
      const actual = f.score.home > f.score.away ? 1 : f.score.home === f.score.away ? 0.5 : 0;
      const delta = model.parameters.kFactor * model.parameters.competitionUpdateWeights.ucl * (actual - probability.home - 0.5 * probability.draw);
      ratings.set(homeId, (ratings.get(homeId) ?? home) + delta);
      ratings.set(awayId, (ratings.get(awayId) ?? away) - delta);
      for (const id of [homeId, awayId]) counts.set(id, (counts.get(id) || 0) + 1);
    }
  }
  return { ratings, frozen, counts, rows, metrics: { matches: rows.length, frozen: metrics(rows, "frozen"), updated: metrics(rows, "updated") } };
}
function domesticForm({ team, pilot, model, frozen, teamMap, asOf, opponentResolver = null }) {
  if (team.baselineKind !== "domestic") return { status: "no_domestic_baseline", matches: 0, adjustedPointsPerMatchResidual: null };
  const identity = new Map(pilot.teams.filter(t => t.espnTeamId).map(t => [String(t.espnTeamId), t]));
  const canonical = new Map(pilot.teams.map(t => [t.id, t]));
  const resolve = (side, match) => side.canonicalTeamId ? canonical.get(side.canonicalTeamId) : match.source?.provider === "ESPN" ? identity.get(String(side.providerTeamId)) : null;
  const uefa = new Map(teamMap.teams.map(t => [t.team, String(t.uefaTeamId)]));
  const seen = new Set();
  const observations = pilot.matches.filter(m => m.season === "2026-27" && m.league === team.league && m.date < asOf && m.date > model.historyThrough && [m.home, m.away].some(s => resolve(s, m)?.id === team.id) && finite(m.home.score) && finite(m.away.score)).sort((a, b) => b.date.localeCompare(a.date) || String(a.eventId).localeCompare(String(b.eventId))).filter(m => {
    const key = `${m.source?.provider}:${m.league}:${m.eventId}`;
    if (seen.has(key)) return false;
    seen.add(key); return true;
  }).slice(0, 8).map(m => {
    const home = resolve(m.home, m)?.id === team.id;
    const own = home ? m.home : m.away, opponent = home ? m.away : m.home;
    const opponentTeam = resolve(opponent, m);
    const ownRating = frozen.get(uefa.get(team.name));
    const expandedIdentity = opponentResolver?.({ provider: m.source?.provider, providerTeamId: opponent.providerTeamId, canonicalTeamId: opponent.canonicalTeamId });
    const opponentUefaId = expandedIdentity?.uefaTeamId || (opponentTeam?.league === team.league ? uefa.get(opponentTeam.name) : null);
    const opponentRating = opponentUefaId ? frozen.get(String(opponentUefaId)) : null;
    const probability = finite(ownRating) && finite(opponentRating) ? predict(home ? ownRating : opponentRating, home ? opponentRating : ownRating, model.parameters) : null;
    const points = own.score > opponent.score ? 3 : own.score === opponent.score ? 1 : 0;
    const expectedPoints = probability ? 3 * (home ? probability.home : probability.away) + probability.draw : null;
    const shotDiff = finite(own.statistics?.totalShots) && finite(opponent.statistics?.totalShots) ? own.statistics.totalShots - opponent.statistics.totalShots : null;
    return { eventId: m.eventId, date: m.date, opponentProviderId: opponent.providerTeamId, opponentUefaId: opponentUefaId ?? null, opponentIdentityMethod: expandedIdentity?.method ?? (opponentUefaId ? "CANONICAL_CHAMPIONS_SEED" : null), venue: home ? "home" : "away", points, opponentFrozenElo: opponentRating ?? null, expectedPoints, residual: expectedPoints == null ? null : points - expectedPoints, shotDifference: shotDiff, source: m.source };
  });
  const mean = (rows, key) => rows.length ? round(rows.reduce((sum, r) => sum + r[key], 0) / rows.length) : null;
  const covered = observations.filter(r => r.residual != null), shots = observations.filter(r => r.shotDifference != null);
  return { status: observations.length ? "partial_diagnostic" : "no_current_observations", matches: observations.length, through: observations[0]?.date ?? null, pointsPerMatch: mean(observations, "points"), directOpponentCoverage: covered.length, ratedOpponentObservations: observations.filter(r => finite(r.opponentFrozenElo)).length, adjustedPointsPerMatchResidual: covered.length === observations.length && covered.length ? mean(covered, "residual") : null, coveredSubsetResidual: mean(covered, "residual"), meanShotDifference: mean(shots, "shotDifference"), shotMatches: shots.length, xg: null, observations };
}
module.exports = { predict, loss, replay, domesticForm, round };
