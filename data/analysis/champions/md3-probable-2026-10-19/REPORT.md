# Champions MD3 — probabili formazioni e gate individuale

## Esito

Importate tutte le 18 partite e 36 squadre dell’articolo UEFA, aggiornato al 19 ottobre 2026. 396 posti da titolare, 381 identità risolte, 15 titolari senza identità verificabile nella rosa corrente. Non creato alcun giocatore.

**325 stime preliminari dei minuti condizionate alla partenza da titolare; 0 proiezioni operative di tiri/SOT generate.** Il gate esistente `projectDocumentedTeam` richiede anche una panchina documentata. L’articolo offre undici probabili e assenze, non panchine. Nessun flag è stato falsificato e nessun gate o coefficiente modificato per produrre numeri. Le Letture sono completate con le informazioni realmente disponibili; l’attivazione delle proiezioni resta bloccata.

I 325 minuti comprendono 29 portieri, 286 giocatori di movimento con ruolo noto e 10 identità con ruolo non disponibile. I minuti non costituiscono, da soli, una previsione di tiri.

## Acquisizione e identità

Articolo: https://it.uefa.com/uefachampionsleague/news/02aa-21dd6b9cbdaf-800a1bb6a80d-1000--probabili-formazioni-di-champions-league-notizie-infortuni-/

Consultazione: 2026-10-19T15:40:47.915412+00:00. Stato di ogni squadra e formazione: `probable`. Trascrizione dei 36 paragrafi conservata nelle righe estratte e nel campo rawLine del file sorgente. Sono conservati ordine, grafie, URL, data di aggiornamento, consultazione e mapping revisionati. Indisponibili, squalificati e dubbi sono categorie separate: nessuna assenza viene trattata come disponibilità certa.

Il builder usa esclusivamente gli ID del mapping già revisionato, con controllo di appartenenza alla rosa e coerenza degli ID provider, senza lookup approssimativi e senza nuovi giocatori. I cognomi sono circoscritti alla squadra nel ledger esplicito. Esempi verificati: Nathan Saliba al Villarreal e William Saliba all’Arsenal; Jobe Bellingham al Dortmund e Jude Bellingham al Real; J. Martínez e L. Martínez distinti all’Inter. Alias canonici divergenti per accenti sono collegati allo stesso ID provider. `bod-glimt` e `bodo-glimt` riconciliati. Un nome non presente nella rosa corrente non riceve automaticamente un ID né le statistiche di un altro club: il possibile trasferimento resta da verificare.

## Minuti e affidabilità

Riutilizzato `estimateExpectedMinutes` da `scripts/champions/substitute-minutes.js`: almeno 3 presenze documentate da titolare, massimo 8 recenti, preferenza UEFA se sufficiente; altrimenti fallback tra competizioni dichiarato nei metadati. Media aritmetica dei minuti del campione, con cutoff evento e reperibilità precedenti alla partita. Nessuna assegnazione automatica di 90 minuti: un risultato di 90 deriva dal campione selezionato, non dalla presenza nell’undici probabile. Sono conservate le righe storiche selezionate, competizioni, stagioni, date e metodo basato sui roster e sui clock di sostituzione; non vengono spacciate per minuti direttamente osservati nei Pacchetti 1/2.

I minuti stimati/non certificati del campione corrente non entrano nel canale primario tiri/SOT. I rate congelati restano diagnostici e non sono pubblicati come pronostici. Nessuna formula, prior o coefficiente modificato.

I 6 titolari contemporaneamente in dubbio sono bloccati, con minuti/proiezioni N/D e incertezza esplicita: Haaland, Chalobah, Lisandro Martínez, Berke Özer, Aguilar e Neuer. Nessuna probabilità arbitraria di presenza o sconto ai minuti. Sabah, Slavia, Slovan e Shakhtar: 44 posti da titolare esclusi completamente dal modello individuale, conservando i dati storici.

## Copertura delle 36 squadre

