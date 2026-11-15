import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
import {createDataService} from '../js/services/data-service.js';
const require=createRequire(import.meta.url),{hydrate,hydrateSync}=require('../js/services/reading-shared.js');
const {publicContent}=require('./package-pages.cjs');
const manifest=JSON.parse(fs.readFileSync('data/generated/readings/wire/serie-a-reading-shared-manifest.json'));
const read=file=>JSON.parse(fs.readFileSync(file));
const block=hash=>read('data/generated/readings/shared/'+hash+'.json');
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
let fixtures=0;
for(const [file,entry] of Object.entries(manifest.entries)){
 assert.equal(hash(fs.readFileSync(file)),entry.sourceSha256,'Canonical fixture changed');
 const wire=JSON.parse(publicContent(file));
 assert.equal(wire.readingSharedVersion,1);
 assert.deepEqual(hydrateSync(wire,block),read(file),file);
 const catalogFile=file.replace('/matches/','/catalogs/');
 if(fs.existsSync(catalogFile))assert.deepEqual(hydrateSync(wire,block).forecastDataset,read(catalogFile).forecastDataset,'Saved contract catalog changed '+file);
 fixtures++;
}
for(const row of manifest.retained)assert.equal(hash(JSON.stringify(block(row.hash).value)),row.hash);
const [file]=Object.keys(manifest.entries),wire=JSON.parse(publicContent(file));
const first=await hydrate(wire,async h=>block(h));
first.teams[0].name='MUTATED';
assert.deepEqual(await hydrate(wire,async h=>block(h)),read(file),'Shared objects mutated across views');
await assert.rejects(hydrate(wire,async h=>({...block(h),value:{corrupt:true}})),/non coerenti/);
await assert.rejects(hydrate(wire,async()=>{throw Error('Missing block')}),/Missing block/);
const originalFetch=globalThis.fetch,requests=[];
try{
 globalThis.fetch=async (url,options)=>{
  const file=String(url).split('?')[0];requests.push({file,cache:options.cache,url});
  return {ok:true,json:async()=>file.includes('/matches/')?JSON.parse(publicContent(file)):read(file)};
 };
 const id=file.split('/').at(-1).replace('.json',''),service=createDataService('shared-test',{deduplicate:true});
 const actual=await service.loadReading(id,manifest.hints);
 const expected=read(file);
 expected.predictionDataset=globalThis.officialStarterPolicy.filter(expected.predictionDataset);
 expected.forecastDataset=expected.forecastDataset?globalThis.officialStarterPolicy.filter(expected.forecastDataset):null;
 assert.deepEqual(actual,expected,'Policy changed with shared hydration');
 assert(requests.find(r=>r.file===file&&r.cache==='no-store'));
 assert(requests.find(r=>r.file.includes('official-starter-registry')&&r.cache==='no-store'));
 assert(requests.filter(r=>r.file.includes('/shared/')).every(r=>r.cache==='force-cache'&&!r.url.includes('?')));
 assert(requests[0].file.includes('/shared/'),'Index hints did not start prefetch');
 const before=requests.length;service.beginView();await service.loadReading(id,manifest.hints);
 assert(requests.slice(before).some(r=>r.file.includes('official-starter-registry')),'Registry not refreshed');
}finally{globalThis.fetch=originalFetch;}
console.log(`PASS ${fixtures} exact fixture reconstructions, ${manifest.active.length} verified blocks, mutation isolation, corrupt/missing data rejection, policy and freshness`);
