import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {readingCases} from './readings/fixtures.mjs';
import {allocateBenchSide} from './readings/bench-forecasts.mjs';
import {individualPlayers} from '../js/pages/reading-detail/evidence.mjs';
import {playersMarkup} from '../js/pages/reading-detail/people.mjs';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const artifact=read('data/normalized/reading-bench-forecasts.json');
for(const [p,hash] of Object.entries(artifact.protectedFiles))assert.equal(crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex'),hash,p+' protected');
const cases=await readingCases();let comparedStarters=0,bench=0,withForecast=0,withMinutes=0;
const expected=[];
for(const {model,evidence} of cases){
 const before=individualPlayers(model,evidence),snapshot=JSON.stringify({model,evidence});
 const enriched={...evidence,benchForecasts:artifact},after=individualPlayers(model,enriched);
 assert.deepEqual(after.filter(p=>p.lineupStatus==='starter'),before.filter(p=>p.lineupStatus==='starter'),model.fixture.id+' starters changed');
 comparedStarters+=before.filter(p=>p.lineupStatus==='starter').length;
 assert.equal(JSON.stringify({model,evidence}),snapshot);
 const identified=after.filter(p=>p.id).map(p=>p.team+':'+p.id);assert.equal(new Set(identified).size,identified.length);
 const f=artifact.fixtures.find(f=>f.fixtureId===model.fixture.id&&f.competition===model.competition);
 for(const p of after.filter(p=>p.lineupStatus==='bench')){
  bench++;const row=p.benchForecast;if(p.id)assert(row,model.fixture.id+' missing joined bench '+p.name);
  if(!row)continue;
  for(const field of ['projectedShots','projectedShotsOnTarget','expectedMinutes','entryProbability','conditionalMinutesIfUsed'])assert(row[field]===null||Number.isFinite(row[field]),p.name+' '+field);
  if(Number.isFinite(row.expectedMinutes)){
   withMinutes++;assert(row.expectedMinutes>=0&&row.expectedMinutes<=90);assert(row.conditionalMinutesIfUsed>=0&&row.conditionalMinutesIfUsed<=90);assert(row.entryProbability>=0&&row.entryProbability<=1);
   assert(Math.abs(row.expectedMinutes-row.entryProbability*row.conditionalMinutesIfUsed)<0.001);
  }
  if(Number.isFinite(row.projectedShots)){
   withForecast++;assert(Number.isFinite(row.expectedMinutes)&&row.expectedMinutes>0);assert(row.projectedShots>=0&&row.projectedShotsOnTarget>=0&&row.projectedShotsOnTarget<=row.projectedShots);
   assert(row.per90&&row.historical.minutes>0);assert.equal(model.competition,'champions');
  }else assert(row.reasons.length>0,p.name+' missing reason');
  assert.equal(row.shotProbabilities,null);assert.equal(row.shotOnTargetProbabilities,null);
 }
 for(const b of f?.budgets||[]){
  const rows=f.players.filter(p=>p.team===b.team),starters=before.filter(p=>p.team===b.team&&p.lineupStatus==='starter');
  if(b.minuteBudget!==null){assert(rows.reduce((s,p)=>s+(p.expectedMinutes??0),0)<=b.minuteBudget+0.001);assert(rows.reduce((s,p)=>s+(p.entryProbability??0),0)<=5.00001);}
  for(const [key,budget] of [['projectedShots',b.shotsBudget],['projectedShotsOnTarget',b.sotBudget]])if(budget!==null)assert(rows.reduce((s,p)=>s+(p[key]??0),0)<=Math.max(0,budget)+0.001);
  assert(starters.length===11||b.reason==='incomplete-starter-minute-budget');
 }
 if(f){
  const stale={fixtures:[{...f,context:f.context+'changed'}]};
  assert(individualPlayers(model,{...evidence,benchForecasts:stale}).filter(p=>p.lineupStatus==='bench').every(p=>p.benchForecast===null),'stale context accepted');
 }
 const html=playersMarkup(model,enriched);assert(!html.includes('NaN'));assert(!html.includes('Evidenze e soglie originali'));
 if(['milan-atalanta-2026-27-md-07','frosinone-sassuolo-2026-27-md-07','ucl-2026-27-md01-01','ucl-2026-27-md02-05','ucl-2026-27-md02-10','ucl-2026-27-md02-18'].includes(model.fixture.id))expected.push({id:model.fixture.id,competition:model.competition,players:after.map(p=>({id:p.id,name:p.name,team:p.team,status:p.lineupStatus,shots:p.lineupStatus==='bench'?p.benchForecast?.projectedShots??null:p.available?p.source.projectedShots??null:null,sot:p.lineupStatus==='bench'?p.benchForecast?.projectedShotsOnTarget??null:p.available?p.source.projectedShotsOnTarget??null:null,minutes:p.benchForecast?.expectedMinutes??null,entry:p.benchForecast?.entryProbability??null,conditional:p.benchForecast?.conditionalMinutesIfUsed??null}))});
}
assert.equal(bench,artifact.summary.total.analysed);assert.equal(withForecast,artifact.summary.total.withForecast);assert.equal(withMinutes,artifact.summary.total.withMinutes);
// Conservation and fail-closed behavior under independently constructed boundary cases.
const starters=Array.from({length:11},(_,i)=>({role:i?'Difensore':'Portiere',source:{role:i?'defender':'goalkeeper',expectedMinutes:i?84.6:90,projectedShots:i?1:null,projectedShotsOnTarget:i?0.3:null}}));
const make=()=>({roleKey:'forward',reasons:[],minutesEstimate:{status:'evaluable',entryProbability:0.5,conditionalMinutesIfUsed:80,expectedMinutes:40},expectedMinutes:null,entryProbability:null,conditionalMinutesIfUsed:null,projectedShots:null,projectedShotsOnTarget:null,per90:{shots:2,shotsOnTarget:1}});
const testRows=[make(),make()];allocateBenchSide(testRows,starters,{shotsTotal:{central:12},shotsOnTarget:{central:4}});
assert(testRows.every(p=>p.expectedMinutes<40));assert(testRows.reduce((s,p)=>s+p.expectedMinutes,0)<=54.001);assert(testRows.every(p=>p.entryProbability===0.5));
const noRoom=[make()];allocateBenchSide(noRoom,starters,{shotsTotal:{central:10},shotsOnTarget:{central:3}});assert.equal(noRoom[0].projectedShots,null);
const noMinutes=[make()];allocateBenchSide(noMinutes,starters.slice(1),{});assert.equal(noMinutes[0].expectedMinutes,null);
const tooMany=Array.from({length:11},make);assert.equal(allocateBenchSide(tooMany,starters,{}).reason,'bench-entry-frequencies-exceed-five-substitutions');assert(tooMany.every(p=>p.expectedMinutes===null));
fs.writeFileSync('reports/reading-bench/expected.json',JSON.stringify(expected,null,2)+'\n');
const result={fixtures:cases.length,comparedStarters,bench,withForecast,withMinutes,protectedForecasts:'unchanged',budgets:'PASS',staleContext:'rejected'};
fs.writeFileSync('reports/reading-bench/tests.json',JSON.stringify(result,null,2)+'\n');console.log(result);
