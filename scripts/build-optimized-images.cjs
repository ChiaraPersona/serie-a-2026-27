const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const sharp=require('C:/Users/utente/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const root=path.resolve(__dirname,'..'),rows=[];
async function convert(source,target,{width,lossless=true,quality=92}={}){
 const src=path.join(root,source),dst=path.join(root,target);fs.mkdirSync(path.dirname(dst),{recursive:true});
 let image=sharp(src);if(width)image=image.resize({width,withoutEnlargement:true});
 await image.webp({lossless,quality,effort:6}).toFile(dst);
 const metadata=await sharp(dst).metadata();rows.push({source,target,before:fs.statSync(src).size,after:fs.statSync(dst).size,width:metadata.width,height:metadata.height,lossless,sha256Original:crypto.createHash('sha256').update(fs.readFileSync(src)).digest('hex')});
}
(async()=>{
 for(const dir of ['teams','champions'])for(const file of fs.readdirSync(path.join(root,'assets/images',dir)).filter(f=>f.endsWith('.png')))await convert(`assets/images/${dir}/${file}`,`assets/images/optimized/${dir}/${file.replace('.png','.webp')}`);
 await convert('assets/images/serie-a-logo-mark.png','assets/images/optimized/serie-a-logo-mark.webp');
 // Metadata-heavy 4500px icon is displayed at 16px; 96px supports high DPI.
 await convert('assets/images/icons/goal-ball.jpg','assets/images/optimized/goal-ball.webp',{width:96});
 for(const [name,ext,widths] of [['champions-home-2026-27','png',[800,1600]],['home-hero','jpg',[1600]],['lineup-pitch','jpg',[1024]]])for(const width of widths)await convert(`assets/images/${name}.${ext}`,`assets/images/optimized/${name}-${width}.webp`,{width,lossless:false,quality:94});
 const manifest={images:rows};fs.writeFileSync(path.join(root,'assets/images/optimized/manifest.json'),JSON.stringify(manifest,null,2)+'\n');
 const map=Object.fromEntries(rows.filter(r=>r.lossless).map(r=>[r.source,r.target]));
 const module=`// Generated image URL map; presentation only. Original images are retained.\nconst images=${JSON.stringify(map)};\nexport function imageSource(url){return typeof url==='string'?url.replace(/assets\\/images\\/[a-zA-Z0-9_./-]+\\.(?:png|jpg)/g,path=>images[path]||path):url;}\n`;
 fs.writeFileSync(path.join(root,'js/core/image-source.mjs'),module);console.log(`Optimized ${rows.length} images; original files untouched.`);
})().catch(e=>{console.error(e);process.exitCode=1});
