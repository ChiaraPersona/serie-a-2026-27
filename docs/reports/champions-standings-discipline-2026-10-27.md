# Colonne disciplinari della classifica Champions

La vista usa esclusivamente i referti già presenti in `data/normalized/champions-league-2026-27.json`, collegati tramite fixture ID. Nessun archivio statistico, pronostico o risultato viene modificato.

- R+ e R−: `matchReport.observedTeamStatistics.home/away.penaltyKickShots`, inclusi rigori non trasformati. Sono rigori calciati, non una ricostruzione delle decisioni arbitrali annullate o dei rigori assegnati ma non eseguiti.
- C−: eventi gialli, secondi gialli e rossi diretti della squadra, riconciliati con i totali gialli e rossi del referto.
- C+: stesso conteggio per la squadra avversaria.
- Un valore mancante o in conflitto rende N/D il totale della relativa colonna per tutta la squadra; nessuna somma parziale viene presentata come completa.

Copertura sulle 54 gare concluse di MD1–MD3: R+/R− 36 squadre su 36, C+/C− 34 su 36 ciascuna. I metadati e gli URL di verifica restano nei referti interni.

Conflitti conservati: `ucl-2026-27-md02-08`, Bayern München (away), e `ucl-2026-27-md03-15`, Inter (home). In entrambi i casi gli eventi includono tre gialli e un rosso, mentre i totali squadra indicano due gialli e un rosso; anche le statistiche giocatore attribuiscono zero gialli al giocatore espulso. Non si deduce un secondo giallo né si sceglie arbitrariamente uno dei conteggi.

Restano N/D: C− Bayern München e Inter; C+ Viking e Shakhtar Donetsk.

Verifica: `node scripts/test-champions-standings-discipline.mjs`.
