# Champions League 2026/27 — Fase 12D con estensione outsider

Generato outsider: 2026-10-13T16:10:37.4963673+02:00 · snapshot Sisal invariato: 2026-10-13T09:55:14.800Z

## Gate

**PARTIAL** — Integrazione outsider completa e prepartita; PARTIAL perche i 78 mercati individuali DUO restano in classe B con probabilita/EV N/D e marcatori, cartellini, falli e 1X2 outsider non sufficientemente robusti restano esclusi.

## Totali

- Baseline Fasi 12B/12C preservata: **63/63** selectionId, hash **0B3D8B6DA442D8C734A21939AB59FF1132E9E389D3932022122FA2855EBC760C**.
- Baseline completa pre-outsider preservata: **94/94** selectionId, hash **BCCB8231BBEA3026B3F5C6F66B3D6D4D6DE06ADF227B05428EA599A904A28596**.
- Fase 12D originaria: **31** aggiunte (17 classe A, 14 classe B).
- Estensione outsider: **26** approvati (7 classe A, 19 classe B).
- Totale MD2: **120** pronostici; **120** cliccabili.
- Matematicamente valutabili: **42**; P/EV N/D: **78**.
- Integrita temporale outsider: **26/26** prima del kickoff; retrospettive complessive **0**.
- Nessun nuovo download quote; snapshot locale con 18 eventi, 37.489 mercati e 127.347 selezioni.

## Mercati Sisal analizzati

| Tipologia | Mercati | Quote valide | Classi | Inseriti complessivi | Esito della verifica |
|---|---:|---:|---|---:|---|
| 1X2 / doppia chance / DNB | 54 | 142 | A/C | 0 | 1X2 e doppia chance sono valutabili dalle probabilita gia serializzate; DNB e handicap richiedono gestione push non serializzata per questo output. |
| Altri mercati | 11137 | 22648 | C | 0 | Primo/secondo tempo, entrambi i tempi, handicap, combinazioni e mercati temporali non hanno un target probabilistico identico gia serializzato. |
| Cartellini / punti cartellini | 1339 | 1554 | C | 0 | Il forecast conta cartellini, mentre Sisal quota punti cartellini con massimo due per giocatore o contratti DUO: target non equivalente. |
| Corner | 1360 | 2490 | A/B/C | 5 | Solo U/O corner squadra 4.5 e classificato A: e la soglia esatta del walk-forward. Le altre soglie restano descrittive e non ricevono P/EV. |
| Falli | 4973 | 4938 | C | 0 | Forecast centrali senza distribuzione validata sul contratto; le poche linee match/squadra includono i supplementari. |
| Goal / over-under / multigol | 1095 | 7972 | A/C | 13 | Over/under 1.5, 2.5 e 3.5 usano la distribuzione Poisson gia adottata. Goal/no-goal, multigol e combo non vengono ricostruiti fuori dal motore. |
| Marcatori e goal giocatore | 11384 | 35053 | C | 0 | Nessuna probabilita marcatore originale compatibile con sostituto, tempi, combinazioni o pali/traverse. |
| SOT giocatore DUO + pali/traverse | 1796 | 1796 | B | 8 | Volume SOT del singolo disponibile; contratto 28506 include sostituto e pali/traverse. Probabilita, quota equa ed EV null. |
| Tiri e SOT squadra/partita | 1425 | 1425 | A/C | 6 | Solo tiri squadra 10.5 e SOT squadra 3.5 sono soglie esatte coperte dal walk-forward. Totali partita e altre soglie non sono promossi. |
| Tiri giocatore DUO | 2926 | 2926 | B | 25 | Volume del singolo disponibile; contratto 28507 include il sostituto. Probabilita, quota equa ed EV null. |

## Fase 12D originaria

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

## Estensione outsider

### Candidati analizzati

- Linee sottoposte allo screening: **2569 individuali** e **147 squadra**.
- Candidati che hanno superato il filtro preliminare: **106** (88 individuali, 18 squadra).
- Approvati: **26**. Esclusi dopo il filtro: **80**.

