'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const {scoreMatrix}=require('./predictions/engine.js');
const {conditionScores,conditionDiscipline}=require('./champions/european-reading.cjs');
const base={expected:{home:1.5,away:1.2,total:2.7,components:{}},matrix:scoreMatrix(1.5,1.2,7)};
const result={status:'PRELIMINARY',modelId:'test-elo',probabilities:{home:65,draw:20,away:15}};
const before=JSON.stringify(base),a=conditionScores(base,result);
assert.equal(JSON.stringify(base),before,'baseline mutated');
const outcome=s=>s.home>s.away?'home':s.home===s.away?'draw':'away';
for(const key of ['home','draw','away']){
 const mass=a.matrix.filter(s=>outcome(s)===key).reduce((n,s)=>n+s.probability,0);
 assert(Math.abs(mass-result.probabilities[key]/100)<1e-10);
 const cells=a.matrix.filter(s=>outcome(s)===key).slice(0,2),original=cells.map(s=>base.matrix.find(t=>t.home===s.home&&t.away===s.away));
 assert(Math.abs(cells[0].probability/cells[1].probability-original[0].probability/original[1].probability)<1e-10);
}
const b=conditionScores(base,{...result,probabilities:{home:15,draw:20,away:65}});
assert(a.expected.home>b.expected.home);assert(a.expected.away<b.expected.away);
assert.equal(a.forecast.primary.outcome,'1');assert.equal(b.forecast.primary.outcome,'2');
assert.equal(conditionScores(base,{status:'INSUFFICIENT_DATA'}).applied,false);
const rows=Array.from({length:12},(_,i)=>({for:{goals:i%3===0?2:i%3===1?1:0,yellowCards:i%3+1,foulsCommitted:10+i%3},against:{goals:1}}));
const projections=[{cards:{central:2,min:1,max:3},fouls:{central:11,min:8,max:15}},{cards:null,fouls:null}];
const discipline=conditionDiscipline(projections,[rows,[]],[.4,.3,.3],[.7,.2,.1],6);
assert.equal(discipline[0].europeanDiscipline.cards.status,'experimental-outcome-conditioned');
assert(discipline[0].cards.central<projections[0].cards.central);assert.equal(discipline[1].cards,null);
const neutral=conditionDiscipline(projections,[rows.slice(0,2),[]],[.4,.3,.3],[.7,.2,.1],6);assert.deepEqual(neutral[0].cards,projections[0].cards);
const data=JSON.parse(fs.readFileSync('data/generated/champions-shared-scenarios.json'));
assert(data.fixtures.some(f=>f.europeanReading?.applied),'No integrated future reading generated');
const linked=data.fixtures.find(f=>f.europeanReading?.applied);
assert.throws(()=>require('./champions/european-result-policy.cjs').applyScenario(structuredClone(linked),{...linked.resultModel,probabilities:{home:99,draw:.5,away:.5}}),/Rebuild the linked/,'Post-hoc rating update disconnected the reading');
for(const f of data.fixtures.filter(f=>f.europeanReading?.applied)){
 assert.equal(f.resultModel.statisticallyValidated,false);
 for(const k of ['home','draw','away'])assert(Math.abs(f.scoreDistribution.filter(s=>outcome(s)===k).reduce((n,s)=>n+s.probability,0)*100-f.probabilities[k])<1e-8);
 const expected=f.scoreDistribution.reduce((n,s)=>n+s.home*s.probability,0);assert(Math.abs(expected-f.expectedGoals.home)<=.0051);
 assert.equal(f.teamProjections[0].expectedGoals,f.expectedGoals.home);
 assert.equal(f.teamProjections[1].expectedGoals,f.expectedGoals.away);
 assert(Math.abs(f.xgotForecast.home-f.teamProjections[0].shotsOnTarget.central*f.xgotForecast.qualityPerSot[0])<1e-10);
 assert(f.scoreForecast.display.length>0);
}
const {buildSharedScenarios}=require('./champions/shared-scenario.cjs');
const {readJsonFile}=require('./sisal/dataset-store.cjs');
const inputs={calendar:readJsonFile('data/normalized/champions-league-2026-27.json'),source:readJsonFile('data/sources/champions-pilot-match-stats-2025-27.json'),styles:readJsonFile('data/normalized/team-style-profiles.json'),odds:readJsonFile('data/normalized/odds/sisal/champions-league.json'),asOf:'2026-11-14T20:00:00Z',matchday:5};
const generated=buildSharedScenarios(inputs);
const values=d=>d.fixtures.map(f=>[f.expectedGoals,f.probabilities,f.teamProjections,f.scoreDistribution,f.xgotForecast]);
assert.deepEqual(values(buildSharedScenarios({...inputs,odds:{events:[]}})),values(generated),'Bookmaker prices changed linked forecasts');
const source=structuredClone(inputs.source),late=structuredClone(source.matches.find(m=>m.coverage==='complete'));
late.eventId='future-leak';late.date='2026-11-20';late.source.retrievedAt='2026-11-20T00:00:00Z';late.home.score=50;source.matches.push(late);
source.matches.push({...late,eventId:'late-acquisition',date:'2026-10-22'});
assert.deepEqual(values(buildSharedScenarios({...inputs,source})),values(generated),'Unavailable observations changed linked reading');
(async()=>{
 const {applyEuropeanResults}=require('./champions/european-result-policy.cjs');
 const scenarios=structuredClone(data),options={scenarios,calendar:inputs.calendar,asOf:inputs.asOf};
 await applyEuropeanResults(options);const once=JSON.stringify(scenarios);
 await applyEuropeanResults(options);assert.equal(JSON.stringify(scenarios),once,'Repeated application double-counted xGOT or disconnected the score distribution');
 console.log('OK European reading: shared outcome masses, conditional score shapes, rating response, discipline shrinkage/missingness, temporal/odds isolation, goal/SOT/xGOT identities and idempotence; not statistical validation');
})().catch(e=>{console.error(e);process.exitCode=1});
