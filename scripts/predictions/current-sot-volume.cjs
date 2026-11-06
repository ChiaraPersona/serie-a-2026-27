'use strict';

const { selectCompletedMatches } = require('./future-readiness');
const mean = a => a.reduce((s, x) => s + x, 0) / a.length;
const quantile = (a, q) => {
  const b = [...a].sort((x, y) => x - y), i = (b.length - 1) * q;
  return b[Math.floor(i)] + (b[Math.ceil(i)] - b[Math.floor(i)]) * (i % 1);
};
function summarize(values) {
  const average = mean(values);
  return { matches: values.length, mean: average, sd: Math.sqrt(mean(values.map(x => (x - average) ** 2))), p20: quantile(values, .2), p80: quantile(values, .8) };
}
function blend(prior, current, equivalentMatches) {
  if (!current?.matches) return prior;
  const w = current.matches / (current.matches + equivalentMatches);
  const average = prior.mean * (1 - w) + current.mean * w;
  return {
    matches: current.matches, mean: average,
    sd: Math.sqrt((1 - w) * (prior.sd ** 2 + (prior.mean - average) ** 2) + w * (current.sd ** 2 + (current.mean - average) ** 2)),
    p20: prior.p20 * (1 - w) + current.p20 * w,
    p80: prior.p80 * (1 - w) + current.p80 * w,
    currentWeight: w, priorEquivalentMatches: equivalentMatches,
    historicalMean: prior.mean, currentMean: current.mean
  };
}

// Applies only to the SOT base. Historical inputs are never mutated or equated
// across competitions. Current overall observations retain partial pooling;
// historical venue effects and match context remain separate.
function currentSotVolume({ matches, historicalProfiles, teamId, targetMatch }) {
  const historical = historicalProfiles.find(p => p.teamId === teamId);
  const completed = selectCompletedMatches(matches, { competition: 'serie-a', season: targetMatch.season, teamId, asOfMatchday: targetMatch.matchday, asOfDate: targetMatch.date, excludeMatchId: targetMatch.id });
  const rows = completed.map(m => {
    const side = m.homeTeam === teamId ? 'home' : 'away', other = side === 'home' ? 'away' : 'home';
    return { matchId: m.id, own: m.teamStats?.[side]?.shotsOnTarget, against: m.teamStats?.[other]?.shotsOnTarget };
  });
  const own = rows.map(r => r.own).filter(Number.isFinite);
  const against = rows.map(r => r.against).filter(Number.isFinite);
  if (!own.length && !against.length) return historical;
  const leagueValues = historicalProfiles.flatMap(p => p.venues?.overall?.shotsOnTarget?.for?.values || []);
  // A real observed league distribution, rather than a fabricated team history.
  if (!leagueValues.length) throw new Error('SOT: prior di lega osservata mancante');
  const leaguePrior = summarize(leagueValues);
  const result = structuredClone(historical || { teamId, venues: {}, recent: {} });
  result.venues ||= {};
  result.recent ||= {};
  for (const venue of ['overall', 'home', 'away']) {
    result.venues[venue] ||= {};
    const previous = historical?.venues?.[venue]?.shotsOnTarget;
    result.venues[venue].shotsOnTarget = {};
    for (const [field, values] of [['for', own], ['against', against]]) {
      const observedPrior = previous?.[field];
      const validPrior = Number.isFinite(observedPrior?.mean) && Number.isFinite(observedPrior?.p20) && Number.isFinite(observedPrior?.p80) && Number.isFinite(observedPrior?.sd);
      const prior = validPrior ? observedPrior : leaguePrior;
      result.venues[venue].shotsOnTarget[field] = blend(prior, values.length ? summarize(values) : null, validPrior ? 12 : 4);
    }
  }
  const recent = rows.slice(-8);
  result.recent.shotsOnTarget = {};
  for (const [field, key] of [['for', 'own'], ['against', 'against']]) {
    const values = recent.map(r => r[key]).filter(Number.isFinite).reverse();
    if (!values.length) continue;
    const weights = values.map((_, i) => .82 ** i);
    result.recent.shotsOnTarget[field] = { ...summarize(values), weightedMean: values.reduce((s, x, i) => s + x * weights[i], 0) / weights.reduce((s, x) => s + x, 0) };
  }
  result.currentSotBaseline = { version: 1, currentIncluded: own.length > 0, season: targetMatch.season, matchdayExclusive: targetMatch.matchday, excludedMatchId: targetMatch.id, matchIds: rows.map(r => r.matchId), ownMatches: own.length, againstMatches: against.length, priorEquivalentMatches: historical ? 12 : 4, currentVenuePooling: 'overall-current-with-historical-venue-prior', residualOwnSotAdjustment: false };
  result.sotContextHistoricalMeans = Object.fromEntries(['home', 'away'].map(venue => [venue, historical?.venues?.[venue]?.shotsOnTarget?.for?.mean ?? null]));
  return result;
}

module.exports = { currentSotVolume };