| Squadra | Identità titolari | Minuti condizionati | Previsioni tiri/SOT | Gate |
|---|---:|---:|---:|---|
| Fenerbahçe | 11/11 | 11 | 0 | blocked-documentation-or-minutes |
| Slavia Praha | 11/11 | 0 | 0 | Solo collettivi |
| Sabah | 11/11 | 0 | 0 | Solo collettivi |
| Borussia Dortmund | 8/11 | 8 | 0 | blocked-documentation-or-minutes |
| Roma | 11/11 | 11 | 0 | blocked-documentation-or-minutes |
| Slovan Bratislava | 11/11 | 0 | 0 | Solo collettivi |
| Porto | 11/11 | 11 | 0 | blocked-documentation-or-minutes |
| PSV Eindhoven | 10/11 | 10 | 0 | blocked-documentation-or-minutes |
| Liverpool | 11/11 | 11 | 0 | blocked-documentation-or-minutes |
| Villarreal | 11/11 | 11 | 0 | blocked-documentation-or-minutes |
| Manchester City | 11/11 | 10 | 0 | blocked-documentation-or-minutes |
| AEK Athens | 11/11 | 11 | 0 | blocked-documentation-or-minutes |
| Paris Saint-Germain | 11/11 | 11 | 0 | blocked-documentation-or-minutes |
| Barcelona | 11/11 | 11 | 0 | blocked-documentation-or-minutes |
| Napoli | 11/11 | 11 | 0 | blocked-documentation-or-minutes |
| Bodø/Glimt | 11/11 | 11 | 0 | blocked-documentation-or-minutes |
| Stuttgart | 11/11 | 10 | 0 | blocked-documentation-or-minutes |
| Atlético de Madrid | 11/11 | 11 | 0 | blocked-documentation-or-minutes |
| Como | 11/11 | 10 | 0 | blocked-documentation-or-minutes |
| Manchester United | 11/11 | 10 | 0 | blocked-documentation-or-minutes |
| Lille | 11/11 | 9 | 0 | blocked-documentation-or-minutes |
| Galatasaray | 11/11 | 10 | 0 | blocked-documentation-or-minutes |
| Aston Villa | 11/11 | 11 | 0 | blocked-documentation-or-minutes |
| Viking | 9/11 | 9 | 0 | blocked-documentation-or-minutes |
| Club Brugge | 8/11 | 8 | 0 | blocked-documentation-or-minutes |
| Lens | 11/11 | 9 | 0 | blocked-documentation-or-minutes |
| Bayern München | 10/11 | 9 | 0 | blocked-documentation-or-minutes |
| Arsenal | 10/11 | 10 | 0 | blocked-documentation-or-minutes |
| Inter | 10/11 | 10 | 0 | blocked-documentation-or-minutes |
| Shakhtar Donetsk | 11/11 | 0 | 0 | Solo collettivi |
| Real Madrid | 11/11 | 11 | 0 | blocked-documentation-or-minutes |
| Leipzig | 10/11 | 10 | 0 | blocked-documentation-or-minutes |
| Real Betis | 11/11 | 11 | 0 | blocked-documentation-or-minutes |
| Feyenoord | 10/11 | 10 | 0 | blocked-documentation-or-minutes |
| Sporting CP | 11/11 | 10 | 0 | blocked-documentation-or-minutes |
| LASK | 10/11 | 9 | 0 | blocked-documentation-or-minutes |

## Confronto con i volumi collettivi

Non esistono proiezioni operative generate da confrontare; la verifica di coerenza operativa resta non valutabile. Per 30 squadre è stato calcolato soltanto un confronto interno sul sottoinsieme incompleto di titolari con baseline e minuti sufficienti, mediante il helper di scala già esistente (limiti invariati 0.72–1.35). Questi aggregati non sono pronostici, non vengono pubblicati e non redistribuiscono automaticamente il volume dei giocatori mancanti.

In 8 casi il sottoinsieme non riconcilia entro la tolleranza già esistente di 0.02. Nessun SOT superiore ai tiri nei sottoinsiemi diagnostici. Differenze sottoinsieme meno volume squadra:

| Squadra | Delta tiri | Delta SOT |
|---|---:|---:|
| Fenerbahçe | -0.01 | -0.69 |
| Porto | 0 | -0.46 |
| Manchester City | -1.51 | -1.26 |
| Lille | -0.83 | -1.12 |
| Viking | -0.23 | -0.12 |
| Club Brugge | -2.59 | -0.74 |
| Lens | -1.56 | -0.01 |
| Inter | 0 | -0.05 |

Roma non ha baseline di tiro utilizzabili nel sottoinsieme ammesso; Dortmund conserva il blocco dei volumi di squadra nella fixture Sabah–Dortmund. Le quattro squadre escluse non ricevono neppure questa diagnostica. Il CSV team-comparison-diagnostic.csv conserva il dettaglio di tutte le squadre, inclusi N/D. La coerenza apparente di un sottoinsieme non elimina il blocco documentale.

## Identità non risolte

