"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { chromium } = require("C:/Users/utente/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");

const root = path.resolve(__dirname, "..");
const output = path.join(root, "output", "md06");
const expected = {
  COHERENT_WITH_PREVALENT: 20,
  ALTERNATIVE_TO_PREVALENT: 50,
  COMPATIBLE_WITH_MULTIPLE_SCENARIOS: 297,
  NOT_DETERMINABLE: 16,
};
const types = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".json": "application/json", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg" };
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
  const pageErrors = [];
  page.on("pageerror", error => pageErrors.push(error.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/schedina.html?giornata=6`, { waitUntil: "networkidle" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "networkidle" });
  assert.equal(await page.locator("[data-match-panel]").count(), 10, `${width}px: partite mancanti`);
  await page.locator("[data-match-open-all]").click();
  assert.equal(await page.locator(".betting-scenario-summary").count(), 10, `${width}px: riepiloghi scenario mancanti`);
  assert.equal(await page.locator("[data-selection-row]").count(), 383, `${width}px: selezioni mancanti`);
  for (const [classification, count] of Object.entries(expected)) {
    assert.equal(await page.locator(`[data-selection-row][data-scenario-class="${classification}"]`).count(), count, `${width}px: conteggio ${classification} errato`);
  }
  const scenarioTexts = await page.locator(".betting-scenario-summary").allTextContents();
  assert(scenarioTexts.every(text => /Scenario prevalente/.test(text) && /1\s*\d+[,.]\d+%/.test(text) && /X\s*\d+[,.]\d+%/.test(text) && /2\s*\d+[,.]\d+%/.test(text)), `${width}px: probabilità 1/X/2 non visibili`);
  assert.equal(await page.locator(".betting-scenario-legend").count(), 10, `${width}px: legenda scenario mancante`);
  assert(!(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)), `${width}px: overflow orizzontale`);

  const genoa = page.locator('[data-match-id="genoa-fiorentina-2026-27-md-06"]');
  const home = genoa.locator('[data-selection-label="Genoa vincente"]');
  const away = genoa.locator('[data-selection-label="Fiorentina vincente"]');
  assert.equal(await home.count(), 1, `${width}px: vittoria Genoa non trovata`);
  assert.equal(await away.count(), 1, `${width}px: vittoria Fiorentina non trovata`);
  await home.click();
  await away.click();
  assert.equal(await page.locator("[data-personal-count]").first().innerText(), "2", `${width}px: scenari alternativi bloccati`);
  assert.match(await page.locator(".personal-betslip-analysis").innerText(), /Incompatibilità logica/, `${width}px: incompatibilità non distinta`);
  const personalAnalysis = await page.locator(".personal-betslip-analysis").innerText();
  assert.match(personalAnalysis, /Nessuna probabilità combinata viene stimata/i, `${width}px: divieto di probabilità combinata non esplicitato`);
  assert.doesNotMatch(personalAnalysis, /Probabilità combinata\s*[:=]\s*\d/i, `${width}px: probabilità combinata inventata`);

  await page.reload({ waitUntil: "networkidle" });
  assert.equal(await page.locator("[data-personal-count]").first().innerText(), "2", `${width}px: persistenza selezioni fallita`);
  assert.match(await page.locator(".personal-betslip-analysis").innerText(), /Incompatibilità logica/, `${width}px: persistenza analisi fallita`);
  if (width < 1180) {
    await page.locator("[data-personal-open]").click();
    await page.locator(".personal-betslip-panel").waitFor({ state: "visible" });
    await page.waitForFunction(() => document.querySelector(".personal-betslip-panel")?.dataset.open === "true");
    await page.waitForTimeout(250);
  }
  await page.screenshot({ path: path.join(output, `schedina-scenario-coherence-${width}x${height}.png`) });
  await page.locator("[data-personal-remove]").first().click();
  await page.locator("[data-personal-remove]").first().click();
  assert.equal(await page.locator("[data-personal-count]").first().innerText(), "0", `${width}px: rimozione selezioni fallita`);
  assert.deepEqual(pageErrors, [], `${width}px: errori JavaScript`);
  await context.close();
  console.log(`OK scenario MD6 browser ${width}x${height}`);
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
  server.close();
  console.error(error);
  process.exitCode = 1;
});
