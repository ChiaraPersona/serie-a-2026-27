'use strict';
const {chromium}=require('C:/Users/utente/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..'),read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const data=read('data/normalized/champions-md03-probable-individuals-2026-27.json'),calendar=read('data/normalized/champions-league-2026-27.json');
const out=path.join(root,process.argv.includes('--final-verification')?'output/champions-md3-final-verification-20261020':'output/champions-md3-squads-20261020');fs.mkdirSync(out,{recursive:true});
const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.css':'text/css','.svg':'image/svg+xml','.png':'image/png'};
const server=http.createServer((req,res)=>{const p=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!p.startsWith(root+path.sep)){res.writeHead(403).end();return;}fs.readFile(p,(e,b)=>{res.writeHead(e?404:200,{'Content-Type':mime[path.extname(p)]||'application/octet-stream'});res.end(e?'Missing':b);});});
const num=v=>Number.isFinite(v)?v.toLocaleString('it-IT',{maximumFractionDigits:2}):'—';
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
  browser=await chromium.launch({headless:true,channel:'msedge'});const page=await browser.newPage();let errors=[];const results=[];
  page.on('pageerror',e=>errors.push(e.message));
  for(const width of [1440,390,320]){
   let visibleProjections=0,unavailableProjections=0;
   await page.setViewportSize({width,height:1000});
   for(const fixture of data.fixtures){
    errors=[];await page.goto(`http://127.0.0.1:${server.address().port}/champions-league.html?match=${fixture.fixtureId}`,{waitUntil:'networkidle'});
    await page.waitForSelector('[data-md3-probable]');
    assert.equal(await page.locator('[data-md3-probable-player][data-projected-role=starter]').count(),22);
    assert.equal(await page.locator('[data-md3-probable] .reading-kit-player').count(),22);
    assert.equal(await page.locator('[data-md3-probable] img').count(),0);
    for(const team of fixture.teams){
     const group=page.locator(`[data-md3-probable-team="${team.teamId}"]`);
     assert.equal(await group.locator('[data-md3-probable-player]').count(),team.players.length);
     for(let i=0;i<team.players.length;i++){
      const p=team.players[i],row=group.locator('[data-md3-probable-player]').nth(i);
      assert.equal(await row.getAttribute('data-player-id'),p.playerId||'');
      assert.equal(await row.locator('h3').innerText(),p.canonicalName||p.sourceName);
      assert.equal(await row.locator('[data-md3-individual-shots]').innerText(),num(p.projectedShots));
      assert.equal(await row.locator('[data-md3-individual-sot]').innerText(),num(p.projectedSOT));
      await row.evaluate(el=>{el.open=true;});
      assert(await row.locator('.rd-player-expanded').isVisible());
      assert.equal(await row.locator('[data-md3-individual-minutes]').innerText(),num(p.expectedMinutes));
      const pct=v=>Number.isFinite(v)?(v*100).toLocaleString('it-IT',{maximumFractionDigits:1})+'%':'—';
      assert.deepEqual(await row.locator('.rd-player-probabilities b').allInnerTexts(),['shotsOver05','shotsOver15','shotsOver25','sotOver05','sotOver15'].map(k=>pct(p.eventProbabilities?.[k])));
      if(p.projectedShots!==null){assert(await row.locator('[data-md3-individual-shots]').isVisible());assert(await row.locator('[data-md3-individual-sot]').isVisible());visibleProjections++;}
      else{assert.equal(await row.locator('[data-md3-individual-shots]').innerText(),'—');assert.equal(await row.locator('[data-md3-individual-sot]').innerText(),'—');unavailableProjections++;}
      await row.evaluate(el=>{el.open=false;});
     }
     const potential=group.locator('[data-md3-potential-bench]');await potential.locator(':scope>summary').click();
     assert.equal(await potential.locator('[data-md3-eligible-player]').count(),team.potentialBench.length);
     assert((await potential.innerText()).includes('da confermare'));
     await potential.locator(':scope>summary').click();
    }
    const row=page.locator('[data-md3-probable-player]').first();await row.locator(':scope>summary').click();
    assert.equal(await row.locator('[data-md3-individual-minutes]').innerText(),num(fixture.teams[0].players[0].expectedMinutes));
    assert((await row.innerText()).includes('3+ tiri'));assert((await row.innerText()).includes('2+ SOT'));
    assert(!(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)),`${fixture.fixtureId}/${width} overflow`);
    assert.deepEqual(errors,[]);results.push({fixtureId:fixture.fixtureId,width,status:'PASS'});
    if(fixture.fixtureId.endsWith('-02')&&width!==320){await page.locator('[data-md3-probable]').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(out,`lineups-${width}.png`)});await row.scrollIntoViewIfNeeded();await page.screenshot({path:path.join(out,`players-${width}.png`)});}
   }
   assert.equal(visibleProjections,248);assert.equal(unavailableProjections,184);
   results.push({width,visibleProjections,unavailableProjections,status:'PASS'});
  }
  for(const md of [1,2]){
   errors=[];const fixture=calendar.fixtures.find(f=>f.matchday===md);
   await page.goto(`http://127.0.0.1:${server.address().port}/champions-league.html?match=${fixture.id}`,{waitUntil:'networkidle'});
   await page.waitForSelector('.rd-shell');assert.equal(await page.locator('[data-md3-probable]').count(),0);assert.deepEqual(errors,[]);
   results.push({matchday:md,status:'PASS'});
  }
  errors=[];const matches=read('data/normalized/matches.json'),list=Array.isArray(matches)?matches:matches.matches;
  await page.goto(`http://127.0.0.1:${server.address().port}/lettura.html?match=${list[0].id}`,{waitUntil:'networkidle'});
  await page.waitForSelector('.rd-shell');assert.equal(await page.locator('[data-md3-probable]').count(),0);assert.deepEqual(errors,[]);results.push({competition:'serie-a',status:'PASS'});
  fs.writeFileSync(path.join(out,'browser-results.json'),JSON.stringify(results,null,2)+'\n');
  const visitedPages=results.filter(r=>!Object.hasOwn(r,'visibleProjections')).length;
  console.log(`PASS: ${visitedPages} pages; 18 MD3 fixtures at 1440/390/320; 248 visible and 184 unavailable projections checked at each width; 36 eligible squads, field, identities, minutes, potential bench, no overflow or JS errors; MD1/MD2/Serie A smoke checks.`);
 }finally{if(browser)await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
