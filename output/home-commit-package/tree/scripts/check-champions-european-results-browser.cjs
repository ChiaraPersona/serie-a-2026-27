'use strict';
const fs=require('node:fs'),http=require('node:http'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('C:/Users/utente/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'output/champions-european-results/browser');fs.mkdirSync(out,{recursive:true});
const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp'};
const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!file.startsWith(root+path.sep))return res.writeHead(403).end();fs.readFile(file,(e,b)=>{res.writeHead(e?404:200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'});res.end(e?'Missing':b);});});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;const checks=[];
 try{
  browser=await chromium.launch({headless:true,channel:'msedge'});
  for(const width of [1440,390])for(const id of ['ucl-2026-27-md04-10','ucl-2026-27-md04-16']){
   const page=await browser.newPage({viewport:{width,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto('http://127.0.0.1:'+server.address().port+'/champions-league.html?match='+id);
   const panel=page.locator('[data-european-result]');await panel.waitFor();await panel.scrollIntoViewIfNeeded();
   assert.deepEqual(errors,[]);assert(!await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1));
   const text=await panel.innerText();assert(text.includes('Stima preliminare'));
   if(id.endsWith('-10')){assert((await panel.locator('[data-result-outcome="2"]').innerText()).includes('55,8%'));assert.equal(await page.locator('#lettura-pronostici [data-shared-forecast-id]').filter({hasText:'ESITO FINALE 1X2 · 1'}).count(),0);}
   else assert(text.includes('esito N/D'));
   await panel.screenshot({path:path.join(out,'result-'+id+'-'+width+'.png')});checks.push({id,width,text});await page.close();
  }
  fs.writeFileSync(path.join(out,'result-panels.json'),JSON.stringify(checks,null,2)+'\n');console.log('PASS four result panels: desktop/mobile probabilities, preliminary label, N/D and no stale AEK winner suggestion.');
 }finally{if(browser)await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
