'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const base='data/analysis/champions/results-2026-10-22';
const current=read('data/normalized/champions-player-stats-2026-27.json'),before=read(base+'/before/data/normalized/champions-player-stats-2026-27.json');
const calendar=read('data/normalized/champions-league-2026-27.json'),calendarBefore=read(base+'/before/data/normalized/champions-league-2026-27.json');
const ledger=read('data/sources/champions-observed-performances-2026-27.json');
assert.equal(ledger.performances.length,1698);
assert.equal(new Set(ledger.performances.map(p=>p.fixtureId+'|'+p.teamId+'|'+p.providerPlayerId)).size,1698);
assert.equal(calendar.fixtures.filter(f=>f.status==='finished').length,54);
const stripReport=({matchReport,...rest})=>rest;
for(const f of calendarBefore.fixtures){const updated=calendar.fixtures.find(a=>a.id===f.id);assert.deepEqual(stripReport(updated),stripReport(f),f.id+' calendar preserved');if(f.matchday>3)assert.deepEqual(updated,f);}
for(const t of before.teams)for(const p of t.players){
 const updated=current.teams.find(a=>a.id===t.id).players.find(a=>a.id===p.id);assert(updated);
 const domestic=player=>(player.currentSeason?.entries||[]).filter(e=>e.competitionType==='domestic-league');
 assert.deepEqual(domestic(updated),domestic(p),t.id+'/'+p.id+' domestic preserved');
 if(p.currentSeason?.totalsScope?.competitionType==='domestic-league')assert.deepEqual(updated.currentSeason.totals,p.currentSeason.totals,t.id+'/'+p.id+' primary totals preserved');
 assert.deepEqual(updated.previousSeason,p.previousSeason,'historical data preserved');
}
let goals=0,subs=0,linked=0;
for(let day=1;day<=3;day++){
 const source=read(`data/sources/champions-results-md0${day}-2026-27.json`),old=read(base+`/before/data/sources/champions-results-md0${day}-2026-27.json`);
 for(const report of source.fixtures){
  const prior=old.fixtures.find(f=>f.fixtureId===report.fixtureId);
  for(const key of ['score','selectionEvidence','playerEvidence','statistics','cards','substitutions','scorers'])if(prior[key]!=null&&key!=='playerEvidence')assert.deepEqual(report[key],prior[key],report.fixtureId+' original '+key);
  const fixture=calendar.fixtures.find(f=>f.id===report.fixtureId);assert.deepEqual(fixture.matchReport,report);
  assert.equal(report.goalEvents.length,report.score.home+report.score.away);goals+=report.goalEvents.length;subs+=report.observedSubstitutions.length;
  for(const side of ['home','away']){
   const played=report.playerEvidence.filter(p=>p.team===side&&p.statistics.appearances===1);
   assert.equal(report.actualLineups[side].players.filter(p=>p.starter).length,11);
   for(const [key,provider] of [['shots','totalShots'],['shotsOnTarget','shotsOnTarget'],['fouls','foulsCommitted'],['yellowCards','yellowCards']])assert.equal(played.reduce((n,p)=>n+p.statistics[provider],0),report.observedStatistics[key][side==='home'?0:1]);
  }
  for(const p of report.playerEvidence){
   if(p.statistics.appearances===1){assert(p.minutes>=0&&p.minutes<=90);assert.equal(p.minutesStatus,'estimated-regulation-time');if(p.playerId)linked++;}
   if(p.statistics.appearances===0)assert.equal(p.minutes,0);
   assert.equal(p.statistics.keyPasses,undefined,'unavailable metrics not imputed');
  }
 }
}
assert.equal(goals,221);assert.equal(subs,510);assert.equal(linked,1679);
for(const team of current.teams)for(const p of team.players.filter(p=>p.championsObserved)){
 const rows=ledger.performances.filter(r=>r.teamId===team.id&&r.playerId===p.id);
 const total=p.championsObserved.totals;
 assert.equal(total.appearances,rows.length);assert.equal(total.goals,rows.reduce((n,r)=>n+r.statistics.totalGoals,0));assert.equal(total.shots,rows.reduce((n,r)=>n+r.statistics.totalShots,0));
 assert.equal(new Set(p.championsObserved.matches.map(m=>m.matchId)).size,rows.length);
}
assert.equal(current.summary.complete+current.summary.partial+current.summary.unavailable,current.summary.players);
console.log('OK: 54 reports, 1698 appearances, 221 goals, 510 substitutions; 1679 canonical appearances; domestic/history/calendar/previous evidence preserved.');
