# Sisal MD6 — audit forense EV 1X2

Generato il 2026-10-09T11:43:31.693Z. Modalità **READ-ONLY + DIAGNOSTIC_RECOMPUTATION**. Nessun output M0/M1/M2 qui contenuto è una snapshot prospettica immutabile.

## A. Executive summary

I nove EV originari **esistono nei dati**: mercato, orientamento, probabilità serializzata e formula sono riproducibili. Non sono però nove value bet validate. Le probabilità provengono dalla matrice Poisson di produzione dell'Engine 4.13.0 sui gol attesi della snapshot MD6; non sono probabilità Player Market V2 e non sono output M0/M1/M2.

Mapping mercato: **PASS**. Orientamento: **PASS**. Riproduzione EV: **PASS**. Due segnali hanno ultimo aggiornamento quota oltre 48 ore.

## B. Nove EV originali

| Partita | Esito | Significato | Quota | P originale | EV | Market ID | Selection ID | Ultimo aggiornamento | Classificazione | Disposizione |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Inter – Parma | 2 | parma | 20 | 10.1% | 102% | 814492750 | 5337196342 | 2026-10-08T16:00:09.564Z | RESEARCH_ONLY_SIGNAL | MANTENERE_SOLO_COME_SEGNALE_RESEARCH |
| Napoli – Frosinone | 2 | frosinone | 6.5 | 25.6% | 66.4% | 814495093 | 5337168167 | 2026-10-08T18:45:11.905Z | RESEARCH_ONLY_SIGNAL | MANTENERE_SOLO_COME_SEGNALE_RESEARCH |
| Inter – Parma | X | draw | 9 | 16.8% | 51.2% | 814492750 | 5337196341 | 2026-10-08T16:00:09.564Z | RESEARCH_ONLY_SIGNAL | MANTENERE_SOLO_COME_SEGNALE_RESEARCH |
| Cagliari – Juventus | 1 | cagliari | 6 | 24.3% | 45.8% | 814493762 | 5337198914 | 2026-10-02T14:51:59.783Z | STALE_INPUT + RESEARCH_ONLY_SIGNAL | SCARTARE_FINCHÉ_NON_RIQUOTATO |
| Torino – Udinese | 2 | udinese | 3.25 | 44.6% | 45% | 814491937 | 5337165659 | 2026-10-09T09:56:53.061Z | RESEARCH_ONLY_SIGNAL | MANTENERE_SOLO_COME_SEGNALE_RESEARCH |
| Lazio  – Monza | 2 | monza | 5.75 | 24.2% | 39.2% | 814493295 | 5337198890 | 2026-10-06T18:51:28.984Z | STALE_INPUT + RESEARCH_ONLY_SIGNAL | SCARTARE_FINCHÉ_NON_RIQUOTATO |
| Como – Roma | 1 | como | 2.6 | 46.2% | 20.1% | 814496183 | 5337173145 | 2026-10-09T10:30:08.858Z | MODEL_DISAGREEMENT + RESEARCH_ONLY_SIGNAL | SCARTARE_COME_VALUE_ROBUSTO_MODEL_DEPENDENT |
| Genoa – Fiorentina | 1 | genoa | 3.25 | 36.7% | 19.3% | 814492192 | 5337193800 | 2026-10-09T08:11:24.359Z | RESEARCH_ONLY_SIGNAL | MANTENERE_SOLO_COME_SEGNALE_RESEARCH |
| Napoli – Frosinone | X | draw | 4.75 | 25% | 18.8% | 814495093 | 5337168166 | 2026-10-08T18:45:11.905Z | RESEARCH_ONLY_SIGNAL | MANTENERE_SOLO_COME_SEGNALE_RESEARCH |

## C. Audit mercati

Tutte le dieci partite hanno un solo mercato `marketCode=3`, `1X2 ESITO FINALE`, variante `ESITO FINALE 1X2`, pre-match, con tre esiti aperti. Il raw Sisal conferma `codiceEsito 1 → 1`, `2 → X`, `3 → 2`; quote intere raw divise per 100. Regolamento consultato: https://www.sisal.it/content/dam/new-dam/italy/canali/sisal-it/doc-pdf/scommesse/info-scommesse/calcio.pdf.

