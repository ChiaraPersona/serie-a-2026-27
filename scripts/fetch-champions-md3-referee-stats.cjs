'use strict';
const fs=require('node:fs'),zlib=require('node:zlib'),crypto=require('node:crypto');
const root='data/raw/champions-referees/md03-2026-10-20';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const decode=t=>t.replace(/<[^>]*>/g,' ').replace(/&amp;/g,'&').replace(/&#39;/g,"'").replace(/\s+/g,' ').trim();
const key=t=>t.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
// Explicit profile identities verified from the public profile titles, not inferred IDs.
const verified={
 'Luís Godinho':{url:'https://www.footymetrics.com/referees/117-luis-miguel-branco-godinho',name:'Luis Miguel Branco Godinho',evidence:'Public profile upcoming Club Brugge-Lens; full name linked from AEK-LASK referee card'},
 'Rade Obrenovič':{url:'https://www.footymetrics.com/referees/2692-rade-obrenovic',name:'Rade Obrenović'},
 'Davide Massa':{url:'https://www.footymetrics.com/referees/209-davide-massa',name:'Davide Massa'},
 'Harm Osmers':{url:'https://www.footymetrics.com/referees/236-harm-osmers',name:'Harm Osmers'},
 'István Kovács':{url:'https://www.footymetrics.com/referees/682-istvan-kovacs',name:'Istvan Kovacs'},
 'Simone Sozza':{url:'https://www.footymetrics.com/referees/111-simone-sozza',name:'Simone Sozza'}
};
async function main(){
 const directory=zlib.gunzipSync(fs.readFileSync(root+'/directory.html.gz')).toString();
 const links=[...directory.matchAll(/<a\b[^>]*href="(\/referees\/[^"?#]+)"[^>]*>([\s\S]*?)<\/a>/g)].map(m=>({url:'https://www.footymetrics.com'+m[1],label:decode(m[2])}));
 const registry=read('data/sources/champions-referees/registry-2026-27.json');
 const assignments=read('data/sources/champions-referee-assignments-md03-2026-27.json').assignments;
 const calendar=read('data/normalized/champions-league-2026-27.json');
 const {zonedLocalToUtc}=require('./champions/complete-forecast-snapshots');
 const manifest=[];
 for(const assignment of assignments){
  const fixture=calendar.fixtures.find(f=>f.id===assignment.fixtureId);
  if(fixture.status!=='scheduled'||Date.parse(zonedLocalToUtc(fixture.date,fixture.kickoff,'Europe/Rome'))<=Date.now())continue;
  const name=assignment.referee.name;
  const exact=registry.referees.find(r=>[r.name,...r.aliases].some(n=>key(n)===key(name)));
  const needles=[name,...(exact?[exact.providers.footymetrics.name,...exact.aliases]:[])];
  const hits=links.filter(l=>needles.some(n=>key(l.label)===key(n)||key(l.label).startsWith(key(n)+' ')));
  const urls=[...new Set(hits.map(h=>h.url))];
  const override=verified[name];
  const url=override?.url||exact?.providers.footymetrics.url||(urls.length===1?urls[0]:null);
  if(!url){manifest.push({fixtureId:fixture.id,refereeId:assignment.refereeId,name,status:'IDENTITY_UNRESOLVED',candidates:urls});continue;}
  const id=Number(url.match(/\/referees\/(\d+)/)[1]),file=`${root}/${id}.html.gz`;
  try{
   if(!fs.existsSync(file)){const response=await fetch(url,{signal:AbortSignal.timeout(25000)});if(!response.ok)throw Error('HTTP '+response.status);fs.writeFileSync(file,zlib.gzipSync(await response.text()));}
   const html=zlib.gunzipSync(fs.readFileSync(file)).toString();
   const title=decode(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1]||'');
   const providerName=override?.name||hits.find(h=>h.url===url)?.label.replace(/(?:Average|Strict|Calm).*$/,'').trim()||exact?.providers.footymetrics.name||name;
   if(![...needles,providerName].some(n=>key(title).startsWith(key(n))))throw Error('PROFILE_TITLE_MISMATCH: '+title);
   manifest.push({fixtureId:fixture.id,refereeId:assignment.refereeId,name,providerName,providerId:id,url,file,retrievedAt:fs.statSync(file).mtime.toISOString(),sha256:crypto.createHash('sha256').update(html).digest('hex'),status:'DOWNLOADED',title,...(override?.evidence?{identityEvidence:override.evidence}:{})});
  }catch(e){manifest.push({fixtureId:fixture.id,refereeId:assignment.refereeId,name,url,status:'FAILED',error:e.message});}
 }
 fs.writeFileSync(root+'/manifest.json',JSON.stringify(manifest,null,2)+'\n');
 console.log(manifest.map(m=>({name:m.name,status:m.status,url:m.url,error:m.error,candidates:m.candidates})));
}
main().catch(e=>{console.error(e);process.exitCode=1});
