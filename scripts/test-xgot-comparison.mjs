import assert from 'node:assert/strict';
import {xgotComparisonMarkup,scenarioMarkup} from '../js/pages/reading-detail/scenario.mjs';
const model={home:{id:'home',name:'Casa'},away:{id:'away',name:'Ospite'},fixture:{date:'2027-01-10'}};
const html=xgotComparisonMarkup(model,{teamMatches:{home:[
 {date:'2026-11-01',xgot:0},
 {date:'2027-01-10',xgot:50},
 {date:'2027-01-11',xgot:80},
 {date:'2026-06-30',xgot:90}
]}});
assert(html.includes('Casa 0; Ospite N/D'),'Observed zero and missing data must remain distinct');
assert(!html.includes('Campione precedente alla partita'),'The removed coverage caption must not appear');
assert(!html.includes('width:100%'),'Excluded future observations must not inflate the bars');
const initial=scenarioMarkup(model);
assert.equal((initial.match(/data-statistic="xgot"/g)||[]).length,1);
assert(initial.indexOf('data-statistic="shotsOnTarget"')<initial.indexOf('data-statistic="xgot"'));
assert(initial.indexOf('data-statistic="xgot"')<initial.indexOf('data-statistic="corners"'));
console.log('OK xGOT comparison: shared bar row, observed zero/missing distinction, strict date cutoff and cross-year season boundary');

// Real calendar branding stores canonical IDs in slug; every Champions side must resolve.
const {readFileSync}=await import('node:fs');
const {adaptChampionsReading}=await import('../js/pages/reading-detail/champions-adapter.mjs');
const read=file=>JSON.parse(readFileSync(new URL('../'+file,import.meta.url)));
const calendar=read('data/normalized/champions-league-2026-27.json');
const branding=new Map(calendar.teamBranding.map(t=>[t.team,t]));
const stats=read('data/generated/xgot-statistics.json');
const fixtures=read('data/generated/champions-shared-scenarios.json').fixtures.filter(f=>f.matchday===5);
const covered=new Set();
for(const fixture of fixtures){
 const model=adaptChampionsReading({fixture,calendarFixture:calendar.fixtures.find(f=>f.id===fixture.fixtureId),branding});
 for(const side of [model.home,model.away]){assert(side.id);assert(stats.teamMatches[side.id]?.some(r=>r.date>='2026-07-01'&&r.date<fixture.date));covered.add(side.id)}
 assert.equal((xgotComparisonMarkup(model,stats).match(/data-available="true"/g)||[]).length,2,fixture.fixtureId);
}
assert.equal(covered.size,36);
console.log('OK Champions: 36 canonical team IDs and observed xGOT before each MD5 fixture');
