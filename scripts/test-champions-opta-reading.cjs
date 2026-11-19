'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),crypto=require('node:crypto'),zlib=require('node:zlib');
const {probabilities}=require('./champions/opta-result-policy.cjs');
const {loadContext,resultForFixture}=require('./champions/european-result-policy.cjs');
const {withEuropeanXgot}=require('./champions/xgot-result.cjs');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8')),digest=v=>crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex');
const data=read('data/generated/champions-shared-scenarios.json'),calendar=read('data/normalized/champions-league-2026-27.json'),model=read('data/normalized/champions-opta-result-model.json');
const calibration=read('data/analysis/champions/opta-calibration-2026-11-18/results.json');assert.deepEqual(model.parameters,calibration.frozenModel,'No retuning of frozen calibration');
const pairs=new Map(zlib.gunzipSync(fs.readFileSync('data/analysis/champions/opta-historical-feasibility-2026-11-18/historical-match-pairs.jsonl.gz')).toString().trim().split('\n').map(l=>{const r=JSON.parse(l);return [String(r.fixtureId),r]}));
for(const p of calibration.predictions){const r=pairs.get(String(p.fixtureId)),actual=Object.values(probabilities(r.homeRating.rating,r.awayRating.rating,model.parameters));actual.forEach((v,i)=>assert(Math.abs(v/100-p.candidate[i])<1e-12,'JS/Python calibration parity'));}
for(const [a,b] of [[0,100],[100,0],[50,50]])assert(Math.abs(Object.values(probabilities(a,b,model.parameters)).reduce((n,v)=>n+v,0)-100)<1e-10);
assert(probabilities(90,80,model.parameters).home>probabilities(80,80,model.parameters).home);
const neutral={...model.parameters,homeIntercept:0};assert(Math.abs(probabilities(90,80,neutral).home-probabilities(80,90,neutral).away)<1e-10);
const context=loadContext(calendar,data.generatedAt);assert(context.opta);assert(!context.initialPrior);assert(!context.states,'Elo replay must not run');
const future=calendar.fixtures.filter(f=>f.status==='scheduled');assert.equal(future.length,72);
for(const fixture of future){
 const f=data.fixtures.find(f=>f.fixtureId===fixture.id);assert(f&&f.resultModel.type==='OPTA_CLUB_RATING_RESULT'&&f.europeanReading.applied,fixture.id);
 const baseline={...f.expectedGoals,...f.expectedGoals.components.europeanReading.baseline};const expected=withEuropeanXgot(resultForFixture(fixture,context),baseline);
 for(const k of ['home','draw','away'])assert(Math.abs(f.probabilities[k]-expected.probabilities[k])<1e-10,fixture.id+' '+k);
 assert.equal(f.resultModel.features.extraLeagueBonus,false);assert.equal(f.resultModel.features.initialDomesticPriorApplied,false);assert.equal(f.resultModel.statisticallyValidated,false);
 assert(!Object.keys(f.resultModel.inputHashes).some(k=>k.includes('elo-initial')||k.includes('prior-domestic')));
 assert.equal(f.teamProjections[0].expectedGoals,f.expectedGoals.home);assert.equal(f.teamProjections[1].expectedGoals,f.expectedGoals.away);
 for(const [side,i]of [['home',0],['away',1]]){const mean=f.scoreDistribution.reduce((n,s)=>n+s[side]*s.probability,0);assert(Math.abs(mean-f.expectedGoals[side])<=.0051);assert(Math.abs(f.xgotForecast[side]-f.teamProjections[i].shotsOnTarget.central*f.xgotForecast.qualityPerSot[i])<1e-10);}
 for(const [side,fn]of [['home',s=>s.home>s.away],['draw',s=>s.home===s.away],['away',s=>s.home<s.away]])assert(Math.abs(f.scoreDistribution.filter(fn).reduce((n,s)=>n+s.probability,0)*100-f.probabilities[side])<1e-8);
}
const sabah=calendar.fixtures.find(f=>f.id==='ucl-2026-27-md05-10'),verified=resultForFixture(sabah,context);assert.equal(verified.features.home.country,'Azerbaijan');assert.equal(verified.features.home.optaContestantId,'evvhmz4bq4dq1v9llaev1j97u');
const late={...context,snapshot:{...context.snapshot,availableAt:'2027-01-01T00:00:00Z'}};assert.equal(resultForFixture(sabah,late).status,'INSUFFICIENT_DATA');
const absent={...context,clubs:new Map(context.clubs)};absent.clubs.delete(context.map.get('Sabah'));assert.equal(resultForFixture(sabah,absent).probabilities.away,null,'No name or Elo fallback for missing exact identity');
const before=read('data/analysis/champions/opta-activation-2026-11-19/before.json');
for(const f of data.fixtures.filter(f=>calendar.fixtures.some(c=>c.id===f.fixtureId&&c.status==='finished')))assert.equal(digest(f),before.fixtures.find(x=>x.fixtureId===f.fixtureId).sha256,'Historical reading changed');
for(const [p,sha]of Object.entries(before.hashes).filter(([p])=>!['data/generated/champions-shared-scenarios.json','data/sources/champions-european-result-policy.json'].includes(p)))assert.equal(crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex'),sha,'Unrelated catalog, official registry or Serie A changed');
console.log('PASS 37 JS/Python calibration cases; 72 linked Opta readings; exact Sabah identity, no league bonus/prior, temporal/missingness gates; historical readings, catalogs, registry and Serie A unchanged');
