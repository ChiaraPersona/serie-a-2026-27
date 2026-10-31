'use strict';
const { readJsonFile: storageReadJson } = require('./sisal/dataset-store.cjs');
// Fixture-scoped orchestration. All forecasts and admission gates belong to the existing engines.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),read=f=>storageReadJson(path.join(root,f));
const write=(f,d)=>{fs.mkdirSync(path.dirname(path.join(root,f)),{recursive:true});fs.writeFileSync(path.join(root,f)+'.md10.tmp',JSON.stringify(d,null,2)+'\n');(()=>{for(let i=0;;i++){try{fs.renameSync(path.join(root,f)+'.md10.tmp',path.join(root,f));return}catch(e){if(i===9)throw e;Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,300)}}})()};
const fixtures=read('data/normalized/matches.json'),round=fixtures.filter(m=>m.competition==='serie-a'&&m.matchday===10),ids=new Set(round.map(m=>m.id));
assert.equal(round.length,10);assert(round.every(m=>m.status==='scheduled'),'MD10 già iniziata: rigenerazione bloccata');
const lineups=read('data/sources/probable-lineups-md10-2026-27.json');
assert.equal(lineups.matchday,10);assert.equal(lineups.teams.length,20);
const conflicts=[],unresolved=[];
for(const t of lineups.teams){
 assert(ids.has(t.matchId));assert.equal(t.status,'probable');
 const starters=t.players.filter(p=>p.lineupStatus==='starter');assert.equal(starters.length,11);
 const resolvedStarters=starters.filter(p=>p.playerId);
 assert.equal(new Set(resolvedStarters.map(p=>p.playerId)).size,resolvedStarters.length);
 for(const p of starters.filter(p=>!p.playerId))unresolved.push({teamId:t.teamId,kind:'starter',sourceName:p.sourceName,sourceId:p.sourceId});
 for(const key of ['unavailable','suspended','doubtful','ballots'])for(const p of (t[key]||[]).flat()){
  if(!p.playerId)unresolved.push({teamId:t.teamId,kind:key,sourceName:p.sourceName,sourceId:p.sourceId});
  if(['unavailable','suspended'].includes(key)&&starters.some(s=>s.sourceId===p.sourceId))conflicts.push({teamId:t.teamId,kind:key,player:p.sourceName});
 }
 // Do not silently feed a stale team projection to the engine.
 const meta=read('data/teams/index.json').teams.find(q=>q.id===t.teamId),projected=meta.projectedLineup||meta.probableLineup;
 assert.equal(projected.matchday,10);assert.deepEqual(projected.players,starters.map(p=>p.sourceName),`Proiezione da integrare: ${t.teamId}`);
}
assert.deepEqual(conflicts,[],'Conflitti tra probabili titolari e indisponibili');
const before=read('data/normalized/predictions.json');
const output='output/md10-reading-refresh/predictions-candidate.json';
fs.mkdirSync(path.join(root,'output/md10-reading-refresh'),{recursive:true});
execFileSync(process.execPath,['--experimental-require-module','scripts/build-predictions.js'],{cwd:root,stdio:'inherit',env:{...process.env,SERIE_A_PREDICTION_PREVIEW_MATCHDAY:'10',SERIE_A_PREDICTION_OUTPUT:output}});
const candidate=read(output);assert.equal(candidate.predictions.length,10);
const latest=new Map(candidate.predictions.map(p=>[p.matchId,p]));
const predictionsData={...before,generatedAt:candidate.generatedAt,predictions:before.predictions.map(p=>latest.get(p.matchId)||p)};
for(const p of candidate.predictions)if(!before.predictions.some(q=>q.matchId===p.matchId))predictionsData.predictions.push(p);
assert.deepEqual(predictionsData.predictions.filter(p=>!ids.has(p.matchId)),before.predictions.filter(p=>!ids.has(p.matchId)));
const statistical=require('./md06-statistical-models'),{buildMd06MarketCatalog}=require('./md06-market-catalog');
const odds=read('data/normalized/odds/sisal/serie-a.json'),roundOdds={...odds,events:odds.events.filter(e=>ids.has(e.canonicalMatchId))};
assert.equal(roundOdds.events.length,10);
const frozen=read('data/analysis/serie-a-md06-statistical-models-2026-10-10.json'),prior=statistical.reconstructPriorSeason();
const current=statistical.currentSeasonActuals().filter(m=>m.matchday<10&&Object.values(m.metrics).every(v=>Number.isFinite(v.home)&&Number.isFinite(v.away)));
const evaluated=statistical.buildCurrentEvaluations({odds:roundOdds,fixtures,history:[...prior,...current],validation:frozen.validation,priorTeamIds:new Set(prior.flatMap(m=>[m.homeTeam,m.awayTeam])),matchday:10});
const statsPath='data/analysis/serie-a-md10-statistical-models.json';
for(const e of Object.values(evaluated.evaluations))e.sourcePath=statsPath;
const statisticalModels={...frozen,scope:'Serie A MD10; frozen MD6 validation',generatedAt:candidate.generatedAt,dataCutoff:{matchdayExclusive:10,completedOnly:true,currentMatchIds:current.map(m=>m.id)},dataCoverage:{...frozen.dataCoverage,currentMatches:current.length},currentForecasts:evaluated.forecasts,evaluations:evaluated.evaluations};
const marketCatalog=buildMd06MarketCatalog({predictionsData:{...predictionsData,predictions:candidate.predictions},odds:roundOdds,matches:fixtures,schedinaSlips:[],probableLineups:lineups,officialLineups:read('data/sources/official-lineups-2026-27.json'),statisticalModels,matchday:10});
for(const m of marketCatalog.matches)for(const leg of m.selections)leg.isOutsider=leg.betSelection?.operational?.classification==='OUTSIDER';
write('data/normalized/predictions.json',predictionsData);
write(statsPath,statisticalModels);
write('data/normalized/reading-md10-market-catalog.json',{matchday:10,generatedAt:candidate.generatedAt,marketCatalog});
const teamNames=new Map(read('data/normalized/teams.json').map(t=>[t.id,t.name]));
for(const fixture of round){
 const p=latest.get(fixture.id),sides=lineups.teams.filter(t=>t.matchId===fixture.id);
 const section=(content,signals=[])=>({content,signals,sources:[]});
 const availability=sides.flatMap(t=>['unavailable','suspended','doubtful','ballots'].map(key=>`${t.team} · ${key==='unavailable'?'Indisponibili':key==='suspended'?'Squalificati':key==='doubtful'?'In dubbio':'Ballottaggi'}: ${(t[key]||[]).flat().map(q=>`${q.currentName||q.sourceName}${q.description?` (${q.description})`:''}`).join('; ')||'nessuna segnalazione nello snapshot'}`));
 const source={id:`lettura-${fixture.id}`,matchId:fixture.id,status:'published',prototype:true,updatedAt:String(lineups.importedAt).slice(0,10),title:`${teamNames.get(fixture.homeTeam)} - ${teamNames.get(fixture.awayTeam)}`,summary:`${p.verdict.label}. Formazioni probabili, da riconfermare; dati statistici limitati alle gare concluse prima della MD10.`,sections:{
  context:section(`Serie A 2026/27, 10ª giornata. ${fixture.date} alle ${fixture.kickoff}. Analisi prepartita; meteo attendibile N/D.`),
  form:section('Statistiche 2025/26 e gare concluse 2026/27 fino alla nona giornata; nessun risultato MD10 utilizzato.',[p.futureDataDiagnostics.home,p.futureDataDiagnostics.away].map(t=>`${teamNames.get(t.teamId)}: ${t.currentMatchesUsed} gare correnti disponibili.`)),
  availability:section('Probabili formazioni e disponibilità editoriali: gli undici non sono ufficiali. I dubbi restano distinti dalle assenze.',availability),
  tactics:section(p.scenarios[0].description,sides.map(t=>`${t.team}: ${t.formation}, formazione probabile.`)),
  referee:section(fixture.refereeAssignment?`Arbitro designato: ${fixture.refereeAssignment.referee.name}.`:'Designazione arbitrale N/D; nessuna attribuzione presunta.',fixture.refereeAssignment?[`Assistenti: ${fixture.refereeAssignment.assistants.join(' - ')}.`,`IV ufficiale: ${fixture.refereeAssignment.fourthOfficial}.`,`VAR: ${fixture.refereeAssignment.var}; AVAR: ${fixture.refereeAssignment.avar}.`]:[]),
  market:section(`Confronto quote prepartita aggiornato al ${String(p.market.retrievedAt).slice(0,10)}. Quote esterne al modello; i contratti non compatibili restano senza probabilità certificata.`),
  synthesis:section(`${p.verdict.label}; confidenza ${p.confidence.value}/100 (${p.confidence.level}).`,p.scenarios.slice(1).map(s=>s.description))
 },internalSources:[{label:lineups.provider,url:lineups.sourceUrl,rawSnapshot:lineups.rawSnapshot,retrievedAt:lineups.importedAt},...fixture.sources.filter(s=>s.sourceType==='aia-figc-designations')]};
 write(`data/sources/readings/${fixture.id}.json`,source);
}
execFileSync(process.execPath,['scripts/build-readings.js','--matchday','10'],{cwd:root,stdio:'inherit'});
write('reports/md10-reading-refresh/data-audit.json',{generatedAt:candidate.generatedAt,coverage:lineups.coverage,conflicts,unresolved,oddsRetrievedAt:odds.retrievedAt,marketTotals:marketCatalog.totals,fixtures:candidate.predictions.map(p=>({matchId:p.matchId,dataCutoff:p.futureDataDiagnostics?.dataCutoff,lineupResolved:p.dataQuality.lineupResolved,outfieldPlayersModeled:p.dataQuality.outfieldPlayersModeled,teamVolumes:p.teamProjections.map(t=>({teamId:t.teamId,shots:!!t.shotsTotal,sot:!!t.shotsOnTarget,fouls:!!t.fouls,cards:!!t.cards,corners:!!t.corners})),missing:p.dataQuality.missing,playerMarkets:p.playerMarkets}))});
console.log('MD10: aggiornati solo previsioni, catalogo Lettura e diagnostica della giornata.');
