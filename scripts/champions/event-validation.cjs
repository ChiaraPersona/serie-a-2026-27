'use strict';
const {VALIDATION_CRITERIA:C,METRICS,brier,ece,logLoss}=require('../md06-statistical-models');
const finite=v=>typeof v==='number'&&Number.isFinite(v);
const round=v=>finite(v)?Number(v.toFixed(6)):null;
function targetForLeg(leg){
 const market=leg.betSelection?.market||{},sem=market.bookmakerSemantics||{},family=String(leg.suggestionAnalysis?.family||'');
 const player=leg.marketScope==='player',team=String(market.subject?.type||'')==='team'||family.startsWith('team-');
 const metric=/sot|porta/i.test(family)?'sot':/shots|tiri/i.test(family)?'shots':/corner/i.test(family)?'corners':family==='result'||family==='double-chance'?family:null;
 return {scope:player?'player':team?'team':'match',metric,threshold:finite(market.threshold)?market.threshold:finite(leg.threshold)?leg.threshold:null,
   direction:['result','double-chance'].includes(metric)?String(leg.selection):String(leg.selection||'OVER').toUpperCase(),period:'REGULATION',duo:sem.duo===true,
   woodwork:sem.postsAndCrossbarIncluded===true,extraTime:sem.extraTimeIncluded===true,conditionalOnStart:player,
   subjectId:player?leg.playerId:team?(leg.teamId||market.subject?.id):null};
}
function familyKey(modelId,t){return JSON.stringify([modelId,t.scope,t.metric,t.period,t.duo,t.woodwork,t.extraTime,t.conditionalOnStart]);}
function eventKey(modelId,t){return JSON.stringify([familyKey(modelId,t),t.threshold,t.direction]);}
function observationIssue(row){
 if(!row.modelId||!row.fixtureId||!row.target?.metric||(['player','team'].includes(row.target.scope)&&!row.target.subjectId))return 'IDENTITY_OR_TARGET_MISSING';
 if(row.target.period!=='REGULATION')return 'PERIOD_NOT_SUPPORTED';
 const ko=Date.parse(row.kickoffAt),made=Date.parse(row.availableAt);
 if(!Number.isFinite(ko)||!Number.isFinite(made)||made>=ko||row.availabilityVerified!==true)return 'PREMATCH_AVAILABILITY_UNPROVEN';
 for(const field of ['latestInputAt','trainingThroughAt','baselineAvailableAt'])if(!Number.isFinite(Date.parse(row[field]))||Date.parse(row[field])>=ko)return 'INPUT_OR_BASELINE_LEAKAGE';
 if(!finite(row.probability)||row.probability<0||row.probability>1)return 'ORIGINAL_EVENT_PROBABILITY_MISSING';
 if(!finite(row.baselineProbability)||row.baselineProbability<0||row.baselineProbability>1)return 'PREMATCH_BASELINE_MISSING';
 if(!row.baseline||row.baseline.positives<C.thresholdPositives||row.baseline.n-row.baseline.positives<C.thresholdNegatives)return 'PREMATCH_BASELINE_SAMPLE_INSUFFICIENT';
 if(![0,1].includes(row.outcome)||row.actualVerified!==true)return 'EXACT_ACTUAL_MISSING_OR_DISPUTED';
 if(row.target.duo||row.target.woodwork||row.target.extraTime)return 'EXTENDED_CONTRACT_ACTUALS_NOT_CERTIFIED';
 if(row.phase!=='test')return 'DIAGNOSTIC_NOT_PREREGISTERED_HOLDOUT';
 if(!finite(row.outcomeAvailableAt?Date.parse(row.outcomeAvailableAt):null)||Date.parse(row.outcomeAvailableAt)<ko)return 'ACTUAL_CHRONOLOGY_UNPROVEN';
 return null;
}
function summary(rows){
 if(!rows.length)return {observations:0,matchClusters:0,brier:null,baselineBrier:null,deltaBrier:null,ece:null,logLoss:null,meanBias:null,mae:null};
 const base=rows.map(r=>({probability:r.baselineProbability,outcome:r.outcome}));
 const unique=new Map();for(const r of rows)if(finite(r.mean)&&finite(r.actualValue))unique.set(`${r.fixtureId}:${r.target.subjectId||'match'}`,r);
 const errors=[...unique.values()].map(r=>r.mean-r.actualValue),avg=a=>a.length?a.reduce((s,x)=>s+x,0)/a.length:null;
 return {observations:rows.length,matchClusters:new Set(rows.map(r=>r.fixtureId)).size,brier:round(brier(rows)),baselineBrier:round(brier(base)),deltaBrier:round(brier(rows)-brier(base)),ece:round(ece(rows)),logLoss:round(logLoss(rows)),meanBias:round(avg(errors)),mae:round(avg(errors.map(Math.abs)))};
}
function evaluateEvidence(observations){
 const excluded=[],eligible=[],seen=new Map(),conflicts=new Set();
 for(const row of observations){const issue=observationIssue(row);if(issue){excluded.push({fixtureId:row.fixtureId,eventId:row.eventId,reason:issue});continue;}
  const key=`${row.fixtureId}:${eventKey(row.modelId,row.target)}:${row.target.subjectId||''}`;
  if(seen.has(key)){const old=seen.get(key);if(old.probability!==row.probability||old.outcome!==row.outcome||old.baselineProbability!==row.baselineProbability)conflicts.add(key);else excluded.push({fixtureId:row.fixtureId,eventId:row.eventId,reason:'DUPLICATE_OBSERVATION'});}
  else seen.set(key,row);
 }
 for(const [key,row] of seen){if(conflicts.has(key))excluded.push({fixtureId:row.fixtureId,eventId:row.eventId,reason:'CONFLICTING_DUPLICATE'});else eligible.push(row);}
 const groups=new Map();for(const row of eligible){const key=familyKey(row.modelId,row.target);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(row);}
 const families=[],events=[];
 for(const [key,rows] of groups){
  const stats=summary(rows),metric=rows[0].target.metric,isCount=!!METRICS[metric],reasons=[];
  if(stats.matchClusters<C.clusters)reasons.push('INSUFFICIENT_INDEPENDENT_FIXTURES');
  if(stats.deltaBrier>C.deltaBrier)reasons.push('BRIER_NOT_WITHIN_MD7_LIMIT');
  if(stats.ece>C.ece)reasons.push('CALIBRATION_ERROR_ABOVE_MD7_LIMIT');
  if(isCount&&(!finite(stats.meanBias)||Math.abs(stats.meanBias)>METRICS[metric].biasLimit))reasons.push('BIAS_ABOVE_MD7_LIMIT_OR_UNAVAILABLE');
  const exactGroups=new Map();for(const row of rows){const ek=eventKey(row.modelId,row.target);if(!exactGroups.has(ek))exactGroups.set(ek,[]);exactGroups.get(ek).push(row);}
  const exact=[];
  for(const [ek,items] of exactGroups){const m=summary(items),positives=items.reduce((n,r)=>n+r.outcome,0),negatives=items.length-positives;
   const r=[...reasons],oneXTwo=metric==='result';
   if(positives<(oneXTwo?C.oneXTwoPositives:C.thresholdPositives)||negatives<(oneXTwo?C.oneXTwoNegatives:C.thresholdNegatives))r.push('EXACT_EVENT_CLASS_COUNTS_INSUFFICIENT');
   if(m.deltaBrier>C.thresholdDeltaBrier||m.ece>C.thresholdEce)r.push('EXACT_EVENT_ACCURACY_OR_CALIBRATION_FAILED');
   const lastActualAt=new Date(Math.max(...items.map(x=>Date.parse(x.outcomeAvailableAt)))).toISOString();
   const result={key:ek,familyKey:key,modelId:items[0].modelId,target:items[0].target,status:r.length?'FAIL':'PASS',approvable:r.length===0,reasons:r,metrics:m,positives,negatives,validatedThrough:lastActualAt,
    protocol:'PREREGISTERED_FROZEN_FORECAST_TEMPORAL_HOLDOUT',criteria:C};exact.push(result);events.push(result);
  }
  families.push({key,modelId:rows[0].modelId,metric,metrics:stats,status:exact.some(e=>e.approvable)?'PASS':'FAIL',reasons});
 }
 return {schemaVersion:1,criteria:C,eligible:eligible.length,excluded,families,events};
}
function resolveValidation(leg,registry,modelIds,kickoffAt){
 const t=targetForLeg(leg),modelId=modelIds?.[t.scope==='player'?'player':'collective'];
 const base={competition:'champions',modelId:modelId||null,eventKey:modelId?eventKey(modelId,t):null,status:'NOT_EVALUATED',approvable:false,required:'Same MD7 chronological holdout gates, exact model version and exact contract event.',reasons:[]};
 if(!registry||!modelId){base.reasons=['VALIDATION_ARTIFACT_OR_MODEL_ID_MISSING'];return base;}
 if(registry.modelIds?.[t.scope==='player'?'player':'collective']!==modelId){base.reasons=['MODEL_VERSION_MISMATCH'];return base;}
 const e=registry.events?.find(e=>e.key===base.eventKey);
 if(!e){base.status='INSUFFICIENT_HISTORY';base.reasons=['NO_ADMISSIBLE_EXACT_MODEL_EVENT_HOLDOUT'];return base;}
 if(!(Date.parse(e.validatedThrough)<Date.parse(kickoffAt))){base.reasons=['VALIDATION_OUTCOME_AFTER_TARGET_KICKOFF'];return base;}
 return {...base,...e,status:e.approvable?'VALIDATED':'NOT_VALIDATED'};
}
function prudentEvaluation(probabilityPct,validation,odds,{limitedHistory=false}={}){
 if(!validation?.approvable||!finite(probabilityPct))return {prudentProbabilityPct:null,conservativeExpectedValuePct:null,uncertaintyDeductionPp:null};
 const deduction=Math.max(0.02,Math.min(0.06,Math.max(limitedHistory?0.05:0.02,validation.metrics.ece/2)));
 const prudent=Math.max(0,Math.min(1,probabilityPct/100-deduction));
 return {prudentProbabilityPct:round(prudent*100),conservativeExpectedValuePct:finite(odds)?round((prudent*odds-1)*100):null,uncertaintyDeductionPp:round(deduction*100)};
}
module.exports={targetForLeg,familyKey,eventKey,observationIssue,summary,evaluateEvidence,resolveValidation,prudentEvaluation};
