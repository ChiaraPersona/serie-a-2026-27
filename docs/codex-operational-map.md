# Mappa operativa per Codex

Consultazione interna, verificata il 23 ottobre 2026. Percorsi relativi alla radice Git. Mappa di orientamento, non sequenza da eseguire integralmente: scegliere competizione, giornata e fixture richieste e verificare gli argomenti dello script corrente. Tutte le regole di AGENTS.md restano applicabili.

| Attività | Fonte canonica / input | Builder | Output principale | Renderer / consumatore | Test pertinente da ispezionare |
|---|---|---|---|---|---|
| Letture Serie A | `data/sources/readings/`, calendario `data/normalized/matches.json`, rose `data/teams/index.json`, quote normalizzate Sisal | `scripts/build-readings.js`; per previsioni `scripts/build-predictions.js` | `data/normalized/readings.json`, `predictions.json` | `js/pages/readings.js`, `js/pages/reading-detail/` | `scripts/test-predictions.js`, `scripts/test-reading-browser-data.mjs` |
| Scenario delle prossime Letture Champions | Statistiche canoniche `champions-pilot-match-stats-2025-27.json`, calendario/quote/profili normalizzati | `scripts/build-champions-shared-scenarios.cjs --matchday N` → `predictScenario` comune alla Serie A | `data/generated/champions-shared-scenarios.json` | Calendario Champions e shell condivisa; [limiti e comandi](champions-shared-scenario.md) | `scripts/test-champions-shared-scenarios.cjs`, `scripts/check-champions-shared-scenarios.cjs` |
| Ultimo undici Champions come riferimento provvisorio | Undici con ID canonici nei file ufficiali/probabili e date del calendario; precedenza delle formazioni specifiche della gara | `scripts/build-champions-lineup-references.cjs`, incluso nel build delle pagine Champions | `data/generated/champions-lineup-references.json`; sola proiezione, nessuna previsione o selezione | `reading-detail/champions-lineup-reference.mjs`, campo e giocatori con stato riferimento e data precedente | `scripts/test-champions-lineup-references.mjs`, `scripts/check-champions-reading-parity.cjs` |
| Aggiornamento giornata / Schedina Serie A | Calendario, letture, profili e quote `data/normalized/odds/sisal/serie-a.json` | Piano in `scripts/update-matchday.cjs --competition serie-a --matchday N`; include `scripts/build-betting-matchday.js` | `data/normalized/schedina*.json` secondo giornata; catena e modalità dal piano | `js/pages/betting.js`, `js/services/data-service.js` | `scripts/test-schedina-loading.mjs`; suite specifica della giornata in `package.json` |
| Champions MD2 | `data/sources/champions-official-formations-md02-2026-27.json`, probabili omologhe, calendario, rose, statistiche e quote elencati in `paths` dell'integratore | `scripts/build-champions-md02-integration.js`, `scripts/build-champions-md02-schedina.js` | `data/normalized/champions-md02-integration-2026-27.json`, `schedina-champions-md02.json` | `js/pages/champions.js`, dettaglio Lettura e Schedina | `scripts/test-champions-md02-integration.js`, `scripts/test-champions-md02-browser-data.mjs` |
| Champions MD3 | Fonti ufficiali/probabili della giornata in `data/sources/`, rose, statistiche interne e quote normalizzate | Piano `scripts/update-matchday.cjs --competition champions --matchday 3`: database → probabili → offline → preliminari → approvati → validazione → catalogo | `data/normalized/champions-md03-player-database-2026-27.json`, `schedina-champions-md03.json` e intermedi indicati dagli script | `js/pages/champions.js`, dettaglio Lettura e Schedina | `scripts/test-champions-md3-browser-data.mjs`; verifiche della fixture interessata |
| Champions MD4 con probabili | `data/sources/champions-probable-formations-md04-2026-27.json`, rose/storici verificati e quote Sisal; sole fixture con entrambi gli undici | `scripts/build-champions-md04.cjs`; [catena, limiti e controlli](champions-md04-probable-forecasts.md) | `champions-md04-player-database-2026-27.json`, `champions-md04-probable-individuals-2026-27.json`, `schedina-champions-md04.json` in `data/normalized/`; Scenari delle sole fixture coperte | Letture, `champions-workspace-catalog.mjs`, Schedina e schedina personale | `scripts/test-champions-md04.cjs`, `scripts/check-champions-md04-browser.cjs`; build `--presentation-only --champions-pages-only --matchday 4` |
| Champions MD5 con undici disponibili | `champions-official-formations-md05-2026-27.json` (prime due gare), probabili MD5 con riferimenti provvisori espliciti per le altre | `scripts/build-champions-md04.cjs --matchday 5`; `--official --fixtures` per aggiornamenti successivi | Dataset individuali/database MD5 e `schedina-champions-md05.json`; [limiti e verifiche](reports/champions-md05-lineups-and-schedina-2026-11-24.md) | Letture, Schedina, MyCombo e selezioni personali | `scripts/test-champions-md04.cjs --matchday 5`, `scripts/check-champions-md05-browser.cjs` |
| Filtro titolari ufficiali | File `official-lineups*.json` e `official-formations*.json` in `data/sources/`; integrazione MD2 per risoluzione identità | `scripts/apply-official-starter-policy.js`, poi build sito richiesto da AGENTS.md | `data/normalized/official-starter-registry.json`, selezioni filtrate, `data/technical-archive/official-nonstarter-markets.json` | `js/official-starter-policy.js`, servizio dati, BetSelection, MyCombo | Verificare esclusioni e selezioni salvate; suite pertinente alla competizione, desktop/mobile |
| Profili arbitri Champions MD5 | Designazioni MD5, registro identità, snapshot verificati; [limiti e comandi](reports/champions-md05-referees-2026-11-24.md) | `build-champions-md05-referees.cjs`, `complete-champions-md04-referee-history.cjs --matchday 5` in `scripts/` | Profili e storico MD5 normalizzati, `data/generated/reading-referee-history.json` | Pannello arbitro delle Letture; soli dati descrittivi | `scripts/test-champions-md05-referees.cjs`, `scripts/check-champions-md05-referees-browser.cjs` |
| Archivio quote Sisal | Indice `data/normalized/odds/sisal/serie-a.json` e file `serie-a-events/`; [formato e comandi](sisal-dataset-storage.md) | Lettura `readJsonFile` e scrittura `writeSisalDataset` da `scripts/sisal/dataset-store.cjs`; gli importatori usano questo modulo | Dataset completo in memoria, file su disco limitati a 8 MiB | Builder e normalizzatori; il sito usa le proiezioni esistenti | `scripts/sisal/test-dataset-store.cjs`, validazione Sisal, test identificativi e consumer |
| Proiezioni UI e shell | Archivi normalizzati e generati già esistenti; nessuna proiezione sostituisce la fonte canonica | `scripts/build-reading-browser-data.cjs`, `scripts/build-champions-md02-browser-data.cjs`, `scripts/build-champions-md3-browser-data.mjs`, `scripts/build-schedina-browser-data.mjs`; shell con `scripts/build-site.js` | `data/generated/readings/`, `champions-md02-ui-2026-27.json`, `schedina-champions-md03-ui.json` in `data/normalized/`, indice Schedina e HTML | `js/services/data-service.js` e viste interessate | `test-reading-browser-data.mjs`, `test-champions-md02-browser-data.mjs`, `test-champions-md3-browser-data.mjs`, `test-schedina-loading.mjs` in `scripts/` |
| Ricerca statistica | Input e manifest indicati nei runner; protocolli `docs/card-prediction-research-c0-c4.md`, `docs/exact-score-research-framework.md` | `scripts/research/cards/run.js`, `scripts/research/exact-score/run.js` | `data/analysis/card-prediction-research/`, `data/analysis/exact-score-research/` e report tecnici | Report interni; nessuna promozione automatica | Suite dedicate richiamate dai runner; hash di integrità e isolamento |
| Verifica prospettica territoriale | Dati territoriali/tecnici, previsione pubblicata e XI disponibili; [protocollo e comandi](spatial-prospective-validation.md) | `scripts/spatial-prospective/capture.cjs`, `evaluate.cjs`; acquisizione anche dal builder delle proiezioni Lettura con protocollo attivo | `data/predictions/spatial-prospective/`, `data/analysis/spatial-prospective/latest.json` | Solo ricerca; prima previsione valida immutabile, revisioni e astensioni separate; nessun cambio ai motori | `scripts/test-spatial-prospective.cjs` |

