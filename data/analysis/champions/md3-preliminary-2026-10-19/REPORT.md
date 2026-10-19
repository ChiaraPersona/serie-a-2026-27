# Champions League MD3 — Letture preliminari e preparazione Schedina

## Esito

Generate localmente tutte le 18 Letture preliminari e la pagina di preparazione Schedina MD3. Input esclusivo per le previsioni: preview-md03.json della fase offline, protetto da SHA-256. Nessun motore o builder di previsione ricalcolato; nessuna formula o coefficiente modificato.

Le pagine mantengono testata e profilo arbitrale già integrati, aggiungendo probabilità 1X2, punteggio principale, gol attesi del modello, confronti per squadra e totali tiri/SOT/corner/gialli, quando disponibili. Nessun valore medio è trasformato in un pronostico su una soglia. I gol del modello non sono chiamati xG.

La bozza è raggiungibile da ogni Lettura e tramite `schedina.html?competizione=champions&giornata=3`. Non è stata aggiunta una card di Schedina definitiva all’archivio. Il file draft mantiene slips=[] e publishedSelections=[]: nessuna multipla definitiva o lista approvata è stata pubblicata.

## Le 18 Letture e i mercati

| Fixture | Partita | URL | Mercati | Selezioni aperte | Volumi dettagliati |
|---|---|---|---:|---:|---|
| ucl-2026-27-md03-01 | Fenerbahçe – Slavia Praha | `champions-league.html?match=ucl-2026-27-md03-01` | 34 | 51 | Disponibili |
| ucl-2026-27-md03-02 | Sabah – Borussia Dortmund | `champions-league.html?match=ucl-2026-27-md03-02` | 10 | 20 | N/D |
| ucl-2026-27-md03-03 | Roma – Slovan Bratislava | `champions-league.html?match=ucl-2026-27-md03-03` | 33 | 50 | Disponibili |
| ucl-2026-27-md03-04 | Porto – PSV Eindhoven | `champions-league.html?match=ucl-2026-27-md03-04` | 34 | 49 | Disponibili |
| ucl-2026-27-md03-05 | Liverpool – Villarreal | `champions-league.html?match=ucl-2026-27-md03-05` | 33 | 51 | Disponibili |
| ucl-2026-27-md03-06 | Manchester City – AEK Athens | `champions-league.html?match=ucl-2026-27-md03-06` | 33 | 49 | Disponibili |
| ucl-2026-27-md03-07 | Paris Saint-Germain – Barcelona | `champions-league.html?match=ucl-2026-27-md03-07` | 32 | 50 | Disponibili |
| ucl-2026-27-md03-08 | Napoli – Bodø/Glimt | `champions-league.html?match=ucl-2026-27-md03-08` | 33 | 49 | Disponibili |
| ucl-2026-27-md03-09 | Stuttgart – Atlético de Madrid | `champions-league.html?match=ucl-2026-27-md03-09` | 34 | 50 | Disponibili |
| ucl-2026-27-md03-10 | Como – Manchester United | `champions-league.html?match=ucl-2026-27-md03-10` | 24 | 34 | Disponibili |
| ucl-2026-27-md03-11 | Lille – Galatasaray | `champions-league.html?match=ucl-2026-27-md03-11` | 27 | 36 | Disponibili |
| ucl-2026-27-md03-12 | Aston Villa – Viking | `champions-league.html?match=ucl-2026-27-md03-12` | 10 | 20 | Disponibili |
| ucl-2026-27-md03-13 | Club Brugge – Lens | `champions-league.html?match=ucl-2026-27-md03-13` | 10 | 19 | Disponibili |
| ucl-2026-27-md03-14 | Bayern München – Arsenal | `champions-league.html?match=ucl-2026-27-md03-14` | 27 | 36 | Disponibili |
| ucl-2026-27-md03-15 | Inter – Shakhtar Donetsk | `champions-league.html?match=ucl-2026-27-md03-15` | 10 | 20 | Disponibili |
| ucl-2026-27-md03-16 | Real Madrid – Leipzig | `champions-league.html?match=ucl-2026-27-md03-16` | 22 | 33 | Disponibili |
| ucl-2026-27-md03-17 | Real Betis – Feyenoord | `champions-league.html?match=ucl-2026-27-md03-17` | 10 | 20 | Disponibili |
| ucl-2026-27-md03-18 | Sporting CP – LASK | `champions-league.html?match=ucl-2026-27-md03-18` | 10 | 20 | Disponibili |

Catalogo condiviso: **426 mercati, 657 selezioni aperte**. Famiglie: 1X2 18, doppia chance 18, gol U/O 141, corner U/O 58, tiri totali U/O 191.

