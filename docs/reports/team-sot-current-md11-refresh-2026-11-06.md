# SOT correnti: aggiornamento operativo Serie A MD11

6 novembre 2026. Applicazione autorizzata dall'utente dopo l'audit della base SOT. Motore 4.15.0. Nessun commit, push o deploy.

## Modifica comune

`scripts/predictions/current-sot-volume.cjs` prepara, per ogni fixture futura Serie A, una base SOT con i soli referti canonici conclusi antecedenti alla giornata e alla data della fixture. Esclude sempre la fixture target. La regola si applica a tutte le squadre e non contiene eccezioni per nomi o club.

Produzione e concessioni della stagione corrente aggiornano lo storico Serie A per sede con peso n/(n+12). In assenza di uno storico comparabile, la prior e la distribuzione osservata della lega precedente con forza equivalente a quattro gare: la Serie B non viene equiparata direttamente alla Serie A e la precisione generica dell'undici non simula uno storico squadra. Le osservazioni correnti sono aggregate tra casa e trasferta; gli effetti di sede disponibili restano nello storico e nel contesto della gara. Questa regolarizzazione evita di trattare le quattro trasferte del Frosinone come una stima autonoma gia stabile.

Il mix conserva i pesi 45% produzione squadra, 35% concessioni avversarie, 20% ultime otto. Per i SOT queste ultime appartengono ora al 2026/27, con decadimento 0,82. Le componenti corrente generale e recente costituiscono una miscela esplicita di livello e recenza. Non vengono aggiunti nuovamente i vecchi correttivi SOT di produzione e concessione: le stesse informazioni sono gia nella base. Restano gli aggiustamenti esistenti di contesto e precisione dell'undici, con il riferimento storico di precisione preservato. La numerosita diagnostica conta le fixture correnti distinte invece di sommare nuovamente le ultime otto.

L'adattamento riguarda i SOT squadra e la conseguente riconciliazione dei SOT individuali. Tiri totali, corner, falli, cartellini, xG e 1X2 della giornata sono stati confrontati con il prima e risultano invariati. Le altre competizioni non ricevono automaticamente una base Serie A. Per le gare senza osservazioni correnti rimane il percorso precedente.

I pesi delle prior 12/4 e gli intervalli restano un adattamento operativo autorizzato con evidenza preliminare, non una calibrazione prospettica conclusa. L'audit precedente mostrava un miglioramento del 4,75% dell'errore della sola base su 50 fixture, con le limitazioni documentate in `team-sot-baseline-audit-2026-11-06.md`. Non si estende quel risultato al motore completo o alla redditivita delle selezioni.

## Ricalcolo delle venti squadre

Rigenerate le dieci fixture MD11 tramite i builder esistenti, conservando integralmente i pronostici delle giornate estranee. Rigenerati cataloghi Lettura/Schedina e proiezioni browser; build presentazione MD11 eseguito. Aggiornato anche il dataset dei profili matchup, rimasto a otto gare, alle dieci effettivamente disponibili: il builder dei pronostici gia ricostruiva il corretto snapshot in memoria.

| Squadra | SOT prima | SOT dopo |
| --- | ---: | ---: |
| Cagliari | 3,50 | 3,90 |
| Frosinone | 4,10 | 6,00 |
| Fiorentina | 3,80 | 4,70 |
| Juventus | 5,35 | 5,00 |
| Genoa | 3,80 | 4,00 |
| Milan | 4,10 | 4,30 |
| Inter | 5,80 | 5,80 |
| Como | 5,00 | 5,40 |
| Monza | 4,90 | 6,10 |
| Atalanta | 3,90 | 4,60 |
| Napoli | 5,00 | 5,00 |
| Lazio | 4,00 | 4,10 |
| Parma | 3,30 | 3,90 |
| Bologna | 3,66 | 3,90 |
| Roma | 5,44 | 5,60 |
| Sassuolo | 3,60 | 4,00 |
| Torino | 4,04 | 4,70 |
| Lecce | 3,60 | 5,20 |
| Venezia | 3,76 | 4,00 |
| Udinese | 3,94 | 4,20 |

## Selezioni e contratti

Il catalogo tecnico passa da 1.742 a 1.744 righe. Le selezioni operative condivise tra Letture e Schedina passano da 205 a 207: nove inserimenti e sette rimozioni, includendo cambi di soglia. Nessun criterio di ammissione e stato modificato. Sono state confrontate identita e quote di tutte le 1.735 righe comuni tra i cataloghi: invarianti. Le nuove righe quotate sono verificate dal test MD11 contro lo stesso market ID, selection ID, soglia e semantica del provider. I mercati individuali tiri/SOT rimangono contratti DUO con probabilita, quota equa ed EV N/D; nessuna probabilita individuale e stata trasferita al DUO.

Le selezioni per fixture prima/dopo, le aggiunte e le rimozioni sono in `data/analysis/team-sot-baseline-audit-2026-11-06/public-selections-refresh.json`. Le venti previsioni, le somme individuali e gli esiti dei controlli di isolamento sono in `operational-refresh.json` nella stessa directory. I dati prima del ricalcolo sono conservati in `output/sot-current-md11-2026-11-06/`.

## Verifiche

- `node scripts/test-current-sot-volume.cjs`: passato su tutte le squadre; cutoff, esclusione target, sensibilita ai risultati precedenti, mancanti non convertiti a zero, input immutati, conservazione degli altri volumi, assenza del secondo correttivo SOT. Il test sul doppio correttivo e fallito prima della modifica del motore ed e passato dopo.
- `node scripts/check-current-sot-refresh.cjs`: passato; isolamento delle altre fixture, xG/1X2 e altre statistiche invariati, SOT individuali coerenti con il totale squadra, SOT non superiori ai tiri, sincronizzazione browser, identita e quote preservate.
- `node scripts/test-team-volume-profiles.js`, `node scripts/test-team-matchup-profiles.js`, `node scripts/test-predictions.js`, `node scripts/test-reading-prediction-v2.mjs`: passati. La suite profili conteneva ancora l'aspettativa Domenico Tedesco nell'anagrafica corrente del Bologna: aggiornata a Raffaele Palladino, gia presente nel file canonico prima di questo intervento; le verifiche storiche e tattiche restano attive.
- `node scripts/test-schedina-md11.mjs`: passato, 207 selezioni operative quotate, contratti provider, DUO, cataloghi sincronizzati e dieci selezioni salvate/ripristinate verificate.
- `node scripts/test-reading-md11.cjs`: passato per tutte le dieci Letture, desktop e mobile, senza errori JavaScript o overflow; disponibilita e fonti pubbliche controllate.
- `node scripts/check-schedina-md11.cjs`: passato a 1440 e 390 pixel per dieci Letture e Schedina, senza overflow. Edge non si avviava nel profilo sandbox; i medesimi test sono passati eseguiti localmente fuori sandbox.

Evidenze browser in `reports/md11-reading-refresh/` e `reports/md11-schedina/`. Le acquisizioni dei modelli spaziali sono state disabilitate durante il build per non generare nuove revisioni sperimentali estranee all'adattamento SOT.
