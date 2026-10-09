# Serie A 2026/27 — Fase 5C: validazione statistica SOT e corner

Generato: 2026-10-09T22:14:26.184Z · data report: 2026-10-09

**Esito operativo: 0 dei 110 mercati B3 sono recuperabili in sicurezza oggi.** Le metriche retrospettive sono diagnostiche; il campione prospettico completato è 0 e ogni famiglia resta `INSUFFICIENT_DATA`. Catalogo, Engine V2, quote, MyCombo, UI, MD1–MD5, Champions e DUO non sono stati modificati.

## 1. Inventario e autenticità pre-partita

- Gare concluse MD1–MD5 con statistiche SOT/corner complete: **50**.
- Previsioni autentiche recuperate dal Git e committate prima del kickoff: **50/50**. `generatedAt` preciso: **41**; solo data: **9**.
- Commit distinti letti: **37**; versioni Engine: 4.10.0 (10), 4.11.0 (26), 4.12.0 (14).
- Snapshot prospettici MD6 immutabili: **10**; con esito disponibile/evaluabile: **0**.
- Baseline 2025/26: profilo squadra quando disponibile; fallback pooled di lega per: **frosinone, monza, venezia**.
- L’autenticità temporale della previsione è provata dal commit; la disponibilità temporale di ogni singolo input sorgente è solo parzialmente dimostrabile dai campi serializzati. Questo impedisce una certificazione anti-leakage completa.

La griglia delle soglie è quella commerciale Sisal MD6 corrente. È applicata retrospettivamente alle previsioni autentiche MD1–MD5; **non** viene presentata come storico delle quote offerte in quelle giornate.

## 2. Distribuzione corrente (`configuredVolumeAssessment`)

- SOT/corner squadra e partita: approssimazione Normale con media `central` e deviazione standard `sd`; `P(Over)=1-CDF((soglia-media)/sd)`.
- Mercati partita: media come somma delle medie squadra e deviazione standard ottenuta assumendo varianze indipendenti. Mercati squadra: marginale della singola squadra.
- Haircut: probabilità marginale × **0,92**; congiunta “entrambe” × **0,90** dopo il prodotto delle marginali.
- Clamp: nessuno nella probabilità del singolo volume; solo il calcolo della quota equa usa `max(0,0001, prudentProbability)`. La log loss di questo audit usa un clamp numerico 1e-15 esclusivamente per evitare log(0).
- Soglie mezze: la formula coincide con il confine continuo tra i due interi. Soglie intere: non viene modellata la massa di pareggio/push; servirebbe una distribuzione discreta o una regola condizionata al non-push.
- Natura discreta: la Normale ammette supporto negativo e non modella overdispersione, asimmetria, code o dipendenza tra le squadre. La coerenza commerciale va quindi dimostrata empiricamente, non presunta.

## 3. Accuratezza delle medie e calibrazione delle probabilità

Le due domande sono separate: MAE/RMSE/bias/copertura valutano la previsione del conteggio; Brier/log loss/ECE valutano le probabilità Over sulle soglie MD6.

| Famiglia | Cluster gara | Osservazioni conteggio | MAE modello | RMSE | Bias | Copertura p20–p80 | MAE baseline | Brier prudente | Brier baseline | ECE prudente | Gate |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| SOT partita | 50 | 50 | 2.934 | 3.523 | -1.298 | 0.680 | 3.016 | 0.151 | 0.149 | 0.154 | **INSUFFICIENT_DATA** |
| SOT squadra | 50 | 100 | 1.825 | 2.363 | -0.649 | 0.790 | 1.823 | 0.208 | 0.198 | 0.127 | **INSUFFICIENT_DATA** |
| Corner partita | 50 | 50 | 3.152 | 3.855 | -0.168 | 0.620 | 3.075 | 0.215 | 0.212 | 0.024 | **INSUFFICIENT_DATA** |
| Corner squadra | 50 | 100 | 2.426 | 3.010 | -0.084 | 0.680 | 2.434 | 0.227 | 0.231 | 0.030 | **INSUFFICIENT_DATA** |

Intervalli diagnostici al 95% (bootstrap a cluster gara, 1.000 repliche):
- SOT partita: MAE [2.440, 3.456]; bias [-2.202, -0.402]; copertura [0.560, 0.800]; Brier prudente [0.132, 0.175]; ΔBrier vs baseline [-0.011, 0.015]; ECE prudente [0.089, 0.224].
- SOT squadra: MAE [1.581, 2.086]; bias [-1.101, -0.201]; copertura [0.710, 0.870]; Brier prudente [0.194, 0.224]; ΔBrier vs baseline [-0.003, 0.023]; ECE prudente [0.056, 0.197].
- Corner partita: MAE [2.546, 3.782]; bias [-1.228, 0.904]; copertura [0.480, 0.760]; Brier prudente [0.189, 0.241]; ΔBrier vs baseline [-0.014, 0.020]; ECE prudente [0.016, 0.132].
- Corner squadra: MAE [2.059, 2.796]; bias [-0.614, 0.452]; copertura [0.570, 0.780]; Brier prudente [0.211, 0.245]; ΔBrier vs baseline [-0.018, 0.010]; ECE prudente [0.019, 0.113].

