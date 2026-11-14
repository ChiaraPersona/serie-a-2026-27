'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {sequence,predict}=require('../research/european-rating-model.cjs');
const {zonedLocalToUtc}=require('./complete-forecast-snapshots');
const {buildMatchScenario,classifySelectionScenario}=require('../md06-scenario-coherence');
const {verifiedQuote,minimumSportsSupportPct}=require('../md06-suggested-forecasts');
const root=path.resolve(__dirname,'../..'),policyPath='data/sources/champions-european-result-policy.json';
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex');
const digest=v=>crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex');
const isFuture=(f,asOf)=>f.status==='scheduled'&&Date.parse(zonedLocalToUtc(f.date,f.kickoff,'Europe/Rome'))>Date.parse(asOf);
function loadContext(calendar,asOf){
 const policy=read(policyPath),history=read('data/normalized/uefa-europe-history-2023-26.json');
 assert(Date.parse(history.generatedAt)<Date.parse(asOf),'Historical input unavailable at cutoff');
 const map=new Map(read('data/sources/champions-team-history-map-2026-27.json').teams.map(t=>[t.team,String(t.uefaTeamId)]));
 const directory=new Map(history.matches.flatMap(m=>[m.homeTeam,m.awayTeam]).map(t=>[String(t.id),t]));
 for(const t of read('data/normalized/champions-team-strength-2026-27.json').teams){const id=map.get(t.team),old=directory.get(id);if(old)assert.equal(old.countryCode,t.association,'Country identity conflict '+id);else if(id&&t.association)directory.set(id,{id,name:t.team,countryCode:t.association});}
 assert.equal(calendar.phase,'league','Regulation result adapter requires league phase');
 const skipped=[];
 const current=calendar.fixtures.filter(f=>f.status==='finished'&&Date.parse(zonedLocalToUtc(f.date,f.kickoff,'Europe/Rome'))<Date.parse(asOf)).flatMap(f=>{
  const h=directory.get(map.get(f.homeTeam)),a=directory.get(map.get(f.awayTeam)),s=f.score||f.matchReport?.score;
  if(!h||!a||![s?.home,s?.away].every(x=>Number.isInteger(x)&&x>=0)){skipped.push(f.id);return [];}
  return [{id:f.id,date:f.date,competitionCode:'ucl',homeTeam:h,awayTeam:a,score90:s}];
 });
 const modelId='champions-european-result:'+digest({code:hash('scripts/research/european-rating-model.cjs'),params:policy.parameters,minimumAppearances:policy.minimumEuropeanAppearances});
 const readingModelId=policy.readingModel?.enabled&&Date.parse(asOf)>=Date.parse(policy.readingModel.activatedAt)?'champions-european-reading:'+digest({code:hash('scripts/champions/european-reading.cjs'),engine:hash('scripts/predictions/engine.js'),policy:policy.readingModel,resultModelId:modelId}):null;
 return {policy,history:history.matches,current,map,directory,modelId,readingModelId,skipped,states:new Map(),asOf,inputHashes:Object.fromEntries([policyPath,'data/normalized/uefa-europe-history-2023-26.json','data/normalized/champions-team-strength-2026-27.json','data/sources/champions-team-history-map-2026-27.json','data/normalized/champions-league-2026-27.json'].map(p=>[p,hash(p)]))};
}
function resultForFixture(f,context){
 const {policy,modelId}=context,cutoff=[f.date,context.asOf.slice(0,10)].sort()[0];
 if(!context.states.has(cutoff))context.states.set(cutoff,sequence([...context.history,...context.current].filter(m=>m.date<cutoff),policy.parameters).state);
 const h=context.directory.get(context.map.get(f.homeTeam)),a=context.directory.get(context.map.get(f.awayTeam));
 const forecast=h&&a?predict(context.states.get(cutoff),{date:f.date,homeTeam:h,awayTeam:a},policy.parameters):null;
 const usable=forecast&&[forecast.features.home,forecast.features.away].every(t=>t.appearances>=policy.minimumEuropeanAppearances);
 return {modelId,type:'EUROPEAN_RATING_RESULT',status:usable?'PRELIMINARY':'INSUFFICIENT_DATA',probabilities:usable?Object.fromEntries(Object.entries(forecast.probability).map(([k,v])=>[k,v*100])):{home:null,draw:null,away:null},samples:forecast?[forecast.features.home.appearances,forecast.features.away.appearances]:[null,null],features:forecast?.features||null,cutoff,asOf:context.asOf,statisticallyValidated:false,policyPath,inputHashes:context.inputHashes,missing:usable?[]:[forecast?'INSUFFICIENT_EUROPEAN_APPEARANCES':'EXACT_EUROPEAN_TEAM_ID_MISSING']};
}
function applyScenario(f,result){
 if(f.europeanReading?.applied){
  for(const key of ['home','draw','away']){
   const mass=f.scoreDistribution.filter(s=>key==='home'?s.home>s.away:key==='draw'?s.home===s.away:s.home<s.away).reduce((n,s)=>n+s.probability,0)*100;
   assert(Number.isFinite(result.probabilities[key])&&Math.abs(mass-result.probabilities[key])<1e-8,'Rebuild the linked Champions reading before changing its result distribution');
  }
 }
 f.resultModel=result;f.probabilities=result.probabilities;
 if(!f.europeanReading?.applied){
  f.scoreForecast={primary:null,modal:null,alternatives:[],display:[],status:'N/D_EUROPEAN_RESULT_HAS_NO_SCORE_MATRIX'};
  f.confidence={value:null};f.surprise={value:null};
 }
 const p=result.probabilities,available=result.status==='PRELIMINARY';
 const ranked=[['1',p.home,f.homeTeam],['X',p.draw,'Pareggio'],['2',p.away,f.awayTeam]].sort((a,b)=>b[1]-a[1]);
 f.verdict=available?{outcome:ranked[0][0],probabilityPct:ranked[0][1],label:ranked[0][2],status:'PRELIMINARY'}:{outcome:'N/D',probabilityPct:null,label:'Dati insufficienti',status:'INSUFFICIENT_DATA'};
 f.dataQuality={...f.dataQuality,resultStatus:result.status,resultTeamSamples:result.samples};
}
function desiredResults(p){
 const ranked=[['1',p.home],['X',p.draw],['2',p.away]].sort((a,b)=>b[1]-a[1]),leader=ranked[0];
 if(leader[0]==='X')return [p.home>=p.away?'1X':'X2'];
 const protectedResult=leader[0]==='1'?'1X':'X2';
 return leader[1]<50||leader[1]-ranked[1][1]<10?[protectedResult,leader[0]]:[leader[0]];
}
async function applyCatalogMatch(match,result,odds){
 const {meetsMinimumPublicOdds}=await import('../../js/pages/shared-forecast-contract.mjs');
 const p=result.probabilities,available=result.status==='PRELIMINARY';
 const probability={1:p.home,X:p.draw,2:p.away,'1X':available?p.home+p.draw:null,'X2':available?p.draw+p.away:null,'12':available?p.home+p.away:null};
 const scenario=available?buildMatchScenario({matchId:match.matchId,probabilities:{final:{1:p.home,X:p.draw,2:p.away}}}):null;
 const resultLegs=match.selections.filter(l=>['result','double-chance'].includes(l.suggestionAnalysis?.family));
 for(const leg of resultLegs){
  const bet=leg.betSelection,e=odds.events.find(e=>e.canonicalMatchId===match.matchId),m=e?.markets.find(m=>String(m.providerMarketId)===String(bet.identity.providerMarketId)),s=m?.selections.find(s=>String(s.providerSelectionId)===String(bet.identity.providerSelectionId));
  assert(s&&s.odds===bet.quote.decimal,'Preserve the exact verified provider contract');
  const exact=String(m.marketCode)==='3'&&m.marketName==='1X2 ESITO FINALE'&&m.variantName==='ESITO FINALE 1X2'||String(m.marketCode)==='28319'&&m.marketName==='DOPPIA CHANCE'&&m.variantName==='DOPPIA CHANCE MULTIESITI';
  const ordinary=exact&&m.threshold===null&&(!m.periodScope||m.periodScope==='full-match')&&m.status==='open'&&s.status==='open'&&String(s.name)===String(leg.selection)&&String(e.providerEventId)===String(bet.identity.providerEventId);
  const value=available&&ordinary?probability[leg.selection]:null;
  leg.modelProbabilityPct=value;leg.modelProbability=value===null?null:value/100;leg.expectedValue=null;
  for(const k of ['fairOdds','expectedValuePct','prudentProbabilityPct','conservativeExpectedValuePct'])if(k in leg)leg[k]=null;
  bet.evaluation={status:'PRELIMINARY_EUROPEAN_RESULT',modelProbabilityPct:value,prudentProbabilityPct:null,fairOdds:value>0?100/value:null,expectedValuePct:null,conservativeExpectedValuePct:null,probabilitySemantics:'ABSOLUTE_EVENT',validation:{approvable:false,status:'EUROPEAN_RESULT_VALIDATION_PENDING',modelId:result.modelId},provenance:{modelId:result.modelId,modelTarget:bet.compatibility.modelTarget,source:'data/generated/champions-shared-scenarios.json#'+match.matchId}};
  bet.operational={...bet.operational,classification:'WATCH',reliability:{level:'Bassa',status:'PRELIMINARY_NOT_VALIDATED',evidence:{europeanAppearances:result.samples}}};
  leg.qualifiedSelection=false;leg.approvedPreliminary=false;leg.selectionStatus='NOT_SELECTED';
  leg.suggestionAnalysis={family:leg.suggestionAnalysis.family,suggested:false,rank:null,probabilityBasis:'EUROPEAN_RATING',reasons:['CHAMPIONS_EVENT_MODEL_NOT_VALIDATED']};
  leg.scenarioAnalysis=scenario?{...classifySelectionScenario(leg,scenario),status:'VERIFIED',checks:{contradictions:[],missing:[]}}:{classification:'NOT_DETERMINABLE',status:'UNVERIFIABLE',checks:{contradictions:[],missing:['EUROPEAN_SAMPLE_INSUFFICIENT']}};
  leg.publication={status:'NOT_SELECTED',approvalGate:'USER_AUTHORIZED_PRELIMINARY_EUROPEAN_RESULT',userAuthorizedResultModel:result.modelId,reasons:['CHAMPIONS_EVENT_MODEL_NOT_VALIDATED']};
  leg.evidenceLabel='Stima preliminare · rating europeo · validazione da completare';
 }
 let chosen=null;
 if(available)for(const direction of desiredResults(p)){
  chosen=resultLegs.find(l=>l.selection===direction&&verifiedQuote(l)&&meetsMinimumPublicOdds(l)&&Number.isFinite(l.modelProbabilityPct)&&l.modelProbabilityPct>=minimumSportsSupportPct(l)&&['COHERENT_WITH_PREVALENT','COMPATIBLE_WITH_MULTIPLE_SCENARIOS'].includes(l.scenarioAnalysis.classification));
  if(chosen)break;
 }
 if(chosen){chosen.suggestionAnalysis.suggested=true;chosen.selectionStatus='PRELIMINARY';chosen.publication.status='PRELIMINARY';chosen.suggestionAnalysis.reasons.push('USER_AUTHORIZED_EUROPEAN_RESULT');}
 match.resultModel=result;
 match.forecastCoverage={...match.forecastCoverage,result:p,doubleChance:{'1X':probability['1X'],'X2':probability.X2},resultModel:result};
 const selected=match.selections.filter(l=>l.suggestionAnalysis?.suggested);selected.forEach((l,i)=>l.suggestionAnalysis.rank=i+1);match.suggestions=selected.map(l=>l.selectionId);
 if(match.suggestionSummary)match.suggestionSummary={total:selected.length,byFamily:selected.reduce((a,l)=>{const f=l.suggestionAnalysis.family;a[f]=(a[f]||0)+1;return a;},{})};
 return chosen?.selectionId||null;
}
async function applyEuropeanResults({scenarios,catalog=null,calendar,odds=null,asOf=new Date().toISOString(),fixtureIds=null}){
 const context=loadContext(calendar,asOf),updates=[];if(!context.policy.enabled)return updates;
 assert.equal(context.policy.authorization.statisticalApproval,false);
 for(const f of scenarios.fixtures){
  const official=calendar.fixtures.find(m=>m.id===f.fixtureId);
  if(!official||official.matchday<context.policy.minimumMatchday||!isFuture(official,asOf)||fixtureIds&&!fixtureIds.has(f.fixtureId))continue;
  // xGOT is applied once to the technical baseline, before Elo conditioning.
  // Never feed the already-conditioned goal means back into that correction.
  const technicalExpected=f.europeanReading?.applied?{...f.expectedGoals,...f.expectedGoals.components.europeanReading.baseline}:f.expectedGoals;
  const currentResult=require('./xgot-result.cjs').withEuropeanXgot(resultForFixture(official,context),technicalExpected);
  if(f.europeanReading?.applied)assert.equal(f.europeanReading.modelId,context.readingModelId,'Rebuild the linked Champions reading after a model change');
  const result=f.europeanReading?.applied?{...currentResult,readingModelId:context.readingModelId}:currentResult;applyScenario(f,result);
  const match=catalog?.marketCatalog.matches.find(m=>m.matchId===f.fixtureId);
  const selected=match?await applyCatalogMatch(match,result,odds):null;
  updates.push({fixtureId:f.fixtureId,status:result.status,probabilities:result.probabilities,selected});
 }
 if(catalog){const selected=catalog.marketCatalog.matches.flatMap(m=>m.selections).filter(l=>l.suggestionAnalysis?.suggested);Object.assign(catalog.summary,{selections:selected.length,teamSelections:selected.filter(l=>l.marketScope!=='player').length,playerSelections:selected.filter(l=>l.marketScope==='player').length,approvedSelections:selected.filter(l=>l.qualifiedSelection).length});}
 return updates;
}
module.exports={loadContext,resultForFixture,applyScenario,desiredResults,applyEuropeanResults};
