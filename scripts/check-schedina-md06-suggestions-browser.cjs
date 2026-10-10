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
  assert.equal(await page.locator('[data-market-mode="suggested"]').getAttribute("aria-pressed"), "true", `${width}px: modalità suggerita non predefinita`);
  assert.equal(await page.locator('[data-market-mode-panel="suggested"] [data-selection-row][data-suggested="true"]').count(), 24, `${width}px: suggerimenti inattesi`);
  assert.equal(await page.locator('[data-market-mode-panel="all"] [data-selection-row]').count(), 1446, `${width}px: catalogo completo inatteso`);
  assert.equal(await page.locator('.betting-suggestion-family[data-suggestion-family="shots"],.betting-suggestion-family[data-suggestion-family="sot"],.betting-suggestion-family[data-suggestion-family="corners"],.betting-suggestion-family[data-suggestion-family="cards"]').count(), 0, `${width}px: famiglia non validata promossa`);
  const suggestedMetrics = await page.locator('[data-market-mode-panel="suggested"] [data-suggested="true"]').evaluateAll(rows => rows.map(row => ({ probability: Number(row.dataset.probability), odds: Number(row.dataset.odds), reason: row.querySelector(".betting-suggestion-reason")?.textContent || "", evDisplay: getComputedStyle(row.querySelector(".betting-market-ev")).display })));
  assert(suggestedMetrics.every(row => row.probability >= 50 && Number.isFinite(row.odds) && row.odds >= 1 && row.reason.includes("P prudente") && row.evDisplay === "none"), `${width}px: suggerimento senza prova o con EV visibile`);

  await page.locator('[data-market-mode="all"]').click();
  assert.equal(await page.locator('[data-market-mode="all"]').getAttribute("aria-pressed"), "true", `${width}px: modalità completa non attivata`);
  assert.equal(await page.locator('[data-market-mode-panel="all"]').first().getAttribute("hidden"), null, `${width}px: catalogo completo non attivato`);
  assert.notEqual(await page.locator('[data-market-mode-panel="suggested"]').first().getAttribute("hidden"), null, `${width}px: suggerimenti non nascosti`);
  await page.locator('[data-market-mode="suggested"]').click();

  await page.locator("[data-match-open-all]").click();
  const inter = page.locator('[data-match-id="inter-parma-2026-27-md-06"]');
  const interPick = inter.locator('[data-market-mode-panel="suggested"] [data-selection-label="Inter vincente"]');
  assert.equal(await interPick.count(), 1, `${width}px: Inter vincente non suggerita`);
  assert.equal(await inter.locator('[data-market-mode-panel="suggested"] [data-selection-label="Parma vincente"]').count(), 0, `${width}px: Parma vincente suggerita impropriamente`);
  await interPick.click();
  assert.equal(await page.locator("[data-personal-count]").first().innerText(), "1", `${width}px: aggiunta suggerimento fallita`);
  await page.reload({ waitUntil: "networkidle" });
  assert.equal(await page.locator("[data-personal-count]").first().innerText(), "1", `${width}px: persistenza fallita`);
  const firstSuggestedPanel = page.locator("[data-match-panel]").first();
  if (!(await firstSuggestedPanel.isOpen?.())) await firstSuggestedPanel.evaluate(panel => { panel.open = true; });
  await firstSuggestedPanel.scrollIntoViewIfNeeded();
  await page.screenshot({ path: path.join(output, `schedina-suggestions-${width}x${height}.png`) });

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
  console.log(`OK suggerimenti MD6 browser ${width}x${height}`);
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
