const {serve,chromium}=require('./server.cjs'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const pilots=[['atalanta','lettura.html?match=atalanta-venezia-2026-27-md-06'],['inter','champions-league.html?match=ucl-2026-27-md02-05'],['milan','lettura.html?match=milan-atalanta-2026-27-md-07']];
(async()=>{const server=await serve(),browser=await chromium.launch({headless:true,channel:'msedge'}),results=[];let activePage;try{
 for(const [name,route] of pilots)for(const width of [1440,1024,768,390]){
  const context=await browser.newContext({viewport:{width,height:960},reducedMotion:'reduce'}),page=activePage=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
  await page.goto(server.origin+'/'+route,{waitUntil:'networkidle'});await page.waitForSelector('.rd-player-card');await page.evaluate(()=>document.fonts.ready);
  assert.equal(await page.locator('.rd-section').count(),9);assert.equal(await page.locator('#app h1').count(),1);
  const ids=await page.locator('[data-forecast-id]').evaluateAll(nodes=>nodes.map(n=>n.dataset.forecastId));assert.equal(new Set(ids).size,ids.length);
  const geometry=await page.evaluate(()=>({viewport:innerWidth,document:document.documentElement.scrollWidth,main:document.querySelector('#app').getBoundingClientRect().width}));assert(geometry.document<=width);assert(geometry.main<=1050);
  await page.screenshot({path:path.join(__dirname,`${name}-${width}.png`)});
  if(width===390)await page.screenshot({path:path.join(__dirname,`${name}-${width}-full.png`),fullPage:true});
  await page.locator('.rd-nav [href="#lettura-scenario"]').click();await page.waitForTimeout(80);
  await page.screenshot({path:path.join(__dirname,`${name}-${width}-scenario.png`)});
  const marketSelect=page.locator('.rd-filters [name=market]'),family=await marketSelect.locator('option').nth(1).getAttribute('value');
  await marketSelect.selectOption(family);const visible=page.locator('.rd-forecast-row:visible');assert(await visible.count()>0);assert((await visible.count())<=ids.length);
  const teamSelect=page.locator('.rd-filters [name=team]');if(await teamSelect.locator('option').count()>1)await teamSelect.selectOption(await teamSelect.locator('option').nth(1).getAttribute('value'));
  await page.locator('.rd-filters button[type=reset]').click();await page.waitForFunction(()=>[...document.querySelectorAll('.rd-forecast-row')].every(n=>!n.hidden));
  const firstRow=page.locator('.rd-forecast-row').first();await firstRow.locator('summary').click();assert(await firstRow.locator('details').getAttribute('open')!==null);await firstRow.locator('summary').click();
  await page.locator('.rd-nav [href="#lettura-formazioni"]').click();assert.equal(await page.locator('.rd-pitch').count(),1);assert.equal(await page.locator('.rd-field-player').count(),22);assert((await page.locator('.rd-lineup-head').innerText()).includes(name==='milan'?'Probabile':'Ufficiale'));
  const nav=await page.evaluate(()=>({mini:getComputedStyle(document.querySelector('.rd-mini')).display,navTop:document.querySelector('.rd-nav').getBoundingClientRect().top,headerBottom:document.querySelector('.site-header').getBoundingClientRect().bottom}));assert.notEqual(nav.mini,'none');assert(Math.abs(nav.navTop-nav.headerBottom)<2);
  await page.locator('.rd-nav [href="#lettura-giocatori"]').click();
  const playerName=await page.locator('[data-player-card] h3').first().innerText(),search=page.locator('[data-player-search-input]');await search.fill(playerName);assert(await page.locator('[data-player-card]:visible').count()>=1);
  await search.fill('ZZZ_NESSUN_GIOCATORE');assert.equal(await page.locator('[data-player-card]:visible').count(),0);await search.fill('');
  await page.locator('[data-player-mode=outsider]').click();assert(await page.locator('[data-player-card]:visible').evaluateAll(nodes=>nodes.every(n=>n.dataset.playerOutsider==='true')));await page.locator('[data-player-mode=sot]').click();await page.locator('[data-player-mode=shots]').click();
  await page.locator('[data-player-card]:visible').first().locator('details>summary').first().click();assert((await page.locator('[data-player-card]:visible').first().innerText()).includes('Ultime presenze'));await page.locator('[data-player-card]:visible').first().locator('details>summary').first().click();
  if(width===1440||width===390)await page.screenshot({path:path.join(__dirname,`${name}-${width}-players.png`)});
  await page.locator('#rd-disciplina-tab-squadre').focus();await page.keyboard.press('ArrowRight');assert.equal(await page.locator('#rd-disciplina-tab-arbitro').getAttribute('aria-selected'),'true');await page.keyboard.press('End');assert.equal(await page.locator('#rd-disciplina-tab-ammoniti').getAttribute('aria-selected'),'true');
  await page.locator('#rd-tactics-tab-duels').click();assert((await page.locator('#rd-tactics-panel-duels').innerText()).includes('Dati spaziali verificati non disponibili'));await page.locator('#rd-tactics-tab-home').click();
  await page.locator('#rd-history-tab-h2h').click();assert(await page.locator('#rd-history-panel-h2h').isVisible());await page.locator('#rd-history-tab-history').click();assert(await page.locator('#rd-history-panel-history').isVisible());
  await page.locator('.rd-slip-trigger').focus();await page.keyboard.press('Enter');assert(await page.locator('dialog').evaluate(d=>d.open));
  const dialogBox=await page.locator('dialog').boundingBox();assert(dialogBox.width<=Math.min(width,420)+1||width<768);assert(dialogBox.y>=0);await page.keyboard.press('Tab');assert(await page.evaluate(()=>document.querySelector('dialog').contains(document.activeElement)));await page.keyboard.press('Escape');assert(!await page.locator('dialog').evaluate(d=>d.open));assert(await page.locator('.rd-slip-trigger').evaluate(n=>n===document.activeElement));
  if(name==='milan'){
   await page.locator('.rd-filters [name=quote]').selectOption('no');const unquoted=page.locator('.rd-forecast-row:visible');assert(await unquoted.count()>0);
   const pick=unquoted.locator('[data-rd-pick]:not([disabled])').first(),id=await pick.getAttribute('data-rd-pick');await pick.click();assert.equal(await pick.getAttribute('aria-pressed'),'true');
   await page.locator('.rd-slip-trigger').click();assert.equal(await page.locator('dialog [data-remove]').count(),1);assert.deepEqual(await page.locator('.rd-slip-total dd').allTextContents(),['—','—']);
   const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('serie-a-2026-27:personal-betslip:v1')));assert.equal(stored.activeContext,'serie-a:2026-27:md07');assert.equal(stored.contexts[stored.activeContext].selections[0].selectionId,id);
   await page.locator('dialog [data-close]').click();
   await page.goto(server.origin+'/schedina.html?giornata=7',{waitUntil:'networkidle'});await page.waitForFunction(()=>!document.querySelector('#app>.loading'));
   assert(await page.evaluate(id=>Object.values(JSON.parse(localStorage.getItem('serie-a-2026-27:personal-betslip:v1')).contexts).some(c=>c.selections.some(s=>s.selectionId===id)),id));
   await page.goto(server.origin+'/'+route,{waitUntil:'networkidle'});await page.waitForSelector('.rd-slip-trigger');await page.locator('.rd-slip-trigger').click();assert.equal(await page.locator('dialog [data-remove]').count(),1);await page.locator('dialog [data-remove]').click();assert.equal(await page.locator('dialog [data-remove]').count(),0);await page.keyboard.press('Escape');
  }else{assert.equal(await page.locator('[data-rd-pick]:not([disabled])').count(),0);assert((await page.locator('#lettura-verifica').innerText()).includes('Riepilogo economico'));if(name==='atalanta')assert((await page.locator('#lettura-verifica').innerText()).includes('hash SHA-256'));}
  const afterOverflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);assert(!afterOverflow);assert.deepEqual(errors,[]);
  await page.goto(server.origin+'/'+route+'&layout=legacy',{waitUntil:'networkidle'});await page.waitForSelector('.reading-match-hero');assert.equal(await page.locator('.rd-shell').count(),0);
  const legacyIds=await page.locator('[data-shared-forecast-id],[data-published-selection-id]').evaluateAll(nodes=>nodes.map(n=>n.dataset.sharedForecastId||n.dataset.publishedSelectionId));assert.deepEqual([...ids].sort(),[...legacyIds].sort());
  results.push({name,width,marketCount:ids.length,geometry,nav,filters:true,players:true,lineupPlayers:22,keyboardTabs:true,drawer:true,sync:name==='milan',legacy:true,errors});console.log('PASS',name,width);await context.close();
 }
 for(const route of ['lettura.html','champions-league.html','champions-league.html?team=inter','coppa-italia.html','schedina.html?giornata=7','lettura.html?match=juventus-lazio-2026-27-md-07']){
  const page=activePage=await browser.newPage({viewport:{width:390,height:844}});await page.goto(server.origin+'/'+route,{waitUntil:'networkidle'});await page.waitForFunction(()=>!document.querySelector('#app>.loading'));const html=await page.locator('#app').innerHTML();assert.equal(await page.locator('.rd-shell').count(),0);await page.goto(server.origin+'/'+route+(route.includes('?')?'&':'?')+'layout=legacy',{waitUntil:'networkidle'});await page.waitForFunction(()=>!document.querySelector('#app>.loading'));assert.equal(html,await page.locator('#app').innerHTML());results.push({control:route,unchanged:true});await page.close();
 }
 for(const [name,route] of pilots){const page=activePage=await browser.newPage();await page.addInitScript(()=>{window.IntersectionObserver=class{constructor(){throw new Error('TEST_FALLBACK')}}});await page.goto(server.origin+'/'+route,{waitUntil:'networkidle'});await page.waitForSelector('.reading-match-hero');assert.equal(await page.locator('.rd-shell').count(),0);const html=await page.locator('#app').innerHTML();await page.goto(server.origin+'/'+route+'&layout=legacy',{waitUntil:'networkidle'});await page.waitForSelector('.reading-match-hero');assert.equal(html,await page.locator('#app').innerHTML());results.push({name,automaticFallback:true});await page.close()}
 fs.writeFileSync(path.join(__dirname,'final-browser-results.json'),JSON.stringify(results,null,2));console.log('PASS TOTAL',results.length);
 }catch(error){fs.writeFileSync(path.join(__dirname,'browser-partial.json'),JSON.stringify({results,error:error.stack},null,2));if(activePage&&!activePage.isClosed())await activePage.screenshot({path:path.join(__dirname,'browser-failure.png')});throw error}finally{await browser.close();server.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
