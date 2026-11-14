import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createDataService} from '../js/services/data-service.js';
import {createPage} from '../js/pages/betting.js';
import {loadChampionsWorkspace} from '../js/pages/champions-workspace-catalog.mjs';
import {settleLeg,settleArchivedLeg,settlementRecordKey} from '../js/pages/betting-settlement.mjs';
import {sharedForecastsForMatch} from '../js/pages/shared-forecast-contract.mjs';
import {championsAuditDisplay} from '../js/pages/champions-audit-display.mjs';
import {esc,dateOnly,hero} from '../js/core/utils.js';

const read=name=>JSON.parse(fs.readFileSync(`data/normalized/${name}`));
const registry=read('official-starter-registry.json');
globalThis.fetch=async url=>({ok:true,json:async()=>JSON.parse(fs.readFileSync(String(url).split('?')[0]))});
const app={innerHTML:''};
globalThis.document={body:{dataset:{page:'betting'}},querySelector:s=>s==='#app'?app:null,querySelectorAll:()=>[]};
globalThis.location={search:''};
const service=createDataService('starter-regression');
let removed=0;
function assertEligible(value,fixture){
  if(Array.isArray(value))for(const row of value){
    assert(globalThis.officialStarterPolicy.eligible(row,fixture),`Public nonstarter: ${row?.selectionId||row?.label}`);
    assertEligible(row,fixture);
  }else if(value&&typeof value==='object'){
    const id=value.fixtureId||value.matchId||value.id||fixture;
    for(const item of Object.values(value))assertEligible(item,id);
  }
}
for(const file of fs.readdirSync('data/normalized').filter(f=>/^schedina(?:-md\d+|-champions-md\d+)?\.json$/.test(f))){
  const original=read(file),publicData=await service.load(file);
  assertEligible(publicData);
  const before=JSON.stringify(original).length,after=JSON.stringify(publicData).length;
  if(before!==after)removed++;
}
// Guirassy is an official starter: an explicit existing lineupName mapping must
// connect the short official name to the full canonical market identity.
const cl1=await service.load('schedina-champions-md01.json');
assert(cl1.slips.flatMap(s=>s.legs).some(l=>l.player==='Serhou Guirassy'));
for(const day of [1,2,3]){
  globalThis.location.search=`?competizione=champions&giornata=${day}`;
  await createPage({esc,dateOnly,hero,...service}).render();
  assert.equal((app.innerHTML.match(/data-match-panel/g)||[]).length,18);
  assert(!app.innerHTML.includes('class="betting-mycombo-round"'));
  if(day<3){
    const workspace=await loadChampionsWorkspace(service.load,day);
    for(const leg of workspace.all)assert(globalThis.officialStarterPolicy.eligible(leg));
    const stake=workspace.all.filter(l=>['won','lost'].includes(l.settlement?.status)).length;
    assert(app.innerHTML.includes(`data-stake="${stake}"`));
  }
}
// Existing settlement records cannot turn a nonstarter green or red again.
const excluded=JSON.parse(fs.readFileSync('data/technical-archive/official-nonstarter-markets.json'))[0];
const match={id:excluded.matchId,status:'finished',score:{home:1,away:0}};
assert.equal(settleLeg(excluded,match).status,'void');
assert.equal(settleArchivedLeg(excluded,match,[{key:settlementRecordKey(excluded),status:'won',label:'Vinta'}]).status,'void');
const contracts=Object.fromEntries(['won','lost','void','pending'].map(status=>[status,{
  forecast:{selectionId:status,matchId:'economics-fixture',marketScope:'team',odds:3},settlement:{status}
}]));
const economics=championsAuditDisplay({}, {kind:'READ_ONLY_AUDITED_ARCHIVE',contracts,
  fixtures:[{fixtureId:'economics-fixture',contractIds:Object.keys(contracts)}]}).auditSummary;
assert.equal(economics.stakeEuro,2);
assert.equal(economics.grossReturnEuro,3);
assert.equal(economics.roiPct,50);
assert.equal(economics.pending,1);
assert.equal(economics.void,1);

// No official XI means no definitive exclusion; official XI applies even to a
// completed fixture, including shared forecasts and a previously saved combo.
const fixture='regression-fixture',selectionId='regression-bench';
const leg={selectionId,matchId:fixture,marketScope:'player',playerId:'bench',suggestionAnalysis:{suggested:true},betSelection:{
  selectionId,identity:{matchId:fixture,status:'VERIFIED_PROVIDER_IDS',providerSelectionId:'1'},
  market:{scope:'player',subject:{type:'player',id:'bench'}},quote:{decimal:2,verifiedAt:'2026-10-24',source:{provider:'test'},availability:'AVAILABLE_AT_SNAPSHOT'},operational:{playability:{status:'PLAYABLE'}}}};
globalThis.officialStarterPolicy.configure({});
assert(globalThis.officialStarterPolicy.eligible(leg));
globalThis.officialStarterPolicy.configure({[fixture]:{ids:['starter'],names:[]}});
const filtered=globalThis.officialStarterPolicy.filter({slips:[{legs:[leg,{matchId:fixture,marketScope:'team'}],combinedOdds:8,jointModelProbabilityPct:50,weakestLeg:{label:'Bench'}}]});
assert.equal(filtered.slips[0].legs.length,1);
assert.equal(filtered.slips[0].weakestLeg,null);
assert.equal(filtered.slips[0].combinedOdds,null);
assert.equal(sharedForecastsForMatch({matches:[{matchId:fixture,selections:[leg]}]},fixture,{id:fixture,status:'finished'}).length,0);
const {createPersonalBetslipStore,PERSONAL_BETSLIP_STORAGE_KEY}=await import('../js/pages/personal-betslip-store.mjs');
const context={competition:'champions',season:'2026-27',matchday:3},key='champions:2026-27:md03';
leg.context=context;
let saved=JSON.stringify({version:1,activeContext:key,contexts:{[key]:{context,selections:[leg]}}});
const storage={getItem:k=>k===PERSONAL_BETSLIP_STORAGE_KEY?saved:null,setItem:(k,v)=>{saved=v}};
const store=createPersonalBetslipStore({storage});store.setContext(context);store.reconcile([leg]);
assert.equal(store.getSnapshot().selections.length,0);
assert.equal(store.add(leg).status,'OFFICIAL_NON_STARTER');
globalThis.officialStarterPolicy.configure(registry);
console.log(`PASS public starter policy: ${removed} archives filtered, CL1–CL3 rendered, canonical starter preserved, no green/red nonstarters, saved picks purged and re-add rejected`);
