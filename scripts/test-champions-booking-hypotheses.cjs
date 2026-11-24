const assert=require('node:assert/strict'),fs=require('node:fs');
const {generate}=require('./build-champions-booking-hypotheses.cjs');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const input={calendar:read('data/normalized/champions-league-2026-27.json'),squads:read('data/normalized/champions-registered-squads-2026-27.json'),references:read('data/generated/champions-lineup-references.json'),asOf:'2026-11-19T16:00:00.000Z',matchday:5};
const before=JSON.stringify(input),output=generate(input);
assert.equal(output.fixtures.length,18);
for(const fixture of output.fixtures){
 assert.equal(fixture.likelyBooked.length,5,fixture.fixtureId);
 assert.equal(new Set(fixture.likelyBooked.map(p=>p.teamId)).size,2);
 const allowed=fixture.lineupReferences.flatMap(r=>input.references.records.find(x=>x.fixtureId===r.fixtureId&&x.date===r.date&&x.teamId.replace('bod-glimt','bodo-glimt')===r.teamId.replace('bod-glimt','bodo-glimt'))?.players.map(p=>p.id)||[]);
 for(const p of fixture.likelyBooked){assert(allowed.includes(p.playerId));assert.equal(p.calibratedProbability,null);assert.equal(p.firstBookedProbability,null);assert.equal(p.operationalSelection,false);assert.equal(p.riskScoreSemantics,'COMPARATIVE_HEURISTIC_NOT_PROBABILITY');assert.notEqual(p.role,'Portiere');}
}
assert.equal(JSON.stringify(input),before,'Inputs and historical XIs remain intact');
const future=structuredClone(input);future.references.records=future.references.records.map(r=>({...r,date:'2026-11-23'}));
assert(generate(future).fixtures.every(f=>f.likelyBooked.length===0),'Unobserved future XIs cannot enter preliminary rankings');
const ended=structuredClone(input);ended.calendar.fixtures.forEach(f=>f.status='finished');assert.equal(generate(ended).fixtures.length,0,'No retrospective candidates');
const official=read('data/sources/champions-official-formations-md05-2026-27.json');
const fixtureId='ucl-2026-27-md05-02';
const officialAsOf=official.teams.filter(t=>t.fixtureId===fixtureId).map(t=>t.lineupEvidence?.consultedAt||official.source.consultedAt).sort().at(-1);
const refreshed=generate({...input,asOf:officialAsOf,officialLineups:official,fixtureIds:[fixtureId]}).fixtures.find(f=>f.fixtureId===fixtureId);
const starters=new Set(official.teams.filter(t=>t.fixtureId===fixtureId).flatMap(t=>t.starters.map(p=>p.playerId)));
assert.equal(refreshed.status,'OFFICIAL_LINEUP_HYPOTHESIS');
assert.equal(refreshed.likelyBooked.length,5);
assert(refreshed.likelyBooked.every(p=>starters.has(p.playerId)&&p.lineupStatus==='official'));
assert(refreshed.likelyBooked.every(p=>p.calibratedProbability===null&&p.operationalSelection===false));
assert.equal(generate({...input,officialLineups:official,fixtureIds:[fixtureId]}).fixtures[0].status,'REFERENCE_LINEUP_HYPOTHESIS','Future official evidence cannot leak into earlier rankings');
console.log('PASS 18 fixture-scoped hypotheses, exact starter IDs, both teams, no probabilities/operational selections, strict cutoff and immutable history');
