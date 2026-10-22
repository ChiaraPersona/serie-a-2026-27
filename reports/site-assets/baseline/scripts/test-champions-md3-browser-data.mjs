import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createDataService} from '../js/services/data-service.js';
import {loadChampionsWorkspaceMd3Derived} from '../js/pages/champions-workspace-catalog.mjs';
import {restoreMd3Workspace} from '../js/pages/champions-md3-browser-workspace.mjs';
import {createPersonalBetslipStore} from '../js/pages/personal-betslip-store.mjs';
const previous=globalThis.fetch;
globalThis.fetch=async url=>({ok:true,json:async()=>JSON.parse(fs.readFileSync(String(url).split('?')[0],'utf8'))});
try{
  const service=createDataService('parity',{deduplicate:true});
  const original=await loadChampionsWorkspaceMd3Derived(service.load,3);
  const payload=await service.load('schedina-champions-md03-ui.json');
  const compact=restoreMd3Workspace(payload);
  for(const key of ['championsWorkspace','lineupManaged','matchday','season','fixtures','slips','oddsRetrievedAt','derivedVersion','all'])assert.deepEqual(compact[key],original[key],key+' changed');
  assert.deepEqual(compact.marketCatalog.matches,original.marketCatalog.matches);
  for(const key of ['approved','preliminary'])assert.equal(compact.marketCatalog.totals[key],original.marketCatalog.totals[key]);
  assert.throws(()=>restoreMd3Workspace({...payload,fixtures:payload.fixtures.slice(1)}));
  // Persist each suggested contract with the original workspace, reconcile with
  // the projection, and compare to reconciliation with the original catalog.
  const memory=new Map(),storage={getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v)};
  const context={competition:'champions',season:original.season,matchday:3,forecastPolicy:'SERIE_A_CURRENT'};
  const store=createPersonalBetslipStore({storage,now:()=> '2026-10-22T12:00:00Z'});
  store.setContext(context);
  const eligible=original.all.filter(l=>l.suggestionAnalysis?.suggested&&!l.auditDisplayOnly);
  for(const leg of eligible)store.add(leg);
  const before=store.getSnapshot();
  const restored=createPersonalBetslipStore({storage,now:()=> '2026-10-22T12:00:00Z'});restored.setContext(context);
  restored.reconcile(compact.all.filter(l=>l.suggestionAnalysis?.suggested));
  store.reconcile(eligible);
  assert.deepEqual(restored.getSnapshot(),store.getSnapshot());
  assert(before.selections.length>0,'No saved selections exercised');
  console.log(JSON.stringify({status:'PASS',fixtures:compact.fixtures.length,contracts:compact.all.length,savedSelections:before.selections.length,totals:compact.marketCatalog.totals}));
}finally{globalThis.fetch=previous;}
