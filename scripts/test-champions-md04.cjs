'use strict';
const fs=require('node:fs'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {readJsonFile:read}=require('./sisal/dataset-store.cjs');
const {canonicalTeam}=require('./champions/current-season-offline');
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const dayIndex=process.argv.indexOf('--matchday'),matchday=dayIndex<0?4:Number(process.argv[dayIndex+1]),md='md'+String(matchday).padStart(2,'0');
async function test(){
 const out=read(`data/normalized/schedina-champions-${md}.json`),individuals=read(`data/normalized/champions-${md}-probable-individuals-2026-27.json`);
 const source=read(out.lineupInput.path),calendar=read('data/normalized/champions-league-2026-27.json'),odds=read('data/normalized/odds/sisal/champions-league.json');
 const report=read(`output/champions-${md}/build-report.json`),scenarios=read('data/generated/champions-shared-scenarios.json');
 const squads=read('data/normalized/champions-registered-squads-2026-27.json');
 assert.equal(out.lineupInput.sha256,hash(out.lineupInput.path));assert.equal(out.individualInput.sha256,hash(out.individualInput.path));
 assert.equal(individuals.source.sha256,out.lineupInput.sha256);assert.equal(out.scope.length,18);
 assert.deepEqual(out.scope,calendar.fixtures.filter(f=>f.matchday===matchday).map(f=>f.id));
 const {sharedForecastsForMatch}=await import('../js/pages/shared-forecast-contract.mjs');
 const seen=new Set();let published=0,duo=0;
 for(const m of out.marketCatalog.matches){
  assert(out.scope.includes(m.matchId));
  const fixture=individuals.fixtures.find(f=>f.fixtureId===m.matchId),scenario=scenarios.fixtures.find(f=>f.fixtureId===m.matchId);
  assert(['probable','official'].includes(fixture.status));assert(scenario.provenance.lineupsApplied);
  assert.deepEqual(m.forecastCoverage.teamProjections.map(t=>[t.shotsTotal,t.shotsOnTarget,t.corners]),scenario.teamProjections.map(t=>[t.shotsTotal,t.shotsOnTarget,t.corners]));
  const volumeMarkets=m.selections.filter(l=>l.catalogOrigin==='champions-md04-team-volumes'&&l.suggestionAnalysis?.suggested);
  assert.equal(m.forecastCoverage.marginalVolumeProbabilitiesAvailable,volumeMarkets.length>0,'Volume probabilities require explicit shared count model markets');
  if(volumeMarkets.length)assert.equal(m.forecastCoverage.marginalVolumeProbabilityStatus,'PRELIMINARY_NOT_CALIBRATED');
  if(scenario.resultModel){
   assert.equal(scenario.resultModel.statisticallyValidated,false);
   if(scenario.europeanReading?.applied){assert(scenario.scoreForecast.primary);assert(scenario.scoreForecast.display.length>0);}else{assert.equal(scenario.scoreForecast.primary,null);assert.deepEqual(scenario.scoreForecast.display,[]);}
   if(scenario.resultModel.status==='PRELIMINARY')assert(Math.abs(Object.values(scenario.probabilities).reduce((a,b)=>a+b,0)-100)<1e-8);
   else assert(Object.values(scenario.probabilities).every(p=>p===null));
  }
  else if(scenario.status==='preliminary')assert(Math.abs(Object.values(scenario.probabilities).reduce((a,b)=>a+b,0)-100)<1e-8);
  else {assert.equal(m.selections.length,0);assert(Object.values(scenario.probabilities).every(p=>p===null));}
  for(const t of fixture.teams){
   assert.equal(t.players.filter(p=>p.projectedRole==='starter').length,11);
   const fixtureSource=read(fixture.status==='official'?`data/sources/champions-official-formations-${md}-2026-27.json`:`data/sources/champions-probable-formations-${md}-2026-27.json`);
   const original=fixtureSource.teams.find(x=>x.fixtureId===m.matchId&&x.teamId===t.teamId);
   assert.deepEqual(t.players.filter(p=>p.projectedRole==='starter').map(p=>p.playerId),original.starters.map(p=>p.playerId));
   assert.deepEqual(t.players.filter(p=>p.projectedRole==='bench').map(p=>p.playerId),original.bench.map(p=>p.playerId));
   const unavailableIds=new Set([...original.unavailable,...original.suspended,...original.doubtful].map(p=>p.playerId));
   assert(t.players.every(p=>p.projectedRole==='starter'||!unavailableIds.has(p.playerId)));
   const roster=squads.teams.find(s=>canonicalTeam(s.id)===t.teamId);
   if(fixture.status!=='official'&&original.benchStatus!=='documented-probable-bench'&&original.lineupBasis!=='last-available-XI-user-authorized-provisional')for(const p of roster.players)assert(t.players.some(x=>x.playerId===p.id)||unavailableIds.has(p.id));
   assert(t.minuteBudget.allocatedExpectedMinutes<=990.1);
   const projected=t.players.filter(p=>p.projectedShots!==null);
   if(projected.length){
    assert(Math.abs(projected.reduce((n,p)=>n+p.projectedShots,0)-t.reconciliation.targetShots)<=.021);
    assert(Math.abs(projected.reduce((n,p)=>n+p.projectedSOT,0)-t.reconciliation.targetSOT)<=.021);
    assert(projected.every(p=>p.projectedSOT<=p.projectedShots));
   }
  }
  const visible=sharedForecastsForMatch(out.marketCatalog,m.matchId);
  assert.equal(visible.length,m.suggestions.length);
  for(const l of m.selections){
   assert(!seen.has(l.selectionId));seen.add(l.selectionId);
   assert.equal(l.context.matchday,matchday);
   const bet=l.betSelection,event=odds.events.find(e=>e.canonicalMatchId===m.matchId),market=event.markets.find(r=>r.providerMarketId===bet.identity.providerMarketId);
   assert(market,'Exact provider market missing');
   const selection=market.selections.find(s=>s.providerSelectionId===bet.identity.providerSelectionId);assert(selection);
   assert.equal(selection.odds,bet.quote.decimal);assert.equal(Number(market.threshold),Number(bet.market.threshold));
   assert.equal(l.qualifiedSelection,false,'No unvalidated model may become approved');
   if(l.suggestionAnalysis.suggested)published++;
   if(l.marketScope==='player'){
    duo++;assert(bet.market.bookmakerSemantics.duo&&bet.market.bookmakerSemantics.substituteIncluded);
    assert.equal(bet.market.bookmakerSemantics.extraTimeIncluded,/INC\.?\s*T\.?S\.?|INCL\.?\s*T\.?S\.?/i.test(market.marketName+' '+market.variantName));
    const player=fixture.teams.flatMap(t=>t.players).find(p=>p.playerId===l.playerId&&p.projectedRole==='starter');assert(player);
    if(l.publication?.userAuthorizedException){const exception=read(l.publication.userAuthorizedException.sourcePath);assert(exception.selections.some(s=>s.selectionId===l.selectionId&&s.betSelection.identity.providerMarketId===bet.identity.providerMarketId&&s.odds===l.odds));assert.equal(l.selectionStatus,'PRELIMINARY');assert.deepEqual(player.blockers,['TEAM_RECONCILIATION_NOT_PASSED']);}
    else assert.equal(player.blockers.length,0);
    for(const k of ['modelProbabilityPct','prudentProbabilityPct','fairOdds','expectedValuePct','conservativeExpectedValuePct'])assert.equal(bet.evaluation[k],null);
    assert.equal(bet.evaluation.individualReference.appliedToDuo,false);
   }
  }
 }
 assert.equal(published,out.summary.selections);assert(duo>0);
 for(const {fixtureId,sha256} of report.untouchedSharedFixtures)assert.equal(crypto.createHash('sha256').update(JSON.stringify(scenarios.fixtures.find(f=>f.fixtureId===fixtureId))).digest('hex'),sha256,'Unrelated shared fixture changed');
 for(const [p,h] of Object.entries(report.protectedBefore))assert.equal(hash(p),h,'Protected canonical input changed: '+p);
 const {loadChampionsWorkspace}=await import('../js/pages/champions-workspace-catalog.mjs');
 const workspace=await loadChampionsWorkspace(async name=>read('data/normalized/'+name),matchday);
 assert.equal(workspace.fixtures.length,18);assert(workspace.all.every(l=>out.scope.includes(l.matchId)));
 if(matchday===5){
  const policy=require('../js/official-starter-policy.js'),registry=read('data/normalized/official-starter-registry.json');policy.configure(registry);
  const {createPersonalBetslipStore,contextKey,PERSONAL_BETSLIP_STORAGE_KEY}=await import('../js/pages/personal-betslip-store.mjs');
  for(const f of individuals.fixtures.filter(f=>f.status==='official')){
   assert.equal(registry[f.fixtureId].ids.length,22);
   const match=out.marketCatalog.matches.find(m=>m.matchId===f.fixtureId);
   assert(match.selections.filter(l=>l.marketScope==='player').every(l=>policy.eligible(l)));
   const sample=structuredClone(match.selections.find(l=>l.marketScope==='player')||out.marketCatalog.matches.flatMap(m=>m.selections).find(l=>l.marketScope==='player'));
   sample.matchId=f.fixtureId;sample.betSelection.identity.matchId=f.fixtureId;
   const bench=f.teams.flatMap(t=>t.players).find(p=>p.projectedRole==='bench');
   sample.playerId=bench.playerId;sample.playerName=bench.canonicalName;
   sample.player={canonicalPlayerId:bench.playerId,canonicalName:bench.canonicalName};
   sample.betSelection.identity.canonicalPlayerIds=[bench.playerId];sample.betSelection.market.subject={type:'player',id:bench.playerId,name:bench.canonicalName};
   assert(!policy.eligible(sample));assert.equal(policy.filter([sample]).length,0);
   const context=sample.context,key=contextKey(context),memory=new Map([[PERSONAL_BETSLIP_STORAGE_KEY,JSON.stringify({version:1,activeContext:key,contexts:{[key]:{context,selections:[sample]}}})]]);
   const store=createPersonalBetslipStore({storage:{getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v)}});
   store.setContext(context);store.reconcile(match.selections);assert.equal(store.getSnapshot().selections.length,0,'Previously saved nonstarter removed');
   const combo=policy.filter({legs:[sample],combinedOdds:2,jointModelProbabilityPct:50,settlement:{status:'pending'}});
   assert.equal(combo.legs.length,0);assert.equal(combo.combinedOdds,null);assert.equal(combo.settlement,null);
  }
 }
 console.log(JSON.stringify({fixtures:18,published,duo,contracts:'exact',officialAndProbable:true,unrelatedFixturesPreserved:true}));
}
test().catch(e=>{console.error(e);process.exitCode=1;});
