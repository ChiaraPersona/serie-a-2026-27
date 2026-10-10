# Serie A 2026/27 — Schedina MD6: revisione definitiva del motore di selezione

Generato: 2026-10-10T09:38:17.232Z. Engine V2 4.13.0; quote Sisal snapshot 2026-10-09T10:43:00.203Z.

## Esito

Selezionati **32** pronostici, media **3.2** per partita. Versione precedente: **12**; delta **20**. Il target indicativo di circa 100 non è forzato: le soglie senza gate temporale, le quote di coda e le famiglie con contratto non riconciliato restano escluse.

> Quote verificate nello snapshot Sisal del 9 ottobre 2026; disponibilità corrente non verificata.

## A. Audit e copertura

Il motore precedente richiedeva P centrale e prudente almeno 50%, affidabilità Alta/Media e coerenza di scenario; ordinava per probabilità prudente e centrale. Quote ed EV non contribuivano alla scelta. Il nuovo motore aggiunge distribuzioni discrete validate su holdout temporale e applica gate espliciti più un ordinamento lessicografico documentato.

| Partita | Catalogo | Quotati | Valutati | EV > 0 | Precedenti | Selezionati |
| --- | --- | --- | --- | --- | --- | --- |
| Genoa – Fiorentina | 155 | 155 | 110 | 6 | 0 | 2 |
| Inter – Parma | 150 | 150 | 104 | 38 | 3 | 5 |
| Napoli – Frosinone | 152 | 152 | 105 | 19 | 1 | 2 |
| Como – Roma | 162 | 162 | 114 | 10 | 2 | 3 |
| Lazio – Monza | 73 | 73 | 61 | 19 | 1 | 3 |
| Lecce – Bologna | 164 | 164 | 119 | 23 | 0 | 4 |
| Sassuolo – Milan | 166 | 166 | 117 | 14 | 0 | 4 |
| Cagliari – Juventus | 161 | 161 | 117 | 31 | 1 | 5 |
| Atalanta – Venezia | 133 | 133 | 96 | 5 | 1 | 1 |
| Torino – Udinese | 130 | 130 | 95 | 19 | 3 | 3 |

### Famiglie selezionate

| Famiglia | Numero |
| --- | --- |
| Tiri in porta | 5 |
| Tiri totali | 5 |
| Corner | 10 |
| Gol e risultati | 12 |

## B. Scelta delle soglie

Ogni gruppo usa un'identità canonica basata su metrica, entità, direzione e contratto; non sulla somiglianza delle etichette. L'ordinamento bilanciato privilegia prima il downside prudente non negativo, poi qualità, EV prudente, EV operativo e probabilità prudente.

### Inter – Parma — corners:match:away:over:CORNER

| Soglia | P | P prudente | Quota | EV | EV prudente | Affidabilità | Scelta | Decisione |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Parma Over 7,5 corner | 5.6% | 3.6% | 33 | 84.74% | 18.74% | Media | NO | rischio di coda eccessivo; quota di coda oltre il limite; quota oltre 4 per un modello statistico di conteggio |
| Parma Over 6,5 corner | 9.97% | 7.97% | 16 | 59.58% | 27.58% | Media | NO | rischio di coda eccessivo; quota di coda oltre il limite; quota oltre 4 per un modello statistico di conteggio |
| Parma Over 5,5 corner | 17.04% | 15.04% | 9 | 53.33% | 35.33% | Media | NO | rischio di coda eccessivo; quota di coda oltre il limite; quota oltre 4 per un modello statistico di conteggio |
| Parma Over 4,5 corner | 27.69% | 25.69% | 5 | 38.43% | 28.43% | Media | NO | quota oltre 4 per un modello statistico di conteggio |
| Parma Over 3,5 corner | 42.38% | 39.16% | 2.9 | 22.9% | 13.57% | Media | SÌ | Scelta dal ranking dopo gate, deduplicazione e controllo di coerenza |
| Parma Over 2,5 corner | 60.36% | 56.69% | 1.8 | 8.65% | 2.04% | Media | NO | altra soglia canonica meglio classificata |

### Inter – Parma — sot:match:away:over:TIRI IN PORTA

| Soglia | P | P prudente | Quota | EV | EV prudente | Affidabilità | Scelta | Decisione |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Parma Over 4,5 tiri in porta | 22.64% | 19.13% | 6 | 35.85% | 14.79% | Media | NO | rischio di coda eccessivo; quota oltre 4 per un modello statistico di conteggio |
| Parma Over 5,5 tiri in porta | 12.2% | 10.2% | 11 | 34.17% | 12.17% | Media | NO | rischio di coda eccessivo; quota di coda oltre il limite; quota oltre 4 per un modello statistico di conteggio |
| Parma Over 3,5 tiri in porta | 38.36% | 35.06% | 3.25 | 24.68% | 13.94% | Media | SÌ | Scelta dal ranking dopo gate, deduplicazione e controllo di coerenza |
| Parma Over 2,5 tiri in porta | 58.47% | 56.16% | 1.95 | 14.02% | 9.5% | Media | NO | altra soglia canonica meglio classificata |

