"use strict";
const assert=require('node:assert/strict'),fs=require('node:fs'),http=require('node:http'),path=require('node:path');
const {chromium}=require('C:/Users/utente/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..');
const data=JSON.parse(fs.readFileSync(path.join(root,'data/normalized/schedina-md07.json')));
const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.css':'text/css','.svg':'image/svg+xml','.png':'image/png'};
const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!file.startsWith(root+path.sep))return res.writeHead(403).end();fs.readFile(file,(e,b)=>{res.writeHead(e?404:200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'});res.end(e?'Missing':b)})});
(async()=>{
  const {sharedForecastsForMatch}=await import('../js/pages/shared-forecast-contract.mjs');
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const browser=await chromium.launch({headless:true,channel:'msedge'});
  const base=`http://127.0.0.1:${server.address().port}`;
  const reports=[];
  try{for(const width of [1440,390]){
    const context=await browser.newContext({viewport:{width,height:1000}}),page=await context.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto(`${base}/schedina.html?giornata=7`,{waitUntil:'networkidle'});
    assert.equal(await page.locator('[data-match-panel]').count(),10);
    await page.locator('[data-match-open-all]').click();
    for(const match of data.marketCatalog.matches){
      const expected=sharedForecastsForMatch(data.marketCatalog,match.matchId).map(l=>l.selectionId).sort();
      const panel=page.locator(`[data-match-id="${match.matchId}"]`);
      const ids=await panel.locator('[data-selected-forecast=true]').evaluateAll(rows=>rows.map(r=>r.dataset.personalPick).sort());
      assert.deepEqual(ids,expected,`${width}px schedina ${match.matchId}`);
    }
    const first=page.locator('[data-selected-forecast=true]').first();
    await first.click();assert.equal(await first.getAttribute('aria-pressed'),'true');
    const pendingIds=data.marketCatalog.matches.flatMap(m=>m.selections).filter(l=>l.forecastIdentity&&l.suggestionAnalysis?.suggested).map(l=>l.selectionId);
    for(const id of pendingIds){
      const metrics=await page.locator(`[data-personal-pick="${id}"]`).first().locator('.betting-market-metric b').allTextContents();
      assert.deepEqual(metrics.slice(-2),['—','—'],'Quota o EV mancanti mostrati come numero');
      await page.locator(`[data-personal-pick="${id}"]`).first().evaluate(el=>el.click());
    }
    assert.equal(await page.locator('.personal-betslip-total strong').textContent(),'—');
    assert.equal(await page.locator('.personal-betslip-analysis').count(),0);
    await page.reload({waitUntil:'networkidle'});
    assert.equal(await page.locator('[data-selected-forecast=true][aria-pressed=true]').count(),1+pendingIds.length,'Selezione salvata persa');
    for(const id of pendingIds)await page.locator(`[data-personal-remove="${id}"]`).evaluate(el=>el.click());
    assert.equal(await page.locator('[data-selected-forecast=true][aria-pressed=true]').count(),1,'Rimozione fallita');
    await page.locator('[data-match-open-all]').click();
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Overflow schedina');
    await page.screenshot({path:path.join(root,`output/reports/serie-a-md07-${width}.png`),fullPage:true});
    // All fixtures share the same forecast registry in both consumers.
    for(const match of data.marketCatalog.matches){
      await page.goto(`${base}/lettura.html?match=${match.matchId}`,{waitUntil:'networkidle'});
      const expected=sharedForecastsForMatch(data.marketCatalog,match.matchId).map(l=>l.selectionId).sort();
      const actual=await page.locator('[data-shared-forecast-id]').evaluateAll(rows=>rows.map(r=>r.dataset.sharedForecastId).sort());
      assert.deepEqual(actual,expected,`${width}px lettura ${match.matchId}`);
      const pending=page.locator('[data-shared-forecast-id][role=button]').first();
      if(await pending.count()){
        await pending.click();assert.equal(await pending.getAttribute('aria-pressed'),'true');
        await page.reload({waitUntil:'networkidle'});
        const selected=page.locator('[data-shared-forecast-id][aria-pressed=true]');
        assert.equal(await selected.count(),1);await selected.click();
        assert.equal(await page.locator('[data-shared-forecast-id][aria-pressed=true]').count(),0);
      }
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Overflow lettura');
    }
    assert.equal(errors.length,0,errors.join('\n'));
    reports.push({width,fixtures:10,sync:'PASS',persistedSelection:'PASS',overflow:'PASS',errors});
    await context.close();
  }}finally{await browser.close();await new Promise(r=>server.close(r))}
  fs.writeFileSync(path.join(root,'output/reports/serie-a-md07-browser-audit.json'),JSON.stringify(reports,null,2)+'\n');
  console.log(JSON.stringify(reports,null,2));
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