| Partita | Event ID | Market ID | Aggiornato | Età al download | Overround | Certificazione |
| --- | --- | --- | --- | --- | --- | --- |
| Atalanta – Venezia | 4871932 | 814494386 | 2026-10-08T06:12:17.714Z | 28.5 h | 8.18% | PASS |
| Cagliari – Juventus | 4871929 | 814493762 | 2026-10-02T14:51:59.783Z | 163.9 h | 7.85% | PASS |
| Como – Roma | 4871933 | 814496183 | 2026-10-09T10:30:08.858Z | 0.2 h | 5.49% | PASS |
| Genoa – Fiorentina | 4871925 | 814492192 | 2026-10-09T08:11:24.359Z | 2.5 h | 5.98% | PASS |
| Inter – Parma | 4871927 | 814492750 | 2026-10-08T16:00:09.564Z | 18.7 h | 4.61% | PASS |
| Lazio  – Monza | 4871928 | 814493295 | 2026-10-06T18:51:28.984Z | 63.9 h | 7.75% | PASS |
| Lecce – Bologna | 4871934 | 814497157 | 2026-10-08T21:13:36.241Z | 13.5 h | 8.35% | PASS |
| Napoli – Frosinone | 4871930 | 814495093 | 2026-10-08T18:45:11.905Z | 16 h | 5.4% | PASS |
| Sassuolo – Milan | 4871931 | 814495639 | 2026-10-09T04:00:04.763Z | 6.7 h | 8.33% | PASS |
| Torino – Udinese | 4871926 | 814491937 | 2026-10-09T09:56:53.061Z | 0.8 h | 6.51% | PASS |

## D. Audit mapping casa/trasferta

| Partita | 1 | X | 2 | Esito |
| --- | --- | --- | --- | --- |
| Atalanta – Venezia | atalanta | draw | venezia | PASS |
| Cagliari – Juventus | cagliari | draw | juventus | PASS |
| Como – Roma | como | draw | roma | PASS |
| Genoa – Fiorentina | genoa | draw | fiorentina | PASS |
| Inter – Parma | inter | draw | parma | PASS |
| Lazio  – Monza | lazio | draw | monza | PASS |
| Lecce – Bologna | lecce | draw | bologna | PASS |
| Napoli – Frosinone | napoli | draw | frosinone | PASS |
| Sassuolo – Milan | sassuolo | draw | milan | PASS |
| Torino – Udinese | torino | draw | udinese | PASS |

Il normalizzatore conserva `firstCompetitor` come casa e `secondCompetitor` come trasferta, quindi associa le fixture canoniche nello stesso orientamento. Nessuna correzione silenziosa è stata applicata.

## E. Audit probabilità

Catena originale: dati storici/recenti e contesto pre-match → `expectedGoals()` → matrice Poisson 0–7 rinormalizzata → `technicalProbabilities()` → `probabilities.final` → probabilità serializzata a 0,1 punti percentuali → `EV = P × quota − 1`. Le quote non entrano nella probabilità finale. M0/M1/M2 non erano presenti come prediction MD6.

Snapshot: 2026-10-03T00:03:57.494Z; Engine 4.13.0; cutoff esclusivo MD6; hash file bb12972bedf482ab4210a11256ee3af1b68f442d264d3bdb106419c7aee38f78. Input di ricerca: 2026-10-03T09:55:53.102Z, etichetta **PROSPECTIVE FROZEN V2 INPUTS — NO EXACT-SCORE PREDICTIONS**.

## F. Verifica matrici exact-score

