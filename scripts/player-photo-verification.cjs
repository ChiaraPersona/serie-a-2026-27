// Re-evaluable photo evidence. No name matching, sports writes, or image edits.
const fs=require('node:fs'),crypto=require('node:crypto');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const norm=s=>String(s||'').replace(/^File:/,'').replaceAll('_',' ').normalize('NFC');
const text=v=>String(v?.value??v??'').replace(/<[^>]*>/g,' ').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&nbsp;/g,' ').replace(/\s+/g,' ').trim();
const hash=(bytes,type)=>crypto.createHash(type).update(bytes).digest('hex');
const vals=(q,key)=>(q?.claims?.[key]||q?.statements?.[key]||[]).filter(c=>c.rank!=='deprecated').map(c=>c.mainsnak?.datavalue?.value);
function validateThumbnailBinding(bytes,record,info,page){
 if(!record||!info||!page)return false;
 const attempt=record.attempts?.[record.verifiedAttempt];if(!attempt)return false;
 let url;try{url=new URL(attempt.finalUrl)}catch{return false}
 const parts=decodeURIComponent(url.pathname).split('/'),file=parts.at(-2),md5=hash(bytes,'md5');
 return !!(record.status==='VERIFIED_THUMBNAIL'&&attempt.httpStatus===200&&url.protocol==='https:'&&['upload.wikimedia.org','thumb.wikimedia.org'].includes(url.hostname)&&url.pathname.includes('/wikipedia/commons/thumb/')&&norm(file)===norm(page.title)&&/^image\//.test(attempt.contentType||'')&&record.localSha256===hash(bytes,'sha256')&&record.localMd5===md5&&record.localBytes===bytes.length&&attempt.contentLength===bytes.length&&/^[0-9a-f]{32}$/i.test(attempt.etag?.replace(/^"|"$/g,'')||'')&&attempt.etag.replace(/^"|"$/g,'').toLowerCase()===md5&&record.originalSha1===info.sha1&&record.commonsPageId===page.pageid&&norm(record.sourceTitle)===norm(page.title)&&Date.parse(attempt.lastModified)>=Date.parse(info.timestamp));
}
function createVerifier(){
 const source=read('data/sources/team-pages/wikimedia-player-photos.json').entries,live=read('reports/player-photos/live-metadata.json'),supp=read('reports/player-photos/recovery/supplementary-metadata.json');
 const baseline=read('reports/player-photos/recovery/baseline-audit.json'),thumbs=read('reports/player-photos/recovery/thumbnail-binding.json').results;
 const recovery=read('reports/player-photos/unassociated-metadata.json').results,pages=live.commons.flatMap(b=>Object.values(b.payload.query?.pages||{}));
 const players=read('data/teams/index.json').teams.flatMap(t=>read('data/teams/'+t.id+'.json').squad);
 function verify(image,localPath=image.localPath){
  const original=baseline.images.find(i=>i.localPath===image.localPath)||image;
  const e=source.find(e=>e.localPath===original.localPath),recoveredTitle=recovery.find(r=>r.localPath===original.localPath)?.payload?.query?.allimages?.[0]?.title;
  const page=pages.find(p=>norm(p.title)===norm(e?.pageTitle||recoveredTitle)),info=page?.imageinfo?.[0],meta=info?.extmetadata||{};
  const media=supp.mediaEntities['M'+page?.pageid],depicts=vals(media,'P180').map(v=>v.id);
  const matchingProvider=(p,q)=>({qid:!!p.providerIds?.wikidata&&p.providerIds.wikidata===q?.id,tm:!!p.providerIds?.transfermarkt&&vals(q,'P2446').includes(String(p.providerIds.transfermarkt)),espn:!!p.providerIds?.espn&&vals(q,'P3681').includes(String(p.providerIds.espn))});
  const entityFor=id=>supp.wikidata[id]||live.wikidata[id];
  let p=players.find(p=>p.id===original.playerId),qid=e?.wikidataId;
  if(!qid&&p)qid=depicts.find(id=>{const q=entityFor(id),m=matchingProvider(p,q);return m.qid||m.tm||m.espn});
  if(!p&&!original.playerId){const matches=players.flatMap(p=>depicts.map(id=>({p,q:entityFor(id),id}))).filter(({p,q})=>{const m=matchingProvider(p,q);return (m.qid||m.tm||m.espn)&&vals(q,'P569').some(v=>v.time?.slice(1,11)===p.dateOfBirth)});if(matches.length===1){p=matches[0].p;qid=matches[0].id}}
  if(!qid&&!p&&depicts.length===1)qid=depicts[0];
  const entity=entityFor(qid),provider=p?matchingProvider(p,entity):{},births=vals(entity,'P569').map(v=>v.time?.slice(1,11)),birthMatch=!!p&&births.includes(p.dateOfBirth),birthConflict=!!p&&!!p.dateOfBirth&&births.length>0&&!birthMatch;
  const categoryMatch=vals(entity,'P373').some(category=>text(meta.Categories).split('|').includes(category));
  const p18=vals(entity,'P18').some(name=>norm(name)===norm(page?.title)),p180=depicts.includes(qid);
  const depictedImage=p18||p180||categoryMatch;
  const identityConflictResolved=!!(birthConflict&&provider.qid&&provider.tm&&(provider.espn||p180));
  const entityMatch=!!p&&(provider.qid||((provider.tm||provider.espn)&&birthMatch));
  const playerId=p?.id||original.playerId||null;
  const canonicalPhoto=!!p&&(String(p.photo||'').replace(/^\.\.\//,'')===original.localPath||((provider.tm||provider.espn)&&birthMatch));
  const bytes=fs.readFileSync(localPath),sha1=hash(bytes,'sha1'),sha256=hash(bytes,'sha256'),md5=hash(bytes,'md5');
  const exactOriginal=!!info&&info.sha1===sha1;
  const thumb=thumbs.find(t=>t.localPath===localPath&&t.localSha256===sha256),attempt=thumb?.attempts?.[thumb.verifiedAttempt];
  const thumbnailVerified=validateThumbnailBinding(bytes,thumb,info,page);
  const fileRevision=Object.values(supp.fileRevisions).find(r=>r.pageid===page?.pageid),wikitext=fileRevision?.revisions?.[0]?.slots?.main?.['*']||'';
  let license=text(meta.LicenseShortName),licenseUrl=text(meta.LicenseUrl).replace(/^http:/,'https:').replace(/\/deed\.[a-z-]+$/,'/'),licenseBasis='LIVE_CC_LICENSE';
  let licenseVerified=(/^CC BY(?:-SA)? (?:2\.0|2\.5|3\.0|4\.0)$/.test(license)||license==='CC0')&&/^https:\/\/creativecommons\.org\/(?:licenses\/(?:by|by-sa)\/(?:2\.0|2\.5|3\.0|4\.0)|publicdomain\/zero\/1\.0)\/?$/i.test(licenseUrl);
  const primarySource=(supp.primarySources||[]).find(s=>s.status===200&&String(meta.Credit?.value||'').includes(new URL(s.url).pathname.replace(/\/$/,''))&&s.licenseContexts?.some(c=>/"license"\s*:\s*"https:\/\/creativecommons.org\/publicdomain\/mark\/1.0\//.test(c)));
  if(license==='Public domain'&&text(meta.Copyrighted).toLowerCase()==='false'){
   if(/\{\{PD-author-FlickrPDM\}\}/i.test(wikitext)&&/Flickrreview|FlickreviewR/i.test(wikitext)&&primarySource){licenseVerified=true;licenseUrl='https://creativecommons.org/publicdomain/mark/1.0/';licenseBasis='AUTHOR_PDM_PRIMARY_SOURCE_AND_FLICKR_REVIEW'}
   else if(/\{\{PD-Autore\|Fabio Ariagno\}\}/i.test(wikitext)&&text(meta.Artist)==='Fabio Ariagno'){licenseVerified=true;licenseUrl='https://commons.wikimedia.org/wiki/Template:PD-author';licenseBasis='NAMED_AUTHOR_RELEASE_AND_UNRESTRICTED_PERMISSION'}
  }
  const reasons=[];
  if(!playerId)reasons.push('NO_CANONICAL_ID_REFERENCE');
  if(!e&&!p&&!info)reasons.push('NO_ARCHIVED_SOURCE_RECORD');
  if(!info)reasons.push('NO_LIVE_FILE_METADATA');
  if(!exactOriginal&&!thumbnailVerified)reasons.push('LOCAL_BYTES_NOT_BOUND_TO_VERIFIED_ORIGINAL');
  if(!licenseVerified)reasons.push('LICENSE_NOT_VERIFIED');
  const artist=text(meta.Artist),requestedCredit=text(meta.Attribution),copyrightNotice=text(meta.CopyrightNotice),creditParts=[artist];
  if(requestedCredit&&!artist.includes(requestedCredit)){if(requestedCredit.includes(artist))creditParts[0]=requestedCredit;else creditParts.push(requestedCredit)}
  if(copyrightNotice&&!creditParts.join(' ').includes(copyrightNotice))creditParts.push(copyrightNotice);
  const attributionCredit=creditParts.join(' · ');if(!artist||/unknown|autore indicato/i.test(artist))reasons.push('AUTHOR_NOT_VERIFIED');
  if(!depictedImage)reasons.push('FILE_NOT_LINKED_TO_VERIFIED_SUBJECT');
  if(p&&!canonicalPhoto)reasons.push('CANONICAL_PHOTO_REFERENCE_MISMATCH');
  if(p&&!entityMatch)reasons.push('CANONICAL_WIKIDATA_ID_NOT_CONFIRMED');
  if(birthConflict&&!identityConflictResolved)reasons.push('BIRTH_DATE_CONFLICT');
  const restrictions=text(meta.Restrictions);if(restrictions&&restrictions!=='personality')reasons.push('ADDITIONAL_RESTRICTIONS_TO_REVIEW');
  return {...original,playerId,localPath,sha256,bytes:bytes.length,currentRoster:!!p,cohort:p?'CURRENT':original.playerId?'HISTORICAL':'UNASSOCIATED',review:{status:reasons.length?'BLOCKED':'VERIFIED',reasons,entityMatch,canonicalPhoto,birthMatch,birthConflict,identityConflictResolved,providerMatches:provider,depictedImage,depictionMethod:p18?'P18':p180?'MEDIAINFO_P180':categoryMatch?'WIKIDATA_P373_EXACT_CATEGORY':null,exactOriginal,thumbnailVerified,sha1,md5,liveOriginalSha1:info?.sha1||null,livePageId:page?.pageid||null,wikidataId:qid||null,license:license||null,licenseUrl:licenseUrl||null,licenseBasis,artist:artist||null,attributionCredit:attributionCredit||null,restrictions:restrictions||null,descriptionUrl:info?.descriptionurl||null,proof:exactOriginal?{type:'ORIGINAL_SHA1',originalSha1:sha1}:thumbnailVerified?{type:'WIKIMEDIA_THUMBNAIL_ETAG',originalSha1:info.sha1,localMd5:md5,headEvidence:'reports/player-photos/recovery/thumbnail-binding.json',url:attempt.finalUrl}:null,reviewedAt:new Date().toISOString()}}
 }
 return {verify,baseline,pages,players};
}
module.exports={createVerifier,validateThumbnailBinding};
if(require.main===module){const {verify,baseline}=createVerifier();const results=baseline.images.map(i=>verify(i));console.log('Verified',results.filter(i=>i.review.status==='VERIFIED').length,'current',results.filter(i=>i.currentRoster&&i.review.status==='VERIFIED').length);console.log(results.filter(i=>i.review.status!=='VERIFIED').map(i=>[i.playerId||i.localPath,i.review.reasons]));fs.writeFileSync('reports/player-photos/recovery/review-preview.json',JSON.stringify(results,null,2)+'\n')}
