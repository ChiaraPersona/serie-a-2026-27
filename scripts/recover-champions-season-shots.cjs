"use strict";
// Acquisition only; official club competitions, dated evidence, canonical provider IDs.
const fs=require('fs'),path=require('path'),zlib=require('zlib');
const root=path.resolve(__dirname,'..');
const rawRoot=path.join(root,'data/raw/champions-season-shots/2026-10-20');
const analysis=path.join(root,'data/analysis/champions/season-shots-2026-10-20');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const dataset=read(path.join(root,'data/normalized/champions-player-stats-2026-27.json'));
const config=read(path.join(root,'data/sources/champions-pilot-match-stats-2025-27.json'));
const save=(p,d)=>{fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,JSON.stringify(d,null,2)+'\n');};
const failures=[];
function official(league){return !!league&&!/friendly|emirates|champs_cup|testimonial|allstar/i.test(league);}
function inScope(date,league){const from=league?.startsWith('nor.')?'2026-01-01':'2026-07-01';return date&&date>=from&&date<='2026-10-20';}
async function request(url,key){
 const file=path.join(rawRoot,key+'.json.gz');
 if(fs.existsSync(file))return JSON.parse(zlib.gunzipSync(fs.readFileSync(file)));
 let error;
 for(let attempt=0;attempt<3;attempt++)try{
   const response=await fetch(url,{signal:AbortSignal.timeout(25000),headers:{accept:'application/json'}});
   if(!response.ok)throw Error('HTTP '+response.status);
   const raw={url,retrievedAt:new Date().toISOString(),status:response.status,payload:await response.json()};
   fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,zlib.gzipSync(JSON.stringify(raw)));return raw;
 }catch(e){error=e;}
 failures.push({url,key,error:error.message});return null;
}
async function parallel(jobs,worker){let index=0;await Promise.all(Array.from({length:6},async()=>{while(index<jobs.length)await worker(jobs[index++]);}));}
async function main(){
 fs.mkdirSync(analysis,{recursive:true});
 for(const [src,name] of [['data/normalized/champions-player-stats-2026-27.json','players-before.json'],['data/sources/champions-pilot-match-stats-2025-27.json','teams-before.json']])if(!fs.existsSync(path.join(analysis,name)))fs.copyFileSync(path.join(root,src),path.join(analysis,name));
 const jobs=new Map(),schedules=[],rosters=[];
 const add=(id,league,date)=>{if(official(league)&&inScope(date,league))jobs.set(String(id),{id:String(id),league,date});};
 for(const m of config.matches.filter(m=>m.season==='2026-27'))add(m.eventId,m.league,m.date);
 await parallel(config.teams,async team=>{
   const s=await request(`https://site.api.espn.com/apis/site/v2/sports/soccer/all/teams/${team.espnTeamId}/schedule?season=2026&limit=1000`,'schedules/'+team.id);
   if(s){schedules.push({teamId:team.id,providerTeamId:team.espnTeamId,url:s.url,events:s.payload.events?.length||0});for(const e of s.payload.events||[]){const comp=e.competitions?.[0];if(comp?.status?.type?.completed)add(e.id,e.league?.slug,e.date?.slice(0,10));}}
   const r=await request(`https://site.api.espn.com/apis/site/v2/sports/soccer/${team.league}/teams/${team.espnTeamId}/roster?season=2026`,'rosters/'+team.id);
   if(r)rosters.push({teamId:team.id,providerTeamId:team.espnTeamId,athletes:r.payload.athletes?.length||0});
 });
 console.log('Calendari '+schedules.length+'/36; referti da verificare '+jobs.size);
 let done=0;
 await parallel([...jobs.values()],async job=>{
   await request(`https://site.api.espn.com/apis/site/v2/sports/soccer/${job.league}/summary?event=${job.id}`,'summaries/'+job.league+'/'+job.id);
   done++;if(done%50===0)console.log('Referti '+done+'/'+jobs.size);
 });
 save(path.join(analysis,'acquisition.json'),{asOf:'2026-10-20',scope:'All official club competitions; calendar-year 2026 for Norwegian leagues',schedules,rosters,events:[...jobs.values()],failures});
 console.log(JSON.stringify({events:jobs.size,failures:failures.length,players:dataset.teams.reduce((s,t)=>s+t.players.length,0)}));
}
if(require.main===module)main().catch(e=>{console.error(e);process.exitCode=1;});
module.exports={official,inScope,rawRoot,analysis,request,parallel};
