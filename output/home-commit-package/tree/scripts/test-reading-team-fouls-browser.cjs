'use strict';
const fs = require('node:fs'), path = require('node:path'), http = require('node:http');
const assert = require('node:assert/strict');
const {chromium} = require('C:/Users/utente/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root = path.resolve(__dirname, '..');
const read = file => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const predictions = read('data/normalized/predictions.json').predictions;
const fixtures = ['atalanta-frosinone-2026-27-md-08', 'genoa-venezia-2026-27-md-08', 'torino-monza-2026-27-md-08'];
const output = path.join(root, 'reports/reading-team-fouls-md08');
const types = {'.html':'text/html', '.js':'text/javascript', '.mjs':'text/javascript', '.css':'text/css', '.json':'application/json', '.svg':'image/svg+xml', '.png':'image/png', '.webp':'image/webp'};
const server = http.createServer((req, res) => {
  const file = path.resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname));
  if (!file.startsWith(root + path.sep)) return res.writeHead(403).end();
  fs.readFile(file, (error, body) => {res.writeHead(error ? 404 : 200, {'Content-Type': types[path.extname(file)] || 'application/octet-stream'}); res.end(error ? 'Missing' : body);});
});
(async () => {
  fs.mkdirSync(output, {recursive: true});
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  const errors = [], results = [];
  try {
    browser = await chromium.launch({channel: 'msedge', headless: true});
    const page = await browser.newPage();
    page.on('pageerror', error => errors.push(error.message));
    await page.route('https://fonts.googleapis.com/**', route => route.abort());
    await page.route('https://fonts.gstatic.com/**', route => route.abort());
    for (const fixture of fixtures) for (const width of [1440, 390]) {
      await page.setViewportSize({width, height: 1000});
      await page.goto(`http://127.0.0.1:${server.address().port}/lettura.html?match=${fixture}`);
      const row = page.locator('.rd-scenario [data-statistic="fouls"]');
      await row.waitFor();
      const values = await row.locator('.rd-diverging-top b').allTextContents();
      const teams = predictions.find(p => p.matchId === fixture).teamProjections;
      const expected = teams.map(t => t.fouls.central.toLocaleString('it-IT', {minimumFractionDigits: 1, maximumFractionDigits: 1}));
      assert.deepEqual(values, expected);
      const bars = await row.locator('.rd-diverging-half').evaluateAll(nodes => nodes.map(n => ({available: n.dataset.available, width: parseFloat(n.querySelector('em').style.width)})));
      assert(bars.every(b => b.available === 'true' && b.width > 0));
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, fixture + ' overflow');
      await row.evaluate(node => node.scrollIntoView({block: 'center'}));
      await page.locator('.rd-scenario .rd-diverging').screenshot({path: path.join(output, `${fixture}-${width}.png`)});
      results.push({fixture, width, values, bars, overflow: false});
    }
    assert.deepEqual(errors, []);
    fs.writeFileSync(path.join(output, 'browser-audit.json'), JSON.stringify({results, errors}, null, 2) + '\n');
    console.log(`PASS: ${results.length} controlli desktop/mobile, valori e barre delle 3 neopromosse, nessun errore JS o overflow`);
  } finally {
    if (browser) await browser.close();
    server.close();
  }
})().catch(error => {console.error(error); server.close(); process.exitCode = 1;});