I contratti ammessi sono un’allowlist verificabile: codice 3 / 1X2 ESITO FINALE / ESITO FINALE 1X2; 28319 / DOPPIA CHANCE / DOPPIA CHANCE MULTIESITI; 7989 / UNDER/OVER / U/O <soglia>; 975 / U/O CORNER / U/O <soglia> CORNER; 15859 / U/O TIRI TOTALI / U/O <soglia> TIRI TOTALI. Solo scope match, periodo completo, ID evento/mercato/selezione presenti, soglia identica a quella della variante, mercato e selezione open, quota >1 e nessun player ID. Periodi espliciti diversi dal full-match sono esclusi. Le varianti di primo tempo, giocatore, sostituto/DUO o soglia non verificata non entrano nel catalogo.

Quote, oddsRaw, status, codici, soglie, varianti e identificativi sono copiati dal listino già raccolto senza riscriverlo. Le selezioni sospese non compaiono. Il confronto automatico verifica ogni riga contro il record originale. Non è stata svolta una nuova verifica online della disponibilità commerciale.

Le probabilità 1X2, del verdetto e delle linee gol 1.5/2.5/3.5 provengono letteralmente dalla preview. Per le altre linee gol, corner e tiri totali privi di probabilità sul contratto esatto, probabilità/EV restano N/D: sono contratti disponibili per scelta manuale, non pronostici del motore. Nessun contratto di SOT o cartellini/punti cartellini è stato forzato sulla sola base della rispettiva media.

Per Sabah–Borussia Dortmund restano N/D tiri, SOT, corner e disciplina; dal suo catalogo sono esclusi anche corner e tiri totali perché manca il supporto statistico. Restano esito, doppia chance e gol.

## Verdetti preliminari e revisione economica

Le 18 corrispondenze qui sotto riprendono soltanto il verdetto esplicito della preview, senza deduzioni dai valori medi. 7 hanno EV matematico positivo alla quota dello snapshot e possono essere esaminate separatamente; le altre 11 non vengono presentate come occasioni di valore. Non sono state create Schedine definitive o nuove soglie di approvazione.

EV = probabilità congelata × quota esistente − 1; è un calcolo economico del contratto, non un ricalcolo della probabilità né una garanzia di calibrazione o di combinabilità bookmaker.

| Fixture | Selezione del verdetto | Probabilità preview | Quota originale | EV matematico | Revisione |
|---|---|---:|---:|---|
| ucl-2026-27-md03-01 | 1 | 67,40% | 1,65 | 11,21% | Candidata da esaminare, non approvata |
| ucl-2026-27-md03-02 | X2 | 62,40% | 1,06 | -33,86% | Verdetto statistico, EV non positivo |
| ucl-2026-27-md03-03 | 1 | 77,00% | 1,15 | -11,45% | Verdetto statistico, EV non positivo |
| ucl-2026-27-md03-04 | 1 | 56,70% | 1,60 | -9,28% | Verdetto statistico, EV non positivo |
| ucl-2026-27-md03-05 | 1 | 73,30% | 1,50 | 9,95% | Candidata da esaminare, non approvata |
| ucl-2026-27-md03-06 | 1 | 56,50% | 1,11 | -37,29% | Verdetto statistico, EV non positivo |
| ucl-2026-27-md03-07 | 1 | 58,90% | 2,45 | 44,30% | Candidata da esaminare, non approvata |
| ucl-2026-27-md03-08 | X2 | 62,60% | 2,30 | 43,98% | Candidata da esaminare, non approvata |
| ucl-2026-27-md03-09 | X2 | 68,80% | 1,36 | -6,43% | Verdetto statistico, EV non positivo |
| ucl-2026-27-md03-10 | X2 | 63,80% | 1,60 | 2,08% | Candidata da esaminare, non approvata |
| ucl-2026-27-md03-11 | 1 | 52,80% | 2,15 | 13,52% | Candidata da esaminare, non approvata |
| ucl-2026-27-md03-12 | 1 | 74,80% | 1,20 | -10,24% | Verdetto statistico, EV non positivo |
| ucl-2026-27-md03-13 | 1 | 55,80% | 2,00 | 11,60% | Candidata da esaminare, non approvata |
| ucl-2026-27-md03-14 | 1X | 66,90% | 1,30 | -13,03% | Verdetto statistico, EV non positivo |
| ucl-2026-27-md03-15 | 1 | 62,80% | 1,18 | -25,90% | Verdetto statistico, EV non positivo |
| ucl-2026-27-md03-16 | 1 | 75,40% | 1,24 | -6,50% | Verdetto statistico, EV non positivo |
| ucl-2026-27-md03-17 | 1 | 65,10% | 1,48 | -3,65% | Verdetto statistico, EV non positivo |
| ucl-2026-27-md03-18 | 1 | 70,20% | 1,20 | -15,76% | Verdetto statistico, EV non positivo |

