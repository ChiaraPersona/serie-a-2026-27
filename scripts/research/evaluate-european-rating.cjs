'use strict';
// Scores immutable research snapshots only; never writes the operational registry.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {evaluateEvidence}=require('../champions/event-validation.cjs');
const {VALIDATION_CRITERIA}=require('../md06-statistical-models');
const {zonedLocalToUtc}=require('../champions/complete-forecast-snapshots');
const root=path.resolve(__dirname,'../..'),prefix=path.join(root,'output/champions-european-rating-research')+path.sep;
const digest=v=>crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex');
function scoreSnapshot(snapshot,calendar,now){
 const {contentHash,...payload}=snapshot;
 if(contentHash!==digest(payload)||!(Date.parse(snapshot.createdAt)<Date.parse(snapshot.kickoffAt)))return {quarantine:'HASH_OR_PREMATCH_CHRONOLOGY_FAILED',rows:[]};
 const f=calendar.fixtures.find(f=>f.id===snapshot.fixtureId),score=f?.score||f?.matchReport?.score;
 if(!f||Date.parse(zonedLocalToUtc(f.date,f.kickoff,'Europe/Rome'))!==Date.parse(snapshot.kickoffAt))return {quarantine:'CANONICAL_FIXTURE_OR_KICKOFF_MISMATCH',rows:[]};
 if(calendar.phase!=='league'||!f||f.status!=='finished'||!(Date.parse(now)>Date.parse(snapshot.kickoffAt))||![score?.home,score?.away].every(x=>Number.isInteger(x)&&x>=0))return {pending:snapshot.events.length,rows:[]};
 const outcome=score.home>score.away?'1':score.home<score.away?'2':'X';
 return {rows:snapshot.events.map((e,i)=>({...e,eventId:snapshot.fixtureId+':'+i,fixtureId:snapshot.fixtureId,kickoffAt:snapshot.kickoffAt,availableAt:snapshot.createdAt,availabilityVerified:true,actualVerified:true,outcome:Number(e.target.direction===outcome),outcomeAvailableAt:now,phase:snapshot.evaluationWindow}))};
}
function run(folder){
 const dir=path.resolve(root,folder);if(!dir.startsWith(prefix))throw Error('Research run inside output/champions-european-rating-research required');
 const read=p=>JSON.parse(fs.readFileSync(p,'utf8')),index=read(path.join(dir,'prospective-index.json')),protocol=read(path.join(dir,'prospective-protocol.json'));
 if(digest(protocol.criteria)!==digest(VALIDATION_CRITERIA))throw Error('Frozen validation criteria differ; do not reinterpret this experiment under new gates');
 const calendar=read(path.join(root,'data/normalized/champions-league-2026-27.json')),now=new Date().toISOString(),rows=[],quarantine=[];let pending=0;
 for(const item of index.snapshots){
  if(path.basename(item.file)!==item.file)throw Error('Invalid snapshot path');
  const snapshot=read(path.join(dir,item.file));
  if(snapshot.protocolHash!==digest(protocol)||snapshot.events.some(e=>e.modelId!==index.modelId)){quarantine.push({fixtureId:item.fixtureId,reason:'PROTOCOL_OR_MODEL_MISMATCH'});continue;}
  const result=scoreSnapshot(snapshot,calendar,now);rows.push(...result.rows);pending+=result.pending||0;if(result.quarantine)quarantine.push({fixtureId:item.fixtureId,reason:result.quarantine});
 }
 const evidence=evaluateEvidence(rows),result={asOf:now,modelId:index.modelId,status:'RESEARCH_ONLY_NO_OPERATIONAL_ACTIVATION',pending,quarantine,evidence,operationalApproval:false};
 const file=path.join(dir,'prospective-evaluation-'+now.replace(/[:.]/g,'-')+'.json');fs.writeFileSync(file,JSON.stringify(result,null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify({file,pending,quarantine:quarantine.length,eligible:evidence.eligible,eventPasses:evidence.events.filter(e=>e.approvable).length,operationalApproval:false}));return result;
}
if(require.main===module){const i=process.argv.indexOf('--run');if(i<0)throw Error('--run output/champions-european-rating-research/<run> required');run(process.argv[i+1]);}
module.exports={scoreSnapshot,run};
