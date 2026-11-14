'use strict';
// Import a browser-verified snapshot with materialized, reviewed canonical IDs.
// No approximate names, new players, call-up assertions or statistical updates.
const fs=require('node:fs'),assert=require('node:assert/strict');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const rawPath='data/raw/lineups/besoccer/champions-md03-2026-10-20.json';
const sourcePath='data/sources/champions-probable-formations-md03-2026-27.json';
const raw=read(rawPath),previous=read(sourcePath);
const db=read('data/normalized/champions-md03-player-database-2026-27.json');
assert.equal(raw.matchday,3);assert.equal(raw.status,'probable');assert.equal(raw.teams.length,36);
const teams=raw.teams.map(t=>{
  const prior=previous.teams.find(p=>p.teamId===t.teamId&&p.fixtureId===t.fixtureId);
  const squad=db.teams.find(p=>p.teamId===t.teamId);assert(prior&&squad);
  assert.equal(t.players.length,11);
  const starters=t.players.map(p=>{
    const member=p.playerId?squad.players.find(x=>x.playerId===p.playerId):null;
    if(p.playerId){assert(member);assert.equal(member.shirtNumber,p.shirtNumber);}
    return {sourceName:p.sourceName,canonicalName:member?.canonicalName||p.sourceName,
      playerId:member?.playerId||null,registeredPlayerId:member?.registeredPlayerId||member?.playerId||null,
      providerPlayerId:member?.providerPlayerId||null,stablePlayerId:member?.stablePlayerId||null,
      shirtNumber:p.shirtNumber,uefaRole:member?.role||null,reason:null,
      identityStatus:p.identityStatus,identityEvidence:{reviewedSnapshot:rawPath,teamId:t.teamId,shirtNumber:p.shirtNumber}};
  });
  const units=[1,...t.formation.split('-').map(Number)];assert.equal(units.reduce((a,b)=>a+b,0),11);
  let cursor=0;const line=units.map(n=>starters.slice(cursor,cursor+=n).map(p=>p.sourceName).join(', ')).join('; ');
  return {...prior,status:'probable',formation:t.formation,starters,
    rawLine:[line,...prior.rawLine.split('|').slice(1)].join('|'),
    availabilitySource:prior.availabilitySource||previous.source};
});
assert.equal(new Set(teams.map(t=>t.teamId)).size,36);
const out={...previous,status:'probable',source:{url:raw.url,updatedAt:'2026-10-20',consultedAt:raw.consultedAt,
  acquisition:raw.acquisition,rawFile:rawPath,identityPolicy:'Explicit reviewed team/player IDs only; unresolved roster members remain null.'},teams};
fs.writeFileSync(sourcePath,JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({teams:36,starters:396,unresolved:teams.flatMap(t=>t.starters).filter(p=>!p.playerId).map(p=>p.sourceName),availabilityConflicts:teams.flatMap(t=>t.starters.filter(p=>p.playerId&&[...t.unavailable,...t.suspended].some(x=>x.playerId===p.playerId)).map(p=>({teamId:t.teamId,playerId:p.playerId})))}));
