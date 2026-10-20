# Sabah–Borussia Dortmund MD3 — selezione preliminare isolata

L'overlay è stato generato il 20 ottobre 2026 alle 16:43:11 UTC, prima del calcio d'inizio (16:45 UTC), usando soltanto probabilità 1X2/gol congelate e quote Sisal già importate. La visita browser è successiva, ma non è stato acquisito alcun dato postpartita. Nessuno snapshot storico è stato riscritto.

## Schedina effettivamente aggiornata

| Pronostico | Probabilità centrale | Quota Sisal | EV centrale teorico | Stato |
| --- | ---: | ---: | ---: | --- |
| Borussia Dortmund vincente (2) | 40,9% | 1,28 | -47,65% | Preliminare, non validato |
| Over 2,5 gol | 64,6% | 1,45 | -6,33% | Preliminare, non validato |

Il selettore MD7 mantiene per entrambe scenario sportivo, probabilità del contratto completo, quota provider verificata, supporto minimo e filtro delle sovrapposizioni. Per questa sola fixture l'ammissione preliminare ignora `RELIABILITY_NOT_ASSESSED`, che descrive l'assenza di validazione statistica complessiva e prima impediva qualsiasi selezione. Non sono state compilate probabilità prudenziali né EV prudenziali. Gli EV centrali sono negativi e non indicano valore economico; il sistema MD7 li tratta come informazione, senza usarli come filtro di selezione.

## Volumi collettivi: diagnostica, non target operativo

| Metrica | Sabah, campione completo | Sabah, senza 2 anomalie | Dortmund, campione completo | Dortmund, senza 2 anomalie Sabah | Utilizzabile in Schedina |
| --- | ---: | ---: | ---: | ---: | --- |
| Tiri | 17,29 | 13,54 | 10,50 | 9,24 | No |
| SOT | 6,10 | 4,80 | 3,87 | 3,50 | No |
| Corner | 6,21 | 5,64 | 3,45 | 3,30 | No |

Il replay isolato esclude Sabah–AGF dell'11 agosto (29 tiri Sabah) e Sabah–Hapoel del 25 agosto (35), conservando le altre otto osservazioni Sabah e le 52 Dortmund. La pipeline esistente genera probabilità di soglia dai volumi e dalla dispersione, non dalla sola media. Esempi di sensibilità: Sabah Over 10,5 tiri 82,8→79,2%, Sabah Over 2,5 SOT 88,4→85,7%, Sabah Over 3,5 corner 83,6→75,4%, Dortmund Over 8,5 tiri 60,7→47,9%. Anche dove la rimozione degli outlier incide poco, manca una calibrazione verificata del passaggio dagli avversari delle qualificazioni al Dortmund; le quote Sabah (Over 10,5 tiri 2,00, Over 2,5 SOT 1,67) divergono fortemente dal modello e rafforzano la necessità di verifica. Pubblicare quelle percentuali come sostegno sufficiente richiederebbe una scelta di trasferimento non contenuta nella pipeline attuale. Il controllo specifico resta `publicationGate.passed=false` nell'artefatto diagnostico, e `TEAM_VOLUMES_UNAVAILABLE` nell'integrazione individuale ufficiale.

## Mercati esclusi

| Mercato | Motivo preciso |
| --- | --- |
| Tiri/SOT/corner Sabah e Dortmund | Esistono stime di soglia diagnostiche e quote esatte, ma il matchup tra competizioni non è calibrato; i target non sono entrati nel catalogo operativo. Le linee più alte del Sabah e quelle Dortmund vicine a 8,5 tiri sono anche sensibili agli outlier. |
| Corner totali | Non esiste una probabilità per il contratto congiunto: sommare le due medie o le probabilità marginali non equivale a modellare il totale. |
| Tiri/SOT individuali e DUO | Sabah resta `COLLECTIVE_ONLY_TEAM` con minuti previsti mancanti; entrambi gli XI hanno `TEAM_VOLUMES_UNAVAILABLE` per il target operativo. Non c'è probabilità completa utilizzabile. |
| 1, X e 1X | Scenario prevalente non coerente; 1 e X sono anche sotto il supporto sportivo minimo. |
| X2 | Supera i controlli di contratto (62,4%, quota 1,06) ma duplica la tesi «Dortmund non perde» già rappresentata dal 2, scelto prima dall'ordinamento MD7. |
| Doppia chance 12 | Sempre esclusa per policy. |
| Over 1,5 / Over 3,5 / Over 4,5+ | Over 1,5 è soglia ridondante rispetto a Over 2,5; Over 3,5 è sotto il supporto minimo; oltre 3,5 la probabilità congelata è N/D. |
| Under gol | Il catalogo prepartita congelato non contiene la probabilità del contratto Under con collegamento verificato alla soglia Sisal; non è stata ricavata una nuova probabilità per completarlo. |

Per sbloccare i volumi servono osservazioni prepartita per-partita del campionato azero Sabah con qualità degli avversari e una verifica della calibrazione di trasferimento verso avversari UCL. Solo dopo si può rifare il target della singola fixture e l'integrazione degli XI ufficiali senza sostituire lo snapshot congelato. Per i corner totali occorre una distribuzione congiunta o un builder di totale già verificato; per gli Under occorre un contratto modello/quote esatto.

## Isolamento e controlli

- L'overlay contiene una sola fixture; il test confronta le altre 17 con la vista derivata precedente tramite uguaglianza strutturale. Quote originali, probabilità congelate, formazioni e snapshot mantengono gli SHA-256 registrati.
- `node scripts/test-champions-md3-sabah-dortmund-selection.cjs`: PASS, due pronostici preliminari, due contratti Sisal esatti, 17 fixture identiche.
- `node scripts/test-champions-md3-derived-v2.mjs`: PASS, 18 fixture e 115 selezioni preliminari complessive, MyCombo e input congelati invariati.
- `node scripts/test-champions-md3-sabah-dortmund-volumes.cjs`: PASS sul replay diagnostico precedente; il suo conteggio zero si riferisce al vecchio catalogo, prima dell'overlay.
- `node scripts/check-champions-md3-sabah-dortmund-selection-browser.cjs`: PASS Edge locale a 1440 e 390 px: 18 card, due righe e relative quote visibili nel match, selezione personale cliccabile, nessun overflow o errore di pagina. Screenshot nella stessa cartella.
- Nessun builder globale, commit, push o deploy. Il sito locale legge l'overlay; non è stata effettuata pubblicazione remota.
