# Ricalcolo Champions MD4 — 2 novembre 2026

Nove gare di martedì 3 novembre, 18 squadre, 198 titolari probabili. Dati collettivi aggiornati al 30–31 ottobre. Formule, pesi e criteri di ammissione invariati; nessuna nuova validazione statistica implicita.

Selezioni preliminari: 74 → 72 (9 esiti di partita, 63 DUO). Ingresso di 21 contratti e rimozione di 23 contratti dalla selezione attiva, dopo il ricalcolo e la verifica di identità, soglia e quota. Nessuna sostituzione automatica delle probabilità tra giocatori o contratti diversi. Quota minima inclusiva: 1,08. Probabilità, quota equa ed EV DUO restano null.

## Volumi previsti per squadra

Sono stime puntuali preliminari, non probabilità dei mercati a soglia.

| Partita | Squadra | Tiri | SOT | Corner |
|---|---|---:|---:|---:|
| Shakhtar Donetsk - Sporting CP | Shakhtar Donetsk | 13.3 | 4.2 | 5.5 |
| Shakhtar Donetsk - Sporting CP | Sporting CP | 10.9 | 4.4 | 4.8 |
| Galatasaray - Stuttgart | Galatasaray | 21.3 | 7.8 | 7.9 |
| Galatasaray - Stuttgart | Stuttgart | 13.7 | 4.8 | 4.7 |
| Atlético de Madrid - Bayern München | Atlético de Madrid | 15.4 | 4.9 | 6 |
| Atlético de Madrid - Bayern München | Bayern München | 15.5 | 6.8 | 5.4 |
| Barcelona - Aston Villa | Barcelona | 16.5 | 6.1 | 6.4 |
| Barcelona - Aston Villa | Aston Villa | 11.2 | 3.9 | 4.5 |
| Feyenoord - Inter | Feyenoord | 15.9 | 6.2 | 5.7 |
| Feyenoord - Inter | Inter | 16.7 | 5.7 | 5.5 |
| Bodø/Glimt - Lille | Bodø/Glimt | 16.7 | 6 | 6.7 |
| Bodø/Glimt - Lille | Lille | 11 | 3.9 | 4 |
| LASK - Slovan Bratislava | LASK | 15.7 | 5 | 5.3 |
| LASK - Slovan Bratislava | Slovan Bratislava | 13.2 | 4.2 | 4.8 |
| Manchester United - Roma | Manchester United | 16 | 5.1 | 5.1 |
| Manchester United - Roma | Roma | 12.6 | 4.1 | 5.3 |
| Villarreal - Paris Saint-Germain | Villarreal | 14.2 | 4.5 | 5.4 |
| Villarreal - Paris Saint-Germain | Paris Saint-Germain | 14.7 | 5.5 | 4.9 |

## Pubblicazione e verifiche

Le Letture e le sezioni di copertura della Schedina usano gli stessi volumi ricalcolati. Non sono state inventate probabilità di superamento delle soglie di tiri/SOT/corner né promossi mercati senza il collegamento a una distribuzione validata per il modello corrente. Le formazioni restano probabili; panchina e indisponibilità conservano la policy esistente.

Le altre nove fixture della quarta giornata e i cataloghi delle giornate precedenti restano invariati. I contratti e le quote originali sono conservati, con snapshot precedente in `data/technical-archive/champions-md04/recalculations/2026-11-02-before-team-coverage-refresh.json`. Confronto completo in `output/champions-md04/recalculation-2026-11-02.json`.

Controlli: `scripts/test-champions-md04.cjs`, `scripts/test-minimum-public-odds.mjs`, build di presentazione limitato Champions/Schedina, verifica desktop/mobile `scripts/check-champions-md04-browser.cjs`. Nessun commit, push o deploy.
