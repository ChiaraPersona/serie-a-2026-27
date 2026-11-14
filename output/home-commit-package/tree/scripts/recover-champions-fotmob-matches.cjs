"use strict";
const fs=require('fs'),path=require('path'),zlib=require('zlib');
const {analysis,rawRoot,parallel}=require('./recover-champions-season-shots.cjs');
const base=path.join(rawRoot,'fotmob');
const gz=f=>JSON.parse(zlib.gunzipSync(fs.readFileSync(f)));
function teamData(raw){
 if(raw.status!==200)return null;
 const tag=/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/.exec(raw.body);
 return tag?Object.values(JSON.parse(tag[1]).props.pageProps.fallback||{}).find(v=>v?.fixtures):JSON.parse(raw.body);
}
async function main(){
 const jobs=new Map(),teams=[];
 for(const file of fs.readdirSync(path.join(base,'teams')).filter(f=>!f.includes('retry'))){
   const d=teamData(gz(path.join(base,'teams',file)));if(!d)continue;
   const teamId=file.replace(/(?:-api)?\.json\.gz$/,'');
   const expected=[];
   for(const f of d.fixtures?.allFixtures?.fixtures||[]){
     const date=f.status?.utcTime?.slice(0,10),league=f.tournament?.leagueId;
     const from=league===59?'2026-01-01':'2026-07-01';
     if(!f.status?.finished||f.status.cancelled||f.status.awarded||!date||date<from||date>'2026-10-20'||/friendl|joan.?gamper|emirates|atlantic cup/i.test(f.tournament?.name||''))continue;
     jobs.set(String(f.id),{id:String(f.id),date,leagueId:league,competition:f.tournament.name});expected.push(String(f.id));
   }
   teams.push({teamId,providerTeamId:d.details.id,name:d.details.name,sourceFile:file,expectedFinishedMatches:expected,previousFixturesUrl:d.fixtures?.previousFixturesUrl});
 }
 console.log('Secondo provider: '+teams.length+' squadre, '+jobs.size+' referti ufficiali');
 const failures=[];let done=0;
 fs.mkdirSync(path.join(base,'matches'),{recursive:true});
 await parallel([...jobs.values()],async job=>{
   const file=path.join(base,'matches',job.id+'.json.gz');
   if(!fs.existsSync(file))try{
     const url='https://www.fotmob.com/api/data/matchDetails?matchId='+job.id;
     const r=await fetch(url,{signal:AbortSignal.timeout(25000)});
     if(!r.ok)throw Error('HTTP '+r.status);
     const raw={url,status:r.status,retrievedAt:new Date().toISOString(),payload:await r.json()};
     fs.writeFileSync(file,zlib.gzipSync(JSON.stringify(raw)));
   }catch(e){failures.push({...job,error:e.message});}
   done++;if(done%75===0)console.log('Referti integrativi '+done+'/'+jobs.size);
 });
 fs.writeFileSync(path.join(analysis,'fotmob-match-acquisition.json'),JSON.stringify({asOf:'2026-10-20',teams,events:[...jobs.values()],failures},null,2)+'\n');
 console.log(JSON.stringify({teams:teams.length,matches:jobs.size,failures:failures.length}));
}
if(require.main===module)main().catch(e=>{console.error(e);process.exitCode=1;});
module.exports={teamData};
