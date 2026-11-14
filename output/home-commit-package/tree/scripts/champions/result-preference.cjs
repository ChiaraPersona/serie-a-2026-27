'use strict';
const {chooseSuggestions,minimumSportsSupportPct,verifiedQuote}=require('../md06-suggested-forecasts');
async function applyResultPreference(matches){
 const {isExcludedStraightDraw,meetsMinimumPublicOdds}=await import('../../js/pages/shared-forecast-contract.mjs');
 for(const match of matches){
  const removed=match.selections.filter(l=>l.suggestionAnalysis?.suggested&&isExcludedStraightDraw(l));
  for(const leg of match.selections.filter(isExcludedStraightDraw)){
   leg.suggestionAnalysis={...leg.suggestionAnalysis,suggested:false,rank:null,reasons:[...new Set([...(leg.suggestionAnalysis?.reasons||[]),'STRAIGHT_DRAW_EXCLUDED_BY_USER'])]};
   leg.selectionStatus='NOT_SELECTED';leg.qualifiedSelection=false;
   leg.publication={...leg.publication,status:'NOT_SELECTED',reasons:[...new Set([...(leg.publication?.reasons||[]),'STRAIGHT_DRAW_EXCLUDED_BY_USER'])]};
  }
  if(removed.length){
   const alternatives=match.selections.filter(l=>['result','double-chance'].includes(l.suggestionAnalysis?.family)&&['1','2','1X','X2'].includes(l.selection));
   // Reuse the existing preliminary portfolio ranking and sports-support
   // thresholds. No prudent probability or validation is inferred from central P.
   const result=chooseSuggestions({selections:alternatives},'probability-first',{probabilityKey:'modelProbabilityPct',assessment:leg=>{
    const reasons=[];
    if(!verifiedQuote(leg)||!meetsMinimumPublicOdds(leg))reasons.push('QUOTE_NOT_ELIGIBLE');
    if(!['COHERENT_WITH_PREVALENT','COMPATIBLE_WITH_MULTIPLE_SCENARIOS'].includes(leg.scenarioAnalysis?.classification)||leg.scenarioAnalysis?.status==='CONTRADICTORY')reasons.push('SCENARIO_NOT_SUPPORTED');
    const p=leg.betSelection?.evaluation?.modelProbabilityPct;
    if(!Number.isFinite(p)||p<minimumSportsSupportPct(leg))reasons.push('SPORTS_SUPPORT_BELOW_MARKET_STANDARD');
    return {eligible:!reasons.length,reasons};
   }});
   const replacement=result.accepted[0];
   if(replacement){
    const leg=match.selections.find(l=>l.selectionId===replacement.selectionId);
    leg.suggestionAnalysis={...leg.suggestionAnalysis,suggested:true,reasons:['EXISTING_PRELIMINARY_PORTFOLIO_RESULT_ALTERNATIVE']};
    leg.selectionStatus='PRELIMINARY';leg.qualifiedSelection=false;
    leg.publication={...leg.publication,status:'PRELIMINARY',reasons:['STRAIGHT_DRAW_EXCLUDED_BY_USER','CHAMPIONS_EVENT_MODEL_NOT_VALIDATED'],selectionGate:'EXISTING_PRELIMINARY_CENTRAL_PROBABILITY_PORTFOLIO'};
   }
  }
  const selected=match.selections.filter(l=>l.suggestionAnalysis?.suggested);
  selected.forEach((l,i)=>l.suggestionAnalysis.rank=i+1);match.suggestions=selected.map(l=>l.selectionId);
 }
 return matches;
}
module.exports={applyResultPreference};
