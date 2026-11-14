const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('C:/Users/utente/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'data/analysis/champions/md3-settlement-2026-10-22');
const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.css':'text/css','.svg':'image/svg+xml','.png':'image/png'};
const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!file.startsWith(root+path.sep))return res.writeHead(403).end();fs.readFile(file,(e,b)=>{res.writeHead(e?404:200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'});res.end(e?'Missing':b)})});
(async()=>{fs.mkdirSync(out,{recursive:true});await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;const results=[];
try{browser=await chromium.launch({channel:'msedge',headless:true});
for(const width of [1440,390]){
 const page=await browser.newPage({viewport:{width,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://fonts.googleapis.com/**',r=>r.abort());await page.route('https://fonts.gstatic.com/**',r=>r.abort());
 await page.goto(`http://127.0.0.1:${server.address().port}/schedina.html?competizione=champions&giornata=3`);
 await page.waitForSelector('[data-champions-workspace="3"]',{timeout:60000});
 await page.locator('[data-match-open-all]').first().click();
 const counts=await page.locator('[data-selection-row][data-settlement]').evaluateAll(rows=>rows.reduce((a,r)=>(a[r.dataset.settlement]=(a[r.dataset.settlement]||0)+1,a),{}));
 assert(counts.won>0&&counts.lost>0);assert.equal(await page.locator('[data-selection-label*="Andy Diouf"]').count(),0);
 assert.equal(await page.locator('[data-personal-pick]').count(),0,'Finished matches cannot be newly saved');
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
 assert.deepEqual(errors,[]);await page.screenshot({path:path.join(out,`schedina-${width}.png`),fullPage:true});
 results.push({width,counts,overflow:false,errors});await page.close();
}
fs.writeFileSync(path.join(out,'browser.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results));
}finally{await browser?.close();server.close()}})().catch(e=>{console.error(e);server.close();process.exitCode=1});
