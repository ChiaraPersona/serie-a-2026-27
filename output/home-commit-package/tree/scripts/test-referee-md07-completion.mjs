import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {refereeDashboardMarkup} from '../js/pages/reading-detail/referee-dashboard.mjs';
const require=createRequire(import.meta.url),{select,describe,profileStatistics}=require('./referee-stats/history-statistics.cjs');
const {parseOfstats,parseDatasport,parseDetail}=require('./referee-stats/history-parsers.cjs');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8')),hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const before=read('output/reports/referee-md07-completion/before.json'),renders=read('output/reports/referee-md07-completion/before-render.json'),source=read('data/sources/reading-referee-match-history.json'),db=read('data/normalized/referee-history/md07-2026-27.json'),history=read('data/generated/reading-referee-history.json');
const six=new Set(source.fixtureAnalyses.filter(e=>e.historyRef).map(e=>e.fixtureId));assert.equal(six.size,6);
assert.deepEqual(source.profiles,before.source.profiles);
for(const entry of before.source.fixtureAnalyses)assert.deepEqual(source.fixtureAnalyses.find(e=>e.fixtureId===entry.fixtureId),entry);
let unchanged=0;
for(const f of history.fixtures){
 const html=refereeDashboardMarkup({competition:f.competition,fixture:{id:f.fixtureId,date:f.cutoffDate},analysis:{}},f);
 if(!six.has(f.fixtureId)){assert.deepEqual(f,before.history.fixtures.find(e=>e.fixtureId===f.fixtureId));assert.equal(crypto.createHash('sha256').update(html).digest('hex'),renders[f.fixtureId]);unchanged++;}
 if(!/-md-07$/.test(f.fixtureId)||f.competition!=='serie-a')continue;
 assert.equal(f.rows.length,5);assert(f.rows.every(r=>r.date<f.cutoffDate));assert.deepEqual(f.rows.map(r=>r.date),f.rows.map(r=>r.date).sort().reverse());
 assert.equal((html.match(/data-referee-history-date=/g)||[]).length,5);assert(!/https?:|Calciotel|OFStats|AIPredict|Fonte:/.test(html));
 if(six.has(f.fixtureId)){
  assert.equal((html.match(/class="rf-comparison"/g)||[]).length,4);
  const ref=db.referees.find(r=>r.refereeId===f.refereeId),selected=select(ref.matches,{before:f.cutoffDate,last:5});assert.deepEqual(f.rows.map(r=>r.id),selected.map(r=>r.id));
  assert.deepEqual(f.analysis.recent,describe(selected).averages);assert.deepEqual(f.analysis.seasonal,describe(select(ref.matches,{before:f.cutoffDate,season:'2026/27'})).averages);
 }
}
assert.equal(unchanged,518);
let protectedCount=0;const externalPresentation=[];
for(const [file,oldHash] of Object.entries(before.hashes)){
 if(file.replaceAll('\\','/')==='scripts/build-site.js'){if(hash(file)!==oldHash)externalPresentation.push(file);continue;}
 assert.equal(hash(file),oldHash,file);protectedCount++;
}
assert.equal(db.referees.length,10);
const globalIds=new Set();let matches=0,quarantined=0;
for(const ref of db.referees){
 assert.equal(ref.coverage.status,'PARTIAL');assert.equal(ref.coverage.completenessCertified,false);assert(ref.matches.length>20);
 const ids=new Set();for(const m of [...ref.matches,...ref.quarantinedMatches]){
  assert(!ids.has(m.id));ids.add(m.id);assert(m.observations.length);assert(m.source.url&&m.source.retrievedAt);
  for(const key of ['yellowCards','dismissals','directRedCards','secondYellowCards','fouls','penaltiesAwarded'])assert(m[key]===null||(Number.isInteger(m[key])&&m[key]>=0));
  if(m.directRedCards!==null&&m.secondYellowCards!==null)assert.equal(m.dismissals,m.directRedCards+m.secondYellowCards);
  for(const metric of m.disputedMetrics)assert.equal(m[metric],null);
 }
 for(const m of ref.matches){assert(!globalIds.has(m.id));globalIds.add(m.id);}
 for(const m of ref.matches)if(m.season){const end=m.season==='2019/20'?'2020-09-01':(Number(m.season.slice(0,4))+1)+'-07-01';assert(m.date>=m.season.slice(0,4)+'-07-01'&&m.date<end,m.id);}
 const stats=profileStatistics(ref.matches,{before:history.fixtures.find(f=>f.fixtureId.endsWith('md-07')&&f.refereeId===ref.refereeId).cutoffDate});
 assert(stats.last5.matches<=5);assert(stats.last10.matches<=10);assert(stats.last20.matches<=20);
 for(const sample of [stats.all,stats.last5,stats.last10,stats.last20,stats.seasonal])for(const metric of Object.values(sample.averages)){assert(metric.n<=sample.matches);assert.equal(metric.average===null,metric.n===0);}
 matches+=ref.matches.length;quarantined+=ref.quarantinedMatches.length;
}
const fixture=(id,date,y,f,r)=>({id,date,season:'2026/27',competition:'Serie A',officialCompetition:true,yellowCards:y,fouls:f,dismissals:r});
const sample=[fixture('a','2026-09-01',0,10,0),fixture('b','2026-09-02',null,20,1),fixture('c','2026-09-03',2,null,null),{...fixture('d','2026-09-04',5,30,0),disputedMetrics:['yellowCards']},fixture('future','2026-10-18',99,99,99)];
const selected=select(sample,{before:'2026-10-18'}),stats=describe(selected);
assert.equal(stats.averages.yellowCards.n,2);assert.equal(stats.averages.yellowCards.average,1);assert.equal(stats.averages.fouls.n,3);assert.equal(stats.foulYellowRatio.n,1);assert.equal(stats.foulYellowRatio.foulsPerYellow,null);assert.deepEqual(stats.dismissalFrequency,{count:1,n:3,frequency:1/3});
assert.deepEqual(select([...sample,{...sample[0],id:'friendly',officialCompetition:false}],{before:'2026-10-18',last:1}).map(r=>r.id),['d']);
assert.equal(parseOfstats('<table><tr><td>01.09.2026</td><td><a href="/matches/view/a-b-2026-09-01">A 1:0 B</a></td><td>0</td><td>2</td><td>1</td></tr></table>')[0].dismissals,null);
assert.equal(parseDatasport('<tr>'+['Serie B 2026-2027','1','01/09/2026','A - B','1-0','3','1','2','0'].map(c=>`<td>${c}</td>`).join('')+'</tr>')[0].dismissals,3);
assert.equal(parseDetail('<html>no data</html>').verifiedCards,false);
const result={unchangedFixtureRecords:unchanged,protectedFiles:protectedCount,externalPresentationChanges:externalPresentation,archivedMatches:matches,quarantinedMatches:quarantined,readings:10,rowsPerReading:5};
fs.writeFileSync('output/reports/referee-md07-completion/integrity.json',JSON.stringify(result,null,2)+'\n');console.log('PASS '+JSON.stringify(result));