| Partita | Modello | λ casa | λ trasferta | P1 | PX | P2 | Massa | Coda max |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Atalanta – Venezia | M0 | 1.48 | 1.42 | 39% | 24.8% | 36.3% | 1 | 3.31e-13 |
| Atalanta – Venezia | M1 | 1.5343 | 0.8296 | 53.9% | 25.8% | 20.3% | 1 | 4.69e-13 |
| Atalanta – Venezia | M2 | 1.5469 | 1.5471 | 38.1% | 23.9% | 38.1% | 1 | 1.86e-13 |
| Cagliari – Juventus | M0 | 1.48 | 1.42 | 39% | 24.8% | 36.3% | 1 | 3.31e-13 |
| Cagliari – Juventus | M1 | 0.6886 | 0.9609 | 25.2% | 34.2% | 40.6% | 1 | 2.04e-13 |
| Cagliari – Juventus | M2 | 1.1037 | 1.5377 | 27.3% | 25.4% | 47.3% | 1 | 1.67e-13 |
| Como – Roma | M0 | 1.48 | 1.42 | 39% | 24.8% | 36.3% | 1 | 3.31e-13 |
| Como – Roma | M1 | 1.1707 | 1.1447 | 36.5% | 28.3% | 35.2% | 1 | 3.40e-13 |
| Como – Roma | M2 | 1.5478 | 1.7243 | 34.8% | 23% | 42.2% | 1 | 1.44e-13 |
| Genoa – Fiorentina | M0 | 1.48 | 1.42 | 39% | 24.8% | 36.3% | 1 | 3.31e-13 |
| Genoa – Fiorentina | M1 | 1.2219 | 1.2348 | 36.1% | 27.3% | 36.7% | 0.999999999999 | 8.13e-13 |
| Genoa – Fiorentina | M2 | 1.3131 | 1.4339 | 34.5% | 25.5% | 40% | 1 | 4.17e-13 |
| Inter – Parma | M0 | 1.48 | 1.42 | 39% | 24.8% | 36.3% | 1 | 3.31e-13 |
| Inter – Parma | M1 | 2.2985 | 0.5122 | 77.9% | 15.5% | 6.6% | 0.999999999999 | 5.10e-13 |
| Inter – Parma | M2 | 2.0944 | 1.1526 | 59% | 20.7% | 20.3% | 1 | 3.05e-13 |
| Lazio  – Monza | M0 | 1.48 | 1.42 | 39% | 24.8% | 36.3% | 1 | 3.31e-13 |
| Lazio  – Monza | M1 | 1.7943 | 1.1307 | 52.9% | 23.2% | 23.9% | 1 | 2.18e-13 |
| Lazio  – Monza | M2 | 1.4506 | 1.4179 | 38.3% | 24.9% | 36.8% | 0.999999999999 | 6.79e-13 |
| Lecce – Bologna | M0 | 1.48 | 1.42 | 39% | 24.8% | 36.3% | 1 | 3.31e-13 |
| Lecce – Bologna | M1 | 0.6568 | 1.3298 | 18.4% | 28.6% | 53% | 1 | 4.72e-13 |
| Lecce – Bologna | M2 | 1.2614 | 1.5721 | 30.6% | 24.8% | 44.6% | 1 | 1.66e-13 |
| Napoli – Frosinone | M0 | 1.48 | 1.42 | 39% | 24.8% | 36.3% | 1 | 3.31e-13 |
| Napoli – Frosinone | M1 | 1.3945 | 1.0927 | 43.8% | 26.7% | 29.5% | 1 | 2.86e-13 |
| Napoli – Frosinone | M2 | 1.7803 | 1.3737 | 47.1% | 23.1% | 29.8% | 1 | 2.58e-13 |
| Sassuolo – Milan | M0 | 1.48 | 1.42 | 39% | 24.8% | 36.3% | 1 | 3.31e-13 |
| Sassuolo – Milan | M1 | 0.7811 | 1.6882 | 17.1% | 23.9% | 59% | 0.999999999999 | 5.67e-13 |
| Sassuolo – Milan | M2 | 1.5025 | 1.3629 | 40.7% | 24.9% | 34.4% | 1 | 2.08e-13 |
| Torino – Udinese | M0 | 1.48 | 1.42 | 39% | 24.8% | 36.3% | 1 | 3.31e-13 |
| Torino – Udinese | M1 | 1.486 | 1.6529 | 34.6% | 23.6% | 41.8% | 1 | 3.26e-13 |
| Torino – Udinese | M2 | 1.5052 | 1.3768 | 40.5% | 24.8% | 34.7% | 1 | 2.36e-13 |

Le distribuzioni marginali e tutte le celle delle 30 matrici sono serializzate nel report JSON. Ogni matrice usa supporto dinamico, coda controllata e massa entro 1e-9.

## G. Inter–Parma

Engine originale: λ Inter 2.35, λ Parma 0.75; P(1) 73.1%, P(X) 16.8%, P(2) 10.1%. Quote 1,13 / 9,00 / 20,00. EV X 51.2%, EV 2 102%.

Nessuna inversione: X e 2 risultano entrambi positivi perché il motore assegna 26,9% complessivo a pareggio/Parma contro 15,6% no-vig Sisal. È divergenza di modello, non impossibilità economica o duplicazione.

## H. Napoli–Frosinone

Engine originale: λ Napoli 1.59, λ Frosinone 1.07; P(1) 49.4%, P(X) 25%, P(2) 25.6%. Quote 1,45 / 4,75 / 6,50. EV X 18.8%, EV 2 66.4%.

