const fs=require('fs'),assert=require('assert/strict');
const catalog=JSON.parse(fs.readFileSync('data/normalized/champions-md03-preliminary-2026-27.json'));
const approvals=JSON.parse(fs.readFileSync('data/sources/champions-md03-approved-selections-2026-10-19.json'));
const selections=approvals.selections.map(a=>{
 const f=catalog.fixtures.find(f=>f.fixtureId===a.fixtureId);assert(f);
 const hits=f.oddsEvent.playerMarkets.flatMap(m=>m.selections.filter(s=>s.selectionId===a.selectionId).map(s=>({m,s})));assert.equal(hits.length,1);
 const {m,s}=hits[0];assert.equal(s.odds,a.odds);assert.equal(s.status,'open');assert.equal(m.status,'open');assert.equal(m.periodScope,'full-match');assert(['result','double-chance'].includes(m.family));
 return {selectionId:s.selectionId,matchId:f.fixtureId,fixtureId:f.fixtureId,fixture:`${f.homeTeam} – ${f.awayTeam}`,market:m.marketName,variant:m.variantName,selection:s.name,label:`${m.marketName} · ${s.name}`,odds:s.odds,providerEventId:f.oddsEvent.providerEventId,providerMarketId:m.providerMarketId,providerSelectionId:s.providerSelectionId,modelProbability:s.modelProbability,expectedValue:s.expectedValue,settlement:{status:'pending',label:'Da giocare'}};
});
assert.equal(selections.length,7);assert.equal(new Set(selections.map(s=>s.selectionId)).size,7);
fs.writeFileSync('data/normalized/schedina-champions-md03.json',JSON.stringify({schemaVersion:1,competition:'champions',season:'2026-27',matchday:3,status:'APPROVED_PRELIMINARY_SINGLES',summary:{...catalog.summary,approvedSelections:7},slips:selections.map((s,i)=>({id:`cl3-single-${i+1}`,legs:[s]}))},null,2)+'\n');
console.log('CL3: 7 contratti esatti, sette singole, nessuna multipla');
