const {chromium}=require('C:/Users/utente/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const http=require('node:http');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const assert=require('node:assert/strict');

const root=path.resolve(__dirname,'..');
const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.css':'text/css','.png':'image/png','.jpg':'image/jpeg'};
const server=http.createServer((request,response)=>{
  const target=path.resolve(root,'.'+decodeURIComponent(new URL(request.url,'http://localhost').pathname));
  if(!target.startsWith(root+path.sep)){response.writeHead(403).end();return}
  fs.readFile(target,(error,body)=>{response.writeHead(error?404:200,{'Content-Type':types[path.extname(target)]||'application/octet-stream'});response.end(error?'Missing':body)});
});

const cases=[
  {id:'ucl-2026-27-md02-03',name:'Arsenal - Lille',published:4,h2h:0},
  {id:'ucl-2026-27-md02-04',name:'Atlético de Madrid - Manchester United',published:3,h2h:2},
  {id:'ucl-2026-27-md01-01',name:'AEK Athens - LASK',published:0,h2h:0,incomplete:true}
];

const rgbValues=value=>(value.match(/[\d.]+/g)||[]).slice(0,3).map(Number);
const isDark=value=>rgbValues(value).reduce((sum,channel)=>sum+channel,0)<240;

(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const origin=`http://127.0.0.1:${server.address().port}`;
  console.log(`SERVER ${origin}/champions-league.html`);
  const browser=await chromium.launch({headless:true,channel:'msedge'});
  try{
    const page=await browser.newPage();
    const errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    for(const fixture of cases){
      for(const width of [1440,390]){
        const height=width===390?844:1000;
        const url=`${origin}/champions-league.html?match=${fixture.id}`;
        console.log(`CHECK ${width}x${height} ${url}`);
        await page.setViewportSize({width,height});
        await page.goto(url,{waitUntil:'networkidle'});
        await page.waitForSelector('.champions-reading-match-hero');
        assert.match(await page.locator('#champions-reading-title').innerText(),new RegExp(fixture.name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')),`${fixture.id}: titolo`);

        const comparison=page.locator('.champions-team-comparison');
        assert.equal(await comparison.count(),1,`${fixture.id}: confronto volumi`);
        assert.equal(await comparison.locator('.champions-comparison-row').count(),6,`${fixture.id}: sei metriche`);
        assert.equal(await comparison.locator('.champions-comparison-track').count(),12,`${fixture.id}: barre contrapposte`);
        const comparisonBox=await comparison.boundingBox();
        const volumeBox=await page.locator('.champions-reading-volume').boundingBox();
        assert(comparisonBox.width>=volumeBox.width*.88,`${fixture.id} ${width}px: confronto non usa la larghezza disponibile`);
        const trackWidths=await comparison.locator('.champions-comparison-track').evaluateAll(nodes=>nodes.map(node=>node.getBoundingClientRect().width));
        assert(trackWidths.every(trackWidth=>trackWidth>=(width===390?45:120)),`${fixture.id} ${width}px: barre compresse`);
        assert.equal(await comparison.locator('.champions-comparison-row').first().evaluate(node=>getComputedStyle(node).display),'grid',`${fixture.id}: righe confronto non in griglia`);

        const published=page.locator('[data-champions-published-root]');
        assert.equal(await page.locator('[data-published-selection-id]').count(),fixture.published,`${fixture.id}: pronostici pubblicati`);
        assert.equal(await page.locator('[data-add-published-selection]').count(),fixture.published,`${fixture.id}: pulsanti MyCombo`);
        assert.equal(await page.getByText('Esiti effettivamente selezionati',{exact:true}).count(),0,`${fixture.id}: intestazione duplicata`);
        assert.equal(await page.getByText(/Nessun mercato aggiunto/).count(),0,`${fixture.id}: testo introduttivo superfluo`);
        if(fixture.published){
          const selectedBackground=await page.locator('.champions-selected-forecasts').evaluate(node=>getComputedStyle(node).backgroundColor);
          const publishedBackground=await published.evaluate(node=>getComputedStyle(node).backgroundColor);
          assert(isDark(selectedBackground),`${fixture.id}: sfondo pronostici non scuro (${selectedBackground})`);
          assert.equal(publishedBackground,'rgba(0, 0, 0, 0)',`${fixture.id}: involucro pronostici non trasparente`);
          if(fixture.id==='ucl-2026-27-md02-03'&&width===1440){
            await page.evaluate(()=>localStorage.clear());
            const myComboButton=page.locator('[data-add-published-selection]').first();
            await myComboButton.click();
            assert.equal(await myComboButton.getAttribute('aria-pressed'),'true',`${fixture.id}: aggiunta MyCombo`);
            assert(await page.evaluate(()=>Boolean(localStorage.getItem('serie-a-2026-27:personal-betslip:v1'))),`${fixture.id}: persistenza MyCombo`);
            await page.evaluate(()=>localStorage.clear());
          }
        }

        const baseline=page.locator('.champions-tactical-table-wrap');
        if(await baseline.count()){
          const backgrounds=await baseline.locator('thead th,tbody th,tbody td').evaluateAll(nodes=>nodes.map(node=>getComputedStyle(node).backgroundColor));
          assert(backgrounds.every(isDark),`${fixture.id}: baseline tattica contiene celle chiare`);
        }

        const referee=page.locator('.champions-reading-hero-referee');
        if(await referee.count()){
          const refereeBox=await referee.boundingBox();
          assert(refereeBox.height<(width===390?560:230),`${fixture.id} ${width}px: designazione arbitrale troppo alta (${refereeBox.height}px)`);
          assert.match(await referee.innerText(),/Designazione arbitrale/i);
        }

        const attackTracks=page.locator('.champions-reading-tactical-analysis .prediction-channels i');
        if(await attackTracks.count()){
          const attackHeights=await attackTracks.evaluateAll(nodes=>nodes.map(node=>node.getBoundingClientRect().height));
          assert(attackHeights.every(trackHeight=>trackHeight>=9),`${fixture.id}: fasce d'attacco troppo sottili`);
        }

        assert.equal(await page.locator('#champions-history').count(),fixture.h2h?1:0,`${fixture.id}: visibilità scontri diretti`);
        if(fixture.h2h)assert.equal(await page.locator('#champions-history .reading-h2h-match').count(),fixture.h2h,`${fixture.id}: precedenti renderizzati`);
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`${fixture.id} ${width}px: overflow orizzontale`);

        if(fixture.id==='ucl-2026-27-md02-03'){
          const suffix=width===390?'mobile':'desktop';
          for(const [label,selector] of [['hero','.champions-reading-match-hero'],['volumi','.champions-reading-volume'],['pronostici','.champions-selected-forecasts'],['tattica','.champions-reading-tactical-analysis']]){
            const locator=page.locator(selector);
            if(await locator.count())await locator.screenshot({path:path.join(os.tmpdir(),`champions-arsenal-lille-${label}-${suffix}.png`)});
          }
        }
      }
    }
    assert.deepEqual(errors,[],'Errori JavaScript in browser');
    console.log(`SCREENSHOTS ${path.join(os.tmpdir(),'champions-arsenal-lille-*.png')}`);
    console.log('OK browser letture Champions: 3 gare, desktop/mobile, layout, palette, H2H e overflow');
  }finally{
    await browser.close();
    server.close();
  }
})().catch(error=>{console.error(error);server.close();process.exitCode=1});
