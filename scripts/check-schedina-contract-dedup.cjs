const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('C:/Users/utente/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..');
const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.css':'text/css'};
const server=http.createServer((req,res)=>{
  const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
  if(!file.startsWith(root+path.sep))return res.writeHead(403).end();
  fs.readFile(file,(error,body)=>{res.writeHead(error?404:200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'});res.end(error?'Missing':body)});
});
(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  let browser;
  const results=[],errors=[];
  try{
    browser=await chromium.launch({channel:'msedge',headless:true});
    for(const width of [1440,390]){
      const page=await browser.newPage({viewport:{width,height:1000}});
      page.on('pageerror',error=>errors.push(error.message));
      await page.route('https://fonts.googleapis.com/**',route=>route.abort());
      await page.route('https://fonts.gstatic.com/**',route=>route.abort());
      if(process.argv.includes('--stale-contract'))await page.route('**/shared-forecast-contract.mjs?v=20261022-assets-v1',route=>route.fulfill({
        contentType:'text/javascript',
        body:require('node:child_process').execFileSync('git',['show','HEAD:js/pages/shared-forecast-contract.mjs'],{cwd:root,encoding:'utf8'})
      }));
      await page.goto(`http://127.0.0.1:${server.address().port}/schedina.html`);
      await page.waitForSelector('.betting-archive-card');
      assert.equal(await page.locator('.betting-archive-card').count(),13);
      assert.equal(await page.locator('.betting-archive-number').first().innerText(),'10');
      for(const competition of ['serie-a','champions'])for(let day=1;day<=(competition==='serie-a'?10:3);day++){
        await page.goto(`http://127.0.0.1:${server.address().port}/schedina.html?competizione=${competition}&giornata=${day}`);
        await page.waitForSelector('.betting-round-page');
        const lowPrices=await page.locator('[data-selection-row][data-odds],.betting-slip > ol > li > b,.betting-mycombo-pick > b').evaluateAll(nodes=>nodes.map(node=>Number((node.dataset.odds||node.textContent).trim().replace(',','.'))).filter(value=>Number.isFinite(value)&&value>0&&value<1.08));
        if(competition==='serie-a'&&day===10)assert.deepEqual(lowPrices,[],`${competition} ${day} ${width}: public price below 1.08`);
        if(competition==='serie-a'&&day>=6){
          const counts=await page.evaluate(async day=>{
            const {createDataService}=await import('./js/services/data-service.js');
            const {sharedForecastsForMatch}=await import('./js/pages/shared-forecast-contract.mjs');
            const data=await createDataService('dedup-check').load(`schedina-md${String(day).padStart(2,'0')}.json`);
            return data.marketCatalog.matches.map(match=>{
              const legs=sharedForecastsForMatch(data.marketCatalog,match.matchId);
              return {matchId:match.matchId,expected:legs.length,individualLabels:legs.filter(leg=>leg.marketScope==='player'||/player/.test(leg.betSelection?.market?.subject?.type||'')).map(leg=>leg.label)};
            });
          },day);
          for(const {matchId,expected,individualLabels} of counts){
            assert.equal(await page.locator(`[data-match-id="${matchId}"] [data-selection-row]`).count(),expected,`${competition} ${day} ${width} ${matchId}`);
            const labels=await page.locator(`[data-match-id="${matchId}"] [data-selection-row]`).evaluateAll(rows=>rows.map(row=>row.dataset.selectionLabel));
            let individualSeen=false;
            for(const label of labels){
              if(individualLabels.includes(label))individualSeen=true;
              else assert(!individualSeen,`${matchId}: team market after individual market`);
            }
          }
        }
        const duplicates=await page.locator('[data-match-panel]').evaluateAll(panels=>panels.flatMap(panel=>{
          const ids=[...panel.querySelectorAll('[data-selection-row]')].map(row=>row.dataset.personalPick||row.dataset.selectionId).filter(Boolean);
          const labels=[...panel.querySelectorAll('[data-selection-row]')].map(row=>(row.dataset.selectionLabel||'').trim().toLowerCase()).filter(Boolean);
          return ids.length===new Set(ids).size&&labels.length===new Set(labels).size?[]:[panel.dataset.matchId];
        }));
        assert.deepEqual(duplicates,[],`${competition} ${day}: repeated visible selection`);
        results.push({competition,day,width});
      }
      for(const matchId of ['fiorentina-como-2026-27-md-07','torino-monza-2026-27-md-08']){
        await page.goto(`http://127.0.0.1:${server.address().port}/lettura.html?match=${matchId}`);
        await page.waitForSelector('[data-forecast-id]',{state:'attached'});
        const labels=(await page.locator('[data-forecast-id] .rd-forecast-name').allTextContents()).map(text=>text.trim().toLowerCase());
        assert(labels.length>0);
        assert.equal(labels.length,new Set(labels).size,`${matchId} ${width}: repeated reading forecast`);
      }
      await page.close();
    }
    assert.deepEqual(errors,[]);
    fs.mkdirSync(path.join(root,'reports/schedina-contract-dedup'),{recursive:true});
    fs.writeFileSync(path.join(root,'reports/schedina-contract-dedup/browser-audit.json'),JSON.stringify({results,errors},null,2)+'\n');
    console.log(`OK: ${results.length} verifiche browser, tutte le giornate Serie A e Champions su desktop/mobile.`);
  }finally{await browser?.close();server.close()}
})().catch(error=>{console.error(error);server.close();process.exitCode=1});
