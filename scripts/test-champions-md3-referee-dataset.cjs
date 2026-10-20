'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),zlib=require('node:zlib'),crypto=require('node:crypto');
const {profilePayload,arrayField,recentRows,summary}=require('./champions/referee-profile-data.cjs');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const data=read('data/normalized/champions-referee-dataset-md03-2026-27.json');
assert.equal(data.matchday,3);assert.equal(data.fixtures.length,16);
assert.equal(new Set(data.fixtures.map(f=>f.fixtureId)).size,16);
for(const f of data.fixtures){
 assert(!['ucl-2026-27-md03-01','ucl-2026-27-md03-02'].includes(f.fixtureId));
 const html=zlib.gunzipSync(fs.readFileSync(f.source.file)).toString();
 assert.equal(crypto.createHash('sha256').update(html).digest('hex'),f.source.sha256);
 assert(Date.parse(f.source.retrievedAt)<Date.parse(f.cutoff));
 assert.equal(f.recent.all.length,20);assert.equal(f.recent.last10.matches,10);
 assert.equal(f.seasonCompetitionSamples.length,arrayField(profilePayload(html),'seasonStats').length);
 assert.equal(f.serieAModelCompatibility.calibratedProbability,null);
 assert.equal(f.serieAModelCompatibility.formulasChanged,false);
 for(const row of f.recent.all){
  assert(Date.parse(row.date)<Date.parse(f.cutoff));
  for(const [field,provider] of [['yellowCards','yellowCards'],['redCards','redCards'],['fouls','foulsc'],['penalties','penalties']]){
   if(row[field]!==null)assert.equal(row[field],row.homeStats[provider]+row.awayStats[provider]);
  }
 }
 assert.deepEqual(f.recent.last10,summary(f.recent.all.slice(0,10)));
 if(!f.quality.countsAgree)assert(f.serieAModelCompatibility.activationBlockers.includes('PROVIDER_AGGREGATE_COUNTS_DISAGREE'));
}
// Never infer missing metrics as zero, nor admit a same-time/future event.
const raw=[{id:'1',timestamp:'$D2026-10-20T19:00:00Z',HomeStats:{yellowCards:0},AwayStats:{yellowCards:0}},{id:'2',timestamp:'$D2026-10-19T19:00:00Z',HomeStats:{yellowCards:0},AwayStats:{yellowCards:0}}];
const encoded='<script>self.__next_f.push('+JSON.stringify([1,JSON.stringify({recentMatches:raw})])+')</script>';
const rows=recentRows(encoded,'2026-10-20T19:00:00Z');assert.equal(rows.length,1);assert.equal(rows[0].yellowCards,0);assert.equal(rows[0].fouls,null);
const result={status:'PASS',fixtures:16,rawHashesVerified:16,datedMatchesVerified:320,cutoffTest:true,missingNotZero:true,aggregateDisagreementsQuarantined:true};
fs.writeFileSync('output/champions-md3-referee-recovery/tests.json',JSON.stringify(result,null,2)+'\n');console.log(result);
