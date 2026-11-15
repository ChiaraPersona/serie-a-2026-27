import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {createPage} from '../js/pages/champions.js';
import {teamDataLoader} from '../js/pages/champions-team-data.mjs';
const require=createRequire(import.meta.url),{sources,project,verify}=require('./build-champions-team-data.cjs');
const read=file=>JSON.parse(fs.readFileSync(file));
const raw=sources.map(file=>read('data/normalized/'+file)),[squads,registry,history]=raw;
const ids=squads.teams.map(t=>t.id);verify();
const before=JSON.stringify(raw),app={innerHTML:''};
globalThis.document={querySelector:selector=>selector==='#app'?app:null};
globalThis.CSS={escape:String};
const esc=v=>String(v??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const cache=new Map(),load=async name=>{const file='data/normalized/'+name;if(!cache.has(file))cache.set(file,read(file));return structuredClone(cache.get(file))};
let baseline=false,requests=[];
const loadGenerated=async name=>{
 requests.push(name);
 if(name==='champions-teams/index.json'&&baseline)return {schemaVersion:1,teamIds:[]};
 return read('data/generated/'+name);
};
let views=0;
for(const id of ids){
 const team=squads.teams.find(t=>t.id===id),projection=read('data/generated/champions-teams/'+id+'.json');
 assert.deepEqual(projection,project(...raw,team));
 const canonical=id==='bod-glimt'?'bodo-glimt':id;
 const previous=registry.teams.find(t=>t.teamId===canonical),historical=history.teams.find(t=>t.teamId===id);
 const oldJoin=team.players.map(p=>({...p,previousSeason:p.previousSeason||previous?.players.find(x=>p.uefaPlayerId&&String(x.uefaPlayerId)===String(p.uefaPlayerId))?.previousSeason,currentSeason:historical?.players.find(x=>x.playerId===p.id&&String(x.uefaPlayerId)===String(p.uefaPlayerId))?.currentSeason||null,historicalContext:historical?.players.find(x=>x.playerId===p.id&&String(x.uefaPlayerId)===String(p.uefaPlayerId))}));
 const scoped=projection.datasets;
 const newPrevious=scoped[sources[1]].teams[0],newHistory=scoped[sources[2]].teams[0];
 const newJoin=scoped[sources[0]].teams[0].players.map(p=>({...p,previousSeason:p.previousSeason||newPrevious?.players.find(x=>p.uefaPlayerId&&String(x.uefaPlayerId)===String(p.uefaPlayerId))?.previousSeason,currentSeason:newHistory?.players.find(x=>x.playerId===p.id&&String(x.uefaPlayerId)===String(p.uefaPlayerId))?.currentSeason||null,historicalContext:newHistory?.players.find(x=>x.playerId===p.id&&String(x.uefaPlayerId)===String(p.uefaPlayerId))}));
 assert.deepEqual(newJoin,oldJoin,'Player identity/history changed '+id);
 for(const query of ['', '&playerSeason=2025-26','&playerSeason=2025-26&historyScope=official','&playerSeason=2025-26&historyScope=friendly']){
  globalThis.location={search:'?team='+id+query};
  baseline=true;await createPage({esc,load,loadGenerated}).render();const expected=app.innerHTML;
  baseline=false;requests=[];
  const forbidden=[];
  await createPage({esc,load:async name=>{if(sources.includes(name))forbidden.push(name);return load(name)},loadGenerated}).render();
  assert.equal(app.innerHTML,expected,'Team view changed '+id+query);
  assert.deepEqual(forbidden,[],'Global club archive fetched');
  assert.equal(requests.filter(n=>n===`champions-teams/${id}.json`).length,1);
  views++;
 }
}
assert.equal(JSON.stringify(raw),before,'Canonical inputs mutated');
const untouched=teamDataLoader(load,loadGenerated,'../escape');assert.equal(untouched,load);
baseline=false;const invalid=teamDataLoader(load,loadGenerated,'not-a-club');assert.deepEqual(await invalid(sources[0]),squads);
await assert.rejects(teamDataLoader(load,async name=>name.endsWith('index.json')?{schemaVersion:1,teamIds:[ids[0]]}:{schemaVersion:1,teamId:'wrong',datasets:{}},ids[0])(sources[0]),/non coerente/);
console.log(`PASS ${ids.length} canonical clubs, ${views} identical rendered views, exact player joins, no global archive requests, invalid IDs and projection validation`);
