# Serie A 2026/27 — Schedina MD6: integrazione tiratori, SOT e cartellini

Generato: 2026-10-11T18:08:07.601Z. Engine V2 4.13.0; quote Sisal snapshot 2026-10-10T09:57:30.921Z.

## Esito

- Totale iniziale: **82**.
- Draw No Bet rimossi: **2**.
- Pronostici approvati non-DNB preservati: **80**.
- Nuovi tiri individuali: **57**.
- Nuovi SOT individuali: **32**.
- Nuovi cartellini individuali: **0**.
- Nuovi Over cartellini: **0**.
- Pronostici senza quota: **0**.
- Totale finale: **169**.

> Le quote della baseline restano quelle certificate nello snapshot 2026-10-10T09:57:30.921Z; i 95 mercati tiri/SOT usano le quote del contratto Sisal DUO nello snapshot 2026-10-10T09:57:30.921Z. Il contratto include l'eventuale sostituto e, per i SOT, pali e traverse. Probabilità DUO ed EV restano N/D.

## Totale finale per partita

| Partita | Iniziali | DNB rimossi | Preservati | Nuovi tiri | Nuovi SOT | Senza quota | Finale |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Genoa – Fiorentina | 9 | 1 | 8 | 5 | 2 | 0 | 15 |
| Inter – Parma | 9 | 0 | 9 | 5 | 4 | 0 | 18 |
| Napoli – Frosinone | 8 | 0 | 8 | 5 | 2 | 0 | 15 |
| Como – Roma | 10 | 0 | 10 | 5 | 5 | 0 | 20 |
| Lazio – Monza | 5 | 0 | 5 | 9 | 5 | 0 | 19 |
| Lecce – Bologna | 9 | 1 | 8 | 4 | 3 | 0 | 15 |
| Sassuolo – Milan | 9 | 0 | 9 | 5 | 2 | 0 | 16 |
| Cagliari – Juventus | 9 | 0 | 9 | 7 | 3 | 0 | 19 |
| Atalanta – Venezia | 7 | 0 | 7 | 5 | 3 | 0 | 15 |
| Torino – Udinese | 7 | 0 | 7 | 7 | 3 | 0 | 17 |

## Collegamento Letture → Schedina

Letture e Schedina ora condividono la stessa sorgente strutturata: **SÌ**. La sorgente è `data/normalized/predictions.json#predictions[].shooters`, già consumata da `js/pages/readings.js`. Il selettore non estrae nomi dall'HTML e non ricalcola Poisson, minuti, matchup o allocazione.

Per ogni giocatore e statistica viene scelta una sola soglia dalle probabilità V2 serializzate. La previsione resta riferita al singolo, mentre quota e identificativi appartengono al contratto Sisal DUO e sono collegati senza duplicare la riga.

## Quote e contratti

Nuovi pronostici individuali quotati: **89**. Nuovi pronostici individuali senza quota: **4**. Contratti DUO promossi: **89**.

I contratti DUO includono il giocatore nominato e il suo eventuale sostituto; il codice 28506 include anche pali e traverse. Le quote sono associate, ma probabilità DUO ed EV restano N/D perché la probabilità V2 individuale non viene trasferita al contratto bookmaker.

## Cartellini

Nessun cartellino individuale e nessun Over cartellini è stato aggiunto. `likelyBooked` e `riskScore` restano euristiche non calibrate; inoltre mancano actuals event-level sufficienti per certificare le esclusioni previste dal settlement Sisal. La presenza di una quota non basta a promuovere il mercato.

## Candidati delle letture ancora esclusi

