# Storico arbitrale Champions MD4 — 4 novembre 2026

Recuperate 360 gare datate (20 per arbitro), conservate nel dataset interno `data/normalized/champions-referee-match-history-md04-2026-27.json`. Le 18 Letture mostrano le cinque più recenti disponibili prima della data della fixture, con risultato, gialli, espulsioni e falli. I valori mancanti restano null. Rossi diretti e seconde ammonizioni non sono separabili: nessuna ricostruzione per supposizione.

Le nove gare concluse riusano esclusivamente gli snapshot precedenti già verificati tramite hash; per i nove arbitri delle gare odierne sono stati acquisiti i profili aggiornati. Identità controllate contro designazione canonica e titolo del profilo già riconciliato. Snapshot compressi, URL, timestamp e SHA256 restano interni in `data/raw/champions-referees/md04-2026-11-04/` e nel dataset.

I campioni stagione/competizione restano separati. 16 arbitri hanno un campione Champions 2026/27; gli altri due mostrano N/D. Le ultime cinque sono un campione parziale su tutte le competizioni e non vengono confrontate percentualmente con il campione stagionale Champions. Il cutoff completo degli aggregati non è certificato. Dati soltanto descrittivi, esclusi dai pronostici.

Rigenerazione: `node scripts/complete-champions-md04-referee-history.cjs`, poi `node scripts/build-site.js --presentation-only --champions-pages-only --matchday 4`. Il builder della proiezione generale conserva questi raccordi anche nei build successivi. Nessuna modifica a designazioni, formazioni, formule, quote, selezioni o liquidazioni.

Verifiche: `scripts/test-reading-referee-history.mjs` e `scripts/check-champions-md04-referees-browser.cjs`. Quest'ultimo controlla 18 fixture a 1440 e 390 pixel, cinque righe e date esatte, identità, medie storiche, separazione dei campioni, assenza di fonti pubbliche, errori JavaScript e overflow. Evidenze in `output/champions-md04-referee-statistics/verification.json`.

Nessun commit, push o deploy.
