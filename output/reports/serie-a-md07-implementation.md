# Serie A 2026/27 — MD7

Schedina locale: `schedina.html?giornata=7`. Le dieci letture consumano il medesimo registro `data/normalized/schedina-md07.json#marketCatalog`; nessuna copia editoriale indipendente. MyCombo: 10 gare, 30 portafogli.

| Partita | Tiri | SOT | Altri mercati | Totale pronostici | Quote disponibili | Problemi |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| Frosinone–Sassuolo | 10 | 8 | 5 | 23 | 23 | — |
| Venezia–Napoli | 8 | 6 | 5 | 19 | 19 | — |
| Bologna–Inter | 7 | 7 | 6 | 20 | 20 | — |
| Roma–Genoa | 6 | 5 | 5 | 16 | 16 | — |
| Udinese–Lecce | 6 | 4 | 5 | 15 | 15 | — |
| Fiorentina–Como | 0 | 0 | 4 | 4 | 4 | Snapshot privo di mercati tiri/SOT |
| Milan–Atalanta | 0 | 0 | 6 | 6 | 6 | Snapshot privo di mercati tiri/SOT |
| Juventus–Lazio | 0 | 0 | 5 | 5 | 5 | Snapshot privo di mercati tiri/SOT |
| Monza–Cagliari | 0 | 0 | 5 | 5 | 5 | Snapshot privo di mercati tiri/SOT |
| Parma–Torino | 0 | 0 | 4 | 4 | 4 | Snapshot privo di mercati tiri/SOT |
| Totale | 37 | 30 | 50 | 117 | 117 | |

## Dati e limiti

- Acquisite dalla fonte Fantacalcio MD7: 20 squadre, 220 titolari probabili, 230 riserve; tutti i 450 calciatori collegati a ID canonici. Le 17 riserve fuori rosa restano escluse e documentate nella fonte.
- Fonte editoriale: 20 commenti, 90 elementi di ballottaggio, 65 infortunati, 3 squalificati, 8 dubbi. Nessun conflitto tra titolari probabili e liste infortunati/squalificati. I dubbi non diventano assenze certe. L'anagrafica Lazio riporta Gennaro Gattuso, coerente con il commento della fonte.
- Risultati MD6: test superato, 10 gare, 320 presenze con ID risolti; completezza 99,68%. Mancano 11 valori pali/traverse e una valutazione; nessun dato riempito con zero.
- 117 pronostici pubblicati con quota verificata, inclusi 12 outsider; 0 senza quota nella lista operativa. Nel catalogo tecnico restano 51 previsioni individuali senza contratto provider riconciliato. Nessuna è stata forzata nella schedina.
- Per le ultime cinque gare lo snapshot non contiene alcun mercato tiri/SOT, né squadra né giocatore. I forecast matematici sono generati per tutte le gare; manca la corrispondente offerta verificata per pubblicare quelle selezioni operative.
- 46 selezioni individuali quotate hanno contratto DUO: probabilità, quota equa ed EV del contratto restano null. Il riferimento V2 individuale è conservato separatamente, senza applicarlo al DUO.
- Nessun giocatore dei forecast individuali MD7 è completamente privo sia di minuti storici sia di minuti correnti; campioni deboli restano trattati dai criteri di stabilità già esistenti. Le esclusioni dettagliate sono in `marketCatalog.playerForecastIntegration.excluded`.
- Altri mercati pubblicati: 32 gol/risultati e 18 corner. Falli individuali e cartellini non sono stati promossi aggirando i gate MD6: i primi sono esclusi dalla policy esistente, i secondi non hanno una validazione certificata del target provider. Nessuna attivazione arbitrale sperimentale.

## Implementazione e verifiche

- `npm run build:betting:md07`: orchestration dei builder esistenti; generazione limitata alle previsioni MD7, preservando le altre fixture. Modello 4.13.0 invariato. Per i volumi discreti viene riutilizzata la validazione MD6 già salvata, senza nuovo backtest o ricalibrazione.
- La pipeline verifica hash degli archivi, snapshot e dati Champions; le previsioni delle altre giornate sono confrontate integralmente. Schedina, MyCombo e snapshot MD6 controllati invariati.
- PASS: `test-schedina-md07.mjs`, quote Sisal, BetSelection, forecast sync, store della schedina personale, rischio MyCombo MD7, controllo dei risultati MD6 e sintassi dei file modificati.
- PASS browser: 10 pannelli, corrispondenza degli ID di ogni pronostico tra tutte le letture e la Schedina, selezione e persistenza dopo reload, nessun errore JavaScript o overflow; desktop 1440px e mobile 390px. Evidenze: `serie-a-md07-browser-audit.json` e screenshot nelle stesse cartelle.
- Il test storico `test-schedina-md06.js` non passa: cerca una quota MD6 nello snapshot Sisal corrente MD7 (`intermedia-doppia-chance-compatibile: quota non presente nello snapshot`). Gli artefatti MD6 non sono stati modificati per soddisfare quel test.
- Build del sito eseguito. Nessun commit, push o deploy eseguito da questa attività; il checkout è condiviso e durante l'esecuzione sono comparsi commit e modifiche di altre attività.
