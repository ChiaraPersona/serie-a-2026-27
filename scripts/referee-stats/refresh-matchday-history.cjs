// Refresh only the requested officials; retain raw evidence and unrelated analyses.
const fs=require('node:fs'),zlib=require('node:zlib'),crypto=require('node:crypto');
const {parseMatches,identity}=require('./import-reading-history');
const {clean,parseOfstats}=require('./history-parsers.cjs');
const arg=(k,d)=>{const i=process.argv.indexOf(k);return i<0?d:process.argv[i+1]};
const matchday=Number(arg('--matchday','8')),asOf=arg('--as-of','2026-10-23');
if(!Number.isInteger(matchday)||matchday<1||matchday>38||!/^\d{4}-\d{2}-\d{2}$/.test(asOf))throw Error('Invalid scope');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const fixtures=read('data/normalized/matches.json').filter(m=>m.competition==='serie-a'&&m.matchday===matchday);
const sourceFile='data/sources/reading-referee-match-history.json',source=read(sourceFile);
const dir=`data/raw/referee-stats/md${String(matchday).padStart(2,'0')}-history-${asOf}`;
fs.mkdirSync(dir,{recursive:true});
async function main(){
 const results=await Promise.all(fixtures.map(async f=>{
  const ref=f.refereeAssignment.referee,profile=source.profiles.find(p=>p.refereeSlug===ref.slug);
  // Explicit, verified identity for the official absent from the existing registry.
  const url=profile?.source.url||({'andrea-zanotti':'https://www.calciotel.it/arbitro/2644/zanotti-andrea'})[ref.slug];
  if(!url)return {refereeId:ref.slug,provider:'calciotel',error:'No exact profile URL in verified registry',matches:[]};
  const response=await fetch(url,{signal:AbortSignal.timeout(30000)});if(!response.ok)throw Error(`${response.status}: ${url}`);
  const html=await response.text(),heading=clean(html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1]).replace(/^Scheda Arbitro:\s*/i,'').replace(/\s*\(Sezione.*$/i,'');
  if(identity(heading)!==identity(ref.name))throw Error('Profile identity mismatch: '+ref.slug);
  const matches=parseMatches(html).filter(m=>m.date<=asOf);if(!matches.length)throw Error('Empty profile: '+ref.slug);
  const rawPath=`${dir}/${ref.slug}-calciotel.html.gz`;fs.writeFileSync(rawPath,zlib.gzipSync(html));
  return {refereeId:ref.slug,provider:'calciotel',url,rawPath,retrievedAt:new Date().toISOString(),sha256:crypto.createHash('sha256').update(html).digest('hex'),matches};
 }));
 // A second observation supplies fouls where available. A failed/ambiguous profile never contributes data.
 const secondary=await Promise.all(fixtures.map(async f=>{
  const ref=f.refereeAssignment.referee,url=`https://ofstats.com/referee/${ref.slug}`;
  try{
   const response=await fetch(url,{signal:AbortSignal.timeout(25000)});if(!response.ok)throw Error('HTTP '+response.status);
   const html=await response.text();
   const labels=[...html.matchAll(/>\s*([^<>]+?)\s*</g)].map(m=>clean(m[1]));
   if(response.url!==url||!labels.some(label=>identity(label)===identity(ref.name)))throw Error('Unverified profile identity');
   const matches=parseOfstats(html);if(!matches.length)throw Error('No parsed matches');
   const rawPath=`${dir}/${ref.slug}-ofstats.html.gz`;fs.writeFileSync(rawPath,zlib.gzipSync(html));
   return {refereeId:ref.slug,provider:'ofstats',url,rawPath,retrievedAt:new Date().toISOString(),sha256:crypto.createHash('sha256').update(html).digest('hex'),rows:matches.length};
  }catch(e){return {refereeId:ref.slug,provider:'ofstats',url,error:e.message};}
 }));
 fs.writeFileSync(`${dir}/manifest.json`,JSON.stringify([...results.map(({matches,...r})=>({...r,rows:matches.length})),...secondary],null,2)+'\n');
 // Keep existing profiles unchanged: the full refresh enters through the new manifest.
 for(const r of results)if(!r.error&&!source.profiles.some(p=>p.refereeSlug===r.refereeId)){
  const {matches,refereeId,...provenance}=r;
  source.profiles.push({refereeSlug:refereeId,name:fixtures.find(f=>f.refereeAssignment.referee.slug===refereeId).refereeAssignment.referee.name,matches,source:provenance});
 }
 const historyRef=`data/normalized/referee-history/md${String(matchday).padStart(2,'0')}-2026-27.json`;
 source.fixtureAnalyses=[...(source.fixtureAnalyses||[]).filter(a=>!fixtures.some(f=>f.id===a.fixtureId)),...fixtures.map(f=>({fixtureId:f.id,refereeSlug:f.refereeAssignment.referee.slug,historyRef,retrievedAt:asOf,informationalOnly:true}))];
 source.refreshes={...source.refreshes,[`md${matchday}`]:{asOf,manifest:`${dir}/manifest.json`}};
 fs.writeFileSync(sourceFile,JSON.stringify(source,null,2)+'\n');
 console.log(JSON.stringify({matchday,profiles:results.map(r=>({id:r.refereeId,rows:r.matches.length})),secondary}));
}
main().catch(e=>{console.error(e);process.exitCode=1});
