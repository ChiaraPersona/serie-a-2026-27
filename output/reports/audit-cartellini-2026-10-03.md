# Audit cartellini — stato del 3 ottobre 2026

L'archivio locale è coerente nella propagazione dei referti, ma il sistema dei cartellini presenta criticità nella classificazione delle espulsioni, nella trasformazione dei punteggi in probabilità e nella gestione dei dati mancanti. Il ranking attuale è una graduatoria euristica: non dispone di una validazione prospettica delle ammonizioni.

Audit in sola lettura delle fonti e del sistema. Sono stati creati soltanto questo rapporto, i dati di audit e le immagini di verifica. Nessuna modifica a fonti sportive, formule, schedine, snapshot o pagine del sito. Nessuna pubblicazione.

La verifica riguarda il repository locale, tutti i 50 referti Serie A disponibili e le dipendenze dei cartellini. Non equivale alla ricertificazione esterna di ogni singolo evento né al controllo della versione pubblicata online. È stato consultato il regolamento ufficiale Sisal per distinguere il conteggio dei punti dai mercati giocatore.

## Copertura e riconciliazione

| Ambito | Stato verificato |
|---|---|
| Serie A effettiva | 50 partite concluse, 10 per giornata dalla 1ª alla 5ª |
| Eventi disciplinari Serie A | 164 eventi: 162 `yellow`, 1 `redCard`, 1 `yellowRedCard` |
| Fonte → matches.json | Nessuna differenza nei cartellini e nei totali squadra dei 50 referti |
| Identità eventi | Tutti gli eventi hanno squadra, giocatore identificato, minuto e tipo; nessun duplicato esatto |
| Comparatore corrente | 454 calciatori; 164 eventi aggregati; nessuna differenza rispetto ai referti |
| Statistiche delle 20 squadre | Tutti i totali disciplinari generati riproducono quelli dei referti, comprese le classificazioni problematiche |
| Pronostici 6ª giornata | 10 partite, 50 candidati, 5 per gara, entrambe le squadre rappresentate, un possibile primo ammonito per gara |
| Formazioni 6ª giornata | Tutti i 50 candidati appartengono ai titolari della fonte Fantacalcio corrente |
| Champions | 18 partite modellate, 90 candidati; 85 con storico, 4 con storico limitato, 1 con baseline di ruolo; 40 quote associate |
| Referti cartellini Champions | Dati `cards` presenti per 9 delle 18 partite concluse |
| Coppa Italia | 43 incontri, 28 conclusi; 79 ammonizioni ed 1 rosso nei campi dedicati; eventi canonici e normalizzati uguali |

I 164 eventi individuali non vanno equiparati automaticamente alla somma dei campi squadra: un evento combinato di secondo giallo/espulsione può rappresentare più provvedimenti. Occorre prima fissare la convenzione di conteggio.

## Anomalie confermate e limiti

### 1. Secondo giallo classificato come rosso diretto — priorità alta

In Genoa–Frosinone, 4ª giornata, Johan Vásquez ha un giallo al 66' e un evento `yellowRedCard` all'86'. I totali Genoa riportano invece `secondYellowCards: 0`, `straightRedCards: 1`. Anche lo snapshot StatMuse locale contiene l'evento di secondo giallo, mentre il totale provider espone genericamente un rosso.

L'importatore imposta sempre i secondi gialli a zero e assegna tutti i `RedCards` ai rossi diretti. L'errore quindi nasce nella normalizzazione e viene propagato alle statistiche squadra. La somma dei tre campi disciplinari per l'intero campione è 165, contro 164 eventi combinati; questa differenza da sola non dimostra un evento mancante.

Riferimenti: [importatore](C:/Users/utente/Desktop/seria-a-2026-27/scripts/import-statmuse-result.js:86), [statistiche squadra](C:/Users/utente/Desktop/seria-a-2026-27/scripts/team-pages/build.js:190).

