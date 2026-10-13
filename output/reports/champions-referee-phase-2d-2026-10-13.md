# Champions League 2026/27 — Report Fase 2D

Data: 13 ottobre 2026. Stato: esperimento isolato; nessuna integrazione, pubblicazione o modifica al motore attivo.

## Verdetto

**Non attivare l'effetto arbitrale.**

Il correttivo con shrinkage produce piccoli miglioramenti puntuali nel holdout 2025/26, ma nessun intervallo bootstrap al 95% per MAE, log score o Brier Over esclude l'effetto nullo. La calibrazione peggiora su alcune soglie e l'Over 5,5 squadra peggiora con intervallo interamente sfavorevole. Il risultato non soddisfa il criterio decisionale richiesto.

La baseline senza arbitro, invece, migliora in modo robusto la media storica sul conteggio match e sul log score squadra. È research-ready, ma non ancora autorizzata alla pubblicazione.

## Estensione storica

È stata promossa da burn-in a campione di analisi la stagione Champions 2021/22, usando gli stessi feed, parser e definizioni della Fase 2B.

| Stagione | Partite | Righe squadra | Copertura cartellini | Copertura falli |
|---|---:|---:|---:|---:|
| 2021/22 | 125 | 250 | 100% | 100% |
| 2022/23 | 125 | 250 | 100% | 100% |
| 2023/24 | 125 | 250 | 100% | 100% |
| 2024/25 | 189 | 378 | 100% | 100% |
| 2025/26 | 189 | 378 | 100% | 100% |
| Totale | 753 | 1.506 | 100% | 100% |

Sono presenti 23.119 presenze giocatore e 75 arbitri canonici. Non risultano duplicati, errori di aritmetica cartellini, disallineamenti squadra-partita o violazioni cronologiche.

Rimangono distinte le variabili `yellowCards`, `secondYellowCards`, `directRedCards` e `totalCards`; il target modellato è `totalCards = yellowCards + secondYellowCards + directRedCards`.

## Split e holdout

Selezione e tuning sono effettuati esclusivamente su tre fold di sviluppo:

1. train 2021/22, validazione 2022/23;
2. train 2021/22–2022/23, validazione 2023/24;
3. train 2021/22–2023/24, validazione 2024/25.

Dopo il blocco di famiglia, feature e shrinkage, i modelli sono riaddestrati sul 2021/22–2024/25 e valutati una sola volta sul 2025/26 completo: 189 partite e 378 righe squadra.

Limite: il 2025/26 era già apparso nei risultati della Fase 2C. È completamente escluso dal tuning 2D, ma non può essere definito un holdout mai osservato a livello organizzativo. Per una conferma definitiva servirà una nuova stagione futura.

## Modelli selezionati

| Livello | Modello senza arbitro | Shrinkage arbitrale selezionato |
|---|---|---:|
| Partita | Negative binomial, feature compatte, α=0,05 | k=160 |
| Squadra | Poisson, feature compatte | k=160 |

La griglia arbitrale comprende effetto nullo, k=20, 40, 80, 160, 320, 640 e 1.280. Sullo sviluppo, k=160 minimizza il log score sia per match sia per squadra, ma il margine rispetto all'effetto nullo è molto ridotto:

- match: log score 2,1700 nullo contro 2,1680 con k=160;
- squadra: 1,6998 nullo contro 1,6986 con k=160.

## Holdout finale — cartellini totali partita

Il log score è negative log score: valori inferiori sono migliori.

| Modello | N | MAE | Log score | Brier O3,5 | Brier O4,5 | Brier O5,5 |
|---|---:|---:|---:|---:|---:|---:|
| Media storica | 189 | 1,7760 | 2,1611 | 0,2596 | 0,2290 | 0,1530 |
| A senza arbitro | 189 | 1,7405 | 2,1272 | 0,2497 | 0,2257 | 0,1519 |
| B con arbitro, k=160 | 189 | 1,7285 | 2,1224 | 0,2465 | 0,2231 | 0,1512 |

