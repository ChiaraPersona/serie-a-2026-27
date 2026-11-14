'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const {readJsonFile:read}=require('./sisal/dataset-store.cjs');
const {applyEuropeanResults,desiredResults}=require('./champions/european-result-policy.cjs');
const {applyResultValidationPolicy}=require('./champions/result-validation-policy.cjs');
async function run(){
 const scenarios=read('data/generated/champions-shared-scenarios.json'),catalog=read('data/normalized/schedina-champions-md04.json'),calendar=read('data/normalized/champions-league-2026-27.json'),odds=read('data/normalized/odds/sisal/champions-league.json');
 const report=read('output/champions-european-results/application.json'),archive=read(report.archive),ids=new Set(report.updates.map(u=>u.fixtureId));
 assert.equal(report.updates.length,9);assert.equal(report.updates.filter(u=>u.status==='PRELIMINARY').length,7);
 for(const f of scenarios.fixtures.filter(f=>ids.has(f.fixtureId))){
  const old=archive.fixtures.find(x=>x.fixtureId===f.fixtureId);assert.deepEqual(f.expectedGoals,old.expectedGoals);assert.deepEqual(f.teamProjections,old.teamProjections);assert.deepEqual(f.scoreForecast.display,[]);assert.equal(f.resultModel.statisticallyValidated,false);
  const m=catalog.marketCatalog.matches.find(m=>m.matchId===f.fixtureId);assert.deepEqual(m.forecastCoverage.result,f.probabilities);
  const resultLegs=m.selections.filter(l=>['result','double-chance'].includes(l.suggestionAnalysis?.family));
  const selected=resultLegs.filter(l=>l.suggestionAnalysis.suggested);assert.equal(selected.length,f.resultModel.status==='PRELIMINARY'?1:0);
  assert(selected.every(l=>l.selection!=='X'&&l.odds>=1.08&&!l.qualifiedSelection&&l.publication.status==='PRELIMINARY'));
  for(const l of resultLegs){const p=l.betSelection.evaluation.modelProbabilityPct;assert.equal(l.modelProbabilityPct,p);assert.equal(l.betSelection.evaluation.validation.approvable,false);assert.equal(l.betSelection.evaluation.prudentProbabilityPct,null);assert.equal(l.betSelection.evaluation.expectedValuePct,null);}
 }
 const aek=scenarios.fixtures.find(f=>f.fixtureId==='ucl-2026-27-md04-10');assert(Math.abs(aek.probabilities.away-55.77668882736641)<1e-8);
 const aekMatch=catalog.marketCatalog.matches.find(m=>m.matchId===aek.fixtureId);assert(aekMatch.selections.some(l=>l.selection==='2'&&l.suggestionAnalysis.suggested));assert(!aekMatch.selections.some(l=>l.selection==='1'&&l.suggestionAnalysis.suggested));
 const clone={scenarios:structuredClone(scenarios),catalog:structuredClone(catalog)};
 await applyEuropeanResults({...clone,calendar,odds,asOf:report.asOf,fixtureIds:ids});assert.deepEqual(clone,{scenarios,catalog},'Model application must be idempotent');
 const selectedBefore=clone.catalog.marketCatalog.matches.flatMap(m=>m.selections).filter(l=>l.suggestionAnalysis?.suggested).map(l=>l.selectionId);
 applyResultValidationPolicy(clone.catalog,ids);assert.deepEqual(clone.catalog.marketCatalog.matches.flatMap(m=>m.selections).filter(l=>l.suggestionAnalysis?.suggested).map(l=>l.selectionId),selectedBefore,'Explicit preliminary authorization survives result filtering');
 assert.deepEqual(desiredResults({home:35,draw:40,away:25}),['1X']);
 const {createPersonalBetslipStore}=await import('../js/pages/personal-betslip-store.mjs');
 const memory=new Map(),storage={getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v),removeItem:k=>memory.delete(k)};
 const store=createPersonalBetslipStore({storage});store.setContext({competition:'champions',season:'2026-27',matchday:4});
 const saved=archive.resultMarkets.find(m=>m.matchId===aek.fixtureId).selections.find(l=>l.selection==='1');assert.equal(store.add(saved).status,'ADDED');
 store.reconcile(catalog.marketCatalog.matches.flatMap(m=>m.selections));
 const snapshot=store.getSnapshot(),reconciled=snapshot.selections?.find(l=>l.selectionId===saved.selectionId)||snapshot.active?.selections?.find(l=>l.selectionId===saved.selectionId);
 assert(reconciled,'Stored user contract preserved');assert.equal(reconciled.betSelection.evaluation.modelProbabilityPct,aek.probabilities.home);assert.equal(reconciled.betSelection.quote.decimal,saved.betSelection.quote.decimal);assert.equal(reconciled.suggestionAnalysis.suggested,false);
 console.log('PASS European results: seven preliminary exact contracts, two N/D, no retroactive changes, unchanged volumes/quotes/DUO, no invented approval or EV, idempotence, filter authorization and saved-contract reconciliation.');
}
run().catch(e=>{console.error(e);process.exitCode=1;});
