# Champions League 2026/27 — Fase 12C

## Gate finale

**PARTIAL**

L'integrazione operativa e pronta: card, lettura e MyCombo condividono 63 selezioni con ID provider e modificatori persistenti. Il gate complessivo resta `PARTIAL` per due limiti dichiarati e non colmabili senza cambiare i dati o il modello: Sabah–Slavia Praha non dispone dei volumi squadra dettagliati; tutti i 45 mercati individuali selezionati sono contratti Sisal DUO diversi dal forecast del singolo, quindi probabilita, quota equa ed EV del contratto restano `null`.

## 1. File modificati

- `data/sources/champions-md02-individual-selection-2026-27.json`: fonte editoriale versionata delle 45 proposte, timestamp pre-kickoff e policy di selezione/contratto.
- `scripts/build-champions-md02-schedina.js`: risoluzione rigorosa di fixture, giocatore canonico, linea, quota e ID Sisal; conserva i 18 verdetti della Fase 12B.
- `data/normalized/schedina-champions-md02.json`: fonte autorevole condivisa da lettura e card.
- `js/pages/betting.js`, `css/betting.css`: gruppi squadra/tiri/SOT nella card MD2 e selezioni cliccabili anche con P/EV N/D.
- `js/pages/champions.js`, `js/pages/champions-market-ui.mjs`, `css/champions.css`: proposte pubblicate nella lettura e sincronizzazione MyCombo sulla stessa fonte.
- `scripts/test-champions-md02-schedina.mjs`, `scripts/test-champions-md02-market-ui.mjs`, `scripts/check-champions-md02-schedina-browser.cjs`: copertura dati, contratti e browser.
- `scripts/build-site.js`, `champions-league.html`, `schedina.html`: cache-busting degli asset rigenerati; la pagina Motivation storica mantiene la propria versione precedente.

Non sono stati modificati il motore matematico, le formule Serie A, i forecast individuali originari, le card Champions MD1 o gli snapshot storici.

## 2. Profili analizzati, esclusi e mantenuti

- 396 probabili titolari UEFA esaminati; 395 con identita canonica e 1 irrisolto (`Viking — Haugen`).
- 360 profili con forecast individuale tiri e SOT gia esistente.
- 340 profili nelle 17 gare con volumi squadra dettagliati.
- 296 profili con identita risolta e storico verificato.
- 39 giocatori mantenuti, per 45 selezioni complessive; sei giocatori hanno una proposta sia tiri sia SOT.
- 257 profili eleggibili non sono stati promossi automaticamente; 44 sono stati esclusi per identita/storico non pienamente verificati; i 20 profili di Sabah–Slavia sono esclusi per assenza dei volumi squadra dettagliati.

Tutti i mantenuti sono probabili titolari, hanno minuti attesi disponibili e `dataStatus: verified-history`. Non sono stati usati potenziali subentranti come se fossero titolari e non sono stati forzati giocatori senza identita canonica.

## 3. Pronostici individuali prodotti

- 45 nuove proposte individuali su 17 partite.
- 27 proposte tiri totali.
- 18 proposte tiri in porta.
- Distribuzione variabile per gara: da 0 a 3 proposte; nessuna quota fissa per partita.
- 18 verdetti squadra della Fase 12B preservati.
- Totale card: 63 pronostici su 18 partite.

## 4. Mercati integrati per tipo

- Codice Sisal `28507`: 27 `OVER` tiri totali giocatore, contratto DUO con sostituto incluso.
- Codice Sisal `28506`: 18 `OVER` tiri in porta, contratto DUO con sostituto e pali/traverse inclusi.

Il catalogo Sisal preesistente resta integro, inclusi DUO, primo tempo, entrambi i tempi e altri mercati supportati dall'interfaccia. Nessuno di questi e stato trasformato automaticamente in pronostico.

## 5. Quote collegate e non collegate

- 45/45 proposte individuali collegate a fixture, `providerEventId`, `providerMarketId` e `providerSelectionId` esatti.
- 45/45 quote aperte e selezionabili nello snapshot Sisal.
- 0 proposte individuali senza quota.
- Quote, `oddsRaw`, soglie, nomi variante e modificatori originali preservati.
- Selezioni cliccabili complessive nella card: 63/63.

