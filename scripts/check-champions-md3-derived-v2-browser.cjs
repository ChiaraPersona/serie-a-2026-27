'use strict';
const {chromium}=require('C:/Users/utente/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const derived=require('../data/derived/champions-md03/market-catalog-v2-2026-10-20.json');
const server=http.createServer((req,res)=>{
 const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
 if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 fs.readFile(file,(error,bytes)=>{res.writeHead(error?404:200,{'Content-Type':({'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.css':'text/css','.svg':'image/svg+xml','.png':'image/png'})[path.extname(file)]||'application/octet-stream'});res.end(error?'Missing':bytes)});
});
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 let browser;
 try{
  browser=await chromium.launch({headless:true,channel:'msedge'});
  const page=await browser.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
  const base=`http://127.0.0.1:${server.address().port}`;
  for(const width of [1440,390]){
   await page.setViewportSize({width,height:900});
   await page.goto(`${base}/schedina.html?competizione=champions&giornata=3`,{waitUntil:'networkidle'});
   await page.waitForSelector('[data-champions-workspace="3"]');
   assert.equal(await page.locator('[data-match-panel]').count(),18);
   assert.equal(await page.locator('[data-selection-row][data-selected-forecast="true"]').count(),113);
   for(const match of derived.matches){
    const panel=page.locator(`[data-match-id="${match.matchId}"]`);
    assert.equal(await panel.locator('[data-selection-row][data-selected-forecast="true"]').count(),match.suggestions.length,match.matchId);
   }
   assert.equal(await page.locator('[data-personal-pick][data-selection-row][data-probability=""]').count(),0);
   assert(!(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)),`overflow ${width}`);
   assert.deepEqual(errors,[]);
   await page.goto(`${base}/champions-league.html?match=ucl-2026-27-md03-01`,{waitUntil:'networkidle'});
   await page.waitForSelector('[data-champions-workspace="3"]');
   assert.equal(await page.locator('[data-champions-workspace="3"] [data-selection-row][data-selected-forecast="true"]').count(),6);
   assert.equal(await page.locator('[data-md3-probable-team="fenerbahce"] [data-projected-role="starter"]').count(),11);
   assert(!(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)),`reading overflow ${width}`);
   assert.deepEqual(errors,[]);
  }
  await page.goto(`${base}/schedina.html?competizione=champions&giornata=3`,{waitUntil:'networkidle'});
  const first=page.locator('[data-match-id="ucl-2026-27-md03-01"]');await first.locator(':scope > summary').click();
  const pick=first.locator('[data-personal-pick][data-selection-row]').first(),id=await pick.getAttribute('data-personal-pick'),quoted=await pick.getAttribute('data-odds');
  assert(Number(quoted)>1);await pick.click();
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('serie-a-2026-27:personal-betslip:v1')));
  assert(saved.contexts['champions:2026-27:md03'].selections.some(selection=>selection.selectionId===id));
  await page.reload({waitUntil:'networkidle'});
  assert.deepEqual(errors,[]);
  console.log('PASS browser Champions MD3 derived v2: 18 fixtures, 113 rows, reading/odds/betslip, desktop/mobile');
 }finally{await browser?.close();server.close();}
})().catch(error=>{console.error(error);server.close();process.exitCode=1});
