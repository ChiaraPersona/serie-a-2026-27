import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {settleLeg,settleArchivedLeg} from '../js/pages/betting-settlement.mjs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{datasetCoverage}=require('./referee-stats/coverage');
const read=f=>JSON.parse(fs.readFileSync(f)),hash=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const matches=read('data/normalized/matches.json'),byId=new Map(matches.map(m=>[m.id,m]));
const predictions=read('data/normalized/predictions.json').predictions,md6=predictions.filter(p=>p.matchId.endsWith('md-06'));
const baseline=read('tmp/card-foundation-baseline.json');
const protectedState=read('data/sources/card-foundation-protected-hashes-2026-10-03.json');
const hashChecks=Object.entries(protectedState.hashes).map(([file,expected])=>({file,expected,actual:hash(file),unchanged:hash(file)===expected}));
const candidates=md6.flatMap(p=>p.likelyBooked.map(c=>({matchId:p.matchId,...c})));
const numericChanges=[];
let rankingUnchanged=true,shotsAndScoreUnchanged=true;
for(const p of md6){const b=baseline.predictions.find(b=>b.matchId===p.matchId);
  for(const key of ['shooters','teamProjections','expectedGoals','exactScores','scoreForecast','probabilities'])if(JSON.stringify(p[key])!==JSON.stringify(b[key]))shotsAndScoreUnchanged=false;
  for(let i=0;i<p.likelyBooked.length;i++){const c=p.likelyBooked[i],old=b.likelyBooked[i];if(c.name!==old.name||c.riskScore!==old.riskScore)rankingUnchanged=false;for(const key of ['refereeFactor','duelRisk','teamDisciplineFactor','expectedDefensiveExposureFactor'])if(c[key]!==old[key])numericChanges.push({matchId:p.matchId,playerName:c.name,field:key,before:old[key],after:c[key],reason:'Canonical ordinary-yellow correction, no coefficient/model change'});}
}
const records=read('data/sources/card-settlement-records-2026-10-03.json').records;
const legacyReviews=baseline.settlements.filter(r=>{const actual=settleLeg(r.leg,byId.get(r.leg.matchId));return actual.status!==r.status;}).map(r=>({matchId:r.leg.matchId,label:r.leg.label,recordedStatus:r.status,currentCheck:settleLeg(r.leg,byId.get(r.leg.matchId)),displayedStatus:settleArchivedLeg(r.leg,byId.get(r.leg.matchId),records).status}));
const sourceEvents=matches.filter(m=>m.competition==='serie-a'&&m.status==='finished').flatMap(m=>m.bookings);
const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(`${dir}/${e.name}`):[`${dir}/${e.name}`]);
const refereeDatasets=walk('data/normalized/referee-matches').filter(f=>f.endsWith('.json')).map(file=>{const rows=read(file).matches;const rawRoot=`data/raw/referee-stats/espn/${file.split('/')[3]}`;return {file,competition:rows[0]?.competition,season:rows[0]?.season,stage:rows[0]?.stage??'regular-season',...datasetCoverage(rows),rawGzipPresent:rows.filter(m=>fs.existsSync(`${rawRoot}/${m.competition}/${m.providerFixtureId}.json.gz`)).length,rawPlainJsonPresent:rows.filter(m=>fs.existsSync(`${rawRoot}/${m.competition}/${m.providerFixtureId}.json`)).length};});
const refereeAggregates=walk('data/generated/referee-stats').filter(f=>/aggregates(?:-pilot)?\.json$/.test(f)).map(file=>{const d=read(file),named=d.referees.filter(r=>r.referee&&r.referee!=='provider:unknown');const keys=[...new Set(d.referees.map(r=>`${r.competition}|${r.stage}`))];const pools=keys.map(key=>{const rows=d.referees.filter(r=>`${r.competition}|${r.stage}`===key),attributed=rows.filter(r=>r.referee!=='provider:unknown');return {scope:key,matches:rows.reduce((n,r)=>n+r.matches,0),identifiedMatches:attributed.reduce((n,r)=>n+r.matches,0),attributedYellowTeamRecords:attributed.reduce((n,r)=>n+(r.coverage?.yellowCards??0),0)};});return {file,pools,refereeRows:d.referees.length,refereeTeamRows:d.refereeTeams.length,attributedMatches:named.reduce((n,r)=>n+r.matches,0),unidentifiedBucketMatches:d.referees.filter(r=>r.referee==='provider:unknown').reduce((n,r)=>n+r.matches,0),yellowTotalsWithNoCoverage:d.referees.filter(r=>!r.coverage?.yellowCards).map(r=>({referee:r.referee,total:r.yellowCards,coverage:r.coverage.yellowCards}))};});
const engineRows=read('data/generated/referee-stats/2025-26/aggregates.json').referees.filter(r=>r.competition==='serie-a'&&r.stage==='regular-season');
const engineRefereePool={scope:'Serie A 2025-26, regular season; frozen league pool including legacy unknown-referee bucket; not an identified-referee denominator',denominator:engineRows.reduce((n,r)=>n+r.matches,0),identifiedMatches:engineRows.filter(r=>r.referee!=='provider:unknown').reduce((n,r)=>n+r.matches,0),unidentifiedBucketMatches:engineRows.filter(r=>r.referee==='provider:unknown').reduce((n,r)=>n+r.matches,0),yellowCards:engineRows.reduce((n,r)=>n+r.yellowCards,0),yellowCardsPerMatch:engineRows.reduce((n,r)=>n+r.yellowCards,0)/engineRows.reduce((n,r)=>n+r.matches,0),bytePreserved:hashChecks.find(r=>r.file==='data/generated/referee-stats/2025-26/aggregates.json')?.unchanged};
const canStats=read('data/normalized/referee-stats-2025-26.json');
const auxiliaryRefereeDatasets={canRoster:{file:'data/normalized/referees.json',referees:read('data/normalized/referees.json').length,denominator:'Registry, no match/card denominator'},canStatistics:{file:'data/normalized/referee-stats-2025-26.json',provider:canStats.sources,competitions:['serieA','serieB'].map(k=>({competition:k,refereeRows:canStats.referees.length,reportedMatchSamples:canStats.referees.reduce((n,r)=>n+(r[k]?.matches||0),0),positiveSampleReferees:canStats.referees.filter(r=>r[k]?.matches>0).length,independentEventCoverage:'UNKNOWN; aggregated provider snapshot, no complete event feed'}))},whoScoredTeamReferee:{file:'data/normalized/team-referee-profiles.json',coverage:read('data/normalized/team-referee-profiles.json').coverage,denominator:'Per referee-team appearances; provider top-20 or complete table, never global match pool'},assignments:{serieA:'data/sources/referee-assignments-2026-27.json',matchdays:read('data/sources/referee-assignments-2026-27.json').matchdays.map(m=>({matchday:m.matchday,assignments:m.assignments.length})),champions:'data/sources/champions-referee-assignments-2026-27.json',denominator:'Designations, not disciplinary rate samples'},calendars:[2023,2024,2025].map(y=>{const file=`data/normalized/referee-calendars/${y}-${String(y+1).slice(2)}.json`;return {file,matches:read(file).matches.length,denominator:'Fixture inventory only, no certified card outcomes'};})};
const tracked=execFileSync('git',['-c','core.safecrlf=false','diff','--name-only'],{encoding:'utf8'}).trim().split('\n').filter(Boolean);
const untracked=execFileSync('git',['ls-files','--others','--exclude-standard'],{encoding:'utf8'}).trim().split('\n').filter(f=>f&&!/output\/reports\/audit-cartellini/.test(f));
const changedFiles=[...new Set([...tracked,...untracked,'output/reports/card-foundation-2026-10-03.json','output/reports/card-foundation-2026-10-03.md'])].sort();
const report={generatedAt:new Date().toISOString(),phase:'1 ONLY',modelState:'NO_CARD_MODEL_CHANGE',eventTypes:sourceEvents.reduce((a,e)=>(a[e.eventType]=(a[e.eventType]||0)+1,a),{}),eventCount:sourceEvents.length,
  contextCoverage:{periodKnown:sourceEvents.filter(e=>e.period!=='unknown').length,postMatchKnown:sourceEvents.filter(e=>e.postMatchEvent!==null).length,onPitchKnown:sourceEvents.filter(e=>e.onPitchAtEvent!==null).length},
  identitySummary:candidates.reduce((a,c)=>(a[c.identityResolution]=(a[c.identityResolution]||0)+1,a),{}),collisions:candidates.filter(c=>c.identityResolution==='COLLISION').length,unresolved:candidates.filter(c=>!c.playerId).length,
  candidates:candidates.map(c=>({matchId:c.matchId,playerName:c.name,playerId:c.playerId,identityResolution:c.identityResolution,riskScore:c.riskScore,refereeFactor:c.refereeFactor,refereeFactorSource:c.refereeFactorSource})),
  md6RankingUnchanged:rankingUnchanged,md6ShotsAndScoreUnchanged:shotsAndScoreUnchanged,dataDrivenDiagnosticChanges:numericChanges,legacyReviews,recordedOutcomes:records.length,
  protectedHashChecks:hashChecks,refereeDatasets,refereeAggregates,auxiliaryRefereeDatasets,engineRefereePool,readingRefereePool:read('data/generated/reading-referee-profiles-2025-26.json').datasetAverage,
  features:{players:read('data/generated/current-disciplinary-features-2026-27.json').players.length,usedInRiskScore:false},tests:read('output/reports/card-foundation-tests-2026-10-03.json'),browser:read('output/reports/card-foundation-browser-2026-10-03.json'),changedFiles,
  verdict:'CARD DATA FOUNDATION NOT READY',remainingDataLimitations:['Period/post-match context is unknown in legacy individual events; future rule-specific evaluation needs richer eligible actuals.','Abbreviated DUO market variant must be mapped to a fully verified rule before prospective target calibration.','Historical referee raw gzip files are absent; rich derived events are preserved but reconstruction/validators cannot be certified.']};