Il motore di produzione non aveva xG comparabile per la coppia e ha usato il fallback gol; M1/M2 diagnostici applicano shrinkage e fallback di lega quando manca il prior Serie A del Frosinone. Nessun bonus o malus automatico da neopromossa.

## I. Confronto M0/M1/M2

Tutti i valori seguenti sono **DIAGNOSTIC_RECOMPUTATION** eseguiti oggi sui vettori congelati pre-MD6; non sono snapshot retrodatate.

| Partita | Esito | Quota | P M0 | P M1 | P M2 | EV M0 | EV M1 | EV M2 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Atalanta – Venezia | 1 | 1.52 | 39% | 53.9% | 38.1% | -40.8% | -18% | -42.2% |
| Atalanta – Venezia | X | 4 | 24.8% | 25.8% | 23.9% | -0.9% | 3.1% | -4.5% |
| Atalanta – Venezia | 2 | 5.75 | 36.3% | 20.3% | 38.1% | 108.6% | 16.7% | 118.9% |
| Cagliari – Juventus | 1 | 6 | 39% | 25.2% | 27.3% | 133.7% | 51.4% | 63.6% |
| Cagliari – Juventus | X | 3.75 | 24.8% | 34.2% | 25.4% | -7.1% | 28.2% | -4.6% |
| Cagliari – Juventus | 2 | 1.55 | 36.3% | 40.6% | 47.3% | -43.8% | -37.1% | -26.7% |
| Como – Roma | 1 | 2.6 | 39% | 36.5% | 34.8% | 1.3% | -5.1% | -9.6% |
| Como – Roma | X | 3.5 | 24.8% | 28.3% | 23% | -13.3% | -1.1% | -19.3% |
| Como – Roma | 2 | 2.6 | 36.3% | 35.2% | 42.2% | -5.7% | -8.4% | 9.7% |
| Genoa – Fiorentina | 1 | 3.25 | 39% | 36.1% | 34.5% | 26.6% | 17.2% | 12.1% |
| Genoa – Fiorentina | X | 3.25 | 24.8% | 27.3% | 25.5% | -19.5% | -11.3% | -17.1% |
| Genoa – Fiorentina | 2 | 2.25 | 36.3% | 36.7% | 40% | -18.4% | -17.5% | -10% |
| Inter – Parma | 1 | 1.13 | 39% | 77.9% | 59% | -56% | -12% | -33.3% |
| Inter – Parma | X | 9 | 24.8% | 15.5% | 20.7% | 122.9% | 39.3% | 86.4% |
| Inter – Parma | 2 | 20 | 36.3% | 6.6% | 20.3% | 625.6% | 32.8% | 305.9% |
| Lazio  – Monza | 1 | 1.57 | 39% | 52.9% | 38.3% | -38.8% | -16.9% | -39.9% |
| Lazio  – Monza | X | 3.75 | 24.8% | 23.2% | 24.9% | -7.1% | -13% | -6.5% |
| Lazio  – Monza | 2 | 5.75 | 36.3% | 23.9% | 36.8% | 108.6% | 37.4% | 111.6% |
| Lecce – Bologna | 1 | 4.25 | 39% | 18.4% | 30.6% | 65.6% | -21.7% | 30.2% |
| Lecce – Bologna | X | 3.25 | 24.8% | 28.6% | 24.8% | -19.5% | -7.1% | -19.5% |
| Lecce – Bologna | 2 | 1.85 | 36.3% | 53% | 44.6% | -32.9% | -2% | -17.5% |
| Napoli – Frosinone | 1 | 1.45 | 39% | 43.8% | 47.1% | -43.5% | -36.5% | -31.7% |
| Napoli – Frosinone | X | 4.75 | 24.8% | 26.7% | 23.1% | 17.6% | 26.9% | 9.8% |
| Napoli – Frosinone | 2 | 6.5 | 36.3% | 29.5% | 29.8% | 135.8% | 91.5% | 93.4% |
| Sassuolo – Milan | 1 | 4 | 39% | 17.1% | 40.7% | 55.8% | -31.6% | 62.8% |
| Sassuolo – Milan | X | 3.6 | 24.8% | 23.9% | 24.9% | -10.9% | -14% | -10.4% |
| Sassuolo – Milan | 2 | 1.8 | 36.3% | 59% | 34.4% | -34.7% | 6.2% | -38% |
| Torino – Udinese | 1 | 2.3 | 39% | 34.6% | 40.5% | -10.4% | -20.4% | -6.9% |
| Torino – Udinese | X | 3.1 | 24.8% | 23.6% | 24.8% | -23.2% | -26.8% | -23.1% |
| Torino – Udinese | 2 | 3.25 | 36.3% | 41.8% | 34.7% | 17.9% | 35.8% | 12.9% |

