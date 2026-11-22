'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const {calculateStandings}=require('./standings.js');
const read=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const full=read('data/normalized/matches.json'),teams=read('data/normalized/teams.json'),home=read('data/generated/home-ui.json');
assert.equal(home.schemaVersion,1);assert.deepEqual(home.teams,teams);assert.deepEqual(home.previousStandings,read('data/normalized/standings-2025-26.json'));
for(const scope of ['general','home','away'])assert.deepEqual(calculateStandings(teams,home.matches,scope),calculateStandings(teams,full,scope),'Standings, discipline, coverage or N/D changed: '+scope);
assert.deepEqual(home.matches.map(m=>[m.id,m.date,m.kickoff,m.dateStatus,m.status,m.score]),full.map(m=>[m.id,m.date,m.kickoff,m.dateStatus,m.status,m.score]));
const directory=read('data/teams/index.json').teams;
for(const team of home.directory.teams){const original=directory.find(t=>t.id===team.id);for(const key of ['id','name','logo','monochromeLogo','colors','stadium','coach','preferredFormation'])assert.deepEqual(team[key],original[key],team.id+' '+key);}
for(let day=1;day<=38;day++)assert.deepEqual(read(`data/generated/matches/md${String(day).padStart(2,'0')}.json`),full.filter(m=>m.competition==='serie-a'&&m.matchday===day),'Full observed fixture / settlement input changed: '+day);
for(let day=1;day<=12;day++){
 const ids=new Set(full.filter(m=>m.competition==='serie-a'&&m.matchday===day).map(m=>m.id));
 const data=read(day===1?'data/normalized/schedina.json':`data/normalized/schedina-md${String(day).padStart(2,'0')}.json`);
 const visit=value=>{if(!value||typeof value!=='object')return;if(Array.isArray(value.legs))for(const leg of value.legs)if(leg.matchId)assert(ids.has(leg.matchId),'Cross-round settlement needs an additional fixture: '+leg.matchId);for(const child of Object.values(value))visit(child);};visit(data);
}
assert(fs.statSync('data/generated/home-ui.json').size<fs.statSync('data/normalized/matches.json').size/3);
console.log('PASS all standings and N/D, team descriptions, calendar identity, and 38 complete matchday/settlement projections');
