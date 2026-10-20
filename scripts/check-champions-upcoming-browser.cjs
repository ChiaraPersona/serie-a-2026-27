'use strict';
const {chromium}=require('C:/Users/utente/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),overlay=require('../data/derived/champions-md03/upcoming-forecasts.json');
const server=http.createServer((req,res)=>{
 const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
 if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 fs.readFile(file,(e,b)=>{res.writeHead(e?404:200,{'Content-Type':({'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.css':'text/css','.svg':'image/svg+xml','.png':'image/png'})[path.extname(file)]||'application/octet-stream'});res.end(e?'Missing':b)});
});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
  browser=await chromium.launch({headless:true,channel:'msedge'});
  const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  const url=`http://127.0.0.1:${server.address().port}`,checks=[];
  for(const width of [1440,390,320]){
   await page.setViewportSize({width,height:900});
   await page.goto(url+'/schedina.html?competizione=champions&giornata=3',{waitUntil:'networkidle'});
   await page.waitForSelector('[data-champions-workspace="3"]',{state:'attached'});
   await page.locator('[data-match-open-all]').click();
   for(const m of overlay.matches){
    const panel=page.locator(`[data-match-id="${m.matchId}"]`);
    assert.equal(await panel.locator('[data-selection-row]').count(),m.originalPublished+m.suggestions.length,m.matchId);
    for(const leg of m.selections.filter(l=>l.suggestionAnalysis.suggested)){
     const row=panel.locator(`[data-personal-pick="${leg.selectionId}"]`);
     assert(await row.isVisible(),leg.selectionId);assert(Number(await row.getAttribute('data-probability'))>0);
     assert.equal(await row.getAttribute('data-odds'),'');
    }
   }
   assert(!(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)),'overflow '+width);
   const target=overlay.matches.find(m=>m.suggestions.length);
   const panel=page.locator(`[data-match-id="${target.matchId}"]`);
   await panel.scrollIntoViewIfNeeded();
   await page.screenshot({path:`output/champions-upcoming-forecasts/schedina-${width}.png`});
   if(width===1440){
    const id=target.suggestions[0];await panel.locator(`[data-personal-pick="${id}"]`).click();
    assert((await page.evaluate(()=>localStorage.getItem('serie-a-2026-27:personal-betslip:v1'))).includes(id));
    await page.reload({waitUntil:'networkidle'});
    assert((await page.evaluate(()=>localStorage.getItem('serie-a-2026-27:personal-betslip:v1'))).includes(id));
   }
   await page.goto(url+`/champions-league.html?match=${target.matchId}`,{waitUntil:'networkidle'});
   await page.waitForSelector('[data-champions-workspace="3"]',{state:'attached'});
   await page.locator('.rd-champions-catalog > summary').click();
   const reading=page.locator('[data-champions-workspace="3"]');
   assert.equal(await reading.locator('[data-selection-row]').count(),target.originalPublished+target.suggestions.length);
   assert.equal(await page.locator('#lettura-pronostici [data-shared-forecast-id]').count(),target.originalPublished+target.suggestions.length);
   assert(!(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)),'reading overflow '+width);
   checks.push({width,schedina:true,reading:true});
  }
  // Archived rounds and Serie A still mount through the same renderer.
  for(const query of ['competizione=champions&giornata=1','competizione=champions&giornata=2','giornata=7']){
   await page.goto(url+'/schedina.html?'+query,{waitUntil:'networkidle'});await page.waitForSelector('[data-match-panel]');
  }
  assert.deepEqual(errors,[]);
  fs.writeFileSync('output/champions-upcoming-forecasts/browser.json',JSON.stringify({status:'PASS',checks,errors,savedSelectionReload:true,archiveAndSerieASmoke:true},null,2));
  console.log('PASS desktop/mobile, all 16 upcoming match panels, individual probabilities, reading, saved selection, archive and Serie A');
 }finally{await browser?.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
