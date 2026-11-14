const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('C:/Users/utente/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),dest=path.join(root,'output/reports/referee-md07');fs.mkdirSync(dest,{recursive:true});
const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png'};
const server=http.createServer((req,res)=>{const f=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!f.startsWith(root+path.sep))return res.writeHead(403).end();fs.readFile(f,(e,b)=>{res.writeHead(e?404:200,{'Content-Type':types[path.extname(f)]||'application/octet-stream'});res.end(e?'Missing':b);});});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
 browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage(),errors=[],checks=[];
 page.on('pageerror',e=>errors.push(e.message));
 const entries=JSON.parse(fs.readFileSync(path.join(root,'data/generated/reading-referee-history.json'),'utf8')).fixtures.filter(f=>f.analysis);
 for(const f of entries)for(const width of [1440,390,320]){
  await page.setViewportSize({width,height:1000});await page.goto(`http://127.0.0.1:${server.address().port}/lettura.html?match=${f.fixtureId}`);await page.waitForSelector('.rd-referee-history-table');
  const panel=page.locator('.rd-referee-history');assert.equal(await panel.count(),1);
  assert.equal(await panel.locator('tbody tr').count(),5);assert.equal(await panel.locator('.rd-referee-history-summary dd').count(),4);
  assert.equal(await panel.locator('a').count(),0);const visibleText=await panel.innerText();assert(visibleText.toLowerCase().includes('falli fischiati'),visibleText);
  const dimensions=await panel.evaluate(n=>({width:n.getBoundingClientRect().width,scroll:n.scrollWidth,client:n.clientWidth,page:document.documentElement.scrollWidth,viewport:innerWidth,background:getComputedStyle(n).backgroundColor}));
  assert(dimensions.page<=width+1,JSON.stringify(dimensions));assert(dimensions.scroll<=dimensions.client+1,JSON.stringify(dimensions));
  await panel.screenshot({path:path.join(dest,`${f.fixtureId}-${width}.png`)});checks.push({fixtureId:f.fixtureId,width,dimensions});
 }
 assert.deepEqual(errors,[]);fs.writeFileSync(path.join(dest,'browser.json'),JSON.stringify({checks,errors},null,2));console.log('PASS: '+checks.length+' desktop/mobile checks, no overflow or page errors.');
 }finally{await browser?.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;server.close();});
