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


(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({channel:'msedge',headless:true}),errors=[],results=[];try{const data=JSON.parse(fs.readFileSync('data/normalized/schedina-md09.json'));for(const width of [1440,390]){const page=await browser.newPage({viewport:{width,height:1000}});page.on('pageerror',e=>errors.push(e.message));const origin='http://127.0.0.1:'+server.address().port;await page.route('https://fonts.googleapis.com/**',r=>r.abort());await page.route('https://fonts.gstatic.com/**',r=>r.abort());for(const id of ['roma-cagliari-2026-27-md-09','torino-como-2026-27-md-09','frosinone-lecce-2026-27-md-09']){const legs=data.marketCatalog.matches.find(m=>m.matchId===id).selections.filter(l=>l.catalogOrigin==='prediction-v2-team-forecast');await page.goto(origin+'/lettura.html?match='+id,{waitUntil:'networkidle'});await page.waitForSelector('.rd-shell');for(const leg of legs){const row=page.locator('[data-forecast-id="'+leg.selectionId+'"]');assert.equal(await row.count(),1);assert.equal((await row.locator('td').nth(2).textContent()).trim(),leg.odds==null?'—':leg.odds.toLocaleString('it-IT',{maximumFractionDigits:2}));}assert(!await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth));}
await page.goto(origin+'/schedina.html?giornata=9',{waitUntil:'networkidle'});await page.waitForSelector('[data-match-panel]');await page.locator('[data-match-open-all]').click();const leg=data.marketCatalog.matches.find(m=>m.matchId==='roma-cagliari-2026-27-md-09').selections.find(l=>l.selectionId==='forecast:v2:roma-cagliari-2026-27-md-09:team:roma:shots:over:14.5');const pick=page.locator('[data-personal-pick="'+leg.selectionId+'"]').first();assert((await pick.innerText()).includes('1,12'));await pick.click();assert.equal(await pick.getAttribute('aria-pressed'),'true');assert(!await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth));await page.screenshot({path:'output/team-quote-link-md09/schedina-'+width+'.png'});results.push({width,linkedQuotesVisible:true,missingQuotesRemainND:true,personalPick:true,overflow:false});await page.close();}assert.deepEqual(errors,[]);fs.writeFileSync('output/team-quote-link-md09/browser.json',JSON.stringify({results,errors},null,2));console.log(results);}finally{await browser.close();server.close();}})().catch(e=>{console.error(e);server.close();process.exitCode=1});
