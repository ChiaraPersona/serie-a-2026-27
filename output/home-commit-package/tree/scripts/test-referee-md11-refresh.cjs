const fs=require('node:fs'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const archive=read('data/normalized/referee-history/md11-2026-27.json'),current=read('data/generated/reading-referee-history.json');
const fixtures=read('data/normalized/matches.json').filter(f=>f.competition==='serie-a'&&f.matchday===11),ids=new Set(fixtures.map(f=>f.id));
const {analyze}=require('./referee-stats/reading-analysis');
assert.equal(archive.referees.length,10);
for(const f of fixtures){
 const entry=current.fixtures.find(e=>e.fixtureId===f.id),ref=archive.referees.find(r=>r.refereeId===f.refereeAssignment.referee.slug);
 assert.equal(entry.refereeId,ref.refereeId);assert.equal(entry.rows.length,5);
 const rows=ref.matches.filter(r=>r.officialCompetition===true&&r.date<f.date);
 assert.deepEqual(entry.rows.map(r=>r.id),rows.slice(0,5).map(r=>r.id));
 const expected=analyze(rows,f.date);for(const key of ['recent','seasonal','percentDifference'])assert.deepEqual(entry.analysis[key],expected[key]);
 for(const m of ref.matches){assert(m.date<=archive.asOf);for(const k of m.disputedMetrics)assert.equal(m[k],null);assert(!ref.quarantinedMatches.some(q=>q.id===m.id));}
}
const baselinePath='output/referee-md11-refresh/before.json';
if(fs.existsSync(baselinePath))for(const old of read(baselinePath).fixtures.filter(f=>!ids.has(f.fixtureId)))assert.deepEqual(current.fixtures.find(f=>f.fixtureId===old.fixtureId),old);
const hashesPath='output/referee-md11-refresh/protected-hashes.json';
if(fs.existsSync(hashesPath))for(const [p,hash] of Object.entries(read(hashesPath)))assert.equal(crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex'),hash,p+' changed');
console.log('PASS MD11: identità, ultime cinque, medie, cutoff, quarantena e isolamento.');
