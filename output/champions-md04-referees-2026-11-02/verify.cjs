const fs=require('node:fs'),http=require('node:http'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('C:/Users/utente/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=process.cwd(),dir=__dirname;
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const before=read(path.join(dir,'calendar-before.json')),after=read('data/normalized/champions-league-2026-27.json');
const sourceBefore=read(path.join(dir,'assignments-before.json')),source=read('data/sources/champions-referee-assignments-md04-2026-27.json');
assert.deepEqual(source.assignments.slice(0,9),sourceBefore.assignments.slice(0,9));
const targets=after.fixtures.filter(f=>f.matchday===4&&f.date==='2026-11-04');assert.equal(targets.length,9);
for(let i=0;i<before.fixtures.length;i++){
 const b={...before.fixtures[i]},a={...after.fixtures[i]};
 if(targets.some(f=>f.id===a.id)){delete a.refereeAssignment;delete b.refereeAssignment;delete a.refereeAttention;delete b.refereeAttention;}
 assert.deepEqual(a,b);
}
for(const f of targets){assert.equal(f.refereeAssignment.status,'assigned');assert.equal(f.refereeAssignment.statistics,null);assert(f.refereeAssignment.var);}
const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.css':'text/css','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!file.startsWith(root+path.sep))return res.writeHead(403).end();fs.readFile(file,(err,b)=>{res.writeHead(err?404:200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'});res.end(err?'Missing':b)});});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;const results=[];try{browser=await chromium.launch({headless:true,channel:'msedge'});for(const width of [1440,390]){const page=await browser.newPage({viewport:{width,height:1000}});for(const f of targets){await page.goto(`http://127.0.0.1:${server.address().port}/champions-league.html?match=${f.id}`);const panel=page.locator('#lettura-referee');await panel.waitFor();const text=await panel.innerText();assert(text.includes(f.refereeAssignment.referee.name),f.id+': referee');assert(text.includes(f.refereeAssignment.var),f.id+': VAR');assert(!text.includes('N/D'),f.id+': no missing placeholders');assert(!text.includes('Statistiche arbitrali non disponibili'),f.id+': no missing-data note');for(const name of [...(f.refereeAssignment.assistants||[]),f.refereeAssignment.fourthOfficial,f.refereeAssignment.avar].filter(Boolean))assert(text.includes(name),f.id+': '+name);assert(!text.includes('Calvar'));const bounds=await panel.boundingBox();assert(bounds.width<=width,f.id+': overflow');if(f.id.endsWith('13'))await page.screenshot({path:path.join(dir,`porto-napoli-${width}.png`),fullPage:false});results.push({id:f.id,width,status:'PASS'});}await page.close();}fs.writeFileSync(path.join(dir,'verification.json'),JSON.stringify({invariants:'PASS',checks:results},null,2));console.log('PASS: unchanged unrelated fixture fields, Tuesday preserved; 18 desktop/mobile reading checks');}finally{if(browser)await browser.close();server.close();}})().catch(e=>{console.error(e);process.exitCode=1});

