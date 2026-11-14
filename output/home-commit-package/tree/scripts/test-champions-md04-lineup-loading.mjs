import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createDataService} from '../js/services/data-service.js';
const read=p=>JSON.parse(fs.readFileSync(new URL('../data/normalized/'+p,import.meta.url)));
const lineup='champions-md04-probable-individuals-2026-27.json';
const originalFetch=globalThis.fetch;
globalThis.fetch=async url=>({ok:true,json:async()=>read(String(url).split('/').at(-1).split('?')[0])});
try{
 const service=createDataService('test');
 const loaded=await service.load(lineup),canonical=read(lineup);
 assert.deepEqual(loaded,canonical,'Lineup descriptions must retain substitutes and availability');
 const catalog=await service.load('schedina-champions-md04.json');
 for(const match of catalog.marketCatalog.matches)for(const leg of match.selections)
  assert(globalThis.officialStarterPolicy.eligible(leg,match.matchId),'Operational contracts must still obey starter policy');
 console.log('OK: descriptive lineups retain all reserves; operational contracts remain filtered');
}finally{globalThis.fetch=originalFetch;}
