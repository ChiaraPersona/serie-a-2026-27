const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('C:/Users/utente/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),phase=process.argv.includes('--baseline')?'before':'after',out=path.join(root,'reports/reading-loading');fs.mkdirSync(out,{recursive:true});
const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.css':'text/css','.svg':'image/svg+xml','.png':'image/png'};
const server=http.createServer((req,res)=>{const f=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!f.startsWith(root+path.sep))return res.writeHead(403).end();fs.readFile(f,(e,b)=>{res.writeHead(e?404:200,{'Content-Type':types[path.extname(f)]||'application/octet-stream'});res.end(e?'Missing':b)})});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({channel:'msedge',headless:true});const results=[];
try{for(const width of [1440,390])for(const id of ['', 'fiorentina-como-2026-27-md-07','milan-atalanta-2026-27-md-07','atalanta-frosinone-2026-27-md-08','invalid']){
 const page=await browser.newPage({viewport:{width,height:1000}}),errors=[],requests=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('response',r=>{const u=new URL(r.url());if(u.pathname.endsWith('.json'))requests.push({path:u.pathname.slice(1),status:r.status(),bytes:fs.existsSync(path.join(root,u.pathname))?fs.statSync(path.join(root,u.pathname)).size:0})});
 await page.goto(`http://127.0.0.1:${server.address().port}/lettura.html${id?'?match='+id:''}`);await page.waitForSelector(id&&id!=='invalid'?'.rd-shell':'.readings-index');await page.waitForLoadState('networkidle');
 assert.deepEqual(errors,[]);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`overflow ${id} ${width}`);
 if(!id||id==='invalid'){
  const matches=JSON.parse(fs.readFileSync(path.join(root,'data/normalized/matches.json'))).filter(m=>m.competition==='serie-a');
  const links=await page.evaluate(()=>[...document.querySelectorAll('[data-fixture-id],template')].flatMap(n=>n.tagName==='TEMPLATE'?[...n.content.querySelectorAll('[data-fixture-id]')].map(x=>x.dataset.fixtureId):n.dataset.fixtureId?[n.dataset.fixtureId]:[]));
  assert.deepEqual(links.sort(),matches.map(m=>m.id).sort());
  const archive=page.locator('[data-archive-day]').first();await archive.click();assert.equal(await archive.getAttribute('aria-expanded'),'true');await archive.click();assert.equal(await archive.getAttribute('aria-expanded'),'false');
  const future=page.locator('.ri-calendar-day').last();await future.locator('summary').click();await future.locator('.ri-match').first().waitFor({state:'visible'});await future.locator('summary').click();
 }else{
  for(const key of ['formazioni','giocatori','disciplina','tattica','storico','verifica']){const nav=page.locator(`.rd-nav a[href="#lettura-${key}"]`);if(await nav.count()){await nav.click();assert(await page.locator('#lettura-'+key).isVisible());}}
 }
 const text=await page.locator('#app').innerText(),html=await page.locator('#app').innerHTML();
 const key=`${id||'index'}-${width}`;fs.writeFileSync(path.join(out,`${phase}-${key}.html`),html);await page.screenshot({path:path.join(out,`${phase}-${key}.png`),fullPage:true});
 if(phase==='after'){const baseline=JSON.parse(fs.readFileSync(path.join(out,'before.json'))).find(r=>r.key===key);assert.equal(text,baseline.text,`content changed ${key}`);}
 results.push({key,width,id,text,jsonBytes:requests.reduce((n,r)=>n+r.bytes,0),requests,errors});await page.close();
}fs.writeFileSync(path.join(out,phase+'.json'),JSON.stringify(results,null,2));console.log(results.map(({key,jsonBytes})=>({key,jsonBytes})));}finally{await browser.close();server.close()}})().catch(e=>{console.error(e);server.close();process.exitCode=1});


