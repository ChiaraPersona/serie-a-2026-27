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
    assert.match(await page.locator('[data-champions-matchday="2"]').innerText(),/CL2[\s\S]*18 partite · 120 pronostici[\s\S]*120 da verificare[\s\S]*ROI e profitto\/perdita N\/D/);
    assert.match(await page.locator('.betting-archive-card--champions').first().innerText(),/CL1[\s\S]*31 esatte su 52/,'La card MD1 è cambiata');

    for(const width of [1280,390]){
      await page.setViewportSize({width,height:900});
      await page.goto(`${origin}/schedina.html?competizione=champions&giornata=2`,{waitUntil:'networkidle'});
      await page.waitForSelector('[data-match-panel]');
      assert.equal(await page.locator('[data-match-panel]').count(),18,`${width}px: partite MD2`);
      assert.equal(await page.locator('[data-selection-row]').count(),120,`${width}px: pronostici MD2`);
      assert.equal(await page.locator('[data-selection-row][data-outsider="true"]').count(),26,`${width}px: etichette outsider`);
      assert.equal(await page.locator('[data-selection-row][data-preferred="true"]').count(),18,`${width}px: un preferito per partita`);
      assert.equal(await page.locator('.betting-match-reading-link').count(),18,`${width}px: link letture`);
      assert.equal(await page.locator('[data-selection-row][data-personal-pick]').count(),120,`${width}px: selezioni cliccabili`);
      assert.equal(await page.locator('[data-market-family="Tiri giocatore"]').count(),52,`${width}px: pronostici tiri`);
      assert.equal(await page.locator('[data-market-family="Tiri in porta giocatore"]').count(),26,`${width}px: pronostici SOT`);
      assert.equal(await page.locator('[data-selection-row][data-bookmaker-contract="duo"][data-probability=""][data-ev=""]').count(),78,`${width}px: P/EV individuali devono restare N/D`);
      assert.equal(await page.locator('.betting-champions-md02-markets .betting-market-group').count(),0,`${width}px: intestazioni automatiche mercato ancora visibili`);
      assert.equal(await page.locator('.betting-champions-md02-markets h4').count(),0,`${width}px: titoli o numerazioni automatiche ancora visibili`);
      assert.equal(await page.locator('.betting-champions-md02-markets .betting-market-columns').count(),18,`${width}px: serve una sola riga colonne per partita`);
      assert.equal(await page.locator('.betting-champions-md02-markets .betting-market-columns span:first-child').evaluateAll(nodes=>nodes.every(node=>node.textContent==="")),true,`${width}px: intestazione Mercato ancora visibile`);
      assert.deepEqual(await page.locator('.betting-champions-md02-markets .betting-market-columns').first().locator('span').evaluateAll(nodes=>nodes.map(node=>node.textContent)),['','Probabilità','Quota Sisal','EV',''],`${width}px: intestazioni colonne Champions MD2`);
      const lensPanel=page.locator('[data-match-id="ucl-2026-27-md02-01"]');
      assert.equal(await lensPanel.locator('[data-selection-row]').count(),6,`${width}px: Lens-Sporting deve conservare quattro pronostici e aggiungere due outsider`);
      assert.deepEqual(await lensPanel.locator('[data-selection-row]').evaluateAll(rows=>rows.map(row=>row.dataset.marketFamily)),['Doppia chance','Tiri giocatore','Tiri in porta giocatore','Tiri giocatore','Tiri giocatore','Tiri giocatore'],`${width}px: ordine pronostici Lens-Sporting`);
      const fixtureCases=[
        {id:'ucl-2026-27-md02-12',total:11,outsiders:3,both:0},
        {id:'ucl-2026-27-md02-02',total:2,outsiders:0,both:0},
        {id:'ucl-2026-27-md02-06',total:7,outsiders:2,both:1}
      ];
      for(const fixtureCase of fixtureCases){
        const panel=page.locator(`[data-match-id="${fixtureCase.id}"]`);
        await panel.evaluate(node=>node.open=true);
        assert.equal(await panel.locator('[data-selection-row]').count(),fixtureCase.total,`${width}px: totale ${fixtureCase.id}`);
        assert.equal(await panel.locator('[data-outsider="true"]').count(),fixtureCase.outsiders,`${width}px: outsider ${fixtureCase.id}`);
        assert.equal(await panel.locator('[data-preferred="true"]').count(),1,`${width}px: preferito ${fixtureCase.id}`);
        assert.equal(await panel.locator('[data-outsider="true"][data-preferred="true"]').count(),fixtureCase.both,`${width}px: doppia etichetta ${fixtureCase.id}`);
      }
      assert.match(await page.locator('[data-match-id="ucl-2026-27-md02-06"] [data-outsider="true"][data-preferred="true"]').innerText(),/OUTSIDER[\s\S]*PREFERITO/,`${width}px: badge combinati non visibili`);
      const schedinaVisual=await page.locator('[data-match-id="ucl-2026-27-md02-06"] [data-outsider="true"][data-preferred="true"]').evaluate(row=>{
        const outsider=row.querySelector('.betting-outsider-badge'),preferred=row.querySelector('.betting-preferred-badge'),star=preferred?.querySelector('span');
        const rect=node=>{const box=node?.getBoundingClientRect();return box?{width:box.width,height:box.height}:null};
        return {outsider:rect(outsider),preferred:rect(preferred),outsiderColor:getComputedStyle(outsider).color,outsiderBackground:getComputedStyle(outsider).backgroundColor,starColor:getComputedStyle(star).color,preferredBackground:getComputedStyle(preferred).backgroundColor,borderColor:getComputedStyle(row).borderLeftColor};
      });
      assert(schedinaVisual.outsider.width>0&&schedinaVisual.outsider.height>0,`${width}px: badge OUTSIDER illeggibile`);
      assert(schedinaVisual.preferred.width>0&&schedinaVisual.preferred.height>0,`${width}px: badge PREFERITO illeggibile`);
      assert.notEqual(schedinaVisual.outsiderColor,schedinaVisual.outsiderBackground,`${width}px: contrasto OUTSIDER nullo`);
      assert.notEqual(schedinaVisual.starColor,schedinaVisual.preferredBackground,`${width}px: contrasto stella nullo`);
      assert.notEqual(schedinaVisual.borderColor,'rgba(0, 0, 0, 0)',`${width}px: bordo preferito assente`);
      assert.match(await page.locator('.betting-champions-md02-summary').innerText(),/120 pronostici da verificare[\s\S]*ROI e profitto\/perdita restano N\/D/);
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

    const readingCases=[
      {id:'ucl-2026-27-md02-12',total:11,outsiders:3,both:0},
      {id:'ucl-2026-27-md02-02',total:2,outsiders:0,both:0},
      {id:'ucl-2026-27-md02-06',total:7,outsiders:2,both:1}
    ];
    for(const width of [1280,390]){
      await page.setViewportSize({width,height:900});
      for(const readingCase of readingCases){
        await page.goto(`${origin}/champions-league.html?match=${readingCase.id}`,{waitUntil:'networkidle'});
        await page.waitForSelector('[data-champions-published-root]');
        assert.equal(await page.locator('[data-published-selection-id]').count(),readingCase.total,`${width}px: sync lettura ${readingCase.id}`);
        assert.equal(await page.locator('[data-published-selection-id][data-outsider="true"]').count(),readingCase.outsiders,`${width}px: outsider lettura ${readingCase.id}`);
        assert.equal(await page.locator('[data-published-selection-id][data-preferred="true"]').count(),1,`${width}px: preferito lettura ${readingCase.id}`);
        assert.equal(await page.locator('[data-published-selection-id][data-outsider="true"][data-preferred="true"]').count(),readingCase.both,`${width}px: doppia etichetta lettura ${readingCase.id}`);
        if(readingCase.both){
          const readingVisual=await page.locator('[data-published-selection-id][data-outsider="true"][data-preferred="true"]').evaluate(row=>{
            const outsider=row.querySelector('.champions-outsider-badge'),preferred=row.querySelector('.champions-preferred-badge'),star=preferred?.querySelector('span');
            const rect=node=>{const box=node?.getBoundingClientRect();return box?{width:box.width,height:box.height}:null};
            return {outsider:rect(outsider),preferred:rect(preferred),outsiderColor:getComputedStyle(outsider).color,outsiderBackground:getComputedStyle(outsider).backgroundColor,starColor:getComputedStyle(star).color,preferredBackground:getComputedStyle(preferred).backgroundColor,borderColor:getComputedStyle(row).borderLeftColor};
          });
          assert(readingVisual.outsider.width>0&&readingVisual.preferred.width>0,`${width}px: badge lettura illeggibili`);
          assert.notEqual(readingVisual.outsiderColor,readingVisual.outsiderBackground,`${width}px: contrasto OUTSIDER lettura nullo`);
          assert.notEqual(readingVisual.starColor,readingVisual.preferredBackground,`${width}px: contrasto stella lettura nullo`);
          assert.notEqual(readingVisual.borderColor,'rgba(0, 0, 0, 0)',`${width}px: bordo preferito lettura assente`);
        }
        assert.equal(await page.locator('[data-champions-market-root],#champions-sisal-markets,.champions-market-browser,.champions-market-controls,.champions-market-slip').count(),0,`${width}px: catalogo o ricerca quote ancora visibili`);
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`${width}px: overflow orizzontale lettura ${readingCase.id}`);
      }
    }
    await page.setViewportSize({width:1280,height:900});
    const publishedButton=page.locator('[data-published-selection-id]').filter({hasText:'Tiri giocatore'}).first().locator('[data-add-published-selection]');
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
    console.log('OK browser card Champions MD2: 18 partite, 120 pronostici, sync lettura/MyCombo, reload, mobile e regressioni');
  }finally{
    await browser.close();
    server.close();
  }
})().catch(error=>{console.error(error);server.close();process.exitCode=1});
