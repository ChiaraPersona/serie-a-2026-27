'use strict';
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const {createHash} = require('node:crypto');
const {pathToFileURL} = require('node:url');
const dependencyRoot = 'C:/Users/utente/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || dependencyRoot + '/playwright');
const {PNG} = require(dependencyRoot + '/pngjs');
const {sourcePath, outputPath} = require('./build-champions-md02-browser-data.cjs');
const root = path.resolve(__dirname, '..');
const out = path.join(root, 'output/reports/champions-md02-browser-data');
const renderer = fs.readFileSync(path.join(root, 'js/pages/champions.js'), 'utf8');
const uiLoad = `load("${path.basename(outputPath)}")`;
assert.equal(renderer.split(uiLoad).length - 1, 1);
const oldRenderer = renderer.replace(uiLoad, `load("${path.basename(sourcePath)}")`);
const types = {'.html':'text/html', '.js':'text/javascript', '.mjs':'text/javascript', '.json':'application/json', '.css':'text/css', '.png':'image/png', '.jpg':'image/jpeg', '.svg':'image/svg+xml'};
const protectedFiles = [sourcePath, 'data/normalized/schedina-champions-md02.json', 'data/normalized/champions-pilot-predictions-md02-2026-27.json', 'data/normalized/official-starter-registry.json'];
const hash = file => createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex');
const before = protectedFiles.map(hash);
const server = http.createServer((req, res) => {
  const file = path.resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname));
  if (!file.startsWith(root + path.sep) || file.includes(path.sep + '.git' + path.sep)) return res.writeHead(403).end();
  fs.readFile(file, (error, body) => {
    res.writeHead(error ? 404 : 200, {'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store'});
    res.end(error ? 'Missing' : body);
  });
});

(async () => {
  fs.mkdirSync(out, {recursive: true});
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  let browser;
  const results = [];
  try {
    const {default: pixelmatch} = await import(pathToFileURL(dependencyRoot + '/pixelmatch/index.js').href);
    browser = await chromium.launch({channel: 'msedge', headless: true});
    const cases = ['01', '05', '18'].flatMap(id => [1440, 390].map(width => ({id, width, legacy: false})));
    cases.push(...[1440, 390].map(width => ({id: '05', width, legacy: true})));
    for (const test of cases) {
      const snapshots = [];
      const fixtureId = `ucl-2026-27-md02-${test.id}`;
      const label = `${fixtureId}-${test.width}-${test.legacy ? 'legacy' : 'shared'}`;
      for (const baseline of [true, false]) {
        const context = await browser.newContext({viewport: {width: test.width, height: 1000}, reducedMotion: 'reduce'});
        try {
          const page = await context.newPage(), requests = [], errors = [], failedResponses = [];
          page.on('pageerror', error => errors.push(error.message));
          page.on('request', request => requests.push(new URL(request.url()).pathname));
          page.on('response', response => {if (response.url().startsWith(base) && response.status() >= 400) failedResponses.push([response.status(), response.url()]);});
          await page.route('https://fonts.googleapis.com/**', route => route.abort());
          await page.route('https://fonts.gstatic.com/**', route => route.abort());
          // Change only the loaded artifact back to the complete original archive.
          if (baseline) await page.route('**/js/pages/champions.js*', route => route.fulfill({contentType: 'text/javascript', body: oldRenderer}));
          await page.goto(`${base}/champions-league.html?match=${fixtureId}${test.legacy ? '&layout=legacy' : ''}`, {timeout: 90000});
          await page.waitForSelector('[data-champions-workspace="2"]', {state: 'attached', timeout: 90000});
          if (!test.legacy) await page.waitForSelector('.rd-shell');
          await page.waitForLoadState('networkidle');
          await page.evaluate(() => document.fonts.ready);
          assert.deepEqual(errors, [], label + ': JavaScript errors');
          assert.deepEqual(failedResponses, [], label + ': failed resources');
          assert.equal(requests.filter(url => url === '/' + sourcePath).length, baseline ? 1 : 0);
          assert.equal(requests.filter(url => url === '/' + outputPath).length, baseline ? 0 : 1);
          const state = await page.locator('#app').evaluate(node => ({
            html: node.innerHTML, text: node.innerText,
            overflow: document.documentElement.scrollWidth > innerWidth + 1,
            selections: [...node.querySelectorAll('[data-selection-row]')].map(row => ({id: row.dataset.selectionId, text: row.innerText, odds: row.dataset.odds, probability: row.dataset.probability, ev: row.dataset.ev, settlement: row.dataset.settlement})),
            controls: [...node.querySelectorAll('button,input,select,a')].map(n => ({tag:n.tagName, text:n.textContent, disabled:n.disabled, href:n.getAttribute('href'), pressed:n.getAttribute('aria-pressed')}))
          }));
          const image = await page.screenshot({path: path.join(out, `${label}-${baseline ? 'before' : 'after'}.png`), fullPage: true, animations: 'disabled', caret: 'hide'});
          // Open the same disclosures to exercise archived selections and rosters.
          await page.locator('#app details > summary').evaluateAll(nodes => nodes.forEach(n => n.click()));
          const expanded = await page.locator('#app').evaluate(n => ({text: n.innerText, html: n.innerHTML}));
          snapshots.push({state, expanded, image, errors, requests});
        } finally { await context.close(); }
      }
      assert.deepEqual(snapshots[1].state, snapshots[0].state, label + ': rendered DOM, results or controls changed');
      assert.deepEqual(snapshots[1].expanded, snapshots[0].expanded, label + ': expanded content changed');
      const originalImage = PNG.sync.read(snapshots[0].image), projectedImage = PNG.sync.read(snapshots[1].image);
      assert.equal(projectedImage.width, originalImage.width);
      assert.equal(projectedImage.height, originalImage.height);
      // Chromium gradient dithering varies between contexts. Compare perceived
      // colors with the standard pixelmatch threshold; DOM comparison stays exact.
      const changedPixels = pixelmatch(originalImage.data, projectedImage.data, null, originalImage.width, originalImage.height, {threshold: 0.1});
      assert.equal(changedPixels, 0, label + ': perceptual screenshot differences');
      results.push({...test, fixtureId, dom: 'IDENTICAL', expanded: 'IDENTICAL', changedPixels, threshold: 0.1, overflow: snapshots[1].state.overflow, rows: snapshots[1].state.selections.length});
      console.log('PASS', label);
    }
    assert.deepEqual(protectedFiles.map(hash), before, 'Protected source data changed');
    fs.writeFileSync(path.join(out, 'audit.json'), JSON.stringify({results, protectedInputs: 'UNCHANGED', fonts: 'External fonts blocked equally in both comparisons', baseline: 'Same renderer loading the complete original integration'}, null, 2) + '\n');
    console.log(JSON.stringify({comparisons: results.length, status: 'PASS', protectedInputs: 'UNCHANGED'}));
  } finally { await browser?.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => {console.error(error.message); process.exitCode = 1; server.close();});
