# Champions MD4: pronostici con probabili canoniche

Il builder `scripts/build-champions-md04.cjs` pubblica soltanto le fixture future e non iniziate della quarta giornata per cui `data/sources/champions-probable-formations-md04-2026-27.json` contiene entrambi gli undici probabili. Le acquisizioni utente coprono le 18 gare del 3–4 novembre. Il 3 novembre sono stati aggiunti i 198 titolari probabili delle nove gare di mercoledì, preservando le proiezioni e i contratti di martedì. Viking–Sabah conserva gli undici ma non pubblica selezioni: il campione statistico del Sabah è insufficiente. Rota resta titolare probabile con dubbio medico separato.

## Catena

Dal 4 novembre 2026, l'esito delle sole fixture future viene aggiornato dal rating europeo dopo l'integrazione tecnica condivisa: `scripts/champions/european-result-policy.cjs`. La policy interna registra l'autorizzazione esplicita alla pubblicazione preliminare, mantenendo falsa l'approvazione statistica. I risultati esatti del precedente Poisson non sono trasferiti al rating. Gol, volumi e mercati individuali continuano a usare i calcoli già esistenti e restano separati dall'1X2. Lens–Como e Viking–Sabah hanno esito N/D per meno di sei precedenti europei di almeno una squadra. Le gare concluse del 3 novembre non cambiano.

Rose registrate, database giocatori e storici già verificati vengono uniti per ID canonico e ID provider, senza modificare le rose globali o i database MD3. L'alias squadra `bod-glimt` viene ricondotto a `bodo-glimt` con la normalizzazione esistente. I correttivi di identità già documentati sono applicati soltanto in memoria.

Gli undici canonici entrano nell'adattatore `champions/shared-scenario.cjs`, che richiama il motore condiviso Serie A con formule e pesi invariati. La modifica non applica formazioni a fixture diverse. Le altre fixture della proiezione `data/generated/champions-shared-scenarios.json` restano identiche.

Le proiezioni individuali riusano `rateCandidate`, le osservazioni riconciliate esistenti, il contesto degli avversari già verificato per squadra e giocatore, `estimateExpectedMinutes`, il budget di 990 minuti e `projectMd3Team`. Il timestamp di build non aggiorna artificialmente la freschezza statistica: il dataset individuale registra separatamente le evidenze utilizzate e il loro cutoff. I dati insufficienti e le squadre con soli dati collettivi restano N/D. La rosa non citata è panchina provvisoria; indisponibili, squalificati e dubbi restano separati. La panchina partecipa alla ripartizione dei volumi, senza diventare eleggibile per mercati dei titolari.

La Schedina riusa l'integrazione delle selezioni e la policy di pubblicazione esistenti. Le identità Sisal derivano dall'archivio verificato, senza associazioni approssimative dei nomi. Il matching richiede fixture, provider player ID, codice mercato, soglia e selezione univoci. I DUO restano giocatore più sostituto, con tutti i modificatori del contratto, inclusi pali/traverse e supplementari quando previsti. I contratti non riconciliati restano esclusi e conservati nell'archivio tecnico. Non si creano mercati individuali senza quota al loro posto.

Le selezioni sono preliminari: la validazione del precedente modello Champions non viene trasferita al nuovo input/modello. Probabilità, quota equa, probabilità prudente ed EV DUO restano `null`; la probabilità individuale è un riferimento separato, mai applicato al DUO. MyCombo non riceve una probabilità congiunta inventata o un'approvazione automatica.

La quota minima pubblica Champions è **1,08 inclusiva**, per tutte le giornate. La policy condivisa esclude le quote inferiori da Letture, Schedina, MyCombo e schedina personale, incluse le selezioni salvate. I contratti e le quote originali restano negli archivi. Per riapplicare soltanto la soglia MD4 senza ricalcolare le previsioni: `node scripts/build-champions-md04.cjs --public-odds-only`.

