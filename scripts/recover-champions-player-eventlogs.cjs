"use strict";
const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const {request,parallel,analysis,rawRoot,official}=require('./recover-champions-season-shots.cjs');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const save=(p,d)=>fs.writeFileSync(p,JSON.stringify(d,null,2)+'\n');
const candidate=read(path.join(analysis,'shooting-candidate.json'));
const config=read('data/sources/champions-pilot-match-stats-2025-27.json');
function club(league){return official(league)&&! /^(fifa\.(world|worldq|confederations|olympics)|uefa\.(euro|euroq|nations)|concacaf\.|conmebol\.|caf\.|afc\.|ofc\.|international|uefa\.u|fifa\.u)/.test(league);}
async function main(){
 const targets=[...new Map(candidate.players.filter(p=>p.providerPlayerId).map(p=>[p.providerPlayerId,p])).values()];
 const events=new Map(),failures=[],logs=[];let done=0;
 await parallel(targets,async p=>{
   const cfg=config.teams.find(t=>t.id===p.teamId);
   const url=`https://sports.core.api.espn.com/v2/sports/soccer/leagues/${cfg.league}/athletes/${p.providerPlayerId}/eventlog?season=2026&limit=100`;
   const raw=await request(url,'eventlogs/'+p.providerPlayerId);
   if(!raw){failures.push({player:p.playerId,url});return;}
   const items=raw.payload.events?.items||[];
   const pages=raw.payload.events?.pageCount||1;
   for(let page=2;page<=pages;page++){
     const extra=await request(url+'&page='+page,'eventlogs/'+p.providerPlayerId+'-page-'+page);
     if(extra)items.push(...(extra.payload.events?.items||[]));else failures.push({player:p.playerId,page,url});
   }
   for(const item of items){
     const ref=item.event?.$ref||'';
     const match=/\/leagues\/([^/]+)\/events\/(\d+)/.exec(ref);
     if(match&&club(match[1]))events.set(match[2],{eventId:match[2],league:match[1]});
   }
   logs.push({providerPlayerId:p.providerPlayerId,count:items.length,played:items.filter(i=>i.played).length,pages,url});
   done++;if(done%100===0)console.log('Registri individuali '+done+'/'+targets.length);
 });
 let acquired=0;
 await parallel([...events.values()],async e=>{
   const raw=await request(`https://site.api.espn.com/apis/site/v2/sports/soccer/${e.league}/summary?event=${e.eventId}`,'summaries/'+e.league+'/'+e.eventId);
   if(!raw)failures.push(e);
   acquired++;if(acquired%150===0)console.log('Referti da registri '+acquired+'/'+events.size);
 });
 save(path.join(analysis,'eventlog-acquisition.json'),{asOf:'2026-10-20',logs,events:[...events.values()],failures});
 console.log(JSON.stringify({players:targets.length,events:events.size,failures:failures.length}));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