Le righe soglia della stessa gara non vengono considerate indipendenti. La baseline usa esclusivamente i valori squadra 2025/26; per i totali partita usa la convoluzione indipendente delle due distribuzioni storiche.

### Calibration curve prudente ×0,92

| Famiglia | Bin | N | Probabilità media | Frequenza osservata |
|---|---|---:|---:|---:|
| SOT partita | 0.0-0.2 | 0 | N/D | N/D |
| SOT partita | 0.2-0.4 | 21 | 0.346 | 0.762 |
| SOT partita | 0.4-0.6 | 74 | 0.508 | 0.622 |
| SOT partita | 0.6-0.8 | 115 | 0.710 | 0.870 |
| SOT partita | 0.8-1.0 | 90 | 0.848 | 0.967 |
| SOT squadra | 0.0-0.2 | 5 | 0.163 | 0.400 |
| SOT squadra | 0.2-0.4 | 58 | 0.320 | 0.448 |
| SOT squadra | 0.4-0.6 | 108 | 0.508 | 0.630 |
| SOT squadra | 0.6-0.8 | 119 | 0.692 | 0.815 |
| SOT squadra | 0.8-1.0 | 10 | 0.827 | 1.000 |
| Corner partita | 0.0-0.2 | 0 | N/D | N/D |
| Corner partita | 0.2-0.4 | 13 | 0.368 | 0.385 |
| Corner partita | 0.4-0.6 | 95 | 0.509 | 0.526 |
| Corner partita | 0.6-0.8 | 129 | 0.707 | 0.736 |
| Corner partita | 0.8-1.0 | 13 | 0.826 | 0.846 |
| Corner squadra | 0.0-0.2 | 13 | 0.161 | 0.231 |
| Corner squadra | 0.2-0.4 | 77 | 0.314 | 0.273 |
| Corner squadra | 0.4-0.6 | 149 | 0.501 | 0.503 |
| Corner squadra | 0.6-0.8 | 151 | 0.697 | 0.656 |
| Corner squadra | 0.8-1.0 | 10 | 0.827 | 0.700 |

### Metriche per soglia

#### SOT partita

| Soglia | N | Frequenza Over | Brier centrale | Brier ×0,92 | Log loss ×0,92 | ECE ×0,92 | Brier baseline |
|---:|---:|---:|---:|---:|---:|---:|---:|
| 3.5 | 50 | 0.980 | 0.023 | 0.035 | 0.189 | 0.118 | 0.023 |
| 4.5 | 50 | 0.960 | 0.046 | 0.062 | 0.269 | 0.145 | 0.048 |
| 5.5 | 50 | 0.900 | 0.099 | 0.114 | 0.399 | 0.154 | 0.112 |
| 6.5 | 50 | 0.860 | 0.144 | 0.164 | 0.512 | 0.205 | 0.174 |
| 7.5 | 50 | 0.700 | 0.238 | 0.248 | 0.690 | 0.153 | 0.246 |
| 8.5 | 50 | 0.580 | 0.276 | 0.283 | 0.763 | 0.148 | 0.288 |

#### SOT squadra

| Soglia | N | Frequenza Over | Brier centrale | Brier ×0,92 | Log loss ×0,92 | ECE ×0,92 | Brier baseline |
|---:|---:|---:|---:|---:|---:|---:|---:|
| 2.5 | 100 | 0.810 | 0.156 | 0.165 | 0.510 | 0.109 | 0.161 |
| 3.5 | 100 | 0.670 | 0.203 | 0.212 | 0.614 | 0.116 | 0.200 |
| 4.5 | 100 | 0.550 | 0.238 | 0.248 | 0.693 | 0.157 | 0.234 |

#### Corner partita

| Soglia | N | Frequenza Over | Brier centrale | Brier ×0,92 | Log loss ×0,92 | ECE ×0,92 | Brier baseline |
|---:|---:|---:|---:|---:|---:|---:|---:|
| 5.5 | 50 | 0.860 | 0.122 | 0.128 | 0.428 | 0.082 | 0.127 |
| 6.5 | 50 | 0.740 | 0.202 | 0.201 | 0.593 | 0.028 | 0.204 |
| 7.5 | 50 | 0.640 | 0.242 | 0.239 | 0.674 | 0.042 | 0.230 |
| 8.5 | 50 | 0.560 | 0.258 | 0.257 | 0.708 | 0.048 | 0.247 |
| 9.5 | 50 | 0.420 | 0.253 | 0.249 | 0.692 | 0.030 | 0.250 |

