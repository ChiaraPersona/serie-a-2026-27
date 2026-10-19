import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createPage} from '../js/pages/champions.js';
const load=async name=>JSON.parse(fs.readFileSync(new URL(`../data/normalized/${name}`,import.meta.url),'utf8'));
const app={innerHTML:''};
globalThis.document={querySelector:()=>app};
const esc=value=>String(value??'').replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const data=await load('champions-league-2026-27.json');
const squads=await load('champions-registered-squads-2026-27.json');
for(const team of squads.teams){
 globalThis.location={search:`?team=${team.id}`};
 await createPage({esc,load}).render();
 const calendar=app.innerHTML.split('aria-labelledby="team-calendar-title"')[1].split('<section class="champions-team-lineup">')[0];
 const fixtures=data.fixtures.filter(f=>f.homeTeam===team.team||f.awayTeam===team.team);
 assert.equal(fixtures.length,8,team.team);
 assert.equal(fixtures.filter(f=>f.homeTeam===team.team).length,4,team.team);
 assert.equal((calendar.match(/data-team-home=/g)||[]).length,8,team.team);
 for(const f of fixtures)assert(calendar.includes(`data-team-home="${esc(f.homeTeam)}" data-team-away="${esc(f.awayTeam)}"`));
 const lineup=app.innerHTML.split('<section class="champions-team-lineup">')[1].split('</section>')[0];
 assert.equal((lineup.match(/class="reading-lineup-card /g)||[]).length,1,team.team);
 const nextFixture=fixtures.slice().sort((a,b)=>`${a.date}T${a.kickoff}`.localeCompare(`${b.date}T${b.kickoff}`)).find(f=>f.probableFormation);
 const side=nextFixture?.probableFormation?.[nextFixture.homeTeam===team.team?'home':'away'];
 if(side?.formation===null){
  assert.equal((lineup.match(/<strong>/g)||[]).length,2,team.team);
  assert.equal((lineup.match(/<li>/g)||[]).length,11,team.team);
  assert(lineup.includes('Modulo N/D'),team.team);
 }else assert.equal((lineup.match(/<strong>/g)||[]).length,13,team.team);
 assert(app.innerHTML.includes(nextFixture?.probableFormation?.status==='official'?'Confermate · Diretta':'Editoriale · non ufficiale'));
 assert(!app.innerHTML.includes('Rose registrate UEFA'));
 assert(calendar.includes('champions-calendar-list'));
 assert(!calendar.includes('fixture-card'));
 assert.equal((calendar.match(/champions-calendar-opponent/g)||[]).length,8,team.team);
 assert.equal((calendar.match(/href="champions-league\.html\?match=/g)||[]).length,2,`${team.team}: letture MD1 e MD2`);
 assert.equal((calendar.match(/class="is-next"/g)||[]).length,1,`${team.team}: prossima partita`);
 assert.equal((app.innerHTML.match(/data-champions-player=/g)||[]).length,team.players.length);
 assert.equal((app.innerHTML.match(/data-player-ranking=/g)||[]).length,3,`${team.team}: selettori giocatori`);
 assert(app.innerHTML.includes('id="champions-player-search"'),`${team.team}: ricerca giocatori`);
 assert(app.innerHTML.includes('id="champions-player-role"'),`${team.team}: filtro ruolo`);
 assert(app.innerHTML.includes('id="champions-player-sort"'),`${team.team}: ordinamento giocatori`);
 assert(app.innerHTML.includes('champions-team-hero-logo'),`${team.team}: stemma hero`);
 assert(app.innerHTML.includes('Posizione fase campionato'),`${team.team}: posizione esplicita`);
 assert(!/Allenatore:[^<\n]*[-\u2010-\u2015]{3,}/u.test(app.innerHTML),`${team.team}: nome allenatore senza trattini decorativi`);
 if(team.id==='bayern-munchen'){
  assert(app.innerHTML.includes('Allenatore: Vincent Kompany'),`${team.team}: allenatore pulito`);
  assert(lineup.includes('Allenatore: Vincent Kompany'),`${team.team}: allenatore pulito sotto il campo`);
 }
 if(team.id==='borussia-dortmund')assert(app.innerHTML.includes('Allenatore: Niko Kovač'),`${team.team}: allenatore pulito`);
 assert(!app.innerHTML.includes('id="offensive-identity"'),`${team.team}: identità offensiva vuota nascosta`);
 const sectionOrder=['champions-team-hero','champions-team-summary','champions-team-calendar','champions-team-volume','champions-team-attack','champions-team-lineup','champions-player-overview','champions-team-players'].map(token=>app.innerHTML.indexOf(token)).filter(index=>index>=0);
 assert.deepEqual(sectionOrder,sectionOrder.slice().sort((a,b)=>a-b),`${team.team}: ordine sezioni`);
}
console.log('OK: 36 schede condivise con hero, riepilogo, 8 gare, letture MD1/MD2, formazione, classifiche e controlli giocatori; N/D preservato.');
