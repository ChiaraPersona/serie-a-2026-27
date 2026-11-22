'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const store=require('./output-snapshot-store.cjs');
const root=path.resolve(__dirname,'..');
function walk(dir){return fs.existsSync(dir)?fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isSymbolicLink()?[]:e.isDirectory()?walk(path.join(dir,e.name)):e.isFile()?[path.join(dir,e.name)]:[]):[];}
function plan(){
 const python=walk(path.join(root,'scripts')).concat(walk(path.join(root,'output')).filter(f=>!f.includes(path.sep+'pages-site'+path.sep))).filter(f=>f.endsWith('.py')).map(f=>fs.readFileSync(f,'utf8'));
 const encoded=file=>{const fd=fs.openSync(file,'r'),head=Buffer.alloc(80);try{fs.readSync(fd,head,0,head.length,0);}finally{fs.closeSync(fd);}return head.toString().includes('"storageFormat":"'+store.FORMAT+'"');};
 return walk(path.join(root,'output')).filter(f=>store.isSnapshot(f)&&fs.statSync(f).size>=1000000&&!encoded(f)).map(file=>{
  const relative=path.relative(root,file).replaceAll('\\','/'),token=relative.startsWith('output/reports/')?relative.split('/')[2]:relative.split('/')[1];
  return {file:relative,bytes:fs.statSync(file).size,skip:python.some(text=>text.includes(token))?'Python consumer not yet migrated':null};
 });
}
function verify(){
 const index=JSON.parse(fs.readFileSync(path.join(store.directory,'index.json'),'utf8'));
 for(const entry of index.entries){const bytes=store.decode(fs.readFileSync(path.join(root,entry.file)));if(bytes.length!==entry.bytes||store.digest(bytes)!==entry.sha256)throw Error('Snapshot verification failed: '+entry.file);}
 return {verified:index.entries.length,originalBytes:index.entries.reduce((s,r)=>s+r.bytes,0)};
}
function migrate(){
 const rows=plan(),indexFile=path.join(store.directory,'index.json');fs.mkdirSync(store.directory,{recursive:true});
 const existing=fs.existsSync(indexFile)?JSON.parse(fs.readFileSync(indexFile,'utf8')).entries:[];
 const entries=new Map(existing.map(e=>[e.file,e]));
 const save=()=>{const temporary=indexFile+'.tmp';fs.writeFileSync(temporary,JSON.stringify({format:store.FORMAT,updatedAt:new Date().toISOString(),entries:[...entries.values()]},null,2)+'\n');fs.renameSync(temporary,indexFile);};
 let count=0,sourceBytes=0,manifestBytes=0;
 for(const row of rows){if(row.skip)continue;const file=path.join(root,row.file),original=fs.readFileSync(file),sha256=store.digest(original),mtimeMs=fs.statSync(file).mtimeMs;
  const result=store.compact(file);if(!result.changed)continue;
  const restored=store.decode(fs.readFileSync(file));if(!restored.equals(original))throw Error('Migration changed bytes: '+row.file);
  entries.set(row.file,{file:row.file,bytes:original.length,sha256,originalMtimeMs:mtimeMs});save();
  count++;sourceBytes+=original.length;manifestBytes+=result.manifestBytes;if(count%10===0)console.log(JSON.stringify({migrated:count,sourceBytes,manifestBytes}));
 }
 save();return {migrated:count,sourceBytes,manifestBytes,sharedBlockBytes:walk(store.directory).filter(f=>f.endsWith('.gz')).reduce((s,f)=>s+fs.statSync(f).size,0),skipped:rows.filter(r=>r.skip),...verify()};
}
function prune(write=false){
 verify();const referenced=new Set();
 for(const file of [...walk(path.join(root,'output')),...walk(path.join(root,'reports')),...walk(path.join(root,'data/technical-archive'))].filter(f=>/\.json(?:\.[^/\\]*tmp)?$/.test(f))){
  const fd=fs.openSync(file,'r'),head=Buffer.alloc(80);try{fs.readSync(fd,head,0,head.length,0);}finally{fs.closeSync(fd);}
  if(!head.toString().includes('"storageFormat":"'+store.FORMAT+'"'))continue;
  const manifest=JSON.parse(fs.readFileSync(file,'utf8'));for(const part of manifest.parts)if(typeof part!=='string')referenced.add(part.sha256);
 }
 const candidates=walk(store.directory).filter(f=>/^[a-f0-9]{64}\.gz$/.test(path.basename(f))&&!referenced.has(path.basename(f,'.gz'))).map(file=>({file,bytes:fs.statSync(file).size}));
 if(write)for(const entry of candidates){const resolved=fs.realpathSync(entry.file);if(!resolved.startsWith(fs.realpathSync(store.directory)+path.sep)||fs.lstatSync(entry.file).isSymbolicLink())throw Error('Invalid block cleanup path');fs.unlinkSync(entry.file);}
 return {mode:write?'removed-unreferenced-blocks':'plan',files:candidates.length,bytes:candidates.reduce((s,r)=>s+r.bytes,0),candidates};
}
if(require.main===module){const result=process.argv.includes('--prune')?prune(process.argv.includes('--write')):process.argv.includes('--write')?migrate():process.argv.includes('--verify')?verify():{candidates:plan()};console.log(JSON.stringify(result,null,2));}
module.exports={plan,migrate,verify,prune};
