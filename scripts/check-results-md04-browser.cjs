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

(async () => {
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const browser = await chromium.launch({ headless: true, channel: "msedge" });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    for (const width of [1280, 390]) {
      await page.setViewportSize({ width, height: 900 });

      await page.goto(`http://127.0.0.1:${server.address().port}/index.html`, { waitUntil: "networkidle" });
      const home = await page.locator("main").innerText();
      for (const result of [/Lecce[\s\S]{0,30}3 – 2[\s\S]{0,30}Monza/, /Napoli[\s\S]{0,30}1 – 0[\s\S]{0,30}Bologna/, /Sassuolo[\s\S]{0,30}3 – 2[\s\S]{0,30}Juventus/]) assert.match(home, result);
      assert(!(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)), `home ${width}: overflow`);

      await page.goto(`http://127.0.0.1:${server.address().port}/lettura.html?match=sassuolo-juventus-2026-27-md-04`, { waitUntil: "networkidle" });
      const reading = await page.locator("main").innerText();
      assert.match(reading, /Sassuolo - Juventus[\s\S]*3 - 2[\s\S]*DATI REALI · PARTITA CONCLUSA/);
      assert.match(reading, /Sebastiano Esposito[\s\S]*Edon Zhegrova[\s\S]*Vasilije Adzic/);
      assert(!(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)), `lettura ${width}: overflow`);

      await page.goto(`http://127.0.0.1:${server.address().port}/schedina.html?giornata=4`, { waitUntil: "networkidle" });
      const targetRows = page.locator("li[data-settlement]").filter({ hasText: /Lecce – Monza|Napoli – Bologna|Sassuolo – Juventus/ });
      assert.equal(await targetRows.count(), 10, `schedina ${width}: liquidazioni del 13 settembre`);
      assert.equal(await targetRows.filter({ hasText: /DA VERIFICARE/ }).count(), 0, `schedina ${width}: esiti non liquidati`);
      assert(!(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)), `schedina ${width}: overflow`);
      console.log(`OK risultati MD4 ${width}px`);
    }
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
    server.close();
  }
})().catch(error => {
  console.error(error);
  server.close();
  process.exitCode = 1;
});
