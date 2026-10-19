"use strict";
const assert=require('node:assert/strict'),fs=require('node:fs'),http=require('node:http'),path=require('node:path');
const {chromium}=require('C:/Users/utente/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..');
const data=JSON.parse(fs.readFileSync(path.join(root,'data/normalized/schedina-md07.json')));
const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.css':'text/css','.svg':'image/svg+xml','.png':'image/png'};
const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!file.startsWith(root+path.sep))return res.writeHead(403).end();fs.readFile(file,(e,b)=>{res.writeHead(e?404:200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'});res.end(e?'Missing':b)})});
(async()=>{
const {sharedForecastsForMatch}=await import('../js/pages/shared-forecast-contract.mjs');
await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({headless:true,channel:'msedge'});const id='milan-atalanta-2026-27-md-07',expected=sharedForecastsForMatch(data.marketCatalog,id).map(l=>l.selectionId).sort(),reports=[];
try{for(const width of [1440,390]){const context=await browser.newContext({viewport:{width,height:1000}}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
for(const type of ['schedina','lettura']){await page.goto('http://127.0.0.1:'+server.address().port+'/'+type+'.html?'+(type==='schedina'?'giornata=7':'match='+id),{waitUntil:'networkidle'});
if(type==='schedina'){await page.waitForFunction(()=>document.querySelectorAll('[data-match-panel]').length===10);await page.locator('[data-match-open-all]').click();const actual=await page.locator('[data-match-id="'+id+'"] [data-selected-forecast=true]').evaluateAll(rows=>rows.map(r=>r.dataset.personalPick).sort());assert.deepEqual(actual,expected);}else{await page.locator('.rd-shell').waitFor();assert.equal(await page.locator('.rd-lineup-head b').count(),2);assert((await page.locator('.rd-lineup-head').textContent()).includes('Ufficiale'));const rendered=await page.evaluate(async id=>{const {sharedForecastsForMatch}=await import('/js/pages/shared-forecast-contract.mjs');const d=await (await fetch('/data/normalized/schedina-md07.json')).json();return sharedForecastsForMatch(d.marketCatalog,id).map(l=>l.selectionId).sort()},id);assert.deepEqual(rendered,expected);}
assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Overflow '+type);await page.screenshot({path:'output/reports/milan-atalanta-md07-official/'+type+'-'+width+'.png',fullPage:false});}
assert.deepEqual(errors,[]);reports.push({width,schedinaRegistrySync:'PASS',readingForecastPanel:'ABSENT_IN_CURRENT_LAYOUT',official:'PASS',overflow:'PASS',errors});await context.close();}}
finally{await browser.close();await new Promise(r=>server.close(r));}fs.writeFileSync('output/reports/milan-atalanta-md07-official/browser.json',JSON.stringify(reports,null,2));console.log(reports);
})().catch(e=>{console.error(e);server.close();process.exitCode=1});

