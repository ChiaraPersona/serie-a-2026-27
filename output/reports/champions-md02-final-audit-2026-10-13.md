# Champions MD2 — audit finale outsider, etichette e preferiti

Generato il 2026-10-13T14:38:28.124Z. Fonte outsider/preferiti: `data/sources/champions-md02-phase12d-outsiders-2026-27.json`.

## 1. Audit degli 84,6 minuti attesi

**Esito: fallback condiviso confermato, non errore di assegnazione.** Tutti i 19 outsider individuali sono probabili titolari di movimento e ricevono la policy `existing-model-starter-exposure-0.94x90`: 0,94 × 90 = 84,6. Non sono 19 stime individualizzate. Il fattore scala linearmente il volume per 90 prima della riconciliazione ai volumi squadra e non rappresenta il rischio sostituzione specifico. Il motore e i forecast non sono stati modificati.

| Partita | Giocatore | Mercato | Quota | Forecast singolo | Min attesi | Storico min | Affidabilità |
|---|---|---:|---:|---:|---:|---:|---:|
| Lens - Sporting CP | Odsonne Édouard (forward) | Tiri O3,5 | 3.25 | 2,73 | 84,6 | 1841 | 67,2% |
| Lens - Sporting CP | Issa Doumbia (midfielder) | Tiri O1,5 | 2.40 | 1,56 | 84,6 | 3120 | 77,6% |
| Arsenal - Lille | Ayase Ueda (forward) | Tiri O2,5 | 3.50 | 2,4 | 84,6 | 2969 | 76,7% |
| Arsenal - Lille | Benjamin André (midfielder) | Tiri O0,5 | 2.50 | 0,84 | 84,6 | 2946 | 76,6% |
| Atlético de Madrid - Manchester United | Marcus Rashford (forward) | Tiri O3,5 | 4.50 | 2,91 | 84,6 | 2341 | 72,2% |
| Atlético de Madrid - Manchester United | Alejandro Grimaldo (defender) | SOT O0,5 | 2.00 | 0,75 | 84,6 | 3603 | 80% |
| Inter - Club Brugge | Hugo Vetlesen (midfielder) | SOT O0,5 | 2.75 | 0,69 | 84,6 | 1472 | 62,1% |
| Galatasaray - Barcelona | Dani Olmo (forward) | Tiri O3,5 | 2.75 | 2,72 | 84,6 | 2522 | 73,7% |
| Leipzig - PSV Eindhoven | Sven Mijnans (midfielder) | SOT O1,5 | 3.75 | 1,17 | 84,6 | 3588 | 80% |
| Viking - Bayern München | Kristoffer Askildsen (midfielder) | Tiri O1,5 | 4.00 | 1,84 | 84,6 | 2189 | 70,9% |
| Villarreal - Napoli | Giovanni Di Lorenzo (defender) | Tiri O0,5 | 1.80 | 0,85 | 84,6 | 2278 | 71,7% |
| Feyenoord - Como | Nacho Ferri (forward) | SOT O1,5 | 3.00 | 1,52 | 84,6 | 2914 | 76,4% |
| LASK - Liverpool | Kasper Jørgensen (defender) | Tiri O2,5 | 4.50 | 2,15 | 84,6 | 2760 | 75,4% |
| Roma - Real Madrid | Paulo Dybala (forward) | Tiri O3,5 | 2.40 | 2,94 | 84,6 | 1355 | 60,1% |
| Roma - Real Madrid | Marten De Roon (midfielder) | Tiri O0,5 | 2.00 | 0,81 | 84,6 | 2714 | 75,1% |
| Aston Villa - Fenerbahçe | Mason Greenwood (forward) | Tiri O3,5 | 2.25 | 2,97 | 84,6 | 3142 | 77,7% |
| Bodø/Glimt - Borussia Dortmund | Sondre Auklend (midfielder) | Tiri O2,5 | 4.00 | 2,14 | 84,6 | 2184 | 70,8% |
| Manchester City - Paris Saint-Germain | Enzo Fernández (midfielder) | SOT O0,5 | 2.00 | 0,65 | 84,6 | 3869 | 81,1% |
| Real Betis - Porto | Abde Ezzalzouli (forward) | Tiri O3,5 | 2.50 | 2,85 | 84,6 | 3061 | 77,3% |

