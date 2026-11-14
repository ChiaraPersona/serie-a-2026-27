'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('C:/Users/utente/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),out='reports/champions-xgot-forecast';
const server=http.createServer((req,res)=>{
 const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
 if(!file.startsWith(root+path.sep))return res.writeHead(403).end();
 const mime={'.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.css':'text/css','.html':'text/html','.svg':'image/svg+xml'};
 fs.readFile(file,(e,b)=>{res.writeHead(e?404:200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'});res.end(e?'Missing':b)});
});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({headless:true,channel:'msedge'});
 try{
  fs.mkdirSync(out,{recursive:true});
  const fixtures=JSON.parse(fs.readFileSync('data/generated/champions-shared-scenarios.json')).fixtures;
  const selected=[fixtures.find(f=>f.matchday===5&&f.xgotForecast?.status==='experimental'),fixtures.find(f=>f.matchday===5&&(f.homeTeam==='Sabah'||f.awayTeam==='Sabah')),fixtures.find(f=>f.matchday===5&&f.xgotForecast?.home===null)].filter((f,i,all)=>f&&all.findIndex(other=>other?.fixtureId===f.fixtureId)===i);
  const report=[];
  for(const width of [1440,390])for(const f of selected){
   const page=await browser.newPage({viewport:{width,height:1000}}),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.goto(`http://127.0.0.1:${server.address().port}/champions-league.html?match=${f.fixtureId}`);
   await page.locator('[data-reading-ready="true"]').waitFor();
   const row=page.locator('[data-statistic="xgot-forecast"]');await row.waitFor({state:'attached'});
   assert((await row.textContent()).includes('sperimentale'));
   assert.equal(await row.locator('[data-available="true"]').count(),f.xgotForecast.home===null?0:2);
   await row.scrollIntoViewIfNeeded();await page.screenshot({path:`${out}/${f.fixtureId}-${width}.png`});
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);
   assert.deepEqual(errors,[]);report.push({fixtureId:f.fixtureId,width,status:f.xgotForecast.status,errors});await page.close();
  }
  fs.writeFileSync(`${out}/browser-audit.json`,JSON.stringify(report,null,2)+'\n');
  console.log('OK Champions xGOT forecast desktop/mobile: forecast and insufficient-data rows, no JS errors or overflow');
 }finally{await browser.close();await new Promise(r=>server.close(r))}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
