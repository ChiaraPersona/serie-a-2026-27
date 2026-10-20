"use strict";
const fs=require('fs'),path=require('path'),zlib=require('zlib');
const {analysis,rawRoot,parallel}=require('./recover-champions-season-shots.cjs');
const {normalize}=require('./build-champions-player-stats');
const candidate=JSON.parse(fs.readFileSync(path.join(analysis,'shooting-candidate.json'),'utf8'));
const teams={ 'real-madrid':8633,inter:8636,napoli:9875,arsenal:9825,fenerbahce:8695,roma:8686,como:10171,leipzig:178475,'aek-athens':8563,'aston-villa':10252,'atletico-de-madrid':9906,barcelona:8634,'bayern-munchen':9823,'bodo-glimt':8402,'borussia-dortmund':9789,'club-brugge':8342,feyenoord:10235,galatasaray:8637,lask:9977,lens:8588,liverpool:8650,'manchester-city':8456,lille:8639,'manchester-united':10260,'paris-saint-germain':9847,porto:9773,'psv-eindhoven':8640,'real-betis':8603,sabah:951893,'slavia-praha':7787,'shakhtar-donetsk':9728,'slovan-bratislava':6019,stuttgart:10269,viking:8478,villarreal:10205,'sporting-cp':9768};
const directory=path.join(rawRoot,'fotmob');
const failures=[];
async function page(url,key){
 const file=path.join(directory,key+'.json.gz');let raw;
 if(fs.existsSync(file))raw=JSON.parse(zlib.gunzipSync(fs.readFileSync(file)));
 else try{const r=await fetch(url,{signal:AbortSignal.timeout(25000)});raw={url,status:r.status,retrievedAt:new Date().toISOString(),body:await r.text()};fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,zlib.gzipSync(JSON.stringify(raw)));}catch(e){failures.push({url,error:e.message});return null;}
 if(raw.status!==200){failures.push({url,status:raw.status});return null;}
 const match=/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/.exec(raw.body);
 if(!match){failures.push({url,error:'NO_PUBLIC_PAGE_DATA'});return null;}
 return {raw,props:JSON.parse(match[1]).props.pageProps};
}
async function main(){
 const mappings=[],jobs=[];
 await parallel(Object.entries(teams),async([teamId,id])=>{
   const result=await page(`https://www.fotmob.com/teams/${id}/squad/${teamId}`,'teams/'+teamId);if(!result)return;
   const data=result.props.fallback?.['team-'+id];if(!data){failures.push({teamId,error:'TEAM_DATA_MISSING'});return;}
   mappings.push({teamId,providerTeamId:id,details:data.details,sourceUrl:result.raw.url});
   const members=(data.squad?.squad||[]).filter(g=>g.title!=='coach').flatMap(g=>g.members||[]);
   for(const p of candidate.players.filter(p=>p.teamId===teamId)){
     const exact=members.filter(m=>normalize(m.name)===normalize(p.name));
     if(exact.length!==1)continue;
     // Existing complete evidence is checked by the other provider; retrieve gaps and unsupported domestic leagues.
     if(p.status==='shooting-values-available'&&!['sabah','slavia-praha','slovan-bratislava','shakhtar-donetsk','lask'].includes(teamId))continue;
     jobs.push({teamId,playerId:p.playerId,name:p.name,providerPlayerId:exact[0].id,providerTeamId:id});
   }
 });
 let done=0;const records=[];
 await parallel(jobs,async p=>{
   const result=await page(`https://www.fotmob.com/players/${p.providerPlayerId}/${p.playerId}`,'players/'+p.providerPlayerId);
   if(result){const d=result.props.data;records.push({...p,observedId:d?.id,observedName:d?.name,primaryTeam:d?.primaryTeam,mainLeague:d?.mainLeague,statSeasons:d?.statSeasons,firstSeasonStats:d?.firstSeasonStats,recentMatches:d?.recentMatches,retrievedAt:result.raw.retrievedAt,sourceUrl:result.raw.url});}
   done++;if(done%50===0)console.log('Schede individuali integrative '+done+'/'+jobs.length);
 });
 fs.writeFileSync(path.join(analysis,'fotmob-evidence.json'),JSON.stringify({asOf:'2026-10-20',mappings,records,failures},null,2)+'\n');
 console.log(JSON.stringify({teams:mappings.length,profiles:records.length,failures:failures.length}));
}
if(require.main===module)main().catch(e=>{console.error(e);process.exitCode=1;});
module.exports={teams,page};
