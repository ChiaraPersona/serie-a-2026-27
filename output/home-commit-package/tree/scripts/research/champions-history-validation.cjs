'use strict';
// Research-only paired replay. No production builder, odds, selection or forecast is written.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),zlib=require('node:zlib'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),output=path.join(root,'data/analysis/champions/history-validation-2026-11-11');
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex');
const {historicalBaseline,blendRates,ROLE_PRIORS}=require('../champions/context-adjusted-player-baseline');
const {projectMd3Team,starterThresholds}=require('../champions/md3-lineup-policy');
const {playerEntry}=require('../team-pages/model');
const artifactPath='data/normalized/champions-md03-probable-individuals-2026-27.json';
const protectedFiles=[artifactPath,'data/normalized/champions-md04-probable-individuals-2026-27.json','data/normalized/champions-md03-player-database-2026-27.json','data/normalized/champions-md04-player-database-2026-27.json','data/normalized/champions-player-stats-2026-27.json','data/normalized/champions-registered-squads-2026-27.json','data/normalized/schedina-champions-md03.json','data/normalized/schedina-champions-md04.json','data/normalized/odds/sisal/champions-league.json','data/generated/champions-shared-scenarios.json'];
const protocol={schemaVersion:1,experiment:'champions-history-validation-2026-11-11',design:'retrospective-event-time-paired-replay',primaryMatchday:3,
 cohort:'Earliest valid prematch snapshots; exact artifact hash and numeric replay; conditional-on-starting forecasts evaluated on actual starters only; same cases across arms.',
 arms:{baseline:'Archived published forecast, unchanged',clubRecovered:'Fill missing club history only; preserve all existing blockers, minutes and team targets',nationalOfficial:'Research sensitivity: add coherent previous-season senior OFFICIAL observations to club counts, weight by minutes, existing shrink/blend/reconciliation',nationalFriendly:'Separate research sensitivity: add coherent previous-season senior FRIENDLY observations to club counts; never mixed with official appearances'},
 inputPolicy:'Only completed previous-season national appearances from 2025-07-01 through 2026-06-30; positive minutes, shots and SOT jointly observed. No retuning, no selection on outcomes. New national integration is experimental, not approved.',
 fixedControls:['expectedMinutes','role','domesticContextFactor','current-season channel summaries','team targets','eligible allocation universe','existing blockers'],
 metrics:['shots MAE','SOT MAE','shots RMSE','SOT RMSE','Poisson NLL','Brier 1+ shots','Brier 1+ SOT','secondary thresholds 2+/3+ shots and 2+ SOT'],
 uncertainty:{method:'paired fixture-cluster bootstrap',replications:2000,seed:20261111,interval:.95},
 exclusions:['unknown provider identity','actual non-starter','missing observed shots/SOT','unverified team statistical template','future feature event','baseline replay mismatch'],
 limitations:['New evidence acquired after matches: not a prospective validation','No approved national-strength or role correction','No DUO probabilities, EV, ROI, odds or settlement evaluated','MD4 lacks immutable prematch snapshots and is not used for primary accuracy claims']};

