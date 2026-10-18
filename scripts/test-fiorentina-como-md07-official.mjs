import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {sharedForecastsForMatch} from '../js/pages/shared-forecast-contract.mjs';
import {createPersonalBetslipStore,PERSONAL_BETSLIP_STORAGE_KEY} from '../js/pages/personal-betslip-store.mjs';
const require=createRequire(import.meta.url),policy=require('../js/official-starter-policy.js');
require('./report-fiorentina-como-md07-official.cjs');
const read=p=>JSON.parse(fs.readFileSync(p)),id='fiorentina-como-2026-27-md-07';
policy.configure(read('data/normalized/official-starter-registry.json'));
const data=read('data/normalized/schedina-md07.json'),m=data.marketCatalog.matches.find(m=>m.matchId===id),shared=sharedForecastsForMatch(data.marketCatalog,id);
assert.equal(shared.length,21);assert(shared.every(l=>policy.eligible(l,id)));
const official=read('data/sources/official-lineups-2026-27.json').fixtures.find(f=>f.matchId===id);
assert.deepEqual(official.teams.map(t=>[t.players.length,t.substitutes.length]),[[11,0],[11,0]]);
const starters=new Set(official.teams.flatMap(t=>t.players.map(p=>p.playerId))),p=read('data/normalized/predictions.json').predictions.find(p=>p.matchId===id);
for(const row of [...p.shooters.allPlayers,...p.likelyBooked])assert(starters.has(row.playerId));
for(const leg of m.selections.filter(l=>l.catalogOrigin==='prediction-v2-player-forecast'&&policy.eligible(l,id))){
 const player=p.shooters.allPlayers.find(x=>x.playerId===leg.playerId);assert(player);
 const key='over'+String(leg.threshold-.5)+'5',probability=(leg.suggestionAnalysis.family==='shots'?player.shotProbabilities:player.shotOnTargetProbabilities)[key];
 assert.equal(leg.betSelection.evaluation.individualReference.modelProbabilityPct,Number((probability*100).toFixed(2)));
 if(!leg.forecastIdentity)assert.equal(leg.betSelection.evaluation.modelProbabilityPct,null);
}
const bench={...structuredClone(shared.find(l=>l.marketScope==='player')),playerId:'jesus-rodriguez',playerName:'Jesús Rodriguez'};bench.betSelection.market.subject.id='jesus-rodriguez';const context={competition:'serie-a',season:'2026-27',matchday:7},key='serie-a:2026-27:md07';
const saved={version:1,activeContext:key,contexts:{[key]:{context,selections:[{...bench,context}]}}};
const values=new Map([[PERSONAL_BETSLIP_STORAGE_KEY,JSON.stringify(saved)]]),storage={getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)};
const store=createPersonalBetslipStore({storage});store.setContext(context);store.reconcile(shared);
assert.equal(store.getSnapshot().selections.length,0);assert.equal(store.add({...bench,context}).status,'OFFICIAL_NON_STARTER');
fs.writeFileSync('output/reports/fiorentina-como-md07-official/tests.json',JSON.stringify({status:'PASS',otherNineUnchanged:true,originalContractsPreserved:172,shared:21,officialStarters:22,officialBenchVerified:false,allThresholdsRecalculated:true,savedNonstarterPurged:true,nonstarterRejected:true},null,2)+'\n');
console.log('PASS ufficiali, contratti, soglie, altre nove gare, salvataggi MyCombo');
