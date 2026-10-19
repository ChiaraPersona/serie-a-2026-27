import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {sharedForecastsForMatch} from '../js/pages/shared-forecast-contract.mjs';
import {createPersonalBetslipStore,PERSONAL_BETSLIP_STORAGE_KEY} from '../js/pages/personal-betslip-store.mjs';
const require=createRequire(import.meta.url),policy=require('../js/official-starter-policy.js');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8')),id='frosinone-sassuolo-2026-27-md-07';
const dir='output/reports/frosinone-sassuolo-md07-official',before=read(dir+'/before.json');
const official=read('data/sources/official-lineups-2026-27.json').fixtures.find(f=>f.matchId===id);
assert.deepEqual(official.teams.map(t=>[t.players.length,t.substitutes.length]),[[11,15],[11,15]]);
policy.configure(read('data/normalized/official-starter-registry.json'));
const data=read('data/normalized/schedina-md07.json'),match=data.marketCatalog.matches.find(m=>m.matchId===id),old=before.schedina.marketCatalog.matches.find(m=>m.matchId===id);
assert.deepEqual(match.selections.map(l=>l.selectionId).sort(),old.selections.map(l=>l.selectionId).sort());
for(const leg of match.selections){const original=old.selections.find(l=>l.selectionId===leg.selectionId);assert.deepEqual(leg.betSelection.quote,original.betSelection.quote);assert.deepEqual(leg.betSelection.market.bookmakerSemantics,original.betSelection.market.bookmakerSemantics);assert.equal(leg.threshold,original.threshold);}
assert.deepEqual(data.marketCatalog.matches.filter(m=>m.matchId!==id),before.schedina.marketCatalog.matches.filter(m=>m.matchId!==id));
const predictions=read('data/normalized/predictions.json');
assert.deepEqual(predictions.predictions.filter(p=>p.matchId!==id),before.predictions.predictions.filter(p=>p.matchId!==id));
const p=predictions.predictions.find(p=>p.matchId===id),starterIds=new Set(official.teams.flatMap(t=>t.players.map(p=>p.playerId)));
for(const row of [...p.shooters.allPlayers,...p.likelyBooked])assert(starterIds.has(row.playerId));
assert.equal(p.shooters.allPlayers.length,20);
const shared=sharedForecastsForMatch(data.marketCatalog,id);assert.equal(shared.length,22);
assert(shared.every(l=>policy.eligible(l,id)));
for(const leg of old.selections.filter(l=>l.suggestionAnalysis?.suggested)){assert(shared.some(l=>l.selectionId===leg.selectionId));}
const combo=read('data/sources/mycombo-serie-a-2026-27-md-07.json');
for(const [key,value]of Object.entries(before.mycombo.matches))if(key!==id)assert.deepEqual(combo.matches[key],value);
const originalComboIds=new Set(before.mycombo.matches[id].flatMap(p=>p.legs.map(l=>l.selectionId)));
for(const leg of combo.matches[id].flatMap(p=>p.legs)){assert(originalComboIds.has(leg.selectionId));assert(policy.eligible(leg,id));}
const bench=match.selections.find(l=>l.playerId==='vasilije-adzic');assert(bench&&!policy.eligible(bench,id));
const context={competition:'serie-a',season:'2026-27',matchday:7},key='serie-a:2026-27:md07';
const saved={version:1,activeContext:key,contexts:{[key]:{context,selections:[{...bench,context}]}}};
const values=new Map([[PERSONAL_BETSLIP_STORAGE_KEY,JSON.stringify(saved)]]),storage={getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)};
const store=createPersonalBetslipStore({storage});store.setContext(context);store.reconcile(shared);
assert.equal(store.getSnapshot().selections.length,0);
assert.equal(store.add({...bench,context}).status,'OFFICIAL_NON_STARTER');
const report={status:'PASS',officialStarters:22,bench:30,contractsPreserved:166,shared:shared.length,modeledOutfield:20,otherNineUnchanged:true,historicalPredictionsUnchanged:true,quotesAndModifiersUnchanged:true,staleSavedSelectionPurged:true,directNonstarterAddRejected:true,noNewMarketsAdded:true};
fs.writeFileSync(dir+'/tests.json',JSON.stringify(report,null,2)+'\n');console.log(report);
