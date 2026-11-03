'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const {addTeamVolumeMarkets,exactSide,historyFor}=require('./champions/md04-team-volume-markets.cjs');
const {MARKET_MODELS,dispersionSize,probabilities,overProbability}=require('./md06-statistical-models');
async function run(){
 const before=read('output/champions-md04/count-markets/before.json'),current=read('data/normalized/schedina-champions-md04.json');
 const calendar=read('data/normalized/champions-league-2026-27.json'),source=read('data/sources/champions-pilot-match-stats-2025-27.json');
 const odds=require('./sisal/dataset-store.cjs').readJsonFile('data/normalized/odds/sisal/champions-league.json');
 const markets=current.marketCatalog.matches.flatMap(m=>m.selections).filter(l=>l.catalogOrigin==='champions-md04-team-volumes');
 assert(markets.length>0);const asOf=markets[0].betSelection.evaluation.provenance.asOf;
 for(const match of before.marketCatalog.matches){
  const next=current.marketCatalog.matches.find(m=>m.matchId===match.matchId);
  assert.deepEqual(next.selections.filter(l=>l.catalogOrigin!=='champions-md04-team-volumes'),match.selections.filter(l=>l.catalogOrigin!=='champions-md04-team-volumes'),'Original forecasts preserved');
  const groups=new Set(),fixture=calendar.fixtures.find(f=>f.id===match.matchId),history=historyFor(source,fixture,asOf);
  for(const leg of next.selections.filter(l=>l.catalogOrigin==='champions-md04-team-volumes')){
   const event=odds.events.find(e=>e.canonicalMatchId===match.matchId),bet=leg.betSelection;
   const raw=event.markets.find(m=>m.providerMarketId===bet.identity.providerMarketId),quote=raw.selections.find(s=>s.providerSelectionId===bet.identity.providerSelectionId);
   assert.equal(quote.name,'OVER');assert.equal(quote.status,'open');assert.equal(quote.odds,leg.odds);assert.equal(bet.quote.decimal,quote.odds);assert.equal(Number(raw.threshold),leg.threshold);
   const def=MARKET_MODELS[raw.marketCode],side=exactSide(raw,def),key=def.family+':'+side;
   assert(side&&!groups.has(key),'One balanced line per metric and scope');groups.add(key);
   const observed=history.filter(m=>Number.isFinite(m.metrics[def.family].home)&&Number.isFinite(m.metrics[def.family].away));
   const expected=overProbability(probabilities(bet.evaluation.provenance.mean,dispersionSize(observed,def.family),def.family)[side],leg.threshold)*100;
   assert(Math.abs(expected-leg.modelProbabilityPct)<1e-10,'Shared count probability unchanged');
   assert.equal(leg.qualifiedSelection,false);assert.equal(bet.evaluation.validation.approvable,false);assert.equal(bet.evaluation.prudentProbabilityPct,null);assert.equal(bet.evaluation.expectedValuePct,null);
   assert(/preliminare/.test(leg.evidenceLabel));assert(leg.suggestionAnalysis.suggested);assert(leg.modelProbabilityPct>=50&&leg.modelProbabilityPct<=100);
  }
 }
 assert.equal(current.marketCatalog.matches.find(m=>m.matchId==='ucl-2026-27-md04-18').selections.length,0,'Insufficient data stays N/D');
 for(const id of ['ucl-2026-27-md04-01','ucl-2026-27-md04-02'])assert(!current.marketCatalog.matches.find(m=>m.matchId===id).selections.some(l=>l.catalogOrigin==='champions-md04-team-volumes'),'No retrospective markets');
 const contaminated=structuredClone(source),fake=structuredClone(source.matches.find(m=>m.league==='uefa.champions'));
 fake.date='2026-11-01';fake.source.retrievedAt='2030-01-01T00:00:00Z';fake.home.statistics.totalShots=999999;contaminated.matches.push(fake);
 const first=structuredClone(before),second=structuredClone(before);
 await addTeamVolumeMarkets(first,odds,{calendar,source,asOf});await addTeamVolumeMarkets(second,odds,{calendar,source:contaminated,asOf});
 assert(JSON.stringify(first)===JSON.stringify(second),'Future receipts excluded from model');
 const scoped=structuredClone(current),id='ucl-2026-27-md04-08';
 await addTeamVolumeMarkets(scoped,odds,{calendar,source,asOf,fixtureIds:new Set([id])});
 for(const m of current.marketCatalog.matches)if(m.matchId!==id)assert(JSON.stringify(scoped.marketCatalog.matches.find(n=>n.matchId===m.matchId))===JSON.stringify(m),'Fixture-scoped updates isolated');
 console.log('OK: '+markets.length+' preliminary markets; exact quotes, shared probabilities, unchanged originals, temporal cutoff, scoped updates and no approvals.');
}
run().catch(e=>{console.error(e);process.exitCode=1;});
