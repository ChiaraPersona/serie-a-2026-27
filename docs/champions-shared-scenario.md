# Scenario Champions: motore condiviso

Dal 24 ottobre 2026 le nuove Letture Champions usano `predictScenario` in `scripts/predictions/engine.js`, chiamato anche da `predictMatch` per la Serie A, per la base tecnica di gol, volumi e disciplina. Dal 4 novembre, su richiesta esplicita dell'utente, l'1X2 e le doppie chance delle fixture future dalla MD4 usano il rating europeo tramite `scripts/champions/european-result-policy.cjs`. Formule e pesi del motore Serie A restano invariati; le previsioni delle gare iniziate restano quelle originali.

## Esito europeo dal 4 novembre

La configurazione in `data/sources/champions-european-result-policy.json` applica l'Elo selezionato nella ricerca e lo aggiorna con i soli risultati europei conclusi anteriori alla data di previsione. Le identità passano dalla mappa UEFA canonica; servono almeno sei precedenti europei per entrambe le squadre. Altrimenti 1X2 e doppie chance restano N/D. Il rating non riceve correzioni arbitrarie di forma domestica o formazione.

La distribuzione è preliminare. L'autorizzazione dell'utente permette di proporre un contratto esistente verificato, nel rispetto della quota minima 1,08 e della policy senza X secca; non equivale a PASS statistico. `qualifiedSelection` rimane falso, probabilità prudenziale ed EV rimangono N/D. Le doppie chance sommano gli esiti disgiunti della stessa distribuzione; non si ricava una matrice di punteggi dal rating.

I risultati esatti precedenti non vengono presentati come previsioni del nuovo 1X2. Gol attesi e volumi rimangono stime separate con formule invariate. La UI espone distribuzione 1X2, stato preliminare e casi N/D, senza sezioni pubbliche dedicate alle fonti. Il precedente Scenario e i mercati di esito sono conservati nell'archivio tecnico per le fixture aggiornate.

Per applicare soltanto il nuovo esito agli artefatti esistenti, preservando gli altri mercati: `node scripts/apply-champions-european-results.cjs`, poi build di presentazione Champions MD4. I builder MD4 e dello Scenario chiamano automaticamente lo stesso adattatore per le fixture di loro competenza; il builder MD4 riallinea anche il catalogo Schedina. MyCombo rimane N/D in assenza di distribuzione congiunta validata. Le selezioni personali conservano il contratto scelto e riconciliano le probabilità con quelle nuove, senza sostituire una puntata personale con un'altra.

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
