'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const {projectHistory,applySupplement}=require('./build-champions-team-history.cjs');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const source=read('data/sources/champions-pilot-match-stats-2025-27.json'),calendar=read('data/normalized/champions-league-2026-27.json');
const before=projectHistory(source,calendar),after=structuredClone(before),supplement=read('data/sources/champions-team-history-supplement.json');
const filled=applySupplement(after,supplement);assert(filled>0);
for(const [id,rows]of Object.entries(before.teams))for(const [i,row]of rows.entries()){
 const actual=after.teams[id][i];
 for(const key of Object.keys(row).filter(k=>!['stats','statsAgainst'].includes(k)))assert.deepEqual(actual[key],row[key]);
 for(const side of ['stats','statsAgainst'])for(const [key,value]of Object.entries(row[side])){
  if(value!==null)assert.equal(actual[side][key],value,'Existing observed statistic preserved');
  else if(actual[side][key]!==null)assert(supplement.entries.some(e=>e.teamId===id&&e.fixtureId===row.id&&e.date===row.date&&e[side][key]===actual[side][key]),'Evidence for recovered value');
 }
}
const duplicate=structuredClone(after);assert.equal(applySupplement(duplicate,supplement),0,'Idempotent supplement');assert.deepEqual(duplicate,after);
for(const entry of supplement.entries){assert(fs.existsSync(entry.source.rawPath));assert(entry.source.sha256);}
const latestDay=Math.min(...calendar.fixtures.filter(f=>f.status!=='finished').map(f=>f.matchday));
const keys=['shots','shotsOnTarget','corners','fouls','cards','expectedGoals'],recovered={};
for(const f of calendar.fixtures.filter(f=>f.matchday===latestDay))for(const side of ['home','away']){
 const team=source.teams.find(t=>t.name===f[side+'Team']);
 for(const row of before.teams[team.id].filter(r=>r.date.slice(0,10)<f.date.slice(0,10)).slice(0,10)){
  const actual=after.teams[team.id].find(r=>r.id===row.id);
  for(const which of ['stats','statsAgainst'])for(const key of keys){
   const value=s=>key==='cards'?(Number.isFinite(s.yellowCards)&&Number.isFinite(s.redCards)?s.yellowCards+s.redCards:null):s[key];
   if(value(row[which])===null&&value(actual[which])!==null)recovered[key]=(recovered[key]||0)+1;
  }
 }
}
console.log(JSON.stringify({status:'PASS',filledComponents:filled,matchday:latestDay,recoveredVisibleCells:recovered}));
