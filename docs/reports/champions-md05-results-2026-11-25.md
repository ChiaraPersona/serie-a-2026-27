# Champions MD5: risultati del 24 novembre 2026

Acquisiti nove referti conclusi con corrispondenza esatta degli ID squadra ESPN e del calendario canonico. Manifest e referti compressi: `data/raw/champions-results/2026-11-25/`. Risultati: `data/sources/champions-results-md05-2026-27.json`.

Aggiornati calendario (81 gare concluse), classifica, referti, evidenze individuali e aggregati Champions delle squadre interessate. Conservate le voci domestiche; gli aggregati includono anche le evidenze canoniche delle giornate precedenti. Minuti stimati sul tempo regolamentare. Nessuna nuova formazione prepartita, selezione retroattiva o modifica a quote, soglie, formule e pesi.

Le 139 selezioni suggerite delle nove gare hanno 58 esiti positivi, 79 negativi e 2 da verificare. Verifica statistica dei contratti, non liquidazione certificata. I nove incontri del 25 novembre restano scheduled. Fonti e referti conservati internamente.

Verifiche:
- `test-champions-md04.cjs --matchday 5`: superato (18 fixture, 268 suggerimenti, contratti esatti).
- Build `--presentation-only --champions-pages-only --matchday 5`: completato.
- `check-champions-md05-results.cjs`: desktop 1440 e mobile 390; esiti Schedina corrispondenti ai referti; Letture concluse accessibili, nuove giocate disabilitate, nessun overflow o errore JavaScript.
- `git diff --check`: superato.

Evidenze UI: `output/champions-md05-results/report.json` e screenshot nella stessa cartella. Nessun commit, push o deploy.
