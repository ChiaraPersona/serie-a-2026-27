const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const inventory=read('reports/player-photos/inventory.json'),source=read('data/sources/team-pages/wikimedia-player-photos.json');
const out=path.join(root,'reports/player-photos/live-metadata.json');
const pause=ms=>new Promise(r=>setTimeout(r,ms));
const request=async(url,attempt=0)=>{await pause(2500);const r=await fetch(url,{headers:{'User-Agent':'SerieA-PhotoAudit/1.0 (metadata-only; no image downloads)'},signal:AbortSignal.timeout(25000)});if(r.status===429&&attempt<3){await pause(Math.max(Number(r.headers.get('retry-after'))*1000||0,4000*(attempt+1)));return request(url,attempt+1)}if(!r.ok)throw Error('HTTP '+r.status);const data=await r.json();if(data.error)throw Error(data.error.info);return data};
(async()=>{
 const names=[...new Set(inventory.images.map(i=>source.entries.find(e=>e.localPath===i.localPath)?.pageTitle).filter(Boolean))];
 const evidence=fs.existsSync(out)?JSON.parse(fs.readFileSync(out,'utf8')):{retrievedAt:new Date().toISOString(),scope:'Metadata only; original images never fetched',commons:[],wikidata:{},errors:[]};
 const save=()=>fs.writeFileSync(out,JSON.stringify(evidence,null,2)+'\n');
 const completed=new Set(evidence.commons.flatMap(b=>Object.values(b.payload.query?.pages||{}).map(p=>p.title)));const remaining=names.filter(n=>!completed.has(n));
 for(let index=0;index<remaining.length;index+=15){const titles=remaining.slice(index,index+15);try{const url='https://commons.wikimedia.org/w/api.php?'+new URLSearchParams({action:'query',format:'json',redirects:'1',prop:'imageinfo|info',inprop:'url',iiprop:'url|size|sha1|timestamp|extmetadata',titles:titles.join('|')});const payload=await request(url);evidence.commons.push({url,payload});}catch(e){evidence.errors.push({titles,error:e.message})}save();console.log('Commons metadata '+Math.min(index+15,names.length)+'/'+names.length)}
 const ids=[...new Set(source.entries.filter(e=>inventory.images.some(i=>i.localPath===e.localPath)).map(e=>e.wikidataId).filter(Boolean))];
 for(let index=0;index<ids.length;index+=40){const batch=ids.slice(index,index+40);try{const url='https://www.wikidata.org/w/api.php?'+new URLSearchParams({action:'wbgetentities',format:'json',ids:batch.join('|'),props:'claims|labels',languages:'en|it'});const payload=await request(url);for(const [id,entity] of Object.entries(payload.entities||{})){evidence.wikidata[id]={id:entity.id,lastrevid:entity.lastrevid,labels:entity.labels,claims:Object.fromEntries(['P18','P569','P3681'].map(key=>[key,entity.claims?.[key]||[]]))}}}catch(e){evidence.errors.push({ids:batch,error:e.message})}save();console.log('Identity metadata '+Math.min(index+40,ids.length)+'/'+ids.length)}
 evidence.completedAt=new Date().toISOString();save();console.log('Done: '+evidence.commons.length+' Commons batches, '+Object.keys(evidence.wikidata).length+' entities; errors='+evidence.errors.length)
})().catch(e=>{console.error(e);process.exitCode=1});
