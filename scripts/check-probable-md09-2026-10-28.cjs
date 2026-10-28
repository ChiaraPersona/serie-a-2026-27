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



(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({channel:'msedge',headless:true}),errors=[],checks=[];try{const ids=JSON.parse(fs.readFileSync('output/probable-md09-2026-10-28/report.json')).updatedMatchIds;for(const width of [1440,390]){const page=await browser.newPage({viewport:{width,height:1000}});page.on('pageerror',e=>errors.push(e.message));await page.route('https://fonts.googleapis.com/**',r=>r.abort());await page.route('https://fonts.gstatic.com/**',r=>r.abort());const origin='http://127.0.0.1:'+server.address().port;for(const id of ids){await page.goto(origin+'/lettura.html?match='+id,{waitUntil:'networkidle'});await page.waitForSelector('.rd-shell');const t=await page.locator('main').innerText();assert(/probabil/i.test(t));assert(!/PARTITA CONCLUSA/i.test(t));assert(!await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth));}await page.goto(origin+'/schedina.html?giornata=9',{waitUntil:'networkidle'});await page.waitForSelector('[data-match-panel]');await page.locator('[data-match-open-all]').click();for(const id of ids){const panel=page.locator('[data-match-id="'+id+'"]');assert(await panel.locator('[data-selection-row]').count()>0);}assert(!await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth));await page.screenshot({path:'output/probable-md09-2026-10-28/schedina-'+width+'.png'});checks.push({width,readings:ids.length,schedina:true,overflow:false});await page.close();}assert.deepEqual(errors,[]);fs.writeFileSync('output/probable-md09-2026-10-28/browser.json',JSON.stringify({checks,errors},null,2));console.log(checks);}finally{await browser.close();server.close();}})().catch(e=>{console.error(e);server.close();process.exitCode=1});