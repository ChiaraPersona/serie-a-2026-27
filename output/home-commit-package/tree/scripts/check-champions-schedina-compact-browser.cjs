'use strict';
const {chromium}=require('C:/Users/utente/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const server=http.createServer((req,res)=>{
  const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  fs.readFile(file,(error,bytes)=>{res.writeHead(error?404:200,{'Content-Type':({'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.css':'text/css','.svg':'image/svg+xml','.png':'image/png'})[path.extname(file)]||'application/octet-stream'});res.end(error?'Missing':bytes)});
});
(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  let browser;
  try{
    browser=await chromium.launch({headless:true,channel:'msedge'});
    const page=await browser.newPage(),errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    const base=`http://127.0.0.1:${server.address().port}`;
    for(const width of [1440,390])for(const day of [1,2,3]){
      await page.setViewportSize({width,height:900});
      await page.goto(`${base}/schedina.html?competizione=champions&giornata=${day}`,{waitUntil:'networkidle'});
      await page.waitForSelector(`[data-champions-workspace="${day}"] [data-match-panel]`);
      const panels=page.locator(`[data-champions-workspace="${day}"] [data-match-panel]`);
      assert.equal(await panels.count(),18,`giornata ${day}`);
      assert.equal(await page.locator('.betting-team-forecast').count(),0);
      assert.equal(await page.getByText('MyCombo · N/D — Nessuna combinazione approvata.').count(),0);
      assert.equal(await page.locator('[data-champions-combo-status]').count(),0);
      for(let i=0;i<Math.min(await panels.count(),2);i++){
        const panel=panels.nth(i);
        await panel.locator(':scope > summary').click();
        const check=await panel.evaluate(node=>{
          const summary=node.querySelector(':scope > summary'),body=node.querySelector(':scope > .betting-match-body'),first=[...body.children].find(child=>getComputedStyle(child).display!=='none');
          return {first:first?.className||'',gap:Math.round(first.getBoundingClientRect().top-summary.getBoundingClientRect().bottom),empty:body.children.length===0};
        });
        assert(!check.empty);
        assert(/betting-market-columns|betting-market-list|betting-market-empty/.test(check.first),`first content ${day}: ${check.first}`);
        assert(check.gap>=0&&check.gap<=18,`spacing ${day}/${width}: ${check.gap}`);
      }
      assert(!(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)),`overflow ${day}/${width}`);
      assert.deepEqual(errors,[],`page errors ${day}/${width}`);
    }
    console.log('PASS Champions Schedina: MD1–MD3, 18 cards per day, no forecast summary, compact first row, desktop/mobile');
  }finally{await browser?.close();server.close();}
})().catch(error=>{console.error(error);server.close();process.exitCode=1});
