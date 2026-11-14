// Compare the current presentation with the CSS captured before cleanup.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('C:/Users/utente/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'output/css-cleanup');
const routes=['index.html','lettura.html','lettura.html?match=bologna-inter-2026-27-md-07','champions-league.html','champions-league.html?match=ucl-2026-27-md02-05','schedina.html?giornata=7','statistiche-squadre.html','statistiche-giocatori.html','statistiche-squadra/inter.html','coppa-italia.html','download.html','offline.html'];
function cssFiles(dir){return fs.readdirSync(path.join(root,dir),{withFileTypes:true}).flatMap(e=>e.isDirectory()?cssFiles(dir+'/'+e.name):e.name.endsWith('.css')?[dir+'/'+e.name]:[]);}
if(process.argv.includes('--capture')){fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'before.json'),JSON.stringify(Object.fromEntries(cssFiles('css').map(f=>[f,fs.readFileSync(path.join(root,f),'utf8')]))));console.log('Captured current CSS');}
else (async()=>{
 const before=JSON.parse(fs.readFileSync(path.join(out,'before.json')));let phase='before';
 const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png'};
 const server=http.createServer((req,res)=>{const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname).slice(1)||'index.html',file=path.resolve(root,name);if(!file.startsWith(root+path.sep))return res.writeHead(403).end();try{res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');res.end(phase==='before'&&before[name]!==undefined?before[name]:fs.readFileSync(file));}catch{res.writeHead(404).end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({channel:'msedge',headless:true}).catch(async error=>{await new Promise(r=>server.close(r));throw error;}),report=[];
 try{for(const width of [390,768,1440])for(const route of routes.filter(r=>!process.env.CHECK_ROUTE||r===process.env.CHECK_ROUTE)){const results=[];
  for(phase of ['before','after']){const context=await browser.newContext({viewport:{width,height:960},reducedMotion:'reduce',serviceWorkers:'block'}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await context.route('https://**/*',r=>r.abort());
   await page.goto(`http://127.0.0.1:${server.address().port}/${route}`);if(route!=='offline.html')await page.waitForFunction(()=>document.querySelector('main')&&!document.querySelector('main .loading'),null,{timeout:60000});if(route.includes('?match='))await page.locator('.rd-shell').waitFor();
   await page.waitForLoadState('networkidle');await page.evaluate(()=>document.fonts.ready);await page.addStyleTag({content:'*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}'});
   const result=await page.evaluate(()=>({width:document.documentElement.scrollWidth,missing:[...document.querySelectorAll('link[rel=stylesheet]')].filter(l=>l.href.startsWith(location.origin)&&!l.sheet).map(l=>l.href),elements:[...document.body.querySelectorAll('*')].map(e=>{const s=getComputedStyle(e),r=e.getBoundingClientRect();return {tag:e.tagName,cls:e.className,box:[r.x,r.y,r.width,r.height],style:Array.from(s).sort().map(p=>s.getPropertyValue(p)).join('|')};})}));
   results.push({...result,errors});if(phase==='after')await page.screenshot({path:path.join(out,`${width}-${routes.indexOf(route)}.png`),fullPage:true});await context.close();
  }
  const equal=JSON.stringify(results[0])===JSON.stringify(results[1]);report.push({width,route,equal,errors:results[1].errors,missing:results[1].missing});if(!equal)fs.writeFileSync(path.join(out,`difference-${width}-${routes.indexOf(route)}.json`),JSON.stringify(results,null,2));console.log(width,route,equal?'PASS':'DIFFERENCE');
 }fs.writeFileSync(path.join(out,process.env.CHECK_ROUTE?'recheck-'+routes.indexOf(process.env.CHECK_ROUTE)+'.json':'report.json'),JSON.stringify(report,null,2));assert(report.every(r=>r.equal&&!r.errors.length&&!r.missing.length),'Presentation differences or runtime errors; inspect output/css-cleanup');}
 finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1});
