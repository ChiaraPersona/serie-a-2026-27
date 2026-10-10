# Serie A 2026/27 — Schedina MD6: revisione definitiva del motore di selezione

Generato: 2026-10-10T09:58:13.079Z. Engine V2 4.13.0; quote Sisal snapshot 2026-10-09T10:43:00.203Z.

## Esito

Selezionati **82** pronostici, media **8.2** per partita. Versione precedente: **32**; delta **50**. I pronostici con EV negativo ora selezionati sono **70**: l'EV resta esposto ma non determina ammissione o ordinamento.

> Quote verificate nello snapshot Sisal del 9 ottobre 2026; disponibilità corrente non verificata.

## A. Audit e copertura

Il motore precedente escludeva i mercati con EV centrale sotto +2% e, per le famiglie statistiche, con EV prudente negativo. La selezione ora usa coerenza sportiva, probabilità pertinente, solidità e varietà; quota ed EV non partecipano al gate o all'ordinamento generale.

| Partita | Catalogo | Quotati | Valutati | EV > 0 | Precedenti | Selezionati |
| --- | --- | --- | --- | --- | --- | --- |
| Genoa – Fiorentina | 155 | 155 | 110 | 6 | 2 | 9 |
| Inter – Parma | 150 | 150 | 104 | 38 | 5 | 9 |
| Napoli – Frosinone | 152 | 152 | 105 | 19 | 2 | 8 |
| Como – Roma | 162 | 162 | 114 | 10 | 3 | 10 |
| Lazio – Monza | 73 | 73 | 61 | 19 | 3 | 5 |
| Lecce – Bologna | 164 | 164 | 119 | 23 | 4 | 9 |
| Sassuolo – Milan | 166 | 166 | 117 | 14 | 4 | 9 |
| Cagliari – Juventus | 161 | 161 | 117 | 31 | 5 | 9 |
| Atalanta – Venezia | 133 | 133 | 96 | 5 | 1 | 7 |
| Torino – Udinese | 130 | 130 | 95 | 19 | 3 | 7 |

### Famiglie selezionate

| Famiglia | Numero |
| --- | --- |
| Tiri totali | 17 |
| Gol e risultati | 31 |
| Tiri in porta | 18 |
| Corner | 16 |

## B. Scelta delle soglie

Ogni gruppo usa un'identità canonica basata su metrica, entità, direzione e contratto; non sulla somiglianza delle etichette. La soglia è scelta con un obiettivo di probabilità differenziato per tipo di mercato, solidità del modello e un contributo secondario della quota; l'EV non entra nel confronto.

### Genoa – Fiorentina — goals:match:range

| Soglia | P | P prudente | Quota | EV | EV prudente | Affidabilità | Scelta | Decisione |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Multigoal 1-6 | 91.3% | 90% | 1.06 | -4.6% | -4.6% | Bassa | NO | altra soglia offre un equilibrio sportivo migliore |
| Multigoal 1-5 | 87.6% | 86.8% | 1.08 | -6.3% | -6.3% | Bassa | NO | altra soglia offre un equilibrio sportivo migliore |
| Multigoal 2-6 | 73.2% | 68.7% | 1.33 | -8.6% | -8.6% | Bassa | SÌ | Scelta dal ranking dopo gate, deduplicazione e controllo di coerenza |
| Multigoal 2-4 | 61.5% | 59.9% | 1.52 | -8.9% | -9% | Bassa | NO | supporto sportivo insufficiente per struttura del mercato e affidabilità |
| Multigoal 1-4 | 79.5% | 76.8% | 1.18 | -9.4% | -9.4% | Bassa | NO | altra soglia offre un equilibrio sportivo migliore |
| Multigoal 2-5 | 69.6% | 66.2% | 1.36 | -10% | -10% | Bassa | NO | altra soglia offre un equilibrio sportivo migliore |
| Multigoal 2-3 | 46.5% | 45% | 1.95 | -12.3% | -12.3% | Bassa | NO | supporto sportivo insufficiente per struttura del mercato e affidabilità |
| Multigoal 1-3 | 64.5% | 60.1% | 1.4 | -15.9% | -15.9% | Bassa | NO | altra soglia offre un equilibrio sportivo migliore |
| Multigoal 1-2 | 42.5% | 37.7% | 2 | -24.6% | -24.6% | Bassa | NO | supporto sportivo insufficiente per struttura del mercato e affidabilità |

