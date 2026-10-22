const assert=require('node:assert/strict'),fs=require('node:fs');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const results=read('data/normalized/champions-league-2026-27.json');
const snapshot=read('data/sources/schedina-champions-md01-snapshot.json');
const settled=read('data/normalized/schedina-champions-md01.json');
const {settle}=require('./settle-champions-schedina.js');
const source=read('data/sources/champions-results-md01-2026-27.json');
assert.equal(source.fixtures.filter(f=>f.statistics).length,18);
for(const report of source.fixtures)assert.deepEqual(results.fixtures.find(f=>f.id===report.fixtureId).matchReport,report);
for(const slip of settled.slips)for(const leg of slip.legs)assert.deepEqual(leg.settlement,settle(leg,source.fixtures.find(f=>f.fixtureId===leg.matchId)),'Settlement must match latest evidence');
assert.equal(results.fixtures.filter(f=>f.status==='finished').length,18);
assert.equal(results.fixtures.filter(f=>f.status==='scheduled'&&f.score===null).length,126);
assert.equal(results.fixtures.reduce((n,f)=>n+(f.score?.home||0)+(f.score?.away||0),0),69);
for(let i=0;i<snapshot.slips.length;i++){
  const original=snapshot.slips[i],updated=settled.slips[i];
  const {settlement,...rest}=updated;
  rest.legs=rest.legs.map(({settlement,...leg})=>leg);
  assert.deepEqual(rest,original,'Original selections/odds/probabilities must remain unchanged');
}
const report={score:{home:0,away:0},scorers:{home:[],away:[]},sourceUrl:'https://example.com'};
assert.equal(settle({marketCode:'28576',player:'Test',selection:'SI'},report).status,'pending');
assert.equal(settle({marketCode:'28231',player:'Test',selection:'SI'},report).status,'pending');
assert.equal(settle({marketCode:'30394',selection:'0-2/0-2'},report).status,'won');
assert.equal(settle({marketCode:'7989',selection:'OVER',variantName:'U/O 1.5'},report).status,'lost');
assert.equal(settle({marketCode:'3',selection:'X'},report).status,'won');
assert.equal(Object.values(settled.settlementSummary).reduce((a,b)=>a+b),52);
console.log('OK: 18 risultati, 126 gare future, archivio di 52 giocate invariato, esiti e dati mancanti.');

assert.deepEqual(settled.settlementSummary,{won:31,lost:21,pending:0});
