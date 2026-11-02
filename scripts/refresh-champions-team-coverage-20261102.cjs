'use strict';
// Acquisition and input normalization only. No forecasts, quotes or settlements.
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),asOf='2026-11-02',from='2026-10-17';
const rawRoot=`data/raw/champions-team-coverage/${asOf}`;
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const write=(p,d)=>{fs.mkdirSync(path.dirname(path.join(root,p)),{recursive:true});fs.writeFileSync(path.join(root,p),JSON.stringify(d,null,2)+'\n');};
const providerIds={'shakhtar-donetsk':9728,'sporting-cp':9768,galatasaray:8637,stuttgart:10269,'atletico-de-madrid':9906,'bayern-munchen':9823,barcelona:8634,'aston-villa':10252,feyenoord:10235,inter:8636,'bodo-glimt':8402,lille:8639,lask:9977,'slovan-bratislava':6019,'manchester-united':10260,roma:8686,villarreal:10205,'paris-saint-germain':9847};
const weak=new Set(['shakhtar-donetsk','slovan-bratislava','lask']);
const leagues={441:'ukr.1',176:'svk.1',38:'aut.1',42:'uefa.champions',47:'eng.1',87:'esp.1',54:'ger.1',59:'nor.1',55:'ita.1',71:'tur.1',57:'ned.1',53:'fra.1',61:'por.1'};
const fields={totalShots:'total_shots',shotsOnTarget:'ShotsOnTarget',wonCorners:'corners',foulsCommitted:'fouls',yellowCards:'yellow_cards'};
async function parallel(jobs,worker){let i=0;await Promise.all(Array.from({length:5},async()=>{while(i<jobs.length)await worker(jobs[i++]);}));}
async function acquire(url,key){
 const file=`${rawRoot}/${key}.json.gz`,absolute=path.join(root,file);
 if(fs.existsSync(absolute))return {...JSON.parse(zlib.gunzipSync(fs.readFileSync(absolute))),rawFile:file};
 let last;for(let attempt=0;attempt<2;attempt++)try{
  const response=await fetch(url,{signal:AbortSignal.timeout(20000)});if(!response.ok)throw Error('HTTP '+response.status);
  const payload=await response.json(),raw={url,retrievedAt:new Date().toISOString(),status:response.status,payload};
  fs.mkdirSync(path.dirname(absolute),{recursive:true});fs.writeFileSync(absolute,zlib.gzipSync(JSON.stringify(raw)));
  return {...raw,rawFile:file};
 }catch(e){last=e;}
 throw last;
}
function normalize(raw,job){
 const d=raw.payload,g=d.general,h=d.header;
 assert(g&&h&&g.finished&&h.status?.finished,'Not finished');
 assert.equal(String(g.matchId),job.id);assert.equal(g.matchTimeUTCDate.slice(0,10),job.date);
 assert.equal(String(g.homeTeam.id),String(job.home.id));assert.equal(String(g.awayTeam.id),String(job.away.id));
 assert(!h.status.cancelled&&!h.status.awarded,'Cancelled or awarded');
 assert(!h.status.halfs?.firstExtraHalfStarted&&!h.status.halfs?.secondExtraHalfStarted&&h.status.reason?.short==='FT','Regulation period not certified');
 const rows=d.content?.stats?.Periods?.All?.stats?.flatMap(group=>group.stats||[])||[];
 const sides=['home','away'].map((side,i)=>{
  const providerTeamId=String(g[side+'Team'].id),canonicalTeamId=Object.keys(providerIds).find(k=>String(providerIds[k])===providerTeamId)||null;
  const statistics=Object.fromEntries(Object.entries(fields).map(([key,providerKey])=>{
   const hits=rows.filter(s=>s.key===providerKey).map(s=>s.rawStats?.[i]?.value??s.stats?.[i]).filter(v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v))).map(Number);
   return [key,new Set(hits).size===1?hits[0]:null];
  }));
  for(const value of Object.values(statistics))assert(value===null||(Number.isInteger(value)&&value>=0),'Invalid count');
  assert(statistics.shotsOnTarget===null||statistics.totalShots===null||statistics.shotsOnTarget<=statistics.totalShots,'SOT exceed shots');
  const score=h.teams.find(t=>String(t.id)===providerTeamId)?.score;assert(Number.isInteger(score)&&score>=0,'Missing score');
  return {homeAway:side,providerTeamId,canonicalTeamId,name:g[side+'Team'].name,score,statistics};
 });
 const coverageByMetric=Object.fromEntries(['goals',...Object.keys(fields)].map(k=>[k,sides.every(s=>Number.isFinite(k==='goals'?s.score:s.statistics[k]))]));
 return {eventId:'fotmob:'+job.id,season:'2026-27',league:leagues[g.parentLeagueId||g.leagueId]||'fotmob-competition:'+String(g.parentLeagueId||g.leagueId),date:job.date,home:sides[0],away:sides[1],coverage:Object.values(coverageByMetric).every(Boolean)?'complete':'partial',coverageByMetric,missing:sides.flatMap(s=>Object.keys(fields).filter(k=>s.statistics[k]===null).map(k=>s.homeAway+'.'+k)),periodScope:'regulation',source:{provider:'FotMob',url:'https://www.fotmob.com/match/'+job.id,summaryUrl:raw.url,retrievedAt:raw.retrievedAt,rawFile:raw.rawFile}};
}
async function main(){
 const lineups=read('data/sources/champions-probable-formations-md04-2026-27.json'),scope=[...new Set(lineups.teams.map(t=>t.teamId))];assert.equal(scope.length,18);
 const failures=[],schedules=[],jobs=new Map();
 await parallel(scope,async teamId=>{
  try{
   const raw=await acquire('https://www.fotmob.com/api/data/teams?id='+providerIds[teamId],'teams/'+teamId);
   assert.equal(String(raw.payload.details.id),String(providerIds[teamId]));
   const selected=(raw.payload.fixtures?.allFixtures?.fixtures||[]).filter(f=>{
    const date=f.status?.utcTime?.slice(0,10),start=weak.has(teamId)?'2026-07-01':from;
    return date&&date>=start&&date<=asOf&&f.status.finished&&!f.status.cancelled&&!f.status.awarded&&!/friendly|testimonial|atlantic cup|joan.?gamper/i.test(f.tournament?.name||'');
   });
   schedules.push({teamId,providerTeamId:String(providerIds[teamId]),rawFile:raw.rawFile,expectedRecent:selected.filter(f=>f.status.utcTime.slice(0,10)>=from).map(f=>String(f.id)),expectedSeason:weak.has(teamId)?selected.map(f=>String(f.id)):null});
   for(const f of selected)jobs.set(String(f.id),{id:String(f.id),date:f.status.utcTime.slice(0,10),home:f.home,away:f.away,leagueId:f.tournament.leagueId,competition:f.tournament.name});
  }catch(e){failures.push({teamId,stage:'schedule',error:e.message});}
 });
 console.log(JSON.stringify({schedules:schedules.length,matchesToAcquire:jobs.size}));
 const matches=[];let done=0;
 await parallel([...jobs.values()],async job=>{
  try{const raw=await acquire('https://www.fotmob.com/api/data/matchDetails?matchId='+job.id,'matches/'+job.id);matches.push(normalize(raw,job));}
  catch(e){failures.push({...job,stage:'match',error:e.message});}
  done++;if(done%25===0)console.log('Referti verificati '+done+'/'+jobs.size);
 });
 matches.sort((a,b)=>a.date.localeCompare(b.date)||a.eventId.localeCompare(b.eventId));
 const dataset={schemaVersion:1,asOf,from,scope,generatedAt:new Date().toISOString(),schedules,matches,failures};
 write('data/sources/champions-team-coverage-refresh-2026-11-02.json',dataset);
 const file='data/sources/champions-pilot-match-stats-2025-27.json',canonical=read(file),added=[];
 const domestic={'shakhtar-donetsk':'ukr.1','slovan-bratislava':'svk.1',lask:'aut.1'};
 for(const teamId of weak){
  const cfg=canonical.teams.find(t=>t.id===teamId),rows=matches.filter(m=>m.league===domestic[teamId]&&[m.home.canonicalTeamId,m.away.canonicalTeamId].includes(teamId));
  // Keep old competition data intact. Native provider IDs are never relabelled as ESPN IDs.
  cfg.statisticsProviderIds={...(cfg.statisticsProviderIds||{}),FotMob:String(providerIds[teamId]),ESPN:cfg.espnTeamId};
  if(rows.filter(m=>['totalShots','shotsOnTarget','wonCorners'].every(k=>m.coverageByMetric[k])).length>=6){cfg.league=domestic[teamId];cfg.leagueName={'ukr.1':'Premier League Ucraina','svk.1':'Super Liga Slovacchia','aut.1':'Bundesliga austriaca'}[cfg.league];cfg.baselineKind='domestic';}
  for(const row of rows){
   const exists=canonical.matches.some(m=>m.eventId===row.eventId&&m.source.provider==='FotMob');
   const primary=canonical.matches.find(m=>m.league===row.league&&m.date===row.date&&m.source.provider==='ESPN'&&[m.home.providerTeamId,m.away.providerTeamId].includes(cfg.espnTeamId));
   if(!exists&&(!primary||primary.coverage!=='complete')){canonical.matches.push(row);added.push(row.eventId);}
  }
 }
 canonical.matches.sort((a,b)=>a.date.localeCompare(b.date)||a.eventId.localeCompare(b.eventId));
 canonical.summary={...canonical.summary,matches:canonical.matches.length,completeMatches:canonical.matches.filter(m=>m.coverage==='complete').length};
 for(const entry of canonical.teamCoverage.filter(t=>weak.has(t.teamId))){
  const cfg=canonical.teams.find(t=>t.id===entry.teamId);
  const rows=canonical.matches.filter(m=>m.league===cfg.league&&[m.home.providerTeamId,m.away.providerTeamId].includes(cfg.statisticsProviderIds?.[m.source.provider]||cfg.espnTeamId));
  entry.matches=rows.length;entry.completeMatches=rows.filter(m=>m.coverage==='complete').length;entry.baselineKind=cfg.baselineKind;
  entry.volumeMatches=rows.filter(m=>['home','away'].every(s=>['totalShots','shotsOnTarget','wonCorners'].every(k=>Number.isFinite(m[s].statistics[k])))).length;
 }
 canonical.coverageRefresh={asOf,source:'data/sources/champions-team-coverage-refresh-2026-11-02.json',addedMatchesThisRun:added.length,integrativeDomesticRecords:canonical.matches.filter(m=>m.source.rawFile?.startsWith(rawRoot)).length,providerNamespace:'source.provider + providerTeamId; never substitute provider IDs'};
 write(file,canonical);
 console.log(JSON.stringify({schedules:schedules.length,matches:matches.length,canonicalAdded:added.length,failures:failures.length,weak:canonical.teams.filter(t=>weak.has(t.id)).map(t=>({id:t.id,league:t.league}))}));
}
if(require.main===module)main().catch(e=>{console.error(e);process.exitCode=1;});
module.exports={normalize};