Baseline A rispetto alla media storica, differenza A−storica:

- MAE IC95%: **[-0,0699; -0,0026]**;
- log score: **[-0,0626; -0,0058]**;
- Brier Over 3,5: **[-0,0181; -0,0015]**;
- Brier Over 4,5 e 5,5: intervalli comprendenti zero.

La baseline senza arbitro migliora quindi robustamente conteggio/log score e Over 3,5, ma non dimostra un vantaggio robusto sugli Over più alti.

Effetto arbitrale B rispetto ad A:

| Metrica B−A | Stima mediana bootstrap | IC95% |
|---|---:|---:|
| MAE | -0,0119 | -0,0367 / +0,0098 |
| Log score | -0,0051 | -0,0152 / +0,0057 |
| Brier Over 3,5 | -0,0032 | -0,0074 / +0,0006 |
| Brier Over 4,5 | -0,0026 | -0,0065 / +0,0013 |
| Brier Over 5,5 | -0,0008 | -0,0037 / +0,0023 |

Nessun intervallo esclude zero.

La calibrazione è mista: l'ECE-5 passa da 0,0497 a 0,0754 per Over 3,5 e da 0,0200 a 0,0340 per Over 4,5, quindi peggiora nonostante il Brier puntuale inferiore. Over 5,5 migliora leggermente da 0,0542 a 0,0498.

## Holdout finale — cartellini squadra

| Modello | N | MAE | Log score | Brier O3,5 | Brier O4,5 | Brier O5,5 |
|---|---:|---:|---:|---:|---:|---:|
| Media storica | 378 | 1,0713 | 1,6605 | 0,1060 | 0,0314 | 0,00544 |
| A senza arbitro | 378 | 1,0672 | 1,6430 | 0,1052 | 0,03125 | 0,00540 |
| B con arbitro, k=160 | 378 | 1,0631 | 1,6402 | 0,1045 | 0,03124 | 0,00545 |

La baseline A migliora robustamente il log score rispetto alla media storica, IC95% **[-0,0310; -0,0043]**, ma non MAE o Brier Over.

Effetto B−A:

- MAE IC95%: [-0,0134; +0,0045];
- log score: [-0,0091; +0,0035];
- Brier Over 3,5: [-0,0021; +0,0005];
- Brier Over 4,5: [-0,00044; +0,00036];
- Brier Over 5,5: **[+0,00001; +0,00011]**, peggioramento robusto seppure piccolo.

L'ECE di Over 3,5 peggiora da 0,0204 a 0,0309. I mercati squadra Over 4,5 e 5,5 rimangono poco numerosi e non sono calibrabili in modo stabile.

## Stabilità per stagione e segmenti

Sui fold di sviluppo il correttivo arbitrale non è coerente:

| Validazione | Δ log score match B−A | Δ log score squadra B−A |
|---|---:|---:|
| 2022/23 | +0,0044, peggiora | +0,0026, peggiora |
| 2023/24 | -0,0032 | -0,0020 |
| 2024/25 | -0,0054 | -0,0031 |
| Holdout 2025/26 | -0,0048 | -0,0028 |

Per numerosità arbitrale, il modello è neutro sugli arbitri non visti, peggiora leggermente il bucket 1–2 partite e migliora soprattutto il piccolo bucket 3–5. Non emerge una relazione monotona con la quantità di storico.

Per disciplina pregressa delle squadre:

- segmento basso: il log score peggiora di +0,0027 match e +0,0019 squadra;
- segmento medio: migliora di -0,0055 e -0,0036;
- segmento alto: migliora di -0,0296 e -0,0173, ma comprende solo 16 match / 32 righe squadra.

Il segnale appare concentrato in un segmento piccolo e non giustifica una correzione generale. Non sono state applicate correzioni manuali o interazioni post-hoc.

L'interazione tra competizioni non è identificabile: il dataset contiene esclusivamente UEFA Champions League. Campionati nazionali e altre competizioni non sono stati mescolati.

