import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createPage} from '../js/pages/champions.js';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const registry=read('data/normalized/champions-md03-player-database-2026-27.json'),original=read('data/normalized/champions-registered-squads-2026-27.json');
const before=JSON.stringify([registry,original]);
const app={innerHTML:''};globalThis.document={querySelector:s=>s==='#app'?app:null};globalThis.CSS={escape:s=>String(s)};
const esc=v=>String(v??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
let loaded=[];const load=async f=>{loaded.push(f);return read('data/normalized/'+f)};
assert.equal(registry.teams.reduce((n,t)=>n+t.players.length,0),1242);
for(const t of registry.teams){assert(original.teams.some(o=>(({'bod-glimt':'bodo-glimt'})[o.id]||o.id)===t.teamId));assert.equal(new Set(t.players.map(p=>p.id)).size,t.players.length);}
for(const [id,playerId,name] of [['borussia-dortmund','ethan-nwaneri','Ethan Nwaneri'],['feyenoord','mika-medina','Mika Mármol']]){
 globalThis.location={search:'?team='+id};await createPage({esc,load}).render();
 const team=registry.teams.find(t=>t.teamId===id);
 assert.equal((app.innerHTML.match(/data-champions-player=/g)||[]).length,team.players.length);
 assert(app.innerHTML.includes(`data-champions-player="${playerId}"`));assert(app.innerHTML.includes(name));
 assert(app.innerHTML.includes('Rosa ammissibile · MD3'));assert(app.innerHTML.includes('Non equivale a convocati o titolari'));
 for(const p of team.players)assert(app.innerHTML.includes(`data-champions-player="${p.id}"`));
}
for(const match of ['ucl-2026-27-md01-06','ucl-2026-27-md02-12']){
 loaded=[];globalThis.location={search:'?match='+match};await createPage({esc,load}).render();
 assert(!loaded.includes('champions-md03-player-database-2026-27.json'),'I dettagli storici non caricano il registro corrente');
}
assert.equal(JSON.stringify([registry,original]),before);
console.log('OK schede MD3: join canonica, Nwaneri e Mármol, 1242 identita uniche per squadra, snapshot e letture MD1/MD2 preservati.');
