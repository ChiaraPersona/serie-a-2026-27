const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('C:/Users/utente/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'output/champions-md05-results');
const catalog=JSON.parse(fs.readFileSync(path.join(root,'data/normalized/schedina-champions-md05.json')));
const results=JSON.parse(fs.readFileSync(path.join(root,'data/sources/champions-results-md05-2026-27.json')));
assert.equal(results.fixtures.length,18);
const expected={};
for(const match of catalog.marketCatalog.matches.filter(m=>results.fixtures.some(f=>f.fixtureId===m.matchId)))for(const id of match.suggestions){const record=results.fixtures.find(f=>f.fixtureId===match.matchId).verifiedSelections.find(r=>r.selectionId===id);assert(record);expected[record.settlement.status]=(expected[record.settlement.status]||0)+1;}
const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp'};
const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!file.startsWith(root+path.sep))return res.writeHead(403).end();fs.readFile(file,(e,b)=>{res.writeHead(e?404:200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'});res.end(e?'Missing':b)})});
(async()=>{fs.mkdirSync(out,{recursive:true});await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;const report=[];
try{browser=await chromium.launch({channel:'msedge',headless:true});
for(const width of [1440,390]){
 const page=await browser.newPage({viewport:{width,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://fonts.googleapis.com/**',r=>r.abort());await page.route('https://fonts.gstatic.com/**',r=>r.abort());
 await page.goto(`http://127.0.0.1:${server.address().port}/schedina.html`);
 await page.goto(`http://127.0.0.1:${server.address().port}/champions-league.html`);
 if(await page.locator('[data-champions-day="5"]').getAttribute('aria-expanded')!=='true')await page.locator('[data-champions-day="5"]').click();
 await page.waitForSelector('[data-champions-day="5"]');
 for(let i=1;i<=18;i++)assert.equal(await page.locator(`a[href*="match=ucl-2026-27-md05-${String(i).padStart(2,'0')}"]`).count(),0,`Archived MD5 reading ${i}`);
 await page.goto(`http://127.0.0.1:${server.address().port}/schedina.html?competizione=champions&giornata=5`);
 await page.waitForSelector('[data-champions-workspace="5"]');await page.locator('[data-match-open-all]').first().click();
 const states=await page.locator('.betting-match-body > .betting-market-list [data-selection-row]').evaluateAll(rows=>rows.reduce((a,r)=>{let s=r.dataset.settlement;if(s&&s!=='upcoming')a[s]=(a[s]||0)+1;return a},{}));assert.deepEqual(states,expected);
 assert.equal(await page.locator('[data-audit-economics]').count(),0,'Champions pages omit the partial performance panel');

 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);assert.deepEqual(errors,[]);
 await page.screenshot({path:path.join(out,'schedina-'+width+'.png')});
 for(const fixtureNumber of ['01','10']){
 await page.goto('http://127.0.0.1:'+server.address().port+'/champions-league.html?match=ucl-2026-27-md05-'+fixtureNumber);
 await page.waitForSelector('.reading-final-score');
 assert.equal(await page.locator('.reading-final-score').innerText(),(()=>{const f=results.fixtures.find(f=>f.fixtureId==='ucl-2026-27-md05-'+fixtureNumber);return f.score.home+' - '+f.score.away})());
 assert.equal(await page.locator('[data-rd-pick]:enabled').count(),0);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);assert.deepEqual(errors,[]);
 await page.screenshot({path:path.join(out,'reading-'+fixtureNumber+'-'+width+'.png')});}
 report.push({width,states,errors});await page.close();
}
fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{await browser?.close();server.close()}})().catch(e=>{console.error(e);server.close();process.exitCode=1});
