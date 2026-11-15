# Letture future Serie A: blocchi condivisi

Intervento locale del 15 novembre 2026. Nessun commit, push o deploy.

## Dimensioni

| Ambito | Prima | Dopo |
| --- | ---: | ---: |
| 270 dettagli futuri, JSON compattati | 110.597.711 byte | 23.341.046 byte |
| 26 blocchi comuni, inclusi nel totale nuovo | duplicati nei dettagli | 2.737.966 byte |
| Dettagli futuri e blocchi insieme | 110.597.711 byte | 26.079.012 byte |
| Pacchetto pubblico completo | circa 349,4 MB | circa 264,9 MB |

Risparmio sui payload interessati: **84.518.699 byte, 76,42%**. La riduzione netta del pacchetto è circa 84,5 MB, considerando anche indice e codice del caricamento.

È una riduzione del pacchetto destinato alla pubblicazione, non spazio liberato sul disco locale. Le copie complete interne restano intatte; le nuove proiezioni occupano circa 26,1 MB aggiuntivi, oltre al manifest. Il pacchetto di verifica e gli screenshot sono in `output/serie-a-shared-2026-11-15/`, escluso da Git.

## Funzionamento

`scripts/build-reading-shared-data.cjs` estrae soltanto blocchi identici di almeno 4 KiB, ripetuti almeno quattro volte. Non modifica i file canonici `data/generated/readings/matches/`, i cataloghi salvati, le previsioni o le formule. Il packager sostituisce i byte pubblici delle sole Letture future con le proiezioni in `wire/`; questa directory e il suo manifest restano interni. I blocchi sono pubblicati in `shared/`, identificati dal proprio SHA-256.

Il servizio dati ricostruisce il payload completo prima di applicare il filtro dei titolari. L'indice avvia in parallelo il caricamento dei blocchi. Le fotografie concluse restano nel formato precedente. Vecchi blocchi vengono mantenuti pubblicabili per 14 giorni dal ritiro per consentire il completamento delle richieste durante un aggiornamento. Quelli scaduti sono esclusi dal pacchetto anche se ancora presenti sul disco interno.

Il service worker memorizza esclusivamente i blocchi identificati dal contenuto, dopo verifica SHA-256, in una cache separata limitata a 128 risorse. Indice, dettaglio della partita e registro ufficiale continuano a essere richiesti dalla rete con `no-store`. Il funzionamento offline resta limitato alla schermata dedicata. Senza Web Crypto, il caricatore verifica la struttura del blocco; il controllo SHA resta obbligatorio nel packager e nei test. Il service worker opera nei contesti sicuri.

Il builder abituale delle Letture richiama il compilatore condiviso; `npm run build:reading:shared` aggiorna soltanto queste proiezioni. Gli hash degli input/output permettono il riuso senza riscrittura quando nulla cambia. Un pacchetto con una proiezione non aggiornata rispetto al file canonico viene rifiutato. Per distribuire occorre pubblicare insieme HTML, codice e dati del pacchetto, come per gli altri aggiornamenti del sito.

## Verifiche

- Ricostruzione con uguaglianza profonda di tutte le 270 fixture e confronto con i cataloghi delle selezioni salvate.
- Integrità dei 26 blocchi, isolamento delle mutazioni, rifiuto di dati corrotti/mancanti, filtro ufficiale e rinnovo del registro.
- `test-data-service-parallel.mjs`: caricamenti paralleli, registro obbligatorio, errori propagati.
- `test-schedina-loading.mjs`: deduplicazione, tentativi successivi, cataloghi MD5–11 e registro aggiornato.
- `test-reading-archive-codec.mjs`: 391 file archivio Serie A/Champions ricostruiti senza differenze.
- `test-package-pages.cjs --site output/serie-a-shared-2026-11-15/site`: confronto completo dei file pubblicati, inclusa ricostruzione delle Letture e verifica hash.
- Edge, giornate 12/20/38, larghezze 1440 e 390: sei confronti prima/dopo, DOM identico e zero pixel differenti; nessun nuovo errore rispetto alla versione completa.
- Cache browser: zero richieste di rete per i blocchi condivisi al ricaricamento; partita e registro ancora scaricati dalla rete.

Alla prima visita il frazionamento costa circa 5,9–6,7 KB gzip aggiuntivi nei tre casi verificati. MD12: 309.805 → 315.694 byte gzip a cache vuota; al ricaricamento con blocchi in cache: 287.689 byte. Non è dimostrata una riduzione del tempo dei calcoli: motori e formule sono invariati. Le successive consultazioni possono riusare rose e directory già scaricate.

Limiti preesistenti riscontrati: MD20 e MD38 non hanno ancora il file delle probabili e il pannello territoriale riceve una data nulla (`cutoffExclusive.split`), attivando il layout di ripiego. Stesso comportamento prima e dopo; non corretto in questo intervento. I font esterni sono stati esclusi dai confronti per renderli riproducibili.

Evidenze: `output/serie-a-shared-2026-11-15/browser.json`, screenshot nella stessa directory. Test ripetibile con `npm run test:reading:shared`; controllo browser con `node scripts/check-reading-shared-browser.cjs`, dopo aver preparato il pacchetto nella directory indicata.
