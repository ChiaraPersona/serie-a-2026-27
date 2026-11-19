const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('C:/Users/utente/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'output/champions-reading-parity');
const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.css':'text/css','.svg':'image/svg+xml','.webp':'image/webp'};
const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!file.startsWith(root+path.sep))return res.writeHead(403).end();fs.readFile(file,(e,b)=>{res.writeHead(e?404:200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'});res.end(e?'Missing':b)});});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;try{
 fs.mkdirSync(out,{recursive:true});browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL||'msedge'});
 for(const width of [1440,390]){
 const page=await browser.newPage({viewport:{width,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 for(const id of ['ucl-2026-27-md02-05','ucl-2026-27-md03-01','ucl-2026-27-md04-01','ucl-2026-27-md05-01']){
 await page.goto('http://127.0.0.1:'+server.address().port+'/champions-league.html?match='+id);
 await page.waitForSelector('#lettura-storico [data-team-history]');
 const tables=page.locator('#lettura-storico [data-team-history]');assert.equal(await tables.count(),2);
 for(const table of await tables.all()){
  const cell=table.locator('tbody tr:first-child td').first();
  const colors=await cell.evaluate(el=>({background:getComputedStyle(el).backgroundColor,color:getComputedStyle(el).color}));
  assert.equal(colors.background,'rgb(12, 28, 50)','Dark blue cells');assert.equal(colors.color,'rgb(242, 246, 255)','Light text');
  assert(await table.locator('th,td').evaluateAll(cells=>cells.every(el=>['Top','Right','Bottom','Left'].every(side=>getComputedStyle(el)['border'+side+'Width']==='0px'))),'No cell separators');
  assert.equal(await table.locator('tbody tr:nth-child(2) td').first().evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(17, 36, 60)','Distinct alternate row');
  assert.equal(await table.locator('tbody tr:first-child th').evaluate(el=>getComputedStyle(el).backgroundColor),colors.background,'Opponent follows row palette');
  await cell.hover();assert.equal(await cell.evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(32, 62, 96)','Dark hover');
  await page.mouse.move(0,0);
 }
 for(const table of await tables.all()){const n=await table.locator('tbody tr').count();assert(n>0&&n<=10);assert.equal(await table.locator('thead tr').count(),2);}
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
 await page.locator('#lettura-storico').screenshot({path:path.join(out,'recent-history-'+id+'-'+width+'.png')});
 }
 assert.deepEqual(errors,[]);await page.close();console.log('PASS recent history MD2/3/4/5 '+width);
 }
 }finally{await browser?.close();server.close();}})().catch(e=>{console.error(e);process.exitCode=1});
