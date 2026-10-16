import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {sharedForecastsForMatch,hasVerifiedPlayableQuote,isCanonicalModelForecast} from '../js/pages/shared-forecast-contract.mjs';
import sync from './forecast-sync.js';
import {createPersonalBetslipStore} from '../js/pages/personal-betslip-store.mjs';

const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const data=read('data/normalized/schedina-md07.json');
const source=read('data/sources/probable-lineups-md7-2026-27.json');
const predictions=read('data/normalized/predictions.json');
const fixtures=read('data/normalized/matches.json').filter(m=>m.competition==='serie-a'&&m.matchday===7);
const odds=read('data/normalized/odds/sisal/serie-a.json');
const sourceByTeam=new Map(source.teams.map(t=>[t.teamId,t]));
const previous=JSON.parse(execFileSync('git',['show','HEAD:data/normalized/predictions.json'],{encoding:'utf8',maxBuffer:100*1024*1024}));
assert.equal(data.oddsRetrievedAt,odds.retrievedAt,'Catalogo non aggiornato allo snapshot quote corrente');
assert.deepEqual(predictions.predictions.filter(p=>!p.matchId.endsWith('-md-07')),previous.predictions.filter(p=>!p.matchId.endsWith('-md-07')),'Previsioni delle altre giornate modificate');
assert.equal(fixtures.length,10);
assert.equal(new Set(fixtures.flatMap(m=>[m.homeTeam,m.awayTeam])).size,20);
assert.equal(data.marketCatalog.matches.length,10);
const allIds=new Set(), rows=[];
for(const fixture of fixtures){
  const selections=sharedForecastsForMatch(data.marketCatalog,fixture.id);
  const prediction=predictions.predictions.find(p=>p.matchId===fixture.id);
  assert(prediction);
  const eligible=new Set([fixture.homeTeam,fixture.awayTeam].flatMap(id=>sourceByTeam.get(id).players.filter(p=>p.lineupStatus==='starter').map(p=>p.playerId)));
  const event=odds.events.find(e=>e.canonicalMatchId===fixture.id);
  assert(event);
  assert(selections.length>0,fixture.id);
  const store=createPersonalBetslipStore({storage:{getItem:()=>null,setItem:()=>{}}});
  const context={competition:'serie-a',season:'2026-27',matchday:7,label:'Serie A · 7ª giornata'};
  store.setContext(context);
  for(const leg of selections){
    assert(!allIds.has(leg.selectionId),'Duplicato');allIds.add(leg.selectionId);
    assert(hasVerifiedPlayableQuote(leg)||isCanonicalModelForecast(leg),leg.selectionId);
    if(leg.playerId) assert(eligible.has(leg.playerId),leg.playerId);
    const contract=leg.betSelection,quote=event.markets.flatMap(m=>m.selections).find(s=>String(s.providerSelectionId)===String(contract.identity.providerSelectionId));
    if(hasVerifiedPlayableQuote(leg)){assert(quote,leg.selectionId);assert.equal(quote.odds,contract.quote.decimal)}
    else {assert.equal(contract.quote.decimal,null);assert.equal(contract.evaluation.expectedValuePct,null)}
    if(contract.market.bookmakerSemantics?.duo){assert.equal(contract.evaluation.modelProbabilityPct,null);assert.equal(contract.evaluation.expectedValuePct,null)}
    else {assert(Number.isFinite(contract.evaluation.modelProbabilityPct));if(hasVerifiedPlayableQuote(leg))assert(Number.isFinite(contract.evaluation.expectedValuePct))}
    const added=store.add({selectionId:leg.selectionId,context,fixture:leg.fixture,label:leg.label,market:leg.market,betSelection:contract});
    assert(store.getSnapshot().selections.some(s=>s.selectionId===leg.selectionId),JSON.stringify(added));
    store.remove(leg.selectionId);
  }
  const count=family=>selections.filter(s=>s.suggestionAnalysis.family===family).length;
  rows.push({matchId:fixture.id,partita:`${fixture.homeTeam}–${fixture.awayTeam}`,tiri:count('shots'),sot:count('sot'),altri:selections.length-count('shots')-count('sot'),totale:selections.length,quote:selections.filter(hasVerifiedPlayableQuote).length});
}
// Binding is simulated in memory; no quote is acquired or written to artifacts.
const sample=data.marketCatalog.matches.flatMap(m=>m.selections).find(isCanonicalModelForecast);
const storageValues=new Map(),storage={getItem:k=>storageValues.get(k)||null,setItem:(k,v)=>storageValues.set(k,v)};
const pendingStore=createPersonalBetslipStore({storage});
const context={competition:'serie-a',season:'2026-27',matchday:7};
pendingStore.setContext(context);
const selection={selectionId:sample.selectionId,context,fixture:sample.fixture,label:sample.label,market:sample.market,betSelection:sample.betSelection};
pendingStore.add(selection);
const quotedExisting=data.marketCatalog.matches.flatMap(m=>m.selections).find(hasVerifiedPlayableQuote);
pendingStore.add({...quotedExisting,context});
assert.equal(pendingStore.getSnapshot().assessment.theoreticalCombinedOdds,null,'Non deve esserci un totale parziale');
const restored=createPersonalBetslipStore({storage});assert.equal(restored.getSnapshot().selections.length,2);
const simulated={betSelection:{identity:{status:'VERIFIED_PROVIDER_IDS',provider:'TEST_ONLY',providerMarketId:'test-market',providerSelectionId:'test-selection',matchId:sample.matchId},forecastIdentity:sample.forecastIdentity,quote:{decimal:2.25,verifiedAt:'2026-10-16T00:00:00Z',availability:'AVAILABLE_AT_SNAPSHOT',source:{provider:'TEST_ONLY'}}}};
const bound=sync.bindVerifiedForecastQuote({forecast:sample,providerSelection:simulated});
assert.equal(bound.selectionId,sample.selectionId);assert.deepEqual(bound.betSelection.evaluation,sample.betSelection.evaluation);
assert.throws(()=>sync.bindVerifiedForecastQuote({forecast:sample,providerSelection:{betSelection:{...simulated.betSelection,forecastIdentity:{...sample.forecastIdentity,duo:true}}}}),/FORECAST_CONTRACT_MISMATCH/);
restored.reconcile([{...bound,context}, {...quotedExisting,context}]);
assert.equal(restored.getSnapshot().selections.length,2);assert.equal(restored.getSnapshot().selections.find(s=>s.selectionId===sample.selectionId).betSelection.quote.decimal,2.25);
assert(restored.getSnapshot().assessment.theoreticalCombinedOdds>1);
restored.remove(sample.selectionId);assert.equal(restored.getSnapshot().selections.length,1);
const report={status:'PASS',rows,total:allIds.size,quoted:rows.reduce((n,r)=>n+r.quote,0),unquoted:allIds.size-rows.reduce((n,r)=>n+r.quote,0),technicalUnquoted:data.marketCatalog.playerForecastIntegration.unquoted,
  tests:['10 fixture / 20 squadre','quote provider e contratto esatti','titolari probabili e identita canoniche','selezionabilita store per ogni pronostico','nessun duplicato','DUO senza probabilita o EV inventati','pronostici altre giornate identici a HEAD']};
fs.writeFileSync('output/reports/serie-a-md07-final-audit.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
