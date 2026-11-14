"use strict";
// Read-only audit of canonical results and existing downloaded match reports.
// Writes evidence only under output/; never updates operational datasets.
const fs = require('fs');
const path = require('path');
const { parseStatmuseGame } = require('./parse-statmuse-game');
const { loadPlayerIdentities, normalizePlayerName } = require('./player-identity');
const root = path.resolve(__dirname, '..');
const identities = loadPlayerIdentities(root);
const results = JSON.parse(fs.readFileSync(path.join(root, 'data/sources/match-results-2026-27.json'), 'utf8'));
const finished = results.matches.filter(m => m.status === 'finished');
const candidates = new Map();
let parsed = 0;
const inputFiles = ['tmp', 'output/goal-coordinate-audit-2026-10-29/raw'].flatMap(dir =>
  fs.existsSync(path.join(root,dir)) ? fs.readdirSync(path.join(root,dir)).filter(f=>f.endsWith('.html')).map(f=>dir+'/'+f) : []);
for (const file of inputFiles) {
  try {
    const data = parseStatmuseGame(path.join(root, file));
    const id = String(data.gameData.gameId);
    const list = candidates.get(id) || [];
    list.push({ file, data });
    candidates.set(id, list);
    parsed++;
  } catch { /* Other HTML pages are not match reports. */ }
}
const rows = finished.map(m => {
  const providerId = /-(\d+)\/?$/.exec(m.sourceUrl || '')?.[1];
  const reports = (candidates.get(providerId) || []).map(({file, data}) => {
    const g = data.gameData;
    const allGoals = data.playByPlay.events.filter(e => e.type === 'goal');
    // Record and exclude only uniquely identifiable empty duplicate events.
    const duplicates = allGoals.filter(e => !e.coordinates && allGoals.filter(o => o.coordinates &&
      o.playerId === e.playerId && o.teamId === e.teamId && o.period === e.period && o.clock?.minute === e.clock?.minute).length === 1);
    const goals = allGoals.filter(e => !duplicates.includes(e));
    const scoreMatches = g.homeTeam.score === m.score.home && g.awayTeam.score === m.score.away;
    const expected = m.score.home + m.score.away;
    const coordinates = goals.filter(e => Number.isFinite(e.coordinates?.x) && Number.isFinite(e.coordinates?.y));
    const unresolvedPlayers = goals.filter(e => !data.players[String(e.playerId)]);
    const scorerChecks = m.scorers.map(s => {
      const matches = goals.filter(e => {
        const name=data.players[String(e.playerId)]?.longName;
        const identity=identities.resolve(s.team, name);
        const samePlayer=identity?.playerId===s.playerId || normalizePlayerName(name)===normalizePlayerName(s.player);
        const minute=e.clock?.minute>=90 ? 90+(e.clock.extraMinute||0) : e.clock?.minute+1;
        return samePlayer && (s.minute===minute || s.sourceClock && JSON.stringify(s.sourceClock)===JSON.stringify(e.clock));
      });
      return {playerId:s.playerId,player:s.player,minute:s.minute,exactMatches:matches.length,
        providerPlayerId:matches.length===1?matches[0].playerId:null};
    });
    const scorersReconciled=scorerChecks.length===goals.length && scorerChecks.every(s=>s.exactMatches===1)
      && new Set(scorerChecks.map(s=>s.providerPlayerId+':'+s.minute)).size===goals.length;
    return { file, providerId, date: data.playByPlay.gameDate, season: data.playByPlay.season,
      scoreMatches, expectedGoals: expected, goalEvents: goals.length, coordinateGoals: coordinates.length,
      rawGoalEvents:allGoals.length,excludedEmptyDuplicates:duplicates.length,scorersReconciled,scorerChecks,
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
    ownGoals:sum(complete,r=>r.report.goals.filter(g=>g.ownGoal).length),
    exactScorerMinuteMatches:sum(rows,r=>r.report?.scorerChecks.filter(s=>s.exactMatches===1).length||0),
    matchesWithExactScorerReconciliation:rows.filter(r=>r.report?.scorersReconciled).length,
    emptyDuplicateEvents:sum(rows,r=>r.report?.excludedEmptyDuplicates||0),
    outOfBoundsCoordinates:sum(rows,r=>r.report?.goals.filter(g=>g.coordinates &&
      (g.coordinates.x<0||g.coordinates.x>10000||g.coordinates.y<0||g.coordinates.y>6000)).length||0)},
  coordinateRendering:{sourceUrl:'https://www.statmuse.com/_astro/shots.CZns2Qwa.js',
    localEvidence:'output/goal-coordinate-audit-2026-10-29/raw/shot-renderer.js',
    xRange:[0,10000],yRange:[0,6000],svgViewBox:[0,0,486.5,291.9],
    svgX:'(10000-x)*486.5/10000',svgY:'(6000-y)*291.9/6000'},
  limitations:['These are shot-event positions, not verified goal-mouth crossing points or tracking coordinates in metres.',
    'Exact alias/name and minute reconciliation is reported separately; unresolved cases remain flagged.',
    'Matching by existing canonical provider URL ID; no fuzzy name matching.'], matches:rows };
const out=path.join(root,'output/goal-coordinate-audit-2026-10-29');
fs.mkdirSync(out,{recursive:true});
fs.writeFileSync(path.join(out,'local-coverage.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report.summary,null,2));
