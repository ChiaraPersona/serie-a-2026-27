const { chromium } = require("C:/Users/utente/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");

const root = path.resolve(__dirname, "..");
const source = JSON.parse(fs.readFileSync(path.join(root, "data/sources/official-lineups-2026-27.json"), "utf8"));
const fixture = source.fixtures.find(item => item.matchId === "inter-udinese-2026-27-md-04");
const inter = fixture.teams.find(team => team.teamId === "inter");
const udinese = fixture.teams.find(team => team.teamId === "udinese");
assert.deepEqual(inter.players.map(player => player.currentName), ["Martinez", "Akanji", "Stones", "Bastoni", "Diouf", "Barella", "Zielinski", "Mkhitaryan", "Carlos Augusto", "Thuram", "Esposito"]);
assert.deepEqual(inter.substitutes.map(player => player.currentName), ["Di Gennaro", "Provedel", "Stankovic", "Sucic", "Martinez", "Luis Henrique", "Bonny", "Jones", "Mkhitar", "Pavard", "Bisseck", "Dimarco", "Mosconi"]);
assert.deepEqual(udinese.players.map(player => player.currentName), ["Okoye", "Abankwah", "Kabasele", "Ebosse", "Vojvoda", "Karlstrom", "Miller", "Kamara", "Gomez", "Ekkelenkamp", "Davis"]);
assert.deepEqual(udinese.substitutes.map(player => player.currentName), ["Mrozek", "Padelli", "Lovric", "Zarraga", "Gueye", "Bertola", "Bayo", "Chakvetadze", "Vinciati", "Jovanovic"]);
assert.equal(inter.coach, "Chivu");
assert.equal(udinese.coach, "Runjaic");
assert.deepEqual(inter.substitutes.filter(player => player.playerId === null).map(player => player.currentName), ["Mkhitar", "Mosconi"]);
assert.deepEqual(udinese.substitutes.filter(player => player.playerId === null).map(player => player.currentName), ["Lovric", "Vinciati"]);
const predictions = JSON.parse(fs.readFileSync(path.join(root, "data/normalized/predictions.json"), "utf8"));
const prediction = predictions.predictions.find(item => item.matchId === fixture.matchId);
const starters = new Set([...inter.players, ...udinese.players].map(player => player.currentName));
assert(prediction.likelyBooked.every(player => starters.has(player.name)), "I candidati ammonizione devono appartenere agli XI ufficiali");

const types = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".json": "application/json", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml" };
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
      await page.goto(`http://127.0.0.1:${server.address().port}/lettura.html?match=inter-udinese-2026-27-md-04`, { waitUntil: "networkidle" });
      const reading = await page.locator("main").innerText();
      assert.match(reading, /Formazioni ufficiali/);
      assert.match(reading, /Inter[\s\S]*3-5-2[\s\S]*Allenatore: Chivu/);
      assert.match(reading, /Udinese[\s\S]*3-4-2-1[\s\S]*Allenatore: Runjaic/);
      assert.match(reading, /Mkhitar[\s\S]*Mosconi/);
      assert.match(reading, /Lovric[\s\S]*Vinciati/);
      assert.equal(await page.locator(".reading-lineup-card").count(), 2);
      assert.equal(await page.locator(".prediction-combo-card").count(), 3);
      assert(!(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)), `lettura ${width}: overflow`);

      await page.goto(`http://127.0.0.1:${server.address().port}/statistiche-squadra/inter.html`, { waitUntil: "networkidle" });
      const teamPage = await page.locator("main").innerText();
      assert.match(teamPage, /Formazione ufficiale Inter - Udinese/);
      assert.match(teamPage, /A disposizione:[\s\S]*Mkhitar[\s\S]*Mosconi/);
      assert(!(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)), `inter ${width}: overflow`);
      console.log(`OK Inter-Udinese ufficiali ${width}px`);
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
