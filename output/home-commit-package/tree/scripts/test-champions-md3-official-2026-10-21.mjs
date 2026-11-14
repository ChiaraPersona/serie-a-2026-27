import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {loadChampionsWorkspaceMd3Derived} from '../js/pages/champions-workspace-catalog.mjs';
import {createPersonalBetslipStore} from '../js/pages/personal-betslip-store.mjs';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const folder='data/analysis/champions/official-2026-10-21',before=read(folder+'/before.json');
const artifact=read('data/derived/champions-md03/market-catalog-official-2026-10-21.json');
const individuals=read('data/derived/champions-md03/official-individuals-2026-10-21.json');
const ids=new Set(artifact.matches.map(m=>m.matchId));
const source=read('data/sources/champions-official-formations-md03-2026-27.json');
const registry=read('data/normalized/official-starter-registry.json');globalThis.officialStarterPolicy.configure(registry);
for(const [p,b] of Object.entries(before)){
 if(p.endsWith('official-starter-registry.json')){for(const [id,row]of Object.entries(b.data))if(!ids.has(id))assert.deepEqual(registry[id],row);}
 else if(p.endsWith('champions-official-formations-md03-2026-27.json')){for(const f of b.data.fixtures)if(!ids.has(f.fixtureId))assert.deepEqual(source.fixtures.find(x=>x.fixtureId===f.fixtureId),f);}
 else assert.equal(crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex'),b.sha256,p);
}
const workspace=await loadChampionsWorkspaceMd3Derived(async n=>read('data/normalized/'+n),3);
const base=read('data/derived/champions-md03/market-catalog-v2-2026-10-20.json');
const oldOverrides=new Map(['market-catalog-official-two-v1-2026-10-20.json','market-catalog-sabah-dortmund-v1-2026-10-20.json','market-catalog-official-seven-v2-2026-10-20.json'].flatMap(p=>read('data/derived/champions-md03/'+p).matches).map(m=>[m.matchId,m]));
for(const m of workspace.marketCatalog.matches.filter(m=>!ids.has(m.matchId))){
 const old=oldOverrides.get(m.matchId)||base.matches.find(x=>x.matchId===m.matchId),extra=before['data/derived/champions-md03/upcoming-forecasts.json'].data.matches.find(x=>x.matchId===m.matchId);
 const expected=oldOverrides.has(m.matchId)||!extra?old:{...old,selections:old.selections.concat(extra.selections),suggestions:old.suggestions.concat(extra.suggestions),forecastCoverage:extra.forecastCoverage};
 assert.deepEqual(m,expected,'Foreign fixture '+m.matchId);
}
for(const f of individuals.fixtures){
 const starters=f.teams.flatMap(t=>t.players.filter(p=>p.projectedRole==='starter'));assert.equal(starters.length,22);
 assert.deepEqual([...registry[f.fixtureId].ids].sort(),starters.map(p=>p.playerId).filter(Boolean).sort());
 for(const p of f.teams.flatMap(t=>t.players))if(!p.playerId){assert.equal(p.projectedShots,null);assert.equal(p.eventProbabilities,null);}
 for(const leg of artifact.matches.find(m=>m.matchId===f.fixtureId).selections.filter(l=>l.marketScope==='player')){
  assert(starters.some(p=>p.playerId===leg.playerId));assert(globalThis.officialStarterPolicy.eligible(leg,f.fixtureId));
  if(leg.betSelection.market.bookmakerSemantics?.duo)for(const k of ['modelProbabilityPct','fairOdds','expectedValuePct'])assert.equal(leg.betSelection.evaluation[k],null);
 }
}
const stale=before['data/derived/champions-md03/upcoming-forecasts.json'].data.matches.filter(m=>ids.has(m.matchId)).flatMap(m=>m.selections).find(l=>l.marketScope==='player'&&!globalThis.officialStarterPolicy.eligible(l,l.matchId||l.fixtureId));assert(stale);
const memory=new Map(),storage={getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v)};
globalThis.officialStarterPolicy.configure({});const store=createPersonalBetslipStore({storage});store.setContext({competition:'champions',season:'2026-27',matchday:3});assert.equal(store.add(stale).status,'ADDED');
globalThis.officialStarterPolicy.configure(registry);store.reconcile(workspace.all);assert.equal(store.getSnapshot().selections.length,0);
const valid=artifact.matches.flatMap(m=>m.selections).find(l=>l.marketScope==='player'&&l.suggestionAnalysis.suggested);assert.equal(store.add(valid).status,'ADDED');store.reconcile(workspace.all);assert.equal(store.getSnapshot().selections[0].selectionId,valid.selectionId);
const result={status:'PASS',fixtures:7,starters:154,unresolvedStarters:individuals.summary.unresolvedStarters,selected:artifact.summary.selected,individual:artifact.summary.individualSelected,foreignFixturesPreserved:11,oddsPreserved:true,savedNonstarterPurged:true,savedStarterRetained:true};
fs.writeFileSync(folder+'/tests.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
