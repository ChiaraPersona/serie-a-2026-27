const {chromium}=require('C:/Users/utente/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');

const root=path.resolve(__dirname,'..');
const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.css':'text/css','.png':'image/png','.jpg':'image/jpeg'};
const server=http.createServer((request,response)=>{
  const target=path.resolve(root,'.'+decodeURIComponent(new URL(request.url,'http://localhost').pathname));
  if(!target.startsWith(root+path.sep)){response.writeHead(403).end();return}
  fs.readFile(target,(error,body)=>{response.writeHead(error?404:200,{'Content-Type':types[path.extname(target)]||'application/octet-stream'});response.end(error?'Missing':body)});
});

(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const origin=`http://127.0.0.1:${server.address().port}`;
  const browser=await chromium.launch({headless:true,channel:'msedge'});
  try{
    const page=await browser.newPage();
    const errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.goto(`${origin}/schedina.html`,{waitUntil:'networkidle'});
    await page.evaluate(()=>localStorage.clear());
    assert.equal(await page.locator('[data-champions-matchday="2"]').count(),1,'Card Champions MD2 non unica');
    assert.equal(await page.locator('.betting-archive-card--champions').count(),2,'Card Champions attese: MD1 e MD2');
    assert.match(await page.locator('[data-champions-matchday="2"]').innerText(),/CL2[\s\S]*18 partite · 63 pronostici[\s\S]*63 da verificare[\s\S]*ROI e profitto\/perdita N\/D/);
    assert.match(await page.locator('.betting-archive-card--champions').first().innerText(),/CL1[\s\S]*31 esatte su 52/,'La card MD1 è cambiata');

    for(const width of [1280,390]){
      await page.setViewportSize({width,height:900});
      await page.goto(`${origin}/schedina.html?competizione=champions&giornata=2`,{waitUntil:'networkidle'});
      await page.waitForSelector('[data-match-panel]');
      assert.equal(await page.locator('[data-match-panel]').count(),18,`${width}px: partite MD2`);
      assert.equal(await page.locator('[data-selection-row]').count(),63,`${width}px: pronostici MD2`);
      assert.equal(await page.locator('.betting-match-reading-link').count(),18,`${width}px: link letture`);
      assert.equal(await page.locator('[data-selection-row][data-personal-pick]').count(),63,`${width}px: selezioni cliccabili`);
      assert.equal(await page.locator('[data-market-family="Tiri giocatore"]').count(),27,`${width}px: pronostici tiri`);
      assert.equal(await page.locator('[data-market-family="Tiri in porta giocatore"]').count(),18,`${width}px: pronostici SOT`);
      assert.equal(await page.locator('[data-selection-row][data-bookmaker-contract="duo"][data-probability=""][data-ev=""]').count(),45,`${width}px: P/EV individuali devono restare N/D`);
      assert.equal(await page.locator('.betting-champions-md02-markets .betting-market-group').count(),0,`${width}px: intestazioni automatiche mercato ancora visibili`);
      assert.equal(await page.locator('.betting-champions-md02-markets h4').count(),0,`${width}px: titoli o numerazioni automatiche ancora visibili`);
      assert.equal(await page.locator('.betting-champions-md02-markets .betting-market-columns').count(),18,`${width}px: serve una sola riga colonne per partita`);
      assert.equal(await page.locator('.betting-champions-md02-markets .betting-market-columns span:first-child').evaluateAll(nodes=>nodes.every(node=>node.textContent==="")),true,`${width}px: intestazione Mercato ancora visibile`);
      assert.deepEqual(await page.locator('.betting-champions-md02-markets .betting-market-columns').first().locator('span').evaluateAll(nodes=>nodes.map(node=>node.textContent)),['','Probabilità','Quota Sisal','EV',''],`${width}px: intestazioni colonne Champions MD2`);
      const lensPanel=page.locator('[data-match-id="ucl-2026-27-md02-01"]');
      assert.equal(await lensPanel.locator('[data-selection-row]').count(),3,`${width}px: Lens-Sporting deve conservare tre pronostici consecutivi`);
      assert.deepEqual(await lensPanel.locator('[data-selection-row]').evaluateAll(rows=>rows.map(row=>row.dataset.marketFamily)),['Doppia chance','Tiri giocatore','Tiri in porta giocatore'],`${width}px: ordine pronostici Lens-Sporting`);
      assert.match(await page.locator('.betting-champions-md02-summary').innerText(),/63 pronostici da verificare[\s\S]*ROI e profitto\/perdita restano N\/D/);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`${width}px: overflow orizzontale`);
    }

    await page.setViewportSize({width:1280,height:900});
    await page.goto(`${origin}/schedina.html?competizione=champions&giornata=2`,{waitUntil:'networkidle'});
    const firstPanel=page.locator('[data-match-panel]').first();
    if(await firstPanel.getAttribute('open')===null)await firstPanel.locator('summary').click();
    const firstSelection=firstPanel.locator('[data-selection-row][data-market-family="Tiri giocatore"]').first();
    const selectionId=await firstSelection.getAttribute('data-personal-pick');
    await firstSelection.click();
    assert.equal(await page.locator('[data-personal-count]').first().innerText(),'1');
    let saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('serie-a-2026-27:personal-betslip:v1')));
    let row=saved.contexts['champions:2026-27:md02'].selections.find(item=>item.selectionId===selectionId);
    assert(row,'Selezione MD2 non salvata');
    assert.equal(row.betSelection.market.modifiers.periodScope,'full-match');
    assert.equal(row.betSelection.market.modifiers.replacementIncluded,true);
    assert.equal(row.betSelection.quote.decimal,row.addedQuote);

    await page.reload({waitUntil:'networkidle'});
    assert.equal(await page.locator('[data-personal-count]').first().innerText(),'1','Persistenza dopo reload');
    assert.equal(await page.locator(`[data-personal-pick="${selectionId}"]`).getAttribute('aria-pressed'),'true');
    await page.locator(`[data-personal-pick="${selectionId}"]`).click();
    assert.equal(await page.locator('[data-personal-count]').first().innerText(),'0','Rimozione MyCombo');

    for(const width of [1280,390]){
      await page.setViewportSize({width,height:900});
      await page.goto(`${origin}/champions-league.html?match=ucl-2026-27-md02-01`,{waitUntil:'networkidle'});
      await page.waitForSelector('[data-champions-published-root]');
      assert.equal(await page.locator('[data-published-selection-id]').count(),2,`${width}px: lettura e schedina non condividono le due proposte individuali`);
      assert.equal(await page.locator('[data-champions-market-root],#champions-sisal-markets,.champions-market-browser,.champions-market-controls,.champions-market-slip').count(),0,`${width}px: catalogo o ricerca quote ancora visibili`);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`${width}px: overflow orizzontale lettura`);
    }
    await page.setViewportSize({width:1280,height:900});
    const publishedButton=page.locator('[data-add-published-selection]').first();
    const publishedId=await publishedButton.getAttribute('data-add-published-selection');
    await publishedButton.click();
    assert.equal(await publishedButton.getAttribute('aria-pressed'),'true','Aggiunta dalla lettura non riuscita');
    saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('serie-a-2026-27:personal-betslip:v1')));
    row=saved.contexts['champions:2026-27:md02'].selections.find(item=>item.selectionId===publishedId);
    assert(row,'Selezione della lettura non persistita');
    assert.equal(row.betSelection.market.modifiers.replacementIncluded,true);
    await page.goto(`${origin}/schedina.html?competizione=champions&giornata=2`,{waitUntil:'networkidle'});
    assert.equal(await page.locator(`[data-personal-pick="${publishedId}"]`).getAttribute('aria-pressed'),'true','Selezione lettura non sincronizzata nella card');
    await page.locator(`[data-personal-pick="${publishedId}"]`).click();

    await page.goto(`${origin}/schedina.html?competizione=champions`,{waitUntil:'networkidle'});
    assert.equal(await page.locator('[data-settlement]').count(),52,'Regressione pagina Champions MD1');
    await page.goto(`${origin}/schedina.html?giornata=6`,{waitUntil:'networkidle'});
    assert.equal(await page.locator('[data-match-panel]').count(),10,'Regressione pagina Serie A MD6');
    assert.deepEqual(errors,[],'Errori JavaScript in browser');
    console.log('OK browser card Champions MD2: 18 partite, 63 pronostici, sync lettura/MyCombo, reload, mobile e regressioni');
  }finally{
    await browser.close();
    server.close();
  }
})().catch(error=>{console.error(error);server.close();process.exitCode=1});
