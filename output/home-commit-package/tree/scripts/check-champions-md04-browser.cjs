'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('C:/Users/utente/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),outIndex=process.argv.indexOf('--output-dir');
const out=path.resolve(root,outIndex<0?'output/champions-md04/browser':process.argv[outIndex+1]);
assert(out.startsWith(path.join(root,'output')+path.sep),'Browser evidence must remain inside output/');
fs.mkdirSync(out,{recursive:true});
const catalog=JSON.parse(fs.readFileSync(path.join(root,'data/normalized/schedina-champions-md04.json')));
const playerHistory=JSON.parse(fs.readFileSync(path.join(root,'data/generated/champions-player-match-history.json')));
const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp'};
const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!file.startsWith(root+path.sep))return res.writeHead(403).end();fs.readFile(file,(e,b)=>{res.writeHead(e?404:200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'});res.end(e?'Missing':b);});});
async function run(){
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 const results=[],base='http://127.0.0.1:'+server.address().port;
 try{
  browser=await chromium.launch({headless:true,channel:'msedge'});
  for(const width of [1440,390]){
   const context=await browser.newContext({viewport:{width,height:1000}}),page=await context.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   const check=async label=>{
    assert.deepEqual(errors,[],label);
    assert(!await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),label+' overflow');
    const text=await page.locator('#app').innerText();assert(!/NaN|undefined|Infinity/.test(text),label+' invalid values');
    assert.equal(await page.locator('#app :is([data-source-panel],.source-panel,.sources-panel):visible').count(),0,label+' public sources');
    results.push({width,label,errors:[]});
   };
   await page.goto(base+'/schedina.html?competizione=champions&giornata=4');
   await page.waitForSelector('[data-champions-workspace="4"]');
   await page.locator('[data-match-open-all]').click();
   assert(await page.locator('[data-selection-row][data-odds]').evaluateAll(rows=>rows.every(r=>!r.dataset.odds||Number(r.dataset.odds)>=1.08)),'No public Champions price below 1.08');
   assert(await page.locator('[data-selection-row]').evaluateAll(rows=>rows.every(r=>!/ESITO FINALE 1X2\s*·\s*X$/.test(r.dataset.selectionLabel||''))),'No straight-draw proposal');
   for(const m of catalog.marketCatalog.matches){const panel=page.locator(`[data-match-id="${m.matchId}"]`);assert.equal(await panel.locator('.betting-match-body > .betting-market-list [data-selection-row]').count(),m.suggestions.length,m.matchId);
   }

   assert.equal(await page.locator('[data-champions-forecast-coverage],[data-manual-champions-markets]').count(),0,'Retired sections removed');
   assert(!/Altri mercati disponibili|Previsioni di squadra e partita/.test(await page.locator('#app').innerText()));
   const calendar=JSON.parse(fs.readFileSync(path.join(root,'data/normalized/champions-league-2026-27.json')));
   const target=catalog.marketCatalog.matches.find(m=>calendar.fixtures.some(f=>f.id===m.matchId&&f.status==='scheduled')&&m.suggestions.some(id=>m.selections.find(l=>l.selectionId===id).marketScope==='player'));
   assert(target,'A scheduled fixture with a selectable player contract is required');
   const pick=target.suggestions.find(id=>target.selections.find(l=>l.selectionId===id).marketScope==='player');
   await page.locator(`[data-personal-pick="${pick}"]`).first().click();
   assert((await page.evaluate(()=>localStorage.getItem('serie-a-2026-27:personal-betslip:v1'))).includes(pick));
   const volumePick=catalog.marketCatalog.matches.filter(m=>calendar.fixtures.some(f=>f.id===m.matchId&&f.status==='scheduled')).flatMap(m=>m.selections).find(l=>l.catalogOrigin==='champions-md04-team-volumes'&&l.suggestionAnalysis?.suggested);
   if(volumePick){
    const volumePanel=page.locator(`[data-match-id="${volumePick.matchId}"]`);
    const volumeRow=volumePanel.locator(`[data-personal-pick="${volumePick.selectionId}"]`);
    assert(Math.abs(Number(await volumeRow.getAttribute('data-probability'))-volumePick.modelProbabilityPct)<1e-9);
    assert((await volumeRow.innerText()).includes('Probabilità preliminare'));
    await volumePanel.locator(`[data-personal-pick="${volumePick.selectionId}"]`).click();
    await volumeRow.screenshot({path:path.join(out,`team-market-${width}.png`)});
    assert((await page.evaluate(()=>localStorage.getItem('serie-a-2026-27:personal-betslip:v1'))).includes(volumePick.selectionId));
   }
   await check('schedina-md04');await page.screenshot({path:path.join(out,`schedina-${width}.png`)});
   for(const m of catalog.marketCatalog.matches){
    await page.goto(base+'/champions-league.html?match='+m.matchId);
    await page.waitForSelector(m.suggestions.length?'#lettura-pronostici [data-shared-forecast-id]':'[data-md3-probable-player]',{state:'attached'}).catch(async e=>{fs.writeFileSync(path.join(out,'failure.json'),JSON.stringify({errors,text:await page.locator('#app').innerText()},null,2));throw e;});
    assert.equal(await page.locator('#lettura-pronostici [data-shared-forecast-id]').count(),m.suggestions.length,m.matchId);
    if(m.resultModel){
     assert.equal(await page.locator('[data-european-result]').count(),1,'European result panel '+m.matchId);
     for(const [label,key]of [['1','home'],['X','draw'],['2','away']]){
      const value=m.forecastCoverage.result[key],expected=Number.isFinite(value)?value.toLocaleString('it-IT',{maximumFractionDigits:1})+'%':'—';
      assert.equal(await page.locator(`[data-result-outcome="${label}"]`).innerText(),expected,'Same published 1X2 probability '+m.matchId);
     }
     assert.equal(await page.locator('.rd-score-grid article').filter({hasText:'Risultato previsto'}).count(),0,'No inherited Poisson score');
    }
    assert.equal(await page.locator('[data-md3-probable-player][data-projected-role="starter"]').count(),22);
    const displayedHistory=await page.locator('[data-md3-probable-player]').evaluateAll(rows=>rows.map(row=>({team:row.closest('[data-md3-probable-team]').dataset.md3ProbableTeam,player:row.dataset.playerId,sections:row.querySelectorAll('[data-player-match-history]').length,dates:[...row.querySelectorAll('[data-player-match-history] time')].map(t=>t.dateTime)})));
    const fixtureDate=catalog.marketCatalog.matches.find(x=>x.matchId===m.matchId).selections[0]?.context?.date||JSON.parse(fs.readFileSync(path.join(root,'data/normalized/champions-league-2026-27.json'))).fixtures.find(f=>f.id===m.matchId).date;
    for(const row of displayedHistory){
     assert.equal(row.sections,1,'History for every starter and reserve');
     const expected=(playerHistory.players[row.team+':'+row.player]||[]).filter(r=>r.date<fixtureDate&&r.availableAt.slice(0,10)<=fixtureDate).slice(0,5).map(r=>r.date);
     assert.deepEqual(row.dates,expected,'Exact player opponent log '+row.player);
    }
    if(m===target){
     if(volumePick)assert((await page.evaluate(()=>localStorage.getItem('serie-a-2026-27:personal-betslip:v1'))).includes(volumePick.selectionId),'Team market survives navigation to reading');
     const button=page.locator(`[data-rd-pick="${pick}"]`);assert.equal(await button.getAttribute('aria-pressed'),'true');
     await page.locator('[data-player-lineup-filter="bench"]').scrollIntoViewIfNeeded();
     await page.locator('[data-player-lineup-filter="bench"]').click();await page.locator('[data-player-card][data-player-lineup="bench"]').first().waitFor({state:'visible',timeout:10000});assert(await page.locator('[data-player-card][data-player-lineup="bench"]:visible').count()>0);
     await page.locator('[data-player-lineup-filter="starter"]').click();
     const mbappe=page.locator('[data-player-card][data-player-id="kylian-mbappe"]');
     if(await mbappe.count()){
      await mbappe.locator(':scope > summary').click();
      const log=mbappe.locator('[data-player-match-history]');await log.evaluate(el=>el.scrollIntoView({block:'center'}));
      assert.equal(await log.locator('li').count(),5);
      await log.screenshot({path:path.join(out,`player-history-${width}.png`)});
     }
     await page.screenshot({path:path.join(out,`reading-${width}.png`)});
    }
    await check(m.matchId);
   }
   await page.goto(base+'/champions-league.html?match=ucl-2026-27-md04-10');await page.waitForSelector('.rd-scenario');
   assert.equal(await page.locator('[data-md3-probable-player][data-projected-role="starter"]').count(),22);await check('Wednesday-probable-XI');
   await page.goto(base+'/schedina.html');await page.waitForSelector('[data-champions-matchday="4"]');await check('archive-md04-card');
   await page.goto(base+'/schedina.html?competizione=champions&giornata=3');await page.waitForSelector('[data-champions-workspace="3"]');await check('historical-md03');
   await context.close();
  }
  fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(results,null,2)+'\n');console.log('OK: '+results.length+' desktop/mobile states; 18 fixtures, DUO persistence, reading/schedina sync, Wednesday and MD3 regression.');
 }finally{if(browser)await browser.close();server.close();}
}
run().catch(e=>{console.error(e);process.exitCode=1;});
