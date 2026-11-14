'use strict';
const {normalizePlayerName}=require('../player-identity');
const aliases=new Map([['Francesco Esposito','Pio Esposito'],['Yann Aurel Bisseck','Yann Bisseck'],['Nicolás Paz','Nico Paz']]);
// Explicit aliases already used by import-statmuse-result.js; no surname joins.
const shotTypes=new Set(['goal','shotSaved','shotMissed']);
const validCoordinates=c=>!!c&&Number.isFinite(c.x)&&Number.isFinite(c.y)&&c.x>=0&&c.x<=10000&&c.y>=0&&c.y<=6000;
function attackingCoordinates(c,home){
 if(!validCoordinates(c))return null;
 return {x:home?c.x/100:100-c.x/100,y:home?c.y/60:100-c.y/60};
}
function zoneFor(p){
 if(!p)return null;
 const area=p.x>=100-100/6&&p.y>=100/6&&p.y<=100-100/6;
 const lane=p.y<100/3?'left':p.y>200/3?'right':'central';
 return `${area?'box':'outside'}-${lane}`;
}
function minuteCompatible(s,e){
 const clock=e.clock||{},base=clock.minute,extra=clock.extraMinute||0;
 if(!Number.isFinite(base))return false;
 if(typeof s.minute==='string'&&s.minute.includes('+'))return s.minute===`${base}+${extra}`;
 if(extra>0)return s.minute===base||s.minute===base+extra||s.sourceClock?.minute===base&&s.sourceClock?.extraMinute===extra;
 return Number(s.minute)===base+1||clock.second===0&&Number(s.minute)===base;
}
function normalizeMatch({raw,result,fixture,rosters,identities}){
 const teams={home:fixture.homeTeam,away:fixture.awayTeam},game=raw.gameData;
 const teamByProvider=new Map(['home','away'].map(side=>[String(game[side+'Team'].teamId),teams[side]]));
 const resolve=(team,name)=>{
  if(!name)return null;
  const identity=identities.resolve(team,name)||identities.resolve(team,aliases.get(name));
  if(identity)return {id:identity.playerId,name:identity.canonicalName};
  const names=new Set([name,aliases.get(name)].filter(Boolean).map(normalizePlayerName));
  const rows=[...(rosters[team]?.squad||[]).map(p=>({id:p.id,name:p.name})),
   ...(result.playerStats?.[team===teams.home?'home':'away']||[]).filter(p=>p.playerId).map(p=>({id:p.playerId,name:p.player}))];
  const exact=rows.filter(p=>names.has(normalizePlayerName(p.name))),ids=new Set(exact.map(p=>p.id));
  return ids.size===1?exact[0]:null;
 };
 const rawShots=raw.playByPlay.events.filter(e=>shotTypes.has(e.type)),excluded=[],events=[];
 const emptyDuplicates=rawShots.filter(e=>!e.coordinates&&rawShots.filter(o=>o!==e&&o.coordinates&&o.type===e.type&&
  o.teamId===e.teamId&&o.playerId===e.playerId&&o.period===e.period&&o.clock?.minute===e.clock?.minute&&!!o.isOwnGoal===!!e.isOwnGoal).length===1);
 for(const e of rawShots){
  const actor=raw.players[String(e.playerId)],teamId=teamByProvider.get(String(e.teamId));
  if(emptyDuplicates.includes(e)){excluded.push({reason:'empty-duplicate',event:e});continue;}
  // Some feeds encode the keeper's save as an additional shotSaved event.
  // Exclude only when its individual shot total is explicitly zero.
  const side=teamId===teams.home?'home':'away',t=game[side+'Team'];
  const playerStats=t.stats.player.statsLookup;
  const split=t.stats.player.splits.flatMap(g=>g.splits||[]).find(p=>String(p.playerId)===String(e.playerId));
  const playerShots=split?playerStats[split.statsLookupKey]?.Shots?.value:null;
  if(e.type==='shotSaved'&&!e.coordinates&&actor?.position==='GOALKEEPER'&&playerShots===0){excluded.push({reason:'keeper-save-not-attempt',event:e});continue;}
  const identity=resolve(teamId,actor?.longName),ownGoal=e.isOwnGoal===true;
  const scoringTeamId=ownGoal?(teamId===teams.home?teams.away:teams.home):teamId;
  const p=attackingCoordinates(e.coordinates,teamId===teams.home);
  const canonical=e.type==='goal'?(result.scorers||[]).filter(s=>identity&&s.playerId===identity.id&&
   (s.team===teamId||ownGoal&&s.team===scoringTeamId)&&!!s.ownGoal===ownGoal&&minuteCompatible(s,e)):[];
  events.push({id:`${fixture.id}:${e.type}:${e.eventSequence}`,fixtureId:fixture.id,teamId,scoringTeamId: e.type==='goal'?scoringTeamId:null,
   playerId:identity?.id||null,playerName:identity?.name||null,providerPlayerId:String(e.playerId),providerPlayerName:actor?.longName||null,
   type:e.type,isGoal:e.type==='goal',ownGoal,penalty:e.shotContext==='penalty',phase:e.shotContext==='penalty'?'penalty':'unspecified',
   clock:e.clock,period:e.period,canonicalMinute:canonical.length===1?canonical[0].minute:null,
   goalStatus:e.type!=='goal'?null:canonical.length===1?'reconciled':identity?'canonical-scorer-conflict':'unresolved-player',
   originalCoordinates:e.coordinates||null,position:p,zone:zoneFor(p),xg:null,
   usable:!!teamId&&!!p&&(e.type!=='goal'||canonical.length===1)});
 }
 const sides=['home','away'].map(side=>{
  const t=game[side+'Team'],stats=t.stats.team.statsLookup[t.stats.team.statsLookupKey],teamId=teams[side];
  const shots=events.filter(e=>e.teamId===teamId&&!e.ownGoal);
  const goals=events.filter(e=>e.isGoal&&e.scoringTeamId===teamId);
  const expectedShots=stats.Shots?.value??null,expectedGoals=result.score[side];
  const canonicalShots=result.teamStats?.[side]?.shots??null;
  return {teamId,expectedShots,canonicalShots,shotEvents:shots.length,coordinateShots:shots.filter(e=>e.position).length,
   usableShots:shots.filter(e=>e.usable).length,expectedGoals,goalEvents:goals.length,
   shotsReconciled:expectedShots!==null&&expectedShots===shots.length&&canonicalShots===expectedShots,
   goalsReconciled:goals.length===expectedGoals};
 });
 const scoreMatches=game.homeTeam.score===result.score.home&&game.awayTeam.score===result.score.away;
 const dateMatches=raw.playByPlay.gameDate===fixture.date;
 const seasonMatches=raw.playByPlay.season?.yearDisplay==='2026-27';
 const usable=scoreMatches&&dateMatches&&seasonMatches&&sides.every(s=>s.shotsReconciled&&s.goalsReconciled);
 return {fixtureId:fixture.id,date:fixture.date,homeTeam:teams.home,awayTeam:teams.away,usable,scoreMatches,dateMatches,seasonMatches,sides,events,excluded};
}
module.exports={normalizeMatch,attackingCoordinates,zoneFor,validCoordinates,minuteCompatible};
