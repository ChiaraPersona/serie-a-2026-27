const fs=require('fs'),crypto=require('crypto');
const audit=require('../reports/player-photos/recovery/baseline-audit.json'),source=require('../data/sources/team-pages/wikimedia-player-photos.json'),live=require('../reports/player-photos/live-metadata.json');
const pages=live.commons.flatMap(b=>Object.values(b.payload.query?.pages||{}));
const output='reports/player-photos/recovery/thumbnail-binding.json';
const store=fs.existsSync(output)?JSON.parse(fs.readFileSync(output,'utf8')):{schemaVersion:1,method:'HTTPS HEAD only. Strong Swift ETag equals local MD5 plus identical content length, canonical thumbnail path, source image SHA1 and SHA256-bound local evidence.',technicalEvidence:'https://doc.wikimedia.org/mediawiki-core/1.45.0/php/SwiftFileBackend_8php_source.html',results:[]};
const normalize=s=>String(s||'').replace(/^File:/,'').replaceAll('_',' ').normalize('NFC');
const sha=(bytes,algorithm)=>crypto.createHash(algorithm).update(bytes).digest('hex');
const safe=url=>{try{const u=new URL(url);return u.protocol==='https:'&&['upload.wikimedia.org','thumb.wikimedia.org'].includes(u.hostname)}catch{return false}};
const pause=ms=>new Promise(r=>setTimeout(r,ms));
let processed=0;
async function inspect(image){
 const prior=store.results.find(r=>r.localPath===image.localPath&&r.localSha256===image.sha256&&r.status==='VERIFIED_THUMBNAIL');if(prior)return;
 const e=source.entries.find(e=>e.localPath===image.localPath),page=pages.find(p=>normalize(p.title)===normalize(e?.pageTitle)),info=page?.imageinfo?.[0];
 const record={localPath:image.localPath,playerId:image.playerId,localSha256:image.sha256,sourceTitle:e?.pageTitle||null,commonsPageId:page?.pageid||null,originalSha1:info?.sha1||null,attempts:[],status:'NOT_VERIFIED'};
 const bytes=fs.readFileSync(image.localPath);record.localMd5=sha(bytes,'md5');record.localBytes=bytes.length;
 if(!e||!info){record.reason='NO_VERIFIABLE_SOURCE';store.results.push(record);return}
 let urls=[e.thumbnailUrl].filter(Boolean);
 // Construct a standard same-file thumbnail path only when the local width is documented.
 const original=new URL(info.url);const relative=original.pathname.replace('/wikipedia/commons/','');
 if(!relative.startsWith('thumb/'))urls.push('https://upload.wikimedia.org/wikipedia/commons/thumb/'+relative+'/'+image.width+'px-'+relative.split('/').at(-1));
 for(const url of [...new Set(urls.flatMap(url=>[url.replace("https://upload.wikimedia.org/","https://thumb.wikimedia.org/"),url]))]){
  if(!safe(url))continue;
  const u=new URL(url),parts=decodeURIComponent(u.pathname).split('/'),filename=parts.at(-2);
  const sameSource=normalize(filename)===normalize(e.fileName)&&decodeURIComponent(original.pathname).includes('/'+filename);
  if(!sameSource){record.attempts.push({url,error:'THUMBNAIL_PATH_NOT_BOUND_TO_SOURCE'});continue}
  try{
   await pause(900);
   const r=await fetch(url,{method:'HEAD',redirect:'follow',headers:{'Accept-Encoding':'identity'},signal:AbortSignal.timeout(20000)});
   const etag=r.headers.get('etag')||'',digest=etag.replace(/^"|"$/g,''),length=Number(r.headers.get('content-length')),modified=r.headers.get('last-modified');
   const attempt={url,finalUrl:r.url,httpStatus:r.status,etag,contentLength:length,contentType:r.headers.get('content-type'),lastModified:modified,checkedAt:new Date().toISOString()};record.attempts.push(attempt);
   if(r.ok&&safe(r.url)&&/^[0-9a-f]{32}$/i.test(digest)&&digest.toLowerCase()===record.localMd5&&length===bytes.length&&/^image\//.test(attempt.contentType||'')&&Date.parse(modified)>=Date.parse(info.timestamp)){
    record.status='VERIFIED_THUMBNAIL';record.verifiedAttempt=record.attempts.length-1;record.reason=null;break
   }
   record.reason='HEAD_DIGEST_LENGTH_OR_SOURCE_VERSION_MISMATCH';
   if(r.status===429)await pause(3000);
  }catch(e){record.attempts.push({url,error:e.message});record.reason='HEAD_REQUEST_FAILED'}
 }
 const previous=store.results.findIndex(r=>r.localPath===image.localPath);if(previous>=0)store.results[previous]=record;else store.results.push(record);
 store.updatedAt=new Date().toISOString();fs.writeFileSync(output,JSON.stringify(store,null,2)+'\n');processed++;if(processed%20===0)console.log('Checked',processed,'verified',store.results.filter(r=>r.status==='VERIFIED_THUMBNAIL').length)
}
(async()=>{const pending=audit.images.filter(i=>i.review.status==='BLOCKED'&&i.review.reasons.includes('LOCAL_BYTES_NOT_BOUND_TO_VERIFIED_ORIGINAL')&&source.entries.some(e=>e.localPath===i.localPath));let cursor=0;await Promise.all(Array.from({length:2},async()=>{while(cursor<pending.length)await inspect(pending[cursor++])}));fs.writeFileSync(output,JSON.stringify(store,null,2)+'\n');console.log('Done',store.results.length,'verified',store.results.filter(r=>r.status==='VERIFIED_THUMBNAIL').length);})().catch(e=>{console.error(e);process.exitCode=1});