## J. Margini Sisal

Per ogni partita: probabilità grezze `1/quota`; overround = somma grezze − 1; no-vig = normalizzazione proporzionale. L'EV usa sempre la quota offerta, non la quota no-vig.

| Partita | P1 raw | PX raw | P2 raw | P1 no-vig | PX no-vig | P2 no-vig | Overround |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Atalanta – Venezia | 65.8% | 25% | 17.4% | 60.8% | 23.1% | 16.1% | 8.18% |
| Cagliari – Juventus | 16.7% | 26.7% | 64.5% | 15.5% | 24.7% | 59.8% | 7.85% |
| Como – Roma | 38.5% | 28.6% | 38.5% | 36.5% | 27.1% | 36.5% | 5.49% |
| Genoa – Fiorentina | 30.8% | 30.8% | 44.4% | 29% | 29% | 41.9% | 5.98% |
| Inter – Parma | 88.5% | 11.1% | 5% | 84.6% | 10.6% | 4.8% | 4.61% |
| Lazio  – Monza | 63.7% | 26.7% | 17.4% | 59.1% | 24.7% | 16.1% | 7.75% |
| Lecce – Bologna | 23.5% | 30.8% | 54.1% | 21.7% | 28.4% | 49.9% | 8.35% |
| Napoli – Frosinone | 69% | 21.1% | 15.4% | 65.4% | 20% | 14.6% | 5.4% |
| Sassuolo – Milan | 25% | 27.8% | 55.6% | 23.1% | 25.6% | 51.3% | 8.33% |
| Torino – Udinese | 43.5% | 32.3% | 30.8% | 40.8% | 30.3% | 28.9% | 6.51% |

## K. Calibrazione e limiti

| Modello | Campione | RPS 1X2 | LogLoss 1X2 | Score LogLoss | Stato |
| --- | --- | --- | --- | --- | --- |
| M0 | 50 | 0.2496 | 1.0799 | 2.9825 | RESEARCH · non validato prospetticamente |
| M1 | 50 | 0.1912 | 0.9082 | 2.8316 | RESEARCH · non validato prospetticamente |
| M2 | 50 | 0.2028 | 0.9294 | 2.8109 | RESEARCH · non validato prospetticamente |

Campione comune: 50 partite. Gate: **INSUFFICIENT**. Leader retrospettivo descrittivo: xg-poisson-r0; NOT VALIDATED PROSPECTIVELY. Nessuna ricalibrazione è stata eseguita.

## L. Classificazione dei nove segnali

| Partita | Esito | M0 + | M1 + | M2 + | Verificato | Categorie | Verdetto operativo |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Inter – Parma | 2 | SÌ | SÌ | SÌ | SÌ | RESEARCH_ONLY_SIGNAL | MANTENERE_SOLO_COME_SEGNALE_RESEARCH |
| Napoli – Frosinone | 2 | SÌ | SÌ | SÌ | SÌ | RESEARCH_ONLY_SIGNAL | MANTENERE_SOLO_COME_SEGNALE_RESEARCH |
| Inter – Parma | X | SÌ | SÌ | SÌ | SÌ | RESEARCH_ONLY_SIGNAL | MANTENERE_SOLO_COME_SEGNALE_RESEARCH |
| Cagliari – Juventus | 1 | SÌ | SÌ | SÌ | SÌ | STALE_INPUT + RESEARCH_ONLY_SIGNAL | SCARTARE_FINCHÉ_NON_RIQUOTATO |
| Torino – Udinese | 2 | SÌ | SÌ | SÌ | SÌ | RESEARCH_ONLY_SIGNAL | MANTENERE_SOLO_COME_SEGNALE_RESEARCH |
| Lazio  – Monza | 2 | SÌ | SÌ | SÌ | SÌ | STALE_INPUT + RESEARCH_ONLY_SIGNAL | SCARTARE_FINCHÉ_NON_RIQUOTATO |
| Como – Roma | 1 | SÌ | NO | NO | SÌ | MODEL_DISAGREEMENT + RESEARCH_ONLY_SIGNAL | SCARTARE_COME_VALUE_ROBUSTO_MODEL_DEPENDENT |
| Genoa – Fiorentina | 1 | SÌ | SÌ | SÌ | SÌ | RESEARCH_ONLY_SIGNAL | MANTENERE_SOLO_COME_SEGNALE_RESEARCH |
| Napoli – Frosinone | X | SÌ | SÌ | SÌ | SÌ | RESEARCH_ONLY_SIGNAL | MANTENERE_SOLO_COME_SEGNALE_RESEARCH |