Tutti i contratti sono DUO: tiri `28507` includono il sostituto; SOT `28506` includono sostituto e pali/traverse. Perciò P, quota equa ed EV restano N/D. Il rischio principale comune è l'incompatibilità tra forecast del solo titolare e payoff del contratto provider, aggravata dai minuti non individualizzati.

## 2. Audit outsider

Analizzati 106 candidati di qualità (88 individuali, 18 squadra); approvati 26, esclusi dopo il quality screen 80. I 7 outsider squadra sono classe A:

| Partita | Esito | Quota | P modello | EV | Classe |
|---|---:|---:|---:|---:|---:|
| Arsenal - Lille | UNDER 2,5 gol | 2.40 | 46,4% | +11,4% | A |
| Atlético de Madrid - Manchester United | OVER 3,5 gol | 2.50 | 43,6% | +9% | A |
| Galatasaray - Barcelona | UNDER 3,5 gol | 2.40 | 46,8% | +12,3% | A |
| Viking - Bayern München | UNDER 3,5 gol | 2.90 | 39,6% | +14,8% | A |
| LASK - Liverpool | UNDER 2,5 gol | 3.10 | 35,9% | +11,3% | A |
| Roma - Real Madrid | UNDER 2,5 gol | 2.90 | 37,5% | +8,7% | A |
| Slovan Bratislava - Stuttgart | UNDER 2,5 gol | 3.25 | 38,5% | +25,1% | A |

I 19 individuali sono classe B: identità risolta, probabile titolarità, storico verificato, soglia e quota provider esatte; non ricevono inferenze probabilistiche. Quote alte non sono state equiparate automaticamente a valore.

## 3. Classificazione matematica

- Classe A: 42 selezioni complessive matematicamente valutabili, incluse le 7 outsider squadra.
- Classe B: 78 individuali DUO complessivi supportati dai volumi ma con P/quota equa/EV N/D, inclusi 19 outsider.
- Classe C: mercati non supportati non pubblicati; le selezioni già valide restano selezionabili.

- **DNB, handicap e mercati con push (C)** — Gestione push/handicap non serializzata nel forecast MD2.
- **Goal/no-goal, multigol e combo goal (C)** — Nessuna probabilita originale serializzata per l'identico contratto; non ricostruita dalla sola media.
- **Corner diversi da U/O squadra 4.5 (B/C)** — Volumi disponibili, ma il backtest esistente certifica soltanto la soglia squadra 4.5.
- **Falli match, squadra e giocatore (C)** — Distribuzione non validata e contratti Sisal inclusivi dei supplementari dove presenti.
- **Punti cartellini e cartellini DUO (C)** — Target provider diverso dal conteggio cartellini del forecast; cap per giocatore e sostituto non modellati.
- **Marcatori e primo/ultimo marcatore (C)** — Probabilita giocatore, sostituto, ordine e pali/traverse non modellate sul contratto Sisal.
- **Primo tempo, entrambi i tempi e combo (C)** — Il modello disponibile e full-match e non certifica le dipendenze richieste.

## 4. Etichette outsider

`isOutsider: true` è emesso dal builder solo se il selectionId appartiene a `teamPicks` o `individualPicks` della fonte editoriale versionata. Conteggio verificato: **26**. Il badge OUTSIDER è presente sia in lettura sia in schedina; nessun selectionId è codificato nei renderer.

## 5. Pronostico preferito per partita

I 18 preferiti sono espliciti in `preferredPicks`, tutti classe A e già inclusi nelle 120 selezioni. Una quota alta non è stata usata come criterio sufficiente.

