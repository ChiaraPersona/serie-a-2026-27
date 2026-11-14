'use strict';
// Integrate only MD12 using the existing forecast engine; no new admission rules.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const read=f=>JSON.parse(fs.readFileSync(path.join(root,f),'utf8'));
const write=(f,d)=>{fs.mkdirSync(path.dirname(path.join(root,f)),{recursive:true});fs.writeFileSync(path.join(root,f),JSON.stringify(d,null,2)+'\n');};
const round=read('data/normalized/matches.json').filter(m=>m.competition==='serie-a'&&m.matchday===12),ids=new Set(round.map(m=>m.id));
assert.equal(round.length,10);assert(round.every(m=>m.status==='scheduled'),'MD12 già iniziata');
const lineups=read('data/sources/probable-lineups-md12-2026-27.json');
assert.equal(lineups.matchday,12);assert.equal(lineups.teams.length,20);
const directory=read('data/teams/index.json');
for(const t of lineups.teams){
 const starters=t.players.filter(p=>p.lineupStatus==='starter');
 assert.equal(starters.length,11);assert(starters.every(p=>p.playerId));assert(ids.has(t.matchId));assert.equal(t.status,'probable');
 const meta=directory.teams.find(q=>q.id===t.teamId),projected=meta.projectedLineup||meta.probableLineup;
 assert.equal(projected.matchday,12);assert.deepEqual(projected.players,starters.map(p=>p.sourceName));
}
const before=read('data/normalized/predictions.json'),beforeReadings=read('data/normalized/readings.json');
write('output/md12-reading-refresh/before.json',{predictions:before.predictions.filter(p=>!ids.has(p.matchId)),readings:beforeReadings.filter(r=>!ids.has(r.matchId))});
const output='output/md12-reading-refresh/predictions-candidate.json';
execFileSync(process.execPath,['--experimental-require-module','scripts/build-predictions.js'],{cwd:root,stdio:'inherit',env:{...process.env,SERIE_A_PREDICTION_PREVIEW_MATCHDAY:'12',SERIE_A_PREDICTION_OUTPUT:output}});
const candidate=read(output),latest=new Map(candidate.predictions.map(p=>[p.matchId,p]));assert.equal(latest.size,10);
// This first integration deliberately has no betting catalog: MD12 prices are absent.
assert(candidate.predictions.every(p=>p.market.status==='unavailable'),'Quote disponibili: usare la pipeline del catalogo verificato prima di aggiornare');
const merged={...before,generatedAt:candidate.generatedAt,predictions:[...before.predictions.filter(p=>!ids.has(p.matchId)),...candidate.predictions]};
assert.deepEqual(merged.predictions.filter(p=>!ids.has(p.matchId)),before.predictions.filter(p=>!ids.has(p.matchId)));
write('data/normalized/predictions.json',merged);
const names=new Map(read('data/normalized/teams.json').map(t=>[t.id,t.name]));
const section=(content,signals=[])=>({content,signals,sources:[]});
for(const fixture of round){
 const p=latest.get(fixture.id),sides=lineups.teams.filter(t=>t.matchId===fixture.id);
 const availability=sides.flatMap(t=>['unavailable','suspended','doubtful','ballots'].map(key=>`${t.team} · ${{unavailable:'Indisponibili',suspended:'Squalificati',doubtful:'In dubbio',ballots:'Ballottaggi'}[key]}: ${(t[key]||[]).flat().map(q=>`${q.currentName||q.sourceName}${q.description?` (${q.description})`:''}`).join('; ')||'nessuna segnalazione disponibile'}`));
 write(`data/sources/readings/${fixture.id}.json`,{
  id:`lettura-${fixture.id}`,matchId:fixture.id,status:'published',prototype:true,updatedAt:String(candidate.generatedAt).slice(0,10),title:`${names.get(fixture.homeTeam)} - ${names.get(fixture.awayTeam)}`,
  summary:`${p.verdict.label}. Previsione preliminare con formazioni probabili, da riconfermare. Quote ed EV N/D.`,
  sections:{
   context:section(`Serie A 2026/27, 12ª giornata. ${fixture.date} alle ${fixture.kickoff}. Analisi prepartita; meteo attendibile N/D.`),
   form:section('Statistiche 2025/26 e gare concluse 2026/27 fino alla 11ª giornata; nessun risultato MD12 utilizzato.',[p.futureDataDiagnostics.home,p.futureDataDiagnostics.away].map(t=>`${names.get(t.teamId)}: ${t.currentMatchesUsed} gare correnti disponibili.`)),
   availability:section('Formazioni probabili: gli undici non sono ufficiali. I dubbi restano distinti dalle assenze.',availability),
   tactics:section(p.scenarios[0].description,sides.map(t=>`${t.team}: ${t.formation}, formazione probabile.`)),
   referee:section(fixture.refereeAssignment?`Arbitro designato: ${fixture.refereeAssignment.referee.name}.`:'Designazione arbitrale N/D; nessuna attribuzione presunta.'),
   market:section('Quote verificate N/D. EV N/D; nessuna selezione operativa approvata. Le proiezioni individuali non certificano probabilità dei contratti DUO.'),
   synthesis:section(`${p.verdict.label}. Previsione preliminare: componenti del modello in validazione prospettica.`,p.scenarios.slice(1).map(s=>s.description))
  },internalSources:[{label:lineups.provider,url:lineups.sourceUrl,rawSnapshot:lineups.rawSnapshot,retrievedAt:lineups.importedAt}]
 });
}
require('./build-reading-competition-context.cjs').build(12);
execFileSync(process.execPath,['scripts/build-readings.js','--matchday','12'],{cwd:root,stdio:'inherit'});
assert.deepEqual(read('data/normalized/readings.json').filter(r=>!ids.has(r.matchId)),beforeReadings.filter(r=>!ids.has(r.matchId)));
console.log('MD12: integrate 10 Letture e previsioni; archivi delle altre giornate preservati.');
