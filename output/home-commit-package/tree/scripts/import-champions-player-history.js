"use strict";
const fs=require('fs'),path=require('path'),zlib=require('zlib');
const root=path.resolve(__dirname,'..'),cache=path.join(root,'data/raw/champions-player-stats/espn/season-statistics');
fs.mkdirSync(cache,{recursive:true});
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
async function request(url,key){
 const file=path.join(cache,`${key}.json.gz`);
 if(!process.argv.includes("--refresh")&&fs.existsSync(file))return JSON.parse(zlib.gunzipSync(fs.readFileSync(file)));
 let last;
 for(let i=0;i<3;i++)try{
  const response=await fetch(url,{signal:AbortSignal.timeout(20000),headers:{accept:'application/json'}});
  if(!response.ok&&response.status!==404)throw Error(`HTTP ${response.status}`);
  const value={url,retrievedAt:new Date().toISOString(),status:response.status,payload:response.status===404?null:await response.json()};
  fs.writeFileSync(file,zlib.gzipSync(JSON.stringify(value)));return value;
 }catch(e){last=e;}
 throw last;
}
async function main(){
 const dataset=read('data/normalized/champions-player-stats-2025-26.json');
 const targets=dataset.teams.flatMap(t=>t.players.filter(p=>!p.previousSeason&&p.providerPlayerId).map(p=>({...p,team:t.team})));
 const previousPath="data/sources/champions-player-season-history-2025-26.json";
 const previous=fs.existsSync(path.join(root,previousPath))?read(previousPath).players:[];
 const results=[];let next=0;
 await Promise.all(Array.from({length:5},async()=>{while(next<targets.length){
  const player=targets[next++],id=player.providerPlayerId,entries=[],errors=[];
  try{
   const index=await request(`https://sports.core.api.espn.com/v2/sports/soccer/athletes/${id}/leagues?lang=en&region=us&limit=100`,`${id}-leagues`);
   const leagues=[...new Set((index.payload?.items||[]).map(v=>v.$ref?.match(/\/leagues\/([^?]+)/)?.[1]).filter(v=>v&&(/^[a-z]{3}\.[12]$/.test(v)||/^uefa\.(champions|europa|europa.conf)$/.test(v))))];
   for(const league of leagues){try{
    const season=await request(`https://sports.core.api.espn.com/v2/sports/soccer/leagues/${league}/seasons/2025?lang=en&region=us`,`${league}-season-2025`);
    const seasonName=season.payload?.displayName||'';
    const seasonLabel=/2025[-/]26/.test(seasonName)?'2025/26':/^2025 /.test(seasonName)&&season.payload?.year===2025?'2025':null;
    if(!seasonLabel)continue;
    const value=await request(`https://sports.core.api.espn.com/v2/sports/soccer/leagues/${league}/seasons/2025/types/1/athletes/${id}/statistics/0?lang=en&region=us`,`${id}-${league}-2025`);
    const stats=Object.fromEntries((value.payload?.splits?.categories||[]).flatMap(c=>c.stats||[]).filter(s=>typeof s.value==='number'&&Number.isFinite(s.value)).map(s=>[s.name,s.value]));
    if(stats.appearances>0)entries.push({league,seasonLabel,competition:season.payload.displayName,stats,sourceUrl:value.url,retrievedAt:value.retrievedAt});
   }catch(e){errors.push(`${league}: ${e.message}`);}}
  }catch(e){errors.push(e.message);}
  results.push({team:player.team,playerId:player.id,name:player.name,providerPlayerId:id,entries,errors});
  if(results.length%20===0)console.log(`Consultati ${results.length}/${targets.length}; recuperati ${results.filter(p=>p.entries.length).length}`);
 }}));
 const output={season:'2025/26',retrievedAt:new Date().toISOString(),source:'ESPN seasonal athlete statistics; verified 2025-26 or calendar-year 2025 seasons explicitly labelled, positive appearances; no inferred zeros',players:[...previous.filter(p=>!results.some(r=>r.team===p.team&&r.playerId===p.playerId)),...results].sort((a,b)=>`${a.team}|${a.playerId}`.localeCompare(`${b.team}|${b.playerId}`))};
 fs.writeFileSync(path.join(root,'data/sources/champions-player-season-history-2025-26.json'),JSON.stringify(output,null,2)+'\n');
 console.log(`Storico: ${results.filter(p=>p.entries.length).length} recuperati su ${targets.length} ID consultati; ${results.filter(p=>p.errors.length).length} con errori.`);
}
main().catch(e=>{console.error(e);process.exitCode=1});
