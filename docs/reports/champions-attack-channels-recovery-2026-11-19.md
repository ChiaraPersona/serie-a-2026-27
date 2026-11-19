# Recupero direzioni d’attacco Champions — 19 novembre 2026

## Contratto del dato

Il dataset `data/sources/champions-attack-channels-2025-26.json` richiede conteggi WhoScored **Tocchi di palla > Fasce d’attacco, vista Totale**, nell’ordine sinistra, centro, destra, relativi al 2025/26. Il builder `scripts/build-champions-attack-channels.js` ne ricava le percentuali senza modifiche metodologiche. Al momento della verifica iniziale: 30 profili disponibili e sei `counts: null` (AEK Athens, LASK, Sabah, Shakhtar Donetsk, Slovan Bratislava, Viking).

## Verifica indipendente tramite ricerca web

Le ricerche con nome squadra, `WhoScored`, `Attack Sides` e stagione, anche limitate al dominio WhoScored, non hanno restituito conteggi utilizzabili per le sei squadre. Questo descrive il risultato dell’indice, non dimostra l’assenza della metrica dal provider.

L’apertura tramite strumento web dell’[URL WhoScored Champions 2025/26 già registrato](https://it.whoscored.com/regions/250/tournaments/12/seasons/10903/stages/24796/teamstatistics/europa-champions-league-2025-2026) ha restituito `is not accessible via this tool`. Anche una pagina di controllo di una squadra già coperta ha prodotto lo stesso limite. L’accesso browser è una verifica distinta e questi errori non ne anticipano l’esito.

Le pagine [AEK Conference League](https://www.uefa.com/uefaconferenceleague/clubs/50129--aek-athens/statistics/) e [Shakhtar Conference League](https://www.uefa.com/uefaconferenceleague/clubs/52707--shakhtar/statistics/) restituite da UEFA riportano 2026/27 e una shell senza triplette. Non sono evidenze del campione 2025/26 richiesto. I tentativi con percorsi UEFA storici 2026 non hanno restituito contenuti utilizzabili. Nessuna metrica di gol, possesso, passaggi o tiri è stata convertita artificialmente in fasce d’attacco.

## Identità Sabah

La [pagina UEFA ufficiale del club 2609356](https://www.uefa.com/uefachampionsleague/clubs/2609356--sabah/) identifica **Sabah FC, AZE**. È l’identità canonica associata a `Sabah` nel progetto (`data/sources/champions-team-history-map-2026-27.json`). Risultati relativi a Sabah FA o ad altre squadre omonime non certificano dati di questo club e non sono stati usati per compilare conteggi.

## Verifica diretta nel browser

WhoScored è risultato accessibile nel browser integrato, anche se non tramite lo strumento web. Dal menu Tutti i Tornei sono stati aperti i campionati e selezionati gli archivi stagionali. Nelle pagine elencate la navigazione del torneo espone Riepilogo e Partite, senza tabella Statistiche Squadre con i conteggi richiesti:

| Squadra | Pagina WhoScored consultata | Esito circoscritto alla pagina |
|---|---|---|
| LASK | [Bundesliga, fase regolare 2025/26](https://it.whoscored.com/regions/15/tournaments/32/seasons/10777/stages/24571/show/austria-bundesliga-2025-2026) | Nessuna tripletta fasce d’attacco esposta; consultato anche il selettore delle fasi. |
| AEK Athens | [Super League, Championship Group 2025/26](https://it.whoscored.com/regions/84/tournaments/65/seasons/10776/stages/25299/show/grecia-super-league-2025-2026) | Calendario e risultati, nessuna tripletta esposta. |
| Viking | [Eliteserien 2025](https://it.whoscored.com/regions/165/tournaments/41/seasons/10570/stages/24005/show/norvegia-eliteserien-2025) | Stagione a calendario annuale; nessuna tripletta esposta. Consultata anche la pagina 2026, senza usarla come dato 2025. |
| Shakhtar Donetsk | [Premier League ucraina 2025/26](https://it.whoscored.com/regions/230/tournaments/114/seasons/10779/stages/24573/show/ucraina-premier-league-2025-2026) | Nessuna tripletta esposta; identità WhoScored 1706 osservata nel link del club. |
| Slovan Bratislava | [Super Liga, Championship Group 2025/26](https://it.whoscored.com/regions/200/tournaments/74/seasons/10770/stages/25211/show/slovacchia-super-liga-2025-2026) | Nessuna tripletta esposta; identità WhoScored 698 osservata nel link del club. |
| Sabah | [Premier League azera 2025/26](https://it.whoscored.com/regions/16/tournaments/173/seasons/10848/stages/24698/show/azerbaigian-premier-league-2025-2026) | Nessuna tripletta esposta; link del club Sabah FK con identità WhoScored 27893. |

Consultate anche [Conference League, fase campionato 2025/26](https://it.whoscored.com/regions/250/tournaments/715/seasons/10905/stages/24800/show/europa-conference-league-2025-2026) e [fase finale](https://it.whoscored.com/regions/250/tournaments/715/seasons/10905/stages/24801/show/europa-conference-league-2025-2026): nessuna tabella utilizzabile con la tripletta richiesta. La fase campionato mostra i link di Shakhtar e Slovan, ma ciò non certifica la disponibilità della metrica.

La [pagina Statistiche Squadre del Sabah](https://it.whoscored.com/teams/27893/statistics/azerbaigian-sabah-fk) contiene effettivamente grafici Fasce d’attacco e Zone di azione, caricati dopo il contenuto iniziale. Tuttavia non espone un selettore o un’indicazione che certifichi il campione 2025/26. Il riepilogo del club propone Champions League come torneo attuale. Controllata anche la vista desktop per escludere un filtro nascosto dalla vista mobile: nessun selettore storico disponibile nella pagina osservata. Non acquisire quei grafici come conteggi 2025/26 e non confondere le Zone di azione (terzi longitudinali) con le Fasce d’attacco (sinistra/centro/destra).

## Esito e limiti

**Zero nuove triplette 2025/26 verificate e integrate. Copertura invariata: 30/36; le sei squadre rimangono N/D.** Le verifiche non dimostrano che i dati non esistano in assoluto: certificano che non sono stati recuperati nei percorsi pubblici consultati. Servono conteggi stagionali verificabili della stessa metrica, oppure un export autorizzato con identità, stagione, competizione e definizione del campione.

Nessuna modifica a dataset, builder, formule, selezioni o interfaccia pubblica. Nessun build eseguito, perché non sono stati acquisiti dati da propagare. Nessun commit, push o deploy.
