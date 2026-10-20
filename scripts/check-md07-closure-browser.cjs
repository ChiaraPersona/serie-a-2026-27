"use strict";
const assert=require('node:assert/strict'),fs=require('node:fs'),http=require('node:http'),path=require('node:path');
const {chromium}=require('C:/Users/utente/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..');
const data=JSON.parse(fs.readFileSync(path.join(root,'data/normalized/schedina-md07.json')));
const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.css':'text/css','.svg':'image/svg+xml','.png':'image/png'};
const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!file.startsWith(root+path.sep))return res.writeHead(403).end();fs.readFile(file,(e,b)=>{res.writeHead(e?404:200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'});res.end(e?'Missing':b)})});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({headless:true,channel:'msedge'}),base=`http://127.0.0.1:${server.address().port}`;
 const report=[];const audit=JSON.parse(fs.readFileSync(path.join(root,'output/md07-closure-20261020/audit.json')));
 const {sharedForecastsForMatch}=await import('../js/pages/shared-forecast-contract.mjs');
 try{for(const width of [1440,390]){
  const context=await browser.newContext({viewport:{width,height:1000}}),page=await context.newPage(),errors=[],pages=[];
  page.on('pageerror',e=>errors.push(e.message));
  const visit=async url=>{await page.goto(base+url,{waitUntil:'networkidle'});const main=page.locator('#app, #team-squad-app');await main.waitFor();assert((await main.innerText()).length>100,url);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${width}: overflow ${url}`);pages.push(url);};
  await visit('/schedina.html?giornata=7');
  assert.equal(await page.locator('[data-match-panel]').count(),10);await page.locator('[data-match-open-all]').click();
  const statuses=await page.locator('[data-selected-forecast=true]').evaluateAll(rows=>rows.reduce((a,r)=>(a[r.dataset.settlement]=(a[r.dataset.settlement]||0)+1,a),{}));
  assert.deepEqual(statuses,audit.allPublishedForecasts.won?{won:141,lost:76,void:1}:{});
  assert.equal(await page.locator('[data-selected-forecast=true][data-personal-pick]').count(),0,'Finished fixtures must not allow new picks');
  await page.screenshot({path:path.join(root,`output/md07-closure-20261020/schedina-${width}.png`),fullPage:true});
  await visit('/schedina.html');const card=page.locator('a[href="schedina.html?giornata=7"]');assert((await card.innerText()).includes('182,21'));assert((await card.innerText()).includes('198,00'));
  await visit('/index.html');assert.equal(await page.locator('.standings-table').first().locator('tbody tr').count(),20);
  await page.screenshot({path:path.join(root,`output/md07-closure-20261020/home-${width}.png`),fullPage:true});
  await visit('/statistiche-squadre.html');
  await visit('/statistiche-giocatori.html');
  await page.locator('[data-leader-period]').selectOption('2026/27');
  assert((await page.locator('#global-player-leaderboard').innerText()).includes('Raimondo'));
  await page.locator('[data-ranking-name]').fill('Di Nunzio');
  assert((await page.locator('#global-player-leaderboard').innerText()).includes('Di Nunzio'));
  await page.locator('[data-ranking-name]').fill('');
  const picks=page.locator('[data-compare-key]');await picks.nth(0).click();await picks.nth(1).click();assert.equal(await page.locator('.comparison-row').count()>0,true);
  for(const team of audit.teams)await visit(`/statistiche-squadra/${team.teamId}.html`);
  for(const match of data.marketCatalog.matches){await visit(`/lettura.html?match=${match.matchId}`);assert.equal(await page.locator('[data-forecast-id]').count(),sharedForecastsForMatch(data.marketCatalog,match.matchId).length);}
  await visit('/champions-league.html');
  assert.deepEqual(errors,[]);report.push({width,pages:pages.length,statuses,errors,overflow:false});await context.close();
 }}finally{await browser.close();await new Promise(r=>server.close(r));}
 fs.writeFileSync(path.join(root,'output/md07-closure-20261020/browser.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
