"""Write the isolated preview and report; no published artifact is generated."""
import collections
import hashlib
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
BASE=ROOT/'data/analysis/champions/md3-offline-engine-2026-10-19'
def read(name):return json.loads((BASE/name).read_text(encoding='utf-8'))
def write(name,data):(BASE/name).write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
data=read('preview-md03.json');before=read('protected-before.json')
changes=[]
for file,expected in before.items():
    p=ROOT/file
    if not p.exists() or hashlib.sha256(p.read_bytes()).hexdigest()!=expected:changes.append(file)
assert changes==['scripts/test-champions-context-adjusted-baseline.js'],changes
write('protected-verification.json',{'filesChecked':len(before),'modifiedExisting':changes,'dataChanged':False,'productionEnabled':False,'packages1and2Preserved':True,'refereesPreserved':True,'serieAUnchanged':True,'publicUIUnchanged':True})
players=[p for f in data['fixtures'] for t in f['teams'] for p in t['individuals']]
valid=[p for p in players if p['sensitivity']['candidate']]
packageImpact=[p for p in valid if p['sensitivity']['candidate']!=p['sensitivityWithoutPackage1']['candidate']]
blocked=collections.Counter(reason for p in players for reason in p['blockers'])
comparison=data['comparison']
write('quantitative-summary.json',{'comparison':comparison,'package1ConditionalChangesAtFixedContext':len(packageImpact),'blockedReasons':dict(blocked),'collectiveDetailedFixtures':sum(f['collective']['dataQuality']['detailedVolumesAvailable'] for f in data['fixtures']),'matchSpecificIndividualForecasts':0})
def fmt(v,dec=2):return '—' if v is None else f'{v:.{dec}f}'.replace('.',',')
def central(c,key):return (c.get('matchProjection') or {}).get(key,{}).get('central') if (c.get('matchProjection') or {}).get(key) else None
preview=['# Preview offline Champions MD3 — 20–21 ottobre 2026','',
'Non pubblicata, non collegata alle Letture o alle Schedine. Stesso motore collettivo precedente, senza medie arbitrali o cambiamenti dei coefficienti. Tutti i pronostici individuali di partita restano N/D: mancano XI, panchine e minuti previsti documentati. I rate di sensibilità per90 nel JSON non sono pronostici individuali operativi.','',
'| Fixture | Partita | 1 / X / 2 (%) | Punteggio principale | Gol attesi casa / ospiti | Tiri totali | SOT | Corner | Gialli attesi |','|---|---|---|---|---|---:|---:|---:|---:|']
for f in data['fixtures']:
    c=f['collective'];p=c['probabilities'];g=c['expectedGoals']
    preview.append(f"| {f['fixtureId']} | {f['home']} – {f['away']} | {fmt(p['home'],1)} / {fmt(p['draw'],1)} / {fmt(p['away'],1)} | {c['scoreForecast']['primary']['score']} | {fmt(g['home'])} / {fmt(g['away'])} | {fmt(central(c,'shotsTotal'))} | {fmt(central(c,'shotsOnTarget'))} | {fmt(central(c,'corners'))} | {fmt(c['cards']['central'])} |")
