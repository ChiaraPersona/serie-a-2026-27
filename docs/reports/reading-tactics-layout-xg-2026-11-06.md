# Analisi tattica e xG dello storico — 6 novembre 2026

## Impaginazione

Le schede Serie A usano un flusso indipendente, sostituendo la vecchia subgrid a quattro righe che non corrispondeva più al numero di campioni visualizzati. Due schede affiancate sul desktop, una per riga sul mobile; header Casa/Ospite, campione di campionato, griglia regolare dei valori e direzioni d'attacco separate. I campioni europei sono espandibili tramite controlli nativi `details/summary`. Nessuna modifica alle medie o ai relativi denominatori. Restano rimossi Andamento recente e Baseline storica 2025/26.

## Recupero xG

`scripts/build-european-history-xg.cjs` ricostruisce offline il registro `data/normalized/european-history-xg-2026-27.json` dai raw FotMob in `data/raw/european-recent-results/xg/`.

Calendari acquisiti mediante `https://www.fotmob.com/api/data/leagues?id=ID&season=2026%2F2027`: Champions 42, Europa League 73, Conference 10216. Referti mediante `https://www.fotmob.com/api/data/matchDetails?matchId=ID`. Il registro conserva ID di gara, ID delle due squadre, URL, timestamp e hash raw. Controlli: competizione, giorno, home/away, entrambi gli ID squadra, stato finale e punteggio. Nessun lookup approssimativo. Il totale usato è esclusivamente `expected_goals` nel periodo `All`; duplicati non nulli devono concordare. Gli xGOT non sostituiscono gli xG.

Recuperati 54 valori (entrambe le squadre di 27 gare europee). Lo storico delle squadre italiane recupera i 27 valori mancanti. Per il Milan: Benfica 1,03; Salisburgo 3,38; Bournemouth 0,11; Ferencaros 1,22.

Il collegamento avviene solo nel builder dello storico descrittivo e riempie campi nulli, preservando gli xG già disponibili. Nessuna scrittura ai pronostici o alle quote da parte del recupero xG; nessuna promozione ai motori. Le medie tattiche continuano a usare i campioni canonici esistenti. Nessuna fonte pubblica aggiunta e nessuna coordinata ricavata dagli xG.

## Verifiche

- Build di presentazione completato: 380 proiezioni Lettura.
- `test-european-history-xg.cjs`: 27 identità gara, 54 xG riprodotti dai raw; rifiuto di ID squadra errati e di xGOT come xG. Nessun xG mancante nello storico corrente.
- `test-serie-a-team-history.cjs` e `test-current-tactics.mjs` superati.
- `check-european-recent-history.cjs`: nove stati, xG delle righe Milan, campioni chiusi/aperti, metriche e pagina senza overflow.
- `check-current-tactics.cjs`: tutte le dieci gare MD11 a 1440, 390 e 320 pixel, campioni europei aperti e chiusi; nessun errore JavaScript o overflow.
- Schermate desktop/mobile esaminate in `output/european-recent-history-2026-11-06/tactics-1440.png` e `tactics-390.png`, con varianti espanse. La tabella aggiornata è in `milan-1440.png` nella stessa directory.

Nessun commit, push o deploy.
