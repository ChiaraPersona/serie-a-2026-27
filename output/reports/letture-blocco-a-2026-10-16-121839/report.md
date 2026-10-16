# Blocco A — Baseline tecnica delle Letture

Data: 16 ottobre 2026. Repository: `C:\Users\utente\Desktop\seria-a-2026-27`.

**Verdetto: BLOCCO B NON PRONTO.** La verifica finale ha rilevato scritture concorrenti rispetto all'acquisizione iniziale: **38 file protetti modificati e un nuovo raw Sisal**. I comandi di questo audit non hanno scritto tali percorsi; l'origine delle scritture non è stata accertata. I manifest e gli esiti iniziali sono conservati senza aggiornarli per far coincidere la baseline con il nuovo stato. Non viene eseguito alcun ripristino del lavoro concorrente.

## 1. Perimetro e stato Git

Stato iniziale acquisito prima di creare la directory di audit:

- Branch: `main`.
- HEAD: `063bdc8f2d5f43d7d29d757b09a0c9ab308f27c4`.
- `git status --porcelain=v1 --untracked-files=all`: vuoto.
- Diff non staged e staged: vuoti.
- Nessun lavoro preesistente da distinguere o recuperare; nessun file preesistente sovrascritto.
- Evidenza: [git-initial.json](git-initial.json), timestamp UTC e riferimento Git inclusi.

Stato alla prima chiusura: stesso branch e HEAD, ma **38 modifiche tracciate**, oltre al nuovo raw Sisal e agli artefatti di questo audit. Evidenza completa, un percorso per riga: [git-final.json](git-final.json). Una lettura Git successiva ha già rilevato 39 modifiche tracciate, fra cui anche `output/reports/serie-a-md07-1440.png`: il repository stava ancora cambiando. [git-close.json](git-close.json) registra lo stato Git all'ultima chiusura documentale, con timestamp; non viene presentato come stato immutabile di un processo concorrente. Il file intermedio `git-after-checks.json` fotografa il punto successivo ai test e precedente al completamento dei report.

**Ultima chiusura Git, 12:29:46 UTC:** branch `main`, HEAD **`7d9ac6e08bd0c85843efe688700a01625a26059a`**, diverso da quello iniziale. Anche la maggior parte dei nuovi artefatti di questo audit risulta ormai tracciata: un'operazione concorrente ha aggiornato la storia Git durante il lavoro. Questo audit non ha impartito comandi di commit. Lo stato residuo registrato è esattamente:

```text
 M output/reports/letture-blocco-a-2026-10-16-121839/report.md
?? output/reports/letture-blocco-a-2026-10-16-121839/git-close.json
```

La modifica al report è la correzione del verdetto per documentare l'esito negativo, successiva alla prima stesura. Nessuna modifica staged. Il fatto che gli altri cambiamenti siano entrati in un nuovo HEAD non li riconcilia con la baseline iniziale: restano necessarie una finestra stabile e una nuova acquisizione autorizzata, senza riscrivere i manifest qui conservati.

Da questo audit non sono stati eseguiti build, importatori, rigenerazioni dati, commit, push o deploy. Le sue scritture sono limitate ai **20 file** di questa nuova directory, elencati nella sezione 10. Non sono stati modificati da questi comandi HTML, CSS, JavaScript applicativo, specifica approvata, dataset, motori o aspettative dei test. Il confronto non consente invece di dichiarare invariato il repository condiviso. I tre script creati in questa directory sono strumenti di acquisizione dell'audit, non codice applicativo.

## 2. Manifest e integrità

### Copertura

