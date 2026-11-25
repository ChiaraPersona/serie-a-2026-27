'use strict';
// Refresh verified descriptive profiles; never write forecasts or markets.
const fs=require('node:fs'),zlib=require('node:zlib'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {parseProfile}=require('./import-champions-referee-history');
const {seasons}=require('./champions/referee-profile-data.cjs');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
async function build(){
 const directory='data/raw/champions-referees/md05-2026-11-24';fs.mkdirSync(directory,{recursive:true});
 const get=async(url,file)=>{if(!fs.existsSync(file)){const r=await fetch(url,{signal:AbortSignal.timeout(25000)});assert(r.ok,'HTTP '+r.status);fs.writeFileSync(file,zlib.gzipSync(await r.text()));}return zlib.gunzipSync(fs.readFileSync(file)).toString();};
 const index=await get('https://www.footymetrics.com/referees',directory+'/index.html.gz');
 const links=[...index.matchAll(/href="(\/referees\/[^"?#]+)"[^>]*>([\s\S]*?)<\/a>/g)].map(m=>({url:'https://www.footymetrics.com'+m[1],name:m[2].replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim()}));
 const aliases={'Umut Meler':'Halil Umut Meler','Alejandro Hernández':'Alejandro José Hernández Hernández','István Kovács':'Istvan Kovacs','Ivan Kružliak':'Ivan Kruzliak','Rade Obrenovič':'Rade Obrenović'};
 const verified={'Umut Meler':'139-halil-umut-meler','Javier Alberola Rojas':'7948-javier-alberola-rojas','Espen Eskås':'140-espen-eskas','Jérôme Brisard':'32-jerome-brisard','Erik Lambrechts':'4848-erik-lambrechts','Alejandro Hernández':'127-alejandro-jose-hernandez-hernandez'};
 const registry=read('data/sources/champions-referees/registry-2026-27.json').referees;
 const previous=[...read('data/normalized/champions-referee-profiles-md04-2026-27.json').fixtures,...read('data/normalized/champions-referee-dataset-md03-2026-27.json').fixtures];
 const fixtures=[];
 for(const a of read('data/sources/champions-referee-assignments-md05-2026-27.json').assignments){
  const name=a.referee.name,identity=registry.find(r=>a.refereeId&&r.id===a.refereeId),old=previous.find(r=>r.name===name);
  const names=[name,aliases[name],...(identity?.aliases||[])].filter(Boolean);
  const link=links.find(l=>names.includes(l.name));
  const url=identity?.providers?.footymetrics?.url||old?.source?.url||link?.url||(verified[name]?'https://www.footymetrics.com/referees/'+verified[name]:null);
  const row={fixtureId:a.fixtureId,refereeId:a.refereeId||null,name,predictionEligible:false};
  if(!url){fixtures.push({...row,status:'IDENTITY_UNRESOLVED',career:null,source:null});console.log(name+': missing exact profile; candidates '+JSON.stringify(links.filter(l=>l.name.includes(name.split(' ').at(-1)))));continue;}
  const id=Number(url.match(/\/referees\/(\d+)/)[1]),file=`${directory}/${id}.html.gz`;
  const html=await get(url,file),title=(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1]||'').replace(/<[^>]*>/g,'').trim();
  assert(names.some(n=>title.startsWith(n)),name+': profile identity mismatch '+title);
  const providerName=title.replace(/ referee stats.*$/,'');
  const profile=parseProfile({id:row.refereeId,name,providers:{footymetrics:{id,name:providerName,url}}},html);
  assert(profile.career.matches>0,name+': empty profile');
  const capturedAt=fs.statSync(file).mtime.toISOString();
  fixtures.push({...row,status:'AVAILABLE',capturedAt,source:{url,file,providerRefereeId:id,sha256:crypto.createHash('sha256').update(html).digest('hex'),retrievedAt:capturedAt},career:profile.career,seasonCompetitionSamples:seasons(html),quality:{aggregateCutoffCertified:false},sampleNote:'Storico descrittivo, tutte le competizioni; acquisizione '+capturedAt.slice(0,10)+'.'});
 }
 fs.writeFileSync('data/normalized/champions-referee-profiles-md05-2026-27.json',JSON.stringify({schemaVersion:1,matchday:5,predictionEligible:false,fixtures},null,2)+'\n');
 console.log(JSON.stringify(fixtures.map(r=>({name:r.name,status:r.status,matches:r.career?.matches}))));
}
module.exports={build};if(require.main===module)build().catch(e=>{console.error(e);process.exitCode=1;});
