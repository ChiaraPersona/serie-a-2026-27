const fs=require('fs'),http=require('http'),path=require('path'),assert=require('assert');
const {chromium}=require(path.resolve(path.dirname(process.execPath),'../node_modules/playwright'));
const root=path.resolve(__dirname,'..');
const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.webp':'image/webp'};
const server=http.createServer((req,res)=>{const relative=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\//,'')||'index.html';const file=path.resolve(root,relative);if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}try{res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));}catch{res.writeHead(404).end();}});
(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base=`http://127.0.0.1:${server.address().port}`;
  const browser=await chromium.launch({channel:'msedge',headless:true});
  const predictions=JSON.parse(fs.readFileSync(path.join(root,'data/normalized/predictions.json'))).predictions.filter(p=>p.matchId.endsWith('md-06'));
  const checks=[],errors=[];
  try{
    for(const width of [1280,390]){
      const page=await browser.newPage({viewport:{width,height:900}});page.on('pageerror',e=>errors.push(e.message));
      for(const p of predictions){
        await page.goto(`${base}/lettura.html?match=${encodeURIComponent(p.matchId)}`);await page.waitForSelector('.prediction-v2-discipline');
        const data=await page.evaluate(()=>({text:document.querySelector('.prediction-v2-discipline').textContent,candidates:[...document.querySelectorAll('.prediction-booked-panel ol li strong')].map(n=>n.textContent),overflow:document.documentElement.scrollWidth>innerWidth+1}));
        assert(data.text.includes('Gialli · baseline storica'));assert(data.text.includes('euristica'));assert(data.text.includes('Arbitro non designato: fallback 1'));assert(!data.text.includes('Cartellini previsti'));assert.deepEqual(data.candidates,p.likelyBooked.map(c=>c.name));assert(!data.overflow);
        checks.push({width,route:p.matchId,passed:true});
      }
      await page.locator('.prediction-v2-discipline').screenshot({path:path.join(root,`output/reports/card-foundation-md06-${width}.png`)});
      await page.goto(`${base}/lettura.html?match=genoa-frosinone-2026-27-md-04`);await page.waitForSelector('.reading-post-match');assert((await page.locator('.reading-post-match').innerText()).includes('espulsione per secondo giallo'));checks.push({width,route:'Johan Vasquez',passed:true});
      await page.goto(`${base}/lettura.html?match=genoa-napoli-2026-27-md-01`);await page.waitForSelector('.reading-post-match');assert((await page.locator('.reading-post-match').innerText()).includes('Stefano Sabelli'));checks.push({width,route:'Stefano Sabelli',passed:true});
      await page.goto(`${base}/schedina.html?giornata=5`);await page.waitForSelector('.betting-slip',{timeout:10000}).catch(async e=>{console.error('Betting DOM:',await page.locator('#app').textContent(),'Errors:',errors);throw e;});const text=await page.locator('#app').textContent();assert(text.includes('Indice euristico non calibrato'));assert(text.includes('target da verificare'));assert(!await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1));checks.push({width,route:'Schedina MD5 legacy + current review',passed:true});
      await page.goto(`${base}/schedina.html?competizione=champions`);await page.waitForSelector('.betting-slip--champions');for(const card of await page.locator('.betting-slip--champions').all()){const t=await card.textContent();if(t.includes('Poker ammoniti'))assert(t.includes('Indice euristico non calibrato'));}checks.push({width,route:'Champions card heuristic semantics',passed:true});
      await page.close();
    }
    assert.deepEqual(errors,[]);
    fs.writeFileSync(path.join(root,'output/reports/card-foundation-browser-2026-10-03.json'),JSON.stringify({checks,errors,passed:checks.length,failed:0},null,2)+'\n');
    console.log(`Browser: ${checks.length} checks passed at 1280/390px, no page errors or overflow`);
  }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
