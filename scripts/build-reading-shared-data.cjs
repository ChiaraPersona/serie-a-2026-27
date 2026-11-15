'use strict';
// Presentation-only compilation; canonical match projections remain plain JSON.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {hydrateSync}=require('../js/services/reading-shared.js');
const root=path.resolve(__dirname,'..'),base='data/generated/readings/';
const manifestPath=base+'wire/serie-a-reading-shared-manifest.json';
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
const read=file=>JSON.parse(fs.readFileSync(path.join(root,file),'utf8'));
const fileHash=file=>sha(fs.readFileSync(path.join(root,file)));
function write(file,data){
 const target=path.join(root,file),text=JSON.stringify(data)+'\n';
 fs.mkdirSync(path.dirname(target),{recursive:true});
 if(fs.existsSync(target)&&fs.readFileSync(target,'utf8')===text)return;
 const temp=target+'.tmp';fs.writeFileSync(temp,text);
 for(let i=0;;i++)try{fs.renameSync(temp,target);break;}catch(e){if(!['EPERM','EACCES','EBUSY'].includes(e.code)||i>=19)throw e;Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,50);}
}
function addHints(hints){const index=read(base+'index.json');index.sharedReadings=hints;write(base+'index.json',index);}
function build({now=new Date()}={}){
 const matches=read('data/normalized/matches.json').filter(m=>m.competition==='serie-a'&&m.status==='scheduled');
 const inputFiles=['data/normalized/matches.json','scripts/build-reading-shared-data.cjs','js/services/reading-shared.js',...matches.map(m=>base+'matches/'+m.id+'.json')];
 const inputs=inputFiles.map(file=>({path:file,sha256:fileHash(file)}));
 const previous=fs.existsSync(path.join(root,manifestPath))?read(manifestPath):null;
 const retention=14*24*60*60*1000;
 if(previous?.schemaVersion===1&&JSON.stringify(previous.inputs)===JSON.stringify(inputs)&&!previous.retained.some(r=>r.retiredAt&&now-new Date(r.retiredAt)>retention)&&previous.outputs.every(r=>fs.existsSync(path.join(root,r.path))&&fileHash(r.path)===r.sha256)){
  addHints(previous.hints);return {fixtures:matches.length,blocks:previous.active.length,reused:true};
 }
 const blocks=new Map(),rows=[];
 function offer(row,ptr,value,merge=false){
  if(value===undefined)return;const text=JSON.stringify(value),bytes=Buffer.byteLength(text);if(bytes<4096)return;
  const hash=sha(text);if(!blocks.has(hash))blocks.set(hash,{value,bytes,count:0});blocks.get(hash).count++;
  row.candidates.push({path:ptr,hash,merge});
 }
 for(const match of matches){
  const file=base+'matches/'+match.id+'.json',original=read(file),row={id:match.id,file,original,candidates:[]};
  for(const key of ['teams','objectiveProfiles','finishedIds'])offer(row,[key],original[key]);
  if(original.teamDirectory){const common={...original.teamDirectory};delete common.officialLineups;offer(row,['teamDirectory'],common,true);}
  for(const [key,value] of Object.entries(original.artifacts||{}))offer(row,['artifacts',key],value);
  rows.push(row);
 }
 const active=new Set(),entries={},blockIds=[],ids=new Map(),hints={blocks:blockIds,fixtures:{}};
 let beforeBytes=0,wireBytes=0;
 for(const row of rows){
  const data=structuredClone(row.original),refs=row.candidates.filter(ref=>blocks.get(ref.hash).count>=4);
  for(const ref of refs){
   active.add(ref.hash);if(!ids.has(ref.hash)){ids.set(ref.hash,blockIds.length);blockIds.push(ref.hash);}
   const parent=ref.path.length===1?data:data[ref.path[0]],key=ref.path.at(-1);
   if(ref.merge)parent[key]={officialLineups:parent[key].officialLineups};else delete parent[key];
  }
  const wire={readingSharedVersion:1,data,refs};
  const restored=hydrateSync(wire,hash=>({readingSharedBlockVersion:1,hash,value:blocks.get(hash).value}));
  if(!require('node:util').isDeepStrictEqual(restored,row.original))throw Error('Reading reconstruction changed: '+row.id);
  const wirePath=base+'wire/'+row.id+'.json';write(wirePath,wire);
  entries[row.file]={wirePath,sourceSha256:fileHash(row.file),wireSha256:fileHash(wirePath)};
  hints.fixtures[row.id]=[...new Set(refs.map(ref=>ids.get(ref.hash)))];
  beforeBytes+=Buffer.byteLength(JSON.stringify(row.original)+'\n');wireBytes+=fs.statSync(path.join(root,wirePath)).size;
 }
 const retained=new Map((previous?.retained||[]).map(r=>[r.hash,{...r}]));
 const oldActive=new Set(previous?.active||[]);
 for(const hash of active){write(base+'shared/'+hash+'.json',{readingSharedBlockVersion:1,hash,value:blocks.get(hash).value});retained.set(hash,{hash,retiredAt:null});}
 for(const [hash,row] of retained){
  if(!active.has(hash)&&oldActive.has(hash))row.retiredAt=now.toISOString();
  if(!active.has(hash)&&row.retiredAt&&now-new Date(row.retiredAt)>retention)retained.delete(hash);
 }
 const outputs=[...Object.values(entries).map(r=>r.wirePath),...[...retained.keys()].map(hash=>base+'shared/'+hash+'.json')].map(file=>({path:file,sha256:fileHash(file)}));
 const manifest={schemaVersion:1,inputs,entries,active:[...active],retained:[...retained.values()],hints,outputs};
 write(manifestPath,manifest);addHints(hints);
 const sharedBytes=[...active].reduce((n,hash)=>n+fs.statSync(path.join(root,base+'shared/'+hash+'.json')).size,0);
 return {fixtures:rows.length,blocks:active.size,beforeBytes,wireBytes,sharedBytes,savedBytes:beforeBytes-wireBytes-sharedBytes,reused:false};
}
if(require.main===module)console.log(JSON.stringify(build()));
module.exports={build,manifestPath};
