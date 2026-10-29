'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {chromium}=require('C:/Users/utente/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'output/reading-spatial-2026-10-29');fs.mkdirSync(out,{recursive:true});
const protectedFiles=['data/normalized/predictions.json','data/normalized/schedina-md09.json','data/normalized/reading-md09-market-catalog.json','data/sources/match-results-2026-27.json','data/normalized/official-starter-registry.json'];
const hashes=()=>protectedFiles.map(f=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,f))).digest('hex'));
const before=hashes(),mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp'};
const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!file.startsWith(root+path.sep))return res.writeHead(403).end();fs.readFile(file,(e,b)=>{res.writeHead(e?404:200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'});res.end(e?'Missing':b)})});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`,results=[];
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  for(const id of ['frosinone-lecce-2026-27-md-09','bologna-inter-2026-27-md-07','milan-venezia-2026-27-md-02','inter-monza-2026-27-md-01']){
   for(const width of [1440,390,320]){
    const page=await browser.newPage({viewport:{width,height:1000}}),errors=[],requests=[];
    page.on('pageerror',e=>errors.push(e.message));
    page.on('request',r=>{if(r.url().includes('serie-a-shot-events')||r.url().includes('reading-spatial-matchup.json'))requests.push(r.url())});
    await page.route('https://fonts.googleapis.com/**',r=>r.abort());await page.route('https://fonts.gstatic.com/**',r=>r.abort());
    await page.goto(`${base}/lettura.html?match=${id}`);await page.waitForSelector('[data-reading-ready="true"]');
    const section=page.locator('[data-spatial-fixture]');assert.equal(await section.count(),1);
    assert.equal(await page.locator('#lettura-scenario .rd-spatial-synthesis').count(),1);
    assert.equal(await page.locator('#lettura-tattica .rd-spatial').count(),1);
    assert.equal(await section.locator('tbody tr').count(),6);
    assert.equal(await section.locator('.rd-spatial-context-grid article').count(),2);
    if(id.startsWith('bologna'))assert((await section.innerText()).includes('Assetto in transizione, campione limitato'));
    const narrative=await section.locator('.rd-spatial-comment').innerText();
    await section.locator('[data-spatial-direction="1"]').click();assert.equal(await section.locator('[data-spatial-direction="1"]').getAttribute('aria-pressed'),'true');
    assert.notEqual(await section.locator('.rd-spatial-comment').innerText(),narrative);
    await section.locator('[data-spatial-mode]').selectOption('goals');
    assert.equal(await section.locator('.rd-spatial-dot:not(.rd-spatial-dot--goal)').count(),0);
    await section.locator('[data-spatial-mode]').selectOption('shots');
    const text=await section.innerText();assert(!/StatMuse|FotMob|Sofascore|Provenienza|Fonti/.test(text));
    if(id.endsWith('md-01')){assert(text.includes('campione limitato'));assert.equal(await section.locator('.rd-spatial-dot').count(),0);}
    assert(!await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),id+' overflow '+width);
    assert.equal(await section.locator('th,td').evaluateAll(cells=>cells.filter(c=>c.scrollWidth>c.clientWidth+1).length),0,'overlapping table cells '+width);
    assert.deepEqual(errors,[]);assert.deepEqual(requests,[],'full archive or redundant request');
    if(id.startsWith('frosinone')||id.startsWith('bologna'))await section.screenshot({path:path.join(out,`${id.startsWith('bologna')?'transition':'tactics'}-${width}.png`),style:'.site-header,.rd-nav{visibility:hidden!important}'});
    results.push({fixtureId:id,width,points:await section.locator('.rd-spatial-dot').count(),errors});await page.close();
   }
  }
  const champion=await browser.newPage();await champion.goto(`${base}/champions-league.html?match=ucl-2026-27-md02-05`);await champion.waitForSelector('.rd-shell');assert.equal(await champion.locator('[data-spatial-fixture]').count(),0);await champion.close();
  assert.deepEqual(hashes(),before);fs.writeFileSync(path.join(out,'browser-check.json'),JSON.stringify({results,protectedFilesUnchanged:true,championsUnchanged:true},null,2)+'\n');console.log(`OK ${results.length} Serie A desktop/mobile states; Champions regression; protected archives unchanged.`);
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
