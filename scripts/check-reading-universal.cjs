const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('C:/Users/utente/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..');
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const types={'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.json':'application/json','.css':'text/css','.svg':'image/svg+xml','.png':'image/png'};
const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!file.startsWith(root+path.sep))return res.writeHead(403).end();fs.readFile(file,(e,b)=>{res.writeHead(e?404:200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'});res.end(e?'Missing':b)})});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${server.address().port}`;
 const browser=await chromium.launch({channel:'msedge',headless:true});
 const failures=[],results=[],warnings=[];
 try{
 const page=await browser.newPage();page.on('pageerror',e=>failures.push(e.message));page.on('console',m=>{if(m.type()==='warning'&&m.text().includes('vista precedente'))warnings.push(m.text())});
 await page.route('https://fonts.googleapis.com/**',route=>route.abort());await page.route('https://fonts.gstatic.com/**',route=>route.abort());
 const matches=read('data/normalized/matches.json');
 const serieIds=new Set([...read('data/normalized/readings.json').map(r=>r.matchId),...read('data/normalized/predictions.json').predictions.map(p=>p.matchId)]);
 const clIds=new Set([...read('data/normalized/champions-pilot-predictions-2026-27.json').fixtures,...read('data/normalized/champions-pilot-predictions-md02-2026-27.json').fixtures].map(f=>f.fixtureId));
 const cases=[...matches.filter(m=>serieIds.has(m.id)&&m.competition!=='coppa-italia').map(m=>({id:m.id,route:'lettura.html',status:m.status,score:m.score,competition:'serie-a'})),...read('data/normalized/champions-league-2026-27.json').fixtures.filter(f=>clIds.has(f.id)).map(f=>({id:f.id,route:'champions-league.html',status:f.status,score:f.score,competition:'champions'}))];
 for(const fixture of cases){
  await page.setViewportSize({width:1440,height:1000});await page.goto(`${origin}/${fixture.route}?match=${fixture.id}`);await page.waitForSelector('.rd-shell',{timeout:15000}).catch(()=>{});
  const state=await page.evaluate(()=>({shell:!!document.querySelector('.rd-shell'),sections:[...document.querySelectorAll('.rd-section')].map(n=>n.id),nav:[...document.querySelectorAll('[data-section-link]')].map(n=>n.hash.slice(1)),overflow:document.documentElement.scrollWidth>innerWidth,score:document.querySelector('.rd-result b')?.textContent,theme:document.body.dataset.readingDetailTheme}));
  try{assert(state.shell,fixture.id+': layout missing');assert.deepEqual(state.nav,state.sections);assert(!state.overflow,fixture.id+': overflow');if(fixture.status==='finished'){assert(!state.sections.includes('lettura-pronostici'));if(fixture.score)assert.equal(state.score,`${fixture.score.home} — ${fixture.score.away}`)}assert.equal(state.theme,fixture.competition)}catch(e){failures.push(e.message)}
  results.push({...fixture,...state});console.log(fixture.id,state.shell?'OK':'MISSING');
 }
 const samples=['atalanta-venezia-2026-27-md-06','milan-atalanta-2026-27-md-07','atalanta-sassuolo-2026-27-md-01','ucl-2026-27-md02-05','ucl-2026-27-md01-01'];
 for(const id of samples){const f=cases.find(c=>c.id===id);if(!f)continue;for(const width of [1440,768,390]){await page.setViewportSize({width,height:1000});await page.goto(`${origin}/${f.route}?match=${id}`);await page.waitForSelector('.rd-shell');assert(!await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),id+' '+width+' overflow');const nav=page.locator('[data-section-link="giocatori"]');await nav.click();assert.equal(await nav.getAttribute('aria-current'),'location');const filter=page.locator('[data-player-lineup-filter="starter"]');await filter.click();assert.equal(await filter.getAttribute('aria-pressed'),'true');await filter.click();assert.equal(await page.locator('[data-player-card][hidden]').count(),0);if(width!==768)await page.screenshot({path:path.join(require('os').tmpdir(),`reading-universal-${id}-${width}.png`),fullPage:true});}}
 await page.goto(`${origin}/lettura.html?match=atalanta-venezia-2026-27-md-06&layout=legacy`);await page.waitForSelector('.reading-match-hero');assert.equal(await page.locator('.rd-shell').count(),0);
 fs.writeFileSync(path.join(require('os').tmpdir(),'reading-universal-audit.json'),JSON.stringify({results,failures,warnings},null,2));
 console.log(JSON.stringify({counts:results.reduce((a,r)=>(a[r.competition]=(a[r.competition]||0)+1,a),{}),failures,warnings}));assert.deepEqual(failures,[]);assert.deepEqual(warnings,[]);
 }finally{await browser.close();server.close()}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
