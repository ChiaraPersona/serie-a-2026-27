'use strict';
const {technicalContext,publicContinuity}=require('./technical-context.cjs');
const zones=[['box-left','Area · sinistra'],['box-central','Area · centro'],['box-right','Area · destra'],
 ['outside-left','Fuori area · sinistra'],['outside-central','Fuori area · centro'],['outside-right','Fuori area · destra']];
function spatialMatchup(fixture,fixtures,dataset,technicalDataset=null){
 const history=fixtures.filter(m=>m.status==='finished'&&m.date<fixture.date&&m.id!==fixture.id);
 const indexed=new Map((dataset?.matches||[]).map(m=>[m.fixtureId,m]));
 const teamProfile=teamId=>{
  let expected=history.filter(m=>[m.homeTeam,m.awayTeam].includes(teamId));
  const allHistoricalMatches=expected.length;
  const context=technicalDataset?technicalContext(teamId,fixture.date,technicalDataset):null;
  let historyScope='current-season';
  if(context?.coachId&&context.changeObserved&&!context.stale){expected=expected.filter(f=>f.date>=context.cycleStart);historyScope='observed-coach-cycle';}
  else if(context?.status==='unknown'){expected=expected.slice().sort((a,b)=>b.date.localeCompare(a.date)).slice(0,5);historyScope='recent-observed-only';}
  const cycleIds=new Set(context?.cycleFixtureIds||[]);
  const reports=expected.flatMap(f=>{
   const m=indexed.get(f.id);
   const current=m?.usable&&m.date===f.date&&m.homeTeam===f.homeTeam&&m.awayTeam===f.awayTeam&&
    ['home','away'].every(side=>{const s=m.sides.find(s=>s.teamId===f[side+'Team']);
     return s&&s.expectedGoals===f.score?.[side]&&s.canonicalShots===f.teamStats?.[side]?.shots;});
   return current&&(historyScope!=='observed-coach-cycle'||cycleIds.has(f.id))?[m]:[];
  });
  const events=reports.flatMap(m=>m.events);
  const totals=against=>{
   const attempts=events.filter(e=>!e.ownGoal&&!e.penalty&&(against?e.teamId!==teamId:e.teamId===teamId));
   const mapped=attempts.filter(e=>e.usable&&e.position);
   const counts=zones.map(([key,label])=>({key,label,shots:mapped.filter(e=>e.zone===key).length,
    goals:mapped.filter(e=>e.zone===key&&e.isGoal).length}));
   const ownGoals=events.filter(e=>e.ownGoal&&e.usable&&(against?e.scoringTeamId!==teamId:e.scoringTeamId===teamId)).length;
   const penalties=events.filter(e=>e.penalty&&!e.ownGoal&&(against?e.teamId!==teamId:e.teamId===teamId));
   return {totalShots:attempts.length,mappedShots:mapped.length,excludedShots:attempts.length-mapped.length,
    goals:mapped.filter(e=>e.isGoal).length,penalties:penalties.length,penaltyGoals:penalties.filter(e=>e.isGoal&&e.usable).length,
    ownGoals,zones:counts,points:mapped.map(e=>({id:e.id,fixtureId:e.fixtureId,playerId:e.playerId,playerName:e.playerName,
     minute:e.canonicalMinute??null,isGoal:e.isGoal,x:e.position.x,y:e.position.y})),xg:null};
  };
  return {teamId,expectedMatches:expected.length,matches:reports.length,excludedMatches:expected.length-reports.length,
   ...(context?{continuity:publicContinuity(context),historyScope,outOfCycleMatches:allHistoricalMatches-expected.length}:{}),
   fixtureIds:reports.map(m=>m.fixtureId),for:totals(false),against:totals(true)};
 };
 const home=teamProfile(fixture.homeTeam),away=teamProfile(fixture.awayTeam);
 const directions=[[home,away],[away,home]].map(([attack,defence])=>{
  const rows=zones.map(([key,label])=>{
   const a=attack.for.zones.find(z=>z.key===key),d=defence.against.zones.find(z=>z.key===key);
   return {key,label,shotsFor:a.shots,goalsFor:a.goals,shotsAgainst:d.shots,goalsAgainst:d.goals,
    shareFor:attack.for.mappedShots?a.shots/attack.for.mappedShots:null,
    shareAgainst:defence.against.mappedShots?d.shots/defence.against.mappedShots:null};
  });
  // Descriptive ordering only. No prediction, selection, probability or EV uses this artifact.
  const continuityLimited=!!technicalDataset&&[attack,defence].some(t=>['transition','unknown'].includes(t.continuity.status));
  const enough=attack.matches>=5&&defence.matches>=5&&!continuityLimited;
  const focus=enough?rows.filter(r=>r.shotsFor>=5&&r.shotsAgainst>=5).sort((a,b)=>
   Math.min(b.shareFor,b.shareAgainst)-Math.min(a.shareFor,a.shareAgainst))[0]||null:null;
  return {attackingTeamId:attack.teamId,defendingTeamId:defence.teamId,rows,focusKey:focus?.key||null,
   ...(technicalDataset?{continuityLimited,transition:[attack,defence].some(t=>t.continuity.status==='transition')}:{}),
   sampleLimited:!enough||!focus,partialCoverage:!!(attack.excludedMatches||defence.excludedMatches||attack.for.excludedShots||defence.against.excludedShots)};
 });
 return {schemaVersion:1,competition:'serie-a',fixtureId:fixture.id,cutoffExclusive:fixture.date,
  teams:[home,away],directions,xg:null,minimumMatches:5,minimumShotsPerZone:5};
}
module.exports={spatialMatchup,zones};
