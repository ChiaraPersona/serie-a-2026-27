# Champions League 2026/27 — Modulo arbitrale, Fase 2B

Data snapshot: 13 ottobre 2026  
Stato: completata come fondazione dati; nessun modello definitivo allenato e nessuna probabilità pubblicata.

## Esito sintetico

Sono state normalizzate 628 partite della fase principale/knockout di Champions League dal 2022/23 al 2025/26. Le 125 partite 2021/22 sono conservate esclusivamente nei raw e usate come burn-in per calcolare prior strettamente antecedenti alle prime gare target.

L'archivio target contiene 1.256 righe squadra, 19.311 presenze giocatore e 69 arbitri distinti. Il registro esteso contiene 75 arbitri includendo i 6 presenti soltanto nel burn-in. Tutte le 628 designazioni target hanno ID persona, nome e paese dal feed ufficiale UEFA; ESPN è usato come controllo incrociato e come fonte per eventi e statistiche.

Il dataset è pronto per una futura calibrazione delle sole baseline match/team senza effetto arbitrale. L'effetto arbitrale non è ancora allenabile in modo temporalmente rigoroso perché lo snapshot storico prova chi arbitrò, ma non quando la designazione divenne disponibile prima del kickoff. Il mercato individuale è solo parzialmente pronto in forma condizionata alla presenza; quello incondizionato non è pronto.

## Copertura per stagione

| Stagione | Partite | Arbitri | Righe squadra | Presenze giocatore | Cartellini match | Falli match | Cartellini individuali | Falli individuali | Team/player falli riconciliati |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 2022/23 | 125 | 41 | 250 | 3.836 | 125/125 | 125/125 | 3.836/3.836 | 3.836/3.836 | 132/250 (52,80%) |
| 2023/24 | 125 | 45 | 250 | 3.800 | 125/125 | 125/125 | 3.800/3.800 | 3.800/3.800 | 150/250 (60,00%) |
| 2024/25 | 189 | 45 | 378 | 5.825 | 189/189 | 189/189 | 5.825/5.825 | 5.825/5.825 | 219/378 (57,94%) |
| 2025/26 | 189 | 43 | 378 | 5.850 | 189/189 | 189/189 | 5.850/5.850 | 5.850/5.850 | 378/378 (100,00%) |
| Totale | 628 | 69 unici | 1.256 | 19.311 | 628/628 | 628/628 | 19.311/19.311 | 19.311/19.311 | 879/1.256 (69,98%) |

La copertura individuale indica che il provider espone un valore numerico per ogni presenza registrata. Non implica che la somma dei falli individuali sia sempre uguale al totale squadra: nelle stagioni 2022/23–2024/25 377 righe squadra non si riconciliano. Il totale squadra resta il target autorevole; il dettaglio individuale non viene usato per ricostruirlo.

## Volumi dei target

| Stagione | Gialli ordinari | Secondi gialli | Rossi diretti | `totalCards` | Falli squadra | Rigori assegnati |
|---|---:|---:|---:|---:|---:|---:|
| 2022/23 | 491 | 13 | 8 | 512 | 2.695 | 49 |
| 2023/24 | 530 | 10 | 10 | 550 | 2.771 | 39 |
| 2024/25 | 702 | 14 | 15 | 731 | 4.012 | 73 |
| 2025/26 | 641 | 15 | 22 | 678 | 4.196 | 80 |
| Totale | 2.364 | 52 | 55 | 2.471 | 13.674 | 241 |

Definizioni applicate:

- `yellowCards`: eventi giallo ordinario attribuiti a un giocatore effettivamente sceso in campo; include il primo giallo di un successivo secondo-giallo.
- `secondYellowCards`: eventi rosso il cui testo fonte dichiara esplicitamente “Second yellow card”.
- `directRedCards`: altri eventi rosso attribuiti a giocatori scesi in campo.
- `totalCards = yellowCards + secondYellowCards + directRedCards`.
- I valori boxscore gialli/rossi del provider restano campi di confronto e non sostituiscono i target event-level.
- Le sanzioni a non partecipanti, panchina, staff o identità non risolte sono escluse dai target giocatore/squadra e registrate separatamente.
- I rigori sono tentativi regolamentari esplicitamente marcati come rigore negli eventi; le serie finali sono escluse.

## Identità arbitrali

Ogni arbitro usa l'ID persona UEFA come ancora esterna immutabile. L'ID canonico locale riusa quello MD2 quando un nome ufficiale o alias verificato vi corrisponde; negli altri casi segue `uefa-referee:<paese-uefa>:<nome-ufficiale>`.

