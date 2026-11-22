const fs=require('./output-snapshot-fs.cjs'),assert=require('node:assert/strict');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const id='juventus-venezia-2026-27-md-12',out='output/official-juventus-venezia-2026-11-22';
const before=read(out+'/before.json'),catalog=read('data/normalized/reading-md12-market-catalog.json'),schedina=read('data/normalized/schedina-md12.json'),predictions=read('data/normalized/predictions.json');
const match=catalog.marketCatalog.matches.find(m=>m.matchId===id),prior=before.reading.marketCatalog.matches.find(m=>m.matchId===id);
const policy=require('../js/official-starter-policy');policy.configure(read('data/normalized/official-starter-registry.json'));
const official=read('data/sources/official-lineups-2026-27.json').fixtures.find(f=>f.matchId===id);
assert.equal(official.status,'official');assert.deepEqual(official.teams.map(t=>t.players.length),[11,11]);assert(official.teams.every(t=>t.players.every(p=>p.playerId)));
assert.deepEqual(catalog.marketCatalog,schedina.marketCatalog);
assert.deepEqual(predictions.predictions.filter(p=>p.matchId!==id),before.predictions.predictions.filter(p=>p.matchId!==id));
assert.deepEqual(catalog.marketCatalog.matches.filter(m=>m.matchId!==id),before.reading.marketCatalog.matches.filter(m=>m.matchId!==id));
const removed=prior.selections.filter(s=>!policy.eligible(s,id)),archive=read('data/technical-archive/official-nonstarter-markets.json');assert.equal(removed.length,4);
for(const s of removed){assert(archive.some(a=>a.selectionId===s.selectionId));assert(!match.selections.some(a=>a.selectionId===s.selectionId));}
for(const s of match.selections){assert(policy.eligible(s,id));const old=prior.selections.find(a=>a.selectionId===s.selectionId);if(old)for(const field of ['odds','threshold','modifiers'])assert.deepEqual(s[field],old[field]);else if(s.marketScope==='player')assert.equal(s.betSelection.quote.availability,'AVAILABLE_AT_SNAPSHOT');}
const projection=read('data/generated/readings/matches/'+id+'.json');assert.deepEqual(projection.forecastDataset.marketCatalog.matches[0].selections,match.selections.filter(s=>s.suggestionAnalysis?.suggested));
(async()=>{
 const {createPersonalBetslipStore}=await import('../js/pages/personal-betslip-store.mjs');
 const context={competition:'serie-a',season:'2026-27',matchday:12},key='serie-a:2026-27:md12',saved={version:1,activeContext:key,contexts:{[key]:{context,selections:removed}}};
 const store=createPersonalBetslipStore({storage:{getItem:()=>JSON.stringify(saved),setItem:()=>{}}});store.setContext(context);store.reconcile(match.selections);assert.equal(store.getSnapshot().selections.length,0);
 for(const s of removed)assert.equal(store.add({...s,context}).status,'OFFICIAL_NON_STARTER');
 const report={officialStarters:22,removed:removed.length,newSelections:match.selections.filter(s=>!prior.selections.some(p=>p.selectionId===s.selectionId)).map(s=>({id:s.selectionId,label:s.label,scope:s.marketScope})),operational:match.selections.length,unrelatedUnchanged:true,savedSelectionsPurged:true,readingSchedinaSynchronized:true};
 fs.writeFileSync(out+'/verification.json',JSON.stringify(report,null,2)+'\n');console.log(report);
})().catch(e=>{console.error(e);process.exitCode=1});
