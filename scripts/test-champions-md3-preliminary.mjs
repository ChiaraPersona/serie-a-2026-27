import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createChampionsSelection} from '../js/pages/champions-market-ui.mjs';
import {createPersonalBetslipStore,assessSelections} from '../js/pages/personal-betslip-store.mjs';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const preview=read('data/analysis/champions/md3-offline-engine-2026-10-19/preview-md03.json');
const catalog=read('data/normalized/champions-md03-preliminary-2026-27.json');
const odds=read('data/normalized/odds/sisal/champions-league.json');
const draft=read('data/normalized/schedina-champions-md03-draft.json');
assert.equal(catalog.fixtures.length,18);assert.equal(draft.status,'DRAFT_NOT_PUBLISHED');assert.deepEqual(draft.slips,[]);
const contracts=[];
for(const f of catalog.fixtures){
 const original=preview.fixtures.find(p=>p.fixtureId===f.fixtureId);assert.deepEqual(f.forecast,original.collective);assert.equal(f.individualForecasts,null);assert.equal(f.lineups,null);
 const event=odds.events.find(e=>e.canonicalMatchId===f.fixtureId);assert.equal(f.oddsEvent.providerEventId,event.providerEventId);
 for(const m of f.oddsEvent.playerMarkets){
  const raw=event.markets.find(x=>x.providerMarketId===m.providerMarketId);assert(raw);assert.equal(raw.status,'open');assert.equal(raw.marketScope,'match');assert.deepEqual(raw.providerPlayerIds,[]);
  for(const key of ['marketCode','marketName','variantName','threshold','status'])assert.equal(m[key],raw[key]);
  for(const s of m.selections){
   const r=raw.selections.find(x=>x.providerSelectionId===s.providerSelectionId);assert.equal(r.status,'open');assert(r.odds>1);for(const key of ['odds','oddsRaw','name','code','status'])assert.equal(s[key],r[key]);
   if(s.preliminaryProposal){assert.equal(s.name,f.forecast.verdict.outcome);assert.equal(s.modelProbabilityPct,f.forecast.verdict.probabilityPct);}
   if(['corners','shots'].includes(m.family)){assert.equal(s.modelProbability,null);assert.equal(s.expectedValue,null);assert.equal(s.preliminaryProposal,false);}
   const contract=createChampionsSelection(f,m,s);assert.equal(contract.context.matchday,3);assert.equal(contract.betSelection.market.selection,s.name);assert.equal(contract.betSelection.quote.decimal,r.odds);contracts.push(contract);
  }
 }
 if(f.fixtureId==='ucl-2026-27-md03-02')assert(f.oddsEvent.playerMarkets.every(m=>!['shots','corners'].includes(m.family)));
}
assert.equal(contracts.length,657);
const sameMarket=contracts.filter(c=>c.matchId===contracts[0].matchId&&c.betSelection.identity.providerMarketId===contracts[0].betSelection.identity.providerMarketId);
assert(assessSelections(sameMarket.slice(0,2)).issues.some(i=>i.type==='MARKET_CONTRADICTION'));
const memory=new Map(),storage={getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v),removeItem:k=>memory.delete(k)};
const store=createPersonalBetslipStore({storage});store.setContext({competition:'champions',season:'2026-27',matchday:3});
const a=contracts[0],b=contracts.find(c=>c.matchId!==a.matchId);
assert.equal(store.add(a).status,'ADDED');assert.equal(store.add(b).status,'ADDED');assert.equal(store.add(a).status,'DUPLICATE');
assert(Math.abs(store.getSnapshot().assessment.theoreticalCombinedOdds-a.betSelection.quote.decimal*b.betSelection.quote.decimal)<1e-8);
const restored=createPersonalBetslipStore({storage});restored.setContext({competition:'champions',season:'2026-27',matchday:3});assert.equal(restored.getSnapshot().selections.length,2);
restored.setContext({competition:'champions',season:'2026-27',matchday:2});assert.equal(restored.getSnapshot().selections.length,0);
console.log('OK 18 frozen forecasts; 426 exact collective markets / 657 open provider selections; no individual or suspended selections; MD3 store, combined odds, persistence and MD2 isolation.');
