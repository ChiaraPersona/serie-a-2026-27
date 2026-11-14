const fs=require('fs'),assert=require('assert/strict'),crypto=require('crypto');
const {profilePayload,arrayField}=require('./champions/referee-profile-data.cjs');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const root='data/raw/champions-lineups/2026-11-04';
const pages=[['10',2685433,'aek-atene-real-madrid'],['11',2685434,'fenerbahce-liverpool'],['12',2685437,'borussia-d-r-betis'],['13',2685441,'porto-napoli'],['14',2685439,'psv-bruges'],['15',2685435,'rb-leipzig-manchester-city'],['16',2685436,'lens-como'],['17',2685438,'s-praga-arsenal'],['18',2685440,'viking-fk-sabah']];
const norm=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
const decode=s=>s.replace(/<[^>]*>/g,'').replace(/&amp;/g,'&').replace(/&#x27;|&#39;/g,"'").trim();
async function main(){
 fs.mkdirSync(root,{recursive:true});
 const source=read('data/sources/champions-probable-formations-md04-2026-27.json');
 const roster=read('data/normalized/champions-registered-squads-2026-27.json');
 const issues=[],manifest=[];
 const aliases=read('data/sources/lineups/champions-md04-preview-reviewed-aliases-20261104.json').aliases;
 for(const [suffix,id,slug]of pages){
  const url=`https://www.corrieredellosport.it/formazione/calcio/serie-a/2026/11/04-${id}/${slug}`,file=`${root}/${slug}.html`;
  if(!fs.existsSync(file)){const response=await fetch(url,{signal:AbortSignal.timeout(30000)});assert(response.ok);fs.writeFileSync(file,await response.text());}
  const html=fs.readFileSync(file,'utf8'),fixtureId=`ucl-2026-27-md04-${suffix}`;
  const formations=[...html.matchAll(/class="CampoSwitcher_teamFormation__[^"]*"[^>]*>([^<]+)/g)].map(m=>decode(m[1])).filter(v=>/^\d(-\d)+$/.test(v));
  assert(formations.length>=2,slug+': formations missing');
  for(const [i,venue]of ['home','away'].entries()){
   const team=source.teams.find(t=>t.fixtureId===fixtureId&&t.venue===venue),registered=roster.teams.find(t=>t.id===team.teamId||t.team===team.team);assert(registered);
   const pool=[...team.starters,...team.bench,...team.unavailable,...team.suspended,...team.doubtful,...team.caution];
   const extract=kind=>[...html.matchAll(new RegExp(`<span[^>]*class="ProbabiliFormazioni_${venue}Player${kind}__[^\"]*"[^>]*>([^<]*)<\\/span>\\s*<span[^>]*>(\\d*)<\\/span>`,'g'))].map(m=>({name:decode(m[1]),shirtNumber:m[2]?Number(m[2]):null}));
   function resolve(p){
    const exact=pool.filter(q=>[q.sourceName,q.canonicalName].filter(Boolean).some(n=>norm(n)===norm(p.name)));
    const rp=registered.players.filter(q=>q.id===aliases[team.team]?.[p.name]||norm(q.name)===norm(p.name));
    const ids=[...new Set([...exact.map(q=>q.playerId),...rp.map(q=>q.id)].filter(Boolean))];
    if(ids.length===1){const prior=pool.find(q=>q.playerId===ids[0]),member=registered.players.find(q=>q.id===ids[0]);return {...prior,sourceName:p.name,canonicalName:member?.name||prior?.canonicalName,playerId:ids[0],registeredPlayerId:member?.id||null,providerPlayerId:member?.providerIds?.espn||prior?.providerPlayerId||null,shirtNumber:p.shirtNumber};}
    issues.push({fixtureId,team:team.team,name:p.name,shirtNumber:p.shirtNumber});
    return {sourceName:p.name,canonicalName:p.name,playerId:null,registeredPlayerId:null,providerPlayerId:null,shirtNumber:p.shirtNumber,identityStatus:'unresolved-exact-name'};
   }
   const payload=profilePayload(html);
   const starters=arrayField(payload,venue+'Team').sort((a,b)=>a.index-b.index).map(p=>({name:p.nome,shirtNumber:p.numeroMaglia??null}));
   const bench=extract('Others');assert.equal(starters.length,11,team.team);assert(bench.length>0,team.team);
   team.starters=starters.map(resolve);team.bench=bench.map(resolve);team.formation=formations[i];
   team.coach=registered.coach?.replace(/-+$/,'').trim()||null;
   const sizes=[1,...team.formation.split('-').map(Number)];let offset=0;
   team.rawLine=team.team+': '+sizes.map(n=>{const names=team.starters.slice(offset,offset+n).map(p=>p.sourceName);offset+=n;return names.join(', ');}).join('; ');assert.equal(offset,11);
   team.benchStatus='documented-probable-bench';team.previewSource={url,file,retrievedAt:fs.statSync(file).mtime.toISOString()};
   const selected=new Set([...team.starters,...team.bench].map(p=>p.playerId).filter(Boolean));
   for(const key of ['unavailable','suspended','doubtful'])team[key]=team[key].filter(p=>!selected.has(p.playerId));
  }
  manifest.push({fixtureId,url,file,sha256:crypto.createHash('sha256').update(html).digest('hex')});
 }
 fs.writeFileSync(`${root}/manifest.json`,JSON.stringify({manifest,issues},null,2)+'\n');
 if(process.argv.includes('--write'))fs.writeFileSync('data/sources/champions-probable-formations-md04-2026-27.json',JSON.stringify(source,null,2)+'\n');
 console.log(JSON.stringify({fixtures:pages.length,unresolved:issues.length},null,2));
}
main().catch(e=>{console.error(e);process.exitCode=1});
