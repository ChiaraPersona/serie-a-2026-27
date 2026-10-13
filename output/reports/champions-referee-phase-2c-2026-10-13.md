# Champions League 2026/27 — Report Fase 2C

Data di esecuzione: 13 ottobre 2026. Stato: ricerca isolata, nessuna integrazione nel motore attivo.

## Esito esecutivo

La baseline per i cartellini totali partita e per i cartellini squadra è stata calibrata in walk-forward su 628 partite storiche. Le valutazioni out-of-sample coprono 503 partite e 1.006 righe squadra. I mercati match-level Over 3,5 / 4,5 / 5,5 dispongono rispettivamente di 273, 196 e 113 eventi positivi OOS e sono utilizzabili per ulteriore ricerca/calibrazione. Non sono ancora pubblicabili.

L'effetto arbitrale gerarchico produce miglioramenti puntuali molto piccoli. Tutti gli intervalli bootstrap al 95% delle differenze A/B includono zero. Il parametro di shrinkage selezionato è sempre il massimo della griglia (`k=80`), segnale che i dati chiedono una contrazione forte verso nessun effetto. Non esiste evidenza sufficiente per attivare l'identità dell'arbitro nel motore.

La disponibilità temporale delle designazioni è verificata per 481/628 partite (76,59%) all'orizzonte strettamente pre-kickoff, ma soltanto per 33/628 (5,25%) almeno 48 ore prima. La previsione anticipata resta bloccata.

## Dataset e target

Input riutilizzati senza modifica:

- 628 partite Champions, stagioni 2022/23–2025/26: 125, 125, 189, 189.
- 1.256 osservazioni squadra.
- Fold esterni rolling-origin già validati: 2022/23→2023/24, 2022/23–2023/24→2024/25, 2022/23–2024/25→2025/26.
- Test OOS aggregato: 503 partite / 1.006 osservazioni squadra.

Le definizioni restano separate:

| Target | Match: somma / media | Squadra: somma / media | Uso |
|---|---:|---:|---|
| Gialli ordinari | 2.364 / 3,764 | 2.364 / 1,882 | Descrittivo separato |
| Secondi gialli | 52 / 0,083 | 52 / 0,041 | Descrittivo, troppo raro |
| Rossi diretti | 55 / 0,088 | 55 / 0,044 | Descrittivo, troppo raro |
| `totalCards` | 2.471 / 3,935 | 2.471 / 1,967 | Target modellato |

`totalCards = yellowCards + secondYellowCards + directRedCards`. Non sono stati sostituiti i conteggi con i boxscore del provider e non sono stati uniti gialli, espulsioni o definizioni eterogenee.

## Feature e anti-leakage

Feature ammesse, tutte calcolate solo su gare con kickoff strettamente precedente e con aggiornamento a batch per gare simultanee:

- medie UCL pregresse di cartellini totali e gialli delle due squadre;
- medie UCL pregresse di falli e rigori;
- numerosità pregressa del campione;
- indicatore casa/trasferta nel modello squadra;
- indicatori espliciti di campione pregresso assente.

Imputazione mediana, standardizzazione, scelta feature, famiglia e iperparametri sono appresi esclusivamente nel training interno di ciascun fold. Sono esclusi formazioni e partecipanti effettivi, minuti reali, eventi/statistiche della gara target, ruoli post-match e aggregati arbitrali contenenti la gara corrente o futura.

Esito anti-leakage: **PASS**. Non è stata rilevata alcuna feature post-kickoff nel design matrix. L'identità arbitrale è usata solo nell'esperimento B e l'effetto di ogni arbitro è stimato sulle sole gare precedenti al test.

## Verificabilità delle designazioni

Orizzonti:

- `preKickoff`: timestamp o limite superiore della data editoriale strettamente precedente al kickoff;
- `advance48h`: la stessa evidenza deve precedere il kickoff di almeno 48 ore.

Classificazione complessiva:

| Stagione | UEFA con timestamp originale | Archivio indiretto pre-kickoff | Non verificabile | Utilizzabile ≥48h |
|---|---:|---:|---:|---:|
| 2022/23 | 1 | 101 | 23 | 17 |
| 2023/24 | 1 | 89 | 35 | 2 |
| 2024/25 | 3 | 153 | 33 | 9 |
| 2025/26 | 1 | 132 | 56 | 5 |
| Totale | 6 | 475 | 147 | 33 |

Le sei evidenze originali derivano da pagine UEFA datate e vengono ammesse solo quando la data della pagina precede la partita e il testo acquisito contiene entrambe le squadre e l'arbitro. Le pagine stagionali UEFA vengono aggiornate nel tempo: non si è quindi attribuito il timestamp finale della pagina alle designazioni più vecchie. Sono stati ammessi soltanto gli incontri dimostrabili dopo la data editoriale visibile.

