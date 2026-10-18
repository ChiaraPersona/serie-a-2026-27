const fs=require('fs'),{read,write,vals,norm,identity,root}=require('./player-photo-expansion.cjs');
const baseline=read(root+'baseline.json'),discovery=read(root+'discovery.json');
const file=root+'commons-metadata.json',out=fs.existsSync(file)?read(file):{checkedAt:new Date().toISOString(),batches:[],errors:[]};
const delay=ms=>new Promise(r=>setTimeout(r,ms));
const request=async(url,attempt=0)=>{await delay(2200);const r=await fetch(url,{signal:AbortSignal.timeout(30000)});if(r.status===429&&attempt<2){await delay(6000);return request(url,attempt+1)}if(!r.ok)throw Error('HTTP '+r.status);const d=await r.json();if(d.error)throw Error(d.error.info);return d};
(async()=>{
 const candidates=[];
 for(const p of baseline.missing){const entities=Object.values(discovery.entities).filter(e=>identity(p,e).verified);for(const e of entities)for(const name of vals(e,'P18'))candidates.push({playerId:p.playerId,qid:e.id,title:'File:'+name});}
 out.candidates=candidates;write(file,out);
 const completed=new Set(out.batches.flatMap(b=>Object.values(b.payload.query?.pages||{}).map(p=>norm(p.title))));
 const titles=[...new Set(candidates.map(c=>c.title))].filter(t=>!completed.has(norm(t)));
 for(let i=0;i<titles.length;i+=15){const batch=titles.slice(i,i+15),url='https://commons.wikimedia.org/w/api.php?'+new URLSearchParams({action:'query',format:'json',redirects:'1',prop:'imageinfo|info',inprop:'url',iiprop:'url|size|sha1|timestamp|extmetadata|mime',iiurlwidth:'500',titles:batch.join('|')});try{const payload=await request(url);out.batches.push({url,payload});console.log('Commons files',i+batch.length,'/',titles.length)}catch(e){out.errors.push({titles:batch,error:e.message})}write(file,out)}
 out.completedAt=new Date().toISOString();write(file,out);console.log('Candidates',candidates.length,'players',new Set(candidates.map(c=>c.playerId)).size)
})().catch(e=>{console.error(e);process.exitCode=1});
