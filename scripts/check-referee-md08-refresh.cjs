const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('C:/Users/utente/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),dest=path.join(root,'reports/referee-md08-refresh');fs.mkdirSync(dest,{recursive:true});
const entries=JSON.parse(fs.readFileSync('data/generated/reading-referee-history.json')).fixtures.filter(f=>f.competition==='serie-a'&&f.fixtureId.endsWith('md-08'));
const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.css':'text/css','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{const p=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!p.startsWith(root+path.sep))return res.writeHead(403).end();fs.readFile(p,(e,b)=>{res.writeHead(e?404:200,{'Content-Type':types[path.extname(p)]||'application/octet-stream'});res.end(e?'Missing':b);});});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
  browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage(),errors=[],checks=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://fonts.googleapis.com/**',r=>r.abort());await page.route('https://fonts.gstatic.com/**',r=>r.abort());
  for(const entry of entries)for(const width of [1440,390]){
   await page.setViewportSize({width,height:1100});await page.goto(`http://127.0.0.1:${server.address().port}/lettura.html?match=${entry.fixtureId}`);await page.waitForSelector('.rf-dashboard');
   const panel=page.locator('.rf-dashboard');assert.equal(await panel.count(),1);
   assert.deepEqual(await panel.locator('[data-referee-history-date]').evaluateAll(nodes=>nodes.map(n=>n.dataset.refereeHistoryDate)),entry.rows.map(r=>r.date));
   const fmt=(v,d=1)=>Number.isFinite(v)?v.toLocaleString('it-IT',{minimumFractionDigits:d,maximumFractionDigits:d}):'—';
   const metrics=['yellowCards','dismissals','fouls','totalCards'];
   const expected=['recent','seasonal'].flatMap(s=>metrics.map(k=>fmt(entry.analysis[s][k].average)));
   assert.deepEqual(await panel.locator('.rf-averages dd').allTextContents(),expected);
   const text=await panel.innerText();assert(!/https?:|Calciotel|OFStats|ESPN|StatMuse|NaN/.test(text));assert.equal(await panel.locator('a').count(),0);
   assert(!await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1));
   if(entry.fixtureId.startsWith('torino-')||entry.fixtureId.startsWith('napoli-'))await panel.screenshot({path:path.join(dest,`${entry.fixtureId}-${width}.png`)});
   checks.push({id:entry.fixtureId,width,rows:entry.rows.length,averages:'MATCH',overflow:false});
  }
  assert.deepEqual(errors,[]);fs.writeFileSync(path.join(dest,'browser.json'),JSON.stringify({checks,errors},null,2));console.log(`PASS: ${checks.length} MD8 desktop/mobile checks.`);
 }finally{await browser?.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;server.close();});