- [protected-manifest.json](protected-manifest.json): **13.219 file**, SHA-256 dei byte originali, percorso e dimensione. Acquisito prima dei test.
- Include tutti i file tracciati/non ignorati fuori da `output/`, l'intero albero `data/` anche per i file ignorati da Git e **140 report preesistenti**. Protegge quindi anche fonti, raw, dati generati, normalizzati, pronostici, quote, snapshot, motori, contratti, store, policy, HTML, CSS e specifica.
- [output-data-manifest.json](output-data-manifest.json): ulteriori **63 file JSON/JSONL**, anche compressi, sotto `output/` fuori dai report, inclusi dati/snapshot di lavorazione. Questa estensione è acquisita **dopo i test in sola lettura**: è baseline per il futuro, non prova retroattiva dello stato precedente ai test. Il manifest principale costituisce la prova pre/post test.
- Totale protetto al termine: **13.282 file**. Le categorie del manifest sono classificazioni orientative, non gruppi disgiunti per significato statistico: per esempio uno snapshot può essere classificato come dato sorgente senza cessare di essere protetto.
- Esclusi: nuova directory dell'audit, altri artefatti `output/` non dati/report (per esempio immagini), dipendenze/runtime ignorati fuori da `data/` e metadati interni `.git`.

Risultato del primo confronto dopo i test: **zero file modificati, aggiunti o rimossi**, secondo [integrity-final.json](integrity-final.json), terminato alle 12:22:09 UTC. Risultato della successiva verifica, terminata alle **12:27:26 UTC**: **38 file protetti modificati, 1 aggiunto, 0 rimossi**, secondo [final-verification.json](final-verification.json). Questa seconda verifica **fallisce** il requisito di stabilità del Blocco A. Le liste sono confrontate oltre agli hash, per rilevare aggiunte e cancellazioni.

L'acquisizione e il ricalcolo degli hash sono scansioni sequenziali, non snapshot atomici del filesystem. In presenza di scritture concorrenti non è possibile certificare che tutti i valori appartengano a un unico istante: né il primo confronto positivo né i test passati autorizzano a ignorare il successivo esito negativo. Serve una nuova acquisizione, in una nuova directory e durante una finestra stabile, prima di B. Gli hash riportati sotto restano quelli iniziali, non hash sostitutivi dei file cambiati.

Fra i cambiamenti rilevati: quote Sisal, `predictions.json`, `schedina-md07.json`, probabili e disponibilità MD7, schede squadra, script MD7 e il report preesistente `serie-a-md07-final-audit.json`, che questo audit aveva esplicitamente escluso dalle scritture. Nuovo file rilevato: `data/raw/odds/sisal/serie-a/2026-10-16T12-21-18-724Z.json.gz`. L'elenco completo è conservato nella verifica, senza attribuire un autore o un comando non osservato.

### Hash di riferimento principali

L'elenco completo, senza abbreviazioni, è nei due manifest. Estratto dei file più sensibili:

| File | SHA-256 |
|---|---|
| `scripts/predictions/engine.js` | `0624055a540789c0ac6648333682ff6352c183aa66c920023d0c86c248ff0e3a` |
| `scripts/predictions/decision-layer.js` | `f4fd8cc519247778464770d590629efdc990630e60dc1e4f9abe74ea8160bd22` |
| `scripts/build-champions-1x2.js` | `14862aba1553ab311ac0a9c634acdb748e38950d6ea5c32be2b4e48fe9dfde83` |
| `scripts/build-champions-pilot-predictions.js` | `33f125092367f1d518d67bece8a55cc6b253e34cb9f114cb4233c80e79341cd7` |
| `scripts/betting-selection-contract.js` | `90151fdce326444b6a0c7b4874914d12e7779eb9e82e8b3fdf9915a85d765d96` |
| `js/pages/personal-betslip-store.mjs` | `fb5682d0562dd1e5b63b730b235e9e0d93e43b0e6d5832359e1aeb078a64d7ec` |
| `js/pages/shared-forecast-contract.mjs` | `9db89f1a5e55ee010636e3ca64895968d5122518dac1d05809f0d08ec7b6521a` |
| `data/normalized/official-starter-registry.json` | `a538699da69fb4652b1e87cba2ad7cfcec265bbcc42fb323b7ca4d54e8cff060` |
| `data/normalized/predictions.json` | `8abe39abac9c6de96e183e324664b13463d7384cc153d145c85780227cbd1b71` |
| `data/normalized/schedina-md07.json` | `293d8ea8ba79fb78a32ce24dca670ffe99269ad25f32b47277596442ddc573cb` |
| `data/normalized/schedina-champions-md02.json` | `b80378b653120749f54c6d4c235769ea3925ca13ac0eba03a09d648143dcf683` |
| `docs/specifica-ux-letture-unificate-fase-2.md` | `2a3ced7655f1e225a735f739c7c0560b48c9631afeaf6fd17961d4a8744fd44a` |

