'use strict';
const {spatialMatchup,zones}=require('../../shot-events/matchup.cjs');
const {scoreMatrix}=require('../../predictions/engine');
const {clusterBootstrap}=require('../exact-score/evaluate');
const {selectHistoryPolicy,publicContinuity}=require('../../shot-events/technical-context.cjs');
const sum=a=>a.reduce((x,y)=>x+y,0),mean=a=>a.length?sum(a)/a.length:null;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const CONFIG=Object.freeze({version:'spatial-shape-pilot-v1',developmentMatchdays:[6,7],holdoutMatchdays:[8,9],
 minimumHistoryMatches:5,sharePriorShots:20,conversionPriorShots:20,maximumSignal:Math.log(1.25),
 ridgeAlpha:1,ridgeBeta:1,maximumAlpha:.25,maximumBeta:1,minimumTrainingMatches:8,
 bootstrapIterations:5000,minimumBootstrapMatchdays:6,seed:20261029});
function currentReport(m,f){return m?.usable&&m.fixtureId===f.id&&m.date===f.date&&m.homeTeam===f.homeTeam&&m.awayTeam===f.awayTeam&&
 ['home','away'].every(side=>{const s=m.sides.find(s=>s.teamId===f[side+'Team']);return s&&s.expectedGoals===f.score?.[side]&&s.canonicalShots===f.teamStats?.[side]?.shots;});}
