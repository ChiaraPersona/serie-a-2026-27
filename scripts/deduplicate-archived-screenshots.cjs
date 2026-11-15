'use strict';
// Local NTFS maintenance only. No site/data builders and no image re-encoding.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),cp=require('node:child_process');
const root=path.resolve(__dirname,'..'),args=process.argv.slice(2);
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const relative=file=>path.relative(root,file).replaceAll('\\','/');
function safe(file){
 const absolute=path.resolve(root,file),rel=relative(absolute);
 if(!/^(output|reports)\//.test(rel)||!rel.endsWith('.png'))throw Error('Outside screenshot scope: '+rel);
 if(fs.lstatSync(absolute).isSymbolicLink()||fs.realpathSync(absolute).toLowerCase()!==absolute.toLowerCase())throw Error('Linked screenshot path: '+rel);
 return absolute;
}
const stat=file=>fs.statSync(file,{bigint:true});
const sameInode=(a,b)=>{const x=stat(a),y=stat(b);return x.dev===y.dev&&x.ino===y.ino;};
function replace(from,to){
 for(let attempt=0;;attempt++)try{fs.renameSync(from,to);return;}catch(error){
  if(!['EPERM','EACCES','EBUSY'].includes(error.code)||attempt>=9)throw error;
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,50);
 }
}
function linkGroup(group){
 const keeper=safe(group.keeper),files=group.files.map(row=>({...row,absolute:safe(row.path)}));
 for(const file of files){if(hash(file.absolute)!==group.sha256||stat(file.absolute).nlink!==1n)throw Error('Screenshot changed or already shared: '+file.path);}
 try{
  for(const file of files){
   if(file.absolute===keeper)continue;
   const temporary=file.absolute+'.dedup-'+process.pid;
   fs.linkSync(keeper,temporary);
   try{replace(temporary,file.absolute);}finally{if(fs.existsSync(temporary))fs.unlinkSync(temporary);}
  }
 }finally{fs.chmodSync(keeper,0o444);}
 if(hash(keeper)!==group.sha256||stat(keeper).nlink!==BigInt(files.length)||files.some(f=>!sameInode(keeper,f.absolute)))throw Error('Shared screenshot verification failed');
}
function restoreGroup(group){
 const keeper=safe(group.keeper);
 if(hash(keeper)!==group.sha256)throw Error('Keeper changed; restore refused');
 for(const row of group.files.filter(r=>r.path!==group.keeper)){
  const file=safe(row.path);
  if(hash(file)!==group.sha256)throw Error('Screenshot changed; restore refused: '+row.path);
  if(!sameInode(keeper,file)){fs.chmodSync(file,row.mode);continue;}
  const temporary=file+'.restore-'+process.pid;
  fs.copyFileSync(keeper,temporary);fs.chmodSync(temporary,row.mode);
  fs.chmodSync(keeper,0o644);
  try{replace(temporary,file);}finally{fs.chmodSync(keeper,0o444);if(fs.existsSync(temporary))fs.unlinkSync(temporary);}
 }
 fs.chmodSync(keeper,group.files.find(r=>r.path===group.keeper).mode);
 if(group.files.some(r=>hash(safe(r.path))!==group.sha256))throw Error('Restored screenshot verification failed');
}
function makePlan(){
 const source=[];
 function readCode(dir){if(!fs.existsSync(dir))return;for(const e of fs.readdirSync(dir,{withFileTypes:true})){if(e.isSymbolicLink())continue;const f=path.join(dir,e.name);if(e.isDirectory())readCode(f);else if(/\.(?:cjs|mjs|js|ps1|py|json|ya?ml)$/.test(f))source.push(fs.readFileSync(f,'utf8'));}}
 readCode(path.join(root,'scripts'));readCode(path.join(root,'.github'));
 for(const name of ['package.json','AGENTS.md','README.md','docs/codex-operational-map.md'])source.push(fs.readFileSync(path.join(root,name),'utf8'));
 const code=source.join('\n').toLowerCase(),dirty=cp.execFileSync('git',['status','--porcelain=v1','-z'],{cwd:root,maxBuffer:16e6}).toString().split('\0').map(s=>s.slice(3));
 const unit=file=>{const parts=file.split('/');return parts[0]==='output'&&parts[1]==='reports'&&parts.length>3?parts.slice(0,3).join('/'):parts.slice(0,2).join('/');};
 const units=new Map(),cutoff=Date.now()-10*60*1000;
 function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){if(e.isSymbolicLink())continue;const f=path.join(dir,e.name);if(e.isDirectory())walk(f);else if(e.name.endsWith('.png')){const info=fs.statSync(f);if(info.size<256000)continue;const rel=relative(f),key=unit(rel);if(!units.has(key))units.set(key,[]);units.get(key).push({path:rel,bytes:info.size,mode:info.mode&0o777,mtime:info.mtimeMs,links:info.nlink});}}}
 walk(path.join(root,'output'));walk(path.join(root,'reports'));
 const protectedUnits=[];const hashes=new Map();
 for(const [key,files] of units){
  const name=key.split('/').at(-1).toLowerCase();
  const reason=code.includes(name)?'referenced by current scripts/config':dirty.some(p=>p===key||p.startsWith(key+'/'))?'working changes':files.some(f=>f.mtime>=cutoff)?'recent screenshots':null;
  if(reason){protectedUnits.push({path:key,reason,files:files.length});continue;}
  for(const file of files){if(file.links!==1||(file.mode&0o222)===0)continue;const sha=hash(safe(file.path));if(!hashes.has(sha))hashes.set(sha,[]);hashes.get(sha).push(file);}
 }
 const groups=[...hashes].filter(([,files])=>files.length>1).map(([sha256,files])=>({sha256,keeper:files[0].path,files:files.map(({path,bytes,mode})=>({path,bytes,mode}))}));
 return {schemaVersion:1,createdAt:new Date().toISOString(),protectedUnits,groups,extraCopies:groups.reduce((n,g)=>n+g.files.length-1,0),logicalSavedBytes:groups.reduce((n,g)=>n+g.files[0].bytes*(g.files.length-1),0)};
}
function write(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});const temporary=file+'.tmp';fs.writeFileSync(temporary,JSON.stringify(value,null,2)+'\n');replace(temporary,file);}
if(require.main===module){
 const get=flag=>args[args.indexOf(flag)+1];
 if(args.includes('--restore')){
  const file=path.resolve(root,get('--restore')),manifest=JSON.parse(fs.readFileSync(file));
  if(!relative(file).startsWith('data/technical-archive/screenshot-dedup/'))throw Error('Restore manifest must stay in the screenshot technical archive');
  for(const group of manifest.groups)restoreGroup(group);
  manifest.state='restored';manifest.restoredAt=new Date().toISOString();write(file,manifest);
  console.log('Restored independent writable screenshots: '+manifest.groups.length+' groups');
 }else if(args.includes('--apply')){
  const plan=JSON.parse(fs.readFileSync(path.resolve(root,get('--plan')))),manifestFile=path.resolve(root,get('--manifest'));
  if(fs.existsSync(manifestFile))throw Error('Manifest already exists; refusing to overwrite');
  if(!relative(manifestFile).startsWith('data/technical-archive/screenshot-dedup/'))throw Error('Manifest must stay in the screenshot technical archive');
  const eligible=new Map(makePlan().groups.flatMap(g=>g.files.map(f=>[f.path,g.sha256])));
  for(const group of plan.groups)for(const file of group.files)if(eligible.get(file.path)!==group.sha256)throw Error('Eligibility changed; regenerate the plan: '+file.path);
  const manifest={...plan,state:'applying',completedGroups:0};write(manifestFile,manifest);
  for(const group of manifest.groups){linkGroup(group);manifest.completedGroups++;write(manifestFile,manifest);}
  manifest.state='complete';write(manifestFile,manifest);
  console.log(JSON.stringify({groups:manifest.groups.length,extraCopies:manifest.extraCopies,logicalSavedBytes:manifest.logicalSavedBytes,pathsPreserved:true}));
 }else{
  const plan=makePlan();if(args.includes('--output'))write(path.resolve(root,get('--output')),plan);
  console.log(JSON.stringify({groups:plan.groups.length,extraCopies:plan.extraCopies,logicalSavedBytes:plan.logicalSavedBytes,protectedUnits:plan.protectedUnits.length},null,2));
 }
}
module.exports={makePlan,linkGroup,restoreGroup,hash,sameInode};
