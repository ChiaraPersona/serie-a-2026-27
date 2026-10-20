# Champions MD3: selezione e pubblicazione con i controlli Serie A MD7

## Risultato verificato

18 partite valutate; 1.790 contratti/candidati conservati nel registro interno; 78 previsioni pubblicate come preliminari, di cui 66 con quota verificata nello snapshot e 12 senza quota. Nessuna selezione approvata dal controllo completo Champions e nessun MyCombo approvato. Due partite non hanno previsioni ammissibili: vengono mostrati il quadro collettivo e lo stato di indisponibilità, senza forzare sostituzioni.

Le sette singole precedentemente autorizzate rimangono integralmente negli slips storici; non bypassano l'approvazione corrente. `archiveSummary` conserva il vecchio riepilogo; `summary` e `marketCatalog.totals` indicano zero approvate correnti. Quote, identità, probabilità centrali ed EV originari dei 1.790 contratti sono confrontati con la copia iniziale.

## Analisi della Serie A MD7 svolta prima delle modifiche

- `build-betting-md07.js`: orchestrazione delle previsioni esistenti, statistiche discrete e catalogo condiviso; protezione delle altre giornate.
- `predictions/rank-shooter-candidates.js`: shortlist dei cinque candidati principali per tiri e SOT.
- `md06-player-forecast-integration.js`: verifica titolarità, minuti minimi, stabilità, sostegno della Lettura e scelta delle soglie. Le soglie e i pesi restano quelli esistenti.
- `md06-suggested-forecasts.js`: verifica quota, probabilità prudenziale, affidabilità, coerenza di scenario e validazione della famiglia statistica; confronto bilanciato delle soglie, deduplicazione e gestione dei conflitti. L'EV è informativo nella policy condivisa: non è stato introdotto un filtro EV inventato.
- `md06-scenario-coherence.js`: relazioni tra eventi, implicazioni, equivalenze e incompatibilità.
- `generate-mycombo-md01.js`, `enforce-mycombo-risk.js`, `personal-betslip-store.mjs`: vincoli di famiglia, sovrapposizione, combinabilità e salvaguardie della schedina personale. Una moltiplicazione di marginali non certifica una combinazione della stessa partita.
- `shared-forecast-contract.mjs`: stesso elenco di selezioni per Lettura e Schedina.

## Implementazione

`md3-publication-policy.cjs` è un adattatore di pubblicazione: richiama i requisiti Champions esistenti e il selettore condiviso MD7. Rivaluta tutti i contratti senza modificare formule o probabilità. Non concede approvazione a una probabilità non calibrata o a una precedente autorizzazione editoriale. Conserva la shortlist individuale prodotta dai builder esistenti come preliminare, applicando policy giocabile, esclusioni, identità per giocatore/famiglia e conflitti logici. Il filtro ufficiale usa esclusivamente gli ID canonici del registro quando presenti.

Il builder `build-champions-md3-schedina.cjs` esegue probabili, preliminari, integrazione individuale condivisa e pubblicazione. La catena `update-matchday.cjs` termina con questo catalogo, dopo la conservazione delle singole storiche. Nessuna rigenerazione Serie A.

Le statistiche individuali restano quelle della pipeline Champions: storico, canali domestico/europeo separati, fattore contestuale già esistente, minuti osservati, budget di squadra e riconciliazione con i volumi collettivi. Non sono stati aggiunti coefficienti per colmare dati assenti.

La vista Champions MD3 mostra soltanto la shortlist, con intestazione, data/ora, tiri/SOT/corner e probabilità 1X/X2. Rimossi i mercati manuali dalla vista compatta e i titoli intermedi di famiglia. Tiri singoli/DUO e SOT singoli/DUO condividono la famiglia visiva; i contratti, le regole di liquidazione e gli ID restano distinti. Le probabilità individuali non sono applicate al DUO; probabilità contrattuale ed EV DUO restano N/D. L'EV preliminare calcolabile è indicato come teorico.

La schedina personale resta operativa, con persistenza e controlli di sovrapposizione. Gli stati MyCombo N/D sono nel registro canonico e vengono mostrati senza generare combinazioni artificiali. Non è stato implementato un nuovo modello congiunto Champions: la generazione di combinazioni statisticamente approvate resta indisponibile.

## Verifiche

- PASS: `test-champions-md3-publication.mjs`: 18 fixture, shortlist, duplicati, approvazione, quote/probabilità invariate, semantica DUO, esclusione ufficiale simulata, selezioni salvate non più correnti e 12 hash protetti Serie A/registro condiviso.
- PASS: browser, tutte le 18 Letture e le 18 partite della Schedina; identità delle selezioni tra pagine, aggiunta/rimozione, dialog schedina, nessun catalogo alternativo o titolo di famiglia.
- PASS: Schedina a 1440, 390 e 320 px; nessun overflow. Controllo visivo delle card e del tema scuro.
- PASS: `test-champions-md3-probable.mjs`, `test-champions-md3-approved.mjs`, `test-personal-betslip.mjs`, `test-betting-selection-contract.js`, `test-reading-detail-adapters.mjs`, `test-reading-detail-internals.mjs`, `test-schedina-md07.mjs`, `test-update-workflow.cjs`, `test-css-modules.js`.
- `test-champions-md3-lineup-managed.mjs`: controlli funzionali precedenti all'ultima asserzione superati; fallisce il confronto finale con un vecchio hash di `champions-registered-squads-2026-27.json`. Quel file era già modificato all'inizio dell'intervento per un lavoro concorrente sulle maglie. Non è stato ripristinato.
- `git diff --check`: nessun errore.
- Suite globale non eseguita; nessuna nuova calibrazione o liquidazione statistica certificata eseguita.

## Limiti residui

La calibrazione esistente non autorizza il modello Champions MD3 sugli eventi esatti. Mancano probabilità di titolarità stimate e copertura sistematica delle concessioni avversarie per ruolo/zona; non sono stati inventati valori. Quattro squadre restano limitate alle previsioni collettive secondo la policy già esistente. Nessuna formazione ufficiale MD3 è stata acquisita in questa richiesta: esclusioni future sono verificate tramite il registro condiviso, ma l'integrazione reale di un nuovo undici richiede il normale aggiornamento canonico e il ricalcolo.

L'uniformità dei criteri di pubblicazione non costituisce una validazione del modello Champions. Il lavoro non introduce nuove selezioni approvate né un nuovo motore MyCombo congiunto.

Dati dettagliati: `test-results.json`, `browser-results.json`, `fixtures-audit.json`, `protected.json`. Screenshot: `panel-1440.png`, `panel-390.png`, `panel-320.png`, `lettura-390.png`.

Nessun commit, push o deploy eseguito da questo intervento. Le modifiche concorrenti sono state conservate.
