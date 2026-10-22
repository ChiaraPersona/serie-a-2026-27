'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),read=f=>JSON.parse(fs.readFileSync(path.join(root,f),'utf8'));
const matches=read('data/normalized/matches.json'),round=matches.filter(m=>m.competition==='serie-a'&&m.matchday===8),ids=new Set(round.map(m=>m.id));
const predictions=read('data/normalized/predictions.json'),lineups=read('data/sources/probable-lineups-md8-2026-27.json'),catalog=read('data/normalized/reading-md08-market-catalog.json').marketCatalog;
assert.equal(round.length,10);assert.equal(catalog.matches.length,10);
for(const [file,key] of [['predictions','predictions'],['readings',null]]){
 const prior=read(`output/md08-reading-refresh/${file}-before.json`),now=read(`data/normalized/${file}.json`);
 assert.deepEqual((key?now[key]:now).filter(p=>!ids.has(p.matchId)),(key?prior[key]:prior).filter(p=>!ids.has(p.matchId)),`${file}: giornate estranee alterate`);
}
const history=matches.filter(m=>m.status==='finished');assert(history.every(m=>m.matchday<8));
const stats=read('data/analysis/serie-a-md08-statistical-models.json');
assert.equal(stats.dataCutoff.matchdayExclusive,8);
assert.deepEqual(stats.validation,read('data/analysis/serie-a-md06-statistical-models-2026-10-10.json').validation,'Criteri di validazione alterati');
const odds=read('data/normalized/odds/sisal/serie-a.json');
for(const match of round){
 const p=predictions.predictions.find(p=>p.matchId===match.id),event=odds.events.find(e=>e.canonicalMatchId===match.id);
 assert(p);assert.equal(p.futureDataDiagnostics.dataCutoff.matchdayExclusive,8);assert.equal(p.futureDataDiagnostics.dataCutoff.targetMatchIdExcluded,match.id);
 assert(p.dataQuality.lineupResolved.complete);assert.equal(p.shooters.allPlayers.length,20);assert.equal(p.likelyBooked.length,5);
 assert(new Date(event.retrievedAt)<new Date(`${match.date}T${match.kickoff}:00+02:00`));
 for(const t of p.teamProjections){assert(t.shotsTotal);assert(t.shotsOnTarget);assert('fouls' in t);assert('cards' in t);assert(t.corners)}
 for(const s of p.shooters.allPlayers){assert(s.playerId);assert(Number.isFinite(s.expectedMinutes));assert(s.expectedMinutesEvidence.lastAppearanceMatchday<=7||s.expectedMinutesEvidence.lastAppearanceMatchday==null);assert(s.shotProbabilities);assert(s.shotOnTargetProbabilities)}
 const projection=read(`data/generated/readings/matches/${match.id}.json`);
 assert.equal(projection.readings.length,1);assert(Object.values(projection.readings[0].sections).every(s=>s.content));
 for(const teamId of [match.homeTeam,match.awayTeam])assert.equal(lineups.teams.find(t=>t.teamId===teamId).status,'probable');
}
if(process.argv.includes('--data-only')){console.log('OK MD8: dati, cutoff, mercati, identità e isolamento.');process.exit(0)}
const {chromium}=require('C:/Users/utente/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp'};
const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!file.startsWith(root+path.sep))return res.writeHead(403).end();fs.readFile(file,(e,b)=>{res.writeHead(e?404:200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'});res.end(e?'Missing':b)})});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${server.address().port}`;
 const browser=await chromium.launch({channel:'msedge',headless:true}),results=[],errors=[];
 const {sharedForecastsForMatch}=await import('../js/pages/shared-forecast-contract.mjs');
 try{
  const page=await browser.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='warning'&&m.text().includes('vista precedente'))errors.push(m.text())});
  await page.route('https://fonts.googleapis.com/**',r=>r.abort());await page.route('https://fonts.gstatic.com/**',r=>r.abort());
  for(const match of round)for(const width of [1440,390]){
   await page.setViewportSize({width,height:1000});await page.goto(`${origin}/lettura.html?match=${match.id}`);await page.waitForSelector('[data-md8-availability]');
   const state=await page.evaluate(()=>({shell:!!document.querySelector('.rd-shell'),overflow:document.documentElement.scrollWidth>innerWidth,probable:[...document.querySelectorAll('.rd-lineup-head b')].filter(n=>n.textContent.includes('Probabile')).length,players:document.querySelectorAll('[data-player-card]').length,forecasts:document.querySelectorAll('[data-forecast-id]').length,availability:document.querySelector('[data-md8-availability]').innerText,sections:[...document.querySelectorAll('.rd-section')].map(n=>n.id),text:document.querySelector('.rd-shell').innerText}));
   assert(state.shell);assert(!state.overflow,`${match.id}: overflow ${width}`);assert.equal(state.probable,2);assert(state.players>=20);assert.equal(state.forecasts,sharedForecastsForMatch(catalog,match.id).length);assert(state.availability.includes('Ballottaggi:'));assert(state.text.includes('Falli'));
   assert(!/Fonti|Provenienza|Fantacalcio\.it|Sisal/.test(state.availability));
   const bench=page.locator('[data-player-lineup-filter="bench"]');await bench.click();assert.equal(await bench.getAttribute('aria-pressed'),'true');await page.locator('[data-player-lineup-filter="starter"]').click();
   results.push({matchId:match.id,width,...state,text:undefined});
   if(match===round[0]){await page.locator('#lettura-formazioni').screenshot({path:path.join(root,`reports/md08-reading-refresh/formazioni-${width}.png`)});await page.screenshot({path:path.join(root,`reports/md08-reading-refresh/lettura-${width}.png`),fullPage:true})}
  }
  assert.deepEqual(errors,[]);fs.writeFileSync(path.join(root,'reports/md08-reading-refresh/browser-audit.json'),JSON.stringify({results,errors},null,2)+'\n');console.log('OK MD8: 10 dettagli × desktop/mobile, formazioni probabili, disponibilità, mercati e filtri.');
 }finally{await browser.close();server.close()}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
