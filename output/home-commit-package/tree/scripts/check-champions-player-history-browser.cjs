'use strict';
const {chromium}=require('C:/Users/utente/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),output=path.join(root,'output/champions-player-history-2026-11-11');
const data=JSON.parse(fs.readFileSync(path.join(root,'data/normalized/champions-player-history-context-2025-26.json'),'utf8'));
const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.css':'text/css','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{
 const f=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
 if(!f.startsWith(root+path.sep))return res.writeHead(403).end();
 // The full canonical archive is intentionally absent from the Pages package.
 if(f.endsWith('champions-player-stats-2026-27.json'))return res.writeHead(404).end();
 fs.readFile(f,(error,body)=>{res.writeHead(error?404:200,{'Content-Type':types[path.extname(f)]||'application/octet-stream'});res.end(error?'Missing':body)});
});
(async()=>{
 fs.mkdirSync(output,{recursive:true});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({headless:true,channel:'msedge'});const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  for(const width of [1280,390]){
   await page.setViewportSize({width,height:1000});
   for(const [teamId,playerId] of [['arsenal','william-saliba'],['manchester-city','rayan-ait-nouri'],['como','maxence-caqueret']]){
    const p=data.teams.find(t=>t.teamId===teamId).players.find(p=>p.playerId===playerId);
    await page.goto(`http://127.0.0.1:${server.address().port}/champions-league.html?team=${teamId}&playerSeason=2025-26`,{waitUntil:'networkidle'});
    await page.waitForSelector('#champions-player-history-scope');
    const row=()=>page.locator(`[data-champions-player="${playerId}"]`);
    assert.equal(await row().getAttribute('data-stat-minutes'),String(p.club?.totals?.minutes??''));
    for(const [scope,key] of [['official','nationalOfficial'],['friendly','nationalFriendly']]){
     await page.selectOption('#champions-player-history-scope',scope);await page.waitForURL(new RegExp(`historyScope=${scope}`));await page.waitForSelector('#champions-player-history-scope');
     assert.equal(await page.locator('#champions-player-history-scope').inputValue(),scope);
     for(const [metric,attr] of [['minutes','minutes'],['shots','shots'],['shotsOnTarget','shots-on-target']])assert.equal(await row().getAttribute('data-stat-'+attr),String(p[key].totals[metric]??''));
     assert((await page.locator('.champions-team-players thead').textContent()).includes('Gialli'));
     assert(!(await page.locator('.champions-team-players').innerText()).includes('ESPN'));
     assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`${teamId}/${scope}/${width}: overflow`);
     if(scope==='official'&&teamId==='arsenal')await page.screenshot({path:path.join(output,`arsenal-official-${width}.png`),fullPage:true});
    }
    await page.fill('#champions-player-search',p.name);assert.equal(await page.locator('.champions-player-stats-table tbody tr:not([hidden])').count(),1);
    await page.selectOption('#champions-player-season','2026-27');await page.waitForURL(/playerSeason=2026-27/);await page.waitForSelector('#champions-player-season');
    assert.equal(await page.locator('#champions-player-history-scope').count(),0);
    assert.equal(await row().getAttribute('data-stat-minutes'),String(p.currentSeason?.totals?.minutes??''));
    console.log(`OK ${teamId} ${width}px: club, ufficiali, amichevoli, ricerca e stagione corrente`);
   }
  }
  assert.deepEqual(errors,[]);console.log('OK: nessuna dipendenza browser dall’archivio canonico escluso dal pacchetto Pages.');
 }finally{await browser.close();server.close()}
})().catch(error=>{console.error(error);process.exitCode=1;server.close()});
