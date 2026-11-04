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
    const appText=await page.locator('#app').innerText();
    assert(!/Stima preliminare · copertura parziale|Campioni squadra:|Ultime gare utilizzate:|Totali previsti · modello|Formazioni probabili, non ufficiali\./.test(appText));
    assert(!/1: [\d,]+% · X: [\d,]+% · 2: [\d,]+%/.test(appText));
    const colors=await page.locator('.rd-diverging-row').evaluateAll(rows=>rows.map(r=>({key:r.dataset.statistic,color:getComputedStyle(r.querySelector('.is-home em')).backgroundColor})));
    if(colors.length)assert.equal(colors.find(r=>r.key==='fouls').color,colors.find(r=>r.key==='shotsTotal').color);
    const coaches=await page.locator('.rd-lineup-head span').allTextContents();
    assert.equal(coaches.length,2);assert(coaches.every(c=>!c.includes('N/D')),fixture.id+' coaches missing');
    const tactics=read('data/generated/champions-tactical-profiles-2026-27.json').fixtures.find(f=>f.fixtureId===fixture.id);
    for(const team of tactics.teams){
     const column=page.locator(`[data-tactical-team="${team.teamId}"]`);assert.equal(await column.count(),1);
     const sample=team.samples.find(s=>s.matches);
     for(const key of ['possessionPct','shots','goals']){
      const mean=sample.metrics[key].mean;
      const expected=mean===null?'—':mean.toLocaleString('it-IT',{maximumFractionDigits:1})+(key==='possessionPct'?'%':'');
      assert.equal(await column.locator(`:scope > dl [data-tactical-metric="${key}"] dd`).innerText(),expected);
     }
    }
    assert.equal(await panel.locator('.rf-average-card > .rf-historical').count(),1);
    assert.equal(await panel.getByText('Media stagionale 2026/27',{exact:true}).count(),0);
    const firstRow=panel.locator('.rf-history tbody tr').first();
    await page.mouse.move(0,0);
    const style=()=>firstRow.evaluate(r=>[r,...r.cells].map(n=>[getComputedStyle(n).backgroundColor,getComputedStyle(n).color]));
    const beforeHover=await style();await firstRow.hover();assert.deepEqual(await style(),beforeHover);
    const text=await panel.innerText();assert(text.includes(fixture.refereeAssignment.referee.name));
    for(const [key,metric] of [['yellowCardsPerMatch','yellowCards'],['redCardsPerMatch','redCards'],['foulsPerMatch','fouls'],['penaltiesPerMatch','penalties']]){
     const value=profile.career[metric].perMatch;
     assert.equal(await panel.locator(`[data-referee-metric="${key}"] strong`).innerText(),value.toLocaleString('it-IT',{minimumFractionDigits:2,maximumFractionDigits:2}));
    }
    assert(!text.includes('Storico descrittivo, tutte le competizioni'));
    assert(!text.includes('Ultime cinque gare disponibili, tutte le competizioni'));
    assert(!text.includes('Periodo completo non certificato'));
    assert(!/footymetrics|https?:|fonte|provenienza/i.test(text));
    assert.equal(await panel.locator('a').count(),0);assert.equal(errors.length,0,errors.join('\n'));
    const entry=read('data/generated/reading-referee-history.json').fixtures.find(e=>e.fixtureId===fixture.id);
    assert.equal(await panel.locator('[data-referee-history-date]').count(),5);
    assert(text.includes('solo Champions League'));
    const dates=await panel.locator('[data-referee-history-date]').evaluateAll(nodes=>nodes.map(n=>n.dataset.refereeHistoryDate));
    assert.deepEqual(dates,entry.rows.map(r=>r.date));
    for(const row of entry.rows){const rendered=await panel.locator(`[data-referee-history-date="${row.date}"]`).innerText();assert(rendered.includes(row.home));assert(rendered.includes(row.away));}
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);assert(!overflow,fixture.id+' overflow');
    results.push({fixtureId:fixture.id,width,metrics:4,matches:profile.career.matches,overflow,errors:[...errors]});
    if(fixture.id.endsWith('-01'))await panel.screenshot({path:path.join(out,`referee-${width}.png`)});
   }
  }
  fs.writeFileSync(path.join(out,'verification.json'),JSON.stringify(results,null,2)+'\n');
  console.log(`OK ${results.length} desktop/mobile readings: names, four exact metrics, samples, limitations, internal sources, no overflow or JS errors.`);
 }finally{if(browser)await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
