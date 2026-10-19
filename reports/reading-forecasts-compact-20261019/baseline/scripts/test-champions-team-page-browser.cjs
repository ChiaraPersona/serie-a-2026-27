const {chromium}=require('C:/Users/utente/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const http=require('node:http');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const assert=require('node:assert/strict');

const root=path.resolve(__dirname,'..');
const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.css':'text/css','.png':'image/png','.jpg':'image/jpeg'};
const server=http.createServer((req,res)=>{
  const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return}
  fs.readFile(file,(error,body)=>{res.writeHead(error?404:200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'});res.end(error?'Missing':body)});
});

const cases=[
  {id:'bayern-munchen',volume:true,attack:true},
  {id:'aek-athens',volume:true,attack:false},
  {id:'fenerbahce',volume:true,attack:true,fallback:true},
  {id:'sabah',volume:false,attack:false}
];
const widths=[1280,768,390];
const snapshotLabel=(process.argv.find(argument=>argument.startsWith('--snapshot='))||'').split('=')[1]||null;
const screenshotDirectory=(process.argv.find(argument=>argument.startsWith('--screenshots='))||'').slice('--screenshots='.length)||os.tmpdir();

(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const browser=await chromium.launch({headless:true,channel:'msedge'});
  const page=await browser.newPage();
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  try{
    for(const width of widths){
      await page.setViewportSize({width,height:1000});
      for(const item of cases){
        await page.goto(`http://127.0.0.1:${server.address().port}/champions-league.html?team=${item.id}`,{waitUntil:'networkidle'});
        await page.waitForSelector('.champions-team-detail');
        assert.equal(await page.locator('.champions-team-hero-logo img').count(),1,`${item.id}: stemma`);
        assert(await page.locator('.champions-team-hero-logo img').evaluate(image=>image.naturalWidth>0),`${item.id}: stemma caricato`);
        assert.match(await page.locator('.champions-team-hero-facts').innerText(),/Posizione fase campionato/i);
        const heroCoach=await page.locator('.champions-team-identity p').last().innerText();
        const lineupCoach=await page.locator('.champions-team-lineup footer span').innerText();
        assert.doesNotMatch(heroCoach,/[-\u2010-\u2015]{3,}/u,`${item.id}: allenatore hero senza trattini decorativi`);
        assert.doesNotMatch(lineupCoach,/[-\u2010-\u2015]{3,}/u,`${item.id}: allenatore formazione senza trattini decorativi`);
        if(item.id==='bayern-munchen'){
          assert.equal(heroCoach,'Allenatore: Vincent Kompany',`${item.id}: allenatore hero pulito`);
          assert.equal(lineupCoach,'Allenatore: Vincent Kompany',`${item.id}: allenatore formazione pulito`);
        }
        assert.equal(await page.locator('.champions-calendar-list>li').count(),8,`${item.id}: calendario`);
        assert.equal(await page.locator('.champions-calendar-list>li.is-next').count(),1,`${item.id}: prossima gara`);
        assert.equal(await page.locator('.champions-calendar-result').count(),1,`${item.id}: risultato concluso`);
        assert.equal(await page.locator('.champions-calendar-list a[href*="?match="]').count(),2,`${item.id}: letture MD1 e MD2`);
        assert.equal(await page.locator('.champions-volume-grid').count(),item.volume?1:0,`${item.id}: volumi`);
        assert.equal(await page.locator('.champions-team-volume.is-unavailable').count(),item.volume?0:1,`${item.id}: fallback N/D`);
        assert.equal(await page.locator('.champions-team-attack').count(),item.attack?1:0,`${item.id}: fasce`);
        if(item.fallback)assert.match(await page.locator('.champions-team-volume>header').innerText(),/fallback UEFA/i);
        assert.equal(await page.locator('.champions-player-ranking-tabs button').count(),3,`${item.id}: selettori ranking`);
        assert.equal(await page.locator('.champions-player-controls input[type="search"]').count(),1,`${item.id}: ricerca`);
        assert.equal(await page.locator('.champions-player-controls select').count(),2,`${item.id}: filtri`);
        assert.equal(await page.locator('#offensive-identity,#defensive-vulnerability,#recent-form').count(),0,`${item.id}: sezioni future vuote`);
        const order=await page.locator('.champions-team-detail').evaluate(rootNode=>['.champions-team-hero','.champions-team-summary','.champions-team-calendar','.champions-team-volume','.champions-team-attack','.champions-team-lineup','.champions-player-overview','.champions-team-players'].filter(selector=>rootNode.querySelector(selector)).map(selector=>({selector,top:rootNode.querySelector(selector).getBoundingClientRect().top})).every((item,index,array)=>!index||item.top>=array[index-1].top));
        assert(order,`${item.id}: ordine sezioni`);
        const firstName=await page.locator('.champions-player-stats-table tbody tr').first().getAttribute('data-player-name');
        await page.locator('#champions-player-search').fill(firstName.split(' ')[0]);
        assert((await page.locator('.champions-player-stats-table tbody tr:visible').count())>=1,`${item.id}: ricerca nome`);
        await page.locator('#champions-player-search').fill('');
        await page.selectOption('#champions-player-role','forward');
        assert((await page.locator('.champions-player-stats-table tbody tr:visible').count())>=1,`${item.id}: filtro ruolo`);
        assert.equal(await page.locator('.champions-player-stats-table tbody tr:visible').evaluateAll(rows=>rows.every(row=>row.dataset.playerRole==='forward')),true,`${item.id}: filtro ruolo coerente`);
        await page.selectOption('#champions-player-role','all');
        await page.selectOption('#champions-player-sort','minutes');
        const sortedMinutes=await page.locator('.champions-player-stats-table tbody tr:visible').evaluateAll(rows=>rows.map(row=>row.dataset.statMinutes===''?null:Number(row.dataset.statMinutes)));
        assert.deepEqual(sortedMinutes,sortedMinutes.slice().sort((a,b)=>a==null&&b==null?0:a==null?1:b==null?-1:b-a),`${item.id}: ordinamento minuti`);
        const shotsRanking=await page.locator('[data-ranking-panel="shots"]').innerText();
        await page.locator('[data-player-ranking="shotsOnTarget"]').click();
        assert.equal(await page.locator('[data-player-ranking="shotsOnTarget"]').getAttribute('aria-pressed'),'true',`${item.id}: selettore SOT`);
        assert.equal(await page.locator('[data-ranking-panel]:visible').count(),1,`${item.id}: un solo ranking visibile`);
        assert.equal(await page.locator('[data-ranking-panel]:visible').getAttribute('data-ranking-panel'),'shotsOnTarget',`${item.id}: pannello SOT visibile`);
        const sotRanking=await page.locator('[data-ranking-panel="shotsOnTarget"]').innerText();
        if(item.id==='bayern-munchen')assert.notEqual(sotRanking,shotsRanking,`${item.id}: il cambio metrica deve aggiornare valori e classifica`);
        const visibleRankingRows=await page.locator('[data-ranking-panel]:visible>li').count();
        if(item.id==='bayern-munchen')assert.equal(visibleRankingRows,5,`${item.id}: cinque giocatori nel ranking`);
        else assert(visibleRankingRows>=1&&visibleRankingRows<=5,`${item.id}: ranking limitato ai dati realmente disponibili`);
        const visual=await page.evaluate(({hasVolume,width})=>{
          const style=selector=>getComputedStyle(document.querySelector(selector));
          const box=selector=>document.querySelector(selector)?.getBoundingClientRect()||null;
          const rankingBar=box('[data-ranking-panel]:not([hidden]) i');
          const result={
            summaryTitleColor:style('.champions-team-summary h2').color,
            summaryTitleSize:parseFloat(style('.champions-team-summary h2').fontSize),
            overviewTitleColor:style('.champions-player-overview h2').color,
            overviewTitleSize:parseFloat(style('.champions-player-overview h2').fontSize),
            selectorHeight:box('[data-player-ranking]').height,
            selectorFont:parseFloat(style('[data-player-ranking]').fontSize),
            rankingBarHeight:rankingBar?.height||0,
            rankingHasData:Boolean(rankingBar),
            tableFont:parseFloat(style('.champions-player-stats-table').fontSize),
            controlsBackground:style('#champions-player-search').backgroundColor
          };
          if(hasVolume){
            result.volumeColumns=style('.champions-volume-grid').gridTemplateColumns.split(' ').filter(Boolean).length;
            const lines=[...document.querySelectorAll('.champions-volume-comparison:first-child .champions-volume-line')];
            result.volumeLineTops=lines.map(line=>Math.round(line.getBoundingClientRect().top));
            result.volumeBarHeight=box('.champions-volume-line i').height;
          }
          result.expectedColumns=width<=600?1:2;
          return result;
        },{hasVolume:item.volume,width});
        assert.equal(visual.summaryTitleColor,'rgb(255, 255, 255)',`${item.id}: contrasto titolo riepilogo`);
        assert(visual.summaryTitleSize>=32,`${item.id}: dimensione titolo riepilogo`);
        assert.equal(visual.overviewTitleColor,'rgb(255, 255, 255)',`${item.id}: contrasto titolo giocatori`);
        assert(visual.overviewTitleSize>=32,`${item.id}: dimensione titolo giocatori`);
        assert(visual.selectorHeight>=44&&visual.selectorFont>=11,`${item.id}: selettori leggibili`);
        if(visual.rankingHasData)assert(visual.rankingBarHeight>=11,`${item.id}: barre ranking visibili`);
        else assert.equal(await page.locator('[data-ranking-panel]:visible>li.is-empty').count(),1,`${item.id}: ranking N/D esplicito`);
        assert(visual.tableFont>=11,`${item.id}: testo tabella leggibile`);
        assert(!visual.controlsBackground.includes('255, 255, 255'),`${item.id}: controlli coerenti con la card scura`);
        if(item.volume){
          assert.equal(visual.volumeColumns,visual.expectedColumns,`${item.id}: griglia volumi ${width}px`);
          assert(visual.volumeBarHeight>=13,`${item.id}: barre volumi visibili`);
          if(width>600)assert.equal(visual.volumeLineTops[0],visual.volumeLineTops[1],`${item.id}: produzione e concessione affiancate`);
          else assert(visual.volumeLineTops[1]>visual.volumeLineTops[0],`${item.id}: produzione e concessione verticali su mobile`);
        }
        assert.equal(await page.locator('.champions-player-stats-table thead th').first().evaluate(cell=>getComputedStyle(cell).position),'sticky',`${item.id}: intestazione sticky`);
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`${item.id} ${width}px: overflow pagina`);
        if(width===390)assert(await page.locator('.champions-player-table-wrap').evaluate(node=>node.scrollWidth>node.clientWidth),`${item.id}: tabella scorrevole`);
        if(snapshotLabel){
          fs.mkdirSync(screenshotDirectory,{recursive:true});
          for(const [section,selector] of [['summary','.champions-team-summary'],['volume','.champions-team-volume'],['players','.champions-player-overview'],['table','.champions-team-players']]){
            await page.locator(selector).screenshot({path:path.join(screenshotDirectory,`${snapshotLabel}-${item.id}-${width}-${section}.png`)});
          }
        }
        if(item.id==='bayern-munchen')await page.screenshot({path:path.join(os.tmpdir(),`champions-team-bayern-${width}.png`),fullPage:true});
        console.log(`OK ${item.id} ${width}px`);
      }
    }
    assert.deepEqual(errors,[],'errori JavaScript browser');
  }finally{
    await browser.close();
    server.close();
  }
})().catch(error=>{console.error(error);server.close();process.exitCode=1});
