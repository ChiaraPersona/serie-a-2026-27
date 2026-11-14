const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('C:/Users/utente/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),dest=path.join(root,'reports/reading-player-rosters');fs.mkdirSync(dest,{recursive:true});
const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png'};
const server=http.createServer((req,res)=>{const f=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!f.startsWith(root+path.sep))return res.writeHead(403).end();fs.readFile(f,(e,b)=>{res.writeHead(e?404:200,{'Content-Type':types[path.extname(f)]||'application/octet-stream'});res.end(e?'Missing':b);});});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
 browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage(),errors=[],checks=[];
 page.on('pageerror',e=>errors.push(e.message));
 const cases=JSON.parse(fs.readFileSync(path.join(dest,'expected.json'),'utf8'));
 const fmt=v=>typeof v==='number'&&Number.isFinite(v)?v.toLocaleString('it-IT',{maximumFractionDigits:1}):'—';
 for(const f of cases)for(const width of [1440,768,390,320]){
  await page.setViewportSize({width,height:1000});await page.goto(`http://127.0.0.1:${server.address().port}/${f.competition==='serie-a'?'lettura':'champions-league'}.html?match=${f.id}`);await page.waitForSelector('.rd-player-columns');
  assert.equal(await page.locator('#lettura-formazioni details').count(),0);
  const section=page.locator('#lettura-giocatori');const cards=section.locator('[data-player-card]');
  const actual=await cards.evaluateAll(nodes=>nodes.map(n=>({id:n.dataset.playerId,name:n.querySelector('h3').textContent,status:n.dataset.playerLineup,number:n.querySelector('.rd-row-number').textContent,shots:n.querySelector('[data-player-shots]').textContent,sot:n.querySelector('[data-player-sot]').textContent})));
  assert.equal(actual.length,f.players.length,f.id+' all players');
  for(const p of f.players){const matches=actual.filter(r=>p.id?r.id===p.id:r.name===p.name);assert.equal(matches.length,1,f.id+' duplicate/missing '+p.name);const row=matches[0];assert.equal(row.status,p.status,p.name);assert.equal(row.number,String(p.number??'—'),p.name);assert.equal(row.shots,fmt(p.shots),p.name);assert.equal(row.sot,fmt(p.sot),p.name);}
  for(const status of ['starter','bench']){
   await section.locator(`[data-player-lineup-filter="${status}"]`).click();
   const visible=await cards.evaluateAll(nodes=>nodes.filter(n=>!n.hidden).map(n=>n.dataset.playerLineup));assert.equal(visible.length,f.players.filter(p=>p.status===status).length);assert(visible.every(s=>s===status));
   await section.locator(`[data-player-lineup-filter="${status}"]`).click();
  }
  assert.equal(await section.locator('[data-player-card]:not([hidden])').count(),f.players.length);
  await cards.first().locator('summary').first().click();assert(await cards.first().getAttribute('open')!==null);await cards.first().locator('summary').first().click();
  assert(!await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),f.id+' page overflow');
  assert.equal(await page.locator('.rf-dashboard').count(),1);
  assert.equal(await section.locator('.rd-player-columns').count(),1);
  assert(!/updatedAt|2026-10-.*T\d/.test(await section.innerText()));
  await section.screenshot({path:path.join(dest,`${f.id}-${width}.png`),style:'.site-header,.rd-nav{visibility:hidden!important}'});
  checks.push({fixtureId:f.id,width,players:actual.length,counts:f.counts,filters:'PASS',projections:'UNCHANGED'});
 }
 assert.deepEqual(errors,[]);fs.writeFileSync(path.join(dest,'browser.json'),JSON.stringify({checks,errors},null,2));console.log('PASS: '+checks.length+' desktop/mobile checks; rosters, filters, projections and overflow.');
 }finally{await browser?.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;server.close();});
