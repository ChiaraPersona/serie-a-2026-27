const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const assert = require('node:assert/strict');
const {chromium} = require('C:/Users/utente/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root = path.resolve(__dirname, '..');
const baseline = process.argv.includes('--baseline');
const out = path.join(root, 'output/team-dashboard');
fs.mkdirSync(out, {recursive:true});
const server = http.createServer((req,res) => {
  const file = path.join(root, decodeURIComponent(req.url.split('?')[0]));
  res.setHeader('Content-Type', ({'.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.html':'text/html','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg'})[path.extname(file)] || 'application/octet-stream');
  fs.readFile(file,(error,data)=>{res.statusCode=error?404:200;res.end(error?'Missing':data);});
});
(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  let browser;
  const results=[];
  try {
    browser = await chromium.launch({headless:true,channel:'msedge'});
    const page = await browser.newPage();
    // Freeze only browser responses at the original Git data: another chat may
    // refresh fixture lineups in the shared workspace during this visual audit.
    const originalTeams=new Map();
    await page.route('**/data/teams/**',route=>{
      const file=new URL(route.request().url()).pathname.slice(1);
      if(!originalTeams.has(file)) originalTeams.set(file,require('node:child_process').execFileSync('git',['show',`HEAD:${file}`],{cwd:root,encoding:'utf8'}));
      return route.fulfill({contentType:'application/json',body:originalTeams.get(file)});
    });
    const errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    for (const team of ['atalanta','juventus','parma','napoli']) {
      for (const width of baseline?[1440]:[1440,1280,768,390]) {
        await page.setViewportSize({width,height:1000});
        await page.goto(`http://127.0.0.1:${server.address().port}/statistiche-squadra/${team}.html`);
        await page.waitForSelector('.squad-leader-card');
        await page.evaluate(()=>document.querySelectorAll('#team-squad-app details').forEach(el=>el.open=true));
        const content = await page.evaluate(()=>({
          metrics:[...document.querySelectorAll('.team-season-list>div')].map(el=>el.textContent),
          style:document.querySelector('.team-style-section')?.textContent,
          leaders:document.querySelector('.squad-leaderboards')?.textContent,
          comparator:document.querySelector('[data-team-comparator-result]')?.textContent,
          roster:document.querySelector('#squad-results')?.textContent,
          links:[...document.querySelectorAll('#team-squad-app a[href]')].map(el=>el.getAttribute('href')).sort()
        }));
        const file=path.join(out,`${team}-baseline.json`);
        if(baseline){fs.writeFileSync(file,JSON.stringify(content,null,2));continue;}
        assert.deepEqual(content,JSON.parse(fs.readFileSync(file)),`${team} ${width}: contenuti preservati`);
        const layout=await page.evaluate(()=>{
          const players=[...document.querySelectorAll('.team-vertical-field .reading-kit-player')];
          const rects=players.map(el=>el.getBoundingClientRect());
          return {overflow:document.documentElement.scrollWidth>innerWidth,players:players.length,
            collisions:rects.some((a,i)=>rects.some((b,j)=>i<j&&a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top)),
            keeperBottom:players.every(el=>el.classList.contains('is-goalkeeper')||el.getBoundingClientRect().top<players[0].getBoundingClientRect().top)};
        });
        assert.equal(layout.overflow,false,`${team} ${width}: overflow pagina`);
        assert.equal(layout.players,11);assert.equal(layout.collisions,false,`${team} ${width}: collisioni`);assert.equal(layout.keeperBottom,true);
        await page.screenshot({path:path.join(out,`${team}-${width}.png`),fullPage:true});
        if(team==='atalanta') {
          for(const selector of ['.team-detail-hero','.team-tactics-section','.team-player-comparator']) {
            await page.locator(selector).screenshot({path:path.join(out,`atalanta-${width}-${selector.slice(1)}.png`),style:'.site-header{visibility:hidden}'});
          }
        }
        results.push({team,width,...layout});
        if(width===390) {
          const squad=JSON.parse(originalTeams.get(`data/teams/${team}.json`)).squad;
          await page.locator('[data-team-comparator="0"]').fill(squad[2].name);
          assert.equal(await page.locator('.player-comparator-head h3').first().textContent(),squad[2].name);
          await page.locator('[data-team-comparator="0"]').press('Escape');
          await page.locator('button.leader-player').first().click();
          assert(await page.locator('#player-detail').evaluate(el=>el.open));
          await page.locator('.player-detail-close').click();
        }
      }
    }
    if(!baseline) {
      const original = require('node:child_process').execFileSync('git',['show','HEAD:js/components/lineup-field.mjs'],{cwd:root,encoding:'utf8'});
      const captures=[];
      for(const before of [true,false]) {
        const context=await browser.newContext({viewport:{width:1280,height:1000}});
        const reading=await context.newPage();
        if(before) await reading.route('**/js/components/lineup-field.mjs',route=>route.fulfill({contentType:'text/javascript',body:original}));
        await reading.goto(`http://127.0.0.1:${server.address().port}/lettura.html?match=milan-atalanta-2026-27-md-07`);
        await reading.waitForSelector('.reading-horizontal-field .reading-kit-shirt');
        assert.equal(await reading.locator('.reading-horizontal-field .reading-kit-shirt').count(),22);
        captures.push(await reading.locator('.reading-horizontal-field').screenshot({path:path.join(out,`reading-${before?'before':'after'}.png`),animations:'disabled',style:'.site-header{visibility:hidden}'}));
        await context.close();
      }
      assert(captures[0].equals(captures[1]),'Campo orizzontale Letture: confronto pixel invariato');
      console.log('Letture: campo orizzontale identico pixel per pixel');
    }
    assert.deepEqual(errors,[],'Nessun errore JavaScript nel browser');
    fs.writeFileSync(path.join(out,baseline?'baseline-report.json':'responsive-report.json'),JSON.stringify(results,null,2));
    console.log(baseline?'Baseline acquisita per 4 squadre':`${results.length} controlli responsive e contenuti superati`);
  } finally {await browser?.close();server.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
