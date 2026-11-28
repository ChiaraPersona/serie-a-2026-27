'use strict';
const fs = require('node:fs'), path = require('node:path'), http = require('node:http'), assert = require('node:assert/strict');
const { chromium } = require('C:/Users/utente/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root = path.resolve(__dirname, '..'), output = path.join(root, 'output/md13-starter-substitute-budget/browser'); fs.mkdirSync(output, { recursive: true });
const audit = JSON.parse(fs.readFileSync(path.join(root, 'output/md13-starter-substitute-budget/audit.json')));
const dataset = JSON.parse(fs.readFileSync(path.join(root, 'data/normalized/predictions.json')));
const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp' };
const server = http.createServer((req, res) => {
  const file = path.resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname));
  if (!file.startsWith(root + path.sep)) return res.writeHead(403).end();
  fs.readFile(file, (error, bytes) => { res.writeHead(error ? 404 : 200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' }); res.end(error ? 'Missing' : bytes); });
});
async function run() {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const temporary = path.join(output, 'tmp'); fs.mkdirSync(temporary, { recursive: true }); process.env.TEMP = temporary; process.env.TMP = temporary;
  const browser = await chromium.launch({ channel: 'chrome', headless: true }), checks = [], errors = [];
  try {
    for (const width of [1440, 390]) {
      const page = await browser.newPage({ viewport: { width, height: 1000 } });
      page.on('pageerror', e => errors.push(e.message));
      await page.route('https://fonts.googleapis.com/**', r => r.abort()); await page.route('https://fonts.gstatic.com/**', r => r.abort());
      for (const id of audit.targets) {
        await page.goto(`http://127.0.0.1:${server.address().port}/lettura.html?match=${id}`, { waitUntil: 'networkidle' });
        await page.waitForSelector('[data-player-card]');
        const prediction = dataset.predictions.find(p => p.matchId === id);
        let compared = 0;
        for (const p of prediction.shooters.allPlayers) {
          const row = page.locator(`[data-player-card][data-player-id="${p.playerId}"]`).first();
          assert.equal(await row.count(), 1, `${id}/${p.playerId}: missing player`);
          const expected = typeof p.projectedShots === 'number' ? p.projectedShots.toLocaleString('it-IT', { maximumFractionDigits: 1 }) : '—';
          assert.equal((await row.locator('[data-player-shots]').innerText()).trim(), expected, `${id}/${p.playerId}: stale player forecast`); compared++;
        }
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${id}/${width}: overflow`);
        if (id === 'inter-genoa-2026-27-md-13') await page.locator('.rd-player-columns').screenshot({ path: path.join(output, `inter-players-${width}.png`) });
        checks.push({ matchId: id, width, comparedPlayers: compared, overflow: false });
      }
      await page.goto(`http://127.0.0.1:${server.address().port}/schedina.html?giornata=13`, { waitUntil: 'networkidle' });
      await page.waitForSelector('[data-match-panel]'); await page.locator('[data-match-open-all]').click();
      for (const id of audit.targets) assert(await page.locator(`[data-match-id="${id}"] [data-selection-row]`).count() > 0, `${id}: empty Schedina`);
      const combo = page.locator('[data-mycombo-open-all]'); if (await combo.count()) await combo.click();
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'Schedina overflow');
      await page.screenshot({ path: path.join(output, `schedina-${width}.png`) }); await page.close();
    }
    assert.deepEqual(errors, []);
    fs.writeFileSync(path.join(output, 'checks.json'), JSON.stringify({ checks, errors, schedinaWidths: [1440, 390] }, null, 2));
    console.log(JSON.stringify({ status: 'PASS', readingChecks: checks.length, comparedPlayerCells: checks.reduce((n, c) => n + c.comparedPlayers, 0), widths: [1440, 390] }));
  } finally { await browser.close(); server.close(); }
}
run().catch(e => { console.error(e.message); server.close(); process.exitCode = 1; });
