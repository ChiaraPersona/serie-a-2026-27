import assert from 'node:assert/strict';
import fs from 'node:fs';
import {settleLeg} from '../js/pages/betting-settlement.mjs';
import {createPage} from '../js/pages/betting.js';
const read=f=>JSON.parse(fs.readFileSync(new URL(`../data/normalized/${f}`,import.meta.url),'utf8'));
const matches=read('matches.json'),data=read('schedina-md06.json');
const expected={genoa:[6,9],inter:[11,7],napoli:[13,2],como:[9,11],lazio:[12,7],lecce:[11,4],sassuolo:[9,7],cagliari:[12,7],atalanta:[13,2],torino:[8,9]};
let gross=0,count=0;
for(const cat of data.marketCatalog.matches){
 const match=matches.find(m=>m.id===cat.matchId);
 assert.equal(match.status,'finished');
 const legs=cat.selections.filter(l=>l.suggestionAnalysis?.suggested&&l.betSelection?.quote?.availability==='AVAILABLE_AT_SNAPSHOT');
 const results=legs.map(l=>({leg:l,result:settleLeg(l,match)}));
 assert.deepEqual([results.filter(x=>x.result.status==='won').length,results.filter(x=>x.result.status==='lost').length],expected[match.homeTeam]);
 for(const {leg,result} of results){assert(['won','lost','void'].includes(result.status));count++;gross+=result.status==='won'?Number(leg.odds):result.status==='void'?1:0}
}
assert.equal(count,169);assert(Math.abs(gross-149.59)<1e-8);
const sample={market:'TIRI IN PORTA GIOCATORE (DUO)',marketScope:'player',player:'Test Player',selection:'OVER',label:'Test Player 1+ tiri',betSelection:{market:{bookmakerSemantics:{postsAndCrossbarIncluded:true}}}};
const fixture={status:'finished',score:{home:0,away:0},playerStats:{home:[{player:'Test Player',shotsOnTarget:0,hitWoodwork:1}],away:[]}};
assert.equal(settleLeg(sample,fixture).status,'won');
fixture.playerStats.home[0].hitWoodwork=0;assert.equal(settleLeg(sample,fixture).status,'lost');
fixture.playerStats.home[0].hitWoodwork=null;assert.equal(settleLeg(sample,fixture).status,'unavailable');
const app={innerHTML:''};
globalThis.document={querySelector:s=>s==='#app'?app:null,querySelectorAll:()=>[],addEventListener(){},removeEventListener(){}};
globalThis.location={search:'?giornata=6'};
const page=createPage({esc:v=>String(v??''),dateOnly:v=>v,hero:()=>'',load:async f=>read(f)});
await page.render();
const rows=[...app.innerHTML.matchAll(/<li class="betting-market-row[^>]+data-settlement="(won|lost|void)"[^>]*>/g)];
assert.equal(rows.length,169);
assert.equal(rows.filter(r=>r[1]==='won').length,104);
assert.equal(rows.filter(r=>r[1]==='lost').length,65);
for(const row of rows){assert(!row[0].includes('data-personal-pick='));assert(row[0].includes('aria-disabled="true"'))}
assert(!app.innerHTML.includes('role="button" tabindex="0"'));
globalThis.location.search='';await page.render();
const card=app.innerHTML.match(/<a[^>]+href="schedina.html\?giornata=6"[\s\S]*?<\/a>/)[0];
assert(card.includes('-11,49%'));assert(card.includes('169,00 €'));assert(card.includes('149,59 €'));assert(card.includes('-19,41 €'));
console.log('OK MD6: 104 vinte, 65 perse; 169 € puntati, 149,59 € ritorno, −19,41 € netto, −11,49%; colori e card archivio verificati.');
