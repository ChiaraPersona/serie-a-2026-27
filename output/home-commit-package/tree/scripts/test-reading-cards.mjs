import assert from 'node:assert/strict';
import fs from 'node:fs';
import {scenarioMarkup,projectedYellowCards,comparisonWidths} from '../js/pages/reading-detail/scenario.mjs';
const model={competition:'serie-a',home:{name:'Casa'},away:{name:'Ospite'},prediction:{teamProjections:[{cards:{central:2}},{cards:{central:1.25}}]}};
const rows=m=>[...scenarioMarkup(m).matchAll(/<article class="rd-diverging-row"[\s\S]*?<\/article>/g)].map(m=>m[0]);
const before=JSON.stringify(model),bars=rows(model);
assert.equal(bars.length,5);assert(bars[3].includes('Corner'));assert(bars[4].includes('Cartellini previsti'));assert(bars[4].includes('2,0'));assert(bars[4].includes('1,3'));
assert.deepEqual(comparisonWidths([2,1.25]),[100,62.5]);assert(bars[4].includes('width:62.5%'));
assert.equal(projectedYellowCards({cards:{central:0}}),0);
for(const value of [null,undefined,NaN,Infinity,-1,'2'])assert.equal(projectedYellowCards({cards:{central:value}}),null);
assert.equal(projectedYellowCards({redCards:2,secondYellowCards:1,totalCards:5,yellowCardsPerMatch:3}),null);
const unknown=rows({...model,prediction:{teamProjections:[{cards:{central:0}},{}]}})[4];assert(unknown.includes('0,0'));assert(unknown.includes('>—</b>'));assert(unknown.includes('data-available="false"'));
assert.equal(JSON.stringify(model),before);
const read=p=>JSON.parse(fs.readFileSync('data/normalized/'+p,'utf8'));
const matches=read('matches.json'),teams=read('teams.json');
const cases=read('predictions.json').predictions.map(p=>{const m=matches.find(m=>m.id===p.matchId);return {id:p.matchId,model:{competition:'serie-a',home:{name:teams.find(t=>t.id===m.homeTeam)?.name},away:{name:teams.find(t=>t.id===m.awayTeam)?.name},prediction:p}}});
for(const file of ['champions-pilot-predictions-2026-27.json','champions-pilot-predictions-md02-2026-27.json'])for(const p of read(file).fixtures)cases.push({id:p.fixtureId,model:{competition:'champions',home:{name:p.homeTeam},away:{name:p.awayTeam},prediction:p}});
const baselinePath='reports/reading-cards/four-metrics-before.json';
if(process.argv.includes('--compare-baseline')){
 const baseline=JSON.parse(fs.readFileSync(baselinePath,'utf8'));
 for(const c of cases)assert.deepEqual(rows(c.model).slice(0,4),baseline.find(b=>b.id===c.id).rows,'Original four rows changed: '+c.id);
}
console.log('OK barra cartellini: soli gialli del modello, cifra decimale, null/zero, nessun ripiego su rossi/totali'+(process.argv.includes('--compare-baseline')?'; quattro barre originali identiche su '+cases.length+' previsioni':''));