Questo audit non ha ricalcolato o sostituito gli hash attesi dei test e degli snapshot esistenti. Uno dei test esclusi, `test-schedina-md07.mjs`, risulta modificato dalla scrittura concorrente: le ragioni di esclusione e l'ispezione nel presente report descrivono la versione osservata inizialmente.

## 3. Metodo e forza delle evidenze

1. Lettura dei renderer, dei punti di chiamata, dei gate di pubblicazione, del servizio dati, della policy e dello store.
2. Acquisizione dei record pubblicati usando le funzioni esistenti e il registro corrente, con conservazione dei record completi.
3. Esecuzione dei sei test approvati dopo ispezione delle dipendenze locali e dei possibili effetti collaterali.
4. Tre controlli aggiuntivi in memoria; nessun salvataggio nella localStorage reale.
5. Invocazione dei renderer reali con DOM inerte, loader locali e filtro ufficiale equivalente a quello del data service. Tre fixture campione più un caso Champions MD1 per non confondere MD1 e MD2.
6. Confronto finale di byte e inventario dei file.

[rendered-inventory.json](rendered-inventory.json) conserva markup iniziale, payload delle sostituzioni/inserimenti, titoli, attributi delle sezioni e ID pubblicati. La sequenza dei payload non è l'ordine DOM definitivo: per esempio il pannello formazioni sostituisce il contenuto «Sistemi di riferimento». Il DOM inerte non esegue layout, selettori completi, click o listener reali; le interazioni sono valutate attraverso lettura del controller e test dello store. Non costituisce verifica visuale, responsive o accessibilità browser.

La classificazione dei rami combina markup osservato e raggiungibilità nel codice. Non deduce l'assenza generale di una funzione dalla sua assenza in una sola partita. Riferimenti con numeri di riga: [source-evidence.json](source-evidence.json).

## 4. Inventario funzionale Serie A

Legenda: **attivo** = chiamato dal dettaglio corrente; **condizionale** = chiamato solo con dati/stato specifici; **definito non montato** = presente nel modulo, senza punto di chiamata nel render corrente.

| Sezione / funzione | Stato e condizione | Contenuti da preservare |
|---|---|---|
| `readingPrototypeDetail` e ritorno all'elenco | Attivo con match Serie A trovato | Identità, data, stadio, giornata, stemmi, VS/risultato |
| Sintesi hero | Attivo; valori con fallback N/D | Tre risultati, principale/alternative, copertura quando disponibile, sorpresa, confidenza, stato formazione |
| `readingPostMatchReport` | Condizionale: `finished` e risultato | Marcatori, assist disponibili, autogol, cartellini/tipi, sostituzioni, intervallo, statistiche squadra/giocatore, MVP e fonti |
| Banner archivio | Condizionale: gara conclusa | Separazione fra dato reale e analisi disponibile; non prova da solo l'anteriorità della previsione |
| Numeri V2 | Attivo | Gol attesi, tiri, SOT, corner, intervalli, canali d'attacco se disponibili |
| Spiegazione V2 | Attivo | Interazione offensiva/avversaria, segnali tiri e SOT distinti, stabilità del segnale |
| `renderSharedForecasts` | Attivo, anche con stato vuoto | Catalogo della giornata, selezioni, soglia, motivazione, quota; probabilità/EV nel layout esteso previsto dal contratto |
| Tiratori V2 | Attivo, stati N/D interni | Tabella e card responsive, minuti, ruolo, allocazione, sostituzione, proiezioni e soglie |
| Outsider V2 | Attivo | Detector tiri e SOT distinti, nessun qualificato distinto da dato assente |
| Disciplina V2 | Attivo | Falli/gialli squadra, cinque candidati quando presenti, rank, score, duello e fonte fattore arbitrale |
| Squadra arbitrale | Attivo, fallback assenza designazione | Arbitro, assistenti, IV, VAR/AVAR, medie storiche, fonte e metodo |
| `renderProbableLineups` | Attivo dopo il markup | Sostituisce «Sistemi di riferimento» con ufficiali/probabili/riferimento per fixture; campo, coach e fonti |
| `renderTacticalBaselines` | Condizionale: profili presenti | Baseline, qualità/campione, punti di forza, vulnerabilità, stile, note e tratti correnti |
| `headToHeadPanel` | Attivo, fallback N/D | Precedenti, eventi, campione, fonti, confronto e dati storico/modello |
| `renderReadingPilotEvidence` | Condizionale: `sections.form.content` | Evidenze e fonti pilota; non va generalizzato il testo storico specifico del pilot |
| Selezione diretta e stato `aria-pressed` | Condizionale: **MD7** e righe canoniche interattive | Click/tastiera, toggle, reconcile e collegamento con lo store personale |
| Errore fixture / indice e archivio | Rami attivi alternativi | Errore esplicito, index, prossima giornata e archivio; fuori dal futuro restyling del dettaglio |
| `readingDetail`, `readingModules`, `readingField` | Definiti non montati dal render corrente | Vecchio renderer dei sette moduli; moduli sorgente ancora presenti, non sette sezioni attuali della UI |
| Helper `dataPanel`, `unavailable`, `duplicatePanels` nel prototype | Definiti non montati nel return corrente | Non interpretare come pannelli oggi visibili |
| Tabelle/ranking arbitri e pilot (`refereeStatsTable`, `refereeRankings`, `pilotRefereeTable`, `pilotTeamTable`, `pilotSection`) | Definiti non montati dal render corrente di `readings.js` | Non attivarli implicitamente nel Blocco B |

