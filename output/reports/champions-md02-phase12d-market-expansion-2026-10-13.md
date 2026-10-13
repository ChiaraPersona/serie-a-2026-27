# Champions League 2026/27 — Fase 12D

Generato: 2026-10-13T16:01:46.8664249+02:00 · snapshot Sisal invariato: 2026-10-13T09:55:14.800Z

## Gate

**PARTIAL** — Integrazione completa e prepartita; PARTIAL perche i 59 mercati individuali DUO restano in classe B con probabilita/EV N/D e i contratti falli, punti cartellini e marcatori non equivalenti restano esclusi.

## Totali

- Baseline preservata: **63/63** selectionId, hash **0B3D8B6DA442D8C734A21939AB59FF1132E9E389D3932022122FA2855EBC760C**.
- Nuovi candidati individuati e inseriti: **31** (17 classe A, 14 classe B).
- Totale MD2: **94** pronostici; **94** cliccabili.
- Matematicamente valutabili: **35**; P/EV N/D: **59**.
- Integrita temporale: **31/31** nuove selezioni generate prima del kickoff; retrospettive **0**.
- Nessun nuovo download quote; snapshot locale con 18 eventi, 37.489 mercati e 127.347 selezioni.

## Mercati Sisal analizzati

| Tipologia | Mercati | Quote valide | Classi | Inseriti | Esito della verifica |
|---|---:|---:|---|---:|---|
| 1X2 / doppia chance / DNB | 54 | 142 | A/C | 0 | 1X2 e doppia chance sono valutabili dalle probabilita gia serializzate; DNB e handicap richiedono gestione push non serializzata per questo output. |
| Altri mercati | 11137 | 22648 | C | 0 | Primo/secondo tempo, entrambi i tempi, handicap, combinazioni e mercati temporali non hanno un target probabilistico identico gia serializzato. |
| Cartellini / punti cartellini | 1339 | 1554 | C | 0 | Il forecast conta cartellini, mentre Sisal quota punti cartellini con massimo due per giocatore o contratti DUO: target non equivalente. |
| Corner | 1360 | 2490 | A/B/C | 5 | Solo U/O corner squadra 4.5 e classificato A: e la soglia esatta del walk-forward. Le altre soglie restano descrittive e non ricevono P/EV. |
| Falli | 4973 | 4938 | C | 0 | Forecast centrali senza distribuzione validata sul contratto; le poche linee match/squadra includono i supplementari. |
| Goal / over-under / multigol | 1095 | 7972 | A/C | 6 | Over/under 1.5, 2.5 e 3.5 usano la distribuzione Poisson gia adottata. Goal/no-goal, multigol e combo non vengono ricostruiti fuori dal motore. |
| Marcatori e goal giocatore | 11384 | 35053 | C | 0 | Nessuna probabilita marcatore originale compatibile con sostituto, tempi, combinazioni o pali/traverse. |
| SOT giocatore DUO + pali/traverse | 1796 | 1796 | B | 3 | Volume SOT del singolo disponibile; contratto 28506 include sostituto e pali/traverse. Probabilita, quota equa ed EV null. |
| Tiri e SOT squadra/partita | 1425 | 1425 | A/C | 6 | Solo tiri squadra 10.5 e SOT squadra 3.5 sono soglie esatte coperte dal walk-forward. Totali partita e altre soglie non sono promossi. |
| Tiri giocatore DUO | 2926 | 2926 | B | 11 | Volume del singolo disponibile; contratto 28507 include il sostituto. Probabilita, quota equa ed EV null. |

## Nuovi candidati e pronostici inseriti

