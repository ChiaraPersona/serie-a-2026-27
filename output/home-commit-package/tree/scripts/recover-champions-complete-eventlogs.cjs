"use strict";
const fs=require('fs'),path=require('path'),zlib=require('zlib');
const {request,parallel,analysis,officialClub}=require('./recover-champions-season-shots.cjs');
const candidate=JSON.parse(fs.readFileSync(path.join(analysis,'shooting-candidate.json'),'utf8'));
const save=(p,d)=>fs.writeFileSync(p,JSON.stringify(d,null,2)+'\n');
async function main(){
 const targets=[...new Map(candidate.players.filter(p=>p.providerPlayerId).map(p=>[p.providerPlayerId,p])).values()];
 const leagueJobs=[],failures=[];let done=0;
 await parallel(targets,async p=>{
   const raw=await request(`https://sports.core.api.espn.com/v2/sports/soccer/athletes/${p.providerPlayerId}/leagues?limit=100`,'athlete-leagues/'+p.providerPlayerId,{allow404:true});
   if(!raw||raw.status!==200){failures.push({player:p.playerId,stage:'league-index'});return;}
   const leagues=(raw.payload.items||[]).map(i=>/\/leagues\/([^?]+)/.exec(i.$ref||'')?.[1]).filter(officialClub);
   for(const league of new Set(leagues))leagueJobs.push({providerPlayerId:p.providerPlayerId,league});
   done++;if(done%200===0)console.log('Indici competizioni '+done+'/'+targets.length);
 });
 console.log('Registri stagionali per competizione da verificare '+leagueJobs.length);
 const eventJobs=new Map(),logs=[];done=0;
 await parallel(leagueJobs,async p=>{
   const url=`https://sports.core.api.espn.com/v2/sports/soccer/leagues/${p.league}/seasons/2026/athletes/${p.providerPlayerId}/eventlog?limit=100`;
   const raw=await request(url,'season-eventlogs/'+p.providerPlayerId+'/'+p.league,{allow404:true});
   if(!raw){failures.push({...p,stage:'season-eventlog'});return;}
   const items=raw.payload.events?.items||[];
   for(let page=2;page<=(raw.payload.events?.pageCount||1);page++){
     const extra=await request(url+'&page='+page,'season-eventlogs/'+p.providerPlayerId+'/'+p.league+'-page-'+page,{allow404:true});
     if(extra)items.push(...(extra.payload.events?.items||[]));else failures.push({...p,stage:'page',page});
   }
   for(const item of items){const match=/\/leagues\/([^/]+)\/events\/(\d+)/.exec(item.event?.$ref||'');if(match&&officialClub(match[1]))eventJobs.set(match[2],{eventId:match[2],league:match[1]});}
   logs.push({...p,status:raw.status,count:items.length,reportedCount:raw.payload.events?.count??null,played:items.filter(i=>i.played).length,sourceUrl:url});
   done++;if(done%500===0)console.log('Registri stagionali '+done+'/'+leagueJobs.length);
 });
 save(path.join(analysis,'complete-eventlog-acquisition.json'),{asOf:'2026-10-20',logs,events:[...eventJobs.values()],failures});
 console.log('Referti stagionali da verificare '+eventJobs.size);
 done=0;
 await parallel([...eventJobs.values()],async e=>{
   const raw=await request(`https://site.api.espn.com/apis/site/v2/sports/soccer/${e.league}/summary?event=${e.eventId}`,'summaries/'+e.league+'/'+e.eventId,{allow404:true});
   if(!raw||raw.status!==200)failures.push({...e,stage:'summary'});
   done++;if(done%500===0)console.log('Referti stagionali '+done+'/'+eventJobs.size);
 });
 save(path.join(analysis,'complete-eventlog-acquisition.json'),{asOf:'2026-10-20',logs,events:[...eventJobs.values()],failures});
 console.log(JSON.stringify({players:targets.length,leagueJobs:leagueJobs.length,events:eventJobs.size,failures:failures.length}));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
