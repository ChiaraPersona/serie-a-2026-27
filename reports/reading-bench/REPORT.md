# Panchinari nelle letture - report tecnico

Data: 18 ottobre 2026.

Integrazione attiva nel renderer condiviso Serie A/Champions e nel build del sito. La copertura previsionale resta parziale: i vincoli sui titolari e sui volumi squadra impediscono di attribuire nuovi contributi dove il modello ha gia distribuito tutto il volume. Non sono stati creati valori sostitutivi per riempire le celle.

## Copertura

I conteggi sono presenze nella panchina di una fixture, deduplicate all'interno della squadra, non persone distinte. Esaminati 416 fixture del calendario/dataset previsionale; 56 contengono panchine classificate ufficiali o probabili. Un giocatore riportato anche nei titolari resta soltanto titolare.

| Competizione | Panchinari analizzati | Con tiri e SOT | Con minuti e P(subentro) | Con statistiche storiche per 90 | Senza previsione tiri/SOT |
|---|---:|---:|---:|---:|---:|
| Serie A | 684 | 0 | 0 | 564 | 684 |
| Champions | 649 | 8 | 150 | 273 | 641 |
| Totale | 1333 | 8 | 150 | 837 | 1325 |

455 presenze non dispongono di alcuno dei valori visualizzati: tiri/SOT previsti, minuti previsti, minuti storici o rate storici tiri/SOT. Questo conteggio e distinto dai 1.325 casi senza previsione completa: molti di questi hanno comunque storico o minutaggio consultabile.

## Pipeline e significato dei valori

