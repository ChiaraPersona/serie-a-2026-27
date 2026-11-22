'use strict';
// Read-through staging: materialize inputs only when a child builder reads them.
// All writes stay in the staging checkout; no input directory is writable/shared.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
function install({source,target}){
 source=path.resolve(source);target=path.resolve(target);
 if(!target.startsWith(path.join(source,'output')+path.sep))throw Error('Invalid staging roots');
 const native={};for(const name of ['readFileSync','readFile','writeFileSync','appendFileSync','existsSync','mkdirSync','statSync','lstatSync','readdirSync','copyFileSync','renameSync','unlinkSync','rmSync','openSync','createReadStream','createWriteStream','writeFile','appendFile','mkdir','open','rename','unlink','rm','copyFile'])native[name]=fs[name].bind(fs);
 const manifestFile=path.join(target,'staging-inputs.json');
 const inputs=native.existsSync(manifestFile)?JSON.parse(native.readFileSync(manifestFile,'utf8')):{};
 const tombstones=new Set(Object.keys(inputs).filter(key=>inputs[key].deleted));
 const deleted=rel=>[...tombstones].some(key=>rel===key||rel.startsWith(key+'/'));
 const allowed=rel=>['data','docs','assets','output/reports','seria-a-2026-27-raw-archive-2026-08-24'].some(p=>rel===p||rel.startsWith(p+'/'));
 function mapped(file){if(typeof file!=='string')return null;const absolute=path.resolve(file),rel=path.relative(target,absolute).replaceAll('\\','/');if(rel.startsWith('../')||path.isAbsolute(rel)||!allowed(rel))return null;return {absolute,rel,original:path.join(source,rel)};}
 const save=()=>native.writeFileSync(manifestFile,JSON.stringify(inputs,null,2)+'\n');
 function materialize(file){const item=mapped(file);if(!item||native.existsSync(item.absolute)||deleted(item.rel))return file;if(!native.existsSync(item.original))return file;const st=native.statSync(item.original);if(st.isDirectory()){native.mkdirSync(item.absolute,{recursive:true});return file;}const bytes=native.readFileSync(item.original);native.mkdirSync(path.dirname(item.absolute),{recursive:true});native.writeFileSync(item.absolute,bytes);inputs[item.rel]={bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex')};save();return file;}
 function lookup(file){const item=mapped(file);return item&&!native.existsSync(item.absolute)&&!deleted(item.rel)&&native.existsSync(item.original)?item.original:file;}
 function writable(file){if(typeof file!=='string')return;const absolute=path.resolve(file);if((absolute===source||absolute.startsWith(source+path.sep))&&absolute!==target&&!absolute.startsWith(target+path.sep))throw Error('Staging attempted a write outside its checkout: '+absolute);}
 fs.readFileSync=(file,...args)=>native.readFileSync(materialize(file),...args);
 fs.readFile=(file,...args)=>native.readFile(materialize(file),...args);
 fs.existsSync=file=>{const item=mapped(file);return item&&deleted(item.rel)&&!native.existsSync(file)?false:native.existsSync(lookup(file));};
 for(const name of ['statSync','lstatSync'])fs[name]=(file,...args)=>native[name](lookup(file),...args);
 fs.readdirSync=(file,options)=>{
  const item=mapped(file);if(!item||deleted(item.rel)||!native.existsSync(item.original))return native.readdirSync(file,options);
  const original=native.readdirSync(item.original,options),local=native.existsSync(file)?native.readdirSync(file,options):[];
  const key=e=>Buffer.isBuffer(e)?e.toString():typeof e==='string'?e:e.name;
  return [...new Map([...original,...local].map(e=>[key(e),e])).values()].filter(e=>!deleted(item.rel+'/'+key(e))||native.existsSync(path.join(file,key(e))));
 };
 fs.copyFileSync=(src,dst,...args)=>{writable(dst);return native.copyFileSync(materialize(src),dst,...args);};
 fs.openSync=(file,flags,...args)=>{const writing=typeof flags==='number'?Boolean(flags&(fs.constants.O_WRONLY|fs.constants.O_RDWR|fs.constants.O_CREAT)):/[wa+]/.test(flags);if(writing)writable(file);const needsInput=!writing||(typeof flags==='number'?!(flags&fs.constants.O_TRUNC):/^[ra]/.test(flags));return native.openSync(needsInput?materialize(file):file,flags,...args);};
 fs.createReadStream=(file,...args)=>native.createReadStream(materialize(file),...args);
 for(const name of ['writeFileSync','appendFileSync','mkdirSync','createWriteStream'])fs[name]=(file,...args)=>{writable(file);return native[name](file,...args);};
 fs.renameSync=(src,dst)=>{writable(src);writable(dst);return native.renameSync(materialize(src),dst);};
 for(const name of ['unlinkSync','rmSync'])fs[name]=(file,...args)=>{writable(file);const item=mapped(file);materialize(file);const value=native[name](file,...args);if(item){inputs[item.rel]={...(inputs[item.rel]||{}),deleted:true};tombstones.add(item.rel);save();}return value;};
 for(const name of ['writeFile','appendFile','mkdir','unlink','rm'])fs[name]=(file,...args)=>{writable(file);if(name==='appendFile')materialize(file);return native[name](file,...args);};
 fs.rename=(from,to,...args)=>{writable(from);writable(to);return native.rename(materialize(from),to,...args);};
 fs.copyFile=(from,to,...args)=>{writable(to);return native.copyFile(materialize(from),to,...args);};
 fs.open=(file,flags,...args)=>{const writing=typeof flags==='number'?Boolean(flags&(fs.constants.O_WRONLY|fs.constants.O_RDWR|fs.constants.O_CREAT)):/[wa+]/.test(flags);if(writing)writable(file);return native.open(writing?file:materialize(file),flags,...args);};
 // Async consumers use the same materialization and write guard.
 const promises=fs.promises;
 for(const name of ['readFile','stat','lstat','readdir','access']){const old=promises[name].bind(promises);promises[name]=async(file,...args)=>{if(name==='readdir')return fs.readdirSync(file,...args);return old(name==='readFile'?materialize(file):lookup(file),...args);};}
 for(const name of ['writeFile','appendFile','mkdir','unlink','rm','rename','copyFile']){const old=promises[name].bind(promises);promises[name]=async(file,...args)=>{if(name==='copyFile'){writable(args[0]);return old(materialize(file),...args);}writable(file);if(name==='rename')writable(args[0]);return old(file,...args);};}
 const Module=require('node:module'),resolve=Module._resolveFilename;
 Module._resolveFilename=function(request,parent,...args){if(typeof request==='string'&&request.endsWith('.json')&&(request.startsWith('.')||path.isAbsolute(request)))materialize(path.resolve(parent?path.dirname(parent.filename):process.cwd(),request));return resolve.call(this,request,parent,...args);};
 return {inputs};
}
if(process.env.PDF_STAGING_SOURCE&&process.env.PDF_STAGING_ROOT)install({source:process.env.PDF_STAGING_SOURCE,target:process.env.PDF_STAGING_ROOT});
module.exports={install};
