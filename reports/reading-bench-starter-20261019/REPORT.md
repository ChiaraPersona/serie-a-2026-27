# Letture Serie A — Panchinari: simulazione da titolare

**Intervento concluso.** La scheda Panchinari mostra Tiri e SOT ipotizzando la partenza da titolare, mantenendo la stessa tabella e lo stesso formato numerico dei Titolari. Unica aggiunta visibile: «Stime ipotizzando la partenza da titolare.», mostrata una sola volta e soltanto nella scheda Panchinari Serie A.

Nessun commit, push o deploy eseguito da questo intervento. Nessun builder canonico di pronostici, quote o Schedina eseguito.

## Diagnosi e metodo

Il precedente artefatto reading-bench-forecasts.json rappresenta possibili **subentri effettivi**. Per Serie A non dispone di un modello approvato di ingresso e il volume è già assegnato ai titolari: i valori null erano intenzionali, non zeri. Questo artefatto è rimasto invariato.

Non esisteva una proiezione pronta «se parte titolare» per ciascun panchinaro. Il motore 4.13.0 dispone però già dei passaggi necessari: baseline individuale regolarizzata, expectedMinutes, stabilizzazione storico/campione corrente, matchup di ruolo e avversario, allocazione al volume squadra. Il nuovo adattatore **riutilizza queste funzioni**, senza duplicare i coefficienti o cambiare il motore condiviso.

L'adattatore Node carica una copia del modulo motore in un contesto VM privato, esponendo soltanto nel contesto isolato tre helper interni già esistenti (scalePlayerVolume, playerMatchup e reconcilePlayerVolumes). Riutilizza inoltre gli export esistenti expectedMinutes e playerBaselineStability. Il file del motore e i suoi export pubblici su disco restano identici. Nel browser vengono caricati solo i risultati derivati, non il motore.

### Ipotesi esplicite

1. Ogni panchinaro è uno scenario **indipendente**, non una formazione alternativa collettiva. Usa il proprio ID canonico, ruolo, storico e produzione corrente.
2. La stima dei minuti usa la formula del motore da titolare: storico depurato delle presenze dalla panchina, prior di ruolo e campione corrente dei suoi inizi da titolare. Nella finestra recente vengono considerate soltanto le sue partenze da titolare; mancati ingressi e brevi subentri non vengono usati come durata di una partenza titolare. Nessuna assegnazione generalizzata di 90 minuti.
3. Dati correnti limitati alle gare concluse di Serie A precedenti alla giornata e alla data della partita. La partita analizzata e le gare successive sono escluse.
4. Le proiezioni squadra originali rimangono gli input fissi. Per la normalizzazione viene occupato in memoria un posto di un titolare dello stesso ruolo dettagliato, quando disponibile; altrimenti dello stesso macro-ruolo. In caso di più posti equivalenti viene mantenuto il primo nell'ordine già pubblicato. La formazione visualizzata non cambia.
5. Per gli altri nove giocatori di movimento si ricostruiscono gli input non ancora normalizzati dal diagnostico originale del modello; soltanto il panchinaro riceve il proprio calcolo. Si riapplica la medesima allocazione e il limite SOT ≤ Tiri. Del risultato viene conservata esclusivamente la riga ipotetica del panchinaro: non si pubblicano i compagni ricalcolati né nuovi totali squadra.
6. Filtro prudenziale del solo artefatto: almeno 700 minuti storici con entrambi i tassi osservati, oppure almeno 270 minuti correnti con osservazioni di entrambe le metriche; occorre inoltre evidenza di partenze da titolare per stimarne la durata. Sono soglie già presenti nei livelli di affidabilità del motore, riutilizzate come requisiti di visualizzabilità, senza cambiare formule o criteri dei mercati pubblicati.
7. Portieri (non modellati per tiri individuali dal ramo esistente), identità/ruoli irrisolti, dati insufficienti o diagnostico originale incompleto restano «—». Non vengono creati tassi mancanti o prese proiezioni da un altro giocatore.

Il nuovo campo è starterScenario e il minutaggio ipotetico si chiama **assumedStarterMinutes**: non viene scritto in expectedMinutes. I minuti realmente previsti, le probabilità di ingresso e le proiezioni operative rimangono nei loro campi originali. Le ipotesi numeriche non vengono sommate fra panchinari o ai totali pubblicati.

Per partite già disputate la simulazione è una ricostruzione tecnica con gli input disponibili, non una previsione originaria congelata.

## Parma–Torino MD7

**Parma: 5 panchinari stimabili su 11; Torino: 7 su 13.** Prima i valori Serie A erano «—». Ora dodici righe mostrano entrambe le metriche. I minuti ipotizzati per queste dodici righe vanno da 61,1 a 86,5.