## 6. Probabilita, quote eque ed EV

- 18/63 selezioni matematicamente valutabili: i verdetti squadra gia prodotti nella Fase 12B.
- 0/45 selezioni individuali matematicamente valutabili sul contratto bookmaker corrente.
- Per le 45 proposte individuali: `modelProbabilityPct: null`, `fairOdds: null`, `expectedValuePct: null` e stato `NOT_MODELLED`.
- Le medie tiri/SOT del singolo restano visibili come evidenza descrittiva; non sono state convertite in probabilita tramite soglie arbitrarie.

## 7. Selezioni piu solide sul piano descrittivo

Non e una graduatoria EV. I riferimenti piu forti per volume centrale, minuti attesi e storico verificato includono:

- Victor Osimhen: 4,80 tiri attesi; over 3,5 tiri @ 1,57. Anche 2,23 SOT attesi; over 1,5 SOT @ 2,00.
- Donyell Malen: 3,91 tiri attesi; over 2,5 @ 1,16.
- Lamine Yamal: 3,79 tiri attesi; over 2,5 @ 1,12.
- Nacho Ferri: 3,73 tiri attesi; over 2,5 @ 1,65.
- Deniz Undav: 3,57 tiri attesi; over 2,5 @ 1,25.
- Erling Haaland: 1,45 SOT attesi; over 0,5 @ 1,12.

Sono presenti anche profili meno ovvi ma documentati, tra cui Kasper Jørgensen (difensore, 2,15 tiri attesi; over 1,5 @ 2,00) e Patrick Berg (centrocampista, 2,30 tiri attesi; over 1,5 @ 1,47).

## 8. Sincronizzazione lettura, card e MyCombo

- La fonte autorevole unica e `data/normalized/schedina-champions-md02.json`.
- La lettura carica la fixture corrispondente tramite `fixtureId` e mostra le stesse proposte individuali della card.
- Card e lettura aggiungono lo stesso `selectionId` alla stessa context key MyCombo (`champions:2026-27:md02`).
- Quote, soglie e modificatori persistono dopo reload.
- Il catalogo completo e le proposte pubblicate vengono riconciliati senza duplicare lo stesso `selectionId`.

## 9. Test eseguiti

- Builder card MD2: 18 fixture, 18 verdetti 12B, 45 individuali, 63 quote cliccabili.
- Test integrazione Fase 12: 18/18 partite, 395/396 titolari associati, 109/109 disponibilita, 28.109 mercati e 92.818 selezioni integre.
- Test quote/identita individuali: 45/45 corrispondenze, nessun duplicato, modificatori invariati.
- Test MyCombo unitario: aggiunta, rimozione, reload e persistenza dei modificatori.
- Test browser desktop 1280 px e mobile 390 px: 18 pannelli, 63 righe, nessun overflow orizzontale.
- Test browser lettura → card: selezione aggiunta dalla lettura ritrovata nella card con lo stesso ID e gli stessi modificatori.
- Test retro card: 63 pending; ROI, profitto/perdita e risultati restano N/D prima degli esiti ufficiali.
- Regressione Champions MD1: 52 selezioni storiche presenti e conteggio archivio invariato.
- Regressione Serie A MD6: 10 pannelli presenti; test applicazione e schedina generale superati.
- `git diff --check`: nessun errore di whitespace.

## 10. Limiti e blocchi residui

- Sabah–Slavia Praha: `detailedVolumesAvailable: false`; nessuna nuova proposta individuale.
- Viking — Haugen: identita deliberatamente irrisolta; nessuna associazione arbitraria a Herman o Kristoffer Haugen e nessuna selezione generata.
- Contratti DUO: forecast del singolo non applicato al sostituto; per i SOT non applicato neppure alla componente pali/traverse.
- Gli esiti individuali DUO non vengono liquidati senza dati ufficiali sufficienti a verificare l'intero contratto bookmaker.

Nessun dato e stato riscaricato. Nessun commit, push o deploy eseguito.
