# Champions MD2: separazione del payload browser

Data di verifica: 22 ottobre 2026. Intervento locale, senza commit, push o deploy.

## Risultato

Le Letture Champions MD2 richiedono ora `data/normalized/champions-md02-ui-2026-27.json` anziché scaricare l'integrazione tecnica completa. Il nuovo artefatto contiene le 18 fixture con i soli campi consumati dal renderer: `fixtureId`, `lineups`, `availability`, più metadati di versione, competizione, stagione, giornata e generazione copiati dall'originale. Non ricalcola alcun valore.

| Misura della singola risorsa sostituita | Prima | Dopo | Riduzione |
|---|---:|---:|---:|
| JSON, byte | 97.478.953 | 409.178 | 99,58% |
| gzip simulato, byte | 3.104.635 | 45.279 | 98,54% |

Il risparmio originale è 97.069.775 byte per caricamento del dettaglio MD2 senza cache. La compressione è misurata localmente con `node:zlib`, non è una verifica degli header dell'hosting. Questi pesi riguardano una sola risorsa: gli altri dataset della pagina restano invariati. Non vengono dichiarati miglioramenti temporali o punteggi Lighthouse non misurati.

L'archivio originale resta nella stessa posizione, integralmente disponibile per builder, riconciliazioni d'identità, quote, motori, audit e liquidazioni. Il repository conserva quindi anche l'originale: la riduzione riguarda il caricamento del browser, non lo spazio totale locale. SHA-256 dell'archivio prima/dopo: `260883e6decb02f64eb9a70b047583e3962512ce0beac225fee4c5fac84bbb64`.

## Integrazione

- `scripts/build-champions-md02-browser-data.cjs`: nuova proiezione deterministica; validazione di competizione, stagione, giornata e 18 ID canonici univoci; scrittura soltanto se cambia il contenuto.
- `scripts/build-site.js`: rigenera la proiezione quando produce la pagina Champions, anche in modalità presentazione; aggiorna la versione del modulo Champions.
- `js/pages/champions.js`: cambia soltanto il nome del dataset MD2 richiesto; renderer e formule invariati. Usa lo stesso servizio `load()` e lo stesso filtro dei titolari ufficiali.
- `champions-league.html`: shell rigenerato con la nuova versione; nessuna modifica grafica.
- `data/normalized/champions-md02-ui-2026-27.json`: nuovo payload compatto.
- `scripts/test-champions-md02-browser-data.mjs`: regressione su tutte le fixture, pipeline ufficiale, markup precedente, modelli e rose.
- `scripts/check-champions-md02-browser-data.cjs`: confronto browser tra il renderer che carica l'archivio originale e lo stesso renderer che carica il payload.
- `scripts/test-champions-md02-market-ui.mjs`: aggiorna esclusivamente l'aspettativa del percorso browser.
- `package.json`: comandi dedicati di verifica e inserimento del test dati nella suite dei contratti.
- `README.md`: documentazione della proiezione e della rigenerazione.

Il build eseguito è `node scripts/build-site.js --presentation-only --champions-page-only`. Non sono stati eseguiti importer, builder previsionali, aggiornamenti degli undici o liquidazioni. Quote, soglie, modificatori, criteri di approvazione, dati Serie A, MD1 e MD3 restano intatti. Non è previsto un fallback automatico all'archivio da 97 MB: se manca il nuovo artefatto occorre rigenerarlo con il build.

## Verifiche superate

- Nuovo test dati: 18/18 markup legacy equivalenti, 18/18 modelli e rose equivalenti; formazioni, indisponibilità, titolari, panchine, proiezioni e valori null conservati. Si normalizzano soltanto gli ID SVG progressivi allocati dal renderer delle maglie durante i render consecutivi nello stesso processo.
- Il filtro ufficiale applicato alla proiezione produce gli stessi campi applicativi della proiezione dell'archivio già filtrato.
- Test browser Edge: fixture MD2-01, MD2-05 e MD2-18 a 1440 e 390 px nella vista condivisa; MD2-05 alle stesse larghezze nella vista legacy: 8 confronti, 16 caricamenti complessivi.
- DOM completo, testo visibile, selezioni, quote, probabilità, EV, stato degli esiti, controlli e contenuti dopo l'apertura dei pannelli identici. Nessun errore JavaScript, risorsa locale fallita o overflow orizzontale.
- Ogni confronto verifica che la versione ottimizzata richieda una volta il nuovo artefatto e non richieda l'archivio tecnico.
- Screenshot prima/dopo senza differenze percettive: pixelmatch, soglia 0,1, zero pixel differenti. Edge produce lieve rumore cromatico nei gradienti fra contesti separati, quindi non si afferma identità binaria dei PNG. I font Google sono bloccati simmetricamente nei confronti; il caricamento dei font pubblici non è oggetto di questo test.
- `scripts/test-champions-md02-integration.js`: PASS, 18 fixture, 28.109 mercati e 92.818 selezioni provider integre; guardie storiche e controlli correnti distinti.
- `scripts/test-champions-referee-readings-md02.js`: PASS, 18/18 designazioni e statistiche.
- `scripts/test-reading-player-rosters.mjs`: PASS, 106 fixture, 2.332 titolari e 1.322 voci di panchina, identità senza duplicati e input invariati.
- `scripts/test-personal-betslip.mjs`: PASS, persistenza, deduplica, quote, contesti e compatibilità.
- `scripts/test-betting-selection-contract.js`: PASS, 6 schedine, 137 MyCombo e 137 prediction legs.
- `scripts/test-champions-reading-page.mjs`: PASS, regressione della Lettura Champions MD1.
- `scripts/test-css-modules.js`: PASS.
- `git diff --check`: PASS.
- Secondo build di presentazione: identici hash di HTML, payload e archivio; il payload non viene riscritto se invariato.

Le evidenze browser sono in `audit.json` e nei 16 screenshot `*-before.png` / `*-after.png` di questa cartella. L'archivio completo, il pilot MD2, la Schedina MD2 e il registro ufficiale conservano gli stessi hash durante il test browser.

## Problemi preesistenti e limiti

1. `scripts/test-champions-md02-market-ui.mjs` fallisce alla riga 59 perché pretende ancora la stringa `competition==="champions"&&matchday==="2"` in Schedina, già assente prima dell'intervento. Il controllo sui cinque contratti aggiunti/ripristinati viene superato prima dell'asserzione obsoleta. Non è stato modificato il renderer Schedina per soddisfare questa aspettativa.
2. `scripts/test-champions-md02-schedina.mjs` pretende 120 selezioni, mentre il dataset corrente, invariato, ne contiene 113. L'aspettativa storica non è stata modificata in questo intervento.

Non si dichiara quindi verde l'intera suite. Le verifiche dedicate e le regressioni sopra elencate sono superate. L'avvio iniziale di Edge nella sandbox non era disponibile; il test è stato completato con il browser fuori dalla sandbox tramite l'escalation autorizzata.
