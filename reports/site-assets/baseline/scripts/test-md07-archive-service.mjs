import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createDataService} from '../js/services/data-service.js';
import {sharedForecastsForMatch,isPublishedForecast} from '../js/pages/shared-forecast-contract.mjs';
import {createPersonalBetslipStore} from '../js/pages/personal-betslip-store.mjs';
const read=p=>JSON.parse(fs.readFileSync('data/normalized/'+p,'utf8'));
const original=read('schedina-md07.json'),registry=read('official-starter-registry.json');
const savedFetch=globalThis.fetch;
globalThis.fetch=async url=>({ok:true,json:async()=>read(String(url).split('?')[0].replace('data/normalized/',''))});
try{
 const service=createDataService('audit');
 assert.deepEqual(await service.load('schedina-md07.json'),original);
 const roma=original.marketCatalog.matches.find(m=>m.matchId==='roma-genoa-2026-27-md-07');
 globalThis.officialStarterPolicy.configure(registry);
 const excluded=roma.selections.find(s=>!globalThis.officialStarterPolicy.eligible(s,roma.matchId));
 assert(excluded,'An original absent-player contract must remain in the historical archive');
 assert(!globalThis.officialStarterPolicy.eligible(excluded,roma.matchId),'Saved operational selections must still be filtered');
 assert(!isPublishedForecast(excluded),'Operational publication stays filtered');
 const fixture=read('matches.json').find(m=>m.id===roma.matchId);
 assert(sharedForecastsForMatch(original.marketCatalog,roma.matchId,fixture).some(s=>s.selectionId===excluded.selectionId),'Historical presentation retains the original absent-player contract');
 const storageRows=new Map(),storage={getItem:k=>storageRows.get(k)||null,setItem:(k,v)=>storageRows.set(k,v)};
 const context={competition:'serie-a',season:'2026-27',matchday:7};
 globalThis.officialStarterPolicy.configure({});
 const before=createPersonalBetslipStore({storage});before.setContext(context);before.add({...excluded,context});assert.equal(before.getSnapshot().selections.length,1);
 globalThis.officialStarterPolicy.configure(registry);
 const restored=createPersonalBetslipStore({storage});restored.setContext(context);restored.reconcile(roma.selections);assert.equal(restored.getSnapshot().selections.length,0,'Previously saved non-starter removed after reload/reconcile');
 assert.deepEqual(await service.load('predictions.json'),read('predictions.json'));
 console.log('PASS: historical contracts retained; operational non-starters still excluded');
}finally{globalThis.fetch=savedFetch;}
