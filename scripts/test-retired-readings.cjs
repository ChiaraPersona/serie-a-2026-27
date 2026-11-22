'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),read=f=>JSON.parse(fs.readFileSync(path.join(root,f)));
const {finishedReadingFiles,isArchived,currentMatchday}=require('./retire-finished-readings.cjs');
for(const file of finishedReadingFiles())assert.equal(fs.existsSync(path.join(root,file)),false,file);
const index=read('data/generated/readings/index.json');
assert.ok(index.matches.filter(m=>isArchived(m,index.matches)).every(m=>!index.fixtureIds.includes(m.id)));
const out=path.join(root,'output/retired-readings-check');fs.mkdirSync(out,{recursive:true});
process.env.TEMP=out;process.env.TMP=out;
const {chromium}=require(path.join(process.env.PLAYWRIGHT_MODULES||'C:/Users/utente/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules','playwright'));
const server=http.createServer((req,res)=>{
 const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);
 if(!file.startsWith(root+path.sep))return res.writeHead(403).end();
 try{res.setHeader('Content-Type',({'.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.html':'text/html','.css':'text/css','.svg':'image/svg+xml'})[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));}catch{res.writeHead(404).end();}
});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;const results=[];
 try{
  browser=await chromium.launch({channel:'chrome',headless:true});
  const sa=index.matches.find(f=>isArchived(f,index.matches)),cl=read('data/normalized/champions-league-2026-27.json').fixtures.find(f=>f.status==='finished');
  for(const width of [1440,390]){
   const page=await browser.newPage({viewport:{width,height:1000},serviceWorkers:'block'}),errors=[],details=[];
   page.on('pageerror',e=>errors.push(e.message));
   page.on('request',r=>{if(/data\/generated\/(?:champions-readings|readings\/(?:matches|catalogs))\//.test(r.url()))details.push(r.url());});
   for(const [url,f] of [['lettura.html?match='+sa.id,sa],['champions-league.html?match='+cl.id,cl]]){
    await page.goto(`http://127.0.0.1:${server.address().port}/${url}`);
    await page.locator('#app .reading-final-score').waitFor();
    assert.equal((await page.locator('#app .reading-final-score').innerText()).trim(),`${f.score.home} - ${f.score.away}`);
    assert.equal(await page.locator('.rd-shell').count(),0);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
   }
   await page.goto(`http://127.0.0.1:${server.address().port}/lettura.html`);
   await page.locator('[data-archive-day]').first().click();
   assert.equal(await page.locator('#ri-archive-panel a[href*="match="]').count(),0);
   assert.ok(await page.locator('#ri-archive-panel .ri-finished').count()>0);
   await page.screenshot({path:path.join(out,`archive-${width}.png`),fullPage:true});
   assert.deepEqual(details,[]);assert.deepEqual(errors,[]);
   const current=currentMatchday(index.matches),finishedCurrent=index.matches.filter(f=>f.matchday===current&&f.status==='finished');
   for(const fixture of finishedCurrent){
    assert.ok(index.fixtureIds.includes(fixture.id));
    assert.ok(fs.existsSync(path.join(root,'data/generated/readings/matches/'+fixture.id+'.json')));
    assert.equal(await page.locator('.ri-current a[data-fixture-id="'+fixture.id+'"]').count(),1);
   }
   if(finishedCurrent.length){
    await page.goto(`http://127.0.0.1:${server.address().port}/lettura.html?match=${finishedCurrent[0].id}`);
    await page.locator('.rd-shell[data-reading-ready="true"]').waitFor({timeout:60000});
    assert.ok(details.some(url=>url.includes(finishedCurrent[0].id)));
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
    await page.screenshot({path:path.join(out,`current-finished-${width}.png`),fullPage:true});
   }
   results.push({width,scores:true,archiveLinks:0,currentFinishedLinks:finishedCurrent.length,currentFinishedReading:true});await page.close();
  }
  fs.writeFileSync(path.join(out,'browser.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results));
 }finally{await browser?.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;server.close();});
