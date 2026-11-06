"use strict";
const fs=require('node:fs'),assert=require('node:assert/strict'),crypto=require('node:crypto'),zlib=require('node:zlib');
const {TARGETS}=require('./research/xgot/acquire-current.cjs');
const read=f=>JSON.parse(fs.readFileSync(f,'utf8'));
const coverage=read('data/analysis/xgot/current-seasons/coverage.json');
assert.equal(coverage.summaries.length,TARGETS.length);
let matches=0,withXgot=0;
for(const target of TARGETS){
 const d=read(`data/normalized/xgot-current-seasons/${target.competition}-${target.season.replace('/','-')}.json`);
 const bytes=fs.readFileSync(d.calendarEvidence.rawPath),calendar=JSON.parse(zlib.gunzipSync(bytes));
 assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),d.calendarEvidence.sha256);
 assert.equal(calendar.payload.details.selectedSeason,target.season);
 const fixtures=calendar.payload.fixtures.allMatches.filter(f=>f.status.finished&&!f.status.awarded&&!f.status.cancelled);
 assert.equal(d.matches.length+d.summary.failures,fixtures.length);
 assert.equal(new Set(d.matches.map(m=>m.providerMatchId)).size,d.matches.length);
 for(const m of d.matches){
  const rawBytes=fs.readFileSync(m.source.rawPath),raw=JSON.parse(zlib.gunzipSync(rawBytes));
  assert.equal(crypto.createHash('sha256').update(rawBytes).digest('hex'),m.source.sha256);
  assert.equal(String(raw.payload.general.matchId),m.providerMatchId);
  assert.equal(raw.payload.general.finished,true);
  assert.equal(m.coverage.teamXgotPresent,m.teams.every(t=>typeof t.xgot==='number'));
  matches++;if(m.coverage.teamXgotPresent)withXgot++;
 }
}
const before=read('data/analysis/xgot/missing-before.json'),stats=read('data/generated/xgot-statistics.json');
for(const id of before.missingCurrentTeams)assert(stats.teams[id]?.['2026/27']?.matches>0,`${id}: current xGOT remains missing`);
assert(Object.values(stats.players).filter(p=>p['2026/27']).length>before.currentPlayers);
const predictions=read('data/normalized/predictions.json').predictions.filter(p=>p.matchId.endsWith('-md-11'));
assert.equal(predictions.filter(p=>p.expectedGoals.components.xgot?.applied).length,10);
const sha=v=>crypto.createHash('sha256').update(v).digest('hex');
assert.equal(sha(fs.readFileSync('data/normalized/odds/sisal/serie-a.json')),before.oddsHash);
assert.equal(sha(JSON.stringify(read('data/generated/champions-shared-scenarios.json').fixtures.filter(f=>f.matchday===4))),before.historicalChampionsHash);
console.log(`OK current xGOT: ${matches} completed archived fixtures, ${withXgot} with team xGOT; calendar/raw hashes, missing values, all four team gaps filled, 10/10 MD11 and preserved quotes/historical Champions`);
