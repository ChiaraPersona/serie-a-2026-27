'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const {chromium} = require('C:/Users/utente/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const {start} = require('./server.cjs');
const {root, digest} = require('./model.cjs');
const {summarize} = require('./report.cjs');
const out = path.join(root, 'output/lineup-admin/browser');
const port = Number(process.env.LINEUP_TEST_PORT || 18788);
const server = start({port});
(async () => {
  let browser;
  const canonical = path.join(root, 'data/sources/champions-official-formations-md05-2026-27.json');
  const before = digest(fs.readFileSync(canonical, 'utf8'));
  const results = [];
  try {
    await new Promise(resolve => server.listening ? resolve() : server.once('listening', resolve));
    fs.mkdirSync(out, {recursive: true});
    browser = await chromium.launch({headless: true, channel: 'msedge'});
    for (const width of [1440, 390]) {
      const context = await browser.newContext({viewport: {width, height: 1000}});
      const page = await context.newPage(); const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('dialog', dialog => dialog.accept());
      await page.goto(`http://127.0.0.1:${port}`);
      await page.waitForSelector('[data-team]');
      assert.equal(await page.locator('[data-team]').count(), 2);
      assert(await page.locator('#calculate').isDisabled(), 'Serie A recalculation must be disabled');
      const emptyTeam = page.locator('[data-team]').first();
      const defaultFormation = await emptyTeam.locator('[data-formation]').inputValue();
      assert(defaultFormation);
      assert.equal(await emptyTeam.locator('[data-slot]').count(), 11);
      assert.equal(await emptyTeam.locator('[data-selected-player]').count(), 11, 'Expected prefilled XI');
      await emptyTeam.screenshot({path: path.join(out, `pitch-prefilled-${width}.png`)});
      await emptyTeam.locator('[data-slot="0"]').click();
      const emptyPicker = emptyTeam.locator('dialog');
      await emptyPicker.locator('[data-pick-player]:enabled').first().click();
      assert.equal(await emptyTeam.locator('[data-selected-player]').count(), 11);
      await emptyTeam.locator('[data-formation]').selectOption('3-5-2');
      assert.deepEqual(await emptyTeam.locator('[data-line]').evaluateAll(rows => rows.map(row => row.children.length)), [1, 3, 5, 2]);
      assert.equal(await emptyTeam.locator('[data-selected-player]').count(), 11);
      await page.locator('#competition').selectOption('champions');
      await page.waitForFunction(() => current?.fixture.competition === 'champions' && document.querySelectorAll('[data-slot]').length === 22);
      assert.equal(await page.locator('.count').allTextContents().then(a => a.filter(t => t === '11 / 11 titolari').length), 2);
      await page.locator('#review').click();
      await page.waitForFunction(() => document.querySelector('#feedback').textContent.includes('Formazioni pronte'));
      assert((await page.locator('#feedback').innerText()).includes('Entrano: nessuno'), 'XI order and identity should remain unchanged');
      // Remove one starter and verify that an invalid XI cannot be saved.
      const firstTeam = page.locator('[data-team]').first();
      const first = firstTeam.locator('[data-slot="0"]');
      const originalId = await first.getAttribute('data-selected-player');
      await first.click(); await firstTeam.getByRole('button', {name: 'Libera questa posizione'}).click();
      await page.locator('#save').click();
      await page.waitForFunction(() => document.querySelector('#feedback').textContent.includes('esattamente 11'));
      await first.click();
      const picker = firstTeam.locator('dialog');
      const otherStarterId = await firstTeam.locator('[data-slot="1"]').getAttribute('data-selected-player');
      assert(await picker.locator(`[data-pick-player="${otherStarterId}"]`).isDisabled(), 'Duplicate starter must be disabled');
      await picker.locator('input[type="search"]').fill('zzzz-no-player');
      assert.equal(await picker.locator('[data-pick-player]').count(), 0);
      await picker.locator('input[type="search"]').fill('');
      await picker.locator(`[data-pick-player="${originalId}"]`).click();
      // A previous-match reference deliberately does not carry an old bench.
      if (!await firstTeam.locator('[data-remove-bench]').count()) {
        await firstTeam.locator('[data-add-bench]').click();
        await picker.locator('[data-pick-player]:enabled').first().click();
      }
      await page.locator('#note').fill('Verifica pannello locale: formazione canonica invariata.');
      await page.locator('#save').click();
      await page.waitForFunction(() => document.querySelector('#feedback').textContent.includes('Bozza salvata sul computer'));
      const benchId = await firstTeam.locator('[data-remove-bench]').first().getAttribute('data-remove-bench');
      await first.click(); await picker.locator(`[data-pick-player="${benchId}"]`).click();
      assert.equal(await firstTeam.locator(`[data-remove-bench="${benchId}"]`).count(), 0, 'Promoted starter left in bench');
      assert.equal(await firstTeam.locator(`[data-selected-player="${benchId}"]`).count(), 1);
      await page.locator('#restore').click();
      await page.waitForFunction(() => document.querySelector('#feedback').textContent.includes('Bozza ripresa'));
      assert.equal(await page.locator('[data-bench-confirmed]:checked').count(), 0);
      assert.equal(await firstTeam.locator('[data-slot="0"]').getAttribute('data-selected-player'), originalId);
      const existingFormation = await firstTeam.locator('[data-formation]').inputValue();
      const originalSlots = await firstTeam.locator('[data-selected-player]').evaluateAll(slots => slots.map(s => s.dataset.selectedPlayer));
      await firstTeam.locator('[data-formation]').selectOption('4-3-3');
      assert.deepEqual(await firstTeam.locator('[data-selected-player]').evaluateAll(slots => slots.map(s => s.dataset.selectedPlayer)), originalSlots);
      await firstTeam.locator('[data-formation]').selectOption(existingFormation);
      if (width === 1440 && process.argv.includes('--recalculate')) {
        await page.locator('[data-bench-confirmed]').nth(0).check();
        await page.locator('[data-bench-confirmed]').nth(1).check();
        await page.locator('#calculate').click();
        await page.waitForFunction(() => /Ricalcolo locale completato|Ricalcolo non completato|Aggiornamento non avviato/.test(document.querySelector('#feedback').textContent), null, {timeout: 720000});
        assert((await page.locator('#feedback').innerText()).includes('Ricalcolo locale completato'), await page.locator('#feedback').innerText());
      }
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, 'Horizontal overflow');
      assert.deepEqual(errors, []);
      await page.screenshot({path: path.join(out, `panel-${width}.png`), fullPage: true});
      const runDirectory = path.join(root, 'output/lineup-admin/runs');
      const successful = fs.existsSync(runDirectory) ? fs.readdirSync(runDirectory).map(id => path.join(runDirectory, id)).filter(dir => fs.existsSync(path.join(dir, 'lineup-admin-report.json')))
        .map(dir => ({dir, report: JSON.parse(fs.readFileSync(path.join(dir, 'lineup-admin-report.json'), 'utf8'))})).find(run => run.report.status === 'completed') : null;
      if (successful) {
        const report = {...successful.report, before: summarize(root, successful.report.fixtureId), after: summarize(successful.dir, successful.report.fixtureId)};
        await page.evaluate(report => {feedback('Risultato della prova isolata'); showProjection(report);}, report);
        assert.equal(await page.locator('.projection tr').count(), 7);
        assert((await page.locator('#feedback').innerText()).includes('non validata'), 'Model limits missing');
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
        await page.locator('#feedback').screenshot({path: path.join(out, `projection-${width}.png`)});
      }
      results.push({width, checks: 'pitch slots, formation change, player search, duplicate prevention, bench promotion, XI validation, save/restore, responsive layout, no browser errors'});
      await context.close();
    }
    assert.equal(digest(fs.readFileSync(canonical, 'utf8')), before, 'Canonical lineup modified');
    fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(results, null, 2));
    console.log('PASS desktop/mobile: ' + JSON.stringify(results));
  } finally {await browser?.close(); server.close();}
})().catch(error => {console.error(error); process.exitCode = 1;});
