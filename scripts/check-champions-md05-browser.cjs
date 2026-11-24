'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('C:/Users/utente/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'output/champions-md05/browser'),read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const catalog=read('data/normalized/schedina-champions-md05.json'),individuals=read('data/normalized/champions-md05-probable-individuals-2026-27.json');
const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.css':'text/css','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}fs.readFile(file,(e,b)=>{res.writeHead(e?404:200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'});res.end(e?'Missing':b);});});
(async()=>{fs.mkdirSync(out,{recursive:true});await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;const results=[];try{
browser=await chromium.launch({headless:true,channel:'msedge'});const base='http://127.0.0.1:'+server.address().port;
for(const width of [1440,390]){const context=await browser.newContext({viewport:{width,height:1000}}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
const check=async label=>{assert.deepEqual(errors,[],label);assert(!await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),label+' overflow');assert(!/NaN|undefined|Infinity/.test(await page.locator('#app').innerText()),label);results.push({width,label});};
await page.goto(base+'/schedina.html?competizione=champions&giornata=5');await page.waitForSelector('[data-champions-workspace="5"]');await page.locator('[data-match-open-all]').click();
for(const m of catalog.marketCatalog.matches)assert.equal(await page.locator(`[data-match-id="${m.matchId}"] .betting-match-body > .betting-market-list [data-selection-row]`).count(),m.suggestions.length,m.matchId);
const target=catalog.marketCatalog.matches.find(m=>m.matchId.endsWith('05-01')),pick=target.suggestions.find(id=>target.selections.find(l=>l.selectionId===id).marketScope==='player');assert(pick);
await page.locator(`[data-personal-pick="${pick}"]`).click();await check('schedina-md05');await page.screenshot({path:path.join(out,`schedina-${width}.png`)});
for(const m of catalog.marketCatalog.matches){await page.goto(base+'/champions-league.html?match='+m.matchId);await page.waitForSelector('[data-md3-probable-player]',{state:'attached'});await page.waitForSelector('#lettura-pronostici [data-shared-forecast-id]',{state:'attached'});
assert.equal(await page.locator('#lettura-pronostici [data-shared-forecast-id]').count(),m.suggestions.length,m.matchId+' selections');
assert.equal(await page.locator('#app :is([data-source-panel],.source-panel,.sources-panel):visible').count(),0,'Public provenance hidden');
const f=individuals.fixtures.find(f=>f.fixtureId===m.matchId);for(const t of f.teams){const ids=await page.locator(`[data-md3-probable-team="${t.teamId}"] [data-projected-role="starter"]`).evaluateAll(rows=>rows.map(r=>r.dataset.playerId));assert.deepEqual(ids,t.players.filter(p=>p.projectedRole==='starter').map(p=>p.playerId));}
if(f.status!=='official')assert((await page.locator('#app').innerText()).includes('riferimento provvisorio'),m.matchId+' reference label');
if(m===target){assert.equal(await page.locator(`[data-rd-pick="${pick}"]`).getAttribute('aria-pressed'),'true');await page.screenshot({path:path.join(out,`official-reading-${width}.png`)});await page.locator('[data-player-lineup-filter="bench"]').click();assert(await page.locator('[data-player-card][data-player-lineup="bench"]:visible').count()>0);}
await check(m.matchId);}
await page.goto(base+'/schedina.html');await page.waitForSelector('[data-champions-matchday="5"]');await check('archive-card-5');
for(const day of [3,4]){await page.goto(base+`/schedina.html?competizione=champions&giornata=${day}`);await page.waitForSelector(`[data-champions-workspace="${day}"]`);await check('regression-md'+day);}
await context.close();console.log('PASS '+width+': MD5 fixtures, official XIs, reading/schedina synchronization, saved DUO, MD3/MD4 regression');}
fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(results,null,2)+'\n');
}finally{await browser?.close();server.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
