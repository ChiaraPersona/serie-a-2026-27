import fs from 'node:fs';
import assert from 'node:assert/strict';
import {isDeepStrictEqual} from 'node:util';
import {createDataService} from '../js/services/data-service.js';
import {loadChampionsWorkspaceMd3Derived} from '../js/pages/champions-workspace-catalog.mjs';
import {createPersonalBetslipStore} from '../js/pages/personal-betslip-store.mjs';
const read=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const previous=globalThis.fetch;
globalThis.fetch=async url=>({ok:true,json:async()=>read(String(url).split('?')[0])});
try {
 const service=createDataService('fixture-test',{deduplicate:true}),calendar=await service.load('champions-league-2026-27.json');
 let count=0,contracts=0,saved=0;
 for(const day of [2,3,4]){
  const original=await loadChampionsWorkspaceMd3Derived(service.load,day);
  const registry=read(`data/generated/champions-readings/registry-md${day}.json`);
  const prepared=original.all.filter(l=>day!==3||l.suggestionAnalysis?.suggested);
  assert(isDeepStrictEqual(registry.all,prepared),'Shared contract registry changed MD'+day);
  const byId=new Map(registry.all.map(l=>[l.selectionId,l]));
  for(const fixture of calendar.fixtures.filter(f=>f.matchday===day)){
   const payload=await service.loadChampionsReading(fixture.id);
   assert(isDeepStrictEqual(payload.datasets['data/normalized/champions-league-2026-27.json'].fixtures.find(f=>f.id===fixture.id),fixture),'Observed report changed '+fixture.id);
   assert(isDeepStrictEqual(payload.workspace.fixtures,original.fixtures.filter(f=>f.id===fixture.id)),'Workspace fixture changed '+fixture.id);
   for(const match of payload.workspace.marketCatalog.matches){
    const restored=match.selectionIds.map(id=>byId.get(id));assert(restored.every(Boolean),'Missing contract');
    const expected=original.marketCatalog.matches.find(m=>m.matchId===match.matchId).selections.filter(l=>day!==3||l.suggestionAnalysis?.suggested);
    assert(isDeepStrictEqual(restored,expected),'Quoted contract changed '+fixture.id);contracts+=restored.length;
   }
   count++;
  }
  const memory=new Map(),storage={getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v)};
  const context={competition:'champions',season:original.season,matchday:day,...(original.lineupManaged?{forecastPolicy:'SERIE_A_CURRENT'}:{})};
  const store=createPersonalBetslipStore({storage,now:()=> '2026-10-22T12:00:00Z'});store.setContext(context);
  for(const leg of prepared.filter(l=>!l.auditDisplayOnly))store.add(leg);
  const before=store.getSnapshot();saved+=before.selections.length;
  const restored=createPersonalBetslipStore({storage,now:()=> '2026-10-22T12:00:00Z'});restored.setContext(context);restored.reconcile(registry.all.filter(l=>!l.auditDisplayOnly));
  store.reconcile(prepared.filter(l=>!l.auditDisplayOnly));
  assert.deepEqual(restored.getSnapshot(),store.getSnapshot(),'Saved selections changed MD'+day);
 }
 assert(saved>0,'No saved selections exercised');
 await assert.rejects(service.loadChampionsReading('ucl-2026-27-md03-99'),/non valida/);
 console.log(JSON.stringify({status:'PASS',fixtures:count,contracts,savedSelections:saved,observedReports:'IDENTICAL'}));
}finally{globalThis.fetch=previous;}