### Outsider approvati

| Partita | Classe | Mercato e contratto | Quota | Evidenza statistica e titolarita | Rischio principale | P | EV | selectionId |
|---|---|---|---:|---|---|---:|---:|---|
| Arsenal - Lille | A | Totale partita under 2,5 gol | 2.40 | P 46.4% da distribuzione gol serializzata; EV descrittivo +11.4% | Esito di coda sensibile alla calibrazione della distribuzione gol; non basta la quota elevata. | 46.4% | +11.4% | `sisal:4858146:810823358:5317157812` |
| Atlético de Madrid - Manchester United | A | Totale partita over 3,5 gol | 2.50 | P 43.6% da distribuzione gol serializzata; EV descrittivo +9% | Esito di coda sensibile alla calibrazione della distribuzione gol; non basta la quota elevata. | 43.6% | +9% | `sisal:4858177:810814206:5317191050` |
| Galatasaray - Barcelona | A | Totale partita under 3,5 gol | 2.40 | P 46.8% da distribuzione gol serializzata; EV descrittivo +12.3% | Esito di coda sensibile alla calibrazione della distribuzione gol; non basta la quota elevata. | 46.8% | +12.3% | `sisal:4858143:810812673:5317142893` |
| Viking - Bayern München | A | Totale partita under 3,5 gol | 2.90 | P 39.6% da distribuzione gol serializzata; EV descrittivo +14.8% | Esito di coda sensibile alla calibrazione della distribuzione gol; non basta la quota elevata. | 39.6% | +14.8% | `sisal:4858141:810812050:5317139355` |
| LASK - Liverpool | A | Totale partita under 2,5 gol | 3.10 | P 35.9% da distribuzione gol serializzata; EV descrittivo +11.3% | Esito di coda sensibile alla calibrazione della distribuzione gol; non basta la quota elevata. | 35.9% | +11.3% | `sisal:4858179:810815375:5317198121` |
| Roma - Real Madrid | A | Totale partita under 2,5 gol | 2.90 | P 37.5% da distribuzione gol serializzata; EV descrittivo +8.7% | Esito di coda sensibile alla calibrazione della distribuzione gol; non basta la quota elevata. | 37.5% | +8.7% | `sisal:4858182:810824493:5317163694` |
| Slovan Bratislava - Stuttgart | A | Totale partita under 2,5 gol | 3.25 | P 38.5% da distribuzione gol serializzata; EV descrittivo +25.1% | Esito di coda sensibile alla calibrazione della distribuzione gol; non basta la quota elevata. | 38.5% | +25.1% | `sisal:4858140:810819774:5317123345` |
| Lens - Sporting CP | B | Odsonne Édouard over 3,5 tiri · sostituto incluso | 3.25 | 2,73 tiri attesi; 84,6 min; forward, storico verificato su 1.841 minuti e affidabilita 67,2%. | Contratto DUO con sostituto; la proiezione riguarda il solo titolare e la soglia outsider aumenta la varianza. | N/D | N/D | `sisal:4858138:821928592:5376859993` |
| Lens - Sporting CP | B | Issa Doumbia over 1,5 tiri · sostituto incluso | 2.40 | 1,56 tiri attesi; 84,6 min; midfielder, storico verificato su 3.120 minuti e affidabilita 77,6%. | Contratto DUO con sostituto; la proiezione riguarda il solo titolare e la soglia outsider aumenta la varianza. | N/D | N/D | `sisal:4858138:821927323:5376857369` |
| Arsenal - Lille | B | Ayase Ueda over 2,5 tiri · sostituto incluso | 3.50 | 2,4 tiri attesi; 84,6 min; forward, storico verificato su 2.969 minuti e affidabilita 76,7%. | Contratto DUO con sostituto; la proiezione riguarda il solo titolare e la soglia outsider aumenta la varianza. | N/D | N/D | `sisal:4858146:821922371:5376832677` |
| Arsenal - Lille | B | Benjamin André over 0,5 tiri · sostituto incluso | 2.50 | 0,84 tiri attesi; 84,6 min; midfielder, storico verificato su 2.946 minuti e affidabilita 76,6%. | Contratto DUO con sostituto; la proiezione riguarda il solo titolare e la soglia outsider aumenta la varianza. | N/D | N/D | `sisal:4858146:821921851:5376819861` |
| Atlético de Madrid - Manchester United | B | Marcus Rashford over 3,5 tiri · sostituto incluso | 4.50 | 2,91 tiri attesi; 84,6 min; forward, storico verificato su 2.341 minuti e affidabilita 72,2%. | Contratto DUO con sostituto; la proiezione riguarda il solo titolare e la soglia outsider aumenta la varianza. | N/D | N/D | `sisal:4858177:821888897:5376635025` |
| Atlético de Madrid - Manchester United | B | Alejandro Grimaldo over 0,5 SOT · sostituto incluso · pali/traverse inclusi | 2.00 | 0,75 SOT attesi; 84,6 min; defender, storico verificato su 3.603 minuti e affidabilita 80%. | Contratto DUO con sostituto e pali/traverse; la proiezione riguarda il solo titolare e la soglia outsider aumenta la varianza. | N/D | N/D | `sisal:4858177:821891749:5376648956` |
| Inter - Club Brugge | B | Hugo Vetlesen over 0,5 SOT · sostituto incluso · pali/traverse inclusi | 2.75 | 0,69 SOT attesi; 84,6 min; midfielder, storico verificato su 1.472 minuti e affidabilita 62,1%. | Contratto DUO con sostituto e pali/traverse; la proiezione riguarda il solo titolare e la soglia outsider aumenta la varianza. | N/D | N/D | `sisal:4858180:822318867:5378989938` |
| Galatasaray - Barcelona | B | Dani Olmo over 3,5 tiri · sostituto incluso | 2.75 | 2,72 tiri attesi; 84,6 min; forward, storico verificato su 2.522 minuti e affidabilita 73,7%. | Contratto DUO con sostituto; la proiezione riguarda il solo titolare e la soglia outsider aumenta la varianza. | N/D | N/D | `sisal:4858143:822328609:5379080871` |
| Leipzig - PSV Eindhoven | B | Sven Mijnans over 1,5 SOT · sostituto incluso · pali/traverse inclusi | 3.75 | 1,17 SOT attesi; 84,6 min; midfielder, storico verificato su 3.588 minuti e affidabilita 80%. | Contratto DUO con sostituto e pali/traverse; la proiezione riguarda il solo titolare e la soglia outsider aumenta la varianza. | N/D | N/D | `sisal:4858176:822440956:5379722099` |
| Viking - Bayern München | B | Kristoffer Askildsen over 1,5 tiri · sostituto incluso | 4.00 | 1,84 tiri attesi; 84,6 min; midfielder, storico verificato su 2.189 minuti e affidabilita 70,9%. | Contratto DUO con sostituto; la proiezione riguarda il solo titolare e la soglia outsider aumenta la varianza. | N/D | N/D | `sisal:4858141:822325176:5379023059` |
| Villarreal - Napoli | B | Giovanni Di Lorenzo over 0,5 tiri · sostituto incluso | 1.80 | 0,85 tiri attesi; 84,6 min; defender, storico verificato su 2.278 minuti e affidabilita 71,7%. | Contratto DUO con sostituto; la proiezione riguarda il solo titolare e la soglia outsider aumenta la varianza. | N/D | N/D | `sisal:4858139:821934696:5376893722` |
| Feyenoord - Como | B | Nacho Ferri over 1,5 SOT · sostituto incluso · pali/traverse inclusi | 3.00 | 1,52 SOT attesi; 84,6 min; forward, storico verificato su 2.914 minuti e affidabilita 76,4%. | Contratto DUO con sostituto e pali/traverse; la proiezione riguarda il solo titolare e la soglia outsider aumenta la varianza. | N/D | N/D | `sisal:4858181:822444815:5379737104` |
| LASK - Liverpool | B | Kasper Jørgensen over 2,5 tiri · sostituto incluso | 4.50 | 2,15 tiri attesi; 84,6 min; defender, storico verificato su 2.760 minuti e affidabilita 75,4%. | Contratto DUO con sostituto; la proiezione riguarda il solo titolare e la soglia outsider aumenta la varianza. | N/D | N/D | `sisal:4858179:822421392:5379593873` |
| Roma - Real Madrid | B | Paulo Dybala over 3,5 tiri · sostituto incluso | 2.40 | 2,94 tiri attesi; 84,6 min; forward, storico verificato su 1.355 minuti e affidabilita 60,1%. | Contratto DUO con sostituto; la proiezione riguarda il solo titolare e la soglia outsider aumenta la varianza. | N/D | N/D | `sisal:4858182:822397215:5379468394` |
| Roma - Real Madrid | B | Marten De Roon over 0,5 tiri · sostituto incluso | 2.00 | 0,81 tiri attesi; 84,6 min; midfielder, storico verificato su 2.714 minuti e affidabilita 75,1%. | Contratto DUO con sostituto; la proiezione riguarda il solo titolare e la soglia outsider aumenta la varianza. | N/D | N/D | `sisal:4858182:822399634:5379482130` |
| Aston Villa - Fenerbahçe | B | Mason Greenwood over 3,5 tiri · sostituto incluso | 2.25 | 2,97 tiri attesi; 84,6 min; forward, storico verificato su 3.142 minuti e affidabilita 77,7%. | Contratto DUO con sostituto; la proiezione riguarda il solo titolare e la soglia outsider aumenta la varianza. | N/D | N/D | `sisal:4858178:822481714:5379908219` |
| Bodø/Glimt - Borussia Dortmund | B | Sondre Auklend over 2,5 tiri · sostituto incluso | 4.00 | 2,14 tiri attesi; 84,6 min; midfielder, storico verificato su 2.184 minuti e affidabilita 70,8%. | Contratto DUO con sostituto; la proiezione riguarda il solo titolare e la soglia outsider aumenta la varianza. | N/D | N/D | `sisal:4858142:822436643:5379692328` |
| Manchester City - Paris Saint-Germain | B | Enzo Fernández over 0,5 SOT · sostituto incluso · pali/traverse inclusi | 2.00 | 0,65 SOT attesi; 84,6 min; midfielder, storico verificato su 3.869 minuti e affidabilita 81,1%. | Contratto DUO con sostituto e pali/traverse; la proiezione riguarda il solo titolare e la soglia outsider aumenta la varianza. | N/D | N/D | `sisal:4858174:822410566:5379526973` |
| Real Betis - Porto | B | Abde Ezzalzouli over 3,5 tiri · sostituto incluso | 2.50 | 2,85 tiri attesi; 84,6 min; forward, storico verificato su 3.061 minuti e affidabilita 77,3%. | Contratto DUO con sostituto; la proiezione riguarda il solo titolare e la soglia outsider aumenta la varianza. | N/D | N/D | `sisal:4858175:822427716:5379618278` |

