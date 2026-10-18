const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('C:/Users/utente/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),dest=path.join(root,'reports/referee-dashboard');fs.mkdirSync(dest,{recursive:true});
const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png'};
const server=http.createServer((req,res)=>{const f=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!f.startsWith(root+path.sep))return res.writeHead(403).end();fs.readFile(f,(e,b)=>{res.writeHead(e?404:200,{'Content-Type':types[path.extname(f)]||'application/octet-stream'});res.end(e?'Missing':b);});});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
 browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage(),errors=[],checks=[];
 page.on('pageerror',e=>errors.push(e.message));
 const fixtures=[['serie-a','juventus-lazio-2026-27-md-07'],['champions','ucl-2026-27-md02-05'],['champions','ucl-2026-27-md02-01']];
 for(const [competition,id] of fixtures)for(const width of [1440,901,768,390,320]){
  await page.setViewportSize({width,height:1100});await page.goto(`http://127.0.0.1:${server.address().port}/${competition==='serie-a'?'lettura':'champions-league'}.html?match=${id}`);await page.waitForSelector('.rf-dashboard');
  assert.equal(await page.locator('.prediction-v2-discipline,.prediction-v2-discipline-teams').count(),0);
  assert.equal(await page.getByText('Disciplina e ammoniti',{exact:true}).count(),0);
  assert.equal(await page.locator('.rd-nav a[href="#lettura-disciplina"]').count(),1);
  if(competition==='serie-a')assert.equal(await page.locator('#lettura-disciplina .prediction-booked-panel').count(),1);
  await page.locator('.rd-nav a[href="#lettura-disciplina"]').click();assert.equal(await page.locator('#lettura-disciplina').count(),1);
  const panel=page.locator('.rf-dashboard');assert.equal(await panel.count(),1);assert.equal(await page.locator('.reading-referee-assignment').count(),1);
  assert.equal(await panel.locator('.rf-indicator').count(),4);assert.equal(await panel.locator('details').count(),0);
  assert.equal(await panel.locator('a').count(),0);
  const dimensions=await panel.evaluate(n=>({width:n.getBoundingClientRect().width,page:document.documentElement.scrollWidth,viewport:innerWidth,text:n.innerText,background:getComputedStyle(n.querySelector('.rf-card')).backgroundColor,columns:getComputedStyle(n.querySelector('.rf-indicators')).gridTemplateColumns.split(' ').length}));
  const baseline=await panel.evaluate(n=>{const p=n.closest('.rf-panel');p.style.display='none';const w=document.documentElement.scrollWidth;p.style.display='';return w;});
  assert(dimensions.page<=Math.max(width,baseline)+1,JSON.stringify({dimensions,baseline}));assert.equal(dimensions.columns,width<=600?2:4);
  assert(!/https?:|Fonte:|FootyMetrics|Calciotel/.test(dimensions.text));
  const dates=await panel.locator('tbody tr').evaluateAll(rows=>rows.map(r=>r.dataset.refereeHistoryDate));const data=JSON.parse(fs.readFileSync(path.join(root,'data/generated/reading-referee-history.json')));const entry=data.fixtures.find(f=>f.fixtureId===id);assert.deepEqual(dates,(entry?.rows||[]).filter(r=>r.date<entry.cutoffDate).sort((a,b)=>b.date.localeCompare(a.date)).slice(0,5).map(r=>r.date));
  if(id.startsWith('juventus')){assert(dimensions.text.includes('Davide Massa'));assert(dimensions.text.includes('Alassio'));}
  await panel.screenshot({style:'.site-header,.rd-nav{visibility:hidden!important}',path:path.join(dest,`${id}-${width}.png`)});checks.push({id,width,dimensions});
 }
 assert.deepEqual(errors,[]);fs.writeFileSync(path.join(dest,'browser.json'),JSON.stringify({checks,errors},null,2));console.log('PASS: '+checks.length+' desktop/mobile checks, no overflow or page errors.');
 }finally{await browser?.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;server.close();});
