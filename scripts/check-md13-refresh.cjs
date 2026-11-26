'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),http=require('node:http'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),read=f=>JSON.parse(fs.readFileSync(path.join(root,f),'utf8'));
const baseline=f=>JSON.parse(execFileSync('git',['show',`HEAD:${f}`],{cwd:root,maxBuffer:200*1024*1024,encoding:'utf8'}));
async function main(){
 const fixtures=read('data/normalized/matches.json'),ids=new Set(fixtures.filter(f=>f.matchday===13).map(f=>f.id));
 const predictions=read('data/normalized/predictions.json').predictions;
 const probable=read('data/sources/probable-lineups-md13-2026-27.json');assert.equal(probable.coverage.unmatched,0);assert.equal(probable.coverage.starters,220);
 const grandu=probable.teams.find(t=>t.teamId==='cagliari').players.find(p=>p.sourceName==='Grandu');assert.equal(grandu.playerId,'nicola-grandu');
 const granduHistory=fixtures.filter(f=>f.status==='finished').flatMap(f=>Object.values(f.playerStats||{}).flat()).filter(p=>p.playerId==='nicola-grandu');assert.equal(granduHistory.length,2);assert.equal(granduHistory.reduce((n,p)=>n+p.minutes,0),141);
 const odds=require('./sisal/dataset-store.cjs').readJsonFile(path.join(root,'data/normalized/odds/sisal/serie-a.json'));assert.equal(odds.events.filter(e=>ids.has(e.canonicalMatchId)).length,10);
 const priorOdds=baseline('data/normalized/odds/sisal/serie-a.json'),currentOdds=read('data/normalized/odds/sisal/serie-a.json');
 assert.deepEqual(currentOdds.eventIndex.filter(e=>!ids.has(e.event.canonicalMatchId)),priorOdds.eventIndex.filter(e=>!ids.has(e.event.canonicalMatchId)),'Quote estranee alterate');
 const priorFixtures=baseline('data/normalized/matches.json');
 for(const f of priorFixtures)for(const field of ['playerStats','didNotPlay'])for(const players of Object.values(f[field]||{}))for(const p of players){if(p.player==='Nicola Grandu'&&!p.playerId)p.playerId='nicola-grandu';if(p.player==='Matteo Lavelli'&&!p.playerId)p.playerId='matteo-lavelli';}
 assert.deepEqual(fixtures,priorFixtures,'Variazioni oltre ai collegamenti identita Grandu e Lavelli');
 const catalog=read('data/normalized/reading-md13-market-catalog.json').marketCatalog;
 for(const m of catalog.matches)for(const s of m.selections.filter(s=>s.suggestionAnalysis?.suggested)){assert(s.odds>1&&s.providerMarketId&&s.providerSelectionId);assert.equal(s.betSelection.identity.status,'VERIFIED_PROVIDER_IDS');}
 const previousPredictions=baseline('data/normalized/predictions.json').predictions;
 for(const p of previousPredictions)if(p.dataQuality?.missing)p.dataQuality.missing=p.dataQuality.missing.filter(v=>!/meteo|weather/i.test(v));
 assert(predictions.every(p=>!p.dataQuality?.missing?.some(v=>/meteo|weather/i.test(v))));
 assert.deepEqual(predictions.filter(p=>!ids.has(p.matchId)),previousPredictions.filter(p=>!ids.has(p.matchId)));
 const before=baseline('data/normalized/readings.json'),after=read('data/normalized/readings.json');
 for(const r of before)if(r.sections?.context?.content)r.sections.context.content=r.sections.context.content.replaceAll('Analisi prepartita; meteo attendibile N/D.','Analisi prepartita.');
 assert.deepEqual(after.filter(p=>!ids.has(p.matchId)),before.filter(p=>!ids.has(p.matchId)));
 const shots=read('data/normalized/serie-a-shot-events-2026-27.json'),manifest=read('data/sources/serie-a-shot-events-manifest-2026-27.json');
 assert.equal(shots.matches.length,120);assert.equal(shots.summary.missing.length,0);assert.equal(manifest.sources.length,120);
 const priorShots=baseline('data/normalized/serie-a-shot-events-2026-27.json');
 for(const m of priorShots.matches)for(const e of m.events)if(e.teamId==='inter'&&e.providerPlayerId==='49079'&&!e.playerId)e.playerId='matteo-lavelli';
 const priorIds=new Set(priorShots.matches.map(m=>m.fixtureId));
 assert.deepEqual(shots.matches.filter(m=>priorIds.has(m.fixtureId)),priorShots.matches);
 assert.deepEqual(shots.matches.filter(m=>!m.usable).map(m=>m.fixtureId).sort(),['cagliari-inter-2026-27-md-02','como-parma-2026-27-md-04','sassuolo-juventus-2026-27-md-04'].sort());
 for(const m of shots.matches)assert(m.scoreMatches&&m.dateMatches&&m.seasonMatches,m.fixtureId);
 const stats=fixtures.filter(f=>f.status==='finished').flatMap(f=>Object.values(f.teamStats));assert.equal(stats.length,240);
 const fields=['shots','shotsOnTarget','fouls','yellowCards','corners','expectedGoals','hitWoodwork'];
 const coverage=Object.fromEntries(fields.map(k=>[k,{available:stats.filter(s=>Number.isFinite(s[k])).length,total:stats.length}]));
 for(const row of Object.values(coverage))assert.equal(row.available,row.total);
 const {spatialMatchup}=require('./shot-events/matchup.cjs');
 for(const id of ids){
  const p=predictions.find(p=>p.matchId===id);assert(p);assert.equal(p.futureDataDiagnostics.dataCutoff.matchdayExclusive,13);assert.equal(p.dataQuality.outfieldPlayersModeled.modeled,20);
  assert(p.dataQuality.lineupResolved.complete);assert.equal(p.market.status,'available');assert.equal(p.playerMarkets.status,'available');assert(!p.dataQuality.missing.some(m=>/quote|indisponibili|designazione|forma ufficiale/.test(m)));
  const ui=read(`data/generated/readings/matches/${id}.json`);assert.deepEqual(ui.predictionDataset.predictions[0].teamProjections,p.teamProjections);
  const spatial=ui.artifacts['data/generated/reading-spatial-matchup.json'];assert(spatial);
  for(const team of spatial.teams)for(const prior of team.fixtureIds){assert(!ids.has(prior));assert(fixtures.find(f=>f.id===prior).matchday<13);}
 }
 const {chromium}=require('C:/Users/utente/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
 const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.css':'text/css','.svg':'image/svg+xml','.png':'image/png'};
 const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!file.startsWith(root+path.sep))return res.writeHead(403).end();fs.readFile(file,(e,b)=>{res.writeHead(e?404:200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'});res.end(e?'Missing':b)});});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;const uiChecks=[];
 try{browser=await chromium.launch({channel:'msedge',headless:true});for(const width of [1440,390])for(const id of ids){
  const page=await browser.newPage({viewport:{width,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/lettura.html?match=${id}`);await page.waitForSelector('.rd-shell');await page.waitForLoadState('networkidle');
  assert.deepEqual(errors,[],id);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`${id}: ${width}`);
  if(id==='venezia-bologna-2026-27-md-13')await page.screenshot({path:path.join(root,`reports/md13-reading-refresh/desktop-${width}.png`),fullPage:true});
  uiChecks.push({id,width,errors,overflow:false});await page.close();
 }}finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}
 const result={coverage,shots:shots.summary,identities:{starters:220,unmatched:0,granduHistoricalMinutes:141},odds:{fixtures:10,markets:odds.events.filter(e=>ids.has(e.canonicalMatchId)).reduce((n,e)=>n+e.markets.length,0)},remainingMissing:predictions.filter(p=>ids.has(p.matchId)).map(p=>({matchId:p.matchId,missing:p.dataQuality.missing})),protectedPredictionsUnchanged:true,protectedReadingsUnchanged:true,uiChecks};
 fs.writeFileSync(path.join(root,'reports/md13-reading-refresh/verification.json'),JSON.stringify(result,null,2)+'\n');console.log('OK MD13: dati, isolamento, cutoff e 20 verifiche desktop/mobile');
}
main().catch(e=>{console.error(e);process.exitCode=1});
