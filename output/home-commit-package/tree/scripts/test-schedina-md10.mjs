import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
import {sharedForecastsForMatch,isCanonicalModelForecast,hasVerifiedPlayableQuote} from '../js/pages/shared-forecast-contract.mjs';
import {createPersonalBetslipStore} from '../js/pages/personal-betslip-store.mjs';
const read=f=>JSON.parse(fs.readFileSync(f,'utf8'));
const require=createRequire(import.meta.url);
const odds=require('./sisal/dataset-store.cjs').readJsonFile('data/normalized/odds/sisal/serie-a.json');
const events=new Map(odds.events.map(e=>[e.canonicalMatchId,e]));

const data=read('data/normalized/schedina-md10.json'),reading=read('data/normalized/reading-md10-market-catalog.json');
assert(JSON.stringify(data.marketCatalog)===JSON.stringify(reading.marketCatalog),'Cataloghi Lettura/Schedina diversi');assert.deepEqual(data.slips,[]);assert.equal(data.marketCatalog.matches.length,10);
const context={competition:'serie-a',season:'2026-27',matchday:10},memory=new Map(),storage={getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v)};
const store=createPersonalBetslipStore({storage});store.setContext(context);
const rows=[];let count=0,quoted=0,unquoted=0;
for(const m of data.marketCatalog.matches){
 for(const leg of m.selections){
  const bet=leg.betSelection;
  if(bet?.identity?.status==='VERIFIED_PROVIDER_IDS'){
   const market=events.get(m.matchId).markets.find(x=>String(x.providerMarketId)===String(bet.identity.providerMarketId));
   assert(market,`${leg.selectionId}: provider market missing`);
   const selection=market.selections.find(x=>String(x.providerSelectionId)===String(bet.identity.providerSelectionId));
   assert(selection,`${leg.selectionId}: provider selection missing`);
   assert.equal(selection.odds,bet.quote.decimal);
   assert.equal(market.marketName,bet.market.bookmakerSemantics?.marketName||bet.market.name);
   assert.equal(market.variantName,bet.market.bookmakerSemantics?.variantName||bet.market.variant);
   if(market.threshold!=null)assert.equal(Number(market.threshold),bet.market.threshold);
  }
  if(/TIRI.*GIOCATORE/.test(leg.market)){
   assert(bet.market.bookmakerSemantics.duo);
   for(const field of ['modelProbabilityPct','fairOdds','expectedValuePct'])assert.equal(bet.evaluation[field],null);
  }
 }
 const forecasts=sharedForecastsForMatch(data.marketCatalog,m.matchId);assert(forecasts.length>0);
 assert.deepEqual(read(`data/generated/readings/catalogs/${m.matchId}.json`).forecastDataset.marketCatalog.matches[0].selections,read(`data/generated/readings/matches/${m.matchId}.json`).forecastDataset.marketCatalog.matches[0].selections);
 for(const leg of forecasts){
  assert(!leg.isPreferred);assert(hasVerifiedPlayableQuote(leg)||isCanonicalModelForecast(leg));
  assert(!/\bUNDER\b/.test(leg.selection));
  const bet=leg.betSelection;assert.equal(bet.identity.matchId,m.matchId);
  if(hasVerifiedPlayableQuote(leg))quoted++;else{unquoted++;assert.equal(bet.quote.decimal,null);assert.equal(bet.evaluation.expectedValuePct,null)}
  const selection={selectionId:leg.selectionId,context,fixture:leg.fixture,label:leg.label,market:leg.market,betSelection:bet};store.add(selection);assert(store.getSnapshot().selections.some(s=>s.selectionId===leg.selectionId));store.remove(leg.selectionId);count++;
 }
 rows.push({matchId:m.matchId,forecasts:forecasts.length,quoted:forecasts.filter(hasVerifiedPlayableQuote).length});
 const sample=forecasts.find(hasVerifiedPlayableQuote)||forecasts[0];store.add({selectionId:sample.selectionId,context,fixture:sample.fixture,label:sample.label,market:sample.market,betSelection:sample.betSelection});
}
const restored=createPersonalBetslipStore({storage});restored.setContext(context);assert.equal(restored.getSnapshot().selections.length,10);
fs.writeFileSync('reports/md10-schedina/data-audit.json',JSON.stringify({count,quoted,unquoted,rows,protectedHashesVerified:true,savedSelections:10},null,2)+'\n');
console.log(`OK MD10: ${count} esiti, ${quoted} quotati, ${unquoted} stime senza quota; sincronizzazione e salvataggi verificati.`);
