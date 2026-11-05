# Champions MD4: completamento risultati del 4 novembre

Acquisiti i nove referti ESPN con eventi conclusi e riconciliazione esatta dei due team tramite ID provider. Evidenze e URL in `data/raw/champions-results/2026-11-05/`; risultati canonici in `data/sources/champions-results-md04-2026-27.json`.

| Partita | Finale |
|---|---|
| AEK Athens – Real Madrid | 2–3 |
| Fenerbahçe – Liverpool | 3–2 |
| Borussia Dortmund – Real Betis | 2–1 |
| Porto – Napoli | 4–1 |
| PSV Eindhoven – Club Brugge | 1–2 |
| Leipzig – Manchester City | 2–3 |
| Lens – Como | 1–9 |
| Slavia Praha – Arsenal | 1–2 |
| Viking – Sabah | 4–1 |

La giornata è completa: 18/18 gare; 72 gare concluse nella competizione. Calendario e classifica consumano gli esiti aggiornati. Le 278 selezioni operative pubblicate hanno 158 esiti positivi e 120 negativi: verifica statistica dei contratti originali, non liquidazione certificata. Nessuna selezione retroattiva o modifica a quote, soglie, previsioni, formule o pesi. Viking–Sabah resta priva di selezioni pubblicate.

L'importatore riutilizza l'adattatore statistico e il motore di verifica esistenti. Giocatori riconciliati tramite ID esatti; DUO con sostituto effettivo. Pali/traverse sono valorizzati solo quando gli eventi di tiro si riconciliano con i totali individuali. Minuti stimati sul tempo regolamentare, recupero escluso. Aggiornato il solo aggregato Champions delle squadre interessate mediante le funzioni canoniche; conservate le voci domestiche di tutti i 1.003 giocatori e integralmente i nove referti del martedì.

Nessuna nuova formazione ufficiale acquisita: registro e selezioni operative esistenti conservati. Il filtro definitivo non viene ricostruito da risultati o nomi approssimativi. Fonti e dati tecnici restano interni.

## Verifiche

- `test-champions-md04.cjs`: 18 fixture, 278 suggerimenti, 139 DUO, contratti esatti e sincronizzati.
- Build `--presentation-only --champions-pages-only --matchday 4`: completato, aggiornamento cache delle shell Champions/Schedina.
- `check-champions-md04-results.cjs`: desktop 1440 px e mobile 390 px, stati corretti, link Letture accessibili dalla giornata archiviata, inserimento di nuove giocate disabilitato sulle gare concluse, nessun overflow o errore JavaScript.
- Confronto con HEAD: nove referti precedenti invariati e voci domestiche di 1.003 giocatori conservate.
- `git diff --check`: superato.

Screenshot e riepilogo browser in `output/champions-md04-results/`. Nessun commit, push o deploy; lavoro preesistente sul confronto europeo conservato.
