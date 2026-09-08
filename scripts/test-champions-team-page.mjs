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
 assert.equal((lineup.match(/<strong>/g)||[]).length,13,team.team);
 assert(app.innerHTML.includes('Editoriale · non ufficiale'));
 assert(!app.innerHTML.includes('Rose registrate UEFA'));
 assert(calendar.includes('champions-calendar-list'));
 assert(!calendar.includes('fixture-card'));
 assert.equal((app.innerHTML.match(/data-champions-player=/g)||[]).length,team.players.length);
}
console.log('OK: 36 schede, 8 gare e 4 casa/4 trasferta per squadra, una formazione editoriale con 11 giocatori.');
