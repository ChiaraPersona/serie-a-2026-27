'use strict';
// Selection contracts only: never fit or replace a frozen forecast.
const {buildMatchScenario,classifySelectionScenario,scorePredicateForLeg,pairRelation}=require('../md06-scenario-coherence');
const {selectMatchSuggestions}=require('../md06-suggested-forecasts');
const {scoreMatrix,sensitivityMatrices,matrixProbability}=require('../predictions/engine');
const {resolveValidation,prudentEvaluation}=require('./event-validation.cjs');
const {zonedLocalToUtc}=require('./complete-forecast-snapshots');
const finite=v=>v!==null&&v!==undefined&&Number.isFinite(v);
const round=v=>Number(v.toFixed(4));

function validationFor(leg,evidence,fixture){
 const family=leg.suggestionAnalysis.family,player=leg.marketScope==='player';
 const volume=player||/shots|sot|corners/.test(family);
 const metric=/sot/.test(family)?'shotsOnTarget':/corners/.test(family)?'wonCorners':'totalShots';
 const resolved=resolveValidation(leg,evidence.validationRegistry,evidence.modelIds,fixture?zonedLocalToUtc(fixture.date,fixture.kickoff,'Europe/Rome'):null);
 return {...resolved,family,
  evidence:volume&&!player?evidence.pilot.metrics[metric]||null:null,
  evidenceScope:player?'NO_PLAYER_EVENT_TEMPORAL_HOLDOUT':volume?'DOMESTIC_WALK_FORWARD_NOT_MD3_MODEL':'UEFA_ELO_NOT_FITTED_POISSON_OR_DERIVED_MARKETS',
  required:volume?'Temporal holdout for this Champions model and exact event: clusters>=180, deltaBrier<=0.005, ECE<=0.08, absolute bias<=2.5 shots / 1.25 SOT or corners; exact threshold >=30 positive and >=30 negative outcomes, deltaBrier<=0.015, ECE<=0.10 (existing V2 gates).'
   :'Chronological out-of-sample event predictions from this frozen MD3 model, outcomes, calibration and sensitivity coverage; the UEFA Elo backtest does not validate its Poisson conversion.',
  modelCalibrationStatus:evidence.preview.calibrationStatus,
  evidencePaths:volume?['data/normalized/champions-pilot-volume-backtest.json','data/analysis/champions/model-calibration-audit-2026-10-11.json']:['data/generated/uefa-1x2-backtest.json'],
  calibrationGate:player?evidence.calibration?.gate?.value||null:null};
}

