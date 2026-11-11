# Audit del metodo di validazione dello storico individuale — 11 novembre 2026

Ricerca sui sorgenti proprietari del progetto, senza modificare dati o motori operativi. Il report accompagna il confronto numerico: non costituisce una validazione delle nuove varianti né un’approvazione di mercati.

## Funzioni riusabili e vincoli

- `scripts/champions/current-season-offline.js:35`, `rateCandidate`, è il punto puro della stima individuale. Richiede minuti storici positivi e rate storici tiri/SOT finiti; un dato N/D non diventa zero né un prior autonomamente approvato. Divide le osservazioni correnti in domestiche, Champions e altre europee; nel blending entrano soltanto le prime due. Non esiste un canale nazionale.
- `scripts/champions/context-adjusted-player-baseline.js`: `historicalBaseline` applica shrink verso i priors di ruolo, K=900 e cap storico 0,82; `blendRates` conserva K=900 e cap corrente 0,35. Sono pure e riusabili senza cambiare costanti. Gli aggregati di un artifact possono essere ripassati a `blendRates` direttamente: non occorre inventare osservazioni sintetiche per imitare i canali congelati.
- `scripts/champions/md3-lineup-policy.js`, `projectMd3Team`, delega a `projectDocumentedTeam`: ruoli/minuti attesi, documentazione XI/panchina, budget 990 minuti, target squadra, gate 0,02 e SOT<=tiri devono restare invariati. La redistribuzione è per squadra: cambiare la storia di un giocatore può modificare anche le proiezioni dei compagni. Non basta moltiplicare la vecchia media individuale per un rapporto di rate.
- `starterThresholds` nello stesso modulo riusa Poisson ed è esplicitamente preliminare e condizionato alla partenza da titolare. L’eventuale Brier/log loss misura tali eventi individuali, non valida automaticamente il contratto bookmaker DUO.

## Baseline e disponibilità dei dati

Sono presenti 126 snapshot MD3 in `data/predictions/champions-event-snapshots/md03/`, con `createdAt`, `kickoffAt`, `chronologyStatus`, universo dei giocatori con blocker, medie, probabilità e hash dei moduli. Per evitare selezione a posteriori fissare una regola di snapshot per fixture prima di osservare gli errori; conservare soltanto quelli pre-kickoff con integrità verificata e identità esatte.

Gli hash del primo snapshot MD3 consultato coincidono con i moduli correnti `md3-lineup-policy.js`, `context-adjusted-player-baseline.js` e `substitute-minutes.js`, ma **non** con `current-season-offline.js`, `player-volume-utils.js` e `build-champions-md3-probable.cjs`. Un replay con il codice attuale deve prima dimostrare di riprodurre la baseline; i mismatch richiedono quarantena oppure un confronto etichettato “replay attuale”, senza dichiararlo identico al motore storico pubblicato.

L’artifact corrente `data/normalized/champions-md04-probable-individuals-2026-27.json` riporta globalmente `source.consultedAt=2026-11-04T19:06:20.878Z` ma contiene anche fixture del 3 novembre. Questo campo globale non prova che ogni sua riga sia stata congelata prima della gara. Per ogni fixture serve lo snapshot/receipt originale; altrimenti MD4 è una coorte retrospettiva, non prospettica.

Le nuove osservazioni nazionali sono riferite al periodo 2025-07-01..2026-06-30, quindi le loro gare precedono MD3/MD4. Tuttavia sono state acquisite a novembre. Distinguere obbligatoriamente:

1. **Strict as-known:** `retrievedAt <= kickoff`; le nuove acquisizioni di novembre non sono ammissibili nei vecchi pronostici.
2. **Retrospective event-time:** si usano solo eventi anteriori alla gara, pur recuperati dopo. È un esperimento retrospettivo su fatti pregressi, non una dimostrazione che quei dati fossero disponibili nel vecchio sistema.

