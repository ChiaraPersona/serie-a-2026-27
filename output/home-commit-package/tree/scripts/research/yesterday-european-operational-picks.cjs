'use strict';
// Counterfactual only. No historical selections, settlements or ROI are changed.
const fs=require('node:fs'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
const {desiredResults}=require('../champions/european-result-policy.cjs');
const {verifiedQuote,minimumSportsSupportPct}=require('../md06-suggested-forecasts');
const {buildMatchScenario,classifySelectionScenario}=require('../md06-scenario-coherence');
const {captureInputs,assertInputsUnchanged}=require('../test-champions-validation-inputs.cjs');
async function run(){
 const before=captureInputs(),{meetsMinimumPublicOdds}=await import('../../js/pages/shared-forecast-contract.mjs');
 const comparison=JSON.parse(fs.readFileSync('output/champions-european-rating-research/yesterday-2026-11-03.json','utf8'));
 const file='data/normalized/schedina-champions-md04.json';
 const commits=execFileSync('git',['log','--before=2026-11-04T00:00:00+01:00','--format=%H|%cI','-12','--',file],{encoding:'utf8'}).trim().split(/\r?\n/).filter(Boolean).map(l=>{const [commit,at]=l.split('|');return {commit,at};}).sort((a,b)=>Date.parse(b.at)-Date.parse(a.at));
 const versions=commits.map(c=>({...c,data:JSON.parse(execFileSync('git',['show',c.commit+':'+file],{encoding:'utf8',maxBuffer:30e6}))}));
 const rows=comparison.rows.map(row=>{
  const archive=versions.filter(v=>Date.parse(v.at)<Date.parse(row.prematchProof.kickoffAt)).map(v=>({version:v,match:v.data.marketCatalog.matches.find(m=>m.matchId===row.fixtureId)})).find(v=>v.match);
  assert(archive,'Missing committed pre-match contracts');
  const original=archive.match.selections.filter(l=>l.suggestionAnalysis?.suggested&&['result','double-chance'].includes(l.suggestionAnalysis.family));assert(original.length<=1);
  const p=row.europeanProbability,percent=p?Object.fromEntries(Object.entries(p).map(([k,v])=>[k,v*100])):null;
  const values=p?{1:percent.home,X:percent.draw,2:percent.away,'1X':percent.home+percent.draw,'X2':percent.draw+percent.away,'12':percent.home+percent.away}:{};
  const scenario=p?buildMatchScenario({matchId:row.fixtureId,probabilities:{final:{1:percent.home,X:percent.draw,2:percent.away}}}):null;
  const candidates=archive.match.selections.filter(l=>['result','double-chance'].includes(l.suggestionAnalysis?.family)).map(original=>{
   const l=structuredClone(original);l.modelProbabilityPct=values[l.selection]??null;
   l.betSelection.evaluation.modelProbabilityPct=l.modelProbabilityPct;l.betSelection.operational.reliability={level:'Bassa'};
   if(scenario)l.scenarioAnalysis={...classifySelectionScenario(l,scenario),status:'VERIFIED'};
   return l;
  });
  let pick=null;const rejected=[];
  if(p)for(const direction of desiredResults(percent)){
   const leg=candidates.find(l=>l.selection===direction);
   if(!leg){rejected.push({direction,reason:'NO_ARCHIVED_CONTRACT'});continue;}
   const eligible=verifiedQuote(leg)&&meetsMinimumPublicOdds(leg)&&Number.isFinite(leg.modelProbabilityPct)&&leg.modelProbabilityPct>=minimumSportsSupportPct(leg)&&['COHERENT_WITH_PREVALENT','COMPATIBLE_WITH_MULTIPLE_SCENARIOS'].includes(leg.scenarioAnalysis.classification)&&Date.parse(leg.betSelection.quote.verifiedAt)<Date.parse(row.prematchProof.kickoffAt);
   if(eligible){pick=leg;break;}rejected.push({direction,reason:!meetsMinimumPublicOdds(leg)?'ODDS_BELOW_1_08':'EXISTING_ADMISSION_GATE_FAILED'});
  }
  const summarize=l=>l?{selection:l.selection,selectionId:l.selectionId,odds:l.betSelection.quote.decimal,quoteAt:l.betSelection.quote.verifiedAt,modelProbabilityPct:l.modelProbabilityPct,won:l.selection.includes(row.actual)}:null;
  return {fixtureId:row.fixtureId,fixture:row.fixture,score:row.score,actual:row.actual,oldPick:summarize(original[0]),newPick:summarize(pick),rejected,archive:{commit:archive.version.commit,committedAt:archive.version.at,kickoffAt:row.prematchProof.kickoffAt}};
 });
 const report={asOf:new Date().toISOString(),date:comparison.date,status:'RETROSPECTIVE_COUNTERFACTUAL_NOT_ACTUAL_SETTLEMENT',rows,summary:{fixtures:rows.length,oldPicks:rows.filter(r=>r.oldPick).length,oldWins:rows.filter(r=>r.oldPick?.won).length,newPicks:rows.filter(r=>r.newPick).length,newWins:rows.filter(r=>r.newPick?.won).length,newLosses:rows.filter(r=>r.newPick&&!r.newPick.won).length,abstentions:rows.filter(r=>!r.newPick).length},limitations:['Reuses probabilities reconstructed with earlier results only; the new model was selected after these games.','Uses only exact contracts committed before each kickoff and a verified prematch quote timestamp.','Counts 1X2/double-chance proposals only, not all markets, personal slips, exact scores or certified profit.'],productionChanged:false};
 const out='output/champions-european-rating-research/yesterday-operational-picks-2026-11-03.json';fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');assertInputsUnchanged(before);
 console.log(JSON.stringify({output:out,...report}));
}
run().catch(e=>{console.error(e);process.exitCode=1;});
