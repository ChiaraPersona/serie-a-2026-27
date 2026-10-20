'use strict';
// Existing Serie A count engine, run on Champions observations as a diagnostic
// comparator. This is not a replay of the different production MD3 algorithm.
const {numericThreshold}=require('./event-validation.cjs');
const {forecastMean,dispersionSize,probabilities,validateSubfamily,MARKET_MODELS}=require('../md06-statistical-models');
function replayHistoricalCounts(matches,odds){
 const fields={shots:'totalShots',sot:'shotsOnTarget',corners:'wonCorners'};
 const observations=matches.filter(m=>m.league==='uefa.champions'&&m.season==='2025-26'&&['home','away'].every(s=>Object.values(fields).every(k=>typeof m[s].statistics?.[k]==='number'))).map(m=>({id:m.eventId,date:m.date,homeTeam:m.home.providerTeamId,awayTeam:m.away.providerTeamId,metrics:Object.fromEntries(Object.entries(fields).map(([family,key])=>[family,{home:m.home.statistics[key],away:m.away.statistics[key]}]))})).sort((a,b)=>a.date.localeCompare(b.date)||a.id.localeCompare(b.id));
 const cut=Math.floor(observations.length/2),training=observations.slice(0,cut),test=observations.slice(cut),forecasts=Object.fromEntries(Object.keys(fields).map(k=>[k,[]])),rows=[];
 for(const match of test){const history=observations.filter(m=>m.date<match.date);for(const family of Object.keys(fields)){
  const size=dispersionSize(training,family),mean=forecastMean(history,family,match.homeTeam,match.awayTeam);
  const forecast={fixtureId:match.id,date:match.date,mean,model:probabilities(mean,size,family),baseline:probabilities({home:mean.baselineHome,away:mean.baselineAway},size,family),actual:match.metrics[family]};
  forecasts[family].push(forecast);
  rows.push({fixtureId:match.id,date:match.date,family,latestInputEventDate:history.at(-1)?.date||null,mean,actual:match.metrics[family],featureAvailabilityVerified:false});
 }}
 const subfamilies={};
 for(const [code,definition] of Object.entries(MARKET_MODELS)){
  const thresholds=[...new Set(odds.events.flatMap(e=>e.markets.filter(m=>String(m.marketCode)===code).map(m=>numericThreshold(m.threshold))).filter(x=>x!==null))];
  const result=validateSubfamily({definition,marketCode:code,thresholds,forecasts:forecasts[definition.family]});
  subfamilies[definition.subfamily]=result.probabilityObservations?{...result,status:'DIAGNOSTIC_TESTED'}:{...result,status:'NOT_EVALUATED_NO_EXACT_THRESHOLD_GRID',gate:'NOT_EVALUATED',deltaBrier:null,ece:null};
 }
 return {schemaVersion:1,status:'DIAGNOSTIC_ONLY_NOT_PRODUCTION_MD3',approvable:false,model:'SHARED_MD7_COUNT_ENGINE_COMPARATOR',trainingMatches:training.length,testMatches:test.length,independentFixtures:test.length,
 protocol:'FIRST_HALF_TRAIN_FIXED_DISPERSION_THEN_EVENT_DATE_WALK_FORWARD_STRICTLY_BEFORE_TARGET_DATE',chronologyLimitation:'Historical event dates are ordered; no historical as-of receipt proves availability of every feature. Not admitted by the prospective validation gate.',thresholdLimitation:'Current provider threshold grid used for diagnostic comparison, not selected on test performance and not a preregistered 2025/26 portfolio.',subfamilies,rows};
}
module.exports={replayHistoricalCounts};