function evaluateRequirements(legs,fixture,individualFixture,evidence){
 const f=fixture.forecast;
 const scenario=buildMatchScenario({...f,matchId:fixture.fixtureId,probabilities:{final:{'1':f.probabilities.home,X:f.probabilities.draw,'2':f.probabilities.away}}});
 if(Math.abs(scenario.probabilitySumPct-100)>0.11)throw Error('Invalid frozen 1X2 sum');
 const matrices=finite(f.expectedGoals?.home)&&finite(f.expectedGoals?.away)?sensitivityMatrices(f.expectedGoals,scoreMatrix(f.expectedGoals.home,f.expectedGoals.away,7,null),null):null;
 return legs.map(original=>{
  const leg=structuredClone(original),evaluation=leg.betSelection.evaluation;
  const family=leg.suggestionAnalysis.family,player=leg.marketScope==='player';
  const team=(f.teamProjections||[]).find(t=>t.teamId===(leg.teamId||leg.betSelection.market.subject?.id));
  const iteam=individualFixture?.teams.find(t=>t.teamId===leg.teamId);
  const p=iteam?.players.find(p=>p.playerId===leg.playerId);
  const validation=validationFor(leg,evidence,fixture),missing=[],contradictions=[];
  const check=(condition,reason)=>{if(!condition)contradictions.push(reason);};
  if(player){
   if(!p)missing.push('CANONICAL_PLAYER_EVIDENCE_MISSING');
   else{
    check(p.projectedRole==='starter'&&['probable-starter','official-starter'].includes(p.availability),'NOT_PROBABLE_STARTER');
    if(!finite(p.expectedMinutes))missing.push('EXPECTED_MINUTES_MISSING');else check(p.expectedMinutes>0&&p.expectedMinutes<=90,'INVALID_EXPECTED_MINUTES');
    if(!finite(p.projectedShots)||!finite(p.projectedSOT))missing.push('PLAYER_VOLUMES_MISSING');
    else{check(p.projectedShots>=p.projectedSOT,'PLAYER_SOT_EXCEED_SHOTS');if(team){check(p.projectedShots<=team.shotsTotal.central,'PLAYER_SHOTS_EXCEED_TEAM');check(p.projectedSOT<=team.shotsOnTarget.central,'PLAYER_SOT_EXCEED_TEAM');}else missing.push('TEAM_VOLUMES_MISSING');}
    for(const [keys,name] of [[['shotsOver05','shotsOver15','shotsOver25'],'SHOTS'],[['sotOver05','sotOver15'],'SOT']]){
     const values=keys.map(k=>p.eventProbabilities?.[k]);
     if(values.every(finite))check(values.every((v,i)=>v>=0&&v<=1&&(!i||v<=values[i-1])),`${name}_THRESHOLD_PROBABILITIES_INCOHERENT`);
     else missing.push(`${name}_THRESHOLD_DISTRIBUTION_MISSING`);
    }
    if(finite(p.startingProbability))check(p.startingProbability>=0&&p.startingProbability<=1,'INVALID_STARTING_PROBABILITY');
    else missing.push('STARTING_PROBABILITY_NOT_ESTIMATED');
    missing.push('PLAYER_TEAM_JOINT_ALLOCATION_NOT_VALIDATED');
   }
  }
  for(const t of f.teamProjections||[]){
   if(finite(t.shotsTotal?.central)&&finite(t.shotsOnTarget?.central))check(t.shotsTotal.central>=t.shotsOnTarget.central,'TEAM_SOT_EXCEED_SHOTS');
  }
  const predicate=scorePredicateForLeg(leg);
  if(!predicate&&!player&&!validation.approvable)missing.push('NO_VALIDATED_MARGINAL_DISTRIBUTION_FOR_VOLUME');
  if(!finite(evaluation.modelProbabilityPct))missing.push('EVENT_PROBABILITY_MISSING');
  else check(evaluation.modelProbabilityPct>=0&&evaluation.modelProbabilityPct<=100,'INVALID_EVENT_PROBABILITY');
  let analysis=classifySelectionScenario(leg,scenario);
  const status=contradictions.length?'CONTRADICTORY':missing.length?'UNVERIFIABLE':'VERIFIED';
  if(status!=='VERIFIED')analysis={...analysis,classification:'NOT_DETERMINABLE'};
  leg.scenarioAnalysis={...analysis,status,checks:{contradictions,missing},conditionalOnProbableStart:player};
  const sample=p?.minutesEstimate?.sample||null;
  const samples=f.dataQuality?.teamSamples||[];
  const reliabilityMissing=player?[...missing,...(p?.baseline?.status==='diagnostic-rate-only'?['BASELINE_DIAGNOSTIC_ONLY']:[])]:samples.length===2&&samples.every(n=>finite(n)&&n>0)?['CHAMPIONS_MODEL_OUT_OF_SAMPLE_STABILITY_MISSING']:['TEAM_SAMPLE_MISSING'];
  // No completeness score or starting probability is imputed. Bassa describes
  // observed but unvalidated evidence, never a positive coverage assessment.
  const level=contradictions.length||(player?(!sample||!finite(p?.historicalMinutes)):samples.length!==2||!samples.every(n=>finite(n)&&n>0))?'Non valutabile':'Bassa';
  leg.betSelection.operational.reliability={level,status:level==='Bassa'?'LIMITED_EVIDENCE':'UNASSESSABLE',reason:'Unvalidated competition-specific stability; no positive reliability inferred from coverage.',evidence:{teamSamples:samples,currentSeasonSamples:f.dataQuality?.currentSeasonSamples||null,minuteSample:sample?{exactStarterAppearances:sample.exactStarterAppearances,competitionScope:sample.competitionScope}:null,historicalMinutes:p?.historicalMinutes??null,expectedMinutes:p?.expectedMinutes??null,startingProbability:p?.startingProbability??null,role:p?.role??null,baselineStatus:p?.baselineStatus??null,opponentInputs:team?.shotsTotal?.inputs||null},missing:reliabilityMissing};
  let sensitivity=null;
  if(predicate&&matrices&&finite(evaluation.modelProbabilityPct)){
   const values=matrices.map(m=>matrixProbability(m,predicate.predicate)*100);
   sensitivity={method:'V2_SCORE_MATRIX_FOUR_LAMBDA_PERTURBATIONS_10_PERCENT',probabilitiesPct:values.map(round),minimumPct:round(Math.min(evaluation.modelProbabilityPct,...values)),centralModelDifferencePct:round(values[0]-evaluation.modelProbabilityPct),validated:false};
  }
  const prudent=prudentEvaluation(evaluation.modelProbabilityPct,validation,leg.betSelection.quote?.decimal,{limitedHistory:player});
  Object.assign(evaluation,prudent);
  if(validation.approvable){
    if(/shots|sot|corners/.test(family))evaluation.kind='DISCRETE_COUNT_TEMPORAL_HOLDOUT';
    leg.betSelection.operational.reliability={...leg.betSelection.operational.reliability,level:player?'Bassa':'Media',status:'VALIDATED_TEMPORAL_HOLDOUT',reason:'Exact model/event passed the shared temporal holdout gates.'};
  }
  evaluation.uncertainty={status:validation.approvable?'VALIDATED_MD7_PRUDENTIAL_DEDUCTION':'SENSITIVITY_ONLY_NOT_CALIBRATED',sensitivity,blocker:validation.approvable?null:validation.required};
  evaluation.probabilitySemantics=player?'CONDITIONAL_ON_PROBABLE_START':'ABSOLUTE_EVENT';
  evaluation.validation=validation;
  // Set targets for the unchanged V2 deduplication/threshold selector.
  const target=family==='result'?`1x2:${leg.selection}`:family==='double-chance'?`double-chance:${leg.selection}`:family==='goals'?`goals:${String(leg.selection).toLowerCase()}:${leg.betSelection.market.threshold}`:null;
  if(target)leg.betSelection.compatibility.modelTarget=target;
  return leg;
 });
}

