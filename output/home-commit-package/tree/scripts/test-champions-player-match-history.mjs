import fs from 'node:fs';
import assert from 'node:assert/strict';
import {recentPlayerMatches,playerHistoryMarkup} from '../js/pages/reading-detail/champions-player-history.mjs';
const history=JSON.parse(fs.readFileSync('data/generated/champions-player-match-history.json'));
let appearances=0;
for(const rows of Object.values(history.players)){
 assert.equal(new Set(rows.map(r=>r.matchId)).size,rows.length);
 for(const r of rows){
  assert(r.opponent&&r.opponentId&&r.date&&r.availableAt);
  assert(Number.isFinite(r.minutes)&&r.minutes>0&&r.minutes<=120);
  assert(Number.isFinite(r.shots)&&Number.isFinite(r.sot)&&r.shots>=r.sot&&r.sot>=0);
  assert(['home','away'].includes(r.venue));appearances++;
 }
}
assert.equal(appearances,history.summary.appearances);
const real=history.players['real-madrid:kylian-mbappe'];
assert(real.some(r=>r.date==='2026-08-22'&&r.opponent==='Espanyol'&&r.shots===10&&r.sot===3));
const recent=recentPlayerMatches(history,'real-madrid','kylian-mbappe','2026-11-04');
assert.equal(recent.length,5);assert(recent.every(r=>r.date<'2026-11-04'));
const sample={players:{'t:p':[
 {matchId:'past',date:'2026-01-01',availableAt:'2026-01-02T00:00:00Z',opponent:'<script>',minutes:1,shots:0,sot:0},
 {matchId:'late',date:'2026-01-01',availableAt:'2026-01-10T00:00:00Z'},
 {matchId:'future',date:'2026-01-05',availableAt:'2026-01-02T00:00:00Z'}
]}};
assert.deepEqual(recentPlayerMatches(sample,'t','p','2026-01-05').map(r=>r.matchId),['past']);
assert.deepEqual(recentPlayerMatches(history,'missing','missing','2026-11-04'),[]);
assert(playerHistoryMarkup([]).includes('Serie individuale per gara non disponibile'));
const html=playerHistoryMarkup(recentPlayerMatches(sample,'t','p','2026-01-05'));
assert(html.includes('&lt;script&gt;')&&html.includes('0 tiri · 0 SOT'));
assert(!/href=|FotMob|sourceUrl|availableAt/.test(html));
console.log(JSON.stringify({players:history.summary.players,appearances,latestFive:true,cutoff:true,missingAndZero:true}));
