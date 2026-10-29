'use strict';
const fs=require('node:fs'),path=require('node:path');
const {BASE,readManifest,verifyHash,verifyInputBlobs}=require('./core.cjs');
const {toKickoffUtc}=require('../predictions/snapshot-core');
const {clusterBootstrap}=require('../research/exact-score/evaluate');
const mean=a=>a.length?a.reduce((n,x)=>n+x,0)/a.length:null;
function losses(forecast,actual){
 const log=p=>Math.log(Math.max(1e-15,p)),index=actual.home>actual.away?0:actual.home===actual.away?1:2;
 let logFactorial=0;for(const y of [actual.home,actual.away])for(let i=2;i<=y;i++)logFactorial+=Math.log(i);
 const yOver=Number(actual.home+actual.away>2.5),yBtts=Number(actual.home>0&&actual.away>0),l=forecast.lambda;
 return {goalLogLoss:l.home+l.away-actual.home*log(l.home)-actual.away*log(l.away)+logFactorial,
  goalMAE:(Math.abs(l.home-actual.home)+Math.abs(l.away-actual.away))/2,outcomeLogLoss:-log(forecast.outcomes[index]),
  outcomeBrier:forecast.outcomes.reduce((n,p,i)=>n+(p-Number(i===index))**2,0),
  over25LogLoss:-(yOver*log(forecast.over25)+(1-yOver)*log(1-forecast.over25)),
  bttsLogLoss:-(yBtts*log(forecast.btts)+(1-yBtts)*log(1-forecast.btts)),
  outcomeHit:Number(forecast.outcomes.indexOf(Math.max(...forecast.outcomes))===index)};
}
function summarize(rows,key){
 const available=rows.filter(r=>r.metrics[key]);
 return {n:available.length,...Object.fromEntries(['goalLogLoss','goalMAE','outcomeLogLoss','outcomeBrier','over25LogLoss','bttsLogLoss','outcomeHit'].map(k=>[k,mean(available.map(r=>r.metrics[key][k]))]))};
}
function evaluate(root,now=new Date()){
 const read=f=>JSON.parse(fs.readFileSync(path.join(root,f),'utf8')),protocol=read(BASE+'/protocol.json');
 if(!verifyHash(protocol))throw Error('PROTOCOL_INTEGRITY_FAILED');
 const manifest=readManifest(root),fixtures=read('data/normalized/matches.json'),rows=[],pending=[],excluded=[],abstentions=[],verified=new Set();
 for(const e of manifest.entries.filter(e=>e.role==='PRIMARY')){
  const s=read(e.file),f=fixtures.find(f=>f.id===e.fixtureId);verifyInputBlobs(root,s,verified);
  if(s.protocolHash!==protocol.integrity.sha256)throw Error('PROTOCOL_MISMATCH');
  if(!f||f.homeTeam!==s.fixture.homeTeam||f.awayTeam!==s.fixture.awayTeam){excluded.push({fixtureId:e.fixtureId,reason:'CANONICAL_FIXTURE_MISMATCH'});continue;}
  if(['awarded','cancelled','abandoned'].includes(f.status)||f.resultCoverage?.awarded){excluded.push({fixtureId:e.fixtureId,reason:'NON_SPORTING_RESULT'});continue;}
  if(new Date(toKickoffUtc(f)).toISOString()!==s.fixture.kickoffUtc){excluded.push({fixtureId:e.fixtureId,reason:'SCHEDULE_CHANGED_SINCE_CAPTURE'});continue;}
  if(f.status!=='finished'||toKickoffUtc(f)>now.getTime()||!['home','away'].every(k=>Number.isInteger(f.score?.[k])&&f.score[k]>=0)){
   pending.push({fixtureId:e.fixtureId,reason:'AWAITING_CANONICAL_FINISHED_RESULT'});continue;
  }
  const actual={home:f.score.home,away:f.score.away},metrics={baseline:losses(s.baseline.forecast,actual),calibration:losses(s.calibration,actual)};
  for(const v of protocol.variants){
   if(s.models[v].status==='AVAILABLE')metrics[v]=losses(s.models[v].forecast,actual);
   else abstentions.push({fixtureId:e.fixtureId,model:v,reason:s.models[v].abstentionReason});
  }
  rows.push({fixtureId:e.fixtureId,matchId:e.fixtureId,matchday:e.matchday,cohort:e.evaluationCohort,snapshot:e.file,snapshotHash:e.sha256,
   capturedAt:e.capturedAt,lineupState:e.lineupState,actual,metrics});
 }
 const comparison=(selected)=>Object.fromEntries(protocol.variants.map(v=>{
  const common=selected.filter(r=>r.metrics[v]),delta=common.map(r=>r.metrics[v].goalLogLoss-r.metrics.calibration.goalLogLoss);
  return [v,{evaluated:common.length,abstained:selected.length-common.length,
   baseline:summarize(common,'baseline'),calibration:summarize(common,'calibration'),variant:summarize(common,v),
   deltaGoalLogLossVsCalibration:mean(delta),uncertainty:clusterBootstrap(common,a=>mean(a.map(r=>r.metrics[v].goalLogLoss-r.metrics.calibration.goalLogLoss)),
    {unit:'MATCHDAY',iterations:protocol.evaluation.bootstrapIterations,minimumClusters:protocol.evaluation.minimumIndependentMatchdays,seed:protocol.evaluation.seed})}];
 }));
 const confirmation=rows.filter(r=>r.cohort==='PROSPECTIVE_PREDECLARED'),pilot=rows.filter(r=>r.cohort==='PILOT_POST_EXPLORATORY');
 const allCommon=confirmation.filter(r=>protocol.variants.every(v=>r.metrics[v]));
 return {evaluatedAt:now.toISOString(),protocolHash:protocol.integrity.sha256,primarySnapshots:manifest.entries.filter(e=>e.role==='PRIMARY').length,
  revisionsIgnored:manifest.entries.filter(e=>e.role==='REVISION').length,baselineAbstentionSnapshots:manifest.entries.filter(e=>e.role==='ABSTENTION').length,
  prospective:{matches:confirmation.length,ownSamples:comparison(confirmation),commonSample:{matches:allCommon.length,comparisons:comparison(allCommon)}},
  pilot:{matches:pilot.length,comparisons:comparison(pilot)},pending,excluded,abstentions,rows,
  roi:null,certifiedProviderSettlement:false,productionWeightsChanged:false};
}
function evaluateToFile(root,now=new Date()){
 const result=evaluate(root,now),dir=path.join(root,'data/analysis/spatial-prospective');fs.mkdirSync(dir,{recursive:true});
 fs.writeFileSync(path.join(dir,'latest.json'),JSON.stringify(result,null,2)+'\n');
 return result;
}
function main(){
 const result=evaluateToFile(path.resolve(__dirname,'../..'));
 console.log(JSON.stringify({primarySnapshots:result.primarySnapshots,prospectiveMatches:result.prospective.matches,pilotMatches:result.pilot.matches,pending:result.pending,roi:null},null,2));
}
module.exports={evaluate,evaluateToFile,losses,summarize};if(require.main===module)try{main();}catch(e){console.error(e.message);process.exitCode=1;}