Il loader corrente limita `selectedMatch` a `competition === 'serie-a'`. Esistono controlli/helper Coppa all'interno delle funzioni, ma ciò non rende la Coppa un dettaglio raggiungibile da questo stesso entry point: i futuri adattatori devono preservare i confini effettivi senza dedurre nuove route dai soli helper.

## 5. Inventario funzionale Champions

| Sezione / funzione | Stato e condizione | Contenuti da preservare |
|---|---|---|
| `pilotReadingDetail` | Attivo con fixture nel pilot della giornata | Testata, data, giornata, stemmi, tre risultati, confidenza, qualità e surprise quando disponibile |
| `refereeReadingPanel` | Condizionale: designazione assegnata | Identità/nazionalità, campioni storici, Over, ultime dieci e relativo profilo quando disponibili |
| Scenario e confronto squadra | Attivi con proiezioni | Volumi combinati e per squadra, gol, range, barre e metodo; normalizzazione multi-campionato distinta da V2 Serie A |
| `matchReport` | Condizionale: conclusa con report | Risultato, marcatori, statistiche disponibili, ammoniti e avvertenze sulle evidenze mancanti |
| Motivazione | Condizionale: entry della fixture | Indicatori e metodo; MD1 non deve essere riutilizzata per colmare MD2 |
| Pronostici selezionati MD2 | Attivo se selezioni pubblicate | Stessi record Schedina per fixture, quota/probabilità/EV, outsider, review, evidenze, limitazioni, modificatori ed esiti |
| Aggiunta pubblicati a MyCombo MD2 | Montaggio controller attivo; pulsanti disabilitati su conclusa | Contesto Champions MD2, IDs originali, contratti, filtro titolari e store |
| Tiratori/ammoniti/combinazioni MD1 | Condizionali su `playerMarketEntry` | Proiezioni, quote come riferimento quando applicabile, rischio, combinazioni e motivi N/D |
| Pannelli individuali MD1 in MD2 | Non montati per costruzione del ramo | Con `md2MarketEntry`, `playerMarketEntry` e dataset MD1 sono passati come null; non è una lacuna da riempire automaticamente |
| `probableFormationCard` | Attivo | Stato ufficiale/probabile, coach, undici, modulo, panchina se disponibile, confidenza, incertezza, note, data/fonte; fallback modulo o undici assenti |
| `tacticalAnalysisPanel` | Condizionale: baseline/canali disponibili | Confronto storico, fallback statistico, campione, forza/debolezza/stile, fasce d'attacco |
| H2H UEFA | Condizionale: precedenti presenti | Disclosure, limite e numero incontri, eventi e fonti; assente sul campione Inter–Club Brugge |
| `motivationOnlyDetail` | Ramo condizionale alternativo | Fixture calendario senza pilot ma con motivazione: lettura parziale, formazioni e contesto |
| Directory/calendario, `roundTable`, filtri, giornate concluse | Ramo attivo alternativo fuori dettaglio | Da non alterare |
| Pagina squadra e relativi controlli | Ramo attivo alternativo `?team=` | Da non alterare; esercitato anche dal test pagina esistente |
| Overview motivazione | Ramo attivo alternativo sul percorso dedicato | Da non alterare |
| Catalogo esplorabile e minislip del modulo `champions-market-ui.mjs` | Definiti ma **non montati nel dettaglio corrente** | Il renderer non genera `data-champions-market-root`; ricerca catalogo, solo quote, paginazione 100 e minislip non diventano funzioni pubbliche nuove |
| `strengthDirectory`, `modelAudit`, `historyDirectory`, `registeredSquadsDirectory` | Definiti non montati nell'output corrente del modulo | Non confondere con scheda squadra e branding effettivamente attivi |

