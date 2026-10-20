'use strict';
// Publication adapter: reuse MD7 admission and scenario checks, without fitting
// a new probability model or promoting an unvalidated Champions event.
const {evaluateRequirements}=require('./md3-selection-requirements.cjs');
const {selectMatchSuggestions,canonicalThresholdIdentity}=require('../md06-suggested-forecasts');
const {pairRelation}=require('../md06-scenario-coherence');
const {playablePolicyFor}=require('../betting-market-policy');

function publicationIdentity(leg){
 const family=leg.suggestionAnalysis?.family;
 if(leg.marketScope==='player')return `${leg.matchId}:${leg.playerId}:${family}`;
 return canonicalThresholdIdentity(leg)||`${leg.matchId}:${leg.selectionId}`;
}
function publishMatch(match,fixture,individual,evidence){
 const candidates=new Set(match.selections.filter(l=>l.suggestionAnalysis?.suggested).map(l=>l.selectionId));
 const evaluated=evaluateRequirements(structuredClone(match.selections),fixture,individual,evidence);
 // Historic approvals remain in slips, never bypass today's admission gates.
 const result=selectMatchSuggestions({selections:evaluated.map(l=>({...l,approvedPreliminary:false}))});
 const approved=new Set(result.selections.filter(l=>l.suggestionAnalysis.suggested&&l.betSelection.evaluation.validation?.approvable).map(l=>l.selectionId));
 const seen=new Set(),accepted=[];
 const selections=evaluated.map(leg=>{
   const checks=result.selections.find(l=>l.selectionId===leg.selectionId).suggestionAnalysis;
   const policy=playablePolicyFor(leg,{matchday:7});
   const official=evidence.officialRegistry?.[leg.matchId];
   const officialExcluded=leg.marketScope==='player'&&official&&!official.ids.includes(leg.playerId);
   const blocked=officialExcluded||policy.status==='NOT_PLAYABLE'||leg.lineupEligibility?.eligible===false||leg.scenarioAnalysis?.status==='CONTRADICTORY';
   const identity=publicationIdentity(leg);
   const conflict=accepted.some(other=>['MUTUALLY_EXCLUSIVE','EQUIVALENT_OVERLAP','LOGICAL_IMPLICATION'].includes(pairRelation(leg,other).type));
   const publish=!blocked&&!seen.has(identity)&&!conflict&&(approved.has(leg.selectionId)||candidates.has(leg.selectionId));
   const status=publish?(approved.has(leg.selectionId)?'APPROVED':'PRELIMINARY'):'NOT_SELECTED';
   if(publish){seen.add(identity);accepted.push(leg);}
   const reasons=[...checks.reasons];
   if(!leg.betSelection.evaluation.validation?.approvable)reasons.push('CHAMPIONS_EVENT_MODEL_NOT_VALIDATED');
   if(blocked)reasons.push(officialExcluded?'OFFICIAL_NONSTARTER':policy.code||'INELIGIBLE_OR_CONTRADICTORY');
   if(!publish&&candidates.has(leg.selectionId)&&!blocked)reasons.push('DUPLICATE_OR_CONFLICTING_SELECTED_EVENT');
   return {...leg,approvedPreliminary:false,selectionStatus:status,qualifiedSelection:status==='APPROVED',
     publication:{status,approvalGate:'MD7_SHARED_SELECTOR_AND_CHAMPIONS_EVENT_VALIDATION',reasons:[...new Set(reasons)],identity},
     suggestionAnalysis:{...leg.suggestionAnalysis,suggested:publish,rank:publish?accepted.length:null,reasons:[...new Set(reasons)],sharedAdmission:checks},
     betSelection:{...leg.betSelection,operational:{...leg.betSelection.operational,classification:status==='APPROVED'?'SELEZIONATA':'WATCH'}}};
 });
 return {...match,selections,suggestions:selections.filter(l=>l.suggestionAnalysis.suggested).map(l=>l.selectionId),total:selections.length};
}
async function buildPublication({matches,fixtures,individuals,evidence}){
 const published=matches.map(m=>publishMatch(m,fixtures.find(f=>f.fixtureId===m.matchId),individuals.fixtures.find(f=>f.fixtureId===m.matchId),evidence));
 const {assessSelections}=await import('../../js/pages/personal-betslip-store.mjs');
 const myCombo=published.map(m=>{
   const legs=m.selections.filter(l=>l.publication.status==='APPROVED');
   const assessment=assessSelections(legs);
   // The shared controller assesses overlap; a product of marginal odds or
   // probabilities never certifies a same-match joint distribution.
   return {matchId:m.matchId,status:'N/D',legs:[],candidateSelectionIds:legs.map(l=>l.selectionId),probabilityPct:null,odds:null,expectedValuePct:null,
     reason:legs.length<2?'INSUFFICIENT_APPROVED_SELECTIONS':'VALIDATED_JOINT_DISTRIBUTION_UNAVAILABLE',sharedAssessment:assessment};
 });
 return {matches:published,myCombo};
}
module.exports={publicationIdentity,publishMatch,buildPublication};