| Partita | Classe | Mercato | Selezione | Quota | P | EV | selectionId |
|---|---|---|---|---:|---:|---:|---|
| Sabah - Slavia Praha | A | Gol | Totale partita over 2,5 gol | 1.57 | 65.5% | +2.8% | `sisal:4858137:810810961:5317134384` |
| Arsenal - Lille | A | Gol | Totale partita under 3,5 gol | 1.52 | 68.6% | +4.3% | `sisal:4858146:810823359:5317157816` |
| Atlético de Madrid - Manchester United | A | Gol | Totale partita over 2,5 gol | 1.60 | 65.5% | +4.8% | `sisal:4858177:810814205:5317191046` |
| Inter - Club Brugge | A | Tiri squadra | Club Brugge over 10,5 tiri | 1.72 | 60.7% | +4.4% | `sisal:4858180:822318899:5378990067` |
| Leipzig - PSV Eindhoven | A | Corner squadra | PSV Eindhoven over 4,5 corner | 2.00 | 57.4% | +14.8% | `sisal:4858176:821951423:5376985276` |
| Feyenoord - Como | A | Corner squadra | Feyenoord over 4,5 corner | 1.85 | 65.5% | +21.2% | `sisal:4858181:822308423:5379056413` |
| Feyenoord - Como | A | Tiri in porta squadra | Feyenoord over 3,5 tiri in porta | 1.45 | 83.2% | +20.6% | `sisal:4858181:822445407:5379748908` |
| LASK - Liverpool | A | Gol | Totale partita under 3,5 gol | 1.80 | 58% | +4.4% | `sisal:4858179:810815376:5317198125` |
| Roma - Real Madrid | A | Gol | Totale partita under 3,5 gol | 1.72 | 59.7% | +2.7% | `sisal:4858182:810824494:5317163698` |
| Roma - Real Madrid | A | Corner squadra | Roma over 4,5 corner | 2.10 | 58.4% | +22.6% | `sisal:4858182:822328128:5379068529` |
| Roma - Real Madrid | A | Tiri in porta squadra | Roma over 3,5 tiri in porta | 1.45 | 78.1% | +13.2% | `sisal:4858182:822399841:5379482976` |
| Shakhtar Donetsk - AEK Athens | A | Corner squadra | AEK Athens under 4,5 corner | 1.62 | 63.7% | +3.2% | `sisal:4858144:822326236:5379066966` |
| Bodø/Glimt - Borussia Dortmund | A | Tiri squadra | Bodø/Glimt over 10,5 tiri | 1.27 | 90.2% | +14.6% | `sisal:4858142:822436384:5379691483` |
| Manchester City - Paris Saint-Germain | A | Corner squadra | Manchester City over 4,5 corner | 1.70 | 65.5% | +11.3% | `sisal:4858174:822308666:5379057520` |
| Manchester City - Paris Saint-Germain | A | Tiri in porta squadra | Paris Saint-Germain over 3,5 tiri in porta | 1.36 | 77.7% | +5.7% | `sisal:4858174:822410688:5379527485` |
| Real Betis - Porto | A | Tiri squadra | Porto over 10,5 tiri | 1.40 | 74.4% | +4.2% | `sisal:4858175:822427489:5379632168` |
| Slovan Bratislava - Stuttgart | A | Gol | Totale partita under 3,5 gol | 1.90 | 60.8% | +15.5% | `sisal:4858140:810819775:5317123351` |
| Lens - Sporting CP | B | Tiri giocatore | Franjo Ivanović over 1,5 tiri · sostituto incluso | 1.20 | N/D | N/D | `sisal:4858138:821927322:5376857359` |
| Arsenal - Lille | B | Tiri giocatore | Ayase Ueda over 1,5 tiri · sostituto incluso | 1.75 | N/D | N/D | `sisal:4858146:821922449:5376832991` |
| Atlético de Madrid - Manchester United | B | Tiri giocatore | Marcus Rashford over 1,5 tiri · sostituto incluso | 1.50 | N/D | N/D | `sisal:4858177:821888775:5376634522` |
| Inter - Club Brugge | B | Tiri in porta giocatore | Marcus Thuram over 0,5 SOT · sostituto incluso · pali/traverse inclusi | 1.16 | N/D | N/D | `sisal:4858180:822315691:5378999317` |
| Galatasaray - Barcelona | B | Tiri giocatore | Dani Olmo over 1,5 tiri · sostituto incluso | 1.20 | N/D | N/D | `sisal:4858143:822328537:5379080617` |
| Leipzig - PSV Eindhoven | B | Tiri in porta giocatore | Christopher Nkunku over 0,5 SOT · sostituto incluso · pali/traverse inclusi | 1.16 | N/D | N/D | `sisal:4858176:822440794:5379720627` |
| Viking - Bayern München | B | Tiri giocatore | Peter Christiansen over 1,5 tiri · sostituto incluso | 1.57 | N/D | N/D | `sisal:4858141:822307883:5379053237` |
| Villarreal - Napoli | B | Tiri giocatore | Gerard Moreno over 1,5 tiri · sostituto incluso | 1.25 | N/D | N/D | `sisal:4858139:821934797:5376899039` |
| Feyenoord - Como | B | Tiri in porta giocatore | Nacho Ferri over 0,5 SOT · sostituto incluso · pali/traverse inclusi | 1.44 | N/D | N/D | `sisal:4858181:822445292:5379737866` |
| Roma - Real Madrid | B | Tiri giocatore | Paulo Dybala over 1,5 tiri · sostituto incluso | 1.16 | N/D | N/D | `sisal:4858182:822400587:5379489006` |
| Aston Villa - Fenerbahçe | B | Tiri giocatore | Emiliano Buendía over 1,5 tiri · sostituto incluso | 1.16 | N/D | N/D | `sisal:4858178:822473467:5379916640` |
| Shakhtar Donetsk - AEK Athens | B | Tiri giocatore | Kauã Elias over 1,5 tiri · sostituto incluso | 1.25 | N/D | N/D | `sisal:4858144:822494796:5380035442` |
| Manchester City - Paris Saint-Germain | B | Tiri giocatore | Ousmane Dembélé over 1,5 tiri · sostituto incluso | 1.16 | N/D | N/D | `sisal:4858174:822407528:5379562023` |
| Real Betis - Porto | B | Tiri giocatore | Abde Ezzalzouli over 1,5 tiri · sostituto incluso | 1.20 | N/D | N/D | `sisal:4858175:822426842:5379630012` |

