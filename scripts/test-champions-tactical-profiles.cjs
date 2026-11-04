const assert=require('assert/strict'),fs=require('fs');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const calendar=read('data/normalized/champions-league-2026-27.json');
const data=read('data/generated/champions-tactical-profiles-2026-27.json');
assert(data.informationalOnly);assert.equal(new Set(data.fixtures.flatMap(f=>f.teams.map(t=>t.teamId))).size,36);
for(const fixture of data.fixtures){
 assert.equal(fixture.teams.length,2);
 for(const team of fixture.teams)for(const sample of team.samples){
  if(sample.to)assert(sample.to<fixture.date);
  for(const metric of Object.values(sample.metrics)){assert(metric.n<=sample.matches);assert(metric.n?Number.isFinite(metric.mean):metric.mean===null);}
 }
}
for(const fixture of data.fixtures.filter(f=>calendar.fixtures.find(c=>c.id===f.fixtureId).matchday===4))for(const team of fixture.teams){
 const sample=team.samples.find(s=>s.id==='champions-current');
 const previous=calendar.fixtures.filter(f=>f.status==='finished'&&f.date<fixture.date&&[f.homeTeam,f.awayTeam].includes(team.team));
 assert.equal(sample.matches,previous.length,team.team+': duplicated or missing Champions game');
 const values=previous.map(f=>f.matchReport?.observedTeamStatistics?.[f.homeTeam===team.team?'home':'away']?.possessionPct).filter(Number.isFinite);
 assert.equal(sample.metrics.possessionPct.n,values.length);
 if(values.length)assert(Math.abs(sample.metrics.possessionPct.mean-values.reduce((n,v)=>n+v,0)/values.length)<1e-9,team.team+': report mismatch');
}
console.log('PASS: 36 descriptive tactical profiles; dated separate samples, report reconciliation, no duplicate Champions matches, null preserved');
