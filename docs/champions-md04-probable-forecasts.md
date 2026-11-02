# Champions MD4: pronostici con probabili canoniche

Il builder `scripts/build-champions-md04.cjs` pubblica soltanto le fixture future e non iniziate della quarta giornata per cui `data/sources/champions-probable-formations-md04-2026-27.json` contiene entrambi gli undici probabili. L'acquisizione del 2 novembre copre le nove gare di martedì 3 novembre; le nove gare di mercoledì non ricevono nuove selezioni.

## Catena

Rose registrate, database giocatori e storici già verificati vengono uniti per ID canonico e ID provider, senza modificare le rose globali o i database MD3. L'alias squadra `bod-glimt` viene ricondotto a `bodo-glimt` con la normalizzazione esistente. I correttivi di identità già documentati sono applicati soltanto in memoria.

Gli undici canonici entrano nell'adattatore `champions/shared-scenario.cjs`, che richiama il motore condiviso Serie A con formule e pesi invariati. La modifica non applica formazioni a fixture diverse. Le altre fixture della proiezione `data/generated/champions-shared-scenarios.json` restano identiche.

Le proiezioni individuali riusano `rateCandidate`, le osservazioni riconciliate esistenti, il contesto degli avversari già verificato per squadra e giocatore, `estimateExpectedMinutes`, il budget di 990 minuti e `projectMd3Team`. Il timestamp di build non aggiorna artificialmente la freschezza statistica: il dataset individuale registra separatamente le evidenze utilizzate e il loro cutoff. I dati insufficienti e le squadre con soli dati collettivi restano N/D. La rosa non citata è panchina provvisoria; indisponibili, squalificati e dubbi restano separati. La panchina partecipa alla ripartizione dei volumi, senza diventare eleggibile per mercati dei titolari.

La Schedina riusa l'integrazione delle selezioni e la policy di pubblicazione esistenti. Le identità Sisal derivano dall'archivio verificato, senza associazioni approssimative dei nomi. Il matching richiede fixture, provider player ID, codice mercato, soglia e selezione univoci. I DUO restano giocatore più sostituto, con tutti i modificatori del contratto, inclusi pali/traverse e supplementari quando previsti. I contratti non riconciliati restano esclusi e conservati nell'archivio tecnico. Non si creano mercati individuali senza quota al loro posto.

Le selezioni sono preliminari: la validazione del precedente modello Champions non viene trasferita al nuovo input/modello. Probabilità, quota equa, probabilità prudente ed EV DUO restano `null`; la probabilità individuale è un riferimento separato, mai applicato al DUO. MyCombo non riceve una probabilità congiunta inventata o un'approvazione automatica.

La quota minima pubblica Champions è **1,08 inclusiva**, per tutte le giornate. La policy condivisa esclude le quote inferiori da Letture, Schedina, MyCombo e schedina personale, incluse le selezioni salvate. I contratti e le quote originali restano negli archivi. Per riapplicare soltanto la soglia MD4 senza ricalcolare le previsioni: `node scripts/build-champions-md04.cjs --public-odds-only`.

## Comandi e verifiche

```text
node scripts/build-champions-md04.cjs
node scripts/test-champions-md04.cjs
node scripts/test-champions-shared-scenarios.cjs
node scripts/build-site.js --presentation-only --champions-pages-only --matchday 4
node scripts/check-champions-md04-browser.cjs
```

Il builder scrive tre dataset normalizzati MD4, aggiorna soltanto gli Scenari delle fixture coperte e conserva esclusioni ed evidenze interne. Il build di presentazione aggiorna soltanto le shell Champions/Schedina e l'indice Schedina. Nessuno di questi comandi esegue commit, push, deploy o liquidazioni.

Il test dei contratti verifica undici, copertura delle rose, budget minuti, riconciliazione dei volumi, quote e ID esatti, semantica DUO, assenza di approvazioni improprie e invarianza degli input protetti. Il test browser verifica le nove Letture e la Schedina a 1440/390 pixel, persistenza della selezione DUO e sincronizzazione tra pagine, assenza di nuove selezioni per mercoledì e regressione MD3. Evidenze in `output/champions-md04/`.

Formazioni ufficiali successive richiedono la pipeline ufficiale e il registro titolari; questo builder rifiuta fixture già iniziate o concluse e non certifica le probabili come ufficiali.