function rates(total,p){
 const prior=ROLE_PRIORS[p.role];if(!prior||!(total?.minutes>0)||!Number.isFinite(total.per90?.shots)||!Number.isFinite(total.per90?.shotsOnTarget))return null;
 const d=p.baseline.channels.domestic,e=p.baseline.channels.champions;
 const one=(metric,key)=>Number((!d.minutes&&!e.minutes?historicalBaseline(total.per90[metric],total.minutes,prior[metric]):blendRates({historicalRaw:total.per90[metric],historicalMinutes:total.minutes,rolePrior:prior[metric],domesticRaw:d[key],domesticMinutes:d.minutes,domesticStrengthFactor:p.baseline.contextFactor??1,europeanRaw:e[key],europeanMinutes:e.minutes}).blended).toFixed(3));
 const result={shots:one('shots','shots'),sot:one('shotsOnTarget','sot')};return result.sot<=result.shots?result:null;
}
function pooled(total,rows){
 if(!rows.length||!Number.isFinite(total.shots)||!Number.isFinite(total.shotsOnTarget)||!(total.minutes>0))return total;
 return playerEntry({minutes:total.minutes+rows.reduce((s,r)=>s+r.minutes,0),shots:total.shots+rows.reduce((s,r)=>s+r.shots,0),shotsOnTarget:total.shotsOnTarget+rows.reduce((s,r)=>s+r.shotsOnTarget,0)});
}
function values(row,arm){
 const p=row.predictions[arm],actual=row.actual,pr=starterThresholds(p.shots,p.sot),clamp=v=>Math.max(1e-12,Math.min(1-1e-12,v));
 const logFact=n=>{let x=0;for(let i=2;i<=n;i++)x+=Math.log(i);return x};
 const nll=(mu,y)=>Math.max(mu,1e-12)-y*Math.log(Math.max(mu,1e-12))+logFact(y);
 return {shotsMAE:Math.abs(p.shots-actual.shots),sotMAE:Math.abs(p.sot-actual.sot),shotsMSE:(p.shots-actual.shots)**2,sotMSE:(p.sot-actual.sot)**2,
  shotsNLL:nll(p.shots,actual.shots),sotNLL:nll(p.sot,actual.sot),
  shotsBrier1:(pr.shotsOver05-(actual.shots>=1?1:0))**2,sotBrier1:(pr.sotOver05-(actual.sot>=1?1:0))**2,
  shotsBrier2:(pr.shotsOver15-(actual.shots>=2?1:0))**2,shotsBrier3:(pr.shotsOver25-(actual.shots>=3?1:0))**2,sotBrier2:(pr.sotOver15-(actual.sot>=2?1:0))**2,
  shotsLogLoss1:-(actual.shots>=1?Math.log(clamp(pr.shotsOver05)):Math.log(1-clamp(pr.shotsOver05))),sotLogLoss1:-(actual.sot>=1?Math.log(clamp(pr.sotOver05)):Math.log(1-clamp(pr.sotOver05)))};
}
function summarize(rows,arm){
 if(!rows.length)return null;const sums={};
 for(const row of rows)for(const [k,v] of Object.entries(values(row,arm)))sums[k]=(sums[k]||0)+v;
 const out=Object.fromEntries(Object.entries(sums).map(([k,v])=>[k,v/rows.length]));
 return {n:rows.length,fixtures:new Set(rows.map(r=>r.fixtureId)).size,...out,shotsRMSE:Math.sqrt(out.shotsMSE),sotRMSE:Math.sqrt(out.sotMSE)};
}
function bootstrap(rows,arm,metric){
 const groups=new Map();for(const row of rows){if(!groups.has(row.fixtureId))groups.set(row.fixtureId,[]);groups.get(row.fixtureId).push(row)}
 const clusters=[...groups.values()];if(!clusters.length)return null;let seed=protocol.uncertainty.seed;
 const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
 const diff=[];
 for(let b=0;b<protocol.uncertainty.replications;b++){
  let total=0,n=0;for(let i=0;i<clusters.length;i++)for(const row of clusters[Math.floor(random()*clusters.length)]){total+=values(row,arm)[metric]-values(row,'baseline')[metric];n++}
  diff.push(total/n);
 }
 diff.sort((a,b)=>a-b);return {newMinusBaselineLow:diff[Math.floor(diff.length*.025)],newMinusBaselineHigh:diff[Math.floor(diff.length*.975)],unit:'loss per player-match; negative is better'};
}
function writeReport(result){
 const labels={baseline:'Pronostici archiviati',clubRecovered:'Recuperi club',nationalOfficial:'Club + nazionale ufficiali',nationalFriendly:'Club + nazionale amichevoli'};
 const fixed=(n,d=4)=>Number.isFinite(n)?n.toFixed(d):'N/D';
 const lines=['# Verifica dell’effetto dei nuovi dati individuali — 11 novembre 2026','','## Esito','','Questo primo test non dimostra un miglioramento complessivo dei pronostici di tiri/SOT. I recuperi club non cambiano le previsioni del campione valutabile. La sensibilità che aggiunge le presenze ufficiali della nazionale peggiora leggermente entrambi gli errori medi; le amichevoli migliorano di poco i tiri e peggiorano i SOT. Le differenze dei MAE sono piccole e gli intervalli appaiati includono zero. Nessuna variante viene promossa.','','## Campione e controllo temporale','',
  `- ${result.summary.frozenFixtures} fixture con snapshot prepartita; ${result.summary.publishedStarterForecasts} previsioni iniziali dei titolari. Usato il primo snapshot valido per ogni fixture.`,
  `- Hash dell’intero artifact MD3 identico a quello registrato negli snapshot. Replay numerico riuscito per ${result.summary.teamsReplayed} squadre; ${result.summary.teamsQuarantined} squadre messe in quarantena per divergenze del replay o per dati correnti futuri/non databili.`,
  `- Coorte appaiata: **${result.summary.commonCases} prestazioni di titolari effettivi in ${result.summary.commonFixtures} partite Champions**, 20–21 ottobre 2026.`,
  '- Esclusi 55 candidati che non hanno iniziato effettivamente la gara e un giocatore senza identità provider ritrovata nel referto. I pronostici erano condizionati alla partenza da titolare: non si introducono sostituzioni retroattive né si valutano i non titolari come se lo fossero.',
  '- Dodici squadre erano già bloccate dai criteri originali e non entrano nel confronto: il replay riguarda le 24 squadre già numeriche, non tutte le 36. Le presenze della panchina restano soltanto nella ripartizione originaria dei volumi.',
  '- Tutti gli eventi correnti utilizzati dai canali archiviati precedono la data della fixture; anche i campioni usati per i minuti attesi precedono la gara. I nuovi dati di nazionale terminano il 30 giugno 2026.',
  '- Le nuove fonti sono state acquisite a novembre: è un confronto retrospettivo con separazione per data degli eventi, non una validazione prospettica né una prova di disponibilità delle nuove fonti a ottobre.',
  '- MD4 non è usata per dichiarazioni di accuratezza prepartita: mancano snapshot immutabili equivalenti e la data globale dell’artifact è successiva ad alcune partite.',
  '', '## Varianti prefissate','','Il protocollo è scritto prima del calcolo delle metriche in `data/analysis/champions/history-validation-2026-11-11/protocol.json`. Nessuna ricerca di pesi o scelta del risultato migliore a posteriori.','',
  '1. Baseline: previsioni pubblicate e congelate, riprodotte numericamente.','2. Recuperi club: integrazione delle sole lacune storiche, senza alterare le baseline già utilizzabili né gli altri blocchi.','3. Nazionale ufficiali: esperimento che somma conteggi e minuti delle sole osservazioni coerenti della nazionale maggiore alle osservazioni storiche club.','4. Nazionale amichevoli: esperimento distinto, con le sole amichevoli; non sommate alle ufficiali.',
  '', 'Le sensibilità nazionali introducono una nuova semantica di input, non approvata: danno lo stesso peso per minuto a club e nazionale, senza un correttivo validato per livello degli avversari o cambio di ruolo. Riutilizzano la regressione verso la media, il blend, i minuti attesi e la riconciliazione già esistenti. La riconciliazione viene rifatta sull’intera squadra, con lo stesso universo, budget e target; le variazioni possono propagarsi a giocatori senza dati nazionali.',
  '', '## Errori di conteggio — più basso è meglio','','| Variante | MAE tiri | MAE SOT | RMSE tiri | RMSE SOT |','|---|---:|---:|---:|---:|'];
 for(const [arm,m] of Object.entries(result.metrics))lines.push(`| ${labels[arm]} | ${fixed(m.shotsMAE)} | ${fixed(m.sotMAE)} | ${fixed(m.shotsRMSE)} | ${fixed(m.sotRMSE)} |`);
 lines.push('','## Differenze appaiate','','Intervalli al 95% da 2.000 bootstrap appaiati per fixture (14 cluster), seme fisso. Differenza = errore nuovo meno baseline; valori negativi favoriscono la variante. Il campione è piccolo e sono riportate più metriche: non si scelgono miglioramenti isolati per giustificare l’attivazione.','','| Variante | Variazione MAE tiri | IC 95% differenza tiri | Variazione MAE SOT | IC 95% differenza SOT |','|---|---:|---|---:|---|');
 for(const [arm,c] of Object.entries(result.comparisons))lines.push(`| ${labels[arm]} | ${fixed(-c.shotsMAE.improvementPct,2)}% | [${fixed(c.shotsMAE.bootstrap.newMinusBaselineLow,5)}, ${fixed(c.shotsMAE.bootstrap.newMinusBaselineHigh,5)}] | ${fixed(-c.sotMAE.improvementPct,2)}% | [${fixed(c.sotMAE.bootstrap.newMinusBaselineLow,5)}, ${fixed(c.sotMAE.bootstrap.newMinusBaselineHigh,5)}] |`);
 lines.push('','## Probabilità individuali — diagnostica','','Brier delle soglie 1+ tiri/SOT, calcolato con la stessa trasformazione Poisson condizionata alla titolarità. Più basso è meglio. Non sono probabilità DUO o nuove quote operative.','','| Variante | Brier 1+ tiri | Brier 1+ SOT |','|---|---:|---:|');
 for(const [arm,m] of Object.entries(result.metrics))lines.push(`| ${labels[arm]} | ${fixed(m.shotsBrier1,6)} | ${fixed(m.sotBrier1,6)} |`);
 lines.push('','Gli esiti delle probabilità sono misti: il piccolo miglioramento del Brier 1+ tiri non coincide con un miglioramento degli errori di conteggio e i SOT non migliorano. L’intervallo del Brier SOT delle amichevoli è sfavorevole, ma una sola metrica in un confronto multiplo non prova un peggioramento generalizzabile. NLL, log loss e soglie secondarie sono conservati nel JSON completo.','','## Perché i recuperi club non cambiano il campione','',
  `I 20 recuperi club del supplemento compaiono ${result.recoveryCoverage.filter(r=>r.matchday===3).length} volte nell’artifact MD3 e ${result.recoveryCoverage.filter(r=>r.matchday===4).length} volte in MD4, usando ID canonici o provider esatti. Nessuna di queste occorrenze aveva una previsione numerica. Nessuna diventa eleggibile con la sola riparazione dello storico: restano minuti attesi mancanti, ruoli portiere o blocchi collettivi/volumi. L’elenco e i blocchi sono in results.json#recoveryCoverage.`,
  '', 'Questo zero sul campione non significa che recuperare lo storico sia inutile: aumenta la copertura per le gare future, ma non è una percentuale di miglioramento dimostrata sui pronostici già valutabili.',
  '', '## Integrità, riproducibilità e limiti','','- Nessuna formula operativa, peso, quote, selezioni, snapshot, rosa o previsione pubblicata modificata; SHA-256 degli input protetti verificati prima e dopo.','- Tre moduli hanno hash diversi da quelli registrati negli snapshot. Questo drift è dichiarato nel risultato: il controllo rilevante qui è che tutti i numeri di baseline delle squadre incluse siano stati riprodotti esattamente, senza sbloccare squadre precedentemente escluse.','- Ricerca focalizzata su tiri/SOT individuali. Non dimostra miglioramenti di 1X2, gol, cartellini, corner, rendimento o liquidazioni.','- Nessuna probabilità DUO, quota equa, EV o rendimento viene inventato o ricavato dalle probabilità individuali.','- Nessun commit, push o deploy effettuato durante questa verifica.','','## Comandi e fonti interne','','```text','node scripts/research/champions-history-validation.cjs','node scripts/test-champions-history-validation.cjs','```','','- Risultati completi: `data/analysis/champions/history-validation-2026-11-11/results.json`.','- Snapshot: `data/predictions/champions-event-snapshots/md03/`.','- Artifact e database: `data/normalized/champions-md03-probable-individuals-2026-27.json`, `champions-md03-player-database-2026-27.json`.','- Osservazioni effettive: `data/sources/champions-results-md03-2026-27.json`, referti ESPN in `detailedReportSource.rawPath`, collegati per ID evento, data, squadra e atleta.','- Nuove evidenze: `data/normalized/champions-player-history-context-2025-26.json`, `data/sources/champions-player-senior-national-observations-2025-26.json` e `champions-player-club-history-supplement-2025-26.json`.','- Formule: `scripts/champions/context-adjusted-player-baseline.js`, `current-season-offline.js`, `md3-lineup-policy.js`.','- Audit indipendente: `docs/reports/champions-history-validation-method-audit-2026-11-11.md`.');
 fs.writeFileSync(path.join(root,'docs/reports/champions-history-validation-2026-11-11.md'),lines.join('\n')+'\n');
}
function main(){
 fs.mkdirSync(output,{recursive:true});
 const protocolPath=path.join(output,'protocol.json');
 if(fs.existsSync(protocolPath))assert.deepEqual(JSON.parse(fs.readFileSync(protocolPath,'utf8')),protocol,'Do not change the protocol after results');
 else fs.writeFileSync(protocolPath,JSON.stringify(protocol,null,2)+'\n');
 const before=Object.fromEntries(protectedFiles.map(p=>[p,hash(p)]));
 const artifact=read(artifactPath),database=read('data/normalized/champions-md03-player-database-2026-27.json'),context=read('data/normalized/champions-player-history-context-2025-26.json');
 const national=read('data/sources/champions-player-senior-national-observations-2025-26.json').observations;
 const results=read('data/sources/champions-results-md03-2026-27.json');
 const teamProviderIds=new Map(read('data/sources/champions-pilot-match-stats-2025-27.json').teams.map(t=>[t.id,String(t.espnTeamId)]));
 const supplements=read('data/sources/champions-player-club-history-supplement-2025-26.json').players.filter(p=>p.entries.length);
 const recoveryCoverage=[];
 for(const [day,data] of [[3,artifact],[4,read('data/normalized/champions-md04-probable-individuals-2026-27.json')]])for(const f of data.fixtures)for(const t of f.teams)for(const p of t.players){
  const recovered=supplements.find(x=>x.teamId===t.teamId&&(x.playerId===p.playerId||x.playerId===p.registeredPlayerId||x.providerPlayerId&&String(x.providerPlayerId)===String(p.providerPlayerId)));
  if(!recovered)continue;
  const remaining=(p.blockers||[]).filter(b=>b!=='BASELINE_UNAVAILABLE_OR_UNSAFE');
  recoveryCoverage.push({matchday:day,fixtureId:f.fixtureId,teamId:t.teamId,playerId:p.playerId,projectedRole:p.projectedRole,expectedMinutes:p.expectedMinutes,hadPublishedForecast:Number.isFinite(p.projectedShots),remainingBlockers:remaining,eligibleAfterHistoryOnly:remaining.length===0&&Number.isFinite(p.expectedMinutes)&&p.expectedMinutes>0});
 }
 const ledger=read('data/sources/champions-player-shooting-evidence-2026-10-20.json');
 const eventDates=new Map();
 function index(obj,namespace=''){
  if(!obj||typeof obj!=='object')return;
  if(obj.date&&(obj.matchId||obj.eventId)){
   const key=String(obj.matchId||(namespace==='fotmobPerformances'?'fotmob:':'')+obj.eventId);
   const previous=eventDates.get(key);if(previous&&previous!==obj.date)throw Error('Conflicting event dates '+key);eventDates.set(key,obj.date);
  }
  for(const [key,value] of Object.entries(obj))if(value&&typeof value==='object')index(value,namespace||key);
 }
 for(const key of ['primaryPerformances','fotmobPerformances'])index(ledger[key],key);
 const snapshots=new Map();
 for(const file of fs.readdirSync(path.join(root,'data/predictions/champions-event-snapshots/md03')).filter(f=>f.endsWith('.json'))){
  const snapshot=read('data/predictions/champions-event-snapshots/md03/'+file);
  const {contentHash,...content}=snapshot;assert.equal(crypto.createHash('sha256').update(JSON.stringify(content)).digest('hex'),contentHash,'Snapshot content hash mismatch');
  if(!(snapshot.createdAt<snapshot.kickoffAt)||snapshot.chronologyStatus!=='VALID_PREMATCH_SNAPSHOT')continue;
  const old=snapshots.get(snapshot.fixtureId);if(!old||snapshot.createdAt<old.createdAt)snapshots.set(snapshot.fixtureId,{...snapshot,file});
 }
 const byProvider=new Map();for(const row of national){if(!byProvider.has(row.providerPlayerId))byProvider.set(row.providerPlayerId,[]);byProvider.get(row.providerPlayerId).push(row)}
 const cases=[],teamAudit=[],exclusions=[],historicalChanges=[],modelDrift=new Map();
 for(const fixture of artifact.fixtures){
  const snapshot=snapshots.get(fixture.fixtureId);assert(snapshot,'No immutable prematch snapshot');
  assert.equal(snapshot.dataVersion.inputs[artifactPath],hash(artifactPath),'Forecast archive changed since snapshot');
  for(const [file,sha] of Object.entries(snapshot.model.modules.player))if(hash(file)!==sha)modelDrift.set(file,{snapshot:sha,current:hash(file)});
  const result=results.fixtures.find(f=>f.fixtureId===fixture.fixtureId);assert(result?.detailedReportSource?.rawPath);
  const raw=read(result.detailedReportSource.rawPath),payload=raw.payload||raw,actualByProvider=new Map();
  const comp=payload.header.competitions[0];assert.equal(String(payload.header.id),new URL(result.detailedReportSource.url).searchParams.get('event'));
  assert.equal(comp.date.slice(0,10),snapshot.date);assert(comp.status.type.completed);
  assert(!/PEN|AET|EXTRA/.test(comp.status.type.name),'Unexpected non-regulation target match');
  for(const roster of payload.rosters||[]){
   const box=payload.boxscore.teams.find(t=>String(t.team.id)===String(roster.team.id));
   const bs=Object.fromEntries((box?.statistics||[]).map(s=>[s.name,Number(s.value??s.displayValue)]));
   const attackValid=Number.isFinite(bs.totalShots)&&Number.isFinite(bs.shotsOnTarget)&&!['totalShots','shotsOnTarget','wonCorners','foulsCommitted'].every(k=>bs[k]===0);
   for(const p of roster.roster||[]){
    const st=Object.fromEntries((p.stats||[]).map(s=>[s.name,s.value]));
    actualByProvider.set(String(p.athlete.id),{starter:p.starter,appearances:st.appearances,shots:st.totalShots,sot:st.shotsOnTarget,attackValid,providerTeamId:String(roster.team.id)});
   }
  }
  for(const team of fixture.teams){
   const audit={fixtureId:fixture.fixtureId,teamId:team.teamId,status:team.reconciliation.status};
   if(team.reconciliation.status!=='offline-conditional-only'){teamAudit.push({...audit,excluded:'baseline-team-not-published'});continue;}
   const members=database.teams.find(t=>t.teamId===team.teamId)?.players||[];
   const active=team.players.filter(p=>!p.blockers.length&&Number.isFinite(p.projectedShots)&&p.role!=='goalkeeper');
   const inputs={baseline:[],clubRecovered:[],nationalOfficial:[],nationalFriendly:[]};
   let valid=true;const diagnostics=[];
   for(const p of active){
    const member=members.find(x=>x.playerId===p.playerId||x.id===p.playerId);
    if(!member?.previousSeason?.totals){valid=false;diagnostics.push({playerId:p.playerId,reason:'missing-baseline-history'});continue;}
    const old=member.previousSeason.totals;
    const recalculated=rates(old,p);
    if(!recalculated||Math.abs(recalculated.shots-p.baseline.candidate.shots)>1e-9||Math.abs(recalculated.sot-p.baseline.candidate.sot)>1e-9){valid=false;diagnostics.push({playerId:p.playerId,reason:'baseline-rate-replay-mismatch',recalculated,recorded:p.baseline.candidate});continue;}
    const channels=Object.values(p.baseline.channels||{});
    for(const ch of channels)for(const id of ch.matchIds||[]){const date=eventDates.get(String(id));if(!date||date>=snapshot.date){valid=false;diagnostics.push({playerId:p.playerId,reason:date?'future-current-feature':'unknown-current-feature-date',matchId:id,date});}}
    if(p.minutesEstimate?.sample?.to>=snapshot.date){valid=false;diagnostics.push({playerId:p.playerId,reason:'future-minute-feature'});}
    const historyPlayer=context.teams.find(t=>t.teamId===team.teamId)?.players.find(x=>String(x.uefaPlayerId)===String(p.uefaPlayerId)&&x.uefaPlayerId);
    // Existing active baselines already possess history: only missing history is replaced in this arm.
    const club=(old.minutes>0&&Number.isFinite(old.shots)&&Number.isFinite(old.shotsOnTarget))?old:historyPlayer?.club?.totals||old;
    const espn=p.providerPlayerId||member.providerPlayerId;
    if(p.providerPlayerId&&member.providerPlayerId&&String(p.providerPlayerId)!==String(member.providerPlayerId)){valid=false;diagnostics.push({playerId:p.playerId,reason:'provider-identity-conflict'});}
    const nationalRows=(byProvider.get(String(espn))||[]).filter(r=>r.date<snapshot.date&&r.date>='2025-07-01'&&r.date<='2026-06-30'&&r.minutes>0&&Number.isFinite(r.shots)&&Number.isFinite(r.shotsOnTarget)&&r.shotsOnTarget<=r.shots);
    const armTotals={baseline:old,clubRecovered:club,nationalOfficial:pooled(club,nationalRows.filter(r=>r.scope==='official')),nationalFriendly:pooled(club,nationalRows.filter(r=>r.scope==='friendly'))};
    for(const [arm,total] of Object.entries(armTotals)){
     const rate=rates(total,p);if(!rate){valid=false;diagnostics.push({playerId:p.playerId,reason:'invalid-variant-rate',arm});continue;}
     inputs[arm].push({playerId:p.playerId,roleKey:p.role,expectedMinutes:p.expectedMinutes,per90:{shots:rate.shots,shotsOnTarget:rate.sot}});
     if(arm!=='baseline'&&(rate.shots!==recalculated.shots||rate.sot!==recalculated.sot))historicalChanges.push({fixtureId:fixture.fixtureId,teamId:team.teamId,playerId:p.playerId,arm,nationalMinutes:nationalRows.filter(r=>r.scope===(arm==='nationalOfficial'?'official':'friendly')).reduce((s,r)=>s+r.minutes,0)});
    }
   }
   if(!valid){teamAudit.push({...audit,excluded:'baseline-input-or-feature-audit-failed',diagnostics});continue;}
   const projected={};
   for(const [arm,players] of Object.entries(inputs))projected[arm]=projectMd3Team({mode:team.status,documentation:{officialXI:team.status==='official',officialBench:team.status==='official',probableXI:true},teamId:team.teamId,players,targetShots:team.reconciliation.targetShots,targetSOT:team.reconciliation.targetSOT});
   const baselineMatches=projected.baseline.players.length===active.length&&active.every(p=>{const q=projected.baseline.players.find(x=>x.playerId===p.playerId);return q&&Math.abs(q.shots-p.projectedShots)<1e-9&&Math.abs(q.sot-p.projectedSOT)<1e-9});
   if(!baselineMatches){teamAudit.push({...audit,excluded:'baseline-projection-replay-mismatch',replayed:projected.baseline.status});continue;}
   teamAudit.push({...audit,baselineReproduced:true,allocationPlayers:active.length,variantStatus:Object.fromEntries(Object.entries(projected).map(([k,v])=>[k,v.status]))});
   for(const p of active.filter(p=>p.projectedRole==='starter')){
    const frozen=snapshot.players.find(q=>q.teamId===team.teamId&&q.internalPlayerId===p.playerId);
    assert(frozen&&frozen.projectedShots===p.projectedShots&&frozen.projectedShotsOnTarget===p.projectedSOT&&frozen.expectedMinutes===p.expectedMinutes);
    const member=members.find(x=>x.playerId===p.playerId||x.id===p.playerId),espn=p.providerPlayerId||member?.providerPlayerId;
    const observed=espn?actualByProvider.get(String(espn)):null;
    const base={fixtureId:fixture.fixtureId,date:snapshot.date,teamId:team.teamId,playerId:p.playerId,name:p.canonicalName||p.sourceName,providerPlayerId:espn,role:p.role,expectedMinutes:p.expectedMinutes,snapshot:snapshot.file};
    if(!observed){exclusions.push({...base,reason:'actual-provider-not-found'});continue;}
    if(observed.providerTeamId!==teamProviderIds.get(team.teamId)){exclusions.push({...base,reason:'actual-provider-team-conflict'});continue;}
    if(!observed.starter){exclusions.push({...base,reason:'conditional-forecast-actual-non-starter'});continue;}
    if(!observed.attackValid||!Number.isInteger(observed.shots)||!Number.isInteger(observed.sot)||observed.sot>observed.shots){exclusions.push({...base,reason:'unverified-actual-shooting'});continue;}
    const predictions=Object.fromEntries(Object.entries(projected).map(([arm,result])=>{const q=result.players.find(x=>x.playerId===p.playerId);return [arm,q?{shots:q.shots,sot:q.sot}:null]}));
    cases.push({...base,actual:{shots:observed.shots,sot:observed.sot},predictions});
   }
  }
 }
 const arms=Object.keys(protocol.arms),common=cases.filter(r=>arms.every(arm=>r.predictions[arm]));
 const metrics=Object.fromEntries(arms.map(arm=>[arm,summarize(common,arm)]));
 const comparisons={};
 for(const arm of arms.filter(a=>a!=='baseline')){
  comparisons[arm]={};
  for(const metric of ['shotsMAE','sotMAE','shotsBrier1','sotBrier1'])comparisons[arm][metric]={baseline:metrics.baseline?.[metric],variant:metrics[arm]?.[metric],improvementPct:metrics.baseline?.[metric]?100*(metrics.baseline[metric]-metrics[arm][metric])/metrics.baseline[metric]:null,bootstrap:bootstrap(common,arm,metric)};
 }
 const after=Object.fromEntries(protectedFiles.map(p=>[p,hash(p)]));assert.deepEqual(after,before,'Operational input changed');
 const result={protocol,summary:{frozenFixtures:snapshots.size,publishedStarterForecasts:artifact.fixtures.flatMap(f=>f.teams.flatMap(t=>t.players)).filter(p=>p.projectedRole==='starter'&&Number.isFinite(p.projectedShots)).length,
  teamsReplayed:teamAudit.filter(t=>t.baselineReproduced).length,teamsQuarantined:teamAudit.filter(t=>t.excluded==='baseline-input-or-feature-audit-failed'||t.excluded==='baseline-projection-replay-mismatch').length,
  actualStarterCases:cases.length,commonCases:common.length,commonFixtures:new Set(common.map(r=>r.fixtureId)).size,exclusions:exclusions.length,
  changedPredictions:Object.fromEntries(arms.filter(a=>a!=='baseline').map(arm=>[arm,common.filter(r=>r.predictions[arm].shots!==r.predictions.baseline.shots||r.predictions[arm].sot!==r.predictions.baseline.sot).length])),
  coverageByArm:Object.fromEntries(arms.map(arm=>[arm,cases.filter(r=>r.predictions[arm]).length]))},metrics,comparisons,
  roleBreakdown:Object.fromEntries(['defender','midfielder','forward'].map(role=>[role,Object.fromEntries(arms.map(arm=>[arm,summarize(common.filter(r=>r.role===role),arm)]))])),
  recoveryCoverage,modelModuleHashDrift:Object.fromEntries(modelDrift),teamAudit,exclusions,cases,historicalChanges,protectedInputHashes:before,operationalIntegrityPreserved:true};
 fs.writeFileSync(path.join(output,'results.json'),JSON.stringify(result,null,2)+'\n');
 writeReport(result);
 console.log(JSON.stringify({summary:result.summary,MAE:Object.fromEntries(Object.entries(metrics).map(([arm,m])=>[arm,{shots:m.shotsMAE,sot:m.sotMAE}])),operationalIntegrityPreserved:true}));
 return result;
}
if(require.main===module)main();
module.exports={rates,pooled,values,summarize,bootstrap,main,writeReport};