### Genoa – Fiorentina — sot:match:home:over:TIRI IN PORTA

| Soglia | P | P prudente | Quota | EV | EV prudente | Affidabilità | Scelta | Decisione |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Genoa Over 2,5 tiri in porta | 75.12% | 72.81% | 1.25 | -6.1% | -8.99% | Media | SÌ | Scelta dal ranking dopo gate, deduplicazione e controllo di coerenza |
| Genoa Over 4,5 tiri in porta | 40.84% | 37.33% | 2.2 | -10.15% | -17.87% | Media | NO | supporto sportivo insufficiente per struttura del mercato e affidabilità |
| Genoa Over 5,5 tiri in porta | 26.67% | 24.67% | 3.25 | -13.31% | -19.81% | Media | NO | supporto sportivo insufficiente per struttura del mercato e affidabilità |
| Genoa Over 6,5 tiri in porta | 16.25% | 14.25% | 5.25 | -14.71% | -25.21% | Media | NO | supporto sportivo insufficiente per struttura del mercato e affidabilità |

### Genoa – Fiorentina — corners:match:home:over:CORNER

| Soglia | P | P prudente | Quota | EV | EV prudente | Affidabilità | Scelta | Decisione |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Genoa Over 7,5 corner | 14.12% | 12.12% | 6.5 | -8.23% | -21.23% | Media | NO | supporto sportivo insufficiente per struttura del mercato e affidabilità |
| Genoa Over 5,5 corner | 31.59% | 29.59% | 2.9 | -8.39% | -14.19% | Media | NO | supporto sportivo insufficiente per struttura del mercato e affidabilità |
| Genoa Over 6,5 corner | 21.52% | 19.52% | 4.25 | -8.53% | -17.03% | Media | NO | supporto sportivo insufficiente per struttura del mercato e affidabilità |
| Genoa Over 2,5 corner | 74.56% | 70.89% | 1.18 | -12.01% | -16.35% | Media | NO | altra soglia offre un equilibrio sportivo migliore |
| Genoa Over 4,5 corner | 44.38% | 42.38% | 1.95 | -13.47% | -17.37% | Media | NO | supporto sportivo insufficiente per struttura del mercato e affidabilità |
| Genoa Over 3,5 corner | 59.24% | 56.02% | 1.45 | -14.11% | -18.77% | Media | SÌ | Scelta dal ranking dopo gate, deduplicazione e controllo di coerenza |

### Genoa – Fiorentina — sot:match:match:over:TIRI IN PORTA

| Soglia | P | P prudente | Quota | EV | EV prudente | Affidabilità | Scelta | Decisione |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Partita Over 5,5 tiri in porta | 76.97% | 74.97% | 1.09 | -16.1% | -18.28% | Media | NO | altra soglia offre un equilibrio sportivo migliore |
| Partita Over 6,5 tiri in porta | 65.25% | 63.25% | 1.19 | -22.35% | -24.73% | Media | NO | altra soglia offre un equilibrio sportivo migliore |
| Partita Over 7,5 tiri in porta | 52.67% | 50.67% | 1.36 | -28.37% | -31.09% | Media | SÌ | Scelta dal ranking dopo gate, deduplicazione e controllo di coerenza |
| Partita Over 8,5 tiri in porta | 40.48% | 37.61% | 1.62 | -34.43% | -39.07% | Media | NO | supporto sportivo insufficiente per struttura del mercato e affidabilità |
| Partita Over 9,5 tiri in porta | 29.65% | 25.47% | 2 | -40.7% | -49.07% | Media | NO | supporto sportivo insufficiente per struttura del mercato e affidabilità |
| Partita Over 10,5 tiri in porta | 20.75% | 17.72% | 2.6 | -46.05% | -53.94% | Media | NO | supporto sportivo insufficiente per struttura del mercato e affidabilità |

