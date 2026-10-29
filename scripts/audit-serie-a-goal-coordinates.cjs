"use strict";
// Read-only audit of canonical results and existing downloaded match reports.
// Writes evidence only under output/; never updates operational datasets.
const fs = require('fs');
const path = require('path');
const { parseStatmuseGame } = require('./parse-statmuse-game');
const root = path.resolve(__dirname, '..');
const results = JSON.parse(fs.readFileSync(path.join(root, 'data/sources/match-results-2026-27.json'), 'utf8'));
const finished = results.matches.filter(m => m.status === 'finished');
const candidates = new Map();
let parsed = 0;
for (const file of fs.readdirSync(path.join(root, 'tmp')).filter(f => f.endsWith('.html'))) {
  try {
    const data = parseStatmuseGame(path.join(root, 'tmp', file));
    const id = String(data.gameData.gameId);
    const list = candidates.get(id) || [];
    list.push({ file: 'tmp/' + file, data });
    candidates.set(id, list);
    parsed++;
  } catch { /* Other HTML pages are not match reports. */ }
}
const rows = finished.map(m => {
  const providerId = /-(\d+)\/?$/.exec(m.sourceUrl || '')?.[1];
  const reports = (candidates.get(providerId) || []).map(({file, data}) => {
    const g = data.gameData;
    const goals = data.playByPlay.events.filter(e => e.type === 'goal');
    const scoreMatches = g.homeTeam.score === m.score.home && g.awayTeam.score === m.score.away;
    const expected = m.score.home + m.score.away;
    const coordinates = goals.filter(e => Number.isFinite(e.coordinates?.x) && Number.isFinite(e.coordinates?.y));
    const unresolvedPlayers = goals.filter(e => !data.players[String(e.playerId)]);
    return { file, providerId, date: data.playByPlay.gameDate, season: data.playByPlay.season,
      scoreMatches, expectedGoals: expected, goalEvents: goals.length, coordinateGoals: coordinates.length,
      unresolvedProviderPlayers: unresolvedPlayers.length,
      complete: scoreMatches && goals.length === expected && coordinates.length === goals.length && !unresolvedPlayers.length,
      goals: goals.map(e => ({providerPlayerId:e.playerId, player:data.players[String(e.playerId)]?.longName ?? null,
        providerTeamId:e.teamId, clock:e.clock, period:e.period, ownGoal:e.isOwnGoal,
        shotContext:e.shotContext, coordinates:e.coordinates ?? null})) };
  }).sort((a,b) => Number(b.complete)-Number(a.complete) || b.coordinateGoals-a.coordinateGoals);
  return { matchId:m.matchId, sourceUrl:m.sourceUrl, score:m.score, expectedGoals:m.score.home+m.score.away,
    canonicalScorers:m.scorers.length, availableReports:reports.length, report:reports[0] || null };
});
const complete = rows.filter(r => r.report?.complete);
const sum = (a, f) => a.reduce((n,r)=>n+f(r),0);
const report = { auditedAt:new Date().toISOString(), scope:'Existing local reports only; no site integration',
  summary:{ finishedMatches:rows.length, expectedGoals:sum(rows,r=>r.expectedGoals), parsedLocalReports:parsed,
    matchesWithReports:rows.filter(r=>r.report).length, completeMatches:complete.length,
    goalsInCompleteMatches:sum(complete,r=>r.expectedGoals), missingMatches:rows.filter(r=>!r.report).map(r=>r.matchId),
    incompleteMatches:rows.filter(r=>r.report&&!r.report.complete).map(r=>({matchId:r.matchId,report:r.report})),
    ownGoals:sum(complete,r=>r.report.goals.filter(g=>g.ownGoal).length)},
  limitations:['Coordinate scale, orientation and physical meaning are not validated.',
    'Canonical player identity and per-goal scorer/minute reconciliation are pending.',
    'Matching by existing canonical provider URL ID; no fuzzy name matching.'], matches:rows };
const out=path.join(root,'output/goal-coordinate-audit-2026-10-29');
fs.mkdirSync(out,{recursive:true});
fs.writeFileSync(path.join(out,'local-coverage.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report.summary,null,2));
