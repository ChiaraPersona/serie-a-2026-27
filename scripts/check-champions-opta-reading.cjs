'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('C:/Users/utente/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'output/champions-opta-reading');
const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.css':'text/css','.svg':'image/svg+xml','.webp':'image/webp'};
const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!file.startsWith(root+path.sep))return res.writeHead(403).end();fs.readFile(file,(e,b)=>{res.writeHead(e?404:200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'});res.end(e?'Missing':b)});});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;try{
 fs.mkdirSync(out,{recursive:true});browser=await chromium.launch({headless:true,channel:'chrome'});
 const data=JSON.parse(fs.readFileSync(path.join(root,'data/generated/champions-shared-scenarios.json')));
 const fixtures=[...data.fixtures.filter(f=>f.matchday===5),...[4,6,7,8].map(day=>data.fixtures.find(f=>f.matchday===day))];
 const report=[];
 for(const width of [1440,390]){const page=await browser.newPage({viewport:{width,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 for(const f of fixtures){await page.goto(`http://127.0.0.1:${server.address().port}/champions-league.html?match=${f.fixtureId}`);
 const scenario=page.locator('.rd-scenario');await scenario.waitFor();
 const goals=await scenario.locator('[data-statistic="expectedGoals"] b').allTextContents();
 for(const [i,key]of ['home','away'].entries())if(Number.isFinite(f.expectedGoals[key]))assert.equal(Number(goals[i].replace(',','.')),f.expectedGoals[key],f.fixtureId+' '+key);
 const text=await scenario.innerText();assert(!/NaN|undefined|Infinity/.test(text));assert(!text.includes('Opta')&&!text.includes('Elo'),'Internal provenance stays internal');
 assert.equal(await page.locator('#app :is([data-source-panel],.source-panel,.sources-panel):visible').count(),0);
 assert(!await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),f.fixtureId+' overflow');assert.deepEqual(errors,[]);
 if(f.fixtureId==='ucl-2026-27-md05-10'){await scenario.scrollIntoViewIfNeeded();await page.screenshot({path:path.join(out,`sabah-barcelona-${width}.png`)});}
 report.push({fixtureId:f.fixtureId,width,goals,errors:[...errors]});}
 console.log(`PASS ${fixtures.length} Champions readings: current Opta goals, MD5–MD8 + historical MD4, no public provenance/errors/overflow at ${width}px`);await page.close();}
 fs.writeFileSync(path.join(out,'browser-audit.json'),JSON.stringify(report,null,2)+'\n');
 }finally{await browser?.close();server.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