| Partita | Preferito | Quota | P modello | EV | Anche outsider |
|---|---|---:|---:|---:|---:|
| Lens - Sporting CP | Lens o pareggio (1X) | 1.50 | 61,3% | -8,1% | No |
| Sabah - Slavia Praha | Totale partita over 2,5 gol | 1.57 | 65,5% | +2,8% | No |
| Arsenal - Lille | Totale partita under 3,5 gol | 1.52 | 68,6% | +4,3% | No |
| Atlético de Madrid - Manchester United | Totale partita over 2,5 gol | 1.60 | 65,5% | +4,8% | No |
| Inter - Club Brugge | Club Brugge over 10,5 tiri | 1.72 | 60,7% | +4,4% | No |
| Galatasaray - Barcelona | Totale partita under 3,5 gol | 2.40 | 46,8% | +12,3% | Sì |
| Leipzig - PSV Eindhoven | PSV Eindhoven over 4,5 corner | 2.00 | 57,4% | +14,8% | No |
| Viking - Bayern München | Totale partita under 3,5 gol | 2.90 | 39,6% | +14,8% | Sì |
| Villarreal - Napoli | Villarreal o pareggio (1X) | 1.30 | 64,8% | -15,8% | No |
| Feyenoord - Como | Feyenoord over 3,5 tiri in porta | 1.45 | 83,2% | +20,6% | No |
| LASK - Liverpool | Totale partita under 3,5 gol | 1.80 | 58% | +4,4% | No |
| Roma - Real Madrid | Roma over 3,5 tiri in porta | 1.45 | 78,1% | +13,2% | No |
| Aston Villa - Fenerbahçe | Aston Villa (1) | 1.62 | 70,2% | +13,7% | No |
| Shakhtar Donetsk - AEK Athens | AEK Athens under 4,5 corner | 1.62 | 63,7% | +3,2% | No |
| Bodø/Glimt - Borussia Dortmund | Bodø/Glimt over 10,5 tiri | 1.27 | 90,2% | +14,6% | No |
| Manchester City - Paris Saint-Germain | Paris Saint-Germain over 3,5 tiri in porta | 1.36 | 77,7% | +5,7% | No |
| Real Betis - Porto | Porto over 10,5 tiri | 1.40 | 74,4% | +4,2% | No |
| Slovan Bratislava - Stuttgart | Totale partita under 3,5 gol | 1.90 | 60,8% | +15,5% | No |

## 6. Implementazione tecnica

Fonte editoriale → `scripts/build-champions-md02-schedina.js` → `data/normalized/schedina-champions-md02.json` → `js/pages/champions.js` e `js/pages/betting.js`. I badge sono compatti; il preferito usa stella dorata e bordo sottile. Se una selezione è sia outsider sia preferita, mostra entrambe le etichette. Nessun redesign, nessuna modifica al motore matematico, quote o contratti.

## 7. Sincronizzazione letture / schedina / MyCombo

Stessa fonte normalizzata e stesso selectionId sulle due pagine. Totali verificati: 120 pronostici, 120 cliccabili, 26 outsider, 18 preferiti, 42 valutabili, 78 DUO N/D. Quote, soglie, modificatori e payload MyCombo restano quelli del provider.

| Partita | Totale | Outsider | Preferiti | Classe A | DUO N/D |
|---|---:|---:|---:|---:|---:|
| Lens - Sporting CP | 6 | 2 | 1 | 1 | 5 |
| Sabah - Slavia Praha | 2 | 0 | 1 | 2 | 0 |
| Arsenal - Lille | 9 | 3 | 1 | 3 | 6 |
| Atlético de Madrid - Manchester United | 8 | 3 | 1 | 3 | 5 |
| Inter - Club Brugge | 7 | 1 | 1 | 2 | 5 |
| Galatasaray - Barcelona | 7 | 2 | 1 | 2 | 5 |
| Leipzig - PSV Eindhoven | 6 | 1 | 1 | 2 | 4 |
| Viking - Bayern München | 7 | 2 | 1 | 2 | 5 |
| Villarreal - Napoli | 6 | 1 | 1 | 1 | 5 |
| Feyenoord - Como | 8 | 1 | 1 | 3 | 5 |
| LASK - Liverpool | 6 | 2 | 1 | 3 | 3 |
| Roma - Real Madrid | 11 | 3 | 1 | 5 | 6 |
| Aston Villa - Fenerbahçe | 6 | 1 | 1 | 1 | 5 |
| Shakhtar Donetsk - AEK Athens | 4 | 0 | 1 | 2 | 2 |
| Bodø/Glimt - Borussia Dortmund | 6 | 1 | 1 | 2 | 4 |
| Manchester City - Paris Saint-Germain | 8 | 1 | 1 | 3 | 5 |
| Real Betis - Porto | 7 | 1 | 1 | 2 | 5 |
| Slovan Bratislava - Stuttgart | 6 | 1 | 1 | 3 | 3 |

