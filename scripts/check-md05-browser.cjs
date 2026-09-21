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
      assert.match(mainText, /MyCombo · 10 esiti per gara/);
      assert(comparableText.indexOf("mycombo · 10 esiti per gara") < comparableText.indexOf("controllo prudenziale"), `schedina ${width}: le MyCombo devono essere in apertura`);
      assert.doesNotMatch(mainText, /Scintilla|Bagliore|Supernova|Prisma|Quasar|Costellazione/i);
      const cards = page.locator(".betting-mycombo-card");
      assert.equal(await cards.count(), 9, `schedina ${width}: servono nove MyCombo archiviate; Milan-Lecce resta N/D in fonte`);
      const openCards = page.locator('.betting-mycombo-card:not([data-finished="true"])');
      assert.doesNotMatch(await openCards.allInnerTexts().then(values => values.join("\n")), /ARBITRO CONSULTA MONITOR VAR|RIGORE SI\/NO|PRIMA SOSTITUZIONE|PARI\/DISPARI|HANDICAP|SEGNA GOAL 2 TEMPO|SEGNA NEI 2 TEMPI|U\/O GOAL SQUADRA TEMPO|SEGNA ULTIMO GOAL|1 TEMPO: 1X2 CORNER|TEMPO PRIMO GOAL|DRAW NO BET|\bDUO\b|MULTIGIOCAT/i);
      for (let index = 0; index < 9; index += 1) {
        const card = cards.nth(index);
        const markets = await card.locator("ol li strong").allTextContents();
        const events = await card.locator("ol li").allInnerTexts();
        const quotedOdds = (await card.locator("ol li b").allTextContents()).map(value => Number(value.replace(",", ".")));
        const finished = await card.getAttribute("data-finished") === "true";
        assert.equal(markets.length, 10, `schedina ${width}: la MyCombo ${index + 1} deve contenere 10 eventi`);
        assert.equal(new Set(events).size, events.length, `schedina ${width}: evento ripetuto nella MyCombo ${index + 1}`);
        assert(quotedOdds.every(value => value >= 1.15), `schedina ${width}: quota sotto 1,15 nella MyCombo ${index + 1}`);
      }
      assert(!(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)), `schedina ${width}: overflow`);
      await page.screenshot({ path: path.join(output, `schedina-${width}.png`), fullPage: true });

      await page.goto(`http://127.0.0.1:${server.address().port}/index.html`, { waitUntil: "networkidle" });
      const currentStandings = page.locator('[data-standings-panel="current"]');
      assert.equal(await currentStandings.locator("table").count(), 3, `classifica ${width}: viste generale/casa/trasferta mancanti`);
      assert.equal(await currentStandings.locator("tbody tr").count(), 60, `classifica ${width}: servono 20 squadre per ogni vista`);
      assert.doesNotMatch(await currentStandings.innerText(), /\bN\/D\b/, `classifica ${width}: sono rimasti valori N/D`);
      assert(!(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)), `classifica ${width}: overflow`);
      await page.locator("#classifiche").screenshot({ path: path.join(output, `classifica-${width}.png`) });

      await page.goto(`http://127.0.0.1:${server.address().port}/lettura.html?match=roma-inter-2026-27-md-05`, { waitUntil: "networkidle" });
      const readingText = await page.locator("main").innerText();
      assert.match(readingText, /Formazioni ufficiali/);
      for (const expected of ["Svilar", "Mancini", "Belardi", "Hermoso", "Molina", "Cristante", "Koné", "Wesley", "Dybala", "Soulé", "Malen", "Martinez Jo.", "Bisseck", "Akanji", "Bastoni", "Diouf", "Barella", "Zielinski", "Jones", "Dimarco", "Martinez L.", "Thuram"]) {
        assert(readingText.includes(expected), `lettura ${width}: titolare ufficiale assente (${expected})`);
      }
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
