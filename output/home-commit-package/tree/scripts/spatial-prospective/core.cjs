'use strict';
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib');
const {sha256,canonicalMatchHash,toKickoffUtc,stableStringify}=require('../predictions/snapshot-core');
const {makeFeatures,predict,CONFIG}=require('../research/spatial-backtest/model.cjs');
const {CONTINUITY_POLICY}=require('../shot-events/technical-context.cjs');
const {scoreMatrix}=require('../predictions/engine');
const BASE='data/predictions/spatial-prospective';
const METHOD_FILES=['scripts/research/spatial-backtest/model.cjs','scripts/shot-events/technical-context.cjs','scripts/shot-events/matchup.cjs','scripts/predictions/engine.js'];
const VARIANTS=['recent','decay','coach-cycle'];
const read=(root,file)=>JSON.parse(fs.readFileSync(path.join(root,file),'utf8'));
const bytesHash=bytes=>require('node:crypto').createHash('sha256').update(bytes).digest('hex');
function immutableJson(root,file,value){
 const target=path.join(root,file),text=JSON.stringify(value,null,2)+'\n';fs.mkdirSync(path.dirname(target),{recursive:true});
 if(fs.existsSync(target)){if(fs.readFileSync(target,'utf8')!==text)throw Error('IMMUTABLE_CONTENT_CONFLICT '+file);return;}
 fs.writeFileSync(target,text,{flag:'wx'});
}
function verifyHash(value){return value?.integrity?.sha256===canonicalMatchHash(value);}
function methodHashes(root){return Object.fromEntries(METHOD_FILES.map(f=>[f,bytesHash(fs.readFileSync(path.join(root,f)))]));}
function initialize(root,now=new Date()){
 const file=BASE+'/protocol.json';
 if(fs.existsSync(path.join(root,file))){const p=read(root,file);validateProtocol(root,p);return p;}
 const studyFile='data/analysis/spatial-continuity-backtest-2026-10-29/results.json',study=read(root,studyFile);
 const training=study.commonSample.recent.training;
 for(const v of VARIANTS){
  const t=study.commonSample[v].training;
  if(stableStringify(t.fixtureIds)!==stableStringify(training.fixtureIds)||t.calibration.alpha!==training.calibration.alpha)throw Error('INCONSISTENT_COMMON_TRAINING');
  if(t.spatial.trainingMatchdays.some(d=>![6,7].includes(d)))throw Error('HOLDOUT_USED_FOR_FITTING');
 }
 const body={schemaVersion:1,protocolId:'serie-a-spatial-prospective-v1',activatedAt:now.toISOString(),competition:'serie-a',season:'2026-27',
  state:'RESEARCH_ONLY',production:false,confirmatoryMatchdayMinimum:10,
  primaryRule:'FIRST_VALID_BASELINE_CAPTURE_PER_FIXTURE; later revisions retained but never selected using actuals',
  clockPolicy:'LOCAL_SYSTEM_UTC_NO_EXTERNAL_TIMESTAMP_AUTHORITY; reject if started by time or status',
  featureConfig:CONFIG,continuityPolicy:CONTINUITY_POLICY,variants:VARIANTS,
  training:{fixtureIds:training.fixtureIds,matchdays:[6,7],source:studyFile,sourceHash:bytesHash(fs.readFileSync(path.join(root,studyFile)))},
  coefficients:{calibration:training.calibration,...Object.fromEntries(VARIANTS.map(v=>[v,study.commonSample[v].training.spatial]))},
  methodHashes:methodHashes(root),evaluation:{primaryMetric:'JOINT_POISSON_GOAL_LOG_LOSS',roi:null,certifiedProviderSettlement:false,
   include:'PRIMARY snapshots with canonical finished result only; pilot MD9 separate; compare identical eligible fixtures and report abstentions',
   minimumIndependentMatchdays:6,bootstrapIterations:5000,seed:20261029}};
 body.integrity={sha256:canonicalMatchHash(body),algorithm:'SHA-256'};immutableJson(root,file,body);return body;
}
function validateProtocol(root,p){
 if(!verifyHash(p)||p.production!==false||p.state!=='RESEARCH_ONLY')throw Error('PROTOCOL_INTEGRITY_FAILED');
 // Git text normalization may switch LF/CRLF on checkout. Accept only that
 // byte-equivalent source conversion; retain the original frozen hash.
 if(stableStringify(Object.keys(p.methodHashes).sort())!==stableStringify(METHOD_FILES.slice().sort()))throw Error('METHOD_CHANGED_NEW_PROTOCOL_REQUIRED');
 for(const file of METHOD_FILES){
  const bytes=fs.readFileSync(path.join(root,file)),lf=bytes.toString('utf8').replace(/\r\n/g,'\n');
  const accepted=[bytesHash(bytes),bytesHash(Buffer.from(lf)),bytesHash(Buffer.from(lf.replace(/\n/g,'\r\n')))];
  if(!accepted.includes(p.methodHashes[file]))throw Error('METHOD_CHANGED_NEW_PROTOCOL_REQUIRED');
 }
}
function canCapture(fixture,now){
 const kickoff=toKickoffUtc(fixture);
 if(!/^[a-z0-9-]+$/.test(fixture.id||''))return 'INVALID_CANONICAL_FIXTURE_ID';
 if(fixture.competition!=='serie-a'||fixture.season!=='2026-27')return 'WRONG_COMPETITION_OR_SEASON';
 if(fixture.status!=='scheduled')return 'NOT_SCHEDULED';
 if(!kickoff||fixture.dateStatus!=='confirmed')return 'UNCONFIRMED_KICKOFF';
 if(kickoff<=now.getTime())return 'KICKOFF_ALREADY_PASSED';
 if(fixture.score!==null&&fixture.score!==undefined)return 'TARGET_ALREADY_HAS_RESULT';
 return null;
}
function forecast(lambda){
 if(!['home','away'].every(s=>Number.isFinite(lambda[s])&&lambda[s]>0))throw Error('INVALID_LAMBDA');
 const cells=scoreMatrix(lambda.home,lambda.away,7),sum=a=>a.reduce((n,r)=>n+r.probability,0);
 return {lambda,outcomes:[sum(cells.filter(s=>s.home>s.away)),sum(cells.filter(s=>s.home===s.away)),sum(cells.filter(s=>s.home<s.away))],
  over25:sum(cells.filter(s=>s.home+s.away>2.5)),btts:sum(cells.filter(s=>s.home>0&&s.away>0)),distribution:'PRODUCTION_SCORE_MATRIX_0_7'};
}
function sourceTimestamp(value){
 if(typeof value!=='string')return null;
 if(/^\d{4}-\d{2}-\d{2}T/.test(value)){const t=Date.parse(value);return Number.isFinite(t)?t:null;}
 const local=/^(\d{2})\/(\d{2})\/(\d{4})\s*-\s*(\d{2}:\d{2})$/.exec(value);
 if(local)return toKickoffUtc({date:`${local[3]}-${local[2]}-${local[1]}`,kickoff:local[4]});
 return /^\d{4}-\d{2}-\d{2}$/.test(value)?toKickoffUtc({date:value,kickoff:'00:00'}):null;
}
function lineupsFor(f,official,probable,now=null){
 const officialFixture=official.fixtures?.find(r=>r.matchId===f.id&&r.status==='official');
 const sides=['home','away'].map(side=>{
  const teamId=f[side+'Team'],o=officialFixture?.teams.find(t=>t.teamId===teamId);
  const p=probable?.teams?.find(t=>t.matchId===f.id&&t.teamId===teamId&&t.status==='probable');
  const updated=o?officialFixture.retrievedAt||null:p?.updatedAt||null;
  const future=now&&sourceTimestamp(updated)>now.getTime();
  const candidates=future?[]:o?.players||p?.players?.filter(p=>p.lineupStatus==='starter')||[],status=o?'OFFICIAL':p?'PROBABLE':'UNKNOWN';
  const players=candidates.map(p=>({playerId:p.playerId||null,name:p.currentName||p.sourceName||null}));
  const complete=players.length===11&&players.every(p=>p.playerId)&&new Set(players.map(p=>p.playerId)).size===11;
  return {teamId,status:complete?status:'UNKNOWN',formation:o?.formation||p?.formation||null,players,
   sourceUpdatedAt:updated,identityComplete:complete,...(future?{unavailableReason:'SOURCE_TIMESTAMP_IN_FUTURE'}:{})};
 });
 return {status:sides.every(s=>s.status==='OFFICIAL')?'OFFICIAL':sides.every(s=>s.status!=='UNKNOWN')?'PROBABLE':'UNKNOWN',sides};
}
function loadInputs(root,f,now=null){
 const required=['data/normalized/matches.json','data/normalized/predictions.json','data/normalized/serie-a-shot-events-2026-27.json',
  'data/normalized/serie-a-technical-context-2026-27.json','data/sources/official-lineups-2026-27.json'];
 const probable=`data/sources/probable-lineups-md${f.matchday}-2026-27.json`;
 if(fs.existsSync(path.join(root,probable)))required.push(probable);
 const records=required.map(file=>{const bytes=fs.readFileSync(path.join(root,file));return {file,bytes,hash:bytesHash(bytes),value:JSON.parse(bytes.toString('utf8'))};});
 const values=Object.fromEntries(records.map(r=>[r.file,r.value]));
 return {records,fixtures:values[required[0]],predictions:values[required[1]],shots:values[required[2]],technical:values[required[3]],
  lineups:lineupsFor(f,values[required[4]],values[probable],now)};
}
function makeCapture(root,f,inputs,protocol,now){
 const reason=canCapture(f,now);if(reason)throw Error(reason);
 const canonical=inputs.fixtures.find(m=>m.id===f.id);
 if(!canonical||canCapture(canonical,now)||['homeTeam','awayTeam','matchday','date','kickoff'].some(k=>canonical[k]!==f[k]))throw Error('CANONICAL_FIXTURE_CHANGED_DURING_CAPTURE');
 if(now.getTime()<Date.parse(protocol.activatedAt))throw Error('BEFORE_PROTOCOL_ACTIVATION');
 const p=inputs.predictions.predictions.find(p=>p.matchId===f.id),cutoff=p?.futureDataDiagnostics?.dataCutoff;
 const baselineValid=p&&Date.parse(p.generatedAt)<=now.getTime()&&Date.parse(p.generatedAt)<toKickoffUtc(f)&&cutoff?.completedOnly===true&&
  cutoff.matchdayExclusive===f.matchday&&cutoff.targetMatchIdExcluded===f.id&&Number.isFinite(p.expectedGoals?.home)&&p.expectedGoals.home>0&&Number.isFinite(p.expectedGoals?.away)&&p.expectedGoals.away>0;
 const asOf=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Rome',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
 const metadata={id:f.id,matchday:f.matchday,date:f.date,homeTeam:f.homeTeam,awayTeam:f.awayTeam};
 const models={};
 for(const v of protocol.variants){
  const features=makeFeatures(metadata,inputs.fixtures,inputs.shots,{...protocol.featureConfig,historyVariant:v},asOf,inputs.technical);
  let status='AVAILABLE',abstentionReason=null,value=null;
  if(!baselineValid){status='ABSTAIN';abstentionReason='NO_VALID_PUBLISHED_BASELINE';}
  else if(!features.available){status='ABSTAIN';abstentionReason=features.reason;}
  else{
   const row={baseline:{lambda:{home:p.expectedGoals.home,away:p.expectedGoals.away}},features};
   value=forecast(predict(row,protocol.coefficients[v]));
  }
  models[v]={status,abstentionReason,features,forecast:value};
 }
 const lambda=baselineValid?{home:p.expectedGoals.home,away:p.expectedGoals.away}:null;
 return {schemaVersion:1,protocolId:protocol.protocolId,protocolHash:protocol.integrity.sha256,capturedAt:now.toISOString(),
  fixture:{...metadata,competition:f.competition,season:f.season,kickoff:f.kickoff,kickoffUtc:new Date(toKickoffUtc(f)).toISOString(),dateStatus:f.dateStatus,statusAtCapture:f.status},
  generationClass:'PROSPECTIVE_LOCAL_IMMUTABLE_CAPTURE',evaluationCohort:f.matchday>=protocol.confirmatoryMatchdayMinimum?'PROSPECTIVE_PREDECLARED':'PILOT_POST_EXPLORATORY',
  lineups:inputs.lineups,publishedPrediction:baselineValid?p:null,
  baseline:baselineValid?{status:'AVAILABLE',generatedAt:p.generatedAt,forecast:forecast(lambda)}:{status:'ABSTAIN',reason:'NO_VALID_PUBLISHED_BASELINE',forecast:null},
  calibration:baselineValid?forecast({home:lambda.home*Math.exp(protocol.coefficients.calibration.alpha),away:lambda.away*Math.exp(protocol.coefficients.calibration.alpha)}):null,
  models,inputs:inputs.records.map(r=>({file:r.file,sha256:r.hash,blob:`${BASE}/inputs/${r.hash}.json.gz`})),
  limitations:['Availability observed locally at capturedAt; historical source revisions remain possible.',
   'SHA-256 detects alterations; it is not an externally certified timestamp.', 'No individual-player odds or DUO probabilities are synthesized.']};
}
function readManifest(root){
 const file=BASE+'/manifest.json';if(!fs.existsSync(path.join(root,file)))return {schemaVersion:1,entries:[]};
 const manifest=read(root,file);
 const primarySeen=new Set();
 for(const e of manifest.entries){
  if(!e.file.startsWith(BASE+'/')||e.file.split('/').includes('..'))throw Error('INVALID_SNAPSHOT_PATH');
  const s=read(root,e.file);
  const {integrity,...body}=s,key=e.protocolHash+':'+e.fixtureId;
  const expectedRole=s.baseline.status==='AVAILABLE'?(primarySeen.has(key)?'REVISION':'PRIMARY'):'ABSTENTION';
  if(!verifyHash(s)||s.integrity.sha256!==e.sha256||s.protocolHash!==e.protocolHash||s.fixture.id!==e.fixtureId||s.capturedAt!==e.capturedAt||
   e.fingerprint!==sha256({...body,capturedAt:null})||e.kickoffUtc!==s.fixture.kickoffUtc||e.evaluationCohort!==s.evaluationCohort||
   e.role!==expectedRole||!(Date.parse(s.capturedAt)<Date.parse(s.fixture.kickoffUtc)))throw Error('SNAPSHOT_INTEGRITY_FAILED '+e.file);
  if(expectedRole==='PRIMARY')primarySeen.add(key);
 }
 return manifest;
}
function verifyInputBlobs(root,snapshot,verified=new Set()){
 for(const input of snapshot.inputs){
  if(input.blob!==`${BASE}/inputs/${input.sha256}.json.gz`)throw Error('INVALID_INPUT_BLOB_PATH');
  if(verified.has(input.sha256))continue;
  const bytes=zlib.gunzipSync(fs.readFileSync(path.join(root,input.blob)));
  if(bytesHash(bytes)!==input.sha256)throw Error('INPUT_BLOB_INTEGRITY_FAILED '+input.file);
  verified.add(input.sha256);
 }
 return true;
}
function persistCapture(root,snapshot,records,manifest,clock=()=>new Date()){
 const fingerprint=sha256({...snapshot,capturedAt:null});
 const duplicate=manifest.entries.find(e=>e.fixtureId===snapshot.fixture.id&&e.protocolHash===snapshot.protocolHash&&e.fingerprint===fingerprint);
 if(duplicate){verifyInputBlobs(root,read(root,duplicate.file));return {status:'UNCHANGED',entry:duplicate};}
 const deadline=Date.parse(snapshot.fixture.kickoffUtc);
 if(clock().getTime()>=deadline)throw Error('KICKOFF_PASSED_DURING_CAPTURE');
 for(const r of records){
  const file=path.join(root,BASE,'inputs',r.hash+'.json.gz');fs.mkdirSync(path.dirname(file),{recursive:true});
  if(fs.existsSync(file)){if(bytesHash(zlib.gunzipSync(fs.readFileSync(file)))!==r.hash)throw Error('INPUT_BLOB_INTEGRITY_FAILED');}
  else fs.writeFileSync(file,zlib.gzipSync(r.bytes),{flag:'wx'});
 }
 if(clock().getTime()>=deadline)throw Error('KICKOFF_PASSED_DURING_CAPTURE');
 snapshot.integrity={sha256:canonicalMatchHash(snapshot),algorithm:'SHA-256'};
 const file=`${BASE}/${snapshot.fixture.season}/${snapshot.fixture.id}/${snapshot.capturedAt.replaceAll(':','-')}-${snapshot.integrity.sha256.slice(0,12)}.json`;
 immutableJson(root,file,snapshot);
 if(clock().getTime()>=deadline)throw Error('KICKOFF_PASSED_DURING_WRITE_UNREGISTERED_SNAPSHOT');
 const hasPrimary=manifest.entries.some(e=>e.fixtureId===snapshot.fixture.id&&e.protocolHash===snapshot.protocolHash&&e.role==='PRIMARY');
 const entry={fixtureId:snapshot.fixture.id,matchday:snapshot.fixture.matchday,protocolHash:snapshot.protocolHash,file,
  sha256:snapshot.integrity.sha256,fingerprint,capturedAt:snapshot.capturedAt,kickoffUtc:snapshot.fixture.kickoffUtc,
  lineupState:snapshot.lineups.status,evaluationCohort:snapshot.evaluationCohort,
  role:snapshot.baseline.status==='AVAILABLE'?(hasPrimary?'REVISION':'PRIMARY'):'ABSTENTION'};
 manifest.entries.push(entry);
 const target=path.join(root,BASE,'manifest.json'),tmp=target+'.'+process.pid+'.tmp';
 fs.writeFileSync(tmp,JSON.stringify(manifest,null,2)+'\n',{flag:'wx'});fs.renameSync(tmp,target);
 return {status:'CAPTURED',entry};
}
function capturePending(root,{matchId=null,matchday=null,clock=()=>new Date(),initializeProtocol=false}={}){
 if(!fs.existsSync(path.join(root,BASE,'protocol.json'))&&!initializeProtocol)return {status:'INACTIVE',captures:[]};
 const protocol=initializeProtocol?initialize(root,clock()):read(root,BASE+'/protocol.json');validateProtocol(root,protocol);
 const dir=path.join(root,BASE);fs.mkdirSync(dir,{recursive:true});const lock=path.join(dir,'capture.lock');
 let fd;try{fd=fs.openSync(lock,'wx');}catch(e){if(e.code==='EEXIST')throw Error('CAPTURE_BUSY');throw e;}
 try{
  const fixtures=read(root,'data/normalized/matches.json'),predictions=read(root,'data/normalized/predictions.json');
  const activeDays=new Set(predictions.predictions.filter(p=>fixtures.some(f=>f.id===p.matchId&&canCapture(f,clock())===null)).map(p=>fixtures.find(f=>f.id===p.matchId).matchday));
  const targets=fixtures.filter(f=>f.competition==='serie-a'&&f.season==='2026-27'&&(matchId?f.id===matchId:matchday?f.matchday===matchday:activeDays.has(f.matchday)));
  if(matchId&&!targets.length)throw Error('UNKNOWN_CANONICAL_FIXTURE');
  const manifest=readManifest(root),captures=[];
  for(const f of targets){
   const now=clock(),reason=canCapture(f,now);
   if(reason){captures.push({fixtureId:f.id,status:'BLOCKED',reason});continue;}
   const inputs=loadInputs(root,f,now),s=makeCapture(root,f,inputs,protocol,now);
   const result=persistCapture(root,s,inputs.records,manifest,clock);captures.push({fixtureId:f.id,...result});
  }
  return {status:'ACTIVE',protocolHash:protocol.integrity.sha256,captures};
 }finally{if(fd!==undefined)fs.closeSync(fd);fs.unlinkSync(lock);}
}
module.exports={BASE,METHOD_FILES,VARIANTS,initialize,validateProtocol,canCapture,forecast,lineupsFor,loadInputs,makeCapture,
 readManifest,persistCapture,capturePending,verifyHash,immutableJson,bytesHash,verifyInputBlobs,sourceTimestamp};
