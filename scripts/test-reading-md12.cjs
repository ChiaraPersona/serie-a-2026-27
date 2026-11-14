'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),read=f=>JSON.parse(fs.readFileSync(path.join(root,f),'utf8'));
const round=read('data/normalized/matches.json').filter(m=>m.competition==='serie-a'&&m.matchday===12),ids=new Set(round.map(m=>m.id));
assert.equal(round.length,10);
// Stable baseline hashes keep this regression check independent of local output files.
const digest=value=>require('node:crypto').createHash('sha256').update(JSON.stringify(value)).digest('hex');
assert.equal(digest(read('data/normalized/predictions.json').predictions.filter(p=>!ids.has(p.matchId))), 'f940b76acd5adc514842c49c2b6a166b153de994b520b5981bf8eabfd2010af2', 'Other matchday predictions changed');
assert.equal(digest(read('data/normalized/readings.json').filter(r=>!ids.has(r.matchId))), '2ed7fb3934aa5a61f94e5d6597e604507e7b669af6d1b44ac752a9e9c4ad0e3a', 'Other matchday readings changed');
for(const m of round){
 const d=read(`data/generated/readings/matches/${m.id}.json`);
 assert.equal(d.readings.length,1,'Lettura mancante '+m.id);
 assert(Object.values(d.readings[0].sections).every(s=>s.content),'Sezioni incomplete '+m.id);
 assert.equal(d.predictionDataset.predictions.length,1,'Pronostico non integrato '+m.id);
 const p=d.predictionDataset.predictions[0];assert.equal(p.futureDataDiagnostics.dataCutoff.matchdayExclusive,12);assert(p.dataQuality.lineupResolved.complete);assert(p.dataQuality.outfieldPlayersModeled.complete);assert.equal(p.market.status,'unavailable');
 assert(!(d.forecastDataset?.marketCatalog?.matches||[]).some(m=>m.selections.length),'Selezioni senza quote');
}
if(process.argv.includes('--data-only')){console.log('OK MD12: 10 Letture complete, previsioni integrate, altre giornate preservate.');process.exit(0)}
const {chromium}=require('C:/Users/utente/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.css':'text/css','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png'};
const server=http.createServer((req,res)=>{const f=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!f.startsWith(root+path.sep))return res.writeHead(403).end();fs.readFile(f,(e,b)=>{res.writeHead(e?404:200,{'Content-Type':types[path.extname(f)]||'application/octet-stream'});res.end(e?'Missing':b)})});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
  browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage(),errors=[],results=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://fonts.googleapis.com/**',r=>r.abort());await page.route('https://fonts.gstatic.com/**',r=>r.abort());
  for(const m of round)for(const width of [1440,390]){
   await page.setViewportSize({width,height:1000});await page.goto(`http://127.0.0.1:${server.address().port}/lettura.html?match=${m.id}`);await page.waitForSelector('.rd-lineup-head');
   const state=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,players:document.querySelectorAll('[data-player-card]').length,probable:[...document.querySelectorAll('.rd-lineup-head b')].filter(n=>n.textContent.includes('Probabile')).length,text:document.querySelector('.rd-shell')?.innerText||''}));
   assert(!state.overflow,`${m.id}: overflow ${width}`);assert.equal(state.probable,2);assert(state.players>=20,`${m.id}: proiezioni individuali incomplete`);assert(state.text.includes('Falli'));assert(!/Fantacalcio\.it|Sisal/.test(state.text));
   results.push({matchId:m.id,width,players:state.players,probable:state.probable,overflow:state.overflow});
   if(m===round[0])await page.screenshot({path:path.join(root,`output/md12-reading-refresh/lettura-${width}.png`),fullPage:true});
  }
  assert.deepEqual(errors,[]);fs.writeFileSync(path.join(root,'output/md12-reading-refresh/browser-audit.json'),JSON.stringify({results,errors},null,2)+'\n');console.log('OK MD12: 10 Letture × desktop/mobile, formazioni e proiezioni individuali.');
 }finally{if(browser)await browser.close();server.close()}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
