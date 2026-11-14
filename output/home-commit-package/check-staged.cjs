// Throwaway preview: section separators on the current home; production files stay untouched.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('C:/Users/utente/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve("output/home-commit-package/tree"),out=path.join(root,'output/home-standings-timeline');
fs.mkdirSync(out,{recursive:true});
const types={'.html':'text/html','.js':'application/javascript','.mjs':'application/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.svg':'image/svg+xml','.png':'image/png'};
const server=http.createServer((req,res)=>{const file=path.join(root,decodeURIComponent(new URL(req.url,'http://localhost').pathname));fs.readFile(file,(err,data)=>{if(err){res.writeHead(404);res.end();return}res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');res.end(data)})});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const url='http://127.0.0.1:'+server.address().port;const browser=await chromium.launch({headless:true,executablePath:'C:/Users/utente/AppData/Local/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-win64/chrome-headless-shell.exe'});const page=await browser.newPage({reducedMotion:'reduce'});await page.route('**/*',async route=>{const u=new URL(route.request().url());if(u.hostname!=='preview.local'){await route.abort();return}let f=path.join(root,decodeURIComponent(u.pathname));if(!fs.existsSync(f))f=path.join(process.cwd(),decodeURIComponent(u.pathname));try{await route.fulfill({body:fs.readFileSync(f),contentType:types[path.extname(f)]||'application/octet-stream'})}catch{await route.fulfill({status:404,body:''})}});for(const [name,width] of [['desktop',1440],['mobile',390],['small-mobile',320]]){await page.setViewportSize({width,height:1000});await page.goto('https://preview.local/index.html');await page.waitForSelector('#standings-matchday');
const assert=require('node:assert/strict');
await page.locator('#standings-matchday').fill('7');
const fixtureData=JSON.parse(fs.readFileSync(path.join(root,'data/normalized/matches.json'))).filter(m=>m.competition==='serie-a'&&m.status==='finished'&&m.matchday<=7);
const {calculateStandings}=require(path.join(root,'scripts/standings.js'));
const teams=JSON.parse(fs.readFileSync(path.join(root,'data/normalized/teams.json')));
for(const scope of ['general','home','away']){
 await page.locator('[data-standings-scope-tab="'+scope+'"]').click();
 const actual=await page.locator('[data-standings-panel="current"] [data-standings-scope-panel="'+scope+'"] tbody tr').evaluateAll(rows=>rows.map(row=>({name:row.children[2].textContent.trim(),points:Number(row.children[3].textContent),played:Number(row.children[4].textContent)})));
 const expected=calculateStandings(teams,fixtureData,scope).map(row=>({name:teams.find(t=>t.id===row.team).name,points:row.points,played:row.played}));
 assert.deepEqual(actual,expected);
}
await page.locator('[data-standings-tab="archive"]').click();assert.equal(await page.locator('#standings-matchday').isVisible(),false);assert.equal(await page.locator('[data-standings-archive-note]').isVisible(),true);
await page.locator('[data-standings-tab="current"]').click();assert.equal(await page.locator('#standings-matchday').inputValue(),'7');
await page.locator('[data-standings-scope-tab="general"]').click();
await page.locator('[data-standings-panel="current"] [data-standings-scope-panel="general"] [data-standings-sort="points"]').click();
await page.locator('#standings-matchday').fill('6');await page.locator('#standings-matchday').fill('7');
await page.locator('[data-standings-panel="current"] [data-standings-scope-panel="general"] [data-standings-sort="points"]').click();
assert.equal(await page.locator('[data-standings-panel="current"] [data-standings-scope-panel="general"] th[aria-sort="descending"]').count(),1);
const fits=await page.locator('.home-standings-controls').evaluate(el=>[...el.querySelectorAll('button')].every(b=>b.getBoundingClientRect().right<=el.getBoundingClientRect().right+1));assert(fits,'controls overflow');
console.log(name+': MD7 general/home/away match canonical calculations; seasons and sorting OK');
await page.evaluate(()=>window.scrollTo(0,0));console.log(await page.evaluate(()=>({height:document.documentElement.scrollHeight,sections:[...document.querySelectorAll('.hero,.home-dashboard,.home-standings')].map(e=>({class:e.className,y:e.getBoundingClientRect().y,height:e.getBoundingClientRect().height}))})));await page.waitForTimeout(700);await page.screenshot({path:path.join(out,name+'.png'),fullPage:false});await page.evaluate(()=>window.scrollTo(0,document.querySelector('.home-standings').getBoundingClientRect().top+window.scrollY-240));await page.waitForTimeout(300);await page.waitForTimeout(700);await page.screenshot({path:path.join(out,name+'-classifica.png'),fullPage:false});console.log(name+': preview saved');}await browser.close();server.close()})().catch(e=>{console.error(e);server.close();process.exitCode=1});