## Consultazione economica

Per Home, elenco Squadre e calendario della giornata in Schedina usare le
proiezioni descrittive di `scripts/build-home-browser-data.cjs`: `home-ui.json`
e `matches/mdNN.json` in `data/generated/`. Il build del sito le aggiorna dai
file canonici senza ricalcolare pronostici. Le partite per giornata conservano
tutti i campi originali necessari alle liquidazioni; la Home conserva i dati
delle classifiche Generale/Home/Away e delle schede squadra. Verificare con
`npm run test:browser:pages`. Il confronto di caricamento desktop/mobile è in
`scripts/check-page-performance.cjs` (`--before`, poi `--after`, a dati stabili).
I risultati sono locali in `output/page-performance/`; non misurano la rete reale.

### Archivi delle verifiche e staging

Gli snapshot voluminosi `before` / `baseline` in `output/` usano piccoli manifest
con blocchi GZIP condivisi in `data/technical-archive/output-snapshots/`.
I lettori interni che li consumano importano `scripts/output-snapshot-fs.cjs`
al posto di `node:fs`: il modulo restituisce gli esatti byte originali e verifica
gli hash. I dati canonici, i contratti e il formato pubblico rimangono invariati.
I nuovi writer di baseline devono usare lo stesso adattatore, anche per la
rinomina atomica dei file temporanei. Non cancellare blocchi soltanto perché
non sono referenziati da una singola baseline: possono essere condivisi.