### Inter – Parma — goals:home:range

| Soglia | P | P prudente | Quota | EV | EV prudente | Affidabilità | Scelta | Decisione |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Inter multigoal 1-2 | 48.7% | 44.7% | 2.6 | 16.3% | 16.2% | Bassa | SÌ | Scelta dal ranking dopo gate, deduplicazione e controllo di coerenza |
| Inter multigoal 1-3 | 69.5% | 66.6% | 1.6 | 6.5% | 6.6% | Bassa | NO | altra soglia canonica meglio classificata |
| Inter multigoal 1-4 | 81.7% | 80.8% | 1.27 | 2.6% | 2.6% | Bassa | NO | altra soglia canonica meglio classificata |
| Inter multigoal 2-3 | 47.1% | 46.1% | 2.1 | -3.1% | -3.2% | Bassa | NO | EV operativo inferiore al 2%; affidabilità Bassa con downside prudente negativo |
| Inter multigoal 2-4 | 59.4% | 56.3% | 1.52 | -14.4% | -14.4% | Bassa | NO | EV operativo inferiore al 2%; affidabilità Bassa con downside prudente negativo |

### Inter – Parma — goals:match:range

| Soglia | P | P prudente | Quota | EV | EV prudente | Affidabilità | Scelta | Decisione |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Multigoal 1-3 | 58% | 52.4% | 2 | 4.8% | 4.8% | Bassa | SÌ | Scelta dal ranking dopo gate, deduplicazione e controllo di coerenza |
| Multigoal 1-4 | 75.4% | 71.1% | 1.45 | 3.1% | 3.1% | Bassa | NO | altra soglia canonica meglio classificata |
| Multigoal 1-5 | 86.3% | 84% | 1.18 | -0.9% | -0.9% | Bassa | NO | EV operativo inferiore al 2%; affidabilità Bassa con downside prudente negativo |
| Multigoal 2-3 | 44.1% | 41.1% | 2.4 | -1.2% | -1.4% | Bassa | NO | EV operativo inferiore al 2%; affidabilità Bassa con downside prudente negativo |
| Multigoal 2-4 | 61.5% | 59.9% | 1.65 | -1.2% | -1.2% | Bassa | NO | EV operativo inferiore al 2%; affidabilità Bassa con downside prudente negativo |
| Multigoal 1-6 | 91.9% | 91.3% | 1.07 | -2.3% | -2.3% | Bassa | NO | EV operativo inferiore al 2%; affidabilità Bassa con downside prudente negativo |
| Multigoal 2-5 | 72.3% | 70.5% | 1.33 | -6.3% | -6.2% | Bassa | NO | EV operativo inferiore al 2%; affidabilità Bassa con downside prudente negativo |
| Multigoal 2-6 | 78% | 74.6% | 1.18 | -12% | -12% | Bassa | NO | EV operativo inferiore al 2%; affidabilità Bassa con downside prudente negativo |
| Multigoal 3-4 | 39.9% | 37.9% | 2.25 | -14.8% | -14.7% | Bassa | NO | EV operativo inferiore al 2%; affidabilità Bassa con downside prudente negativo |
| Multigoal 3-6 | 56.3% | 50.7% | 1.48 | -25% | -25% | Bassa | NO | EV operativo inferiore al 2%; affidabilità Bassa con downside prudente negativo |

### Napoli – Frosinone — corners:match:away:over:CORNER

| Soglia | P | P prudente | Quota | EV | EV prudente | Affidabilità | Scelta | Decisione |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Frosinone Over 7,5 corner | 11.2% | 6.2% | 16 | 79.19% | -0.81% | Bassa | NO | rischio di coda eccessivo; quota di coda oltre il limite; quota oltre 4 per un modello statistico di conteggio; statistical model requires non negative conservative ev |
| Frosinone Over 6,5 corner | 17.77% | 12.77% | 9 | 59.95% | 14.95% | Bassa | NO | rischio di coda eccessivo; quota di coda oltre il limite; quota oltre 4 per un modello statistico di conteggio |
| Frosinone Over 5,5 corner | 27.12% | 22.12% | 5.25 | 42.39% | 16.14% | Bassa | NO | rischio di coda eccessivo; quota di coda oltre il limite; quota oltre 4 per un modello statistico di conteggio |
| Frosinone Over 4,5 corner | 39.54% | 34.54% | 3.25 | 28.51% | 12.26% | Bassa | SÌ | Scelta dal ranking dopo gate, deduplicazione e controllo di coerenza |
| Frosinone Over 3,5 corner | 54.64% | 49.64% | 2.1 | 14.75% | 4.25% | Bassa | NO | altra soglia canonica meglio classificata |
| Frosinone Over 2,5 corner | 70.93% | 65.93% | 1.48 | 4.97% | -2.43% | Bassa | NO | statistical model requires non negative conservative ev |

