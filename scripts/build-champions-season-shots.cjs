"use strict";
const fs=require('fs'),path=require('path'),zlib=require('zlib'),assert=require('assert/strict');
const {rawRoot,analysis,officialClub,inScope}=require('./recover-champions-season-shots.cjs');
const builder=require('./build-champions-player-stats');
const root=path.resolve(__dirname,'..');
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const gz=p=>JSON.parse(zlib.gunzipSync(fs.readFileSync(p)));
const write=(p,d)=>{fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,JSON.stringify(d,null,2)+'\n');};
const number=x=>typeof x==='number'&&Number.isFinite(x)?x:typeof x==='string'&&/^\d+(\.\d+)?$/.test(x)?Number(x):null;
const stats=list=>Object.fromEntries((list||[]).map(s=>[s.name,number(s.value??s.displayValue)]));
const files=dir=>fs.existsSync(dir)?fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(path.join(dir,e.name)):[path.join(dir,e.name)]):[];
function build(){
 const current=read('data/normalized/champions-player-stats-2026-27.json');
 const config=read('data/sources/champions-pilot-match-stats-2025-27.json');
 const aliases=read('data/sources/champions-player-history-aliases.json').aliases||{};
 const resolutions=read('data/sources/champions-md03-squads-2026-27.json').identityResolutions||[];
 const recovered=read('data/analysis/champions/player-identity-recovery-2026-10-09.json').cases||[];
 const identities=[],unresolved=[],players=[];
 for(const team of current.teams){
   const cfg=config.teams.find(t=>t.id===team.id);assert(cfg);
   const roster=gz(path.join(rawRoot,'rosters',team.id+'.json.gz'));
   assert.equal(String(roster.payload.team?.id),String(cfg.espnTeamId));
   for(const p of team.players){
     let id=p.providerPlayerId?String(p.providerPlayerId):null,identitySource=p.identitySource;
     if(!id){
       const verified=resolutions.filter(r=>r.teamId===team.id&&r.playerId===p.id&&r.providerPlayerId);
       const name=builder.normalize(aliases[`${team.team}|${p.name}`]||p.name);
       const exact=(roster.payload.athletes||[]).filter(a=>builder.normalize(a.fullName||a.displayName)===name);
       const recoveredIds=recovered.filter(r=>r.teamId===team.id&&r.playerId===p.id&&r.status==='resolved'&&r.providerPlayerId);
       if(verified.length===1){id=String(verified[0].providerPlayerId);identitySource='md3-exact-canonical-id';}
       else if(exact.length===1){id=String(exact[0].id);identitySource='2026-current-team-exact-roster-name';}
       else if(recoveredIds.length===1){id=String(recoveredIds[0].providerPlayerId);identitySource='previous-exact-provider-identity-audit';}
       if(id)identities.push({teamId:team.id,playerId:p.id,providerPlayerId:id,identitySource});
     }
     const item={teamId:team.id,team:team.team,playerId:p.id,name:p.name,position:p.position,providerTeamId:cfg.espnTeamId,providerPlayerId:id,identitySource,performances:[],benchRecords:[]};
     players.push(item);if(!id)unresolved.push({teamId:team.id,playerId:p.id,name:p.name});
   }
 }
 const byId=Map.groupBy(players.filter(p=>p.providerPlayerId),p=>p.providerPlayerId);
 const matches=[],quarantine=[],seen=new Set();
 for(const file of files(path.join(rawRoot,'summaries'))){
   const raw=gz(file),payload=raw.payload,header=payload.header,comp=header?.competitions?.[0];
   const league=header?.league?.slug,date=comp?.date?.slice(0,10),eventId=String(header?.id||'');
   if(!officialClub(league)||!inScope(date,league)||!comp.status?.type?.completed)continue;
   if(eventId!==path.basename(file,'.json.gz')){quarantine.push({eventId,file,reason:'EVENT_ID_MISMATCH'});continue;}
   for(const roster of payload.rosters||[]){
     const teamId=String(roster.team?.id||'');
     if(!comp.competitors?.some(c=>String(c.team?.id)===teamId)){quarantine.push({eventId,teamId,reason:'TEAM_NOT_IN_EVENT'});continue;}
     const box=stats(payload.boxscore?.teams?.find(t=>String(t.team?.id)===teamId)?.statistics);
     const appearances=(roster.roster||[]).filter(r=>stats(r.stats).appearances>0);
     const sum=field=>appearances.every(r=>Number.isInteger(stats(r.stats)[field]))?appearances.reduce((s,r)=>s+stats(r.stats)[field],0):null;
     const placeholder=['totalShots','shotsOnTarget','wonCorners','foulsCommitted'].every(k=>box[k]===0);
     const reconciliation={teamShots:box.totalShots??null,playerShots:sum('totalShots'),teamSOT:box.shotsOnTarget??null,playerSOT:sum('shotsOnTarget')};
     const validTeam=!placeholder&&Number.isInteger(box.totalShots)&&Number.isInteger(box.shotsOnTarget)&&box.shotsOnTarget<=box.totalShots;
     const complete=validTeam&&reconciliation.teamShots===reconciliation.playerShots&&reconciliation.teamSOT===reconciliation.playerSOT;
     matches.push({eventId,league,date,providerTeamId:teamId,appearances:appearances.length,complete,reconciliation,sourceUrl:raw.url});
     for(const r of roster.roster||[]){
       const id=String(r.athlete?.id||''),targets=byId.get(id);if(!targets)continue;
       const s=stats(r.stats),key=`${eventId}|${teamId}|${id}`;if(seen.has(key))continue;seen.add(key);
       if(s.appearances===0){for(const p of targets)p.benchRecords.push({eventId,league,date,providerTeamId:teamId});continue;}
       if(!(s.appearances>0))continue;
       const valid=validTeam&&Number.isInteger(s.totalShots)&&Number.isInteger(s.shotsOnTarget)&&s.totalShots>=0&&s.shotsOnTarget>=0&&s.shotsOnTarget<=s.totalShots;
       const row={eventId,league,competition:header.league.name,date,providerTeamId:teamId,providerTeam:roster.team.displayName||roster.team.name,providerPlayerId:id,shots:valid?s.totalShots:null,shotsOnTarget:valid?s.shotsOnTarget:null,statisticsStatus:valid?(complete?'verified-reconciled':'reported-unreconciled'):'unavailable',teamReconciliation:complete,sourceUrl:raw.url,retrievedAt:raw.retrievedAt};
       for(const p of targets)p.performances.push(row);
       if(!valid)quarantine.push({eventId,league,providerTeamId:teamId,providerPlayerId:id,reason:placeholder?'TEAM_STATISTICS_PLACEHOLDER':'MISSING_OR_INVALID_SHOOTING_METRICS'});
     }
   }
 }
 for(const p of players){
   p.performances.sort((a,b)=>a.date.localeCompare(b.date)||a.eventId.localeCompare(b.eventId));
   p.competitions=[...Map.groupBy(p.performances,r=>`${r.league}|${r.providerTeamId}`)].map(([key,rows])=>({league:rows[0].league,competition:rows[0].competition,providerTeamId:rows[0].providerTeamId,team:rows[0].providerTeam,appearances:rows.length,shots:rows.every(r=>r.shots!==null)?rows.reduce((s,r)=>s+r.shots,0):null,shotsOnTarget:rows.every(r=>r.shotsOnTarget!==null)?rows.reduce((s,r)=>s+r.shotsOnTarget,0):null,coveredAppearances:rows.filter(r=>r.shots!==null&&r.shotsOnTarget!==null).length}));
   p.totals={appearances:p.performances.length||null,shots:p.performances.length&&p.performances.every(r=>r.shots!==null)?p.performances.reduce((s,r)=>s+r.shots,0):null,shotsOnTarget:p.performances.length&&p.performances.every(r=>r.shotsOnTarget!==null)?p.performances.reduce((s,r)=>s+r.shotsOnTarget,0):null};
   p.status=!p.providerPlayerId?'identity-unresolved':!p.performances.length?'no-appearance-in-acquired-evidence':p.totals.shots===null||p.totals.shotsOnTarget===null?'partial-shooting-evidence':'shooting-values-available';
 }
 const output={schemaVersion:1,season:'2026/27',asOf:'2026-10-20',generatedAt:new Date().toISOString(),scope:'Official club competitions, separate team/competition buckets; Norwegian calendar league season 2026',completeness:'Acquired evidence only; available totals are not a guarantee of exhaustive season coverage',summary:{teams:current.teams.length,players:players.length,withShootingValues:players.filter(p=>p.status==='shooting-values-available').length,withPartialShooting:players.filter(p=>p.status==='partial-shooting-evidence').length,withoutAppearances:players.filter(p=>p.status==='no-appearance-in-acquired-evidence').length,unresolvedIdentities:unresolved.length,performances:players.reduce((s,p)=>s+p.performances.length,0)},players};
 write(path.join(analysis,'shooting-candidate.json'),output);
 write(path.join(analysis,'match-reconciliation.json'),matches);
 write(path.join(analysis,'shooting-quarantine.json'),quarantine);
 write(path.join(analysis,'identity-resolutions.json'),identities);
 write(path.join(analysis,'unresolved-identities.json'),unresolved);
 console.log(JSON.stringify(output.summary));console.log('New exact identities '+identities.length+'; quarantined rows '+quarantine.length);
 return output;
}
if(require.main===module)build();
module.exports={build};
