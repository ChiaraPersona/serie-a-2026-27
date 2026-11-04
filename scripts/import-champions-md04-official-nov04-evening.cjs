'use strict';
// Explicit canonical identities and tactical order reviewed against user screenshots.
const fs=require('node:fs'),assert=require('node:assert/strict');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const write=(p,v)=>fs.writeFileSync(p,JSON.stringify(v,null,2)+'\n');
const specs=require('./champions/official-md04-nov04-evening-specs.cjs');
const evidence='data/sources/official-lineup-evidence/champions-md04-nov04-evening-seven';
function build(){
 const probable=read('data/sources/champions-probable-formations-md04-2026-27.json'),file='data/sources/champions-official-formations-md04-2026-27.json',official=read(file);
 const teams=specs.map(([id,formation,xi,bench])=>{
  const t=probable.teams.find(t=>t.teamId===id);assert(t,id);const registered=read('data/normalized/champions-registered-squads-2026-27.json').teams.find(t=>t.id===id);
  const pool=['starters','bench','unavailable','suspended','doubtful'].flatMap(k=>t[k]||[]);
  const resolve=entry=>{const [playerId,number]=entry.split(':');if(playerId.startsWith('?'))return {sourceName:playerId.slice(1),canonicalName:playerId.slice(1),shirtNumber:Number(number),playerId:null,registeredPlayerId:null,providerPlayerId:null,identityStatus:'unresolved-user-name-number'};const member=registered.players.find(p=>p.id===playerId);const p=pool.find(p=>p.playerId===playerId)|| (member?{playerId,registeredPlayerId:member.id,canonicalName:member.name,sourceName:member.name,providerPlayerId:member.providerIds?.espn||null}:null);assert(p,playerId);return {...p,shirtNumber:Number(number),reason:null};};
  const starters=xi.split(',').map(resolve),reserves=bench.split(',').map(resolve);
  assert.equal(starters.length,11);assert.equal(new Set([...starters,...reserves].map(p=>p.playerId||p.sourceName)).size,starters.length+reserves.length);
  let offset=1;const rows=[starters[0].canonicalName,...formation.split('-').map(n=>{const row=starters.slice(offset,offset+Number(n));offset+=Number(n);return row.map(p=>p.canonicalName).join(', ');})];
  const mentioned=new Set([...starters,...reserves].map(p=>p.playerId));
  return {...t,status:'official',formation,rawLine:t.team+': '+rows.join('; '),starters,bench:reserves,benchStatus:'official',unavailable:(t.unavailable||[]).filter(p=>!mentioned.has(p.playerId)),suspended:(t.suspended||[]).filter(p=>!mentioned.has(p.playerId)),doubtful:[],evidenceDirectory:evidence};
 });
 const ids=new Set(teams.map(t=>t.fixtureId));assert.equal(ids.size,7);
 const output='output/official-md04-nov04-evening-seven';fs.mkdirSync(output,{recursive:true});
 if(!fs.existsSync(output+'/before.json'))write(output+'/before.json',{official,catalog:read('data/normalized/schedina-champions-md04.json'),individuals:read('data/normalized/champions-md04-probable-individuals-2026-27.json'),shared:read('data/generated/champions-shared-scenarios.json')});
 if(process.argv.includes('--write'))write(file,{...official,source:{...official.source,consultedAt:new Date().toISOString(),evidenceDirectories:[...new Set([...(official.source.evidenceDirectories||[]),evidence])]},teams:[...official.teams.filter(t=>!ids.has(t.fixtureId)),...teams],fixtures:[...official.fixtures.filter(f=>!ids.has(f.fixtureId)),...[...ids].map(fixtureId=>({fixtureId,status:'official',home:{players:teams.find(t=>t.fixtureId===fixtureId&&t.venue==='home').starters},away:{players:teams.find(t=>t.fixtureId===fixtureId&&t.venue==='away').starters}}))]});
 console.log(JSON.stringify({fixtures:[...ids],starters:154,bench:teams.reduce((n,t)=>n+t.bench.length,0)}));
}
if(require.main===module)build();
module.exports={specs};
