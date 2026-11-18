# Ricerca designazioni e percorsi storici arbitrali MD12

Verifica del 18 novembre 2026. Documento interno, non destinato alla presentazione pubblica.

## Designazioni ufficiali

L'URL legacy consegnato dall'utente, `https://www.aia-figc.it/dettaglio.asp?ID=28854`, non è apribile tramite il lettore web. La homepage AIA collega direttamente il corrispondente [articolo ufficiale aggiornato](https://www.aia-figc.it/news/serie-a-enilive-designazioni-12a-giornata-28854/), pubblicato il 18 novembre 2026. Il testo completo conferma la dodicesima giornata, con gare dal 21 al 23 novembre 2026; non è una designazione di una stagione precedente.

Trascrizione strutturata delle dieci sestine in `data/sources/referee-designations-md12-research-2026-11-18.json`. Il file è un'evidenza di ricerca separata dalla fonte canonica; contiene fixture ID nel formato già usato da `referee-assignments-2026-27.json`, nomi e slug esatti dei direttori, due assistenti, IV, VAR e AVAR.

| Gara | Direttore |
|---|---|
| Como–Cagliari | Andrea Calzavara |
| Lazio–Lecce | Matteo Marcenaro |
| Parma–Roma | Simone Sozza |
| Napoli–Torino | Antonio Rapuano |
| Juventus–Venezia | Alberto Ruben Arena |
| Bologna–Udinese | Livio Marinelli |
| Sassuolo–Genoa | Maria Sole Ferrieri Caputi |
| Milan–Frosinone | Luca Pairetto |
| Atalanta–Inter | Fabio Maresca |
| Monza–Fiorentina | Daniele Doveri |

La designazione di Maresca è anche confermata dal [club Atalanta](https://www.atalanta.it/news/atalanta-inter-dirige-maresca); quella di Marinelli dal [Bologna](https://www.bolognafc.it/bologna-udinese-arbitra-marinelli/). I riferimenti AIA restano autoritativi per le sestine complete.

## Identità e precedenti

Calzavara è **Andrea**, come documentato dall'[articolo biografico AIA](https://www.aia-figc.it/news/dietro-le-quinte-della-mente-di-un-arbitro-insieme-ad-andrea-calzavara-27295/). Una homepage secondaria emersa nella ricerca lo chiama Daniele: tale attribuzione va scartata. Il suo [profilo Calciotel esatto, ID2529](https://www.calciotel.it/arbitro/2529/calzavara-andrea) è già collegato allo slug `andrea-calzavara` nel registro interno.

Tutti i dieci direttori hanno un URL Calciotel nel registro `data/sources/reading-referee-match-history.json`. Percorsi da acquisire con la pipeline esistente, verificando l'intestazione esatta del profilo:

| Direttore | Profilo storico del provider |
|---|---|
| Calzavara | https://www.calciotel.it/arbitro/2529/calzavara-andrea |
| Marcenaro | https://www.calciotel.it/arbitro/2245/marcenaro-matteo |
| Sozza | https://www.calciotel.it/arbitro/1997/sozza-simone |
| Rapuano | https://www.calciotel.it/arbitro/1673/rapuano-antonio |
| Arena | https://www.calciotel.it/arbitro/2390/arena-alberto-ruben |
| Marinelli | https://www.calciotel.it/arbitro/1606/marinelli-livio |
| Ferrieri Caputi | https://www.calciotel.it/arbitro/2333/ferrieri-caputi-maria-sole |
| Pairetto | https://www.calciotel.it/arbitro/1295/pairetto-luca |
| Maresca | https://www.calciotel.it/arbitro/1201/maresca-fabio |
| Doveri | https://www.calciotel.it/arbitro/965/doveri-daniele |

Il lettore web restituisce per Calzavara una pagina con ultima gara al 20 settembre, mentre l'indicizzazione dello stesso URL riporta gare di ottobre. Non trascrivere manualmente totali da queste versioni discordanti: acquisire HTML live e dettagli con manifest, data di recupero e hash tramite `scripts/referee-stats/refresh-matchday-history.cjs`; successivamente usare il database storico e la proiezione già esistenti. I precedenti vanno filtrati prima del kickoff della fixture e le stagioni parziali devono rimanere dichiarate tali.

Questa ricerca non modifica statistiche canoniche, previsioni, quote, mercati né criteri; i conteggi effettivamente importati e le verifiche del sito appartengono al successivo rapporto di aggiornamento. Non equivale a certificazione di completezza o liquidazione bookmaker.