### Genoa – Fiorentina — corners:match:match:over:CORNER

| Soglia | P | P prudente | Quota | EV | EV prudente | Affidabilità | Scelta | Decisione |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Partita Over 11,5 corner | 19.25% | 16.03% | 4.25 | -18.19% | -31.89% | Media | NO | supporto sportivo insufficiente per struttura del mercato e affidabilità |
| Partita Over 10,5 corner | 26.24% | 24.24% | 3.1 | -18.65% | -24.85% | Media | NO | supporto sportivo insufficiente per struttura del mercato e affidabilità |
| Partita Over 6,5 corner | 66.39% | 62.74% | 1.22 | -19% | -23.45% | Media | NO | altra soglia offre un equilibrio sportivo migliore |
| Partita Over 7,5 corner | 55.38% | 53.38% | 1.45 | -19.7% | -22.6% | Media | SÌ | Scelta dal ranking dopo gate, deduplicazione e controllo di coerenza |
| Partita Over 8,5 corner | 44.6% | 42.6% | 1.8 | -19.71% | -23.31% | Media | NO | supporto sportivo insufficiente per struttura del mercato e affidabilità |
| Partita Over 9,5 corner | 34.75% | 32.75% | 2.3 | -20.07% | -24.67% | Media | NO | supporto sportivo insufficiente per struttura del mercato e affidabilità |

### Genoa – Fiorentina — shots:match:match:over:TIRI TOTALI

| Soglia | P | P prudente | Quota | EV | EV prudente | Affidabilità | Scelta | Decisione |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Partita Over 19,5 tiri totali | 74.33% | 71.64% | 1.03 | -23.44% | -26.21% | Media | NO | altra soglia offre un equilibrio sportivo migliore |
| Partita Over 20,5 tiri totali | 69.43% | 67.43% | 1.05 | -27.1% | -29.2% | Media | NO | altra soglia offre un equilibrio sportivo migliore |
| Partita Over 21,5 tiri totali | 64.28% | 62.28% | 1.08 | -30.57% | -32.73% | Media | NO | altra soglia offre un equilibrio sportivo migliore |
| Partita Over 22,5 tiri totali | 59% | 56.63% | 1.12 | -33.92% | -36.58% | Media | NO | altra soglia offre un equilibrio sportivo migliore |
| Partita Over 23,5 tiri totali | 53.67% | 51.67% | 1.17 | -37.21% | -39.55% | Media | SÌ | Scelta dal ranking dopo gate, deduplicazione e controllo di coerenza |
| Partita Over 24,5 tiri totali | 48.39% | 45.14% | 1.24 | -40% | -44.03% | Media | NO | altra soglia offre un equilibrio sportivo migliore |
| Partita Over 25,5 tiri totali | 43.25% | 39.6% | 1.3 | -43.78% | -48.52% | Media | NO | supporto sportivo insufficiente per struttura del mercato e affidabilità |
| Partita Over 26,5 tiri totali | 38.32% | 34.69% | 1.42 | -45.59% | -50.74% | Media | NO | supporto sportivo insufficiente per struttura del mercato e affidabilità |
| Partita Over 27,5 tiri totali | 33.67% | 30.79% | 1.55 | -47.82% | -52.27% | Media | NO | supporto sportivo insufficiente per struttura del mercato e affidabilità |
| Partita Over 28,5 tiri totali | 29.33% | 26.88% | 1.7 | -50.14% | -54.31% | Media | NO | supporto sportivo insufficiente per struttura del mercato e affidabilità |
| Partita Over 29,5 tiri totali | 25.35% | 22.85% | 1.85 | -53.1% | -57.72% | Media | NO | supporto sportivo insufficiente per struttura del mercato e affidabilità |
| Partita Over 30,5 tiri totali | 21.73% | 19.73% | 2.1 | -54.36% | -58.56% | Media | NO | supporto sportivo insufficiente per struttura del mercato e affidabilità |