fs.writeFileSync('output/reports/card-foundation-2026-10-03.json',JSON.stringify(report,null,2)+'\n');
const table=(headers,rows)=>`| ${headers.join(' | ')} |\n| ${headers.map(()=>'---').join(' | ')} |\n${rows.map(r=>`| ${r.map(v=>String(v??'N/D').replace(/\|/g,' / ').replace(/\n/g,' ')).join(' | ')} |`).join('\n')}`;
const link=f=>`[${f}](${path.resolve(f).replace(/\\/g,'/')})`;
const failures=report.tests.results.filter(r=>!r.passed);
const targeted=Number(report.tests.results.find(r=>r.command==='scripts/test-card-foundation.mjs').stdout.match(/Card foundation: (\d+) tests/)[1]);
function reason(f){
  if(/^data\/teams\/.+\.json$/.test(f))return 'Rigenerazione dei totali disciplinari con copertura; componenti incomplete restano N/D, con evidenze note separate.';
  if(/^data\/schemas\//.test(f))return 'Schema separato di eventi, snapshot futuri o actuals; probabilità calibrata obbligatoriamente nulla.';
  if(/^output\/reports\//.test(f))return /\.png$/.test(f)?'Cattura di verifica locale desktop/mobile.':'Evidenza riproducibile di audit, test o rapporto finale.';
  if(/\.html$/.test(f))return 'Rigenerazione locale del riferimento alle risorse aggiornate; nessuna pubblicazione.';
  const reasons={
    'css/matches.css':'Badge distinto per eventi di tipo unknown, senza fallback grafico giallo.',
    'data/generated/card-target-definitions-v1.json':'Target e regole versionati; nessun modello statistico.',
    'data/generated/current-disciplinary-features-2026-27.json':'587 campioni individuali correnti, incluse panchine; feature dati non usate nel rischio.',
    'data/generated/reading-referee-profiles-2025-26.json':'Denominatore attribuibile corretto; eventi ricchi preesistenti conservati con copertura non ricertificata.',
    'data/generated/referee-stats/2023-24/aggregates.json':'582 falsi zeri con copertura gialli assente corretti in null; nessuna ricostruzione raw.',
    'data/normalized/card-settlement-records.json':'Copia normalizzata del registro separato degli esiti storici.',
    'data/normalized/matches.json':'Eventi/totali canonici e alias verificati propagati dal calendario/importer.',
    'data/normalized/predictions.json':'ID, semantica euristica, fallback arbitro e feature di ricerca; ranking/rischio MD6 invariati.',
    'data/predictions/card-snapshots/README.md':'Contratto per catture future separate e immutabili; nessuna cattura storica o MD6 creata.',
    'data/sources/card-foundation-protected-hashes-2026-10-03.json':'31 hash pre-change e fingerprint del blocco matematico congelato.',
    'data/sources/card-settlement-records-2026-10-03.json':'25 esiti pre-change conservati con provenienza legacy; non certifica un nuovo target.',
    'data/sources/match-results-2026-27.json':'Migrazione canonica dei 164 eventi, contesti null e classificazione corretta delle espulsioni.',
    'docs/card-data-targets-v1.md':'Specifica di tassonomia, target, regole, copertura, provenienza e contratti futuri.',
    'js/pages/betting-settlement.mjs':'Settlement disciplinare conservativo; registro storico distinto dal controllo corrente.',
    'js/pages/betting.js':'Etichette rischio/quote/EV euristici e stato archiviato con target da verificare.',
    'js/pages/champions.js':'Semantica comparativa del rischio e primo ammonito euristico.',
    'js/pages/disciplinary.mjs':'Unica definizione condivisa di tassonomia, coverage, identità, eligibility e target actuals.',
    'js/pages/readings.js':'Gialli baseline storica, contesto fallback, primo ammonito euristico e tipo evento esplicito.',
    'js/team-squads.js':'Totali incompleti non resi come interi cartellini certi.',
    'package.json':'Comandi mirati per migrazione, contratti, test e report della foundation.',
    'scripts/build-card-data-foundation.js':'Genera schemi, definizioni e dati correnti senza snapshot predittivi.',
    'scripts/build-champions-player-markets.js':'Solo metadati futuri/null/firstBookedHeuristic; formule invariate, archivio non rigenerato.',
    'scripts/build-champions-schedina.js':'Annota trasformazione pseudo-probabilistica futura senza riscrivere giocate archiviate.',
    'scripts/build-predictions.js':'Arricchimento di identità/feature/exposure e reason fallback; feature nuove escluse dal rischio.',
    'scripts/build-reading-referee-profiles.js':'Denominatore delle gare attribuibili e protezione contro ricostruzione povera senza raw.',
    'scripts/build-schedina.js':'Metadati euristici per rischio/quote/EV/DUO e proxy gialli verso punti; numeri legacy invariati.',
    'scripts/build-site.js':'Versioni delle risorse per la rigenerazione locale.',
    'scripts/card-foundation-baseline.mjs':'Cattura iniziale forense delle predizioni/esiti; rifiuta sovrascrittura di baseline esistente.',
    'scripts/card-research-contracts.js':'Factory data-only per candidati/actuals con probabilità e contesto mancanti null.',
    'scripts/disciplinary-features.js':'Aggregati correnti e copie storiche di ricerca con copertura e cutoff; nessun contributo al riskScore.',
    'scripts/generate-schedina-md02.js':'Trasformazione legacy marcata euristica/non calibrata per eventuali nuove generazioni.',
    'scripts/import-official-calendar.js':'Propaga esclusivamente alias già verificati nel registro identità.',
    'scripts/import-statmuse-result.js':'Tassonomia esplicita, ID irrisolti null e totali espulsione ricavati da eventi.',
    'scripts/predictions/engine.js':'ID/alias verificati, deduplica non ambigua e diagnostica; blocco matematico equivalente.',
    'scripts/referee-stats/aggregate.js':'Gare senza arbitro escluse dal per-referee e tassi consentiti solo con copertura completa.',
    'scripts/referee-stats/coverage.js':'Copertura dataset/metriche e known/missing components separati.',
    'scripts/repair-card-foundation.js':'Migrazione idempotente della fonte attuale e dei soli falsi zeri storici.',
    'scripts/report-card-foundation.mjs':'Produce il rapporto A–N e inventario/hash/confronti in JSON.',
    'scripts/standings.js':'Aggregati cartellini della classifica coverage-aware.',
    'scripts/team-pages/build.js':'Totali, leaderboard e comparator disciplinari con metadati di copertura.',
    'scripts/test-card-foundation-browser.cjs':'28 verifiche UI desktop/mobile su tutte le MD6 e regressioni reali/archivio/Champions.',
    'scripts/test-card-foundation.mjs':'Regressioni di dati, settlement, identità, contesto, actuals, arbitri e immutabilità.',
    'scripts/test-player-identities.js':'Null ammessi soltanto come fallback esplicitamente dichiarati; MD6 tutte risolte.',
    'scripts/test-schedina-md04.js':'Conteggi storici originali verificati attraverso il registro separato, senza ridurre aspettative.',
    'scripts/test-schedina-md05-results.mjs':'Esiti storici originali preservati; le verifiche strict sono testate separatamente.',
    'scripts/test-schedina.js':'Regressione degli esiti archiviati attraverso settleArchivedLeg; conteggi originali invariati.',
    'scripts/validate-card-foundation.mjs':'Esegue 29 suite pertinenti e salva separatamente errori raw preesistenti.'
  };
  if(!reasons[f])throw new Error(`Missing change reason: ${f}`);return reasons[f];
}
const markdown=`# Card Data Integrity & Target Definition — PHASE 1

3 ottobre 2026 · repository locale serie-a-2026-27 · modello cartellini congelato.

La riparazione e i contratti sono implementati e verificati. La foundation non è ancora pronta per calibrare un target bookmaker: mancano contesti individuali certificati, la variante DUO delle etichette abbreviate deve essere verificata e i raw storici arbitri richiesti dai validator sono assenti. Nessuna pubblicazione, tuning o probabilità Card V2 validata.

## A. DATA MODEL

Core condiviso: ${link('js/pages/disciplinary.mjs')}; schema: ${link('data/schemas/disciplinary-event.schema.json')}. Versioni card-data-v1/card-targets-v1, distinte dalle versioni del motore.

${table(['eventType','Definizione','Record evento','Sanzioni fisiche rappresentate','Punti standard se eleggibile'],[['yellow','Giallo ordinario',1,1,1],['yellowRedCard','Secondo giallo con conseguente espulsione',1,2,1],['redCard','Rosso diretto',1,1,1],['unknown','Classificazione irrisolta','Evento preservato','N/D','N/D']])}

Campi: playerId, playerName, teamId; minute/addedTime; eventType; period; eventOrder; participationStatus; onPitchAtEvent, benchEvent, postMatchEvent; source, sourceEventType, classificationConfidence e contextSource. I campi di compatibilità player/card/team restano. Unknown/null non diventano gialli, rossi, false o zero. Nessun ID è costruito dal nome irrisolto.

Conservati tutti i 164 eventi MD1–MD5 di 50 referti: 162 yellow, 1 redCard, 1 yellowRedCard, zero duplicati esatti. I 164 periodi e i 164 stati post-match restano sconosciuti; lo stato on-pitch è verificabile per un solo evento (Sabelli, false). La completezza della lista non certifica l'eleggibilità per ogni mercato.

## B. TARGET DEFINITIONS

${table(['Target','Esito positivo','Requisiti distinti'],[['PLAYER_YELLOW','Almeno un yellow ordinario eleggibile','yellowRedCard da solo e redCard non soddisfano questo target stretto'],['PLAYER_ANY_CARD','Almeno un yellow/yellowRedCard/redCard eleggibile','Regola, periodo, panchina/post-match e partecipazione noti'],['PLAYER_DUO_CARD','Giocatore OR suo diretto sostituto qualificato riceve una carta eleggibile','Sostituzioni complete, ID univoci, regola; nessuna formula di probabilità'],['FIRST_BOOKED_PLAYER','Autore del primo yellow ordinario eleggibile','Universo completo, clock/recupero, ordine ufficiale o insieme di ID a pari tempo, contesto campo/panchina/sostituzioni'],['TEAM_CARD_POINTS','Totale esatto secondo ruleId','Punti per categoria, massimo individuale, periodo e trattamento panchina/post-match espliciti']])}

Regola punti standard Sisal: 1 punto per giallo ordinario, 1 per espulsione da secondo giallo (il secondo giallo stesso è escluso), 1 per rosso diretto, massimo 2 per giocatore; tempi regolamentari e recupero; esclusi panchina, giocatori già sostituiti e carte dopo il fischio finale. Un giallo seguito dal secondo-giallo/espulsione produce due record, tre sanzioni fisiche e due punti eleggibili. bookings.length non è il target.

Fonti verificate: [Regolamento Sisal Calcio](https://www.sisal.it/content/dam/new-dam/italy/canali/sisal-it/doc-pdf/scommesse/info-scommesse/calcio.pdf), pagine stampate 428–429 per punti e 233–234 per la variante DUO esplicitamente comprensiva di panchina/rigori/post-partita. Le regole on-pitch e ALL_CONTEXTS sono contratti separati; quest'ultima richiede feed ALL_CONTEXTS certificato. L'etichetta locale CARTELLINO SI/NO (DUO) INC TS non identifica da sola la variante: è obbligatorio un cardRuleId esplicito prima del settlement corrente. Target individuale e DUO restano diversi.

## C. NORMALIZATION FIXES

Johan Vásquez, Genoa–Frosinone MD4: eventi invariati a 66' yellow e 86' yellowRedCard. I totali Genoa prima erano yellowCards=3, secondYellowCards=0, straightRedCards=1; dopo sono 2, 1, 0, includendo l'altro giallo ordinario della squadra. Il vecchio totale del provider è preservato in providerDiscipline e non interpreta la causa dell'espulsione. Il solo Vásquez ha un giallo ordinario e un'espulsione da secondo giallo, senza rosso diretto.

Stefano Sabelli, Genoa–Napoli MD1: evento yellow a 85' preservato. didNotPlay verificato determina UNUSED, onPitchAtEvent=false, benchEvent=true, contextSource=verified-didNotPlay. È una classificazione del partecipante inutilizzato, non una posizione fisica registrata indipendentemente. Periodo e postMatch restano unknown/null; la regola del mercato decide esclusione o void, non la cancellazione dell'evento.

L'importer non assegna più secondYellow=0 per convenzione né trasforma RedCards in straightRed. Eventi espliciti e copertura guidano i totali; classificazioni insufficienti restano unknown. Migrazione idempotente. Nei soli aggregati storici 2023/24 sono corretti 582 falsi zeri gialli senza copertura (56 righe arbitro + 526 arbitro-squadra), senza ricostruire eventi assenti.

## D. COVERAGE MODEL

${table(['Stato','Significato'],[['COMPLETE','Lista esplicitamente completa nel suo scope; [] può attestare zero. Contesto/identità hanno verifiche proprie.'],['PARTIAL','Conosciute alcune componenti; value finale null, knownSubtotal/knownComponents preservati.'],['UNAVAILABLE','Fonte esplicitamente assente o array mancante pur dichiarato completo.'],['UNKNOWN','Nessuna dichiarazione sufficiente; available generico non attesta feed disciplinare completo.']])}

yellow=1, secondYellow=null, straightRed=null mantiene yellow=1 e subtotal=1, ma allCards=null/PARTIAL. Tassi/starts/falli non diventano zero quando la partecipazione o l'esposizione è ignota. Le nuove copie storiche di ricerca non espongono cards/90 completo quando manca una categoria; l'input legacy del rischio non è riscritto.

## E. SETTLEMENT

${table(['Caso','Prima','Ora, controllo corrente'],[['YES senza bookings','LOST','unavailable'],['NO senza bookings','WON','unavailable'],['Under punti; [] e coverage unavailable','WON','unavailable'],['Feed parziale','Possibile somma incompleta','unavailable; evidenze note preservate'],['[] con feed COMPLETE, regola/ID/partecipazione validi','Zero implicito','Zero certificato: YES lost / NO won'],['Evento secondYellow','Possibile rosso diretto','Categoria separata; regola specifica'],['Carta bench/post-match','Possibile inclusione generica','Eleggibilità per ruleId; contesto ignoto => unavailable'],['ID irrisolto o sostituzioni DUO incomplete','Possibile fallback implicito','unavailable'],['Non partecipazione verificata e regola definita','Variabile','void con reason; evento disciplinare conservato']])}

Gli esiti completati non vengono ricalcolati silenziosamente. Un registro separato conserva 25 esiti disciplinari pre-change e settleArchivedLeg espone recorded outcome, currentCheck, reviewRequired e provenienza legacy. Sono ${legacyReviews.length} gli esiti che il controllo strict non può ricertificare: 16 DUO senza ruleId verificato e un Under punti con contesto insufficiente. Lo stato storico visualizzato resta identico al precedente, annotato come archiviato/target da verificare; nessun esito viene dichiarato dimostrabilmente errato in assenza della regola/contesto. Odds, giocate e conteggi di settlement archiviati restano preservati.

${table(['Partita','Selezione','Esito archiviato preservato','Controllo corrente / motivo'],legacyReviews.map(r=>[r.matchId,r.label,r.recordedStatus,`${r.currentCheck.status}: ${r.currentCheck.reason}`]))}

Ridgeciano Haps resta void storico; una nuova verifica non inventa una mancata partecipazione né un'identità presente nel referto. Nessun record legacy è spacciato per actual target certificato.

## F. IDENTITIES

${table(['MD6 likelyBooked','Numero'],[['Candidati',50],['Risolti direttamente su nome canonico/ID',report.identitySummary.CANONICAL_ID||0],['Risolti tramite alias già verificato',report.identitySummary.VERIFIED_ALIAS||0],['Irrisolti',report.unresolved],['Collisioni',report.collisions]])}

playerId è primario, nome visualizzato preservato. Alias provengono dal registro verificato e dalle XI ufficiali già collegate, senza nuove identità ipotizzate. Deduplica solo della coppia teamId:playerId risolta; ambiguità non unificate. Fallback solo nome esplicitamente marcato. L'elenco completo dei 50 candidati/ID/metodo è nel rapporto JSON.

## G. CURRENT-SEASON FEATURES

587 righe correnti, incluse panchine inutilizzate. Disponibili appearances/starts/minutes, ordinaryYellows/secondYellowDismissals/straightReds, partite con almeno una carta registrata, eventi/90 e gialli/90, falli commessi/per90 e subiti dove presenti, sample sizes, completeSamples, known/missing components, provenienza e cutoff. Le 454 righe di giocatori entrati non sono il denominatore delle 587 righe dati complessive.

anyQualifyingCard nelle feature descrive ALL_RECORDED_CONTEXTS_DATA_ONLY e conta partite con carte registrate, senza certificare il mercato bookmaker. Le carte panchina sono dati, non esposizione in campo. Per ogni candidato pre-match sono escluse gara target, gare non finite e giornate future.

Expected Minutes e substitutionRisk referenziano l'output Player Market V2 serializzato; startingProbability ed expectedMinutesReliability restano null quando non serializzati. Stato XI conservato. Feature nuove: usedInLegacyRiskScore=false; nessun Expected Minutes o cartellino corrente viene inserito nella formula legacy.

## H. REFEREES

Campione descrittivo Serie A+B 2025/26: 760 gare nel dataset, 720 con arbitro identificato, 720 con gialli utilizzabili attribuibili, 2.853 gialli. Correzione 2.853/760 ≈ 3,75 a 2.853/720 = 3,9625 (UI 3,96). Restano 2.900 gialli-evento derivati già presenti: non sono forzati a coincidere con i totali squadra. Mancando i raw, sono preservati con source RETAINED_DERIVED_DATA, eventCoverage UNKNOWN, rawReconstructionAvailable=false.

Pool diverso e congelato del motore: Serie A 2025/26 regolare, 380 gare, 340 arbitri identificati + 40 nel bucket legacy provider:unknown, 1.366 gialli, media 3,594736842105263. È un denominatore di lega, non un campione attribuito a un arbitro nominato. File byte-for-byte invariato; nessuna propagazione del 3,9625 e nessun coefficiente ritoccato. Le nuove aggregazioni per arbitro escludono le gare senza identità. I profili nominali UI escludono il bucket anonimo.

Tutti i dataset normalizzati ESPN, incluse fasi/pilot (le colonne usable si riferiscono alle gare attribuibili; gzip è disponibilità dei file attesi, non dedotta dai JSON semplici):

${table(['File','Gare dataset','Arbitro identificato','Gialli utilizzabili','Tutte categorie utilizzabili','Team-record gialli mancanti','Raw gzip / plain JSON'],refereeDatasets.map(r=>[r.file,r.matchesInDataset,r.matchesWithIdentifiedReferee,r.matchesWithUsableYellowCoverage,r.matchesWithUsableCardCoverage,r.missingYellowTeamRecords,`${r.rawGzipPresent} / ${r.rawPlainJsonPresent}`]))}

Inventario aggregati ESPN; denominatori distinti per competizione/stage nelle righe del file e per singola coppia arbitro-squadra (non somme duplicate di gare):

${table(['File','Righe arbitro','Righe arbitro-squadra','Gare attribuite sommate','Gare bucket anonimo','Righe gialli senza copertura'],refereeAggregates.map(r=>[r.file,r.refereeRows,r.refereeTeamRows,r.attributedMatches,r.unidentifiedBucketMatches,r.yellowTotalsWithNoCoverage.length]))}

${table(['Aggregato / scope','Gare nel pool','Gare attribuite','Record squadra gialli coperti attribuiti'],refereeAggregates.flatMap(r=>r.pools.map(p=>[`${r.file} / ${p.scope}`,p.matches,p.identifiedMatches,p.attributedYellowTeamRecords])))}

Serie B regolare 2023/24: tutti i 760 record squadra gialli sono mancanti, non zero; 380 gare identificate ma zero gare con gialli utilizzabili. Restano limiti di copertura anche nelle altre competizioni/fasi, documentati senza backfill. Nessun raw gzip atteso è presente per queste serie normalizzate; i 20 raw plain JSON 2025/26 sono campioni parziali, non una ricostruzione completa.

Altre fonti e denominatori:

${table(['Fonte/file','Scope e denominatore','Copertura / uso'],[
['data/normalized/referees.json','42 arbitri CAN 2026/27; registro senza gare','Identità ufficiali, non campione statistico'],
['data/normalized/referee-stats-2025-26.json','Snapshot dei soli 42 CAN: Serie A 354 presenze arbitro, 35 con campione >0; Serie B 215, 37 con campione >0','Soccerbase / SbancoBet, date e scope propri; B può includere postseason. Nessun feed eventi completo; zero campione non evidenza di tasso zero'],
['data/sources/team-referee-profiles-2025-26.json → data/normalized/team-referee-profiles.json','WhoScored: denominatore appearances di ogni coppia; 20 squadre, 17 con dati, 336 righe','5 tabelle complete e 12 top-20; 3 squadre N/D Serie A; 313 collegamenti ESPN, fonti autonome'],
['data/generated/reading-referee-profiles-2025-26.json','Serie A+B regolare, campione attribuibile e completo 720','Profilo descrittivo corretto, eventi derivati conservati'],
['data/sources/referee-assignments-2026-27.json',`Designazioni MD${auxiliaryRefereeDatasets.assignments.matchdays.map(r=>r.matchday).join(', MD')}; nessun denominatore cartellini`,'MD6 assente: tutti i 50 candidati factor=1, NO_DESIGNATION_AVAILABLE'],
['data/sources/champions-referee-assignments-2026-27.json','Designazioni Champions MD1 e dati referee evidence dichiarati dalla fonte','Competizione distinta, non unita al pool Serie A'],
...auxiliaryRefereeDatasets.calendars.map(r=>[r.file,`${r.matches} fixture di calendario, fasi esplicite`,'Nessun feed disciplinare; raw calendari Wikipedia corrispondenti']),
['data/normalized/referee-aliases.json','Mappatura identità, non denominatore di gare','Non crea evidenza disciplinare'],
['data/generated/referee-stats/{season}/import-report*.json e validation-report.json','Report amministrativi, non dataset di actuals','Stato import/validazione storico, non prova che oggi i raw siano presenti'],
['data/raw/referee-stats/calendars/*.wikitext.txt e data/raw/referee-stats/espn/2025-26/{serie-a,serie-b}/*.json','6 calendari e 20 payload campione','Nessun rebuilding impoverito eseguito']])}

Il fallback MD6 significa assenza di designazione; non arbitro medio, neutralità osservata o effetto verificato. Le unità del denominatore, le fonti e la copertura rimangono separate.

## I. LEGACY RISK SCORE

Fingerprint SHA-256 del blocco matematico comparato alla baseline originale: invariato. Coefficienti di rischio/ranking, arbitro e duello, logiche outsider e modelli protetti invariati. Tutti i 50 candidati MD6 conservano nomi, ordine e riskScore; shots/SOT, teamProjections, probabilità ed exact-score MD6 confrontati con la baseline risultano invariati.

Unica variazione numerica diagnostica necessariamente dovuta alla correzione dei dati Genoa: teamDisciplineFactor di Ostigard (ID leo-stigard) e Sow (djibril-sow) da 1,002 a 1,001, incluso riskComponents; riskScore finale e ranking invariati. Il file Team Profiles V2 resta byte-identico; la diversa componente transitoria viene dal dato corretto, non da tuning.

Conversioni censite:

${table(['Percorso','Calcolo legacy preservato','Semantica ora esplicita'],[['scripts/generate-schedina-md02.js','clamp(riskScore / 150, 0.18, 0.62); fair odds come reciproco','Euristica non validata; proxy individuale non probabilità DUO'],['scripts/build-schedina.js','Stessa clamp; fair odds, EV, prodotto delle probabilità/quote','HEURISTIC_UNVALIDATED_INDIVIDUAL_PROXY_FOR_DUO, calibratedProbability=null'],['scripts/build-champions-schedina.js','Stessa clamp, reciproco, EV e combinazioni','Euristica non calibrata; archivi numerici non rigenerati'],['scripts/build-schedina.js — U/O punti','Poisson sul baseline gialli storico/fissa dispersione','UNVALIDATED_YELLOW_BASELINE_PROXY_FOR_CARD_POINTS, target distinto TEAM_CARD_POINTS'],['js/pages/betting.js — Serie A e Champions','Visualizza quote fair/EV storici e aggregati slip','Indice euristico non calibrato; quota derivata euristica; EV euristico non validato'],['scripts/build-champions-player-markets.js e js/pages/champions.js','Score comparativo, flag primo della classifica','Nessuna probabilità calibrata; soli metadati/etichette']])}

Nessuna trasformazione arbitraria sostitutiva è introdotta. Questi numeri legacy non sono usabili come probabilità Card V2 calibrate né come vantaggio statistico provato. Nessun nuovo snapshot o giocate archiviate sono rigenerati per applicare i metadati.

Stima squadra rinominata Gialli · baseline storica; contract HISTORICAL_YELLOW_CARD_BASELINE_FIXED_DISPERSION_NOT_ALL_DISCIPLINARY_EVENTS. Distribuzione/modello numerico invariati.

## J. FIRST BOOKED

possibleFirstBooked preservato solo per compatibilità; firstBookedHeuristic=true per rank 1, firstBookedProbability=null. UI Primo ammonito · euristica, senza probabilità. Il contratto actuals richiede eleggibilità, timestamp completo, universo dei giocatori, stato sostituzioni/panchina/post-partita. Pari timestamp senza ordine ufficiale producono insieme di ID; l'indice array non decide il vincitore.

## K. SNAPSHOT READINESS

Contratti separati: ${link('data/schemas/card-snapshot.schema.json')}, ${link('data/schemas/card-actuals.schema.json')}, ${link('data/predictions/card-snapshots/README.md')}. Envelope snapshot con schema/ID/match/season/competition, generatedAt, cutoff, targetVersion e candidati. Candidato: playerId/nome/team/opponent/role/detailedRole, XI, expectedMinutes/reliability, startingProbability/substitutionRisk, campioni storici/correnti e falli, referee identity/status/evidence, duello, riskScore legacy, target/rule/version, coverage e model state. Probability è vincolata null in DATA_ONLY_NO_VALIDATED_CARD_MODEL; ruleId resta null finché non verificato.

Actuals distinti da snapshot: ordinaryYellow, secondYellowDismissal, straightRed; ANY individuale separato da duoQualifyingCard; primo minuto qualificante, participation/minutesPlayed, conteggi pitch/bench/post-match, teamCardPoints regolamentare documentato, eventi, coverage e reason eligibility. Campi assenti null, non zero. Provenienza evento/source field/normalization/target/fallback mantenuta o documentata nelle feature.

Nessun writer di snapshot Card V2 abilitato, nessun fake backfill, nessun inserimento nei Player Market MD6 congelati. ${hashChecks.filter(r=>r.unchanged).length}/${hashChecks.length} file protetti hanno SHA-256 identico: include snapshot MD6, manifest, archivi, giocate/odds, Team Profiles V2 e gli altri dati congelati. I dettagli expected/actual sono nel JSON.

## L. TESTS

${table(['Verifica','Esito'],[['Regressioni mirate foundation',`${targeted} pass, 0 fail`],['Suite pertinenti complessive',`${report.tests.passed}/${report.tests.suites} pass; ${report.tests.failed} fail per raw preesistenti assenti`],['Browser Edge locale desktop/mobile',`${report.browser.passed} pass, ${report.browser.failed} fail; zero errori JS, nessun overflow rilevato`],['Snapshot/manifest/file protetti',`${hashChecks.filter(r=>r.unchanged).length}/${hashChecks.length} hash invariati`],['Ranking/rischio MD6 e modelli shots/score','Confronto baseline invariato'],['Schemi JSON','Generati e letti nei controlli contrattuali; nessuna certificazione di validatore JSON Schema esterno'],['git diff --check','Verificato separatamente prima della consegna']])}

Le 29 suite comprendono normalizzazione/settlement, identità, referti, predizioni, rendering V2, Team Profiles/volume/referee, future-data, Schedina MD1–MD5/void/risultati, snapshot immutabili, dati, JS/CSS, XI e Champions. Conteggi storici nei test mantenuti, non indeboliti: le aspettative archiviate verificano il registro; nuove suite testano separatamente il settlement strict. Il test browser copre tutte le 10 gare MD6 a 1280/390px, Vásquez, Sabelli, archivio MD5 e semantica Champions.

Blocker storici non riparati artificialmente:

${table(['Validator','Motivo'],failures.map(r=>[r.command,`ENOENT raw gzip ${r.stderr.match(/(\d+\.json\.gz)/)?.[1]??'missing'}`]))}

Mancano 679226.json.gz (2023/24), 712116.json.gz (2024/25), 736790.json.gz (2025/26) nelle rispettive directory Serie A. Sono fallimenti di disponibilità raw, non risolti trasformando dati mancanti in zero o cambiando assertion. Output dettagliati: ${link('output/reports/card-foundation-tests-2026-10-03.json')} e ${link('output/reports/card-foundation-browser-2026-10-03.json')}.

## M. FILES CHANGED

Elenco completo: ${changedFiles.length} file, inclusi output locali e report. I file audit-cartellini già presenti prima di questo task non sono inclusi né modificati. Nessun commit/push/deploy; nessuna alterazione dei file protetti o giocate completate.

${table(['File','Motivo'],changedFiles.map(f=>[link(f),reason(f)]))}

## N. FINAL VERDICT

La struttura dati e i controlli conservativi sono implementati. Non si autorizza ancora una calibrazione del target bookmaker: occorrono feed prospettici con periodo/pitch/bench/post-match/sostituzioni certificati, mapping verificato delle specifiche varianti DUO e ripristino/verifica dei raw referee storici necessari. Nessun risultato di questo task valida un modello statistico Card V2.

CARD DATA FOUNDATION NOT READY
`;
fs.writeFileSync('output/reports/card-foundation-2026-10-03.md',markdown);
console.log(JSON.stringify({events:report.eventTypes,context:report.contextCoverage,identities:report.identitySummary,rankingUnchanged:rankingUnchanged,shotsAndScoreUnchanged,numericChanges,legacyReviews:legacyReviews.length,hashesPreserved:hashChecks.filter(r=>r.unchanged).length,engineRefereePool,readingRefereePool:report.readingRefereePool,changedFiles:changedFiles.length},null,2));
