'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const dir='data/analysis/champions/elo-all-teams-2026-11-14',audit=read(dir+'/audit.json');
assert.equal(audit.teamCount,36);assert.equal(audit.rows.length,36);assert.equal(audit.domesticCoverage,36);
assert.equal(new Set(audit.rows.map(r=>r.uefaTeamId)).size,36);
for(const row of audit.rows){
 assert(row.domestic&&row.domestic.played>=4,row.team);
 assert(row.domestic.latestMatchDate<audit.asOf.slice(0,10));assert(Date.parse(row.domestic.availableAt)<=Date.parse(audit.asOf));
 assert.equal(crypto.createHash('sha256').update(fs.readFileSync(row.domestic.calendarPath)).digest('hex'),row.domestic.calendarSha256);
 assert.equal(row.current.matches,4,row.team+': current completed fixtures omitted');
 const fromResults=1500+Object.values(row.bySeason).reduce((n,s)=>n+s.eloDelta,0);assert(Math.abs(fromResults-row.rawEuropeanRating)<1e-8,row.team+': rating attribution mismatch');
}
const variants=read('data/analysis/champions/elo-domestic-transfer-v2-2026-11-14/competition-weight-audit.json');assert.equal(variants.profiles.length,4);
const uniform=read(dir+'/uniform-comparison.json');assert.equal(uniform.candidates.length,15);assert.equal(uniform.operationallyApplied,false);
const activation=read('data/analysis/champions/elo-domestic-transfer-v2-2026-11-14/activation.json');assert.equal(activation.operationallyApplied,false);
const previous=read('data/analysis/champions/elo-domestic-transfer-v2-2026-11-14/previous-model.json');assert.deepEqual(read('data/normalized/champions-elo-initial-prior-model.json'),previous,'Negative research result was promoted');
console.log('OK all 36 clubs: exact identity uniqueness, fresh domestic coverage/hashes, all four current matches, full Elo attribution, 4 competition profiles and 15 uniform-rating variants; negative candidates not promoted');
