const assert=require('node:assert/strict'),fs=require('fs'),cp=require('child_process');
const policy=require('../js/official-starter-policy');
// A test must not call buildRegistry(): it persists production data.
const registry=require('../data/normalized/official-starter-registry.json');
policy.configure(registry);
const data=require('../data/normalized/schedina-champions-md02.json');
const before=JSON.parse(cp.execFileSync('git',['show','HEAD:data/normalized/schedina-champions-md02.json'],{encoding:'utf8',maxBuffer:64e6}));
const excluded=require('../data/technical-archive/official-nonstarter-markets.json');
const original=require('../data/sources/champions-original-markets-md02-2026-10-13.json');
const originalSelections=original.fixtures.flatMap(f=>f.selections);
const originalIds=new Set(originalSelections.map(s=>s.selectionId));
const excludedOriginal=excluded.filter(s=>originalIds.has(s.selectionId));
assert.equal(excludedOriginal.length,data.verificationReport.filtered.excluded);
assert.equal(originalSelections.length,data.verificationReport.original.total);
assert.equal(new Set(excluded.map(s=>s.selectionId)).size,excluded.length);
const operational=new Map(data.fixtures.flatMap(f=>f.selections).map(s=>[s.selectionId,s]));
for(const row of excluded){assert(!operational.has(row.selectionId),row.selectionId);assert(registry[row.matchId||row.fixtureId],`Missing official fixture ${row.matchId||row.fixtureId}`);}
for(const row of originalSelections){
  const current=operational.get(row.selectionId);
  if(!current){assert(excludedOriginal.some(s=>s.selectionId===row.selectionId),`Unexplained removal ${row.selectionId}`);continue;}
  for(const field of ['odds','threshold','modifiers'])assert.deepEqual(current[field],row[field],`${row.selectionId}: changed ${field}`);
}
const source=require('../data/sources/champions-official-formations-md02-2026-27.json');
const integration=require('../data/normalized/champions-md02-integration-2026-27.json');
for(const official of source.fixtures.filter(f=>f.status==='official')){
  const fixture=integration.fixtures.find(f=>f.fixtureId===official.fixtureId);
  assert(registry[official.fixtureId]);
  for(const side of ['home','away'])for(const player of fixture.lineups[side].players){
    if(player.canonicalPlayerId)assert(registry[official.fixtureId].ids.includes(player.canonicalPlayerId),`${official.fixtureId}: starter missing ${player.canonicalPlayerId}`);
  }
}
assert.equal(data.verificationReport.filtered.total,54);
assert.equal(data.verificationReport.filtered.considered,54);
assert.equal(data.verificationReport.filtered.green,29);
assert.equal(data.verificationReport.filtered.red,25);
assert.equal(data.verificationReport.filtered.pending,0);
for(const confirmation of require('../data/sources/champions-verification-confirmations-2026-10-14.json').records){
  const leg=data.fixtures.flatMap(f=>f.selections).find(s=>s.selectionId===confirmation.selectionId);
  assert.equal(leg.settlement.label,confirmation.status);
  assert.equal(leg.settlement.officiallySettled,false);
  assert.equal(leg.settlement.basis,'USER_CONFIRMED_STATISTICAL_RESULT');
}
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
console.log('OK official starter policy, scope, identity, modifiers, confirmations, current archive and original-cohort reconciliation');
(async()=>{
  policy.configure(registry);
  const {createPersonalBetslipStore,PERSONAL_BETSLIP_STORAGE_KEY}=await import('../js/pages/personal-betslip-store.mjs');
  const context=excluded[0].context,key='champions:2026-27:md02',saved={version:1,activeContext:key,contexts:{[key]:{context,selections:excluded}}};
  const storage={getItem:()=>JSON.stringify(saved),setItem:()=>{}};
  const store=createPersonalBetslipStore({storage});store.setContext(context);store.reconcile(data.fixtures.flatMap(f=>f.selections));
  assert.equal(store.getSnapshot().selections.length,0);
  for(const row of excluded)assert.equal(store.add(row).status,'OFFICIAL_NON_STARTER');
  console.log('OK stale MyCombo purge and direct add rejection');
})().catch(e=>{console.error(e);process.exitCode=1;});
