import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createDataService} from '../js/services/data-service.js';
const read=name=>JSON.parse(fs.readFileSync('data/normalized/'+name,'utf8'));
const requests=[];
const oldFetch=globalThis.fetch;
globalThis.fetch=async(url,options)=>{
  const name=String(url).split('?')[0].replace('data/normalized/','');
  requests.push({name,cache:options.cache});
  return {ok:true,json:async()=>read(name)};
};
try{
  const service=createDataService('test',{deduplicate:true});
  const [matches,day,predictions]=await Promise.all([service.load('matches.json'),service.load('schedina-md07.json'),service.load('predictions-md07.json')]);
  assert.deepEqual(matches,read('matches.json'));
  assert.deepEqual(day,read('schedina-md07.json'),'Completed archive must retain excluded operational contracts');
  assert.deepEqual(predictions,read('predictions-md07.json'));
  for(const name of new Set(requests.map(r=>r.name)))assert.equal(requests.filter(r=>r.name===name).length,1,name+' duplicated');
  assert.equal(requests.find(r=>r.name==='official-starter-registry.json').cache,'no-store');
  service.beginView();
  await service.load('matches.json');
  assert.equal(requests.filter(r=>r.name==='official-starter-registry.json').length,2,'New render must refresh official registry');
  assert.equal(requests.filter(r=>r.name==='matches.json').length,2);
  for(const n of [5,6,7]){
    const code=String(n).padStart(2,'0');
    assert.deepEqual(read(`predictions-md${code}.json`).predictions,read('predictions.json').predictions.filter(p=>p.matchId.endsWith(`-md-${code}`)).map(({matchId,combinations})=>({matchId,combinations})));
  }
  const index=JSON.parse(fs.readFileSync('data/generated/schedina-index-2026-27.json'));
  assert.equal((index.html.match(/class="betting-archive-card /g)||[]).length,10);
  // Failed requests must be retryable, never permanently cached.
  let attempts=0;
  globalThis.fetch=async()=>{attempts++;if(attempts===1)throw Error('temporary');return {ok:true,json:async()=>({ok:true})};};
  const retry=createDataService('retry',{deduplicate:true});
  await assert.rejects(retry.loadGenerated('retry.json'),/temporary/);
  assert.deepEqual(await retry.loadGenerated('retry.json'),{ok:true});
  assert.equal(attempts,2);
  console.log('PASS scoped cache: concurrent deduplication, fresh official registry per view, retry, archived contracts, MD5/6/7 projections and 10 index cards');
}finally{globalThis.fetch=oldFetch;}
