'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {apply,featureVector,outcomeRows}=require('./model.cjs');
const {BASE,manifest,capture,evaluate}=require('./prospective.cjs');
const root=path.resolve(__dirname,'../../..');
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} != ${b}`);
const vector={fixtureId:'test',teams:[{teamId:'a'}],rows:[
 {playerId:'p1',teamId:'a',status:'AVAILABLE',shots:4,sot:2,signal:.2},
 {playerId:'p2',teamId:'a',status:'AVAILABLE',shots:2,sot:1,signal:-.2},
 {playerId:'p3',teamId:'a',status:'ABSTAIN',shots:1,sot:.2,signal:null}]};
for(const beta of [-1,0,1]){
 const result=apply(vector,beta);near(result.conservation[0].baselineShots,result.conservation[0].adjustedShots);
 near(result.conservation[0].baselineSot,result.conservation[0].adjustedSot);
 for(const p of result.rows){assert.ok(p.adjustedSot<=p.adjustedShots);assert.ok(p.adjustedShots>=.9*p.shots-1e-9&&p.adjustedShots<=1.1*p.shots+1e-9);
  assert.ok(p.adjustedSot>=.9*p.sot-1e-9&&p.adjustedSot<=1.1*p.sot+1e-9);assert.equal(p.duoProbability,null);assert.equal(p.ev,null);
  if(beta===0||p.status==='ABSTAIN'){assert.equal(p.adjustedShots,p.shots);assert.equal(p.adjustedSot,p.sot);}}
}
assert.ok(apply(vector,1).rows[0].adjustedShots>4);
const missing=structuredClone(vector);missing.rows[2].shots=null;
assert.ok(apply(missing,1).rows.every(p=>!p.applied));assert.equal(apply(missing,1).rows[2].adjustedShots,null);
assert.throws(()=>apply(vector,2),/INVALID_COEFFICIENT/);
assert.throws(()=>featureVector({},[],{}, {},[vector.rows[0],vector.rows[0]],'2026-01-01'),/DUPLICATE/);
const actual=outcomeRows({homeTeam:'a',awayTeam:'b',didNotPlay:{home:[{playerId:'p2'}]}},vector.rows);
assert.equal(actual[0].actual,null);assert.equal(actual[1].actual.participation,'EXPLICIT_DNP');assert.equal(actual[1].actual.shots,0);
const m=manifest(root);assert.ok(m.entries.length>0);
for(const e of m.entries){const s=JSON.parse(fs.readFileSync(path.join(root,e.file),'utf8'));
 assert.equal(s.production,false);assert.equal(s.fitted.beta,0);
 for(const team of s.vector.teams)assert.ok(!team.fixtureIds.includes(s.fixture.id));
 const matches=JSON.parse(fs.readFileSync(path.join(root,'data/normalized/matches.json'),'utf8'));
 for(const id of s.vector.leagueFixtureIds){const f=matches.find(f=>f.id===id);assert.ok(f.matchday<s.fixture.matchday&&f.date<s.vector.cutoffExclusive);}
 for(const c of s.opportunityHypothesis.conservation)if(c.complete){near(c.baselineShots,c.adjustedShots);near(c.baselineSot,c.adjustedSot);}
 const before=fs.readFileSync(path.join(root,BASE,'manifest.json'),'utf8');
 const blocked=capture(root,{matchId:e.fixtureId,clock:()=>new Date('2099-01-01T00:00:00Z')});assert.equal(blocked.captures[0].status,'BLOCKED');
 assert.equal(fs.readFileSync(path.join(root,BASE,'manifest.json'),'utf8'),before);
}
assert.equal(evaluate(root).production,false);
console.log('Player spatial: allocation, bounds, missing values, DUO separation, chronology, immutable snapshots and late capture checks passed.');
