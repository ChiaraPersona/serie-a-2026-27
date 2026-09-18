const { chromium } = require("C:/Users/utente/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");

const root = path.resolve(__dirname, "..");
const output = path.join(root, "output", "md05");
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
  fs.mkdirSync(output, { recursive: true });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const browser = await chromium.launch({ headless: true, channel: "msedge" });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    for (const width of [1280, 390]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`http://127.0.0.1:${server.address().port}/schedina.html?giornata=5`, { waitUntil: "networkidle" });
      const mainText = await page.locator("main").innerText();
      const comparableText = mainText.toLocaleLowerCase("it-IT");
      assert.match(mainText, /MyCombo da 10 eventi · 5ª giornata/);
      assert(comparableText.indexOf("mycombo da 10 eventi") < comparableText.indexOf("controllo prudenziale"), `schedina ${width}: le MyCombo devono essere in apertura`);
      assert.doesNotMatch(mainText, /Scintilla|Bagliore|Supernova|Prisma|Quasar|Costellazione/i);
      assert.doesNotMatch(mainText, /ARBITRO CONSULTA MONITOR VAR|RIGORE SI\/NO/i);
      const cards = page.locator(".betting-mycombo-card");
      assert.equal(await cards.count(), 10, `schedina ${width}: servono dieci MyCombo`);
      for (let index = 0; index < 10; index += 1) {
        const card = cards.nth(index);
        const markets = await card.locator("ol li strong").allTextContents();
        const quotedOdds = (await card.locator("ol li b").allTextContents()).map(value => Number(value.replace(",", ".")));
        assert.equal(markets.length, 10, `schedina ${width}: la MyCombo ${index + 1} deve avere dieci eventi`);
        assert.equal(new Set(markets).size, markets.length, `schedina ${width}: mercato ripetuto nella MyCombo ${index + 1}`);
        assert(quotedOdds.every(value => value >= 1.15), `schedina ${width}: quota sotto 1,15 nella MyCombo ${index + 1}`);
      }
      assert(!(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)), `schedina ${width}: overflow`);
      await page.screenshot({ path: path.join(output, `schedina-${width}.png`), fullPage: true });

      await page.goto(`http://127.0.0.1:${server.address().port}/lettura.html?match=roma-inter-2026-27-md-05`, { waitUntil: "networkidle" });
      assert.equal(await page.getByText("MyCombo", { exact: true }).count(), 0, `lettura ${width}: MyCombo ancora visibile`);
      assert.equal(await page.locator(".prediction-combos,.prediction-combo-card").count(), 0, `lettura ${width}: componenti MyCombo ancora presenti`);
      assert(!(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)), `lettura ${width}: overflow`);
      await page.screenshot({ path: path.join(output, `lettura-roma-inter-${width}.png`), fullPage: true });
      console.log(`OK MD05 browser ${width}px`);
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
