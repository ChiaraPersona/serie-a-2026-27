import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {refereeHistoryMarkup} from '../js/pages/reading-detail/referee-history.mjs';
const require=createRequire(import.meta.url);
const {recentMatches,summary}=require('./build-reading-referee-history.js');
const {parseMatches,identity}=require('./referee-stats/import-reading-history.js');
const row={date:'2026-10-10',competition:'Serie A',home:'Casa',away:'Ospite',score:{home:2,away:1},yellowCards:4,dismissals:1,secondYellowCards:null,directRedCards:null,penaltiesAwarded:0};
assert.deepEqual(recentMatches([row,row,{...row,date:'2026-10-18'},{...row,date:'2026-10-19'}],'2026-10-18'),[row]);
assert.equal(summary([row,{...row,yellowCards:null}]).yellowCardsAverage,null);
assert.equal(summary([row,{...row,penaltiesAwarded:null}]).penaltiesTotal,null);
assert.equal(summary([row]).dismissalsTotal,1);assert.equal(summary([]).dismissalsTotal,null);
assert.equal(identity('Giuseppe Collu'),identity('COLLU GIUSEPPE'));
assert.notEqual(identity('Juan Luca Sacchi'),identity('Gianluca Sacchi'));
const parsed=parseMatches('Elenco generale gare dirette<table><tr>'+['2026/27','10/10/2026','Serie A','Casa - Ospite','2 - 1','4','1','-'].map(c=>`<td>${c}</td>`).join('')+'</tr></table>');
assert.equal(parsed[0].penaltiesAwarded,null);assert.equal(parsed[0].directRedCards,null);assert.equal(parsed[0].dismissals,1);
const html=refereeHistoryMarkup({cutoffDate:'2026-10-18',rows:[row,{...row,date:'2026-10-19'}]});
assert.equal((html.match(/data-referee-history-date=/g)||[]).length,1);
assert(html.includes('2G —'));assert(html.includes('R —'));assert(!html.includes('<details'));assert(!html.includes('2026-10-19'));
const data=JSON.parse(fs.readFileSync('data/generated/reading-referee-history.json','utf8'));
for(const fixture of data.fixtures){
 assert(fixture.rows.length<=5);
 assert.deepEqual(fixture.summary,summary(fixture.rows));
 const dates=fixture.rows.map(r=>r.date);assert(dates.every(d=>d<fixture.cutoffDate));assert.deepEqual(dates,[...dates].sort().reverse());
 const keys=fixture.rows.map(r=>[r.date,r.competition,r.home,r.away].join('|'));assert.equal(new Set(keys).size,keys.length);
 for(const r of fixture.rows){
  assert(r.source?.url);assert(r.source?.retrievedAt);
  for(const k of ['yellowCards','dismissals','secondYellowCards','directRedCards','penaltiesAwarded'])assert(r[k]===null||(Number.isInteger(r[k])&&r[k]>=0));
  if(r.secondYellowCards!==null&&r.directRedCards!==null)assert.equal(r.dismissals,r.secondYellowCards+r.directRedCards);
 }
 const rendered=refereeHistoryMarkup(fixture);assert(!/https?:|Calciotel|FootyMetrics|ESPN/.test(rendered));
}
assert.equal(data.fixtures.filter(f=>f.competition==='serie-a'&&f.refereeId).every(f=>f.rows.length===5),true);
console.log('OK storico arbitrale: cronologia, deduplica, null/zero, riepiloghi completi, espulsioni distinte, fonti interne; '+data.fixtures.filter(f=>f.rows.length===5).length+' fixture con cinque gare');
