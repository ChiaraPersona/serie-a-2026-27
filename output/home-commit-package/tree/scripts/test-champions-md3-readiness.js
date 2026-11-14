"use strict";
const assert=require('assert/strict'),fs=require('fs');
const {TEAM_ONLY,individualPolicy,readiness}=require('./champions/md3-readiness');
const base='data/analysis/champions/md3-readiness-2026-10-19';
const read=p=>JSON.parse(fs.readFileSync(`${base}/${p}`,'utf8'));
const pack=read('package2-summary.json');
assert.deepEqual(pack.dispositions,{quarantine:28,duplicate:6});assert.equal(pack.imported,0);assert.equal(pack.package1Performances,817);
const rows=read('package2-row-audit.json');assert.equal(rows.filter(r=>r.localDisposition==='duplicate'&&r.localMatchCount===1).length,6);
const teams=read('team-coverage.json');assert.equal(teams.length,36);assert.equal(teams.filter(t=>t.individualForecastsAllowed).length,32);
const manifest=read('md3-preparation-manifest.json');assert.equal(manifest.fixtures.length,18);assert.equal(manifest.engineLinked,false);assert.equal(manifest.definitiveGenerationAuthorized,false);
for(const f of manifest.fixtures){
 assert.equal(f.individualGenerationReady,false);assert.equal(f.definitiveGenerationAuthorized,false);
 assert(f.odds.eventPresent);assert.equal(f.odds.invalidSelections,0);assert.equal(f.odds.marketsMissingId,0);assert.equal(f.odds.duplicateSelectionIds,0);
 assert.equal(f.odds.canonicalDateMatches,true);
 for(const t of f.sides)assert.equal(t.individualForecastsAllowed,individualPolicy(t.teamId).individualForecastsAllowed);
}
const allGood={teamId:'arsenal',lineupCount:11,benchCount:9,exactIdentities:true,evidenceReady:true,engineLinkApproved:true,oddsReady:true};
assert.equal(readiness(allGood).individualGenerationReady,true);
// Even complete data cannot override the user's four-team restriction.
for(const id of TEAM_ONLY){const r=readiness({...allGood,teamId:id});assert.equal(r.individualGenerationReady,false);assert(r.blockers.includes('COLLECTIVE_ONLY_BY_USER'));}
for(const changes of [{lineupCount:10},{benchCount:0},{exactIdentities:false},{evidenceReady:false},{engineLinkApproved:false},{oddsReady:false}])assert.equal(readiness({...allGood,...changes}).individualGenerationReady,false);
assert(read('protected-verification.json').package1Unchanged);
console.log('OK MD3 preparation: 6 duplicates / 28 quarantine / 0 imports, 18 exact fixture contracts, four collective-only gates; missing lineup/bench/identity/evidence/approval/odds block individual generation.');
