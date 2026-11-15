import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createDataService} from '../js/services/data-service.js';

// Hold the registry response: both requests must start immediately, while
// callers must never receive unfiltered data before official policy is ready.
const registry=JSON.parse(fs.readFileSync('data/normalized/official-starter-registry.json','utf8'));
const originalFetch=globalThis.fetch;
try {
  for(const reading of [false,true]) {
    const pending=new Map();
    globalThis.fetch=(url,options)=>new Promise(resolve=>pending.set(String(url).split('?')[0],{resolve,options}));
    const service=createDataService('parallel-test',{deduplicate:true});
    let settled=false;
    const operation=(reading?service.loadReading('test-fixture'):service.load('matches.json')).then(value=>{settled=true;return value;});
    const registryUrl='data/normalized/official-starter-registry.json';
    const dataUrl=reading?'data/generated/readings/matches/test-fixture.json':'data/normalized/matches.json';
    assert.deepEqual([...pending.keys()],[registryUrl,dataUrl],'Payload request waits for registry');
    assert.equal(pending.get(registryUrl).options.cache,'no-store');
    const payload=reading?{predictionDataset:{predictions:[]},forecastDataset:null}:[{id:'observed-fixture',status:'finished'}];
    pending.get(dataUrl).resolve({ok:true,json:async()=>structuredClone(payload)});
    await new Promise(resolve=>setImmediate(resolve));
    assert.equal(settled,false,'Data escaped before the official registry was available');
    pending.get(registryUrl).resolve({ok:true,json:async()=>registry});
    assert.deepEqual(await operation,payload);
  }
  // A registry error must reject the load even if the payload is available.
  globalThis.fetch=async url=>String(url).includes('official-starter-registry')
    ?{ok:false,status:503}:{ok:true,json:async()=>[{id:'unfiltered'}]};
  await assert.rejects(createDataService('failed-registry',{deduplicate:true}).load('matches.json'),/official starters: 503/);
  console.log('PASS parallel data loads: simultaneous requests, registry gate, no-store and failure propagation');
} finally {globalThis.fetch=originalFetch;}
