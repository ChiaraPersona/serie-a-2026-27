'use strict';
const {chromium}=require('C:/Users/utente/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),evidence=path.join(root,'output/champions-md3-sabah-dortmund-selection');
fs.mkdirSync(evidence,{recursive:true});
const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.css':'text/css','.svg':'image/svg+xml','.png':'image/png'};
const server=http.createServer((req,res)=>{const p=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!p.startsWith(root+path.sep)){res.writeHead(403).end();return;}fs.readFile(p,(e,b)=>{res.writeHead(e?404:200,{'Content-Type':mime[path.extname(p)]||'application/octet-stream'});res.end(e?'Missing':b);});});
(async()=>{await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
 try{browser=await chromium.launch({headless:true,channel:'msedge'});
  const base=`http://127.0.0.1:${server.address().port}`,out=[];
  for(const width of [1440,390]){
   const page=await browser.newPage({viewport:{width,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(`${base}/champions-league.html?match=ucl-2026-27-md03-02`,{waitUntil:'networkidle'});
   try{await page.waitForSelector('.rd-shell',{timeout:12000});}catch(e){console.error('DEBUG',errors,await page.locator('body').innerText());throw e;}
   const reading=await page.locator('.rd-shell').innerText();assert(/Sabah/.test(reading)&&/Borussia Dortmund/.test(reading));
   for(const label of ['Tiri','SOT','Corner'])assert(reading.includes(`${label}\n—\n—`),`${label} remains unpublished`);
   assert(!(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)),`reading overflow ${width}`);
   await page.screenshot({path:path.join(evidence,`reading-${width}.png`),fullPage:true});
   await page.goto(`${base}/schedina.html?competizione=champions&giornata=3`,{waitUntil:'networkidle'});
   await page.waitForSelector('[data-champions-workspace="3"] [data-match-panel]',{timeout:20000});
   const cards=page.locator('[data-champions-workspace="3"] [data-match-panel]');assert.equal(await cards.count(),18);
   const target=cards.filter({hasText:'Sabah'});assert.equal(await target.count(),1);await target.locator(':scope > summary').click();const targetText=await target.innerText();assert(targetText.includes('U/O 2.5')&&targetText.includes('1,45'),targetText.slice(0,1200));assert(targetText.includes('ESITO FINALE 1X2')&&targetText.includes('1,28'),targetText.slice(0,1200));
   const selectedRows=target.locator('[data-selection-row]');assert.equal(await selectedRows.count(),2);
   await selectedRows.first().click();assert.equal(await selectedRows.first().getAttribute('aria-pressed'),'true');
   assert(!(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)),`schedina overflow ${width}`);
   assert.deepEqual(errors,[]);await page.screenshot({path:path.join(evidence,`schedina-${width}.png`),fullPage:true});
   out.push({width,readingNDAfterQualityGate:true,targetSelectionsVisible:2,schedinaCards:18,overflow:false,pageErrors:0});await page.close();
  }
  fs.writeFileSync(path.join(evidence,'browser-results.json'),JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify(out));
 }finally{await browser?.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});



