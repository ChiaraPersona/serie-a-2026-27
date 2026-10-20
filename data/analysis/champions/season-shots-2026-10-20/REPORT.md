# Tiri e SOT Champions: tutte le 36 rose — 20 ottobre 2026

Il recupero non e ancora completo per ogni calciatore in tutte le competizioni. Tutti i 970 giocatori sono censiti, con valori, campioni parziali, conflitti o lacune esplicite. Nessun totale incompleto e presentato come totale completo della stagione. Gare in corso e future escluse.

| Stato | Giocatori |
|---|---:|
| Entrambi i conteggi disponibili nei bucket coperti | 660 |
| Evidenza parziale | 86 |
| Conflitti fra fonti da risolvere | 42 |
| Nessuna presenza nel catalogo verificato del club attuale | 92 |
| Senza evidenza sufficiente | 90 |

Aggiunti o completati 120 bucket giocatore/competizione usando referti o statistiche stagionali aggiuntive. La stessa presenza nei due provider non e conteggiata due volte: si seleziona un intero bucket, senza sommare i provider. Club e competizioni distinti restano separati.

## Copertura per squadra

| Squadra | Rosa | Conteggi nei bucket coperti | Parziali | Conflitti | Zero nel catalogo del club | Irrisolti |
|---|---:|---:|---:|---:|---:|---:|
| Real Madrid | 35 | 28 | 0 | 0 | 5 | 2 |
| Inter | 23 | 21 | 0 | 0 | 2 | 0 |
| Napoli | 23 | 21 | 0 | 1 | 1 | 0 |
| Arsenal | 22 | 20 | 0 | 0 | 2 | 0 |
| Fenerbahçe | 36 | 23 | 0 | 0 | 2 | 11 |
| Roma | 24 | 23 | 0 | 0 | 1 | 0 |
| Como | 21 | 19 | 0 | 1 | 1 | 0 |
| Leipzig | 22 | 20 | 0 | 0 | 1 | 1 |
| AEK Athens | 22 | 7 | 14 | 0 | 0 | 1 |
| Aston Villa | 23 | 23 | 0 | 0 | 0 | 0 |
| Atlético de Madrid | 24 | 20 | 0 | 1 | 2 | 1 |
| Barcelona | 25 | 23 | 0 | 0 | 2 | 0 |
| Bayern München | 24 | 21 | 0 | 0 | 2 | 1 |
| Bodø/Glimt | 32 | 3 | 11 | 9 | 5 | 4 |
| Borussia Dortmund | 28 | 21 | 0 | 1 | 3 | 3 |
| Club Brugge | 25 | 9 | 7 | 0 | 7 | 2 |
| Feyenoord | 46 | 19 | 0 | 4 | 9 | 14 |
| Galatasaray | 33 | 19 | 0 | 1 | 5 | 8 |
| LASK | 32 | 18 | 1 | 3 | 0 | 10 |
| Lens | 25 | 22 | 0 | 0 | 3 | 0 |
| Liverpool | 25 | 19 | 0 | 0 | 5 | 1 |
| Manchester City | 23 | 22 | 0 | 0 | 1 | 0 |
| Lille | 24 | 23 | 0 | 0 | 1 | 0 |
| Manchester United | 25 | 20 | 0 | 0 | 4 | 1 |
| Paris Saint-Germain | 26 | 20 | 0 | 1 | 3 | 2 |
| Porto | 33 | 18 | 0 | 3 | 7 | 5 |
| PSV Eindhoven | 23 | 22 | 0 | 1 | 0 | 0 |
| Real Betis | 25 | 22 | 0 | 0 | 3 | 0 |
| Sabah | 27 | 2 | 17 | 0 | 0 | 8 |
| Slavia Praha | 25 | 15 | 8 | 2 | 0 | 0 |
| Shakhtar Donetsk | 29 | 20 | 2 | 0 | 3 | 4 |
| Slovan Bratislava | 28 | 5 | 20 | 0 | 0 | 3 |
| Stuttgart | 32 | 21 | 0 | 1 | 4 | 6 |
| Viking | 30 | 9 | 5 | 12 | 4 | 0 |
| Villarreal | 25 | 21 | 1 | 1 | 1 | 1 |
| Sporting CP | 25 | 21 | 0 | 0 | 3 | 1 |

## Significato dei dati

- `coveredTotals` somma solo bucket disponibili e senza conflitti. Se manca una metrica in un bucket o esiste un conflitto, il totale resta null. La disponibilita non certifica l’esaustivita di tutte le competizioni ufficiali.
- Gli zeri del catalogo del club attestano assenza negli incontri ufficiali conclusi elencati e verificati per quel club; non diventano automaticamente uno zero per tutta la carriera stagionale o per eventuali altri club.
- Gli zeri individuali mancanti nel referto sono ricavati solo quando il totale di squadra e interamente riconciliato con gli altri giocatori e la formazione e completa. Il ledger registra `zeroEvidence`; nessuna media di ruolo o stima viene usata.
- Le statistiche stagionali supplementari non vengono distribuite artificialmente sui singoli incontri.
- Il precedente Mondiale per club presente in alcune pagine del secondo provider e stato escluso: manca evidenza datata nella stagione richiesta.
- Per Eliteserien il campione e il campionato annuale 2026, esplicitamente distinto dalla stagione europea luglio 2026–ottobre 2026.
- Restano scoperte alcune coppe/qualificazioni, record senza identificativi verificati e statistiche mancanti o discordanti. I nomi e i bucket sono in remaining-gaps.json; tutte le righe sono in all-970-players.csv.

## File canonici e conservazione

- Fonte interna: data/sources/champions-player-shooting-evidence-2026-10-20.json.
- Normalizzato: data/normalized/champions-player-shooting-2026-27.json.
- Il database individuale esistente include il campo aggiuntivo `officialClubShooting`; statistiche, minuti, identita e altri campi preesistenti sono verificati identici allo snapshot iniziale.
- Il builder corrente applica lo stesso overlay solo se il cutoff richiesto non precede il 20 ottobre. Storico 2025/26, formule, previsioni, quote, Schedina e pagine non sono rigenerati.

## Riproduzione

Dopo le acquisizioni raw:
```powershell
node scripts/build-champions-season-shots.cjs
node scripts/enrich-champions-season-shots.cjs
node scripts/build-champions-fotmob-shots.cjs
node scripts/import-champions-season-shots.cjs
node scripts/test-champions-season-shots.cjs
node scripts/report-champions-season-shots.cjs
```

Tutte le prove e le URL restano interne ai file; nessuna sezione pubblica sulle fonti e stata introdotta. Nessun commit, push, build del sito o deploy eseguito.

## Verifiche

- PASS: test-champions-season-shots.cjs
- PASS: test-champions-registered-squads.js
- PASS: test-champions-player-markets.js
- PASS: test-champions-pilot-predictions.js
- FAIL: test-champions-current-season-data.js

Il test current-season mantiene una data AEK fissata al 3 ottobre: si ferma al confronto 2026-10-20 != 2026-10-03. Non e stato modificato. Il nuovo test verifica separatamente unicita e validita degli ID, deduplicazione per partita, tiri/SOT, cutoff, distinzione null/zero, aggregati e conservazione integrale degli altri dati. Replay numericamente idempotente, ignorando soltanto generatedAt. Nessun controllo visivo necessario: interfaccia e pagine non sono state modificate.
