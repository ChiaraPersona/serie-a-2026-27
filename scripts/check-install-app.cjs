const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const {chromium} = require('C:/Users/utente/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root = path.resolve(__dirname, '..');
const types = {'.html':'text/html', '.js':'text/javascript', '.mjs':'text/javascript', '.css':'text/css', '.json':'application/json', '.webmanifest':'application/manifest+json', '.png':'image/png'};
// Mount below a subpath too, as on repository-based static hosting.
const server = http.createServer((req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  const file = path.resolve(root, '.' + pathname.replace(/^\/demo/, ''));
  if (!file.startsWith(root + path.sep)) {res.writeHead(403).end(); return;}
  fs.readFile(file, (err, data) => {
    res.writeHead(err ? 404 : 200, {'Content-Type':types[path.extname(file)] || 'application/octet-stream'});
    res.end(err ? '' : data);
  });
});
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}/demo/`;
  const browser = await chromium.launch({headless:true, channel:'chrome'});
  try {
    for (const mobile of [false, true]) {
      const context = await browser.newContext({viewport:mobile ? {width:390,height:844} : {width:1440,height:1000}, ...(mobile ? {userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1',isMobile:true,hasTouch:true} : {})});
      const page = await context.newPage();
      page.on('pageerror', error => console.error('Browser:', error.message));
      await page.goto(base + 'index.html');
      await page.evaluate(async () => {
        await navigator.serviceWorker.ready;
        if (!navigator.serviceWorker.controller) await new Promise(resolve => navigator.serviceWorker.addEventListener('controllerchange',resolve,{once:true}));
      });
      const manifest = await page.evaluate(async () => (await fetch(document.querySelector('link[rel="manifest"]').href)).json());
      assert.equal(manifest.display, 'standalone');
      for (const icon of manifest.icons) {
        assert.equal(await page.evaluate(async src => (await fetch(src)).status,base + icon.src),200);
      }
      if (mobile) {
        await page.getByRole('button',{name:'Installa app',exact:true}).click();
        assert.equal(await page.locator('dialog').evaluate(el => el.open),true);
        assert(await page.locator('dialog').evaluate(el => el.getBoundingClientRect().right <= innerWidth));
        await page.getByRole('button',{name:'Ho capito'}).click();
      } else {
        await page.evaluate(() => {
          window.pwaPrompted = false;
          const event = new Event('beforeinstallprompt', {cancelable:true});
          event.prompt = async () => {window.pwaPrompted = true;};
          event.userChoice = Promise.resolve({outcome:'accepted'});
          window.dispatchEvent(event);
        });
        await page.getByRole('button',{name:'Installa app',exact:true}).click();
        assert.equal(await page.evaluate(() => window.pwaPrompted),true);
      }
      await page.goto(base + 'statistiche-squadra/inter.html');
      assert.equal(await page.locator('link[rel="manifest"]').getAttribute('href'),'../manifest.webmanifest');
      await context.setOffline(true);
      await page.goto(base + 'index.html');
      assert.equal(await page.locator('h1').textContent(),'Sei senza connessione');
      assert.equal(await page.evaluate(async () => {
        try {await fetch('data/normalized/teams.json'); return 'stale';} catch {return 'unavailable';}
      }),'unavailable');
      await context.setOffline(false);
      await page.getByRole('button',{name:'Riprova'}).click();
      await page.waitForSelector('.site-header');
      await context.close();
    }
    console.log('PASS: desktop/mobile, installazione, sottocartella, offline, dati senza cache e riconnessione');
  } finally {await browser.close(); server.close();}
})().catch(error => {console.error(error); server.close(); process.exitCode=1;});
