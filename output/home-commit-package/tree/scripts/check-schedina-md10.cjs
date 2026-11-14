const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('C:/Users/utente/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),read=f=>JSON.parse(fs.readFileSync(path.join(root,f),'utf8'));
const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp'};
const server=http.createServer((req,res)=>{const f=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!f.startsWith(root+path.sep))return res.writeHead(403).end();fs.readFile(f,(e,b)=>{res.writeHead(e?404:200,{'Content-Type':types[path.extname(f)]||'application/octet-stream'});res.end(e?'Missing':b)})});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const url=`http://127.0.0.1:${server.address().port}`;
 const browser=await chromium.launch({channel:'msedge',headless:true}),errors=[],results=[];
 const data=read('reports/md10-schedina/data-audit.json');
 try{
 for(const width of [1440,390]){
  const page=await browser.newPage({viewport:{width,height:1000}});page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://fonts.googleapis.com/**',r=>r.abort());await page.route('https://fonts.gstatic.com/**',r=>r.abort());
  await page.goto(url+'/schedina.html?giornata=10');await page.waitForSelector('[data-match-panel]');
  assert.equal(await page.locator('[data-match-panel]').count(),10);await page.locator('[data-match-open-all]').click();
  assert.equal(await page.locator('[data-match-panel][open]').count(),10);
  assert.equal(await page.locator('.betting-preferred-badge').count(),0);assert.equal(await page.locator('[data-selection-row]').count(),data.count);
  assert(!await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),'overflow '+width);
  const text=await page.locator('#app').innerText();assert(!/Safe|Balanced|Aggressive/.test(text));
  const picked=[];
  for(const row of data.rows){
   const panel=page.locator(`[data-match-id="${row.matchId}"]`);assert.equal(await panel.locator('[data-selection-row]').count(),row.forecasts);
   const item=panel.locator('[data-personal-pick]').first();const id=await item.getAttribute('data-personal-pick');picked.push(id);await item.click();assert.equal(await item.getAttribute('aria-pressed'),'true');
  }
  await page.reload();await page.waitForSelector('[data-match-panel]');await page.locator('[data-match-open-all]').click();
  for(const id of picked)assert.equal(await page.locator(`[data-personal-pick="${id}"]`).first().getAttribute('aria-pressed'),'true');
  const first=page.locator(`[data-personal-pick="${picked[0]}"]`).first();await first.click();assert.equal(await first.getAttribute('aria-pressed'),'false');
  await page.screenshot({path:path.join(root,`reports/md10-schedina/schedina-${width}.png`),fullPage:true});
  for(const row of data.rows){await page.goto(url+'/lettura.html?match='+row.matchId);await page.waitForSelector('.rd-shell');assert.equal(await page.locator('[data-forecast-id]').count(),row.forecasts)}
  await page.goto(url+'/schedina.html');await page.waitForSelector('a[href="schedina.html?giornata=10"]');
  results.push({width,fixtures:10,forecasts:data.count,saved:10,removed:1,readingSync:true,indexLink:true,overflow:false});await page.close();
 }
 assert.deepEqual(errors,[]);fs.writeFileSync(path.join(root,'reports/md10-schedina/browser-audit.json'),JSON.stringify({results,errors},null,2)+'\n');console.log('OK MD10 desktop/mobile: catalogo, 10 partite, selezione, salvataggio, rimozione e sincronizzazione Lettura.');
 }finally{await browser.close();server.close()}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
