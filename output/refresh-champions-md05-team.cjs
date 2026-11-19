'use strict';
const fs=require('node:fs'), zlib=require('node:zlib'), path=require('node:path'), assert=require('node:assert/strict');
const root=process.cwd();
const load=p=>require(path.resolve(root,p));
const {normalize}=load('scripts/refresh-champions-team-coverage-20261102.cjs');
const {teamData}=load('scripts/recover-champions-fotmob-matches.cjs');
const canonical=load('data/sources/champions-pilot-match-stats-2025-27.json');
const asOf='2026-11-19', from='2026-10-01', rawRoot='data/raw/champions-team-coverage/'+asOf;
const archived='data/raw/champions-season-shots/2026-10-20/fotmob/teams/';
const league={441:'ukr.1',176:'svk.1',38:'aut.1',42:'uefa.champions',47:'eng.1',87:'esp.1',54:'ger.1',59:'nor.1',55:'ita.1',71:'tur.1',57:'ned.1',53:'fra.1',61:'por.1',40:'bel.1',135:'gre.1',262:'aze.1',122:'cze.1'};
const ids=new Map(), jobs=new Map(), schedules=[], failures=[];
const providerKey=(source,team)=>team.statisticsProviderIds?.[source]|| (source==='ESPN'?team.espnTeamId:null);
const findSide=(row,id)=>[row.home,row.away].find(s=>String(s.providerTeamId)===String(id));
const usable=m=>['home','away'].every(s=>Number.isFinite(m[s].score)&&['totalShots','shotsOnTarget','wonCorners'].every(k=>Number.isFinite(m[s].statistics[k])));
const write=(p,o)=>fs.writeFileSync(p,JSON.stringify(o,null,2)+'\n');
async function acquire(key,url){
 const rawFile=rawRoot+'/'+key+'.json.gz';
 if(fs.existsSync(rawFile))return {...JSON.parse(zlib.gunzipSync(fs.readFileSync(rawFile))),rawFile};
 for(let i=0;i<2;i++){
  try{
   const r=await fetch(url,{signal:AbortSignal.timeout(12000)});
   if(!r.ok)throw Error('HTTP '+r.status);
   const raw={url,retrievedAt:new Date().toISOString(),status:r.status,payload:await r.json()};
   fs.mkdirSync(path.dirname(rawFile),{recursive:true});fs.writeFileSync(rawFile,zlib.gzipSync(JSON.stringify(raw)));
   return {...raw,rawFile};
  }catch(e){if(i===1)throw e;}
 }
}
async function parallel(items,fn){
 let i=0;await Promise.all(Array.from({length:8},async()=>{while(i<items.length)await fn(items[i++]);}));
}
function known(team,job){
 return canonical.matches.find(m=>m.date===job.date&&m.league===league[job.leagueId]&&[m.home,m.away].some(s=>s.canonicalTeamId===team.id||String(s.providerTeamId)===String(providerKey(m.source.provider,team))));
}
(async()=>{
 await parallel(canonical.teams,async team=>{
  try{
   const local=['-api',''].map(s=>archived+team.id+s+'.json.gz').find(f=>fs.existsSync(f)&&teamData(JSON.parse(zlib.gunzipSync(fs.readFileSync(f))))?.details?.id);
   const id=String(team.statisticsProviderIds?.FotMob||teamData(JSON.parse(zlib.gunzipSync(fs.readFileSync(local)))).details.id);
   const raw=await acquire('teams/'+team.id,'https://www.fotmob.com/api/data/teams?id='+id);
   assert.equal(String(raw.payload.details.id),id);ids.set(id,team);
   const schedule=raw.payload.fixtures?.allFixtures?.fixtures;assert(Array.isArray(schedule));
   const eligible=schedule.filter(f=>f.status?.finished&&!f.status.cancelled&&!f.status.awarded&&f.status.utcTime?.slice(0,10)>=from&&f.status.utcTime?.slice(0,10)<=asOf&&!/friendly|testimonial|joan.?gamper/i.test(f.tournament?.name||''));
   schedules.push({teamId:team.id,providerId:id,rawFile:raw.rawFile,eligible:eligible.length});
   for(const f of eligible){
    const job={id:String(f.id),date:f.status.utcTime.slice(0,10),home:f.home,away:f.away,leagueId:f.tournament.leagueId,competition:f.tournament.name};
    if(!known(team,job)||!usable(known(team,job)))jobs.set(job.id,job);
   }
  }catch(e){failures.push({teamId:team.id,error:e.message});}
 });
 console.log('Calendari '+schedules.length+'; referti '+jobs.size);
 const matches=[];
 await parallel([...jobs.values()],async j=>{
  try{
   const raw=await acquire('matches/'+j.id,'https://www.fotmob.com/api/data/matchDetails?matchId='+j.id);
   const row=normalize(raw,j);row.league=league[j.leagueId]||row.league;
   for(const side of [row.home,row.away])side.canonicalTeamId=ids.get(String(side.providerTeamId))?.id||null;
   matches.push(row);
  }catch(e){failures.push({id:j.id,date:j.date,competition:j.competition,error:e.message});}
 });
 const added=[], skips=[];
 for(const row of matches){
  const teamSides=[row.home,row.away].filter(s=>s.canonicalTeamId).map(s=>canonical.teams.find(t=>t.id===s.canonicalTeamId));
  if(!teamSides.some(t=>row.league===t.league)){skips.push(row.eventId);continue;}
  if(teamSides.some(t=>canonical.matches.some(m=>m.eventId===row.eventId||(m.league===row.league&&m.date===row.date&&findSide(m,providerKey(m.source.provider,t)))))){skips.push(row.eventId);continue;}
  if(!usable(row)){skips.push(row.eventId);continue;}
  for(const team of teamSides){
   const side=[row.home,row.away].find(s=>s.canonicalTeamId===team.id);
   team.statisticsProviderIds={...team.statisticsProviderIds,FotMob:side.providerTeamId};
  }
  canonical.matches.push(row);added.push(row);
 }
 assert(added.length>0);
 canonical.matches.sort((a,b)=>a.date.localeCompare(b.date)||a.eventId.localeCompare(b.eventId));
 canonical.summary={...canonical.summary,matches:canonical.matches.length,completeMatches:canonical.matches.filter(m=>m.coverage==='complete').length};
 for(const t of canonical.teamCoverage){
  const team=canonical.teams.find(x=>x.id===t.teamId);
  const rows=canonical.matches.filter(m=>m.league===team.league&&findSide(m,providerKey(m.source.provider,team)));
  if(!added.some(m=>findSide(m,team.statisticsProviderIds?.FotMob)))continue;
  t.matches=rows.length;t.completeMatches=rows.filter(m=>m.coverage==='complete').length;t.volumeMatches=rows.filter(usable).length;
 }
 const source='data/sources/champions-team-coverage-refresh-'+asOf+'.json';
 matches.sort((a,b)=>a.date.localeCompare(b.date)||a.eventId.localeCompare(b.eventId));
 write(source,{asOf,from,schedules,matches,added:added.map(m=>m.eventId),failures});
 canonical.md05CoverageRefresh={asOf,source,addedMatches:added.length};
 write('data/sources/champions-pilot-match-stats-2025-27.json',canonical);
 console.log(JSON.stringify({schedules:schedules.length,matches:matches.length,added:added.length,failures}));
})().catch(e=>{console.error(e);process.exitCode=1});