I valori sotto sono riportati con due decimali per audit; l'interfaccia usa il medesimo arrotondamento a una cifra decimale dei Titolari.

| Squadra | Giocatore | Minuti ipotizzati | Tiri | SOT |
|---|---|---:|---:|---:|
| Parma | Franco Carboni | 71,9 | 0,74 | 0,09 |
| Parma | Abdoulaye Ndiaye | 84,1 | 0,92 | 0,1 |
| Parma | Giovanni Fabbian | 61,1 | 1,42 | 0,32 |
| Parma | Christian Ordoñez | 63,1 | 1,21 | 0,21 |
| Parma | Simone Lontani | 70,9 | 2,4 | 0,76 |
| Torino | Eray Cömert | 79,8 | 0,57 | 0,15 |
| Torino | Adrian Ismajli | 86,5 | 0,33 | 0,16 |
| Torino | Kian Fitz-Jim | 71,8 | 1,25 | 0,38 |
| Torino | Gaetano Oristanio | 68,2 | 1,48 | 0,31 |
| Torino | Gvidas Gineitis | 66,4 | 0,93 | 0,22 |
| Torino | Cesare Casadei | 82,5 | 1,33 | 0,57 |
| Torino | Duván Zapata | 68,2 | 1,95 | 0,77 |

Gli altri dodici restano «—»: quattro portieri e otto giocatori con campione insufficiente per i requisiti sopra. Per Simone Lontani e Kian Fitz-Jim il campione corrente disponibile consente il calcolo anche quando il dato storico, da solo, non soddisfa il criterio. I singoli input, i fattori di matchup, la durata e il posto virtuale usato sono conservati negli artefatti tecnici; non vengono aggiunti sotto i nomi nella pagina.

## Copertura

Generati scenari per tutte le **59 partite Serie A con una predizione disponibile**: 641 righe panchina, 266 con Tiri/SOT stimabili. Altre 375 rimangono null: 85 portieri, 82 identità/rosa non risolte, 142 campioni insufficienti, 66 contesti originali incompleti. Non vengono riempite le lacune con una sola media di ruolo.

| Partita MD7 | Panchinari associati | Con Tiri/SOT | Con «—» |
|---|---:|---:|---:|
| bologna-inter | 0 | 0 | 0 |
| fiorentina-como | 26 | 13 | 13 |
| frosinone-sassuolo | 30 | 15 | 15 |
| juventus-lazio | 25 | 13 | 12 |
| milan-atalanta | 24 | 15 | 9 |
| monza-cagliari | 26 | 15 | 11 |
| parma-torino | 24 | 12 | 12 |
| roma-genoa | 18 | 12 | 6 |
| udinese-lecce | 29 | 13 | 16 |
| venezia-napoli | 26 | 12 | 14 |

Bologna–Inter non ha panchinari associati nella distinta disponibile: non sono stati inventati giocatori. È verificata la gestione dell'elenco vuoto, non un calcolo di panchina inesistente.

## Separazione e cache

I risultati sono in nuovi artefatti reading-only sotto data/generated/reading-bench-starter-scenarios/. Ogni Lettura scarica soltanto il proprio file, evitando di caricare l'intero archivio. Il manifest contiene riepilogo, hash del motore/adattatore e percorsi dei 59 file.

L'aggancio alla pagina richiede ID, squadra e contesto esatti. Il contesto comprende modello/volumi, distinta, panchina, rosa pubblica e storico pertinente: una discordanza produce null e quindi «—». Un cambio di dati richiede la rigenerazione dell'artefatto dedicato con node scripts/build-reading-bench-starter-scenarios.mjs, senza avviare builder canonici.

La scheda Titolari non legge starterScenario. La Schedina non legge questi artefatti: le righe non hanno selectionId o BetSelection e lo store le rifiuta come UNVERIFIED_IDENTITY.

## Test eseguiti