## 8. Test automatici e browser

- Dati/contratti: **PASS** — `node scripts/test-champions-md02-schedina.mjs`.
- Browser desktop 1280 px e mobile 390 px: **PASS** — `node scripts/check-champions-md02-schedina-browser.cjs`.
- Casi visivi: Roma–Real Madrid (molte selezioni), Sabah–Slavia Praga (poche), Galatasaray–Barcelona (preferito anche outsider).
- Controlli: conteggi, badge, doppia etichetta, overflow, click e persistenza MyCombo, sync lettura/schedina.

## 9. Regressioni e mercati Sisal

Catalogo riusato senza nuovo download: 18 eventi, 37.489 mercati, 127.347 selezioni.

| Tipologia | Mercati | Quote valide | Classi | Selezionati | Esito audit |
|---|---:|---:|---:|---:|---|
| 1X2 / doppia chance / DNB | 54 | 142 | A/C | 0 | 1X2 e doppia chance sono valutabili dalle probabilita gia serializzate; DNB e handicap richiedono gestione push non serializzata per questo output. |
| Altri mercati | 11.137 | 22.648 | C | 0 | Primo/secondo tempo, entrambi i tempi, handicap, combinazioni e mercati temporali non hanno un target probabilistico identico gia serializzato. |
| Cartellini / punti cartellini | 1339 | 1554 | C | 0 | Il forecast conta cartellini, mentre Sisal quota punti cartellini con massimo due per giocatore o contratti DUO: target non equivalente. |
| Corner | 1360 | 2490 | A/B/C | 5 | Solo U/O corner squadra 4.5 e classificato A: e la soglia esatta del walk-forward. Le altre soglie restano descrittive e non ricevono P/EV. |
| Falli | 4973 | 4938 | C | 0 | Forecast centrali senza distribuzione validata sul contratto; le poche linee match/squadra includono i supplementari. |
| Goal / over-under / multigol | 1095 | 7972 | A/C | 13 | Over/under 1.5, 2.5 e 3.5 usano la distribuzione Poisson gia adottata. Goal/no-goal, multigol e combo non vengono ricostruiti fuori dal motore. |
| Marcatori e goal giocatore | 11.384 | 35.053 | C | 0 | Nessuna probabilita marcatore originale compatibile con sostituto, tempi, combinazioni o pali/traverse. |
| SOT giocatore DUO + pali/traverse | 1796 | 1796 | B | 8 | Volume SOT del singolo disponibile; contratto 28506 include sostituto e pali/traverse. Probabilita, quota equa ed EV null. |
| Tiri e SOT squadra/partita | 1425 | 1425 | A/C | 6 | Solo tiri squadra 10.5 e SOT squadra 3.5 sono soglie esatte coperte dal walk-forward. Totali partita e altre soglie non sono promossi. |
| Tiri giocatore DUO | 2926 | 2926 | B | 25 | Volume del singolo disponibile; contratto 28507 include il sostituto. Probabilita, quota equa ed EV null. |

Le regressioni coperte comprendono Champions MD1 e Serie A MD6. Questo agente non ha eseguito commit, push o deploy. Durante la lavorazione è però comparso il commit concorrente esterno `400910a4` (“arbitraggio”), già coincidente con `origin/main`, che ha inglobato anche i file di questa fase; la cronologia non è stata alterata per tentare di rimuoverlo.

## 10. Gate finale

**PARTIAL.** Integrazione, contratti, conteggi, tracciabilità e resa sono completi. Restano due criticità dichiarate: gli 84,6 minuti dei 19 outsider individuali sono un fallback condiviso, non una previsione individualizzata; inoltre un processo concorrente esterno ha committato e pubblicato lo stato del repository mentre il lavoro era in corso. I contratti DUO restano correttamente classe B e senza P/quota equa/EV.
