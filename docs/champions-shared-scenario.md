# Scenario Champions: motore condiviso

Dal 24 ottobre 2026 le nuove Letture Champions usano `predictScenario` in `scripts/predictions/engine.js`, chiamato anche da `predictMatch` per la Serie A. Sono condivisi gol attesi, matrice Poisson, risultato centrale e alternative, probabilità 1-X-2, volumi, modello disciplinare, confidenza e sorpresa. Formule e pesi del motore Serie A restano invariati.

`scripts/champions/shared-scenario.cjs` adatta le statistiche canoniche Champions al contratto del motore. I volumi domestici sono normalizzati rispetto al campionato di appartenenza; le ultime otto gare usano il decadimento 0,82. I tassi già normalizzati non ricevono il correttivo di promozione dalla Serie B. Questo adattamento non calibra automaticamente il modello sulle competizioni europee.

## Generazione e lettura

`npm run build:champions:scenario` genera la prossima giornata e aggiorna la pagina Champions. Per una giornata futura specifica: `node scripts/build-champions-shared-scenarios.cjs --matchday 4`, poi `node scripts/build-site.js --presentation-only --champions-page-only`. L'orchestratore `scripts/update-matchday.cjs` indirizza le giornate 4–8 al nuovo builder; senza `--stage` mostra solo il piano.

La catena è `data/sources/champions-pilot-match-stats-2025-27.json` e calendario/quote/profili normalizzati → adattatore → motore condiviso → `data/generated/champions-shared-scenarios.json` → calendario e dettaglio Champions. Il file generato include hash degli input e limiti per fixture. Il build di sola presentazione non ricalcola il modello.

Sono ammesse solo gare `scheduled` con calcio d'inizio futuro in Europe/Rome. Le osservazioni e i timestamp di acquisizione devono precedere il cutoff. Servono almeno sei gare, con almeno due osservazioni per sede; dati insufficienti producono `null`. Il file è una proiezione delle gare future: il builder rimuove quelle iniziate e conserva le altre giornate future già generate.

## Copertura attuale

La prima generazione riguarda le 18 gare della quarta giornata: 17 con base gol sufficiente; Viking–Sabah resta N/D per assenza di osservazioni utilizzabili di Sabah. Campioni e date delle ultime osservazioni sono visibili nella Lettura.

Non sono ancora collegati all'adattatore le formazioni canoniche per queste gare, gli xG comparabili, gli obiettivi e i precedenti. La forma recente non dispone della correzione per forza dell'avversario basata sulla classifica usata dalla Serie A. I relativi correttivi restano assenti o neutri, senza inventare dati o riutilizzare XI di altre giornate. I profili tattici si applicano soltanto se esiste una corrispondenza esatta per team ID. Le stime sono preliminari; la confidenza è un indice interno, non una probabilità di successo né una calibrazione Champions.

La migrazione riguarda lo Scenario delle Letture. Non crea mercati individuali, selezioni operative, contratti BetSelection, quote, EV o liquidazioni. Gli archivi delle giornate concluse e i cataloghi Schedina/MyCombo restano autorevoli e invariati. Per estendere una giornata a mercati operativi serve la normale integrazione dei contratti e delle formazioni, con i criteri già approvati.

## Verifiche

`npm run test:champions:scenario` confronta 20 previsioni complete Serie A con il motore precedente ed esercita cutoff, N/D, gare concluse e indipendenza dalle quote. `node scripts/check-champions-shared-scenarios.cjs` verifica dettaglio e calendario a 1440 e 390 pixel, includendo una lettura storica; evidenze in `output/champions-shared-scenario/`.