- 628/628 designazioni target provengono dal feed ufficiale UEFA.
- 628/628 hanno un controllo nominale ESPN.
- 18 arbitri sono collegati agli ID canonici già validati in Fase 2A.
- Sven Jablonski compare una sola volta nel registro canonico: `uefa-referee:deu:sven-jablonski`.
- Nicholas Walsh/Nick Walsh compare una sola volta: `uefa-referee:sco:nicholas-walsh`, con ID persona UEFA e alias provider.
- La discrepanza di carriera 179/180 gare di Nicholas Walsh non è stata risolta né sovrascritta: questo dataset contiene soltanto le sue 4 presenze Champions nel periodo coperto e non deve correggere un totale carriera di altra fonte.

È presente un conflitto nominale reale fra fonti: Liverpool–Galatasaray del 18 marzo 2026 (`ucl:2025-26:2048056`) indica Paweł Raczkowski nel feed UEFA e Szymon Marciniak nel riepilogo ESPN. Viene mantenuta la designazione UEFA; l'anomalia resta esplicita nel quality report.

## Informazioni individuali

Sono incluse soltanto righe con `appearances > 0`: giocatore, squadra, ruolo provider, titolarità, gialli, secondi gialli, rossi diretti, falli e minuti osservati derivati. Sedici record disciplinari riferiti a giocatori in distinta ma senza presenza sono esclusi dai target; tra questi vi sono tre rossi diretti da panchina/non partecipante, che spiegano le tre differenze rosse rispetto al boxscore squadra.

I minuti non sono un dato pre-match né una misura ufficiale al secondo: sono derivati da titolarità, sostituzioni ed espulsioni, limitati a 90/120 e senza precisione del recupero. Restano un campo di outcome/esposizione e non entrano nelle feature prepartita.

## Controlli di coerenza

- ID partita duplicati: 0.
- chiavi partita/squadra duplicate: 0.
- chiavi partita/giocatore duplicate: 0.
- errori aritmetici dei cartellini: 0.
- errori di riconciliazione cartellini squadra→match: 0.
- errori di riconciliazione cartellini giocatore→squadra: 0.
- failure cronologiche negli split: 0.
- righe squadra con gialli event-level diversi dal boxscore: 71/1.256; entrambi i valori sono conservati, senza fusione.
- righe squadra con rossi event-level diversi dal boxscore: 3/1.256; sono i tre rossi a non partecipanti esclusi.
- righe squadra con falli diversi dalla somma individuale: 377/1.256; nessuna ricostruzione artificiale.
- snapshot raw verificati con SHA-256: 764/764.

## Verificabilità temporale pre-match

Le percentuali seguenti sono calcolate per celle candidate all'interno di ciascun dataset; non vengono aggregate tra mercati eterogenei.

| Dataset | Celle candidate | Verificate pre-kickoff | Non verificate | Non disponibili | Percentuale verificata |
|---|---:|---:|---:|---:|---:|
| Totali match | 9.420 | 6.080 | 2.850 | 490 | 64,54% |
| Cartellini squadra | 18.840 | 12.160 | 5.700 | 980 | 64,54% |
| Individuali condizionati alla presenza | 96.555 | 88.895 | 0 | 7.660 | 92,07% |

Regola temporale: per una gara con kickoff `t`, i prior usano soltanto gare con kickoff strettamente minore di `t`. Le gare simultanee vengono prima lette tutte e poi aggiornano gli accumulatori in un unico batch. Le 125 gare 2021/22 forniscono burn-in, ma non compaiono nei target o negli split.

Le percentuali non trasformano in feature valide la conoscenza post-match del partecipante. Nel dataset individuale il prior storico del giocatore è temporalmente corretto, ma la selezione della riga “questo giocatore scenderà in campo” resta un outcome. Ruolo, titolarità, minuti, statistiche ed eventi della gara corrente sono marcati post-match e non utilizzabili come predittori.

Le designazioni storiche sono ufficiali, ma gli snapshot sono stati acquisiti dopo le partite e non includono il timestamp originario di pubblicazione. Perciò 0/628 assegnazioni hanno disponibilità pre-kickoff dimostrata: identità e prior arbitro sono presenti per analisi, ma bloccati nel training rigoroso.

Esito anti-leakage: `PASS_WITH_DOCUMENTED_EXCLUSIONS`.

## Rolling origin e baseline

| Fold | Training | Validazione | Gare train | Gare validation | Cronologia |
|---|---|---|---:|---:|---|
| 1 | 2022/23 | 2023/24 | 125 | 125 | PASS |
| 2 | 2022/23–2023/24 | 2024/25 | 250 | 189 | PASS |
| 3 | 2022/23–2024/25 | 2025/26 | 439 | 189 | PASS |