La rosa del 29 ottobre non deve ridefinire l’universo MD3 del 20 ottobre. I nuovi ID possono riconciliare identità, senza introdurre a posteriori giocatori, minuti o indisponibilità nella formazione congelata. I totali club 2025/26 possono avere metadati stagionali anziché referti datati: dichiararne il limite e non sostituirli con statistiche 2026/27.

## Impatto diretto dei venti recuperi club

Controllo tramite ID ESPN dei venti recuperi positivi in `data/sources/champions-player-club-history-supplement-2025-26.json`:

| Artifact | Occorrenze dei recuperati | Occorrenze con proiezione tiri numerica |
|---|---:|---:|
| MD3 `data/normalized/champions-md03-probable-individuals-2026-27.json` | 14 | 0 |
| MD4 `data/normalized/champions-md04-probable-individuals-2026-27.json` | 14 | 0 |

Il conteggio finale usa il join per ID canonico oppure ID ESPN, sempre entro la stessa squadra. Il primo controllo di orientamento (9 MD3 e 4 MD4) usava soltanto gli ID ESPN già presenti e, per MD3, un diverso artifact derivato: non rappresentava la copertura completa. Il dato corretto è **14 occorrenze per giornata**, tutte senza previsione numerica e ancora non eleggibili eliminando il solo blocker storico. Restano soprattutto minuti attesi mancanti, casi portiere e il vincolo collettivo-only. Il recupero dello storico può migliorare il listone senza modificare le previsioni numeriche già disponibili. Non rimuovere gli altri blocker per rendere artificialmente valutabile il recupero.

## Confronto raccomandato

- **A — baseline:** inputs congelati e formula originale, con prova di riproducibilità delle medie pubblicate oppure dichiarazione esplicita di replay.
- **B — club recuperato:** stessa coorte, stessi target squadra, minuti, ruoli, canali correnti, contextFactor e soglie; sostituire soltanto la storia club dove una nuova identità esatta porta dati prima indisponibili o una correzione dimostrata. Non sommare di nuovo le storie già presenti.
- **C — esperimento nazionale:** usare solo l’ufficiale senior nella variante primaria; le amichevoli possono essere una sensibilità separata. Una fusione club+nazionale cambia il significato dell’input e richiede una regola dichiarata prima dei risultati (per esempio pooling per esposizione), senza cercare pesi sul test. Non chiamarla canale nazionale già approvato: nel motore non esiste.

Confrontare errori appaiati (MAE per tiri e SOT; Brier/log loss soltanto sulle stesse soglie individuali), numero di fixture indipendenti e copertura. Fissare la coorte di confronto comune; riportare separatamente eventuali nuove previsioni rese possibili e quelle bloccate. Una variante con meno pronostici non migliora automaticamente solo perché scarta i casi difficili. Intervalli o bootstrap devono raggruppare per fixture, perché giocatori e soglie della stessa partita non sono osservazioni indipendenti.

## Risultati e contratti

`data/sources/champions-observed-performances-2026-27.json` contiene 1.698 osservazioni delle prime tre giornate, con ID ESPN, fixtureId, minuti e statistiche. Per MD4 i referti sono raggiungibili dai `rawPath` di `data/sources/champions-results-md04-2026-27.json`; non limitarsi a `verifiedSelections`, che è un campione di mercati pubblicati e non l’universo completo dei giocatori. `data/analysis/champions/event-validation/actuals.json` è una proiezione più piccola (62 giocatori al momento del controllo), utile solo se il suo universo corrisponde al test scelto.

Per output condizionati alla titolarità separare i casi effettivamente titolari dalle previsioni di formazione sbagliate e documentare le esclusioni. Non sostituire i minuti attesi con quelli effettivi nel calcolo predittivo. Verificare periodo regolamentare, tiri/SOT mancanti e duplicati provider prima del punteggio.

La policy `scripts/champions/market-prospective.cjs` esclude esplicitamente DUO, woodwork ed extra time non validati. Nessun risultato di questo esperimento autorizza probabilità, fair odds, EV o liquidazioni certificate dei DUO. Le verifiche statistiche degli esiti restano distinte dal settlement e dal rendimento economico.

