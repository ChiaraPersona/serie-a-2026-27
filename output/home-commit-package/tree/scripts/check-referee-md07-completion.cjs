const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('C:/Users/utente/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),dest=path.join(root,'output/reports/referee-md07-completion/browser');fs.mkdirSync(dest,{recursive:true});
const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png'};
const server=http.createServer((req,res)=>{const f=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!f.startsWith(root+path.sep))return res.writeHead(403).end();fs.readFile(f,(e,b)=>{res.writeHead(e?404:200,{'Content-Type':types[path.extname(f)]||'application/octet-stream'});res.end(e?'Missing':b);});});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
 browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage(),errors=[],checks=[];
 page.on('pageerror',e=>errors.push(e.message));const data=JSON.parse(fs.readFileSync(path.join(root,'data/generated/reading-referee-history.json')));
 const fixtures=data.fixtures.filter(f=>f.competition==='serie-a'&&f.fixtureId.endsWith('md-07'));assert.equal(fixtures.length,10);
 for(const f of fixtures)for(const width of [1440,390,320]){
  await page.setViewportSize({width,height:1100});await page.goto(`http://127.0.0.1:${server.address().port}/lettura.html?match=${f.fixtureId}`);await page.waitForSelector('.rf-dashboard');
  const panel=page.locator('.rf-dashboard');assert.equal(await panel.count(),1);assert.equal(await panel.locator('tbody tr').count(),5);assert.equal(await panel.locator('a').count(),0);
  const dates=await panel.locator('tbody tr').evaluateAll(rows=>rows.map(r=>r.dataset.refereeHistoryDate));assert.deepEqual(dates,f.rows.map(r=>r.date));
  assert.equal(await panel.locator('.rf-indicator').count(),4);assert.equal(await panel.locator('.rf-comparison').count(),f.analysis.showPercentComparison?4:0);
  const dimensions=await panel.evaluate(n=>({page:document.documentElement.scrollWidth,viewport:innerWidth,width:n.getBoundingClientRect().width,background:getComputedStyle(n.querySelector('.rf-card')).backgroundColor,text:n.innerText}));
  const baseline=await panel.evaluate(n=>{const p=n.closest('.rf-panel');p.style.display='none';const w=document.documentElement.scrollWidth;p.style.display='';return w;});
  assert(dimensions.page<=Math.max(width,baseline)+1,JSON.stringify({id:f.fixtureId,width,dimensions,baseline}));assert(dimensions.width<=width+1);
  assert(!/https?:|Fonte:|Calciotel|OFStats|AIPredict|pipeline|SHA256/.test(dimensions.text));
  await panel.screenshot({style:'.site-header,.rd-nav{visibility:hidden!important}',path:path.join(dest,`${f.fixtureId}-${width}.png`)});delete dimensions.text;checks.push({fixtureId:f.fixtureId,width,rows:dates.length,dimensions,baseline});
 }assert.deepEqual(errors,[]);fs.writeFileSync(path.join(dest,'audit.json'),JSON.stringify({checks,errors},null,2)+'\n');console.log(`PASS ${checks.length} desktop/mobile checks across all ten MD7 readings.`);
 }finally{await browser?.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;server.close();});
