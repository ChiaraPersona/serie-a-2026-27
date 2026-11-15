'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {sequence}=require('./european-rating-model.cjs');
const {loadContext}=require('../champions/european-result-policy.cjs');
const {domesticFeatures}=require('../champions/elo-initial-prior.cjs');
const root=path.resolve(__dirname,'../..'),read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
function run(){
 const asOf=new Date().toISOString(),calendar=read('data/normalized/champions-league-2026-27.json'),context=loadContext(calendar,asOf),dataset=read('data/normalized/champions-elo-prior-domestic.json');
 const predictions=sequence([...context.history,...context.current],context.policy.parameters).predictions;
 const scenarios=read('data/generated/champions-shared-scenarios.json'),rows=[];
 for(const [team,id] of context.map){
  const own=predictions.filter(r=>[r.match.homeTeam.id,r.match.awayTeam.id].includes(id));
  const games=own.map(r=>{
   const side=r.match.homeTeam.id===id?'home':'away',other=side==='home'?'away':'home',gf=r.match.score90[side],ga=r.match.score90[other],win=gf>ga?1:gf===ga?.5:0;
   return {fixtureId:r.match.id,date:r.match.date,season:r.match.season||'2026-27',competition:r.match.competitionCode,opponent:r.match[other+'Team'].name,venue:side,score:[gf,ga],ratingBefore:r.features[side].rating,opponentRatingBefore:r.features[other].rating,expectedScore:r.probability[side]+.5*r.probability.draw,expectedPoints:3*r.probability[side]+r.probability.draw,points:gf>ga?3:gf===ga?1:0,eloDelta:context.policy.parameters.kFactor*(context.policy.parameters.competitionUpdateWeights[r.match.competitionCode]??1)*(win-r.probability[side]-.5*r.probability.draw)};
  });
  const f=scenarios.fixtures.find(f=>f.matchday>=5&&(f.homeTeam===team||f.awayTeam===team));assert(f,'Missing future canonical team '+team);
  const feature=f.resultModel.features[f.homeTeam===team?'home':'away'];
  const current=games.filter(g=>g.season==='2026-27');
  const aggregate=gg=>({matches:gg.length,eloDelta:gg.reduce((n,g)=>n+g.eloDelta,0),averageOpponentElo:gg.length?gg.reduce((n,g)=>n+g.opponentRatingBefore,0)/gg.length:null,points:gg.reduce((n,g)=>n+g.points,0),expectedPoints:gg.reduce((n,g)=>n+g.expectedPoints,0)});
  const domestic=domesticFeatures(dataset,id,asOf.slice(0,10),asOf);
  rows.push({team,uefaTeamId:id,rating:feature.rating,rawEuropeanRating:feature.raw,estimatedInitialRating:!!feature.initialPrior?.applied,europeanAppearances:feature.appearances,domestic,
   bySeason:Object.fromEntries([...new Set(games.map(g=>g.season))].map(season=>[season,aggregate(games.filter(g=>g.season===season))])),
   byCompetition:Object.fromEntries(['ucl','uel','uecl'].map(c=>[c,aggregate(games.filter(g=>g.competition===c))])),current:aggregate(current),currentGames:current,
   scope:feature.initialPrior?.applied?'European Elo plus uncertain domestic initial prior':'European-only Elo; current domestic form not incorporated',
   evidenceFlags:[...(!domestic?['DOMESTIC_DATA_MISSING']:[]),...(feature.initialPrior?.applied?['SPARSE_EUROPEAN_HISTORY','UNVALIDATED_DOMESTIC_TRANSFER']:['DOMESTIC_FORM_NOT_IN_ESTABLISHED_ELO']),...(feature.appearances<6?['ONLY_FOUR_CURRENT_EUROPEAN_GAMES']:[]),'NO_INACTIVITY_DECAY','SAME_UPDATE_WEIGHT_ACROSS_COMPETITIONS']});
 }
 rows.sort((a,b)=>b.rating-a.rating);rows.forEach((r,i)=>r.rank=i+1);assert.equal(rows.length,36);assert.equal(new Set(rows.map(r=>r.uefaTeamId)).size,36);
 const dir='data/analysis/champions/elo-all-teams-2026-11-14';fs.mkdirSync(path.join(root,dir),{recursive:true});
 const report={asOf,teamCount:rows.length,domesticCoverage:rows.filter(r=>r.domestic).length,estimated:rows.filter(r=>r.estimatedInitialRating).length,policy:context.policy.parameters,rows,statisticallyValidated:false};
 fs.writeFileSync(path.join(root,dir,'audit.json'),JSON.stringify(report,null,2)+'\n');
 const n=v=>Number.isFinite(v)?v.toFixed(1):'N/D';
 const table=['| # | Squadra | Elo | Gare europee | Campionato: ordine PPG | PPG | Δ Elo UCL | Δ Elo UEL | Δ Elo UECL | Δ Elo CL corrente | Elo medio avversarie CL corrente |','|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|',...rows.map(r=>`| ${r.rank} | ${r.team}${r.estimatedInitialRating?' *':''} | ${n(r.rating)} | ${r.europeanAppearances} | ${r.domestic?r.domestic.performanceRank+'/'+r.domestic.leagueTeams:'N/D'} | ${n(r.domestic?.pointsPerGame)} | ${n(r.byCompetition.ucl.eloDelta)} | ${n(r.byCompetition.uel.eloDelta)} | ${n(r.byCompetition.uecl.eloDelta)} | ${n(r.current.eloDelta)} | ${n(r.current.averageOpponentElo)} |`)];
 const md='# Audit completo Elo Champions — 36 squadre\n\n'+
 `Dati estratti il ${asOf}. Copertura domestica: ${report.domesticCoverage}/36. Ordine domestico ricostruito per punti/gara: non è la classifica ufficiale con tutti gli spareggi.\n\n`+
 'Il rating ordinario usa solo risultati europei dal 2023/24; tre club con poco storico hanno anche una componente domestica stimata (*). Questa differenza di metodo è un limite della comparabilità della graduatoria. Elo già corregge ogni aggiornamento per forza avversaria e sede: una vittoria non vale un incremento fisso.\n\n'+
 table.join('\n')+'\n\nI delta di competizione includono tutto lo storico più la Champions corrente; non vanno sommati di nuovo alla colonna corrente. Per i tre club stimati non includono il correttivo domestico.\n\n'+
 '## Riscontri comuni\n\n- Lo storico inizia nel 2023/24: non misura reputazione o risultati precedenti.\n- Nessun decadimento per inattività o attenuazione a inizio stagione nel modello operativo attuale.\n- UCL, UEL e UECL hanno identico peso di aggiornamento; l’avversario conta già nel risultato atteso.\n- Il rendimento domestico corrente non corregge i 33 rating europei ordinari.\n- Il correttivo domestico dei tre nuovi club è sperimentale e ha un trasferimento fra campionati non sufficientemente validato.\n- Quattro partite correnti da sole non spiegano le posizioni: occorre distinguere il rating accumulato dalle variazioni recenti.\n\n'+
 'Le varianti dei pesi per competizione e del premio domestico sono state confrontate separatamente; nessuna classifica viene forzata per far scendere un club particolare. Le varianti peggiori nel confronto prescelto non vengono promosse.\n';
 fs.writeFileSync(path.join(root,dir,'REPORT.md'),md);
 console.log(JSON.stringify({teamCount:rows.length,domesticCoverage:report.domesticCoverage,estimated:report.estimated,report:dir+'/REPORT.md',villa:rows.find(r=>r.team==='Aston Villa'),top:rows.slice(0,6).map(r=>({team:r.team,rating:r.rating,currentDelta:r.current.eloDelta}))}));
 return report;
}
if(require.main===module)run();module.exports={run};
