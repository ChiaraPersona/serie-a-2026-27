# Mappa operativa per Codex

Consultazione interna, verificata il 23 ottobre 2026. Percorsi relativi alla radice Git. Mappa di orientamento, non sequenza da eseguire integralmente: scegliere competizione, giornata e fixture richieste e verificare gli argomenti dello script corrente. Tutte le regole di AGENTS.md restano applicabili.

| Attività | Fonte canonica / input | Builder | Output principale | Renderer / consumatore | Test pertinente da ispezionare |
|---|---|---|---|---|---|
| Letture Serie A | `data/sources/readings/`, calendario `data/normalized/matches.json`, rose `data/teams/index.json`, quote normalizzate Sisal | `scripts/build-readings.js`; per previsioni `scripts/build-predictions.js` | `data/normalized/readings.json`, `predictions.json` | `js/pages/readings.js`, `js/pages/reading-detail/` | `scripts/test-predictions.js`, `scripts/test-reading-browser-data.mjs` |
| Aggiornamento giornata / Schedina Serie A | Calendario, letture, profili e quote `data/normalized/odds/sisal/serie-a.json` | Piano in `scripts/update-matchday.cjs --competition serie-a --matchday N`; include `scripts/build-betting-matchday.js` | `data/normalized/schedina*.json` secondo giornata; catena e modalità dal piano | `js/pages/betting.js`, `js/services/data-service.js` | `scripts/test-schedina-loading.mjs`; suite specifica della giornata in `package.json` |
| Champions MD2 | `data/sources/champions-official-formations-md02-2026-27.json`, probabili omologhe, calendario, rose, statistiche e quote elencati in `paths` dell'integratore | `scripts/build-champions-md02-integration.js`, `scripts/build-champions-md02-schedina.js` | `data/normalized/champions-md02-integration-2026-27.json`, `schedina-champions-md02.json` | `js/pages/champions.js`, dettaglio Lettura e Schedina | `scripts/test-champions-md02-integration.js`, `scripts/test-champions-md02-browser-data.mjs` |
| Champions MD3 | Fonti ufficiali/probabili della giornata in `data/sources/`, rose, statistiche interne e quote normalizzate | Piano `scripts/update-matchday.cjs --competition champions --matchday 3`: database → probabili → offline → preliminari → approvati → validazione → catalogo | `data/normalized/champions-md03-player-database-2026-27.json`, `schedina-champions-md03.json` e intermedi indicati dagli script | `js/pages/champions.js`, dettaglio Lettura e Schedina | `scripts/test-champions-md3-browser-data.mjs`; verifiche della fixture interessata |
| Filtro titolari ufficiali | File `official-lineups*.json` e `official-formations*.json` in `data/sources/`; integrazione MD2 per risoluzione identità | `scripts/apply-official-starter-policy.js`, poi build sito richiesto da AGENTS.md | `data/normalized/official-starter-registry.json`, selezioni filtrate, `data/technical-archive/official-nonstarter-markets.json` | `js/official-starter-policy.js`, servizio dati, BetSelection, MyCombo | Verificare esclusioni e selezioni salvate; suite pertinente alla competizione, desktop/mobile |
| Proiezioni UI e shell | Archivi normalizzati e generati già esistenti; nessuna proiezione sostituisce la fonte canonica | `scripts/build-reading-browser-data.cjs`, `scripts/build-champions-md02-browser-data.cjs`, `scripts/build-champions-md3-browser-data.mjs`, `scripts/build-schedina-browser-data.mjs`; shell con `scripts/build-site.js` | `data/generated/readings/`, `champions-md02-ui-2026-27.json`, `schedina-champions-md03-ui.json` in `data/normalized/`, indice Schedina e HTML | `js/services/data-service.js` e viste interessate | `test-reading-browser-data.mjs`, `test-champions-md02-browser-data.mjs`, `test-champions-md3-browser-data.mjs`, `test-schedina-loading.mjs` in `scripts/` |
| Ricerca statistica | Input e manifest indicati nei runner; protocolli `docs/card-prediction-research-c0-c4.md`, `docs/exact-score-research-framework.md` | `scripts/research/cards/run.js`, `scripts/research/exact-score/run.js` | `data/analysis/card-prediction-research/`, `data/analysis/exact-score-research/` e report tecnici | Report interni; nessuna promozione automatica | Suite dedicate richiamate dai runner; hash di integrità e isolamento |

## Consultazione economica

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
| Stesso orchestratore con `--stage --output output/<cartella-nuova>` | Crea staging, copie e junction, esegue builder e scrive `generation-report.json`; nessuna promozione automatica. |
| `npm test` | Esegue `scripts/run-test-suite.cjs`; scrive `output/test-suite/latest.json` con output completi e stampa un riepilogo. Ispezionare i test figli per ulteriori effetti. |
| `npm run test:champions-branding`, `test:champions-squads`, `test:champions-markets`, `test:champions-motivation` | Gli alias includono builder: possono rigenerare dataset prima dei controlli. |
| Test browser, per esempio `npm run test:schedina:loading:browser` | Eseguono il browser e scrivono evidenze/report; verificare destinazioni e baseline nello script. |
| `node scripts/build-site.js --presentation-only` e alias `npm run build` / `build:readings` | Scrivono shell e proiezioni delle pagine incluse; possono eliminare shell ritirate. Non sono comandi di consultazione. I flag di pagina restringono il lavoro ma non li rendono in sola lettura. |
| Builder di proiezioni, filtro titolari, importatori, runner di ricerca | Generano o aggiornano file; gli importatori possono anche acquisire dati esterni. Ricerca isolata dalla produzione non significa assenza di scritture. |

Questa mappa non autorizza esecuzioni: per un audit senza modifiche limitarsi alla consultazione. Per aggiornamenti autorizzati preservare la catena canonica e tutti i controlli richiesti, incluso il build dopo nuove formazioni ufficiali.
