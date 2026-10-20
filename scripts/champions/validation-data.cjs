'use strict';
const zlib=require('zlib');
const fs=require('fs'),path=require('path'),crypto=require('crypto'),{execFileSync}=require('child_process');
const {freezeCandidate,zonedLocalToUtc}=require('./complete-forecast-snapshots');
const {targetForLeg,eventKey}=require('./event-validation.cjs');
const ROOT=path.resolve(__dirname,'../..'),read=p=>JSON.parse(fs.readFileSync(path.join(ROOT,p),'utf8'));
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT,p))).digest('hex');
const digest=v=>crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex');
const finite=v=>typeof v==='number'&&Number.isFinite(v);
const MODEL_FILES={collective:['scripts/build-champions-pilot-predictions.js','scripts/build-champions-1x2.js','scripts/champions/offline-collective.js','scripts/champions/league-strength.js'],player:['scripts/build-champions-md3-offline.js','scripts/build-champions-player-stats.js','scripts/build-champions-md3-probable.cjs','scripts/champions/md3-lineup-policy.js','scripts/champions/current-season-offline.js','scripts/champions/context-adjusted-player-baseline.js','scripts/champions/player-volume-utils.js','scripts/champions/substitute-minutes.js']};
function currentModels(){const modules=Object.fromEntries(Object.entries(MODEL_FILES).map(([scope,files])=>[scope,Object.fromEntries(files.map(p=>[p,hash(p)]))]));const collective='champions-collective:'+digest({modules:modules.collective,uefaParameters:read('data/normalized/uefa-1x2-model-2026-27.json').parameters});return {ids:{collective,player:'champions-player:'+digest({collective,modules:modules.player})},modules};}
function collectActuals(now){
 const calendar=read('data/normalized/champions-league-2026-27.json'),teams=[],players=[],conflicts=[];
 for(const f of calendar.fixtures.filter(f=>f.status==='finished')){
  const stats=f.matchReport?.statistics,ko=zonedLocalToUtc(f.date,f.kickoff,'Europe/Rome');
  if(!(Date.parse(ko)<Date.parse(now))){conflicts.push({fixtureId:f.id,reason:'FINISHED_FIXTURE_NOT_IN_OBSERVED_PAST'});continue;}
  for(let i=0;i<2;i++)teams.push({fixtureId:f.id,side:i?'away':'home',scope:'team',teamId:calendar.teamBranding.find(t=>t.team===f[i?'awayTeam':'homeTeam'])?.id||null,kickoffAt:ko,score:f.score||f.matchReport?.score||null,
    shots:finite(stats?.shots?.[i])?stats.shots[i]:null,sot:finite(stats?.shotsOnTarget?.[i])?stats.shotsOnTarget[i]:null,corners:finite(stats?.corners?.[i])?stats.corners[i]:null,
    periodVerified:calendar.phase==='league',availableAt:now,source:'data/normalized/champions-league-2026-27.json',sourceUrl:stats?.sourceUrl||f.matchReport?.sourceUrl||null});
 }
 const audit=read('data/analysis/champions/model-calibration-audit-2026-10-11.json');
 for(const r of audit.evaluationDataset.admittedObservations)if(teams.some(t=>t.fixtureId===r.fixtureId))players.push({fixtureId:r.fixtureId,teamId:r.teamId,playerId:r.playerId,shots:r.actualShots,sot:r.actualSot,minutes:r.actualMinutes,starter:null,periodVerified:calendar.phase==='league',source:'data/analysis/champions/model-calibration-audit-2026-10-11.json',availableAt:now,identityVerified:true});
 for(const m of read('data/sources/european-player-match-stats-2026-27.json').matches.filter(m=>m.competition==='champions-league'&&m.linkedFixtureId&&teams.some(t=>t.fixtureId===m.linkedFixtureId)))for(const p of m.players){if(!p.playerId)continue;
  players.push({fixtureId:m.linkedFixtureId,teamId:m.teamId,playerId:p.playerId,shots:p.shots,sot:p.shotsOnTarget,minutes:p.minutesPlayed,starter:typeof p.starter==='boolean'?p.starter:null,periodVerified:calendar.phase==='league',source:'data/sources/european-player-match-stats-2026-27.json',sourceUrl:m.sourceUrl,availableAt:now,identityVerified:true});
 }
 const unique=new Map(),bad=new Set();for(const p of players){const key=[p.fixtureId,p.teamId,p.playerId].join(':');if(unique.has(key)){
  const previous=unique.get(key);if(['shots','sot','minutes'].some(k=>finite(previous[k])&&finite(p[k])&&previous[k]!==p[k])){bad.add(key);conflicts.push({key,reason:'CONFLICTING_PLAYER_ACTUALS'});}else unique.set(key,{...previous,...p,starter:p.starter??previous.starter});
 }else unique.set(key,p);}
 const historicalCandidates=read('data/sources/champions-pilot-match-stats-2025-27.json').matches.filter(m=>m.league==='uefa.champions'&&m.season==='2025-26'&&m.date<now.slice(0,10));
 const historicalTeamMatches=[],periodReceipts=[];
 for(const m of historicalCandidates){
  const rawFile=`data/raw/champions-pilot/espn/summaries/2025-26/uefa.champions/${m.eventId}.json.gz`;
  if(!fs.existsSync(path.join(ROOT,rawFile))){conflicts.push({eventId:m.eventId,reason:'HISTORICAL_REGULATION_PERIOD_UNVERIFIED'});continue;}
  const raw=JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(ROOT,rawFile))));
  const status=raw.payload?.header?.competitions?.[0]?.status?.type;
  if(status?.name!=='STATUS_FULL_TIME'||status.completed!==true){conflicts.push({eventId:m.eventId,reason:'EXTRA_TIME_OR_PENALTIES_EXCLUDED_FROM_REGULATION_COUNTS',status:status?.name||null});continue;}
  periodReceipts.push({eventId:m.eventId,path:rawFile,sha256:hash(rawFile),status:status.name});historicalTeamMatches.push(m);
 }
 return {historicalCandidates:historicalCandidates.length,historicalTeamMatches,periodReceipts,teams,players:[...unique].filter(([k])=>!bad.has(k)).map(([,v])=>v),conflicts};
}
function actualFor(target,fixtureId,actuals){
 const sides=actuals.teams.filter(r=>r.fixtureId===fixtureId);
 if(target.duo||target.woodwork||target.extraTime)return {reason:'EXTENDED_CONTRACT_ACTUALS_NOT_CERTIFIED'};
 if(['result','double-chance'].includes(target.metric)){
  const score=sides[0]?.score;if(!sides[0]?.periodVerified)return {reason:'REGULATION_SCORE_UNVERIFIED'};if(!finite(score?.home)||!finite(score?.away))return {reason:'FINAL_SCORE_UNAVAILABLE'};
  const result=score.home>score.away?'1':score.home<score.away?'2':'X';return {outcome:Number(target.direction.includes(result)),value:null,availableAt:sides[0].availableAt,verified:true};
 }
 let row,value;
 if(target.scope==='player'){
  row=actuals.players.find(r=>r.fixtureId===fixtureId&&r.teamId===target.teamId&&r.playerId===target.subjectId);
  if(!row||!row.identityVerified)return {reason:'EXACT_PLAYER_ACTUAL_UNAVAILABLE'};
  if(target.conditionalOnStart&&row.starter!==true)return {reason:row.starter===false?'CONDITIONAL_START_NOT_MET':'STARTER_STATUS_UNVERIFIED'};
  if(!finite(row.minutes)||row.minutes<0||row.minutes>130)return {reason:'MINUTES_UNAVAILABLE_OR_INVALID'};value=row[target.metric];
 }else if(target.scope==='team'){row=sides.find(r=>r.teamId===target.subjectId);value=row?.[target.metric];}
 else {if(sides.length!==2||!sides.every(r=>finite(r[target.metric])))return {reason:'MATCH_TOTAL_ACTUAL_UNAVAILABLE'};row=sides[0];value=sides[0][target.metric]+sides[1][target.metric];}
 if(!row?.periodVerified)return {reason:'REGULATION_COUNT_PERIOD_UNVERIFIED'};
 if(!row||!finite(value)||value<0||!Number.isInteger(value)||finite(row.sot)&&finite(row.shots)&&row.sot>row.shots)return {reason:'COUNT_ACTUAL_MISSING_OR_INVALID'};
 return {outcome:target.direction==='OVER'?Number(value>target.threshold):Number(value<target.threshold),value,availableAt:row.availableAt,verified:true};
}
function baselineFor(target,actuals,history,now){
 const values=[];
 const priorTeams=(actuals.historicalTeamMatches||[]).flatMap(m=>['home','away'].map(side=>({fixtureId:m.eventId,periodVerified:true,shots:m[side].statistics?.totalShots,sot:m[side].statistics?.shotsOnTarget,corners:m[side].statistics?.wonCorners})));
 const referenceTeams=[...priorTeams,...actuals.teams];
 if(['result','double-chance'].includes(target.metric))for(const m of history.matches.filter(m=>m.competitionCode==='ucl'&&m.status==='finished'&&finite(m.score90?.home)&&finite(m.score90?.away))){
  const result=m.score90.home>m.score90.away?'1':m.score90.home<m.score90.away?'2':'X';values.push(Number(target.direction.includes(result)));
 }else if(target.scope==='player')for(const p of actuals.players.filter(p=>p.starter===true&&p.periodVerified&&finite(p[target.metric])))values.push(Number(p[target.metric]>target.threshold));
 else if(target.scope==='team')for(const r of referenceTeams.filter(r=>r.periodVerified&&finite(r[target.metric])))values.push(Number(r[target.metric]>target.threshold));
 else for(const id of new Set(referenceTeams.map(r=>r.fixtureId))){const rows=referenceTeams.filter(r=>r.fixtureId===id);if(rows.length===2&&rows.every(r=>r.periodVerified&&finite(r[target.metric])))values.push(Number(rows.reduce((n,r)=>n+r[target.metric],0)>target.threshold));}
 return {probability:values.length?values.reduce((a,b)=>a+b,0)/values.length:null,n:values.length,positives:values.reduce((a,b)=>a+b,0),periodVerified:true,availableAt:now,method:'FROZEN_EMPIRICAL_REFERENCE_FROM_PRIOR_OBSERVED_EVENTS_NO_FIT'};
}
function captureCurrent(now,outputRoot){
 const models=currentModels(),calendar=read('data/normalized/champions-league-2026-27.json'),individuals=read('data/normalized/champions-md03-probable-individuals-2026-27.json');
 const catalog=read('data/normalized/schedina-champions-md03.json'),forecasts=read('data/normalized/champions-md03-preliminary-2026-27.json'),actuals=collectActuals(now),history=read('data/normalized/uefa-europe-history-2023-26.json');
 const inputPaths=['data/analysis/champions/md3-offline-engine-2026-10-19/preview-md03.json','data/normalized/champions-1x2-2026-27.json','data/normalized/champions-team-strength-2026-27.json','data/normalized/champions-player-stats-2026-27.json','data/normalized/champions-player-stats-2025-26.json','data/normalized/champions-registered-squads-2026-27.json','data/normalized/champions-history-2023-26.json','data/normalized/champions-motivation-md01-2026-27.json','data/sources/champions-package1-performances-2026-10-19.json','data/sources/european-player-match-stats-2026-27.json','data/analysis/champions/model-calibration-audit-2026-10-11.json','data/sources/champions-pilot-match-stats-2025-27.json','data/normalized/champions-league-2026-27.json','data/normalized/champions-md03-probable-individuals-2026-27.json','data/normalized/champions-md03-preliminary-2026-27.json','data/normalized/schedina-champions-md03.json','data/normalized/odds/sisal/champions-league.json','data/normalized/uefa-europe-history-2023-26.json','data/normalized/uefa-1x2-model-2026-27.json','data/sources/champions-probable-formations-md03-2026-27.json','data/normalized/champions-md03-player-database-2026-27.json'];
 const receipts=Object.fromEntries(inputPaths.map(p=>[p,hash(p)]));
 const candidate={generatedAt:now,model:{ids:models.ids,modules:models.modules},dataVersion:{capturedAt:now,availabilityProof:'CONTROLLED_LOCAL_CAPTURE_BEFORE_KICKOFF_NOT_EXTERNAL_TIMESTAMP_AUTHORITY',inputs:receipts,baselinePeriodReceipts:actuals.periodReceipts,baselineReferenceHash:digest(actuals)},kickoffVerification:{source:'data/normalized/champions-league-2026-27.json',timezone:'Europe/Rome'},identityOverlay:{source:'CANONICAL_PLAYER_AND_TEAM_IDS_ONLY'},fixtures:[]};
 for(const f of calendar.fixtures.filter(f=>f.matchday===3)){
  const ind=individuals.fixtures.find(x=>x.fixtureId===f.id),forecast=forecasts.fixtures.find(x=>x.fixtureId===f.id).forecast;
  const events=new Map(),players=ind.teams.flatMap(t=>t.players.map(p=>({teamId:t.teamId,internalPlayerId:p.playerId||null,name:p.canonicalName||p.sourceName,role:p.role,projectedRole:p.projectedRole,availability:p.availability,expectedMinutes:p.expectedMinutes,startingProbability:p.startingProbability,projectedShots:p.projectedShots,projectedShotsOnTarget:p.projectedSOT,eventProbabilities:p.eventProbabilities,blockers:p.blockers})));
  const add=(event,replace=false)=>{const id=`${eventKey(event.modelId,event.target)}:${event.target.subjectId||''}`;if(!events.has(id)||replace){const baseline=baselineFor(event.target,actuals,history,now);events.set(id,{...event,eventId:id,baselineProbability:baseline.probability,baseline,latestInputAt:now,trainingThroughAt:now,baselineAvailableAt:now});}};
  for(const t of ind.teams)for(const p of t.players.filter(p=>p.projectedRole==='starter'&&p.playerId&&p.eventProbabilities&&!p.blockers.length))for(const [key,metric,threshold] of [['shotsOver05','shots',0.5],['shotsOver15','shots',1.5],['shotsOver25','shots',2.5],['sotOver05','sot',0.5],['sotOver15','sot',1.5]]){
   add({modelId:models.ids.player,target:{scope:'player',metric,threshold,direction:'OVER',period:'REGULATION',duo:false,woodwork:false,extraTime:false,conditionalOnStart:true,subjectId:p.playerId,teamId:t.teamId},probability:p.eventProbabilities[key],mean:metric==='shots'?p.projectedShots:p.projectedSOT,quote:null,role:p.role});
  }
  for(const leg of catalog.marketCatalog.matches.find(m=>m.matchId===f.id).selections){const target=targetForLeg(leg);if(!target.metric)continue;if(target.scope==='player')target.teamId=leg.teamId;
   const team=forecast.teamProjections.find(t=>t.teamId===target.subjectId),metricKey={shots:'shotsTotal',sot:'shotsOnTarget',corners:'corners'}[target.metric];
   const modelId=models.ids[target.scope==='player'?'player':'collective'],p=leg.betSelection.evaluation.modelProbabilityPct;
   const person=players.find(p=>p.internalPlayerId===target.subjectId&&p.teamId===target.teamId);
   add({modelId,target,probability:finite(p)?p/100:null,mean:target.scope==='player'?(target.metric==='shots'?person?.projectedShots:person?.projectedShotsOnTarget):target.scope==='team'?team?.[metricKey]?.central??null:forecast.matchProjection?.[metricKey]?.central??null,quote:leg.betSelection.quote,selectionId:leg.selectionId},true);
  }
  candidate.fixtures.push({fixtureId:f.id,competition:'champions',phase:'league',season:'2026-27',matchday:3,date:f.date,kickoff:f.kickoff,timezone:'Europe/Rome',kickoffAt:zonedLocalToUtc(f.date,f.kickoff,'Europe/Rome'),homeTeam:f.homeTeam,awayTeam:f.awayTeam,chronologyStatus:f.status==='scheduled'?'PREMATCH_CANDIDATE':'NOT_SCHEDULED',coverage:{completeForSnapshotUniverse:true,universe:'ALL_EXISTING_PROBABLE_PLAYERS_AND_SUPPORTED_CONTRACT_EVENTS_INCLUDING_EXPLICIT_BLOCKERS',players:players.length,events:events.size,unresolved:players.filter(p=>!p.internalPlayerId).length},players,events:[...events.values()],teamProjections:forecast.teamProjections});
 }
 const frozen=freezeCandidate({candidate,outputRoot,evaluationWindow:'test'});
 return {models,receipts,results:frozen,actuals};
}
function readFrozen(directory){
 if(!fs.existsSync(directory))return {observations:[],exclusions:[],snapshots:[]};
 const files=fs.readdirSync(directory,{recursive:true}).filter(f=>f.endsWith('.json')).map(f=>path.join(directory,f));
 const latest=new Map(),exclusions=[];
 for(const file of files){const doc=JSON.parse(fs.readFileSync(file,'utf8')),{contentHash,...payload}=doc;if(contentHash!==digest(payload)){exclusions.push({file,reason:'SNAPSHOT_HASH_MISMATCH'});continue;}
  if(!(Date.parse(doc.createdAt)<Date.parse(doc.kickoffAt))){exclusions.push({file,reason:'SNAPSHOT_NOT_PREMATCH'});continue;}
  const prior=latest.get(doc.fixtureId);if(!prior||doc.createdAt>prior.createdAt)latest.set(doc.fixtureId,{...doc,file});
 }
 return {snapshots:[...latest.values()],exclusions};
}
function gitInventory(){
 const paths=['data/normalized/champions-pilot-predictions-2026-27.json','data/normalized/champions-pilot-predictions-md02-2026-27.json','data/normalized/champions-player-markets-md01-2026-27.json'];
 const calendar=read('data/normalized/champions-league-2026-27.json'),items=[],historicalObservations=[];
 for(const p of paths){const lines=execFileSync('git',['log','--format=%H|%cI','--',p],{cwd:ROOT,encoding:'utf8'}).trim().split(/\r?\n/).filter(Boolean),versions=[];
  for(const line of lines){const [commit,availableAt]=line.split('|');try{const d=JSON.parse(execFileSync('git',['show',`${commit}:${p}`],{cwd:ROOT,encoding:'utf8',maxBuffer:40*1024*1024}));versions.push({commit,availableAt,d});}catch{/* Deleted or incompatible revisions are not evidence. */}}
  const fixtures=new Set(versions.flatMap(v=>(v.d.fixtures||[]).map(f=>f.fixtureId)));let admitted=0,probabilityEvents=0;
  for(const id of fixtures){const f=calendar.fixtures.find(f=>f.id===id);if(!f)continue;const ko=Date.parse(zonedLocalToUtc(f.date,f.kickoff,'Europe/Rome'));
   const matches=versions.filter(v=>Date.parse(v.availableAt)<ko&&Number.isFinite(Date.parse(v.d.generatedAt))&&Date.parse(v.d.generatedAt)<ko&&v.d.fixtures.some(f=>f.fixtureId===id)).sort((a,b)=>b.availableAt.localeCompare(a.availableAt));
   const v=matches[0];if(v){admitted++;const forecast=v.d.fixtures.find(f=>f.fixtureId===id);if(forecast.probabilities&&['home','draw','away'].every(k=>finite(forecast.probabilities[k]))){
    probabilityEvents+=5;
    const probs=forecast.probabilities,score=f.score||f.matchReport?.score;
    if(f.status==='finished'&&finite(score?.home)&&finite(score?.away)){
     const actual=score.home>score.away?'1':score.home<score.away?'2':'X';
     for(const [event,probability] of [['1',probs.home/100],['X',probs.draw/100],['2',probs.away/100],['1X',(probs.home+probs.draw)/100],['X2',(probs.draw+probs.away)/100]])historicalObservations.push({fixtureId:id,source:p,commit:v.commit,availableAt:v.availableAt,kickoffAt:new Date(ko).toISOString(),event,probability,outcome:Number(event.includes(actual)),baselineProbability:null,scope:'ORIGINAL_SNAPSHOT_DIAGNOSTIC_ONLY',modelId:'legacy:'+digest({path:p,commit:v.commit,methodology:v.d.methodology||{}})});
    }
   }}
  }
  items.push({path:p,versions:versions.length,fixtures:fixtures.size,prematchFixtures:admitted,originalResultEventProbabilities:probabilityEvents,scope:'LEGACY_MODEL_ONLY_NOT_MD3_VALIDATION',proof:'GIT_COMMITTER_TIMESTAMP_AND_SERIALIZED_GENERATION_TIME'});
 }
 return {items,historicalObservations};
}
function loadRegistry(){
 const file='data/analysis/champions/event-validation/registry.json';if(!fs.existsSync(path.join(ROOT,file)))return null;
 const value=read(file),{contentHash,...payload}=value;if(contentHash!==digest(payload))throw Error('Champions validation registry integrity failure');return value;
}
module.exports={loadRegistry,ROOT,read,hash,digest,currentModels,collectActuals,actualFor,baselineFor,captureCurrent,readFrozen,gitInventory};
