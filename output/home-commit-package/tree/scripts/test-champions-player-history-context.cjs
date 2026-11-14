'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto'),{execFileSync}=require('node:child_process');
const {inScope,duration,minutes,aggregate,validatedMetrics}=require('./build-champions-player-history-context.cjs');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
assert.equal(duration({type:{name:'STATUS_FINAL_PEN'},clock:5400,period:5}),90);
assert.equal(duration({type:{name:'STATUS_FINAL_PEN'},clock:7200,period:5}),120);
assert.equal(duration({type:{name:'STATUS_FINAL_PEN'}}),null);
assert.equal(minutes({starter:false,subbedIn:true,plays:[{substitution:true,clock:{displayValue:"112'"}}]},{clock:7200}).value,8);
assert.equal(minutes({starter:true,subbedOut:true,plays:[]},{clock:5400}).value,null);
assert.equal(minutes({starter:true,stats:[{name:'redCards',value:1}],plays:[{redCard:true,clock:{displayValue:"63'"}}]},{clock:5400}).value,63);
assert.equal(minutes({starter:false,subbedIn:true,subbedOut:true,plays:[{substitution:true,clock:{displayValue:"60'"}},{substitution:true,clock:{displayValue:"84'"}}]},{clock:5400}).value,24);
assert.equal(aggregate([]).minutes,null);
assert.equal(validatedMetrics({totalShots:0,totalGoals:0},{totalShots:0,shotsOnTarget:0,wonCorners:0,foulsCommitted:0}).values.shots,null);
assert.equal(validatedMetrics({totalShots:0,totalGoals:0},{totalShots:0,shotsOnTarget:0,wonCorners:0,foulsCommitted:0}).values.goals,null);
assert.equal(validatedMetrics({totalShots:0},{totalShots:8,shotsOnTarget:3,wonCorners:2,foulsCommitted:7}).values.shots,0);
assert.equal(aggregate([{appearances:1,minutes:90,shots:2},{appearances:1,minutes:90,shots:null}]).shots,null);
const scope={from:'2025-07-01',to:'2026-06-30'};
assert(inScope('2026-06-30T23:59:00Z',scope));assert(!inScope('2026-07-01T02:00:00Z',scope));
const context=read('data/normalized/champions-player-history-context-2025-26.json');
const source=read('data/sources/champions-player-senior-national-observations-2025-26.json');
const squads=read('data/normalized/champions-registered-squads-2026-27.json');
const current=read('data/normalized/champions-player-stats-2026-27.json');
const allowed=new Set([...source.scope.officialLeagues,...source.scope.friendlyLeagues]);
assert.equal(context.summary.players,squads.teams.reduce((n,t)=>n+t.players.length,0));
const seen=new Set();
for(const o of source.observations){
 assert(allowed.has(o.league));assert(inScope(o.date,scope));
 assert(!/\bu(?:1\d|2[0-3])\b|women/i.test(o.country));
 const key=o.eventId+'|'+o.providerPlayerId;assert(!seen.has(key));seen.add(key);
 assert.equal(o.scope,o.league==='fifa.friendly'?'friendly':'official');
}
for(const team of context.teams){
 const roster=squads.teams.find(t=>t.id===team.teamId);assert.equal(team.players.length,roster.players.length);
 const currentTeam=current.teams.find(t=>t.id===({'bod-glimt':'bodo-glimt'}[team.teamId]||team.teamId));
 for(const p of team.players){
  const original=roster.players.find(x=>x.id===p.playerId);assert(original);assert.equal(p.uefaPlayerId,original.uefaPlayerId);
  if(original.previousSeason)for(const field of ['minutes','shots','shotsOnTarget'])assert.equal(p.club.totals[field],original.previousSeason.totals[field]);
  const currentPlayers=currentTeam.players.filter(x=>p.providerPlayerId?String(x.providerPlayerId)===p.providerPlayerId:x.id===p.playerId);
  const originalCurrent=currentPlayers.length===1?currentPlayers[0].currentSeason:null;
  for(const field of ['appearances','minutes','shots','shotsOnTarget','goals','assists'])assert.equal(p.currentSeason?.totals[field]??null,originalCurrent?.totals?.[field]??null);
  for(const [kind,field] of [['official','nationalOfficial'],['friendly','nationalFriendly']]){
   const observations=source.observations.filter(o=>o.providerPlayerId===p.providerPlayerId&&o.scope===kind);
   assert.equal(p[field].appearancesObserved,observations.length);
   assert.deepEqual(p[field].totals,aggregate(observations));
   if(!observations.length)assert.equal(p[field].totals.appearances,null);
  }
 }
}
// A second build must preserve every operational input and produce identical projections.
const files=['data/normalized/champions-player-stats-2026-27.json','data/normalized/champions-player-stats-2025-26.json','data/normalized/champions-registered-squads-2026-27.json','data/normalized/schedina-champions-md04.json','data/generated/champions-shared-scenarios.json','data/normalized/champions-player-history-context-2025-26.json'];
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const before=files.map(hash);
execFileSync(process.execPath,['-e',"const fs=require('node:fs'),original=fs.readFileSync;fs.readFileSync=function(p,...args){if(String(p).replaceAll('\\\\','/').includes('data/raw/champions-senior-national-history/'))throw Error('Unexpected raw dependency');return original.call(this,p,...args)};require('./scripts/build-champions-player-history-context.cjs').main()"],{stdio:'pipe'});
assert.deepEqual(files.map(hash),before);
console.log(`OK: ${context.summary.players} identità; club/nazionale, ufficiali/amichevoli, UTC, supplementari, N/D, idempotenza e integrità dati operativi.`);