`Verificato` significa soltanto aritmeticamente e semanticamente riproducibile; non significa vantaggio economico validato.

## M. Bug identificati

| ID | Gravità | Stato | Effetto |
| --- | --- | --- | --- |
| PROBABILITY_PROVENANCE_LABELING_GAP | MEDIUM | CONFIRMED_REPORTING_DEFECT | La formula EV è corretta, ma la provenienza del numeratore non era sufficientemente esplicita. |
| SERIALIZED_ROUNDED_PROBABILITY_USED_FOR_EV | LOW | CONFIRMED_PRECISION_LIMIT | Piccole differenze numeriche, nessuna delle nove righe cambia segno. |
| STALE_QUOTE_NOT_EXCLUDED_FROM_POSITIVE_COUNT | MEDIUM | CONFIRMED_REPORTING_GAP | Cagliari–Juventus 1 e Lazio–Monza 2 richiedono una nuova quotazione prima di qualsiasi uso economico. |

Nessun errore di formula EV, inversione casa/trasferta o mapping 1/X/2 è stato rilevato.

## N. Correzioni consigliate, NON applicate

- Serializzare sempre source model, engine/model version, cutoff, timestamp, lambda e providerMarketId/providerSelectionId nelle righe EV.
- Separare esplicitamente PRODUCTION_ENGINE_POISSON_1X2 da PLAYER_MARKET_V2 e dalle baseline M0/M1/M2 RESEARCH.
- Calcolare l'EV diagnostico dalla probabilità non arrotondata e mostrare separatamente il valore riprodotto dalla probabilità serializzata.
- Escludere dal riepilogo economico le quote stale oltre una soglia dichiarata; conservarle solo nell'audit storico.
- Non promuovere alcun segnale finché M0/M1/M2 non dispongono di snapshot prospettici autentici e calibrazione sufficiente.

## O. Test

Esito complessivo: **PASS_WITH_KNOWN_PREEXISTING_GUARD_FAILURE**.

| Test | Esito | Nota |
| --- | --- | --- |
| node --check forensic audit | PASS | — |
| validate-sisal-odds | PASS | — |
| sisal/test | PASS | — |
| test-prediction-snapshots | PASS | — |
| test-exact-score synthetic baseline | PASS | — |
| test-exact-score repository baseline | KNOWN_PREEXISTING_BASELINE_DRIFT | Le asserzioni del modello arrivano al guard finale; il confronto a riga 138 usa tmp/exact-score-m1-m2-before.json del 3 ottobre e segnala le modifiche repository intervenute da allora. Il manifest before/after di questo audit resta invariato. |
| test-predictions | PASS | — |
| git diff --check | PASS | — |

Il fallimento noto del guard repository non è stato riclassificato come PASS: resta esposto separatamente e non blocca la revisione manuale perché confronta lo stato odierno con un manifest storico del 3 ottobre. Le asserzioni sintetiche exact-score e il manifest before/after specifico di questo audit passano.

## P. Integrità degli asset protetti

File protetti: 11802. Manifest prima/dopo: e9689ce13c8c83ae17f23fd494e3cea0cc02aafe1d27c57e2bcd983c4ed60057 / e9689ce13c8c83ae17f23fd494e3cea0cc02aafe1d27c57e2bcd983c4ed60057. Modifiche rilevate: 0. **PASS**.

## Q. Verdetto finale

`1X2 MARKET MAPPING: PASS`

`ORIGINAL EV REPRODUCTION: PASS`

`HOME_AWAY ORIENTATION: PASS`

`M0/M1/M2 COMPARISON: COMPLETE`

`POSITIVE EV SIGNALS VERIFIED: 9/9`

`POSITIVE EV SIGNALS REJECTED: 0/9`

`POSITIVE EV SIGNALS UNRESOLVED: 0/9`

`EXACT SCORE MODEL STATE: RESEARCH`

`PRODUCTION MODELS: UNCHANGED`

`IMMUTABLE SNAPSHOTS: UNCHANGED`

`PRODUCTION INTEGRITY: PASS`

`READY FOR MANUAL REVIEW: YES`
