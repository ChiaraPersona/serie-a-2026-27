const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('C:/Users/utente/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png'};
const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!file.startsWith(root+path.sep))return res.writeHead(403).end();fs.readFile(file,(e,b)=>{res.writeHead(e?404:200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'});res.end(e?'Missing':b)})});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`;
 const browser=await chromium.launch({channel:'msedge',headless:true});
 const archive=read('data/generated/reading-referee-history.json');
 const ids=new Set([...read('data/normalized/champions-pilot-predictions-2026-27.json').fixtures,...read('data/normalized/champions-pilot-predictions-md02-2026-27.json').fixtures].map(f=>f.fixtureId));
 const cases=archive.fixtures.filter(f=>f.competition==='serie-a'?Number(f.fixtureId.match(/md-(\d+)$/)?.[1])<=19:ids.has(f.fixtureId));
 const errors=[],results=[];let next=0;
 const target=path.join(root,'reports/reading-referee-history');fs.mkdirSync(target,{recursive:true});
 try{
 const worker=async()=>{
  const page=await browser.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://fonts.googleapis.com/**',r=>r.abort());await page.route('https://fonts.gstatic.com/**',r=>r.abort());
  for(;;){const fixture=cases[next++];if(!fixture)break;
   for(const width of [1440,390]){
    await page.setViewportSize({width,height:1000});await page.goto(`${base}/${fixture.competition==='serie-a'?'lettura':'champions-league'}.html?match=${fixture.fixtureId}`);await page.waitForSelector('.rd-shell');
    const table=page.locator('.rd-referee-history-table');const expected=fixture.rows;
    if(expected.length){
     assert.equal(await table.count(),1,fixture.fixtureId);
     assert.deepEqual(await table.locator('tbody tr').evaluateAll(rows=>rows.map(r=>r.dataset.refereeHistoryDate)),expected.map(r=>r.date));
     const summary=await page.locator('.rd-referee-history-summary dd').allTextContents();
     const fmt=(v,d)=>v===null?'—':v.toLocaleString('it-IT',{minimumFractionDigits:d,maximumFractionDigits:d});
     assert.deepEqual(summary,[fmt(fixture.summary.yellowCardsAverage,1),fmt(fixture.summary.dismissalsTotal,0),fmt(fixture.summary.penaltiesTotal,0)]);
     assert.equal(await page.locator('.rd-referee-history details').count(),0);
     assert.equal(await page.locator('.rd-referee-history a').count(),0);
     const placement=await page.locator('.rd-referee-history').evaluate(n=>n.previousElementSibling?.classList.contains('reading-referee-stats'));assert(placement);
     const dimensions=await table.evaluate(n=>({width:n.getBoundingClientRect().width,parent:n.parentElement.getBoundingClientRect().width,scroll:n.scrollWidth,client:n.clientWidth}));assert(dimensions.width<=dimensions.parent+1);assert(dimensions.scroll<=dimensions.client+1);
     if(['milan-atalanta-2026-27-md-07','ucl-2026-27-md02-05'].includes(fixture.fixtureId))await page.locator('.rd-referee-history').screenshot({path:path.join(target,`${fixture.fixtureId}-${width}.png`)});
    }else assert.equal(await table.count(),0);
    assert(!await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),fixture.fixtureId+' overflow');
    results.push({fixtureId:fixture.fixtureId,competition:fixture.competition,width,rows:expected.length});
    if(results.length%40===0)console.log('Checked',results.length,'/',cases.length*2);
   }
  }await page.close();
 };
 await Promise.all(Array.from({length:4},worker));
 assert.deepEqual(errors,[]);
 fs.writeFileSync(path.join(target,'browser-audit.json'),JSON.stringify({results,errors},null,2)+'\n');
 console.log(JSON.stringify({checks:results.length,tables:results.filter(r=>r.rows).length,errors}));
 }finally{await browser.close();server.close()}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