Baseline specificate, non stimate:

- Totali match senza arbitro: intercetta competizione/stagione più tassi disciplinari strettamente precedenti di squadra casa e squadra trasferta.
- Squadra senza arbitro: tasso precedente della squadra, tasso precedente dell'avversaria e indicatore casa/trasferta.
- Individuale senza arbitro: baseline di ricerca condizionata alla presenza basata esclusivamente su storia precedente di cartellini/falli del giocatore. La presenza e i minuti effettivi non sono predittori.

Non sono stati scelti pesi, distribuzioni definitive, soglie di regolarizzazione o probabilità. Poisson, negative-binomial, modelli ordinali o hazard restano candidati da confrontare soltanto in Fase 2C tramite gli split già fissati e contro le baseline senza arbitro.

## Prontezza alla calibrazione

| Mercato | Stato | Motivazione |
|---|---|---|
| Totali cartellini match | `READY_FOR_BASELINE_CALIBRATION_ONLY` | 628 target completi; effetto arbitro bloccato dal timestamp di pubblicazione assente. |
| Cartellini squadra | `READY_FOR_BASELINE_CALIBRATION_ONLY` | 1.256 target completi; usare i falli squadra, non somme individuali non riconciliate. |
| Cartellino individuale condizionato alla presenza | `PARTIAL_RESEARCH_READY` | 19.311 presenze e target completi, ma universo dei partecipanti noto soltanto post-match. |
| Cartellino individuale incondizionato | `NOT_READY` | manca una fonte/versione pre-kickoff per probabili/ufficiali e un modello di partecipazione temporalmente corretto. |
| Secondo giallo o rosso diretto come mercati separati | `NOT_READY` | eventi rari (52 e 55) e nessuna calibrazione dedicata; mantenerli distinti nei dati. |

## Problemi da risolvere prima dell'effetto arbitrale/individuale

1. Archiviare le future designazioni UEFA al momento della pubblicazione, con timestamp e prova che precedano il kickoff.
2. Versionare probabili formazioni e distinte ufficiali con `retrievedAt` precedente al momento della previsione.
3. Definire una fonte ufficiale o una regola di qualità per i falli individuali storici; non sostituire i 377 mismatch con il totale squadra.
4. Verificare manualmente il conflitto Raczkowski/Marciniak mantenendo nel frattempo UEFA come autorità.
5. Conservare la discrepanza 179/180 di Walsh come questione separata di carriera, senza contaminare i conteggi Champions match-level.
6. Stabilire in Fase 2C metriche, minimi campionari e criteri di confronto; nessuna soglia è stata inventata qui.

## Test e isolamento dal progetto attivo

Il test 2B valida identità, duplicati, aritmetica, riconciliazione, split, hash raw, riproducibilità byte-per-byte e hash delle superfici protette prima/dopo la rigenerazione. La rigenerazione non modifica motore tiri/SOT, pronostici, schedina, letture, CSS, UI o builder attivi.

Test attivi eseguiti senza build:

- PASS: motore pronostici generale.
- PASS: integrazione Champions MD2.
- PASS: schedina Champions MD2.
- PASS: schedina Serie A.
- Failure concorrente/preesistente: `test-champions-pilot-predictions.js`, requisito link diretto alle letture.
- Failure concorrente/preesistente: `test-champions-reading-page.mjs`, conteggio atteso 3 ma osservato 8.

Le due failure non coinvolgono file 2B e non sono state nascoste aggiornando hash o aspettative.

## Fonti e riproducibilità

- [UEFA match feed `phase=TOURNAMENT`](https://match.uefa.com/v5/matches?competitionId=1&seasonYear=2026&phase=TOURNAMENT&order=ASC&offset=0&limit=250): calendario, kickoff, squadre, risultato, arbitro centrale, ID persona e paese.
- [ESPN public match summary (esempio di endpoint archiviato)](https://site.api.espn.com/apis/site/v2/sports/soccer/uefa.champions/summary?event=652586): boxscore squadra, roster/presenze, eventi disciplinari, sostituzioni, falli e controllo nominale arbitro.
- Ogni riga conserva i percorsi raw e i timestamp di acquisizione; il manifest conserva SHA-256 e dimensione di ogni snapshot.
- Lo snapshot 2025/26 già presente nel repository è riusato e marcato come tale; gli altri raw sono isolati sotto la cartella Fase 2B.

Conclusione: Fase 2B completata. È possibile autorizzare una Fase 2C limitata alla calibrazione delle baseline match/team senza arbitro. La calibrazione con effetto arbitrale e la previsione individuale incondizionata restano bloccate dai requisiti temporali sopra indicati.
