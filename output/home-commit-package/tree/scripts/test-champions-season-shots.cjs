"use strict";
const fs=require('fs'),assert=require('assert/strict');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const base='data/analysis/champions/season-shots-2026-10-20/';
const output=read('data/normalized/champions-player-shooting-2026-27.json');
const current=read('data/normalized/champions-player-stats-2026-27.json');
const before=read(base+'players-before.json');
const source=read(output.sourceLedger);
assert.equal(output.teams.length,36);
const all=output.teams.flatMap(t=>t.players);assert.equal(all.length,970);
assert.equal(new Set(output.teams.flatMap(t=>t.players.map(p=>`${t.id}|${p.id}`))).size,970);
for(const t of output.teams)for(const p of t.players){
 for(const id of Object.values(p.providerIds).filter(Boolean))assert(/^[1-9]\d*$/.test(String(id)),'Invalid provider identity');
 assert.equal(p.fullSeasonVerified,false);
 for(const c of p.competitions){
   if(c.status==='available'){assert(Number.isInteger(c.shots)&&c.shots>=0);assert(Number.isInteger(c.shotsOnTarget)&&c.shotsOnTarget>=0&&c.shotsOnTarget<=c.shots);}
   else{assert.equal(c.shots,null);assert.equal(c.shotsOnTarget,null);}
   assert(!/friendly|gamper/i.test(c.league));
 }
 if(p.status==='available-in-covered-competitions'){
   assert(p.competitions.every(c=>c.status==='available'));
   assert.equal(p.coveredTotals.shots,p.competitions.reduce((sum,c)=>sum+c.shots,0));
   assert.equal(p.coveredTotals.shotsOnTarget,p.competitions.reduce((sum,c)=>sum+c.shotsOnTarget,0));
 }else{assert.equal(p.coveredTotals.shots,null);assert.equal(p.coveredTotals.shotsOnTarget,null);}
 if(p.currentClubCatalogueZero){assert.equal(p.currentClubCatalogueZero.shots,0);assert(p.currentClubCatalogueZero.verifiedMatches>0);assert(p.currentClubCatalogueZero.scope.includes('Current club only'));}
 const cp=current.teams.find(x=>x.id===t.id).players.find(x=>x.id===p.id);
 assert.deepEqual(cp.officialClubShooting.coveredTotals,p.coveredTotals);
}
for(const group of [...source.primaryPerformances,...source.fotmobPerformances]){
 const keys=new Set();
 for(const p of group.performances){
   assert(p.date<='2026-10-20');assert(p.date>=(p.league==='nor.1'?'2026-01-01':'2026-07-01'));
   const k=`${p.eventId}|${p.providerTeamId}`;assert(!keys.has(k));keys.add(k);
   if(p.shots!==null&&p.shotsOnTarget!==null)assert(p.shotsOnTarget<=p.shots);
 }
}
const stripped=structuredClone(current),baseline=structuredClone(before);
for(const d of [stripped,baseline])for(const t of d.teams)for(const p of t.players)delete p.officialClubShooting;
assert.deepEqual(stripped,baseline,'Legacy statistics, minutes, identities or other fields changed');
const {attachSeasonShooting}=require('./champions/season-shooting-overlay.cjs');
const historical={asOf:'2026-10-19',teams:[{id:'arsenal',players:[{id:'bukayo-saka'}]}]};
attachSeasonShooting(historical);assert.equal(historical.teams[0].players[0].officialClubShooting,undefined,'Future evidence leaked into an earlier snapshot');
console.log('Champions season shots: 36 teams, 970 unique players, dated/deduplicated evidence, null/zero boundaries, aggregates, legacy preservation and cutoff overlay passed.');
