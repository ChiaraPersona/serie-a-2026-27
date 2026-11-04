'use strict';
// Apply after preliminary ranking and draw replacement. Keep diagnostic
// probabilities and exact provider contracts; never rewrite historical picks.
function applyResultValidationPolicy(catalog, fixtureIds){
 const removed=[];
 for(const match of catalog.marketCatalog.matches){
  if(!fixtureIds.has(match.matchId))continue;
  for(const leg of match.selections){
   if(!['result','double-chance'].includes(leg.suggestionAnalysis?.family))continue;
   const evaluation=leg.betSelection?.evaluation;
   if(evaluation?.validation?.approvable===true&&leg.qualifiedSelection===true&&leg.publication?.status==='APPROVED')continue;
   if(leg.suggestionAnalysis?.suggested)removed.push({matchId:match.matchId,selectionId:leg.selectionId});
   const reason='CHAMPIONS_RESULT_VALIDATION_REQUIRED';
   leg.suggestionAnalysis={...leg.suggestionAnalysis,suggested:false,rank:null,reasons:[...new Set([...(leg.suggestionAnalysis?.reasons||[]),reason])]};
   leg.qualifiedSelection=false;leg.approvedPreliminary=false;leg.selectionStatus='NOT_SELECTED';
   leg.publication={...leg.publication,status:'NOT_SELECTED',reasons:[...new Set([...(leg.publication?.reasons||[]),reason])]};
  }
  const selected=match.selections.filter(l=>l.suggestionAnalysis?.suggested);
  selected.forEach((l,i)=>{l.suggestionAnalysis.rank=i+1;});
  match.suggestions=selected.map(l=>l.selectionId);
  if(match.suggestionSummary)match.suggestionSummary={total:selected.length,byFamily:selected.reduce((a,l)=>{const f=l.suggestionAnalysis.family;a[f]=(a[f]||0)+1;return a;},{})};
 }
 const selected=catalog.marketCatalog.matches.flatMap(m=>m.selections).filter(l=>l.suggestionAnalysis?.suggested);
 Object.assign(catalog.summary,{selections:selected.length,teamSelections:selected.filter(l=>l.marketScope!=='player').length,playerSelections:selected.filter(l=>l.marketScope==='player').length,approvedSelections:selected.filter(l=>l.qualifiedSelection).length});
 return removed;
}
module.exports={applyResultValidationPolicy};