Le 19 proposte individuali sono evidenze statistiche, non valutazioni probabilistiche del contratto Sisal: P, quota equa ed EV restano null. Le 7 soglie goal sono invece valutazioni matematiche basate sulle probabilita full-match gia serializzate.

### Outsider esclusi

- **69** linee individuali hanno superato il filtro iniziale ma sono state escluse per ridondanza, soglia meno informativa o evidenza comparativamente piu debole.
- **11** esiti squadra, tutti 1X2 outsider, sono stati esclusi per sovrapposizione/conflitto con il verdetto pubblicato o divergenza modello-mercato troppo ampia.
- Marcatori, cartellini DUO, falli e combinazioni restano esclusi: il catalogo contiene **46** famiglie aperte senza target probabilistico equivalente.
- L'elenco completo degli 80 candidati esclusi, con quote, forecast e identificativi provider, e nel report JSON affiancato.

## Distribuzione per partita

| Partita | Baseline | Fase 12D | Outsider | Totale | A | B | Nuovi mercati |
|---|---:|---:|---:|---:|---:|---:|---|
| Lens - Sporting CP | 3 | 1 | 2 | 6 | 0 | 3 | Tiri giocatore 3 |
| Sabah - Slavia Praha | 1 | 1 | 0 | 2 | 1 | 0 | Gol 1 |
| Arsenal - Lille | 4 | 2 | 3 | 9 | 2 | 3 | Gol 2; Tiri giocatore 3 |
| Atlético de Madrid - Manchester United | 3 | 2 | 3 | 8 | 2 | 3 | Gol 2; Tiri giocatore 2; Tiri in porta giocatore 1 |
| Inter - Club Brugge | 4 | 2 | 1 | 7 | 1 | 2 | Tiri in porta giocatore 2; Tiri squadra 1 |
| Galatasaray - Barcelona | 4 | 1 | 2 | 7 | 1 | 2 | Gol 1; Tiri giocatore 2 |
| Leipzig - PSV Eindhoven | 3 | 2 | 1 | 6 | 1 | 2 | Corner squadra 1; Tiri in porta giocatore 2 |
| Viking - Bayern München | 4 | 1 | 2 | 7 | 1 | 2 | Gol 1; Tiri giocatore 2 |
| Villarreal - Napoli | 4 | 1 | 1 | 6 | 0 | 2 | Tiri giocatore 2 |
| Feyenoord - Como | 4 | 3 | 1 | 8 | 2 | 2 | Corner squadra 1; Tiri in porta giocatore 2; Tiri in porta squadra 1 |
| LASK - Liverpool | 3 | 1 | 2 | 6 | 2 | 1 | Gol 2; Tiri giocatore 1 |
| Roma - Real Madrid | 4 | 4 | 3 | 11 | 4 | 3 | Corner squadra 1; Gol 2; Tiri giocatore 3; Tiri in porta squadra 1 |
| Aston Villa - Fenerbahçe | 4 | 1 | 1 | 6 | 0 | 2 | Tiri giocatore 2 |
| Shakhtar Donetsk - AEK Athens | 2 | 2 | 0 | 4 | 1 | 1 | Corner squadra 1; Tiri giocatore 1 |
| Bodø/Glimt - Borussia Dortmund | 4 | 1 | 1 | 6 | 1 | 1 | Tiri giocatore 1; Tiri squadra 1 |
| Manchester City - Paris Saint-Germain | 4 | 3 | 1 | 8 | 2 | 2 | Corner squadra 1; Tiri giocatore 1; Tiri in porta giocatore 1; Tiri in porta squadra 1 |
| Real Betis - Porto | 4 | 2 | 1 | 7 | 1 | 2 | Tiri giocatore 2; Tiri squadra 1 |
| Slovan Bratislava - Stuttgart | 4 | 1 | 1 | 6 | 2 | 0 | Gol 2 |

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

- Le fonti additive sono `data/sources/champions-md02-phase12d-additions-2026-27.json` e `data/sources/champions-md02-phase12d-outsiders-2026-27.json`; la fonte condivisa renderizzata resta `data/normalized/schedina-champions-md02.json`.
- I 63 selectionId delle Fasi 12B/12C e tutti i 94 selectionId pre-outsider sono hash-controllati.
- Quote, oddsRaw, providerEventId, providerMarketId, providerSelectionId, soglie e modificatori sono riletti dallo snapshot Sisal e verificati dal builder.
- Letture, card e MyCombo consumano lo stesso array per fixture; nessun contratto individuale e trasformato in un evento del solo giocatore.
- Il dettaglio completo di candidati approvati/esclusi, copertura, rischi, timestamp e provenienza e nel report JSON affiancato.
