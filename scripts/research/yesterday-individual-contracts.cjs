'use strict';
// Read-only audit of original proposed contracts and existing statistical evidence.
const fs=require('node:fs'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
const {captureInputs,assertInputsUnchanged}=require('../test-champions-validation-inputs.cjs');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
function observedOutcome(leg,record){
 const sem=leg.betSelection.market.bookmakerSemantics,participants=[record.observed?.primary,record.observed?.substitute].filter(Boolean),threshold=Number(leg.betSelection.market.threshold);
 assert(sem.duo&&sem.substituteIncluded,'Do not reinterpret DUO as an individual contract');assert(participants.length&&participants[0].starter===true,'Official starter required');assert(Number.isFinite(threshold));
 const shots=leg.suggestionAnalysis.family==='shots',field=shots?'shots':'shotsOnTarget';assert(participants.every(p=>Number.isInteger(p[field])&&p[field]>=0));
 const lowerBound=participants.reduce((s,p)=>s+p[field],0);
 if(lowerBound>threshold)return {status:'won',value:lowerBound,basis:'OBSERVED_DUO_LOWER_BOUND_ALREADY_EXCEEDS_THRESHOLD'};
 if(!shots&&sem.postsAndCrossbarIncluded){
  if(!participants.every(p=>Number.isInteger(p.hitWoodwork)&&p.hitWoodwork>=0))return {status:'unavailable',reason:'WOODWORK_REQUIRED_TO_ESTABLISH_LOSS'};
  const value=lowerBound+participants.reduce((s,p)=>s+p.hitWoodwork,0);return {status:value>threshold?'won':'lost',value,basis:'DUO_SOT_PLUS_VERIFIED_WOODWORK'};
 }
 return {status:'lost',value:lowerBound,basis:'OBSERVED_DUO_CONTRACT_TOTAL'};
}
function run(){
 const before=captureInputs(),operational=read('output/champions-european-rating-research/yesterday-operational-picks-2026-11-03.json');
 const results=read('data/sources/champions-results-md04-2026-27.json'),catalog=read('data/normalized/schedina-champions-md04.json'),versions=new Map(),families={},rows=[];
 for(const game of operational.rows){
  const commit=game.archive.commit;if(!versions.has(commit))versions.set(commit,JSON.parse(execFileSync('git',['show',commit+':data/normalized/schedina-champions-md04.json'],{encoding:'utf8',maxBuffer:30e6})));
  const original=versions.get(commit).marketCatalog.matches.find(m=>m.matchId===game.fixtureId),current=catalog.marketCatalog.matches.find(m=>m.matchId===game.fixtureId),source=results.fixtures.find(f=>f.fixtureId===game.fixtureId);
  const selected=original.selections.filter(l=>l.marketScope==='player'&&l.suggestionAnalysis?.suggested),currentIds=new Set(current.selections.filter(l=>l.marketScope==='player'&&l.suggestionAnalysis?.suggested).map(l=>l.selectionId));
  assert.equal(selected.length,currentIds.size);assert(selected.every(l=>currentIds.has(l.selectionId)),'Original individual contracts must be unchanged');
  const records=selected.map(leg=>{
   const record=source.verifiedSelections.find(r=>r.selectionId===leg.selectionId);assert(record,'Missing exact settlement evidence');
   assert.equal(String(record.providerSelectionId),String(leg.betSelection.identity.providerSelectionId));assert.equal(record.playerId,leg.playerId);assert.equal(Number(record.threshold),Number(leg.betSelection.market.threshold));assert.equal(record.selection,leg.selection);
   assert.equal(record.settlement.basis,'STATISTICAL_VERIFICATION');assert.equal(record.settlement.officiallySettled,false);
   const observed=observedOutcome(leg,record);assert.equal(observed.status,record.settlement.status,'Observed DUO total must support the recorded outcome');
   const family=leg.suggestionAnalysis.family;families[family]??={won:0,lost:0,unavailable:0};families[family][observed.status]++;
   return {selectionId:leg.selectionId,playerId:leg.playerId,label:leg.label,family,threshold:record.threshold,semantics:leg.betSelection.market.bookmakerSemantics,observed:record.observed,woodworkVerification:record.woodworkVerification||null,verification:observed,statisticallyVerified:true,officiallySettled:false};
  });
  rows.push({fixtureId:game.fixtureId,fixture:game.fixture,originalCommit:commit,total:records.length,won:records.filter(r=>r.verification.status==='won').length,lost:records.filter(r=>r.verification.status==='lost').length,unavailable:records.filter(r=>r.verification.status==='unavailable').length,unchangedByEuropeanResultModel:true,records});
 }
 const totals=rows.reduce((a,r)=>({total:a.total+r.total,won:a.won+r.won,lost:a.lost+r.lost,unavailable:a.unavailable+r.unavailable}),{total:0,won:0,lost:0,unavailable:0});
 const allOriginal=operational.rows.flatMap(game=>versions.get(game.archive.commit).marketCatalog.matches.find(m=>m.matchId===game.fixtureId).selections.filter(l=>l.suggestionAnalysis?.suggested).map(l=>({fixtureId:game.fixtureId,leg:l})));
 const allStatuses=allOriginal.map(({fixtureId,leg})=>{const record=results.fixtures.find(f=>f.fixtureId===fixtureId).verifiedSelections.find(r=>r.selectionId===leg.selectionId);assert(record);return record.settlement.status;});
 const overall={total:allStatuses.length,originalWon:allStatuses.filter(s=>s==='won').length,originalLost:allStatuses.filter(s=>s==='lost').length,newWon:allStatuses.filter(s=>s==='won').length-operational.summary.oldWins+operational.summary.newWins,newLost:allStatuses.filter(s=>s==='lost').length-(operational.summary.oldPicks-operational.summary.oldWins)+operational.summary.newLosses};
 const report={asOf:new Date().toISOString(),date:'2026-11-03',scope:'ORIGINAL_INDIVIDUAL_DUO_PROPOSALS',totals,families,rows,overallCounterfactual:overall,modelEffect:'NONE: European result adapter preserves player forecasts, volumes, thresholds and contracts.',statisticalVerificationOnly:true,certifiedBookmakerSettlement:false,productionChanged:false};
 const output='output/champions-european-rating-research/yesterday-individual-contracts-2026-11-03.json';fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');assertInputsUnchanged(before);
 console.log(JSON.stringify({output,totals,families,rows:rows.map(({records,...r})=>r),overallCounterfactual:overall}));return report;
}
if(require.main===module)run();
module.exports={observedOutcome,run};
