'use strict';
// Descriptive projection only. Existing club histories and every forecast remain untouched.
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const metrics={appearances:'appearances',goals:'totalGoals',assists:'goalAssists',shots:'totalShots',shotsOnTarget:'shotsOnTarget',foulsCommitted:'foulsCommitted',foulsWon:'foulsSuffered',yellowCards:'yellowCards',straightRedCards:'redCards',offsides:'offsides',saves:'saves',goalsConceded:'goalsConceded'};
const per90Fields=['goals','assists','shots','shotsOnTarget','foulsCommitted','foulsWon','yellowCards','cards'];
function validatedMetrics(stats,box){
 const placeholder=['totalShots','shotsOnTarget','wonCorners','foulsCommitted'].every(f=>box[f]===0);
 const attackUnavailable=box.totalShots==null||box.shotsOnTarget==null||placeholder;
 const values=Object.fromEntries(Object.entries(metrics).map(([field,key])=>[field,stats[key]??null]));
 if(placeholder)for(const field of Object.keys(values))if(field!=='appearances'&&values[field]===0)values[field]=null;
 if(attackUnavailable){values.shots=null;values.shotsOnTarget=null;}
 return {values,status:placeholder?'partial-team-template':attackUnavailable?'partial-shooting':'provider-recorded'};
}
function inScope(date,scope){return typeof date==='string'&&date.slice(0,10)>=scope.from&&date.slice(0,10)<=scope.to;}
function duration(status){
 const name=status?.type?.name||'';
 if(status?.clock>=7200)return 120;
 if(status?.clock>=5400)return 90;
 if(/PEN/.test(name))return null;
 if(/EXTRA|AET/.test(name)||status?.period>2)return 120;
 if(name==='STATUS_FULL_TIME'||status?.period===2)return 90;
 return null;
}
function minutes(row,status){
 const map=Object.fromEntries((row.stats||[]).map(s=>[s.name,s.value]));
 for(const field of ['minutes','minutesPlayed'])if(typeof map[field]==='number'&&Number.isFinite(map[field]))return {value:map[field],status:'provider-reported'};
 const end=duration(status);if(end===null)return {value:null,status:'unavailable-duration'};
 const time=play=>{const match=play.clock?.displayValue?.match(/^(\d+)/);return match?Math.min(end,Number(match[1])):null};
 const substitutions=(row.plays||[]).filter(p=>p.substitution).map(time).filter(v=>v!==null).sort((a,b)=>a-b);
 const dismissals=(row.plays||[]).filter(p=>p.redCard).map(time).filter(v=>v!==null);
 const start=row.starter?0:row.subbedIn?substitutions[0]:null;
 let finish=end;
 if(row.subbedOut){
  if(substitutions.length<(row.starter?1:2))return {value:null,status:'unavailable-substitution-time'};
  finish=substitutions.at(-1);
 }
 if(map.redCards>0&&!dismissals.length)return {value:null,status:'unavailable-dismissal-time'};
 if(dismissals.length)finish=Math.min(finish,...dismissals);
 return typeof start==='number'&&finish>=start?{value:finish-start,status:'estimated-excluding-stoppage-time'}:{value:null,status:'unavailable-substitution-time'};
}
function aggregate(observations){
 const totals={};
 for(const field of ['appearances','starts','minutes',...Object.keys(metrics).filter(f=>f!=='appearances')]){
  const values=observations.map(o=>o[field]);
  totals[field]=values.length&&values.every(v=>typeof v==='number'&&Number.isFinite(v))?values.reduce((a,b)=>a+b,0):null;
 }
 totals.secondYellowCards=null;
 // The provider's red-card count is not known to exclude second-yellow dismissals.
 totals.straightRedCards=null;
 totals.per90={};
 for(const field of per90Fields)totals.per90[field]=field!=='cards'&&totals.minutes>0&&totals[field]!==null?Math.round(totals[field]*90/totals.minutes*100)/100:null;
 return totals;
}
function nationalGroup(observations,scopeName){
 const competitions=[...new Set(observations.map(o=>o.country+' · '+o.competition))];
 return {scope:scopeName,coverage:observations.length?'observed-match-sample':'no-verified-observations',appearancesObserved:observations.length,
  totals:aggregate(observations),competitions,from:observations.map(o=>o.date).sort()[0]||null,to:observations.map(o=>o.date).sort().at(-1)||null,
  minutesEstimated:observations.some(o=>o.minutesStatus.startsWith('estimated')),hasExtraTime:observations.some(o=>o.duration===120),
  metricCoverage:Object.fromEntries(['minutes',...Object.keys(metrics)].map(f=>[f,observations.filter(o=>o[f]!==null&&o[f]!==undefined).length]))};
}
function compactClub(history,sourcePath){
 if(!history?.totals)return null;
 const fields=['appearances','starts','minutes',...Object.keys(metrics),'secondYellowCards','per90'];
 return {scope:'club-season-history',season:history.season,totals:Object.fromEntries([...new Set(fields)].map(f=>[f,history.totals[f]??null])),
  competitions:[...new Set((history.entries||[]).map(e=>e.competition).filter(Boolean))],sourcePath};
}
function main(){
 const squads=read('data/normalized/champions-registered-squads-2026-27.json');
 const historical=read('data/normalized/champions-player-stats-2025-26.json');
 const current=read('data/normalized/champions-player-stats-2026-27.json');
 const supplementPath='data/sources/champions-player-club-history-supplement-2025-26.json';
 const supplement=fs.existsSync(path.join(root,supplementPath))?read(supplementPath):{players:[]};
 const registries=['data/normalized/champions-md03-player-database-2026-27.json','data/normalized/champions-md04-player-database-2026-27.json'].map(p=>({path:p,data:read(p)}));
 const acquisition=read('data/sources/champions-senior-national-history-acquisition-2025-26.json'),scope=acquisition.scope;
 const allowed=new Set([...scope.officialLeagues,...scope.friendlyLeagues]);
 const targets=new Set(squads.teams.flatMap(t=>t.players.map(p=>String(p.providerIds?.espn||''))).filter(Boolean));
 const observations=[],seen=new Set(),excluded=[];
 const observationPath='data/sources/champions-player-senior-national-observations-2025-26.json';
 const acquisitionDigest=crypto.createHash('sha256').update(JSON.stringify(acquisition)).digest('hex');
 const cached=fs.existsSync(path.join(root,observationPath))?read(observationPath):null;
 if(cached?.allSeniorAppearances&&cached.observationParserVersion===3&&cached.acquisitionDigest===acquisitionDigest&&!process.argv.includes('--refresh-observations')){
  observations.push(...cached.observations);excluded.push(...cached.excluded);
 }else{
 for(const match of acquisition.matches){
  if(match.error||!match.rawFile)continue;
  assert(allowed.has(match.league),'Non-senior league in national acquisition');
  const raw=JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(root,match.rawFile))).toString('utf8'));
  const header=raw.payload.header,comp=header.competitions[0];
  assert.equal(String(header.id),match.eventId);assert(inScope(comp.date||header.date,scope));
  const status={...match.status,...comp.status,type:{...match.status?.type,...comp.status?.type}};
  const competition=header.league?.name||match.league;
  for(const team of raw.payload.rosters||[]){
   const country=team.team?.displayName||team.team?.name||null;
   if(!country||/\b(?:U[ -]?(?:1\d|2[0-3])|Under[ -]?(?:1\d|2[0-3])|Women|Olympic)\b/i.test(country)){
    excluded.push({eventId:match.eventId,country,reason:'non-senior-or-unknown-team'});continue;
   }
   const boxTeam=(raw.payload.boxscore?.teams||[]).find(t=>String(t.team?.id)===String(team.team.id));
   const box=Object.fromEntries((boxTeam?.statistics||[]).map(s=>{const value=Number(s.value??s.displayValue);return [s.name,Number.isFinite(value)?value:null]}));
   for(const player of team.roster||[]){
    const providerPlayerId=String(player.athlete?.id||'');if(!providerPlayerId)continue;
    const stats=Object.fromEntries((player.stats||[]).map(s=>[s.name,typeof s.value==='number'&&Number.isFinite(s.value)?s.value:null]));
    if(!(stats.appearances>0)){
     if(player.starter||player.subbedIn)excluded.push({eventId:match.eventId,providerPlayerId,country,rawFile:match.rawFile,reason:'appearance-flags-not-reconciled-with-statistics'});
     continue;
    }
    const key=match.eventId+'|'+providerPlayerId;
    if(seen.has(key))throw Error('Duplicate national appearance '+key);seen.add(key);
    const employment=minutes(player,status);
    const validated=validatedMetrics(stats,box),values=validated.values;
    const isGoalkeeper=player.position?.abbreviation==='GK';
    if(!isGoalkeeper){values.saves=null;values.goalsConceded=null;}
    observations.push({...values,appearances:1,starts:typeof player.starter==='boolean'?(player.starter?1:0):null,minutes:employment.value,minutesStatus:employment.status,duration:duration(status),
     eventId:match.eventId,providerPlayerId,providerNationalTeamId:String(team.team.id),country,competition,league:match.league,scope:match.nationalScope,
     date:match.date,statisticsStatus:validated.status,sourceUrl:match.url,rawFile:match.rawFile});
   }
  }
 }
 }
 const byProvider=new Map();for(const o of observations){if(!byProvider.has(o.providerPlayerId))byProvider.set(o.providerPlayerId,[]);byProvider.get(o.providerPlayerId).push(o);}
 const teams=squads.teams.map(team=>{
  const teamId=({'bod-glimt':'bodo-glimt'})[team.id]||team.id;
  const histTeam=historical.teams.find(t=>t.id===teamId||t.team===team.team);
  const currentTeam=current.teams.find(t=>t.id===teamId);
  const players=team.players.map(player=>{
   const espn=player.providerIds?.espn?String(player.providerIds.espn):null;
   let history=player.previousSeason,historySource='data/normalized/champions-registered-squads-2026-27.json';
   if(!history){
    const candidates=(histTeam?.players||[]).filter(p=>espn?String(p.providerPlayerId)===espn:p.id===player.id);
    if(candidates.length===1&&candidates[0].previousSeason){history=candidates[0].previousSeason;historySource='data/normalized/champions-player-stats-2025-26.json';}
   }
   if(!history&&player.uefaPlayerId){
    for(const registry of registries){
     const candidates=registry.data.teams.find(t=>t.teamId===teamId)?.players.filter(p=>String(p.uefaPlayerId)===String(player.uefaPlayerId))||[];
     if(candidates.length===1&&candidates[0].previousSeason&&(!espn||!candidates[0].providerPlayerId||String(candidates[0].providerPlayerId)===espn)){
      history=candidates[0].previousSeason;historySource=registry.path;break;
     }
    }
   }
   if(!history&&espn){
    const recovered=supplement.players.filter(p=>p.teamId===team.id&&p.playerId===player.id&&String(p.providerPlayerId)===espn&&p.entries.length);
    if(recovered.length===1){history=require('./build-champions-player-stats.js').seasonalHistory({id:player.id},espn,recovered[0])?.previousSeason;historySource=supplementPath;}
   }
   const national=espn?byProvider.get(espn)||[]:[];
   const candidates=(currentTeam?.players||[]).filter(p=>espn?String(p.providerPlayerId)===espn:p.id===player.id);
   const currentSeason=candidates.length===1?candidates[0].currentSeason:null;
   const currentProjection=currentSeason?{totals:compactClub(currentSeason,'data/normalized/champions-player-stats-2026-27.json').totals,totalsScope:currentSeason.totalsScope}:null;
   return {playerId:player.id,uefaPlayerId:player.uefaPlayerId||null,providerPlayerId:espn,name:player.name,currentSeason:currentProjection,club:compactClub(history,historySource),
    nationalOfficial:nationalGroup(national.filter(o=>o.scope==='official'),'senior-national-official'),
    nationalFriendly:nationalGroup(national.filter(o=>o.scope==='friendly'),'senior-national-friendly')};
  });
  return {teamId:team.id,team:team.team,players};
 });
 const players=teams.flatMap(t=>t.players);
 const output={schemaVersion:1,season:'2025/26',nationalPeriod:{from:scope.from,to:scope.to},descriptiveOnly:true,
  coverageNotice:'Campioni osservati: nessuno zero dedotto da assenza di dati. Gare ufficiali e amichevoli separate. Minuti stimati dalle sostituzioni, recupero escluso; supplementari inclusi quando identificabili. Coppa Araba 2025 non coperta.',
  summary:{teams:teams.length,players:players.length,withClubHistory:players.filter(p=>p.club?.totals?.minutes!=null).length,
   withNationalOfficial:players.filter(p=>p.nationalOfficial.appearancesObserved>0).length,withNationalFriendly:players.filter(p=>p.nationalFriendly.appearancesObserved>0).length,
   withAnyNationalHistory:players.filter(p=>p.nationalOfficial.appearancesObserved+p.nationalFriendly.appearancesObserved>0).length,
   nationalAppearances:observations.filter(o=>targets.has(o.providerPlayerId)).length,unresolvedProviderIdentities:players.filter(p=>!p.providerPlayerId).length},teams};
 const source={schemaVersion:2,observationParserVersion:3,season:'2025/26',scope,allSeniorAppearances:true,acquisitionDigest,acquisitionPath:'data/sources/champions-senior-national-history-acquisition-2025-26.json',observations,excluded};
 fs.writeFileSync(path.join(root,observationPath),JSON.stringify(source,null,2)+'\n');
 fs.writeFileSync(path.join(root,'data/normalized/champions-player-history-context-2025-26.json'),JSON.stringify(output)+'\n');
 console.log(JSON.stringify(output.summary));
}
if(require.main===module)main();
module.exports={inScope,duration,minutes,aggregate,nationalGroup,validatedMetrics,main};
