const {chromium}=require('C:/Users/utente/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),cp=require('node:child_process');
const root=path.resolve(__dirname,'..');
const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml'};
const previous=cp.execFileSync('git',['show','HEAD:js/team-squads.js'],{cwd:root,encoding:'utf8'});
const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!file.startsWith(root+path.sep))return res.writeHead(403).end();fs.readFile(file,(err,body)=>{res.writeHead(err?404:200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'});res.end(err?'Missing':body)})});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({headless:true,channel:'msedge'});const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));try{
for(const team of ['atalanta','inter','frosinone']){
 const url=`http://127.0.0.1:${server.address().port}/statistiche-squadra/${team}.html`;
 await page.route('**/js/team-squads.js?*',route=>route.fulfill({body:previous,contentType:'text/javascript'}));
 await page.goto(url,{waitUntil:'networkidle'});await page.waitForSelector('.team-full-roster-section');
 const baseline=await page.evaluate(()=>['.team-full-roster-section','.team-editorial-comparator','.probable-lineup-board'].map(sel=>(()=>{const el=document.querySelector(sel)?.cloneNode(true);el?.querySelectorAll('img[data-player-photo]').forEach(img=>{img.removeAttribute('src');img.classList.remove('is-fallback')});return el?.outerHTML})()));
 await page.unroute('**/js/team-squads.js?*');
 for(const width of [1280,768,390]){
 await page.setViewportSize({width,height:1000});await page.goto(url,{waitUntil:'networkidle'});await page.waitForSelector('.team-tactical-analysis');
 const current=await page.evaluate(()=>['.team-full-roster-section','.team-editorial-comparator','.probable-lineup-board'].map(sel=>(()=>{const el=document.querySelector(sel)?.cloneNode(true);el?.querySelectorAll('img[data-player-photo]').forEach(img=>{img.removeAttribute('src');img.classList.remove('is-fallback')});return el?.outerHTML})()));current.forEach((html,i)=>{if(html!==baseline[i]){let k=0;while(html[k]===baseline[i][k])k++;throw new Error(`${team} blocco ${i} differenza ${k}: ${html.slice(k-80,k+160)} BASE ${baseline[i].slice(k-80,k+160)}`)}});
 assert.equal(await page.locator('.team-key-numbers>div').count(),5);
 const text=await page.locator('#team-squad-app').innerText();for(const removed of ['La stagione in numeri','La stagione in sintesi','Come vengono calcolati','Statistiche approfondite','Precisione dei passaggi','Duelli aerei vinti','Modulo più usato'])assert(!text.includes(removed),removed);
 for(const selector of ['.team-style-traits','.squad-leader-card','.team-attack-channel-bars'])for(const item of await page.locator(selector).all())assert(await item.isVisible(),`${selector} visibile`);
 assert(await page.locator('.squad-leader-card').count()>=8);
 assert(await page.evaluate(()=>[...document.querySelectorAll('.team-page-jumps a[href^="#"]')].every(a=>document.querySelector(a.getAttribute('href')))));
 const layout=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,width:innerWidth,main:document.querySelector('#team-squad-app').getBoundingClientRect().width}));assert(layout.scroll<=width,`${team} ${width}: overflow ${layout.scroll}`);assert(layout.main<=1050);
 await page.locator('#player-search').fill('zzzzinesistente');assert.equal(await page.locator('.squad-table tbody tr').count(),0);await page.locator('#player-search').fill('');assert(await page.locator('.squad-table tbody tr').count()>0);
 await page.locator('#role-filter').selectOption('Portiere');assert(await page.locator('.squad-table tbody tr').count()>0);await page.locator('#role-filter').selectOption('');
 await page.locator('#player-sort').selectOption('minutes');
 const minutes=await page.locator('.squad-table tbody tr').evaluateAll(rows=>rows.map(row=>Number(row.children[5].textContent)));assert.deepEqual(minutes,minutes.slice().sort((a,b)=>b-a));await page.locator('#player-sort').selectOption('role');
 await page.locator('.player-open').first().click();assert(await page.locator('#player-detail').isVisible());await page.locator('.player-detail-close').click();
 assert.equal(await page.locator('.team-editorial-statistics .team-season-heading').evaluate(el=>getComputedStyle(el,'::after').content),'none');
 assert(!/\d+[,\.]\d{5}/.test(await page.locator('.team-editorial-statistics').innerText()));
 await page.locator('#team-comparator-disclosure>summary').click();assert(await page.locator('[data-team-comparator-result] table').isVisible());
 await page.locator('[data-team-comparator]').first().fill('zzzzinesistente');assert(await page.locator('.player-suggestions-empty').isVisible());await page.locator('[data-team-comparator]').first().press('Escape');
 await page.locator('#team-comparator-disclosure>summary').click();
 if(team==='atalanta')await page.screenshot({path:path.join("C:/Users/utente/.codex/visualizations/2026/10/16/01a144bf-1ff8-7ca1-839f-d2989428d3f6",`serie-a-team-${width}.png`),fullPage:true});
 console.log(`${team} ${width}px: layout, ancore, analisi, classifiche, rosa e comparatore OK`);
 }
}
assert.deepEqual(errors,[]);console.log('9 verifiche responsive superate; nessun errore JavaScript.');
}finally{await browser.close();server.close()}})().catch(e=>{console.error(e);server.close();process.exitCode=1});
