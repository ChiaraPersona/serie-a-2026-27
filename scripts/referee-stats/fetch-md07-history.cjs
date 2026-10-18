const fs=require('node:fs'),zlib=require('node:zlib'),crypto=require('node:crypto');
const root='data/raw/referee-stats/md07-history-2026-10-18';fs.mkdirSync(root,{recursive:true});
const data=JSON.parse(fs.readFileSync('data/sources/reading-referee-match-history.json'));
const fixtures=JSON.parse(fs.readFileSync('data/normalized/matches.json')).filter(m=>m.competition==='serie-a'&&m.matchday===7);
const refs=fixtures.map(m=>m.refereeAssignment.referee);
const requests=refs.flatMap(r=>[
 {refereeId:r.slug,provider:'ofstats',url:`https://ofstats.com/referee/${['marco-di-bello','davide-massa'].includes(r.slug)?r.slug+'-2':r.slug}`},
 {refereeId:r.slug,provider:'aipredict',url:`https://aipredict.io/football/referee/${r.slug}/`},
 ...[data.profiles.find(p=>p.refereeSlug===r.slug)].filter(Boolean).map(p=>({refereeId:r.slug,provider:'calciotel',url:p.source.url}))
]);
requests.push({refereeId:'juan-luca-sacchi',provider:'datasport',url:'https://www.datasport.it/calcio/arbitri/Sacchi-Juan-luca-30.html'});
requests.push({refereeId:'juan-luca-sacchi',provider:'soccerbase',url:'https://www.soccerbase.com/referees/referee.sd?referee_id=1809'});
requests.push({refereeId:'juan-luca-sacchi',provider:'ofstats-season',url:'https://ofstats.com/season/italy-serie-b-2025-2026'});
async function main(){
 const results=await Promise.all(requests.map(async r=>{const rawPath=`${root}/${r.refereeId}-${r.provider}.html.gz`;
  try{let html;if(fs.existsSync(rawPath))html=zlib.gunzipSync(fs.readFileSync(rawPath)).toString();else{const response=await fetch(r.url,{signal:AbortSignal.timeout(25000)});if(!response.ok)throw Error('HTTP '+response.status);html=await response.text();}
   return {...r,rawPath,retrievedAt:new Date().toISOString(),sha256:crypto.createHash('sha256').update(html).digest('hex'),html};
  }catch(e){return {...r,error:e.message};}
 }));
 for(const r of results){if(r.html)fs.writeFileSync(r.rawPath,zlib.gzipSync(r.html));console.log(r.refereeId,r.provider,r.html?.length||r.error);delete r.html;}
 fs.writeFileSync(`${root}/manifest.json`,JSON.stringify(results,null,2)+'\n');
}
main().catch(e=>{console.error(e);process.exitCode=1});
