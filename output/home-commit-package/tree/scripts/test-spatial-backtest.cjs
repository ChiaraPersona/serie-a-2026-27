'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {CONFIG,makeFeatures,fit,predict,score}=require('./research/spatial-backtest/model.cjs');
const {runExperiment,selectBaseline,loadInputs,captureProduction}=require('./research/spatial-backtest/run.cjs');
const {toKickoffUtc}=require('./predictions/snapshot-core');
const root=path.resolve(__dirname,'..');
const before=captureProduction(),inputs=loadInputs(),report=runExperiment(inputs);
const saved=JSON.parse(fs.readFileSync(path.join(root,'data/analysis/spatial-backtest-2026-10-29/results.json')));
assert.deepEqual(report,saved,'Non-reproducible backtest');
assert.equal(report.training.n,16);assert.equal(report.holdout.rows.length,18);
const byId=new Map(inputs.fixtures.map(f=>[f.id,f]));
for(const row of report.eligibleRows){
 assert(Date.parse(row.baseline.generatedAt)<toKickoffUtc(byId.get(row.fixtureId)));
 assert.equal(row.features.xg,null);assert.equal(row.features.originalPrematchAvailabilityProven,false);
 const generatedDate=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Rome',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(row.baseline.generatedAt));
 assert(row.features.cutoffExclusive<=generatedDate);
 for(const id of row.features.historyFixtureIds){
  const m=byId.get(id);assert.notEqual(id,row.fixtureId);assert(m.date<row.features.cutoffExclusive);assert(m.matchday<row.matchday);assert.equal(m.status,'finished');
 }
 assert(row.features.teamHistory.every(t=>t.matches>=5));
 for(const side of row.features.sides){
  assert(Number.isFinite(side.signal)&&Math.abs(side.signal)<=CONFIG.maximumSignal);
  assert(side.rows.every(z=>Number.isFinite(z.conversion)&&z.conversion>=0&&z.conversion<=1));
 }
 if(row.matchday===6)assert.equal(row.baseline.evidenceClass,'SIGNED_PREMATCH_SNAPSHOT');
}
const development=report.eligibleRows.filter(r=>[6,7].includes(r.matchday));
assert(development.every(r=>!report.holdout.rows.some(t=>t.fixtureId===r.fixtureId)));
for(const row of report.holdout.rows){
 assert(report.training.spatial.latestTrainingDate<row.features.cutoffExclusive);
 for(const forecast of Object.values(row.forecasts)){
  assert(Math.abs(forecast.outcomes.reduce((a,b)=>a+b,0)-1)<1e-10);
  assert(forecast.lambda.home>0&&forecast.lambda.away>0);
 }
 assert.deepEqual(row.forecasts.baseline,score(row,row.baseline.lambda));
}
for(const row of report.rolling.rows)for(const id of row.training.spatial.trainingFixtureIds){
 const m=byId.get(id);assert(m.matchday<row.matchday&&m.date<row.features.cutoffExclusive);
}
// Poison all latest-round scores. Same features, frozen fit and pre-match forecasts;
// only evaluation labels/metrics may change.
const poisonedFixtures=structuredClone(inputs.fixtures);
for(const f of poisonedFixtures.filter(f=>f.matchday===9&&f.status==='finished'))f.score={home:7,away:7};
const poisoned=runExperiment({...inputs,fixtures:poisonedFixtures});
assert.deepEqual(poisoned.training,report.training);
for(let i=0;i<report.holdout.rows.length;i++){
 assert.deepEqual(poisoned.holdout.rows[i].features,report.holdout.rows[i].features);
 assert.deepEqual(poisoned.holdout.rows[i].forecasts.spatial.lambda,report.holdout.rows[i].forecasts.spatial.lambda);
}
assert.notDeepEqual(poisoned.holdout.summary.metrics,report.holdout.summary.metrics);
const row=report.holdout.rows.at(-1),target=byId.get(row.fixtureId),source=inputs.candidates.find(c=>c.prediction.matchId===row.fixtureId&&!c.snapshot);
const invalid={...source,generatedAt:new Date(toKickoffUtc(target)+1).toISOString()};
assert.equal(selectBaseline(target,[invalid],inputs.manifest).baseline,null);
const snapshotCandidate=inputs.candidates.find(c=>c.snapshot),badSnapshot=structuredClone(snapshotCandidate);badSnapshot.snapshot.prediction.expectedGoals.home+=1;
assert.equal(selectBaseline(byId.get(badSnapshot.prediction.matchId),[badSnapshot],inputs.manifest).baseline,null);
// Target coordinates and future coordinates cannot change the historical feature vector.
const features=makeFeatures(target,inputs.fixtures,inputs.dataset,CONFIG,row.features.cutoffExclusive);
const poisonedDataset=structuredClone(inputs.dataset);
for(const m of poisonedDataset.matches.filter(m=>m.fixtureId===target.id||m.date>=row.features.cutoffExclusive)){
 for(const e of m.events){e.isGoal=true;e.zone='box-left';e.position={x:99,y:1};}
}
assert.deepEqual(makeFeatures(target,inputs.fixtures,poisonedDataset,CONFIG,row.features.cutoffExclusive),features);
// A zero spatial signal nests the control, including its fitted intercept.
const zero=structuredClone(development);for(const r of zero)for(const s of r.features.sides)s.signal=0;
const cal=fit(zero,false),sp=fit(zero,true);assert(Math.abs(cal.alpha-sp.alpha)<1e-12);assert.equal(sp.beta,0);
assert.deepEqual(predict(zero[0],cal),predict(zero[0],sp));
assert.equal(fit([],true),null);
assert.equal(report.holdout.summary.uncertainty.byMatchday.interval,null);
assert.equal(report.conclusion.promotionAllowed,false);
assert.deepEqual(captureProduction(),before,'Operational artifacts changed');
console.log('OK spatial backtest: deterministic results; 16 development / 18 test; signed/timestamped baseline gates; future-score and coordinate poisoning; training cutoffs; control nesting; 881 operational files unchanged.');
