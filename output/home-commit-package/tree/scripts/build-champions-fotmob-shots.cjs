"use strict";
const fs=require('fs'),path=require('path'),zlib=require('zlib'),assert=require('assert/strict');
const {analysis,rawRoot}=require('./recover-champions-season-shots.cjs');
const {normalize}=require('./build-champions-player-stats');
const {teamData}=require('./recover-champions-fotmob-matches.cjs');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const gz=p=>JSON.parse(zlib.gunzipSync(fs.readFileSync(p)));
const save=(p,d)=>fs.writeFileSync(p,JSON.stringify(d,null,2)+'\n');
const leagues={42:'uefa.champions',10611:'uefa.champions_qual',47:'eng.1',133:'eng.league_cup',247:'eng.charity',74:'uefa.super_cup',87:'esp.1',54:'ger.1',209:'ger.dfb_pokal',59:'nor.1',40:'bel.1',55:'ita.1',71:'tur.1',57:'ned.1',38:'aut.1',53:'fra.1',61:'por.1',135:'gre.1',441:'ukr.1',262:'aze.1',122:'cze.1',176:'svk.1',206:'nor.cup',278:'aut.cup',188:'por.super_cup',237:'ned.supercup',266:'bel.super_cup',8816:'gre.super_cup',8924:'ger.super_cup',207:'fra.super_cup',145:'gre.cup',149:'bel.cup',254:'cze.cup',177:'svk.cup'};
function build(){
 const candidate=read(path.join(analysis,'shooting-candidate.json'));
 const acquisition=read(path.join(analysis,'fotmob-match-acquisition.json'));
 const byProviderTeam=new Map(acquisition.teams.map(t=>[String(t.providerTeamId),t.teamId]));
 const players=candidate.players.map(p=>({teamId:p.teamId,playerId:p.playerId,name:p.name,providerPlayerId:null,performances:[],identityEvidence:[]}));
 const mapping=new Map();
 const identify=(teamId,id,name,evidence)=>{
   if(!/^[1-9]\d*$/.test(String(id)))return; // 0 is an unnamed-provider placeholder, never a player identity.
   const exact=players.filter(p=>p.teamId===teamId&&normalize(p.name)===normalize(name));if(exact.length!==1)return;
   const p=exact[0];if(p.providerPlayerId&&p.providerPlayerId!==String(id))return;
   p.providerPlayerId=String(id);p.identityEvidence.push(evidence);
   const ids=mapping.get(String(id))||new Set();ids.add(p);mapping.set(String(id),ids);
 };
 for(const t of acquisition.teams){
   const raw=gz(path.join(rawRoot,'fotmob/teams',t.sourceFile));const d=teamData(raw);
   for(const group of d.squad?.squad||[])if(group.title!=='coach')for(const p of group.members||[])identify(t.teamId,p.id,p.name,{kind:'exact-team-roster-name',sourceUrl:raw.url});
 }
 const evidence=[];
 for(const f of fs.readdirSync(path.join(rawRoot,'fotmob/matches'))){
   const raw=gz(path.join(rawRoot,'fotmob/matches',f)),d=raw.payload,g=d.general;
   const id=String(g?.matchId||''),date=g?.matchTimeUTCDate?.slice(0,10),league=leagues[g?.parentLeagueId||g?.leagueId];
   if(!league||!g.finished||!date||date<(league==='nor.1'?'2026-01-01':'2026-07-01')||date>'2026-10-20')continue;
   assert.equal(id,path.basename(f,'.json.gz'));
   const lineup=d.content?.lineup;
   for(const side of ['home','away']){
     const team=lineup?.[side+'Team'];if(!team)continue;
     const canonical=byProviderTeam.get(String(team.id));if(!canonical)continue;
     for(const p of [...team.starters||[],...team.subs||[]])identify(canonical,p.id,p.name,{kind:'exact-match-roster-name',matchId:id,sourceUrl:raw.url});
   }
   evidence.push({raw,d,g,id,date,league});
 }
 const matches=[],quarantine=[];
 for(const {raw,d,g,id,date,league}of evidence){
   const lineup=d.content?.lineup;
   const teamStats=d.content?.stats?.Periods?.All?.stats?.flatMap(s=>s.stats||[])||[];
   const stat=(key,side)=>{const field=teamStats.find(s=>s.key===key);const v=field?.rawStats?.[side]?.value??field?.stats?.[side];return Number.isInteger(v)&&v>=0?v:null;};
   for(const [index,side]of ['home','away'].entries()){
     const team=lineup?.[side+'Team'];if(!team||!byProviderTeam.has(String(team.id)))continue;
     const starters=team.starters||[],subs=(team.subs||[]).filter(p=>!starters.some(s=>s.id===p.id&&Number(p.id)>0)&&(p.performance?.substitutionEvents?.some(e=>e.type==='subIn')||d.content?.playerStats?.[p.id]?.stats?.flatMap(g=>Object.values(g.stats||{})).some(s=>s.key==='minutes_played'&&s.stat?.value>0)));
     const actual=[...starters,...subs],fullLineup=starters.length===11;
     const numbers=actual.map(p=>{
       const ps=d.content?.playerStats?.[p.id];
       const fields=ps?.stats?.flatMap(g=>Object.values(g.stats||{}))||[];
       const get=key=>{const v=fields.find(f=>f.key===key)?.stat?.value;return Number.isInteger(v)&&v>=0?v:null;};
       return {player:p,stats:ps,shots:get('total_shots'),shotsOnTarget:get('ShotsOnTarget')};
     });
     const shots=stat('total_shots',index),sot=stat('ShotsOnTarget',index);
     const sum=k=>numbers.reduce((sum,p)=>sum+(p[k]??0),0);
     const placeholder=['total_shots','ShotsOnTarget','fouls','corner_kicks'].every(key=>stat(key,index)===0);
     const validTeam=!placeholder&&shots!==null&&sot!==null&&sot<=shots;
     const shotReconciled=fullLineup&&validTeam&&sum('shots')===shots;
     const sotReconciled=fullLineup&&validTeam&&sum('shotsOnTarget')===sot;
     const match={provider:'FotMob',eventId:id,canonicalTeamId:byProviderTeam.get(String(team.id)),providerTeamId:String(team.id),league,date,fullLineup,actualPlayers:actual.length,teamShots:shots,playerShots:sum('shots'),teamSOT:sot,playerSOT:sum('shotsOnTarget'),shotReconciled,sotReconciled,sourceUrl:raw.url};matches.push(match);
     for(const n of numbers){
       const targets=mapping.get(String(n.player.id));if(!targets)continue;
       const value={provider:'FotMob',eventId:id,date,league,competition:g.leagueName,providerTeamId:String(team.id),team:team.name,providerPlayerId:String(n.player.id),shots:validTeam?(n.shots??(shotReconciled?0:null)):null,shotsOnTarget:validTeam?(n.shotsOnTarget??(sotReconciled?0:null)):null,zeroEvidence:n.shots===null&&shotReconciled||n.shotsOnTarget===null&&sotReconciled?'complete-team-player-reconciliation':null,teamReconciliation:shotReconciled&&sotReconciled,sourceUrl:raw.url,retrievedAt:raw.retrievedAt};
       if(value.shots!==null&&value.shotsOnTarget!==null&&value.shotsOnTarget>value.shots){quarantine.push({...value,reason:'SOT_GT_SHOTS'});value.shots=null;value.shotsOnTarget=null;}
       for(const p of targets)p.performances.push(value);
     }
   }
 }
 for(const p of players){p.performances.sort((a,b)=>a.date.localeCompare(b.date)||a.eventId.localeCompare(b.eventId));p.competitions=[...Map.groupBy(p.performances,r=>`${r.league}|${r.providerTeamId}`)].map(([k,rows])=>({league:rows[0].league,competition:rows[0].competition,providerTeamId:rows[0].providerTeamId,team:rows[0].team,appearances:rows.length,shots:rows.every(r=>r.shots!==null)?rows.reduce((s,r)=>s+r.shots,0):null,shotsOnTarget:rows.every(r=>r.shotsOnTarget!==null)?rows.reduce((s,r)=>s+r.shotsOnTarget,0):null,coveredAppearances:rows.filter(r=>r.shots!==null&&r.shotsOnTarget!==null).length,sourceUrls:[...new Set(rows.map(r=>r.sourceUrl))]}));}
 save(path.join(analysis,'fotmob-shooting-candidate.json'),{asOf:'2026-10-20',players});save(path.join(analysis,'fotmob-match-reconciliation.json'),matches);save(path.join(analysis,'fotmob-shooting-quarantine.json'),quarantine);
 console.log(JSON.stringify({identified:players.filter(p=>p.providerPlayerId).length,withAppearances:players.filter(p=>p.performances.length).length,withFullyNumericEvidence:players.filter(p=>p.performances.length&&p.performances.every(r=>r.shots!==null&&r.shotsOnTarget!==null)).length,performances:players.reduce((s,p)=>s+p.performances.length,0),matches:matches.length,reconciled:matches.filter(m=>m.shotReconciled&&m.sotReconciled).length,quarantine:quarantine.length}));
}
if(require.main===module)build();
module.exports={build,leagues};
