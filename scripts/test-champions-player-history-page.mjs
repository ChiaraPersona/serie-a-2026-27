import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createPage} from '../js/pages/champions.js';
const load=async name=>JSON.parse(fs.readFileSync(new URL(`../data/normalized/${name}`,import.meta.url),'utf8'));
const context=await load('champions-player-history-context-2025-26.json');
const app={innerHTML:''};globalThis.document={querySelector:()=>app};
const esc=value=>String(value??'').replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;');
for(const team of context.teams)for(const [scope,field] of [['club','club'],['official','nationalOfficial'],['friendly','nationalFriendly']]){
 globalThis.location={search:`?team=${team.teamId}&playerSeason=2025-26&historyScope=${scope}`};
 await createPage({esc,load}).render();
 assert(app.innerHTML.includes('id="champions-player-history-scope"'));
 assert.equal((app.innerHTML.match(/data-champions-player=/g)||[]).length,team.players.length);
 for(const p of team.players){
  const row=app.innerHTML.split(`data-champions-player="${esc(p.playerId)}"`)[1].split('</tr>')[0];
  for(const [key,attr] of [['minutes','minutes'],['shots','shots'],['shotsOnTarget','shots-on-target']]){
   const expected=p[field]?.totals?.[key];assert(row.includes(`data-stat-${attr}="${typeof expected==='number'?expected:''}"`),`${team.teamId}/${p.playerId}/${scope}/${key}`);
  }
 }
 if(scope!=='club'){assert(app.innerHTML.includes('1 luglio 2025 al 30 giugno 2026'));assert(app.innerHTML.includes('>Gialli</th>'));}
}
console.log('OK: 36 rose complete nei tre ambiti storici, nessuna sostituzione del dato N/D con statistiche club.');
