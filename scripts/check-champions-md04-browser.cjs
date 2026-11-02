'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('C:/Users/utente/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'output/champions-md04/browser');
fs.mkdirSync(out,{recursive:true});
const catalog=JSON.parse(fs.readFileSync(path.join(root,'data/normalized/schedina-champions-md04.json')));
const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp'};
const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!file.startsWith(root+path.sep))return res.writeHead(403).end();fs.readFile(file,(e,b)=>{res.writeHead(e?404:200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'});res.end(e?'Missing':b);});});
async function run(){
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 const results=[],base='http://127.0.0.1:'+server.address().port;
 try{
  browser=await chromium.launch({headless:true,channel:'msedge'});
  for(const width of [1440,390]){
   const context=await browser.newContext({viewport:{width,height:1000}}),page=await context.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   const check=async label=>{
    assert.deepEqual(errors,[],label);
    assert(!await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),label+' overflow');
    const text=await page.locator('#app').innerText();assert(!/NaN|undefined|Infinity/.test(text),label+' invalid values');
    assert.equal(await page.locator('#app :is([data-source-panel],.source-panel,.sources-panel):visible').count(),0,label+' public sources');
    results.push({width,label,errors:[]});
   };
   await page.goto(base+'/schedina.html?competizione=champions&giornata=4');
   await page.waitForSelector('[data-champions-workspace="4"]');
   await page.locator('[data-match-open-all]').click();
   assert(await page.locator('[data-selection-row][data-odds]').evaluateAll(rows=>rows.every(r=>!r.dataset.odds||Number(r.dataset.odds)>=1.08)),'No public Champions price below 1.08');
   for(const m of catalog.marketCatalog.matches){const panel=page.locator(`[data-match-id="${m.matchId}"]`);assert.equal(await panel.locator('[data-selection-row]').count(),m.suggestions.length,m.matchId);}
   assert.equal(await page.locator('[data-match-id*="md04-1"]').count(),0,'Wednesday absent');
   const target=catalog.marketCatalog.matches[0],pick=target.suggestions.find(id=>target.selections.find(l=>l.selectionId===id).marketScope==='player');
   await page.locator(`[data-personal-pick="${pick}"]`).first().click();
   assert((await page.evaluate(()=>localStorage.getItem('serie-a-2026-27:personal-betslip:v1'))).includes(pick));
   await check('schedina-md04');await page.screenshot({path:path.join(out,`schedina-${width}.png`)});
   for(const m of catalog.marketCatalog.matches){
    await page.goto(base+'/champions-league.html?match='+m.matchId);
    await page.waitForSelector('#lettura-pronostici [data-shared-forecast-id]',{state:'attached'}).catch(async e=>{fs.writeFileSync(path.join(out,'failure.json'),JSON.stringify({errors,text:await page.locator('#app').innerText()},null,2));throw e;});
    assert.equal(await page.locator('#lettura-pronostici [data-shared-forecast-id]').count(),m.suggestions.length,m.matchId);
    assert.equal(await page.locator('[data-md3-probable-player][data-projected-role="starter"]').count(),22);
    if(m===target){
     const button=page.locator(`[data-rd-pick="${pick}"]`);assert.equal(await button.getAttribute('aria-pressed'),'true');
     await page.locator('[data-player-lineup-filter="bench"]').scrollIntoViewIfNeeded();
     await page.locator('[data-player-lineup-filter="bench"]').click();assert(await page.locator('[data-player-card][data-player-lineup="bench"]:visible').count()>0);
     await page.locator('[data-player-lineup-filter="starter"]').click();
     await page.screenshot({path:path.join(out,`reading-${width}.png`)});
    }
    await check(m.matchId);
   }
   await page.goto(base+'/champions-league.html?match=ucl-2026-27-md04-10');await page.waitForSelector('.rd-scenario');
   assert.equal(await page.locator('[data-champions-workspace="4"]').count(),0);assert.equal(await page.locator('[data-md3-probable-player]').count(),0);await check('Wednesday-no-new-forecasts');
   await page.goto(base+'/schedina.html');await page.waitForSelector('[data-champions-matchday="4"]');await check('archive-md04-card');
   await page.goto(base+'/schedina.html?competizione=champions&giornata=3');await page.waitForSelector('[data-champions-workspace="3"]');await check('historical-md03');
   await context.close();
  }
  fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(results,null,2)+'\n');console.log('OK: '+results.length+' desktop/mobile states; nine fixtures, DUO persistence, reading/schedina sync, Wednesday and MD3 regression.');
 }finally{if(browser)await browser.close();server.close();}
}
run().catch(e=>{console.error(e);process.exitCode=1;});