Intervento indicato: definire formalmente giallo ordinario, secondo giallo, rosso diretto e conteggio aggregato; ricavare la causa dell'espulsione dagli eventi, poi riconciliare le fonti.

### 2. Il risk score diventa una probabilità senza calibrazione — priorità alta

La Lettura mostra correttamente «Risk score comparativo, non probabilità di ammonizione». Il generatore e il builder delle schedine usano però `clamp(riskScore / 150, 0.18, 0.62)` come probabilità. Da quel numero derivano quote eque, valore atteso e qualifica della schedina. Il mercato è inoltre DUO, mentre il punteggio riguarda il solo candidato e non modella esplicitamente il suo sostituto.

Esempio pubblicato nell'archivio MD5: Poker ammoniti 1, probabilità congiunta 4,115246%, quota equa 24,3, EV +748,8%, stato «qualificata». Il secondo poker ha EV +816,6%. Sono risultati dell'euristica; non costituiscono una dimostrazione statistica di vantaggio.

Riferimenti: [generatore](C:/Users/utente/Desktop/seria-a-2026-27/scripts/generate-schedina-md02.js:302), [builder](C:/Users/utente/Desktop/seria-a-2026-27/scripts/build-schedina.js:286), [disclaimer UI](C:/Users/utente/Desktop/seria-a-2026-27/js/pages/readings.js:63).

### 3. Ranking dominato da un campione minimo — priorità alta sul piano metodologico

Alex Jiménez, Fiorentina, raggiunge il limite di 88/100 con appena 45 minuti storici e 2 cartellini/90. Il modello attenua lo storico con un fattore di affidabilità, ma conserva una forte influenza del tasso osservato. Altri candidati sotto 700 minuti: Fazzini, 574 minuti, 53/100; Njie, 290 minuti, 65/100.

Tutti i 50 candidati correnti sono etichettati `verified-history-current`, perché dispongono di falli correnti: questo stato non certifica la robustezza del campione storico dei cartellini. Non è stato stabilito un punteggio alternativo né modificata la formula.

Riferimento: [bookingCandidates](C:/Users/utente/Desktop/seria-a-2026-27/scripts/predictions/engine.js:1207).

### 4. I cartellini correnti non aggiornano il rischio individuale

L'aggregatore della stagione corrente raccoglie falli, minuti, tiri e altri dati, ma non le ammonizioni. Nel ranking `estimatedCards` resta uguale allo storico; la componente corrente aggiorna i falli. Anche i minuti attesi del modello tiratori non entrano nella formula dei cartellini.

La graduatoria non va quindi interpretata come modello completo della probabilità di essere ammonito durante il tempo effettivamente giocato.

Riferimenti: [aggregatore corrente](C:/Users/utente/Desktop/seria-a-2026-27/scripts/build-predictions.js:192), [formula individuale](C:/Users/utente/Desktop/seria-a-2026-27/scripts/predictions/engine.js:1209).

### 5. Possibile primo ammonito assegnato automaticamente

Il flag è attribuito al primo nome della graduatoria per rischio. Non esiste in questa formula un modello del minuto del primo cartellino o della competizione temporale fra i giocatori. Inoltre, i cinque nomi vengono corretti per includere entrambe le squadre: la lista finale può differire dai cinque punteggi più alti in assoluto.

Riferimento: [selezione e flag](C:/Users/utente/Desktop/seria-a-2026-27/scripts/predictions/engine.js:1274).

### 6. Nessuna designazione arbitri per la 6ª giornata nel repository

La fonte AIA locale contiene 10 designazioni per ciascuna delle giornate 1–5; la giornata 6 è assente. Tutti i 50 candidati MD6 hanno `refereeFactor: 1`. È un fallback neutro per mancanza del dato, non una misura della severità di un arbitro designato. Solo 3 dei 50 candidati hanno un duello diretto identificato.

### 7. Le stime squadra mostrano gialli storici come «cartellini previsti»

