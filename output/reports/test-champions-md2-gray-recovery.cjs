const fs=require('fs'),assert=require('assert/strict'),crypto=require('crypto');
const base='output/reports/';
const before=JSON.parse(fs.readFileSync(base+'champions-md2-gray-recovery-before.json'));
const after=JSON.parse(fs.readFileSync(base+'champions-post-match-audit-2026-10-15.json'));
const allowed=new Set(before.grayIds),index=new Map([...before.report.rows,...before.report.archive].map(s=>[s.selectionId,s]));
const strip=s=>JSON.parse(JSON.stringify({...s,audit:undefined}));
let changed=0,untouched=0;
for(const s of [...after.rows,...after.archive]){
 const old=index.get(s.selectionId);assert(old);
 assert.deepEqual(strip(s),strip(old),'Historical contract mutation '+s.selectionId);
 assert.equal(s.audit.originalPayloadSha256,old.audit.originalPayloadSha256);
 assert.equal(s.audit.filtered,old.audit.filtered);
 if(!allowed.has(s.selectionId)){assert.deepEqual(s.audit.outcome,old.audit.outcome);untouched++;}
 else{assert.equal(old.audit.outcome.status,'GRIGIO');assert(s.audit.outcome.sources.length);if(s.audit.outcome.status==='GRIGIO')assert(s.audit.outcome.neededSource);else changed++;}
}
assert.equal(after.rows.length,117);assert.equal(after.archive.length,3);assert.equal(allowed.size,36);
assert.equal(untouched,84);assert.equal(changed,27);
assert.deepEqual(after.stats.allOutcomeCounts,{VERDE:74,ROSSO:34,GRIGIO:9,VOID:0});
const operational=after.rows.filter(s=>!s.audit.filtered&&['VERDE','ROSSO'].includes(s.audit.outcome.status));
const money=a=>a.filter(s=>s.audit.outcome.status==='VERDE').reduce((n,s)=>n+Math.round(s.odds*100),0);
assert.equal(operational.length,104);assert.equal(money(operational),11505);
assert.equal(after.stats.all.stakeEuro,104);assert.equal(after.stats.all.netEuro,11.05);
assert(Math.abs(after.stats.all.roiPct-11.05/104*100)<0.0001);
const orig=after.rows.filter(s=>['VERDE','ROSSO'].includes(s.audit.outcome.status));
assert.equal(orig.length,108);assert.equal(money(orig),11630);
assert.equal(after.stats.originalPlayable.netEuro,8.3);
assert.equal(after.stats.byMarket.reduce((n,g)=>n+g.stakeEuro,0),104);
assert.equal(Math.round(after.stats.byMarket.reduce((n,g)=>n+g.grossEuro,0)*100),11505);
const nonStarters=after.rows.filter(s=>s.audit.nonStarter);
assert.equal(nonStarters.length,4);assert(nonStarters.every(s=>s.audit.filtered));
assert.equal(nonStarters.filter(s=>s.audit.outcome.status==='VERDE').length,1);
assert.equal(nonStarters.filter(s=>s.audit.outcome.status==='ROSSO').length,3);
const altered=[];
for(const [p,h] of Object.entries(before.protectedHashes)){
 const now=crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');if(now!==h)altered.push(p);
}
assert.deepEqual(altered,[],'Protected workspace content changed during audit');
console.log(JSON.stringify({passed:true,contractsPreserved:120,previousOutcomesPreserved:84,grayScope:36,resolved:27,remaining:9,filtered:{stake:104,gross:115.05,net:11.05},original:{stake:108,gross:116.3,net:8.3},protectedFilesUnchanged:Object.keys(before.protectedHashes).length},null,2));
