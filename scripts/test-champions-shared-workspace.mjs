import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {loadChampionsWorkspace} from '../js/pages/champions-workspace-catalog.mjs';
import {createPage} from '../js/pages/betting.js';
import {createPersonalBetslipStore} from '../js/pages/personal-betslip-store.mjs';
import {settleLeg} from '../js/pages/betting-settlement.mjs';

const read=name=>JSON.parse(fs.readFileSync(`data/normalized/${name}`,'utf8'));
const cache=new Map();
const freeze=value=>{if(value&&typeof value==='object'){Object.freeze(value);Object.values(value).forEach(freeze)}return value};
const load=async name=>{if(!cache.has(name))cache.set(name,freeze(read(name)));return cache.get(name)};
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const app={innerHTML:''};
globalThis.document={querySelector:s=>s==='#app'?app:null,querySelectorAll:()=>[]};
globalThis.location={search:''};
const deps={esc,load,dateOnly:v=>String(v||'').slice(0,10),hero:()=>''};
const workspaces=await Promise.all([1,2,3].map(day=>loadChampionsWorkspace(load,day)));
assert.deepEqual(workspaces.map(w=>w.fixtures.length),[18,18,18]);
assert.deepEqual(workspaces.map(w=>w.all.length),[52,117,657]);
for(const workspace of workspaces){
  assert.equal(new Set(workspace.all.map(l=>l.selectionId)).size,workspace.all.length);
  const page=createPage(deps),markup=page.championsWorkspaceMarkup(workspace);
  assert.equal((markup.match(/data-match-panel/g)||[]).length,18);
  assert.equal((markup.match(/data-personal-host/g)||[]).length,1);
  assert(markup.includes('MyCombo per partita'));
  const archived=workspace.matchday<3;
  assert.equal((markup.match(/data-selected-forecast="true"/g)||[]).length,archived?workspace.all.length:167);
  assert.equal((markup.match(/data-selected-forecast="false"/g)||[]).length,archived?0:490);
  if(archived){
    assert(!/data-selection-row[^>]*data-personal-pick/.test(markup));
    const original=workspace.matchday===1?workspace.source.slips.flatMap(s=>s.legs):workspace.source.fixtures.flatMap(f=>f.selections);
    for(const leg of workspace.all){
      const before=original.find(l=>l.matchId===leg.matchId&&l.providerMarketId===leg.providerMarketId&&l.providerSelectionId===leg.providerSelectionId);
      assert.deepEqual(leg.settlement,before.settlement);
      assert.equal(leg.odds,before.odds);
    }
  }
  // Reading and Schedina are projections of this very same catalog.
  for(const fixture of workspace.fixtures){
    const reading=page.championsWorkspaceMarkup(workspace,fixture.id);
    assert.equal((reading.match(/data-match-panel/g)||[]).length,1);
    const expected=workspace.all.filter(l=>l.matchId===fixture.id);
    for(const leg of expected)assert(reading.includes(esc(leg.selectionId)));
  }
}
const md3=workspaces[2],raw=read('champions-md03-preliminary-2026-27.json');
const input=new Map(raw.fixtures.flatMap(f=>f.oddsEvent.playerMarkets.flatMap(m=>m.selections.filter(s=>s.interfaceSelectable).map(s=>[s.selectionId,{f,m,s}]))));
assert.equal(input.size,657);
for(const leg of md3.all){
  const {f,m,s}=input.get(leg.selectionId);
  assert.equal(leg.matchId,f.fixtureId);
  assert.equal(leg.odds,s.odds);
  assert.equal(leg.betSelection.market.threshold,m.threshold);
  assert.deepEqual(leg.betSelection.market.modifiers,m.modifiers);
  assert.equal(leg.betSelection.identity.providerEventId,f.oddsEvent.providerEventId);
  assert.equal(leg.betSelection.identity.providerMarketId,m.providerMarketId);
  assert.equal(leg.betSelection.identity.providerSelectionId,s.providerSelectionId);
  assert.equal(leg.betSelection.evaluation.modelProbabilityPct,s.modelProbabilityPct??null);
  assert.equal(leg.marketScope,'match');
}
const approved=read('schedina-champions-md03.json').slips.flatMap(s=>s.legs);
assert.equal(md3.all.filter(l=>l.approvedPreliminary).length,7);
for(const leg of approved)assert.equal(md3.all.find(l=>l.selectionId===leg.selectionId).odds,leg.odds);
const memory=new Map(),storage={getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v)};
const context={competition:'champions',season:'2026-27',matchday:3};
const store=createPersonalBetslipStore({storage});store.setContext(context);
const picks=md3.all.filter(l=>l.matchId===md3.fixtures[0].id&&l.suggestionAnalysis.suggested).slice(0,2);
picks.forEach(p=>assert.equal(store.add(p).status,'ADDED'));
assert.equal(store.getSnapshot().selections.length,2);
assert(store.getSnapshot().assessment.issues.some(i=>i.type==='MARKET_CONTRADICTION'));
assert.equal(store.getSnapshot().assessment.usableCombinedOdds,null);
const restored=createPersonalBetslipStore({storage});restored.setContext(context);
assert.equal(restored.getSnapshot().selections.length,2);
restored.reconcile(md3.all);assert(!restored.getSnapshot().selections.some(s=>s.dataStatus==='MISSING_FROM_CURRENT_DATA'));
restored.remove(picks[1].selectionId);assert.equal(restored.getSnapshot().selections.length,1);
restored.setContext({competition:'serie-a',season:'2026-27',matchday:7});assert.equal(restored.getSnapshot().selections.length,0);
restored.setContext(context);assert.equal(restored.getSnapshot().selections.length,1);

// Live settlement must use actual finished scores, never a stored pending approval or forecast score.
const future=structuredClone(md3),first=future.fixtures[0];
first.status='finished';first.score={home:3,away:1};
const futureHtml=createPage(deps).championsWorkspaceMarkup(future,first.id);
for(const leg of future.all.filter(l=>l.matchId===first.id&&l.suggestionAnalysis.suggested)){
  const expected=settleLeg(leg,first),row=futureHtml.split(`data-selection-label="${esc(leg.label)}"`)[0].split('<li ').at(-1);
  assert(row.includes(`data-settlement="${expected.status}"`));
}
assert(futureHtml.includes('data-stake="9"'));
assert(futureHtml.includes('data-personal-host'));
assert(!/data-selection-row[^>]*data-personal-pick/.test(futureHtml));

// Task-scoped immutability: every pre-existing data artifact and engine script stays byte-identical.
const before=JSON.parse(fs.readFileSync('data/analysis/champions/schedine-unification-2026-10-19/before.json','utf8'));
let protectedFiles=0;
for(const [file,hash] of Object.entries(before)){
  if(!file.startsWith('data/')&&!/^scripts\/(?:champions\/|build-champions|build-schedina|prediction|betting-selection-contract|betting-settlement)/.test(file))continue;
  assert.equal(crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'),hash,`${file} altered`);protectedFiles++;
}
console.log(`OK shared Champions workspace: 54 fixtures; 52/117 archived contracts; 167 frozen forecasts + 490 manual selections; 7 approvals; shared persistence/compatibility; future score gate; ${protectedFiles} protected artifacts unchanged.`);
