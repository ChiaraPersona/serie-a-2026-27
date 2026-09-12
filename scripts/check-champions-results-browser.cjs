const {chromium}=require('C:/Users/utente/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.css':'text/css','.png':'image/png','.jpg':'image/jpeg'};
const server=http.createServer((req,res)=>{const p=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!p.startsWith(root+path.sep)){res.writeHead(403).end();return}fs.readFile(p,(e,b)=>{res.writeHead(e?404:200,{'Content-Type':types[path.extname(p)]||'application/octet-stream'});res.end(e?'Missing':b)})});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({headless:true,channel:'msedge'});
 try{
  const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  fs.mkdirSync(path.join(root,'output/champions-results'),{recursive:true});
  for(const width of [1280,390])for(const [name,url] of [['archive','schedina.html'],['calendar','champions-league.html'],['report','champions-league.html?match=ucl-2026-27-md01-06'],['slips','schedina.html?competizione=champions']]){
   await page.setViewportSize({width,height:900});await page.goto(`http://127.0.0.1:${server.address().port}/${url}`,{waitUntil:'networkidle'});
   if(name==='archive'){await page.waitForSelector('.betting-archive-card--champions');assert.match(await page.locator('.betting-archive-card--champions').innerText(),/31 esatte su 52/)}
   if(name==='calendar'){
    await page.waitForSelector('#champions-fixtures .fixture-card');
    assert.equal(await page.locator('#champions-fixtures .fixture-card').count(),18);
    assert.equal(await page.locator('#champions-fixtures .reading-fixture-teams>b').filter({hasText:/\d+–\d+/}).count(),18);
   }
   if(name==='report'){
    await page.waitForSelector('.champions-match-report');
    assert.equal(await page.locator('.champions-match-report h1').evaluate(el=>getComputedStyle(el).color),'rgb(255, 255, 255)');
    assert.equal(await page.locator('.champions-match-report tbody tr').count(),4);
    assert.equal(await page.locator('.champions-match-report th').first().evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(17, 48, 90)');
   }
   if(name==='slips'){await page.waitForSelector('[data-settlement]');assert.equal(await page.locator('[data-settlement]').count(),52)}
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
   assert(!overflow,`${name} ${width}: overflow`);
   await page.screenshot({path:path.join(root,`output/champions-results/${name}-${width}.png`),fullPage:false});
   console.log(`OK ${name} ${width}px`);
  }
  assert.deepEqual(errors,[]);
 }finally{await browser.close();server.close()}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
