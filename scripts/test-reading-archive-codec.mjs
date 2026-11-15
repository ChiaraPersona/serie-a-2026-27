import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {isDeepStrictEqual} from 'node:util';
import {createDataService} from '../js/services/data-service.js';
import {requestJson,clearJsonRequests} from '../js/services/json-requests.mjs?v=20261115-archive-v1';
const require=createRequire(import.meta.url),{pack,unpack}=require('./reading-archive-codec.cjs'),{scope}=require('./reading-archive-scope.cjs');
const root=process.cwd(),read=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const files=execFileSync('git',['ls-files','-z'],{maxBuffer:32e6}).toString().split('\0').filter(Boolean);
const candidates=scope(root,files);
for(const [file] of candidates){const data=read(file);assert(isDeepStrictEqual(unpack(JSON.parse(JSON.stringify(pack(data)))),data),'Archive round trip: '+file);}
assert(!candidates.has('data/generated/readings/matches/fiorentina-juventus-2026-27-md-12.json'),'Future Serie A fixture was archived');
assert(!candidates.has('data/generated/champions-shared-scenarios.json'),'Future Champions forecasts were archived');
const edge=JSON.parse('{"__proto__":{"constructor":"value"},"s":3,"o":[1,null,false],"text":"è ⚽","n":-1.25e-10}');
assert.deepEqual(unpack(pack(edge)),edge);
assert.deepEqual(unpack({ordinary:'JSON'}),{ordinary:'JSON'});
assert.throws(()=>unpack({archiveFormat:'readings-lossless-v1',keys:[],strings:[],value:{s:9}}));
const oldFetch=globalThis.fetch;
try {
  let encoded=false;
  globalThis.fetch=async url=>{const name=String(url).split('?')[0];const data=read(name);return {ok:true,json:async()=>encoded&&candidates.has(name)?pack(data):structuredClone(data)};};
  for(const deduplicate of [false,true]){
    encoded=false;
    const baseline=createDataService('archive-test',{deduplicate});
    const expected=await baseline.load('schedina-champions-md03-ui.json');
    const reading=await baseline.loadReading('atalanta-venezia-2026-27-md-06');
    encoded=true;
    const current=createDataService('archive-test',{deduplicate});
    assert(isDeepStrictEqual(await current.load('schedina-champions-md03-ui.json'),expected),'Champions starter policy changed');
    assert(isDeepStrictEqual(await current.loadReading('atalanta-venezia-2026-27-md-06'),reading),'Serie A reading changed');
  }
  clearJsonRequests();
  const file='data/derived/champions-md03/upcoming-forecasts.json';
  assert.deepEqual(await requestJson(file),read(file),'Direct artifact reader failed');
} finally {globalThis.fetch=oldFetch;clearJsonRequests();}
console.log(`PASS ${candidates.size} archived files lossless; Serie A/Champions loaders, starter filter, plain JSON and future exclusions`);
