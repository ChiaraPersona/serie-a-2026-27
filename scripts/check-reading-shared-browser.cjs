'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict'),{gzipSync}=require('node:zlib');
const runtime=process.env.PLAYWRIGHT_MODULES||'C:/Users/utente/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
const {chromium}=require(path.join(runtime,'playwright'));
const root=path.resolve(__dirname,'..'),out=path.join(root,'output/serie-a-shared-2026-11-15'),site=path.join(out,'site');
let optimized=false;const network=[];
const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.css':'text/css','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png'};
const server=http.createServer((req,res)=>{
 const rel=decodeURIComponent(new URL(req.url,'http://localhost').pathname).slice(1),file=path.resolve(site,rel);
 if(!file.startsWith(site+path.sep))return res.writeHead(403).end();
 try{
  let bytes=fs.readFileSync(file);
  if(!optimized&&/^data\/generated\/readings\/matches\//.test(rel))bytes=Buffer.from(JSON.stringify(JSON.parse(fs.readFileSync(path.join(root,rel))))+'\n');
  if(!optimized&&rel==='data/generated/readings/index.json'){const index=JSON.parse(bytes);delete index.sharedReadings;bytes=Buffer.from(JSON.stringify(index)+'\n');}
  const headers={'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'};
  if(rel.endsWith('.json')){bytes=gzipSync(bytes);headers['Content-Encoding']='gzip';network.push({file:rel,bytes:bytes.length});}
  res.writeHead(200,{...headers,'Content-Length':bytes.length});res.end(bytes);
 }catch{res.writeHead(404).end('Missing '+rel);}
});
(async()=>{
 const {default:pixelmatch}=await import(require('node:url').pathToFileURL(path.join(runtime,'pixelmatch/index.js')).href);
 const {PNG}=require(path.join(runtime,'pngjs'));
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;const results=[];
 try{
  browser=await chromium.launch({channel:'msedge',headless:true});
  const matches=JSON.parse(fs.readFileSync(path.join(root,'data/normalized/matches.json')));
  for(const day of [12,20,38])for(const width of [1440,390]){
   const id=matches.find(m=>m.competition==='serie-a'&&m.matchday===day&&m.status==='scheduled').id,pair=[];
   for(const mode of [false,true]){
    console.log('Checking',day,width,mode?'optimized':'baseline');
    optimized=mode;network.length=0;
    const context=await browser.newContext({viewport:{width,height:1000},serviceWorkers:'block',reducedMotion:'reduce'}),page=await context.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    page.on('console',m=>{if(m.type()==='warning')console.log('Browser warning:',m.text());});
    page.on('response',r=>{if(r.status()>=400&&!new URL(r.url()).pathname.startsWith('/data/generated/reading-bench-starter-scenarios/'))errors.push(r.status()+' '+r.url());});
    await page.route('https://fonts.googleapis.com/**',r=>r.abort());await page.route('https://fonts.gstatic.com/**',r=>r.abort());
    await page.goto(`http://127.0.0.1:${server.address().port}/lettura.html?match=${id}`,{waitUntil:'domcontentloaded',timeout:30000});
    await page.waitForFunction(()=>document.querySelector('.rd-shell[data-reading-ready="true"]')||(!document.querySelector('.rd-shell')&&document.querySelector('#app .reading-match-hero')),null,{timeout:45000});await page.waitForLoadState('networkidle');
    console.log('Rendered',day,width,mode);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
    pair.push({errors,html:await page.locator('#app').innerHTML(),png:await page.screenshot({path:path.join(out,`md${day}-${width}-${mode?'after':'before'}.png`),fullPage:true,animations:'disabled'}),bytes:network.reduce((n,r)=>n+r.bytes,0)});
    await context.close();
   }
   assert.equal(pair[0].html,pair[1].html,'DOM changed '+id);
   assert.deepEqual(pair[1].errors,pair[0].errors,'New browser error');
   const a=PNG.sync.read(pair[0].png),b=PNG.sync.read(pair[1].png);assert.equal(a.width,b.width);assert.equal(a.height,b.height);
   assert.equal(pixelmatch(a.data,b.data,null,a.width,a.height,{threshold:.1}),0,'Pixels changed');
   const row={day,width,id,dom:'identical',pixelDifferences:0,existingErrors:pair[0].errors,beforeGzip:pair[0].bytes,afterGzip:pair[1].bytes};results.push(row);console.log(JSON.stringify(row));
  }
  optimized=true;
  const context=await browser.newContext(),page=await context.newPage(),id=matches.find(m=>m.matchday===12&&m.status==='scheduled').id;
  await page.goto(`http://127.0.0.1:${server.address().port}/lettura.html?match=${id}`);
  await page.waitForSelector('.rd-shell[data-reading-ready="true"]',{timeout:90000});
  await page.evaluate(()=>navigator.serviceWorker.ready);await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
  await page.reload();await page.waitForSelector('.rd-shell[data-reading-ready="true"]',{timeout:90000});await page.waitForLoadState('networkidle');
  network.length=0;await page.reload();await page.waitForSelector('.rd-shell[data-reading-ready="true"]',{timeout:90000});await page.waitForLoadState('networkidle');
  assert(!network.some(r=>r.file.includes('/readings/shared/')),'Shared blocks fetched again');
  assert(network.some(r=>r.file.includes('official-starter-registry')),'Registry not refreshed');
  assert(network.some(r=>r.file.includes('/readings/matches/')),'Fixture not refreshed');
  results.push({warmCache:'PASS',sharedNetworkRequests:0,registryAndFixture:'network',gzipBytes:network.reduce((n,r)=>n+r.bytes,0)});
  await context.close();fs.writeFileSync(path.join(out,'browser.json'),JSON.stringify(results,null,2)+'\n');
 }finally{await browser?.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;server.close();});
