'use strict';
const {chromium}=require('C:/Users/utente/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),dir=path.join(root,'output/champions-md3-lineup-management-20261020');
const data=require('../data/normalized/schedina-champions-md03.json'),individuals=require('../data/normalized/champions-md03-probable-individuals-2026-27.json');
const selected=data.marketCatalog.matches.flatMap(m=>m.selections.filter(l=>l.suggestionAnalysis?.suggested));
const quoted=selected.find(l=>l.marketScope==='player'&&l.odds!==null),model=selected.find(l=>l.marketScope==='player'&&l.odds===null);
const server=http.createServer((req,res)=>{
 const p=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
 if(!p.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 fs.readFile(p,(e,b)=>{res.writeHead(e?404:200,{'Content-Type':({'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.css':'text/css','.svg':'image/svg+xml','.png':'image/png'})[path.extname(p)]||'application/octet-stream'});res.end(e?'Missing':b);});
});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
  browser=await chromium.launch({headless:true,channel:'msedge'});const page=await browser.newPage();
  const errors=[],results=[];page.on('pageerror',e=>errors.push(e.message));
  const base=`http://127.0.0.1:${server.address().port}`,url=base+'/schedina.html?competizione=champions&giornata=3';
  for(const width of [1440,390,320]){
   await page.setViewportSize({width,height:950});await page.goto(url);await page.waitForSelector('[data-champions-workspace="3"]');
   assert.equal(await page.locator('[data-match-panel]').count(),18);
   assert.equal(await page.locator('[data-selection-row][data-selected-forecast="true"]').count(),selected.length);
   for(const m of data.marketCatalog.matches){const panel=page.locator(`[data-match-id="${m.matchId}"]`);assert.equal(await panel.locator('[data-selected-forecast="true"]').count(),m.selections.filter(l=>l.suggestionAnalysis?.suggested).length);}
   assert(!await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth));
   const panel=page.locator(`[data-match-id="${quoted.matchId}"]`);if(await panel.getAttribute('open')===null)await panel.locator(':scope > summary').click();
   const row=panel.locator(`[data-selection-row][data-personal-pick="${quoted.selectionId}"]`);
   assert.equal(await row.count(),1);assert.equal(await row.getAttribute('data-bookmaker-contract'),'duo');
   assert.equal(await row.getAttribute('data-probability'),'');assert.equal(await row.getAttribute('data-ev'),'');
   await row.scrollIntoViewIfNeeded();await page.screenshot({path:path.join(dir,`schedina-${width}.png`)});
   const expected=selected.filter(l=>l.matchId===quoted.matchId).map(l=>l.selectionId).sort();
   await page.goto(base+'/champions-league.html?match='+quoted.matchId);await page.waitForSelector('[data-champions-workspace="3"]');
   assert.deepEqual((await page.locator('[data-selection-row][data-selected-forecast="true"]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-personal-pick')))).sort(),expected);
   const fixture=individuals.fixtures.find(f=>f.fixtureId===quoted.matchId);
   for(const t of fixture.teams)assert.equal(await page.locator(`[data-md3-probable-team="${t.teamId}"] [data-projected-role="bench"]`).count(),t.players.filter(p=>p.projectedRole==='bench').length);
   assert(!await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth));
   const readingPanel=page.locator(`[data-match-id="${quoted.matchId}"]`);if(await readingPanel.getAttribute('open')===null)await readingPanel.locator(':scope > summary').click();
   await readingPanel.scrollIntoViewIfNeeded();await page.screenshot({path:path.join(dir,`reading-${width}.png`)});
   results.push({width,fixtures:18,selected:selected.length,sharedReadingCatalog:true,bench:true,overflow:false});
  }
  // Real UI save/reload and cross-page selection reconciliation.
  await page.goto(url);await page.waitForSelector('[data-champions-workspace="3"]');
  if(await page.locator(`[data-match-id="${quoted.matchId}"]`).getAttribute('open')===null)await page.locator(`[data-match-id="${quoted.matchId}"] > summary`).click();
  await page.locator(`[data-personal-pick="${quoted.selectionId}"][data-selection-row]`).click();
  await page.goto(base+'/champions-league.html?match='+quoted.matchId);await page.waitForSelector('[data-champions-workspace="3"]');
  let saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('serie-a-2026-27:personal-betslip:v1')));
  assert(saved.contexts['champions:2026-27:md03'].selections.some(l=>l.selectionId===quoted.selectionId));
  await page.goto(url);await page.waitForSelector('[data-champions-workspace="3"]');
  if(await page.locator(`[data-match-id="${model.matchId}"]`).getAttribute('open')===null)await page.locator(`[data-match-id="${model.matchId}"] > summary`).click();
  await page.locator(`[data-personal-pick="${model.selectionId}"][data-selection-row]`).click();
  await page.reload();await page.waitForSelector('[data-champions-workspace="3"]');
  saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('serie-a-2026-27:personal-betslip:v1')));
  assert.equal(saved.contexts['champions:2026-27:md03'].selections.length,2);
  assert(saved.contexts['champions:2026-27:md03'].selections.every(l=>l.dataStatus==='CURRENT'));
  assert.deepEqual(errors,[]);
  fs.writeFileSync(path.join(dir,'browser-results.json'),JSON.stringify({status:'PASS',results,savedQuotedAndUnquoted:2,errors},null,2)+'\n');
  console.log(JSON.stringify({status:'PASS',widths:[1440,390,320],selected:selected.length,sharedReadingCatalog:true,persistence:true,errors}));
 }finally{if(browser)await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
