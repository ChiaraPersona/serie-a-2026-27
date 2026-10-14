import assert from 'node:assert/strict';import fs from 'node:fs';
const app={innerHTML:''};globalThis.location={search:'?competizione=champions&giornata=2'};globalThis.CSS={escape:x=>String(x)};globalThis.document={querySelector:s=>s==='#app'?app:null,querySelectorAll:()=>[],addEventListener:()=>{},removeEventListener:()=>{}};
const esc=x=>String(x??'').replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;');const load=async n=>JSON.parse(fs.readFileSync('data/normalized/'+n,'utf8'));const hero=()=>'';const dateOnly=x=>String(x??'').slice(0,10);
const {createPage:betting}=await import('../../js/pages/betting.js');await betting({esc,load,hero,dateOnly}).render();
fs.writeFileSync('output/champions-md02-settlement/schedina-render.html',app.innerHTML);
assert.equal((app.innerHTML.match(/data-settlement="won"/g)||[]).length,11);assert.equal((app.innerHTML.match(/data-settlement="lost"/g)||[]).length,10);assert.equal((app.innerHTML.match(/NON TITOLARE/g)||[]).length,4);
const {createPage:reading}=await import('../../js/pages/champions.js');let wins=0,losses=0,pending=0,nonStarters=0;
for(const f of (await load('schedina-champions-md02.json')).fixtures.filter(f=>f.date==='2026-10-13')){
location.search='?match='+f.fixtureId;await reading({esc,load}).render();fs.writeFileSync('output/champions-md02-settlement/'+f.fixtureId+'.html',app.innerHTML);
const published=app.innerHTML.split('data-champions-published-root')[1].split('</ol>')[0];wins+=(published.match(/data-settlement="won"/g)||[]).length;losses+=(published.match(/data-settlement="lost"/g)||[]).length;pending+=(published.match(/data-settlement="pending"/g)||[]).length;nonStarters+=(published.match(/NON TITOLARE/g)||[]).length;
}
assert.deepEqual([wins,losses,pending,nonStarters],[11,10,37,4]);console.log('OK DOM: Schedina and nine Letture match settlement, four badges for three distinct non-starters.');