`npm run storage:output:plan` elenca i candidati senza modificarli;
`storage:output:migrate` applica la migrazione e verifica ogni ricostruzione;
`storage:output:verify` verifica tutti gli hash registrati;
`storage:output:report` misura separatamente `output/`, archivio condiviso e
peso combinato. Gli snapshot con consumer Python non aggiornati sono conservati.
`storage:output:prune` elenca i blocchi non più referenziati dopo aver verificato
gli snapshot; `npm run storage:output:prune -- --write` rimuove esclusivamente
quei blocchi, controllando anche i manifest negli archivi tecnici e nei report.
I report delle verifiche di questa pulizia restano JSON leggibili e sono esclusi
dalla migrazione. Per gli audit, `statSync().size` indica i byte ricostruiti;
il comando `storage:output:report` usa invece le dimensioni effettive dei file.

Lo staging di `update-matchday.cjs` copia il codice e materializza solo gli
input effettivamente letti, tramite `scripts/staging-inputs.cjs`. Non ricopia
preventivamente tutti i dati o i vecchi report e non condivide directory dati
scrivibili con il checkout. `staging-inputs.json` registra gli input letti;
`generation-report.json` separa gli input dai file modificati. I builder e
i criteri di previsione restano gli stessi. La promozione rimane manuale.

Per la ricerca sulle coordinate nei calcoli individuali consultare [pipeline e limiti v2](player-spatial-validation.md): `scripts/research/player-spatial-v2/`, risultati `data/analysis/player-spatial-v2-2026-10-29/`, congelamenti `data/predictions/player-spatial-v2-prospective/`. Il builder Lettura acquisisce anche il confronto v2 soltanto con protocollo già attivo; non modifica previsioni operative o contratti DUO.

Prima localizzare con `rg --files scripts js docs`, poi usare `rg -n -m 8 --max-columns 240 'simbolo' percorso`. Per trovare solo file usare `rg -l`. Un risultato troncato richiede una ricerca più precisa o un'estrazione con parser, non ripetere lo stesso dump.

Nei JSON filtrare per ID canonici e selezionare campi, conteggi e pochi esempi; dichiarare eventuali omissioni rilevanti. Per orientarsi sulla UI usare `data/normalized/champions-md02-ui-2026-27.json`, i file per fixture in `data/generated/readings/` e `data/generated/head-to-head/first-leg-2026-27-summary.json`. Aprire gli archivi completi per i dettagli mancanti. Nessun limite rigido all'approfondimento.

## Effetti dei comandi

Classificazione verificata sul codice, senza eseguire generatori. Vale per le invocazioni indicate, senza redirezioni su file. Per comandi non elencati ispezionare anche moduli importati e sottoprocessi: il nome non basta.

| Comando | Effetti |
|---|---|
| `git status --short`, `git diff -- <file>`, `git rev-parse --show-toplevel` | Consultazione; nessuna modifica intenzionale ai file di progetto. |
| `rg --files`, `rg -l`, `rg -n`, `Get-Item`, `Get-ChildItem`, `Get-Content` | Sola lettura; restringere percorsi e contenuto restituito. |
| `node --check <script.js>` | Controllo sintattico senza eseguire lo script; non valida comportamento o dati. |
| `node scripts/update-matchday.cjs --competition serie-a --matchday 7` (oppure Champions con giornata supportata), senza `--stage` | Legge gli input necessari e stampa il piano; non lancia i builder. `--matchday` è obbligatorio anche passando dagli alias npm. |
| Stesso orchestratore con `--stage --output output/<cartella-nuova>` | Crea staging isolato e materializza gli input letti; esegue builder e scrive `staging-inputs.json` e `generation-report.json`; nessuna promozione automatica. |
| `npm test` | Esegue `scripts/run-test-suite.cjs`; scrive `output/test-suite/latest.json` con output completi e stampa un riepilogo. Ispezionare i test figli per ulteriori effetti. |
| `npm run test:champions-branding`, `test:champions-squads`, `test:champions-markets`, `test:champions-motivation` | Gli alias includono builder: possono rigenerare dataset prima dei controlli. |
| Test browser, per esempio `npm run test:schedina:loading:browser` | Eseguono il browser e scrivono evidenze/report; verificare destinazioni e baseline nello script. |
| `node scripts/build-site.js --presentation-only` e alias `npm run build` / `build:readings` | Scrivono shell e proiezioni delle pagine incluse; possono eliminare shell ritirate. Non sono comandi di consultazione. I flag di pagina restringono il lavoro ma non li rendono in sola lettura. |
| Builder di proiezioni, filtro titolari, importatori, runner di ricerca | Generano o aggiornano file; gli importatori possono anche acquisire dati esterni. Ricerca isolata dalla produzione non significa assenza di scritture. |
| Proiezioni Lettura con protocollo territoriale attivo | Congelano gli input prepartita ancora acquisibili e aggiornano l'analisi prospettica. Impostare `SPATIAL_CAPTURE_DISABLED=1` per staging o build diagnostici senza nuove acquisizioni. Nessuna rigenerazione dei pronostici. |

Questa mappa non autorizza esecuzioni: per un audit senza modifiche limitarsi alla consultazione. Per aggiornamenti autorizzati preservare la catena canonica e tutti i controlli richiesti, incluso il build dopo nuove formazioni ufficiali.