### Napoli – Frosinone — goals:match:range

| Soglia | P | P prudente | Quota | EV | EV prudente | Affidabilità | Scelta | Decisione |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Multigoal 1-3 | 65.2% | 60.9% | 1.72 | 4.7% | 4.7% | Bassa | SÌ | Scelta dal ranking dopo gate, deduplicazione e controllo di coerenza |
| Multigoal 1-4 | 79.8% | 77.3% | 1.3 | 0.5% | 0.5% | Bassa | NO | EV operativo inferiore al 2% |
| Multigoal 2-3 | 46.7% | 45.3% | 2.2 | -0.4% | -0.3% | Bassa | NO | EV operativo inferiore al 2%; affidabilità Bassa con downside prudente negativo |
| Multigoal 1-5 | 87.7% | 87% | 1.13 | -1.7% | -1.7% | Bassa | NO | EV operativo inferiore al 2%; affidabilità Bassa con downside prudente negativo |
| Multigoal 1-6 | 91.1% | 89.8% | 1.05 | -5.7% | -5.7% | Bassa | NO | EV operativo inferiore al 2%; affidabilità Bassa con downside prudente negativo |
| Multigoal 2-4 | 61.3% | 59.6% | 1.52 | -9.4% | -9.4% | Bassa | NO | EV operativo inferiore al 2%; affidabilità Bassa con downside prudente negativo |
| Multigoal 2-5 | 69.2% | 65.6% | 1.3 | -14.7% | -14.7% | Bassa | NO | EV operativo inferiore al 2%; affidabilità Bassa con downside prudente negativo |
| Multigoal 2-6 | 72.7% | 68.1% | 1.2 | -18.3% | -18.3% | Bassa | NO | EV operativo inferiore al 2%; affidabilità Bassa con downside prudente negativo |
| Multigoal 3-4 | 36.6% | 33.5% | 2.2 | -26.3% | -26.3% | Bassa | NO | EV operativo inferiore al 2%; affidabilità Bassa con downside prudente negativo |
| Multigoal 3-5 | 44.5% | 39.5% | 1.75 | -30.8% | -30.9% | Bassa | NO | EV operativo inferiore al 2%; affidabilità Bassa con downside prudente negativo |
| Multigoal 3-6 | 48% | 41.9% | 1.57 | -34.1% | -34.2% | Bassa | NO | EV operativo inferiore al 2%; affidabilità Bassa con downside prudente negativo |

### Como – Roma — corners:match:home:over:CORNER

| Soglia | P | P prudente | Quota | EV | EV prudente | Affidabilità | Scelta | Decisione |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Como Over 7,5 corner | 21.07% | 19.07% | 5.5 | 15.88% | 4.88% | Media | NO | rischio di coda eccessivo; quota oltre 4 per un modello statistico di conteggio |
| Como Over 6,5 corner | 29.89% | 27.89% | 3.6 | 7.6% | 0.4% | Media | NO | altra soglia canonica meglio classificata |
| Como Over 5,5 corner | 40.94% | 38.94% | 2.6 | 6.44% | 1.24% | Media | SÌ | Scelta dal ranking dopo gate, deduplicazione e controllo di coerenza |
| Como Over 4,5 corner | 53.86% | 51.86% | 1.8 | -3.05% | -6.65% | Media | NO | EV operativo inferiore al 2%; statistical model requires non negative conservative ev |
| Como Over 3,5 corner | 67.7% | 64.49% | 1.42 | -3.86% | -8.43% | Media | NO | EV operativo inferiore al 2%; statistical model requires non negative conservative ev |
| Como Over 2,5 corner | 80.85% | 77.17% | 1.16 | -6.21% | -10.48% | Media | NO | EV operativo inferiore al 2%; statistical model requires non negative conservative ev |

### Lecce – Bologna — corners:match:home:over:CORNER

