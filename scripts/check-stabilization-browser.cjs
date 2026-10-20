'use strict';
const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert/strict');
const {chromium}=require('C:/Users/utente/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'output/stabilization-20261020/browser');fs.mkdirSync(out,{recursive:true});
const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.css':'text/css','.svg':'image/svg+xml','.png':'image/png'};
const server=http.createServer((req,res)=>{const p=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!p.startsWith(root+path.sep)){res.writeHead(403).end();return;}fs.readFile(p,(e,b)=>{res.writeHead(e?404:200,{'Content-Type':mime[path.extname(p)]||'application/octet-stream'});res.end(e?'Missing':b)})});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;const results=[];
try{browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage();let errors=[];page.on('pageerror',e=>errors.push(e.message));
const fixtures=JSON.parse(fs.readFileSync(path.join(root,'data/sources/official-lineups-2026-27.json'))).fixtures.filter(f=>f.matchday===7);
const urls=process.argv.includes('--interactions-only')?['statistiche-squadra/parma.html','statistiche-giocatori.html']:['index.html','lettura.html','statistiche-squadre.html','statistiche-squadra/parma.html','squadra.html?team=parma','statistiche-giocatori.html','schedina.html?matchday=6','schedina.html?matchday=7','champions-league.html?matchday=1','champions-league.html?matchday=2','champions-league.html?matchday=3',...fixtures.map(f=>'lettura.html?match='+f.matchId)];
for(const width of [1440,390]){await page.setViewportSize({width,height:1000});for(const url of urls){errors=[];await page.goto(`http://127.0.0.1:${server.address().port}/${url}`,{waitUntil:'networkidle'});await page.waitForFunction(()=>document.querySelector('h1,h2')?.textContent.trim().length>0);await page.waitForTimeout(200);
const check=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth+1,title:document.querySelector('h1')?.textContent,keepers:[...document.querySelectorAll('.rd-field-player.is-goalkeeper strong')].map(n=>n.textContent),lists:[...document.querySelectorAll('.rd-formations ol')].map(n=>n.children.length),localBroken:[...document.querySelectorAll('a[href]')].map(n=>n.getAttribute('href')).filter(h=>h&&h!=='#'&&!h.startsWith('#')&&!/^[a-z]+:/i.test(h))}));
assert.equal(errors.length,0,`${width}/${url}: ${errors.join(';')}`);assert(!check.overflow,`${width}/${url}: overflow`);
if(/lettura.html\?match=(parma-torino|roma-genoa)/.test(url)){assert.deepEqual(check.keepers,[]);assert.deepEqual(check.lists,[11,11]);}
if(url==='statistiche-squadre.html')assert((await page.locator('.team-flip-back').first().textContent()).includes('2025/26'));
if(url==='statistiche-squadra/parma.html')assert(!(await page.locator('body').innerText()).includes('Numeri: Lega Serie A'));
if(process.argv.includes('--interactions-only')){
 if(url==='statistiche-squadra/parma.html'){
  await page.locator('.squad-table .player-open').first().click();await page.locator('#player-detail-content h2').waitFor({state:'visible'});
  const visible=await page.locator('#player-detail-content').innerText();assert(!visible.includes('Qualità e fonti')&&!visible.includes('Fonte statistica'));
  await page.locator('.player-detail-close').click();await page.locator('#team-comparator-disclosure summary').click();
  const input=page.locator('[data-team-comparator="0"]');await input.fill('a');await input.press('ArrowDown');await input.press('Enter');
  assert.equal(await page.locator('[data-team-comparator-result] article').count(),2);
 }else{
  const input=page.locator('[data-comparator-player="0"]');await input.fill('a');await input.press('ArrowDown');await input.press('Enter');
  await page.locator('[data-comparator-mode]').selectOption('per90');assert.equal(await page.locator('.player-comparator-head article').count(),2);
  assert(await page.locator('.comparison-row').count()>0);await page.locator('[data-player-stat="shots"]').click();
  assert(await page.locator('#global-player-leaderboard tbody tr').count()>0);
 }
 assert.deepEqual(errors,[]);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
}
for(const href of check.localBroken){const dest=new URL(href,`http://localhost/${url}`).pathname;assert(fs.existsSync(path.join(root,decodeURIComponent(dest))),`${url}: collegamento rotto ${href}`);}
results.push({width,url,...check,errors});
if(/parma-torino|roma-genoa/.test(url)||['statistiche-squadre.html','statistiche-squadra/parma.html'].includes(url))await page.screenshot({path:path.join(out,`${width}-${url.replace(/[^a-z0-9]/gi,'-')}.png`),fullPage:true});
}}
fs.writeFileSync(path.join(out,process.argv.includes('--interactions-only')?'interactions.json':'results.json'),JSON.stringify(results,null,2));console.log(`OK browser: ${results.length} pagine/viewport, JS, overflow, link, 20 XI MD7, rose, squadre e competizioni`);
}catch(e){console.log('Last successful:',results.at(-1)?.url);fs.writeFileSync(path.join(out,'failure.json'),JSON.stringify({error:e.message,results},null,2));throw e;}finally{await browser?.close();server.close();}})().catch(e=>{console.error(e);process.exitCode=1});
