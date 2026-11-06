const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert/strict');
const {chromium}=require('C:/Users/utente/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.css':'text/css','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{const p=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!p.startsWith(root+path.sep))return res.writeHead(403).end();fs.readFile(p,(e,b)=>{res.writeHead(e?404:200,{'Content-Type':types[path.extname(p)]||'application/octet-stream'});res.end(e?'Missing':b);});});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;try{
 browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const matches=JSON.parse(fs.readFileSync('data/normalized/matches.json')).filter(m=>m.competition==='serie-a'&&m.matchday===11);
 fs.mkdirSync('output/current-tactics',{recursive:true});
 for(const width of [1440,390,320])for(const match of matches){
  await page.setViewportSize({width,height:1000});await page.goto(`http://127.0.0.1:${server.address().port}/lettura.html?match=${match.id}`);await page.waitForSelector('.rd-tactical-current');
  assert.equal(await page.locator('.rd-tactical-serie-a').count(),2);
  assert.equal(await page.locator('.rd-tactical-serie-a>.rd-tactical-current').count(),2);
  assert.equal(await page.locator('.rd-tactical-serie-a>.rd-tactical-current dd').count(),18);
  for(const expanded of [false,true]){
   await page.locator('#lettura-tattica .rd-disclosure').evaluateAll((nodes,open)=>nodes.forEach(n=>n.open=open),expanded);
   assert(!await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),match.id+' '+width);
   assert.equal(await page.locator('.rd-tactical-current .rd-tactical-metrics>div').evaluateAll(nodes=>nodes.filter(n=>n.offsetParent&&n.scrollWidth>n.clientWidth+1).length),0);
  }
  if(match===matches[0])await page.locator('#lettura-tattica').screenshot({path:`output/current-tactics/${width}.png`,style:'.site-header,.rd-nav{visibility:hidden!important}'});
 }
 assert.deepEqual(errors,[]);console.log('PASS: all 10 MD11 fixtures at desktop/mobile widths, expanded historical samples, no overflow or JavaScript errors.');
}finally{await browser?.close();server.close();}})().catch(e=>{console.error(e);server.close();process.exitCode=1});
