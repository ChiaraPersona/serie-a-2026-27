'use strict';
// Explicit fs adapter for internal audit scripts; canonical datasets are untouched.
const fs=require('node:fs');
function createSnapshotFs(store){
function readFileSync(file,options){
 const raw=fs.readFileSync(file,typeof options==='object'?{...options,encoding:null}:undefined),bytes=store.decode(raw);
 const encoding=typeof options==='string'?options:options?.encoding;
 return encoding?bytes.toString(encoding):bytes;
}
function writeFileSync(file,data,options){
 const encoding=typeof options==='string'?options:options?.encoding;
 const bytes=Buffer.isBuffer(data)?data:typeof data==='string'?Buffer.from(data,encoding||'utf8'):null;
 if(bytes&&store.isSnapshot(file)){const encoded=bytes.length>=1000000?store.encode(bytes):bytes;const result=fs.writeFileSync(file,encoded.length<bytes.length?encoded:bytes,options);store.record(file,bytes);return result;}
 return fs.writeFileSync(file,data,options);
}
function renameSync(from,to){const result=fs.renameSync(from,to);if(store.isSnapshot(to))store.record(to,readFileSync(to));return result;}
function statSync(file,options){const stat=fs.statSync(file,options);if(stat?.isFile()&&store.isSnapshot(file)){const fd=fs.openSync(file,'r'),head=Buffer.alloc(80);try{fs.readSync(fd,head,0,head.length,0);}finally{fs.closeSync(fd);}if(head.toString().includes('"storageFormat":"'+store.FORMAT+'"')){const manifest=JSON.parse(fs.readFileSync(file,'utf8'));stat.size=options?.bigint?BigInt(manifest.bytes):manifest.bytes;}}return stat;}
function readFile(file,options,callback){if(typeof options==='function'){callback=options;options=undefined;}fs.readFile(file,typeof options==='object'?{...options,encoding:null}:undefined,(error,raw)=>{if(error)return callback(error);let bytes;try{bytes=store.decode(raw);const encoding=typeof options==='string'?options:options?.encoding;if(encoding)bytes=bytes.toString(encoding);}catch(e){return callback(e);}callback(null,bytes);});}
function writeFile(file,data,options,callback){if(typeof options==='function'){callback=options;options=undefined;}let bytes,encoded;try{const encoding=typeof options==='string'?options:options?.encoding;bytes=Buffer.isBuffer(data)?data:typeof data==='string'?Buffer.from(data,encoding||'utf8'):null;encoded=bytes&&bytes.length>=1000000&&store.isSnapshot(file)?store.encode(bytes):data;}catch(error){return queueMicrotask(()=>callback(error));}fs.writeFile(file,encoded,options,error=>{if(!error&&bytes)try{store.record(file,bytes);}catch(e){error=e;}callback(error);});}
function rename(from,to,callback){fs.rename(from,to,error=>{if(!error&&store.isSnapshot(to))try{store.record(to,readFileSync(to));}catch(e){error=e;}callback(error);});}
const promises={...fs.promises,readFile:(file,options)=>new Promise((resolve,reject)=>readFile(file,options,(e,b)=>e?reject(e):resolve(b))),writeFile:(file,data,options)=>new Promise((resolve,reject)=>writeFile(file,data,options,e=>e?reject(e):resolve())),rename:(from,to)=>new Promise((resolve,reject)=>rename(from,to,e=>e?reject(e):resolve()))};
return {...fs,readFileSync,readFile,writeFileSync,writeFile,renameSync,rename,statSync,promises};
}
module.exports={...createSnapshotFs(require('./output-snapshot-store.cjs')),createSnapshotFs};