`mountChampionsMarketUi` supporta sia un catalogo completo sia il solo `data-champions-published-root`: oggi il dettaglio usa il secondo. I test che costruiscono contratti del catalogo validano la semantica, ma non dimostrano che il catalogo sia visibile.

## 6. Registro dei mercati e campioni

**Validità temporale:** i valori di questa sezione descrivono l'acquisizione effettuata durante l'audit. La successiva modifica di quote e dati MD7 li rende una baseline storica di confronto, non una descrizione certificata del nuovo stato finale. Non sono stati rigenerati per nascondere la divergenza.

[published-markets.json](published-markets.json) contiene i **record originali completi** delle selezioni pubblicate, non una tabella impoverita: `selectionId`, provider event/market/selection/player IDs, identità canoniche, quote e metadati, probabilità, fair odds, EV, soglie, direzione, periodo, modificatori, semantiche bookmaker, stato operativo, evidenze e settlement, quando presenti.

- Serie A: uso di `sharedForecastsForMatch` con registro ufficiale configurato. Il file registra MD6 e MD7, dove esiste il catalogo, e il criterio applicato.
- Champions MD2: filtro dati condiviso e `fixtures[].selections`, stesso percorso della Lettura corrente.
- MD1 Champions ha struttura e pannelli differenti: il dataset filtrato Schedina è conservato intero; `reading-inputs.json` conserva il dataset dei mercati giocatore MD1. Non viene dichiarata un'uguaglianza inesistente con MD2.
- [legacy-and-sample-records.json](legacy-and-sample-records.json) conserva sette strutture Schedina legacy/Champions senza appiattirle artificialmente, più record dei campioni e metadati snapshot.
- Null espliciti conservati come `null`; proprietà assenti non introdotte. Nessuna quota/probabilità/EV è stata inventata o sostituita con zero.

| Campione | Stato | Pubblicati | Quote assenti | Probabilità contratto null | EV contratto null | Contratti con sostituto/DUO nel campione |
|---|---|---:|---:|---:|---:|---:|
| Atalanta–Venezia MD6 | Conclusa | 15 | 0 | 8 | 8 | 8 |
| Inter–Club Brugge MD2 | Conclusa | 7 | 0 | 5 | 5 | 5 |
| Milan–Atalanta MD7 | Programmata | 21 | 15 | 0 | 15 | 0 |

Per la MD7 completa: **187 pubblicati, 117 con quota verificata nello snapshot, 70 senza quota**. Tutti aggiunti e rimossi da uno store esclusivamente in memoria, controllando identità provider e quota o contratto canonico senza quota. Nessun duplicato fra gli ID pubblicati.

Sul campione Milan–Atalanta, una selezione senza quota è stata salvata/ripristinata in memoria insieme a una quotata; totale teorico e totale utilizzabile restano null, senza prodotto parziale. La selezione quotata usata per il controllo misto appartiene a un'altra fixture MD7, come dichiarato nell'evidenza: è un test di contesto giornata, non una prova di combinabilità della singola partita.

