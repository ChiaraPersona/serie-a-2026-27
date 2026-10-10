"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { chromium } = require("C:/Users/utente/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");

const root = path.resolve(__dirname, "..");
const output = path.join(root, "output", "md06");
const types = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".json": "application/json", ".css": "text/css", ".png": "image/png" };
const server = http.createServer((request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
  if (pathname === "/favicon.ico") return response.writeHead(204).end();
  const file = path.resolve(root, `.${pathname}`);
  if (!file.startsWith(`${root}${path.sep}`)) return response.writeHead(403).end();
  fs.readFile(file, (error, body) => { response.writeHead(error ? 404 : 200, { "Content-Type": types[path.extname(file)] || "application/octet-stream" }); response.end(error ? "Missing" : body); });
});

async function verifyViewport(browser, width, height) {
  const context = await browser.newContext({ viewport: { width, height } });
  const page = await context.newPage();
  const pageErrors = [], consoleErrors = [];
  page.on("pageerror", error => pageErrors.push(error.message));
  page.on("console", message => { if (message.type() === "error") consoleErrors.push(message.text()); });
  await page.goto(`http://127.0.0.1:${server.address().port}/schedina.html?giornata=6`, { waitUntil: "networkidle" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "networkidle" });

  assert.equal(await page.locator("[data-match-panel]").count(), 10, `${width}px: partite mancanti`);
  assert.equal(await page.locator("[data-selected-forecast=true]").count(), 82, `${width}px: pronostici selezionati inattesi`);
  assert.equal(await page.locator("[data-market-mode]").count(), 0, `${width}px: selettore modalità ancora presente`);
  assert.equal(await page.locator("[data-market-mode-panel]").count(), 0, `${width}px: pannello catalogo completo ancora presente`);
  assert.equal(await page.locator(".betting-suggestion-reason").count(), 0, `${width}px: descrizioni tecniche ancora presenti`);
  assert.equal(await page.getByText("Tutti i mercati", { exact: true }).count(), 0, `${width}px: catalogo completo ancora accessibile`);
  assert.equal(await page.getByText("Pronostici suggeriti", { exact: true }).count(), 0, `${width}px: vecchia modalità ancora visibile`);
  const selectedMetrics = await page.locator("[data-selected-forecast=true]").evaluateAll(rows => rows.map(row => ({ probability: Number(row.dataset.probability), odds: Number(row.dataset.odds), ev: Number(row.dataset.ev), metricLabels: [...row.querySelectorAll(".betting-market-metric small")].map(node => node.textContent.trim()), text: row.textContent })));
  assert(selectedMetrics.every(row => Number.isFinite(row.probability) && Number.isFinite(row.odds) && row.odds >= 1 && Number.isFinite(row.ev)), `${width}px: pronostico senza probabilità, quota o EV`);
  assert(selectedMetrics.some(row => row.ev < 0), `${width}px: nessun pronostico coerente con EV negativo esposto`);
  assert(selectedMetrics.every(row => JSON.stringify(row.metricLabels) === JSON.stringify(["Probabilità", "Quota Sisal", "EV"])), `${width}px: metriche UI non minimali`);
  assert(selectedMetrics.every(row => !/P centrale|P prudente|sensibilit|affidabilit|compatibile con/i.test(row.text)), `${width}px: testo tecnico esposto`);

  await page.locator("[data-match-open-all]").click();
  const inter = page.locator('[data-match-id="inter-parma-2026-27-md-06"]');
  assert.equal(await inter.locator('[data-selection-label="Parma vincente"]').count(), 0, `${width}px: esito alternativo Parma vincente promosso`);
  const firstPick = inter.locator("[data-selected-forecast=true]").first();
  assert(await firstPick.count(), `${width}px: nessun pronostico selezionabile in Inter-Parma`);
  await firstPick.click();
  assert.equal(await page.locator("[data-personal-count]").first().innerText(), "1", `${width}px: aggiunta pronostico fallita`);
  await page.reload({ waitUntil: "networkidle" });
  assert.equal(await page.locator("[data-personal-count]").first().innerText(), "1", `${width}px: persistenza fallita`);
  await page.locator("[data-match-open-all]").click();
  const firstPanel = page.locator("[data-match-panel]").first();
  await firstPanel.scrollIntoViewIfNeeded();
  await page.screenshot({ path: path.join(output, `schedina-definitive-${width}x${height}.png`) });

  if (width < 1180) {
    await page.locator("[data-personal-open]").click();
    await page.waitForFunction(() => document.querySelector(".personal-betslip-panel")?.dataset.open === "true");
    await page.waitForTimeout(220);
    assert(await page.locator(".personal-betslip-panel").isVisible(), `${width}px: schedina personale non accessibile`);
    await page.locator("[data-personal-remove]").first().click();
    await page.locator("[data-personal-close]").click();
  } else {
    await page.locator("[data-personal-remove]").first().click();
  }
  assert.equal(await page.locator("[data-personal-count]").first().innerText(), "0", `${width}px: rimozione fallita`);
  assert(!(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)), `${width}px: overflow orizzontale`);
  const duplicateIds = await page.evaluate(() => { const ids = [...document.querySelectorAll("[id]")].map(node => node.id); return ids.filter((id, index) => ids.indexOf(id) !== index); });
  assert.deepEqual(duplicateIds, [], `${width}px: ID DOM duplicati`);
  assert.deepEqual(pageErrors, [], `${width}px: errori JavaScript`);
  assert.deepEqual(consoleErrors, [], `${width}px: errori console`);
  await context.close();
  console.log(`OK selezione definitiva MD6 browser ${width}x${height}`);
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
})().catch(error => { server.close(); console.error(error); process.exitCode = 1; });
