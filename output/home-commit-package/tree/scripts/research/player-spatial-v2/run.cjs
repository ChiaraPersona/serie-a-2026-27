'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {loadInputs,selectBaseline,captureProduction}=require('../spatial-backtest/run.cjs');
const {clusterBootstrap}=require('../exact-score/evaluate');
const {POLICY,playerRows,featureVector,apply,fit,outcomeRows,metrics}=require('./model.cjs');
const {enrich}=require('./enrich.cjs');
const root=path.resolve(__dirname,'../../..'),DIR='data/analysis/player-spatial-v2-2026-10-29';
const average=a=>a.length?a.reduce((n,x)=>n+x,0)/a.length:null;
function load(){
 const inputs=loadInputs();for(const [key,file] of [['technical','data/normalized/serie-a-technical-context-2026-27.json'],['shotManifest','data/sources/serie-a-shot-events-manifest-2026-27.json']]){
  const b=fs.readFileSync(path.join(root,file));inputs[key]=JSON.parse(b);inputs.hashes[file]=crypto.createHash('sha256').update(b).digest('hex');}
 const extension=enrich(root,inputs.dataset,inputs.shotManifest);inputs.dataset=extension.dataset;inputs.coverageAudit=extension.audit;Object.assign(inputs.hashes,extension.hashes);return inputs;
}
function cohort(inputs){
 const rows=[],excluded=[],coverage=[];
 for(const f of inputs.fixtures.filter(f=>f.status==='finished'&&f.matchday>=POLICY.firstEvaluationMatchday)){
  const b=selectBaseline(f,inputs.candidates,inputs.manifest).baseline;
  if(!b){excluded.push({fixtureId:f.id,reason:'NO_PREMATCH_BASELINE'});continue;}
  const c=inputs.candidates.find(c=>c.source===b.source&&c.generatedAt===b.generatedAt&&c.prediction.matchId===f.id&&(!b.snapshotId||c.snapshot?.snapshotId===b.snapshotId));
  const players=playerRows(c.prediction),asOf=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Rome',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(b.generatedAt));
  const vector=featureVector(f,inputs.fixtures,inputs.dataset,inputs.technical,players,asOf),actuals=outcomeRows(f,players);
  const pools=vector.teams.map(t=>vector.rows.filter(p=>p.teamId===t.teamId&&p.status==='AVAILABLE'&&p.shots>0).length);
  coverage.push({fixtureId:f.id,matchday:f.matchday,pools,reasons:vector.rows.reduce((a,p)=>(a[p.reason||'AVAILABLE']=(a[p.reason||'AVAILABLE']||0)+1,a),{})});
  if(!pools.some(n=>n>=2)||actuals.filter(p=>p.actual).length<10){excluded.push({fixtureId:f.id,reason:'NO_SUPPORTED_PLAYER_POOL',pools});continue;}
  rows.push({fixtureId:f.id,matchId:f.id,matchday:f.matchday,date:f.date,baselineEvidence:b,vector,actuals});
 }return {rows:rows.sort((a,b)=>a.matchday-b.matchday||a.date.localeCompare(b.date)||a.fixtureId.localeCompare(b.fixtureId)),excluded,coverage};
}
function walkForward(data){
 const days=[...new Set(data.rows.map(r=>r.matchday))].sort((a,b)=>a-b),folds=[],evaluated=[];
 for(const day of days){
  const test=data.rows.filter(r=>r.matchday===day),cutoff=test.map(r=>r.vector.cutoffExclusive).sort()[0];
  const train=data.rows.filter(r=>r.matchday<day&&r.date<cutoff);
  const parameters={allocation:fit(train,'allocation'),volume:fit(train,'volume')};
  folds.push({matchday:day,trainingFixtureIds:train.map(r=>r.fixtureId),trainingMatchdays:[...new Set(train.map(r=>r.matchday))],parameters,testFixtureIds:test.map(r=>r.fixtureId)});
  for(const r of test){
   const forecasts={baseline:apply(r.vector,0),allocation:apply(r.vector,parameters.allocation.beta),volume:apply(r.vector,parameters.volume.beta,'volume')};
   const starters=r.actuals.filter(p=>p.actual?.starter);
   evaluated.push({...r,parameters,forecasts,metrics:Object.fromEntries(Object.entries(forecasts).map(([k,p])=>[k,metrics(p,r.actuals)])),
    starterSubset:Object.fromEntries(Object.entries(forecasts).map(([k,p])=>[k,metrics(p,starters)]))});
  }
 }
 const scored=evaluated.filter(r=>r.parameters.allocation.status==='FITTED_PRIOR_MATCHDAYS_ONLY');
 const models=Object.fromEntries(['baseline','allocation','volume'].map(k=>[k,Object.fromEntries(['shotsLogLoss','sotLogLoss','shotsMae','sotMae'].map(m=>[m,average(scored.map(r=>r.metrics[k][m]))]))]));
 return {folds,rows:evaluated,summary:{allFixtures:evaluated.length,evaluatedFixtures:scored.length,players:scored.reduce((n,r)=>n+r.metrics.baseline.players,0),models,
  uncertainty:Object.fromEntries(['allocation','volume'].map(k=>[k,clusterBootstrap(scored,a=>average(a.map(r=>r.metrics[k].shotsLogLoss-r.metrics.baseline.shotsLogLoss)),{unit:'MATCHDAY',iterations:5000,minimumClusters:6,seed:20261029})]))}};
}
function run(inputs){
 const data=cohort(inputs),walk=walkForward(data);
 return {policy:POLICY,state:'SHADOW_RESEARCH_ONLY',production:false,promotionAllowed:false,coverageAudit:inputs.coverageAudit,coverage:data.coverage,excluded:data.excluded,
  walkForward:walk,finalParameters:{allocation:fit(data.rows,'allocation'),volume:fit(data.rows,'volume')},
  limitations:['Historical walk-forward reuses previously explored MD8–9: not independent confirmation.',
   'No verified open-play/set-piece distinction or event-level on-target/block label. Standard is not relabelled open play.',
   'Starting formation position/alignment is not an in-play role or tracking record.',
   'Volume branch is an alternative residual correction to the same baseline, never stacked on the allocation branch or promoted automatically.',
   'Volume applies only to supported forecast players: pool totals are not full-team totals.',
   'More player observations do not create more independent matches or matchdays. No DUO repricing or certified betting settlement.']};
}
function report(r){
 const s=r.walkForward.summary,f=x=>x===null?'N/D':x.toFixed(6);
 return `# Coordinate individuali: contesto e validazione progressiva v2\n\nLa v1 e i suoi congelamenti restano intatti. Questa revisione è ricerca isolata; nessuna selezione pubblica, quota, probabilità DUO o formula operativa cambia.\n\n## Copertura verificata\n\nSono usati tutti i tentativi localizzati riconciliati, non soltanto i gol. L'audit dei raw copre ${r.coverageAudit.normalizedEvents} eventi normalizzati e ${r.coverageAudit.roleObservations} osservazioni di posizione iniziale. I soli contesti disponibili sono ${JSON.stringify(r.coverageAudit.contexts)}. Standard non viene convertito in gioco aperto. Piazzati separati, tiri parati contro bloccati, xG per evento e ruolo dinamico restano N/D. I rigori e gli autogol sono esclusi dai profili spaziali.\n\n## Cambiamenti\n\nOgni gara precedente riceve un peso di recenza, sovrapposizione con i dieci giocatori di movimento previsti e continuità dell'episodio dell'allenatore. Lo storico di un altro ciclo mantiene peso ridotto (0,35), senza confondere il ritorno dello stesso allenatore con continuità. Il profilo del singolo riduce ulteriormente il peso se posizione o lato iniziale differiscono dalla previsione; l'assenza di posizione verificata riduce il peso e resta dichiarata. Nessuna formazione effettiva della partita bersaglio entra nel backtest. Minuti e ruolo previsti provengono dalla baseline prepartita.\n\nLe soglie v2 sono dichiarate prima dell'esecuzione: tre gare squadra, almeno due gare effettive pesate; due presenze e cinque tiri localizzati del giocatore, copertura almeno 80%. I campioni piccoli sono regolarizzati più fortemente (20 tiri equivalenti individuali, 30 difensivi), invece di introdurre correzioni piene su pochi tentativi. Il profilo di squadra usato come prior limita l'effetto anche per chi supera appena la soglia.\n\nDue rami distinti: riallocazione con totali conservati e limite individuale 10%; correzione residua del volume del solo gruppo supportato con limite 5%. Non vengono sommati, né viene scelto automaticamente il vincitore storico. I SOT mantengono la precisione della baseline prima della riconciliazione; non viene stimata una nuova precisione per zona.\n\n## Walk-forward\n\nPrima di ogni giornata si stimano i coefficienti soltanto con gare di giornate precedenti concluse prima del cutoff. Servono cinque gare e due giornate di sviluppo; in mancanza il peso resta zero e la giornata non conta come test calibrato. ${s.allFixtures} gare con supporto, ${s.evaluatedFixtures} valutabili dopo sviluppo, ${s.players} osservazioni individuali. Le stesse fixture e gli stessi esiti verificati sono usati per tutti i rami; il sottoinsieme titolari è registrato separatamente.\n\n| Variante | Log loss tiri ↓ | Log loss SOT ↓ | MAE tiri ↓ | MAE SOT ↓ |\n|---|---:|---:|---:|---:|\n${Object.entries(s.models).map(([k,v])=>`| ${k} | ${f(v.shotsLogLoss)} | ${f(v.sotLogLoss)} | ${f(v.shotsMae)} | ${f(v.sotMae)} |`).join('\n')}\n\n${r.walkForward.folds.map(d=>`- MD${d.matchday}: ${d.trainingFixtureIds.length} gare di sviluppo; beta riallocazione ${d.parameters.allocation.beta}, beta volume ${d.parameters.volume.beta}; stato ${d.parameters.allocation.status}.`).join('\n')}\n\nL'incertezza è raggruppata per giornata: ${Object.entries(s.uncertainty).map(([k,v])=>`${k}: ${v.status} (${v.clusters} giornate)`).join('; ')}. Il passato già esplorato resta esplorativo anche con ordine cronologico corretto. Nessun beneficio operativo certificato e nessuna promozione automatica.\n\n## Riproduzione\n\nEseguire npm run research:player-spatial:v2 e npm run test:player-spatial:v2. Risultati completi, motivi di astensione, vettori, fold e hash degli input in ${DIR}/. Il runner controlla che i file operativi non siano cambiati. Le nuove previsioni v2 sono congelate separatamente dalla v1, con protocollo proprio; la prima cattura valida resta primaria e le revisioni non la sostituiscono.\n`;
}
function main(){
 const before=captureProduction(),inputs=load(),result=run(inputs);fs.mkdirSync(path.join(root,DIR),{recursive:true});
 fs.writeFileSync(path.join(root,DIR,'results.json'),JSON.stringify(result,null,2)+'\n');fs.writeFileSync(path.join(root,DIR,'input-hashes.json'),JSON.stringify(inputs.hashes,null,2)+'\n');
 const after=captureProduction(),changed=Object.keys(before).filter(f=>before[f]!==after[f]);
 fs.writeFileSync(path.join(root,DIR,'production-integrity.json'),JSON.stringify({unchanged:!changed.length,changedFiles:changed},null,2)+'\n');if(changed.length)throw Error('PRODUCTION_CHANGED');
 fs.writeFileSync(path.join(root,'docs/reports/player-spatial-v2-2026-10-29.md'),report(result));
 console.log(JSON.stringify({audit:result.coverageAudit,summary:result.walkForward.summary,folds:result.walkForward.folds.map(f=>({day:f.matchday,train:f.trainingFixtureIds.length,allocation:f.parameters.allocation.beta,volume:f.parameters.volume.beta})),productionUnchanged:true},null,2));
}
module.exports={DIR,load,cohort,walkForward,run};if(require.main===module)main();