La tabella non certifica liquidazioni provider. Gli esiti statistici e le conferme utente restano attribuiti, con `officiallySettled: false` quando dichiarato. Le conferme previste e la riconciliazione archivio originale/filtrato sono passate nel test ufficiale.

## 7. Titolari, contesti e vincoli temporali

### Policy titolari

- Fonte operativa corrente: `data/normalized/official-starter-registry.json`.
- Il data service carica/configura il registro e filtra ricorsivamente i dataset normalizzati. Directory squadre e generated hanno percorsi di caricamento distinti; non presumere che siano tutti filtrati dalla stessa chiamata.
- La policy individua i mercati individuali attraverso scope, soggetto e identità; verifica ID canonico, con fallback al nome normalizzato esatto già previsto. Non è un abbinamento approssimativo e non deve diventarlo nei nuovi adattatori.
- Senza record ufficiale della fixture non si applica il filtro definitivo, salvo esplicito stato bench/nonstarter del record. Mercati squadra restano distinti.
- Atalanta–Venezia e Inter–Club Brugge hanno record nel registro; Milan–Atalanta MD7 non lo ha: le probabili non vanno promosse a ufficiali.
- Tutte le selezioni pubblicate catturate superano la policy corrente.
- Il test ufficiale verifica esclusi assenti dall'operativo, archivio, originali e modificatori invariati, fonte ufficiale Champions rispetto al registro, purga dei salvati e rifiuto dell'aggiunta diretta.
- Non è stato chiamato `buildRegistry()` né lo script di applicazione della policy: entrambi scrivono dati e sono estranei al Blocco A.

### Schedina personale

Chiave reale: `serie-a-2026-27:personal-betslip:v1`.

| Contesto passato allo store | Chiave ottenuta |
|---|---|
| Serie A 2026/27 MD7 | `serie-a:2026-27:md07` |
| Champions 2026/27 MD2 (`competition: champions`) | `champions:2026-27:md02` |
| Alias testuale `competition: champions-league` | `champions-league:2026-27:md02` |

Gli ultimi due contesti **non sono alias equivalenti** per `contextKey`. Il Blocco B deve preservare quelli realmente passati dai controller, senza introdurre una normalizzazione nuova.

- Interazione diretta Lettura Serie A: `requestedMatchday === 7`; righe canoniche ammesse con contesto MD7 e toggle.
- `isCanonicalModelForecast`: gate esplicito su fixture `-md-07`, scope player/team, tiri/SOT, OVER, periodo regolamentare, non DUO e stato giocabile.
- Champions market UI: contesto MD2 esplicito; il ramo non è una generalizzazione a tutte le giornate.
- Store dalla giornata 6: esclusione Under, falli individuali e corner per tempi/finestre secondo le regole attuali, applicate dal codice senza nuova limitazione per competizione nel relativo controllo.
- `reconcile` conserva i record mancanti con `MISSING_FROM_CURRENT_DATA`, aggiorna quote secondo timestamp e mantiene aggiunta/precedente; purga i non titolari. Non sostituirlo con un filtro visivo.
- Compatibilità logica e combinabilità commerciale sono distinte; nessuna nuova probabilità combinata.

## 8. Test eseguiti ed esclusi

Tutti eseguiti direttamente con `node --no-warnings <file>`, senza alias npm e senza rigenerazione. [test-safety-audit.json](test-safety-audit.json) registra dipendenze locali e righe relative a scritture/processi/storage; [test-results.json](test-results.json) conserva exit code, durata, stdout e stderr.

| Test | Esito | Copertura |
|---|---|---|
| `scripts/test-forecast-sync.js` | PASS, exit 0 | Merge in memoria, ID condivisi, idempotenza, quote, ritiri espliciti e hash storici |
| `scripts/test-personal-betslip.mjs` | PASS, exit 0 | Contesti, deduplica, compatibilità, quote, persistenza simulata e errori storage |
| `scripts/test-reading-prediction-v2.mjs` | PASS, exit 0 | 24 contratti UI/data, ufficiali/probabili, null, valori e semantiche V2 |
| `scripts/test-champions-reading-page.mjs` | PASS, exit 0 | Rami lettura MD1, precedenti, formazioni e pagina squadra con DOM simulato |
| `scripts/test-official-starter-policy.cjs` | PASS, exit 0 | Policy, ambito, identità, modificatori, conferme, archivio, confronto originali/operativi, stale purge e rifiuto diretto |
| `scripts/test-champions-md02-market-ui.mjs` | PASS, exit 0 | Cinque contratti (DUO, pali/traverse e periodi), quote, IDs e modificatori persistiti in memoria |

