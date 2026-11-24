'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('C:/Users/utente/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'output/champions-md05/evening-browser');
const source=JSON.parse(fs.readFileSync(path.join(root,'data/sources/champions-official-formations-md05-2026-27.json')));
const teams=source.teams.filter(t=>Number(t.fixtureId.slice(-2))>=3&&Number(t.fixtureId.slice(-2))<=9);
const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.css':'text/css','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}fs.readFile(file,(e,b)=>{res.writeHead(e?404:200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'});res.end(e?'Missing':b);});});
(async()=>{let browser;const results=[];fs.mkdirSync(out,{recursive:true});await new Promise(r=>server.listen(0,'127.0.0.1',r));try{
 browser=await chromium.launch({headless:true,channel:'msedge'});
 for(const width of [1440,390]){
  const context=await browser.newContext({viewport:{width,height:1000}}),page=await context.newPage();
  for(const fixtureId of [...new Set(teams.map(t=>t.fixtureId))]){
   await page.goto(`http://127.0.0.1:${server.address().port}/champions-league.html?match=${fixtureId}`);
   await page.waitForSelector('[data-md3-probable-player]',{state:'attached'});
   for(const t of teams.filter(t=>t.fixtureId===fixtureId)){
    const team=page.locator(`[data-md3-probable-team="${t.teamId}"]`);
    for(const [role,players] of [['starter',t.starters],['bench',t.bench]]){
     const rows=team.locator(`[data-md3-probable-player][data-projected-role="${role}"]`);
     assert.equal(await rows.count(),players.length,`${width} ${t.teamId} ${role}`);
     const displayName=name=>name.trim().replace(/\.$/,'');
     const actual=await rows.locator('h3').allTextContents();assert.deepEqual(actual.map(displayName),players.map(p=>displayName(p.canonicalName||p.sourceName)));
    }
   }
   assert(!await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1));
   if(fixtureId.endsWith('03')||fixtureId.endsWith('04'))await page.screenshot({path:path.join(out,`${fixtureId}-${width}.png`)});
   results.push({width,fixtureId,officialStarters:22,benchNamesVerified:true});
  }
  await context.close();console.log(`PASS ${width}: seven official XIs and all supplied bench names`);
 }
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(results,null,2)+'\n');
}finally{await browser?.close();server.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
