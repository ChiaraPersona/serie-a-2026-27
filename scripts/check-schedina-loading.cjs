'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url'),{gzipSync}=require('node:zlib');
const deps='C:/Users/utente/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
const {chromium}=require(deps+'/playwright'),{PNG}=require(deps+'/pngjs');
const root=path.resolve(__dirname,'..'),out=path.join(root,'output/reports/schedina-loading');
const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg'};
const server=http.createServer((req,res)=>{
  const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
  if(!file.startsWith(root+path.sep)||file.includes(path.sep+'.git'+path.sep))return res.writeHead(403).end();
  fs.readFile(file,(e,b)=>{res.writeHead(e?404:200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(e?'Missing':b)});
});
const sizes=new Map();
function weight(urls){return urls.reduce((sum,url)=>{
  if(!sizes.has(url)){const b=fs.readFileSync(path.join(root,url));sizes.set(url,{raw:b.length,gzip:gzipSync(b).length})}
  const s=sizes.get(url);return {raw:sum.raw+s.raw,gzip:sum.gzip+s.gzip};
},{raw:0,gzip:0});}
const snapshot=page=>page.locator('#app').evaluate(n=>({html:n.innerHTML,text:n.innerText,overflow:document.documentElement.scrollWidth>innerWidth+1}));
(async()=>{
  const {default:pixelmatch}=await import(pathToFileURL(deps+'/pixelmatch/index.js').href);
  await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`;
  let browser;const results=[];
  try{
    browser=await chromium.launch({channel:'msedge',headless:true});
    const queries=['',...[1,2,3,4,5,6,7].map(n=>`?giornata=${n}`),...[1,2,3].map(n=>`?competizione=champions&giornata=${n}`)];
    let cases=queries.map(query=>({query,width:1440}));
    cases.push(...['','?giornata=5','?giornata=7','?competizione=champions&giornata=2','?competizione=champions&giornata=3'].map(query=>({query,width:390})));
    if(process.argv.includes('--interactive-only'))cases=[1440,390].map(width=>({query:'?giornata=7',width,simulateUpcoming:true}));
    for(const [i,test] of cases.entries()){
      const pair=[];
      for(const baseline of [true,false]){
        const context=await browser.newContext({viewport:{width:test.width,height:1000},reducedMotion:'reduce'});
        try{
          const page=await context.newPage(),urls=[],errors=[];
          page.on('pageerror',e=>errors.push(e.message));
          page.on('request',r=>{const u=new URL(r.url());if(u.origin===base&&u.pathname.endsWith('.json'))urls.push(u.pathname.slice(1))});
          await page.route('https://fonts.googleapis.com/**',r=>r.abort());await page.route('https://fonts.gstatic.com/**',r=>r.abort());
          // Isolated test response only: current archives are all completed and
          // correctly disable new bets. Enable one fixture to exercise persistence.
          if(test.simulateUpcoming){
            const matches=JSON.parse(fs.readFileSync(path.join(root,'data/normalized/matches.json')));
            const fixture=matches.find(m=>m.id==='bologna-inter-2026-27-md-07');
            fixture.status='scheduled';fixture.score=null;
            await page.route('**/data/normalized/matches.json*',r=>r.fulfill({contentType:'application/json',body:JSON.stringify(matches)}));
          }
          if(baseline)for(const [route,file] of [['**/js/pages/betting.js*','betting.js'],['**/js/services/data-service.js*','data-service.js'],['**/js/core/app.js*','app.js']]){
            await page.route(route,r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync(path.join(out,'baseline',file))}));
          }
          const navigate=async()=>{await page.goto(base+'/schedina.html'+test.query,{timeout:90000});await page.waitForSelector(test.query?'#app .betting-round-page':'#app .betting-archive',{timeout:90000});await page.waitForLoadState('networkidle');};
          await navigate();assert.deepEqual(errors,[],test.query+' errors');
          const state=await snapshot(page),initialUrls=urls.slice();
          const image=await page.screenshot({path:path.join(out,`${test.simulateUpcoming?'interactive-':''}${i}-${test.width}-${baseline?'before':'after'}.png`),animations:'disabled'});
          if(!baseline){const counts=new Map();for(const u of initialUrls)counts.set(u,(counts.get(u)||0)+1);assert([...counts.values()].every(n=>n===1),'Duplicate JSON request: '+test.query);}
          // Same disclosure and open-all actions, including MyCombo/archive details.
          await page.locator('#app details > summary').evaluateAll(nodes=>nodes.forEach(n=>n.click()));
          const openAll=page.locator('[data-match-open-all]').first();if(await openAll.count())await openAll.click();
          const expanded=await snapshot(page);
          let persistence='no playable control in this archive';
          const pick=page.locator('[data-personal-pick]:not([disabled]):not([aria-disabled="true"])').first();
          let selected=null,restored=null;
          if(await pick.count()){
            const id=await pick.getAttribute('data-personal-pick');
            await pick.click({force:true});
            selected=await page.locator('[data-personal-content]').innerText();
            assert(await page.locator('[data-personal-remove]').count(),'Selection not stored');
            await navigate();
            restored=await page.locator('[data-personal-content]').innerText();assert.equal(restored,selected,'Saved selection lost on reload');
            assert(await page.locator(`[data-personal-pick="${id}"][aria-pressed="true"]`).count());
            await page.locator('[data-personal-remove]').first().click({force:true});
            assert.equal(await page.locator('[data-personal-remove]').count(),0);
            persistence='add, restore on reload, remove: PASS';
          }
          if(test.simulateUpcoming)assert.equal(persistence,'add, restore on reload, remove: PASS');
          pair.push({state,expanded,selected,restored,persistence,image,urls:initialUrls,weight:weight(initialUrls)});
        }finally{await context.close()}
      }
      assert.deepEqual(pair[1].state,pair[0].state,test.query+' DOM changed');
      assert.deepEqual(pair[1].expanded,pair[0].expanded,test.query+' expanded state changed');
      assert.equal(pair[1].selected,pair[0].selected,test.query+' saved pick changed');
      assert.equal(pair[1].restored,pair[0].restored,test.query+' restored pick changed');
      const a=PNG.sync.read(pair[0].image),b=PNG.sync.read(pair[1].image);
      assert.equal(pixelmatch(a.data,b.data,null,a.width,a.height,{threshold:0.1}),0,test.query+' visual difference');
      results.push({...test,before:{...pair[0].weight,requests:pair[0].urls.length},after:{...pair[1].weight,requests:pair[1].urls.length},resources:pair[1].urls,persistence:pair[1].persistence,dom:'IDENTICAL',visualDifferences:0,overflow:pair[1].state.overflow});
      fs.writeFileSync(path.join(out,test.simulateUpcoming?'interactive-audit.json':'audit.json'),JSON.stringify({results,fontComparison:'External fonts blocked equally',visualThreshold:0.1},null,2)+'\n');
      console.log('PASS',test.query||'index',test.width,JSON.stringify(results.at(-1)));
    }
  }finally{await browser?.close();await new Promise(r=>server.close(r))}
})().catch(e=>{console.error(e.message);process.exitCode=1;server.close()});
