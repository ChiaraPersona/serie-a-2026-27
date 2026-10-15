const {chromium}=require('C:/Users/utente/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('fs'),path=require('path'),http=require('http'),cp=require('child_process'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..');
const old=new Map(['css/home.css','js/pages/home.js','css/buttons.css'].map(p=>[p,cp.execFileSync('git',['show','HEAD:'+p])]));
const mime={'.css':'text/css','.js':'text/javascript','.json':'application/json','.html':'text/html','.png':'image/png','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{let p=decodeURIComponent(new URL(req.url,'http://localhost').pathname),before=p.startsWith('/before/');if(before)p=p.slice(7);const rel=p.replace(/^\//,'')||'index.html';try{const body=before&&old.has(rel)?old.get(rel):fs.readFileSync(path.join(root,rel));res.writeHead(200,{'Content-Type':mime[path.extname(rel)]||'application/octet-stream'});res.end(body);}catch{res.writeHead(404).end();}});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({channel:'msedge',headless:true}),page=await browser.newPage(),url='http://127.0.0.1:'+server.address().port,errors=[];page.on('pageerror',e=>errors.push(e.message));
const snapshot=()=>page.evaluate(()=>{
 const properties=['width','height','padding','color','backgroundColor','fontFamily','fontSize','textAlign','border','boxShadow','display'];
 const record=e=>({html:e.outerHTML,styles:[e,...e.querySelectorAll('*')].map(n=>Object.fromEntries(properties.map(p=>[p,getComputedStyle(n)[p]])))});
 return {tables:[...document.querySelectorAll('.standings-table')].map(record),outside:['.site-header','.hero','.home-dashboard','.site-footer'].map(s=>record(document.querySelector(s)))};
});
let combinations=0;
for(const width of [1440,768,390]){
 await page.setViewportSize({width,height:1000});await page.goto(url+'/before/index.html');await page.locator('.standings-table').first().waitFor();await page.evaluate(()=>document.fonts.ready);const before=await snapshot();
 await page.goto(url+'/index.html');await page.locator('.standings-table').first().waitFor();await page.evaluate(()=>document.fonts.ready);assert.deepEqual(await snapshot(),before,'Table or outside section changed at '+width);
 for(const season of ['current','archive'])for(const scope of ['general','home','away']){
 await page.locator(`[data-standings-tab="${season}"]`).click();await page.locator(`[data-standings-panel="${season}"] [data-standings-scope-tab="${scope}"]`).click();
 const panel=page.locator(`[data-standings-panel="${season}"] [data-standings-scope-panel="${scope}"]`);assert(await panel.isVisible());assert.equal(await panel.locator('tbody tr').count(),20);assert.equal(await page.locator('[data-standings-panel]:visible').count(),1);assert.equal(await page.locator('[data-standings-scope-panel]:visible').count(),1);
 assert.equal(await page.locator(`[data-standings-tab="${season}"]`).getAttribute('aria-pressed'),'true');
 await page.waitForTimeout(250);const state=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,buttons:[...document.querySelectorAll('.home-standings nav button')].filter(e=>e.getBoundingClientRect().width).map(e=>({right:e.getBoundingClientRect().right,left:e.getBoundingClientRect().left,active:e.classList.contains('active'),color:getComputedStyle(e).color,bg:getComputedStyle(e).backgroundColor}))}));assert(!state.overflow);assert(state.buttons.every(b=>b.left>=0&&b.right<=width));assert(state.buttons.filter(b=>b.active).every(b=>b.color==='rgb(255, 255, 255)'&&b.bg==='rgb(20, 44, 64)'));combinations++;
 }
 await page.locator('[data-standings-tab="current"]').click();await page.locator('[data-standings-panel="current"] [data-standings-scope-tab="general"]').click();
 await page.locator('.home-standings').screenshot({path:path.join(__dirname,`home-standings-controls-${width}.png`)});
}
assert.deepEqual(errors,[]);console.log(JSON.stringify({widths:[1440,768,390],combinations,tablesAndOtherSections:'identical markup and computed styles',errors}));await browser.close();server.close();})().catch(e=>{console.error(e);process.exit(1)});