function selectRequirements(legs){
 const result=selectMatchSuggestions({selections:legs.filter(l=>!l.approvedPreliminary)});
 const locked=legs.filter(l=>l.approvedPreliminary);
 return legs.map(leg=>{
  if(leg.approvedPreliminary)return {...leg,selectionStatus:'APPROVED'};
  const selected=result.selections.find(l=>l.selectionId===leg.selectionId);
  const conflict=selected.suggestionAnalysis.suggested&&locked.find(other=>['MUTUALLY_EXCLUSIVE','EQUIVALENT_OVERLAP','LOGICAL_IMPLICATION'].includes(pairRelation(selected,other).type));
  const reasons=[...selected.suggestionAnalysis.reasons];
  if(!leg.betSelection.evaluation.validation.approvable)reasons.push('CHAMPIONS_EVENT_MODEL_NOT_VALIDATED');
  if(conflict)reasons.push('CONFLICT_WITH_LOCKED_APPROVED_SELECTION');
  const qualified=selected.suggestionAnalysis.suggested&&!conflict&&leg.betSelection.evaluation.validation.approvable;
  return {...leg,selectionStatus:qualified?'SELECTED':'WATCH',qualifiedSelection:qualified,
   suggestionAnalysis:{...selected.suggestionAnalysis,family:leg.suggestionAnalysis.family,selectorFamily:selected.suggestionAnalysis.family,suggested:qualified||leg.suggestionAnalysis.suggested,preliminaryRetained:!!leg.suggestionAnalysis.suggested,reasons:[...new Set(reasons)],quoteAvailability:leg.betSelection.quote.availability},
   betSelection:{...leg.betSelection,operational:{...leg.betSelection.operational,classification:qualified?'SELEZIONATA':leg.betSelection.operational.classification}}};
 });
}
module.exports={validationFor,evaluateRequirements,selectRequirements};
