'use strict';
const { selectCompletedMatches } = require('./future-readiness');
const { summarize, blend } = require('./current-sot-volume.cjs');
const mean = a => a.reduce((s, x) => s + x, 0) / a.length;

function currentGoalInputs({ matches, historicalMatches, teamId, targetMatch, profile, historicalXg, xgLeagueSummary }) {
  const completed = selectCompletedMatches(matches, { competition: 'serie-a', season: targetMatch.season, teamId, asOfMatchday: targetMatch.matchday, asOfDate: targetMatch.date, excludeMatchId: targetMatch.id });
  if (!completed.length) return { profile, xg: historicalXg, venueRates: null, diagnostics: null };
  const rows = completed.map(m => {
    const side = m.homeTeam === teamId ? 'home' : 'away', other = side === 'home' ? 'away' : 'home';
    return { matchId: m.id, venue: side, for: m.score[side], against: m.score[other], xgFor: m.teamStats?.[side]?.expectedGoals, xgAgainst: m.teamStats?.[other]?.expectedGoals };
  });
  const historicalRows = historicalMatches.flatMap(m => {
    const side = m.homeTeam.slug === teamId ? 'home' : m.awayTeam.slug === teamId ? 'away' : null;
    return side ? [{ venue: side, for: m.score[side], against: m.score[side === 'home' ? 'away' : 'home'] }] : [];
  });
  const goalRates = {};
  for (const venue of ['overall', 'home', 'away']) {
    const priorRows = historicalRows.filter(r => venue === 'overall' || r.venue === venue);
    const leagueRows = historicalMatches.flatMap(m => venue === 'overall' ? [m.score.home, m.score.away] : [m.score[venue]]);
    goalRates[venue] = {};
    for (const field of ['for', 'against']) {
      // League defence prior must use goals conceded in this venue, not scored.
      const league = field === 'against' && venue !== 'overall' ? historicalMatches.map(m => m.score[venue === 'home' ? 'away' : 'home']) : leagueRows;
      const prior = summarize(priorRows.length ? priorRows.map(r => r[field]) : league);
      const current = summarize(rows.map(r => r[field]));
      goalRates[venue][field] = blend(prior, current, priorRows.length ? 12 : 4);
    }
  }
  const diagnostics = { version: 1, season: targetMatch.season, matchdayExclusive: targetMatch.matchday, excludedMatchId: targetMatch.id, matchIds: rows.map(r => r.matchId), sampleSize: rows.length, comparableHistoricalMatches: historicalRows.length, priorEquivalentMatches: historicalRows.length ? 12 : 4, venuePooling: 'overall-current-with-historical-venue-prior', rates: goalRates };
  const updatedProfile = { ...profile, currentGoalRates: { for: goalRates.overall.for.mean, against: goalRates.overall.against.mean }, goalRatesOnTargetScale: true, currentGoalBaseline: diagnostics };
  const xg = { teamId, season: targetMatch.season, matches: rows.length, currentGoalBaseline: diagnostics, source: { role: 'internal-observed-current-xg-with-historical-prior' } };
  const coverage = { for: rows.filter(r => Number.isFinite(r.xgFor)).length, against: rows.filter(r => Number.isFinite(r.xgAgainst)).length };
  if (!coverage.for && !coverage.against) return { profile: updatedProfile, xg: historicalXg, venueRates: goalRates, diagnostics };
  for (const venue of ['overall', 'home', 'away']) {
    xg[venue] = { matches: rows.length };
    for (const field of ['for', 'against']) {
      const historical = historicalXg?.[venue]?.[field];
      const leagueHome = xgLeagueSummary.homeXgPerMatch, leagueAway = xgLeagueSummary.awayXgPerMatch;
      const league = venue === 'overall' ? (leagueHome + leagueAway) / 2 : field === 'for' ? venue === 'home' ? leagueHome : leagueAway : venue === 'home' ? leagueAway : leagueHome;
      const values = rows.map(r => r[field === 'for' ? 'xgFor' : 'xgAgainst']).filter(Number.isFinite);
      const k = Number.isFinite(historical) ? 12 : 4, prior = Number.isFinite(historical) ? historical : league;
      xg[venue][field] = values.length ? (prior * k + mean(values) * values.length) / (k + values.length) : prior;
    }
  }
  const recent = rows.slice(-8);
  xg.recent = { matches: recent.length };
  for (const field of ['for', 'against']) {
    const values = recent.map(r => r[field === 'for' ? 'xgFor' : 'xgAgainst']).filter(Number.isFinite).reverse();
    const weights = values.map((_, i) => .82 ** i);
    xg.recent[field] = values.length ? values.reduce((s, x, i) => s + x * weights[i], 0) / weights.reduce((s, x) => s + x, 0) : xg.overall[field];
  }
  xg.currentXgCoverage = coverage;
  return { profile: updatedProfile, xg, venueRates: goalRates, diagnostics };
}
module.exports = { currentGoalInputs };
