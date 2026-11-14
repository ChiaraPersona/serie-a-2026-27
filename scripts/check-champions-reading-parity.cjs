const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('C:/Users/utente/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'output/champions-reading-parity');
const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.css':'text/css','.svg':'image/svg+xml','.webp':'image/webp'};
const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!file.startsWith(root+path.sep))return res.writeHead(403).end();fs.readFile(file,(e,b)=>{res.writeHead(e?404:200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'});res.end(e?'Missing':b)});});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;try{
 fs.mkdirSync(out,{recursive:true});browser=await chromium.launch({headless:true,channel:'msedge'});
 for(const width of [1440,390]){const page=await browser.newPage({viewport:{width,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:'+server.address().port+'/champions-league.html?match=ucl-2026-27-md04-01');await page.waitForSelector('.rd-shell');await page.waitForSelector('.rd-forecasts',{state:'attached'});
 await page.screenshot({path:path.join(out,'reading-'+width+'.png'),fullPage:true});
 assert.equal(await page.locator('#lettura-disciplina .prediction-booked-panel').count(),1,'Missing Probabili ammoniti panel');
 assert.match(await page.locator('#lettura-disciplina .prediction-booked-panel').innerText(),/Probabili ammoniti/);
 assert.match(await page.locator('#lettura-disciplina .prediction-booked-panel').innerText(),/Candidati ammonizione N\/D/);
 assert.equal(await page.locator('.rd-tactical-sheet').count(),2);
 assert.equal(await page.locator('#app :is([data-source-panel],.source-panel,.sources-panel):visible').count(),0);
 assert.equal(await page.locator('[data-md3-probable-player][data-projected-role="starter"]').count(),22);
 assert.equal(await page.locator('.rd-player-team-name').count(),2);
 const catalog=JSON.parse(fs.readFileSync(path.join(root,'data/normalized/schedina-champions-md04.json')));
 assert.equal(await page.locator('#lettura-pronostici [data-shared-forecast-id]').count(),catalog.marketCatalog.matches.find(m=>m.matchId==='ucl-2026-27-md04-01').suggestions.length,'Published forecast catalog unchanged');
 await page.locator('[data-player-lineup-filter="bench"]').click();assert(await page.locator('[data-player-card][data-player-lineup="bench"]:visible').count()>0);
 await page.locator('[data-player-lineup-filter="starter"]').click();
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'Page overflow');assert.deepEqual(errors,[]);
 const geometry=()=>{const card=document.querySelector('.rd-tactical-sheet'),metric=card.querySelector('.rd-tactical-metrics dd'),style=getComputedStyle(card);return {padding:style.padding,borderRadius:style.borderRadius,font:getComputedStyle(metric).fontSize,columns:getComputedStyle(card.querySelector('.rd-tactical-metrics')).gridTemplateColumns.split(' ').length};};
 const champions=await page.evaluate(geometry);
 await page.goto('http://127.0.0.1:'+server.address().port+'/lettura.html?match=atalanta-venezia-2026-27-md-06');await page.waitForSelector('.rd-tactical-sheet');
 assert.deepEqual(await page.evaluate(geometry),champions,'Same tactical card geometry as Serie A');
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'Serie A overflow');
 await page.screenshot({path:path.join(out,'serie-a-'+width+'.png'),fullPage:true});
 for(const id of ['ucl-2026-27-md03-01','ucl-2026-27-md02-05']){
 await page.goto('http://127.0.0.1:'+server.address().port+'/champions-league.html?match='+id);await page.waitForSelector('.rd-shell');
 assert.equal(await page.locator('#lettura-disciplina .prediction-booked-panel').count(),1,id+' bookings');
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,id+' overflow');}
 assert.deepEqual(errors,[]);
 await page.goto('http://127.0.0.1:'+server.address().port+'/champions-league.html?match=ucl-2026-27-md05-01');await page.waitForSelector('[data-lineup-reference]');
 assert.equal(await page.locator('[data-lineup-reference]').count(),2);
 assert.equal(await page.locator('.rd-field-player').count(),22);
 assert.equal(await page.locator('[data-player-card][data-player-lineup="starter"]:visible').count(),22);
 for(const team of ['home','away'])assert.equal(await page.locator(`[data-player-team="${team}"] [data-player-card]:visible`).count(),11,'Reference XI grouped by team');
 assert.match(await page.locator('.rd-lineup-head').innerText(),/Riferimento provvisorio/);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'Reference XI overflow');
 await page.screenshot({path:path.join(out,'reference-md5-'+width+'.png'),fullPage:true});
 assert.deepEqual(errors,[]);
 console.log('PASS Champions MD2 / MD3 / MD4 and Serie A reading parity '+width);await page.close();}
 }finally{await browser?.close();server.close();}})().catch(e=>{console.error(e);process.exitCode=1});
