# Verifica esterna campionato: sette giocatori — 11 novembre 2026

Ambito: stagione 2026/27, prima squadra e campionato domestico separati da Champions, coppe e squadre giovanili. Ricerca su fonti primarie: leghe, club e Opta/Stats Perform in quanto titolare del dato pubblicato. Nessuna modifica a dataset, codice, quote, formule o selezioni in questa ricerca. I numeri seguenti descrivono ciò che le pagine consultate rendono acquisibile, con cache di date diverse; non certificano in blocco l'aggiornamento di ogni metrica all'11 novembre.

## Risultati numerici acquisibili

| Giocatore | Club/competizione 2026/27 | Presenze | Minuti | Gol | Assist | Evidenza primaria |
|---|---|---:|---:|---:|---:|---|
| William Saliba | Arsenal / Premier League | 0 | 0 | 0 | 0 | [Opta, carriera](https://theanalyst.com/players/3767/william-saliba/career), riga esplicita 2026/2027; pagina acquisita direttamente, crawl indicato quattro giorni prima |
| Conor Bradley | Liverpool / Premier League | 0 | 0 | 0 | 0 | [Opta, carriera](https://theanalyst.com/players/4102/conor-bradley/career), riga esplicita 2026/2027; crawl tre settimane prima |
| Giovanni Leoni | Liverpool / Premier League | 0 | 0 | 0 | 0 | [Opta, carriera](https://theanalyst.com/players/4795/giovanni-leoni/career), riga esplicita 2026/2027; crawl due giorni prima |
| Luke Chambers | Liverpool / Premier League | 0 | 0 | 0 | 0 | [Opta, profilo](https://theanalyst.com/players/5346/luke-chambers), pannello EPL 2026/2027; crawl tre settimane prima |
| Hugo Ekitiké | Liverpool / Premier League | 0 | 0 | 0 | 0 | [Opta, carriera](https://theanalyst.com/players/194/hugo-ekitike/career), riga esplicita 2026/2027; crawl ieri |
| Isaac Mabaya | Liverpool / Premier League senior | N/D | N/D | N/D | N/D | [Opta, carriera](https://theanalyst.com/players/6612/isaac-mabaya/career) non espone una riga senior corrente: omissione non trasformata in zero |
| Isaac Mabaya | Liverpool U21 / Premier League 2 | 4 | 263 | 0 | 1 | Stessa pagina Opta, riga PL2 2026/2027; crawl tre giorni prima. Competizione giovanile separata |
| Maxence Caqueret | Como / Serie A | 10 | 429 | 0 | 2 | [Opta, profilo](https://theanalyst.com/players/3476/maxence-caqueret), stagione esplicita 2026/2027; testo aggiornato all'ultima presenza dell'8 novembre |

I cinque zeri in Premier non sono stati dedotti dalle statistiche ESPN vuote: sono valori espressi nelle rispettive righe stagionali delle fonti riportate. Un'importazione deve comunque conservare la data del campione acquisito; una riga zero con crawl vecchio non certifica automaticamente le gare posteriori.

## Distinzione delle competizioni

La scheda Opta Chambers espone separatamente una presenza Champions da cinque minuti. Non va trasferita nei totali Premier. La scheda Opta Caqueret distingue due presenze Champions da 116 minuti dai dieci incontri Serie A da 429 minuti: il recupero locale precedente di una sola presenza europea da 26 minuti non descrive il campionato corrente né l'intera Champions aggiornata. La pagina statistiche dettagliate [Opta Caqueret](https://theanalyst.com/players/3476/maxence-caqueret/stats), aperta direttamente, restituisce intestazioni ma non la tabella numerica; nessun totale tiri/falli viene ricostruito da tale pagina vuota.

## Riscontri ufficiali di contesto e appartenenza

- La [lista Premier 2026/27 del Liverpool](https://www.liverpoolfc.com/news/liverpool-submit-premier-league-squad-list-2026-27?amp=1), pubblicata dal club, include Bradley, Chambers, Mabaya ed Ekitiké nella lista senior. La pagina specifica che i giocatori U21 sono eleggibili fuori dalla lista dei 25. La [lista numeri di maglia della Premier](https://www.premierleague.com/en/news/4725682/all-20-premier-league-clubs-squad-numbers-for-202627-season) include anche Leoni, con il 15. Le liste confermano appartenenza/registrazione, non presenze.
- Il [bollettino infortuni del Liverpool del 3 settembre](https://www.liverpoolfc.com/news/liverpools-injury-list-suspensions-and-availability?amp=1) documenta Bradley, Ekitiké e Leoni in recupero. Un [aggiornamento ufficiale successivo su Leoni](https://stadion-edge.liverpoolfc.com/news/andoni-iraola-gives-update-on-giovanni-leoni-rehabilitation-progress) rinvia il rientro in gruppo alla pausa di novembre. Sono riscontri coerenti con le righe zero, non un conteggio autonomo delle presenze.
- Il [profilo ufficiale di Chambers](https://www.liverpoolfc.com/teams/mens-team/luke-chambers) descrive il prestito al Charlton del gennaio 2026, relativo alla stagione precedente. La lista Premier corrente lo include nel Liverpool: il prestito passato non va esteso automaticamente al 2026/27.
- Il [referto ufficiale Liverpool U21–Brighton del 19 settembre 2026](https://www.liverpoolfc.com/news/u21s-match-report-will-wright-scores-twice-liverpool-beat-brighton-5-1-pl2) registra Mabaya titolare e sostituito al quinto minuto. Conferma una presenza giovanile, senza stabilire il totale senior.

## Limiti delle risposte dinamiche e delle API

Le ricerche del sito Premier mostrano per Saliba ed Ekitiké una riga 2026/27 a zero presenze, ma aprendo direttamente le rispettive [carriere Saliba](https://www.premierleague.com/en/players/462424/william-saliba/career) e [Ekitiké](https://www.premierleague.com/en/players/510663/hugo-ekitik%C3%A9/career) la rappresentazione accessibile al web tool restituisce soltanto la shell. Perciò il riscontro numerico riportato sopra si appoggia alle righe esplicite Opta, non alla shell vuota.

Il parent ha inoltre verificato gli endpoint ESPN in `data/raw/champions-domestic-seven-2026-11-11/`: la forma `/athletes/{id}/eventlog?season=2026` può ignorare il parametro e restituire riferimenti a stagioni precedenti. La forma con stagione nel percorso, `/leagues/{league}/seasons/2026/athletes/{id}/eventlog`, è quella da verificare nel payload. Per Saliba e Chambers risultano 38 elementi senza presenze `played`; per Bradley, Leoni, Mabaya ed Ekitiké alcune risposte contengono solo un `$ref`, senza `events`: ciò non dimostra zero presenze. Per Caqueret esistono elementi con `played=true`, da riconciliare tramite referti singoli. Il report del parent deve conservare gli URL e gli hash delle acquisizioni API definitive prima di qualsiasi promozione canonica.

## Esito operativo della ricerca

- Cinque casi Premier hanno un riscontro primario esplicito di zero presenze nel campione stagionale pubblicato, con limiti di freschezza dichiarati.
- Mabaya ha statistiche giovanili positive, che devono restare separate; il totale senior non è stato certificato da una risposta numerica corrente in questa ricerca.
- Caqueret ha un campione Serie A positivo e sostanziale: dieci presenze e 429 minuti. Servono l'acquisizione e la riconciliazione dei referti domestici per ripristinare la tabella con tutte le metriche coerenti.

## Controverifica diretta ESPN Caqueret

Acquisito il registro con stagione esplicita `/leagues/ita.1/seasons/2026/athletes/265912/eventlog?limit=100` e controllati gli 11 referti segnalati played=true. Il referto 401874752 del 20 settembre espone appearances=0: escluso, nonostante il flag del registro. Dieci presenze effettive dal 22 agosto all’8 novembre: 429 minuti stimati su 90 minuti regolamentari dalle sostituzioni, 0 gol, 2 assist, 8 tiri, 3 SOT, 1 giallo. Presenze, gol e assist concordano con Opta. Il totale minuti stimato coincide con Opta ma resta marcato come stima nel ricalcolo locale. Dettaglio riproducibile e totali falli in `output/champions-domestic-seven-caqueret-audit.json`; risposte originali in `data/raw/champions-domestic-seven-2026-11-11/`. Campione domestico separato dalla presenza Champions già collegata: nessun dato di produzione modificato in questa verifica.

Manifest con URL, timestamp e SHA-256 delle risposte API: `output/champions-domestic-seven-evidence-manifest.json`. Le risposte con parametro season ignorato sono conservate come evidenza del limite, non utilizzate per i totali correnti.