Controlli aggiuntivi del solo harness: **3/3 PASS** (ammissibilità pubblicati, contratti/quote/store MD7, persistenza senza quota e totale incompleto). Rendering inerte dei quattro dettagli: **4/4 PASS**. Stato e output completi in `sample-checks.json` e `rendered-inventory.json`.

### Esclusioni motivate

- `test-schedina-md07.mjs`: scrive `output/reports/serie-a-md07-final-audit.json`. Non eseguito per evitare sovrascritture e rispettare la richiesta di test senza effetti collaterali. Le verifiche pertinenti su pubblicati, quote, ID, null e store sono state eseguite separatamente in memoria. Non si dichiara passata l'intera suite MD7 originale.
- `test-betting-selection-contract.js`: importa `betting-selection-contract.js`, che chiama `buildRegistry()` all'inizializzazione; questa funzione scrive il registro normalizzato. Non eseguito. È una criticità da conoscere anche per il Blocco B: evitare di importare quel modulo per un adattatore di sola lettura.
- Build/npm test aggregati, script browser, importatori e audit che scrivono dati: non eseguiti. Nessuna aspettativa aggiornata per far passare i test.

L'audit statico non è una prova generale di purezza: il primo confronto non ha rilevato variazioni, ma quello finale rileva modifiche concorrenti e impedisce di certificare la stabilità del repository. I test passati non vengono estesi al nuovo stato. Il test sync confronta gli ID attraverso la stessa funzione condivisa; da solo non prova tutti i click tra due pagine browser. I test DOM possono usare loader raw, mentre l'harness dei campioni applica anche il filtro dati della produzione: conservare la distinzione nei test futuri.

## 9. Rischi aperti e controlli obbligatori per il Blocco B

| Rischio / limite | Evidenza | Controllo richiesto a B |
|---|---|---|
| Import di moduli con scritture all'avvio | Contratto Node richiama `buildRegistry()` | Dipendenze degli adattatori puramente di lettura; non importare builder o contratto Node con side effect |
| Differenze reali MD1/MD2 e V2/pilot | Rami e record catturati | Due adattatori distinti; nessuna fusione dei motori, gate o unità |
| Metadati vecchi nell'integrazione | Inter–Club Brugge: `teamPrediction.dataQuality.lineups` parla ancora di undici editoriali, mentre il ramo formazione è ufficiale | Esprimere provenienza e date dei due stati senza correggere JSON o inventare una rielaborazione |
| Forecast originario non provato dal JSON corrente | Atalanta–Venezia ha una voce nel manifest snapshot Serie A; gli altri due non sono in quel manifest | Non inferire assenza globale di snapshot Champions; verificare i suoi archivi separati prima di dichiarare un confronto originario. Nessuna certificazione cronologica nuova in A |
| Statistiche finali CL incomplete | Inter–Club Brugge: statistiche aggregate report mancanti, evidenze individuali presenti | Capacità per campo; null conservati, nessun falso zero |
| Zone tiro e duelli spaziali | Nessuna fonte uniforme sufficiente accertata | Stati informativi; canali d'attacco distinti dalle coordinate tiro |
| Trend e copertura multi-competizione | Aggregati non garantiscono serie per gara | Nessun grafico da totali; fonte, periodo e campione espliciti |
| Classificazioni non equivalenti | Confidenza V2/pilot, score disciplinare, probabilità contratto | Tipi e unità nel view model; niente percentuali ricavate da score |
| Fallback identità | Policy con ID e nome normalizzato esatto | Riutilizzare policy, non introdurre join per cognome o trasferire previsioni |
| Gate per giornata e stringhe contesto | MD7, MD2 e chiavi distinte | Preservare capability/azioni attuali, nessuna estensione in B |
| Codice non montato | Vecchi sette moduli, helper Champions, catalogo completo | Non eliminarlo o attivarlo implicitamente |
| Etichette/semantica esistenti imperfette | Hero Champions prepartita anche con report finale, H1 ulteriore nel report | Registrarle come comportamento attuale; correzioni visuali soltanto nei blocchi autorizzati |
| CSS e route condivise | Renderer e fogli contengono rami estranei | B senza attivazione visuale; conservare indici, squadra, calendario e Coppa |
| Test senza browser | Quattro render inerti e test store | Non dichiarare UI responsive/accessibile validata; browser nei blocchi visuali |
| Baseline temporale — BLOCCANTE | Cambiamenti concorrenti rilevati durante A | Attendere uno stato stabile e identificare il lavoro concorrente; nuova acquisizione separata e test delle versioni aggiornate, senza sovrascrivere questi manifest o ripristinare dati |

