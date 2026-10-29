'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const {technicalContext,selectHistoryPolicy,publicContinuity}=require('./shot-events/technical-context.cjs');
const {loadInputs,captureProduction}=require('./research/spatial-backtest/run.cjs');
const {experiment,VARIANTS}=require('./research/spatial-backtest/continuity-run.cjs');
const {makeFeatures,CONFIG}=require('./research/spatial-backtest/model.cjs');
const {spatialMatchup}=require('./shot-events/matchup.cjs');
const before=captureProduction(),read=f=>JSON.parse(fs.readFileSync(f,'utf8'));
const technical=read('data/normalized/serie-a-technical-context-2026-27.json');
const ids=Array.from({length:11},(_,i)=>'p'+i);
const observation=(i,coach='a',players=ids,formation='4-3-3')=>({fixtureId:'f'+i,teamId:'test',date:`2026-08-${String(i).padStart(2,'0')}`,matchday:i,
 headCoachId:coach,headCoachName:coach,starterIds:players,lineupComplete:players.length===11,
 minutes:players.map(playerId=>({playerId,minutes:90})),minutesComplete:players.length===11,formation});
const data=observations=>({observations,coachEvents:[]});
let d=data([observation(1),observation(2,null),observation(3)]);
let c=technicalContext('test','2026-08-04',d);
assert.equal(c.coachId,'a');assert.equal(c.changeObserved,false);assert.equal(c.coachTransition,false);assert.equal(c.cycleMatches,2);
// A return to the same ID after another coach starts a new episode.
d=data([observation(1),observation(2,'b'),observation(3,'a')]);c=technicalContext('test','2026-08-04',d);
assert.deepEqual(c.cycleFixtureIds,['f3']);assert.equal(c.coachTransition,true);
const cycle=selectHistoryPolicy('test',d.observations,'2026-08-04',d,'coach-cycle');assert.deepEqual(cycle.weights.map(r=>r.fixtureId),['f3']);
// A nominal formation change alone does not imply a new tactical regime.
d=data([observation(1,'a',ids,'4-3-3'),observation(2,'a',ids,'3-4-3'),observation(3,'a',ids,'4-2-3-1')]);
c=technicalContext('test','2026-08-04',d);assert.equal(c.status,'observed');assert.equal(c.formationOnlyChange,true);assert.equal(c.starterOverlap,1);assert.equal(c.minuteRetention,1);
// Sustained turnover under the same coach is distinguishable from module labels.
d=data([observation(1),observation(2,'a',ids.map(i=>i+'b')),observation(3,'a',ids.map(i=>i+'c'))]);
c=technicalContext('test','2026-08-04',d);assert.equal(c.personnelTransition,true);assert.equal(c.coachTransition,false);assert.equal(c.starterOverlap,0);
d.observations.at(-1).lineupComplete=false;d.observations.at(-1).minutesComplete=false;
c=technicalContext('test','2026-08-04',d);assert.equal(c.starterOverlap,null);assert.equal(c.minuteRetention,null);
// Announcements are gated by publication AND effective date.
d=data([observation(1),observation(2)]);d.coachEvents=[{teamId:'test',type:'appointment',headCoachId:'b',name:'b',publishedDate:'2026-08-03',effectiveDate:'2026-08-05'}];
assert.equal(technicalContext('test','2026-08-04',d).coachId,'a');
c=technicalContext('test','2026-08-05',d);assert.equal(c.coachId,'b');assert.equal(c.cycleMatches,0);assert.equal(c.coachTransition,true);
d.coachEvents=[{teamId:'test',type:'departure',headCoachId:'a',publishedDate:'2026-08-03',effectiveDate:'2026-08-03'}];
assert.equal(technicalContext('test','2026-08-04',d).coachId,null);
assert.equal(technicalContext('test','2026-10-10',data([observation(1),observation(2)])).status,'unknown');
assert(!Object.hasOwn(publicContinuity(c),'coachId'));assert(!Object.hasOwn(publicContinuity(c),'cycleFixtureIds'));
// Recency is fixed by order, with a half-life of exactly three games.
d=data(Array.from({length:6},(_,i)=>observation(i+1)));
assert.equal(selectHistoryPolicy('test',d.observations,'2026-08-07',d,'recent').selected.length,5);
const decay=selectHistoryPolicy('test',d.observations,'2026-08-07',d,'decay');assert.equal(decay.weights[0].weight,1);assert.equal(decay.weights[3].weight,.5);assert(decay.effectiveMatches>1&&decay.effectiveMatches<6);
assert.equal(technical.summary.observedChanges,4);assert.equal(technical.summary.knownHeadCoaches,175);
const assistant=technical.observations.find(r=>r.teamId==='cagliari'&&r.matchday===7);assert.equal(assistant.headCoachId,null);assert.equal(assistant.benchCoaches[0].role,'assistantCoach');
const inputs=loadInputs();inputs.technicalDataset=technical;
const result=experiment(inputs),saved=read('data/analysis/spatial-continuity-backtest-2026-10-29/results.json');assert.deepEqual(result,saved);
const commonRows=result.commonSample.all.holdout.rows.map(r=>r.fixtureId),commonTraining=result.commonSample.all.training.fixtureIds;
for(const v of VARIANTS){
 const sample=result.commonSample[v];assert.deepEqual(sample.training.fixtureIds,commonTraining);assert.deepEqual(sample.holdout.rows.map(r=>r.fixtureId),commonRows);
 for(const row of sample.holdout.rows){
  for(const t of row.features.teamHistory){
   assert.equal(t.historyWeights.length,t.matches);assert(t.historyWeights.every(r=>r.weight>0&&r.weight<=1));
   for(const id of t.fixtureIds){const f=inputs.fixtures.find(f=>f.id===id);assert(f.date<row.features.cutoffExclusive&&f.matchday<row.matchday);}
  }
 }
}
assert.equal(result.ownSamples['coach-cycle'].holdout.postCoachChange.metrics.spatial.n,0);
// Rewriting target/future coaching and personnel cannot alter its pre-match feature.
const row=result.commonSample.all.holdout.rows.at(-1),target=inputs.fixtures.find(f=>f.id===row.fixtureId),poison=structuredClone(technical);
for(const o of poison.observations.filter(o=>o.date>=row.features.cutoffExclusive)){o.headCoachId='poison';o.starterIds=['poison'];o.formation='9-1';}
poison.coachEvents.push({teamId:target.homeTeam,type:'appointment',headCoachId:'poison',publishedDate:row.features.cutoffExclusive,effectiveDate:row.features.cutoffExclusive});
for(const variant of VARIANTS){const config={...CONFIG,historyVariant:variant};
 assert.deepEqual(makeFeatures(target,inputs.fixtures,inputs.dataset,config,row.features.cutoffExclusive,poison),makeFeatures(target,inputs.fixtures,inputs.dataset,config,row.features.cutoffExclusive,technical));}
// A new coach's first fixture cannot inherit the old cycle's spatial map.
const first=inputs.fixtures.find(f=>f.id==='venezia-napoli-2026-27-md-07');
const map=spatialMatchup(first,inputs.fixtures,inputs.dataset,technical),venezia=map.teams.find(t=>t.teamId==='venezia');
assert.equal(venezia.historyScope,'observed-coach-cycle');assert.equal(venezia.matches,0);assert.equal(venezia.continuity.status,'transition');assert(map.directions.every(d=>d.focusKey===null));
assert.deepEqual(captureProduction(),before);
console.log('OK continuity: 4 observed changes; assistants/returns; publication/effective dates; nominal formations; real turnover/nulls; fixed recency weights; identical comparison samples; future-context poisoning; no old-cycle map inheritance.');
