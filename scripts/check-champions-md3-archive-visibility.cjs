const {chromium}=require('C:/Users/utente/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('fs'),assert=require('assert/strict');
const out='data/analysis/champions/md3-callups-cl3-2026-10-19';
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});let findings=[];
try{for(const [width,touch] of [[1440,false],[390,true],[320,true]]){
 const context=await browser.newContext({viewport:{width,height:1000},isMobile:touch,hasTouch:touch});const page=await context.newPage(),errors=[],failed=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)failed.push({url:r.url(),status:r.status()})});page.on('requestfailed',r=>failed.push({url:r.url(),error:r.failure()?.errorText}));
 await page.goto('http://127.0.0.1:8766/schedina.html',{waitUntil:'networkidle'});await page.waitForTimeout(700);
 const cards=page.locator('[data-champions-matchday]'),n=await cards.count();
 const geometry=await cards.evaluateAll(ns=>ns.map(n=>({day:n.dataset.championsMatchday,rect:n.getBoundingClientRect().toJSON(),display:getComputedStyle(n).display,visibility:getComputedStyle(n).visibility})));
 findings.push({width,touch,cards:n,geometry,errors,failed,text:(await page.locator('#app').innerText()).slice(0,1500)});
 await page.screenshot({path:`${out}/archive-before-${width}.png`,fullPage:true});
 const cl3=page.locator('[data-champions-matchday="3"]');if(await cl3.count()){await cl3.scrollIntoViewIfNeeded();if(touch)await cl3.locator('.team-flip-front').tap();else await cl3.hover();await page.waitForTimeout(600);await page.screenshot({path:`${out}/cl3-back-${width}.png`});}
 await context.close();
}fs.writeFileSync(`${out}/archive-before.json`,JSON.stringify(findings,null,2));console.log(JSON.stringify(findings));}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});

