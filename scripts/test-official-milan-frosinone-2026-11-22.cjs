'use strict';
const fs=require('./output-snapshot-fs.cjs'),assert=require('node:assert/strict');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const out='output/official-milan-frosinone-2026-11-22',ids=['milan-frosinone-2026-27-md-12'];
const before=read(out+'/before.json'),catalog=read('data/normalized/reading-md12-market-catalog.json'),schedina=read('data/normalized/schedina-md12.json');
const official=read('data/sources/official-lineups-2026-27.json'),archive=read('data/technical-archive/official-nonstarter-markets.json');
const policy=require('../js/official-starter-policy');policy.configure(read('data/normalized/official-starter-registry.json'));
assert.deepEqual(catalog.marketCatalog,schedina.marketCatalog);
assert.deepEqual(read('data/normalized/predictions.json').predictions.filter(p=>!ids.includes(p.matchId)),before.predictions.predictions.filter(p=>!ids.includes(p.matchId)));
assert.deepEqual(catalog.marketCatalog.matches.filter(m=>!ids.includes(m.matchId)),before.reading.marketCatalog.matches.filter(m=>!ids.includes(m.matchId)));
const removed=[];
for(const id of ids){
 const lineup=official.fixtures.find(f=>f.matchId===id),m=catalog.marketCatalog.matches.find(m=>m.matchId===id),old=before.reading.marketCatalog.matches.find(m=>m.matchId===id);
 assert.equal(lineup.status,'official');assert.deepEqual(lineup.teams.map(t=>t.players.length),[11,11]);assert(lineup.teams.every(t=>t.players.every(p=>p.playerId)));
 for(const s of old.selections.filter(s=>!policy.eligible(s,id))){removed.push(s);assert(archive.some(a=>a.selectionId===s.selectionId));assert(!m.selections.some(a=>a.selectionId===s.selectionId));}
 for(const s of m.selections){assert(policy.eligible(s,id),s.selectionId);const prior=old.selections.find(p=>p.selectionId===s.selectionId);if(prior)for(const key of ['odds','threshold','modifiers'])assert.deepEqual(s[key],prior[key],s.selectionId+':'+key);else if(s.marketScope==='player')assert.equal(s.betSelection.quote.availability,'AVAILABLE_AT_SNAPSHOT');}
 const projection=read('data/generated/readings/matches/'+id+'.json');assert.deepEqual(projection.forecastDataset.marketCatalog.matches[0].selections,m.selections.filter(s=>s.suggestionAnalysis?.suggested));
}
assert.equal(removed.length,1);assert(removed.every(s=>!policy.eligible(s)));
(async()=>{
 const {createPersonalBetslipStore}=await import('../js/pages/personal-betslip-store.mjs');
 const context={competition:'serie-a',season:'2026-27',matchday:12},key='serie-a:2026-27:md12',saved={version:1,activeContext:key,contexts:{[key]:{context,selections:removed}}};
 const store=createPersonalBetslipStore({storage:{getItem:()=>JSON.stringify(saved),setItem:()=>{}}});store.setContext(context);store.reconcile(catalog.marketCatalog.matches.flatMap(m=>m.selections));assert.equal(store.getSnapshot().selections.length,0);
 for(const s of removed)assert.equal(store.add({...s,context}).status,'OFFICIAL_NON_STARTER');
 console.log('PASS: 22 official starters, nonstarter markets archived, contracts and other fixtures preserved, saved selections purged, direct additions blocked');
})().catch(e=>{console.error(e);process.exitCode=1});
