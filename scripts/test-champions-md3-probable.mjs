import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {md3ProbableMarkup} from '../js/pages/champions-md3-probable.mjs';
const require=createRequire(import.meta.url),{estimateExpectedMinutes}=require('./champions/substitute-minutes'),{projectDocumentedTeam}=require('./champions/current-season-offline');
const read=p=>JSON.parse(fs.readFileSync(p));
const source=read('data/sources/champions-probable-formations-md03-2026-27.json'),output=read('data/normalized/champions-md03-probable-individuals-2026-27.json');
assert.equal(source.status,'probable');assert.equal(source.teams.length,36);assert.equal(output.fixtures.length,18);
const teams=output.fixtures.flatMap(f=>f.teams),players=teams.flatMap(t=>t.players);
assert.equal(players.length,396);assert.equal(new Set(players.filter(p=>p.providerPlayerId).map(p=>p.providerPlayerId)).size,players.filter(p=>p.providerPlayerId).length);
for(const t of teams){
 assert.equal(t.status,'probable');assert.equal(t.players.length,11);assert.equal(t.bench,null);
 for(const p of t.players){
  assert.equal(p.lineupStatus,'probable');assert.equal(p.eventProbabilities,null);
  if(!p.playerId||t.collectiveOnly||['doubtful','unavailable','suspended'].includes(p.availability)){assert.equal(p.expectedMinutes,null);assert.equal(p.projectedShots,null);assert.equal(p.projectedSOT,null);}
  if(p.expectedMinutes!==null){assert(p.expectedMinutes>0&&p.expectedMinutes<=90);assert(p.minutesEstimate.sample.exactStarterAppearances>=3);assert.equal(p.expectedMinutes,estimateExpectedMinutes(p.minutesEstimate.evidence,'starter',output.fixtures.find(f=>f.teams.includes(t)).kickoffAt).expectedMinutes);}
  if(p.projectedShots!==null){assert(p.projectedSOT<=p.projectedShots);assert(p.expectedMinutes>0);}
 }
 // Current article provides no bench: the unchanged gate must remain closed.
 assert.equal(t.reconciliation.players.length,0);assert(t.players.every(p=>p.projectedShots===null&&p.projectedSOT===null));
}
assert.equal(teams.filter(t=>t.collectiveOnly).length,4);
const suspicious=players.find(p=>p.sourceName==='Haaland');assert.equal(suspicious.availability,'doubtful');assert.equal(suspicious.expectedMinutes,null);
assert.equal(source.teams.find(t=>t.teamId==='villarreal').starters.find(p=>p.sourceName==='Saliba').playerId,'nathan-saliba');
assert.equal(source.teams.find(t=>t.teamId==='arsenal').unavailable.find(p=>p.sourceName==='Saliba').playerId,'william-saliba');
assert.equal(source.teams.find(t=>t.teamId==='borussia-dortmund').starters.find(p=>p.sourceName==='Bellingham').playerId,'jobe-bellingham');
assert.equal(source.teams.find(t=>t.teamId==='real-madrid').starters.find(p=>p.sourceName==='Bellingham').playerId,'jude-bellingham');
assert.equal(projectDocumentedTeam({teamId:'liverpool',players:[],lineupVerified:true,benchVerified:false}).status,'blocked-documentation-or-minutes');
for(const f of output.fixtures){const html=md3ProbableMarkup(f);assert(!/https?:|sourceUrl|provenienza|Tiri \/90|foto|<img/.test(html));assert(html.includes('non ufficiali'));assert.equal((html.match(/data-md3-probable-player/g)||[]).length,22);}
console.log('OK 18/36/396; exact aliases, homonyms, conditional minutes, doubts, four excluded teams, unchanged reconciliation gate, no diagnostic rates published.');
