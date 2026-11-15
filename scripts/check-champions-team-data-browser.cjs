'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict'),{gzipSync}=require('node:zlib');
const runtime=process.env.PLAYWRIGHT_MODULES||'C:/Users/utente/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
const {chromium}=require(path.join(runtime,'playwright'));
const root=path.resolve(__dirname,'..'),out=path.join(root,'output/champions-clubs-2026-11-15'),site=path.join(out,'site');
const {sources}=require('./build-champions-team-data.cjs');
const inputs=new Set(sources.map(f=>'data/normalized/'+f));
const {pack}=require('./reading-archive-codec.cjs');
const archivedInputs=require('./reading-archive-scope.cjs').scope(root,[...inputs]);
let baseline=false,requests=[];
const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.css':'text/css','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png'};
const cached=new Map();
const server=http.createServer((req,res)=>{
 const rel=decodeURIComponent(new URL(req.url,'http://localhost').pathname).slice(1),file=path.resolve(site,rel);
 if(!file.startsWith(site+path.sep))return res.writeHead(403).end();
 try{
  const key=baseline+':'+rel;
  if(!cached.has(key)){
   let bytes=fs.readFileSync(baseline&&inputs.has(rel)?path.join(root,rel):file);
   if(rel.endsWith('.json')){
    const data=JSON.parse(bytes);
    if(baseline&&rel==='data/generated/champions-teams/index.json')data.teamIds=[];
    const plain=Buffer.from(JSON.stringify(data)+'\n'),packed=archivedInputs.has(rel)&&baseline?Buffer.from(JSON.stringify(pack(data))+'\n'):null;
    bytes=gzipSync(packed&&packed.length<plain.length&&gzipSync(packed).length<gzipSync(plain).length?packed:plain);
   }
   cached.set(key,bytes);
  }
  const bytes=cached.get(key),headers={'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store','Content-Length':bytes.length};
  if(rel.endsWith('.json'))headers['Content-Encoding']='gzip';
  requests.push({file:rel,bytes:bytes.length});res.writeHead(200,headers);res.end(bytes);
 }catch{requests.push({file:rel,status:404});res.writeHead(404).end('Missing '+rel);}
});
(async()=>{
 const {default:pixelmatch}=await import(require('node:url').pathToFileURL(path.join(runtime,'pixelmatch/index.js')).href);
 const {PNG}=require(path.join(runtime,'pngjs'));
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;const results=[];
 try{
  browser=await chromium.launch({channel:'msedge',headless:true});
  for(const id of ['bayern-munchen','bod-glimt','fenerbahce','sabah'])for(const width of [1440,390]){
   const pair=[];
   for(const mode of [true,false]){
    baseline=mode;requests=[];
    const context=await browser.newContext({viewport:{width,height:1000},serviceWorkers:'block',reducedMotion:'reduce'}),page=await context.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.route('https://fonts.googleapis.com/**',r=>r.abort());await page.route('https://fonts.gstatic.com/**',r=>r.abort());
    await page.goto(`http://127.0.0.1:${server.address().port}/champions-league.html?team=${id}`,{waitUntil:'domcontentloaded'});
    await page.waitForSelector('[data-xgot-statistics]',{timeout:60000});await page.waitForLoadState('networkidle');
    assert.deepEqual(errors,[]);assert(!requests.some(r=>r.status===404),'Missing public dependency');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'Overflow');
    const bytes=requests.filter(r=>r.file.endsWith('.json')).reduce((n,r)=>n+r.bytes,0),clubBytes=requests.filter(r=>inputs.has(r.file)||r.file.startsWith('data/generated/champions-teams/')).reduce((n,r)=>n+r.bytes,0);
    if(!mode)assert(!requests.some(r=>inputs.has(r.file)),'Global club archive fetched');
    const views=[];
    for(const season of ['2026-27','2025-26']){
     if(season==='2025-26'){
      await page.selectOption('#champions-player-season',season);
      await page.waitForURL(/playerSeason=2025-26/);await page.waitForSelector('[data-xgot-statistics]');await page.waitForLoadState('networkidle');
     }
     await page.evaluate(()=>{document.activeElement?.blur();window.scrollTo(0,0)});
     await page.evaluate(()=>document.fonts.ready);
     const html=await page.locator('#app').innerHTML();
     const png=await page.screenshot({path:path.join(out,`${id}-${width}-${season}-${mode?'before':'after'}.png`),fullPage:true,animations:'disabled'});
     const firstName=await page.locator('[data-champions-player]').first().getAttribute('data-player-name');
     await page.fill('#champions-player-search',firstName);
     assert(await page.locator('[data-champions-player]:visible').count()>=1,'Search lost player');
     await page.fill('#champions-player-search','');
     views.push({html,png});
    }
    pair.push({views,bytes,clubBytes});await context.close();
   }
   for(let i=0;i<2;i++){
    assert.equal(pair[0].views[i].html,pair[1].views[i].html,'DOM changed '+id);
    const a=PNG.sync.read(pair[0].views[i].png),b=PNG.sync.read(pair[1].views[i].png);assert.equal(a.width,b.width);assert.equal(a.height,b.height);
    assert.equal(pixelmatch(a.data,b.data,null,a.width,a.height,{threshold:.1}),0,'Pixels changed '+id);
   }
   const row={id,width,comparedSeasons:2,dom:'identical',pixelDifferences:0,beforeGzip:pair[0].bytes,afterGzip:pair[1].bytes,beforeClubGzip:pair[0].clubBytes,afterClubGzip:pair[1].clubBytes};results.push(row);console.log(JSON.stringify(row));
   fs.writeFileSync(path.join(out,'browser.json'),JSON.stringify(results,null,2)+'\n');
  }
 }finally{await browser?.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;server.close();});
