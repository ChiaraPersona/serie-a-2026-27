# Serie A 2026/27 — Schedina MD6: revisione definitiva del motore di selezione

Generato: 2026-10-10T09:09:55.071Z. Engine V2 4.13.0; quote Sisal snapshot 2026-10-09T10:43:00.203Z.

## Esito

Selezionati **12** pronostici, media **1.2** per partita. Versione precedente: **24**; delta **-12**. L'obiettivo indicativo di 100 non è raggiunto perché i mercati statistici restano privi di validazione sufficiente e diverse partite non presentano valore robusto.

> Quote verificate nello snapshot Sisal del 9 ottobre 2026; disponibilità corrente non verificata.

## A. Audit e copertura

Il motore precedente richiedeva P centrale e prudente almeno 50%, affidabilità Alta/Media e coerenza di scenario; ordinava per probabilità prudente e centrale. Quote ed EV non contribuivano alla scelta. Il nuovo motore non usa un punteggio pseudo-statistico: applica gate espliciti e un ordinamento lessicografico documentato.

| Partita | Catalogo | Quotati | Valutati | EV > 0 | Precedenti | Selezionati |
| --- | --- | --- | --- | --- | --- | --- |
| Genoa – Fiorentina | 155 | 155 | 32 | 3 | 3 | 0 |
| Inter – Parma | 150 | 150 | 34 | 12 | 2 | 3 |
| Napoli – Frosinone | 152 | 152 | 37 | 8 | 0 | 1 |
| Como – Roma | 162 | 162 | 37 | 5 | 4 | 2 |
| Lazio – Monza | 73 | 73 | 37 | 11 | 0 | 1 |
| lecce – bologna | 164 | 164 | 39 | 0 | 4 | 0 |
| Sassuolo – Milan | 166 | 166 | 37 | 1 | 4 | 0 |
| Cagliari – Juventus | 161 | 161 | 39 | 6 | 4 | 1 |
| Atalanta – Venezia | 133 | 133 | 38 | 3 | 0 | 1 |
| Torino – Udinese | 130 | 130 | 37 | 18 | 3 | 3 |

### Famiglie selezionate

| Famiglia | Numero |
| --- | --- |
| Gol e risultati | 12 |

## B. Scelta delle soglie

Ogni gruppo usa un'identità canonica basata su metrica, entità, direzione e contratto; non sulla somiglianza delle etichette. L'ordinamento bilanciato privilegia prima il downside prudente non negativo, poi qualità, EV prudente, EV operativo e probabilità prudente.

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

### Torino – Udinese — goals:match:over

| Soglia | P | P prudente | Quota | EV | EV prudente | Affidabilità | Scelta | Decisione |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Over 3,5 gol | 40.4% | 33.2% | 3.6 | 45.4% | 19.4% | Bassa | NO | altra soglia canonica meglio classificata |
| Over 2,5 gol | 62.6% | 55.6% | 2 | 25.2% | 11.1% | Media | SÌ | Scelta dal ranking dopo gate, deduplicazione e controllo di coerenza |
| Over 1,5 gol | 83.3% | 78.6% | 1.33 | 10.7% | 4.6% | Media | NO | altra soglia canonica meglio classificata |

### Torino – Udinese — goals:match:range

