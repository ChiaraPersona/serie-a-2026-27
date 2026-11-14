'use strict';
// Local, isolated regression browser; follows the project's existing Edge runner.
const {chromium}=require('C:/Users/utente/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..'),artifact=require('../data/derived/champions-md03/market-catalog-official-seven-v2-2026-10-20.json');
const out=path.join(root,'output/champions-md3-seven-official');fs.mkdirSync(out,{recursive:true});
const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.css':'text/css','.svg':'image/svg+xml','.png':'image/png'};
const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}fs.readFile(file,(e,b)=>{res.writeHead(e?404:200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(e?'Missing':b);});});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
  browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage(),errors=[],checks=[];page.on('pageerror',e=>errors.push(e.message));
  const base=`http://127.0.0.1:${server.address().port}`;
  for(const width of [1440,390,320]){
   await page.setViewportSize({width,height:900});
   await page.goto(base+'/schedina.html?competizione=champions&giornata=3',{waitUntil:'networkidle'});await page.waitForSelector('[data-champions-workspace="3"]');await page.locator('[data-match-open-all]').click();
   for(const m of artifact.matches){
    const panel=page.locator(`[data-match-id="${m.matchId}"]`);assert.equal(await panel.locator('[data-selection-row]').count(),m.suggestions.length);
    for(const leg of m.selections.filter(l=>l.marketScope==='player'&&l.suggestionAnalysis.suggested)){
     const row=panel.locator(`[data-personal-pick="${leg.selectionId}"]`);assert(await row.isVisible());assert.equal(await row.getAttribute('data-probability'),'');assert(Number(await row.getAttribute('data-odds'))>1);assert((await row.innerText()).includes('DUO'));
    }
   }
   assert(!(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)),'schedina overflow '+width);
   const porto=page.locator('[data-match-id="ucl-2026-27-md03-04"]');await porto.scrollIntoViewIfNeeded();await page.screenshot({path:path.join(out,`schedina-${width}.png`)});
   if(width===1440){const id=artifact.matches[1].selections.find(l=>l.marketScope==='player'&&l.suggestionAnalysis.suggested).selectionId;await page.locator(`[data-personal-pick="${id}"]`).click();await page.reload({waitUntil:'networkidle'});assert((await page.evaluate(()=>localStorage.getItem('serie-a-2026-27:personal-betslip:v1'))).includes(id));}
   for(const m of artifact.matches){
    await page.goto(base+'/champions-league.html?match='+m.matchId,{waitUntil:'networkidle'});await page.waitForSelector('.rd-shell');
    assert.equal(await page.locator('[data-md3-probable-player][data-projected-role="starter"]').count(),22);assert.equal(await page.locator('[data-availability="probable-starter"]').count(),0);
    assert.equal(await page.locator('#lettura-pronostici [data-shared-forecast-id]').count(),m.suggestions.length,'reading sync '+m.matchId);
    const visible=await page.locator('main').innerText();assert(!/undefined soglie|Fonti e provenienza/.test(visible));
    assert(!(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)),'reading overflow '+width+' '+m.matchId);
    if(m.matchId.endsWith('04')){await page.locator('#lettura-pronostici').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(out,`reading-${width}.png`)});}
    checks.push({width,fixtureId:m.matchId,officialStarters:22,shown:m.suggestions.length,readingSchedinaSync:true,overflow:false});
   }
  }
  for(const query of ['competizione=champions&giornata=1','competizione=champions&giornata=2','giornata=7']){await page.goto(base+'/schedina.html?'+query,{waitUntil:'networkidle'});await page.waitForSelector('[data-match-panel]');}
  assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'browser.json'),JSON.stringify({status:'PASS',checks,errors,savedSelectionReload:true,archiveAndSerieASmoke:true},null,2)+'\n');console.log(JSON.stringify({status:'PASS',readings:checks.length,widths:[1440,390,320],savedSelectionReload:true,errors}));
 }finally{await browser?.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
