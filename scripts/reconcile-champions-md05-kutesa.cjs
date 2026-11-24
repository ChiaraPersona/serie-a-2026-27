'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8')),write=(p,d)=>fs.writeFileSync(p,JSON.stringify(d,null,2)+'\n');
const source={url:'https://de.uefa.com/uefachampionsleague/clubs/players/250065405--derek-kutesa/',consultedAt:new Date().toISOString(),facts:{name:'Derek Kutesa',team:'AEK Athens',shirtNumber:7,clubPosition:'forward',uefaPlayerId:'250065405'},scope:'Identity and club role only; no statistical baseline or provider odds identity inferred.'};
const file='data/normalized/champions-registered-squads-2026-27.json',d=read(file),team=d.teams.find(t=>t.id==='aek-athens');assert(team);
if(!team.players.some(p=>p.id==='dereck-kutesa'))team.players.push({id:'dereck-kutesa',uefaPlayerId:'250065405',name:'Dereck Kutesa',position:'forward',shirtNumber:7,registered:true,registrationList:null,providerIds:{espn:null},previousSeason:null,statistics:{season:'2026-27',competition:'UEFA Champions League',appearances:null,starts:null,minutes:null,goals:null,assists:null,shots:null,shotsOnTarget:null,yellowCards:null,redCards:null},identityEvidence:source});
fs.writeFileSync(file,JSON.stringify(d)+'\n');
for(const kind of ['official','probable']){
 const p=`data/sources/champions-${kind}-formations-md05-2026-27.json`,data=read(p),official=read('data/sources/champions-official-formations-md05-2026-27.json');
 for(const teamId of ['como','aek-athens']){
  const t=structuredClone(official.teams.find(t=>t.teamId===teamId));assert(t);
  if(teamId==='aek-athens'){
   const player=t.starters.find(p=>p.sourceName==='Kutesa D.'||p.playerId==='dereck-kutesa');assert(player);
   Object.assign(player,{canonicalName:'Dereck Kutesa',playerId:'dereck-kutesa',registeredPlayerId:'dereck-kutesa',stablePlayerId:'aek-athens:dereck-kutesa',uefaPlayerId:'250065405',uefaRole:'forward',providerPlayerId:null,identityStatus:'verified-uefa-player-id-and-user-official-XI',reason:null,identityEvidence:source});
   t.rawLine=t.rawLine.replace(/; , /,'; Dereck Kutesa, ');
  }
  const i=data.teams.findIndex(x=>x.teamId===teamId);assert(i>=0);data.teams[i]=t;
 }
 if(kind==='official'){const f=data.fixtures.find(f=>f.fixtureId==='ucl-2026-27-md05-04');for(const venue of ['home','away'])f[venue].players=data.teams.find(t=>t.fixtureId===f.fixtureId&&t.venue===venue).starters;}
 write(p,data);
}
write('data/sources/official-lineup-evidence/champions-md05-evening/kutesa-identity.json',source);
console.log('Kutesa: exact UEFA identity reconciled; statistics and provider odds identity remain null.');
