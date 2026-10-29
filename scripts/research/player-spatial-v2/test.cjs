'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {POLICY,contextWeight,apply,featureVector}=require('./model.cjs');
const {load,cohort,walkForward}=require('./run.cjs');
const {enrich}=require('./enrich.cjs');
const root=path.resolve(__dirname,'../../..'),near=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} != ${b}`);
const current={coachId:'a',cycleStart:'2026-09-01'},observation={lineupComplete:true,starterIds:['1','2'],headCoachId:'a',date:'2026-09-02'};
const same=contextWeight(observation,['1','2'],current),other=contextWeight({...observation,headCoachId:'b'},['1','2'],current);
near(other.weight,same.weight*POLICY.oldCoachWeight);
near(contextWeight({...observation,date:'2026-08-01'},['1','2'],current).weight,other.weight);
assert.ok(contextWeight({...observation,starterIds:Array.from({length:11},(_,i)=>String(i))},['1','2','3','4'],current).weight>same.weight);
assert.equal(contextWeight({...observation,lineupComplete:false},['1'],current),null);
for(let i=0;i<100;i++){
 const vector={fixtureId:'synthetic',teams:[{teamId:'a',volumeSignal:.2}],rows:[
  {playerId:'1',teamId:'a',status:'AVAILABLE',shots:1+i/10,sot:.4+i/40,signal:.2},
  {playerId:'2',teamId:'a',status:'AVAILABLE',shots:2,sot:1,signal:-.2},
  {playerId:'3',teamId:'a',status:'ABSTAIN',shots:.3,sot:.1,signal:null}]};
 for(const mode of ['allocation','volume'])for(const beta of [-1,0,1]){
  const p=apply(vector,beta,mode),c=p.conservation[0];
  if(mode==='allocation'){near(c.baselineShots,c.adjustedShots);near(c.baselineSot,c.adjustedSot);}
  else assert.ok(c.adjustedShots>=.95*c.baselineShots-1e-9&&c.adjustedShots<=1.05*c.baselineShots+1e-9);
  for(const r of p.rows){assert.ok(r.adjustedShots>=.9*r.shots-1e-9&&r.adjustedShots<=1.1*r.shots+1e-9);assert.ok(r.adjustedSot<=r.adjustedShots&&r.adjustedSot>=0);
   assert.equal(r.duoProbability,null);assert.equal(r.fairOdds,null);assert.equal(r.ev,null);
   if(beta===0||r.status==='ABSTAIN'){assert.equal(r.adjustedShots,r.shots);assert.equal(r.adjustedSot,r.sot);}}
 }
 vector.rows[2].shots=null;assert.ok(apply(vector,1).rows.every(r=>!r.applied));assert.equal(apply(vector,1).rows[2].adjustedShots,null);
}
const inputs=load(),data=cohort(inputs),walk=walkForward(data);assert.ok(data.rows.length>=30);
assert.equal(inputs.coverageAudit.openPlayVersusSetPieceAvailable,false);assert.equal(inputs.coverageAudit.onTargetVersusBlockedAvailable,false);
assert.ok(inputs.dataset.matches.flatMap(m=>m.events).every(e=>e.onTargetVerified===null&&e.phaseVerified===(e.penalty?'penalty':null)));
for(const fold of walk.folds){
 for(const id of fold.trainingFixtureIds){const r=data.rows.find(r=>r.fixtureId===id);assert.ok(r.matchday<fold.matchday);for(const testId of fold.testFixtureIds)assert.ok(r.date<data.rows.find(r=>r.fixtureId===testId).vector.cutoffExclusive);}
 if(fold.trainingMatchdays.length<2){assert.equal(fold.parameters.allocation.beta,0);assert.equal(fold.parameters.volume.beta,0);}
}
const record=data.rows.at(-1),fixture=inputs.fixtures.find(f=>f.id===record.fixtureId);
const recompute=(fixtures,technical,shots=inputs.dataset)=>featureVector(fixture,fixtures,shots,technical,record.vector.rows,record.vector.cutoffExclusive);
const expected=recompute(inputs.fixtures,inputs.technical),future=structuredClone(inputs.fixtures);
const target=future.find(f=>f.id===fixture.id);target.score={home:99,away:88};target.playerStats={home:[],away:[]};
assert.deepEqual(recompute(future,inputs.technical),expected);
const technical=structuredClone(inputs.technical);technical.observations.push({...technical.observations[0],date:'2099-01-01',matchday:99,headCoachId:'future'});
assert.deepEqual(recompute(future,technical),expected);
const shots=structuredClone(inputs.dataset);shots.matches.push({fixtureId:'future',date:'2099-01-01',events:[{usable:true,zone:'box-central'}]});
assert.deepEqual(recompute(future,technical,shots),expected);
const small=featureVector(fixture,inputs.fixtures,inputs.dataset,inputs.technical,record.vector.rows.filter((r,i)=>i!==0),record.vector.cutoffExclusive);
assert.ok(small.rows.filter(r=>r.teamId===record.vector.rows[0].teamId).every(r=>r.status==='ABSTAIN'));
const invalid=structuredClone(inputs.shotManifest);invalid.sources[0].sha256='0'.repeat(64);
assert.throws(()=>enrich(root,inputs.dataset,invalid),/RAW_HASH_MISMATCH/);
const {BASE,manifest,capture,evaluate}=require('./prospective.cjs');
const {verifyInputBlobs}=require('../../spatial-prospective/core.cjs');
if(fs.existsSync(path.join(root,BASE,'protocol.json'))){
 const m=manifest(root);assert.ok(m.entries.length);
 for(const e of m.entries){const s=JSON.parse(fs.readFileSync(path.join(root,e.file),'utf8'));verifyInputBlobs(root,s);
  assert.equal(s.production,false);assert.equal(s.allocation.mode,'allocation');assert.equal(s.volume.mode,'volume');
  for(const p of Object.values(s.parameters))for(const id of p.trainingFixtureIds||[]){const f=inputs.fixtures.find(f=>f.id===id);assert.ok(f.matchday<s.fixture.matchday);assert.notEqual(id,s.fixture.id);}
  const before=fs.readFileSync(path.join(root,BASE,'manifest.json'),'utf8');
  const blocked=capture(root,{matchId:e.fixtureId,clock:()=>new Date('2099-01-01T00:00:00Z')});assert.equal(blocked.captures[0].status,'BLOCKED');
  assert.equal(fs.readFileSync(path.join(root,BASE,'manifest.json'),'utf8'),before);
 }
 assert.equal(evaluate(root).production,false);
 // Tamper evidence in a separate disposable directory, never touching the real freeze.
 const scratchBase=path.resolve(root,'output/player-spatial-v2-tests');fs.mkdirSync(scratchBase,{recursive:true});
 const scratch=fs.mkdtempSync(path.join(scratchBase,'integrity-'));
 try{
  for(const file of [BASE+'/protocol.json',BASE+'/manifest.json',...m.entries.map(e=>e.file)]){const target=path.join(scratch,file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(path.join(root,file),target);}
  const e=m.entries[0],file=path.join(scratch,e.file),s=JSON.parse(fs.readFileSync(file,'utf8'));s.baseline.rows[0].adjustedShots=999;fs.writeFileSync(file,JSON.stringify(s));
  assert.throws(()=>manifest(scratch),/INTEGRITY_FAILED/);
 }finally{
  const resolved=path.resolve(scratch);assert.ok(resolved.startsWith(scratchBase+path.sep)&&path.basename(resolved).startsWith('integrity-'));
  fs.rmSync(resolved,{recursive:true,maxRetries:5,retryDelay:100});
 }
}
console.log('Player spatial v2: context/cycle weights, 600 allocation/volume cases, missing data, unavailable labels, raw hashes, target/future exclusion and chronological folds passed.');
