'use strict';
const fs=require('fs'),path=require('path');
function applyIdentityCorrections(root,database,current=null,registered=null){
 const corrections=JSON.parse(fs.readFileSync(path.join(root,'data/sources/champions-md03-identity-corrections-2026-10-20.json'),'utf8')).corrections;
 for(const c of corrections){
  const p=database.teams.find(t=>t.teamId===c.teamId)?.players.find(p=>p.playerId===c.playerId);if(!p)throw Error('Correction has no canonical MD3 identity');
  Object.assign(p,{providerPlayerId:c.providerPlayerId,canonicalName:c.canonicalName,name:c.canonicalName,position:c.position,role:c.role,previousSeason:c.previousSeason,historicalMinutes:c.previousSeason.totals.minutes,identityCorrection:c});
  if(current){const team=current.teams.find(t=>t.id===c.teamId),member=team.players.find(p=>p.id===c.playerId);Object.assign(member,{providerPlayerId:c.providerPlayerId,name:c.canonicalName,position:c.position});}
  if(registered){const member=registered.teams.find(t=>t.id===c.teamId).players.find(p=>p.id===c.registeredPlayerId);member.providerIds={...member.providerIds,espn:c.providerPlayerId};}
 }
 return database;
}
module.exports={applyIdentityCorrections};