| Partita | Giocatore | Statistica | Motivo |
| --- | --- | --- | --- |
| genoa-fiorentina-2026-27-md-06 | Junior Messias | SOT | selettività SOT: minuti, precisione o stabilità insufficienti |
| genoa-fiorentina-2026-27-md-06 | Beto | Tiri | minuti, stabilità o supporto outsider insufficienti per i tiri |
| genoa-fiorentina-2026-27-md-06 | Beto | SOT | selettività SOT: minuti, precisione o stabilità insufficienti |
| genoa-fiorentina-2026-27-md-06 | Mikael Ellertsson | Tiri | minuti, stabilità o supporto outsider insufficienti per i tiri |
| inter-parma-2026-27-md-06 | Hakan Çalhanoglu | Tiri | minuti, stabilità o supporto outsider insufficienti per i tiri |
| inter-parma-2026-27-md-06 | Hakan Çalhanoglu | SOT | selettività SOT: minuti, precisione o stabilità insufficienti |
| napoli-frosinone-2026-27-md-06 | Kevin De Bruyne | SOT | selettività SOT: minuti, precisione o stabilità insufficienti |
| napoli-frosinone-2026-27-md-06 | David Neres | Tiri | minuti, stabilità o supporto outsider insufficienti per i tiri |
| napoli-frosinone-2026-27-md-06 | Farès Ghedjemis | SOT | selettività SOT: minuti, precisione o stabilità insufficienti |
| napoli-frosinone-2026-27-md-06 | Gabriele Bracaglia | Tiri | minuti, stabilità o supporto outsider insufficienti per i tiri |
| napoli-frosinone-2026-27-md-06 | Giacomo Calo | SOT | nessuna soglia V2 supera il supporto minimo |
| napoli-frosinone-2026-27-md-06 | Stanislav Lobotka | Tiri | minuti, stabilità o supporto outsider insufficienti per i tiri |
| como-roma-2026-27-md-06 | Lucas Da Cunha | Tiri | minuti, stabilità o supporto outsider insufficienti per i tiri |
| como-roma-2026-27-md-06 | Yan Couto | Tiri | minuti, stabilità o supporto outsider insufficienti per i tiri |
| lazio-monza-2026-27-md-06 | Tijjani Noslin | SOT | selettività SOT: minuti, precisione o stabilità insufficienti |
| lecce-bologna-2026-27-md-06 | Riccardo Orsolini | Tiri | minuti, stabilità o supporto outsider insufficienti per i tiri |
| lecce-bologna-2026-27-md-06 | Riccardo Orsolini | SOT | selettività SOT: minuti, precisione o stabilità insufficienti |
| lecce-bologna-2026-27-md-06 | Amar Fatah | SOT | selettività SOT: minuti, precisione o stabilità insufficienti |
| lecce-bologna-2026-27-md-06 | Lewis Ferguson | Tiri | minuti, stabilità o supporto outsider insufficienti per i tiri |
| sassuolo-milan-2026-27-md-06 | Domenico Berardi | SOT | selettività SOT: minuti, precisione o stabilità insufficienti |
| sassuolo-milan-2026-27-md-06 | Christian Pulisic | Tiri | minuti, stabilità o supporto outsider insufficienti per i tiri |
| sassuolo-milan-2026-27-md-06 | Christian Pulisic | SOT | selettività SOT: minuti, precisione o stabilità insufficienti |
| sassuolo-milan-2026-27-md-06 | Vasilije Adzic | SOT | selettività SOT: minuti, precisione o stabilità insufficienti |
| sassuolo-milan-2026-27-md-06 | Adrien Rabiot | Tiri | minuti, stabilità o supporto outsider insufficienti per i tiri |
| cagliari-juventus-2026-27-md-06 | Nicolás González | SOT | selettività SOT: minuti, precisione o stabilità insufficienti |
| cagliari-juventus-2026-27-md-06 | Randal Kolo Muani | SOT | selettività SOT: minuti, precisione o stabilità insufficienti |
| cagliari-juventus-2026-27-md-06 | Bremer | SOT | nessuna soglia V2 supera il supporto minimo |
| cagliari-juventus-2026-27-md-06 | Michel Adopo | SOT | nessuna soglia V2 supera il supporto minimo |
| atalanta-venezia-2026-27-md-06 | Gianluca Scamacca | SOT | selettività SOT: minuti, precisione o stabilità insufficienti |
| atalanta-venezia-2026-27-md-06 | Charles De Ketelaere | SOT | selettività SOT: minuti, precisione o stabilità insufficienti |
| atalanta-venezia-2026-27-md-06 | Rowe | SOT | selettività SOT: minuti, precisione o stabilità insufficienti |
| atalanta-venezia-2026-27-md-06 | Éderson | Tiri | minuti, stabilità o supporto outsider insufficienti per i tiri |
| torino-udinese-2026-27-md-06 | Mandragora | SOT | selettività SOT: minuti, precisione o stabilità insufficienti |
| torino-udinese-2026-27-md-06 | Nikola Vlasic | SOT | nessuna soglia V2 supera il supporto minimo |
| torino-udinese-2026-27-md-06 | Hassane Kamara | SOT | selettività SOT: minuti, precisione o stabilità insufficienti |
| torino-udinese-2026-27-md-06 | Mërgim Vojvoda | Tiri | minuti, stabilità o supporto outsider insufficienti per i tiri |

## Controlli di qualità

Le 80 selezioni approvate non-DNB sono preservate con hash **ff600135e0a4009bc901c13c34bb1cfb5cb624ccd391caf2a2c1dd8e54c96af7**. Draw No Bet residui nei consigliati: **0**. Pronostici senza quota verificata: **0**.

Le 385 selezioni certificate e i loro contratti sono invariati: **SÌ**. MyCombo, modelli, pagine Champions e giornate precedenti non vengono rigenerati da questo script.

- PASS — `node scripts/test-schedina-md06.js`
- PASS — `node scripts/test-md06-suggested-forecasts.js`
- PASS — `node scripts/test-personal-betslip.mjs`
- PASS — `node scripts/check-schedina-md06-suggestions-browser.cjs`
- PASS — `git diff --check`

## File modificati

- `scripts/md06-player-forecast-integration.js`
- `scripts/md06-market-catalog.js`
- `scripts/md06-suggested-forecasts.js`
- `scripts/build-md06-suggested-forecasts.js`
- `js/pages/betting.js`
- `css/betting.css`
- `scripts/test-md06-suggested-forecasts.js`
- `scripts/test-schedina-md06.js`
- `scripts/check-schedina-md06-suggestions-browser.cjs`
- `data/normalized/schedina-md06.json`
- `output/reports/serie-a-md06-definitive-selection-2026-10-10.json`
- `output/reports/serie-a-md06-definitive-selection-2026-10-10.md`
- `output/md06/schedina-definitive-1440x1000.png`
- `output/md06/schedina-definitive-390x844.png`
