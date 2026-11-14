'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('C:/Users/utente/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'output/champions-shared-scenario');fs.mkdirSync(out,{recursive:true});
const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.webp':'image/webp'};
const server=http.createServer((req,res)=>{const f=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!f.startsWith(root+path.sep))return res.writeHead(403).end();fs.readFile(f,(e,b)=>{res.writeHead(e?404:200,{'Content-Type':types[path.extname(f)]||'application/octet-stream'});res.end(e?'Missing':b);});});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;const results=[];
 try{
  browser=await chromium.launch({channel:'msedge',headless:true});
  for(const width of [1440,390]){
   const page=await browser.newPage({viewport:{width,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(`http://127.0.0.1:${server.address().port}/champions-league.html`);await page.waitForSelector('[data-champions-day="4"]');
   if(await page.locator('[data-champions-day="4"]').getAttribute('aria-expanded')!=='true')await page.locator('[data-champions-day="4"]').click();
   assert.equal(await page.locator('#champions-fixtures a[href*="md04"]').count(),18);
   assert.deepEqual(errors,[]);assert(!await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1));await page.close();
  }
  for(const width of [1440,390])for(const id of ['ucl-2026-27-md04-01','ucl-2026-27-md04-18','ucl-2026-27-md03-01']){
   const page=await browser.newPage({viewport:{width,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(`http://127.0.0.1:${server.address().port}/champions-league.html?match=${id}`);
   await page.waitForSelector('.rd-scenario',{timeout:60000});await page.waitForLoadState('networkidle');
   const text=await page.locator('.rd-scenario').innerText();
   assert.deepEqual(errors,[],id);assert(!await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),id+' overflow');
   assert(!/NaN|undefined|Infinity/.test(text));
   if(id.includes('md04'))assert.match(await page.locator('#lettura-scenario').innerText(),/Stima preliminare/);
   await page.screenshot({path:path.join(out,`${id}-${width}.png`),fullPage:true});results.push({id,width,errors,text});await page.close();
  }
  fs.writeFileSync(path.join(out,'browser.json'),JSON.stringify(results,null,2));console.log('OK: MD4 modelled/N-D and archived MD3 at 1440/390');
 }finally{if(browser)await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
