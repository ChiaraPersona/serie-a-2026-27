'use strict';
const {chromium}=require('C:/Users/utente/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),out=path.join(root,'output/champions-md04-referee-statistics');
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const profiles=read('data/normalized/champions-referee-profiles-md04-2026-27.json');
const fixtures=read('data/normalized/champions-league-2026-27.json').fixtures.filter(f=>f.matchday===4);
const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.css':'text/css'};
const server=http.createServer((req,res)=>{
 const p=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
 if(!p.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 fs.readFile(p,(e,b)=>{res.writeHead(e?404:200,{'Content-Type':mime[path.extname(p)]||'application/octet-stream'});res.end(e?'Missing':b);});
});
(async()=>{
 fs.mkdirSync(out,{recursive:true});await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
  browser=await chromium.launch({headless:true,channel:'msedge'});
  const page=await browser.newPage(),results=[];let errors=[];page.on('pageerror',e=>errors.push(e.message));
  for(const width of [1440,390]){
   await page.setViewportSize({width,height:1000});
   for(const fixture of fixtures){
    errors=[];
    await page.goto(`http://127.0.0.1:${server.address().port}/champions-league.html?match=${fixture.id}`,{waitUntil:'networkidle'});
    const panel=page.locator('.reading-referee-assignment');await panel.waitFor();
    const profile=profiles.fixtures.find(p=>p.fixtureId===fixture.id);assert.equal(profile.status,'AVAILABLE');
    const text=await panel.innerText();assert(text.includes(fixture.refereeAssignment.referee.name));
    for(const [key,metric] of [['yellowCardsPerMatch','yellowCards'],['redCardsPerMatch','redCards'],['foulsPerMatch','fouls'],['penaltiesPerMatch','penalties']]){
     const value=profile.career[metric].perMatch;
     assert.equal(await panel.locator(`[data-referee-metric="${key}"] strong`).innerText(),value.toLocaleString('it-IT',{minimumFractionDigits:2,maximumFractionDigits:2}));
    }
    assert(text.includes(`${profile.career.matches} gare`));assert(text.includes('Periodo completo non certificato'));
    assert(!/footymetrics|https?:|fonte|provenienza/i.test(text));
    assert.equal(await panel.locator('a').count(),0);assert.equal(errors.length,0,errors.join('\n'));
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);assert(!overflow,fixture.id+' overflow');
    results.push({fixtureId:fixture.id,width,metrics:4,matches:profile.career.matches,overflow,errors:[...errors]});
    if(fixture.id.endsWith('-01'))await panel.screenshot({path:path.join(out,`referee-${width}.png`)});
   }
  }
  fs.writeFileSync(path.join(out,'verification.json'),JSON.stringify(results,null,2)+'\n');
  console.log(`OK ${results.length} desktop/mobile readings: names, four exact metrics, samples, limitations, internal sources, no overflow or JS errors.`);
 }finally{if(browser)await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