preview+=['','I gol attesi sono stime di gol del modello, non xG. Gialli attesi: campioni collettivi del modello; refereeAdjustment=null. Per Sabah–Dortmund i volumi dettagliati restano indisponibili su entrambi i lati secondo il gate esistente. Il JSON conserva anche intervalli, soglie diagnostiche, proiezioni per squadra e contratti provider già raccolti, senza selezionare nuove quote.','',
'## Individuali e disponibilità','',
'Per tutte le 18 gare: expectedMinutes=null, availability=null, projectedShots=null, projectedSOT=null e nessuna probabilità evento individuale. Nessun undici dedotto da rose o formazioni precedenti. Nessuna probabilità di subentro ricavata dal solo campione delle presenze.','',
'Sabah, Slavia Praha, Shakhtar Donetsk e Slovan Bratislava hanno individuals=[]: nessuna generazione individuale, neppure di diagnostiche per90, pur conservando integralmente i loro dati storici.','',
'Il dettaglio di ogni giocatore delle altre 32 squadre, dei pesi, dei canali, dei minuti di campione e dei blocchi è in preview-md03.json.']
(BASE/'PREVIEW.md').write_text('\n'.join(preview)+'\n',encoding='utf-8')
tests=[{'test':'test-champions-md3-offline.js','status':'PASS','evidence':'Executed after final gate changes; data/identity/dedup/quality/exposure/reconciliation tests passed.'},
{'test':'test-champions-context-adjusted-baseline.js','status':'PASS','evidence':'Frozen builder hash preserved, full contract equivalence, 46 frozen AEK rates replayed; original pilot tests passed.'},
{'test':'test-predictions.js','status':'PASS','evidence':'Engine 4.13.0: 59 matches passed.'},
{'test':'test-champions-substitute-forecasts.js','status':'PASS','evidence':'Existing Phase 11 minute thresholds and chronology tests passed.'},
{'test':'test-reading-prediction-v2.mjs','status':'FAIL_PREEXISTING_CONTRACT','evidence':'V2: sezione mancante Disciplina e ammoniti. Renderer and fixture data are byte-identical to session start.'},
{'test':'test-md06-statistical-models.js','status':'FAIL_PREEXISTING_SNAPSHOT','evidence':'Expected currentMatches=50, actual=54; historicalMatches=380 and historicalTeamPerformances=760. Inputs and test byte-identical to session start.'},
{'test':'git diff --check','status':'PASS','evidence':'Only LF/CRLF conversion warning.'}]
write('test-results.json',tests)
lines=['# Champions MD3 — collegamento e validazione offline','',
'## Esito','',
'Collegamento implementato in un percorso separato e non attivato in produzione. Preview delle 18 gare generata sotto questa cartella, senza scrivere dati normalizzati, Letture, Schedine o quote. Il candidato principale applica una politica osservato-only: non attribuisce attendibilità numerica a minuti stimati/non certificati. La variante di sensibilità incorpora tali stime con il blending AEK originale, ma resta esclusa da previsioni operative e calibrazione.','',
'**Stato finale: PARTIAL / NON PRONTO PER PRODUZIONE.** Sono disponibili tutte le previsioni collettive supportate; non esiste una base documentale per emettere previsioni individuali specifiche MD3. Non viene dichiarata una calibrazione che non è stata misurata.','',
'## Compatibilità del pilota AEK','',
'Recuperata dal Git la revisione be95b1470714b023932f82da13586612c1c085b5 del builder, con hash identico al controllo originale 135788a773b8607db7f1386a1c9d6b5d2fb8560fdab914d652318bfe95691be5. Lo snapshot immutabile non è stato modificato.','',
'Il builder corrente differisce per parametrizzazione matchday/output e metadati. Entrambi sono stati eseguiti sugli stessi input, intercettando ogni scrittura in memoria: contratti completi delle 18 fixture MD1, 36 profili e baseline dei campionati identici, con differenza numerica zero. Inoltre sono stati ricalcolati, a partire dagli input salvati del pilota, tutti i 46 rate di tiri/SOT dei 23 giocatori AEK: corrispondono entro 1e-9 ai valori congelati. Il test AEK ora verifica questa compatibilità effettiva invece di sostituire l’hash atteso.','',
'Il test conserva inoltre tutti i controlli precedenti su formula, contesto, soglie, esclusioni, volumi e minuti del controllo Shakhtar–AEK. Il pilota storico è un esperimento, non una prova generale di calibrazione per le 32 squadre.','',
'## Formule e qualità dei minuti','',
'Storico: rH=min(0.82, mH/(mH+900)); H=rH×rateStorico+(1−rH)×priorRuolo. Etichetta verified-history da 700 minuti, limited-history sotto tale soglia: soglie e prior invariati. Un giocatore privo di storia utilizzabile non viene promosso a previsione grazie al solo prior.','',
'Blending AEK riutilizzato: rD=min(0.35,mD/(mD+900)), wE=min(0.35,mE/(mE+900)), wD=rD×(1−wE), wH=1−wD−wE. Rate = wH×H+wD×Dcorretto+wE×E. Domestico e Champions separati; le altre competizioni europee restano diagnostiche e non entrano nel canale Champions. La correzione contestuale usa il modulo esistente ESI/PPG, regressione 0.2 e limiti 0.85–1.15, con fallback dichiarati del pilota, senza coefficienti manuali per campionato. Canali domestici senza avversario identificabile sono esclusi, non riempiti con un coefficiente inventato.','',
'**Variazione introdotta:** gate di qualità: minuti esplicitamente osservati ammessi al candidato principale; stime o esposizioni non certificate hanno peso zero in quel candidato. Non è una stima del loro errore né un nuovo coefficiente di sconto. La variante include-estimates è un limite di sensibilità con gli stessi pesi AEK, non è il motore approvato. Questa scelta conservativa evita un fattore arbitrario (per esempio 0.5) in assenza di validazione dell’errore sui minuti.','',
f"Fra le presenze ricostruibili dei giocatori analizzati: {data['summary']['observedRows']} con durata esplicitamente osservata, {data['summary']['estimatedRows']} con durata derivata o non certificata. Ciò non invalida le statistiche di tiro verificate del Pacchetto 1: limita l’uso dell’esposizione per90. Anche i minuti legacy non vengono retroattivamente dichiarati osservati solo perché precedono il Pacchetto 1.",'',
'Nessuna modifica a Poisson, formule collettive, rischio cartellini, quote, soglie dei mercati o coefficiente di riconciliazione. La riconciliazione usa il helper esistente: se il suo limite 0.72–1.35 non consente conservazione entro 0.02, oppure SOT supera tiri, l’output viene bloccato e documentato; non si aggiunge un fattore ad hoc. Il budget massimo di 990 minuti è conservato.','',
'## Confronto quantitativo','',
'Le quantità individuali qui sotto sono rate per90 diagnostici, **non conteggi previsti nella partita**. Mancano minuti previsti e ruoli di titolare/panchinaro.','',
'| Indicatore | Principale osservato-only | Sensibilità con stime |','|---|---:|---:|',
f"| Giocatori con storico valutabile | {comparison['primary']['players']} | {comparison['sensitivity']['players']} |",
f"| Rate modificati rispetto al vecchio baseline | {comparison['primary']['changedPlayers']} | {comparison['sensitivity']['changedPlayers']} |",
f"| Differenza assoluta media tiri/90 | {fmt(comparison['primary']['meanAbsoluteShotsPer90Delta'],4)} | {fmt(comparison['sensitivity']['meanAbsoluteShotsPer90Delta'],4)} |",
f"| Differenza assoluta media SOT/90 | {fmt(comparison['primary']['meanAbsoluteSOTPer90Delta'],4)} | {fmt(comparison['sensitivity']['meanAbsoluteSOTPer90Delta'],4)} |",
f"| Differenza assoluta massima tiri/90 | {fmt(comparison['primary']['maxShotsPer90Delta'],4)} | {fmt(comparison['sensitivity']['maxShotsPer90Delta'],4)} |",
f"| Differenza assoluta massima SOT/90 | {fmt(comparison['primary']['maxSOTPer90Delta'],4)} | {fmt(comparison['sensitivity']['maxSOTPer90Delta'],4)} |",'',
f"Isolando l’apporto delle sole 817 prestazioni aggiunte (confronto con/senza Pacchetto 1, stesso contesto avversario), cambiano {len(packageImpact)} rate nella sensibilità. Il ledger è usato esclusivamente per classificare questo confronto, non è sommato nuovamente alle prestazioni già incorporate.",'',
'Le statistiche correnti possono quindi incidere realmente sul candidato (verificato anche con minuti osservati sintetici), ma sui dati reali disponibili l’effetto è dimostrato solo nella variante con esposizioni non certificate. Il candidato principale non viene presentato falsamente come aggiornato nei valori: rimane uguale al vecchio baseline.','',
'Tutti i valori collettivi vecchio/candidato coincidono, per costruzione: stesso builder e stessi input, nessun collegamento individuale o arbitrale che alteri i volumi. Le 18 previsioni risultato/gol sono disponibili; tiri, SOT, corner e gialli sono disponibili su 17 gare. Sabah–Dortmund resta senza volumi dettagliati secondo il requisito collettivo esistente.','',
'## Identità, deduplicazione e integrità','',
'Mapping esplicito bod-glimt→bodo-glimt. Join individuali per provider ID esatto e univoco, poi per ID canonico esatto se non c’è conflitto di provider; nessun fallback approssimativo sul cognome. Registro e storico restano invariati. `identity-mappings.json` conserva i join squadra. I record individuali documentano ID storico/registro, metodo e blocchi.','',
'Il campione corrente è limitato ai match ID già acquisiti nelle entry individuali correnti, all’ID squadra corretto e al cutoff 19 ottobre. Non si incorporano raw ulteriori solo perché presenti sul disco. Match ed acquisizioni posteriori al cutoff sono esclusi. Nessun evento target MD3 entra nel campione.','',
'Deduplicazione su competizione+match+provider atleta; copie identiche non cambiano il risultato. A parità di statistiche i minuti osservati prevalgono sulle stime indipendentemente dall’ordine; conflitti statistici sono esclusi. Numeratore e denominatore dei rate usano le stesse presenze con minuti positivi e tiri/SOT finiti. Null non diventa zero e SOT>tiri esclude la prestazione. Nessun uso di allEvidenceTotals o somma entries+totals.','',
'Nessuna sovrapposizione storica/corrente individuata per gli eventi identificabili. Dove i totali storici non espongono match ID, la separazione è stagionale (2025/26 o anno 2025 vs corrente dal luglio 2026): non si sostiene una deduplicazione evento per evento dello storico che il suo formato non consente. Questa incompletezza limita anche una verifica indipendente della calibrazione storica.','',
'## Mercati bloccati e preview','',
'`PREVIEW.md` elenca tutte le 18 gare con 1X2, punteggio, gol attesi, tiri, SOT, corner e gialli; `preview-md03.json` contiene il dettaglio collettivo, campioni e confronti individuali. Non è una pagina pubblica e non è importato dai renderer o dal motore di produzione.','',
'Per tutte le gare restano bloccati tiri/SOT individuali specifici di partita, cartellini giocatore, gol/assist, DUO e subentranti: XI e panchine non documentati, minuti previsti e disponibilità individuale null, candidato non calibrato fuori campione. Nessuna selezione provider o probabilità individuale è prodotta. Le quote e gli identificativi esistenti sono solo riferimenti intatti.','',
'Sabah, Slavia Praha, Shakhtar Donetsk e Slovan Bratislava: nessun pronostico o diagnostica individuale generato; archivio storico conservato. Sabah: tiri/SOT dettagliati N/D. Profili e 18 designazioni arbitrali preservati; refereeAdjustment resta null in ogni output collettivo.','',
'## Test','']
lines += [f"- {t['status']} `{t['test']}`: {t['evidence']}" for t in tests]
lines += ['',
'I due fallimenti Serie A sono contratti di test preesistenti rispetto ai renderer e ai dati correnti, confermati dal confronto byte per byte con l’inizio della sessione; non sono stati corretti fuori scope. Il test del motore Serie A 4.13.0 passa, ma non si dichiara l’intera suite verde. I test di coerenza delle proiezioni individuali usano casi sintetici validi e negativi: nella preview reale la riconciliazione è NON VALUTABILE, non una falsa uguaglianza 0=volume squadra.','',
'Calibrazione: nessun actual MD3 prima del 20–21 ottobre, nessun nuovo walk-forward/calibrazione presentato. Sono verificate compatibilità strutturale e invarianza del baseline; non è dimostrato che il blending con stime mantenga o migliori la calibrazione fuori campione. Per questo resta non attivato.','',
'## File modificati e vincoli','',
'Unico file esistente modificato: `scripts/test-champions-context-adjusted-baseline.js` (riconciliazione di compatibilità). Nuovi moduli `scripts/champions/offline-collective.js`, `scripts/champions/current-season-offline.js`, builder `scripts/build-champions-md3-offline.js`, test `scripts/test-champions-md3-offline.js` e questo generatore di report. Nessun builder pubblico è stato modificato.','',
f"Verificati {len(before)} file preesistenti: dati 2025/26 e 2026/27, Pacchetti 1/2, quote, ID, Schedine, esiti, giornate precedenti, fonti e profili arbitrali, motore Serie A, renderer e CSS invariati. Il wrapper parametrizza il builder collettivo con matchday 3 e intercetta la scrittura in memoria; le uniche scritture sono artefatti nella cartella offline. La modalità --reuse-collective controlla gli hash di tutti gli input del builder prima di riusare il calcolo già verificato.",'',
'Nessun nuovo dato acquisito, nessun audit dei pacchetti o import arbitrale ripetuto. Nessuna modifica pubblica, nessun commit, push, deploy o Schedina definitiva.','',
'## Prima di generare Letture e Schedine','',
'1. Documentare XI, panchine e disponibilità MD3 e risolverne gli ID esatti; non dedurli dai dati storici.',
'2. Fornire minuti osservati verificabili oppure approvare una politica per le esposizioni stimate dopo verifica dell’errore: non basta approvare un peso arbitrario per ottenere rate non null.',
'3. Validare il candidato con snapshot pre-kickoff e actual successivi, distinguendo per ruolo/competizione e tipo di minuti. Nessuna promessa di calibrazione può essere ricavata dai soli unit test.',
'4. Quando esistono minuti previsti documentati, verificare conservazione, SOT≤tiri e budget; i casi che il helper esistente non riconcilia restano bloccati finché un’eventuale modifica non è motivata e approvata.',
'5. Prima dell’attivazione, approvare il candidato operativo e il collegamento ai builder pubblici; mantenere i divieti individuali delle quattro squadre e l’esclusione dei campioni arbitrali non certificati.','',
'La fase offline termina qui. La generazione definitiva resta subordinata all’approvazione dell’utente e alla risoluzione dei blocchi documentali.']
(BASE/'REPORT.md').write_text('\n'.join(lines)+'\n',encoding='utf-8')
newFiles=['scripts/champions/offline-collective.js','scripts/champions/current-season-offline.js','scripts/build-champions-md3-offline.js','scripts/test-champions-md3-offline.js','scripts/report-champions-md3-offline.py']
write('files-manifest.json',{'modifiedExisting':changes,'newScripts':newFiles,'offlineArtifacts':[p.relative_to(ROOT).as_posix() for p in BASE.rglob('*') if p.is_file()]})
print(json.dumps({'fixtures':18,'collectiveDetailed':17,'individualMatchForecasts':0,'primaryChanges':comparison['primary']['changedPlayers'],'sensitivityChanges':comparison['sensitivity']['changedPlayers'],'package1SensitivityChanges':len(packageImpact),'protectedFiles':len(before),'report':str(BASE/'REPORT.md')}))