| Soglia | P | P prudente | Quota | EV | EV prudente | Affidabilità | Scelta | Decisione |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Multigoal 3-6 | 58% | 52.7% | 2.1 | 10.6% | 10.7% | Bassa | NO | implica o è implicato da una scelta meglio classificata |
| Multigoal 3-5 | 51.8% | 48.1% | 2.2 | 5.8% | 5.8% | Bassa | NO | implica o è implicato da una scelta meglio classificata |
| Multigoal 2-6 | 78.7% | 75.8% | 1.36 | 3.1% | 3.1% | Bassa | SÌ | Scelta dal ranking dopo gate, deduplicazione e controllo di coerenza |
| Multigoal 3-4 | 40.2% | 38.6% | 2.6 | 0.5% | 0.4% | Bassa | NO | EV operativo inferiore al 2% |
| Multigoal 2-5 | 72.4% | 71.2% | 1.4 | -0.3% | -0.3% | Bassa | NO | EV operativo inferiore al 2%; affidabilità Bassa con downside prudente negativo |
| Multigoal 1-6 | 91.5% | 90.3% | 1.06 | -4.3% | -4.3% | Bassa | NO | EV operativo inferiore al 2%; affidabilità Bassa con downside prudente negativo |
| Multigoal 2-4 | 60.8% | 58.6% | 1.57 | -8% | -8% | Bassa | NO | EV operativo inferiore al 2%; affidabilità Bassa con downside prudente negativo |
| Multigoal 1-5 | 85.2% | 82.3% | 1.1 | -9.5% | -9.5% | Bassa | NO | EV operativo inferiore al 2%; affidabilità Bassa con downside prudente negativo |
| Multigoal 1-4 | 73.6% | 68.8% | 1.16 | -20.2% | -20.2% | Bassa | NO | EV operativo inferiore al 2%; affidabilità Bassa con downside prudente negativo |
| Multigoal 2-3 | 42.9% | 39.5% | 1.95 | -22.9% | -23% | Bassa | NO | EV operativo inferiore al 2%; affidabilità Bassa con downside prudente negativo |
| Multigoal 1-3 | 55.7% | 49.7% | 1.4 | -30.4% | -30.4% | Bassa | NO | EV operativo inferiore al 2%; affidabilità Bassa con downside prudente negativo |

### Sensibilità dell'euristica

| Variante | Totale | Scelte cambiate | Scelte confermate |
| --- | --- | --- | --- |
| value-first | 14 | 8 | 9 |
| stability-first | 11 | 11 | 6 |

Queste varianti non sono nuovi modelli: cambiano soltanto l'ordine lessicografico tra i candidati che hanno già superato i medesimi gate.

## C. Mercati statistici

| Famiglia | Individuati | A | B | C | D | Selezionati |
| --- | --- | --- | --- | --- | --- | --- |
| Tiri totali | 6282 | 0 | 472 | 5380 | 430 | 0 |
| Tiri in porta | 4699 | 0 | 352 | 3853 | 494 | 0 |
| Corner | 1493 | 0 | 247 | 335 | 911 | 0 |
| Cartellini | 4760 | 0 | 0 | 2431 | 2329 | 0 |

- Tiri e SOT giocatore DUO: sostituto incluso; sui SOT anche pali/traverse
- Tiri e SOT squadra/partita: distribuzioni e verifica temporale fuori campione non validate
- Corner squadra/partita e 1X2: gate Fase 5C insufficiente
- Cartellini: contratto punti cartellino e distribuzione non riconciliati

Dati necessari per lo sblocco:

- Snapshot prospettici pre-partita e risultati completi su più giornate
- Join temporale fuori campione per squadra e avversario
- Identità effettiva del sostituto e pesi di scenario per DUO
- Regole Sisal complete per pali/traverse e punti cartellino
- Calibrazione, Brier/log loss e intervalli cluster-bootstrap su campione adeguato

## D. Qualità

Le 383 selezioni certificate e i loro contratti sono invariati: **SÌ**. Il catalogo interno conserva 1446 righe, di cui 1079 NOT_MODELLED; la UI mostra soltanto le selezioni del motore.

- PASS — `npm run test:schedina`
- PASS — `npm run test:personal-betslip`
- PASS — `npm run test:css`
- PASS — `node --no-warnings scripts/test-app-modules.mjs`
- PASS — `node scripts/check-schedina-md06-suggestions-browser.cjs`
- PASS — `git diff --check`

## File modificati

- `scripts/md06-suggested-forecasts.js`
- `scripts/md06-market-catalog.js`
- `scripts/build-md06-suggested-forecasts.js`
- `scripts/test-md06-suggested-forecasts.js`
- `scripts/test-md06-scenario-coherence.js`
- `scripts/test-schedina-md06.js`
- `scripts/test-app-modules.mjs`
- `scripts/check-schedina-md06-suggestions-browser.cjs`
- `js/pages/betting.js`
- `css/betting.css`
- `css/styles.css`
- `scripts/build-site.js`
- `schedina.html`
- `data/normalized/schedina-md06.json`
- `output/reports/serie-a-md06-definitive-selection-2026-10-10.json`
- `output/reports/serie-a-md06-definitive-selection-2026-10-10.md`
- `output/md06/schedina-definitive-1440x1000.png`
- `output/md06/schedina-definitive-390x844.png`
