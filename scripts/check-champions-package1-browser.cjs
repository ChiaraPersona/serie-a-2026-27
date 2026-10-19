const {chromium}=require('C:/Users/utente/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const http=require('http'),fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..'),out=path.join(root,'data/analysis/champions/package1-2026-10-19');
const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.css':'text/css'};
const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}fs.readFile(file,(err,b)=>{res.writeHead(err?404:200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'});res.end(err?'Missing':b);});});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
  browser=await chromium.launch({headless:true,channel:'msedge'});
  const page=await browser.newPage(),results=[];let errors=[];page.on('pageerror',e=>errors.push(e.message));
  const fixtures=JSON.parse(fs.readFileSync(path.join(out,'md3-coverage.json'),'utf8'));
  for(const width of [1280,390]){
   await page.setViewportSize({width,height:900});
   for(const target of [...fixtures.map(f=>({id:f.fixtureId,url:`champions-league.html?match=${f.fixtureId}`})),{id:'schedina',url:'schedina.html?competizione=champions'},{id:'calendar',url:'champions-league.html'}]){
    errors=[];await page.goto(`http://127.0.0.1:${server.address().port}/${target.url}`,{waitUntil:'networkidle'});
    const state=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,text:document.querySelector('#app')?.innerText||document.body.innerText}));
    results.push({width,id:target.id,overflow:state.overflow,errors:[...errors],hasContent:state.text.length>100,unavailable:/non disponibile|non ancora|N\/D/i.test(state.text),textSample:state.text.slice(-650)});
    if(target.id==='ucl-2026-27-md03-01'||target.id==='schedina')await page.screenshot({path:path.join(out,`${target.id}-${width}.png`),fullPage:true});
   }
  }
  fs.writeFileSync(path.join(out,'browser-results.json'),JSON.stringify(results,null,2)+'\n');
  console.log(JSON.stringify({checks:results.length,overflows:results.filter(r=>r.overflow).length,errors:results.filter(r=>r.errors.length).length,empty:results.filter(r=>!r.hasContent).length}));
  if(results.some(r=>r.overflow||r.errors.length||!r.hasContent))process.exitCode=1;
 }finally{if(browser)await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
