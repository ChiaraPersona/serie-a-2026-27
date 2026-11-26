'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),zlib=require('node:zlib'),crypto=require('node:crypto');
const {parseStatmuseHtml}=require('./parse-statmuse-game');
const read=f=>JSON.parse(fs.readFileSync(f,'utf8')),save=(f,d)=>fs.writeFileSync(f,JSON.stringify(d,null,2)+'\n');
const rawSnapshot='data/raw/serie-a-shot-events/2026-27/112148.html.gz';
const html=zlib.gunzipSync(fs.readFileSync(rawSnapshot)).toString('utf8'),raw=parseStatmuseHtml(html);
assert.equal(raw.players['49079'].longName,'Matteo Lavelli');assert.equal(raw.players['49079'].uniformNumber,'53');assert.equal(raw.players['49079'].position,'ATTACKER');
const evidence={provider:'StatMuse',url:'https://www.statmuse.com/fc/match/-112148',rawSnapshot,providerPlayerId:'49079',sha256:crypto.createHash('sha256').update(html).digest('hex')};
const identity={teamId:'inter',playerId:'matteo-lavelli',canonicalName:'Matteo Lavelli',aliases:['Matteo Lavelli','Lavelli','Lavelli M.','M. Lavelli'],providerIds:{statmuse:'49079'},evidence:[evidence]};
const registry=read('data/sources/player-identity-aliases-2026-27.json');assert(!registry.players.some(p=>p.playerId===identity.playerId&&p.teamId!=='inter'));
if(!registry.players.some(p=>p.playerId===identity.playerId))registry.players.push(identity);save('data/sources/player-identity-aliases-2026-27.json',registry);
for(const file of ['data/teams/inter.json','data/generated/team-pages/inter-squad.json']){const d=read(file),players=d.squad||d.players;
 if(!players.some(p=>p.id===identity.playerId))players.push({schemaVersion:1,id:identity.playerId,name:identity.canonicalName,providerIds:identity.providerIds,currentTeam:'Inter',currentSeason:'2026/27',role:'Attaccante',detailedRole:null,detailedRoles:[],shirtNumber:53,previousSeason:{season:'2025/26',entries:[],totals:null},sources:[evidence],dataQuality:{status:'partial',uncertainAssociation:false,associationMethod:'exact-provider-player-id',note:'Identita collegata al referto MD8; statistiche storiche mancanti conservate come N/D.'}});save(file,d);
}
const linked=[];
for(const file of ['data/normalized/matches.json','data/sources/match-results-2026-27.json','data/sources/official-lineups-2026-27.json']){
 const d=read(file);
 function visit(v,p=''){if(!v||typeof v!=='object')return;
  if(!Array.isArray(v)&&Object.hasOwn(v,'playerId')&&[v.player,v.sourceName,v.currentName].some(n=>identity.aliases.includes(n))){assert(!v.playerId||v.playerId===identity.playerId);v.playerId=identity.playerId;if(v.identityStatus)v.identityStatus='resolved-canonical';linked.push({file,path:p});}
  for(const[k,x]of Object.entries(v))if(x&&typeof x==='object')visit(x,p+'.'+k);
 }visit(d);save(file,d);
}
require('./player-identity').loadPlayerIdentities(process.cwd());
fs.mkdirSync('reports/lavelli-identity',{recursive:true});save('reports/lavelli-identity/link-report.json',{identity,linked});console.log(JSON.stringify({id:identity.playerId,providerPlayerId:'49079',linked},null,2));