- La Serie A V2 seleziona i candidati dalla formazione titolare (`lineupPlayers`) e riconcilia i loro tiri/SOT sul volume squadra (`shooterCandidates`). `expectedMinutes` stima il minutaggio da titolare, con prior di ruolo e una componente storica che assume 22 minuti per subentro: applicarla ai panchinari produrrebbe esposizioni errate. Non esiste qui un modello approvato di probabilita di ingresso. Storico disponibile collegato, previsioni dei panchinari nulle. Non sono stati trasferiti coefficienti Champions.
- Champions: riuso di `estimateExpectedMinutes`, del campione cronologico di panchine nominate e ingressi esatti, di `rateForPlayer` e di `scaleShotProjections`. Almeno tre panchine e due ingressi osservati; priorita UEFA, poi fallback cross-competition gia previsto. Eventi e acquisizioni devono precedere il kickoff. Nessun nuovo prior o peso di ruolo.
- L'estensione necessaria e il vincolo di allocazione limitato alla panchina: titolari immutabili, massimo 900 minuti di movimento meno quelli gia assegnati ai dieci titolari di movimento; il portiere titolare mantiene i suoi minuti. Se gli undici o i loro minuti non sono completi, non viene ammesso un nuovo minutaggio. I portieri di riserva restano non valutabili per il subentro.
- P(subentro) conserva la frequenza osservata. Se il totale delle frequenze supera cinque ingressi, il gruppo resta non valutabile, senza correggere artificialmente le probabilita. Riferimento regolamentare verificato: [UEFA 2026/27, art. 56.02](https://documents.uefa.com/r/Regulations-of-the-UEFA-Champions-League-2026/27/Article-56-Player-replacements-and-substitutions-Online).
- I minuti medi comprendono la possibilita di non giocare: `P(subentro) * minuti se entra`. Se il budget residuo non basta, lo stesso vincolo proporzionale del modello esistente riduce la durata condizionata dei soli panchinari; il valore storico originale resta in `minutesEstimate`. La UI distingue i due minuti e la probabilita, senza nuove colonne o menu.
- Tiri/SOT ammessi soltanto con identita canonica, rate individuali osservati e minuti validi. La regolarizzazione per ruolo e quella Champions gia esistente. Il contesto dell'avversario entra attraverso i volumi della squadra; non e stato inventato un modello individuale di matchup per il subentrante. La somma aggiuntiva non supera il residuo del volume squadra. Residui entro 0,05 (errore massimo di arrotondamento dei dieci giocatori a 0,01) non costituiscono nuova capacita previsionale. SOT mai superiori ai tiri.
- Il modello Champions non produce probabilita evento dei subentranti: 1+ SOT e 2+ tiri restano null. Non e applicata una Poisson al solo valore medio di una miscela ingresso/non ingresso.
- Le ricostruzioni di incontri conclusi non diventano previsioni originali; nessuna nuova selezione, quota, modifica MyCombo/Schedina o sostituzione retroattiva. Archivi e snapshot originali invariati.
- Collegamenti solo tramite fixture, squadra e ID canonici. Nessuna ricerca approssimativa per nome. Il contratto confronta formazione, kickoff, proiezioni titolari e modello squadra: un artifact non piu compatibile viene rifiutato e le celle tornano a —. Il build rigenera l'artifact quando cambia un input; individua anche i futuri dataset Champions per giornata.

## Motivi dei dati mancanti

Le motivazioni sono anche registrate per ogni giocatore nel JSON interno. I gruppi possono sovrapporsi.

| Motivo tecnico | Presenze |
|---|---:|
| `serie-a-engine-has-no-bench-entry-model-and-allocates-full-volume-to-starters` | 653 |
| `unresolved-canonical-player-id` | 369 |
| `incomplete-starter-minute-budget` | 290 |
| `insufficient-named-bench-or-exact-entry-history` | 79 |
| `provider-player-id-unavailable` | 10 |
| `insufficient-observed-shot-rates` | 46 |
| `team-volume-already-allocated-to-starters` | 258 |
| `bench-entry-frequencies-exceed-five-substitutions` | 77 |

## Verifica e regressioni

- `node scripts/test-reading-bench-forecasts.mjs`: PASS, 416 fixture, 2.090 righe classificate titolari confrontate prima/dopo senza modifiche; nessuna duplicazione; relazione probabilita/minuti, budget residui, SOT <= tiri, null e rifiuto di contesti obsoleti verificati.
- `node scripts/check-reading-bench-forecasts.cjs`: PASS, 12 controlli (6 fixture a 1440 e 390 px), pulsanti e stato iniziale, ogni valore delle righe, dettagli minuti/P(subentro), assenza di overflow e dei quattro testi rimossi. Campioni: Milan-Atalanta MD7, Frosinone-Sassuolo MD7, Champions MD1-01 e MD2-05/10/18; formazioni ufficiali e probabili.
- `node scripts/test-reading-player-rosters.mjs`: PASS, 106 fixture, 2.332 titolari e 1.334 voci panchina grezze; la voce contemporaneamente titolare/panchina e deduplicata nella nuova copertura operativa.
- `node scripts/test-reading-detail-adapters.mjs`, `node scripts/test-reading-detail-internals.mjs`, `node scripts/test-reading-referee-history.mjs`: PASS.
- `node scripts/test-champions-substitute-forecasts.js`: PASS sul modello originale, 355/396 titolari e 173/289 subentranti nel suo distinto universo di ricerca; nessuna promozione automatica di quei ricalcoli nella UI.
- `node scripts/build-site.js --reading-pages-only`: rigenerate le due shell. `node scripts/build-reading-bench-forecasts.mjs --if-needed`: input invariati, nessuna rigenerazione superflua.
- Hash dei cinque artifact previsionali protetti identici prima/dopo in `coverage.json`: Serie A, Champions MD1/MD2, integrazione MD2, mercati individuali MD1. Formule, pesi, titolari, totali squadra e dati originari non riscritti.
- `git diff --check`: PASS. Nessun commit, push o deploy.

## File di questa integrazione

- `scripts/build-reading-bench-forecasts.mjs`: builder e conteggi.
- `scripts/readings/fixtures.mjs`, `bench-forecasts.mjs`, `bench-inputs.mjs`: lettura degli input, allocazione residua, impronta degli input.
- `scripts/champions/substitute-minutes.js`: esportazione della funzione rate gia esistente, senza cambi di calcolo.
- `js/pages/reading-detail/bench-contract.mjs`, `evidence.mjs`, `people.mjs`: contratto canonico, collegamento e visualizzazione; `shell.mjs`, `js/pages/readings.js`, `js/pages/champions.js`: versione delle dipendenze aggiornata.
- `scripts/build-site.js`: integrazione automatica del builder dopo le policy canoniche.
- `data/normalized/reading-bench-forecasts.json`: nuovo artifact separato dalle previsioni dei titolari.
- `lettura.html`, `champions-league.html`: shell generate.
- `scripts/test-reading-bench-forecasts.mjs`, `scripts/check-reading-bench-forecasts.cjs`: test dati e browser.
- `reports/reading-bench/coverage.json`, `tests.json`, `expected.json`, `browser.json`, `bench-1440.png`, `bench-390.png`: evidenze.

I file gia modificati dal lavoro precedente sulla comparsa dei panchinari e le modifiche concorrenti estranee (rimozione Motivation Index e relativi test) sono preservati; non sono parte di questa integrazione.
