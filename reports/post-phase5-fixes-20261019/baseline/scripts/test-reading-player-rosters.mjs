import fs from 'node:fs';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {fixtureLineupForMatch} from '../js/pages/readings.js';
import {loadEvidence,individualPlayers} from '../js/pages/reading-detail/evidence.mjs';
import {formationMarkup,playersMarkup} from '../js/pages/reading-detail/people.mjs';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
export async function rosterCases(){
 const originalFetch=globalThis.fetch;globalThis.fetch=async url=>({ok:true,json:async()=>read(fileURLToPath(url))});
 try{
 const directory=read('data/teams/index.json'),matches=read('data/normalized/matches.json'),predictions=read('data/normalized/predictions.json').predictions;
 const calendar=read('data/normalized/champions-league-2026-27.json'),squads=read('data/normalized/champions-registered-squads-2026-27.json'),integration=read('data/normalized/champions-md02-integration-2026-27.json');
 const champions=[...read('data/normalized/champions-pilot-predictions-2026-27.json').fixtures,...read('data/normalized/champions-pilot-predictions-md02-2026-27.json').fixtures];
 const models=matches.filter(m=>m.competition==='serie-a'&&m.matchday<=7).map(m=>({competition:'serie-a',fixture:{id:m.id,date:m.date,matchday:m.matchday},home:directory.teams.find(t=>t.id===m.homeTeam),away:directory.teams.find(t=>t.id===m.awayTeam),prediction:predictions.find(p=>p.matchId===m.id),forecasts:[],analysis:{match:m,matches,teamDirectory:directory,lineups:[m.homeTeam,m.awayTeam].map(id=>({lineup:fixtureLineupForMatch(m,directory.teams.find(t=>t.id===id),directory)}))}}));
 models.push(...champions.map(p=>{const match=calendar.fixtures.find(m=>m.id===p.fixtureId);const side=name=>{const t=calendar.teamBranding.find(t=>t.team===name);return {id:t?.id||null,name};};return {competition:'champions',fixture:{id:p.fixtureId,date:p.date,matchday:match?.matchday},home:side(p.homeTeam),away:side(p.awayTeam),prediction:p,forecasts:[],analysis:{match,matches:calendar.fixtures,lineups:integration.fixtures.find(f=>f.fixtureId===p.fixtureId)?.lineups,squads}};}));
 const cases=[];for(const model of models){const evidence=await loadEvidence(model);cases.push({model,evidence});}return cases;
 }finally{globalThis.fetch=originalFetch;}
}
export async function checkRosters(){
 const cases=await rosterCases();let starters=0,bench=0;
 for(const {model,evidence} of cases){
  const snapshot=JSON.stringify({model,evidence}),players=individualPlayers(model,evidence);
  assert.equal(JSON.stringify({model,evidence}),snapshot);
  assert(!formationMarkup(evidence).includes('Elenchi titolari'));
  const ids=players.filter(p=>p.id).map(p=>p.team+':'+p.id);assert.equal(new Set(ids).size,ids.length,model.fixture.id+' duplicates');
  for(const l of evidence.lineups)for(const [items,status] of [[l.players,'starter'],[l.benchPlayers,'bench']])for(const p of items){
   const matches=players.filter(r=>r.team===l.side.name&&(p.id?p.id===r.id:r.name===p.name||r.source?.lineupName===p.name||r.source?.suppliedName===p.name));
   assert.equal(matches.length,1,model.fixture.id+' '+p.name);if(['official','probable'].includes(l.status))assert.equal(matches[0].lineupStatus,(status==='bench'&&l.players.some(q=>q.id&&q.id===p.id)?'starter':status),model.fixture.id+' '+p.name);
   if(status==='starter')starters++;else bench++;
  }
  for(const p of model.prediction?.shooters?.allPlayers||[])assert(players.some(r=>r.source===p),model.fixture.id+' projection lost: '+p.name);
  const html=playersMarkup(model,evidence);assert(!html.includes('NaN'));assert(!html.includes('updatedAt'));
 }
 console.log(`PASS: ${cases.length} fixtures; ${starters} starters and ${bench} bench entries; no duplicate canonical identities; projections and inputs unchanged.`);
 return cases;
}
if(process.argv[1]&&import.meta.url===new URL('file:///'+process.argv[1].replaceAll('\\','/')).href)await checkRosters();
