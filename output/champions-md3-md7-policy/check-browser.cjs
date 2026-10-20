const fs=require('node:fs'),http=require('node:http'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('C:/Users/utente/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=process.cwd(),types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png'};
const server=http.createServer((req,res)=>{const f=path.join(root,decodeURIComponent(new URL(req.url,'http://local').pathname));fs.readFile(f,(e,b)=>{res.writeHead(e?404:200,{'Content-Type':types[path.extname(f)]||'application/octet-stream'});res.end(e?'Missing':b);});});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${server.address().port}`;const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const page=await browser.newPage(),errors=[],results=[];page.on('pageerror',e=>errors.push(e.message));await page.route('https://fonts.googleapis.com/**',r=>r.abort());await page.route('https://fonts.gstatic.com/**',r=>r.abort());
 const data=JSON.parse(fs.readFileSync('data/normalized/schedina-champions-md03.json'));
 const {sharedForecastsForMatch}=await import('../../js/pages/shared-forecast-contract.mjs');
 for(const width of [1440,390,320]){
  await page.setViewportSize({width,height:1000});await page.goto(origin+'/schedina.html?giornata=3&competizione=champions');await page.waitForSelector('[data-match-panel]');assert.equal(await page.locator('[data-match-panel]').count(),18);await page.locator('[data-match-open-all]').click();
  assert.equal(await page.locator('[data-selection-row]').count(),data.marketCatalog.totals.suggestions);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  const text=await page.locator('#app').innerText();for(const bad of ['Altri mercati disponibili','Previsioni della partita','Singola preliminare approvata'])assert(!text.includes(bad));
  assert.equal(await page.locator('.betting-market-family-heading').count(),0);
  for(const match of data.marketCatalog.matches){
   const rows=sharedForecastsForMatch(data.marketCatalog,match.matchId);const panel=page.locator(`[data-match-id="${match.matchId}"]`).first();
   const ids=await panel.locator('[data-selection-row][data-personal-pick]').evaluateAll(nodes=>nodes.map(n=>n.dataset.personalPick));assert.deepEqual(ids.sort(),rows.map(l=>l.selectionId).sort());
   for(const row of rows){const card=panel.locator('[data-personal-pick]').filter({has:page.locator('[data-publication-status]')});assert.equal(await panel.locator(`[data-personal-pick="${row.selectionId}"]`).count(),1);}
   const pick=panel.locator('[data-personal-pick]').first();if(rows.length){await pick.click();assert.equal(await pick.getAttribute('aria-pressed'),'true');await pick.click();assert.equal(await pick.getAttribute('aria-pressed'),'false');}
  }
  await page.screenshot({path:`output/champions-md3-md7-policy/schedina-${width}.png`,fullPage:true});results.push({surface:'schedina',width,fixtures:18,rows:data.marketCatalog.totals.suggestions,status:'PASS'});
 }
 for(const match of data.marketCatalog.matches){
  const width=390;await page.setViewportSize({width,height:1000});await page.goto(origin+`/champions-league.html?match=${match.matchId}`);await page.waitForSelector('[data-reading-ready=true]');
  const expected=sharedForecastsForMatch(data.marketCatalog,match.matchId).map(l=>l.selectionId).sort();
  const ids=await page.locator('[data-rd-pick]').evaluateAll(nodes=>nodes.map(n=>n.dataset.rdPick).sort());assert.deepEqual(ids,expected);assert.equal(await page.locator('[data-rd-pick]:disabled').count(),0);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  if(expected.length){const pick=page.locator('[data-rd-pick]').first();await pick.click();assert.equal(await pick.getAttribute('aria-pressed'),'true');await page.locator('.rd-slip-trigger').click();assert.equal(await page.locator('.rd-slip [data-remove]').count(),1);await page.locator('.rd-slip [data-close]').click();await pick.click();}
  if(match.matchId==='ucl-2026-27-md03-07')await page.locator('#lettura-pronostici').screenshot({path:'output/champions-md3-md7-policy/lettura-390.png'});
  results.push({surface:'lettura',id:match.matchId,width,rows:expected.length,status:'PASS'});console.log('PASS',match.matchId,expected.length);
 }
 assert.deepEqual(errors,[]);fs.writeFileSync('output/champions-md3-md7-policy/browser-results.json',JSON.stringify({status:'PASS',results,errors},null,2));
 }finally{await browser.close();server.close();}})().catch(e=>{console.error(e);server.close();process.exitCode=1});
