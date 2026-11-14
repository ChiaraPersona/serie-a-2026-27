'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const {pooled,values,bootstrap}=require('./research/champions-history-validation.cjs');
const base={minutes:900,shots:10,shotsOnTarget:4};
assert.equal(pooled(base,[]),base);
const pool=pooled(base,[{minutes:90,shots:2,shotsOnTarget:1}]);
assert.equal(pool.minutes,990);assert.equal(pool.shots,12);assert.equal(pool.shotsOnTarget,5);
const incomplete={minutes:900,shots:null,shotsOnTarget:1};assert.equal(pooled(incomplete,[{minutes:90,shots:2,shotsOnTarget:1}]),incomplete);
const perfect={fixtureId:'synthetic',actual:{shots:2,sot:1},predictions:{baseline:{shots:2,sot:1},clubRecovered:{shots:2,sot:1}}};
assert.equal(values(perfect,'baseline').shotsMAE,0);assert.equal(values(perfect,'baseline').sotMAE,0);
const interval=bootstrap([perfect],'clubRecovered','shotsMAE');assert.equal(interval.newMinusBaselineLow,0);assert.equal(interval.newMinusBaselineHigh,0);
const result=JSON.parse(fs.readFileSync('data/analysis/champions/history-validation-2026-11-11/results.json','utf8'));
assert.equal(result.summary.teamsQuarantined,0);assert(result.summary.commonCases>100);assert(result.summary.commonFixtures>=10);
assert(result.operationalIntegrityPreserved);
assert.equal(result.summary.changedPredictions.clubRecovered,0);
assert(result.recoveryCoverage.every(r=>!r.hadPublishedForecast&&!r.eligibleAfterHistoryOnly));
const keys=new Set();for(const r of result.cases){
 const key=r.fixtureId+'|'+r.teamId+'|'+r.playerId;assert(!keys.has(key));keys.add(key);
 assert(r.actual.sot<=r.actual.shots);assert(Object.values(r.predictions).every(p=>!p||p.sot<=p.shots));
 const snap=JSON.parse(fs.readFileSync('data/predictions/champions-event-snapshots/md03/'+r.snapshot,'utf8'));
 assert(snap.createdAt<snap.kickoffAt);
 const frozen=snap.players.find(p=>p.teamId===r.teamId&&p.internalPlayerId===r.playerId);
 assert.equal(r.predictions.baseline.shots,frozen.projectedShots);assert.equal(r.predictions.baseline.sot,frozen.projectedShotsOnTarget);
}
console.log('OK: pooling coerente, N/D, metriche, bootstrap, baseline congelata, coorti comuni e blocchi invariati.');
