'use strict';
// Input adapter only. The existing rate blend, minutes estimator and allocation
// remain authoritative. Missing/conflicting shots or observed minutes are excluded.
const fs=require('fs'),path=require('path'),zlib=require('zlib');
function loadObservedShooting(root,teams){
 const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
 const ledger=read('data/sources/champions-player-shooting-evidence-2026-10-20.json');
 const normalized=read('data/normalized/champions-player-shooting-2026-27.json');
 const byPlayer=new Map(),minutes=new Map(),cache=new Map(),audit=[];
 for(const team of teams)for(const p of team.players){
  if(!p.playerId||!p.providerPlayerId)continue;
  const observed=ledger.fotmobPerformances.find(x=>x.teamId===team.teamId&&x.playerId===p.playerId);
  const reconciled=normalized.teams.find(t=>t.id===team.teamId)?.players.find(x=>x.id===p.playerId);
  if(!observed||!reconciled)continue;
  const rows=[],records=[];
  for(const r of observed.performances){
   const bucket=reconciled.competitions.find(c=>c.league===r.league&&c.clubId===team.teamId);
   if(!bucket||bucket.status!=='available'||r.date>='2026-10-20'||!r.teamReconciliation||!Number.isFinite(r.shots)||!Number.isFinite(r.shotsOnTarget))continue;
   const file='data/raw/champions-season-shots/2026-10-20/fotmob/matches/'+r.eventId+'.json.gz';
   if(!cache.has(file))cache.set(file,JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(root,file)))));
   const raw=cache.get(file),d=raw.payload,ps=d.content?.playerStats?.[r.providerPlayerId];
   if(!ps||String(ps.teamId)!==r.providerTeamId)continue;
   const fields=ps.stats.flatMap(g=>Object.values(g.stats||{}));
   const played=fields.find(f=>f.key==='minutes_played')?.stat?.value;
   if(!Number.isFinite(played)||played<=0||played>120)continue;
   const sides=['home','away'].map(s=>d.content?.lineup?.[s+'Team']);
   const lineup=sides.find(t=>String(t?.id)===r.providerTeamId);if(!lineup)continue;
   const starter=lineup.starters.some(s=>String(s.id)===r.providerPlayerId);
   rows.push({league:r.league,matchId:'fotmob:'+r.eventId,providerPlayerId:p.providerPlayerId,minutes:played,minutesQuality:'observed',shots:r.shots,sot:r.shotsOnTarget,date:r.date,retrievedAt:r.retrievedAt,sourceUrl:r.sourceUrl});
   records.push({providerPlayerId:p.providerPlayerId,playerName:ps.name,season:'2026-27',competitionCode:r.league,competitionType:r.league.startsWith('uefa.')?'uefa-competition':'domestic-league',matchId:'fotmob:'+r.eventId,date:r.date,retrievedAt:r.retrievedAt,sourceUrl:r.sourceUrl,providerTeamId:r.providerTeamId,team:team.team,starter,namedBench:!starter,entered:!starter,subbedOut:starter&&played<90,minutes:played});
  }
  byPlayer.set(team.teamId+':'+p.playerId,rows);minutes.set(String(p.providerPlayerId),records);
  audit.push({teamId:team.teamId,playerId:p.playerId,observedAppearances:rows.length,observedMinutes:rows.reduce((n,r)=>n+r.minutes,0)});
 }
 return {byPlayer,minutes,audit,asOf:ledger.asOf};
}
module.exports={loadObservedShooting};
