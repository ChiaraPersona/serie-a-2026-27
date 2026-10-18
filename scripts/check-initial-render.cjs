const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict'),cp=require('node:child_process');
const {chromium}=require('C:/Users/utente/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'output/reports/initial-render');fs.mkdirSync(out,{recursive:true});
// Pin the pre-fix presentation while keeping concurrent statistics and panels current.
const baseline=process.env.BASELINE_REF||'335df38d^';
const publicFiles=[...fs.readdirSync(root).filter(f=>f.endsWith('.html')),...fs.readdirSync(path.join(root,'statistiche-squadra')).filter(f=>f.endsWith('.html')).map(f=>'statistiche-squadra/'+f),'champions-2026-27/motivazione.html'];
const old=new Map();for(const f of [...publicFiles,'js/core/app.js','js/pages/readings.js','js/pages/champions.js'])old.set(f,cp.execFileSync('git',['show',baseline+':'+f],{cwd:root,maxBuffer:10e6}));
let legacyShell=fs.readFileSync(path.join(root,'js/pages/reading-detail/shell.mjs'),'utf8').replace('options.prepared||await prepareReadingShell(model)','await prepareReadingShell(model)');
legacyShell=legacyShell.replace("  const {evidence,resultsHref,refereeHistory}=",`  if(!document.querySelector('link[data-reading-detail-css]')){const sheet=document.createElement('link');sheet.rel='stylesheet';sheet.href=new URL('../../../css/reading-detail.css',import.meta.url).href;sheet.dataset.readingDetailCss='';await new Promise((resolve,reject)=>{sheet.onload=resolve;sheet.onerror=reject;document.head.append(sheet)})}
  const {evidence,resultsHref,refereeHistory}=`);
old.set('js/pages/reading-detail/shell.mjs',Buffer.from(legacyShell));
const current=new Map();
function snapshot(dir){for(const e of fs.readdirSync(path.join(root,dir),{withFileTypes:true})){const name=dir+'/'+e.name;if(e.isDirectory())snapshot(name);else current.set(name,fs.readFileSync(path.join(root,name)))}}
snapshot('js');snapshot('css');for(const f of publicFiles)current.set(f,fs.readFileSync(path.join(root,f)));
const types={'.html':'text/html','.css':'text/css','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.webp':'image/webp'};
let phase='before';const server=http.createServer((req,res)=>{let name=decodeURIComponent(new URL(req.url,'http://localhost').pathname).slice(1);if(!name)name='index.html';const file=path.resolve(root,name);if(!file.startsWith(root+path.sep))return res.writeHead(403).end();const send=()=>{let data;try{if(!current.has(name))current.set(name,fs.readFileSync(file));data=phase==='before'&&old.has(name)?old.get(name):current.get(name)}catch{return res.writeHead(404).end()}res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'public, max-age=3600'});res.end(data)};if(!process.env.CHECK_VISUAL&&name.includes('reading-detail/')&&name.endsWith('.mjs'))setTimeout(send,100);else send()});
const routes=['index.html','lettura.html','lettura.html?match=bologna-inter-2026-27-md-07','champions-league.html','champions-league.html?match=ucl-2026-27-md02-05','schedina.html?giornata=7','statistiche-squadra/inter.html','arbitri.html'];
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({channel:'msedge',headless:true});const report=[];
try{for(phase of (process.env.CHECK_PHASE?[process.env.CHECK_PHASE]:['before','after']))for(const width of [1440,390])for(const route of routes.filter(r=>!process.env.CHECK_ROUTE||r===process.env.CHECK_ROUTE)){
 console.log(phase,width,route);
 const context=await browser.newContext({viewport:{width,height:960},reducedMotion:process.env.CHECK_VISUAL?'reduce':'no-preference'});const page=await context.newPage(),cdp=await context.newCDPSession(page),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='warning'||m.type()==='error')console.log('BROWSER',m.text())});
 await page.addInitScript(()=>{window.renderFrames=[];const sample=()=>{const body=document.body;if(body){const app=document.querySelector('main');window.renderFrames.push({legacy:!!document.querySelector('.reading-match-hero')&&!document.querySelector('.rd-shell'),theme:body.dataset.readingDetailTheme||null,background:getComputedStyle(body).background,ready:!!app&&!app.querySelector('.loading'),t:performance.now()})}requestAnimationFrame(sample)};requestAnimationFrame(sample)});
 for(const mode of (process.env.CHECK_VISUAL?['disabled']:['normal','hard','disabled'])){
  await cdp.send('Network.enable');await cdp.send('Network.setCacheDisabled',{cacheDisabled:mode==='disabled'});
  if(mode==='normal'){await page.goto(`http://127.0.0.1:${server.address().port}/${route}`);await page.reload()}
  else if(mode==='hard'){await Promise.all([page.waitForNavigation({waitUntil:'load'}),cdp.send('Page.reload',{ignoreCache:true})])}
  else if(page.url()==='about:blank')await page.goto(`http://127.0.0.1:${server.address().port}/${route}`);else await page.reload();
  await page.waitForFunction(()=>document.querySelector('main')&&!document.querySelector('main .loading'),{timeout:60000});
  if(route.includes('?match='))await page.locator('.rd-shell').waitFor({timeout:60000});
  await page.evaluate(()=>document.fonts.ready);await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  const result=await page.evaluate(()=>({raw:renderFrames.filter(f=>f.legacy),resources:performance.getEntriesByType("resource").filter(r=>r.name.includes("readings.js")||r.name.includes("shell.mjs")).map(r=>r.name),legacyFrames:renderFrames.filter(f=>f.legacy).length,backgrounds:[...new Set(renderFrames.map(f=>f.background))],frames:renderFrames.length,width:document.documentElement.scrollWidth,theme:document.body.dataset.readingDetailTheme,styles:[...document.querySelectorAll('link[rel="stylesheet"]')].filter(l=>l.href.startsWith(location.origin)&&!l.sheet).map(l=>l.href),text:document.querySelector('main').innerText,boxes:[...document.querySelectorAll('.site-header,main,.rd-hero,.hero,.site-footer')].map(e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return {class:e.className,x:r.x,y:r.y,width:r.width,height:r.height,background:s.background,color:s.color,font:s.fontFamily}}),timing:performance.getEntriesByType('navigation')[0].toJSON()}));
  report.push({phase,width,route,mode,errors:[...errors],...result});
  fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));console.log(mode,result.legacyFrames,result.frames);
  if(mode==='disabled')await page.screenshot({path:path.join(out,`${phase}-${width}-${routes.indexOf(route)}.png`),fullPage:true});
  if(phase==='after'){assert.equal(result.legacyFrames,0,route+' legacy frames');assert.equal(errors.length,0,route+' JS errors');assert.equal(result.styles.length,0,route+' stylesheet errors')}
 }
 await context.close();
}fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));
const differences=[];for(const a of report.filter(r=>r.phase==='after')){const b=report.find(r=>r.phase==='before'&&r.width===a.width&&r.route===a.route&&r.mode===a.mode);if(b&&(a.text!==b.text||JSON.stringify(a.boxes)!==JSON.stringify(b.boxes)))differences.push({route:a.route,width:a.width,mode:a.mode,text:a.text===b.text,before:b.boxes,after:a.boxes})}
fs.writeFileSync(path.join(out,'differences.json'),JSON.stringify(differences,null,2));console.log(JSON.stringify({cases:report.length,beforeLegacy:report.filter(r=>r.phase==='before').reduce((n,r)=>n+r.legacyFrames,0),afterLegacy:report.filter(r=>r.phase==='after').reduce((n,r)=>n+r.legacyFrames,0),differences:differences.length}));
}finally{await browser.close();await new Promise(r=>server.close(r))}})().catch(e=>{console.error(e);server.close();process.exitCode=1});