function makeFeatures(target,fixtures,dataset,config=CONFIG,availableAtDate=null,technicalDataset=null){
 const roundDates=fixtures.filter(f=>f.matchday===target.matchday).map(f=>f.date).filter(Boolean).sort();
 const cutoff=[roundDates[0],availableAtDate].filter(Boolean).sort()[0];
 if(!cutoff||!target.date)return {available:false,reason:'MISSING_DATE'};
 const history=fixtures.filter(f=>f.competition==='serie-a'&&f.season==='2026-27'&&f.status==='finished'&&f.matchday<target.matchday&&f.date<cutoff&&f.id!==target.id);
 const index=new Map(dataset.matches.map(m=>[m.fixtureId,m]));
 const reports=history.map(f=>({f,m:index.get(f.id)})).filter(({f,m})=>currentReport(m,f)).map(({m})=>m);
 // Pass target metadata only: target scores and statistics cannot reach the feature extractor.
 const spatial=spatialMatchup({id:target.id,date:cutoff,homeTeam:target.homeTeam,awayTeam:target.awayTeam},history,dataset);
 let continuity=null;
 if(config.historyVariant){
  const selections=spatial.teams.map(team=>selectHistoryPolicy(team.teamId,reports.filter(r=>[r.homeTeam,r.awayTeam].includes(team.teamId)),cutoff,technicalDataset,
   config.historyVariant,{matchdayExclusive:target.matchday}));
  continuity={variant:config.historyVariant,teams:selections.map(s=>publicContinuity(s.context))};
  if(selections.some(s=>!s.available))return {available:false,reason:'UNKNOWN_HEAD_COACH',cutoffExclusive:cutoff,continuity};
  for(const [i,selection]of selections.entries()){
   const team=spatial.teams[i],weights=new Map(selection.weights.map(r=>[r.fixtureId,r.weight]));
   const selectedEvents=selection.selected.flatMap(r=>r.events.map(e=>({...e,historyWeight:weights.get(r.fixtureId)}))).filter(e=>e.usable&&!e.penalty&&!e.ownGoal);
   team.matches=selection.selected.length;team.fixtureIds=selection.selected.map(r=>r.fixtureId);team.historyWeights=selection.weights;team.effectiveMatches=selection.effectiveMatches;
   for(const role of ['for','against']){
    const shots=selectedEvents.filter(e=>role==='for'?e.teamId===team.teamId:e.teamId!==team.teamId);
    team[role].mappedShots=sum(shots.map(e=>e.historyWeight));
    team[role].zones=zones.map(([key,label])=>({key,label,shots:sum(shots.filter(e=>e.zone===key).map(e=>e.historyWeight)),goals:sum(shots.filter(e=>e.zone===key&&e.isGoal).map(e=>e.historyWeight))}));
   }
  }
 }
 if(spatial.teams.some(t=>t.matches<config.minimumHistoryMatches))return {available:false,reason:'INSUFFICIENT_PRIOR_MATCHES',
  cutoffExclusive:cutoff,samples:spatial.teams.map(t=>({teamId:t.teamId,matches:t.matches})),...(continuity?{continuity}:{})};
 const events=reports.flatMap(m=>m.events).filter(e=>e.usable&&!e.ownGoal&&!e.penalty);
 if(!events.length)return {available:false,reason:'NO_LEAGUE_SHOT_HISTORY'};
 const conversion=events.filter(e=>e.isGoal).length/events.length;
 if(!(conversion>0))return {available:false,reason:'NO_LEAGUE_CONVERSION_ESTIMATE'};
 const league=zones.map(([key])=>{const rows=events.filter(e=>e.zone===key);return {key,shots:rows.length,goals:rows.filter(e=>e.isGoal).length,
  share:rows.length/events.length,conversion:(rows.filter(e=>e.isGoal).length+config.conversionPriorShots*conversion)/(rows.length+config.conversionPriorShots)};});
 const sides=spatial.directions.map(d=>{
  const attack=spatial.teams.find(t=>t.teamId===d.attackingTeamId),defence=spatial.teams.find(t=>t.teamId===d.defendingTeamId);
  const rows=league.filter(z=>z.share>0).map(z=>{
   const a=attack.for.zones.find(r=>r.key===z.key).shots,b=defence.against.zones.find(r=>r.key===z.key).shots;
   const attackShare=(a+config.sharePriorShots*z.share)/(attack.for.mappedShots+config.sharePriorShots);
   const defensiveShare=(b+config.sharePriorShots*z.share)/(defence.against.mappedShots+config.sharePriorShots);
   return {...z,attackShare,defensiveShare,mixedWeight:attackShare*defensiveShare/z.share};
  });
  const weight=sum(rows.map(z=>z.mixedWeight)),reference=sum(rows.map(z=>z.attackShare*z.conversion));
  const mixed=sum(rows.map(z=>z.mixedWeight/weight*z.conversion));
  return {teamId:attack.teamId,opponentId:defence.teamId,signal:clamp(Math.log(mixed/reference),-config.maximumSignal,config.maximumSignal),
   referenceConversion:reference,matchedConversion:mixed,attackMatches:attack.matches,defenceMatches:defence.matches,rows};
 });
 return {available:true,cutoffExclusive:cutoff,matchdayExclusive:target.matchday,targetMatchIdExcluded:target.id,
  historyFixtureIds:reports.map(m=>m.fixtureId),teamHistory:spatial.teams.map(t=>({teamId:t.teamId,fixtureIds:t.fixtureIds,matches:t.matches,
   mappedShotsFor:t.for.mappedShots,mappedShotsAgainst:t.against.mappedShots,excludedMatches:t.excludedMatches,
   ...(continuity?{historyWeights:t.historyWeights,effectiveMatches:t.effectiveMatches}:{})})),
  leagueShots:events.length,leagueGoals:events.filter(e=>e.isGoal).length,league,sides,xg:null,
  originalPrematchAvailabilityProven:false,...(continuity?{continuity}:{})};
}
function observations(rows){return rows.flatMap(r=>['home','away'].map((side,i)=>({lambda:r.baseline.lambda[side],signal:r.features.sides[i].signal,y:r.actual[side]})));}
function fit(rows,spatial,config=CONFIG){
 if(rows.length<config.minimumTrainingMatches)return null;
 const obs=observations(rows);let alpha=0,beta=0,iterations=0;
 for(;iterations<100;iterations++){
  let ga=config.ridgeAlpha*alpha,gb=config.ridgeBeta*beta,aa=config.ridgeAlpha,ab=0,bb=config.ridgeBeta;
  for(const o of obs){const s=spatial?o.signal:0,mu=o.lambda*Math.exp(alpha+beta*s);ga+=mu-o.y;gb+=(mu-o.y)*s;aa+=mu;ab+=mu*s;bb+=mu*s*s;}
  const det=aa*bb-ab*ab,da=(ga*bb-gb*ab)/det,db=spatial?(gb*aa-ga*ab)/det:0;
  const na=clamp(alpha-da,-config.maximumAlpha,config.maximumAlpha),nb=spatial?clamp(beta-db,-config.maximumBeta,config.maximumBeta):0;
  const delta=Math.max(Math.abs(alpha-na),Math.abs(beta-nb));alpha=na;beta=nb;if(delta<1e-10)break;
 }
 return {alpha,beta,iterations:iterations+1,trainingFixtureIds:rows.map(r=>r.fixtureId),trainingMatchdays:[...new Set(rows.map(r=>r.matchday))].sort(),
  latestTrainingDate:rows.map(r=>r.date).sort().at(-1),spatial};
}
function predict(row,parameters){return Object.fromEntries(['home','away'].map((side,i)=>[side,row.baseline.lambda[side]*Math.exp((parameters?.alpha||0)+(parameters?.beta||0)*row.features.sides[i].signal)]));}
const safeLog=p=>Math.log(Math.max(1e-15,p));
function score(row,lambda){
 const cells=scoreMatrix(lambda.home,lambda.away,7),outcomes=[sum(cells.filter(s=>s.home>s.away).map(s=>s.probability)),
  sum(cells.filter(s=>s.home===s.away).map(s=>s.probability)),sum(cells.filter(s=>s.home<s.away).map(s=>s.probability))];
 const actualIndex=row.actual.home>row.actual.away?0:row.actual.home===row.actual.away?1:2;
 const over=sum(cells.filter(s=>s.home+s.away>2.5).map(s=>s.probability)),btts=sum(cells.filter(s=>s.home>0&&s.away>0).map(s=>s.probability));
 const total=row.actual.home+row.actual.away,yOver=Number(total>2.5),yBtts=Number(row.actual.home>0&&row.actual.away>0);
 let factorial=0;for(const y of [row.actual.home,row.actual.away])for(let j=2;j<=y;j++)factorial+=Math.log(j);
 return {lambda,outcomes,over25:over,btts,metrics:{goalLogLoss:lambda.home+lambda.away-row.actual.home*safeLog(lambda.home)-row.actual.away*safeLog(lambda.away)+factorial,
  goalMAE:(Math.abs(lambda.home-row.actual.home)+Math.abs(lambda.away-row.actual.away))/2,
  outcomeLogLoss:-safeLog(outcomes[actualIndex]),outcomeBrier:sum(outcomes.map((p,i)=>(p-Number(i===actualIndex))**2)),
  over25LogLoss:-(yOver*safeLog(over)+(1-yOver)*safeLog(1-over)),over25Brier:(over-yOver)**2,
  bttsLogLoss:-(yBtts*safeLog(btts)+(1-yBtts)*safeLog(1-btts)),bttsBrier:(btts-yBtts)**2,
  outcomeHit:Number(outcomes.indexOf(Math.max(...outcomes))===actualIndex)}};
}
function summarize(rows,model){
 const valid=rows.filter(r=>r.forecasts?.[model]);
 return {n:valid.length,...Object.fromEntries(['goalLogLoss','goalMAE','outcomeLogLoss','outcomeBrier','over25LogLoss','over25Brier','bttsLogLoss','bttsBrier','outcomeHit'].map(k=>[k,mean(valid.map(r=>r.forecasts[model].metrics[k]))]))};
}
function compare(rows,config=CONFIG){
 const models=['baseline','calibration','spatial'],metrics=Object.fromEntries(models.map(m=>[m,summarize(rows,m)]));
 const delta=control=>({goalLogLoss:metrics.spatial.goalLogLoss-metrics[control].goalLogLoss,
  outcomeLogLoss:metrics.spatial.outcomeLogLoss-metrics[control].outcomeLogLoss,over25LogLoss:metrics.spatial.over25LogLoss-metrics[control].over25LogLoss,
  bttsLogLoss:metrics.spatial.bttsLogLoss-metrics[control].bttsLogLoss});
 const statistic=a=>mean(a.map(r=>r.forecasts.spatial.metrics.goalLogLoss-r.forecasts.calibration.metrics.goalLogLoss));
 return {metrics,deltaSpatialVsBaseline:rows.length?delta('baseline'):null,deltaSpatialVsCalibration:rows.length?delta('calibration'):null,
  uncertainty:{byMatchday:clusterBootstrap(rows,statistic,{unit:'MATCHDAY',iterations:config.bootstrapIterations,minimumClusters:config.minimumBootstrapMatchdays,seed:config.seed}),
   byFixtureExploratory:clusterBootstrap(rows,statistic,{unit:'MATCH',iterations:config.bootstrapIterations,minimumClusters:8,seed:config.seed})}};
}
module.exports={CONFIG,makeFeatures,fit,predict,score,summarize,compare,currentReport};
