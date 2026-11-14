import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createDataService} from '../js/services/data-service.js';
import {restoreMd3Workspace} from '../js/pages/champions-md3-browser-workspace.mjs';
import {settleMd3Leg,md3ResultMatch} from '../js/pages/champions-md3-results.mjs';
import {createPersonalBetslipStore} from '../js/pages/personal-betslip-store.mjs';
const require=createRequire(import.meta.url),policy=require('../js/official-starter-policy.js');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const previous=globalThis.fetch;globalThis.fetch=async url=>({ok:true,json:async()=>read(String(url).split('?')[0])});
try{
 const service=createDataService('settlement-test',{deduplicate:true});
 const workspace=restoreMd3Workspace(await service.load('schedina-champions-md03-ui.json'));
 const summary=read('data/normalized/champions-md03-settlement.json');
 assert.equal(workspace.fixtures.length,18);
 const byId=new Map(summary.records.map(r=>[r.selectionId,r]));
 for(const leg of workspace.all){
  assert(policy.eligible(leg));
  const match=workspace.fixtures.find(f=>f.id===leg.matchId);
  assert.deepEqual(leg.settlement,settleMd3Leg(leg,match));
  assert.deepEqual(leg.settlement,byId.get(leg.selectionId).settlement);
 }
 const calendar=read('data/normalized/champions-league-2026-27.json');
 for(const fixture of workspace.fixtures){
  const source=calendar.fixtures.find(f=>f.id===fixture.id);
  assert.deepEqual(fixture.matchReport,source.matchReport,'Full post-match evidence retained');
  assert.equal(fixture.matchReport.playerEvidence.filter(p=>p.starter).length,22);
 }
 const excluded=read('data/technical-archive/champions-md03/settlement-excluded.json');
 assert.equal(summary.unverifiable.length,0,'Every remaining MD3 contract verified');
 const rawProjection=read('data/normalized/schedina-champions-md03-ui.json');
 assert(!JSON.stringify(rawProjection.marketCatalog).includes('andy-diouf:shots:1'),'Nonstarter quote absent from public catalog');
 const mbappe=workspace.all.find(l=>l.selectionId==='forecast:v2:ucl-2026-27-md03-16:kylian-mbappe:sot:2');
 assert.equal(mbappe.settlement.status,'won');
 assert.equal(mbappe.settlement.reason,'OBSERVED_SHOTS_ON_TARGET_ALREADY_REACH_THRESHOLD');
 const mbappeFixture=workspace.fixtures.find(f=>f.id===mbappe.matchId);
 const missingWoodwork=structuredClone(mbappeFixture);
 for(const p of missingWoodwork.matchReport.playerEvidence)delete p.statistics.hitWoodwork;
 assert.equal(settleMd3Leg({...mbappe,label:'Almeno 99 tiri in porta'},missingWoodwork).status,'unavailable','Missing woodwork cannot prove a loss');
 assert(excluded.length);
 for(const leg of excluded)assert(!workspace.all.some(l=>l.selectionId===leg.selectionId));
 // A previously saved starter becomes ineligible after the official update.
 const memory=new Map(),storage={getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v)};
 const context={competition:'champions',season:'2026-27',matchday:3,forecastPolicy:'SERIE_A_CURRENT'};
 policy.configure({});const store=createPersonalBetslipStore({storage});store.setContext(context);store.add(excluded[0]);
 assert.equal(store.getSnapshot().selections.length,1);
 policy.configure(read('data/normalized/official-starter-registry.json'));
 const restored=createPersonalBetslipStore({storage});restored.setContext(context);restored.reconcile(workspace.all);
 assert.equal(restored.getSnapshot().selections.length,0);
 // Use the existing DUO rule, but never sum the substitute for a standard leg.
 const f=workspace.fixtures.find(f=>f.matchReport.observedSubstitutions.some(s=>s.playerOutId&&s.playerInId));
 const substitution=f.matchReport.observedSubstitutions.find(s=>s.playerOutId&&s.playerInId);
 const primary=f.matchReport.playerEvidence.find(p=>p.playerId===substitution.playerOutId);
 const edited=structuredClone(f);const ps=edited.matchReport.playerEvidence;
 ps.find(p=>p.playerId===primary.playerId).statistics.totalShots=0;
 ps.find(p=>p.playerId===substitution.playerInId).statistics.totalShots=3;
 const leg={matchId:f.id,market:'TIRI TOTALI GIOCATORE',marketScope:'player',playerId:primary.playerId,selection:'OVER',label:'Almeno 2 tiri'};
 assert.equal(settleMd3Leg(leg,edited).status,'lost');
 assert.equal(settleMd3Leg({...leg,betSelection:{market:{bookmakerSemantics:{duo:true}}}},edited).status,'won');
 assert.deepEqual(md3ResultMatch(calendar.fixtures.find(f=>f.matchday===2)),calendar.fixtures.find(f=>f.matchday===2));
 console.log('PASS: 18 final reports, all catalog settlements, exact starters, full DUO evidence, stale saved exclusion, standard/DUO separation, MD2 unchanged.');
}finally{globalThis.fetch=previous;}
