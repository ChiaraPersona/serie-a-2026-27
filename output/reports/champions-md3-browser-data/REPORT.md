# Schedina Champions MD3: proiezione del catalogo

Verifica locale: 22 ottobre 2026. Nessun commit, push o deploy eseguito.

## Risultato

La sola vista Schedina Champions MD3 carica il workspace finale composto durante il build dall'adapter esistente. Il browser non scarica più calendario completo, cataloghi base, archivio delle probabili e successione degli aggiornamenti ufficiali per ricostruire la stessa vista.

| JSON caricati dalla vista | Prima | Dopo | Risparmio |
|---|---:|---:|---:|
| Byte originali | 113.314.583 | 12.962.349 | 88,56% |
| gzip simulato, byte | 4.147.457 | 505.966 | 87,80% |
| Richieste | 12 | 3 | 9 richieste |

Risparmio originale per caricamento a cache fredda: **100.352.234 byte**. Le tre richieste nuove sono registro ufficiale, proiezione MD3 e liquidazioni dei cartellini. Il nuovo payload pesa 12.832.232 byte. Le misure escludono HTML, JS, CSS, immagini e font; gzip è simulato localmente, non verificato sull'hosting. Non sono stimati miglioramenti temporali non misurati.

## Dati conservati

- Tutte le 18 fixture del workspace, con stato, risultato e referti necessari alle liquidazioni.
- Tutte le selezioni finali, non soltanto quelle suggerite: dopo il filtro attuale sono **1.797 contratti**, integralmente identici all'adapter originale, con ID, quote, valutazioni, modificatori, preferiti, scenari, condizioni e metadati del contratto.
- I record per partita del catalogo finale, ordine, suggerimenti, conteggi e versione.

Non vengono serializzate copie ripetute di `all`, dell'archivio `source` e delle previsioni di squadra non usate da questa vista. `all` viene ricostruito dalle stesse selezioni per partita, condividendo gli oggetti. I due conteggi approvati/preliminari usano le stesse condizioni dell'adapter originale dopo il filtro ufficiale. Nessun motore previsionale viene eseguito e nessuna quota viene ricalcolata.

Il build compone la proiezione dagli archivi **senza congelare il filtro ufficiale**: il registro aggiornato viene applicato dal servizio dati nel browser. Gli archivi originali e il percorso delle Letture restano intatti. Dopo aggiornamenti dei dati occorre rigenerare la presentazione Schedina; il build del sito lo fa automaticamente anche con `--presentation-only`.

## Verifiche

- PASS confronto esatto fra adapter originale e proiezione: fixture, tutti i 1.797 contratti, record per partita, ordine, metadati applicativi e conteggi **0 approvati / 187 preliminari**.
- PASS salvataggio e riconciliazione di **187 selezioni suggerite**: snapshot identici usando catalogo originale o proiezione.
- PASS browser Edge a **1440 e 390 px**: DOM e testo completi identici, pannelli aperti identici, quote, probabilità, EV, badge Preferiti e MyCombo invariati. Zero differenze percettive negli screenshot del viewport con pixelmatch a soglia 0,1; nessun overflow orizzontale o errore JavaScript. Font esterni bloccati simmetricamente.
- PASS ulteriori confronti browser su indice e Champions MD2: grafica, contenuti e richieste invariati.
- PASS aggiunta, ripristino dopo reload, stato selezionato e rimozione su desktop/mobile. La prova rende programmata una sola fixture esclusivamente nelle risposte browser di test, perché le partite reali sono concluse. Nessun file di risultato viene alterato.
- PASS regressioni `test-personal-betslip.mjs`, `test-betting-selection-contract.js`, `test-schedina-loading.mjs`, `test-champions-md02-browser-data.mjs`.
- PASS secondo build idempotente e hash invariati di 21 archivi originali; indice Schedina e HTML invariati al secondo build. Evidenza in `integrity.json`.
- PASS `git diff --check`.

Nessun problema rilevato nei test mirati. Non è stata eseguita né dichiarata verde l'intera suite storica. La proiezione conserva deliberatamente anche i contratti non suggeriti: resta un payload di circa 12,83 MB per mantenere completa la semantica dei contratti.

## File

- Nuovi: `data/normalized/schedina-champions-md03-ui.json`, `js/pages/champions-md3-browser-workspace.mjs`, `scripts/build-champions-md3-browser-data.mjs`, `scripts/test-champions-md3-browser-data.mjs`, `scripts/check-champions-md3-browser-data.cjs`.
- Modificati: `js/pages/betting.js`, `scripts/build-site.js`, `schedina.html`, `scripts/check-schedina-loading.cjs`, `package.json`, `README.md`.
- Evidenze in questa cartella: `audit.json`, `interactive-audit.json`, `integrity.json`, screenshot prima/dopo e moduli originali in `baseline/`.

Comandi riproducibili: `node scripts/build-site.js --presentation-only --betting-page-only`; `npm run test:champions:md3:browser-data`; `npm run test:champions:md3:browser-data:browser`; per la persistenza, aggiungere `-- --md3-interactive` all'ultimo comando.