La X secca è esclusa dagli esiti proposti. Se il precedente esito era X, `champions/result-preference.cjs` valuta i contratti 1, 2, 1X e X2 già quotati con il ranking preliminare e le soglie di sostegno sportivo esistenti; seleziona una sola alternativa ammessa, oppure nessuna. Non modifica probabilità, formule o quote e non trasferisce la probabilità della X a un altro contratto. Le alternative restano preliminari. La policy condivisa esclude la X secca anche dalle selezioni personali salvate; la distribuzione 1-X-2 e i risultati previsti dell'analisi restano intatti. Per applicare la preferenza senza ricalcolare il modello: `node scripts/build-champions-md04.cjs --result-policy-only`. Test: `node scripts/test-champions-no-draw.mjs`.

## Comandi e verifiche

Il catalogo CL4 trasforma le proiezioni già calcolate in mercati Over di tiri totali, tiri in porta e corner, per squadra e partita. Su richiesta esplicita dell'utente del 3 novembre vengono pubblicate probabilità preliminari, chiaramente indicate, mediante `probabilities`, `dispersionSize` e `overProbability` del modello discreto condiviso Serie A, senza cambiare le formule. Le medie sono quelle delle proiezioni canoniche; la dispersione usa osservazioni Champions precedenti alla data della gara e acquisite entro il cutoff. Il criterio condiviso `compareThresholdBalance` sceglie una sola soglia già quotata per metrica e soggetto, usando la probabilità centrale poiché manca una calibrazione prudenziale Champions. Restano la quota minima 1,08, i contratti esatti e il supporto sportivo minimo condiviso. Nessun PASS di validazione o approvazione statistica viene trasferito dalla Serie A; probabilità prudenziale, EV ed EV conservativo restano N/D. I contratti DUO rimangono invariati.

Le sezioni “Altri mercati disponibili” e “Previsioni di squadra e partita” sono rimosse dalle schedine; i nuovi mercati compaiono nelle righe ordinarie condivise con Lettura e schedina personale. I contratti manuali precedenti restano nell'archivio tecnico `data/technical-archive/champions-md04/manual-team-volume-markets.json`. Nessuna nuova selezione viene inserita nelle gare già iniziate. `--fixtures` nel builder restringe anche questo adattatore alle sole fixture richieste.

Per trasformare le proiezioni esistenti senza ricalcolarle: `node scripts/champions/md04-team-volume-markets.cjs`. Verifiche specifiche: `node scripts/test-champions-md04-count-markets.cjs`; controlli desktop/mobile in `output/champions-md04/count-markets/browser/`.

```text
node scripts/import-champions-md04-probable.cjs --date 2026-11-04 --input data/sources/lineups/champions-md04-wednesday-user-2026-11-03.txt --write
node scripts/build-champions-md04.cjs --date 2026-11-04
node scripts/test-champions-md04.cjs
node scripts/test-champions-shared-scenarios.cjs
node scripts/build-site.js --presentation-only --champions-pages-only --matchday 4
node scripts/check-champions-md04-browser.cjs
```

Il builder scrive tre dataset normalizzati MD4, aggiorna soltanto gli Scenari delle fixture coperte e conserva esclusioni ed evidenze interne. Il build di presentazione aggiorna soltanto le shell Champions/Schedina e l'indice Schedina. Nessuno di questi comandi esegue commit, push, deploy o liquidazioni.

Il test dei contratti verifica undici, copertura delle rose, budget minuti, riconciliazione dei volumi, quote e ID esatti, semantica DUO, assenza di approvazioni improprie e invarianza degli input protetti. Il test browser verifica le 18 Letture e la Schedina a 1440/390 pixel, persistenza della selezione DUO e sincronizzazione tra pagine, formazioni probabili di mercoledì e regressione MD3. Evidenze in `output/champions-md04/`.

Formazioni ufficiali successive richiedono la pipeline ufficiale e il registro titolari; questo builder rifiuta fixture già iniziate o concluse e non certifica le probabili come ufficiali.
