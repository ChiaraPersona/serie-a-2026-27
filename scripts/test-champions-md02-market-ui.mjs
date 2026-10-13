import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {createChampionsSelection} from "../js/pages/champions-market-ui.mjs";
import {createPersonalBetslipStore} from "../js/pages/personal-betslip-store.mjs";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const integration=JSON.parse(fs.readFileSync(path.join(root,"data/normalized/champions-md02-integration-2026-27.json"),"utf8"));
const fixture=integration.fixtures.find(item=>item.oddsEvent.playerMarkets.some(market=>market.marketCode==="28506"));
assert(fixture,"Fixture con mercato pali/traverse non trovata");

const wanted=["28506","28507","28090","28673","28609"];
const contracts=wanted.map(code=>{
  const market=fixture.oddsEvent.playerMarkets.find(item=>item.marketCode===code&&item.selections.some(selection=>selection.interfaceSelectable));
  assert(market,`Mercato ${code} selezionabile non trovato`);
  const selection=market.selections.find(item=>item.interfaceSelectable);
  return {market,selection,contract:createChampionsSelection(fixture,market,selection)};
});

const memory=new Map();
const storage={getItem:key=>memory.get(key)||null,setItem:(key,value)=>memory.set(key,value)};
const first=createPersonalBetslipStore({storage,now:()=>"2026-10-13T12:30:00.000Z"});
assert.equal(first.setContext({competition:"champions",season:"2026-27",matchday:2}).status,"OK");
for(const {contract} of contracts){
  assert.equal(contract.modelProbability,null);
  assert.equal(contract.expectedValue,null);
  assert.equal(contract.betSelection.identity.matchId,fixture.fixtureId);
  assert.equal(contract.betSelection.identity.status,"VERIFIED_PROVIDER_IDS");
  assert.equal(contract.betSelection.quote.availability,"AVAILABLE_AT_SNAPSHOT");
  assert.equal(first.add(contract).status,"ADDED");
}
assert.equal(first.getSnapshot().selections.length,wanted.length);

const restored=createPersonalBetslipStore({storage});
restored.setContext({competition:"champions",season:"2026-27",matchday:2});
const saved=restored.getSnapshot().selections;
assert.equal(saved.length,wanted.length);
for(const [index,row] of saved.entries()){
  assert.deepEqual(row.betSelection.market.modifiers,contracts[index].market.modifiers,`${wanted[index]}: modificatori non persistiti`);
  assert.equal(row.betSelection.identity.providerSelectionId,contracts[index].selection.providerSelectionId);
  assert.equal(row.betSelection.quote.decimal,contracts[index].selection.odds);
}
assert.equal(saved.find(row=>row.betSelection.market.code==="28506").betSelection.market.modifiers.woodworkIncluded,true);
assert.equal(saved.find(row=>row.betSelection.market.code==="28507").betSelection.market.modifiers.replacementIncluded,true);
assert.equal(saved.find(row=>row.betSelection.market.code==="28090").betSelection.market.modifiers.woodworkIncluded,true);
assert.equal(saved.find(row=>row.betSelection.market.code==="28673").betSelection.market.modifiers.periodScope,"first-half");
assert.equal(saved.find(row=>row.betSelection.market.code==="28609").betSelection.market.modifiers.periodScope,"both-halves");

const championsSource=fs.readFileSync(path.join(root,"js/pages/champions.js"),"utf8");
assert.match(championsSource,/champions-md02-integration-2026-27\.json/);
assert.match(championsSource,/schedina-champions-md02\.json/);
assert.match(championsSource,/data-add-published-selection/);
assert.match(championsSource,/data-champions-market-root/);
assert.doesNotMatch(championsSource,/MODEL_BOOKMAKER_INCOMPATIBLE/);
const bettingSource=fs.readFileSync(path.join(root,"js/pages/betting.js"),"utf8");
assert.match(bettingSource,/competition==="champions"&&matchday==="2"/);
assert.match(bettingSource,/createChampionsSelection/);
assert.match(bettingSource,/champions-md02-individuale/);
assert.match(fs.readFileSync(path.join(root,"js/pages/champions-market-ui.mjs"),"utf8"),/schedina\.html\?competizione=champions&amp;giornata=2/);

console.log(`OK UI mercati MD2: ${contracts.length} contratti aggiunti e ripristinati con quote, ID e modificatori invariati`);
