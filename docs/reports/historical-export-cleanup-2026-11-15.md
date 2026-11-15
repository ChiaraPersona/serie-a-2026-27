# Esportazione storica alleggerita — 15 novembre 2026

Il precedente ZIP MD3 non era una cache: conteneva una fotografia storica di
7.060 file, con dati e documentazione del 19 ottobre. Non sono stati trovati
contenuti duplicati al suo interno. È stato conservato in un archivio autonomo
più compatto, senza usare riferimenti ai dati correnti o alla cronologia Git.

## Risultato

| Misura | Prima | Dopo |
|---|---:|---:|
| Dimensione dell'archivio | 232.332.556 byte | 197.980.684 byte |
| Occupazione NTFS dei dati | 232.333.312 byte | 197.984.256 byte |

**34.349.056 byte recuperati sui dati dell'archivio**, circa **34,35 MB**,
riduzione di circa **14,8%**. I piccoli script e documenti aggiunti riducono
lievemente il recupero netto complessivo, che resta circa 34 MB.

Nuova posizione:
`data/technical-archive/exports/champions-md3-database-export-2026-10-19.tar.xz`.
L'archivio contiene tutti i file originali e un indice tecnico aggiuntivo.
È ignorato da Git, come il precedente ZIP, ed escluso dal sito pubblico.

## Verifiche prima della rimozione

1. Verificati CRC e SHA-256 dei 7.060 file dello ZIP originale.
2. Creato il contenitore `tar.xz` con tutti i byte originali, senza decomprimere
   o ricreare i singoli `.gz` statistici.
3. Verificati tutti i file del nuovo archivio rispetto agli hash registrati.
4. Ricostruito un nuovo ZIP completo in una posizione temporanea.
5. Confrontati originale e ZIP ricostruito: stessi nomi e ordine delle voci,
   stessi SHA-256 di tutti i contenuti, date, attributi interni/esterni, sistema
   di creazione, commenti, campi extra e metodi di compressione.
6. Ricontrollati gli hash di originale, archivio definitivo e ZIP di prova
   immediatamente prima di rimuovere i due ZIP ridondanti.

**Zero differenze di contenuto e zero differenze nei metadati confrontati.**
Il ZIP ricostruito può avere un hash del contenitore diverso per la nuova
compressione e le intestazioni ZIP64. Non si promette la riproduzione byte per
byte del vecchio contenitore: sono preservati i singoli file e i metadati sopra
elencati. Il vecchio hash ZIP è registrato nel riepilogo permanente.

È stato eliminato anche il precedente segnaposto di verifica vuoto. Nessun
input corrente di calcolo, statistica, quota, previsione o fonte è stato
modificato. L'archivio rimane autonomo e ripristinabile senza rete.

## Ripristino e manutenzione

Istruzioni complete in
[README dell'archivio](../../data/technical-archive/exports/README.md).
Il comando di ripristino rifiuta destinazioni esistenti, verifica gli hash e
scrive prima un file temporaneo; una verifica fallita non pubblica uno ZIP
parziale con il nome finale. Sono gestiti i blocchi temporanei dei file Windows.

Test: `npm run test:exports:archive`. Sono stati esercitati file vuoti, directory,
Unicode, byte gzip identici, metadati, mancata sovrascrittura, percorsi non sicuri
e rilevamento di un contenuto alterato.

Riepilogo permanente:
`data/technical-archive/exports/champions-md3-database-export-2026-10-19.summary.json`.
Evidenze temporanee in `output/export-cleanup-2026-11-15/`, ignorato da Git.
Nessun commit, push o deploy eseguito.
