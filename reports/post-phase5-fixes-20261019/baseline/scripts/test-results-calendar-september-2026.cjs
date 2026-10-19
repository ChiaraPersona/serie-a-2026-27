const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const matches=read('data/normalized/matches.json');
assert.equal(matches.length,380);
assert.equal(matches.filter(m=>m.status==='finished').length,30);
assert.equal(matches.filter(m=>m.dateStatus==='confirmed').length,120);
assert(matches.filter(m=>m.matchday>12).every(m=>m.date===null&&m.kickoff===null));
for(const md of [4,6,7,8,9,10,11,12])assert.equal(matches.filter(m=>m.matchday===md&&m.dateStatus==='confirmed'&&!m.scheduleAlternatives).length,10);
for(const [id,h,a] of [['cagliari-lecce',1,0],['udinese-lazio',1,2]]){
  const m=matches.find(m=>m.id===`${id}-2026-27-md-03`);
  assert.deepEqual(m.score,{home:h,away:a});
  assert.equal(m.scorers.length,h+a);
  assert.equal(m.resultCoverage.playerStats,'unavailable');
  assert.deepEqual(m.playerStats,{home:[],away:[]});
}
const cup=read('data/normalized/coppa-italia-2026-27.json');
assert.equal(cup.matches.length,43);
assert.equal(cup.matches.filter(m=>m.status==='finished').length,26);
assert.equal(cup.matches.find(m=>m.id==='oct-2').away,'Palermo');
assert.equal(cup.matches.find(m=>m.id==='oct-5').away,'Verona');
assert(cup.matches.filter(m=>m.stage==='round-of-16').every(m=>!m.date&&!m.kickoff));
assert.equal(cup.matches.find(m=>m.id==='r16-1').date,'2026-09-15');
assert.equal(cup.matches.find(m=>m.id==='r16-8').kickoff,'21:00');
console.log('OK: 30 risultati Serie A, 120 orari ufficiali, 26 risultati Coppa e ottavi aggiornati.');
