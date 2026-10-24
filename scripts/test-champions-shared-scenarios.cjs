'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module');
const {execFileSync}=require('node:child_process');
const {buildSharedScenarios}=require('./champions/shared-scenario.cjs');
const {predictMatch}=require('./predictions/engine');
const root=path.resolve(__dirname,'..'),read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
// Compare the complete public Serie A prediction with the pre-refactor engine.
const previous=new Module(path.join(__dirname,'predictions/engine-before.cjs'),module);
previous.filename=path.join(__dirname,'predictions/engine-before.cjs');previous.paths=module.paths;
previous._compile(execFileSync('git',['show','8300becf957817e100fbd5409f94a2326d1175a4:scripts/predictions/engine.js'],{cwd:root,encoding:'utf8'}),previous.filename);
const styles=read('data/normalized/team-style-profiles.json'),volumes=read('data/normalized/team-volume-profiles-2025-26.json');
for(let i=0;i<styles.profiles.length;i++){
 const h=styles.profiles[i],a=styles.profiles[(i+1)%styles.profiles.length];
 const input={match:{id:'regression-'+i},homeTeam:{id:h.teamId},awayTeam:{id:a.teamId},homeSquad:{players:[]},awaySquad:{players:[]},homeProfile:h,awayProfile:a,
 homeVolume:volumes.profiles.find(p=>p.teamId===h.teamId),awayVolume:volumes.profiles.find(p=>p.teamId===a.teamId),reading:{sections:{}},generatedAt:'2026-10-24T00:00:00Z'};
 assert.deepEqual(predictMatch(input),previous.exports.predictMatch(input),'Serie A regression '+i);
}
const inputs={calendar:read('data/normalized/champions-league-2026-27.json'),source:read('data/sources/champions-pilot-match-stats-2025-27.json'),styles,odds:read('data/normalized/odds/sisal/champions-league.json'),asOf:'2026-10-24T00:00:00Z',matchday:4};
const baseline=buildSharedScenarios(inputs);assert.equal(baseline.fixtures.length,18);
assert(baseline.fixtures.every(f=>f.matchday===4&&f.pipeline==='SHARED_SERIE_A_SCENARIO'));
for(const f of baseline.fixtures){
 if(f.status==='preliminary'){
  assert(Math.abs(Object.values(f.probabilities).reduce((n,v)=>n+v,0)-100)<1e-8);
  assert(f.confidence.value>=0&&f.confidence.value<=100);
  assert(f.surprise.value>=0&&f.surprise.value<=100);
  assert(f.scoreForecast.display.length>0);
 }else{assert.equal(f.expectedGoals.home,null);assert.equal(f.confidence.value,null);}
 assert(f.dataQuality.latestMatchDates.every(d=>!d||d<inputs.asOf));
}
const injected=structuredClone(inputs);
const team=inputs.source.teams.find(t=>t.name===baseline.fixtures[0].homeTeam);
const match=injected.source.matches.find(m=>String(m.home.providerTeamId)===String(team.espnTeamId));assert(match);
injected.source.matches.push({...match,eventId:'future-injection',date:'2026-11-03',source:{retrievedAt:'2026-11-03'},home:{...match.home,score:50}});
assert.deepEqual(buildSharedScenarios(injected),baseline,'future information leaked');
const acquiredLate=structuredClone(inputs);
acquiredLate.source.matches.push({...match,eventId:'late-acquisition',date:'2026-10-22',source:{retrievedAt:'2026-11-03'},home:{...match.home,score:50}});
assert.deepEqual(buildSharedScenarios(acquiredLate),baseline,'late acquisition leaked');
const empty=buildSharedScenarios({...inputs,source:{...inputs.source,matches:[]}});
assert(empty.fixtures.every(f=>f.status==='insufficient-data'&&f.expectedGoals.home===null&&f.probabilities.home===null));
const finished=structuredClone(inputs);finished.calendar.fixtures.find(f=>f.id===baseline.fixtures[0].fixtureId).status='finished';
assert.equal(buildSharedScenarios(finished).fixtures.length,17,'finished fixture recalculated');
const closed=buildSharedScenarios({...inputs,asOf:'2027-06-01T00:00:00Z'});assert.equal(closed.fixtures.length,0);
const odds=structuredClone(inputs);odds.odds.events=[];
const noOdds=buildSharedScenarios(odds);
assert.deepEqual(noOdds.fixtures.map(f=>[f.expectedGoals,f.probabilities,f.teamProjections]),baseline.fixtures.map(f=>[f.expectedGoals,f.probabilities,f.teamProjections]));
odds.odds.events=[{canonicalMatchId:baseline.fixtures[0].fixtureId,canonicalDate:baseline.fixtures[0].date,retrievedAt:'2026-10-23T00:00:00Z',markets:[{marketCode:'3',selections:['1','X','2'].map((name,i)=>({name,status:'open',odds:[1.2,7,15][i]}))}]}];
const priced=buildSharedScenarios(odds);
assert.deepEqual(priced.fixtures.map(f=>[f.expectedGoals,f.probabilities,f.teamProjections]),baseline.fixtures.map(f=>[f.expectedGoals,f.probabilities,f.teamProjections]),'quotes changed model');
const partial=structuredClone(inputs);for(const m of partial.source.matches){m.home.statistics.shotsOnTarget=null;m.away.statistics.shotsOnTarget=null;}
assert(buildSharedScenarios(partial).fixtures.every(f=>f.teamProjections.every(p=>p.shotsOnTarget===null)),'missing SOT fabricated');
console.log(`OK: ${styles.profiles.length} complete Serie A predictions unchanged; 18 Champions scenarios; cutoff, N/D, completed fixtures and odds independence`);
