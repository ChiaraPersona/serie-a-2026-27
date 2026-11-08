'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('C:/Users/utente/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(process.argv[2]||'output/pages-optimization-2026-11-08/site');
const out=path.resolve('output/pages-optimization-2026-11-08');
const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.css':'text/css','.svg':'image/svg+xml','.png':'image/png'};
const missing=new Set(),errors=[],checks=[];
const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!file.startsWith(root+path.sep))return res.writeHead(403).end();fs.readFile(file,(e,b)=>{if(e)missing.add(path.relative(root,file).replaceAll('\\','/'));res.writeHead(e?404:200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'});res.end(e?'Missing':b);});});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({channel:'msedge',headless:true});try{
const routes=['/index.html','/lettura.html','/lettura.html?match=roma-sassuolo-2026-27-md-11','/lettura.html?match=sassuolo-milan-2026-27-md-06','/schedina.html?giornata=11','/schedina.html?giornata=6','/champions-league.html','/champions-league.html?match=ucl-2026-27-md02-01','/champions-league.html?match=ucl-2026-27-md03-01','/champions-league.html?match=ucl-2026-27-md04-01','/schedina.html?competizione=champions&giornata=3','/schedina.html?competizione=champions&giornata=4','/statistiche-squadre.html','/statistiche-giocatori.html','/statistiche-squadra/roma.html','/download.html'];
for(const width of [1440,390]){const page=await browser.newPage({viewport:{width,height:1000},serviceWorkers:'block'});page.on('pageerror',e=>errors.push(e.message));await page.route('https://fonts.googleapis.com/**',r=>r.abort());await page.route('https://fonts.gstatic.com/**',r=>r.abort());for(const route of routes){await page.goto('http://127.0.0.1:'+server.address().port+route,{waitUntil:'networkidle'});assert((await page.locator('body').innerText()).length>100,route+' empty');checks.push({width,route});if(route.includes('match=roma-sassuolo')){const text=await page.locator('body').innerText();assert(text.includes('Roma')&&text.includes('Sassuolo'));assert.equal(await page.locator('.rd-field-player strong').count(),22);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:path.join(out,'reading-'+width+'.png'),fullPage:true});}}await page.close();}
assert.deepEqual(errors,[],'Browser errors');
const repository=path.resolve(__dirname,'..');
const missingPackaged=[...missing].filter(file=>fs.existsSync(path.join(repository,file)));
assert.deepEqual(missingPackaged,[],'Existing repository dependency omitted from package');
// A known optional experiment may already be absent from the canonical checkout.
for(const file of missing)assert(file.startsWith('data/generated/reading-bench-starter-scenarios/'),'Unexpected unavailable dependency: '+file);
console.log('PASS packaged site: '+checks.length+' desktop/mobile page checks, no lost dependencies or JS errors; '+missing.size+' optional scenarios unavailable in checkout');
}finally{fs.writeFileSync(path.join(out,'browser.json'),JSON.stringify({checks,missing:[...missing],errors},null,2)+'\n');await browser.close();server.close();}})().catch(e=>{console.error(e);server.close();process.exitCode=1});
