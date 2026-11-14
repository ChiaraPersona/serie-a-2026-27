# Recupero direzioni d’attacco Champions — 13 novembre 2026

## Esito

Questa verifica non ha recuperato nuove triplette sinistra/centro/destra verificabili per le sei squadre mancanti. Il risultato non dimostra che il dato non esista: l’accesso diretto WhoScored tramite lo strumento web non è riuscito e le ricerche indicizzate non hanno restituito i conteggi richiesti. Nessuna modifica a dataset, calcoli o interfaccia è stata eseguita da questa ricerca.

## Contratto del dato esistente

Fonte interna consultata: `data/sources/champions-attack-channels-2025-26.json`. Il campo `provider.methodology` identifica i conteggi **Tocchi di palla > Fasce d’attacco, vista Totale**, ordinati sinistra, centro, destra. Il builder `scripts/build-champions-attack-channels.js` trasforma esclusivamente questi tre conteggi positivi in percentuali. Sono ammessi campione domestico e fallback UEFA, entrambi della stagione 2025/26.

Per esempio il record Bodø/Glimt conserva il fallback Champions con `counts: [1067, 701, 946]` e [URL WhoScored della fase 2025/26](https://it.whoscored.com/regions/250/tournaments/12/seasons/10903/stages/24796/teamstatistics/europa-champions-league-2025-2026). Questo è un dato già presente: non costituisce un nuovo recupero né una nuova verifica dei conteggi.

## Squadre esaminate

Le identità UEFA sono state lette da `data/normalized/champions-league-2026-27.json`, `teamBranding`; non sono state ricostruite con associazioni approssimative.

| Squadra | ID UEFA interno | Esito di questa verifica |
|---|---|---|
| AEK Athens | 50129 | Nessuna tripletta o conteggio 2025/26 verificato |
| LASK | 63405 | Nessuna tripletta o conteggio 2025/26 verificato |
| Sabah | 2609356 | Nessuna tripletta o conteggio 2025/26 verificato; ignorati risultati di squadre omonime |
| Shakhtar Donetsk | 52707 | Nessuna tripletta o conteggio 2025/26 verificato |
| Slovan Bratislava | 52797 | Nessuna tripletta o conteggio 2025/26 verificato |
| Viking | 52319 | Nessuna tripletta o conteggio 2025/26 verificato |

## Verifiche web e limiti

1. Ricerche sul dominio WhoScored e ricerche testuali con nome della squadra e `Attack Sides`, `2025/2026`, `teamstatistics`: nessun risultato con i tre conteggi della metrica richiesta per le sei squadre. Un risultato non trovato da un indice non è prova di assenza del dato dal provider.
2. Apertura dell’[URL WhoScored della fase già registrato nel dataset](https://it.whoscored.com/regions/250/tournaments/12/seasons/10903/stages/24796/teamstatistics/europa-champions-league-2025-2026): lo strumento web ha risposto `URL ... is not accessible via this tool`. Questo è un limite di accesso del tentativo, non una conferma che la pagina o il campione siano assenti.
3. La [pagina ufficiale UEFA Conference League 2025/26](https://www.uefa.com/uefaconferenceleague/history/seasons/2026/statistics/), aperta e letta, espone classifiche di gol, possesso, precisione passaggi, tackle e altre metriche; il contenuto restituito non contiene la ripartizione di tocchi nelle tre fasce. La presenza di AEK e Shakhtar in queste classifiche non basta a riempire le direzioni d’attacco.
4. La [pagina ufficiale UEFA delle statistiche AEK](https://www.uefa.com/uefachampionsleague/clubs/50129--aek-athens/statistics/), aperta e letta, si riferisce alla **Champions 2026/27**. Espone attacchi totali, passaggi completati a sinistra/destra e altri dati di distribuzione: **non** sono i tocchi sinistra/centro/destra della metrica WhoScored e appartengono a un’altra stagione. Non sono stati usati come sostituzione.

Le ricerche hanno inoltre restituito pagine secondarie su tiri, xG, passaggi, attacchi pericolosi, mappe medie e andamento della pressione. Nessuna è stata usata per stimare o ricostruire una tripletta. Non è stato applicato un terzo uniforme, né una stima basata su ruoli, cross, tiri o coordinate.

## Decisione sui dati

In assenza di nuovi conteggi verificati, conservare `counts: null` e `attackChannels: null` per le sei squadre. Un recupero futuro richiede una pagina o risposta primaria accessibile con metrica, squadra, stagione, competizione/campione e valori esatti. Eventuali dati di una diversa stagione o di una metrica diversa devono restare distinti e non essere inseriti nel dataset 2025/26 come se fossero lo stesso indicatore.
