const fs=require('fs'),path=require('path'),crypto=require('crypto');
const {createVerifier}=require('./player-photo-verification.cjs'),verifier=createVerifier();
const output='reports/player-photos/recovery/replacements.json',ledger=fs.existsSync(output)?JSON.parse(fs.readFileSync(output,'utf8')):{schemaVersion:1,method:'Download only the licensed verified original when HEAD evidence cannot bind the old thumbnail. Never overwrite or delete the previous file.',entries:[],errors:[]};
const digest=(bytes,algorithm)=>crypto.createHash(algorithm).update(bytes).digest('hex'),pause=ms=>new Promise(r=>setTimeout(r,ms));
const existing=new Map(verifier.baseline.images.map(i=>[digest(fs.readFileSync(i.localPath),'sha1'),i.localPath]));
const save=()=>fs.writeFileSync(output,JSON.stringify(ledger,null,2)+'\n');
async function recover(image){
 const before=verifier.verify(image);if(before.review.reasons.length!==1||before.review.reasons[0]!=='LOCAL_BYTES_NOT_BOUND_TO_VERIFIED_ORIGINAL')return;
 const info=verifier.pages.find(p=>p.pageid===before.review.livePageId).imageinfo[0];
 const previous=ledger.entries.find(e=>e.previousPath===image.localPath&&e.previousSha256===image.sha256);if(previous&&fs.existsSync(previous.localPath)&&digest(fs.readFileSync(previous.localPath),'sha256')===previous.sha256&&verifier.verify(image,previous.localPath).review.status==='VERIFIED')return;
 let localPath=existing.get(info.sha1),bytes;
 if(localPath)bytes=fs.readFileSync(localPath);
 else{
  const url=new URL(info.url);url.search='';if(url.protocol!=='https:'||url.hostname!=='upload.wikimedia.org'||url.pathname.includes('/thumb/'))throw Error('Unexpected original URL');
  await pause(3000);let response=await fetch(url,{signal:AbortSignal.timeout(45000)});if(response.status===429){await pause(8000);response=await fetch(url,{signal:AbortSignal.timeout(45000)})}if(!response.ok)throw Error('HTTP '+response.status+' '+image.playerId);
  bytes=Buffer.from(await response.arrayBuffer());if(digest(bytes,'sha1')!==info.sha1||bytes.length!==info.size)throw Error('Original digest or length mismatch: '+image.playerId);
  const extension=bytes[0]===255&&bytes[1]===216?'jpg':bytes.subarray(1,4).toString()==='PNG'?'png':null;if(!extension)throw Error('Unsupported image format');
  localPath='assets/images/players/verified-originals/'+info.sha1+'.'+extension;fs.mkdirSync(path.dirname(localPath),{recursive:true});
  if(fs.existsSync(localPath)){if(digest(fs.readFileSync(localPath),'sha1')!==info.sha1)throw Error('Refuse to overwrite existing original')}else fs.writeFileSync(localPath,bytes,{flag:'wx'});
  existing.set(info.sha1,localPath)
 }
 const after=verifier.verify(image,localPath);if(after.review.status!=='VERIFIED')throw Error('Post-download evidence incomplete');
 ledger.entries.push({playerId:before.playerId,currentRoster:before.currentRoster,previousPath:image.localPath,previousSha256:image.sha256,localPath,sha1:info.sha1,sha256:digest(bytes,'sha256'),bytes:bytes.length,width:info.width,height:info.height,commonsPageId:before.review.livePageId,originalUrl:info.url,license:before.review.license,licenseUrl:before.review.licenseUrl,reviewedAt:new Date().toISOString(),previousFilePreserved:true});save();console.log('Verified original',before.playerId,bytes.length)
}
(async()=>{const pending=verifier.baseline.images.filter(i=>i.review.status==='BLOCKED');for(const image of pending){try{await recover(image)}catch(e){ledger.errors.push({localPath:image.localPath,error:e.message});save();console.log(e.message)}}console.log('Replacement originals',ledger.entries.length,'errors',ledger.errors.length)})().catch(e=>{console.error(e);process.exitCode=1});