Le 14 righe individuali conservano il contratto DUO originale: 11 tiri totali con sostituto e 3 SOT con sostituto piu pali/traverse. Le loro medie del singolo sono evidenza descrittiva; P, quota equa ed EV restano null.

## Distribuzione per partita

| Partita | Baseline | Nuovi | Totale | A | B | Nuovi mercati |
|---|---:|---:|---:|---:|---:|---|
| Lens - Sporting CP | 3 | 1 | 4 | 0 | 1 | Tiri giocatore 1 |
| Sabah - Slavia Praha | 1 | 1 | 2 | 1 | 0 | Gol 1 |
| Arsenal - Lille | 4 | 2 | 6 | 1 | 1 | Gol 1; Tiri giocatore 1 |
| Atlético de Madrid - Manchester United | 3 | 2 | 5 | 1 | 1 | Gol 1; Tiri giocatore 1 |
| Inter - Club Brugge | 4 | 2 | 6 | 1 | 1 | Tiri in porta giocatore 1; Tiri squadra 1 |
| Galatasaray - Barcelona | 4 | 1 | 5 | 0 | 1 | Tiri giocatore 1 |
| Leipzig - PSV Eindhoven | 3 | 2 | 5 | 1 | 1 | Corner squadra 1; Tiri in porta giocatore 1 |
| Viking - Bayern München | 4 | 1 | 5 | 0 | 1 | Tiri giocatore 1 |
| Villarreal - Napoli | 4 | 1 | 5 | 0 | 1 | Tiri giocatore 1 |
| Feyenoord - Como | 4 | 3 | 7 | 2 | 1 | Corner squadra 1; Tiri in porta giocatore 1; Tiri in porta squadra 1 |
| LASK - Liverpool | 3 | 1 | 4 | 1 | 0 | Gol 1 |
| Roma - Real Madrid | 4 | 4 | 8 | 3 | 1 | Corner squadra 1; Gol 1; Tiri giocatore 1; Tiri in porta squadra 1 |
| Aston Villa - Fenerbahçe | 4 | 1 | 5 | 0 | 1 | Tiri giocatore 1 |
| Shakhtar Donetsk - AEK Athens | 2 | 2 | 4 | 1 | 1 | Corner squadra 1; Tiri giocatore 1 |
| Bodø/Glimt - Borussia Dortmund | 4 | 1 | 5 | 1 | 0 | Tiri squadra 1 |
| Manchester City - Paris Saint-Germain | 4 | 3 | 7 | 2 | 1 | Corner squadra 1; Tiri giocatore 1; Tiri in porta squadra 1 |
| Real Betis - Porto | 4 | 2 | 6 | 1 | 1 | Tiri giocatore 1; Tiri squadra 1 |
| Slovan Bratislava - Stuttgart | 4 | 1 | 5 | 1 | 0 | Gol 1 |

## Mercati esclusi

| Mercato | Classe | Motivo |
|---|---|---|
| DNB, handicap e mercati con push | C | Gestione push/handicap non serializzata nel forecast MD2. |
| Goal/no-goal, multigol e combo goal | C | Nessuna probabilita originale serializzata per l'identico contratto; non ricostruita dalla sola media. |
| Corner diversi da U/O squadra 4.5 | B/C | Volumi disponibili, ma il backtest esistente certifica soltanto la soglia squadra 4.5. |
| Falli match, squadra e giocatore | C | Distribuzione non validata e contratti Sisal inclusivi dei supplementari dove presenti. |
| Punti cartellini e cartellini DUO | C | Target provider diverso dal conteggio cartellini del forecast; cap per giocatore e sostituto non modellati. |
| Marcatori e primo/ultimo marcatore | C | Probabilita giocatore, sostituto, ordine e pali/traverse non modellate sul contratto Sisal. |
| Primo tempo, entrambi i tempi e combo | C | Il modello disponibile e full-match e non certifica le dipendenze richieste. |

## Integrita e sincronizzazione

- La fonte additiva e `data/sources/champions-md02-phase12d-additions-2026-27.json`; la fonte condivisa renderizzata resta `data/normalized/schedina-champions-md02.json`.
- I 63 selectionId delle Fasi 12B/12C sono hash-controllati prima di accettare le 31 aggiunte.
- Quote, oddsRaw, providerEventId, providerMarketId, providerSelectionId, soglie e modificatori sono riletti dallo snapshot Sisal e verificati dal builder.
- Letture, card e MyCombo consumano lo stesso array per fixture; nessun contratto individuale e trasformato in un evento del solo giocatore.
- Il dettaglio completo di candidati, copertura, motivazioni, limiti, timestamp e provenienza e nel report JSON affiancato.
