# Torino–Monza: chiusura del 24 ottobre 2026

Ambito: esclusivamente `torino-monza-2026-27-md-08`, giocata il 23 ottobre. Finale **3–2**, intervallo **1–0**. Nel calendario stagionale risultano 71 gare concluse; le altre nove fixture MD8 restano programmate.

## Acquisizione e conservazione

Importazione con `parseStatmuseGame` e `importStatmuseResult` da `https://www.statmuse.com/fc/match/-112153`, verificata contro i resoconti ufficiali:

- https://www.legaseriea.it/serie-a/news/torino-monza-2026-2027-3-2-cronaca-risultato-gol
- https://www.torinofc.it/news/23/10/2026/torino-monza-3-2_45431
- https://www.acmonza.com/it/news/torino-monza-23102026-report/

Referto scaricato in `tmp/md08-112153.html`; hash nel baseline interno. Sono acquisiti 32 impiegati, 22 titolari confermati rispetto agli undici canonici prepartita, 10 sostituzioni e il giallo a Ismajli. Tiri 17–7, SOT 7–3, corner 3–4, falli 8–4. I pali/traverse individuali provengono dal referto strutturato e sono riconciliati ai totali. L'identità della voce di panchina Pietro Pellegri resta `null`; non sono stati introdotti alias approssimativi. MVP ufficiale, pubblico e dati assenti restano N/D.

Le cronache ufficiali contengono minuti discordanti o refusi; si mantiene l'orologio strutturato. L'autogol di Patterson è registrato al 94', con recupero e orologio originale separati, e conserva la convenzione canonica `team` = squadra del giocatore autore dell'autogol. Nessun gol individuale viene attribuito a Patterson.

## Catena eseguita

`scripts/update-results-torino-monza-md08.cjs` aggiorna le fonti risultati/overlay, quindi esegue `import-official-calendar.js`. `scripts/build-torino-monza-md08-postmatch.cjs` usa il builder squadre/leaderboard e l'archivio arbitri esistenti, conserva i record dei club estranei e le formazioni prepartita, esegue il filtro ufficiale e `build-site.js --presentation-only --matchday 8`.

Aggiornati aggregati Torino e Monza, leaderboard giocatori, archivio informativo dell'arbitro canonico Andrea Zanotti, indice generale e proiezioni MD8. Le proiezioni delle altre nove fixture riportano soltanto l'elenco globale aggiornato delle gare concluse; i contratti operativi restano identici. Il campione arbitrale della lettura prepartita non include la gara stessa.

La fonte normalizzata contiene `resultCoverage.teamMarketSubjects: canonical`: abilita il riconoscimento del soggetto squadra dei contratti già pubblicati per questo referto verificato. Prima, i mercati `U/O TIRI ... SQUADRA` senza la variante testuale `SQUADRA X` ricadevano sul totale partita. La correzione usa gli ID canonici del contratto, fallisce su identità/statistiche assenti e non cambia soglie o formule. I referti precedenti mantengono la loro interpretazione: una correzione generale degli archivi richiede un intervento distinto. Il problema analogo è presente in sei valutazioni senza quota MD7, documentato senza modificarle.

La Lettura MD8 conclusa collega la Schedina risultati esistente. Il tabellino completo resta consultabile nella vista precedente; nessuna nuova sezione di provenienza pubblica. L'interfaccia preserva i limiti e lo stato ufficiale.

## Esiti sul catalogo pubblicato

| Ambito | Esiti | Corretti | Errati | Con quota | Senza quota |
|---|---:|---:|---:|---:|---:|
| Catalogo operativo prima della chiusura | 24 | 9 | 15 | 20 | 4 |
| Catalogo suggerito salvato prima dell'integrazione ufficiale | 24 | 9 | 15 | 20 | 4 |

I quattro pronostici senza quota sono verificati solo statisticamente: due corretti e due errati. Con puntata teorica uniforme di 1 euro sui 20 contratti quotati: puntato 20,00 euro, ritorno 10,38 euro, netto −9,62 euro, ROI −48,10%. Sono risultati teorici del catalogo; non costituiscono rendimento della schedina personale né liquidazione certificata del bookmaker. Nessuna nuova selezione o sostituzione retroattiva.

## Verifica

Passati:

- `node --experimental-require-module scripts/test-torino-monza-md08-postmatch.mjs`: importazione e riconciliazioni, hash previsioni/quote/cataloghi/fonti ufficiali, tutte le altre 379 fixture invariate, club estranei invariati, nessuna modifica a 3.485 valutazioni storiche, persistenza selezione già salvata, identità sconosciute N/D.
- `node --experimental-require-module scripts/test-reading-browser-data.mjs`: tutte le 380 fixture, referti, proiezioni e contratti condivisi.
- `node --experimental-require-module scripts/test-torino-monza-md08-official.mjs`: 22 titolari, 28 voci in panchina, esclusioni operative, quote e DUO, selezioni di non titolari già salvate.
- `node scripts/test-personal-betslip.mjs` e `node scripts/test-betting-selection-contract.js`.
- `node scripts/check-torino-monza-md08-postmatch.cjs`: Edge 1440/390, 24 righe risultati, 9 vinte/15 perse, selezioni concluse disabilitate, altre gare selezionabili, persistenza, navigazione Lettura → Schedina, 32 impiegati nel tabellino, fonti nascoste, nessun overflow o errore JavaScript.
- `git diff --check`.

Quattro suite generali eseguite presentano aspettative preesistenti incompatibili con il repository corrente:

- `test-score-market-evaluation.js`: cerca una quota corrente di Cagliari–Juventus MD6 non più nello snapshot quote; input previsioni/quote/catalogo MD6 identici a HEAD.
- `test-schedina-loading.mjs`: attende 10 card archivio; sia HEAD sia il risultato attuale ne contengono 11.
- `test-schedina-md06-results.mjs`: il vecchio mock non fornisce `loadGenerated` richiesto dal renderer dell'indice già presente in HEAD. Le asserzioni sui risultati MD6 precedenti alla chiamata dell'indice sono passate.
- `test-schedina-md07.mjs`: pretende che le quote archiviate MD7 abbiano la data dello snapshot corrente MD8; entrambi i file sono invariati rispetto a HEAD.

Il primo avvio Edge nella sandbox è fallito per restrizioni ambientali; la verifica è poi passata fuori sandbox con autorizzazione. Un errore Windows `UNKNOWN` di sovrascrittura dell'archivio arbitrale è stato risolto ricreando la destinazione con copia di recupero, senza modificare il builder condiviso.

Evidenze e screenshot: `output/torino-monza-md08-postmatch/data-audit.json`, `browser-audit.json`, `import-report.json`, `baseline.json` e PNG desktop/mobile nella stessa cartella. Nessun commit, push o deploy.
