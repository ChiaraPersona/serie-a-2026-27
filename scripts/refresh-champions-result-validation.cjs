'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const {eligible}=require('./champions/shared-scenario.cjs');
const {applyResultValidationPolicy}=require('./champions/result-validation-policy.cjs');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const file='data/normalized/schedina-champions-md04.json',catalog=read(file),before=structuredClone(catalog);
const now=new Date().toISOString(),calendar=read('data/normalized/champions-league-2026-27.json');
const ids=new Set(calendar.fixtures.filter(f=>f.matchday===4&&eligible(f,now)).map(f=>f.id));
const removed=applyResultValidationPolicy(catalog,ids);
assert.deepEqual(catalog.marketCatalog.matches.filter(m=>!ids.has(m.matchId)),before.marketCatalog.matches.filter(m=>!ids.has(m.matchId)));
for(const m of catalog.marketCatalog.matches)for(const l of m.selections){
 const old=before.marketCatalog.matches.find(b=>b.matchId===m.matchId).selections.find(b=>b.selectionId===l.selectionId);
 assert.deepEqual(l.betSelection,old.betSelection,'Contract and diagnostic evaluation unchanged');
}
fs.writeFileSync(file,JSON.stringify(catalog,null,2)+'\n');
fs.mkdirSync('output/champions-result-validation',{recursive:true});
fs.writeFileSync('output/champions-result-validation/update.json',JSON.stringify({asOf:now,fixtureIds:[...ids],removed,preservedOtherFixtures:true},null,2)+'\n');
console.log(JSON.stringify({futureFixtures:ids.size,removed,summary:catalog.summary}));
