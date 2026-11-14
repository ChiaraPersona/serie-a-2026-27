import fs from 'node:fs';
import assert from 'node:assert/strict';
import {refereeDashboardMarkup} from '../js/pages/reading-detail/referee-dashboard.mjs';
const data=JSON.parse(fs.readFileSync('data/generated/reading-referee-history.json','utf8'));
for(const entry of data.fixtures){
 const before=JSON.stringify(entry),model={competition:entry.competition,fixture:{id:entry.fixtureId,date:entry.cutoffDate},analysis:{}};
 const html=refereeDashboardMarkup(model,entry);
 const rows=entry.rows.filter(r=>r.date<entry.cutoffDate).sort((a,b)=>b.date.localeCompare(a.date)).slice(0,5);
 assert.equal((html.match(/data-referee-history-date=/g)||[]).length,rows.length);
 assert.equal((html.match(/class="rf-indicator /g)||[]).length,4);
 assert(!html.includes('NaN'));assert(!html.includes('[object Object]'));assert(!/<details|https?:/.test(html));
 for(const row of rows){assert(html.includes(`data-referee-history-date="${row.date}"`));}
 assert.equal(JSON.stringify(entry),before);
}
const empty=refereeDashboardMarkup({fixture:{},analysis:{}},null);assert(empty.includes('Media stagionale —'));assert(empty.includes('Partite precedenti non disponibili.'));
console.log(`PASS: ${data.fixtures.length} shared dashboards; cutoff, missing data, immutability and no provenance.`);
