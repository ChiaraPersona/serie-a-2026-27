"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { chromium } = require("C:/Users/utente/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");

const root = path.resolve(__dirname, "..");
const types = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".json": "application/json", ".css": "text/css", ".png": "image/png" };
const server = http.createServer((request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
  if (pathname === "/favicon.ico") return response.writeHead(204).end();
  const file = path.resolve(root, `.${pathname}`);
  if (!file.startsWith(`${root}${path.sep}`)) return response.writeHead(403).end();
  fs.readFile(file, (error, body) => {
    response.writeHead(error ? 404 : 200, { "Content-Type": types[path.extname(file)] || "application/octet-stream" });
    response.end(error ? "Missing" : body);
  });
});

async function verify(browser, width, height) {
  const context = await browser.newContext({ viewport: { width, height } });
  const page = await context.newPage();
  const pageErrors = [];
  const consoleErrors = [];
  page.on("pageerror", error => pageErrors.push(error.message));
  page.on("console", message => { if (message.type() === "error") consoleErrors.push(message.text()); });
  await page.goto(`http://127.0.0.1:${server.address().port}/schedina.html?giornata=6`, { waitUntil: "networkidle" });

  const lecceBologna = page.locator('[data-match-id="lecce-bologna-2026-27-md-06"]');
  const lazioMonza = page.locator('[data-match-id="lazio-monza-2026-27-md-06"]');
  const sassuoloMilan = page.locator('[data-match-id="sassuolo-milan-2026-27-md-06"]');
  assert.equal(await lecceBologna.locator("[data-selected-forecast=true]").count(), 15, `${width}px: numero pronostici Lecce-Bologna inatteso`);
  assert.equal(await lazioMonza.locator("[data-selected-forecast=true]").count(), 19, `${width}px: numero pronostici Lazio-Monza inatteso`);
  assert.equal(await sassuoloMilan.locator("[data-selected-forecast=true]").count(), 7, `${width}px: numero pronostici Sassuolo-Milan inatteso`);
  assert.equal(await page.locator('[data-selected-forecast=true]').filter({ hasText: "Federico Bernardeschi" }).count(), 0, `${width}px: Bernardeschi ancora visibile`);
  assert.equal(await page.locator('[data-selected-forecast=true]').filter({ hasText: "Joël Monteiro" }).count(), 0, `${width}px: Monteiro ancora visibile`);
  assert.equal(await page.locator('[data-selected-forecast=true]').filter({ hasText: "Jay Robinson" }).count(), 0, `${width}px: Robinson ancora visibile`);
  assert.equal(await page.locator('[data-selected-forecast=true]').filter({ hasText: "Patrick Cutrone" }).count(), 0, `${width}px: Cutrone ancora visibile`);
  assert.equal(await sassuoloMilan.locator('[data-selected-forecast=true]').filter({ hasText: "Kristian Thorstvedt" }).count(), 0, `${width}px: Thorstvedt in panchina ancora visibile`);
  assert.equal(await lecceBologna.locator('[data-selection-label="Nicolò Cambiaghi e suo eventuale sostituto 2+ tiri"]').count(), 1, `${width}px: Cambiaghi 2+ tiri assente`);
  assert.equal(await lazioMonza.locator('[data-selection-label="Cyril Ngonge e suo eventuale sostituto 2+ tiri"]').count(), 1, `${width}px: Ngonge 2+ tiri assente`);
  assert(!(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)), `${width}px: overflow orizzontale`);
  assert.deepEqual(pageErrors, [], `${width}px: errori JavaScript`);
  assert.deepEqual(consoleErrors, [], `${width}px: errori console`);
  await context.close();
}

(async () => {
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const browser = await chromium.launch({ headless: true, channel: "msedge" });
  try {
    await verify(browser, 1440, 1000);
    await verify(browser, 390, 844);
    console.log("OK Schedina MD06 browser: formazioni ufficiali riflesse a 1440px e 390px.");
  } finally {
    await browser.close();
    server.close();
  }
})().catch(error => {
  server.close();
  console.error(error);
  process.exitCode = 1;
});
