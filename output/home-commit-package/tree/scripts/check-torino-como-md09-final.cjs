const { chromium } = require("C:/Users/utente/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");

const root = path.resolve(__dirname, "..");
const types = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".json": "application/json", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg" };
const server = http.createServer((request, response) => {
  const file = path.resolve(root, `.${decodeURIComponent(new URL(request.url, "http://localhost").pathname)}`);
  if (!file.startsWith(`${root}${path.sep}`)) return response.writeHead(403).end();
  fs.readFile(file, (error, body) => {
    response.writeHead(error ? 404 : 200, { "Content-Type": types[path.extname(file)] || "application/octet-stream" });
    response.end(error ? "Missing" : body);
  });
});


(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({channel:'msedge',headless:true}),errors=[],results=[];try{for(const width of [1440,390]){const page=await browser.newPage({viewport:{width,height:1000}});page.on('pageerror',e=>errors.push(e.message));const origin='http://127.0.0.1:'+server.address().port;await page.route('https://fonts.googleapis.com/**',r=>r.abort());await page.route('https://fonts.gstatic.com/**',r=>r.abort());
await page.goto(origin+'/lettura.html?match=torino-como-2026-27-md-09',{waitUntil:'networkidle'});await page.waitForSelector('.rd-shell');const text=await page.locator('main').innerText();assert(/1\s*[—–-]\s*3/.test(text),text.slice(0,500));assert(/PARTITA CONCLUSA/i.test(text));assert(!await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth));await page.screenshot({path:'output/md09-final-2026-10-28/lettura-'+width+'.png',fullPage:false});
await page.goto(origin+'/schedina.html?giornata=9',{waitUntil:'networkidle'});await page.waitForSelector('[data-match-panel]');await page.locator('[data-match-open-all]').click();const panel=page.locator('[data-match-id="torino-como-2026-27-md-09"]');assert(await panel.count());const rows=await panel.locator('[data-selection-row]').count();assert(rows>0);const picks=panel.locator('[data-personal-pick]');for(let i=0;i<await picks.count();i++)assert(await picks.nth(i).isDisabled());assert(!await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth));await page.screenshot({path:'output/md09-final-2026-10-28/schedina-'+width+'.png',fullPage:false});
await page.goto(origin+'/index.html',{waitUntil:'networkidle'});const home=await page.locator('main').innerText();assert(/1\s*[—–-]\s*3/.test(home));assert(!await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth));results.push({width,score:true,lineups:true,finishedSelectionsDisabled:true,rows,overflow:false});await page.close();}assert.deepEqual(errors,[]);fs.writeFileSync('output/md09-final-2026-10-28/torino-como-browser.json',JSON.stringify({results,errors},null,2));console.log(results);}finally{await browser.close();server.close();}})().catch(e=>{console.error(e);server.close();process.exitCode=1});