22 menzioni complessive non risolte, delle quali 15 titolari e 7 indisponibili/squalificati/dubbi. Nessuna correzione automatica della grafia “Ejven”. Dettaglio:

| Squadra | Nome articolo | Categoria |
|---|---|---|
| Borussia Dortmund | Gadou | starters |
| Borussia Dortmund | Veerman | starters |
| Borussia Dortmund | Nwaneri | starters |
| Borussia Dortmund | Karetsas | unavailable |
| PSV Eindhoven | Fernandez | starters |
| Bodø/Glimt | Ejven | unavailable |
| Manchester United | Yoro | suspended |
| Manchester United | Mainoo | doubtful |
| Aston Villa | Hemmings | doubtful |
| Viking | Bjørdal | starters |
| Viking | Botheim | starters |
| Club Brugge | Sabbe | starters |
| Club Brugge | Spileers | starters |
| Club Brugge | Seys | starters |
| Bayern München | Karl | starters |
| Arsenal | Lewis-Skelly | starters |
| Inter | Esposito | starters |
| Shakhtar Donetsk | Azarovi | doubtful |
| Leipzig | Nusa | starters |
| Leipzig | Ouédraogo | unavailable |
| Feyenoord | Mika Mármol | starters |
| LASK | Alemão | starters |

## Interfaccia e protezioni

Aggiornate tutte le 18 Letture nella sola diramazione MD3: sezione con lo stesso stile dei giocatori già esistente, undici probabili, tre categorie di indisponibilità e righe espandibili con minuti supportati o N/D. Nessun modulo tattico, panchina, fotografia o proiezione inventato. Nessun testo di fonte o rate diagnostico nell’interfaccia.

Sette singole CL3, quote e ID Sisal, catalogo 426/657, preview collettiva e profili arbitrali preservati byte per byte. Nessun nuovo mercato individuale o nuova selezione. Nessuna applicazione del filtro ufficiale, perché una formazione probabile non è ufficiale.

## Test

- test-champions-md3-probable.mjs: 18/36/396, identità, omonimie, esclusioni, dubbi, minuti ricostruiti con la funzione esistente, sample minimo, assenza di fallback 90 senza evidenza, gate documentale, nessun rate/provenienza/foto nell’HTML.
- test-champions-md3-preliminary.mjs: forecast congelati e 426/657 contratti esatti, nessuna selezione individuale, store e persistenza.
- test-champions-md3-approved.mjs: sette singole CL3 e settlement invariati.
- test-champions-reading-page.mjs e test-champions-schedina-page.mjs: regressioni pagine superate.
- test-champions-referee-readings-md02-page.mjs: 18/18 Letture MD2 superate.
- Edge: 18 Letture e Schedina a 1440/390/320 px (57 controlli pagina), 22 titolari per Lettura, identità e minuti visualizzati esatti, tiri/SOT N/D, arbitri e forecast collettivi invariati, 7 esiti registrati, nessun overflow o errore JavaScript; selezione manuale tra due fixture, quote e persistenza funzionanti. Screenshot desktop/mobile ispezionati. Ripetizione a 320 px sul dataset compatto finale.

## File dell’intervento

Modificati: js/pages/champions.js; js/pages/champions-md3-ui.mjs; scripts/build-site.js; champions-league.html (solo shell Champions).

Aggiunti: data/sources/champions-probable-formations-md03-2026-27.json; data/normalized/champions-md03-probable-individuals-2026-27.json; scripts/build-champions-md3-probable.cjs; js/pages/champions-md3-probable.mjs; scripts/test-champions-md3-probable.mjs; scripts/check-champions-md3-probable-browser.cjs; questa directory di report, CSV, test browser, snapshot e dati di verifica.

Durante l’intervento sono state rilevate modifiche concorrenti a file Serie A e altre pagine, non prodotte né ripristinate da questa attività. L’elenco completo è in integrity.json. Per questo non viene dichiarata l’invarianza globale dell’intero workspace. Gli input Champions protetti sopra elencati risultano invece identici al confronto con lo snapshot iniziale. Nessuna modifica dei motori Serie A/Champions da questa attività.

## Blocchi prima dell’attivazione individuale

Servono panchine documentate e un universo di giocatori/minuti coerente con i volumi di squadra, oltre alla risoluzione delle identità e delle baseline mancanti. Le discrepanze diagnostiche vanno risolte attraverso i dati e le logiche validate, senza introdurre coefficienti o rinormalizzazioni nuove. Fino ad allora tiri e SOT individuali restano N/D.

Non eseguiti commit, push o deploy da questa attività.
