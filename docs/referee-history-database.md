# Database storico arbitrale MD7

Questo archivio è informativo e non entra nel motore Serie A V2, nei pronostici o nelle schedine.

`data/normalized/referee-history/md07-2026-27.json` contiene i dieci arbitri MD7. Ogni arbitro ha ID canonico, copertura dichiarata parziale, tutte le gare recuperate in `matches` e i record con identità/data/stagione incoerente in `quarantinedMatches`. Non esiste un limite di cinque o quaranta righe.

Ogni gara ha ID stabile ottenuto dalla data e dai due ID squadra con alias espliciti. Conserva stagione, competizione, risultato, metriche nullable, qualità per metrica, osservazioni originali, riferimenti e discrepanze. `SINGLE_SOURCE` significa un solo riscontro disponibile, non conferma indipendente. `AGREED` significa osservazioni concordanti, che possono appartenere allo stesso provider. `CURATED_VERIFIED` indica una revisione esplicita dei campi/eventi. `DISPUTED` viene escluso dalle medie. Nessuna di queste etichette certifica la completezza di una stagione.

Le espulsioni sono rosso diretto più seconda ammonizione, ciascuna una volta. Le ammonizioni ordinarie sono separate dalle seconde ammonizioni. I totali aggregati di provider con altre definizioni restano grezzi. Dai tentativi di rigore non si ricava il numero dei rigori assegnati. Un totale nullo delle espulsioni permette di stabilire zero per entrambe le tipologie; un totale positivo non permette di ricostruirne la separazione.

Le schede OFStats vengono collegate solo quando l'ID del direttore di gara corrisponde. Le sequenze di cartellini vengono ammesse come revisione quando sono compatibili con i totali disponibili. Date fuori dalla stagione dichiarata o partite differenti attribuite nello stesso giorno sono isolate; l'eccezione documentata è la conclusione posticipata del 2019/20 nell'estate 2020. Non si correggono automaticamente date né identità.

La copertura può includere gare con alcune metriche mancanti e gare con competizione non classificata. Le query standard selezionano solo competizioni ufficiali identificate; le altre restano archiviate. Le righe in quarantena non entrano nei campioni. Le statistiche casa/trasferta esistono solo con dati per squadra; i totali di gara non vengono suddivisi per supposizione.

`scripts/referee-stats/history-statistics.cjs` espone query pure per cutoff, stagione, competizione e ultime 5/10/20, frequenze, distribuzioni, rapporti su coppie valide, casa/trasferta e serie mensili. Ogni media e rapporto include il numero effettivo delle osservazioni. La divisione per zero restituisce `null`.

Le sei nuove voci di `data/sources/reading-referee-match-history.json` contengono `historyRef`, non una copia dello storico. Il builder emette solo cinque righe e il riepilogo stagionale nel file pubblico già usato dalle letture. Le quattro proiezioni precedenti sono preservate integralmente; il loro archivio completo è disponibile nel database senza attivare ricalcoli nella presentazione approvata.

Rigenerazione locale, senza builder di previsione:

```text
node scripts/build-referee-history-database.cjs
node scripts/build-referee-history-analytics.cjs
node scripts/complete-referee-md07-history.cjs
node scripts/build-reading-referee-history.js
node scripts/build-site.js --reading-pages-only
node scripts/test-referee-md07-completion.mjs
node scripts/test-reading-referee-history.mjs
node scripts/test-referee-dashboard.mjs
node scripts/check-referee-md07-completion.cjs
node scripts/report-referee-md07-completion.cjs
```

Il recupero di rete è separato e opzionale: `fetch-md07-history.cjs` archivia i profili, `fetch-md07-match-details.cjs` le schede collegate; i manifest registrano anche gli errori. `import-md07-cross-checks.cjs` ricostruisce le osservazioni trascritte e controlla l'identità della gara. Non sostituire i valori discordanti senza nuova evidenza. Fonti e dettagli di questa pipeline devono restare interni.
