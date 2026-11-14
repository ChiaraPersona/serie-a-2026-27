'use strict';
// Descriptive profiles only: no prediction or market artifact is changed.
const fs=require('node:fs'),zlib=require('node:zlib'),crypto=require('node:crypto');
const {parseProfile}=require('./import-champions-referee-history');
const {seasons}=require('./champions/referee-profile-data.cjs');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const output='data/normalized/champions-referee-profiles-md04-2026-27.json';
const raw='data/raw/champions-referees/md04-2026-11-03';
function verifySnapshot(file,expected){
 const html=zlib.gunzipSync(fs.readFileSync(file)).toString();
 if(crypto.createHash('sha256').update(html).digest('hex')!==expected)throw Error('SNAPSHOT_HASH_MISMATCH: '+file);
}
async function build(){
 const assignments=read('data/sources/champions-referee-assignments-md04-2026-27.json').assignments;
 const registry=read('data/sources/champions-referees/registry-2026-27.json').referees;
 const historical=read('data/normalized/champions-referee-history-2026-10-13.json').referees;
 const recovered=read('data/normalized/champions-referee-dataset-md03-2026-27.json').fixtures;
 const fixtures=[];
 fs.mkdirSync(raw,{recursive:true});
 for(const assignment of assignments){
  const identity=registry.find(r=>r.id===assignment.refereeId);
  const old=historical.find(r=>assignment.refereeId&&r.refereeId===assignment.refereeId);
  // Exact recorded name only; no fuzzy identity or inferred provider ID.
  const previous=recovered.find(r=>r.name===assignment.referee.name);
  const fullNames={'João Pinheiro':'João Pedro Silva Pinheiro','van der Eijk':'Sander van der Eijk'};
  const names=[assignment.referee.name,...(identity?.aliases||[]),fullNames[assignment.referee.name]].filter(Boolean);
  const verifiedUrls={'Davide Massa':'https://www.footymetrics.com/referees/209-davide-massa','Jesús Gil Manzano':'https://www.footymetrics.com/referees/129-jesus-gil-manzano','João Pinheiro':'https://www.footymetrics.com/referees/25-joao-pedro-silva-pinheiro','Maurizio Mariani':'https://www.footymetrics.com/referees/134-maurizio-mariani','van der Eijk':'https://www.footymetrics.com/referees/86-sander-van-der-eijk'};
  const url=identity?.providers?.footymetrics?.url||previous?.source.url||verifiedUrls[assignment.referee.name]||null;
  const row={fixtureId:assignment.fixtureId,refereeId:assignment.refereeId||null,name:assignment.referee.name,predictionEligible:false};
  if(old){
   const file=`data/raw/champions-referees/2026-10-13/footymetrics/${old.source.providerRefereeId}.html.gz`;verifySnapshot(file,old.source.rawSha256);
   fixtures.push({...row,status:'AVAILABLE',capturedAt:old.source.retrievedAt,source:{...old.source,file,canonicalSource:'data/normalized/champions-referee-history-2026-10-13.json'},career:old.career,seasonCompetitionSamples:old.seasonCompetitionSamples,quality:{aggregateCutoffCertified:false},sampleNote:'Storico descrittivo, tutte le competizioni; aggiornamento al 13/10/2026.'});continue;
  }
  if(previous){
   verifySnapshot(previous.source.file,previous.source.sha256);
   fixtures.push({...row,status:'AVAILABLE',capturedAt:previous.source.retrievedAt,source:{...previous.source,canonicalSource:'data/normalized/champions-referee-dataset-md03-2026-27.json'},career:previous.career,seasonCompetitionSamples:previous.seasonCompetitionSamples,quality:previous.quality,sampleNote:'Storico descrittivo, tutte le competizioni; aggiornamento al 20/10/2026.'});continue;
  }
  if(!url){fixtures.push({...row,status:'IDENTITY_UNRESOLVED',career:null,source:null});continue;}
  try{
   const id=Number(url.match(/\/referees\/(\d+)/)[1]),file=`${raw}/${id}.html.gz`;
   if(!fs.existsSync(file)){
    const response=await fetch(url,{signal:AbortSignal.timeout(20000)});if(!response.ok)throw Error('HTTP '+response.status);
    fs.writeFileSync(file,zlib.gzipSync(await response.text()));
   }
   const html=zlib.gunzipSync(fs.readFileSync(file)).toString();
   const title=(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1]||'').replace(/<[^>]*>/g,'').trim();
   if(!names.some(n=>title.startsWith(n)))throw Error('PROFILE_TITLE_MISMATCH: '+title);
   const profile=parseProfile({id:row.refereeId,name:row.name,providers:{footymetrics:{id,name:fullNames[row.name]||row.name,url}}},html);
   if(!(profile.career.matches>0))throw Error('EMPTY_CAREER');
   const capturedAt=fs.statSync(file).mtime.toISOString();
   fixtures.push({...row,status:'AVAILABLE',capturedAt,source:{url,file,providerRefereeId:id,sha256:crypto.createHash('sha256').update(html).digest('hex'),retrievedAt:capturedAt},career:profile.career,seasonCompetitionSamples:seasons(html),quality:{aggregateCutoffCertified:false},sampleNote:'Storico descrittivo, tutte le competizioni; data di acquisizione '+capturedAt.slice(0,10)+'.'});
  }catch(error){fixtures.push({...row,status:'UNAVAILABLE',career:null,source:{url},error:error.message});}
 }
 const result={schemaVersion:1,matchday:4,predictionEligible:false,fixtures};
 fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n');
 console.log(fixtures.map(r=>({name:r.name,status:r.status,matches:r.career?.matches,error:r.error})));
 return result;
}
module.exports={build};if(require.main===module)build().catch(e=>{console.error(e);process.exitCode=1;});
