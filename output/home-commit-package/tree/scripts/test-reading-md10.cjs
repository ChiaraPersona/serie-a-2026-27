'use strict';
const { readJsonFile: storageReadJson } = require('./sisal/dataset-store.cjs');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),read=f=>storageReadJson(path.join(root,f));
const matches=read('data/normalized/matches.json'),round=matches.filter(m=>m.competition==='serie-a'&&m.matchday===10),ids=new Set(round.map(m=>m.id));
const predictions=read('data/normalized/predictions.json'),lineups=read('data/sources/probable-lineups-md10-2026-27.json'),catalog=read('data/normalized/reading-md10-market-catalog.json').marketCatalog;
assert.equal(round.length,10);assert.equal(catalog.matches.length,10);
for(const [file,key] of [['predictions','predictions'],['readings',null]]){
 const prior=JSON.parse(require('child_process').execFileSync('git',['show',`HEAD:data/normalized/${file}.json`],{encoding:'utf8',maxBuffer:128e6})),now=read(`data/normalized/${file}.json`);
 assert.deepEqual((key?now[key]:now).filter(p=>!ids.has(p.matchId)),(key?prior[key]:prior).filter(p=>!ids.has(p.matchId)),`${file}: giornate estranee alterate`);
}
const history=matches.filter(m=>m.status==='finished');assert(history.every(m=>m.matchday<10));
const stats=read('data/analysis/serie-a-md10-statistical-models.json');
assert.equal(stats.dataCutoff.matchdayExclusive,10);
assert.deepEqual(stats.validation,read('data/analysis/serie-a-md06-statistical-models-2026-10-10.json').validation,'Criteri di validazione alterati');
const odds=read('data/normalized/odds/sisal/serie-a.json');
const assignments=read('data/sources/referee-assignments-2026-27.json').matchdays.find(d=>d.matchday===10);
for(const match of round){
 const p=predictions.predictions.find(p=>p.matchId===match.id),event=odds.events.find(e=>e.canonicalMatchId===match.id);
 assert(p);assert.equal(p.futureDataDiagnostics.dataCutoff.matchdayExclusive,10);assert.equal(p.futureDataDiagnostics.dataCutoff.targetMatchIdExcluded,match.id);
 const missing=lineups.teams.filter(t=>t.matchId===match.id).flatMap(t=>t.players.filter(q=>q.lineupStatus==='starter'&&!q.playerId)); assert(p.dataQuality.lineupResolved.resolved<=22);assert(p.shooters.allPlayers.length<=20);for(const unknown of missing)assert(!catalog.matches.find(m=>m.matchId===match.id).selections.some(l=>l.suggestionAnalysis?.suggested&&String(l.label).includes(unknown.sourceName)),"Identita non verificata nelle selezioni operative");assert(p.likelyBooked.length>0);
 assert(new Date(event.retrievedAt)<new Date(`${match.date}T${match.kickoff}:00+02:00`));
 for(const t of p.teamProjections){assert(t.shotsTotal);assert(t.shotsOnTarget);assert('fouls' in t);assert('cards' in t);assert(t.corners)}
 for(const s of p.shooters.allPlayers){assert(s.playerId);assert(Number.isFinite(s.expectedMinutes));assert(s.expectedMinutesEvidence.lastAppearanceMatchday<=9||s.expectedMinutesEvidence.lastAppearanceMatchday==null);assert(s.shotProbabilities);assert(s.shotOnTargetProbabilities)}
 const projection=read(`data/generated/readings/matches/${match.id}.json`);
 assert.equal(projection.readings.length,1);assert(Object.values(projection.readings[0].sections).every(s=>s.content));
 if(assignments){
  const {matchId,...assignment}=assignments.assignments.find(a=>a.matchId===match.id);
  assert.deepEqual(match.refereeAssignment,assignment);
  assert(!p.dataQuality.missing.includes('designazione arbitrale'));
  assert(p.likelyBooked.every(b=>b.refereeFactorSource==='DESIGNATED_REFEREE_HISTORICAL_SAMPLE'));
  const history=read('data/generated/reading-referee-history.json').fixtures.find(f=>f.fixtureId===match.id);
  assert.equal(history.refereeId,assignment.referee.slug);assert.equal(history.rows.length,5);assert(history.rows.every(r=>r.date.slice(0,10)<match.date));
 }
 for(const teamId of [match.homeTeam,match.awayTeam])assert.equal(lineups.teams.find(t=>t.teamId===teamId).status,'probable');
}
if(process.argv.includes('--data-only')){console.log('OK MD10: dati, cutoff, mercati, identità e isolamento.');process.exit(0)}
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
   await page.setViewportSize({width,height:1000});await page.goto(`${origin}/lettura.html?match=${match.id}`);await page.waitForSelector('.rd-lineup-head');
   const state=await page.evaluate(()=>({shell:!!document.querySelector('.rd-shell'),overflow:document.documentElement.scrollWidth>innerWidth,probable:[...document.querySelectorAll('.rd-lineup-head b')].filter(n=>n.textContent.includes('Probabile')).length,players:document.querySelectorAll('[data-player-card]').length,forecasts:document.querySelectorAll('[data-forecast-id]').length,availability:document.querySelector('.rd-lineup-head').innerText,sections:[...document.querySelectorAll('.rd-section')].map(n=>n.id),text:document.querySelector('.rd-shell').innerText}));
   assert(state.shell);assert(!state.overflow,`${match.id}: overflow ${width}`);assert.equal(state.probable,2);assert(state.players>=19);assert.equal(state.forecasts,sharedForecastsForMatch(catalog,match.id).length);assert(state.text.includes('Falli'));
   assert(!/Fonti|Provenienza|Fantacalcio\.it|Sisal/.test(state.availability));
   if(assignments){
    const ref=match.refereeAssignment,text=await page.locator('.reading-referee-assignment').innerText();
    for(const name of [ref.referee.name,...ref.assistants,ref.fourthOfficial,ref.var,ref.avar])assert(text.includes(name),`${match.id}: incarico non visibile ${name}`);
    assert(!text.includes('Arbitro non ancora disponibile'));
    if(match===round[0]){await page.locator('#lettura-disciplina').screenshot({path:path.join(root,`reports/md10-reading-refresh/arbitro-${width}.png`)})}
   }
   const bench=page.locator('[data-player-lineup-filter="bench"]');await bench.click();assert.equal(await bench.getAttribute('aria-pressed'),'true');await page.locator('[data-player-lineup-filter="starter"]').click();
   results.push({matchId:match.id,width,...state,text:undefined});
   if(match===round[0]){await page.locator('#lettura-formazioni').screenshot({path:path.join(root,`reports/md10-reading-refresh/formazioni-${width}.png`)});await page.screenshot({path:path.join(root,`reports/md10-reading-refresh/lettura-${width}.png`),fullPage:true})}
  }
  assert.deepEqual(errors,[]);fs.writeFileSync(path.join(root,'reports/md10-reading-refresh/browser-audit.json'),JSON.stringify({results,errors},null,2)+'\n');console.log('OK MD10: 10 dettagli × desktop/mobile, formazioni probabili, disponibilità, mercati e filtri.');
 }finally{await browser.close();server.close()}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