## Controverifica indipendente del runner e dei risultati

Ispezionati `scripts/research/champions-history-validation.cjs`, il protocollo e `data/analysis/champions/history-validation-2026-11-11/results.json`. Ricalcolati indipendentemente in Python i MAE sulle righe di risultato, verificando anche l’unicità `(fixtureId, teamId, playerId)`: coincidono con quelli esportati entro 1e-12. Nessun duplicato tra i 174 casi valutati.

La baseline finale è ancorata all’hash esatto dell’artifact MD3 contenuto nei primi snapshot validi, e le medie/expectedMinutes dei 230 pronostici starter sono confrontate direttamente con i record congelati. Il replay delle 24 squadre già dotate di proiezioni numeriche riproduce i valori pubblicati, senza quarantene. Questo risolve il rischio operativo degli hash modulo diversi per la specifica coorte; non costituisce una prova che ogni versione storica del motore sia equivalente. Le altre 12 squadre erano già bloccate: non sono state validate dal replay.

Dei 230 pronostici starter, 55 riguardano non titolari effettivi e uno non trova il provider nei referti: sono esclusi. Rimangono **174 casi comuni su 14 fixture**, identici in tutti i bracci. La prestazione è quindi condizionata alla titolarità e al sottoinsieme già coperto; l’errore di previsione dell’undici non è incorporato nel MAE.

| Variante | MAE tiri | MAE SOT |
|---|---:|---:|
| Baseline | 0.809425 | 0.503793 |
| Recupero club | 0.809425 | 0.503793 |
| Pooling club + nazionale ufficiale | 0.816452 | 0.505148 |
| Pooling club + nazionale amichevoli | 0.808103 | 0.505517 |

Non rilevati bug materiali nella semantica delle metriche o del pooling. Il pooling aggiunge conteggi tiri/SOT e minuti coerenti, poi ricostruisce i rate per90 con `playerEntry`: aumenta anche la numerosità dello storico e quindi ne cambia lo shrink, lasciando inalterate le costanti. È un’ipotesi sperimentale esplicita, non una correzione del motore approvata. Ufficiali e amichevoli sono due sensibilità separate, ciascuna aggiunta al club, e non vengono sommate tra loro.

Le 154 previsioni cambiate nel braccio ufficiale includono gli effetti indiretti della riconciliazione sui compagni: non significa che 154 giocatori dispongano personalmente di nuove osservazioni nazionali. Il recupero club non cambia nessuna previsione della coorte, coerentemente con i blocker delle 28 occorrenze recuperate MD3+MD4.

Gli intervalli bootstrap principali includono zero: il piccolo peggioramento osservato con l’ufficiale e il piccolo miglioramento dei soli tiri con le amichevoli non dimostrano un effetto generale. Il bootstrap raggruppa correttamente per fixture, ma 14 cluster restano un campione limitato. Non selezionare a posteriori ruoli o soglie con esiti favorevoli per presentare un miglioramento complessivo.

Il test misura soltanto l’effetto dei dati storici sulle rate individuali tiri/SOT, a minuti attesi e volumi squadra fissi. Non misura eventuali miglioramenti di previsione dei minuti, 1X2, gol, cartellini, selezioni bookmaker o DUO. Non prova che lo storico recuperato sia inutile in altre fixture o per nuovi giocatori valutabili in futuro.

Controllo aggiuntivo di integrità: ricalcolati indipendentemente i `contentHash` dei 126 snapshot MD3 con SHA-256 di `JSON.stringify(payload)` escluso il campo hash; **126 validi, zero mismatch**. Il runner verificava direttamente cronologia e hash dell’artifact; l’assenza di un suo assert sul contentHash non altera i risultati attuali, ma può essere irrigidita per esecuzioni future.

La versione finale del runner include ora anche l’assert automatico del contentHash per ogni snapshot letto, oltre alle verifiche già effettuate in modo indipendente.
