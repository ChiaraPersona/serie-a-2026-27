# Serie A 2026/27 — Fase 5B.2: integrazione DNB e mercati B2

Generato: 2026-10-09T21:50:20.156Z. Ambito: esclusivamente Schedina Serie A MD6.

## Esito

Stato: **COMPLETATO**. Il catalogo passa da **160** a **383** selezioni: **20 DNB canonici** e **203 B2** aggiunti. Restano **367 valutate** e **16 NOT_MODELLED**. B3 e B4 non sono stati importati.

| Perimetro | Richiesti | Recuperati | Respinti |
| --- | --- | --- | --- |
| DNB fuori dai 886 | 20 | 20 | 0 |
| B2 auditati | 203 | 203 | 0 |

Le 160 righe precedenti restano presenti: **144 valutate** e **16 NOT_MODELLED**. Nessun ID B2 manca rispetto all'audit e nessun ID inatteso è stato aggiunto (mancanti 0, inattesi 0).

## Conteggi per famiglia

| Famiglia | Righe | Valutate | NOT_MODELLED | EV + | EV - | EV = 0 |
| --- | --- | --- | --- | --- | --- | --- |
| DNB canonico | 20 | 20 | 0 | 7 | 13 | 0 |
| Multigoal partita | 105 | 105 | 0 | 8 | 97 | 0 |
| Multigoal squadra | 71 | 71 | 0 | 9 | 62 | 0 |
| Gol squadra · Over | 27 | 27 | 0 | 4 | 23 | 0 |

Totale finale: EV positivo **67**, EV negativo **300**, EV zero **0**, NOT_MODELLED **16**. Incrementi: DNB 7/13/0 e B2 21/182/0 per EV positivo/negativo/zero.

## Conteggi per partita

| matchId | Totale | Valutate | N/D | DNB | MG partita | MG squadra | Over squadra | EV + | EV - | EV 0 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| genoa-fiorentina-2026-27-md-06 | 34 | 32 | 2 | 2 | 9 | 5 | 2 | 3 | 29 | 0 |
| inter-parma-2026-27-md-06 | 35 | 34 | 1 | 2 | 10 | 8 | 2 | 12 | 22 | 0 |
| napoli-frosinone-2026-27-md-06 | 39 | 37 | 2 | 2 | 11 | 7 | 3 | 8 | 29 | 0 |
| como-roma-2026-27-md-06 | 40 | 37 | 3 | 2 | 10 | 8 | 3 | 5 | 32 | 0 |
| lazio-monza-2026-27-md-06 | 39 | 37 | 2 | 2 | 11 | 7 | 3 | 11 | 26 | 0 |
| lecce-bologna-2026-27-md-06 | 39 | 39 | 0 | 2 | 10 | 7 | 3 | 0 | 39 | 0 |
| sassuolo-milan-2026-27-md-06 | 38 | 37 | 1 | 2 | 11 | 7 | 3 | 1 | 36 | 0 |
| cagliari-juventus-2026-27-md-06 | 39 | 39 | 0 | 2 | 11 | 7 | 2 | 6 | 33 | 0 |
| atalanta-venezia-2026-27-md-06 | 41 | 38 | 3 | 2 | 11 | 8 | 3 | 3 | 35 | 0 |
| torino-udinese-2026-27-md-06 | 39 | 37 | 2 | 2 | 11 | 7 | 3 | 18 | 19 | 0 |

## Metodo e semantica

- DNB: solo le 20 righe già presenti in `predictions.marketComparison`. La probabilità visualizzata e la quota equa sono condizionate all'assenza del pareggio; l'EV resta quello canonico `P(vittoria) × quota + P(pareggio) - 1`. Il pareggio è serializzato come push/rimborso sul tempo regolamentare.
- B2: somma delle celle compatibili della matrice punteggi V2 normalizzata. Probabilità prudente uguale al minimo tra matrice centrale e le quattro sensibilità lambda ±10%; fair `1/P prudente`; EV `P prudente × quota - 1`.
- Predicati: intervalli Multigoal inclusivi; squadra 1=casa e squadra 2=trasferta; Over squadra applicato alla soglia esatta del mercato.
- Provenienza: providerMarketId/providerSelectionId, snapshot quote, versione modello, timestamp previsione, predicato e sensibilità sono conservati nel BetSelection.
- Nessuna nuova lambda, formula, distribuzione o probabilità DNB è stata introdotta.

## Verifiche

- 4/4 valutazioni B2 omologhe già serializzate riprodotte.
- 20/20 DNB riprodotti con formula push-aware; la formula binaria `P condizionata × quota - 1` è rifiutata dai test.
- Normalizzazione matrici, estremi Multigoal inclusivi, distinzione casa/trasferta, soglie Over, sensibilità/prudenza, fair ed EV verificati.
- Rigenerazione stabile a input invariati; selectionId univoci; quote aperte e valide; identità provider verificate.
- Policy preservata: zero Under, falli individuali, corner per periodo e doppia chance 12; nessun mercato giocatore non valido.
- UI invariata nella struttura: nessun filtro, top-N o nuova sezione; ordinamento EV, click riga e schedina personale conservati. Il DNB esplicita soltanto “Prob. senza X” e “Rimborso sul pareggio”.

## Anomalie e differenze

- Respinti DNB: 0. Respinti B2 auditati: 0.
- B2 rispetto all'audit 5B.1: mancanti 0, inattesi 0.
- B3: 527, B4: 156; entrambi lasciati fuori dal catalogo.
- Lo snapshot quote contiene una selezione Over squadra non aperta esterna ai 203 B2 auditati; resta esclusa e non altera la riconciliazione.

## File interessati

- `scripts/predictions/engine.js` (sole esportazioni di funzioni pure già esistenti)
- `scripts/score-market-evaluation.js`
- `scripts/betting-selection-contract.js`
- `scripts/md06-market-catalog.js`
- `scripts/build-md06-betting-decision-package.mjs`
- `scripts/test-score-market-evaluation.js`
- `scripts/test-schedina-md06.js`
- `scripts/check-schedina-md06-browser.cjs`
- `js/pages/betting.js`
- `data/normalized/schedina-md06.json`
- `output/reports/serie-a-md06-betting-selection-2026-10-09.{json,md}`
- `output/md06/schedina-1440x1000.png` e `output/md06/schedina-390x844-betslip.png`
- `output/reports/serie-a-md06-phase-5b2-2026-10-09.md`

## Stato finale del worktree

Il worktree resta intenzionalmente non pulito: contiene le modifiche e gli artefatti della Fase 5B.2 sopra elencati, oltre agli input/report dell'audit 5B.1 e a modifiche Champions preesistenti estranee. Questi ultimi non sono stati modificati né inclusi nell'integrazione. Nessun file MD1–MD5, MyCombo, quota sorgente o previsione originale risulta modificato dalla Fase 5B.2.

Non sono stati modificati Engine V2 nelle formule, previsioni originarie, quote sorgente, MyCombo, MD1–MD5, Champions/multileague, B3 o B4. Nessun commit, push o deploy eseguito.
