'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const {spatialMatchup}=require('./shot-events/matchup.cjs');
const {attackingCoordinates,zoneFor,minuteCompatible}=require('./shot-events/normalize.cjs');
const read=f=>JSON.parse(fs.readFileSync(f,'utf8'));
async function main(){
 const dataset=read('data/normalized/serie-a-shot-events-2026-27.json'),fixtures=read('data/normalized/matches.json').filter(f=>f.competition==='serie-a');
 const byId=new Map(fixtures.map(f=>[f.id,f]));
 assert.deepEqual(attackingCoordinates({x:8800,y:3000},true),{x:88,y:50});
 assert.deepEqual(attackingCoordinates({x:1200,y:3000},false),{x:88,y:50});
 assert.equal(attackingCoordinates({x:0,y:6001},true),null);
 assert.equal(attackingCoordinates({x:null,y:3000},true),null);
 assert.equal(zoneFor({x:90,y:50}),'box-central');
 assert.equal(zoneFor({x:90,y:5}),'outside-left');
 assert(minuteCompatible({minute:'90+3'},{clock:{minute:90,extraMinute:3}}));
 assert(!minuteCompatible({minute:67},{clock:{minute:65,second:48}}));
 assert.equal(dataset.matches.length,fixtures.filter(f=>f.status==='finished').length);
 assert.equal(dataset.summary.goals,274);
 assert.equal(dataset.summary.excluded,8);
 const ignored=dataset.matches.flatMap(m=>m.excluded);
 assert.equal(ignored.filter(e=>e.reason==='empty-duplicate').length,1);
 assert.equal(ignored.filter(e=>e.reason==='keeper-save-not-attempt').length,7);
 assert.equal(dataset.matches.flatMap(m=>m.events).filter(e=>e.isGoal&&!e.usable).length,6);
 for(const m of dataset.matches){
  assert(m.scoreMatches&&m.dateMatches&&m.seasonMatches,m.fixtureId);
  for(const e of m.events){
   assert.equal(e.xg,null);
   if(e.position)assert(e.position.x>=0&&e.position.x<=100&&e.position.y>=0&&e.position.y<=100);
   if(e.position&&e.penalty){assert.equal(e.position.x,88);assert.equal(e.position.y,50);}
   if(e.isGoal&&e.usable)assert.equal(e.goalStatus,'reconciled');
  }
 }
 const bad=dataset.matches.filter(m=>!m.usable).map(m=>m.fixtureId);
 assert.deepEqual(bad.sort(),['cagliari-inter-2026-27-md-02','como-parma-2026-27-md-04','sassuolo-juventus-2026-27-md-04'].sort());
 for(const fixture of fixtures){
  const technical=read('data/normalized/serie-a-technical-context-2026-27.json');
  const data=spatialMatchup(fixture,fixtures,dataset,technical);
  const projection=read(`data/generated/readings/matches/${fixture.id}.json`).artifacts['data/generated/reading-spatial-matchup.json'];
  assert.deepEqual(projection,data,'stale projection '+fixture.id);
  const serialized=JSON.stringify(data);assert(!/provider|sourceUrl|StatMuse|originalCoordinates|sha256/.test(serialized));
  assert.equal(data.xg,null);
  for(const team of data.teams){
   for(const id of team.fixtureIds){assert.notEqual(id,fixture.id);assert(byId.get(id).date<fixture.date);assert(!bad.includes(id));}
   for(const role of ['for','against']){
    const p=team[role];assert.equal(p.points.length,p.mappedShots);
    assert.equal(p.zones.reduce((n,z)=>n+z.shots,0),p.mappedShots);
    assert.equal(p.zones.reduce((n,z)=>n+z.goals,0),p.goals);
    for(const point of p.points){
     const event=dataset.matches.find(m=>m.fixtureId===point.fixtureId).events.find(e=>e.id===point.id);
     assert(event.usable&&!event.ownGoal&&!event.penalty);
     assert.equal(role==='for'?event.teamId===team.teamId:event.teamId!==team.teamId,true);
    }
   }
  }
  if(fixture.matchday===1)assert(data.teams.every(t=>t.matches===0)&&data.directions.every(d=>d.sampleLimited));
 }
 const chosen=fixtures.find(f=>f.id==='frosinone-lecce-2026-27-md-09');
 const data=spatialMatchup(chosen,fixtures,dataset);
 const withFuture=spatialMatchup(chosen,fixtures,{...dataset,matches:[...dataset.matches,{...dataset.matches[0],fixtureId:chosen.id,date:chosen.date}]});
 assert.deepEqual(withFuture,data,'same fixture leaked');
 const staleFixtures=fixtures.map(f=>f.id===data.teams[0].fixtureIds[0]?{...f,score:{home:999,away:999}}:f);
 const stale=spatialMatchup(chosen,staleFixtures,dataset);
 assert.equal(stale.teams[0].matches,data.teams[0].matches-1,'stale result was used');
 assert(spatialMatchup(chosen,fixtures,null).directions.every(d=>d.sampleLimited));
 const {spatialMarkup,spatialNarrative}=await import('../js/pages/reading-detail/spatial-matchup.mjs');
 const model={home:{id:chosen.homeTeam,name:'<img src=x onerror=alert(1)>'},away:{id:chosen.awayTeam,name:'Lecce'}};
 const html=spatialMarkup(model,data);
 assert(!html.includes('<img src=x'));assert(html.includes('&lt;img'));
 assert(html.includes('xG per zona: N/D'));assert(html.includes('Copertura e limiti'));
 assert(spatialNarrative(model,data,data.directions[0]).length>0);
 console.log(`OK: ${fixtures.length} cutoff/projection checks; shot totals, quarantine, goalkeeper saves, duplicate, own goals, penalties, null xG, escaping.`);
}
main().catch(e=>{console.error(e);process.exitCode=1});
