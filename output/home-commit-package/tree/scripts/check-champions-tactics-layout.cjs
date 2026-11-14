const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert/strict');
const {chromium}=require('C:/Users/utente/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..');
const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.css':'text/css','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{const p=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!p.startsWith(root+path.sep))return res.writeHead(403).end();fs.readFile(p,(e,b)=>{res.writeHead(e?404:200,{'Content-Type':types[path.extname(p)]||'application/octet-stream'});res.end(e?'Missing':b);});});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;try{
 browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage({viewport:{width:390,height:1000}});
 for(const width of [1440,768,390,320])for(const id of ['ucl-2026-27-md04-13','ucl-2026-27-md04-18']){
  await page.setViewportSize({width,height:1000});
  await page.goto(`http://127.0.0.1:${server.address().port}/champions-league.html?match=${id}`);await page.waitForSelector('[data-tactical-team]');
  for(const expanded of [false,true]){
   await page.locator('[data-tactical-team] > details').evaluateAll((nodes,open)=>nodes.forEach(n=>n.open=open),expanded);
   const overlaps=await page.locator('[data-tactical-team]').evaluateAll(columns=>columns.flatMap(c=>{const children=[...c.children].filter(n=>n.getBoundingClientRect().height>0);return children.slice(1).flatMap((n,i)=>{const a=children[i].getBoundingClientRect(),b=n.getBoundingClientRect();return b.top<a.bottom-1?[{previous:children[i].tagName,next:n.tagName,overlap:a.bottom-b.top}]:[];});}));
   assert.deepEqual(overlaps,[],id+' '+width+' expanded='+expanded);
   assert(!await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1));
   fs.mkdirSync('output/champions-tactics-layout',{recursive:true});await page.locator('#lettura-tattica').screenshot({style:'.site-header,.rd-nav{visibility:hidden!important}',path:`output/champions-tactics-layout/${id}-${width}-${expanded}.png`});
  }
 }
 console.log('PASS: 16 desktop/mobile tactical layouts, collapsed/expanded, no overlapping sections or overflow');
 }finally{await browser?.close();server.close();}})().catch(e=>{console.error(e);server.close();process.exitCode=1});
