const { chromium } = require("C:/Users/utente/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");

const root = path.resolve(__dirname, "..");
const output = path.join(root, "output", "md06");
const expectedCounts = [16, 13, 16, 17, 16, 17, 15, 17, 17, 16];
const types = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".json": "application/json",
  ".css": "text/css",
  ".png": "image/png",
  ".jpg": "image/jpeg"
};

const server = http.createServer((request, response) => {
  const file = path.resolve(root, `.${decodeURIComponent(new URL(request.url, "http://localhost").pathname)}`);
  if (!file.startsWith(`${root}${path.sep}`)) return response.writeHead(403).end();
  fs.readFile(file, (error, body) => {
    response.writeHead(error ? 404 : 200, { "Content-Type": types[path.extname(file)] || "application/octet-stream" });
    response.end(error ? "Missing" : body);
  });
});

async function verifyViewport(browser, width, height) {
  const context = await browser.newContext({ viewport: { width, height } });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/schedina.html?giornata=6`, { waitUntil: "networkidle" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "networkidle" });

  const panels = page.locator("[data-match-panel]");
  assert.equal(await panels.count(), 10, `${width}px: devono essere presenti 10 partite`);
  assert.deepEqual(
    await panels.evaluateAll(items => items.map(item => Number(item.querySelector(".betting-match-count").textContent.match(/\d+/)?.[0]))),
    expectedCounts,
    `${width}px: conteggi per partita non allineati`
  );
  assert.equal(await page.locator("[data-market-filter],[data-market-sort],.betting-market-tools").count(), 0, `${width}px: filtri o ordinamento manuale ancora presenti`);

  await page.locator("[data-match-open-all]").click();
  assert.equal(await page.locator("[data-match-panel][open]").count(), 10, `${width}px: Apri tutte non apre i pannelli`);
  const rows = page.locator("[data-selection-row]");
  assert.equal(await rows.count(), 160, `${width}px: il catalogo visibile deve avere 160 selezioni`);
  assert.equal(await page.locator('[data-selection-row][data-ev=""]').count(), 16, `${width}px: devono restare 16 selezioni NOT_MODELLED`);
  const unmodelledMetrics = await rows.locator('[data-ev=""]').evaluateAll(items => items.every(item => {
    const values = [...item.querySelectorAll(".betting-market-metric b")].map(node => node.textContent.trim());
    return values.slice(1).every(value => value === "—");
  }));
  assert(unmodelledMetrics, `${width}px: le metriche NOT_MODELLED devono essere trattini`);

  for (const panel of await panels.elementHandles()) {
    const order = await panel.$$eval("[data-selection-row]", items => items.map(item => item.dataset.ev === "" ? null : Number(item.dataset.ev)));
    const firstMissing = order.findIndex(value => value === null);
    const evaluated = (firstMissing === -1 ? order : order.slice(0, firstMissing));
    assert(evaluated.every((value, index) => index === 0 || evaluated[index - 1] >= value), `${width}px: EV non ordinato in modo decrescente`);
    assert(firstMissing === -1 || order.slice(firstMissing).every(value => value === null), `${width}px: NOT_MODELLED intercalati alle righe valutate`);
  }

  const mainText = await page.locator("main").innerText();
  assert.doesNotMatch(mainText, /Pio Esposito|Omari Hutchinson/i, `${width}px: riserva proposta come mercato giocatore`);
  assert.match(mainText, /CALCI ANGOLO 1X2 T\.R\./i, `${width}px: mercato corner T.R. mancante`);
  assert(!(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)), `${width}px: overflow orizzontale`);

  const first = rows.nth(0);
  const second = rows.nth(1);
  const firstOdds = Number(await first.getAttribute("data-odds"));
  const secondOdds = Number(await second.getAttribute("data-odds"));
  await first.click();
  await second.click();
  assert.equal(await page.locator("[data-personal-count]").first().innerText(), "2", `${width}px: aggiunta riga intera non riuscita`);
  assert.equal(await first.getAttribute("aria-pressed"), "true", `${width}px: evidenziazione selezione assente`);
  assert.equal(await page.locator(".personal-betslip-item").count(), 2, `${width}px: schedina personale non aggiornata`);
  const combined = await page.locator(".personal-betslip-total strong").innerText();
  assert.equal(combined, (firstOdds * secondOdds).toFixed(2).replace(".", ","), `${width}px: quota combinata teorica errata`);

  await page.reload({ waitUntil: "networkidle" });
  assert.equal(await page.locator("[data-personal-count]").first().innerText(), "2", `${width}px: persistenza schedina personale assente`);
  assert.equal(await page.locator(".personal-betslip-item").count(), 2, `${width}px: righe persistite non ripristinate`);

  if (width < 1180) {
    const trigger = page.locator("[data-personal-open]");
    await trigger.click();
    const personalPanel = page.locator(".personal-betslip-panel");
    await personalPanel.waitFor({ state: "visible" });
    assert.equal(await personalPanel.getAttribute("data-open"), "true", `${width}px: bottom sheet non aperto`);
    assert.equal(await personalPanel.getAttribute("role"), "dialog", `${width}px: bottom sheet senza ruolo dialog`);
    await page.waitForTimeout(250);
    await page.screenshot({ path: path.join(output, `schedina-${width}x${height}-betslip.png`) });
  } else {
    await page.screenshot({ path: path.join(output, `schedina-${width}x${height}.png`) });
  }

  await page.locator("[data-personal-remove]").first().click();
  assert.equal(await page.locator("[data-personal-count]").first().innerText(), "1", `${width}px: rimozione con X non riuscita`);
  await page.locator("[data-match-close-all]").click();
  assert.equal(await page.locator("[data-match-panel][open]").count(), 0, `${width}px: Chiudi tutte non chiude i pannelli`);
  assert.deepEqual(errors, [], `${width}px: errori JavaScript nella pagina`);
  await context.close();
  console.log(`OK Schedina MD6 browser ${width}x${height}`);
}

(async () => {
  fs.mkdirSync(output, { recursive: true });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const browser = await chromium.launch({ headless: true, channel: "msedge" });
  try {
    await verifyViewport(browser, 1440, 1000);
    await verifyViewport(browser, 390, 844);
  } finally {
    await browser.close();
    server.close();
  }
})().catch(error => {
  console.error(error);
  server.close();
  process.exitCode = 1;
});
