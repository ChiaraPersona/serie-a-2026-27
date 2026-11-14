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
