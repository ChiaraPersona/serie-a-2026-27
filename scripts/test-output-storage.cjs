'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),cp=require('node:child_process');
const {createStore}=require('./output-snapshot-store.cjs'),{createSnapshotFs}=require('./output-snapshot-fs.cjs');
const parent=path.resolve(__dirname,'../output'),root=path.join(parent,'storage-test-'+crypto.randomUUID());
fs.mkdirSync(path.join(root,'output'),{recursive:true});
(async()=>{
try{
 const store=createStore(root),io=createSnapshotFs(store),file=path.join(root,'output/baseline.json');
 const catalog={matches:Array.from({length:40},(_,i)=>({id:i,values:Array.from({length:400},(_,n)=>({n,text:'Identità è verificata '+n}))}))};
 const original=Buffer.from(JSON.stringify({reading:catalog,schedina:catalog,number:1.25,empty:null},null,2)+'\r\n');
 io.writeFileSync(file,original);assert(fs.statSync(file).size<original.length/10);assert(io.readFileSync(file).equals(original));assert.equal(io.readFileSync(file,'utf8'),original.toString());
 assert.equal(io.statSync(file).size,original.length,'Audit stat must agree with reconstructed bytes');
 const first=JSON.parse(fs.readFileSync(file)),hashes=first.parts.filter(p=>typeof p!=='string').map(p=>p.sha256);assert(new Set(hashes).size<hashes.length,'Repeated catalogs must share blocks');
 const second=path.join(root,'output/another-before.json');io.writeFileSync(second,original);assert.deepEqual(JSON.parse(fs.readFileSync(second)).parts,first.parts);
 assert((await io.promises.readFile(file)).equals(original));
 const asyncFile=path.join(root,'output/async-before.json');await io.promises.writeFile(asyncFile,original);assert((await io.promises.readFile(asyncFile)).equals(original));
 const canonical=path.join(root,'data/before.json');fs.mkdirSync(path.dirname(canonical),{recursive:true});io.writeFileSync(canonical,original);assert(fs.readFileSync(canonical).equals(original),'Canonical data must stay plain JSON');
 const block=first.parts.find(p=>typeof p!=='string'),blockFile=path.join(store.directory,block.sha256.slice(0,2),block.sha256+'.gz'),saved=fs.readFileSync(blockFile);fs.writeFileSync(blockFile,Buffer.from('corrupt'));assert.throws(()=>io.readFileSync(file));fs.writeFileSync(blockFile,saved);assert(io.readFileSync(file).equals(original));
 const source=path.join(root,'data'),target=path.join(root,'output/stage');fs.mkdirSync(target,{recursive:true});fs.writeFileSync(path.join(source,'used.json'),'{"value":7}\n');fs.writeFileSync(path.join(source,'unused.json'),'x'.repeat(2000000));
 const script=path.join(target,'probe.cjs');fs.writeFileSync(script,`const fs=require('fs'),assert=require('assert/strict'),path=require('path');const input=path.join(__dirname,'data/used.json');assert(fs.existsSync(input));assert.equal(require(input).value,7);assert.equal(JSON.parse(fs.readFileSync(input,'utf8')).value,7);fs.writeFileSync(input,'{"value":8}');assert.throws(()=>fs.writeFileSync(${JSON.stringify(path.join(source,'used.json'))},'unsafe'));assert(!fs.existsSync(path.join(__dirname,'data/missing.json')));fs.unlinkSync(input);assert(!fs.existsSync(input));assert.throws(()=>fs.readFileSync(input));assert(!fs.readdirSync(path.dirname(input)).includes('used.json'));console.log('OK');`);
 const run=cp.spawnSync(process.execPath,['--require',path.resolve(__dirname,'staging-inputs.cjs'),script],{cwd:target,encoding:'utf8',env:{...process.env,PDF_STAGING_SOURCE:root,PDF_STAGING_ROOT:target}});assert.equal(run.status,0,run.stderr);assert.equal(JSON.parse(fs.readFileSync(path.join(source,'used.json'))).value,7);assert(!fs.existsSync(path.join(target,'data/unused.json')));const inputs=JSON.parse(fs.readFileSync(path.join(target,'staging-inputs.json')));assert.deepEqual(Object.keys(inputs),['data/used.json']);
 console.log('PASS exact snapshot bytes, shared catalogs, corruption detection, canonical isolation and read-through staging');
}finally{const resolved=path.resolve(root);assert(resolved.startsWith(parent+path.sep)&&path.basename(resolved).startsWith('storage-test-'));fs.rmSync(resolved,{recursive:true});}
})().catch(error=>{console.error(error);process.exitCode=1;});
