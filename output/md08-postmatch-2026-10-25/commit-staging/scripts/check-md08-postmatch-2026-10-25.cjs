'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('C:/Users/utente/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),dir='output/md08-postmatch-2026-10-25',ids=JSON.parse(fs.readFileSync('output/md08-postmatch-2026-10-25/baseline.json')).matchIds;
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.css':'text/css','.svg':'image/svg+xml','.webp':'image/webp'};
const server=http.createServer((req,res)=>{const f=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!f.startsWith(root+path.sep))return res.writeHead(403).end();fs.readFile(f,(e,b)=>{res.writeHead(e?404:200,{'Content-Type':mime[path.extname(f)]||'application/octet-stream'});res.end(e?'Missing':b);});});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({channel:'msedge',headless:true}),errors=[],results=[];
 try{for(const width of [1440,390])for(const id of ids){const report=read(dir+'/settlement.json').find(r=>r.matchId===id),count=report.rows.length;
  const context=await browser.newContext({viewport:{width,height:1000}}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://fonts.googleapis.com/**',r=>r.abort());await page.route('https://fonts.gstatic.com/**',r=>r.abort());
  const overflow=async()=>assert(!await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),'Overflow '+width+' '+page.url());
  const forecast=read('data/normalized/schedina-md08.json').marketCatalog.matches.find(m=>m.matchId===id).selections.find(l=>l.suggestionAnalysis?.suggested&&Number.isFinite(l.odds));
  await page.goto(origin+'/schedina.html?giornata=8');await page.waitForSelector('[data-match-panel]');
  const stored={version:1,activeContext:'serie-a:2026-27:md08',contexts:{'serie-a:2026-27:md08':{context:{competition:'serie-a',season:'2026-27',matchday:8},selections:[{...forecast,context:{competition:'serie-a',season:'2026-27',matchday:8}}]}}};
  await page.evaluate(value=>localStorage.setItem('serie-a-2026-27:personal-betslip:v1',JSON.stringify(value)),stored);await page.reload();await page.waitForSelector('[data-match-panel]');
  await page.locator('[data-match-open-all]').click();const panel=page.locator('[data-match-id="'+id+'"][data-match-panel]');
  assert.equal(await panel.locator('[data-selection-row]').count(),count);assert.equal(await panel.locator('[data-settlement="won"][data-selection-row]').count(),report.counts.won);assert.equal(await panel.locator('[data-settlement="lost"][data-selection-row]').count(),report.counts.lost);
  assert.equal(await panel.locator('[data-selection-row][data-personal-pick]').count(),0);assert.equal(await panel.locator('[data-selection-row][aria-disabled="true"]').count(),count);
  assert.equal(await page.locator('[data-match-panel]').count(),10);assert((await page.locator('[data-match-panel] [data-personal-pick]').count())>0,'Future fixtures disabled');
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('serie-a-2026-27:personal-betslip:v1')));assert(saved.contexts['serie-a:2026-27:md08'].selections.some(l=>l.selectionId===forecast.selectionId));
  await overflow();await panel.screenshot({path:dir+'/'+id+'-schedina-'+width+'.png'});
  await page.goto(origin+'/lettura.html?match='+id);await page.waitForSelector('.rd-shell');
  assert.equal(await page.locator('[data-forecast-id]').count(),count);assert.equal(await page.locator('[data-rd-pick]:enabled').count(),0);
  const resultsLink=page.locator('[data-reading-results-link]');assert.equal(await resultsLink.getAttribute('href'),'schedina.html?giornata=8');
  const sourceLinks=await page.locator('.rd-shell a:visible').evaluateAll(links=>links.filter(a=>/statmuse|legaseriea|torinofc|acmonza/i.test(a.href)).map(a=>a.href));assert.deepEqual(sourceLinks,[]);
  await overflow();await page.screenshot({path:dir+'/'+id+'-lettura-'+width+'.png',fullPage:false});
  await resultsLink.click();await page.waitForSelector('[data-match-panel]');assert(page.url().includes('giornata=8'));
  await page.goto(origin+'/lettura.html?match='+id+'&layout=legacy');await page.waitForSelector('.reading-post-match');
  assert.equal(await page.locator('.reading-player-table tbody tr').count(),report.players);assert((await page.locator('.reading-post-match').innerText()).includes(read('data/normalized/matches.json').find(m=>m.id===id).scorers[0].player));
  assert.equal(await page.locator('.reading-post-match-source:visible').count(),0);await overflow();await page.locator('.reading-post-match').screenshot({path:dir+'/tabellino-'+width+'.png'});
  await page.goto(origin+'/index.html');await page.waitForSelector('.standings-table tbody tr');assert.equal(await page.locator('.standings-table').first().locator('tbody tr').count(),20);await overflow();await page.screenshot({path:dir+'/home-'+width+'.png',fullPage:false});
  results.push({width,fixture:id,forecasts:count,won:report.counts.won,lost:report.counts.lost,finishedSelectionsDisabled:true,futureFixturesSelectable:true,savedSelectionPreserved:true,readingResultsLink:true,reportPlayers:32,publicSourcesHidden:true,overflow:false});await context.close();
 }
 assert.deepEqual(errors,[]);fs.writeFileSync(path.join(root,dir,'browser-audit.json'),JSON.stringify({status:'PASS',results,errors},null,2)+'\n');console.log(JSON.stringify({status:'PASS',results}));
 }finally{await browser.close();server.close();}
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
