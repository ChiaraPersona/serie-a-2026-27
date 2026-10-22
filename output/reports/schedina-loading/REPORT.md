# Schedina: caricamento per competizione e giornata

Verifica locale del 22 ottobre 2026. Nessun commit, push o deploy eseguito dall'assistente.

## Modifica

- La query viene letta e validata prima delle richieste. Le giornate Champions non precaricano più gli archivi Serie A; le giornate Serie A caricano soltanto il proprio archivio, risultati e liquidazioni. Squadre e combinazioni si aggiungono soltanto nelle viste che li usano.
- L'indice carica un JSON di presentazione con le dieci card. Il build le produce con il renderer e le formule di liquidazione originali; non esiste una seconda formula per statistiche o ROI.
- Le combinazioni MD5 vengono lette da una proiezione compatta dell'originale. MD6/MD7 usano il catalogo già pubblicato, con proiezioni disponibili solo per il percorso di fallback. Nessuna previsione o quota viene ricalcolata.
- Schedina condivide le richieste JSON in corso e già completate nella stessa vista. Il registro ufficiale conserva `no-store` ed è aggiornato al nuovo render. Le altre pagine non attivano questa cache. Errori di rete non restano memorizzati, consentendo il retry.
- Il build di presentazione Schedina aggiorna automaticamente indice e proiezioni. Gli archivi originali restano integralmente al loro posto. Dopo aggiornamenti a risultati, ufficialità o cataloghi è necessario rigenerare la presentazione, come per gli altri artefatti generati.

## Pesi misurati

Somma dei JSON richiesti al primo caricamento, cache fredda, server locale con `Cache-Control: no-store`. Include quindi richieste ripetute del registro e di `matches.json` nella versione precedente. MB decimali. Non include HTML, JS, CSS, immagini o font.

| Vista | Prima MB | Dopo MB | Riduzione | Richieste prima → dopo |
|---|---:|---:|---:|---:|
| Indice | 182,1597 | 0,0108 | 99,99% | 55 → 1 |
| Serie A MD1 | 67,8102 | 2,2548 | 96,67% | 35 → 4 |
| Serie A MD2 | 67,8102 | 2,2543 | 96,68% | 35 → 4 |
| Serie A MD3 | 67,8102 | 2,2555 | 96,67% | 35 → 4 |
| Serie A MD4 | 67,8102 | 2,2521 | 96,68% | 35 → 4 |
| Serie A MD5 | 67,8102 | 2,3497 | 96,53% | 35 → 6 |
| Serie A MD6 | 67,8102 | 15,0080 | 77,87% | 35 → 5 |
| Serie A MD7 | 67,8102 | 16,4777 | 75,70% | 35 → 5 |
| Champions MD1 | 73,5184 | 5,6053 | 92,38% | 39 → 4 |
| Champions MD2 | 75,1328 | 7,1032 | 90,55% | 41 → 5 |
| Champions MD3 | 182,1597 | 113,3146 | 37,79% | 55 → 12 |

I precedenti 51,64 MB descrivevano i dataset applicativi preliminari unici: non comprendevano tutte le richieste del servizio dati e gli ulteriori caricamenti del ramo selezionato. I valori sopra sono il confronto completo rilevato nel browser per ogni vista e non contraddicono quella misura.

Dimensione gzip teorica dei JSON complessivi dopo l'intervento: indice 1.583 byte; MD5 207.712 byte; MD7 894.584 byte; Champions MD2 546.639 byte; Champions MD3 4.147.457 byte. La compressione è simulata con `node:zlib`, non verificata sull'hosting. I tempi percepiti non sono stati stimati con percentuali di peso.

I nuovi file di presentazione pesano: indice 10.793 byte; combinazioni MD5 85.239 byte; MD6 387.347 byte; MD7 384.256 byte. Gli ultimi due non vengono richiesti con i cataloghi attuali completi.

## Verifiche

