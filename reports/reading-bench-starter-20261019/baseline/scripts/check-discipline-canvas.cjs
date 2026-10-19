const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('C:/Users/utente/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),dest=path.join(root,'reports/referee-dashboard');fs.mkdirSync(dest,{recursive:true});
const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png'};
const server=http.createServer((req,res)=>{const f=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!f.startsWith(root+path.sep))return res.writeHead(403).end();fs.readFile(f,(e,b)=>{res.writeHead(e?404:200,{'Content-Type':types[path.extname(f)]||'application/octet-stream'});res.end(e?'Missing':b);});});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;try{
 browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage(),checks=[],errors=[];page.on('pageerror',e=>errors.push(e.message));
 const target='.rd-shell #lettura-disciplina>.rd-section-content>:is(.prediction-booked-panel,.reading-referee-assignment.rf-panel,.champions-player-predictions)';
 const capture=()=>page.evaluate(target=>{
  const section=document.querySelector('#lettura-disciplina');const origin=section.getBoundingClientRect();
  const styles=el=>{const s=getComputedStyle(el),r=el.getBoundingClientRect();return {cls:el.className,bg:s.background,border:s.borderColor,shadow:s.boxShadow,padding:s.padding,margin:s.margin,x:r.x-origin.x,y:r.y-origin.y,width:r.width,height:r.height};};
  return {outer:[...document.querySelectorAll(target)].map(styles),inside:[...section.querySelectorAll('.rf-card,.prediction-booked-panel li,.prediction-booked-panel header')].map(styles),other:[...document.querySelectorAll('.rd-section:not(#lettura-disciplina)')].map(el=>({html:el.innerHTML,style:styles(el)})),overflow:document.documentElement.scrollWidth>innerWidth+1};
 },target);
 for(const [competition,id] of [['serie-a','juventus-lazio-2026-27-md-07'],['champions','ucl-2026-27-md02-05'],['champions','ucl-2026-27-md01-01']])for(const width of [1440,390]){
  await page.setViewportSize({width,height:1000});const url=`http://127.0.0.1:${server.address().port}/${competition==='serie-a'?'lettura':'champions-league'}.html?match=${id}`;
  await page.route('**/css/reading-detail.css*',r=>r.fulfill({path:path.join(root,'reports/discipline-canvas/before.css'),contentType:'text/css'}));await page.goto(url);await page.waitForSelector('.rf-dashboard');const before=await capture();
  await page.unroute('**/css/reading-detail.css*');await page.reload();await page.waitForSelector('.rf-dashboard');const after=await capture();
  assert.deepEqual(after.inside,before.inside,'Inner cards changed '+id);assert(!after.overflow,id+' overflow');
  const normalize=s=>s.replace(/lineup-kit-\d+/g,'lineup-kit-TEST');assert.equal(normalize(JSON.stringify(after.other)),normalize(JSON.stringify(before.other)),'Other sections changed');
  assert(after.outer.length>0);for(let i=0;i<after.outer.length;i++){const a=after.outer[i],b=before.outer[i];assert(a.bg.startsWith('rgba(0, 0, 0, 0) none'));assert.equal(a.shadow,'none');assert.equal(a.border,'rgba(0, 0, 0, 0)');for(const k of ['x','y','width','height','padding','margin'])assert.equal(a[k],b[k],id+' spacing '+k);}
  await page.locator('#lettura-disciplina').screenshot({path:path.join(root,`reports/discipline-canvas/${id}-${width}.png`),style:'.site-header,.rd-nav{visibility:hidden!important}'});checks.push({id,width,outer:after.outer,innerCards:'UNCHANGED',spacing:'UNCHANGED',otherSections:'UNCHANGED'});
 }
 assert.deepEqual(errors,[]);fs.writeFileSync(path.join(root,'reports/discipline-canvas/checks.json'),JSON.stringify({checks,errors},null,2));console.log('PASS: '+checks.length+' before/after desktop/mobile comparisons; inner cards, geometry and other sections unchanged.');
 }finally{await browser?.close();server.close()}})().catch(e=>{console.error(e);process.exitCode=1;server.close()});