Il valore centrale deriva da `yellowCardsPerGame` del profilo squadra; l'intervallo usa una dispersione fissa di 0,85. In questo ramo non entrano i cartellini correnti, il fattore arbitro individuale o un modello esplicito dei rossi. Il nome pubblico «cartellini» copre quindi una stima costruita sui gialli, mentre il comparatore individuale aggrega anche gli eventi rossi.

Il builder delle schedine usa inoltre questi valori centrali come lambda Poisson per i punti cartellini. La corrispondenza tra target del modello e target del mercato va documentata e validata.

Riferimenti: [baseline](C:/Users/utente/Desktop/seria-a-2026-27/scripts/predictions/engine.js:1351), [intervallo](C:/Users/utente/Desktop/seria-a-2026-27/scripts/predictions/engine.js:1495), [punti nelle schedine](C:/Users/utente/Desktop/seria-a-2026-27/scripts/build-schedina.js:399).

### 8. Dati mancanti liquidati come risultati negativi o positivi — priorità alta

Tre riproduzioni su copie in memoria di una partita conclusa, con cartellini dichiarati indisponibili:

| Caso | Risultato del codice | Risultato che rispetta la mancanza del dato |
|---|---|---|
| Cartellino giocatore SI, campo bookings assente | Persa | Da verificare |
| Cartellino giocatore NO, campo bookings assente | Vinta | Da verificare |
| Under punti cartellini, bookings vuoto e coverage unavailable | Vinta | Da verificare |

Il ramo giocatore con partecipazione disponibile non verifica la copertura dei cartellini. Il ramo punti controlla solo che esista un array. La classificazione usa quindi la mancanza di eventi come zero.

Riferimenti: [giocatore](C:/Users/utente/Desktop/seria-a-2026-27/js/pages/betting-settlement.mjs:243), [punti](C:/Users/utente/Desktop/seria-a-2026-27/js/pages/betting-settlement.mjs:286). Riproduzioni conservate nel file di audit della liquidazione. Non sono state cambiate le liquidazioni reali archiviate.

### 9. Punti cartellini: filtraggio degli eventi incompleto

Il regolamento Sisal consultato attribuisce un punto al giallo e uno al rosso, con massimo due per giocatore; distingue i provvedimenti validi dai cartellini in panchina o dopo la fine. Il codice del mercato standard usa soltanto `bookings.length`, senza filtrare partecipazione, periodo o contesto del provvedimento.

Nel campione locale esiste un caso reale da considerare: Stefano Sabelli, Genoa–Napoli MD1, ammonito all'85' ma inserito fra i non impiegati. Un cartellino dalla panchina è plausibile e non è stato cancellato: va separato dagli eventi validi per il mercato specifico. Non dimostra che una schedina già liquidata sia errata.

