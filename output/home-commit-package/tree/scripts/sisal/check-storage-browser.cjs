const { chromium } = require("C:/Users/utente/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");

const root = path.resolve(__dirname, "../..");
const types = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".json": "application/json", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg" };
const server = http.createServer((request, response) => {
  const file = path.resolve(root, `.${decodeURIComponent(new URL(request.url, "http://localhost").pathname)}`);
  if (!file.startsWith(`${root}${path.sep}`)) return response.writeHead(403).end();
  fs.readFile(file, (error, body) => {
    response.writeHead(error ? 404 : 200, { "Content-Type": types[path.extname(file)] || "application/octet-stream" });
    response.end(error ? "Missing" : body);
  });
});


(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({channel:'msedge',headless:true}),errors=[],checks=[];try{for(const width of [1440,390]){const page=await browser.newPage({viewport:{width,height:1000}});page.on('pageerror',e=>errors.push(e.message));await page.route('https://fonts.googleapis.com/**',r=>r.abort());await page.route('https://fonts.gstatic.com/**',r=>r.abort());const origin='http://127.0.0.1:'+server.address().port;for(const route of ['/index.html','/schedina.html?giornata=9','/lettura.html?match=parma-udinese-2026-27-md-09','/lettura.html?match=roma-cagliari-2026-27-md-09']){await page.goto(origin+route,{waitUntil:'networkidle'});if(route.includes('lettura'))await page.waitForSelector('.rd-shell');else if(route.includes('schedina'))await page.waitForSelector('[data-match-panel]');assert((await page.locator('main').innerText()).length>100);assert(!await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth));}await page.screenshot({path:'output/sisal-storage-migration/reading-'+width+'.png'});checks.push({width,pages:4,overflow:false});await page.close();}assert.deepEqual(errors,[]);fs.writeFileSync('output/sisal-storage-migration/browser.json',JSON.stringify({checks,errors},null,2));console.log(checks);}finally{await browser.close();server.close();}})().catch(e=>{console.error(e);server.close();process.exitCode=1});