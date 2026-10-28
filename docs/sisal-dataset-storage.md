# Archivio quote Sisal suddiviso per evento

`data/normalized/odds/sisal/serie-a.json` è ora un indice, non un dataset monolitico. I metadati globali e quelli degli eventi rimangono nell'indice; i mercati si trovano nei file `serie-a-events/`. L'ordine di eventi, mercati e selezioni è conservato. Nessun campo provider, ID, contratto DUO, soglia, quota, timestamp, riferimento raw o valore null viene trasformato.

## Lettura e scrittura

Gli script usano `scripts/sisal/dataset-store.cjs`:

```js
const { readJsonFile, writeSisalDataset } = require('./sisal/dataset-store.cjs');
const file = 'data/normalized/odds/sisal/serie-a.json';
const dataset = readJsonFile(file); // Restituisce il dataset completo originale.
writeSisalDataset(file, dataset);
```

`readJsonFile` legge anche i JSON tradizionali, quindi gli archivi storici e il dataset Champions esistente rimangono compatibili. Per gli indici verifica dimensione e SHA-256 di ciascun file prima di restituire le quote; un file mancante o corrotto genera errore, senza risultati parziali. Un normale `JSON.parse` dell'indice restituisce soltanto la struttura di archiviazione: non usarlo per accedere alle quote.

Gli importatori API, il normalizzatore e l'importatore DOM scrivono con `writeSisalDataset`. Ogni evento viene suddiviso ulteriormente se necessario; il limite è 8 MiB per file. Un singolo mercato oltre il limite viene rifiutato prima di pubblicare il nuovo indice. I file dei mercati hanno nomi deterministici legati al contenuto; l'indice viene sostituito atomicamente dopo la scrittura dei file. I vecchi file non vengono eliminati automaticamente, per consentire letture concorrenti dell'indice precedente.

Non occorre Git LFS. Per convertire manualmente un dataset tradizionale:

```text
node scripts/sisal/migrate-storage.cjs serie-a
```

Il comando modifica il formato su disco e verifica l'uguaglianza integrale del dataset ricostruito. Non scarica quote e non ricalcola pronostici.

## Verifiche

```text
node scripts/sisal/test-dataset-store.cjs
node scripts/validate-sisal-odds.js --competition serie-a
node scripts/sisal/test-identifiers.js
node scripts/sisal/test-consumers.mjs
```

La migrazione del 28 ottobre 2026 è stata confrontata integralmente con il dataset del commit `00ca3301b`: 20 eventi, 47.565 mercati e 157.058 quote identici. L'indice occupa 38.557 byte e i 20 file dei mercati raggiungono al massimo 4.513.863 byte. Evidenza: `output/sisal-storage-migration/report.json`.

Il sito pubblico continua a usare le proiezioni leggere esistenti. La migrazione non richiede modifiche a formule, ammissione dei mercati, filtri titolari, liquidazioni o pagine pubbliche, e non riduce il peso dei file già presenti nella cronologia Git.
