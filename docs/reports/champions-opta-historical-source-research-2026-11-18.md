# Disponibilità dei rating Opta storici — 18 novembre 2026

## Esito

Esiste una strada ufficiale documentata per chiedere ranking riferiti a una data. Non abbiamo però acquisito un dataset utilizzabile delle 36 partecipanti prima delle gare Champions di settembre–novembre 2026. Non si può quindi dichiarare completato un backtest temporale o passare alla calibrazione del candidato su quelle partite.

## Feed ufficiale pertinente

Stats Perform documenta il feed **TM14 Season Power Rankings**, endpoint `GET https://api.statsperform.com/sdapi/v1/soccerdata/seasonpowerrankings`. Il parametro `rankDt=YYYY-MM-DD` seleziona la data del ranking; sono previsti `contestantId`, `currentRating` e `lastUpdated` UTC. L'accesso usa OAuth, con frequenza indicata di una richiesta ogni 24 ore. Le combinazioni consentite dei parametri sono documentate: non inventare chiamate o riutilizzare chiavi rinvenute in altri siti. [Documentazione ufficiale TM14](https://developers.statsperform.com/feed-tm14-season-power-rankings).

L'esistenza del parametro storico non dimostra da sola la disponibilità, nel nostro account o per tutte le squadre e date richieste, né certifica che un record recuperato oggi sia identico alla versione pubblicata prima del calcio d'inizio. Prima di usarlo servono risposta effettiva, copertura, semantica della data e controllo di eventuali revisioni.

## Altri prodotti ufficiali: cosa non provano

Il feed MA1 Detailed può includere Power Ratings nei record delle partite. La documentazione precisa che il meccanismo delta recupera record aggiornati, senza un sistema di versionamento degli asset: filtrare la data della partita non ricostruisce automaticamente lo stato prepartita del rating. [Documentazione ufficiale MA1 Detailed](https://developers.statsperform.com/feed-ma1-detailed-fixtures-results).

L'offerta generale di archivi Opta riguarda molte statistiche storiche; non è una prova specifica di un archivio anonimo dei Power Rankings pubblicati giorno per giorno. [Archivi Opta, pagina ufficiale](https://www.statsperform.com/insights/power-of-historical-data-unlock-insights-opta-archives/).

## Archivio pubblico indipendente

Il progetto originale `tonyelhabr/club-rankings` dichiara raccolte giornaliere Opta e Club Elo e pubblica un CSV Opta. I campi `date` e `updated_at` sono definiti dall'autore come date e orari di acquisizione; possono esistere più acquisizioni al giorno. Sono metadati del raccoglitore indipendente, non una certificazione del provider. [README dell'autore](https://github.com/tonyelhabr/club-rankings), [asset CSV dichiarato](https://github.com/tonyelhabr/club-rankings/releases/download/club-rankings/opta-club-rankings.csv).

Il controllo dei metadati GitHub effettuato dal task principale ha trovato per quell'asset:

| Campo | Valore |
|---|---|
| Asset ID | `340388672` |
| Creato | `2026-01-14T10:21:39Z` |
| Aggiornato | `2026-01-14T10:21:45Z` |
| Dimensione | `170055548` byte |
| SHA-256 dichiarato | `93610d3a9b0712435c21434544e29aafa6e513305fc24fce1c4a6d35e0c97905` |

Fonte: [metadati originali della release GitHub](https://api.github.com/repos/tonyelhabr/club-rankings/releases/tags/club-rankings); evidenza locale in `data/analysis/champions/opta-historical-feasibility-2026-11-18/public-archive-metadata.json`.

Un asset aggiornato a gennaio non può provare acquisizioni effettuate da settembre a novembre dello stesso anno. Non è stato scaricato il file da 170 MB né sono state inferite date interne non lette. L'archivio resta eventualmente utile per una ricerca su stagioni più vecchie, dopo un controllo specifico della copertura e delle identità.

## Regole per il passo successivo

1. Se arriva un export TM14 autorizzato, conservare risposta originale, data richiesta, timestamp di acquisizione, hash e ID Opta. Collegare le squadre con mappa verificata agli ID UEFA canonici; escludere corrispondenze ambigue.
2. Per un dato con sola data giornaliera, selezionare prudenzialmente il giorno precedente la gara finché non è chiarito l'orario di aggiornamento. Separare la data del rating dalla prova della sua disponibilità prepartita.
3. Nessuna integrazione operativa o calibrazione basata sullo snapshot del 18 novembre applicato alle partite precedenti. Quel confronto resta retrospettivo contaminato temporalmente.
4. Senza storico verificato, predisporre acquisizioni e previsioni parallele prima delle prossime gare; non chiamarle risultati già validati.

Nessun account creato, nessuna credenziale usata, nessun contatto inviato e nessun file operativo modificato da questa ricerca.
