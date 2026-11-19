const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('C:/Users/utente/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'output/champions-booking-hypotheses');
const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.css':'text/css','.svg':'image/svg+xml','.webp':'image/webp'};
const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!file.startsWith(root+path.sep))return res.writeHead(403).end();fs.readFile(file,(e,b)=>{res.writeHead(e?404:200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'});res.end(e?'Missing':b)});});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;try{
 fs.mkdirSync(out,{recursive:true});browser=await chromium.launch({headless:true,channel:'chrome'});
 const data=JSON.parse(fs.readFileSync(path.join(root,'data/generated/champions-booking-hypotheses.json')));
 if(process.argv.includes('--smoke'))data.fixtures=data.fixtures.filter((f,i)=>i===0||f.likelyBooked.some(p=>p.team==='Roma'));
 for(const width of [1440,390]){const page=await browser.newPage({viewport:{width,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 for(const f of data.fixtures){await page.goto(`http://127.0.0.1:${server.address().port}/champions-league.html?match=${f.fixtureId}`);
 const panel=page.locator('[data-reading-bookings]');await panel.waitFor();assert.equal(await panel.locator('li').count(),f.likelyBooked.length,f.fixtureId);
 assert.match(await panel.innerText(),/Ipotesi preliminari/);for(const p of f.likelyBooked)assert((await panel.innerText()).includes(p.name));
 assert(await panel.locator('li').first().evaluate(li=>{const reference=document.createElement('span');li.append(reference);reference.style.backgroundColor='var(--rd-surface)';reference.style.color='var(--rd-accent)';const expected=getComputedStyle(reference),matches=getComputedStyle(li).backgroundColor===expected.backgroundColor&&getComputedStyle(li.querySelector(':scope > b')).color===expected.color;reference.remove();return matches;}),'Booking rows use reading surface and accent colors');
 assert.equal(await panel.locator('button,[data-rd-pick]').count(),0);assert(!await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2));
 if(f===data.fixtures[0]){await panel.scrollIntoViewIfNeeded();await page.screenshot({path:path.join(out,`bookings-${width}.png`)});}}
 assert.deepEqual(errors,[]);console.log(`PASS ${data.fixtures.length} Champions booking hypotheses and theme colors ${width}px`);await page.close();}
 }finally{await browser?.close();server.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
