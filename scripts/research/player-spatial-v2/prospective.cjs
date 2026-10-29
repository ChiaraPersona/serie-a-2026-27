'use strict';
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib');
const {canonicalMatchHash,toKickoffUtc,sha256}=require('../../predictions/snapshot-core');
const {BASE:TEAM_BASE,loadInputs,canCapture,immutableJson,verifyHash,verifyInputBlobs,bytesHash}=require('../../spatial-prospective/core.cjs');
const {POLICY,playerRows,featureVector,apply,outcomeRows,metrics}=require('./model.cjs');
const {enrich}=require('./enrich.cjs');
const BASE='data/predictions/player-spatial-v2-prospective';
const read=(root,file)=>JSON.parse(fs.readFileSync(path.join(root,file),'utf8'));
const METHOD_FILES=['model.cjs','enrich.cjs','../player-spatial/model.cjs','../spatial-backtest/model.cjs','../../shot-events/technical-context.cjs','../../shot-events/matchup.cjs','../../parse-statmuse-game.js','../../predictions/snapshot-core.js'];
const methodHash=()=>sha256(Object.fromEntries(METHOD_FILES.map(f=>[f,bytesHash(Buffer.from(fs.readFileSync(path.join(__dirname,f),'utf8').replace(/\r\n/g,'\n')))])));
function initialize(root,now=new Date()){
 const file=BASE+'/protocol.json';if(fs.existsSync(path.join(root,file)))return read(root,file);
 const studyFile='data/analysis/player-spatial-v2-2026-10-29/results.json',research=read(root,studyFile);
 const protocol={schemaVersion:1,activatedAt:now.toISOString(),policy:POLICY,methodHash:methodHash(),production:false,state:'SHADOW_RESEARCH_ONLY',
  fitted:research.finalParameters,foldParameters:research.walkForward.folds.map(f=>({matchday:f.matchday,parameters:f.parameters})),
  maximumTrainingMatchday:Math.max(...research.walkForward.rows.map(r=>r.matchday)),studyFile,studyHash:bytesHash(fs.readFileSync(path.join(root,studyFile))),
  rationale:'Allocation and volume are separate predeclared branches, never stacked or selected using target outcomes. Historical exploration is not confirmation. Coefficients stay frozen under this protocol.',
  primaryRule:'FIRST_PREMATCH_CAPTURE_PER_CANONICAL_FIXTURE',confirmatoryMatchdayMinimum:10};
 protocol.integrity={sha256:canonicalMatchHash(protocol),algorithm:'SHA-256'};immutableJson(root,file,protocol);return protocol;
}
function manifest(root){
 const protocol=read(root,BASE+'/protocol.json');if(!verifyHash(protocol))throw Error('PLAYER_SPATIAL_PROTOCOL_INTEGRITY_FAILED');
 const file=BASE+'/manifest.json',m=fs.existsSync(path.join(root,file))?read(root,file):{entries:[]},seen=new Set();
 for(const e of m.entries){
  if(!e.file.startsWith(BASE+'/2026-27/')||e.file.includes('..')||e.file.includes('\\'))throw Error('INVALID_SNAPSHOT_PATH');
  const s=read(root,e.file),{integrity,capturedAt,...payload}=s;
  if(!verifyHash(s)||s.protocolHash!==protocol.integrity.sha256||s.integrity.sha256!==e.sha256||e.fixtureId!==s.fixture.id||e.fingerprint!==sha256(payload)||
   e.capturedAt!==s.capturedAt||!(Date.parse(s.capturedAt)<toKickoffUtc(s.fixture))||e.role!==(seen.has(e.fixtureId)?'REVISION':'PRIMARY'))throw Error('PLAYER_SPATIAL_SNAPSHOT_INTEGRITY_FAILED');
  seen.add(e.fixtureId);
 }return m;
}
function capture(root,{matchId=null,clock=()=>new Date(),initializeProtocol=false}={}){
 if(!fs.existsSync(path.join(root,BASE,'protocol.json'))&&!initializeProtocol)return {status:'INACTIVE',captures:[]};
 const protocol=initializeProtocol?initialize(root,clock()):read(root,BASE+'/protocol.json');
 if(!verifyHash(protocol)||protocol.methodHash!==methodHash())throw Error('PLAYER_SPATIAL_METHOD_CHANGED');
 const fixtures=read(root,'data/normalized/matches.json'),published=read(root,'data/normalized/predictions.json').predictions;
 const targets=fixtures.filter(f=>f.competition==='serie-a'&&(matchId?f.id===matchId:published.some(p=>p.matchId===f.id)&&canCapture(f,clock())===null));
 const dir=path.join(root,BASE);fs.mkdirSync(dir,{recursive:true});const lock=path.join(dir,'capture.lock');
 let fd;try{fd=fs.openSync(lock,'wx');}catch(e){if(e.code==='EEXIST')throw Error('PLAYER_SPATIAL_CAPTURE_BUSY');throw e;}
 try{const m=manifest(root),captures=[];
 for(const fixture of targets){
  const now=clock(),blocked=canCapture(fixture,now);if(blocked){captures.push({fixtureId:fixture.id,status:'BLOCKED',reason:blocked});continue;}
  if(now.getTime()<Date.parse(protocol.activatedAt))throw Error('BEFORE_PROTOCOL_ACTIVATION');
  const inputs=loadInputs(root,fixture,now),p=inputs.predictions.predictions.find(p=>p.matchId===fixture.id),cutoff=p?.futureDataDiagnostics?.dataCutoff;
  const canonical=inputs.fixtures.find(f=>f.id===fixture.id);
  if(!canonical||canCapture(canonical,now)||['homeTeam','awayTeam','matchday','date','kickoff'].some(k=>canonical[k]!==fixture[k]))throw Error('CANONICAL_FIXTURE_CHANGED_DURING_CAPTURE');
  if(!p||!Number.isFinite(Date.parse(p.generatedAt))||Date.parse(p.generatedAt)>now.getTime()||cutoff?.completedOnly!==true||cutoff.matchdayExclusive!==fixture.matchday||cutoff.targetMatchIdExcluded!==fixture.id){captures.push({fixtureId:fixture.id,status:'ABSTAIN',reason:'NO_VALID_BASELINE'});continue;}
  const localDate=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Rome',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
  const metadata={id:fixture.id,competition:fixture.competition,season:fixture.season,date:fixture.date,kickoff:fixture.kickoff,matchday:fixture.matchday,homeTeam:fixture.homeTeam,awayTeam:fixture.awayTeam};
  const parameters=fixture.matchday>protocol.maximumTrainingMatchday?protocol.fitted:protocol.foldParameters.find(f=>f.matchday===fixture.matchday)?.parameters;
  if(!parameters){captures.push({fixtureId:fixture.id,status:'ABSTAIN',reason:'NO_PRIOR_ONLY_PARAMETERS'});continue;}
  for(const param of Object.values(parameters))for(const id of param.trainingFixtureIds||[]){
   const f=inputs.fixtures.find(f=>f.id===id);
   if(!f||f.matchday>=fixture.matchday||f.date>=localDate||f.status!=='finished')throw Error('NONPRIOR_PARAMETER_TRAINING');
  }
  const shotManifestFile='data/sources/serie-a-shot-events-manifest-2026-27.json',rawBytes=fs.readFileSync(path.join(root,shotManifestFile));
  const studyBytes=fs.readFileSync(path.join(root,protocol.studyFile));
  if(bytesHash(studyBytes)!==protocol.studyHash)throw Error('FROZEN_TRAINING_STUDY_CHANGED_NEW_PROTOCOL_REQUIRED');
  const extension=enrich(root,inputs.shots,JSON.parse(rawBytes));
  const extensionBytes=Buffer.from(JSON.stringify({dataset:extension.dataset,roles:extension.roles,rawHashes:extension.hashes,audit:extension.audit}));
  inputs.records.push({file:shotManifestFile,bytes:rawBytes,hash:bytesHash(rawBytes)},
   {file:protocol.studyFile,bytes:studyBytes,hash:bytesHash(studyBytes)},
   {file:'derived/player-spatial-v2-evidence.json',bytes:extensionBytes,hash:bytesHash(extensionBytes)});
  const vector=featureVector(metadata,inputs.fixtures,extension.dataset,inputs.technical,playerRows(p),localDate);
  const body={schemaVersion:1,protocolHash:protocol.integrity.sha256,fixture:metadata,lineups:inputs.lineups,baselineGeneratedAt:p.generatedAt,vector,
   parameters,coverageAudit:extension.audit,baseline:apply(vector,0),allocation:apply(vector,parameters.allocation.beta),volume:apply(vector,parameters.volume.beta,'volume'),
   inputs:inputs.records.map(r=>({file:r.file,sha256:r.hash,blob:`${TEAM_BASE}/inputs/${r.hash}.json.gz`})),
   state:'SHADOW_RESEARCH_ONLY',production:false,cohort:fixture.matchday>=10?'PROSPECTIVE_PREDECLARED':'PILOT_POST_EXPLORATORY'};
  const fingerprint=sha256(body),existing=m.entries.find(e=>e.fixtureId===fixture.id&&e.fingerprint===fingerprint);
  if(existing){verifyInputBlobs(root,read(root,existing.file));captures.push({fixtureId:fixture.id,status:'UNCHANGED',entry:existing});continue;}
  const deadline=toKickoffUtc(fixture);
  for(const r of inputs.records){const blob=path.join(root,TEAM_BASE,'inputs',r.hash+'.json.gz');fs.mkdirSync(path.dirname(blob),{recursive:true});
   if(fs.existsSync(blob)){if(bytesHash(zlib.gunzipSync(fs.readFileSync(blob)))!==r.hash)throw Error('INPUT_BLOB_INTEGRITY_FAILED');}
   else fs.writeFileSync(blob,zlib.gzipSync(r.bytes),{flag:'wx'});}
  if(clock().getTime()>=deadline)throw Error('KICKOFF_PASSED_DURING_PLAYER_CAPTURE');
  const snapshot={...body,capturedAt:now.toISOString()};snapshot.integrity={sha256:canonicalMatchHash(snapshot),algorithm:'SHA-256'};
  const file=`${BASE}/2026-27/${fixture.id}/${snapshot.capturedAt.replaceAll(':','-')}-${snapshot.integrity.sha256.slice(0,12)}.json`;
  immutableJson(root,file,snapshot);if(clock().getTime()>=deadline)throw Error('LATE_PLAYER_SNAPSHOT_UNREGISTERED');
  const entry={fixtureId:fixture.id,file,sha256:snapshot.integrity.sha256,fingerprint,capturedAt:snapshot.capturedAt,role:m.entries.some(e=>e.fixtureId===fixture.id)?'REVISION':'PRIMARY'};m.entries.push(entry);
  const dest=path.join(root,BASE,'manifest.json'),tmp=dest+'.'+process.pid+'.tmp';fs.writeFileSync(tmp,JSON.stringify(m,null,2)+'\n',{flag:'wx'});fs.renameSync(tmp,dest);
  captures.push({fixtureId:fixture.id,status:'CAPTURED',entry,availablePlayers:vector.rows.filter(r=>r.status==='AVAILABLE').length});
 }return {status:'ACTIVE',captures};}finally{fs.closeSync(fd);fs.unlinkSync(lock);}
}
function evaluate(root,now=new Date()){
 const m=manifest(root),fixtures=read(root,'data/normalized/matches.json'),pending=[],rows=[];
 for(const e of m.entries.filter(e=>e.role==='PRIMARY')){
  const s=read(root,e.file),f=fixtures.find(f=>f.id===e.fixtureId);verifyInputBlobs(root,s);
  if(!f||f.status!=='finished'||toKickoffUtc(f)>now.getTime()||!f.score){pending.push({fixtureId:e.fixtureId,status:'AWAITING_CANONICAL_RESULT'});continue;}
  if(f.resultCoverage?.awarded||toKickoffUtc(f)!==toKickoffUtc(s.fixture))continue;
  const actuals=outcomeRows(f,s.baseline.rows),starters=actuals.filter(p=>p.actual?.starter);
  rows.push({fixtureId:f.id,matchday:f.matchday,cohort:s.cohort,metrics:{baseline:metrics(s.baseline,actuals),allocation:metrics(s.allocation,actuals),volume:metrics(s.volume,actuals)},
   starterSubset:{baseline:metrics(s.baseline,starters),allocation:metrics(s.allocation,starters),volume:metrics(s.volume,starters)}});
 }return {pending,rows,prospectiveFixtures:rows.filter(r=>r.cohort==='PROSPECTIVE_PREDECLARED').length,pilotFixtures:rows.filter(r=>r.cohort==='PILOT_POST_EXPLORATORY').length,roi:null,production:false};
}
if(require.main===module){const args=process.argv.slice(2),i=args.indexOf('--match');try{console.log(JSON.stringify(args.includes('--evaluate')?evaluate(path.resolve(__dirname,'../../..')):
 capture(path.resolve(__dirname,'../../..'),{matchId:i<0?null:args[i+1],initializeProtocol:args.includes('--initialize')}),null,2));}catch(e){console.error(e.message);process.exitCode=1;}}
module.exports={BASE,initialize,manifest,capture,evaluate};
