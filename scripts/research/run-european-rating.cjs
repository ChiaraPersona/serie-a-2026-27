'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {sequence,predict}=require('./european-rating-model.cjs');
const {resultInventory}=require('./champions-history-audit.cjs');
const {eligible}=require('../champions/shared-scenario.cjs');
const {zonedLocalToUtc}=require('../champions/complete-forecast-snapshots');
const {captureInputs,assertInputsUnchanged}=require('../test-champions-validation-inputs.cjs');
const {VALIDATION_CRITERIA}=require('../md06-statistical-models');
const root=path.resolve(__dirname,'../..');
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex');
const round=x=>Number.isFinite(x)?Number(x.toFixed(6)):null;
const actual=m=>m.score90.home>m.score90.away?0:m.score90.home<m.score90.away?2:1;
const vector=r=>[r.probability.home,r.probability.draw,r.probability.away];
const loss=r=>{const p=vector(r),y=actual(r.match);return {brier:p.reduce((s,x,i)=>s+(x-Number(i===y))**2,0),logLoss:-Math.log(Math.max(1e-12,p[y]))};};
function metrics(rows){
 if(!rows.length)return null;
 const bins=Array.from({length:10},()=>({n:0,p:0,y:0}));
 for(const r of rows)vector(r).forEach((p,i)=>{const b=bins[Math.min(9,Math.floor(p*10))];b.n++;b.p+=p;b.y+=Number(actual(r.match)===i);});
 const calibration=bins.map((b,i)=>({from:i/10,to:(i+1)/10,n:b.n,probability:b.n?round(b.p/b.n):null,observed:b.n?round(b.y/b.n):null}));
 return {fixtures:rows.length,brier:round(rows.reduce((s,r)=>s+loss(r).brier,0)/rows.length),logLoss:round(rows.reduce((s,r)=>s+loss(r).logLoss,0)/rows.length),ece:round(bins.reduce((s,b)=>s+Math.abs(b.p-b.y),0)/(rows.length*3)),accuracyPct:round(100*rows.filter(r=>vector(r).indexOf(Math.max(...vector(r)))===actual(r.match)).length/rows.length),calibration};
}
function baseline(training,rows){
 const counts=[0,0,0];for(const m of training)counts[actual(m)]++;
 const p=counts.map(n=>n/training.length);
 return rows.map(r=>({...r,probability:{home:p[0],draw:p[1],away:p[2]}}));
}
function compare(left,right){
 assert.deepEqual(left.map(r=>r.match.id),right.map(r=>r.match.id));
 const deltas=left.map((r,i)=>({brier:loss(right[i]).brier-loss(r).brier,logLoss:loss(right[i]).logLoss-loss(r).logLoss}));
 let seed=20261104;const random=()=>{seed=(Math.imul(1664525,seed)+1013904223)>>>0;return seed/4294967296;};
 const samples={brier:[],logLoss:[]};
 for(let k=0;k<2000;k++){const total={brier:0,logLoss:0};for(let i=0;i<deltas.length;i++){const d=deltas[Math.floor(random()*deltas.length)];total.brier+=d.brier;total.logLoss+=d.logLoss;}for(const key of Object.keys(total))samples[key].push(total[key]/deltas.length);}
 return Object.fromEntries(Object.entries(samples).map(([k,a])=>{a.sort((x,y)=>x-y);return [k,{improvement:round(deltas.reduce((s,d)=>s+d[k],0)/deltas.length),lower95:round(a[Math.floor(.025*(a.length-1))]),upper95:round(a[Math.floor(.975*(a.length-1))])}];}));
}
function run(){
 process.chdir(root);const protectedBefore=captureInputs(),asOf=new Date().toISOString();
 const sourcePaths=['data/normalized/uefa-europe-history-2023-26.json','data/normalized/uefa-1x2-model-2026-27.json','data/generated/uefa-1x2-backtest.json','data/sources/champions-team-history-map-2026-27.json','data/normalized/champions-league-2026-27.json','scripts/research/european-rating-model.cjs','scripts/research/run-european-rating.cjs','data/normalized/champions-team-strength-2026-27.json'];
 const inputHashes=Object.fromEntries(sourcePaths.map(p=>[p,hash(p)]));
 const inventory=resultInventory(read(sourcePaths[0]).matches);assert.equal(inventory.summary.invalid.length+inventory.summary.duplicates.length+inventory.summary.conflicts.length,0);
 const rows=inventory.rows,legacy=read(sourcePaths[1]),oldReport=read(sourcePaths[2]);
 assert.equal(legacy.parameters.seasonRetention,1,'Reference replay implements the frozen retention=1 model only');
 const base={...legacy.parameters,countryWeight:0,shrinkMatches:0,halfLifeDays:null};
 const train=rows.filter(m=>m.season==='2023-24'),validation=rows.filter(m=>m.season==='2024-25'),prior=rows.filter(m=>m.season!=='2025-26'),test=rows.filter(m=>m.season==='2025-26');
 const configurations=[];for(const countryWeight of [0,.5,1])for(const shrinkMatches of [0,6,12])for(const halfLifeDays of [null,180,365])configurations.push({...base,countryWeight,shrinkMatches,halfLifeDays});
 const out=path.join(root,'output/champions-european-rating-research',asOf.replace(/[:.]/g,'-'));fs.mkdirSync(out,{recursive:true});
 const write=(file,value)=>fs.writeFileSync(path.join(out,file),JSON.stringify(value,null,2)+'\n',{flag:'wx'});
 write('protocol.json',{asOf,inputHashes,status:'RETROSPECTIVE_DIAGNOSTIC_NOT_NEW_HOLDOUT',train:'2023-24',validation:'2024-25',diagnosticTest:'2025-26',configurations,selection:'Lowest all-European validation log loss, then Brier, then original grid order. No test scores select configuration.',update:'Predict full calendar date before updates. Only earlier results enter a target.',abstention:'Fixed >=6 prior European appearances per team; coverage reported separately. All fixtures still scored to avoid easy-case selection.',countryPrior:'Mean of previously observed other clubs from that country; minimum three other clubs, otherwise neutral. No name matching.',limitations:['2025-26 scores have already been inspected; this is not a fresh preregistered holdout.','No historical domestic profile or provider-odds comparison is claimed.','Country prior represents observed European clubs, not all clubs in the domestic league.']});
 const candidates=configurations.map((params,index)=>{const trained=sequence(train,params);const forecast=sequence(validation,params,trained.state);return {index,params,validation:metrics(forecast.predictions)};});
 candidates.sort((a,b)=>a.validation.logLoss-b.validation.logLoss||a.validation.brier-b.validation.brier||a.index-b.index);
 const selected=candidates[0];write('selected-before-test.json',{selected,candidates});
 const legacyForecast=sequence(test,base,sequence(prior,base).state).predictions;
 const legacyMetrics=metrics(legacyForecast.filter(r=>r.match.competitionCode==='ucl'));
 for(const [key,expected]of [['brier',oldReport.holdout.model.byCompetition.ucl.brier],['logLoss',oldReport.holdout.model.byCompetition.ucl.logLoss]])assert(Math.abs(legacyMetrics[key]-expected)<.00002,'Legacy reproduction failed: '+key);
 const forecast=sequence(test,selected.params,sequence(prior,selected.params).state).predictions;
 const summary=Object.fromEntries(['all','ucl','uel','uecl'].map(code=>{
  const subset=a=>code==='all'?a:a.filter(r=>r.match.competitionCode===code),rr=subset(forecast),old=subset(legacyForecast),freq=subset(baseline(prior,forecast));
  return [code,{candidate:metrics(rr),legacy:metrics(old),frequencyBaseline:metrics(freq),candidateVsLegacy:compare(rr,old),candidateVsFrequency:compare(rr,freq),eligibleCoverage:{eligible:rr.filter(r=>r.eligible).length,total:rr.length,metrics:metrics(rr.filter(r=>r.eligible))}}];
 }));
 write('diagnostic-predictions.json',forecast.map(r=>({fixtureId:r.match.id,competition:r.match.competitionCode,date:r.match.date,actual:['1','X','2'][actual(r.match)],probability:r.probability,features:r.features,eligible:r.eligible,status:'DIAGNOSTIC_NOT_ORIGINAL_PREMATCH_SNAPSHOT'})));
 const calendar=read(sourcePaths[4]),teamMap=new Map(read(sourcePaths[3]).teams.map(t=>[t.team,String(t.uefaTeamId)]));
 const directory=new Map(rows.flatMap(m=>[m.homeTeam,m.awayTeam]).map(t=>[String(t.id),t]));
 const associations=new Map(read(sourcePaths[7]).teams.map(t=>[t.team,t.association]));
 for(const [name,id]of teamMap){
  const old=directory.get(id),country=associations.get(name);
  if(old&&country)assert.equal(old.countryCode,country,'Conflicting canonical country for '+id);
  if(!old&&country)directory.set(id,{id,name,countryCode:country});
 }
 assert.equal(calendar.phase,'league','Only certified regulation league scores may update current ratings');
 const skippedCurrent=[];
 const current=calendar.fixtures.filter(f=>f.status==='finished'&&Date.parse(zonedLocalToUtc(f.date,f.kickoff,'Europe/Rome'))<Date.parse(asOf)).flatMap(f=>{
  const h=directory.get(teamMap.get(f.homeTeam)),a=directory.get(teamMap.get(f.awayTeam)),score=f.score||f.matchReport?.score;
  if(!h||!a||![score?.home,score?.away].every(x=>Number.isInteger(x)&&x>=0)){skippedCurrent.push({fixtureId:f.id,reason:!h||!a?'EXACT_TEAM_ID_OR_COUNTRY_MISSING':'REGULATION_SCORE_MISSING'});return [];}
  return [{id:f.id,date:f.date,competitionCode:'ucl',homeTeam:h,awayTeam:a,score90:score}];
 });
 const combined=[...rows,...current],currentState=sequence(combined.filter(m=>m.date<asOf.slice(0,10)),selected.params).state;
 const future=calendar.fixtures.filter(f=>f.matchday===4&&eligible(f,asOf)).map(f=>{
  const h=directory.get(teamMap.get(f.homeTeam)),a=directory.get(teamMap.get(f.awayTeam));
  if(!h||!a)return {fixtureId:f.id,fixture:f.homeTeam+' - '+f.awayTeam,probabilityPct:null,reason:'EXACT_HISTORICAL_TEAM_ID_MISSING',approved:false};
  const p=predict(currentState,{date:f.date,homeTeam:h,awayTeam:a},selected.params);
  return {fixtureId:f.id,fixture:f.homeTeam+' - '+f.awayTeam,probabilityPct:p.eligible?Object.fromEntries(Object.entries(p.probability).map(([k,v])=>[k,round(v*100)])):null,features:p.features,reason:p.eligible?'RESEARCH_ONLY_NOT_OPERATIONALLY_VALIDATED':'FEWER_THAN_SIX_PRIOR_EUROPEAN_MATCHES',approved:false};
 });
 write('research-fixtures.json',{asOf,currentResultsUsed:current.length,skippedCurrent,trainingThrough:combined.map(m=>m.date).filter(d=>d<asOf.slice(0,10)).sort().at(-1),fixtures:future});
 const report={asOf,status:'DIAGNOSTIC_ONLY_NOT_OPERATIONALLY_APPROVED',selected:selected.params,validation:selected.validation,summary,currentResultsUsed:current.length,productionChanged:false,inputHashes,approved:false,next:'Freeze a prospective protocol for this exact model; do not reuse inspected historical test scores as a new independent approval.'};
 write('report.json',report);write('frozen-research-model.json',{asOf,parameters:selected.params,modelCodeHash:inputHashes[sourcePaths[5]],inputHashes,state:[...currentState],status:report.status,approved:false});
 const digest=v=>crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex');
 const modelId='research-european-rating:'+digest({code:inputHashes[sourcePaths[5]],runner:inputHashes[sourcePaths[6]],parameters:selected.params,minimumAppearances:6,baseline:'PRIOR_UCL_RESULT_FREQUENCY'});
 const prospectiveProtocol={createdAt:new Date().toISOString(),modelId,parameters:selected.params,criteria:VALIDATION_CRITERIA,scope:'CHAMPIONS_REGULATION_1X2_ONLY',minimumAppearances:6,baseline:'All prior observed UCL results before the capture date; frozen separately for each capture.',admission:'Only immutable predictions captured before kickoff may be scored. Revisions never replace the first event prediction.',historicalTest:'Diagnostic only; never admitted as original prospective predictions.',approval:false};
 write('prospective-protocol.json',prospectiveProtocol);
 const snapshots=[];
 for(const f of future){
  const fixture=calendar.fixtures.find(m=>m.id===f.fixtureId),capturedAt=new Date().toISOString(),kickoffAt=zonedLocalToUtc(fixture.date,fixture.kickoff,'Europe/Rome');
  if(!f.probabilityPct||!(Date.parse(capturedAt)<Date.parse(kickoffAt)))continue;
  const history=combined.filter(m=>m.competitionCode==='ucl'&&m.date<capturedAt.slice(0,10)),counts=[0,0,0];for(const m of history)counts[actual(m)]++;
  const events=['1','X','2'].map((direction,i)=>({modelId,target:{scope:'match',metric:'result',threshold:null,direction,period:'REGULATION',duo:false,woodwork:false,extraTime:false,conditionalOnStart:false,subjectId:null},probability:f.probabilityPct[['home','draw','away'][i]]/100,baselineProbability:counts[i]/history.length,baseline:{probability:counts[i]/history.length,n:history.length,positives:counts[i],periodVerified:true,availableAt:capturedAt},latestInputAt:capturedAt,trainingThroughAt:capturedAt,baselineAvailableAt:capturedAt}));
  const payload={schemaVersion:1,kind:'RESEARCH_EUROPEAN_RESULT_SNAPSHOT',fixtureId:f.fixtureId,kickoffAt,createdAt:capturedAt,evaluationWindow:'test',availabilityProof:'CONTROLLED_LOCAL_CAPTURE_NOT_EXTERNAL_TIMESTAMP_AUTHORITY',protocolHash:digest(prospectiveProtocol),inputHashes,events,approved:false};
  const file='prospective-'+f.fixtureId+'.json';write(file,{...payload,contentHash:digest(payload)});snapshots.push({fixtureId:f.fixtureId,file,createdAt:capturedAt,kickoffAt});
 }
 write('prospective-index.json',{modelId,snapshots,abstentions:future.filter(f=>!f.probabilityPct).map(f=>({fixtureId:f.fixtureId,reason:f.reason})),approved:false});
 assertInputsUnchanged(protectedBefore);for(const p of sourcePaths)assert.equal(hash(p),inputHashes[p]);
 const brief=m=>({fixtures:m.fixtures,brier:m.brier,logLoss:m.logLoss,ece:m.ece});
 console.log(JSON.stringify({output:out,selected:selected.params,ucl:{candidate:brief(summary.ucl.candidate),frequency:brief(summary.ucl.frequencyBaseline),candidateVsLegacy:summary.ucl.candidateVsLegacy,candidateVsFrequency:summary.ucl.candidateVsFrequency},aek:future.find(f=>f.fixtureId==='ucl-2026-27-md04-10'),futureFixtures:future.length,prospectiveSnapshots:snapshots.length,abstentions:future.filter(f=>!f.probabilityPct).length,currentResultsUsed:current.length,skippedCurrent,approved:false}));return report;
}
if(require.main===module)run();
module.exports={run,metrics,compare};
