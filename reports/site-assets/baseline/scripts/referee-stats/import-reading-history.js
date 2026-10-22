// Optional public-profile refresh for the existing referee archive. No model inputs are written.
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),crypto=require('node:crypto');
const {referee}=require('./canonical');
const root=path.resolve(__dirname,'../..');
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const text=s=>s.replace(/<[^>]*>/g,' ').replace(/&nbsp;|&#160;/g,' ').replace(/&amp;/g,'&').replace(/&#039;|&#39;/g,"'").replace(/&quot;/g,'"').replace(/\s+/g,' ').trim();
const identity=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z ]/g,' ').split(/\s+/).filter(Boolean).sort().join(' ');
const count=s=>/^\d+$/.test(s)?Number(s):null;
function parseMatches(html){
 const table=html.slice(html.indexOf('Elenco generale gare dirette'));
 return [...table.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].flatMap(([,row])=>{
  const c=[...row.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map(m=>text(m[1]));
  if(c.length!==8||!/^\d{2}\/\d{2}\/\d{4}$/.test(c[1]))return [];
  const teams=c[3].split(/\s+-\s+/),score=c[4].match(/^(\d+)\s*-\s*(\d+)$/);if(teams.length!==2||!score)return [];
  const [day,month,year]=c[1].split('/');
  const dismissals=count(c[6]);
  return [{date:`${year}-${month}-${day}`,season:c[0],competition:c[2],home:teams[0],away:teams[1],score:{home:Number(score[1]),away:Number(score[2])},yellowCards:count(c[5]),dismissals,secondYellowCards:dismissals===0?0:null,directRedCards:dismissals===0?0:null,penaltiesAwarded:count(c[7])}];
 });
}
async function main(){
 const asOf=process.argv.find(a=>/^\d{4}-\d{2}-\d{2}$/.test(a))||'2026-10-18';
 const rawRoot=path.join(root,'data/raw/referee-stats/calciotel',asOf);fs.mkdirSync(rawRoot,{recursive:true});
 const snapshot=async(url,name)=>{const file=path.join(rawRoot,name+'.html.gz');if(fs.existsSync(file))return zlib.gunzipSync(fs.readFileSync(file)).toString('utf8');const response=await fetch(url);if(!response.ok)throw Error(`${response.status}: ${url}`);const html=await response.text();fs.writeFileSync(file,zlib.gzipSync(Buffer.from(html)));return html;};
 const officials=new Map(read('data/normalized/matches.json').flatMap(m=>m.refereeAssignment?.referee?[[m.refereeAssignment.referee.slug,m.refereeAssignment.referee.name]]:[]));
 const links=new Map();
 // Public alphabetical index; exact token equality only, never fuzzy matching.
 for(const letter of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'){
  const first=await snapshot(`https://www.calciotel.it/arbitri/?lettera=${letter}`,'index-'+letter);
  const pages=new Set([1,...[...first.matchAll(/arbitri\.php\?lettera=[A-Z](?:&amp;|&)page=(\d+)/g)].map(m=>Number(m[1]))]);
  for(const page of pages){
  const html=page===1?first:await snapshot(`https://www.calciotel.it/arbitri.php?lettera=${letter}&page=${page}`,'index-'+letter+'-'+page);
  for(const [,href,label] of html.matchAll(/<a\b[^>]*href="(\/arbitro\/[^"?#]+)"[^>]*>([\s\S]*?)<\/a>/gi)){
   const key=identity(text(label));if(!links.has(key))links.set(key,new Set());links.get(key).add(href);
  }
  }
 }
 const profiles=[],missing=[];
 for(const [slug,name] of officials){
  const hits=links.get(identity(name));if(!hits||hits.size!==1){missing.push({slug,name,reason:hits?'AMBIGUOUS_IDENTITY':'NO_EXACT_IDENTITY'});continue;}
  const url='https://www.calciotel.it'+[...hits][0],html=await snapshot(url,slug);
  const heading=text(html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1]||'').replace(/^Scheda Arbitro:\s*/i,'').replace(/\s*\(Sezione.*$/i,'');
  if(identity(heading)!==identity(name))throw Error('Profile identity mismatch: '+slug);
  const matches=parseMatches(html).filter(m=>m.date<=asOf).slice(0,40);
  if(!matches.length){missing.push({slug,name,reason:'NO_PARSED_MATCHES'});continue;}
  profiles.push({refereeSlug:referee(name).slug,name,matches,source:{provider:'Calciotel',url,retrievedAt:asOf,rawPath:path.relative(root,path.join(rawRoot,slug+'.html.gz')).replace(/\\/g,'/'),sha256:crypto.createHash('sha256').update(html).digest('hex'),definitions:{yellowCards:'Amm',dismissals:'Esp; split between second-yellow and direct red not exposed',penaltiesAwarded:'Rig; penalties awarded during match, not shootout kicks'}}});
  console.log(slug,matches.length);
 }
 const output={schemaVersion:1,asOf,informationalOnly:true,profiles,missing};
 fs.writeFileSync(path.join(root,'data/sources/reading-referee-match-history.json'),JSON.stringify(output,null,2)+'\n');
 console.log(JSON.stringify({profiles:profiles.length,missing}));
}
module.exports={parseMatches,identity};
if(require.main===module)main().catch(e=>{console.error(e);process.exitCode=1});
