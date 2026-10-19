import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {fixtureLineupForMatch} from '../../js/pages/readings.js';
import {loadEvidence} from '../../js/pages/reading-detail/evidence.mjs';
const cache=new Map();
const read=p=>{if(!cache.has(p))cache.set(p,JSON.parse(fs.readFileSync(p,'utf8')));return cache.get(p);};
export async function readingCases(){
 const originalFetch=globalThis.fetch;globalThis.fetch=async url=>({ok:true,json:async()=>read(fileURLToPath(url))});
 try{
 const directory=read('data/teams/index.json'),matches=read('data/normalized/matches.json'),predictions=read('data/normalized/predictions.json').predictions;
 const calendar=read('data/normalized/champions-league-2026-27.json'),squads=read('data/normalized/champions-registered-squads-2026-27.json');
 const champions=fs.readdirSync('data/normalized').filter(f=>/^champions-pilot-predictions(?:-md\d+)?-2026-27\.json$/.test(f)).flatMap(f=>read('data/normalized/'+f).fixtures);
 const integrations=fs.readdirSync('data/normalized').filter(f=>/^champions-md\d+-integration-2026-27\.json$/.test(f)).flatMap(f=>read('data/normalized/'+f).fixtures);
 const models=matches.filter(m=>m.competition==='serie-a').map(m=>({competition:'serie-a',fixture:{id:m.id,date:m.date,kickoff:m.kickoff,matchday:m.matchday},home:directory.teams.find(t=>t.id===m.homeTeam),away:directory.teams.find(t=>t.id===m.awayTeam),prediction:predictions.find(p=>p.matchId===m.id),forecasts:[],analysis:{match:m,matches,teamDirectory:directory,lineups:[m.homeTeam,m.awayTeam].map(id=>({lineup:fixtureLineupForMatch(m,directory.teams.find(t=>t.id===id),directory)}))}}));
 models.push(...champions.map(p=>{const match=calendar.fixtures.find(m=>m.id===p.fixtureId);const side=name=>{const t=calendar.teamBranding.find(t=>t.team===name);return {id:t?.id||null,name};};return {competition:'champions',fixture:{id:p.fixtureId,date:p.date,kickoff:match?.kickoff,matchday:match?.matchday},home:side(p.homeTeam),away:side(p.awayTeam),prediction:p,forecasts:[],analysis:{match,matches:calendar.fixtures,lineups:integrations.find(f=>f.fixtureId===p.fixtureId)?.lineups,squads}};}));
 const cases=[];for(const model of models){const evidence=await loadEvidence(model,{benchForecasts:false});cases.push({model,evidence});}return cases;
 }finally{globalThis.fetch=originalFetch;}
}
