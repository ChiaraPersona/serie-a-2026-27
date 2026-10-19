const fs=require('node:fs'),zlib=require('node:zlib'),crypto=require('node:crypto');
const root='data/raw/referee-stats/md07-history-2026-10-18/details';fs.mkdirSync(root,{recursive:true});
const db=JSON.parse(fs.readFileSync('data/normalized/referee-history/md07-2026-27.json'));
const fixtures=JSON.parse(fs.readFileSync('data/normalized/matches.json')).filter(f=>f.competition==='serie-a'&&f.matchday===7);
const selected=new Map();
for(const ref of db.referees){
 const cutoff=fixtures.find(f=>f.refereeAssignment.referee.slug===ref.refereeId).date;
 const recent=new Set(ref.matches.filter(m=>m.date<cutoff).slice(0,5).map(m=>m.id));
 for(const m of ref.matches.filter(m=>!m.competition||recent.has(m.id))){
  const url=m.observations.map(o=>o.original.matchUrl).find(u=>u?.startsWith('https://ofstats.com/matches/view/'))||(recent.has(m.id)?`https://ofstats.com/matches/view/${m.homeTeamId}-${m.awayTeamId}-${m.date}`:null);
  if(url)selected.set(url,{refereeId:ref.refereeId,matchId:m.id,date:m.date,url});
 }
}
async function main(){const jobs=[...selected.values()],results=[];let cursor=0;
 const worker=async()=>{for(;;){const job=jobs[cursor++];if(!job)break;const rawPath=`${root}/${job.matchId}.html.gz`;
  try{let html;if(fs.existsSync(rawPath))html=zlib.gunzipSync(fs.readFileSync(rawPath)).toString();else{const r=await fetch(job.url,{signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error('HTTP '+r.status);html=await r.text();fs.writeFileSync(rawPath,zlib.gzipSync(html));}
   results.push({...job,rawPath,retrievedAt:new Date().toISOString(),sha256:crypto.createHash('sha256').update(html).digest('hex')});
  }catch(e){results.push({...job,error:e.message});}
  if(results.length%40===0)console.log('Archived',results.length,'/',jobs.length);
 }};
 await Promise.all(Array.from({length:4},worker));results.sort((a,b)=>a.url.localeCompare(b.url));fs.writeFileSync(root+'/manifest.json',JSON.stringify(results,null,2)+'\n');console.log(JSON.stringify({requested:jobs.length,archived:results.filter(r=>!r.error).length,failed:results.filter(r=>r.error)}));
}
main().catch(e=>{console.error(e);process.exitCode=1});
