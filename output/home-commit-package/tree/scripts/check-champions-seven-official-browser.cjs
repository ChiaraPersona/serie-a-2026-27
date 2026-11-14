const {chromium}=require('C:/Users/utente/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..'),types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.css':'text/css'};
const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!file.startsWith(root+path.sep))return res.writeHead(403).end();fs.readFile(file,(e,b)=>{res.writeHead(e?404:200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'});res.end(e?'Missing':b);});});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({headless:true,channel:'msedge'});try{
  const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));const origin='http://127.0.0.1:'+server.address().port;
  const removed=require('../data/technical-archive/official-nonstarter-markets.json');
  for(const width of [1440,390]){
    await page.setViewportSize({width,height:1000});
    await page.goto(origin+'/schedina.html?competizione=champions&giornata=2',{waitUntil:'networkidle'});
    await page.waitForSelector('[data-selection-row]',{state:'attached'});
    assert.equal(await page.locator('[data-selection-row]').count(),113);
    for(const s of removed)assert.equal(await page.locator(`[data-personal-pick="${s.selectionId}"]`).count(),0);
    assert.match(await page.locator('body').innerText(),/Verifica statistica|verifica statistica/);
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    await page.screenshot({path:path.join(root,`output/champions-md02-settlement/sette-ufficiali-${width}.png`),fullPage:true});
    for(const id of [12,13,14,15,16,17,18].map(n=>'ucl-2026-27-md02-'+n)){
      await page.goto(origin+'/champions-league.html?match='+id,{waitUntil:'networkidle'});
      for(const s of removed)assert.equal(await page.locator(`[data-personal-pick="${s.selectionId}"]`).count(),0);
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    }
    await page.goto(origin+'/schedina.html',{waitUntil:'networkidle'});
    assert.match(await page.locator('[data-champions-matchday="2"]').innerText(),/54.*4 esclusi|Operativi: 54/);
    assert(await page.locator('[data-champions-matchday="2"]').evaluate(el=>{const inner=el.querySelector('.team-flip-inner'),back=el.querySelector('.team-flip-back');return back.getBoundingClientRect().bottom<=inner.getBoundingClientRect().bottom+1;}));
    await page.screenshot({path:path.join(root,`output/champions-md02-settlement/sette-report-${width}.png`),fullPage:true});
  }
  assert.deepEqual(errors,[]);console.log('OK desktop/mobile: 113 full-day rows, 54 original operational markets, seven exclusions, cards and readings, no overflow');
}finally{await browser.close();server.close();}})().catch(e=>{console.error(e);server.close();process.exitCode=1;});

