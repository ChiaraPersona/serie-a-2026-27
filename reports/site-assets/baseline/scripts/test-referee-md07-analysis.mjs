import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
import {refereeHistoryMarkup} from '../js/pages/reading-detail/referee-history.mjs';
const require=createRequire(import.meta.url),{aggregate,analyze}=require('./referee-stats/reading-analysis');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const source=read('data/sources/reading-referee-match-history.json');
const before=read('output/reports/referee-md07-before.json');
const output=read('data/generated/reading-referee-history.json');
const targets=new Set(source.fixtureAnalyses.map(f=>f.fixtureId));
assert.equal(targets.size,4);
assert.deepEqual(aggregate([{yellowCards:0},{yellowCards:null},{yellowCards:4,disputedMetrics:['yellowCards']}]).yellowCards,{average:0,n:1});
assert.equal(aggregate([{yellowCards:null,dismissals:1}]).totalCards.n,0);
assert.equal(analyze([{date:'2026-08-01',season:'2026/27',yellowCards:0}],'2026-10-18').percentDifference.yellowCards,null);
let unchanged=0;
for(const f of output.fixtures){
 if(!targets.has(f.fixtureId)){assert.deepEqual(f,before.history.fixtures.find(p=>p.fixtureId===f.fixtureId));unchanged++;continue;}
 const s=source.fixtureAnalyses.find(p=>p.fixtureId===f.fixtureId);
 assert.equal(f.rows.length,5);assert(f.rows.every(r=>r.date<f.cutoffDate));
 assert.deepEqual(f.analysis,analyze(s.matches,f.cutoffDate));
 const markup=refereeHistoryMarkup(f);
 assert.equal((markup.match(/data-referee-history-date=/g)||[]).length,5);
 assert(markup.includes('Falli'));assert(markup.includes('n='));assert(markup.includes('Δ'));
 assert(!/https?:|Calciotel|OFStats|AIPredict|OddAlerts/.test(markup));
 for(const row of f.rows)for(const key of row.disputedMetrics||[])assert(row.missingMetrics.includes(key));
}
for(const [file,hash] of Object.entries(before.hashes))assert.equal(crypto.createHash('sha256').update(fs.readFileSync('data/normalized/'+file)).digest('hex'),hash,file);
console.log(`PASS: four analyses; ${unchanged} other fixture records unchanged; all ${Object.keys(before.hashes).length} protected data hashes unchanged.`);
