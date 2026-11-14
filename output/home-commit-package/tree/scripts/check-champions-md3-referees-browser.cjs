const {chromium}=require('C:/Users/utente/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..'),base=path.join(root,'data/analysis/champions/md3-referees-2026-10-19');
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const data=read('data/normalized/champions-league-2026-27.json');
const fixtures=data.fixtures.filter(f=>f.matchday===3),profiles=read('data/normalized/champions-referee-profiles-md03-2026-27.json');
const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.css':'text/css'};
const server=http.createServer((req,res)=>{const p=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!p.startsWith(root+path.sep)){res.writeHead(403).end();return;}fs.readFile(p,(e,b)=>{res.writeHead(e?404:200,{'Content-Type':mime[path.extname(p)]||'application/octet-stream'});res.end(e?'Missing':b);});});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
  browser=await chromium.launch({headless:true,channel:'msedge'});const page=await browser.newPage();let errors=[];const results=[];page.on('pageerror',e=>errors.push(e.message));
  for(const width of [1440,390,320]){await page.setViewportSize({width,height:1000});
   for(const fixture of fixtures){
    errors=[];await page.goto(`http://127.0.0.1:${server.address().port}/champions-league.html?match=${fixture.id}`,{waitUntil:'networkidle'});await page.waitForSelector('[data-referee-metric]');
    const panel=page.locator('.rf-panel');const p=profiles.referees.find(p=>p.refereeId===fixture.refereeAssignment.refereeId);
    const text=await panel.innerText();assert(text.includes(fixture.refereeAssignment.referee.name));assert(!/statz|scoreline|https?:|font[ei]|provenienza|ultime 10|campione stagionale|media stagionale/i.test(text));
    for(const [key,value] of Object.entries(p.metrics)){assert.equal(await panel.locator(`[data-referee-metric="${key}"] strong`).innerText(),value===null?'—':value.toLocaleString('it-IT',{minimumFractionDigits:2,maximumFractionDigits:2}));}
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);assert(!overflow,fixture.id+' overflow');assert.equal(errors.length,0);
    assert.equal(await page.locator('script[src*="public-presentation.js"]').count(),1);
    results.push({fixtureId:fixture.id,width,referee:fixture.refereeAssignment.referee.name,text,errors:[...errors],overflow});
    if([1,3,11].some(n=>fixture.id.endsWith('-'+String(n).padStart(2,'0')))&&width!==320)await page.screenshot({path:path.join(base,`${fixture.id}-${width}.png`),fullPage:true});
   }
  }
  fs.writeFileSync(path.join(base,'browser-results.json'),JSON.stringify(results,null,2)+'\n');console.log('OK '+results.length+' pages at 1440/390/320: exact names/metrics, missing —, no provenance, no JS errors or overflow.');
 }finally{if(browser)await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
