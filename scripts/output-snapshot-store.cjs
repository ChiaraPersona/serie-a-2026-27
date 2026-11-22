'use strict';
// Internal storage only. Readers reconstruct the exact original UTF-8 bytes.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),zlib=require('node:zlib');
const FORMAT='output-snapshot-v1';
const digest=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
function createStore(root=path.resolve(__dirname,'..')){
 const output=path.join(root,'output'),directory=path.join(root,'data/technical-archive/output-snapshots');
 const blockPath=hash=>{if(!/^[a-f0-9]{64}$/.test(hash))throw Error('Invalid snapshot block hash');return path.join(directory,hash.slice(0,2),hash+'.gz');};
 function atomic(file,bytes){fs.mkdirSync(path.dirname(file),{recursive:true});const temp=file+'.'+process.pid+'.snapshot.tmp';try{fs.writeFileSync(temp,bytes,{flag:'wx'});fs.renameSync(temp,file);}finally{if(fs.existsSync(temp))fs.unlinkSync(temp);}}
 function isSnapshot(file){if(typeof file!=='string')return false;const relative=path.relative(output,path.resolve(file));return relative&&!relative.startsWith('..')&&!path.isAbsolute(relative)&&!['pages-site','obsolete-copy-audit'].some(p=>relative===p||relative.startsWith(p+path.sep))&&/(?:before|baseline|original)[^/\\]*\.json(?:\.[^/\\]*tmp)?$/i.test(path.basename(file));}
 function decode(bytes){
  if(!bytes.subarray(0,80).toString('utf8').includes('"storageFormat":"'+FORMAT+'"'))return bytes;
  const manifest=JSON.parse(bytes);if(manifest.storageFormat!==FORMAT||!Array.isArray(manifest.parts))throw Error('Invalid snapshot manifest');
  const parts=manifest.parts.map(part=>{if(typeof part==='string')return Buffer.from(part);const data=zlib.gunzipSync(fs.readFileSync(blockPath(part.sha256)));if(data.length!==part.bytes||digest(data)!==part.sha256)throw Error('Corrupt snapshot block '+part.sha256);return data;});
  const original=Buffer.concat(parts);if(original.length!==manifest.bytes||digest(original)!==manifest.sha256)throw Error('Corrupt reconstructed snapshot');return original;
 }
 // Locate immediate object values / array elements without changing whitespace,
 // key order, numeric spelling, or repeated catalog representations.
 function children(text){
  let i=0;while(/\s/.test(text[i]||'')&&i<text.length)i++;const object=text[i]==='{';if(!object&&text[i]!=='[')return [];
  const ranges=[];i++;
  const whitespace=()=>{while(i<text.length&&/\s/.test(text[i]))i++;};
  const stringEnd=()=>{i++;while(i<text.length){if(text[i]==='\\'){i+=2;continue;}if(text[i++]==='"')break;}};
  while(i<text.length){whitespace();if(text[i]==='}'||text[i]===']')break;if(object){if(text[i]!=='"')return [];stringEnd();whitespace();if(text[i++]!==':')return [];whitespace();}
   const start=i;if(text[i]==='"')stringEnd();else if(text[i]==='{'||text[i]==='['){let depth=0;do{if(text[i]==='"'){stringEnd();continue;}if(text[i]==='{'||text[i]==='[')depth++;if(text[i]==='}'||text[i]===']')depth--;i++;}while(i<text.length&&depth);}else{while(i<text.length&&!/[,}\]\s]/.test(text[i]))i++;}
   if(i===start)return [];ranges.push([start,i]);whitespace();if(text[i]!==',')break;i++;
  }return ranges;
 }
 function encode(original){
  const parts=[];
  function block(text){const bytes=Buffer.from(text),sha256=digest(bytes),target=blockPath(sha256);if(!fs.existsSync(target))atomic(target,zlib.gzipSync(bytes,{level:9}));else if(digest(zlib.gunzipSync(fs.readFileSync(target)))!==sha256)throw Error('Corrupt existing snapshot block');return {sha256,bytes:bytes.length};}
  function emit(text,depth){
   if(Buffer.byteLength(text)<16384){parts.push(text);return;}
   const ranges=depth<5?children(text):[];
   if(ranges.length){const from=parts.length;let offset=0;for(const [start,end]of ranges){emit(text.slice(offset,start),6);emit(text.slice(start,end),depth+1);offset=end;}emit(text.slice(offset),6);if(parts.slice(from).every(p=>typeof p==='string')){parts.splice(from);parts.push(block(text));}return;}
   parts.push(block(text));
  }
  emit(original.toString('utf8'),0);
  for(let i=parts.length-1;i>0;i--)if(typeof parts[i]==='string'&&typeof parts[i-1]==='string'){parts[i-1]+=parts[i];parts.splice(i,1);}
  for(let i=0;i<parts.length;i++)if(typeof parts[i]==='string'&&Buffer.byteLength(parts[i])>=16384)parts[i]=block(parts[i]);
  const manifest=Buffer.from(JSON.stringify({storageFormat:FORMAT,bytes:original.length,sha256:digest(original),parts})+'\n');
  if(!decode(manifest).equals(original))throw Error('Snapshot roundtrip failed');return manifest;
 }
 function record(file,bytes){if(!isSnapshot(file)||!file.endsWith('.json'))return;const indexFile=path.join(directory,'index.json'),index=fs.existsSync(indexFile)?JSON.parse(fs.readFileSync(indexFile,'utf8')):{format:FORMAT,entries:[]};const relative=path.relative(root,path.resolve(file)).replaceAll('\\','/');index.entries=index.entries.filter(e=>e.file!==relative);index.entries.push({file:relative,bytes:bytes.length,sha256:digest(bytes),originalMtimeMs:fs.statSync(file).mtimeMs});index.updatedAt=new Date().toISOString();atomic(indexFile,Buffer.from(JSON.stringify(index,null,2)+'\n'));}
 function compact(file){const stat=fs.statSync(file),original=decode(fs.readFileSync(file));const encoded=encode(original);if(encoded.length>=original.length)return {file,changed:false,bytes:original.length};atomic(file,encoded);fs.utimesSync(file,stat.atime,stat.mtime);return {file,changed:true,bytes:original.length,manifestBytes:encoded.length,sha256:digest(original)};}
 return {decode,encode,compact,record,isSnapshot,directory,FORMAT};
}
module.exports={...createStore(),createStore,FORMAT,digest};
