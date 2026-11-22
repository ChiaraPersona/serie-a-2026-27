'use strict';
// Read-only inventory and deletion plan. Removal is a separate, path-checked step.
const fs=require('./output-snapshot-fs.cjs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),out=path.join(root,'output/reports/artifact-cleanup-20261022');
// JSON baselines are preserved through the shared lossless snapshot store, not
// deleted by this screenshot/temp-file cleanup. Use the storage migration CLI.
const snapshotIndex=path.join(root,'data/technical-archive/output-snapshots/index.json');
const snapshotStorage={format:require('./output-snapshot-store.cjs').FORMAT,snapshots:fs.existsSync(snapshotIndex)?JSON.parse(fs.readFileSync(snapshotIndex,'utf8')).entries.length:0,verifyCommand:'npm run storage:output:verify'};
function walk(dir){return fs.readdirSync(path.join(root,dir),{withFileTypes:true}).flatMap(e=>e.isSymbolicLink()?[]:e.isDirectory()?walk(dir+'/'+e.name):[dir+'/'+e.name]);}
const files=['reports','output'].flatMap(walk);
const sourceFiles=[...['scripts','js','css','docs'].flatMap(walk),...files,...fs.readdirSync(root).filter(f=>/\.(?:json|md|html|ps1|ya?ml)$/.test(f))].filter(f=>/\.(?:js|mjs|cjs|py|ps1|md|html|css|ya?ml)$/.test(f));
const refs=new Map();
for(const file of sourceFiles){const text=fs.readFileSync(path.join(root,file),'utf8');for(const match of text.matchAll(/[A-Za-z0-9_./\\-]+\.(?:png|log|pyc)\b/gi)){
  const name=path.posix.basename(match[0].replaceAll('\\','/')).toLowerCase();
  const set=refs.get(name)||new Set();set.add(file);refs.set(name,set);
}}
const cutoff=Date.parse('2026-10-22T00:00:00+02:00'),remove=[],keep=[];
for(const file of files){
  const stat=fs.statSync(path.join(root,file)),ext=path.extname(file).toLowerCase();
  if(!['.png','.log','.pyc','.tmp','.temp'].includes(ext))continue;
  const record={file,bytes:stat.size,mtimeMs:stat.mtimeMs};
  const references=[...(refs.get(path.posix.basename(file).toLowerCase())||[])];
  let reason;
  if(stat.mtimeMs>=cutoff)reason='Current-day evidence';
  else if(file.startsWith('output/pdf/')||file.startsWith('output/reports/reading-scenario-kits-2026-10-16/'))reason='PDF/OCR supporting material, not classified as screenshots';
  else if(/\/(?:champions-md02-browser-data|champions-md3-browser-data|schedina-loading|[^/]*20261022[^/]*|[^/]*2026-10-22[^/]*)\//.test(file))reason='Current task evidence';
  else if(ext!=='.pyc'&&/(?:baseline|template|reference|original|(?:^|[-_/])before(?:[-_.\/]|$))/i.test(file))reason='Baseline or reference';
  else if(references.length)reason='Referenced by source or documentation';
  if(reason)keep.push({...record,reason,references});
  else remove.push({...record,group:path.posix.dirname(file),reason:ext==='.png'?'Old screenshot, no literal source references':ext==='.pyc'?'Regenerable Python bytecode':'Old temporary artifact, no literal source references'});
}
const removing=new Set(remove.map(r=>r.file));
const preserved=files.filter(f=>!removing.has(f)).map(file=>({file,bytes:fs.statSync(path.join(root,file)).size,sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')}));
const groups={};for(const row of remove){const g=groups[row.group]??={files:0,bytes:0};g.files++;g.bytes+=row.bytes;}
fs.mkdirSync(out,{recursive:true});
fs.writeFileSync(path.join(out,'plan.json'),JSON.stringify({createdAt:new Date().toISOString(),cutoff:'2026-10-22 00:00 Europe/Rome',sourceFilesScanned:sourceFiles.length,snapshotStorage,groups,remove,keep,preserved},null,2)+'\n');
console.log(JSON.stringify({sourceFilesScanned:sourceFiles.length,remove:remove.length,bytes:remove.reduce((s,f)=>s+f.bytes,0),keep:keep.length,groups:Object.keys(groups).length,protectedFiles:preserved.length}));
