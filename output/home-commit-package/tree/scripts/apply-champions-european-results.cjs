'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {readJsonFile:read}=require('./sisal/dataset-store.cjs');
const {applyEuropeanResults}=require('./champions/european-result-policy.cjs');
const paths={scenario:'data/generated/champions-shared-scenarios.json',catalog:'data/normalized/schedina-champions-md04.json',calendar:'data/normalized/champions-league-2026-27.json',odds:'data/normalized/odds/sisal/champions-league.json'};
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
async function run(){
 const asOf=new Date().toISOString(),scenarios=read(paths.scenario),catalog=read(paths.catalog),before={scenarios:structuredClone(scenarios),catalog:structuredClone(catalog)};
 const protectedPaths=[paths.calendar,paths.odds,'data/normalized/champions-md04-probable-individuals-2026-27.json','data/normalized/champions-md04-player-database-2026-27.json','data/normalized/official-starter-registry.json','data/normalized/schedina-champions-md03.json','data/normalized/predictions.json'];
 const protectedBefore=Object.fromEntries(protectedPaths.map(p=>[p,hash(p)]));
 const updates=await applyEuropeanResults({scenarios,catalog,calendar:read(paths.calendar),odds:read(paths.odds),asOf});
 const ids=new Set(updates.map(u=>u.fixtureId));
 assert.deepEqual(scenarios.fixtures.filter(f=>!ids.has(f.fixtureId)),before.scenarios.fixtures.filter(f=>!ids.has(f.fixtureId)));
 assert.deepEqual(catalog.marketCatalog.matches.filter(m=>!ids.has(m.matchId)),before.catalog.marketCatalog.matches.filter(m=>!ids.has(m.matchId)));
 assert.deepEqual(catalog.marketCatalog.myCombo,before.catalog.marketCatalog.myCombo);assert.deepEqual(catalog.slips,before.catalog.slips);
 for(const m of catalog.marketCatalog.matches){const old=before.catalog.marketCatalog.matches.find(x=>x.matchId===m.matchId);for(const l of m.selections){const previous=old.selections.find(x=>x.selectionId===l.selectionId);assert.deepEqual(l.betSelection.quote,previous.betSelection.quote);assert.deepEqual(l.betSelection.identity,previous.betSelection.identity);assert.deepEqual(l.betSelection.market,previous.betSelection.market);if(!['result','double-chance'].includes(l.suggestionAnalysis?.family)){const a=structuredClone(l),b=structuredClone(previous);if(a.suggestionAnalysis)a.suggestionAnalysis.rank=null;if(b.suggestionAnalysis)b.suggestionAnalysis.rank=null;assert.deepEqual(a,b,'Unrelated market changed');}}}
 for(const f of scenarios.fixtures){const old=before.scenarios.fixtures.find(x=>x.fixtureId===f.fixtureId);assert.deepEqual(f.teamProjections,old.teamProjections);assert.deepEqual(f.expectedGoals,old.expectedGoals);}
 for(const [p,h]of Object.entries(protectedBefore))assert.equal(hash(p),h,'Concurrent or unexpected input change '+p);
 const archive='data/technical-archive/champions-european-results/'+asOf.replace(/[:.]/g,'-')+'.json';fs.mkdirSync('data/technical-archive/champions-european-results',{recursive:true});
 fs.writeFileSync(archive,JSON.stringify({asOf,reason:'USER_AUTHORIZED_EUROPEAN_RESULT_REPLACEMENT',fixtures:before.scenarios.fixtures.filter(f=>ids.has(f.fixtureId)),resultMarkets:before.catalog.marketCatalog.matches.filter(m=>ids.has(m.matchId)).map(m=>({matchId:m.matchId,selections:m.selections.filter(l=>['result','double-chance'].includes(l.suggestionAnalysis?.family))}))},null,2)+'\n',{flag:'wx'});
 const write=(p,v)=>{const tmp=p+'.european.tmp';fs.writeFileSync(tmp,JSON.stringify(v,null,2)+'\n');fs.renameSync(tmp,p);};
 write(paths.scenario,scenarios);write(paths.catalog,catalog);
 fs.mkdirSync('output/champions-european-results',{recursive:true});fs.writeFileSync('output/champions-european-results/application.json',JSON.stringify({asOf,archive,updates,protectedBefore,summary:catalog.summary},null,2)+'\n');
 console.log(JSON.stringify({updates,summary:catalog.summary,archive}));
}
if(require.main===module)run().catch(e=>{console.error(e);process.exitCode=1;});
module.exports={run};