| Verifica | Esito |
|---|---|
| Riproduzione del ramo di allocazione sui titolari MD7 già pubblicati | **PASS: 200 giocatori, differenza massima Tiri/SOT zero** |
| Confronto oggetti titolari nelle 59 fixture | **PASS: 1.188 righe immutate** |
| Tiri/SOT finiti, non negativi, SOT ≤ Tiri, minuti ipotetici nel dominio | **PASS** |
| Identità canoniche, motivi dei null, contesto alterato e dati futuri esclusi | **PASS** |
| Rifiuto di una simulazione come selezione operativa | **PASS** |
| 10 Letture MD7 × 5 viewport (1440/1050/768/390/320) | **PASS: 50 viste, zero overflow, errori JS o HTTP locali** |
| Entrambe le squadre, valori a schermo uguali all'artefatto arrotondato | **PASS** |
| Nota generale unica, nascosta tornando ai Titolari | **PASS** |
| Confronto prima/dopo Parma–Torino, Fiorentina–Como e Milan–Atalanta a 1440/390 | **PASS: titolari, altre sezioni e campo identici** |
| Componente Giocatori Champions, prima/dopo a 1440/390 | **PASS: HTML identico e nessun fetch ai nuovi artefatti Serie A** |
| scripts/test-reading-bench-starter-scenarios.mjs | **PASS** |
| scripts/test-reading-bench-forecasts.mjs | **PASS: artefatto dei subentri e budget originali preservati** |
| scripts/test-reading-detail-internals.mjs | **PASS** |
| scripts/test-personal-betslip.mjs | **PASS** |
| scripts/test-betting-selection-contract.js | **PASS: 6 Schedina, 137 MyCombo, 137 prediction legs** |
| scripts/check-schedina-md07-browser.cjs | **PASS: 10 fixture a 1440/390, catalogo e persistenza** |
| scripts/test-css-modules.js | **PASS** |

Evidenze: unit.json, replay.json, before.json, after.json, champions-regression.json e integrity.json. Nessun PASS attribuito a panchinari senza dati: questi restano null.

## Integrità e lavoro concorrente

Confrontati **9.661 file preesistenti, di cui 9.114 dati**. Nessun file dati originale Serie A è stato modificato da questo intervento. Sono invariati motore, predictions.json, vecchio artefatto panchina, dati/quote/statistiche Serie A, formazioni, proiezioni dei titolari, totali squadra e mercati canonici/pubblicati.

**Pronostici preservati:** forecasts.mjs, serie-a-adapter.mjs, relativo CSS, BetSelection e store sono identici alla baseline iniziale di questa richiesta. In readings.js e shell.mjs sono stati aggiornati soltanto gli import/versioni necessari a caricare Giocatori/evidence; nessuna riscrittura della sezione Pronostici o dell'indice Letture.

**Variazione concorrente rilevata:** data/normalized/odds/sisal/champions-league.json ha un hash diverso dalla baseline. Non è un output di questo intervento ed è stato lasciato intatto. Quindi non viene dichiarata l'identità di tutti i 9.114 dati: sono identici 9.113 file, mentre la variazione Champions è registrata separatamente. Nessun ripristino di lavoro concorrente eseguito.

Nessuna regressione rilevata nei controlli eseguiti. Non è stato rieseguito l'audit completo di tutte le rotte del sito: verifica browser sulle dieci MD7, test strutturali su tutti i 59 artefatti, confronto rappresentativo Champions e test Schedina come sopra.

## File modificati e aggiunti

Sei file preesistenti:

- js/pages/reading-detail/bench-contract.mjs
- js/pages/reading-detail/evidence.mjs
- js/pages/reading-detail/people.mjs
- js/pages/reading-detail/shell.mjs
- js/pages/readings.js
- lettura.html

- bench-contract.mjs: contesto e collegamento separato delle simulazioni.
- evidence.mjs: caricamento del solo artefatto della partita.
- people.mjs: lettura di Tiri/SOT ipotetici esclusivamente per i panchinari Serie A; unica nota generale.
- shell.mjs, readings.js e lettura.html: versioni cache/import aggiornate mantenendo il lavoro concorrente.

Nuovi file:

- scripts/readings/bench-starter-scenarios.mjs — adattatore di simulazione isolato.
- scripts/build-reading-bench-starter-scenarios.mjs — generazione dei soli artefatti what-if.
- scripts/test-reading-bench-starter-scenarios.mjs — test dedicati.
- data/generated/reading-bench-starter-scenarios.json — manifest e policy tecniche.
- 59 file per fixture sotto data/generated/reading-bench-starter-scenarios/.

Elenco completo dei 69 file di produzione/test interessati in production-files.json; i percorsi dei file derivati sono anche nel manifest. I report/screenshot sono in questa cartella. I test esistenti aggiornano i consueti report interni reading-bench e output/reports, senza modificare dati operativi.

## Screenshot

[Galleria prima/dopo](comparisons.html).

- Parma–Torino desktop: [prima](before-parma-torino-2026-27-md-07-1440.png) / [dopo](after-parma-torino-2026-27-md-07-1440.png).
- Parma–Torino mobile: [prima](before-parma-torino-2026-27-md-07-390.png) / [dopo](after-parma-torino-2026-27-md-07-390.png).
- Fiorentina–Como mobile: [prima](before-fiorentina-como-2026-27-md-07-390.png) / [dopo](after-fiorentina-como-2026-27-md-07-390.png).
- Milan–Atalanta mobile: [prima](before-milan-atalanta-2026-27-md-07-390.png) / [dopo](after-milan-atalanta-2026-27-md-07-390.png).

Intervento terminato; nessuna ulteriore modifica avviata.
