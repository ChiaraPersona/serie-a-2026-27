"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { chromium } = require("C:/Users/utente/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");

const root = path.resolve(__dirname, "..");
const valueAfter = flag => {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : null;
};
const matchId = valueAfter("--match") || "sassuolo-milan-2026-27-md-06";
const data = JSON.parse(fs.readFileSync(path.join(root, "data/normalized/schedina-md06.json"), "utf8"));
const expectedIds = data.marketCatalog.matches.find(match => match.matchId === matchId).selections
  .filter(leg => leg.suggestionAnalysis?.suggested)
  .map(leg => leg.selectionId)
  .sort();
const officialData = JSON.parse(fs.readFileSync(path.join(root, "data/sources/official-lineups-2026-27.json"), "utf8"));
const officialFixture = officialData.fixtures.find(fixture => fixture.matchId === matchId);
const expectedStarters = (officialFixture?.teams || []).flatMap(team => team.players.map(player => player.currentName)).sort();
const contentTypes = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".json": "application/json", ".css": "text/css", ".png": "image/png", ".svg": "image/svg+xml" };
const server = http.createServer((request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
  if (pathname === "/favicon.ico") return response.writeHead(204).end();
  const file = path.resolve(root, `.${pathname}`);
  if (!file.startsWith(`${root}${path.sep}`)) return response.writeHead(403).end();
  fs.readFile(file, (error, body) => {
    response.writeHead(error ? 404 : 200, { "Content-Type": contentTypes[path.extname(file)] || "application/octet-stream" });
    response.end(error ? "Missing" : body);
  });
});

async function verify(browser, width, height) {
  const context = await browser.newContext({ viewport: { width, height } });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });

  await page.goto(`http://127.0.0.1:${server.address().port}/schedina.html?giornata=6`, { waitUntil: "networkidle" });
  const panel = page.locator(`[data-match-panel][data-match-id="${matchId}"]`);
  await panel.locator("summary").click();
  const bettingIds = (await panel.locator("[data-selected-forecast=true]").evaluateAll(rows => rows.map(row => row.dataset.personalPick))).sort();
  assert.deepEqual(bettingIds, expectedIds, `${width}px: Schedina non coerente col registro condiviso`);

  await page.goto(`http://127.0.0.1:${server.address().port}/lettura.html?match=${matchId}`, { waitUntil: "networkidle" });
  const readingIds = (await page.locator("[data-shared-forecast-id]").evaluateAll(rows => rows.map(row => row.dataset.sharedForecastId))).sort();
  assert.deepEqual(readingIds, expectedIds, `${width}px: Lettura non coerente col registro condiviso`);
  assert.equal(await page.getByRole("heading", { name: "Pronostici giocabili" }).count(), 1, `${width}px: sezione pronostici Lettura assente`);
  assert(await page.locator(".reading-shared-forecast-table").isVisible(), `${width}px: tabella pronostici Lettura non visibile`);
  const bodyOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  assert(bodyOverflow <= 1, `${width}px: overflow orizzontale della pagina (${bodyOverflow}px)`);
  assert.equal(await page.getByText("FORMAZIONI UFFICIALI", { exact: true }).count(), 1, `${width}px: formazioni ufficiali assenti dalla Lettura`);
  const renderedStarters = (await page.locator(".reading-lineup-field strong").allTextContents()).map(value => value.trim()).sort();
  assert.deepEqual(renderedStarters, expectedStarters, `${width}px: undici ufficiali non coerenti con la fonte canonica`);
  assert.equal(errors.length, 0, `${width}px: errori browser: ${errors.join(" | ")}`);
  await context.close();
}

(async () => {
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const browser = await chromium.launch({ headless: true, channel: "msedge" });
  try {
    await verify(browser, 1440, 1000);
    await verify(browser, 390, 844);
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
  console.log(`OK browser Lettura ↔ Schedina: ${expectedIds.length} pronostici coerenti a 1440px e 390px`);
})().catch(error => {
  console.error(error);
  server.close(() => process.exit(1));
});
