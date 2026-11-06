# Gare europee nello storico recente — 6 novembre 2026

Le proiezioni delle Letture includono ora le fixture Champions concluse che coinvolgono squadre Serie A, usando gli slug del branding verificato per l'identità. Sono preservati risultato, data, statistiche disponibili e competizione. Nessuna associazione approssimativa e nessuna partita programmata entra nello storico.

L'andamento recente ordina insieme le competizioni prima del limite di cinque gare e mostra la competizione. Le statistiche tattiche correnti hanno campioni separati Serie A e Champions, con denominatori per metrica e N/D per dati mancanti. La tabella storico esistente continua a usare il registro condiviso.

La mappa riceve anche le fixture europee nel denominatore, con copertura distinta per competizione. I referti Champions canonici disponibili non forniscono coordinate verificate compatibili con questo archivio: non sono stati aggiunti punti artificiali, né convertiti totali in posizioni. Per Inter–Como MD11 entrambe le squadre hanno quattro gare Champions precedenti, zero con coordinate utilizzabili. I punti e le percentuali territoriali continuano quindi a rappresentare solo gli eventi localizzati verificati. Europa League e Conference non sono state aggiunte dai calendari programmati senza risultati e statistiche verificati.

Cutoff strettamente anteriore alla data della fixture e filtro del ciclo tecnico conservati. Nessuna modifica a motori, probabilità, quote, selezioni o liquidazioni. Nessun commit, push o deploy.

Verifiche:

- Build delle 380 proiezioni e shell delle Letture, senza ricalcoli.
- Test spaziale: 380 controlli, più copertura Champions 0/4 di Inter nella MD11.
- Test storico squadre superato.
- Browser: 18 stati a 1440/390/320 pixel, inclusa Inter–Como MD11; presenza Champions nello storico e nel campione tattico, copertura nella mappa, filtri e assenza di overflow. Regressione Champions e hash degli archivi protetti superati. Evidenze in `output/reading-spatial-2026-11-06/browser-check.json`.
- Il test generale `test-reading-browser-data.mjs` si arresta sulla discrepanza già nota dei contratti di Fiorentina–Como MD7; non sono state modificate le regole dei contratti per aggirarla.
