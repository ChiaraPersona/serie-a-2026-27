const fs=require('fs'),path=require('path'),http=require('http'),assert=require('node:assert/strict');
const {chromium}=require('C:/Users/utente/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=process.cwd(),out=__dirname;
const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.webp':'image/webp'};
const server=http.createServer((req,res)=>{
 const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(pathname==='/favicon.ico')return res.writeHead(204).end();
 const file=path.resolve(root,'.'+pathname);if(!file.startsWith(root+path.sep))return res.writeHead(403).end();
 fs.readFile(file,(err,data)=>{res.writeHead(err?404:200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'});res.end(err?'Missing':data)});
});
const sample=[['serie-a','lettura.html?match=atalanta-venezia-2026-27-md-06'],['champions','champions-league.html?match=ucl-2026-27-md02-05']];
async function main(){
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});const results=[];
 try{
  for(const [competition,url] of sample)for(const width of [1440,1024,390]){
   const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'}),page=await context.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&!/fonts|google/i.test(m.text()))errors.push(m.text())});
   await page.goto(origin+'/'+url,{waitUntil:'networkidle'});await page.waitForSelector('.rd-shell');await page.evaluate(()=>document.fonts.ready);
   const ids=await page.locator('[data-shared-forecast-id],[data-published-selection-id]').evaluateAll(nodes=>nodes.map(n=>n.dataset.sharedForecastId||n.dataset.publishedSelectionId));
   const geometry=await page.evaluate(()=>({viewport:innerWidth,document:document.documentElement.scrollWidth,main:document.querySelector('#app').getBoundingClientRect().width,navLinks:document.querySelectorAll('.rd-nav a').length,sections:[...document.querySelectorAll('.rd-section')].map(s=>s.id)}));
   await page.screenshot({path:path.join(out,`${competition}-${width}.png`)});
   if(width===390)await page.screenshot({path:path.join(out,`${competition}-${width}-full.png`),fullPage:true});
   await page.locator('.rd-nav a').nth(1).click();await page.waitForTimeout(200);
   const navigation=await page.evaluate(()=>({hash:location.hash,condensed:document.querySelector('.rd-nav').classList.contains('is-condensed'),miniVisible:getComputedStyle(document.querySelector('.rd-mini')).display!=='none',navTop:document.querySelector('.rd-nav').getBoundingClientRect().top,headerBottom:document.querySelector('.site-header').getBoundingClientRect().bottom,sectionTop:document.querySelector(location.hash).getBoundingClientRect().top}));
   assert(navigation.condensed&&navigation.miniVisible,'Mini-header not visible');
   assert(Math.abs(navigation.navTop-navigation.headerBottom)<2,'Sticky navigation does not follow header');
   assert(navigation.sectionTop>navigation.navTop&&navigation.sectionTop<300,'Anchor hidden or not reached');
   assert(geometry.document<=width,'Page overflows viewport');assert(geometry.main<=1050,'Main exceeds 1050px');assert.deepEqual(errors,[],'Console errors');
   await page.screenshot({path:path.join(out,`${competition}-${width}-sticky.png`)});
   await page.goto(origin+'/'+url+'&layout=legacy',{waitUntil:'networkidle'});await page.waitForSelector('.reading-match-hero');
   const legacyIds=await page.locator('[data-shared-forecast-id],[data-published-selection-id]').evaluateAll(nodes=>nodes.map(n=>n.dataset.sharedForecastId||n.dataset.publishedSelectionId));
   assert.deepEqual([...ids].sort(),[...legacyIds].sort());assert.equal(await page.locator('.rd-shell').count(),0);
   results.push({competition,width,geometry,navigation,marketCount:ids.length,idsEqualLegacy:true,errors});await context.close();
  }
  for(const route of ['lettura.html','champions-league.html','champions-league.html?team=inter','coppa-italia.html','schedina.html?giornata=7','lettura.html?match=milan-atalanta-2026-27-md-07']){
   const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage();
   await page.goto(origin+'/'+route,{waitUntil:'networkidle'});await page.waitForFunction(()=>!document.querySelector('#app>.loading'));
   const first=await page.locator('#app').innerHTML();const theme=await page.getAttribute('body','data-reading-detail-theme');
   await page.goto(origin+'/'+route+(route.includes('?')?'&':'?')+'layout=legacy',{waitUntil:'networkidle'});await page.waitForFunction(()=>!document.querySelector('#app>.loading'));
   const legacy=await page.locator('#app').innerHTML();assert.equal(first,legacy,route);assert.equal(theme,null);
   results.push({control:route,unchangedAgainstLegacy:true,noTheme:true});await context.close();
  }
  for(const [competition,url] of sample){
   const context=await browser.newContext(),page=await context.newPage();
   await page.addInitScript(()=>{window.IntersectionObserver=class{constructor(){throw new Error('TEST_READING_FALLBACK')}}});
   await page.goto(origin+'/'+url,{waitUntil:'networkidle'});await page.waitForSelector('.reading-match-hero');
   assert.equal(await page.locator('.rd-shell').count(),0);assert.equal(await page.getAttribute('body','data-reading-detail-theme'),null);
   const restored=await page.locator('#app').innerHTML();
   await page.goto(origin+'/'+url+'&layout=legacy',{waitUntil:'networkidle'});await page.waitForSelector('.reading-match-hero');
   assert.equal(restored,await page.locator('#app').innerHTML(),'Automatic fallback loses or changes original DOM');
   results.push({competition,forcedFailureRestoresOriginalDom:true});await context.close();
  }
  fs.writeFileSync(path.join(out,'browser-results.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));
 }finally{await browser.close();server.close()}
}
main().catch(e=>{console.error(e);server.close();process.exitCode=1});