Fonte esterna: [regolamento ufficiale Sisal, pagine PDF 427–428](https://www.sisal.it/content/dam/new-dam/italy/canali/sisal-it/doc-pdf/scommesse/info-scommesse/calcio.pdf).

### 10. Gestione della copertura parziale negli aggregati

`standingsCardTotal` somma i campi disponibili quando almeno uno è noto, trattando gli altri come zero. Riproduzione: gialli 1, secondo giallo null e rosso null producono totale 1. Il comparatore corrente, invece, non tiene un contatore di copertura specifico per i cartellini e inizializza il totale a zero.

I 50 referti attuali hanno eventi dichiarati completi: il problema è una vulnerabilità della pipeline quando arriveranno dati parziali, non una differenza osservata fra i 454 giocatori correnti.

Riferimenti: [classifica](C:/Users/utente/Desktop/seria-a-2026-27/scripts/standings.js:4), [comparatore](C:/Users/utente/Desktop/seria-a-2026-27/scripts/team-pages/build.js:407).

### 11. Profili arbitri: denominatore e ricostruibilità

Il profilo per le Letture dichiara una media di 3,75 gialli su 760 partite Serie A+B 2025/26. Il numeratore contiene però soltanto le 720 partite con arbitro identificato: 2.853 gialli. Sullo stesso campione attribuibile la media è 3,9625. Il denominatore abbassa quindi il riferimento descrittivo di circa il 5,3%.

Questo difetto riguarda il confronto descrittivo delle Letture. Il fattore arbitro del motore usa un altro aggregato, solo Serie A, con un proprio denominatore: non va automaticamente attribuito anche a quel calcolo.

Nei profili descrittivi ci sono inoltre 2.900 eventi gialli contro 2.853 gialli nei totali: 31 dei 42 arbitri presentano differenze. Possono contribuire coperture o perimetri diversi degli eventi; la causa non è stata certificata e non va corretta imponendo un'uguaglianza artificiale.

Riferimento: [builder profili Letture](C:/Users/utente/Desktop/seria-a-2026-27/scripts/build-reading-referee-profiles.js:14).

| Stagione / torneo | Partite normalizzate | Arbitri mancanti | Snapshot grezzi presenti |
|---|---:|---:|---:|
| 2023/24 Serie A | 380 | 0 | 0 |
| 2023/24 Serie B | 380 | 0 | 0 |
| 2024/25 Serie A | 380 | 0 | 0 |
| 2024/25 Serie B | 380 | 0 | 0 |
| 2025/26 Serie A | 380 | 40 | 10 JSON non compressi |
| 2025/26 Serie B | 380 | 0 | 10 JSON non compressi |

In Serie B 2023/24 il campo gialli è mancante in tutti i 760 record squadra: non sono zero. Nessuno dei raw `.json.gz` attesi dai validatori e dal builder degli eventi arbitrali è presente. Ricostruire ora le tendenze con quel builder perderebbe gli eventi conservati nell'output esistente.

### 12. Archivio ed evaluation non coprono completamente i cartellini

`predictions.json` contiene 49 partite: MD1 10, MD2 10, MD4 9, MD5 10, MD6 10. Sono assenti tutte le 10 letture previsionali MD3 e Venezia–Fiorentina MD4, pur essendo presenti i relativi referti. Queste assenze limitano la verifica retrospettiva del ranking storico e della sua visualizzazione.

Gli snapshot prospettici MD6 esistenti sono 10, tutti ancora pending nel rapporto di evaluation. Non contengono la graduatoria `likelyBooked`, i `riskScore` o il flag primo ammonito. Le metriche di evaluation pubblicate riguardano sei mercati di tiri/SOT, non le ammonizioni. Il gate di modifica modello rimane chiuso.

Per misurare i cartellini servirebbe una futura estensione degli snapshot e degli actuals, con target distinti per giallo, qualsiasi cartellino, primo ammonito e DUO. Gli snapshot già registrati devono restare immutabili.

### 13. Identità e contratti dei candidati incompleti

I 50 candidati Serie A correnti non serializzano `playerId`; il collegamento dei mercati viene effettuato per nome. I nomi della formazione e quelli canonici possono differire: l'assenza dell'ID rende fragile la riconciliazione fra graduatoria, quota e actual. L'audit ha ricondotto tutti i candidati ai titolari correnti, senza inventare identità. Lo schema di `likelyBooked` impone cinque elementi, ma non descrive i campi interni di ciascun candidato.

Riferimenti: [output candidato](C:/Users/utente/Desktop/seria-a-2026-27/scripts/predictions/engine.js:1238), [schema](C:/Users/utente/Desktop/seria-a-2026-27/data/schemas/prediction.schema.json:22).

### Differenze fra competizioni

La graduatoria Champions contiene gli ID, ma usa una formula più semplice: ruolo, frequenze storiche, affidabilità dei minuti e termine fisso. Non incorpora i correttivi Serie A per arbitro, duello diretto e disciplina corrente. La descrizione «stesso impianto Serie A» indica quindi la struttura generale, non la stessa formula completa. Le MyCombo Champions escludono esplicitamente i cartellini; l'audit non ha individuato cartellini nelle combinazioni generate.

Riferimento: [buildBooked Champions](C:/Users/utente/Desktop/seria-a-2026-27/scripts/build-champions-player-markets.js:189).

## Stato dei primi candidati MD6

| Partita | Primo nome attuale | Risk score |
|---|---|---:|
| Atalanta–Venezia | Juan Jesus | 73/100 |
| Cagliari–Juventus | Bremer | 61/100 |
| Como–Roma | Hermoso | 64/100 |
| Genoa–Fiorentina | Jimenez A. | 88/100 |
| Inter–Parma | Troilo | 66/100 |
| Lazio–Monza | Tavares N. | 59/100 |
| Lecce–Bologna | Ferguson | 70/100 |
| Napoli–Frosinone | Bracaglia | 70/100 |
| Sassuolo–Milan | Estupinan | 74/100 |
| Torino–Udinese | Casadei | 65/100 |

La tabella descrive l'output del sistema, non raccomanda selezioni e non assegna probabilità ai punteggi. Tutti i 50 candidati e le stime delle 20 squadre sono nel rapporto JSON.

## Verifiche eseguite

17 test mirati superati: identità giocatori, copertura individuale, refresh StatMuse MD1–5, validazione dati, aggregazioni arbitri, profili arbitro-squadra, predictions, Lettura V2, mercati e risultati Champions, Schedina MD1–5, risultati MD5 e gestione dei non impiegati MD2.

28 controlli browser in Edge a 1280 e 390 pixel: tutte le 10 Letture MD6, tre referti rilevanti e la Schedina MD5. Nessun errore JavaScript o overflow. Tutti i candidati MD6 visualizzati coincidono con quelli serializzati. Il secondo giallo/rosso di Vásquez appare come espulsione nel referto.

Il validatore storico 2023/24 fallisce con `ENOENT` su `data/raw/referee-stats/espn/2023-24/serie-a/679226.json.gz`. La suite completa non è certificata. I test mirati superati non coprono i difetti riprodotti sopra.

Le quattro schedine poker archiviate riportano, secondo la liquidazione corrente: MD4 primo poker 2 vinte, 1 persa, 1 annullata; MD4 secondo poker 4 perse; MD5 primo poker 2 vinte e 2 perse; MD5 secondo poker 2 vinte, 1 persa, 1 annullata. Sono 16 selezioni, un campione insufficiente per calibrare il modello.

## Ordine degli interventi indicato dall'audit

1. Formalizzare target e convenzioni dei cartellini; distinguere cause delle espulsioni e contesti dei provvedimenti.
2. Riparare normalizzazione, controlli di copertura e liquidazione dei dati mancanti, con verifiche dedicate.
3. Rendere espliciti campione, fallback e origine delle stime nella diagnostica; verificare la conversione score/probabilità/EV.
4. Recuperare la ricostruibilità dei dataset storici e chiarire gli archivi previsionali mancanti.
5. Raccogliere futuri snapshot immutabili e actuals specifici dei cartellini prima di valutare modifiche statistiche.

Nessuna modifica del modello proposta come già validata: **NO MODEL CHANGE YET — COLLECT MORE DATA**.

## Allegati

- [Dati dell'audit e SHA-256 delle fonti principali](C:/Users/utente/Desktop/seria-a-2026-27/output/reports/audit-cartellini-2026-10-03.json)
- [Verifica browser](C:/Users/utente/Desktop/seria-a-2026-27/output/reports/audit-cartellini-browser-2026-10-03.json)
- [Riproduzioni liquidazione con cartellini indisponibili](C:/Users/utente/Desktop/seria-a-2026-27/output/reports/audit-cartellini-settlement-2026-10-03.json)
- [Immagine desktop](C:/Users/utente/Desktop/seria-a-2026-27/output/reports/audit-cartellini-md06-1280.png)
- [Immagine mobile](C:/Users/utente/Desktop/seria-a-2026-27/output/reports/audit-cartellini-md06-390.png)