L'archivio Law 5 è classificato come **evidenza indiretta**, non ufficiale. Sono state acquisite tutte le 399 voci dichiarate dal feed paginato. Per essere ammessa, una voce deve contenere squadre e arbitro e avere sia `published` sia `updated` prima del kickoff. Cinquantatré partite con contenuto corrispondente ma aggiornamento al kickoff o successivo sono state escluse. Il timestamp di acquisizione del 2026 non viene mai usato come timestamp storico.

Nei soli fold OOS, 379/503 partite (75,35%) sono certificabili pre-kickoff e 16/503 (3,18%) a 48 ore. Per questo il confronto arbitrale completo resta retrospettivo; il sottoinsieme a 48 ore è troppo piccolo per inferenze affidabili.

Fonti principali: [UEFA 2022/23](https://www.uefa.com/uefachampionsleague/news/0279-160984c272a8-33199c37b805-1000--who-is-the-referee-which-officials-are-in-charge-of-the-uefa-ch/), [UEFA 2023/24](https://www.uefa.com/uefachampionsleague/news/0285-1901e8868056-42ef504cf9d0-1000--who-is-the-referee-which-officials-are-in-charge-of-the-uefa/), [UEFA 2024/25](https://www.uefa.com/uefachampionsleague/news/0291-1bde8fcaf724-c61c8f2d311c-1000--who-is-the-referee-which-officials-are-in-charge-of-the-uefa/), [UEFA 2025/26](https://www.uefa.com/uefachampionsleague/news/029d-1eba5b367fc8-1c51c5cbbd69-1000--who-is-the-referee-which-officials-are-in-charge-of-the-uefa/), [archivio Law 5](https://law5-theref.blogspot.com/search/label/Champions%20League). Una ricerca sulle federazioni ha trovato conferme puntuali, per esempio la [PZPN sul finale 2023](https://pzpn.pl/federacja/aktualnosci/2023-05-22/ogromny-sukces-szymona-marciniaka-polak-posedziuje-final-ligi-mistrzow), ma non un archivio completo con timestamp di pubblicazione per ogni gara.

## Baseline out-of-sample

Il log score riportato è il negative log score medio: valori più bassi sono migliori. Gli intervalli sono bootstrap cluster per partita, 500 repliche deterministiche, seed 20261013.

### Conteggio cartellini totali partita

| Modello | N OOS | MAE (IC95%) | Log score (IC95%) | Brier O3,5 | Brier O4,5 | Brier O5,5 |
|---|---:|---:|---:|---:|---:|---:|
| Media storica + Poisson | 503 | 1,801 (1,688–1,917) | 2,196 (2,133–2,267) | 0,2511 | 0,2384 | 0,1743 |
| Poisson con feature | 503 | 1,797 (1,692–1,918) | 2,190 (2,136–2,259) | 0,2501 | 0,2405 | 0,1735 |
| Negative binomial | 189 | 1,750 (1,576–1,907) | 2,129 (2,054–2,196) | 0,2475 | 0,2302 | 0,1556 |

La negative binomial è identificabile e selezionata soltanto nel terzo fold, quindi il suo confronto riguarda 189 partite, non tutte le 503. Rispetto alla media storica, l'IC95% della differenza di log score è -0,0769 / +0,0187: il punto stimato favorisce la NB, ma il miglioramento non è robusto. Il Poisson con feature non supera con certezza la media storica su nessuna metrica principale.

Calibrazione della baseline A selezionata fold per fold:

| Soglia | Eventi / N | Tasso osservato | Probabilità media | Brier | ECE-5 |
|---|---:|---:|---:|---:|---:|
| Over 3,5 | 273 / 503 | 0,5427 | 0,5645 | 0,2492 | 0,0505 |
| Over 4,5 | 196 / 503 | 0,3897 | 0,3836 | 0,2405 | 0,0644 |
| Over 5,5 | 113 / 503 | 0,2247 | 0,2357 | 0,1760 | 0,0324 |

### Conteggio cartellini squadra

| Modello | N OOS | MAE (IC95%) | Log score (IC95%) | Brier O3,5 | Brier O4,5 | Brier O5,5 |
|---|---:|---:|---:|---:|---:|---:|
| Media storica + Poisson | 1.006 | 1,100 (1,047–1,156) | 1,693 (1,659–1,728) | 0,1220 | 0,0386 | 0,0109 |
| Poisson con feature | 1.006 | 1,123 (1,073–1,178) | 1,699 (1,661–1,737) | 0,1227 | 0,0398 | 0,0113 |

La negative binomial non è identificabile nei fold squadra: il target è quasi equidisperso (indice complessivo 0,976). Il Poisson con feature peggiora il MAE rispetto alla media storica; l'IC95% della differenza è +0,0003 / +0,0416. La baseline semplice resta il riferimento.

Gli Over squadra hanno 143, 40 e 11 eventi positivi. Over 4,5 e soprattutto Over 5,5 squadra non hanno numerosità sufficiente per una calibrazione stabile.

## Esperimento A/B con arbitro

Modello A: famiglia e feature selezionate solo sul training interno. Modello B: stesso modello e stesse osservazioni, moltiplicatore arbitrale Gamma-Poisson con shrinkage verso 1; `k` scelto solo sul training interno. Arbitri non visti ricevono effetto neutro 1.

| Livello | Modello | MAE | Log score | Brier O3,5 | Brier O4,5 | Brier O5,5 |
|---|---|---:|---:|---:|---:|---:|
| Partita | A senza arbitro | 1,8047 | 2,1907 | 0,2492 | 0,2405 | 0,1760 |
| Partita | B con arbitro | 1,7986 | 2,1882 | 0,2481 | 0,2394 | 0,1750 |
| Squadra | A senza arbitro | 1,1189 | 1,7000 | 0,1234 | 0,0400 | 0,0112 |
| Squadra | B con arbitro | 1,1206 | 1,6986 | 0,1228 | 0,0402 | 0,0112 |

Differenze B−A, IC95% bootstrap:

- partita: MAE -0,0228 / +0,0128; log score -0,0111 / +0,0062;
- squadra: MAE -0,0049 / +0,0095; log score -0,0061 / +0,0039;
- tutti gli IC Brier per le tre soglie attraversano zero.

Per stagione il log score partita passa A→B da 2,2282→2,2252, 2,2278→2,2271 e 2,1287→2,1250. Il miglioramento è piccolo in ciascun fold. Per storico arbitrale il comportamento non è monotono: sui match B migliora nei bucket 1–2 e 6–10, peggiora nei bucket 3–5 e 11+, ed è identico per arbitri non visti. Sulle righe squadra il MAE peggiora nei bucket 3–5 e 11+. Non emerge una regione stabile in cui l'effetto arbitrale sia affidabile.

## Integrità, determinismo e regressioni

- Integrità Fase 2C: PASS (628 ID unici, cronologia fold, target arithmetic, probabilità finite, campione A/B identico).
- Riproducibilità: PASS; importer, manifest, risultati e predizioni OOS hanno hash identici alla riesecuzione.
- Superficie protetta: invariata durante la riesecuzione.
- Integrità Fase 2B: PASS.
- Integrazione MD2 e schedina Champions: PASS.
- Test tiri/SOT: tutte le asserzioni dati/volumi/SOT precedenti sono passate; la suite si arresta poi su un contratto preesistente e non pertinente relativo alla stringa del link diretto alle letture (`test-champions-pilot-predictions.js:70`).
- Test pagina letture: fallimento preesistente separato, conteggio corrente 8 contro expected 3 (`test-champions-reading-page.mjs:115`). Nessun expected è stato modificato.

## Prontezza per mercato

| Mercato | Stato 2C | Motivo |
|---|---|---|
| Conteggio `totalCards` partita, senza arbitro | Research-ready | 503 OOS; baseline e incertezza disponibili |
| Over 3,5 / 4,5 / 5,5 partita, senza arbitro | Research-ready, non pubblicabile | 273 / 196 / 113 eventi; calibrazione ancora variabile per stagione |
| Conteggio `totalCards` squadra, senza arbitro | Research-ready | 1.006 OOS; media storica preferibile al modello più complesso |
| Over 3,5 squadra | Parziale | 143 eventi, richiede validazione esterna/nuova stagione |
| Over 4,5 / 5,5 squadra | Bloccato | Solo 40 / 11 eventi OOS |
| Effetto arbitrale pre-kickoff | Sperimentale retrospettivo | Guadagni non robusti; 147 designazioni senza timestamp verificabile |
| Effetto arbitrale a 48 ore | Bloccato | Solo 33/628 storiche e 16/503 OOS certificate |
| Secondi gialli e rossi diretti | Bloccato | Eventi troppo rari per modelli separati affidabili |
| Cartellini individuali | Fuori scope / ancora bloccato | Manca universo partecipanti pre-match temporalmente certificato |

## Raccomandazione

Non integrare ancora il modulo arbitrale nel motore. La successiva fase dovrebbe:

1. acquisire timestamp ufficiali o archiviati delle designazioni, con priorità all'orizzonte operativo scelto (48h o altro anticipo esplicito);
2. aggiungere almeno una stagione OOS e una validazione esterna, senza riutilizzarla per tuning;
3. ampliare la griglia di shrinkage includendo valori oltre 80 e il caso nullo esplicito, perché il tuning corrente finisce sempre al limite superiore;
4. valutare drift di stagione e ricalibrazione monotona delle soglie solo sul training;
5. mantenere bloccati mercati squadra rari, espulsioni e individuali finché non cresce la numerosità e non esiste un processo pre-match delle formazioni.

Conclusione: **baseline pronta per ulteriore calibrazione controllata; modulo arbitrale non pronto per l'integrazione o la pubblicazione**.
