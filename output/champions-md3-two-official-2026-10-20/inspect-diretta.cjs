const {chromium}=require('C:/Users/utente/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs'),path=require('node:path');
const urls=[
 'https://www.diretta.it/partita/calcio/fenerbahce-MsbmracL/slavia-praga-viXGgnyB/riassunto/formazioni/?mid=2yMLTDQr',
 'https://www.diretta.it/partita/calcio/dortmund-nP1i5US1/sabah-baku-fNGcxbyr/riassunto/formazioni/?mid=b9lv0Tme'
];
(async()=>{const browser=await chromium.launch({headless:true,channel:'msedge'});try{
for(let i=0;i<urls.length;i++){
 const page=await browser.newPage();const feeds=[];page.on('response',async r=>{if(/\/x\/feed\/|lineup|formation/i.test(r.url())){let body='';try{body=await r.text()}catch{}feeds.push({url:r.url(),status:r.status(),body:body.slice(0,200000)})}});
 await page.goto(urls[i],{waitUntil:'domcontentloaded',timeout:30000});await page.waitForTimeout(5000);
 const body=await page.locator('body').innerText();fs.writeFileSync(path.join(__dirname,`diretta-${i+1}-rendered.txt`),body);fs.writeFileSync(path.join(__dirname,`diretta-${i+1}-feeds.json`),JSON.stringify(feeds,null,2));
 console.log(i+1,page.url(),body.length,feeds.length,body.slice(0,900));await page.close();
}
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