#### Corner squadra

| Soglia | N | Frequenza Over | Brier centrale | Brier ×0,92 | Log loss ×0,92 | ECE ×0,92 | Brier baseline |
|---:|---:|---:|---:|---:|---:|---:|---:|
| 2.5 | 100 | 0.720 | 0.208 | 0.203 | 0.598 | 0.024 | 0.202 |
| 3.5 | 100 | 0.570 | 0.261 | 0.252 | 0.700 | 0.067 | 0.258 |
| 4.5 | 100 | 0.450 | 0.253 | 0.249 | 0.691 | 0.053 | 0.253 |
| 5.5 | 100 | 0.310 | 0.208 | 0.205 | 0.600 | 0.075 | 0.213 |

## 4. Controlli anti-leakage

- Disponibilità pre-kickoff provata dal timestamp esatto del commit: **50/50**; commit successivi o uguali al kickoff: **0**. Il `generatedAt` è preciso in 41 casi e date-only in 9.
- Duplicati per partita: **0**.
- Training/test: la baseline 2025/26 è temporalmente precedente; l’Engine è valutato su MD1–MD5. Tuttavia le versioni del motore cambiano nel periodo e non esiste ancora un holdout prospettico completato.
- Le soglie MD6 sono fissate senza usare gli esiti MD1–MD5, ma costituiscono una griglia diagnostica retrospettiva; non sono state usate per rifittare formule o haircut.
- Nessuna calibrazione è stata scelta e poi valutata sullo stesso campione. Gli haircut 0,92/0,90 sono soltanto misurati, non ottimizzati.
- Conclusione anti-leakage: timestamp/duplicati **PASS**; provenienza completa degli input e test temporale indipendente **NON DISPONIBILI**.

## 5. Gate quantitativo

Prerequisiti: ≥100 cluster gara conclusi, ≥30 non-push per soglia, ≥10 osservazioni per squadra, 100% timestamp verificati, zero duplicati, holdout temporale indipendente e provenienza completa degli input. Per `PASS`: limite superiore 95% di ΔBrier modello-baseline < 0, ECE ≤0,05 con limite superiore ≤0,08, bias assoluto ≤0,50 squadra/≤1,00 partita, copertura p20–p80 tra 0,50 e 0,70 e nessuna instabilità materiale per soglia/squadra.

Il campione ha solo 50 cluster, 5 osservazioni per squadra, versioni Engine multiple, 0 esiti prospettici MD6 e nessun holdout indipendente: la classificazione corretta è `INSUFFICIENT_DATA`, anche se una metrica descrittiva fosse favorevole.

| Famiglia | Gate | Motivo vincolante | Recuperabili ora |
|---|---|---|---:|
| SOT partita | **INSUFFICIENT_DATA** | 50 < 100 cluster; 0 prospettici; 5 < 10 per squadra; input vintage parziale | 0 |
| SOT squadra | **INSUFFICIENT_DATA** | 50 < 100 cluster; 0 prospettici; 5 < 10 per squadra; input vintage parziale | 0 |
| Corner partita | **INSUFFICIENT_DATA** | 50 < 100 cluster; 0 prospettici; 5 < 10 per squadra; input vintage parziale | 0 |
| Corner squadra | **INSUFFICIENT_DATA** | 50 < 100 cluster; 0 prospettici; 5 < 10 per squadra; input vintage parziale | 0 |
| Entrambe almeno X SOT | **INSUFFICIENT_DATA** | prodotto di marginali con indipendenza non validata | 0 |
| Corner 1X2 T.R. | **INSUFFICIENT_DATA** | distribuzione discreta congiunta del differenziale assente | 0 |

## 6. Simulazione diagnostica dei 110 B3

Riconciliati: **110/110**. Distribuzione marginale disponibile: **110/110**. Inseriti nel catalogo: **0**. Raccomandazioni generate: **0**.

