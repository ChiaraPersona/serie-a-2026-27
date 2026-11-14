const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const {chromium}=require('C:/Users/utente/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'data/analysis/champions/schedine-unification-2026-10-19');
const read=n=>JSON.parse(fs.readFileSync(path.join(root,'data/normalized',n),'utf8'));
const raw=read('champions-md03-preliminary-2026-27.json'),calendar=read('champions-league-2026-27.json');
const fmt=n=>Number.isFinite(n)?n.toLocaleString('it-IT',{minimumFractionDigits:2,maximumFractionDigits:2}):'—';

(async()=>{
 const server=http.createServer((req,res)=>{
  const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return}
  fs.readFile(file,(error,data)=>{if(error){res.writeHead(404).end();return}res.setHeader('Content-Type',({'.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.css':'text/css','.html':'text/html','.png':'image/png','.svg':'image/svg+xml'})[path.extname(file)]||'application/octet-stream');res.end(data)});
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const origin=`http://127.0.0.1:${server.address().port}`;
 const browser=await chromium.launch({headless:true,channel:'msedge'});
 const results=[],errors=[],failures=[],knownBaselineIssues=[];
 const attach=page=>{
  page.on('pageerror',e=>errors.push({url:page.url(),error:e.message}));
  page.on('response',r=>{if(r.url().startsWith(origin)&&r.status()>=400)failures.push({url:r.url(),status:r.status()})});
  page.on('requestfailed',r=>{if(r.url().startsWith(origin))failures.push({url:r.url(),error:r.failure()?.errorText})});
 };
 const goto=async(page,route,selector)=>{await page.goto(`${origin}/${route}`);await page.waitForSelector(selector);await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))))};
 const noOverflow=async(page,label)=>assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,label);
 try{
  // Exact Serie A render regression against the browser capture taken before editing.
  const baseline=JSON.parse(fs.readFileSync(path.join(out,'browser-before.json'),'utf8'));
  const desktop=await browser.newContext({viewport:{width:1440,height:1000}}),page=await desktop.newPage();attach(page);
  for(const route of ['schedina.html?giornata=7','schedina.html?giornata=6']){
   await goto(page,route,'[data-match-panel]');
   assert.equal(await page.locator('#app').innerHTML(),baseline[route].html,`${route}: Serie A changed`);
   await noOverflow(page,route);results.push({route,width:1440,serieARenderUnchanged:true});
  }
  await goto(page,'schedina.html','.betting-archive-card');
  const beforeCards=[...baseline['schedina.html'].html.matchAll(/<a class="betting-archive-card team-directory-card[\s\S]*?<\/a>/g)].map(m=>m[0]);
  const serieACards=await page.locator('.betting-archive-card:not(.betting-archive-card--champions)').evaluateAll(es=>es.map(e=>e.outerHTML));
  assert.deepEqual(serieACards,beforeCards);
  const cards=page.locator('[data-champions-matchday]'),sizes=await cards.evaluateAll(es=>es.map(e=>({width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height})));
  assert(sizes.every(s=>s.width===sizes[0].width&&s.height===sizes[0].height));
  assert((await cards.nth(0).innerText()).includes('52,00 €'));
  assert((await cards.nth(1).innerText()).includes('108,00 €'));
  assert((await cards.nth(2).innerText()).includes('Da giocare'));
  await cards.nth(2).hover();await page.waitForTimeout(800);
  assert.notEqual(await cards.nth(2).locator('.team-flip-inner').evaluate(e=>getComputedStyle(e).transform),'none');
  await page.screenshot({path:path.join(out,'archive-desktop.png')});
  await cards.nth(2).click();await page.waitForSelector('[data-champions-workspace="3"]');
  const first=raw.fixtures[0],resultMarket=first.oddsEvent.playerMarkets.find(m=>m.family==='result');
  const firstId=resultMarket.selections.find(s=>s.name==='1').selectionId,contradictId=resultMarket.selections.find(s=>s.name==='X').selectionId;
  const goals=first.oddsEvent.playerMarkets.find(m=>m.family==='goals'&&Number(m.threshold)===1.5),goalId=goals.selections.find(s=>s.name==='OVER').selectionId;
  const pick=id=>page.locator(`[data-selection-row][data-personal-pick="${id}"]`);
  await page.locator('[data-match-panel]').first().evaluate(e=>e.open=true);
  await pick(firstId).click();await pick(goalId).click();
  assert.equal(await page.locator('.personal-betslip-item').count(),2);
  assert.equal(await page.locator('.personal-betslip-total>strong').innerText(),fmt(1.65*1.16));
  assert.equal(await page.locator('[data-issue-type="BOOKMAKER_COMBINABILITY_UNKNOWN"]').count(),1);
  await pick(contradictId).click();assert.equal(await page.locator('.personal-betslip-item').count(),3);
  assert.equal(await page.locator('[data-issue-type="MARKET_CONTRADICTION"]').count(),1);
  await page.locator(`[data-personal-remove="${contradictId}"]`).click();
  await page.reload();await page.waitForSelector('.personal-betslip-item');assert.equal(await page.locator('.personal-betslip-item').count(),2);
  await goto(page,`champions-league.html?match=${first.fixtureId}`,'[data-champions-workspace]');
  assert.equal(await page.locator('.personal-betslip-item').count(),2);
  assert.equal(await pick(firstId).getAttribute('aria-pressed'),'true');
  await goto(page,'champions-league.html?match=ucl-2026-27-md03-02','[data-champions-workspace]');
  assert.equal(await page.locator('.personal-betslip-item').count(),2);
  assert.equal(await page.locator('[data-issue-type="MISSING_FROM_CURRENT_DATA"]').count(),0);
  await goto(page,'schedina.html?giornata=7','[data-match-panel]');assert.equal(await page.locator('.personal-betslip-item').count(),0);
  await goto(page,'schedina.html?competizione=champions&giornata=3','[data-champions-workspace]');assert.equal(await page.locator('.personal-betslip-item').count(),2);
  await page.locator(`[data-personal-remove="${goalId}"]`).click();
  assert.equal(await page.locator('.personal-betslip-item').count(),1);
  await page.screenshot({path:path.join(out,'personal-desktop.png')});
  results.push({functional:'multiple selections, contradiction, commercial-combinability warning, theoretical quote, removal, reload, reading cross-fixture reconciliation, competition isolation',passed:true});
  await desktop.close();

  // Every reading in MD1/2/3 on desktop and touch mobile, plus narrow mobile round pages.
  for(const width of [1440,390,320]){
   const context=await browser.newContext({viewport:{width,height:1000},isMobile:width<1000,hasTouch:width<1000}),p=await context.newPage();attach(p);
   let workspaceStyle=null;
   for(const day of [1,2,3]){
    const route=`schedina.html?competizione=champions&giornata=${day}`;
    await goto(p,route,'[data-champions-workspace]');
    assert.equal(await p.locator('[data-match-panel]').count(),18);
    assert.equal(await p.locator('[data-personal-root]').count(),1);
    assert.equal(await p.locator('[data-selection-row][data-selected-forecast="true"]').count(),[52,117,167][day-1]);
    assert.equal(await p.locator('[data-selection-row][data-selected-forecast="false"]').count(),day===3?490:0);
    if(day<3)assert.equal(await p.locator('[data-selection-row][data-personal-pick]').count(),0);
    if(day===3){
     workspaceStyle={label:await p.locator('.betting-market-copy strong').first().evaluate(e=>getComputedStyle(e).color),background:await p.locator('[data-match-panel]').first().evaluate(e=>getComputedStyle(e).backgroundColor)};
     assert.equal(await p.locator('.betting-market-contract').filter({hasText:'Singola preliminare approvata'}).count(),7);
     await p.locator('[data-match-panel]').first().evaluate(e=>e.open=true);
     await p.locator('[data-match-panel]').first().scrollIntoViewIfNeeded();
     await p.screenshot({path:path.join(out,`schedina-${width}.png`)});
     if(width<1000){
      await p.locator(`[data-selection-row][data-personal-pick="${firstId}"]`).tap();
      await p.locator('[data-personal-open]').tap();await p.waitForTimeout(220);
      assert.equal(await p.locator('#personal-betslip-panel').getAttribute('aria-modal'),'true');
      assert.equal(await p.locator('.personal-betslip-item').count(),1);
      await p.screenshot({path:path.join(out,`personal-mobile-${width}.png`)});
      await p.locator('[data-personal-close]').tap();await p.waitForTimeout(220);
      assert.equal(await p.locator('#personal-betslip-panel').isVisible(),false);
     }
    }else{
     await p.locator('[data-match-panel]').first().evaluate(e=>e.open=true);
     await p.locator('[data-match-panel]').first().scrollIntoViewIfNeeded();
     if(width!==320)await p.screenshot({path:path.join(out,`archive-md${day}-${width}.png`)});
    }
    await noOverflow(p,route+'/'+width);results.push({route,width,markets:true,overflow:false});
   }
   if(width!==320)for(const fixture of calendar.fixtures.filter(f=>f.matchday<=3)){
    const route=`champions-league.html?match=${fixture.id}`;
    await goto(p,route,'[data-champions-workspace]');
    assert.equal(await p.locator('[data-match-panel]').count(),1);
    if(fixture.matchday===3){
     const f=raw.fixtures.find(f=>f.fixtureId===fixture.id).forecast;
     const totals={goals:f.expectedGoals.total,shotsTotal:f.matchProjection?.shotsTotal?.central,shotsOnTarget:f.matchProjection?.shotsOnTarget?.central,corners:f.matchProjection?.corners?.central,cards:f.cards.central};
     for(const [key,value] of Object.entries(totals))assert.equal(await p.locator(`[data-md3-total="${key}"] strong`).innerText(),fmt(value));
     assert((await p.locator('.rf-panel').innerText()).includes(fixture.refereeAssignment.referee.name));
    }
    await p.locator('[data-match-panel]').evaluate(e=>e.open=true);
    await noOverflow(p,route+'/'+width);
    const label=p.locator('[data-champions-workspace] .betting-market-copy strong').first();
    if(await label.count())assert.equal(await label.evaluate(e=>getComputedStyle(e).color),workspaceStyle.label);
    assert.equal(await p.locator('[data-match-panel]').evaluate(e=>getComputedStyle(e).backgroundColor),workspaceStyle.background);
    if(fixture.id===first.fixtureId){await p.locator('[data-match-panel]').scrollIntoViewIfNeeded();await p.screenshot({path:path.join(out,`reading-${width}.png`)});}
    results.push({route,width,sharedCatalog:true,frozenValues:fixture.matchday===3,overflow:false});
   }
   await goto(p,'schedina.html?giornata=7','[data-match-panel]');
   await p.locator('[data-match-panel]').first().evaluate(e=>e.open=true);await noOverflow(p,'Serie A/'+width);
   await p.screenshot({path:path.join(out,`serie-a-${width}.png`)});
   if(width<1000){
    await goto(p,'schedina.html','[data-champions-matchday="3"]');
    const cl1Height=await p.locator('[data-champions-matchday="1"]').evaluate(e=>e.getBoundingClientRect().height);
    if(cl1Height===0){
     await p.locator('#app').evaluate((e,html)=>e.innerHTML=html,baseline['schedina.html'].html);
     const baselineHeight=await p.locator('[data-champions-matchday="1"]').evaluate(e=>e.getBoundingClientRect().height);
     assert.equal(baselineHeight,0,'Unexpected CL1 mobile regression');
     knownBaselineIssues.push({width,issue:'CL1 touch anchor collapses under existing shared mobile fallback',currentHeight:cl1Height,beforeMarkupHeight:baselineHeight,action:'Unchanged: CL1 protected by user scope'});
     await goto(p,'schedina.html','[data-champions-matchday="3"]');
    }
    const card=p.locator('[data-champions-matchday="3"]');await card.tap();
    assert.equal(await card.getAttribute('data-touch-revealed'),'');
    await p.screenshot({path:path.join(out,`archive-touch-${width}.png`)});
    await card.tap();await p.waitForSelector('[data-champions-workspace="3"]');
   }
   fs.writeFileSync(path.join(out,'browser-progress.json'),JSON.stringify({results,errors,localRequestFailures:failures,knownBaselineIssues},null,2));
   await context.close();console.log(`OK browser width ${width}`);
  }
  assert.deepEqual(errors,[]);assert.deepEqual(failures,[]);
  fs.writeFileSync(path.join(out,'browser-results.json'),JSON.stringify({results,errors,localRequestFailures:failures,knownBaselineIssues},null,2));
  console.log(`OK ${results.length} browser cases; unchanged Serie A DOM/cards; desktop/mobile/touch; all 54 readings; no JS errors or failed local requests.`);
 }finally{await browser.close();await new Promise(r=>server.close(r))}
})().catch(e=>{console.error(e);process.exitCode=1});

