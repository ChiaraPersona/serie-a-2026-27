const {chromium}=require('C:/Users/utente/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..'),base=path.join(root,'data/analysis/champions/md3-cl3-activation-2026-10-19');
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const catalog=read('data/normalized/champions-md03-preliminary-2026-27.json'),calendar=read('data/normalized/champions-league-2026-27.json');
const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.css':'text/css'};
const server=http.createServer((req,res)=>{const p=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!p.startsWith(root+path.sep)){res.writeHead(403).end();return;}fs.readFile(p,(e,b)=>{res.writeHead(e?404:200,{'Content-Type':mime[path.extname(p)]||'application/octet-stream'});res.end(e?'Missing':b);});});
const fmt=v=>typeof v==='number'&&Number.isFinite(v)?v.toLocaleString('it-IT',{minimumFractionDigits:2,maximumFractionDigits:2}):'—';
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
  browser=await chromium.launch({headless:true,channel:'msedge'});const page=await browser.newPage();let errors=[];const results=[];page.on('pageerror',e=>errors.push(e.message));
  for(const width of (process.argv.includes('--touch-only')?[]:process.argv.includes('--320-only')?[320]:[1440,390,320])){await page.setViewportSize({width,height:1000});
   await page.goto(`http://127.0.0.1:${server.address().port}/schedina.html`,{waitUntil:'networkidle'});
   await page.waitForSelector('[data-champions-matchday="3"]');
   const cl3=page.locator('[data-champions-matchday="3"]');
   const sizes=await page.locator('[data-champions-matchday]').evaluateAll(nodes=>nodes.map(n=>({width:n.getBoundingClientRect().width,height:n.getBoundingClientRect().height})));
   assert.equal(sizes.length,3);assert(sizes.every(s=>Math.abs(s.width-sizes[0].width)<1&&Math.abs(s.height-sizes[0].height)<1));
   assert((await cl3.innerText()).includes('Da giocare'));assert((await cl3.innerText()).includes('N/D'));
   assert.equal(await cl3.getAttribute('href'),'schedina.html?competizione=champions&giornata=3');
   await cl3.scrollIntoViewIfNeeded();
   await cl3.hover();await page.waitForTimeout(700);
   assert.notEqual(await cl3.locator('.team-flip-inner').evaluate(n=>getComputedStyle(n).transform),'none');
   await page.screenshot({path:path.join(base,`cl3-archive-${width}.png`)});
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   await page.goto(`http://127.0.0.1:${server.address().port}/schedina.html?competizione=champions&giornata=3`,{waitUntil:'networkidle'});
   await page.waitForSelector('[data-cl3-approved]');assert.equal(await page.locator('[data-approved-selection]').count(),7);
   assert.equal(await page.locator('[data-approved-selection][data-settlement="pending"]').count(),7);
   const registered=read('data/normalized/schedina-champions-md03.json').slips.flatMap(s=>s.legs);
   for(const leg of registered){const row=page.locator(`[data-approved-selection="${leg.selectionId}"]`);assert.equal(await row.locator('b').innerText(),fmt(leg.odds));}
   results.push({width,archive:'CL3 aligned, flip, pending',approved:7});
   for(const fixture of catalog.fixtures){
    errors=[];await page.goto(`http://127.0.0.1:${server.address().port}/${fixture.readingUrl}`,{waitUntil:'networkidle'});await page.waitForSelector('[data-md3-total]');
    const f=fixture.forecast;
    for(const key of ['home','draw','away'])assert.equal(await page.locator(`[data-md3-probability="${key}"] strong`).innerText(),fmt(f.probabilities[key])+'%');
    assert.equal(await page.locator('[data-md3-primary-score] strong').innerText(),f.scoreForecast.primary.score);
    const totals={goals:f.expectedGoals.total,shotsTotal:f.matchProjection?.shotsTotal?.central,shotsOnTarget:f.matchProjection?.shotsOnTarget?.central,corners:f.matchProjection?.corners?.central,cards:f.cards.central};
    for(const [key,v] of Object.entries(totals))assert.equal(await page.locator(`[data-md3-total="${key}"] strong`).innerText(),fmt(v));
    for(const key of ['expectedGoals','shotsTotal','shotsOnTarget','corners','cards']){
     const expected=f.teamProjections.map(p=>fmt(key==='expectedGoals'?p.expectedGoals:p[key]?.central));
     assert.deepEqual(await page.locator(`[data-md3-team-metric="${key}"] b`).allInnerTexts(),expected);
    }
    const c=calendar.fixtures.find(c=>c.id===fixture.fixtureId);assert((await page.locator('.rf-panel').innerText()).includes(c.refereeAssignment.referee.name));
    assert.equal(await page.locator('.champions-market-card').count(),fixture.oddsEvent.playerMarkets.length);
    const text=await page.locator('.rd-shell').innerText();assert(!/\bxG\b|statz|scoreline|provenienza|fonte statistiche/i.test(text));
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
    if(overflow){const details=await page.evaluate(()=>[...document.querySelectorAll('#app *')].filter(e=>{const r=e.getBoundingClientRect();return r.width&&r.right>innerWidth+1}).map(e=>({tag:e.tagName,cls:e.className,width:e.getBoundingClientRect().width,right:e.getBoundingClientRect().right,text:e.textContent.slice(0,100)})));fs.writeFileSync(path.join(base,'overflow-diagnostic.json'),JSON.stringify(details,null,2));await page.screenshot({path:path.join(base,'overflow.png'),fullPage:true});}
    assert(!overflow,`${fixture.fixtureId}/${width}`);assert.deepEqual(errors,[]);
    results.push({fixtureId:fixture.fixtureId,width,exactValues:true,refereeCorrect:true,catalogMarkets:fixture.oddsEvent.playerMarkets.length,overflow,errors:[...errors]});
    if(width!==320&&fixture.fixtureId.endsWith('-01')){
     await page.screenshot({path:path.join(base,`reading-${width}.png`),fullPage:true});
     await page.locator('.rf-panel').scrollIntoViewIfNeeded();
     await page.screenshot({path:path.join(base,`reading-referee-viewport-${width}.png`)});
    }
   }
   errors=[];await page.goto(`http://127.0.0.1:${server.address().port}/schedina.html?competizione=champions&giornata=3`,{waitUntil:'networkidle'});await page.waitForSelector('[data-md3-draft-fixture]');
   assert.equal(await page.locator('[data-md3-draft-fixture]').count(),18);assert.equal(await page.locator('.champions-market-card').count(),catalog.summary.markets);
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
  const touch=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const mobile=await touch.newPage();
  await mobile.goto(`http://127.0.0.1:${server.address().port}/schedina.html`,{waitUntil:'networkidle'});
  const card=mobile.locator('[data-champions-matchday="3"]');await card.scrollIntoViewIfNeeded();await mobile.waitForTimeout(700);console.log(await card.evaluate(n=>({rect:n.getBoundingClientRect().toJSON(),display:getComputedStyle(n).display,visibility:getComputedStyle(n).visibility})));await card.locator('.team-flip-front').tap();await mobile.waitForTimeout(700);
  assert(!mobile.url().includes('competizione='));assert(await card.getAttribute('data-touch-revealed')!==null);
  assert((await card.locator('.team-flip-inner').evaluate(n=>getComputedStyle(n).transform)).includes('-1'));
  await mobile.screenshot({path:path.join(base,'cl3-touch-back.png')});
  await card.locator('.team-flip-back').tap();await mobile.waitForURL('**/*competizione=champions&giornata=3');await mobile.waitForSelector('[data-cl3-approved]');await touch.close();
  fs.writeFileSync(path.join(base,'browser-results.json'),JSON.stringify({pages:results,persistence:selections,sharedCatalog:true},null,2)+'\n');
  console.log('OK 57 pages, frozen values, 18 referees, shared catalog, two-fixture picks, combined odds and persistence.');
 }finally{if(browser)await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
