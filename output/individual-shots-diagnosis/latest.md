# Diagnosi minuti e distribuzione dei tiri

Analisi separata per versione. Originali recuperati dagli stessi archivi prepartita dell’audit; nessuna media dedotta o inventata dalle quote.

## Minuti e conteggi

| Versione | N | Minuti previsti | Minuti reali | MAE minuti | Tiri previsti | Tiri reali | MAE tiri | MAE usando minuti reali (solo diagnostica) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| engine-4.12.0:player-2 | 142 | 80.917606 | 79.373239 | 10.059859 | 1.183592 | 1.077465 | 0.804014 | 0.753126 |
| engine-4.13.0:player-2 | 780 | 73.11 | 79.965385 | 13.954359 | 1.302615 | 1.224359 | 0.936333 | 0.947231 |
| engine-4.16.0:player-2 | 168 | 73.472619 | 80.809524 | 14.008333 | 1.431012 | 1.166667 | 0.917679 | 0.882407 |

L’uso dei minuti reali è un confronto a posteriori: non rappresenta una previsione ottenibile prima della gara e non dimostra un rapporto causale.

## Frequenza degli zeri e delle code

| Versione | P(0) Poisson | Zeri osservati | P(4+) Poisson | 4+ osservati |
|---|---:|---:|---:|---:|
| engine-4.12.0:player-2 | 0.37381 | 0.401408 | 0.060991 | 0.06338 |
| engine-4.13.0:player-2 | 0.35417 | 0.391026 | 0.079796 | 0.078205 |
| engine-4.16.0:player-2 | 0.32848 | 0.392857 | 0.099059 | 0.053571 |

## Verifica sulle giornate successive

Stima solo su almeno due giornate complete precedenti, 15 gare e 200 giocatori-gara della stessa versione. Binomiale negativa: media originale invariata, dispersione scelta per verosimiglianza dei conteggi sulle sole gare di training. Correzione minuti: rapporto minuti reali/previsti delle sole gare di training, con limite di 90 minuti.

| Versione | Variante | Soglia | N | Brier originale | Brier alternativa | Differenza | IC 95% per gara |
|---|---|---:|---:|---:|---:|---:|---|
| engine-4.12.0:player-2 | negativeBinomial | 1+ | 0 | N/D | N/D | N/D | null |
| engine-4.12.0:player-2 | negativeBinomial | 2+ | 0 | N/D | N/D | N/D | null |
| engine-4.12.0:player-2 | negativeBinomial | 3+ | 0 | N/D | N/D | N/D | null |
| engine-4.12.0:player-2 | minuteCorrection | 1+ | 0 | N/D | N/D | N/D | null |
| engine-4.12.0:player-2 | minuteCorrection | 2+ | 0 | N/D | N/D | N/D | null |
| engine-4.12.0:player-2 | minuteCorrection | 3+ | 0 | N/D | N/D | N/D | null |
| engine-4.13.0:player-2 | negativeBinomial | 1+ | 478 | 0.214896 | 0.214365 | -0.000531 | [-0.003582,0.002472] |
| engine-4.13.0:player-2 | negativeBinomial | 2+ | 478 | 0.166702 | 0.165592 | -0.00111 | [-0.004218,0.001645] |
| engine-4.13.0:player-2 | negativeBinomial | 3+ | 478 | 0.106476 | 0.105783 | -0.000693 | [-0.002365,0.000897] |
| engine-4.13.0:player-2 | minuteCorrection | 1+ | 478 | 0.214896 | 0.216395 | 0.001499 | [-0.001401,0.004278] |
| engine-4.13.0:player-2 | minuteCorrection | 2+ | 478 | 0.166702 | 0.170028 | 0.003326 | [-0.000455,0.007313] |
| engine-4.13.0:player-2 | minuteCorrection | 3+ | 478 | 0.106476 | 0.108672 | 0.002196 | [-0.000463,0.004911] |
| engine-4.16.0:player-2 | negativeBinomial | 1+ | 0 | N/D | N/D | N/D | null |
| engine-4.16.0:player-2 | negativeBinomial | 2+ | 0 | N/D | N/D | N/D | null |
| engine-4.16.0:player-2 | negativeBinomial | 3+ | 0 | N/D | N/D | N/D | null |
| engine-4.16.0:player-2 | minuteCorrection | 1+ | 0 | N/D | N/D | N/D | null |
| engine-4.16.0:player-2 | minuteCorrection | 2+ | 0 | N/D | N/D | N/D | null |
| engine-4.16.0:player-2 | minuteCorrection | 3+ | 0 | N/D | N/D | N/D | null |

Differenza negativa = errore minore. Gruppi per ruolo, volume e stabilità, parametri di ogni fold e righe verificabili in latest.json.

## Interpretazione

Nella versione 4.16, il minutaggio medio previsto è inferiore a quello osservato, mentre i tiri medi previsti sono superiori: un eccesso medio di minuti non spiega la sovrastima dei tiri. Questo non identifica da solo una causa nella baseline, nei matchup o nella riconciliazione.

Nel campione 4.13 il segno dell’errore cambia tra ruoli e stabilità: la correzione uniforme rischia di peggiorare gruppi già adeguati. Le differenze tra sottogruppi sono descrittive, senza nuove soglie operative.

La binomiale negativa riduce leggermente il Brier sulle tre soglie nelle giornate di verifica 9–11, ma tutti gli intervalli della differenza includono zero. La correzione uniforme dei minuti peggiora il Brier. Nessuna alternativa viene promossa.

## Limiti

- Retrospective exploratory temporal replay after earlier audits; fresh prospective confirmation still required.
- True minutes rescaling is a postmatch oracle diagnostic, not a usable forecasting input or a causal attribution.
- Negative binomial changes dispersion only; minute correction changes expected exposure only. Neither changes production.
- No mixing of engine versions. Incomplete matchdays excluded from training and temporal tests.
- Bootstrap resamples paired fixtures; repeated players across fixtures still create dependence.
- Two fixed experimental alternatives across three thresholds; no selection of a winning variant or multiplicity-adjusted claim.
- Role and stability subgroups are descriptive, not independently validated models.
- Serialized rounded mean may differ slightly from original full-precision mean. Published probabilities remain the comparator.

Nessun aggiornamento a sito, formule operative, quote, probabilità DUO o snapshot prospettici già congelati.
