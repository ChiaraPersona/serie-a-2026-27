const {chromium}=require('C:/Users/utente/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..'),base=path.join(root,'data/analysis/champions/md3-callups-cl3-2026-10-19');
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const catalog=read('data/normalized/champions-md03-preliminary-2026-27.json'),calendar=read('data/normalized/champions-league-2026-27.json');
const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.css':'text/css'};
const server=http.createServer((req,res)=>{const p=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!p.startsWith(root+path.sep)){res.writeHead(403).end();return;}fs.readFile(p,(e,b)=>{res.writeHead(e?404:200,{'Content-Type':mime[path.extname(p)]||'application/octet-stream'});res.end(e?'Missing':b);});});
const fmt=v=>typeof v==='number'&&Number.isFinite(v)?v.toLocaleString('it-IT',{minimumFractionDigits:2,maximumFractionDigits:2}):'—';
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
  browser=await chromium.launch({headless:true,channel:'msedge'});const page=await browser.newPage();let errors=[];const results=[];const failedData=[];page.on('response',r=>{if(r.status()>=400&&r.url().includes('127.0.0.1')&&r.url().includes('/data/'))failedData.push({url:r.url(),status:r.status()});});page.on('pageerror',e=>errors.push(e.message));
  for(const width of (process.argv.includes('--320-only')?[320]:[1440,390,320])){await page.setViewportSize({width,height:1000});
   for(const fixture of catalog.fixtures){
    errors=[];await page.goto(`http://127.0.0.1:${server.address().port}/${fixture.readingUrl}`,{waitUntil:'networkidle'});await page.waitForSelector('[data-md3-total]');
    const f=fixture.forecast;
    const num=v=>Number.isFinite(v)?v.toLocaleString('it-IT',{maximumFractionDigits:2}):'—';
    const probable=read('data/normalized/champions-md03-probable-individuals-2026-27.json').fixtures.find(f=>f.fixtureId===fixture.fixtureId);
    await page.waitForSelector('[data-md3-probable]');assert.equal(await page.locator('[data-md3-probable-player][data-projected-role=starter]').count(),22);assert.equal(await page.locator('[data-md3-probable-player]').count(),probable.teams.reduce((n,t)=>n+t.players.length,0));
    assert((await page.locator('[data-md3-probable]').innerText()).includes('non ufficiali'));
    for(const team of probable.teams){const group=page.locator(`[data-md3-probable-team="${team.teamId}"]`);assert.equal(await group.locator('[data-md3-probable-player]').count(),team.players.length);
     for(let i=0;i<team.players.length;i++){const p=team.players[i],row=group.locator('[data-md3-probable-player]').nth(i);assert.equal(await row.locator('h3').innerText(),p.sourceName);assert.equal(await row.getAttribute('data-player-id'),p.playerId||'');assert.equal(await row.locator('[data-md3-individual-shots]').innerText(),num(p.projectedShots));assert.equal(await row.locator('[data-md3-individual-sot]').innerText(),num(p.projectedSOT));assert.equal(await row.getAttribute('data-projected-role'),p.projectedRole);if(p.projectedShots!==null){const overlap=await row.evaluate(n=>{const a=n.querySelector('[data-md3-individual-shots]'),b=n.querySelector('[data-md3-individual-sot]');const r=document.createRange();r.selectNodeContents(a);const end=r.getBoundingClientRect().right;r.selectNodeContents(b);return end>r.getBoundingClientRect().left-2;});assert(!overlap,`numeric overlap ${fixture.fixtureId}/${p.playerId}/${width}`);};}
    }
    const first=page.locator('[data-md3-probable-player]').first();await first.locator(':scope>summary').click();
    const minute=probable.teams[0].players[0].expectedMinutes;assert.equal(await first.locator('[data-md3-individual-minutes]').innerText(),Number.isFinite(minute)?minute.toLocaleString('it-IT',{maximumFractionDigits:2}):'—');
    for(const key of ['home','draw','away'])assert.equal(await page.locator(`[data-md3-probability="${key}"] strong`).innerText(),fmt(f.probabilities[key])+'%');
    assert.equal(await page.locator('[data-md3-primary-score] strong').innerText(),f.scoreForecast.primary.score);
    const totals={goals:f.expectedGoals.total,shotsTotal:f.matchProjection?.shotsTotal?.central,shotsOnTarget:f.matchProjection?.shotsOnTarget?.central,corners:f.matchProjection?.corners?.central,cards:f.cards.central};
    for(const [key,v] of Object.entries(totals))assert.equal(await page.locator(`[data-md3-total="${key}"] strong`).innerText(),fmt(v));
    for(const key of ['expectedGoals','shotsTotal','shotsOnTarget','corners','cards']){
     const expected=f.teamProjections.map(p=>fmt(key==='expectedGoals'?p.expectedGoals:p[key]?.central));
     assert.deepEqual(await page.locator(`[data-md3-team-metric="${key}"] b`).allInnerTexts(),expected);
    }
    if(width!==320&&fixture.fixtureId.endsWith('-07')){const bench=page.locator('[data-md3-probable-player][data-projected-role=bench]').filter({has:page.locator('[data-md3-individual-shots]')}).first();await bench.locator(':scope>summary').click();await bench.scrollIntoViewIfNeeded();await page.screenshot({path:path.join(base,`projected-bench-${width}.png`)});}
    const c=calendar.fixtures.find(c=>c.id===fixture.fixtureId);assert((await page.locator('.rf-panel').innerText()).includes(c.refereeAssignment.referee.name));
    assert.equal(await page.locator('.champions-market-card').count(),fixture.oddsEvent.playerMarkets.length);
    const text=await page.locator('.rd-shell').innerText();assert(!/\bxG\b|statz|scoreline|provenienza|fonte statistiche/i.test(text));
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
    if(overflow){const details=await page.evaluate(()=>[...document.querySelectorAll('#app *')].filter(e=>{const r=e.getBoundingClientRect();return r.width&&r.right>innerWidth+1}).map(e=>({tag:e.tagName,cls:e.className,width:e.getBoundingClientRect().width,right:e.getBoundingClientRect().right,text:e.textContent.slice(0,100)})));fs.writeFileSync(path.join(base,'overflow-diagnostic.json'),JSON.stringify(details,null,2));await page.screenshot({path:path.join(base,'overflow.png'),fullPage:true});}
    assert(!overflow,`${fixture.fixtureId}/${width}`);assert.deepEqual(errors,[]);
    results.push({fixtureId:fixture.fixtureId,width,exactValues:true,refereeCorrect:true,catalogMarkets:fixture.oddsEvent.playerMarkets.length,overflow,errors:[...errors]});
    if(width!==320&&fixture.fixtureId.endsWith('-01')){
     await page.screenshot({path:path.join(base,`reading-${width}.png`),fullPage:true});
     await page.locator('[data-md3-probable]').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(base,`reading-probable-viewport-${width}.png`)});
     await page.locator('.rf-panel').scrollIntoViewIfNeeded();
     await page.screenshot({path:path.join(base,`reading-referee-viewport-${width}.png`)});
    }
   }
   errors=[];await page.goto(`http://127.0.0.1:${server.address().port}/schedina.html?competizione=champions&giornata=3`,{waitUntil:'networkidle'});await page.waitForSelector('[data-md3-draft-fixture]');
   assert.equal(await page.locator('[data-md3-draft-fixture]').count(),18);assert.equal(await page.locator('[data-approved-selection]').count(),7);assert.equal(await page.locator('.champions-market-card').count(),catalog.summary.markets);
   assert.equal(await page.locator('button[data-add-selection]').count(),catalog.summary.selections);
   assert(!(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)));assert.deepEqual(errors,[]);
   if(width!==320)await page.screenshot({path:path.join(base,`draft-${width}.png`),fullPage:true});
   results.push({page:'MD3 draft',width,markets:426,selections:657,overflow:false,errors:[]});
  }
  // One isolated test profile: persist a reading pick, then add a different fixture in the draft.
  await page.goto(`http://127.0.0.1:${server.address().port}/${catalog.fixtures[0].readingUrl}`,{waitUntil:'networkidle'});
  await page.locator('.champions-market-card').first().locator('summary').click();await page.locator('[data-add-selection]').first().click();
  await page.goto(`http://127.0.0.1:${server.address().port}/schedina.html?competizione=champions&giornata=3`,{waitUntil:'networkidle'});
  const second=page.locator('[data-md3-draft-fixture]').nth(1);await second.locator(':scope>summary').click();await second.locator('.champions-market-card').first().locator('summary').click();await second.locator('[data-add-selection]').first().click();
  assert.equal(await second.locator('[data-market-slip] li').count(),2);
  const selections=await page.evaluate(async()=>{const {createPersonalBetslipStore}=await import('/js/pages/personal-betslip-store.mjs');const s=createPersonalBetslipStore();s.setContext({competition:'champions',season:'2026-27',matchday:3});const x=s.getSnapshot();return {n:x.selections.length,quote:x.assessment.theoreticalCombinedOdds,expected:x.selections.reduce((v,s)=>v*s.betSelection.quote.decimal,1)};});
  assert.equal(selections.n,2);assert(Math.abs(selections.quote-selections.expected)<1e-8);
  await page.reload({waitUntil:'networkidle'});assert.equal(await page.locator('[data-market-slip]').first().locator('li').count(),2);
  assert.deepEqual(failedData,[]);
  fs.writeFileSync(path.join(base,'browser-results.json'),JSON.stringify({pages:results,persistence:selections,sharedCatalog:true},null,2)+'\n');
  console.log('OK 57 pages, frozen values, 18 referees, shared catalog, two-fixture picks, combined odds and persistence.');
 }finally{if(browser)await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
