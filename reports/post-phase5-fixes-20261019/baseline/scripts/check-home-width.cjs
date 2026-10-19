const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('C:/Users/utente/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'output/reports/home-width');fs.mkdirSync(out,{recursive:true});
const phase=process.argv[2]||'after';
const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.jpg':'image/jpeg','.png':'image/png'};
const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!file.startsWith(root+path.sep))return res.writeHead(403).end();fs.readFile(file,(e,b)=>{res.writeHead(e?404:200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'});res.end(e?'Missing':b)})});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({channel:'msedge',headless:true});const reports=[];
 try{for(const width of [1440,1280,1024,980,901,768,390,320]){
 const page=await browser.newPage({viewport:{width,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`http://127.0.0.1:${server.address().port}/index.html`,{waitUntil:'networkidle'});await page.locator('.home-standings').waitFor();await page.evaluate(()=>document.fonts.ready);
 const measure=()=>page.evaluate(()=>{
 const selector=e=>e.tagName.toLowerCase()+(e.id?'#'+e.id:'')+[...e.classList].map(c=>'.'+c).join('');
 const info=e=>{const r=e.getBoundingClientRect(),c=getComputedStyle(e);return {selector:selector(e),left:r.left,right:r.right,width:r.width,scrollWidth:e.scrollWidth,grid:c.gridTemplateColumns,minWidth:c.minWidth,position:c.position,transform:c.transform,overflowX:c.overflowX}};
 const outside=[...document.body.querySelectorAll('*')].filter(e=>{const r=e.getBoundingClientRect();return r.width&& (r.right>innerWidth+1||r.left< -1)}).map(e=>({...info(e),containedBy:(()=>{for(let p=e.parentElement;p;p=p.parentElement)if(['auto','scroll','hidden','clip'].includes(getComputedStyle(p).overflowX))return selector(p);return null})()}));
 return {innerWidth,html:document.documentElement.scrollWidth,body:document.body.scrollWidth,heroCount:document.querySelectorAll('main .hero').length,boxes:[...document.querySelectorAll('.site-header,main,.hero,.home-dashboard,.home-next,.home-standings,.table-wrap,.site-footer,.site-footer-inner')].filter(e=>e.getBoundingClientRect().width).map(info),outside};
 });
 const initial=await measure();
 const states=[];
 for(const season of ['current','archive']){await page.locator(`[data-standings-tab="${season}"]`).click();for(const scope of ['general','home','away']){await page.locator(`[data-standings-panel="${season}"] [data-standings-scope-tab="${scope}"]`).click();states.push({season,scope,...await measure()})}}
 await page.locator('[data-standings-tab="current"]').click();await page.locator('[data-standings-panel="current"] [data-standings-scope-tab="general"]').click();
 const prev=page.locator('[data-home-previous-matchday]');if(!await prev.isDisabled()){await prev.click();await page.locator('[data-home-next-matchday]').click()}
 if(width<=900){await page.locator('.menu-button').click();states.push({menu:'open',...await measure()});await page.locator('.menu-button').click()}
 await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));
 if([1440,390].includes(width)){await page.screenshot({path:path.join(out,`${phase}-${width}-full.png`),fullPage:true});await page.screenshot({path:path.join(out,`${phase}-${width}-viewport.png`)});}
 await page.evaluate(()=>window.scrollTo({top:document.body.scrollHeight,behavior:'instant'}));const bottom=await page.locator('.hero').evaluate(e=>({count:document.querySelectorAll('main .hero').length,top:e.getBoundingClientRect().top,position:getComputedStyle(e).position}));
 reports.push({width,initial,states,bottom,errors});await page.close();
 }fs.writeFileSync(path.join(out,`${phase}.json`),JSON.stringify(reports,null,2));console.log(JSON.stringify(reports.map(r=>({width:r.width,html:r.initial.html,body:r.initial.body,boxes:r.initial.boxes,outside:r.initial.outside.filter(e=>!e.containedBy),stateWidths:r.states.map(s=>[s.season,s.scope,s.html]),bottom:r.bottom,errors:r.errors})),null,2));
 if(phase==='after')for(const r of reports){for(const s of [r.initial,...r.states]){assert(s.html<=r.width+1,`Overflow ${r.width}`);assert.equal(s.heroCount,1);assert.equal(s.outside.filter(e=>!e.containedBy).length,0)}const main=r.initial.boxes.find(b=>b.selector==='main#app');for(const b of r.initial.boxes.filter(b=>['header#site-top.site-header','section.hero','section.section.home-dashboard','section#classifiche.section.home-standings','div.site-footer-inner'].includes(b.selector))){assert(Math.abs(b.left-main.left)<=1,`Allineamento ${b.selector} ${r.width}`);assert(Math.abs(b.width-main.width)<=1,`Larghezza ${b.selector} ${r.width}`)}assert.equal(r.errors.length,0)}
 }finally{await browser.close();await new Promise(r=>server.close(r))}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
