const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert/strict'),{execFileSync}=require('child_process');
const {chromium}=require('C:/Users/utente/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),old=execFileSync('git',['show','HEAD:js/pages/reading-detail/referee-dashboard.mjs'],{encoding:'utf8'});
const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.css':'text/css','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{const p=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!p.startsWith(root+path.sep))return res.writeHead(403).end();fs.readFile(p,(e,b)=>{res.writeHead(e?404:200,{'Content-Type':types[path.extname(p)]||'application/octet-stream'});res.end(e?'Missing':b);});});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;try{
 browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage({viewport:{width:390,height:1000}});
 await page.route('**/referee-dashboard.mjs?v=20261022-assets-v1',r=>r.fulfill({contentType:'text/javascript',body:old}));
 for(const [file,id]of [['champions-league','ucl-2026-27-md04-13'],['lettura','juventus-lazio-2026-27-md-07']]){
  await page.goto(`http://127.0.0.1:${server.address().port}/${file}.html?match=${id}`);await page.waitForSelector('.rf-average-card');
  const panel=page.locator('.rf-average-card');assert.equal(await panel.getByText('Media stagionale 2026/27',{exact:true}).count(),0,'Old cached module still renders duplicate seasonal average');
  assert.equal(await panel.locator(':scope > .rf-historical').count(),1);assert.equal(await page.locator('.rf-dashboard > .rf-historical').count(),0);
  fs.mkdirSync('output/referee-layout-cache',{recursive:true});await panel.screenshot({path:`output/referee-layout-cache/${file}-390.png`});
 }
 console.log('PASS: Serie A and Porto-Napoli use the historical block even with the old dashboard cached');
 }finally{await browser?.close();server.close();}})().catch(e=>{console.error(e);server.close();process.exitCode=1});
