import assert from 'node:assert/strict';
import fs from 'node:fs';
import {currentTacticalSample,tacticsMarkup} from '../js/pages/reading-detail/tactics-history.mjs';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const matches=read('data/normalized/matches.json');
let checked=0;
for(const fixture of matches.filter(m=>m.competition==='serie-a'&&m.matchday===11)){
 for(const id of [fixture.homeTeam,fixture.awayTeam]){
  const model={competition:'serie-a',fixture},side={id};
  const s=currentTacticalSample(model,{analysis:{matches}},side);
  const previous=matches.filter(m=>m.competition==='serie-a'&&m.season===fixture.season&&m.status==='finished'&&m.score&&m.date<fixture.date&&[m.homeTeam,m.awayTeam].includes(id));
  assert.equal(s.matches,previous.length);assert(s.to<fixture.date);
  const shots=previous.map(m=>m.teamStats?.[m.homeTeam===id?'home':'away']?.shots).filter(Number.isFinite);
  assert.equal(s.metrics[1][1].n,shots.length);
  assert.equal(s.metrics[1][1].mean,shots.reduce((a,b)=>a+b,0)/shots.length);
  checked++;
 }
}
const fixture={id:'target',season:'2026-27',date:'2026-11-06'},side={id:'a',name:'A'};
const row={id:'prior',competition:'serie-a',season:'2026-27',status:'finished',date:'2026-11-05',homeTeam:'a',awayTeam:'b',score:{home:0,away:1},teamStats:{home:{shots:0},away:{shots:2}}};
const model={competition:'serie-a',fixture,home:side,away:{id:'b',name:'B'}};
const evidence={analysis:{matches:[row,{...row,id:'future',date:'2026-11-07'},{...row,id:'other',competition:'champions'},{...row,id:'old',season:'2025-26'},{...row,id:'same-day',date:fixture.date}]}};
const sample=currentTacticalSample(model,evidence,side);
assert.equal(sample.matches,1);assert.equal(sample.metrics[1][1].mean,0);assert.equal(sample.metrics[0][1].mean,null);
const adapted={...model,fixture:{...fixture,season:undefined}};
assert.deepEqual(currentTacticalSample(adapted,{analysis:{...evidence.analysis,match:fixture}},side),sample,'season from canonical analysis must survive the presentation adapter');
const html=tacticsMarkup(model,evidence);assert(html.includes('N/D'));assert(html.includes('n=1'));assert(!/https?:|WhoScored|Statmuse/.test(html));
console.log(`PASS: ${checked} MD11 team samples; temporal/competition/season separation, zero and missing values.`);
