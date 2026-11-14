'use strict';
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib');
const {canonicalMatchHash,toKickoffUtc,sha256}=require('../../predictions/snapshot-core');
const {BASE:TEAM_BASE,loadInputs,canCapture,immutableJson,verifyHash,verifyInputBlobs,bytesHash}=require('../../spatial-prospective/core.cjs');
const {POLICY,playerRows,featureVector,apply,outcomeRows,metrics}=require('./model.cjs');
const BASE='data/predictions/player-spatial-prospective';
const read=(root,file)=>JSON.parse(fs.readFileSync(path.join(root,file),'utf8'));
const methodHash=()=>bytesHash(Buffer.from(fs.readFileSync(path.join(__dirname,'model.cjs'),'utf8').replace(/\r\n/g,'\n')));
function initialize(root,now=new Date()){
 const file=BASE+'/protocol.json';if(fs.existsSync(path.join(root,file)))return read(root,file);
 const research=read(root,'data/analysis/player-spatial-2026-10-29/results.json');
 const protocol={schemaVersion:1,activatedAt:now.toISOString(),policy:POLICY,methodHash:methodHash(),production:false,state:'SHADOW_RESEARCH_ONLY',
  fitted:research.parameters,hypothesisBeta:1,hypothesisStatus:'FIXED_THEORETICAL_BENCHMARK_NOT_SELECTED_FROM_HOLDOUT',
  rationale:'Fitted beta is recorded unchanged, including zero. The unit exposure hypothesis is a separate prospective experiment, not a validated replacement.',
  primaryRule:'FIRST_PREMATCH_CAPTURE_PER_CANONICAL_FIXTURE',confirmatoryMatchdayMinimum:10};
 protocol.integrity={sha256:canonicalMatchHash(protocol),algorithm:'SHA-256'};immutableJson(root,file,protocol);return protocol;
}
function manifest(root){
 const protocol=read(root,BASE+'/protocol.json');if(!verifyHash(protocol))throw Error('PLAYER_SPATIAL_PROTOCOL_INTEGRITY_FAILED');
 const file=BASE+'/manifest.json',m=fs.existsSync(path.join(root,file))?read(root,file):{entries:[]},seen=new Set();
 for(const e of m.entries){const s=read(root,e.file),{integrity,capturedAt,...payload}=s;
  if(!e.file.startsWith(BASE+'/2026-27/')||e.file.includes('..')||!verifyHash(s)||s.protocolHash!==protocol.integrity.sha256||s.integrity.sha256!==e.sha256||e.fixtureId!==s.fixture.id||e.fingerprint!==sha256(payload)||
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
  if(!p||!Number.isFinite(Date.parse(p.generatedAt))||Date.parse(p.generatedAt)>now.getTime()||cutoff?.completedOnly!==true||cutoff.matchdayExclusive!==fixture.matchday||cutoff.targetMatchIdExcluded!==fixture.id){captures.push({fixtureId:fixture.id,status:'ABSTAIN',reason:'NO_VALID_BASELINE'});continue;}
  const localDate=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Rome',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
  const metadata={id:fixture.id,competition:fixture.competition,season:fixture.season,date:fixture.date,kickoff:fixture.kickoff,matchday:fixture.matchday,homeTeam:fixture.homeTeam,awayTeam:fixture.awayTeam};
  const vector=featureVector(metadata,inputs.fixtures,inputs.shots,inputs.technical,playerRows(p),localDate);
  const body={schemaVersion:1,protocolHash:protocol.integrity.sha256,fixture:metadata,lineups:inputs.lineups,baselineGeneratedAt:p.generatedAt,vector,
   baseline:apply(vector,0),fitted:apply(vector,protocol.fitted.beta),opportunityHypothesis:apply(vector,protocol.hypothesisBeta),
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
  rows.push({fixtureId:f.id,matchday:f.matchday,cohort:s.cohort,metrics:{baseline:metrics(s.baseline,actuals),fitted:metrics(s.fitted,actuals),hypothesis:metrics(s.opportunityHypothesis,actuals)},
   starterSubset:{baseline:metrics(s.baseline,starters),fitted:metrics(s.fitted,starters),hypothesis:metrics(s.opportunityHypothesis,starters)}});
 }return {pending,rows,prospectiveFixtures:rows.filter(r=>r.cohort==='PROSPECTIVE_PREDECLARED').length,pilotFixtures:rows.filter(r=>r.cohort==='PILOT_POST_EXPLORATORY').length,roi:null,production:false};
}
if(require.main===module){const args=process.argv.slice(2),i=args.indexOf('--match');try{console.log(JSON.stringify(args.includes('--evaluate')?evaluate(path.resolve(__dirname,'../../..')):
 capture(path.resolve(__dirname,'../../..'),{matchId:i<0?null:args[i+1],initializeProtocol:args.includes('--initialize')}),null,2));}catch(e){console.error(e.message);process.exitCode=1;}}
module.exports={BASE,initialize,manifest,capture,evaluate};