## Evidenze temporali delle designazioni

| Stagione | UEFA diretta | Indiretta pre-kickoff | Non verificabile | ≥48h |
|---|---:|---:|---:|---:|
| 2021/22 | 1 | 107 | 17 | 5 |
| 2022/23 | 1 | 101 | 23 | 17 |
| 2023/24 | 1 | 89 | 35 | 2 |
| 2024/25 | 3 | 153 | 33 | 9 |
| 2025/26 | 1 | 132 | 56 | 5 |
| Totale | 7 | 582 | 164 | 38 |

Copertura pre-kickoff: 589/753, 78,22%. Copertura ad almeno 48 ore: 38/753, 5,05%.

È stata aggiunta la [designazione UEFA ufficiale di Clément Turpin per la finale 2022](https://www.uefa.com/news/0275-151e8ecbd274-6977b4d49988-1000--clement-turpin-to-referee-final/), pubblicata il 11 maggio per la gara del 28 maggio. Restano valide le fonti UEFA stagionali 2022/23–2025/26 e l'archivio indiretto Law 5. Sono escluse 65 partite con contenuto corrispondente ma timestamp `updated` al kickoff o successivo.

Nel holdout 2025/26 sono verificabili 133/189 designazioni pre-kickoff, ma solo 5/189 a 48 ore. Sul sottoinsieme pre-kickoff tutti gli IC95% B−A includono zero. Sul campione a 48 ore l'inferenza è esplicitamente trattenuta.

## Anti-leakage e riproducibilità

- Feature di squadra, trasformazioni, famiglia, alpha e shrinkage sono appresi esclusivamente prima del fold valutato.
- Formazioni effettive, partecipanti, minuti reali, eventi e statistiche della gara target sono esclusi.
- Il holdout 2025/26 non partecipa a selezione o tuning 2D.
- 1.000 bootstrap cluster per partita, seed fisso 20261013.
- Riesecuzione completa: output Phase 2D identici.
- Hash Fasi 2B, 2C e campione Fantachampions controllato: invariati.

Durante il controllo lungo sono cambiati contemporaneamente `js/pages/champions.js`, `css/champions.css` e `scripts/build-site.js`. Gli script 2D non leggono né scrivono questi file; la verifica della superficie attiva è quindi registrata come inconcludente per modifiche concorrenti, non come regressione 2D.

Test:

- Fase 2D, 2C e 2B: PASS.
- Schedina MD2: PASS.
- Test quantitativi tiri/SOT eseguiti prima dell'asserzione estranea sui link: PASS; la suite completa conserva il fallimento preesistente sul link diretto.
- Letture: fallimento preesistente 8 contro expected 3.
- Integrazione/formazioni MD2: fallimenti durante modifiche concorrenti ai rispettivi source, builder e test; nessun expected è stato modificato dalla Fase 2D.

## Decisioni per mercato

| Area | Verdetto |
|---|---|
| Effetto arbitrale | **NON UTILIZZABILE / NON ATTIVARE** |
| Totali `totalCards` partita senza arbitro | Research-ready; vantaggio robusto sulla media storica |
| Over 3,5 partita senza arbitro | Research-ready, vantaggio OOS robusto |
| Over 4,5 / 5,5 partita | Ancora non robusti |
| Cartellini squadra | Baseline research-ready; correttivo arbitro respinto |
| Over squadra alti | Bloccati per rarità e peggioramento O5,5 |
| Secondi gialli / rossi diretti | Bloccati, eventi troppo rari |
| Cartellini individuali | Bloccati: manca un universo partecipanti pre-match certificato |

## Raccomandazione

Fermarsi prima dell'integrazione. Conservare k=160 come solo risultato sperimentale, non come parametro operativo. La verifica successiva deve usare una stagione futura realmente mai osservata, aumentare la copertura ufficiale almeno 48 ore prima del kickoff e ripetere il confronto senza riaprire la selezione sui risultati del nuovo holdout.
