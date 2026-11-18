'use strict';
// Stage 1 only: build exact acquisition requirements. No forecast or model writes.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {zonedLocalToUtc}=require('../champions/complete-forecast-snapshots');
const root=path.resolve(__dirname,'../..'),out='data/analysis/champions/opta-historical-feasibility-2026-11-18';
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const sha=p=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex');
const paths=['data/normalized/champions-league-2026-27.json','data/sources/champions-team-history-map-2026-27.json','data/analysis/champions/opta-ranking-test-2026-11-18/comparison.json'];
const hashes=Object.fromEntries(paths.map(p=>[p,sha(p)]));
const calendar=read(paths[0]),map=read(paths[1]),current=read(paths[2]);
const ids=new Map(map.teams.map(t=>[t.team,String(t.uefaTeamId)]));
assert.equal(ids.size,36);assert.equal(new Set(ids.values()).size,36);
const snapshots=new Map(),snapshotHashes={};
const directory='data/predictions/champions-event-snapshots/md03';
for(const file of fs.readdirSync(path.join(root,directory)).filter(f=>f.endsWith('.json'))){
 const p=directory+'/'+file,s=read(p),{contentHash,...content}=s;
 assert.equal(crypto.createHash('sha256').update(JSON.stringify(content)).digest('hex'),contentHash);
 if(s.chronologyStatus!=='VALID_PREMATCH_SNAPSHOT'||!(s.createdAt<s.kickoffAt))continue;
 const prev=snapshots.get(s.fixtureId);if(!prev||s.createdAt<prev.createdAt)snapshots.set(s.fixtureId,s);
 snapshotHashes[p]=sha(p);
}
const requirements=calendar.fixtures.filter(f=>f.status==='finished').map(f=>{
 assert(ids.has(f.homeTeam)&&ids.has(f.awayTeam));
 const kickoffAt=zonedLocalToUtc(f.date,f.kickoff,'Europe/Rome');
 const snapshot=snapshots.get(f.id);
 // A date-only feed must use the day BEFORE the forecast cutoff, not the
 // final rating of match day, which could include the match itself.
 const cutoffAt=snapshot?.createdAt||kickoffAt;
 const cutoffDate=snapshot?snapshot.createdAt.slice(0,10):f.date;
 const recommendedRankDt=new Date(Date.parse(cutoffDate+'T00:00:00Z')-86400000).toISOString().slice(0,10);
 assert(recommendedRankDt<f.date);
 return {fixtureId:f.id,matchday:f.matchday,kickoffAt,cutoffAt,cutoffBasis:snapshot?'earliest-immutable-reading-snapshot':'kickoff-only-no-frozen-reading-proven',recommendedRankDt,
  teams:['home','away'].map(side=>({side,team:f[side+'Team'],uefaTeamId:ids.get(f[side+'Team']),optaContestantId:null,rating:null,availabilityStatus:'NOT_ACQUIRED'}))};
});
const pairs=new Map();for(const r of requirements)for(const t of r.teams)pairs.set(t.uefaTeamId+'|'+r.recommendedRankDt,{team:t.team,uefaTeamId:t.uefaTeamId,rankDt:r.recommendedRankDt});
const summary={finishedFixtures:requirements.length,frozenReadingFixtures:requirements.filter(r=>r.cutoffBasis==='earliest-immutable-reading-snapshot').length,teamFixtureSlots:requirements.length*2,uniqueTeamDateRequests:pairs.size,uniqueRankDates:[...new Set(requirements.map(r=>r.recommendedRankDt))].sort(),historicalRatingsAcquired:0,completeHistoricalFixtures:0,optaIdentityMappingsVerified:0,currentSnapshotExcludedFixtures:requirements.filter(r=>current.asOf>=r.cutoffAt.slice(0,10)).length};
assert.equal(summary.finishedFixtures,72);assert.equal(summary.frozenReadingFixtures,18);assert.equal(summary.currentSnapshotExcludedFixtures,72);
const protocol={schemaVersion:1,stage:1,status:'HISTORICAL_DATA_NOT_ACQUIRED',asOf:'2026-11-18',productionPromotion:false,
 gates:{historicalBacktest:'NOT_READY',probabilityCalibration:'NOT_READY',parallelFullReading:'NOT_READY'},summary,
 candidate:'Direct individual Opta club rating; no extra league strength bonus',
 requiredRecord:['uefaTeamId','optaContestantId','rankDt','rating','sourceUrl','rawPath','rawSha256','acquiredAt','historicalAvailabilityEvidence'],
 rules:['Exact verified provider ID crosswalk; no fuzzy name matching.','Use latest demonstrably available rating BEFORE forecast cutoff. rankDt alone does not prove publication time.','Same-day date-only ratings are ineligible without a pre-cutoff publication timestamp.','Do not substitute retrievedAt for rankDt or historical availability. Revisions/lastUpdated require an explicit audit.','Current 2026-11-18 snapshot is ineligible for all 72 past matches.','Missing IDs, ratings or baseline snapshots remain N/D; report coverage and exclusions.','Source season averages/minima/maxima calculated later are not prematch features.'],
 nextStages:{calibration:'Fit an isolated mapping to 1X2 on dated earlier matches only; chronological train/validation/test; freeze parameters before test outcomes; no production weight changes.',reading:'Only after calibration, use existing outcome-conditioning seam and retain technical score shape, volume formulas and discipline gates.',evaluation:'Paired common fixtures; 1X2 log loss/Brier/calibration, goals/count MAE by metric, fixture-cluster intervals; no retrospective market substitutions or DUO probabilities.'},
 inputs:hashes,snapshotHashes,requirements,uniqueRequests:[...pairs.values()]};
fs.mkdirSync(path.join(root,out),{recursive:true});
fs.writeFileSync(path.join(root,out,'protocol-and-requirements.json'),JSON.stringify(protocol,null,2)+'\n');
for(const [p,h]of Object.entries({...hashes,...snapshotHashes}))assert.equal(sha(p),h);
console.log(JSON.stringify(summary,null,2));
