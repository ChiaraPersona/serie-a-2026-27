'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const write=(p,d)=>fs.writeFileSync(path.join(root,p),JSON.stringify(d,null,2)+'\n');
const policy=require('../js/official-starter-policy.js');
const {specs}=require('./import-champions-md04-official-nov04.cjs');
const before=read('output/official-md04-nov04-first-two/before.json'),catalog=read('data/normalized/schedina-champions-md04.json'),individuals=read('data/normalized/champions-md04-probable-individuals-2026-27.json'),shared=read('data/generated/champions-shared-scenarios.json');
const official=read('data/sources/champions-official-formations-md04-2026-27.json'),registry=read('data/normalized/official-starter-registry.json');
policy.configure(registry);
const teams=official.teams.filter(t=>specs.some(s=>s[0]===t.teamId)),ids=new Set(teams.map(t=>t.fixtureId));
assert.equal(ids.size,2);let unchanged=0,players=0;
const removed=[];
for(const m of before.catalog.marketCatalog.matches){
 const current=catalog.marketCatalog.matches.find(c=>c.matchId===m.matchId);
 if(!ids.has(m.matchId)){
  assert(JSON.stringify(current)===JSON.stringify(m),'Unrelated catalog '+m.matchId);
  assert(JSON.stringify(individuals.fixtures.find(f=>f.fixtureId===m.matchId))===JSON.stringify(before.individuals.fixtures.find(f=>f.fixtureId===m.matchId)),'Unrelated individuals '+m.matchId);
  assert(JSON.stringify(shared.fixtures.find(f=>f.fixtureId===m.matchId))===JSON.stringify(before.shared.fixtures.find(f=>f.fixtureId===m.matchId)),'Unrelated scenario '+m.matchId);unchanged++;continue;
 }
 assert.equal(registry[m.matchId].ids.length,22);assert.equal(current.forecastCoverage.lineupStatus,'official');
 const forecast=individuals.fixtures.find(f=>f.fixtureId===m.matchId);assert.equal(forecast.status,'official');
 for(const t of forecast.teams){
  const source=teams.find(s=>s.fixtureId===m.matchId&&s.teamId===t.teamId);
  assert.deepEqual(t.players.filter(p=>p.projectedRole==='starter').map(p=>p.playerId),source.starters.map(p=>p.playerId));
  assert.equal(t.formation,source.formation);assert.equal(t.benchStatus,'official');
 }
 for(const l of current.selections){assert(policy.eligible(l,m.matchId));if(l.marketScope==='player'){players++;assert.equal(l.lineupEligibility.status,'official-starter');}}
 for(const l of m.selections){
  const retained=current.selections.find(s=>s.selectionId===l.selectionId);
  if(retained){assert.deepEqual(retained.betSelection.identity,l.betSelection.identity);assert.deepEqual(retained.betSelection.quote,l.betSelection.quote);assert.deepEqual(retained.betSelection.market,l.betSelection.market);}
  if(!policy.eligible(l,m.matchId))removed.push(l);
 }
}
assert.equal(policy.filter(removed).length,0,'Saved nonstarter picks must be excluded');
const archivePath='data/technical-archive/official-nonstarter-markets.json';
if(process.argv.includes('--archive')){
 const previous=read(archivePath);write(archivePath,[...new Map([...previous,...removed].map(l=>[l.selectionId,l])).values()]);
}
const archive=read(archivePath);assert(removed.every(l=>archive.some(a=>a.selectionId===l.selectionId)),'All excluded old contracts archived');
const unresolved=individuals.fixtures.filter(f=>ids.has(f.fixtureId)).flatMap(f=>f.teams.flatMap(t=>t.players)).filter(p=>!p.playerId);
assert.equal(unresolved.length,0);assert(unresolved.every(p=>p.projectedRole==='bench'&&p.projectedShots===null&&p.blockers.includes('IDENTITY_UNRESOLVED')));
const report={officialFixtures:[...ids],starters:44,unrelatedFixturesUnchanged:unchanged,operationalPlayerContracts:players,archivedNonstarterContracts:removed.map(l=>({selectionId:l.selectionId,playerId:l.playerId})),unresolvedBench:unresolved.map(p=>({name:p.sourceName,shirtNumber:p.shirtNumber})),originalContractsPreserved:true,savedNonstartersExcluded:true};
async function checkSavedSelections(){
 const {createPersonalBetslipStore}=await import('../js/pages/personal-betslip-store.mjs');
 let raw=null;const storage={getItem:()=>raw,setItem:(_,value)=>{raw=value;}};
 const original=createPersonalBetslipStore({storage});original.setContext(removed[0].context);
 const saved=JSON.parse(raw);saved.contexts[saved.activeContext].selections=removed;raw=JSON.stringify(saved);
 const restored=createPersonalBetslipStore({storage});restored.reconcile(catalog.marketCatalog.matches.flatMap(m=>m.selections));
 assert.equal(restored.getSnapshot().selections.length,0,'Restored saved nonstarters removed');
 assert.equal(restored.add(removed[0]).status,'OFFICIAL_NON_STARTER','Excluded player cannot be re-added');
 report.savedSelectionsReconciled=removed.length;
 write('output/official-md04-nov04-first-two/integrity.json',report);console.log(JSON.stringify(report,null,2));
}
checkSavedSelections().catch(e=>{console.error(e);process.exitCode=1;});

