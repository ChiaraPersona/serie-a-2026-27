# Rimozione sezioni pubbliche (22 ottobre 2026)

Rimosse le pagine Fantacalcio, Fonti e Arbitri, le route e i renderer autonomi, il configuratore rosa e il relativo CSS. `build-site.js` elimina i vecchi shell in ogni modalità e non li rigenera. Rimossi anche i renderer arbitrali pilot/storici non richiamati da Lettura. Il test `scripts/test-retired-sections.cjs` controlla pagine, collegamenti, asset e route ritirate.

Dipendenze conservate dopo verifica:

- `data/sources/fantacalcio-quotations-2026-27.json` alimenta `scripts/team-pages/build.js`: identità, ruoli e rose delle squadre. Conservati importatori e archivi interni Fantacalcio.
- `scripts/build-team-referee-profiles.js` usa anagrafica e aggregati ESPN per i profili arbitro/squadra condivisi. Conservati `scripts/referee-stats`, dataset e validazioni interne.
- `scripts/build-reading-referee-history.js`, `scripts/build-reading-referee-profiles.js` e i moduli `js/pages/reading-detail` restano necessari al pannello arbitrale delle Letture. Conservati anche designazioni e profili Champions.
- Motori previsionali, soglie, quote, contratti, store Schedina e MyCombo non sono stati modificati per questa rimozione.
- `js/public-presentation.js` resta la policy condivisa. Fonti, URL, metadati e documentazione interna restano disponibili.

Verifiche locali: build di presentazione; 197 file di fonti/dati operativi/arbitrali confrontati via SHA-256 senza differenze (`integrity.json`); 8 viste Edge a 1440/390 px su Home, Lettura e Schedina senza errori runtime e senza link/asset ritirati (`browser.json`). Il controllo comprende apertura menu mobile. Screenshot nella stessa cartella.

La suite generale è riportata in `output/test-suite/latest.json`. Durante il lavoro sono intervenuti cambiamenti concorrenti al caricamento delle Letture e a Git, preservati senza ripristini. Nessun comando commit, push o deploy è stato eseguito da questa sessione.

Limiti della verifica generale: `test-app-modules` mantiene un'asserzione sul vecchio caricamento delle giornate; `team-pages/test` e `test-head-to-head-integration` richiedono il caricamento diretto di dati ora spostato nella proiezione Lettura concorrente; il controllo Champions MD3 segnala uno stato di fixture. `test-initial-render` segnala non-idempotenza dello shell Champions. Il precedente test browser MD7 attende un selettore di aggiunta personale non trovato; il nuovo controllo browser delle sezioni rimosse passa su tutte le otto viste. Queste anomalie non sono state corrette intervenendo su funzionalità estranee alla rimozione.
