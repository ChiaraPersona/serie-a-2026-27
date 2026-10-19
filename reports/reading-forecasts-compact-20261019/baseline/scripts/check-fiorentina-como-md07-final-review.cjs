const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert/strict');
const {chromium}=require('C:/Users/utente/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),id='fiorentina-como-2026-27-md-07',out=path.join(root,'output/reports/fiorentina-como-md07-official');
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p))),data=read('data/normalized/schedina-md07.json');
const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{const p=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!p.startsWith(root+path.sep))return res.writeHead(403).end();fs.readFile(p,(e,b)=>{res.writeHead(e?404:200,{'Content-Type':mime[path.extname(p)]||'application/octet-stream'});res.end(e?'Missing':b);});});
(async()=>{
 const {sharedForecastsForMatch}=await import('../js/pages/shared-forecast-contract.mjs');
 const expected=sharedForecastsForMatch(data.marketCatalog,id).map(l=>l.selectionId).sort();
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({channel:'msedge',headless:true}),base='http://127.0.0.1:'+server.address().port,reports=[];
 try{for(const width of [1440,390]){
  const context=await browser.newContext({viewport:{width,height:1000}}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/schedina.html?giornata=7',{waitUntil:'networkidle'});
  const panel=page.locator('[data-match-id="'+id+'"]');await panel.waitFor();await page.locator('[data-match-open-all]').click();
  assert.deepEqual(await panel.locator('[data-selected-forecast=true]').evaluateAll(rows=>rows.map(r=>r.dataset.personalPick).sort()),expected);
  const unquoted=data.marketCatalog.matches.find(m=>m.matchId===id).selections.find(l=>l.forecastIdentity&&l.betSelection.quote.availability==='UNAVAILABLE'&&l.suggestionAnalysis?.suggested);
  const pick=page.locator('[data-personal-pick="'+unquoted.selectionId+'"]');await pick.click();assert.equal(await pick.getAttribute('aria-pressed'),'true');
  assert.equal(await page.locator('.personal-betslip-total strong').innerText(),'—');
  await page.reload({waitUntil:'networkidle'});await page.locator('[data-personal-pick="'+unquoted.selectionId+'"][aria-pressed=true]').waitFor({state:'attached'});
  await page.goto(base+'/lettura.html?match='+id,{waitUntil:'networkidle'});await page.locator('.rd-shell').waitFor();
  const lineupLabels=await page.locator('.rd-lineup-head b').allTextContents();assert.equal(lineupLabels.length,2);assert(lineupLabels.every(s=>s.includes('Ufficiale')));
  assert.equal(await page.locator('.rd-field-player').count(),22);
  const currentRows=await page.locator('[data-shared-forecast-id]').count();
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await page.screenshot({path:path.join(out,'review-'+width+'.png')});
  assert.deepEqual(errors,[]);reports.push({width,shared:expected.length,officialStarters:22,currentReadingForecastRows:currentRows,readingForecastPanel:currentRows===0?'ABSENT_IN_CURRENT_LAYOUT':'PRESENT',unquotedTotalUnavailable:true,savedSelectionPersisted:true,overflow:'PASS',errors});
  await context.close();
 }}finally{await browser.close();await new Promise(r=>server.close(r));}
 fs.writeFileSync(path.join(out,'final-browser-review.json'),JSON.stringify(reports,null,2)+'\n');console.log(reports);
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
