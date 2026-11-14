'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {loadInputs,selectBaseline,captureProduction}=require('../spatial-backtest/run.cjs');
const {POLICY,playerRows,featureVector,apply,outcomeRows,metrics,fit}=require('./model.cjs');
const {clusterBootstrap}=require('../exact-score/evaluate');
const root=path.resolve(__dirname,'../../..'),dir='data/analysis/player-spatial-2026-10-29';
const average=a=>a.length?a.reduce((n,x)=>n+x,0)/a.length:null;
function cohort(inputs){
 const rows=[],excluded=[];
 for(const f of inputs.fixtures.filter(f=>f.status==='finished'&&f.matchday>=6&&f.matchday<=9)){
  const selection=selectBaseline(f,inputs.candidates,inputs.manifest),b=selection.baseline;
  if(!b){excluded.push({fixtureId:f.id,reason:'NO_PREMATCH_BASELINE'});continue;}
  const candidate=inputs.candidates.find(c=>c.source===b.source&&c.generatedAt===b.generatedAt&&c.prediction.matchId===f.id&&(!b.snapshotId||c.snapshot?.snapshotId===b.snapshotId));
  const players=playerRows(candidate.prediction),asOf=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Rome',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(b.generatedAt));
  const vector=featureVector({id:f.id,date:f.date,matchday:f.matchday,homeTeam:f.homeTeam,awayTeam:f.awayTeam},inputs.fixtures,inputs.dataset,inputs.technical,players,asOf);
  const pools=vector.teams.map(t=>vector.rows.filter(p=>p.teamId===t.teamId&&p.status==='AVAILABLE'&&p.shots>0).length);
  const actuals=outcomeRows(f,players),coverage=actuals.filter(p=>p.actual).length;
  if(!pools.some(n=>n>=2)||coverage<10){excluded.push({fixtureId:f.id,reason:'NO_SUPPORTED_PLAYER_POOL',pools,verifiedActualPlayers:coverage});continue;}
  rows.push({fixtureId:f.id,matchId:f.id,matchday:f.matchday,date:f.date,baselineEvidence:b,vector,actuals});
 }
 return {rows:rows.sort((a,b)=>a.date.localeCompare(b.date)||a.fixtureId.localeCompare(b.fixtureId)),excluded};
}
function evaluate(rows,parameters){
 const evaluated=rows.map(r=>{
  const baseline=apply(r.vector,0),candidate=apply(r.vector,parameters.beta);
  const started=r.actuals.filter(p=>p.actual?.starter);
  return {...r,prediction:candidate,metrics:{baseline:metrics(baseline,r.actuals),candidate:metrics(candidate,r.actuals)},
   officialStarterSubset:{baseline:metrics(baseline,started),candidate:metrics(candidate,started)}};
 });
 const summary={fixtures:evaluated.length,players:evaluated.reduce((n,r)=>n+r.metrics.baseline.players,0),
  models:Object.fromEntries(['baseline','candidate'].map(k=>[k,Object.fromEntries(['shotsLogLoss','sotLogLoss','shotsMae','sotMae'].map(m=>[m,average(evaluated.map(r=>r.metrics[k][m]))]))])),
  starterSubset:Object.fromEntries(['baseline','candidate'].map(k=>[k,{players:evaluated.reduce((n,r)=>n+r.officialStarterSubset[k].players,0),
   shotsLogLoss:average(evaluated.map(r=>r.officialStarterSubset[k].shotsLogLoss)),sotLogLoss:average(evaluated.map(r=>r.officialStarterSubset[k].sotLogLoss))}])),
  uncertainty:clusterBootstrap(evaluated,a=>average(a.map(r=>r.metrics.candidate.shotsLogLoss-r.metrics.baseline.shotsLogLoss)),{unit:'MATCHDAY',iterations:5000,minimumClusters:6,seed:20261029})};
 return {rows:evaluated,summary};
}
function run(inputs){
 const data=cohort(inputs),training=data.rows.filter(r=>POLICY.developmentMatchdays.includes(r.matchday)),parameters=fit(training);
 if(!parameters)throw Error('INSUFFICIENT_TRAINING_MATCHES');
 const test=data.rows.filter(r=>POLICY.testMatchdays.includes(r.matchday));
 if(test.some(r=>training.some(t=>t.date>=r.vector.cutoffExclusive)))throw Error('TRAINING_LEAKAGE');
 const result=evaluate(test,parameters);
 return {policy:POLICY,state:'SHADOW_RESEARCH_ONLY',promotionAllowed:false,parameters,developmentFixtures:training.length,
  development:training.map(({actuals,vector,...meta})=>({...meta,vector,actuals})),test:result,excluded:data.excluded,
  limitations:['MD8–9 is reused historical evaluation, not independent confirmation.',
   'Player observations are clustered within matches and matchdays; more players are not more independent fixtures.',
   'shotSaved events may be blocks: no location-specific on-target accuracy or xG is inferred.',
   'Counts describe individual players; DUO contracts are never repriced or assigned new probabilities.',
   'Actual nonstarters are evaluated only as statistical technical observations; starter-only results are separately reported, not certified settlement.']};
}
function markdown(r){
 const f=v=>typeof v==='number'?v.toFixed(6):'N/D',s=r.test.summary;
 return `# Coordinate territoriali nei calcoli individuali — 29 ottobre 2026\n\nComponente implementata: distribuzione dei tiri di ciascun giocatore rispetto alle zone concesse dall'avversaria. Funziona come livello sperimentale dopo le proiezioni esistenti, conservando minuti, ruolo, totale tiri e SOT della squadra. Non è una modifica dei criteri delle selezioni pubblicate.\n\n## Metodo\n\nStorico rigorosamente precedente al cutoff della previsione e alla giornata bersaglio; solo identità canoniche. Si usano il ciclo tecnico osservato e pesi con emivita tre gare, con almeno cinque gare valide per entrambe le squadre. Per il giocatore servono almeno tre presenze, dieci tiri localizzati senza rigori/autogol e almeno l'80% di copertura rispetto ai suoi tentativi verificati. I mancanti restano N/D.\n\nIl profilo individuale viene regolarizzato verso quello della propria squadra con dieci tiri equivalenti. La distribuzione delle concessioni avversarie è regolarizzata verso la lega con venti tiri equivalenti. L'esposizione delle zone del singolo viene confrontata con quella della sua squadra: il segnale misura un'opportunità relativa, senza aggiungere una seconda volta il volume generale già incorporato nel modello. Il solo modulo nominale non determina un nuovo ruolo; i ruoli effettivi in possesso/non possesso restano non ricostruiti.\n\nSi stima un solo coefficiente beta sullo sviluppo MD6–7, su una griglia fissa [-1,1] di 81 valori con penalità ridge 0,05, senza ottimizzazioni sul test. La ripartizione mantiene la somma dei tiri dei giocatori pubblicati e limita la variazione del singolo al 10%. I giocatori senza dati sufficienti rimangono invariati; la riallocazione richiede almeno due giocatori eleggibili della stessa squadra.\n\nI SOT cambiano soltanto attraverso le opportunità di tiro, mantenendo la precisione del modello preesistente prima della riconciliazione. Il totale SOT della squadra è conservato e i SOT individuali non possono superare i tiri. Non si assume che ogni evento shotSaved sia un tiro nello specchio: il campione contiene anche blocchi. Nessuna nuova previsione di precisione, falli o cartellini viene dedotta da questi eventi.\n\n## Verifica cronologica\n\nSviluppo: ${r.developmentFixtures} gare; beta stimato ${f(r.parameters.beta)}. Test: ${s.fixtures} gare, ${s.players} osservazioni individuali con partecipazione verificata. Il numero indipendente è quello delle gare/giornate, non quello dei giocatori. Le presenze e le assenze esplicite sono valutate statisticamente; i non titolari non diventano selezioni operative. È riportato anche il sottoinsieme dei titolari effettivi.\n\n| Modello | Log loss tiri ↓ | Log loss SOT ↓ | MAE tiri ↓ | MAE SOT ↓ |\n|---|---:|---:|---:|---:|\n${['baseline','candidate'].map(k=>`| ${k} | ${f(s.models[k].shotsLogLoss)} | ${f(s.models[k].sotLogLoss)} | ${f(s.models[k].shotsMae)} | ${f(s.models[k].sotMae)} |`).join('\n')}\n\nIntervallo per giornata: ${s.uncertainty.status}; giornate disponibili ${s.uncertainty.clusters}. MD8–9 è un test storico riutilizzato; la prova non certifica un beneficio operativo. Nessuna promozione automatica.\n\n## Contratti e riproduzione\n\nLe stime sono conteggi del singolo giocatore, non probabilità dei contratti DUO. Non vengono creati contratti individuali quotati, quote eque o EV. Le quote verificate di stesso contratto, soglia e ID restano nella pipeline operativa esistente.\n\nEseguire node scripts/research/player-spatial/run.cjs. Gli input e i loro hash, il campione, i vettori territoriali, le esclusioni e le proiezioni prima/dopo sono conservati in data/analysis/player-spatial-2026-10-29/. Il runner verifica l'integrità dei file operativi e non esegue builder o pubblicazioni.\n`;
}
function main(){
 const before=captureProduction(),inputs=loadInputs(),file='data/normalized/serie-a-technical-context-2026-27.json';inputs.technical=JSON.parse(fs.readFileSync(path.join(root,file),'utf8'));
 inputs.hashes[file]=crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex');
 const result=run(inputs);fs.mkdirSync(path.join(root,dir),{recursive:true});
 fs.writeFileSync(path.join(root,dir,'results.json'),JSON.stringify(result,null,2)+'\n');fs.writeFileSync(path.join(root,dir,'input-hashes.json'),JSON.stringify(inputs.hashes,null,2)+'\n');
 const after=captureProduction(),changed=Object.keys(before).filter(f=>before[f]!==after[f]);
 fs.writeFileSync(path.join(root,dir,'production-integrity.json'),JSON.stringify({unchanged:!changed.length,changedFiles:changed},null,2)+'\n');
 if(changed.length)throw Error('PRODUCTION_CHANGED '+changed.join(','));
 fs.writeFileSync(path.join(root,'docs/reports/player-spatial-2026-10-29.md'),markdown(result));
 console.log(JSON.stringify({development:result.developmentFixtures,beta:result.parameters.beta,test:result.test.summary,productionUnchanged:true},null,2));
}
module.exports={cohort,evaluate,run,markdown};if(require.main===module)main();
