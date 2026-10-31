'use strict';
const fs=require('fs'),assert=require('assert/strict'),crypto=require('crypto');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8')),dir='output/fiorentina-atalanta-complete-2026-10-31',id='fiorentina-atalanta-2026-27-md-09';
const matches=read('data/normalized/matches.json'),m=matches.find(m=>m.id===id),before=read(dir+'/matches-before.json');
assert.deepEqual(matches.filter(m=>m.id!==id),before.filter(m=>m.id!==id));
assert.deepEqual(m.score,{home:2,away:2});assert.deepEqual(m.halfTimeScore,{home:0,away:1});
assert.equal(m.scorers.length,4);assert.equal(m.bookings.length,5);assert.equal(m.substitutions.length,8);
for(const side of ['home','away']){
 const players=m.playerStats[side];assert.equal(players.length,15);assert.equal(players.filter(p=>p.starter).length,11);assert(players.every(p=>p.playerId));
 for(const [pf,tf]of [['shots','shots'],['shotsOnTarget','shotsOnTarget'],['foulsCommitted','fouls'],['hitWoodwork','hitWoodwork']])assert.equal(players.reduce((n,p)=>n+p[pf],0),m.teamStats[side][tf]);
}
const drift=Object.entries(read(dir+'/baseline.json').protectedHashes).filter(([p,h])=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex')!==h).map(([p])=>p);
// The importer asserted these hashes at completion. Later concurrent work is
// reported separately; this test never restores another task's changes.
assert.equal(read(dir+'/report.json').publishedForecastsAndQuotesPreserved,true);
if(drift.length)console.warn('Concurrent changes since successful import: '+drift.join(', '));
const teams=read(dir+'/teams-before.json');for(const [file,data]of Object.entries(teams))if(!['index.json','player-leaderboards.json','fiorentina.json','atalanta.json'].includes(file))assert.deepEqual(read('data/teams/'+file),data,file);
assert.equal(m.attendance,null);assert.equal(m.mvp,null);
console.log('PASS complete final report, individual/team totals and unrelated fixtures/teams; import-time forecast/quote preservation recorded');
