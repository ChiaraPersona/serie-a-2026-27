import fs from 'node:fs';
import assert from 'node:assert/strict';
import {fixtureLineupForMatch} from '../js/pages/readings.js';
import {lineupPositions} from '../js/components/lineup-field.mjs';
const read=f=>JSON.parse(fs.readFileSync(f));
const expected={'bologna-monza':['3-4-2-1','3-4-2-1'],'udinese-roma':['3-4-2-1','3-4-2-1'],'milan-inter':['4-4-1-1','3-5-2'],'como-venezia':['4-2-3-1','3-5-2'],'frosinone-torino':['4-2-3-1','3-5-2'],'lazio-cagliari':['4-3-3','4-3-2-1'],'lecce-genoa':['4-3-3','3-4-2-1'],'juventus-napoli':['4-3-2-1','4-3-3'],'sassuolo-fiorentina':['4-3-3','4-3-3']};
const official=read('data/sources/official-lineups-2026-27.json'),matches=read('data/normalized/matches.json'),directory=read('data/teams/index.json'),report=[];
for(const [slug,formations]of Object.entries(expected)){
 const id=slug+'-2026-27-md-10',fixture=official.fixtures.find(f=>f.matchId===id),match=matches.find(m=>m.id===id),projection=read('data/generated/readings/matches/'+id+'.json');assert.equal(fixture.status,'official');
 for(const [i,t]of fixture.teams.entries()){
  assert.equal(t.formation,formations[i]);assert.equal(t.players.length,11);assert.equal(new Set(t.players.map(p=>p.playerId)).size,11);
  for(const d of [directory,projection.teamDirectory]){const lineup=fixtureLineupForMatch(match,d.teams.find(q=>q.id===t.teamId),d);assert.equal(lineup.formation,t.formation);assert.equal(lineup.status,'official');assert.deepEqual(lineup.players,t.players.map(p=>p.currentName));assert.equal(lineupPositions(lineup).length,11);}
  const artifact=projection.artifacts['data/sources/official-lineups-2026-27.json'].fixtures.find(f=>f.matchId===id).teams.find(q=>q.teamId===t.teamId);assert.deepEqual(artifact.players,t.players);assert.equal(artifact.formation,t.formation);
 }
 report.push({matchId:id,formations,official:true,players:22,canonicalAndUiSynchronized:true});
}
const fixture=official.fixtures.find(f=>f.matchId==='sassuolo-fiorentina-2026-27-md-10');
assert.deepEqual(fixture.teams[0].players.slice(5).map(p=>p.playerId),['sulemana-i','nemanja-matic','vasilije-adzic','domenico-berardi','sebastiano-esposito','armand-lauriente']);
assert.deepEqual(fixture.teams[1].players.slice(5).map(p=>p.playerId),['cher-ndour','nicolo-fagioli','marco-brescianini','franco-mastantuono','mateo-pellegrino','alieu-njie']);
fs.writeFileSync('output/sassuolo-fiorentina-md10-image/all-official-formations-audit.json',JSON.stringify(report,null,2)+'\n');console.log('OK: moduli ufficiali e 198 titolari sincronizzati per tutte le 9 partite; disposizione Sassuolo-Fiorentina conforme all’immagine.');
