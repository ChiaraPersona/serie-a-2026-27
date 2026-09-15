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
      await page.locator("[data-home-previous-matchday]").click();
      const home = await page.locator("main").innerText();
      for (const result of [/Como[\s\S]{0,30}2 – 1[\s\S]{0,30}Parma/, /Torino[\s\S]{0,30}0 – 2[\s\S]{0,30}Roma/, /Inter[\s\S]{0,30}5 – 3[\s\S]{0,30}Udinese/]) assert.match(home, result);
      assert(!(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)), `home ${width}: overflow`);

      for (const [matchId, expected] of [
        ["como-parma-2026-27-md-04", /Como - Parma[\s\S]*2 - 1[\s\S]*DATI REALI · PARTITA CONCLUSA/],
        ["torino-roma-2026-27-md-04", /Torino - Roma[\s\S]*0 - 2[\s\S]*DATI REALI · PARTITA CONCLUSA/],
        ["inter-udinese-2026-27-md-04", /Inter - Udinese[\s\S]*5 - 3[\s\S]*DATI REALI · PARTITA CONCLUSA/]
      ]) {
        await page.goto(`http://127.0.0.1:${server.address().port}/lettura.html?match=${matchId}`, { waitUntil: "networkidle" });
        assert.match(await page.locator("main").innerText(), expected);
        assert(!(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)), `lettura ${matchId} ${width}: overflow`);
      }

      await page.goto(`http://127.0.0.1:${server.address().port}/schedina.html?giornata=4`, { waitUntil: "networkidle" });
      const targetRows = page.locator("li[data-settlement]");
      assert.equal(await targetRows.count(), 44, `schedina ${width}: liquidazioni complete`);
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
