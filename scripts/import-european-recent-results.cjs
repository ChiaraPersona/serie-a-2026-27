'use strict';
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
// Explicit fixture and provider identities, verified against archived ESPN summaries.
const jobs=[
 ['milan-benfica-2026-27-uel-01','401915586','103','1929'],
 ['salisburgo-milan-2026-27-uel-02','401915568','2790','103'],
 ['bournemouth-milan-2026-27-uel-03','401915552','349','103'],
 ['milan-ferencaros-2026-27-uel-04','401915534','103','622'],
 ['juventus-nec-nijmegen-2026-27-uel-01','401915582','111','147'],
 ['celta-vigo-juventus-2026-27-uel-02','401915560','85','111'],
 ['juventus-rennes-2026-27-uel-03','401915547','111','169'],
 ['az-alkmaar-juventus-2026-27-uel-04','401915529','140','111'],
 ['atalanta-pafos-2026-27-uecl-01','401915746','105','22281'],
 ['ajax-atalanta-2026-27-uecl-02','401915837','139','105'],
 ['atalanta-kairat-almaty-2026-27-uecl-03','401915830','105','2528']
];
const keys={shots:'totalShots',shotsOnTarget:'shotsOnTarget',corners:'wonCorners',fouls:'foulsCommitted',yellowCards:'yellowCards',redCards:'redCards',possessionPct:'possessionPct',expectedGoals:'expectedGoals'};
const numeric=v=>typeof v==='number'&&Number.isFinite(v)?v:typeof v==='string'&&/^\d+(\.\d+)?%?$/.test(v)?Number(v.replace('%','')):null;
function normalize(raw,fixture,job){
 const d=raw.payload||raw,c=d.header?.competitions?.[0];
 assert.equal(String(d.header?.id),job[1]);assert.equal(c?.date?.slice(0,10),fixture.date);
 assert.equal(d.header?.league?.slug,fixture.competition==='europa-league'?'uefa.europa':'uefa.europa.conf');
 for(const [side,index]of [['home',2],['away',3]])assert.equal(String(c.competitors.find(t=>t.homeAway===side)?.team?.id),job[index]);
 if(!c.status?.type?.completed)return null;
 const score=Object.fromEntries(['home','away'].map(side=>[side,numeric(c.competitors.find(t=>t.homeAway===side).score)]));
 assert(Object.values(score).every(Number.isInteger),'Incomplete final score');
 const teamStats=Object.fromEntries(['home','away'].map((side,i)=>{
  const box=d.boxscore?.teams?.find(t=>String(t.team.id)===job[i+2]);
  const stats=Object.fromEntries((box?.statistics||[]).map(s=>[s.name,numeric(s.value??s.displayValue)]));
  return [side,Object.fromEntries(Object.entries(keys).map(([k,v])=>[k,stats[v]??null]))];
 }));
 return {...fixture,status:'finished',score,teamStats,resultSource:{provider:'ESPN',url:raw.url,retrievedAt:raw.retrievedAt},providerEventId:job[1]};
}
async function build({refresh=false}={}){
 const calendar=read('data/normalized/european-fixtures-2026-27.json'),fixtures=[];
 for(const job of jobs){
  const fixture=calendar.fixtures.find(f=>f.id===job[0]);assert(fixture);
  const league=fixture.competition==='europa-league'?'uefa.europa':'uefa.europa.conf';
  const rawPath=`data/raw/european-recent-results/2026-11-06/${job[1]}.json.gz`;
  const fallback=`data/raw/champions-season-shots/2026-10-20/summaries/${league}/${job[1]}.json.gz`;
  let raw;
  if(refresh){
   const url=`https://site.api.espn.com/apis/site/v2/sports/soccer/${league}/summary?event=${job[1]}`;
   const response=await fetch(url);assert(response.ok,`HTTP ${response.status}: ${job[1]}`);
   raw={url,retrievedAt:new Date().toISOString(),payload:await response.json()};
   normalize(raw,fixture,job); // Verify identity before saving.
   fs.mkdirSync(path.dirname(path.join(root,rawPath)),{recursive:true});
   fs.writeFileSync(path.join(root,rawPath),zlib.gzipSync(JSON.stringify(raw)));
  }else raw=JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(root,fs.existsSync(path.join(root,rawPath))?rawPath:fallback))));
  const normalized=normalize(raw,fixture,job);
  if(normalized){const used=fs.existsSync(path.join(root,rawPath))?rawPath:fallback;fixtures.push({...normalized,evidence:{rawPath:used,sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(root,used))).digest('hex')}});}
 }
 const file='data/normalized/european-recent-results-2026-27.json';
 fs.writeFileSync(path.join(root,file),JSON.stringify({schemaVersion:1,season:'2026-27',fixtures},null,2)+'\n');
 console.log(JSON.stringify(fixtures.map(f=>({id:f.id,score:f.score})),null,2));return fixtures;
}
module.exports={build,normalize,jobs};if(require.main===module)build({refresh:process.argv.includes('--refresh')}).catch(e=>{console.error(e.message);process.exitCode=1});
