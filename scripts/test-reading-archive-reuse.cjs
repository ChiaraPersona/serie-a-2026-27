'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const {canReuse}=require('./reading-archive-reuse.cjs');
const read=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const matches=read('data/normalized/matches.json').filter(f=>f.competition==='serie-a'&&f.status==='finished');
const predictions=read('data/normalized/predictions.json').predictions,readings=read('data/normalized/readings.json'),official=read('data/sources/official-lineups-2026-27.json'),days=new Map();
let reusable=0,sample;
for(const match of matches){
 const code=String(match.matchday).padStart(2,'0');
 if(!days.has(match.matchday)){
  const paths=[`data/normalized/reading-md${code}-market-catalog.json`,match.matchday===1?'data/normalized/schedina.json':`data/normalized/schedina-md${code}.json`];
  const file=paths.find(p=>fs.existsSync(p));days.set(match.matchday,file?read(file):null);
 }
 const source=days.get(match.matchday),catalog=source?.marketCatalog;
 const forecastDataset=source?{matchday:match.matchday,marketCatalog:{matches:(catalog?.matches||[]).filter(m=>m.matchId===match.id).map(m=>({matchId:m.matchId,selections:m.selections.filter(l=>l.suggestionAnalysis?.suggested===true)}))}}:null;
 const input={previous:read(`data/generated/readings/matches/${match.id}.json`),match,readings:readings.filter(r=>r.matchId===match.id),predictions:predictions.filter(p=>p.matchId===match.id),forecastDataset,officialFixtures:official.fixtures.filter(f=>f.matchId===match.id)};
 if(canReuse(input)){reusable++;sample??=input;}
}
assert(sample,'No real archive can be reused');
for(const mutate of [x=>{x.match.status='scheduled';},x=>{x.match.score={home:99,away:98};},x=>{x.predictions.push({matchId:x.match.id,corrected:true});},x=>{x.officialFixtures.push({matchId:x.match.id,corrected:true});},x=>{x.forecastDataset={corrected:true};},x=>{x.readings.push({matchId:x.match.id,corrected:true});}]){
 const changed=structuredClone(sample);mutate(changed);assert.equal(canReuse(changed),false,'Changed canonical input was frozen');
}
console.log(`PASS ${reusable}/${matches.length} existing Serie A archives reusable; result, prediction, official lineup, contract and reading corrections invalidate reuse`);
