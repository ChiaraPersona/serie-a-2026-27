'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {sequence}=require('./european-rating-model.cjs');
const {domesticFeatures,countryFeature,estimateInitialPrior,ratingProbabilities}=require('../champions/elo-initial-prior.cjs');
const root=path.resolve(__dirname,'../..'),read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const digest=v=>crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex');
function probability(home,away,p){const r=ratingProbabilities(home,away,p);return [r.home,r.draw,r.away];}
function metrics(rows,params,modelParams){
 const scored=rows.map(r=>{
  const ratings=r.sides.map(s=>params?estimateInitialPrior({...s,parameters:params}).rating:s.raw),p=probability(...ratings,modelParams);
  const y=r.match.score90.home>r.match.score90.away?0:r.match.score90.home===r.match.score90.away?1:2;
  return {logLoss:-Math.log(Math.max(1e-12,p[y])),brier:p.reduce((n,v,i)=>n+(v-Number(i===y))**2,0)};
 });
 return {fixtures:rows.length,logLoss:rows.length?scored.reduce((n,r)=>n+r.logLoss,0)/rows.length:null,brier:rows.length?scored.reduce((n,r)=>n+r.brier,0)/rows.length:null};
}
function run(){
 const inputs=['data/normalized/champions-elo-prior-domestic.json','data/normalized/uefa-europe-history-2023-26.json','data/sources/champions-european-result-policy.json'];
 const domestic=read(inputs[0]),history=read(inputs[1]).matches,p=read(inputs[2]).parameters;
 const dir=path.join(root,'data/analysis/champions/elo-initial-prior-2026-11-14');fs.mkdirSync(dir,{recursive:true});
 const save=(name,d)=>fs.writeFileSync(path.join(dir,name),JSON.stringify(d,null,2)+'\n');
 const configurations=[];for(const countryScale of [0,.5,1])for(const ppgScale of [0,50,100])for(const goalDifferenceScale of [0,50,100])configurations.push({countryScale,ppgScale,goalDifferenceScale});
 save('protocol.json',{generatedAt:new Date().toISOString(),train:'Actual covered sparse histories 2024-25',diagnosticValidation:'Actual covered sparse histories 2025-26, plus separately reported simulated cold starts of established clubs 2025-26; simulated cases are not true European newcomers.',selection:'Lowest training cold-start log loss; then Brier; deterministic grid order. Diagnostic season never selects parameters.',configurations,minimumDomesticGames:4,minimumEuropeanAppearances:6,priorWeight:'(6-EuropeanAppearances)/6 below six, zero thereafter',countryStrength:'Mean Elo of other observed clubs in the association with at least six European appearances; no club or result counted twice.',cohort:'Actual sparse European histories in exact-ID crosswalk, with domestic and country evidence for each sparse side. Established sides use unchanged Elo.',availability:'Retrospective acquisition; match-date ordering checked, original historical availability is not proven.',statisticallyValidated:false,inputHashes:Object.fromEntries(inputs.map(p=>[p,crypto.createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex')]))});
 const baseline=sequence(history,p).predictions,stateCache=new Map(),rows=[];
 for(const r of baseline.filter(r=>['2024-25','2025-26'].includes(r.match.season)&&Math.min(r.features.home.appearances,r.features.away.appearances)<6)){
  const date=r.match.date;if(!stateCache.has(date))stateCache.set(date,sequence(history.filter(m=>m.date<date),p).state);
  const state=stateCache.get(date),sides=['home','away'].map(side=>{
   const team=r.match[side+'Team'],f=r.features[side];
   return {teamId:team.id,raw:f.raw,appearances:f.appearances,domestic:f.appearances<6?domesticFeatures(domestic,team.id,date,date+'T00:00:00Z',{retrospective:true}):null,country:f.appearances<6?countryFeature(state,team,date):null};
  });
  rows.push({match:r.match,sides,supported:sides.every(s=>s.appearances>=6||s.domestic&&s.country)});
 }
 const train=rows.filter(r=>r.supported&&r.match.season==='2024-25'),validation=rows.filter(r=>r.supported&&r.match.season==='2025-26');assert(train.length,'Insufficient historical evidence; do not invent prior weights');
 const candidates=configurations.map((parameters,index)=>({parameters,index,metrics:metrics(train,parameters,p)})).sort((a,b)=>a.metrics.logLoss-b.metrics.logLoss||a.metrics.brier-b.metrics.brier||a.index-b.index);
 const selected=candidates[0];save('selected-before-diagnostic.json',{...selected,cohortFixtureIds:train.map(r=>r.match.id),selectionDoesNotUse2025_26:true});
 const simulated=[];
 for(const id of Object.keys(domestic.identities)){
  const games=baseline.filter(r=>r.match.season==='2025-26'&&[r.match.homeTeam.id,r.match.awayTeam.id].includes(id));
  if(!games.length)continue;
  const firstSide=games[0].match.homeTeam.id===id?'home':'away';if(games[0].features[firstSide].appearances<6)continue;
  let raw=1500,n=0;
  for(const r of games.slice(0,6)){
   const date=r.match.date;if(!stateCache.has(date))stateCache.set(date,sequence(history.filter(m=>m.date<date),p).state);
   const state=stateCache.get(date),side=r.match.homeTeam.id===id?'home':'away',opposite=side==='home'?'away':'home';
   const sides=['home','away'].map(s=>{const team=r.match[s+'Team'],own=s===side,appearances=own?n:r.features[s].appearances;return {teamId:team.id,raw:own?raw:r.features[s].raw,appearances,domestic:appearances<6?domesticFeatures(domestic,team.id,date,date+'T00:00:00Z',{retrospective:true}):null,country:appearances<6?countryFeature(state,team,date):null};});
   if(sides.every(s=>s.appearances>=6||s.domestic&&s.country))simulated.push({match:r.match,sides,supported:true,simulatedColdStart:true,resetTeamId:id});
   const prob=side==='home'?probability(raw,r.features[opposite].raw,p):probability(r.features[opposite].raw,raw,p);
   const win=r.match.score90[side]>r.match.score90[opposite]?1:r.match.score90[side]===r.match.score90[opposite]?.5:0;
   raw+=p.kFactor*(win-(side==='home'?prob[0]:prob[2])-.5*prob[1]);n++;
  }
 }
 const report={schemaVersion:1,generatedAt:new Date().toISOString(),training:{baseline:metrics(train,null,p),candidate:selected.metrics},diagnosticValidation:{baseline:metrics(validation,null,p),candidate:metrics(validation,selected.parameters,p)},simulated2025_26:{baseline:metrics(simulated,null,p),candidate:metrics(simulated,selected.parameters,p),uniqueFixtures:new Set(simulated.map(r=>r.match.id)).size,semantics:'Reset each established club separately; paired scenarios are dependent and are not additional independent fixtures.'},availableColdStartFixtures:rows.length,supported:rows.filter(r=>r.supported).length,unsupported:rows.filter(r=>!r.supported).length,parameters:selected.parameters,statisticallyValidated:false,limits:['Retrospective archives do not prove pre-match acquisition availability','Only exact crosswalk teams and covered domestic calendars','Country proxy may have one representative, especially Azerbaijan','No covered actual 2025/26 newcomers if diagnosticValidation.fixtures=0; simulated resets cannot replace that validation','2025/26 has already been inspected in earlier research; diagnostic, not a pristine holdout']};
 report.modelId='champions-elo-initial-prior:'+digest({parameters:selected.parameters,code:fs.readFileSync(path.join(root,'scripts/champions/elo-initial-prior.cjs'),'utf8'),protocol:read('data/analysis/champions/elo-initial-prior-2026-11-14/protocol.json')});
 save('report.json',report);save('cohort.json',rows);save('simulated-diagnostic-cohort.json',simulated);
 fs.writeFileSync(path.join(root,'data/normalized/champions-elo-initial-prior-model.json'),JSON.stringify({schemaVersion:1,modelId:report.modelId,trainedAt:report.generatedAt,parameters:selected.parameters,minimumDomesticGames:4,minimumEuropeanAppearances:6,statisticallyValidated:false,report:'data/analysis/champions/elo-initial-prior-2026-11-14/report.json'},null,2)+'\n');
 console.log(JSON.stringify(report));return report;
}
if(require.main===module)run();module.exports={run,probability,metrics};