### Inter – Parma — corners:match:away:over:CORNER

| Soglia | P | P prudente | Quota | EV | EV prudente | Affidabilità | Scelta | Decisione |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Parma Over 7,5 corner | 5.6% | 3.6% | 33 | 84.74% | 18.74% | Media | NO | supporto sportivo insufficiente per struttura del mercato e affidabilità |
| Parma Over 6,5 corner | 9.97% | 7.97% | 16 | 59.58% | 27.58% | Media | NO | supporto sportivo insufficiente per struttura del mercato e affidabilità |
| Parma Over 5,5 corner | 17.04% | 15.04% | 9 | 53.33% | 35.33% | Media | NO | supporto sportivo insufficiente per struttura del mercato e affidabilità |
| Parma Over 4,5 corner | 27.69% | 25.69% | 5 | 38.43% | 28.43% | Media | NO | supporto sportivo insufficiente per struttura del mercato e affidabilità |
| Parma Over 3,5 corner | 42.38% | 39.16% | 2.9 | 22.9% | 13.57% | Media | NO | supporto sportivo insufficiente per struttura del mercato e affidabilità |
| Parma Over 2,5 corner | 60.36% | 56.69% | 1.8 | 8.65% | 2.04% | Media | SÌ | Scelta dal ranking dopo gate, deduplicazione e controllo di coerenza |

### Inter – Parma — sot:match:away:over:TIRI IN PORTA

| Soglia | P | P prudente | Quota | EV | EV prudente | Affidabilità | Scelta | Decisione |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Parma Over 4,5 tiri in porta | 22.64% | 19.13% | 6 | 35.85% | 14.79% | Media | NO | supporto sportivo insufficiente per struttura del mercato e affidabilità |
| Parma Over 5,5 tiri in porta | 12.2% | 10.2% | 11 | 34.17% | 12.17% | Media | NO | supporto sportivo insufficiente per struttura del mercato e affidabilità |
| Parma Over 3,5 tiri in porta | 38.36% | 35.06% | 3.25 | 24.68% | 13.94% | Media | NO | supporto sportivo insufficiente per struttura del mercato e affidabilità |
| Parma Over 2,5 tiri in porta | 58.47% | 56.16% | 1.95 | 14.02% | 9.5% | Media | SÌ | Scelta dal ranking dopo gate, deduplicazione e controllo di coerenza |

### Sensibilità dell'euristica

| Variante | Totale | Scelte cambiate | Scelte confermate |
| --- | --- | --- | --- |
| probability-first | 82 | 0 | 82 |
| solidity-first | 83 | 3 | 81 |

Queste varianti non sono nuovi modelli: confrontano priorità alla probabilità o alla solidità senza utilizzare EV o quota nell'ordinamento generale.

## C. Mercati statistici

| Famiglia | Individuati | A | B | C | D | Selezionati |
| --- | --- | --- | --- | --- | --- | --- |
| Tiri totali | 6282 | 340 | 132 | 5380 | 430 | 17 |
| Tiri in porta | 4699 | 166 | 186 | 3853 | 494 | 18 |
| Corner | 1493 | 165 | 82 | 335 | 911 | 16 |
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

- Test finali da eseguire dopo la rigenerazione.

## File modificati

- `scripts/md06-suggested-forecasts.js`
- `scripts/build-md06-suggested-forecasts.js`
- `scripts/test-md06-suggested-forecasts.js`
- `scripts/test-schedina-md06.js`
- `scripts/check-schedina-md06-suggestions-browser.cjs`
- `data/normalized/schedina-md06.json`
- `output/reports/serie-a-md06-definitive-selection-2026-10-10.json`
- `output/reports/serie-a-md06-definitive-selection-2026-10-10.md`
- `output/md06/schedina-definitive-1440x1000.png`
- `output/md06/schedina-definitive-390x844.png`
