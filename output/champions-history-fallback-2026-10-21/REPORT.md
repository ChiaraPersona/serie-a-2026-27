# Ricalcolo CL3 con storico 2025/26 - 21 ottobre 2026

Aggiornate le 9 fixture del 21 ottobre ancora da iniziare. Le 7 sovrapposizioni delle gare del 20 ottobre sono identiche alla copia precedente; le altre due gare di ieri restano nei cataloghi ufficiali originali. Quote, statistiche canoniche, schedine archiviate, CL1/CL2 e Serie A non sono state riscritte.

Il motore esistente usa gia lo storico 2025/26 quando non dispone di osservazioni correnti utilizzabili. Nel nuovo output 244 profili senza blocchi usano peso storico 1. Nessuna baseline numerica e cambiata rispetto alla precedente elaborazione: il recupero esplicito mantiene i criteri originali e non forza ammissioni. Il ricalcolo dei minuti con le evidenze interne disponibili rende calcolabili Jesper Daland e Nestory Irankunda fra i titolari; anche Yacine Titraoui e Tsuyoshi Watanabe fra le riserve, senza pubblicare soglie per le riserve.

938 soglie individuali calcolate, 30 pronostici individuali selezionati (anche prima erano 30, con composizione diversa per fixture). Sono pronostici preliminari senza quota del contratto esatto: nessuna nuova selezione operativa quotata e nessuna probabilita DUO inventata. Le schedine archiviate e i contratti salvati mantengono il loro significato; il catalogo corrente condiviso alimenta Lettura, Schedina e MyCombo.

Riproduzione:
- node scripts/build-champions-md3-probable.cjs --historical-fallback --output-file data/derived/champions-md03/<nuova-versione>.json
- node scripts/build-champions-upcoming-forecasts.cjs --individuals data/derived/champions-md03/<nuova-versione>.json
- node scripts/build-site.js --presentation-only --md3-pages-only

Verifiche: test-champions-history-refresh.mjs PASS (9 aggiornate, 7 preservate, filtro titolari e riconciliazione selezioni salvate); test-champions-md3-reconciliation-precision.cjs PASS; build sito PASS. Il test upcoming precedente presume che tutte le gare dell'overlay siano ancora future e fallisce sulle copie preservate di ieri. Il test selection-requirements presume il vecchio conteggio 1721, mentre il catalogo corrente ne contiene 568. Questi test generali non sono dichiarati superati. browser.json riporta separatamente i controlli desktop/mobile.

Nessun commit, push o deploy.
