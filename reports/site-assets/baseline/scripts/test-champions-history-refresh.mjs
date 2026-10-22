import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {loadChampionsWorkspaceMd3Derived} from '../js/pages/champions-workspace-catalog.mjs';
import {sharedForecastsForMatch} from '../js/pages/shared-forecast-contract.mjs';
import {createPersonalBetslipStore} from '../js/pages/personal-betslip-store.mjs';
const read=p=>JSON.parse(fs.readFileSync(p));
const dir='output/champions-history-fallback-2026-10-21/';
const before=read(dir+'upcoming-before.json'),after=read('data/derived/champions-md03/upcoming-forecasts.json');
const individuals=read(after.inputs.individuals.path);
const load=async name=>read('data/normalized/'+name);
const base=await loadChampionsWorkspaceMd3Derived(load,3,{upcoming:false});
const workspace=await loadChampionsWorkspaceMd3Derived(load,3);
let updated=0,locked=0,selected=0,historyOnly=0;
for(const match of after.matches){
 const fixture=workspace.fixtures.find(f=>f.id===match.matchId);
 const kickoff=Date.parse(fixture.date+'T'+fixture.kickoff+':00+02:00');
 if(kickoff<=Date.parse(after.generatedAt)){
  assert.deepEqual(match,before.matches.find(m=>m.matchId===match.matchId));locked++;continue;
 }
 updated++;
 const original=base.marketCatalog.matches.find(m=>m.matchId===match.matchId);
 const current=workspace.marketCatalog.matches.find(m=>m.matchId===match.matchId);
 assert.deepEqual(current.selections.slice(0,original.selections.length),original.selections);
 const players=individuals.fixtures.find(f=>f.fixtureId===match.matchId).teams.flatMap(t=>t.players);
 for(const p of players){
  if(!p.blockers.length&&p.baseline?.weights?.historical===1)historyOnly++;
 }
 for(const leg of match.selections){
  const p=players.find(p=>p.playerId===leg.playerId);
  assert(p&&!p.blockers.length&&p.projectedRole==='starter');
  assert(Number.isFinite(leg.betSelection.evaluation.modelProbabilityPct));
  assert.equal(leg.odds,null);assert.equal(leg.betSelection.evaluation.expectedValuePct,null);
  if(leg.suggestionAnalysis.suggested)selected++;
 }
}
assert.equal(updated,9);assert.equal(locked,7);assert(historyOnly>0);
assert.equal(new Set(workspace.all.map(l=>l.selectionId)).size,workspace.all.length);
const leg=after.matches.filter(m=>m.matchId>='ucl-2026-27-md03-10').flatMap(m=>m.selections).find(l=>l.suggestionAnalysis.suggested);
globalThis.officialStarterPolicy={eligible:l=>l.playerId!==leg.playerId};
assert(!sharedForecastsForMatch(workspace.marketCatalog,leg.matchId,workspace.fixtures.find(f=>f.id===leg.matchId)).some(l=>l.playerId===leg.playerId));
delete globalThis.officialStarterPolicy;
const memory=new Map(),store=createPersonalBetslipStore({storage:{getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v),removeItem:k=>memory.delete(k)}});
store.setContext({competition:'champions',season:'2026-27',matchday:3,forecastPolicy:'SERIE_A_CURRENT'});
assert.equal(store.add(leg).status,'ADDED');store.reconcile(workspace.all.filter(l=>l.selectionId!==leg.selectionId));
assert(store.getSnapshot().assessment.issues.some(i=>i.type==='MISSING_FROM_CURRENT_DATA'));
const changed=execFileSync('git',['diff','--name-only','--','data'],{encoding:'utf8'}).trim().split(/\r?\n/).filter(Boolean);
assert.deepEqual(changed,['data/derived/champions-md03/upcoming-forecasts.json']);
const report={status:'PASS',updated,locked,selected,historyOnly,archivedSlipsOddsStatisticsUnchanged:true,savedSelectionReconciliation:true,officialStarterFilter:true};
fs.writeFileSync(dir+'tests.json',JSON.stringify(report,null,2)+'\n');console.log(report);
