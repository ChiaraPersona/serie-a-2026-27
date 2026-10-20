'use strict';
// Presentation admission only: central probabilities stay provisional and are
// never written into prudent/calibrated fields. The MD7 portfolio rules are reused.
const selector=require('../md06-suggested-forecasts');
const {playablePolicyFor}=require('../betting-market-policy');
const TARGET='ucl-2026-27-md03-01';
const finite=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v));
function selectorView(original){
 const leg=structuredClone(original),market=leg.betSelection.market;
 if(finite(market.threshold))leg.threshold=Number(market.threshold);
 // Canonical team identity prevents home/away count ladders being merged.
 if(market.subject?.type==='team')leg.playerId=market.subject.id;
 return leg;
}
function assessPreliminary(leg){
 const e=leg.betSelection.evaluation, volume=/shots|sot|corners|cards/.test(leg.suggestionAnalysis?.family||'');
 const waived=new Set(['ROBUST_PROBABILITY_NOT_AVAILABLE','STATISTICAL_FAMILY_NOT_VALIDATED']);
 if(volume){waived.add('NO_COMPARABLE_SCORE_EVENT');if(leg.scenarioAnalysis?.basis==='MARGINAL_DISTRIBUTION_NOT_JOINT_WITH_1X2')waived.add('NOT_COHERENT_WITH_PREVALENT_SCENARIO');}
 const reasons=selector.assessSuggestion(leg).reasons.filter(r=>!waived.has(r));
 if(leg.selection==='12')reasons.push('DOUBLE_CHANCE_12_EXCLUDED');
 if(leg.publication?.reasons?.includes('OFFICIAL_NONSTARTER'))reasons.push('OFFICIAL_NONSTARTER');
 if(leg.lineupEligibility?.eligible===false)reasons.push('LINEUP_INELIGIBLE');
 if(leg.scenarioAnalysis?.status==='CONTRADICTORY'||leg.scenarioAnalysis?.checks?.contradictions?.length)reasons.push('CONTRADICTORY_EVENT');
 if(playablePolicyFor(leg,{matchday:7}).status==='NOT_PLAYABLE')reasons.push('MARKET_NOT_PLAYABLE');
 if(finite(e.modelProbabilityPct)&&Number(e.modelProbabilityPct)<selector.minimumSportsSupportPct(leg))reasons.push('SPORTS_SUPPORT_BELOW_MARKET_STANDARD');
 if(leg.marketScope==='player'&&!leg.forecastEvidence)reasons.push('PLAYER_ADMISSION_EVIDENCE_MISSING');
 return {eligible:reasons.length===0,reasons:[...new Set(reasons)],conservativeExpectedValuePct:null};
}
function selectPreliminaryMatch(match){
 if(match.matchId!==TARGET)throw Error('Preliminary pilot is restricted to Fenerbahce-Slavia');
 const views=match.selections.map(selectorView);
 const result=selector.chooseSuggestions({selections:views},'probability-first',{assessment:assessPreliminary,probabilityKey:'modelProbabilityPct'});
 const ranks=new Map(result.accepted.map((l,i)=>[l.selectionId,i+1]));
 const selections=match.selections.map(leg=>{
  const rank=ranks.get(leg.selectionId)||null,assessment=result.assessments.get(leg.selectionId);
  const reasons=rank?[]:assessment.eligible?[result.rejected.get(leg.selectionId)||'LOWER_RANKED']:assessment.reasons;
  const status=rank?'PRELIMINARY':'NOT_SELECTED';
  return {...leg,selectionStatus:status,qualifiedSelection:false,approvedPreliminary:false,
   publication:{...leg.publication,status,selectionGate:'MD7_PORTFOLIO_CENTRAL_PROVISIONAL_PILOT',reasons:[...reasons,'CHAMPIONS_EVENT_MODEL_NOT_VALIDATED']},
   suggestionAnalysis:{...leg.suggestionAnalysis,suggested:Boolean(rank),rank,reasons,preliminaryRetained:false,
    criteria:'MD7_PORTFOLIO_RULES_WITH_EXPLICIT_PROVISIONAL_CENTRAL_BASIS',probabilityBasis:'PROVISIONAL_CENTRAL',
    heuristicDisclosure:'Selezione preliminare su probabilità centrale non validata. Probabilità prudenziale ed EV prudenziale N/D.',
    conservativeExpectedValuePct:null},
   betSelection:{...leg.betSelection,operational:{...leg.betSelection.operational,classification:'WATCH'}}};
 });
 const selected=selections.filter(l=>l.suggestionAnalysis.suggested);
 return {...match,selections,suggestions:result.accepted.map(l=>l.selectionId),suggestionSummary:{total:selected.length,byFamily:Object.fromEntries([...new Set(selected.map(l=>l.suggestionAnalysis.family))].map(f=>[f,selected.filter(l=>l.suggestionAnalysis.family===f).length]))}};
}
module.exports={TARGET,selectorView,assessPreliminary,selectPreliminaryMatch};