| ID Sisal | Partita | Famiglia | Soglia | Quota | Media/SD | P centrale | P prudente | EV diagnostico | Gate |
|---|---|---|---:|---:|---|---:|---:|---:|---|
| 5369497834 | Genoa – Fiorentina | Corner partita | 6.5 | 1.22 | 8.10 / 3.06 | 0.700 | 0.643 | -21.49% | INSUFFICIENT_DATA |
| 5369524006 | Genoa – Fiorentina | Corner squadra | 2.5 | 1.18 | 4.30 / 2.06 | 0.809 | 0.744 | -12.19% | INSUFFICIENT_DATA |
| 5369497707 | Genoa – Fiorentina | Corner squadra | 2.5 | 1.22 | 3.80 / 2.26 | 0.717 | 0.660 | -19.48% | INSUFFICIENT_DATA |
| 5369497842 | Genoa – Fiorentina | Corner squadra | 3.5 | 1.45 | 4.30 / 2.06 | 0.651 | 0.599 | -13.14% | INSUFFICIENT_DATA |
| 5367463341 | Genoa – Fiorentina | SOT partita | 4.5 | 1.03 | 8.50 / 3.49 | 0.874 | 0.804 | -17.17% | INSUFFICIENT_DATA |
| 5337194627 | Genoa – Fiorentina | SOT partita | 5.5 | 1.09 | 8.50 / 3.49 | 0.805 | 0.741 | -19.28% | INSUFFICIENT_DATA |
| 5337194615 | Genoa – Fiorentina | SOT partita | 6.5 | 1.19 | 8.50 / 3.49 | 0.717 | 0.659 | -21.54% | INSUFFICIENT_DATA |
| 5337194619 | Genoa – Fiorentina | SOT partita | 7.5 | 1.36 | 8.50 / 3.49 | 0.613 | 0.564 | -23.33% | INSUFFICIENT_DATA |
| 5367456140 | Genoa – Fiorentina | SOT squadra | 2.5 | 1.25 | 4.61 / 2.78 | 0.776 | 0.714 | -10.75% | INSUFFICIENT_DATA |
| 5367456090 | Genoa – Fiorentina | SOT squadra | 2.5 | 1.10 | 3.90 / 2.11 | 0.747 | 0.687 | -24.45% | INSUFFICIENT_DATA |
| 5369498078 | Inter – Parma | Corner partita | 6.5 | 1.12 | 9.90 / 4.05 | 0.799 | 0.736 | -17.63% | INSUFFICIENT_DATA |
| 5369498061 | Inter – Parma | Corner partita | 7.5 | 1.25 | 9.90 / 4.05 | 0.723 | 0.665 | -16.82% | INSUFFICIENT_DATA |
| 5369524195 | Inter – Parma | Corner partita | 8.5 | 1.45 | 9.90 / 4.05 | 0.635 | 0.584 | -15.26% | INSUFFICIENT_DATA |
| 5369498092 | Inter – Parma | Corner squadra | 2.5 | 1.80 | 3.60 / 2.48 | 0.671 | 0.618 | 11.17% | INSUFFICIENT_DATA |
| 5369498070 | Inter – Parma | Corner squadra | 3.5 | 1.05 | 6.30 / 3.20 | 0.809 | 0.745 | -21.83% | INSUFFICIENT_DATA |
| 5369526687 | Inter – Parma | Corner squadra | 4.5 | 1.16 | 6.30 / 3.20 | 0.713 | 0.656 | -23.90% | INSUFFICIENT_DATA |
| 5369526621 | Inter – Parma | Corner squadra | 5.5 | 1.36 | 6.30 / 3.20 | 0.599 | 0.551 | -25.09% | INSUFFICIENT_DATA |
| 5337197167 | Inter – Parma | SOT partita | 5.5 | 1.03 | 8.50 / 3.20 | 0.826 | 0.760 | -21.75% | INSUFFICIENT_DATA |
| 5337197155 | Inter – Parma | SOT partita | 6.5 | 1.08 | 8.50 / 3.20 | 0.734 | 0.675 | -27.07% | INSUFFICIENT_DATA |
| 5337197159 | Inter – Parma | SOT partita | 7.5 | 1.16 | 8.50 / 3.20 | 0.623 | 0.573 | -33.55% | INSUFFICIENT_DATA |
| 5367476625 | Inter – Parma | SOT squadra | 3.5 | 1.02 | 5.51 / 2.35 | 0.804 | 0.740 | -24.57% | INSUFFICIENT_DATA |
| 5367473631 | Inter – Parma | SOT squadra | 4.5 | 1.08 | 5.51 / 2.35 | 0.666 | 0.613 | -33.79% | INSUFFICIENT_DATA |
| 5369526519 | Napoli – Frosinone | Corner partita | 6.5 | 1.12 | 10.30 / 4.01 | 0.828 | 0.762 | -14.65% | INSUFFICIENT_DATA |
| 5369526555 | Napoli – Frosinone | Corner partita | 8.5 | 1.48 | 10.30 / 4.01 | 0.673 | 0.619 | -8.33% | INSUFFICIENT_DATA |
| 5369526482 | Napoli – Frosinone | Corner partita | 9.5 | 1.75 | 10.30 / 4.01 | 0.579 | 0.533 | -6.77% | INSUFFICIENT_DATA |
| 5369524078 | Napoli – Frosinone | Corner squadra | 2.5 | 1.03 | 5.60 / 3.05 | 0.845 | 0.778 | -19.90% | INSUFFICIENT_DATA |
| 5369526496 | Napoli – Frosinone | Corner squadra | 2.5 | 1.48 | 4.70 / 2.61 | 0.800 | 0.736 | 8.98% | INSUFFICIENT_DATA |
| 5369497883 | Napoli – Frosinone | Corner squadra | 3.5 | 1.12 | 5.60 / 3.05 | 0.754 | 0.694 | -22.26% | INSUFFICIENT_DATA |
| 5369524059 | Napoli – Frosinone | Corner squadra | 3.5 | 2.10 | 4.70 / 2.61 | 0.677 | 0.623 | 30.83% | INSUFFICIENT_DATA |
| 5369526529 | Napoli – Frosinone | Corner squadra | 4.5 | 1.27 | 5.60 / 3.05 | 0.641 | 0.590 | -25.13% | INSUFFICIENT_DATA |
| 5337168996 | Napoli – Frosinone | SOT partita | 5.5 | 1.03 | 8.00 / 2.70 | 0.823 | 0.757 | -22.04% | INSUFFICIENT_DATA |
| 5337168984 | Napoli – Frosinone | SOT partita | 6.5 | 1.09 | 8.00 / 2.70 | 0.711 | 0.654 | -28.73% | INSUFFICIENT_DATA |
| 5367477619 | Napoli – Frosinone | SOT squadra | 2.5 | 1.02 | 4.50 / 2.13 | 0.826 | 0.760 | -22.48% | INSUFFICIENT_DATA |
| 5367483087 | Napoli – Frosinone | SOT squadra | 3.5 | 1.10 | 4.50 / 2.13 | 0.681 | 0.626 | -31.12% | INSUFFICIENT_DATA |
| 5367477603 | Napoli – Frosinone | SOT squadra | 2.5 | 1.27 | 3.50 / 1.66 | 0.727 | 0.668 | -15.11% | INSUFFICIENT_DATA |
| 5371749325 | Como – Roma | Corner partita | 6.5 | 1.22 | 10.00 / 4.30 | 0.792 | 0.729 | -11.09% | INSUFFICIENT_DATA |
| 5371703490 | Como – Roma | Corner partita | 7.5 | 1.45 | 10.00 / 4.30 | 0.720 | 0.662 | -4.02% | INSUFFICIENT_DATA |
| 5371749367 | Como – Roma | Corner partita | 8.5 | 1.75 | 10.00 / 4.30 | 0.636 | 0.586 | 2.46% | INSUFFICIENT_DATA |
| 5371749508 | Como – Roma | Corner squadra | 2.5 | 1.16 | 5.40 / 3.22 | 0.816 | 0.751 | -12.91% | INSUFFICIENT_DATA |
| 5371749437 | Como – Roma | Corner squadra | 2.5 | 1.27 | 4.60 / 2.85 | 0.769 | 0.708 | -10.10% | INSUFFICIENT_DATA |
| 5371703552 | Como – Roma | Corner squadra | 3.5 | 1.42 | 5.40 / 3.22 | 0.722 | 0.665 | -5.62% | INSUFFICIENT_DATA |
| 5371738517 | Como – Roma | Corner squadra | 3.5 | 1.62 | 4.60 / 2.85 | 0.650 | 0.598 | -3.09% | INSUFFICIENT_DATA |
| 5371749312 | Como – Roma | Corner squadra | 4.5 | 1.80 | 5.40 / 3.22 | 0.610 | 0.561 | 1.03% | INSUFFICIENT_DATA |
| 5369254681 | Como – Roma | SOT partita | 4.5 | 1.02 | 10.10 / 3.74 | 0.933 | 0.858 | -12.46% | INSUFFICIENT_DATA |
| 5337173972 | Como – Roma | SOT partita | 5.5 | 1.05 | 10.10 / 3.74 | 0.891 | 0.819 | -13.96% | INSUFFICIENT_DATA |
| 5337173960 | Como – Roma | SOT partita | 6.5 | 1.11 | 10.10 / 3.74 | 0.832 | 0.765 | -15.02% | INSUFFICIENT_DATA |
| 5337173964 | Como – Roma | SOT partita | 7.5 | 1.22 | 10.10 / 3.74 | 0.756 | 0.696 | -15.09% | INSUFFICIENT_DATA |
| 5337173976 | Como – Roma | SOT partita | 8.5 | 1.38 | 10.10 / 3.74 | 0.666 | 0.612 | -15.49% | INSUFFICIENT_DATA |
| 5369298858 | Como – Roma | SOT squadra | 2.5 | 1.08 | 5.50 / 2.59 | 0.877 | 0.806 | -12.90% | INSUFFICIENT_DATA |
| 5369270465 | Como – Roma | SOT squadra | 3.5 | 1.25 | 5.50 / 2.59 | 0.780 | 0.718 | -10.30% | INSUFFICIENT_DATA |
| 5369298862 | Como – Roma | SOT squadra | 2.5 | 1.14 | 4.60 / 2.70 | 0.782 | 0.719 | -18.02% | INSUFFICIENT_DATA |
| 5369270459 | Como – Roma | SOT squadra | 3.5 | 1.40 | 4.60 / 2.70 | 0.658 | 0.606 | -15.23% | INSUFFICIENT_DATA |
| 5371749137 | Lazio – Monza | Corner partita | 5.5 | 1.11 | 9.20 / 3.41 | 0.861 | 0.792 | -12.07% | INSUFFICIENT_DATA |
| 5371738138 | Lazio – Monza | Corner partita | 6.5 | 1.27 | 9.20 / 3.41 | 0.786 | 0.723 | -8.19% | INSUFFICIENT_DATA |
| 5371703301 | Lazio – Monza | Corner partita | 7.5 | 1.48 | 9.20 / 3.41 | 0.691 | 0.636 | -5.92% | INSUFFICIENT_DATA |
| 5371738146 | Lazio – Monza | Corner squadra | 2.5 | 1.10 | 4.30 / 2.40 | 0.773 | 0.712 | -21.73% | INSUFFICIENT_DATA |
| 5371749154 | Lazio – Monza | Corner squadra | 2.5 | 1.45 | 4.90 / 2.42 | 0.839 | 0.772 | 11.97% | INSUFFICIENT_DATA |
| 5371703309 | Lazio – Monza | Corner squadra | 3.5 | 1.27 | 4.30 / 2.40 | 0.631 | 0.580 | -26.33% | INSUFFICIENT_DATA |
| 5371703302 | Lazio – Monza | Corner squadra | 3.5 | 2.00 | 4.90 / 2.42 | 0.719 | 0.661 | 32.21% | INSUFFICIENT_DATA |
| 5371738496 | Lecce – Bologna | Corner partita | 5.5 | 1.14 | 8.70 / 3.88 | 0.795 | 0.732 | -16.60% | INSUFFICIENT_DATA |
| 5371738266 | Lecce – Bologna | Corner partita | 6.5 | 1.30 | 8.70 / 3.88 | 0.715 | 0.657 | -14.53% | INSUFFICIENT_DATA |
| 5371703442 | Lecce – Bologna | Corner partita | 7.5 | 1.57 | 8.70 / 3.88 | 0.621 | 0.572 | -10.24% | INSUFFICIENT_DATA |
| 5371749238 | Lecce – Bologna | Corner squadra | 2.5 | 1.30 | 4.40 / 2.80 | 0.751 | 0.691 | -10.15% | INSUFFICIENT_DATA |
| 5371703445 | Lecce – Bologna | Corner squadra | 2.5 | 1.18 | 4.30 / 2.68 | 0.749 | 0.689 | -18.68% | INSUFFICIENT_DATA |
| 5371738426 | Lecce – Bologna | Corner squadra | 3.5 | 1.75 | 4.40 / 2.80 | 0.626 | 0.576 | 0.80% | INSUFFICIENT_DATA |
| 5371749478 | Lecce – Bologna | Corner squadra | 3.5 | 1.45 | 4.30 / 2.68 | 0.617 | 0.568 | -17.65% | INSUFFICIENT_DATA |
| 5369322036 | Lecce – Bologna | SOT partita | 3.5 | 1.02 | 7.30 / 3.20 | 0.882 | 0.812 | -17.19% | INSUFFICIENT_DATA |
| 5369316733 | Lecce – Bologna | SOT partita | 4.5 | 1.06 | 7.30 / 3.20 | 0.809 | 0.745 | -21.09% | INSUFFICIENT_DATA |
| 5337209478 | Lecce – Bologna | SOT partita | 5.5 | 1.14 | 7.30 / 3.20 | 0.713 | 0.656 | -25.21% | INSUFFICIENT_DATA |
| 5337209466 | Lecce – Bologna | SOT partita | 6.5 | 1.28 | 7.30 / 3.20 | 0.599 | 0.551 | -29.50% | INSUFFICIENT_DATA |
| 5369322034 | Lecce – Bologna | SOT squadra | 2.5 | 1.52 | 3.50 / 2.28 | 0.669 | 0.616 | -6.37% | INSUFFICIENT_DATA |
| 5369316799 | Lecce – Bologna | SOT squadra | 2.5 | 1.08 | 3.83 / 2.24 | 0.724 | 0.666 | -28.10% | INSUFFICIENT_DATA |
| 5371749082 | Sassuolo – Milan | Corner partita | 5.5 | 1.15 | 7.80 / 3.23 | 0.762 | 0.701 | -19.40% | INSUFFICIENT_DATA |
| 5371748994 | Sassuolo – Milan | Corner partita | 6.5 | 1.30 | 7.80 / 3.23 | 0.656 | 0.604 | -21.50% | INSUFFICIENT_DATA |
| 5371749110 | Sassuolo – Milan | Corner squadra | 2.5 | 1.36 | 3.90 / 2.18 | 0.740 | 0.680 | -7.46% | INSUFFICIENT_DATA |
| 5371749080 | Sassuolo – Milan | Corner squadra | 2.5 | 1.16 | 3.90 / 2.38 | 0.722 | 0.664 | -22.97% | INSUFFICIENT_DATA |
| 5369279829 | Sassuolo – Milan | SOT partita | 4.5 | 1.02 | 8.40 / 3.12 | 0.894 | 0.823 | -16.07% | INSUFFICIENT_DATA |
| 5337171484 | Sassuolo – Milan | SOT partita | 5.5 | 1.06 | 8.40 / 3.12 | 0.824 | 0.758 | -19.67% | INSUFFICIENT_DATA |
| 5337171472 | Sassuolo – Milan | SOT partita | 6.5 | 1.14 | 8.40 / 3.12 | 0.729 | 0.670 | -23.57% | INSUFFICIENT_DATA |
| 5337171476 | Sassuolo – Milan | SOT partita | 7.5 | 1.28 | 8.40 / 3.12 | 0.614 | 0.564 | -27.75% | INSUFFICIENT_DATA |
| 5369280017 | Sassuolo – Milan | SOT squadra | 2.5 | 1.18 | 4.20 / 2.06 | 0.795 | 0.732 | -13.65% | INSUFFICIENT_DATA |
| 5369324722 | Sassuolo – Milan | SOT squadra | 2.5 | 1.10 | 4.24 / 2.34 | 0.771 | 0.710 | -21.93% | INSUFFICIENT_DATA |
| 5371703593 | Cagliari – Juventus | Corner partita | 6.5 | 1.16 | 9.80 / 4.58 | 0.764 | 0.703 | -18.42% | INSUFFICIENT_DATA |
| 5371749535 | Cagliari – Juventus | Corner partita | 7.5 | 1.36 | 9.80 / 4.58 | 0.692 | 0.637 | -13.39% | INSUFFICIENT_DATA |
| 5371738542 | Cagliari – Juventus | Corner partita | 8.5 | 1.57 | 9.80 / 4.58 | 0.612 | 0.563 | -11.64% | INSUFFICIENT_DATA |
| 5371703584 | Cagliari – Juventus | Corner squadra | 2.5 | 1.36 | 4.40 / 2.51 | 0.775 | 0.713 | -2.97% | INSUFFICIENT_DATA |
| 5371738569 | Cagliari – Juventus | Corner squadra | 2.5 | 1.06 | 5.40 / 3.83 | 0.775 | 0.714 | -24.37% | INSUFFICIENT_DATA |
| 5371703595 | Cagliari – Juventus | Corner squadra | 3.5 | 1.85 | 4.40 / 2.51 | 0.640 | 0.589 | 8.93% | INSUFFICIENT_DATA |
| 5371738562 | Cagliari – Juventus | Corner squadra | 3.5 | 1.20 | 5.40 / 3.83 | 0.690 | 0.635 | -23.81% | INSUFFICIENT_DATA |
| 5371738593 | Cagliari – Juventus | Corner squadra | 4.5 | 1.48 | 5.40 / 3.83 | 0.593 | 0.545 | -19.27% | INSUFFICIENT_DATA |
| 5369282037 | Cagliari – Juventus | SOT partita | 4.5 | 1.03 | 8.80 / 3.13 | 0.915 | 0.842 | -13.27% | INSUFFICIENT_DATA |
| 5337200717 | Cagliari – Juventus | SOT partita | 5.5 | 1.08 | 8.80 / 3.13 | 0.854 | 0.786 | -15.13% | INSUFFICIENT_DATA |
| 5337200691 | Cagliari – Juventus | SOT partita | 6.5 | 1.18 | 8.80 / 3.13 | 0.769 | 0.707 | -16.54% | INSUFFICIENT_DATA |
| 5337200707 | Cagliari – Juventus | SOT partita | 7.5 | 1.33 | 8.80 / 3.13 | 0.661 | 0.608 | -19.11% | INSUFFICIENT_DATA |
| 5369331818 | Cagliari – Juventus | SOT squadra | 2.5 | 1.52 | 3.40 / 2.28 | 0.653 | 0.601 | -8.62% | INSUFFICIENT_DATA |
| 5369331874 | Cagliari – Juventus | SOT squadra | 2.5 | 1.03 | 5.40 / 2.14 | 0.912 | 0.839 | -13.55% | INSUFFICIENT_DATA |
| 5369331180 | Cagliari – Juventus | SOT squadra | 3.5 | 1.12 | 5.40 / 2.14 | 0.813 | 0.748 | -16.26% | INSUFFICIENT_DATA |
| 5369331636 | Cagliari – Juventus | SOT squadra | 4.5 | 1.30 | 5.40 / 2.14 | 0.663 | 0.610 | -20.71% | INSUFFICIENT_DATA |
| 5371743024 | Atalanta – Venezia | SOT partita | 4.5 | 1.02 | 9.00 / 3.29 | 0.914 | 0.841 | -14.20% | INSUFFICIENT_DATA |
| 5337204635 | Atalanta – Venezia | SOT partita | 5.5 | 1.07 | 9.00 / 3.29 | 0.856 | 0.788 | -15.71% | INSUFFICIENT_DATA |
| 5337204623 | Atalanta – Venezia | SOT partita | 6.5 | 1.16 | 9.00 / 3.29 | 0.776 | 0.714 | -17.15% | INSUFFICIENT_DATA |
| 5337204627 | Atalanta – Venezia | SOT partita | 7.5 | 1.30 | 9.00 / 3.29 | 0.676 | 0.622 | -19.18% | INSUFFICIENT_DATA |
| 5371699603 | Atalanta – Venezia | SOT squadra | 2.5 | 1.05 | 5.48 / 2.90 | 0.848 | 0.780 | -18.09% | INSUFFICIENT_DATA |
| 5371743198 | Atalanta – Venezia | SOT squadra | 3.5 | 1.16 | 5.48 / 2.90 | 0.753 | 0.692 | -19.68% | INSUFFICIENT_DATA |
| 5371734782 | Atalanta – Venezia | SOT squadra | 4.5 | 1.40 | 5.48 / 2.90 | 0.632 | 0.582 | -18.56% | INSUFFICIENT_DATA |
| 5371733594 | Atalanta – Venezia | SOT squadra | 2.5 | 1.33 | 3.50 / 1.55 | 0.741 | 0.681 | -9.38% | INSUFFICIENT_DATA |
| 5371745960 | Torino – Udinese | SOT partita | 4.5 | 1.05 | 7.80 / 2.62 | 0.896 | 0.824 | -13.44% | INSUFFICIENT_DATA |
| 5337166484 | Torino – Udinese | SOT partita | 5.5 | 1.12 | 7.80 / 2.62 | 0.810 | 0.745 | -16.54% | INSUFFICIENT_DATA |
| 5371701375 | Torino – Udinese | SOT squadra | 2.5 | 1.20 | 3.72 / 1.90 | 0.740 | 0.680 | -18.35% | INSUFFICIENT_DATA |
| 5371736462 | Torino – Udinese | SOT squadra | 2.5 | 1.18 | 4.10 / 1.80 | 0.813 | 0.748 | -11.74% | INSUFFICIENT_DATA |

