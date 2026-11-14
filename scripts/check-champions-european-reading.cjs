'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('C:/Users/utente/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),out='reports/champions-european-reading';
const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.css':'text/css','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!file.startsWith(root+path.sep))return res.writeHead(403).end();fs.readFile(file,(e,b)=>{res.writeHead(e?404:200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'});res.end(e?'Missing':b)});});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
  browser=await chromium.launch({headless:true,channel:'msedge'});fs.mkdirSync(out,{recursive:true});
  const data=JSON.parse(fs.readFileSync('data/generated/champions-shared-scenarios.json'));
  const fixtures=[data.fixtures.find(f=>f.matchday===5&&f.europeanReading?.applied),data.fixtures.find(f=>f.matchday===5&&f.europeanReading&&!f.europeanReading.applied),data.fixtures.find(f=>f.matchday===4)];
  assert(fixtures.every(Boolean));const report=[];
  for(const width of [1440,390])for(const f of fixtures){
   const page=await browser.newPage({viewport:{width,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(`http://127.0.0.1:${server.address().port}/champions-league.html?match=${f.fixtureId}`);
   await page.locator('[data-reading-ready="true"]').waitFor();
   const scenario=page.locator('.rd-scenario');await scenario.waitFor();
   const text=await scenario.innerText();assert(!/NaN|undefined|Infinity/.test(text));
   if(f.europeanReading?.applied){
    assert.equal(await page.locator('[data-european-reading="linked"]').count(),1);
    assert(text.includes('Lettura collegata'));assert(text.includes(f.scoreForecast.primary.score));
    assert.equal(await page.locator('[data-statistic="xgot-forecast"] [data-available="true"]').count(),2);
   }else if(f.europeanReading)assert(text.includes('Storico Elo insufficiente'));
   else assert.equal(await page.locator('[data-european-reading="linked"]').count(),0);
   await scenario.scrollIntoViewIfNeeded();await page.screenshot({path:`${out}/${f.fixtureId}-${width}.png`});
   assert(!await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2));assert.deepEqual(errors,[]);
   report.push({fixtureId:f.fixtureId,width,linked:!!f.europeanReading?.applied,errors});await page.close();
  }
  fs.writeFileSync(`${out}/browser-audit.json`,JSON.stringify(report,null,2)+'\n');console.log('OK European reading desktop/mobile: linked scenario/exact scores/xGOT, explicit fallback, historical reading, no errors or overflow');
 }finally{if(browser)await browser.close();await new Promise(r=>server.close(r))}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
