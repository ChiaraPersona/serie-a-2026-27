# Serie A 2026/27 — Schedina MD6: coerenza dei pronostici

Generato: 2026-10-09T23:37:45.225Z. Engine V2 4.13.0; previsioni congelate 2026-10-09T19:08:03.078Z.

## Esito

PASS. 383 selezioni, 383 identità uniche, quote/probabilità/EV/ordine invariati. La classificazione non usa quote o EV.

## Scenario prevalente per partita

| Partita | Scenario | 1 | X | 2 | Moda esatta | Risultato centrale | xG | Banda gol | Coerenti | Alternative | Multi | N/D |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Genoa - Fiorentina | 2 | 36.4% | 25.8% | 37.8% | 1-1 (12.2%) | 1-1 | 1.34-1.37 | 2-3 gol (46.5%) | 2 | 5 | 25 | 2 |
| Inter - Parma | 1 | 73.2% | 16.7% | 10.1% | 2-0 (12.5%) | 2-1 | 2.36-0.75 | 2-3 gol (44.1%) | 2 | 5 | 27 | 1 |
| Napoli - Frosinone | 1 | 48.7% | 25.1% | 26.2% | 1-1 (11.9%) | 2-1 | 1.58-1.09 | 2-3 gol (46.7%) | 2 | 5 | 30 | 2 |
| Como - Roma | 1 | 46.2% | 24.7% | 29.1% | 1-1 (11.6%) | 2-1 | 1.6-1.22 | 2-3 gol (46%) | 2 | 5 | 30 | 3 |
| Lazio - Monza | 1 | 53.9% | 22.4% | 23.7% | 1-1 (10.4%) | 2-1 | 1.89-1.18 | 2-3 gol (44.3%) | 2 | 5 | 30 | 2 |
| Lecce - Bologna | 2 | 21.6% | 25.4% | 53.0% | 0-1 (13.3%) | 1-2 | 0.9-1.57 | 2-3 gol (47.1%) | 2 | 5 | 32 | 0 |
| Sassuolo - Milan | 2 | 22.9% | 23.6% | 53.5% | 1-1 (11.2%) | 1-2 | 1.06-1.75 | 2-3 gol (46.1%) | 2 | 5 | 30 | 1 |
| Cagliari - Juventus | 2 | 24.0% | 25.7% | 50.3% | 0-1 (12.6%) | 1-2 | 0.97-1.53 | 2-3 gol (47%) | 2 | 5 | 32 | 0 |
| Atalanta - Venezia | 1 | 62.9% | 21.3% | 15.8% | 1-0 (11.9%) | 2-1 | 1.94-0.85 | 2-3 gol (46.2%) | 2 | 5 | 31 | 3 |
| Torino - Udinese | 2 | 32.3% | 23.1% | 44.6% | 1-1 (10.2%) | 1-2 | 1.47-1.76 | 2-3 gol (42.9%) | 2 | 5 | 30 | 2 |

La moda esatta è il singolo punteggio con massa maggiore; il risultato centrale è la proiezione arrotondata degli xG. Non vengono trattati come sinonimi dell'esito 1X2 prevalente.

## Totali classificazione

| Classe | Selezioni |
| --- | --- |
| Coerenti | 20 |
| Alternative | 50 |
| Multi-scenario | 297 |
| Non determinabili | 16 |

## Relazioni logiche tra mercati della stessa partita

| Relazione | Coppie |
| --- | --- |
| MUTUALLY_EXCLUSIVE | 998 |
| LOGICAL_IMPLICATION | 551 |
| EQUIVALENT_OVERLAP | 39 |
| COMPATIBLE_CORRELATED | 5159 |
| NOT_DIRECTLY_COMPARABLE | 417 |

Le coppie mutuamente esclusive sono alternative legittime nel catalogo, non errori. Implicazioni e sovrapposizioni descrivono dipendenze; i mercati marginali non congiunti alla 1X2 restano non direttamente confrontabili.

## Audit numerico

- Triple 1/X/2 verificate: 10/10; tutte sommano al 100% entro 0,01 punti percentuali.
- Righe 1X2 canoniche confrontate con predictions.probabilities.final: 30.
- Probabilità B2 ricalcolate dalla matrice punteggi congelata: 203/203.
- Incoerenze numeriche: 0.

## Correzioni effettuate

- Riepilogo V2 per partita con 1/X/2, esito prevalente, moda esatta, risultato centrale, xG e banda gol.
- Classificazione di ogni selezione ottenuta da logica risultato/punteggio o dalla dichiarazione di distribuzione marginale; EV e quote esclusi.
- Colorazione discreta delle righe e legenda unica per partita, senza cambiare l'ordinamento EV.
- Schedina personale: incompatibilità, implicazioni/correlazioni e combinabilità bookmaker presentate come livelli separati, senza bloccare l'aggiunta.

## Screenshot

- `output/md06/schedina-scenario-coherence-1440x1000.png`
- `output/md06/schedina-scenario-coherence-390x844.png`

## Test

- PASS — `node scripts/test-md06-scenario-coherence.js`
- PASS — `npm run test:schedina`
- PASS — `npm run test:personal-betslip`
- PASS — `npm run test:css`
- PASS — `node --no-warnings scripts/test-app-modules.mjs`
- PASS — `node scripts/check-schedina-md06-scenario-browser.cjs`
- PASS — `git diff --check`

## File modificati

- `scripts/md06-scenario-coherence.js`
- `scripts/md06-market-catalog.js`
- `scripts/build-md06-scenario-coherence.js`
- `scripts/test-md06-scenario-coherence.js`
- `scripts/check-schedina-md06-scenario-browser.cjs`
- `scripts/test-personal-betslip.mjs`
- `scripts/test-schedina-md06.js`
- `package.json`
- `js/pages/betting.js`
- `js/pages/personal-betslip-store.mjs`
- `css/betting.css`
- `css/styles.css`
- `scripts/build-site.js`
- `schedina.html`
- `data/normalized/schedina-md06.json`
- `output/reports/serie-a-md06-scenario-coherence-2026-10-10.json`
- `output/reports/serie-a-md06-scenario-coherence-2026-10-10.md`
- `output/md06/schedina-scenario-coherence-1440x1000.png`
- `output/md06/schedina-scenario-coherence-390x844.png`
