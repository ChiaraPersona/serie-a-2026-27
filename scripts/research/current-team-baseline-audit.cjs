'use strict';
// Isolated temporal diagnostic; neutral lineups, no bookmaker input, no publication.
const fs = require('node:fs');
const { currentTeamVolume, withDisciplineHistory } = require('../predictions/current-sot-volume.cjs');
const { currentGoalInputs } = require('../predictions/current-goal-inputs.cjs');
const { volumeMetric, predictScenario } = require('../predictions/engine');
const read = p => JSON.parse(fs.readFileSync(p, 'utf8'));
const mean = a => a.reduce((s, x) => s + x, 0) / a.length;
const matches = read('data/normalized/matches.json');
const history = read('data/normalized/referee-matches/2025-26/serie-a.json').matches;
const profiles = withDisciplineHistory(read('data/normalized/team-volume-profiles-2025-26.json').profiles, history);
const styles = read('data/normalized/team-style-profiles.json').profiles;
const standings = read('data/normalized/standings-2025-26.json');
const xgMatches = read('data/normalized/understat-serie-a-xg.json').matches.filter(m => m.season === '2025-26');
const canonical = name => ({ 'AC Milan': 'milan', 'Parma Calcio 1913': 'parma' }[name] || name.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
const xgLeagueSummary = { homeXgPerMatch: mean(xgMatches.map(m => m.xg.home)), awayXgPerMatch: mean(xgMatches.map(m => m.xg.away)) };
function historicalXg(id) {
  const rows = xgMatches.filter(m => canonical(m.homeTeam.name) === id || canonical(m.awayTeam.name) === id).map(m => {
    const venue = canonical(m.homeTeam.name) === id ? 'home' : 'away';
    return { venue, date: m.date, for: m.xg[venue], against: m.xg[venue === 'home' ? 'away' : 'home'] };
  });
  if (!rows.length) return null;
  const summary = rows => Object.fromEntries(['for', 'against'].map(k => [k, mean(rows.map(r => r[k]))]));
  return { home: summary(rows.filter(r => r.venue === 'home')), away: summary(rows.filter(r => r.venue === 'away')), overall: summary(rows), recent: summary([...rows].sort((a, b) => String(b.date).localeCompare(String(a.date))).slice(0, 8)) };
}
const xgByTeam = new Map(styles.map(p => [p.teamId, historicalXg(p.teamId)]));
const evaluations = [], goalRows = [];
for (const match of matches.filter(m => m.competition === 'serie-a' && m.season === '2026-27' && m.status === 'finished' && m.matchday >= 6)) {
  const current = {}, goals = {};
  for (const teamId of [match.homeTeam, match.awayTeam]) {
    current[teamId] = currentTeamVolume({ matches, historicalProfiles: profiles, teamId, targetMatch: match });
    goals[teamId] = currentGoalInputs({ matches, historicalMatches: history, teamId, targetMatch: match, profile: styles.find(p => p.teamId === teamId), historicalXg: xgByTeam.get(teamId), xgLeagueSummary });
  }
  for (const venue of ['home', 'away']) {
    const teamId = match[venue + 'Team'], opponentId = match[(venue === 'home' ? 'away' : 'home') + 'Team'];
    const old = profiles.find(p => p.teamId === teamId), opponent = profiles.find(p => p.teamId === opponentId);
    const style = styles.find(p => p.teamId === teamId), shots = style?.summary?.shotsPerGame ?? 10.5;
    for (const [metric, field, priorMean] of [['totalShots', 'shots', shots], ['shotsOnTarget', 'shotsOnTarget', shots * .34], ['wonCorners', 'corners', 1.7 + shots * .19 + .55 * 1.15], ['fouls', 'fouls', mean(profiles.flatMap(p => p.venues.overall.fouls.for.values))], ['yellowCards', 'yellowCards', mean(profiles.flatMap(p => p.venues.overall.yellowCards.for.values))]]) {
      const prior = { matches: 0, mean: priorMean, sd: 2, p20: Math.max(0, priorMean - 2), p80: priorMean + 2, source: 'diagnostic-prior' };
      const baseline = ['fouls', 'yellowCards'].includes(metric) ? old?.venues.overall[metric]?.for?.mean ?? priorMean : volumeMetric(null, null, old, opponent, venue, metric, 1, prior).central;
      const candidate = volumeMetric(null, null, current[teamId], current[opponentId], venue, metric, 1, prior).central;
      evaluations.push({ matchId: match.id, matchday: match.matchday, teamId, metric, observed: match.teamStats[venue][field], baseline, candidate });
    }
  }
  const recent = id => {
    const rows = matches.filter(m => m.competition === 'serie-a' && m.season === '2026-27' && m.status === 'finished' && m.matchday < match.matchday && [m.homeTeam, m.awayTeam].includes(id)).sort((a, b) => b.matchday - a.matchday).slice(0, 8);
    return { goalsFor: mean(rows.map(m => m.score[m.homeTeam === id ? 'home' : 'away'])), goalsAgainst: mean(rows.map(m => m.score[m.homeTeam === id ? 'away' : 'home'])) };
  };
  const common = { match, homeTeam: { id: match.homeTeam }, awayTeam: { id: match.awayTeam }, homeSquad: { players: [] }, awaySquad: { players: [] }, leagueSummary: standings.summary, xgLeagueSummary, homeRecent: recent(match.homeTeam), awayRecent: recent(match.awayTeam) };
  const run = adapted => {
    const h = goals[match.homeTeam], a = goals[match.awayTeam];
    const home = standings.homeRows.find(r => r.team === match.homeTeam), away = standings.awayRows.find(r => r.team === match.awayTeam);
    return predictScenario({ ...common, homeProfile: adapted ? h.profile : styles.find(p => p.teamId === match.homeTeam), awayProfile: adapted ? a.profile : styles.find(p => p.teamId === match.awayTeam), homeVenue: adapted ? { ...home, currentGoalRates: { for: h.venueRates.home.for.mean, against: h.venueRates.home.against.mean } } : home, awayVenue: adapted ? { ...away, currentGoalRates: { for: a.venueRates.away.for.mean, against: a.venueRates.away.against.mean } } : away, homeXgProfile: adapted ? h.xg : xgByTeam.get(match.homeTeam), awayXgProfile: adapted ? a.xg : xgByTeam.get(match.awayTeam), homeVolume: adapted ? current[match.homeTeam] : profiles.find(p => p.teamId === match.homeTeam), awayVolume: adapted ? current[match.awayTeam] : profiles.find(p => p.teamId === match.awayTeam) });
  };
  const baseline = run(false), candidate = run(true);
  const outcome = match.score.home > match.score.away ? 0 : match.score.home === match.score.away ? 1 : 2;
  const metrics = scenario => ({ goalAbsoluteError: (Math.abs(scenario.expected.home - match.score.home) + Math.abs(scenario.expected.away - match.score.away)) / 2, outcomeLogLoss: -Math.log(Math.max(1e-12, scenario.final[outcome])), outcomeBrier: scenario.final.reduce((s, p, i) => s + (p - Number(i === outcome)) ** 2, 0), scoreLogLoss: -Math.log(Math.max(1e-12, scenario.matrix.find(s => s.home === match.score.home && s.away === match.score.away)?.probability ?? 0)), exactCentralHit: Number(scenario.forecast.primary.score === `${match.score.home}-${match.score.away}`) });
  goalRows.push({ matchId: match.id, baseline: metrics(baseline), candidate: metrics(candidate) });
}
const summary = rows => Object.fromEntries(['baseline', 'candidate'].map(key => [key, { n: rows.length, mae: mean(rows.map(r => Math.abs(r[key] - r.observed))), rmse: Math.sqrt(mean(rows.map(r => (r[key] - r.observed) ** 2))), bias: mean(rows.map(r => r[key] - r.observed)) }]));
const volumeResults = Object.fromEntries([...new Set(evaluations.map(r => r.metric))].map(metric => [metric, summary(evaluations.filter(r => r.metric === metric))]));
const goalResults = Object.fromEntries(['baseline', 'candidate'].map(key => [key, Object.fromEntries(Object.keys(goalRows[0][key]).map(metric => [metric, mean(goalRows.map(r => r[key][metric]))]))]));
const output = { role: 'DIAGNOSTIC_NOT_CERTIFIED_VALIDATION', scope: '50 fixtures MD6-10; prior completed rounds only; counts neutral context, goals neutral lineups and unadjusted common recent goals; not original published pre-match replay', selectionBias: 'Post-hoc analysis after MD11 model adaptation; no untouched holdout; 12/4 prior strengths not optimized', missingSnapshotLimit: 'Historical XI, tactics, injuries and bookmaker snapshots not reconstructed', volumeResults, goalResults, evaluations, goalRows };
fs.mkdirSync('data/analysis/current-team-baseline-2026-11-06', { recursive: true });
fs.writeFileSync('data/analysis/current-team-baseline-2026-11-06/temporal-diagnostic.json', JSON.stringify(output, null, 2) + '\n');
console.log(JSON.stringify({ volumeResults, goalResults }, null, 2));
