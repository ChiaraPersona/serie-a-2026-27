'use strict';
// Read-only checks against archived provider bytes and canonical designations.
const fs=require('node:fs'),zlib=require('node:zlib'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {recentRows,seasons}=require('./champions/referee-profile-data.cjs');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const profiles=read('data/normalized/champions-referee-profiles-md05-2026-27.json').fixtures;
const calendar=read('data/normalized/champions-league-2026-27.json').fixtures;
const history=read('data/normalized/champions-referee-match-history-md05-2026-27.json');
const generated=read('data/generated/reading-referee-history.json').fixtures;
assert.equal(profiles.length,18);assert.equal(new Set(profiles.map(p=>p.fixtureId)).size,18);
for(const p of profiles){
 const fixture=calendar.find(f=>f.id===p.fixtureId),entry=history.presentation.find(e=>e.fixtureId===p.fixtureId);
 assert.equal(fixture.matchday,5);assert.equal(p.name,fixture.refereeAssignment.referee.name);
 assert.equal(p.refereeId,fixture.refereeAssignment.refereeId||null);assert.equal(p.predictionEligible,false);assert.equal(p.status,'AVAILABLE');
 const html=zlib.gunzipSync(fs.readFileSync(p.source.file)).toString();
 assert.equal(crypto.createHash('sha256').update(html).digest('hex'),p.source.sha256);
 assert.deepEqual(entry,generated.find(e=>e.fixtureId===p.fixtureId));
 const rows=recentRows(html,fixture.date+'T00:00:00Z').slice(0,5);
 assert.equal(entry.rows.length,5);assert.deepEqual(entry.rows.map(r=>r.id),rows.map(r=>r.id));
 for(const row of entry.rows){assert(row.date<entry.cutoffDate);assert.equal(row.directRedCards,null);assert.equal(row.secondYellowCards,null);}
 const seasonal=seasons(html).filter(s=>['2026/2027','2026/27'].includes(s.season)&&s.competitionId===2);
 for(const [key,field] of [['yellowCards','yellowCards'],['dismissals','redCards'],['fouls','fouls']]){
  const samples=seasonal.filter(s=>Number.isFinite(s.metrics[field].total)),n=samples.reduce((n,s)=>n+s.matches,0);
  assert.equal(entry.analysis.seasonal[key].n,n);
  assert.equal(entry.analysis.seasonal[key].average,n?samples.reduce((n,s)=>n+s.metrics[field].total,0)/n:null);
  assert.equal(entry.analysis.percentDifference[key],null);
 }
}
console.log('PASS: 18 designazioni, hash originali, 90 gare precedenti, medie Champions e N/D, sincronizzazione della proiezione');