Le probabilità e gli EV sopra riproducono la metodologia esistente solo a scopo diagnostico. Non sono stati serializzati nel catalogo e non costituiscono consigli di gioco.

## 7. Distribuzioni congiunte/differenziali separate

- **Entrambe almeno X SOT (15):** la funzione corrente calcola due marginali Normali con correzione di continuità 0,5, le moltiplica (indipendenza) e applica 0,90. Tutte le 15 sono simulate nel JSON, ma restano `INSUFFICIENT_DATA`: non c’è validazione della dipendenza congiunta.
- **Corner 1X2 T.R. (5):** nessuna probabilità diagnostica è calcolabile con la metodologia corrente. Servono distribuzione congiunta discreta e differenziale home-away, inclusa la massa del pareggio.
- **DUO:** esclusi integralmente dall’analisi, come richiesto.

## 8. Numero recuperabile e fase successiva

- Recuperabili in sicurezza adesso: **0/110**.
- Tecnicamente simulabili ma non autorizzabili: **110/110**.
- Congiunti SOT da mantenere separati: **15**; corner 1X2 senza distribuzione: **5**.
- Fase successiva: congelare per ogni giornata pre-kickoff l’intera distribuzione volume (media, SD, intervalli, versione e hash); attendere almeno 100 gare concluse; valutare un holdout temporale senza rifit; solo dopo confrontare Normale, Poisson/Negative Binomial e modelli congiunti discreti. Nessun cambio formula prima del gate.

## 9. Isolamento produzione

File protetti verificati: **12**; hash cambiati: **0**. Totali catalogo rimasti 383/367/16.
