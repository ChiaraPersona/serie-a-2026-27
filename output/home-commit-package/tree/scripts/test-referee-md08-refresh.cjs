const fs=require('node:fs'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const archive=read('data/normalized/referee-history/md08-2026-27.json'),current=read('data/generated/reading-referee-history.json');
const baseline=JSON.parse(execFileSync('git',['show','HEAD:data/generated/reading-referee-history.json'],{maxBuffer:30*1024*1024,encoding:'utf8'}));
const fixtures=read('data/normalized/matches.json').filter(f=>f.competition==='serie-a'&&f.matchday===8),ids=new Set(fixtures.map(f=>f.id));
assert.equal(archive.referees.length,10);
for(const old of baseline.fixtures.filter(f=>!ids.has(f.fixtureId)))assert.deepEqual(current.fixtures.find(f=>f.fixtureId===old.fixtureId),old,'Unrelated fixture changed: '+old.fixtureId);
const {analyze}=require('./referee-stats/reading-analysis');
for(const f of fixtures){
 const entry=current.fixtures.find(e=>e.fixtureId===f.id),ref=archive.referees.find(r=>r.refereeId===f.refereeAssignment.referee.slug);
 assert.equal(entry.refereeId,ref.refereeId);assert.equal(entry.rows.length,5);
 const rows=ref.matches.filter(r=>r.officialCompetition===true&&r.date<f.date);
 assert.deepEqual(entry.rows.map(r=>r.id),rows.slice(0,5).map(r=>r.id));
 const expected=analyze(rows,f.date);for(const key of ['recent','seasonal','percentDifference'])assert.deepEqual(entry.analysis[key],expected[key]);
 for(const m of ref.matches){assert(m.date<=archive.asOf);for(const k of m.disputedMetrics)assert.equal(m[k],null);assert(!ref.quarantinedMatches.some(q=>q.id===m.id));}
}
console.log('PASS MD8: ten officials, five recent rows each, exact aggregates, cutoff/quarantine and all unrelated fixtures preserved.');
