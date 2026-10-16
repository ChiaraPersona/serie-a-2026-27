# Letture — Blocchi B + C completati

16 ottobre 2026. HEAD iniziale/finale: `614977ee551acc2d05a042eb7aa0472f4c9b4caf`. Stato Git iniziale pulito. Due letture ravvicinate, a cinque secondi di distanza, hanno confermato gli stessi hash di 556 file critici. Evidenze: `first.json`, `baseline.json`, `integrity.json`. La baseline del Blocco A precedente non è stata modificata.

## Pagine attive

- `lettura.html?match=atalanta-venezia-2026-27-md-06`
- `champions-league.html?match=ucl-2026-27-md02-05`

Fallback esplicito: aggiungere `&layout=legacy` oppure usare «Vista precedente». Fallback automatico: un errore nell'installazione della nuova struttura ripristina i nodi originali. Il browser test forza un errore e confronta il DOM ripristinato con quello legacy, per entrambe le pagine.

## File applicativi

Modificati:

- `js/pages/readings.js`: solo import del gate e collegamento al pilota Serie A dopo il rendering originale.
- `js/pages/champions.js`: solo import del gate e collegamento al pilota Champions dopo il montaggio dei controller originali.

Creati:

- `js/pages/reading-detail/view-model.mjs`: identità/presentazione e gate delle due fixture.
- `js/pages/reading-detail/serie-a-adapter.mjs`: lettura dei dati Serie A e dei forecast condivisi, senza mutazione.
- `js/pages/reading-detail/champions-adapter.mjs`: dati Champions e selezioni pubblicate, con contratto distinto.
- `js/pages/reading-detail/shell.mjs`: testata, raggruppamento delle sezioni esistenti, icone, anchor, mini-header, stylesheet condizionale e rollback.
- `css/reading-detail.css`: geometria 1050 px, due temi e responsive, con scope del solo dettaglio pilota.

Creato inoltre `scripts/test-reading-detail-adapters.mjs`, test di sola lettura dei riferimenti e delle invarianti dei nuovi adattatori. Nessun HTML o generatore del sito modificato; nessuna build.

## Funzioni implementate

Architettura comune per i due campioni; testata simmetrica con stemmi, nomi, VS, data/orario, risultato finale separato; indicatori originali del modello; layout editoriale con larghezza massima 1050 px; titoli e icone; navigazione sticky orizzontale; mini-testata durante lo scorrimento; tema perla Serie A e blu notte Champions; colori casa/ospite; anchor con compensazione header e focus da tastiera.

Le sezioni non convertite sono i nodi originali spostati, non copie ricostruite e non contenitori vuoti. Listener, ID, modificatori, quote e contratti rimangono quelli esistenti. Le sezioni prive di contenuti originari non vengono create artificialmente nel pilota C. Nessun nuovo mercato o dato.

## Test

Passati:

1. `test-reading-detail-adapters.mjs`: source immutabili, identità, riferimenti originali dei contratti, proprietà assenti/null e gate.
2. `test-personal-betslip.mjs`.
3. `test-forecast-sync.js`.
4. `test-reading-prediction-v2.mjs`.
5. `test-champions-reading-page.mjs`.
6. `test-official-starter-policy.cjs`.
7. `test-champions-md02-market-ui.mjs`.

`git diff --check` superato. Non eseguiti test che rigenerano dati, buildRegistry, build o npm aggregate con effetti collaterali.

Browser reale: Edge headless, pilot a **1440, 1024 e 390 px**. Sei verifiche senza overflow pagina o errori console. Misure main: 1050, 976, 358 px. Anchor raggiunti e visibili, mini-header attivo, nav allineata al bordo inferiore dell'header (80 px desktop/tablet, 70 px mobile).

ID mercati confrontati esattamente con fallback legacy: **15 Serie A, 7 Champions**, invariati a tutte le larghezze. Sei controlli fuori perimetro con markup identico rispetto alla route legacy e nessun nuovo tema: indice Letture, calendario Champions, squadra Inter Champions, Coppa Italia, Schedina MD7 e Milan–Atalanta MD7.

Due controlli di errore forzato: ripristino integrale del DOM legacy riuscito per entrambi i campioni. Evidenza: `browser-results.json`; script riproducibile `browser.cjs` (scrive soltanto artefatti locali nella propria directory).

## Integrità e confini

La verifica finale dei 556 file iniziali rileva esclusivamente i due renderer autorizzati modificati. Nessuna variazione non autorizzata, HEAD invariato. Motori, contratti, store, dataset normalizzati, dati squadra, quote e snapshot del perimetro verificato mantengono gli hash iniziali; nessun altro file tracciato compare nel diff. I contesti MD7 e Champions MD2 e la politica dei titolari non sono stati modificati.

Il test browser usa contesti isolati, non il profilo personale dell'utente. Lo store reale dell'utente non viene letto o modificato dal test. Le pagine campione concluse mantengono le azioni disabilitate originarie.

## Screenshot

File `serie-a-1440.png`, `serie-a-1024.png`, `serie-a-390.png`, `champions-1440.png`, `champions-1024.png`, `champions-390.png`; ulteriori screenshot `*-sticky.png` e `*-390-full.png`. Sono immagini delle pagine reali servite localmente, non mockup.

## Limitazioni rimaste

- Pilota attivo soltanto sulle due fixture autorizzate; il resto conserva la vista esistente.
- Filtri nuovi, dashboard giocatori, nuova schedina drawer/sheet, nuove visualizzazioni statistiche e tutti gli altri blocchi non sono stati iniziati.
- Le sezioni mantengono struttura e contenuti originali all'interno della nuova cornice, con il relativo livello di copertura e le limitazioni già presenti.
- Nessuna zona di tiro, duello o storico mancante è stato inventato. Nessuna certificazione di liquidazione aggiunta.
- Controlli responsive, navigazione, console e fallback effettuati; non è una certificazione completa WCAG.
- Server di anteprima locale in sola lettura (`preview.cjs`), nessuna pubblicazione esterna.

Nessun commit, push o deploy. Lavoro fermato dopo B + C.