## Sezioni incomplete

- XI probabili, panchine, disponibilità e minuti previsti non documentati: N/D; nessuna formazione ricostruita da rose o vecchi undici.
- Nessuna previsione individuale pubblicata: minuti, tiri, SOT e probabilità evento restano —. I per90 diagnostici non sono importati nel catalogo.
- Sabah, Slavia Praha, Shakhtar Donetsk e Slovan Bratislava continuano senza proiezioni individuali. Il catalogo non contiene mercati di giocatori per nessuna delle 36 squadre.
- Non aggiunte analisi narrative, precedenti o sezioni non presenti nella preview. Il confronto squadre usa esclusivamente le proiezioni già congelate.
- Le medie arbitrali restano descrittive, con campioni storici/nazionali separati e dati mancanti —; nessun impatto sulle probabilità.
- Nessuna nuova MyCombo consigliata è generata o congelata. Rimangono la combinazione manuale, il prodotto delle quote e i controlli di compatibilità dello store esistente; la combinabilità commerciale non è dedotta dal prodotto matematico.

## Test

- PASS `test-champions-md3-preliminary.mjs`: tutti i 18 forecast identici alla preview, 426 mercati e 657 selezioni verificati contro Sisal, nessun individuale/sospeso, store MD3, quote combinate, salvataggio e separazione da MD2.
- PASS `test-personal-betslip.mjs`: persistenza, deduplicazione, compatibilità, quote e contesti.
- PASS `test-betting-selection-contract.js`: 6 Schedine, 137 MyCombo e 137 prediction legs esistenti.
- PASS `test-champions-reading-page.mjs` e `test-champions-schedina-page.mjs`.
- PASS `test-champions-referee-readings-md02-page.mjs`: regressione sulle 18 pagine MD2.
- PASS browser Edge: tutte le 18 Letture più Schedina a 1440, 390 e 320 px (57 pagine). Ogni probabilità, punteggio, valore per squadra e totale confrontato con la preview; arbitri e cataloghi verificati, nessun errore JavaScript o overflow.
- PASS browser: selezione dalla Lettura, apertura Schedina, seconda selezione da altra fixture, totale delle quote corretto e mantenimento dopo reload, usando esclusivamente il profilo di test isolato.
- PASS `git diff --check` (soli avvisi LF/CRLF).

Nel primo controllo a 320 px la larghezza minima delle tre percentuali 1X2 superava quella della griglia. Correzione limitata al font dei nuovi campi MD3 sotto 380 px; valori e grafica delle giornate precedenti non modificati. Le verifiche complete sono passate dopo la correzione. Screenshot viewport effettivi ispezionati anche dopo scroll sul profilo arbitrale; screenshot full-page e diagnostica iniziale conservati come evidenza interna.

## Integrità e file

Confrontati 9919 file preesistenti. Nessuna modifica a preview, quote/ID Sisal, pronostici o Schedine precedenti, esiti, dati individuali, motori, designazioni o profili arbitrali. La preview e il file quote sono inoltre verificati tramite SHA-256 nel catalogo. I nuovi dati normalizzati sono solo il catalogo preliminare e il draft MD3.

File esistenti modificati:

- `js/pages/betting.js`.
- `js/pages/champions-market-ui.mjs`.
- `js/pages/champions.js`.
- `css/reading-detail.css`.
- `scripts/build-site.js`.
- `champions-league.html` e `schedina.html`: shell/cache version, senza modifica ai dati delle altre giornate.

Nuovi file: `scripts/build-champions-md3-preliminary.js`, `js/pages/champions-md3-ui.mjs`, `data/normalized/champions-md03-preliminary-2026-27.json`, `data/normalized/schedina-champions-md03-draft.json`, test mirato, controllo browser e generatore di questo report. I percorsi completi sono in files-manifest.json.

Il build sito usa --md3-pages-only --presentation-only: non avvia il motore, la policy degli XI, builder delle panchine o rigenerazioni estranee. Il renderer di mercato ora accetta il matchday e uno store condiviso: il comportamento preesistente mantiene il default MD2. I 18 cataloghi della bozza usano un solo store MD3 e i contratti dei medesimi fixture ID.

La policy pubblica sulle fonti resta attiva e nessuna sezione di provenienza è stata aggiunta. L’intervento non accede alle schedine personali reali dell’utente; i test di persistenza usano memoria/profilo browser isolati.

Nessun commit, push, deploy o pubblicazione di Schedine definitive. Il passaggio alle definitive resta in attesa dell’approvazione dell’utente.
