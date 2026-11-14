const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('C:/Users/utente/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),dest=path.join(root,'reports/reading-bench');
const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png'};
const server=http.createServer((req,res)=>{const f=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!f.startsWith(root+path.sep))return res.writeHead(403).end();fs.readFile(f,(e,b)=>{res.writeHead(e?404:200,{'Content-Type':mime[path.extname(f)]||'application/octet-stream'});res.end(e?'Missing':b);});});
const fmt=v=>Number.isFinite(v)?v.toLocaleString('it-IT',{maximumFractionDigits:1}):'—';
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
  browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage(),errors=[],checks=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://fonts.googleapis.com/**',r=>r.abort());await page.route('https://fonts.gstatic.com/**',r=>r.abort());
  const cases=JSON.parse(fs.readFileSync(path.join(dest,'expected.json'),'utf8'));
  for(const f of cases)for(const width of [1440,390]){
   await page.setViewportSize({width,height:1000});await page.goto(`http://127.0.0.1:${server.address().port}/${f.competition==='serie-a'?'lettura':'champions-league'}.html?match=${f.id}`);
   await page.waitForSelector('.rd-player-columns');const section=page.locator('#lettura-giocatori'),cards=section.locator('[data-player-card]');
   const actual=await cards.evaluateAll(nodes=>nodes.map(n=>({id:n.dataset.playerId,name:n.querySelector('h3').textContent,status:n.dataset.playerLineup,shots:n.querySelector('[data-player-shots]').textContent,sot:n.querySelector('[data-player-sot]').textContent})));
   assert.equal(actual.length,f.players.length,f.id+' count');
   for(const p of f.players){const rows=actual.filter(r=>p.id?r.id===p.id:r.name===p.name);assert.equal(rows.length,1,f.id+' duplicate/missing '+p.name);assert.equal(rows[0].shots,fmt(p.shots),p.name+' shots');assert.equal(rows[0].sot,fmt(p.sot),p.name+' SOT');}
   const starter=section.locator('[data-player-lineup-filter=starter]'),bench=section.locator('[data-player-lineup-filter=bench]');
   assert.equal(await starter.getAttribute('aria-pressed'),'true');assert.equal(await section.locator('[data-player-card]:not([hidden]):not([data-player-lineup=starter])').count(),0);
   await bench.click();assert.equal(await bench.getAttribute('aria-pressed'),'true');assert.equal(await section.locator('[data-player-card]:not([hidden])').count(),f.players.filter(p=>p.status==='bench').length);
   for(const p of f.players.filter(p=>p.status==='bench'&&p.id)){
    const card=section.locator(`[data-player-card][data-player-id="${p.id}"]`);await card.locator('summary').click();
    for(const [label,value] of [['Minuti medi attesi',p.minutes],['Probabilità di subentro',Number.isFinite(p.entry)?p.entry*100:null],['Minuti se entra',p.conditional]]){
     const metric=card.locator('.rd-player-kpis > div').filter({has:page.locator('dt',{hasText:new RegExp('^'+label+'$')})});
     const unit=label==='Probabilità di subentro'?'%':'′';assert.equal(await metric.locator('dd').textContent(),fmt(value)+(Number.isFinite(value)?unit:''),p.name+' '+label);
    }
    await card.locator('summary').click();
   }
   await starter.click();await starter.click();assert.equal(await starter.getAttribute('aria-pressed'),'true');
   assert(!await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),f.id+' overflow');
   const text=await page.locator('.rd-shell').textContent();for(const removed of ['Evidenze e soglie originali','Risk score comparativo, non probabilità di ammonizione.','Campioni piccoli e competizioni diverse: confronto descrittivo.','Numeri, protagonisti e chiavi della partita.'])assert(!text.includes(removed));
   if(f.id==='ucl-2026-27-md02-10'){
    await bench.click();const p=f.players.find(p=>p.status==='bench'&&Number.isFinite(p.shots));await section.locator(`[data-player-id="${p.id}"] summary`).click();
    await section.screenshot({path:path.join(dest,`bench-${width}.png`),style:'.site-header,.rd-nav{visibility:hidden!important}'});
   }
   checks.push({fixtureId:f.id,width,players:actual.length,filters:'PASS',benchValues:'PASS',starterValues:'UNCHANGED',overflow:false});
  }
  assert.deepEqual(errors,[]);fs.writeFileSync(path.join(dest,'browser.json'),JSON.stringify({checks,errors},null,2)+'\n');console.log('PASS '+checks.length+' desktop/mobile checks');
 }finally{await browser?.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
