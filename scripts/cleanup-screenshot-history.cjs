'use strict';
// Delete historical UI captures only. Data, reports, site assets and image inputs survive.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),cp=require('node:child_process');
const root=path.resolve(__dirname,'..'),output=path.join(root,'output');
const sha=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const walk=dir=>fs.existsSync(dir)?fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isSymbolicLink()?[]:e.isDirectory()?walk(path.join(dir,e.name)):e.isFile()?[path.join(dir,e.name)]:[]):[];
const relative=file=>path.relative(root,file).replaceAll('\\','/');
const inode=file=>{const stat=fs.statSync(file,{bigint:true});return stat.dev.toString()+':'+stat.ino.toString();};
const unit=file=>{const p=file.split('/');return p.slice(0,p[1]==='reports'?3:2).join('/');};
function target(file){const absolute=path.resolve(root,file);if(!file.startsWith('output/')&&!file.startsWith('reports/')||!file.endsWith('.png')||file.includes('/assets/')||file.startsWith('output/pages-site/'))throw Error('Outside screenshot scope '+file);if(fs.lstatSync(absolute).isSymbolicLink()||fs.realpathSync(absolute)!==absolute||!absolute.startsWith(fs.realpathSync(path.join(root,file.split('/')[0]))+path.sep))throw Error('Linked or external screenshot '+file);return absolute;}
function imageReader(text){
 if(/PNG\.sync\.read\(\s*\w+\.readFileSync\(/.test(text))return true;
 const calls=text.match(/(?:readFileSync|readFile|Image\.open|drawImage|drawInlineImage)\([^;\n]{0,350}/g)||[];
 if(/\b(?:baseline|baselinePath|beforePath|beforeImage)\s*=\s*[^;\n]*\.png\b/.test(text)&&/readFile/.test(text))return true;
 return calls.some(call=>{const argument=call.slice(call.indexOf('(')+1).split(')')[0];return !/\.(?:json|css|html|js|mjs|cjs|md|txt|py|log)\b/.test(argument)&&(/\.png\b/.test(argument)||/\b(?:image\w*|screenshot\w*|png\w*)\b/i.test(argument));});
}
function plan(before,scope='output'){
 if(!['output','reports'].includes(scope))throw Error('Invalid scope');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(before))throw Error('Use --before YYYY-MM-DD');const cutoff=Date.parse(before+'T00:00:00+01:00');
 const files=walk(path.join(root,scope)).filter(f=>f.endsWith('.png')&&!relative(f).startsWith('output/pages-site/')&&!relative(f).includes('/assets/'));
 const sources=[...walk(path.join(root,'scripts')),...walk(path.join(root,'reports')),...walk(output).filter(f=>!relative(f).startsWith('output/pages-site/')&&!relative(f).includes('/site/'))].filter(f=>/\.(?:cjs|mjs|js|py|ps1)$/.test(f)).map(file=>({file:relative(file),text:fs.readFileSync(file,'utf8')})).filter(s=>imageReader(s.text));
 const dirty=cp.execFileSync('git',['-c','core.safecrlf=false','status','--porcelain=v1','--untracked-files=no','--',scope],{encoding:'utf8',maxBuffer:8e6}).split(/\r?\n/).filter(line=>line.slice(0,2).includes('M')).map(line=>line.slice(3));
 const allImages=[...walk(output),...walk(path.join(root,'reports'))].filter(f=>f.endsWith('.png'));
 const aliases=new Map();for(const file of allImages){const key=inode(file);if(!aliases.has(key))aliases.set(key,[]);aliases.get(key).push(relative(file));}
 const keep=[],remove=[];
 for(const absolute of files){const file=relative(absolute),s=fs.statSync(absolute),key=inode(absolute),name=unit(file).split('/').at(-1);const consumers=sources.filter(source=>source.text.includes(name)).map(source=>source.file);
  const reason=s.mtimeMs>=cutoff?'Recent verification':dirty.includes(file)?'Modified working evidence':/\/(?:pdf|ocr)\//i.test(file)||file.startsWith('output/reports/reading-scenario-kits-2026-10-16/')?'PDF/OCR supporting material':/\/(?:raw|sources?|acquisition)\//i.test(file)?'Acquisition/source image':consumers.length?'Image read by a comparison or document script':s.nlink>(aliases.get(key)?.length||0)?'Uninventoried external hardlink':null;
  const row={file,bytes:s.size,sha256:sha(absolute),mtimeMs:s.mtimeMs,mode:s.mode&0o777,inode:key,links:s.nlink};
  if(reason)keep.push({...row,reason,...(consumers.length?{consumers}:{})});else remove.push({...row,reason:'Historical UI output; text reports and regeneration scripts retained'});
 }
 return {createdAt:new Date().toISOString(),before,scope:scope+' PNG screenshots excluding site assets',imageInputScripts:sources.map(s=>s.file),keep,remove,removeBytes:remove.reduce((s,r)=>s+r.bytes,0),keepBytes:keep.reduce((s,r)=>s+r.bytes,0),aliases:Object.fromEntries([...aliases].filter(([,paths])=>paths.length>1))};
}
function apply(manifest,reportFile){
 const deleting=new Set(manifest.remove.map(r=>r.file)),keepers=manifest.keep;
 for(const r of [...manifest.remove,...keepers]){target(r.file);const st=fs.statSync(path.join(root,r.file));if(st.size!==r.bytes||st.mtimeMs!==r.mtimeMs||sha(path.join(root,r.file))!==r.sha256)throw Error('Screenshot changed; recompute plan '+r.file);}
 const removed=[];
 for(const r of manifest.remove){const file=target(r.file);if(fs.statSync(file).mtimeMs!==r.mtimeMs||sha(file)!==r.sha256)throw Error('Screenshot changed immediately before removal '+r.file);try{fs.unlinkSync(file);}catch(error){if(!['EPERM','EACCES'].includes(error.code))throw error;fs.chmodSync(file,0o666);try{fs.unlinkSync(file);}finally{for(const alias of manifest.aliases[r.inode]||[])if(!deleting.has(alias)&&fs.existsSync(path.join(root,alias)))fs.chmodSync(path.join(root,alias),r.mode);}}removed.push(r.file);}
 for(const r of keepers)if(sha(path.join(root,r.file))!==r.sha256||((fs.statSync(path.join(root,r.file)).mode&0o777)!==r.mode))throw Error('Retained screenshot changed '+r.file);
 const result={completedAt:new Date().toISOString(),removedFiles:removed.length,removedBytes:manifest.removeBytes,retainedFiles:keepers.length,retainedBytes:manifest.keepBytes,retainedHashesAndModesVerified:true,removed};fs.writeFileSync(reportFile,JSON.stringify(result,null,2)+'\n');return result;
}
if(require.main===module){const args=process.argv.slice(2),get=key=>args[args.indexOf(key)+1],dir=path.join(output,'obsolete-copy-audit');fs.mkdirSync(dir,{recursive:true});if(args.includes('--apply')){const manifest=JSON.parse(fs.readFileSync(get('--apply'),'utf8')),result=apply(manifest,path.join(dir,(manifest.scope.startsWith('reports ')?'reports-':'')+'screenshot-cleanup-result.json'));console.log(JSON.stringify({...result,removed:undefined},null,2));}else{const scope=args.includes('--scope')?get('--scope'):'output';const result=plan(get('--before'),scope);fs.writeFileSync(path.join(dir,(scope==='reports'?'reports-':'')+'screenshot-cleanup-plan.json'),JSON.stringify(result,null,2)+'\n');const reasons={};for(const r of result.keep)reasons[r.reason]=(reasons[r.reason]||0)+1;console.log(JSON.stringify({removeFiles:result.remove.length,removeBytes:result.removeBytes,keepFiles:result.keep.length,keepBytes:result.keepBytes,reasons,imageInputScripts:result.imageInputScripts},null,2));}}
module.exports={plan,apply};
