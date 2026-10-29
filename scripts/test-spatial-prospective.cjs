'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),zlib=require('node:zlib'),crypto=require('node:crypto');
const {BASE,METHOD_FILES,canCapture,forecast,lineupsFor,sourceTimestamp,capturePending,readManifest,verifyHash,verifyInputBlobs,immutableJson,
 makeCapture,loadInputs,persistCapture,validateProtocol}=require('./spatial-prospective/core.cjs');
const {evaluate,losses}=require('./spatial-prospective/evaluate.cjs');
const {canonicalMatchHash,toKickoffUtc}=require('./predictions/snapshot-core');
const {score}=require('./research/spatial-backtest/model.cjs');
const root=path.resolve(__dirname,'..'),base=path.resolve(root,'output/spatial-prematch-tests');fs.mkdirSync(base,{recursive:true});
const target='fiorentina-atalanta-2026-27-md-09',now=new Date('2026-10-29T18:30:00Z');
const read=(r,f)=>JSON.parse(fs.readFileSync(path.join(r,f),'utf8'));
const write=(r,f,d)=>{fs.mkdirSync(path.dirname(path.join(r,f)),{recursive:true});fs.writeFileSync(path.join(r,f),JSON.stringify(d,null,2)+'\n')};
const files=['data/normalized/matches.json','data/normalized/predictions.json','data/normalized/serie-a-shot-events-2026-27.json',
 'data/normalized/serie-a-technical-context-2026-27.json','data/sources/official-lineups-2026-27.json','data/sources/probable-lineups-md9-2026-27.json'];
const realBytes=Object.fromEntries([...files,BASE+'/protocol.json',BASE+'/manifest.json'].map(f=>[f,fs.readFileSync(path.join(root,f))]));
const temp=()=>{const r=path.join(base,'test-'+crypto.randomUUID());fs.mkdirSync(r,{recursive:true});
 for(const f of [...files,...METHOD_FILES]){fs.mkdirSync(path.dirname(path.join(r,f)),{recursive:true});fs.copyFileSync(path.join(root,f),path.join(r,f));}
 const p=read(root,BASE+'/protocol.json');p.activatedAt='2026-10-29T17:00:00Z';p.integrity.sha256=canonicalMatchHash(p);write(r,BASE+'/protocol.json',p);return r;};
