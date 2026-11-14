const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const sharp=require('C:/Users/utente/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const root=path.resolve(__dirname,'..'),{project}=require('./page-styles.cjs');
const vocab={tokens:new Set(['shared','card','open','future']),prefixes:['status-']};
const source='.shared{color:red}@media(min-width:700px){.card{display:grid}.elsewhere{display:none}}body[data-page="home"] .shared{color:blue}.future.open{opacity:1}.card:not(.absent){color:green}@keyframes pulse{0%{opacity:0}100%{opacity:1}}.status-pending{color:orange}';
const result=project(source,'readings',vocab);
assert(!result.includes('elsewhere'));assert(!result.includes('color:blue'));assert(result.includes('.future.open'));assert(result.includes('.card:not(.absent)'));assert(result.includes('@keyframes pulse'));assert(result.includes('.status-pending'));
assert(result.indexOf('color:red')<result.indexOf('display:grid')&&result.indexOf('display:grid')<result.indexOf('color:green'));
(async()=>{const manifest=JSON.parse(fs.readFileSync(path.join(root,'assets/images/optimized/manifest.json'))),quality=[];
for(const row of manifest.images){
 const source=path.join(root,row.source),target=path.join(root,row.target);
 assert.equal(crypto.createHash('sha256').update(fs.readFileSync(source)).digest('hex'),row.sha256Original,`original modified ${row.source}`);
 const a=await sharp(source).resize({width:row.width,withoutEnlargement:true}).ensureAlpha().raw().toBuffer(),b=await sharp(target).ensureAlpha().raw().toBuffer();assert.equal(a.length,b.length);
 // Fully transparent RGB has no visual meaning; compare visible color channels.
 let error=0,count=0;for(let i=0;i<a.length;i+=4){assert.equal(a[i+3],b[i+3]);if(a[i+3]===0)continue;for(let c=0;c<3;c++){error+=(a[i+c]-b[i+c])**2;count++;}}
 if(row.lossless)assert.equal(error,0,`lossless pixels ${row.source}`);
 else {const psnr=error?10*Math.log10(255**2/(error/count)):Infinity;assert(psnr>35,`photo quality ${row.source}: ${psnr}`);quality.push({source:row.source,width:row.width,PSNRdB:psnr});}
}
fs.mkdirSync(path.join(root,'reports/site-assets'),{recursive:true});fs.writeFileSync(path.join(root,'reports/site-assets/image-quality.json'),JSON.stringify({originalsUnchanged:manifest.images.length,lossless:manifest.images.filter(r=>r.lossless).length,photos:quality},null,2));
console.log('PASS CSS cascade/state projection, original image hashes, lossless visible pixels and photo PSNR > 35dB',quality);
})().catch(e=>{console.error(e);process.exitCode=1});