- **16 confronti browser reali**: tutte le 11 viste a 1440 px; indice, MD5, MD7, Champions MD2 e MD3 anche a 390 px. DOM e testo completi identici, inclusi quote, probabilità, EV, esiti, badge Preferiti, MyCombo e controlli. Identici anche i contenuti dopo apertura dei pannelli. Nessun overflow orizzontale. Zero differenze percettive negli screenshot del viewport, con pixelmatch a soglia 0,1. I font esterni sono bloccati simmetricamente. Nessun URL JSON duplicato nella nuova versione.
- **Persistenza desktop/mobile**: due ulteriori confronti con la sola partita Bologna–Inter resa programmata in una risposta browser di test. I dati reali, tutti conclusi per le viste selezionate, non sono stati modificati. Aggiunta, salvataggio, ripristino dopo reload, stato selezionato e rimozione funzionano allo stesso modo prima/dopo. Le gare concluse mantengono i controlli disabilitati.
- PASS `test-schedina-loading.mjs`: richieste concorrenti deduplicate, registro fresco a nuovo render, errori riprovabili, archivio MD7 preservato, proiezioni MD5/6/7 identiche agli originali, dieci card, giornata Champions non valida respinta senza richieste.
- PASS `test-md07-archive-service.mjs`: contratti storici conservati, non titolari esclusi dalle selezioni operative e salvate.
- PASS `test-personal-betslip.mjs`, `test-betting-selection-contract.js`, `test-forecast-sync.js`, `test-schedina-md07.mjs`.
- PASS regressione dell'ottimizzazione precedente `test-champions-md02-browser-data.mjs`: 18/18 confronti di markup e rose.
- Secondo build idempotente: HTML e quattro nuovi JSON identici. Archivi originali invariati durante il build. Hash in `integrity.json`.
- `git diff --check`: PASS.

## Problemi e limiti

- `test-champions-md3-approved.mjs` pretende che tutte le sette selezioni siano ancora `pending`. I dati correnti includono gare concluse: questa aspettativa storica fallisce indipendentemente dal caricamento Schedina. I suoi input e il modulo di liquidazione non sono stati modificati. Non viene dichiarata verde l'intera suite.
- Uno stress test aggiuntivo svuota artificialmente il catalogo di una partita. Il renderer precedente fallisce già per assenza di `suggestionAnalysis.rank` nel fallback; quello nuovo restituisce lo stesso errore e carica correttamente la proiezione MD7. Il confronto è in `fallback-audit.json`. Nessuna vista reale presenta questa condizione; non sono stati cambiati i criteri delle selezioni per correggere un caso fuori ambito.
- Champions MD3 resta pesante per i suoi cataloghi base e gli aggiornamenti necessari al workspace esistente. Qui sono stati eliminati gli archivi estranei e le richieste duplicate; la riduzione di quei cataloghi richiede una proiezione dedicata successiva.

## File applicativi

- Modificati: `js/pages/betting.js`, `js/services/data-service.js`, `js/core/app.js`, `scripts/build-site.js`, `schedina.html`, `package.json`, `README.md`.
- Aggiunti: `scripts/build-schedina-browser-data.mjs`, `scripts/test-schedina-loading.mjs`, `scripts/check-schedina-loading.cjs`, `data/generated/schedina-index-2026-27.json`, `data/normalized/predictions-md05.json`, `data/normalized/predictions-md06.json`, `data/normalized/predictions-md07.json`.
- Evidenze: `audit.json`, `interactive-audit.json`, `fallback-audit.json`, `integrity.json`, screenshot prima/dopo e tre moduli originali in `baseline/` per riprodurre il confronto.

Comandi: `node scripts/build-site.js --presentation-only --betting-page-only`, `npm run test:schedina:loading`, `npm run test:schedina:loading:browser`; per le simulazioni isolate aggiungere `-- --interactive-only` oppure `-- --fallback-only` all'ultimo comando.
