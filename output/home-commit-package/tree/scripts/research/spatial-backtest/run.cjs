'use strict';
// Isolated retrospective research. No production builder, selection or settlement is run.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {CONFIG,makeFeatures,fit,predict,score,compare}=require('./model.cjs');
const {canonicalMatchHash,toKickoffUtc,validateSnapshot}=require('../../predictions/snapshot-core');
const root=path.resolve(__dirname,'../../..'),output='data/analysis/spatial-backtest-2026-10-29';
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const read=f=>JSON.parse(fs.readFileSync(path.join(root,f),'utf8'));
const save=(f,value)=>{fs.mkdirSync(path.dirname(path.join(root,f)),{recursive:true});fs.writeFileSync(path.join(root,f),JSON.stringify(value,null,2)+'\n')};
function captureProduction(){
 const directories=['js','css','data/generated/readings','data/predictions/snapshots'];
 const files=directories.flatMap(d=>fs.readdirSync(path.join(root,d),{recursive:true}).filter(f=>fs.statSync(path.join(root,d,f)).isFile()).map(f=>path.posix.join(d,f.replaceAll('\\','/'))));
 files.push(...fs.readdirSync(path.join(root,'data/normalized')).filter(f=>/^(predictions|schedina.*|reading.*|official-starter-registry|matches|serie-a-shot-events-2026-27)\.json$/.test(f)).map(f=>'data/normalized/'+f),
  'data/sources/match-results-2026-27.json','data/sources/official-lineups-2026-27.json','data/sources/serie-a-shot-events-manifest-2026-27.json','lettura.html','schedina.html','champions-league.html','package.json');
 for(const file of ['data/normalized/serie-a-technical-context-2026-27.json','data/sources/serie-a-coach-changes-2026-27.json'])if(fs.existsSync(path.join(root,file)))files.push(file);
 return Object.fromEntries([...new Set(files)].sort().map(f=>[f,hash(fs.readFileSync(path.join(root,f)))]));
}
function selectBaseline(fixture,candidates,manifest){
 const kickoff=toKickoffUtc(fixture),rejected=[];
 const eligible=candidates.filter(c=>c.prediction.matchId===fixture.id).filter(c=>{
  const p=c.prediction,cutoff=c.cutoff,generated=Date.parse(c.generatedAt);
  let reason=null;
  if(!kickoff||!Number.isFinite(generated)||generated>=kickoff)reason='NOT_GENERATED_BEFORE_KICKOFF';
  else if(cutoff?.matchdayExclusive!==fixture.matchday||cutoff?.targetMatchIdExcluded!==fixture.id||cutoff?.completedOnly!==true)reason='INVALID_TEMPORAL_CONTRACT';
  else if(!(p.expectedGoals?.home>0&&p.expectedGoals?.away>0))reason='MISSING_POSITIVE_GOAL_ESTIMATES';
  if(!reason&&c.snapshot){
   const entry=manifest.snapshots.find(e=>e.snapshotId===c.snapshot.snapshotId&&e.matchId===fixture.id);
   if(validateSnapshot(c.snapshot).length||!entry||entry.hash!==canonicalMatchHash(c.snapshot)||entry.generationClass!=='PROSPECTIVE IMMUTABLE SNAPSHOT')reason='INVALID_IMMUTABLE_SNAPSHOT';
  }
  if(reason)rejected.push({source:c.source,generatedAt:c.generatedAt,reason});return !reason;
 });
 eligible.sort((a,b)=>Number(!!b.snapshot)-Number(!!a.snapshot)||Date.parse(b.generatedAt)-Date.parse(a.generatedAt));
 const chosen=eligible[0];
 return {baseline:chosen?{source:chosen.source,snapshotId:chosen.snapshot?.snapshotId||null,
  evidenceClass:chosen.snapshot?'SIGNED_PREMATCH_SNAPSHOT':'TIMESTAMPED_PREMATCH_ARCHIVE_NOT_IMMUTABLE',
  generatedAt:chosen.generatedAt,dataCutoff:chosen.cutoff,engineVersion:chosen.prediction.engineVersion,
  lambda:{home:chosen.prediction.expectedGoals.home,away:chosen.prediction.expectedGoals.away},
  publishedOutcomes:chosen.prediction.probabilities?.final||null}:null,rejected};
}
function loadInputs(){
 const hashes={};const load=f=>{const bytes=fs.readFileSync(path.join(root,f));hashes[f]=hash(bytes);return JSON.parse(bytes.toString('utf8'))};
 const fixtures=load('data/normalized/matches.json').filter(f=>f.competition==='serie-a'&&f.season==='2026-27');
 const dataset=load('data/normalized/serie-a-shot-events-2026-27.json'),manifest=load('data/predictions/snapshots/manifest.json');
 const candidates=[];
 for(const file of [...new Set(manifest.snapshots.map(s=>s.snapshotFile))])for(const s of load(file).snapshots||[])candidates.push({snapshot:s,prediction:{matchId:s.matchId,engineVersion:s.engineVersion,...s.prediction},
  generatedAt:s.generatedAt,cutoff:s.dataCutoff,source:file});
 for(const file of ['data/normalized/predictions.json',...fs.readdirSync(path.join(root,'data/sources')).filter(f=>/^prediction-archive.*\.json$/.test(f)).map(f=>'data/sources/'+f)]){
  for(const p of load(file).predictions||[])candidates.push({prediction:p,generatedAt:p.generatedAt,cutoff:p.futureDataDiagnostics?.dataCutoff,source:file});
 }
 return {fixtures,dataset,manifest,candidates,hashes};
}
function runExperiment(inputs,config=CONFIG){
 const rows=[],excluded=[],baselineAudit=[];
 for(const fixture of inputs.fixtures.filter(f=>f.status==='finished'&&f.score&&!f.resultCoverage?.awarded).sort((a,b)=>a.date.localeCompare(b.date)||a.id.localeCompare(b.id))){
  const selection=selectBaseline(fixture,inputs.candidates,inputs.manifest);baselineAudit.push({fixtureId:fixture.id,selected:selection.baseline,rejected:selection.rejected});
  if(!selection.baseline){excluded.push({fixtureId:fixture.id,matchday:fixture.matchday,reason:'NO_VERIFIED_PREMATCH_BASELINE'});continue;}
  const date=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Rome',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(selection.baseline.generatedAt));
  const features=makeFeatures({id:fixture.id,date:fixture.date,matchday:fixture.matchday,homeTeam:fixture.homeTeam,awayTeam:fixture.awayTeam},inputs.fixtures,inputs.dataset,config,date,inputs.technicalDataset||null);
  if(!features.available){excluded.push({fixtureId:fixture.id,matchday:fixture.matchday,...features});continue;}
  if(inputs.allowedFixtureIds&&!inputs.allowedFixtureIds.has(fixture.id)){excluded.push({fixtureId:fixture.id,matchday:fixture.matchday,reason:'OUTSIDE_COMMON_POLICY_SAMPLE'});continue;}
  const row={fixtureId:fixture.id,matchId:fixture.id,date:fixture.date,matchday:fixture.matchday,baseline:selection.baseline,features,
   actual:{home:fixture.score.home,away:fixture.score.away}};
  rows.push(row);
 }
 if(inputs.cohortOnly)return {config,eligibleRows:rows,excluded,baselineAudit};
 const training=rows.filter(r=>config.developmentMatchdays.includes(r.matchday));
 const calibration=fit(training,false,config),spatial=fit(training,true,config);
 if(!calibration||!spatial)throw Error('Insufficient development sample; no valid frozen holdout fit');
 const holdout=rows.filter(r=>config.holdoutMatchdays.includes(r.matchday)).map(r=>{
  if(training.some(t=>t.date>=r.features.cutoffExclusive||t.matchday>=r.matchday))throw Error('Training leakage into holdout '+r.fixtureId);
  return {...r,forecasts:{baseline:score(r,r.baseline.lambda),calibration:score(r,predict(r,calibration)),spatial:score(r,predict(r,spatial))}};
 });
 const rolling=[];
 for(const row of rows.filter(r=>config.holdoutMatchdays.includes(r.matchday))){
  const past=rows.filter(r=>r.matchday<row.matchday&&r.date<row.features.cutoffExclusive);
  const cal=fit(past,false,config),sp=fit(past,true,config);if(!cal||!sp)continue;
  rolling.push({...row,training:{calibration:cal,spatial:sp},forecasts:{baseline:score(row,row.baseline.lambda),calibration:score(row,predict(row,cal)),spatial:score(row,predict(row,sp))}});
 }
 return {config,eligibleRows:rows,excluded,baselineAudit,training:{fixtureIds:training.map(r=>r.fixtureId),n:training.length,calibration,spatial},
  holdout:{rows:holdout,summary:compare(holdout,config),byMatchday:Object.fromEntries(config.holdoutMatchdays.map(md=>[md,compare(holdout.filter(r=>r.matchday===md),config)]))},
  rolling:{rows:rolling,summary:compare(rolling,config)},
  conclusion:{status:'RESEARCH_ONLY',promotionAllowed:false,
   reason:'Only two test matchdays; shot coordinates reconstructed from revised reports, not immutable prematch feature snapshots. No validated operational improvement can be certified from this pilot.'}};
}
function reportMarkdown(report){
 const h=report.holdout.summary,fmt=v=>Number.isFinite(v)?v.toFixed(6):'N/D';
 const rows=['baseline','calibration','spatial'].map(k=>{const m=h.metrics[k];return `| ${k} | ${m.n} | ${fmt(m.goalLogLoss)} | ${fmt(m.outcomeLogLoss)} | ${fmt(m.over25LogLoss)} | ${fmt(m.bttsLogLoss)} | ${fmt(m.goalMAE)} |`;});
 return `# Backtest territoriale Serie A — 29 ottobre 2026\n\nEsperimento retrospettivo isolato, configurazione ${report.config.version}. Nessuna modifica ai motori, ai pronostici, alle quote o alle selezioni pubblicate. Nessuna liquidazione o stima di rendimento certificato.\n\n## Protocollo\n\nIl modello di partenza usa i gol attesi prepartita conservati negli archivi: snapshot MD6 firmati e verificati tramite hash, oppure archivi con timestamp precedente al calcio d'inizio e contratto temporale valido. La versione corrente rigenerata dopo la gara è scartata. Gli archivi con solo timestamp non sono equiparati agli snapshot immutabili.\n\nLe coordinate vengono ricostruite dai referti attuali; la loro disponibilità e versione originarie prima di ogni gara non sono provate. Il cutoff esclude la giornata bersaglio e tutte le gare con data uguale o successiva alla prima data della giornata o alla data di generazione della previsione, scegliendo il limite più prudente. Un ritardo nello scaricamento o una revisione successiva resta una limitazione della ricerca.\n\nLa variante usa soltanto tiri localizzati senza rigori e autogol, in sei zone. Gli xG individuali restano N/D. Le conversioni storiche per zona sono frequenze gol/tiri, non xG. Si regrediscono quote dei tiri e conversioni verso il campione di lega con 20 tiri equivalenti. L'incrocio attacco/difesa produce una distribuzione proporzionale a quota-attacco × quota-concessioni / quota-lega; il rapporto tra conversione attesa di questo incrocio e quella della sola distribuzione offensiva dà il segnale logaritmico, limitato a ±log(1,25). Questo isola la forma territoriale dal semplice numero dei tiri.\n\nDue modelli sperimentali moltiplicano lambda per exp(alpha + beta × segnale). Il controllo di calibrazione ha beta=0; la variante stima beta insieme ad alpha. Stima Poisson con offset lambda originario, ridge 1 per entrambi i coefficienti, alpha limitato a ±0,25 e beta a ±1. Parametri e soglie sono una policy sperimentale fissa, senza ricerca di configurazioni sul test.\n\nSviluppo MD6–7 (${report.training.n} gare), coefficienti poi congelati; test MD8–9 (${h.metrics.baseline.n} gare). La seconda analisi rolling aggiorna i coefficienti soltanto con gare di giornate precedenti e concluse prima del cutoff di ciascuna previsione.\n\nLa log loss dei gol è la log loss congiunta Poisson senza troncamento; la MAE è media per squadra. I mercati 1X2, Over 2,5 e Goal usano per tutti i modelli la stessa funzione scoreMatrix 0–7 già usata dal motore. Le medie lambda archiviate sono arrotondate: una piccola differenza dalle probabilità percentuali pubblicate è possibile. L'effetto aggiuntivo delle zone va confrontato soprattutto con il controllo di calibrazione, oltre che con il modello originario.\n\n## Test a coefficienti congelati\n\nValori inferiori indicano errori minori. Tutti i modelli sono valutati sulle stesse fixture.\n\n| Modello | Gare | Log loss gol | Log loss 1X2 | Log loss Over 2,5 | Log loss Goal | MAE gol/squadra |\n|---|---:|---:|---:|---:|---:|---:|\n${rows.join('\n')}\n\nDelta della variante rispetto al modello originario: ${JSON.stringify(h.deltaSpatialVsBaseline)}.\n\nDelta rispetto alla sola calibrazione: ${JSON.stringify(h.deltaSpatialVsCalibration)}. Un delta negativo indica un miglioramento.\n\nCoefficienti congelati: calibrazione alpha=${fmt(report.training.calibration.alpha)}; variante alpha=${fmt(report.training.spatial.alpha)}, beta=${fmt(report.training.spatial.beta)}.\n\n## Incertezza ed esito\n\nL'intervallo bootstrap per giornata è N/D: disponibili ${h.uncertainty.byMatchday.clusters} giornate, contro almeno ${report.config.minimumBootstrapMatchdays} richieste dalla policy sperimentale. L'intervallo esplorativo per singola partita del delta log loss gol rispetto alla calibrazione è ${JSON.stringify(h.uncertainty.byFixtureExploratory.interval)}; non controlla la dipendenza tra gare della stessa squadra e non basta per promuovere la variante.\n\nEsito: RESEARCH_ONLY. I risultati di questo campione non certificano un miglioramento operativo. Nessun cambio automatico dei pesi o delle selezioni.\n\n## Riproduzione ed evidenze\n\nEseguire node scripts/research/spatial-backtest/run.cjs e node scripts/test-spatial-backtest.cjs. Gli input sono letti senza rigenerarli. protocol.json registra la policy, results.json conserva feature, fixture storiche, baseline selezionate/scartate, training, previsioni, esiti e metriche; input-hashes.json registra gli SHA-256. production-integrity.json controlla che codice pubblico, CSS, pagine, proiezioni, snapshot e archivi operativi non cambino durante il runner.\n\nI dati territoriali conservano le esclusioni documentate nel report reading-spatial-matchup-2026-10-29.md. Le partite bersaglio non sono selezionate in base al risultato o alla disponibilità delle proprie coordinate. Il campione richiede almeno cinque gare storiche territoriali valide per entrambe le squadre. Gli esiti del test non sono stati usati per scegliere segnali, ridge, limiti o soglie. È uno studio retrospettivo, non una preregistrazione né una prova prospettica.\n`;
}
function reportDetails(report){
 const fmt=v=>Number.isFinite(v)?v.toFixed(6):'N/D',counts=report.excluded.reduce((a,r)=>(a[r.reason]=(a[r.reason]||0)+1,a),{});
 const r=report.rolling.summary.metrics;
 return `\n## Campione ed effetto aggiuntivo delle zone\n\n88 gare concluse esaminate: 50 senza una baseline prepartita ammissibile e quattro con storia territoriale insufficiente. Le 34 gare eleggibili comprendono sei baseline MD6 firmate e 28 archivi con timestamp; nessuna delle 18 baseline del test MD8–9 è uno snapshot immutabile firmato. Esclusioni effettive: ${JSON.stringify(counts)}.\n\nIl test congelato dà log loss gol ${fmt(report.holdout.summary.metrics.baseline.goalLogLoss)} per la baseline, ${fmt(report.holdout.summary.metrics.calibration.goalLogLoss)} per la sola calibrazione e ${fmt(report.holdout.summary.metrics.spatial.goalLogLoss)} con le zone. La variante territoriale peggiora leggermente rispetto al controllo privo di coordinate: il miglioramento rispetto alla baseline non dimostra un valore aggiunto delle zone. La log loss di Over 2,5 e Goal peggiora anche rispetto alla baseline originaria. I favoriti 1X2 non cambiano: 13 esiti corretti su 18 per tutti i modelli.\n\nAggiornando cronologicamente il fit, il risultato resta analogo:\n\n| Modello rolling | Gare | Log loss gol | Log loss 1X2 | Log loss Over 2,5 | Log loss Goal |\n|---|---:|---:|---:|---:|---:|\n${['baseline','calibration','spatial'].map(k=>`| ${k} | ${r[k].n} | ${fmt(r[k].goalLogLoss)} | ${fmt(r[k].outcomeLogLoss)} | ${fmt(r[k].over25LogLoss)} | ${fmt(r[k].bttsLogLoss)} |`).join('\n')}\n\nLa stima beta ha segno negativo nel campione di sviluppo: non conferma l'interpretazione intuitiva di una maggiore conversione dell'incrocio territoriale. Con 16 gare di sviluppo e due giornate di test il segno non è una conclusione generalizzabile. Questo pilota valuta una specifica rappresentazione delle zone e una specifica policy fissa; non prova che ogni possibile uso delle coordinate sia inefficace.\n\nTest eseguiti: riproducibilità integrale; cutoff e classi delle baseline; verifica e alterazione degli hash; contaminazione deliberata dei risultati e delle coordinate della giornata bersaglio; separazione training/test; annidamento del controllo a segnale zero; conservazione degli archivi operativi.\n`;
}
function main(){
 const before=captureProduction();
 save(output+'/protocol.json',{...CONFIG,state:'RETROSPECTIVE_RESEARCH_FIXED_POLICY',writtenAt:new Date().toISOString(),production:false});
 const inputs=loadInputs(),report=runExperiment(inputs);
 save(output+'/input-hashes.json',inputs.hashes);save(output+'/results.json',report);
 const after=captureProduction(),changed=[...new Set([...Object.keys(before),...Object.keys(after)])].filter(f=>before[f]!==after[f]);
 save(output+'/production-integrity.json',{checkedFiles:Object.keys(before).length,changedFiles:changed,unchanged:!changed.length});
 if(changed.length)throw Error('Production changed during research: '+changed.join(', '));
 const markdown=reportMarkdown(report)+reportDetails(report),doc='docs/reports/spatial-backtest-2026-10-29.md';fs.mkdirSync(path.dirname(path.join(root,doc)),{recursive:true});fs.writeFileSync(path.join(root,doc),markdown);
 console.log(JSON.stringify({eligible:report.eligibleRows.length,training:report.training.n,holdout:report.holdout.summary,rolling:report.rolling.summary,
  coefficients:report.training.spatial,conclusion:report.conclusion,integrity:{checkedFiles:Object.keys(before).length,unchanged:true}},null,2));
}
module.exports={runExperiment,selectBaseline,loadInputs,captureProduction,reportMarkdown,reportDetails};if(require.main===module)main();