| Soglia | P | P prudente | Quota | EV | EV prudente | Affidabilità | Scelta | Decisione |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Lecce Over 6,5 corner | 20.23% | 18.23% | 6.5 | 31.47% | 18.47% | Media | NO | rischio di coda eccessivo; quota di coda oltre il limite; quota oltre 4 per un modello statistico di conteggio |
| Lecce Over 7,5 corner | 13.1% | 11.1% | 10 | 30.96% | 10.96% | Media | NO | rischio di coda eccessivo; quota di coda oltre il limite; quota oltre 4 per un modello statistico di conteggio |
| Lecce Over 5,5 corner | 30.07% | 28.07% | 4 | 20.28% | 12.28% | Media | SÌ | Scelta dal ranking dopo gate, deduplicazione e controllo di coerenza |
| Lecce Over 4,5 corner | 42.75% | 40.75% | 2.6 | 11.16% | 5.96% | Media | NO | altra soglia canonica meglio classificata |
| Lecce Over 3,5 corner | 57.72% | 54.5% | 1.75 | 1.01% | -4.62% | Media | NO | EV operativo inferiore al 2%; statistical model requires non negative conservative ev |
| Lecce Over 2,5 corner | 73.38% | 69.71% | 1.3 | -4.61% | -9.38% | Media | NO | EV operativo inferiore al 2%; statistical model requires non negative conservative ev |

### Sensibilità dell'euristica

| Variante | Totale | Scelte cambiate | Scelte confermate |
| --- | --- | --- | --- |
| value-first | 34 | 8 | 29 |
| stability-first | 31 | 23 | 20 |

Queste varianti non sono nuovi modelli: cambiano soltanto l'ordine lessicografico tra i candidati che hanno già superato i medesimi gate.

## C. Mercati statistici

| Famiglia | Individuati | A | B | C | D | Selezionati |
| --- | --- | --- | --- | --- | --- | --- |
| Tiri totali | 6282 | 340 | 132 | 5380 | 430 | 5 |
| Tiri in porta | 4699 | 166 | 186 | 3853 | 494 | 5 |
| Corner | 1493 | 165 | 82 | 335 | 911 | 10 |
| Cartellini | 4760 | 0 | 0 | 2431 | 2329 | 0 |

- Tiri e SOT giocatore DUO: sostituto incluso; sui SOT anche pali/traverse
- Tiri e SOT giocatore standard: il contratto richiede almeno una occorrenza in entrambi i tempi e non equivale al totale full-match V2
- Cartellini: le regole Sisal escludono panchina, staff, post-partita e già sostituiti; gli actuals aggregati disponibili non certificano queste esclusioni

Dati necessari per lo sblocco:

- Identità effettiva del sostituto, minuti e pesi di scenario per DUO
- Actuals cartellini event-level con stato del giocatore e timestamp
- Ulteriori snapshot prospettici per monitorare calibrazione e drift senza riusare MD6

## D. Qualità

Le 383 selezioni certificate e i loro contratti sono invariati: **SÌ**. Il catalogo interno conserva 1446 righe, di cui 408 NOT_MODELLED; la UI mostra soltanto le selezioni del motore.

- PASS — `npm run test:schedina:md06`
- PASS — `npm run test:schedina`
- PASS — `npm run test:css`
- PASS — `node --no-warnings scripts/test-app-modules.mjs`
- PASS — `node scripts/check-schedina-md06-suggestions-browser.cjs`
- PASS — `git diff --check`
- BLOCKED_BY_MISSING_HISTORICAL_FIXTURE — `npm test`: data/raw/referee-stats/espn/2023-24/serie-a/679226.json.gz assente; il blocco precede i test MD6.

## File modificati

- `scripts/md06-statistical-models.js`
- `scripts/build-md06-statistical-models.js`
- `scripts/md06-statistical-coverage.js`
- `scripts/md06-market-catalog.js`
- `scripts/md06-suggested-forecasts.js`
- `scripts/build-md06-betting-decision-package.mjs`
- `scripts/build-md06-suggested-forecasts.js`
- `scripts/build-betting-matchday.js`
- `scripts/test-md06-statistical-models.js`
- `scripts/test-schedina-md06.js`
- `scripts/test-md06-scenario-coherence.js`
- `scripts/test-md06-suggested-forecasts.js`
- `scripts/check-schedina-md06-suggestions-browser.cjs`
- `package.json`
- `data/analysis/serie-a-md06-statistical-models-2026-10-10.json`
- `data/normalized/schedina-md06.json`
- `output/reports/serie-a-md06-statistical-models-2026-10-10.md`
- `output/reports/serie-a-md06-betting-selection-2026-10-09.json`
- `output/reports/serie-a-md06-betting-selection-2026-10-09.md`
- `output/reports/serie-a-md06-definitive-selection-2026-10-10.json`
- `output/reports/serie-a-md06-definitive-selection-2026-10-10.md`
- `output/md06/schedina-definitive-1440x1000.png`
- `output/md06/schedina-definitive-390x844.png`
