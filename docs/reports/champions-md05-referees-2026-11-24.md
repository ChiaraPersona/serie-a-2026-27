# Arbitri Champions MD5 — completamento del 24 novembre 2026

Completati i pannelli delle 18 designazioni già registrate nella fonte canonica
`data/sources/champions-referee-assignments-md05-2026-27.json`.

- Profili descrittivi aggiornati per tutti i 18 arbitri: gialli, espulsioni,
  falli e rigori per partita, con campione storico separato.
- Ultime cinque gare disponibili per ciascun arbitro, tutte precedenti alla
  data della fixture: 90 righe pubblicate, 360 gare archiviate.
- Medie stagionali limitate alla Champions 2026/27: campione disponibile per
  17 arbitri; il campione mancante resta nullo. Nessun confronto percentuale
  tra competizioni diverse. Rossi diretti e seconde ammonizioni restano nulli
  quando non separabili.
- HTML originali compressi in `data/raw/champions-referees/md05-2026-11-24/`;
  URL, data di acquisizione e SHA-256 nei profili normalizzati.
- Varianti di nome esplicite per Meler, Kovács, Kružliak, Obrenovič e Hernández.
  Hernández usa il profilo 127, distinto dagli omonimi 374031 e 12107.
  Non sono stati inventati nuovi ID UEFA.

## Rigenerazione

1. `node scripts/build-champions-md05-referees.cjs`
2. `node scripts/complete-champions-md04-referee-history.cjs --matchday 5`
3. `node scripts/build-site.js --presentation-only --champions-page-only --matchday 5`

Il builder dello storico condiviso conserva anche il completamento MD5 nei
build successivi. I payload delle letture concluse includono i profili della
rispettiva giornata. Le statistiche sono descrittive, senza modifiche a
motori, quote, contratti o selezioni operative.

## Verifiche

`node scripts/test-champions-md05-referees.cjs`: superato; designazioni,
hash degli originali, cutoff, medie stagionali e proiezione sincronizzata.
Confronto strutturale con HEAD: le fixture dello storico esterne a MD5
sono rimaste identiche.

`node scripts/check-champions-md05-referees-browser.cjs`: superate tutte le
36 verifiche (18 gare a 1440 px e a 390 px), con quattro medie storiche
esatte, cinque righe dello storico e assenza di provenienza pubblica o overflow.
Build del sito completato. Nessun commit, push o deploy.