const remove=r=>{const resolved=path.resolve(r);assert(resolved.startsWith(base+path.sep)&&path.basename(resolved).startsWith('test-'));fs.rmSync(resolved,{recursive:true,force:true});};
const fixture=read(root,files[0]).find(f=>f.id===target);
assert.equal(canCapture(fixture,now),null);
assert.equal(canCapture(fixture,new Date(toKickoffUtc(fixture))),'KICKOFF_ALREADY_PASSED');
assert.equal(canCapture({...fixture,status:'live'},now),'NOT_SCHEDULED');
assert.equal(canCapture({...fixture,score:{home:0,away:0}},now),'TARGET_ALREADY_HAS_RESULT');
assert.equal(canCapture({...fixture,dateStatus:'unknown'},now),'UNCONFIRMED_KICKOFF');
assert.equal(canCapture({...fixture,id:'../../outside'},now),'INVALID_CANONICAL_FIXTURE_ID');
assert.equal(sourceTimestamp('27/10/2026 - 17:22'),Date.parse('2026-10-27T16:22:00Z'));
const players=Array.from({length:11},(_,i)=>({playerId:'p'+i,currentName:'Player '+i}));
const official={fixtures:[{matchId:target,status:'official',retrievedAt:'2026-10-29T19:00:00Z',teams:[fixture.homeTeam,fixture.awayTeam].map(teamId=>({teamId,players}))}]};
assert.equal(lineupsFor(fixture,official,null,now).status,'UNKNOWN');
official.fixtures[0].retrievedAt='2026-10-29T18:29:00Z';assert.equal(lineupsFor(fixture,official,null,now).status,'OFFICIAL');
let r=temp();
try{
 const protocol=read(r,BASE+'/protocol.json');
 for(const f of METHOD_FILES){const text=fs.readFileSync(path.join(r,f),'utf8');fs.writeFileSync(path.join(r,f),text.replace(/\r\n/g,'\n'));}
 assert.doesNotThrow(()=>validateProtocol(r,protocol),'Git LF checkout invalidated the frozen method');
 const method=METHOD_FILES[0],original=fs.readFileSync(path.join(r,method));fs.appendFileSync(path.join(r,method),'\n// changed method\n');
 assert.throws(()=>validateProtocol(r,protocol),/METHOD_CHANGED/);fs.writeFileSync(path.join(r,method),original);
 const first=capturePending(r,{matchId:target,clock:()=>now});assert.equal(first.captures[0].status,'CAPTURED');
 const manifest=readManifest(r),entry=manifest.entries[0],snapshot=read(r,entry.file),frozenBytes=fs.readFileSync(path.join(r,entry.file));
 assert.equal(entry.role,'PRIMARY');assert(verifyHash(snapshot));assert(verifyInputBlobs(r,snapshot));assert.equal(snapshot.lineups.status,'PROBABLE');
 assert(!Object.hasOwn(snapshot,'actual'));assert(!Object.hasOwn(snapshot.fixture,'score'));
 assert(snapshot.inputs.some(i=>i.file.includes('shot-events'))&&snapshot.inputs.some(i=>i.file.includes('technical-context')));
 assert.equal(snapshot.evaluationCohort,'PILOT_POST_EXPLORATORY');
 assert.equal(capturePending(r,{matchId:target,clock:()=>new Date(now.getTime()+1000)}).captures[0].status,'UNCHANGED');
 assert.equal(readManifest(r).entries.length,1);assert(fs.readFileSync(path.join(r,entry.file)).equals(frozenBytes));
 // An official revision is appended; it never replaces the first baseline.
 const lineups=read(r,files[4]);lineups.fixtures.push({...official.fixtures[0]});write(r,files[4],lineups);
 const revision=capturePending(r,{matchId:target,clock:()=>new Date(now.getTime()+2000)});assert.equal(revision.captures[0].entry.role,'REVISION');
 assert(fs.readFileSync(path.join(r,entry.file)).equals(frozenBytes));assert.equal(readManifest(r).entries.length,2);
 const pending=evaluate(r,new Date(now.getTime()+3000));assert.equal(pending.pending.length,1);assert.equal(pending.pilot.matches,0);assert.equal(pending.prospective.matches,0);
 assert.equal(pending.prospective.ownSamples.recent.variant.goalLogLoss,null);
 // Canonical finished 0–0 is a real zero, not missing data. Only the primary is scored.
 const matches=read(r,files[0]);Object.assign(matches.find(f=>f.id===target),{status:'finished',score:{home:0,away:0}});write(r,files[0],matches);
 const scored=evaluate(r,new Date('2026-10-30T12:00:00Z'));assert.equal(scored.pilot.matches,1);assert.equal(scored.revisionsIgnored,1);
 assert.equal(scored.prospective.matches,0);assert.equal(scored.rows[0].snapshot,entry.file);assert.equal(scored.roi,null);assert.equal(scored.certifiedProviderSettlement,false);
 const expected=score({actual:{home:0,away:0}},snapshot.baseline.forecast.lambda).metrics;
 assert(Math.abs(scored.rows[0].metrics.baseline.goalLogLoss-expected.goalLogLoss)<1e-12);
 for(const [k,v]of Object.entries(losses(forecast({home:1.1,away:1.5}),{home:2,away:1}))){
  assert(Math.abs(v-score({actual:{home:2,away:1}},{home:1.1,away:1.5}).metrics[k])<1e-12);
 }
 // Changed current forecasts cannot alter scores derived from frozen probabilities.
 const p=read(r,files[1]);p.predictions.find(p=>p.matchId===target).expectedGoals={home:99,away:99};write(r,files[1],p);
 assert.deepEqual(evaluate(r,new Date('2026-10-30T12:00:00Z')).rows,scored.rows);
 const corrupted=structuredClone(snapshot);corrupted.models.recent.forecast.lambda.home+=1;write(r,entry.file,corrupted);
 assert.throws(()=>readManifest(r),/SNAPSHOT_INTEGRITY_FAILED/);fs.writeFileSync(path.join(r,entry.file),frozenBytes);
 const rawManifest=read(r,BASE+'/manifest.json');rawManifest.entries[1].role='PRIMARY';write(r,BASE+'/manifest.json',rawManifest);
 assert.throws(()=>readManifest(r),/SNAPSHOT_INTEGRITY_FAILED/);rawManifest.entries[1].role='REVISION';write(r,BASE+'/manifest.json',rawManifest);
 const blob=snapshot.inputs[0].blob;fs.writeFileSync(path.join(r,blob),zlib.gzipSync('{}'));
 assert.throws(()=>verifyInputBlobs(r,snapshot),/INPUT_BLOB_INTEGRITY_FAILED/);
 assert.throws(()=>immutableJson(r,entry.file,{changed:true}),/IMMUTABLE_CONTENT_CONFLICT/);
}finally{remove(r);}
r=temp();try{
 // First missing baseline is logged as abstention; later real baseline gets the primary.
 const predictions=read(r,files[1]),copy=structuredClone(predictions);predictions.predictions=predictions.predictions.filter(p=>p.matchId!==target);write(r,files[1],predictions);
 const missing=capturePending(r,{matchId:target,clock:()=>now});assert.equal(missing.captures[0].entry.role,'ABSTENTION');
 const abstention=read(r,missing.captures[0].entry.file);assert(Object.values(abstention.models).every(m=>m.status==='ABSTAIN'&&m.forecast===null));
 write(r,files[1],copy);assert.equal(capturePending(r,{matchId:target,clock:()=>new Date(now.getTime()+1000)}).captures[0].entry.role,'PRIMARY');
 assert.equal(readManifest(r).entries.length,2);
 // A new coach with zero prior games forces an explicit cycle-policy abstention.
 const context=read(r,files[3]);context.coachEvents.push({teamId:fixture.homeTeam,type:'appointment',headCoachId:'test-new-coach',name:'Test',publishedDate:'2026-10-26',effectiveDate:'2026-10-27'});write(r,files[3],context);
 const changed=capturePending(r,{matchId:target,clock:()=>new Date(now.getTime()+2000)}),s=read(r,changed.captures[0].entry.file);
 assert.equal(s.models['coach-cycle'].status,'ABSTAIN');assert.equal(s.models['coach-cycle'].forecast,null);
 assert.equal(s.models['coach-cycle'].abstentionReason,'INSUFFICIENT_PRIOR_MATCHES');
 const late=capturePending(r,{matchId:target,clock:()=>new Date('2026-10-30T12:00:00Z')});assert.equal(late.captures[0].status,'BLOCKED');
 const count=readManifest(r).entries.length;assert.equal(count,3);
}finally{remove(r);}
r=temp();try{
 const protocol=read(r,BASE+'/protocol.json'),input=loadInputs(r,fixture,now),s=makeCapture(r,fixture,input,protocol,now),manifest={schemaVersion:1,entries:[]};
 let calls=0;const clock=()=>++calls<3?now:new Date('2026-10-30T12:00:00Z');
 assert.throws(()=>persistCapture(r,s,input.records,manifest,clock),/KICKOFF_PASSED_DURING_WRITE/);
 assert.equal(readManifest(r).entries.length,0,'Unregistered late file was evaluated');
 fs.writeFileSync(path.join(r,BASE,'capture.lock'),'test lock');assert.throws(()=>capturePending(r,{matchId:target,clock:()=>now}),/CAPTURE_BUSY/);
 assert.equal(fs.readFileSync(path.join(r,BASE,'capture.lock'),'utf8'),'test lock');
}finally{remove(r);}
r=temp();try{
 // The next matchday is kept separate from the already explored MD9 pilot.
 const matches=read(r,files[0]),f=matches.find(m=>m.id==='bologna-monza-2026-27-md-10'),predictions=read(r,files[1]);
 const p=structuredClone(predictions.predictions.find(p=>p.matchId===target));p.matchId=f.id;p.generatedAt=now.toISOString();
 p.futureDataDiagnostics.dataCutoff={matchdayExclusive:10,targetMatchIdExcluded:f.id,completedOnly:true};predictions.predictions.push(p);write(r,files[1],predictions);
 const captured=capturePending(r,{matchId:f.id,clock:()=>now});assert.equal(captured.captures[0].entry.evaluationCohort,'PROSPECTIVE_PREDECLARED');
 f.status='finished';f.score={home:1,away:0};write(r,files[0],matches);
 const result=evaluate(r,new Date('2026-11-01T12:00:00Z'));assert.equal(result.prospective.matches,1);assert.equal(result.pilot.matches,0);
 assert.equal(result.prospective.commonSample.matches,1);
}finally{remove(r);}
for(const [f,b]of Object.entries(realBytes))assert(fs.readFileSync(path.join(root,f)).equals(b),'Production input or real snapshot manifest changed: '+f);
console.log('OK prospective capture: real-time gate; future timestamps; primary/revisions; exact input blobs; missing-baseline and coach-cycle abstentions; tampering; kickoff race; locking; frozen-only scoring; pending N/D; production files unchanged.');
