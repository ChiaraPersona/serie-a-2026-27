'use strict';
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {parseStatmuseHtml}=require('./parse-statmuse-game');
const root=path.resolve(__dirname,'..'),read=f=>JSON.parse(fs.readFileSync(path.join(root,f),'utf8'));
const save=(f,d)=>fs.writeFileSync(path.join(root,f),JSON.stringify(d,null,2)+'\n');
async function main(){
 const dir='data/raw/player-identities/2026-11-26';fs.mkdirSync(path.join(root,dir),{recursive:true});const evidence=[];
 for(const [name,url]of [['cagliari-squad','https://cagliaricalcio.com/squadra/prima-squadra/'],['nicola-grandu','https://cagliaricalcio.com/giocatore/nicola-grandu/']]){
  const response=await fetch(url);assert(response.ok,`${url}: ${response.status}`);const html=await response.text();assert(/Grandu/i.test(html));
  const rawSnapshot=`${dir}/${name}.html.gz`;fs.writeFileSync(path.join(root,rawSnapshot),zlib.gzipSync(html));evidence.push({url,rawSnapshot,sha256:crypto.createHash('sha256').update(html).digest('hex'),retrievedAt:new Date().toISOString()});
 }
 for(const id of ['112182','112195']){const d=parseStatmuseHtml(zlib.gunzipSync(fs.readFileSync(path.join(root,`data/raw/serie-a-shot-events/2026-27/${id}.html.gz`))).toString());assert.equal(d.players['63800'].longName,'Nicola Grandu');assert.equal(d.players['63800'].uniformNumber,'36');}
 const identity={teamId:'cagliari',playerId:'nicola-grandu',canonicalName:'Nicola Grandu',aliases:['Grandu','N. Grandu','Nicola Grandu'],providerIds:{statmuse:'63800'},evidence};
 const registry=read('data/sources/player-identity-aliases-2026-27.json');if(!registry.players.some(p=>p.teamId===identity.teamId&&p.playerId===identity.playerId))registry.players.push(identity);save('data/sources/player-identity-aliases-2026-27.json',registry);
 for(const file of ['data/teams/cagliari.json','data/generated/team-pages/cagliari-squad.json']){
  const d=read(file),players=d.squad||d.players;if(!players.some(p=>p.id===identity.playerId))players.push({schemaVersion:1,id:identity.playerId,name:identity.canonicalName,providerIds:identity.providerIds,currentTeam:'Cagliari',currentSeason:'2026/27',role:'Difensore',detailedRole:null,detailedRoles:[],shirtNumber:36,previousSeason:{season:'2025/26',entries:[],totals:null},sources:evidence.map(e=>({provider:'Cagliari Calcio',...e})),dataQuality:{status:'partial',uncertainAssociation:false,associationMethod:'verified-club-profile-and-provider-id',note:'Identita verificata; storico individuale 2025/26 N/D. Ruolo dalla rosa ufficiale del club.'}});save(file,d);
 }
 const linked=[];
 for(const file of ['data/normalized/matches.json','data/sources/match-results-2026-27.json']){
  const d=read(file),rows=Array.isArray(d)?d:d.matches;
  for(const row of rows){const id=row.id||row.matchId;if(!['cagliari-frosinone-2026-27-md-11','como-cagliari-2026-27-md-12'].includes(id))continue;
   for(const players of Object.values(row.playerStats||{}))for(const p of players)if(p.player==='Nicola Grandu'){assert(!p.playerId||p.playerId===identity.playerId);p.playerId=identity.playerId;linked.push({file,id,minutes:p.minutes});}
  }save(file,d);
 }
 console.log(JSON.stringify({identity:identity.playerId,linked,evidence},null,2));
}
main().catch(e=>{console.error(e);process.exitCode=1});
