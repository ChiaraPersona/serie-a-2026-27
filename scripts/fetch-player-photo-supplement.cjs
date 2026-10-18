const fs=require('fs'),crypto=require('crypto');
const audit=require('../reports/player-photos/recovery/baseline-audit.json'),live=require('../reports/player-photos/live-metadata.json'),source=require('../data/sources/team-pages/wikimedia-player-photos.json');
const pages=live.commons.flatMap(b=>Object.values(b.payload.query?.pages||{}));
const blocked=audit.images.filter(i=>i.review.status==='BLOCKED'&&i.review.reasons.some(r=>r!=='LOCAL_BYTES_NOT_BOUND_TO_VERIFIED_ORIGINAL'));
const titles=[...new Set(blocked.map(i=>pages.find(p=>p.pageid===i.review.livePageId)?.title).filter(Boolean))];
const ids=[...new Set(blocked.map(i=>i.review.wikidataId).filter(Boolean))];
const mediaIds=[...new Set(blocked.map(i=>i.review.livePageId).filter(Boolean))].map(id=>'M'+id);
const output='reports/player-photos/recovery/supplementary-metadata.json';
const result={checkedAt:new Date().toISOString(),fileRevisions:{},mediaEntities:{},wikidata:{},requests:[],errors:[]};
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function request(host,params){await delay(3000);const url=host+'/w/api.php?'+new URLSearchParams({format:'json',...params});const r=await fetch(url,{signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error('HTTP '+r.status);const payload=await r.json();if(payload.error)throw Error(payload.error.info);result.requests.push(url);return payload}
const save=()=>fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n');
(async()=>{
 try{const d=await request('https://commons.wikimedia.org',{action:'query',prop:'revisions|info',inprop:'url',rvprop:'ids|timestamp|content',rvslots:'main',titles:titles.join('|')});result.fileRevisions=d.query.pages}catch(e){result.errors.push(e.message)}save();
 try{const d=await request('https://commons.wikimedia.org',{action:'wbgetentities',ids:mediaIds.join('|'),props:'claims'});result.mediaEntities=d.entities}catch(e){result.errors.push(e.message)}save();
 const extraIds=[...new Set([...ids,...Object.values(result.mediaEntities).flatMap(e=>(e.claims?.P180||e.statements?.P180||[]).map(c=>c.mainsnak?.datavalue?.value?.id)).filter(Boolean)])];
 for(let i=0;i<extraIds.length;i+=40){try{const d=await request('https://www.wikidata.org',{action:'wbgetentities',ids:extraIds.slice(i,i+40).join('|'),props:'claims|labels',languages:'en|it'});for(const [id,e] of Object.entries(d.entities||{}))result.wikidata[id]={id:e.id,labels:e.labels,lastrevid:e.lastrevid,claims:Object.fromEntries(['P18','P569','P3681','P2446'].map(p=>[p,e.claims?.[p]||[]]))}}catch(e){result.errors.push(e.message)}save()}
 console.log('Supplementary evidence',Object.keys(result.fileRevisions).length,'file revisions,',Object.keys(result.mediaEntities).length,'media entities,',Object.keys(result.wikidata).length,'identities, errors',result.errors)
})().catch(e=>{console.error(e);process.exitCode=1});