Sono disponibili evidenze, contratti acquisiti, record campione, sezioni e limitazioni, ma **non una baseline finale stabile che autorizzi tecnicamente l'avvio di B**. Dopo la nuova acquisizione stabile, B potrà riguardare soltanto view model e adattatori non attivati, previa autorizzazione. Nessun intervento B o C (shell, CSS, tema o renderer attivo) è stato iniziato.

## 10. File creati esattamente

Tutti esclusivamente sotto `output/reports/letture-blocco-a-2026-10-16-121839/`:

| File | Scopo |
|---|---|
| `report.md` | Questo report e inventario funzionale |
| `git-initial.json` | Stato Git precedente alla creazione degli artefatti |
| `protected-manifest.json` | 13.219 hash pre-test |
| `test-safety-audit.json` | Ispezione dipendenze, effetti collaterali ed esclusioni |
| `test-results.json` | Risultati integrali dei sei test |
| `published-markets.json` | Registro completo dei record pubblicati e strutture Champions distinte |
| `reading-inputs.json` | Campioni mercati, dataset giocatori CL MD1, chiave storage e contesti |
| `sample-checks.json` | Controlli campioni, registro, quote/null e test aggiuntivi |
| `rendered-inventory.json` | Markup e sezioni dei quattro dettagli con DOM inerte |
| `integrity-final.json` | Primo confronto pre/post test |
| `git-after-checks.json` | Stato Git intermedio |
| `legacy-and-sample-records.json` | Strutture legacy, record partita/previsione e metadati snapshot |
| `source-evidence.json` | Evidenze di raggiungibilità e gate con numeri di riga |
| `output-data-manifest.json` | 63 hash supplementari di dati/snapshot sotto output |
| `final-verification.json` | Verifica finale dei 13.282 file protetti |
| `git-final.json` | Stato Git alla prima chiusura: modifiche concorrenti, aggiunte e file dell'audit |
| `git-close.json` | Ultimo stato Git dopo rilevazione delle scritture concorrenti e correzione del verdetto |
| `baseline.mjs` | Harness di acquisizione, test verificati, controlli in memoria e rendering inerte |
| `supplement.mjs` | Acquisizione dati legacy e riferimenti sorgente |
| `finalize.mjs` | Acquisizione supplemento e confronto finale senza aggiornare baseline |

Gli script usano creazione esclusiva (`wx`) per i propri artefatti: non devono essere rilanciati nella stessa directory per sovrascrivere evidenze. Per ripetere un audit serve una nuova directory e una nuova acquisizione iniziale. Nessuno script è richiamato dal sito o aggiunto ai comandi npm.

## 11. Verdetto

**BLOCCO B NON PRONTO.** I controlli di sola lettura sono passati sulle versioni osservate, ma il confronto finale rileva 38 file protetti modificati e un nuovo raw Sisal. Quote, pronostici e altro lavoro concorrente non vengono modificati, ripristinati o assorbiti aggiornando i valori attesi. Occorre una nuova baseline durante una finestra stabile prima di considerare pronto B.

Il verdetto non certifica dati mancanti, liquidazioni provider, assenza di qualsiasi difetto preesistente o validazione browser completa. Il lavoro si ferma qui in attesa dell'autorizzazione al blocco successivo.
