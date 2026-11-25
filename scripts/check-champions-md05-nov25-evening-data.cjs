'use strict';
const fs=require('fs'),assert=require('node:assert/strict'),crypto=require('crypto');
const read=p=>JSON.parse(fs.readFileSync(p)),hash=v=>crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex');
const first=read('output/champions-md05/nov25-evening-first/before.json'),rest=read('output/champions-md05/nov25-evening-rest/before.json');
const baseline=[...first.catalogMatches,...rest.catalogMatches],ids=new Set(baseline.map(m=>m.matchId));
const out=read('data/normalized/schedina-champions-md05.json'),scenarios=read('data/generated/champions-shared-scenarios.json'),official=read('data/sources/champions-official-formations-md05-2026-27.json'),archive=read('data/technical-archive/official-nonstarter-markets.json'),registry=read('data/normalized/official-starter-registry.json');
for(const m of out.marketCatalog.matches)if(!ids.has(m.matchId))assert.equal(hash(m),first.unaffectedCatalogHashes[m.matchId],m.matchId);
for(const f of scenarios.fixtures)if(!ids.has(f.fixtureId))assert.equal(hash(f),first.unaffectedScenarios[f.fixtureId],f.fixtureId);
const changes=[];
for(const old of baseline){
 const id=old.matchId,m=out.marketCatalog.matches.find(m=>m.matchId===id),teams=official.teams.filter(t=>t.fixtureId===id),starters=teams.flatMap(t=>t.starters.map(p=>p.playerId));
 assert.equal(teams.length,2);assert.equal(new Set(starters).size,22);assert.equal(registry[id].ids.length,22);
 assert(m.selections.filter(l=>l.marketScope==='player').every(l=>starters.includes(l.playerId)));
 for(const l of m.selections){const o=old.selections.find(o=>o.selectionId===l.selectionId);if(o){assert.equal(l.odds,o.odds);assert.deepEqual(l.betSelection.market.modifiers,o.betSelection.market.modifiers);assert.equal(l.betSelection.market.threshold,o.betSelection.market.threshold)}
  if(l.marketFamily?.includes('DUO'))for(const key of ['modelProbabilityPct','fairOdds','expectedValuePct'])assert.equal(l.betSelection.evaluation[key],null);
 }
 const removed=old.selections.filter(l=>l.marketScope==='player'&&!starters.includes(l.playerId));assert(removed.every(l=>archive.some(a=>a.selectionId===l.selectionId)));
 changes.push({fixtureId:id,oldSuggestions:old.suggestions.length,newSuggestions:m.suggestions.length,removed:removed.map(l=>({playerId:l.playerId,label:l.label})),starters:22,bench:teams.reduce((s,t)=>s+t.bench.length,0)});
}
const viking=official.teams.find(t=>t.fixtureId==='ucl-2026-27-md05-12'&&t.teamId==='viking');assert.equal(viking.starters.find(p=>p.shirtNumber===2).playerId,'herman-haugen');
const report={changes,unrelatedFixturesUnchanged:true,contractsPreserved:true,duoProbabilityUnavailable:true};
fs.mkdirSync('output/champions-md05/nov25-evening-all',{recursive:true});fs.writeFileSync('output/champions-md05/nov25-evening-all/data-check.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
