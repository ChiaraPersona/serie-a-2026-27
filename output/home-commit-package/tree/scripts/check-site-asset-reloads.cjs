const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('C:/Users/utente/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),types={'.html':'text/html','.css':'text/css','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml','.jpg':'image/jpeg'};
const server=http.createServer((req,res)=>{const f=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!f.startsWith(root+path.sep))return res.writeHead(403).end();fs.readFile(f,(e,b)=>{res.writeHead(e?404:200,{'Content-Type':types[path.extname(f)]||'application/octet-stream','Cache-Control':'public,max-age=3600'});res.end(e?'Missing':b)})});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({channel:'msedge',headless:true}),report=[];
try{for(const width of [1440,390])for(const route of ['index.html','lettura.html?match=fiorentina-como-2026-27-md-07','champions-league.html?match=ucl-2026-27-md02-05','statistiche-squadra/inter.html']){
 const context=await browser.newContext({viewport:{width,height:960}}),page=await context.newPage(),cdp=await context.newCDPSession(page),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{window.framesAudit=[];const read=()=>{if(document.body){const main=document.querySelector('main');framesAudit.push({legacy:!!document.querySelector('.reading-match-hero')&&!document.querySelector('.rd-shell'),unstyled:!!main&&!main.querySelector('.loading')&&[...document.querySelectorAll('link[rel=stylesheet]')].some(n=>n.href.startsWith(location.origin)&&!n.sheet),theme:document.body.dataset.readingDetailTheme})}requestAnimationFrame(read)};requestAnimationFrame(read)});
 await page.goto(`http://127.0.0.1:${server.address().port}/${route}`);await cdp.send('Network.enable');
 for(const mode of ['normal','hard','disabled']){
  await cdp.send('Network.setCacheDisabled',{cacheDisabled:mode==='disabled'});
  if(mode==='hard')await Promise.all([page.waitForNavigation({waitUntil:'load'}),cdp.send('Page.reload',{ignoreCache:true})]);else await page.reload();
  await page.waitForFunction(()=>document.querySelector('main')&&!document.querySelector('main .loading'));
  if(route.includes('?match='))await page.waitForSelector('.rd-shell');await page.waitForLoadState('networkidle');
  const frames=await page.evaluate(()=>framesAudit),legacy=frames.filter(f=>f.legacy).length,unstyled=frames.filter(f=>f.unstyled).length;
  assert.equal(legacy,0);assert.equal(unstyled,0);assert.deepEqual(errors,[]);report.push({width,route,mode,frames:frames.length,legacy,unstyled,errors:[...errors]});
 }await context.close();
}fs.writeFileSync(path.join(root,'reports/site-assets/reloads.json'),JSON.stringify(report,null,2));console.log(`PASS ${report.length} normal/hard/cache-disabled desktop/mobile reloads; zero unstyled or legacy frames.`);
}finally{await browser.close();server.close()}})().catch(e=>{console.error(e);server.close();process.exitCode=1});
