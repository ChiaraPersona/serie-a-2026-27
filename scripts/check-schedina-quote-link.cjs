'use strict';
const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert/strict');
const {chromium}=require('C:/Users/utente/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.css':'text/css','.svg':'image/svg+xml'};
const server=http.createServer((q,r)=>{const f=path.resolve(root,'.'+new URL(q.url,'http://localhost').pathname);if(!f.startsWith(root+path.sep))return r.writeHead(403).end();fs.readFile(f,(e,b)=>{r.writeHead(e?404:200,{'Content-Type':types[path.extname(f)]||'application/octet-stream'});r.end(e?'missing':b)})});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
  browser=await chromium.launch({channel:'msedge',headless:true});
  for(const width of [1440,390]){
   const page=await browser.newPage({viewport:{width,height:1000}}),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.goto(`http://127.0.0.1:${server.address().port}/schedina.html?giornata=8`);
   await page.waitForSelector('[data-match-panel]');await page.locator('[data-match-open-all]').click();
   const row=page.locator('[data-selection-row]').filter({hasText:'Christian Pulisic e suo eventuale sostituto 1+'});
   assert.equal(await row.count(),1);assert((await row.innerText()).includes('1,47'));assert((await row.innerText()).includes('pali/traverse inclusi'));
   await row.click();assert.equal(await row.getAttribute('aria-pressed'),'true');
   await page.reload();await page.waitForSelector('[data-match-panel]');await page.locator('[data-match-open-all]').click();
   assert.equal(await page.locator('[data-selection-row]').filter({hasText:'Christian Pulisic e suo eventuale sostituto 1+'}).getAttribute('aria-pressed'),'true');
   assert(!await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1));assert.deepEqual(errors,[]);
   await page.screenshot({path:path.join(root,`output/quote-link/schedina-${width}.png`),fullPage:true});
   await page.goto(`http://127.0.0.1:${server.address().port}/lettura.html?match=udinese-milan-2026-27-md-08`);
   await page.locator('#lettura-pronostici > summary').click();
   await page.waitForSelector('[data-forecast-id]');assert((await page.locator('[data-forecast-id]').filter({hasText:'Christian Pulisic e suo eventuale sostituto 1+'}).innerText()).includes('1,47'));
   console.log('PASS',width,'Pulisic 1.47 DUO, saved reload, Lettura, no overflow/errors');await page.close();
  }
 }finally{if(browser)await browser.close();server.close()}
})().catch(e=>{console.error(e.stack);server.close();process.exitCode=1});

