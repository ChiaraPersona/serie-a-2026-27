const assert=require('node:assert/strict'),fs=require('fs'),cp=require('child_process');
const policy=require('../js/official-starter-policy');
const {buildRegistry}=require('./apply-official-starter-policy');
policy.configure(buildRegistry());
const data=require('../data/normalized/schedina-champions-md02.json');
const before=JSON.parse(cp.execFileSync('git',['show','HEAD:data/normalized/schedina-champions-md02.json'],{encoding:'utf8',maxBuffer:64e6}));
const excluded=require('../data/technical-archive/official-nonstarter-markets.json');
assert.equal(excluded.length,4);
assert.equal(data.verificationReport.filtered.total,54);
assert.equal(data.verificationReport.filtered.considered,48);
for(const f of data.fixtures){
  for(const s of f.selections)assert(policy.eligible(s,f.fixtureId),s.label);
  const old=before.fixtures.find(x=>x.fixtureId===f.fixtureId);
  if(f.date!=='2026-10-13')assert.deepEqual(f,old);
  for(const s of f.selections){const o=old.selections.find(x=>x.selectionId===s.selectionId);assert.equal(s.odds,o.odds);assert.equal(s.threshold,o.threshold);assert.deepEqual(s.modifiers,o.modifiers);}
}
for(const s of excluded)assert(!policy.eligible(s));
const synthetic={matchId:'fixture-a',marketScope:'player',playerId:'bench',isPreferred:true,modifiers:{replacementIncluded:true,woodworkIncluded:true}};
policy.configure({'fixture-a':{ids:['starter'],names:[]}});
assert(!policy.eligible(synthetic));assert(policy.eligible({...synthetic,playerId:'starter'}));
assert(policy.eligible({...synthetic,matchId:'probable-fixture'}));
assert(policy.eligible({matchId:'fixture-a',marketScope:'match'}));
policy.configure({'fixture-a':{ids:['bench'],names:[]}});assert(policy.eligible(synthetic));
console.log('OK official starter policy, scope, identity, modifiers, 58/54/48 reconciliation');
(async()=>{
  policy.configure(buildRegistry());
  const {createPersonalBetslipStore,PERSONAL_BETSLIP_STORAGE_KEY}=await import('../js/pages/personal-betslip-store.mjs');
  const context=excluded[0].context,key='champions:2026-27:md02',saved={version:1,activeContext:key,contexts:{[key]:{context,selections:excluded}}};
  const storage={getItem:()=>JSON.stringify(saved),setItem:()=>{}};
  const store=createPersonalBetslipStore({storage});store.setContext(context);store.reconcile(data.fixtures.flatMap(f=>f.selections));
  assert.equal(store.getSnapshot().selections.length,0);
  for(const row of excluded)assert.equal(store.add(row).status,'OFFICIAL_NON_STARTER');
  console.log('OK stale MyCombo purge and direct add rejection');
})().catch(e=>{console.error(e);process.exitCode=1;});
