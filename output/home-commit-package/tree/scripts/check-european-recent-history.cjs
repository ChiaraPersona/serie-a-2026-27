'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('C:/Users/utente/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'output/european-recent-history-2026-11-06');
const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp'};
async function main(){
 fs.mkdirSync(out,{recursive:true});
 const fixtures=JSON.parse(fs.readFileSync(path.join(root,'data/normalized/matches.json'),'utf8'));
 const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!file.startsWith(root+path.sep))return res.writeHead(403).end();fs.readFile(file,(e,b)=>{res.writeHead(e?404:200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'});res.end(e?'Missing':b);});});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 let browser;const checks=[];
 try{
  browser=await chromium.launch({channel:'msedge',headless:true});
  for(const [team,competition,count]of [['milan','europa-league',4],['juventus','europa-league',4],['atalanta','conference-league',3]]){
   const fixture=fixtures.find(f=>f.matchday===11&&[f.homeTeam,f.awayTeam].includes(team));
   const canonical=JSON.parse(fs.readFileSync(path.join(root,'data/generated/readings/matches',fixture.id+'.json'),'utf8'));
   const expected=canonical.artifacts['data/generated/serie-a-team-history.json'].teams[team];
   for(const width of [1440,390,320]){
    const page=await browser.newPage({viewport:{width,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.route('https://fonts.googleapis.com/**',r=>r.abort());await page.route('https://fonts.gstatic.com/**',r=>r.abort());
    await page.goto(`http://127.0.0.1:${server.address().port}/lettura.html?match=${fixture.id}`);await page.waitForSelector('[data-reading-ready="true"]');
    const section=page.locator(`[data-team-history="${team}"]`);
    assert.equal(await page.locator('.rd-recent-form').count(),0);
    assert(!await page.locator('#lettura-tattica').innerText().then(t=>t.includes('Baseline storica 2025/26')));
    assert.equal(await section.locator(`[data-history-competition="${competition}"]`).count(),count);
    assert.deepEqual(await section.locator('tbody tr').evaluateAll(rows=>rows.map(r=>r.dataset.historyFixture)),expected.map(r=>r.id));
    assert(!/Fonti|Provenienza|ESPN|playerstats|https?:/.test(await section.innerText()));
    const label=competition==='europa-league'?'Europa League':'Conference League';
    assert((await page.locator('.rd-tactical-current').allTextContents()).some(t=>t.includes(label)));
    assert.match(await page.locator('[data-spatial-fixture]').innerText(),new RegExp(label+': 0/'+count+' gare con coordinate'));
    assert(!await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),'page overflow '+width);
    assert.deepEqual(errors,[]);
    if(team==='milan')await section.screenshot({path:path.join(out,`milan-${width}.png`)});
    if(team==='milan'){
     const tactics=page.locator('#lettura-tattica');
     await tactics.screenshot({path:path.join(out,`tactics-${width}.png`),style:'.site-header,.rd-nav{visibility:hidden!important}'});
     await page.locator('.rd-tactical-extra').evaluateAll(nodes=>nodes.forEach(n=>n.open=true));
     assert.equal(await page.locator('.rd-tactical-current .rd-tactical-metrics>div').evaluateAll(nodes=>nodes.filter(n=>n.offsetParent&&n.scrollWidth>n.clientWidth+1).length),0,'metric overflow');
     assert(!await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1));
     await tactics.screenshot({path:path.join(out,`tactics-expanded-${width}.png`),style:'.site-header,.rd-nav{visibility:hidden!important}'});
     const europeanRows=section.locator('[data-history-competition="europa-league"]');
     assert.equal(await europeanRows.locator('td:last-child').allTextContents().then(values=>values.filter(v=>v==='N/D').length),0,'Milan xG missing');
    }
    checks.push({team,fixtureId:fixture.id,width,europeanRows:count,errors});await page.close();
   }
  }
  fs.writeFileSync(path.join(out,'browser-check.json'),JSON.stringify({checks},null,2)+'\n');console.log('OK: 9 desktop/mobile states; Milan Europa League rows, Juventus, Atalanta Conference, cutoffs, tactical samples, spatial coverage, no overflow.');
 }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
}
main().catch(e=>{console.error(e);process.exitCode=1});
