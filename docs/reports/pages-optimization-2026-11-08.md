# Alleggerimento distribuzione Pages — 8 novembre 2026

Il pacchetto pubblico passa da 609.199.826 a 504.297.459 byte: risparmio di 104.902.367 byte (17,22%), da 2.253 a 2.232 file. Esclusi dal solo deploy 21 archivi canonici/intermedi non consumati dal browser. I file originali restano integralmente nel repository; nessuna modifica a dati, calcoli, quote, selezioni o pagine.

Le esclusioni esplicite sono documentate in scripts/package-pages.cjs. Comprendono archivio globale previsioni (le pagine usano proiezioni per gara/giornata), quattro cataloghi Lettura integrali, statistiche e database intermedi Champions, alcuni input statistici e referti interni. Restano pubblicate tutte le proiezioni Lettura, cataloghi per gara, previsioni e Schedine per giornata, snapshot di verifica pubblica e dipendenze Champions operative.

Il test di packaging verifica i riferimenti ai file esclusi nel codice browser e conserva esplicitamente le dipendenze con URL dinamici. Eseguito test-package-pages.cjs --site output/pages-optimization-2026-11-08/site: tutti i JSON mantenuti coincidono con gli originali per valore; asset statici identici byte per byte.

Controllo Edge della copia distribuita, eseguito da scripts/check-pages-optimization-browser.cjs: 32 pagine/viewport a 1440 e 390 px, Home, Letture attuali/storiche, Schedina attuale/storica, dettaglio Champions MD2/MD3/MD4, Schedina Champions MD3/MD4, statistiche squadre/giocatori, scheda Roma e download. Nessun errore JavaScript o dipendenza esistente persa. La richiesta opzionale data/generated/reading-bench-starter-scenarios/roma-sassuolo-2026-27-md-11.json è già assente nel checkout canonico: registrata separatamente, senza generare nuovi dati sperimentali.

Evidenze: output/pages-optimization-2026-11-08/before.json, reduction.json, browser.json, screenshot e site/. La riduzione non dimostra che il timeout GitHub Pages sia risolto: serve una nuova pubblicazione autorizzata per verificarlo. Nessun commit, push o deploy.
