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

// Historical inputs are never mutated or equated
// across competitions. Current overall observations retain partial pooling;
// historical venue effects and match context remain separate.
function currentTeamVolume({ matches, historicalProfiles, teamId, targetMatch, metrics = ['totalShots', 'shotsOnTarget', 'wonCorners', 'fouls', 'yellowCards'] }) {
  const historical = historicalProfiles.find(p => p.teamId === teamId);
  const completed = selectCompletedMatches(matches, { competition: 'serie-a', season: targetMatch.season, teamId, asOfMatchday: targetMatch.matchday, asOfDate: targetMatch.date, excludeMatchId: targetMatch.id });
  const rows = completed.map(m => {
    const side = m.homeTeam === teamId ? 'home' : 'away', other = side === 'home' ? 'away' : 'home';
    const keys = { totalShots: 'shots', shotsOnTarget: 'shotsOnTarget', wonCorners: 'corners', fouls: 'fouls', yellowCards: 'yellowCards' };
    return { matchId: m.id, venue: side, metrics: Object.fromEntries(metrics.map(metric => [metric, { own: m.teamStats?.[side]?.[keys[metric]], against: m.teamStats?.[other]?.[keys[metric]] }])) };
  });
  if (!rows.length) return historical;
  const result = structuredClone(historical || { teamId, venues: {}, recent: {} });
  result.venues ||= {};
  result.recent ||= {};
  result.currentVolumeBaseline = {};
  for (const metric of metrics) {
  const own = rows.map(r => r.metrics[metric].own).filter(Number.isFinite);
  const against = rows.map(r => r.metrics[metric].against).filter(Number.isFinite);
  if (!own.length && !against.length) continue;
  const leagueValues = historicalProfiles.flatMap(p => p.venues?.overall?.[metric]?.for?.values || []);
  // A real observed league distribution, rather than a fabricated team history.
  if (!leagueValues.length) throw new Error(`${metric}: prior di lega osservata mancante`);
  const leaguePrior = summarize(leagueValues);
  for (const venue of ['overall', 'home', 'away']) {
    result.venues[venue] ||= {};
    const previous = historical?.venues?.[venue]?.[metric];
    result.venues[venue][metric] = {};
    for (const [field, values] of [['for', own], ['against', against]]) {
      const observedPrior = previous?.[field];
      const validPrior = Number.isFinite(observedPrior?.mean) && Number.isFinite(observedPrior?.p20) && Number.isFinite(observedPrior?.p80) && Number.isFinite(observedPrior?.sd);
      const prior = validPrior ? observedPrior : leaguePrior;
      const venueSpecific = ['wonCorners', 'yellowCards'].includes(metric) && venue !== 'overall';
      const venueValues = venueSpecific ? rows.filter(r => r.venue === venue).map(r => r.metrics[metric][field === 'for' ? 'own' : 'against']).filter(Number.isFinite) : values;
      result.venues[venue][metric][field] = blend(prior, venueValues.length ? summarize(venueValues) : null, validPrior ? 12 : 4);
    }
  }
  const recent = rows.slice(-8);
  result.recent[metric] = {};
  for (const [field, key] of [['for', 'own'], ['against', 'against']]) {
    const values = recent.map(r => r.metrics[metric][key]).filter(Number.isFinite).reverse();
    if (!values.length) continue;
    const weights = values.map((_, i) => .82 ** i);
    const recentStats = { ...summarize(values), weightedMean: values.reduce((s, x, i) => s + x * weights[i], 0) / weights.reduce((s, x) => s + x, 0) };
    if (['wonCorners', 'yellowCards'].includes(metric)) {
      const historicalPrior = historical?.venues?.overall?.[metric]?.[field];
      const prior = Number.isFinite(historicalPrior?.mean) ? historicalPrior : leaguePrior;
      const regularized = blend(prior, { ...recentStats, mean: recentStats.weightedMean }, historicalPrior ? 12 : 4);
      result.recent[metric][field] = { ...regularized, weightedMean: regularized.mean, rawWeightedMean: recentStats.weightedMean };
    } else result.recent[metric][field] = recentStats;
  }
  result.currentVolumeBaseline[metric] = { version: 1, currentIncluded: own.length > 0, season: targetMatch.season, matchdayExclusive: targetMatch.matchday, excludedMatchId: targetMatch.id, matchIds: rows.filter(r => Number.isFinite(r.metrics[metric].own) || Number.isFinite(r.metrics[metric].against)).map(r => r.matchId), ownMatches: own.length, againstMatches: against.length, priorEquivalentMatches: historical ? 12 : 4, currentVenuePooling: ['wonCorners', 'yellowCards'].includes(metric) ? 'venue-current-with-historical-venue-prior-and-regularized-recent' : 'overall-current-with-historical-venue-prior', residualOwnAdjustment: false };
  }
  if (!Object.keys(result.currentVolumeBaseline).length) return historical;
  result.currentSotBaseline = result.currentVolumeBaseline.shotsOnTarget;
  result.sotContextHistoricalMeans = Object.fromEntries(['home', 'away'].map(venue => [venue, historical?.venues?.[venue]?.shotsOnTarget?.for?.mean ?? null]));
  result.shotContextHistoricalMeans = Object.fromEntries(['home', 'away'].map(venue => [venue, historical?.venues?.[venue]?.totalShots?.for?.mean ?? null]));
  return result;
}

function currentSotVolume(input) { return currentTeamVolume({ ...input, metrics: ['shotsOnTarget'] }); }

function withDisciplineHistory(profiles, historicalMatches) {
  const result = structuredClone(profiles);
  for (const profile of result) for (const venue of ['overall', 'home', 'away']) {
    for (const metric of ['fouls', 'yellowCards']) {
      const values = { for: [], against: [] };
      for (const match of historicalMatches) {
        const side = match.homeTeam.slug === profile.teamId ? 'home' : match.awayTeam.slug === profile.teamId ? 'away' : null;
        if (!side || venue !== 'overall' && side !== venue) continue;
        const other = side === 'home' ? 'away' : 'home';
        for (const [field, seat] of [['for', side], ['against', other]]) {
          const value = match.teamStats?.[seat]?.[metric];
          if (Number.isFinite(value)) values[field].push(value);
        }
      }
      profile.venues[venue][metric] = Object.fromEntries(Object.entries(values).filter(([, v]) => v.length).map(([field, v]) => [field, { ...summarize(v), values: v }]));
    }
  }
  return result;
}

module.exports = { currentSotVolume, currentTeamVolume, withDisciplineHistory, summarize, blend };
