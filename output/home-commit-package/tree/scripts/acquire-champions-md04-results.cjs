'use strict';
const fs=require('node:fs'),zlib=require('node:zlib'),assert=require('node:assert/strict');
const base='data/raw/champions-results/2026-11-05';
async function run(){
 fs.mkdirSync(base,{recursive:true});
 const url='https://site.api.espn.com/apis/site/v2/sports/soccer/uefa.champions/scoreboard?dates=20261104';
 const response=await fetch(url);assert(response.ok);const board=await response.json();
 fs.writeFileSync(base+'/scoreboard.json',JSON.stringify({url,retrievedAt:new Date().toISOString(),payload:board}));
 const calendar=require('../data/normalized/champions-league-2026-27.json');
 const teams=require('../data/sources/champions-pilot-match-stats-2025-27.json').teams;
 const jobs=[];
 for(const f of calendar.fixtures.filter(f=>f.matchday===4&&f.date==='2026-11-04')){
  const home=teams.find(t=>t.name===f.homeTeam),away=teams.find(t=>t.name===f.awayTeam);assert(home&&away);
  const event=board.events.find(e=>e.competitions[0].competitors.some(c=>c.homeAway==='home'&&c.id===home.espnTeamId)&&e.competitions[0].competitors.some(c=>c.homeAway==='away'&&c.id===away.espnTeamId));assert(event);assert(event.status.type.completed);
  const sourceUrl='https://site.api.espn.com/apis/site/v2/sports/soccer/uefa.champions/summary?event='+event.id;
  const r=await fetch(sourceUrl);assert(r.ok);const payload=await r.json();assert(payload.header.competitions[0].status.type.completed);assert.equal(String(payload.header.id),event.id);
  const rawPath=base+'/'+event.id+'.json.gz';fs.writeFileSync(rawPath,zlib.gzipSync(JSON.stringify({url:sourceUrl,retrievedAt:new Date().toISOString(),payload})));
  jobs.push({fixtureId:f.id,eventId:event.id,homeTeamId:home.id,awayTeamId:away.id,sourceUrl,rawPath});
 }
 assert.equal(jobs.length,9);fs.writeFileSync(base+'/manifest.json',JSON.stringify({jobs},null,2)+'\n');console.log('Acquired '+jobs.length+' completed fixtures');
}
run().catch(e=>{console.error(e);process.exitCode=1});
