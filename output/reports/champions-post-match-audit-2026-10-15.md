# Audit post-partita Champions League — 13–14 ottobre 2026

Data: 15 ottobre 2026. Audit diagnostico locale; nessuna modifica a motore, Lettura, Schedina o quote.

## Sintesi e perimetro

Risultati finali verificati per tutte le 18 partite. Recuperate **117 selezioni nell’ultimo snapshot prepartita di ciascuna gara**, più **3 contratti pubblicati in precedenza e rimossi prima del calcio d’inizio** (appendice). L’unione storica contiene 120 contratti distinti per fixture/selectionId. Il file dei 58 mercati riguarda soltanto le nove gare del 13 ottobre: non è l’universo delle 18 gare.

Sul sottoinsieme giocabile e statisticamente verificabile: **73 vinte, 31 perse, 9 grigie**, puntato 104.00 €, ritorno 115.05 €, netto 11.05 €, **ROI 10.63%**, hit rate 70.19%. È una simulazione condizionata alla copertura, non il ROI definitivo di tutta la giornata né una liquidazione Sisal.

## Aggiornamento — recupero esclusivo dei 36 GRIGIO

**Nuovi esiti: 21 VERDE, 6 ROSSO, 0 VOID; ancora 9 GRIGIO.** Gli 81 esiti precedentemente decisi e i 3 contratti archiviati prima del kickoff restano invariati. Contratti, probabilità e quote confrontati integralmente con il report congelato.

Conteggio di tutti i 117 contratti finali, compresi i non titolari: VERDE 74, ROSSO 34, GRIGIO 9, VOID 0. I quattro non titolari hanno partecipato: **1 VERDE e 3 ROSSO, nessun VOID**; restano esclusi dal portafoglio filtrato secondo la policy originaria, ma hanno esito nel rendimento originario. Non si reintroducono selezioni operative.

| Segmento | Tot | V | P | Grigi | Esclusi | Hit % | Quota V | Quota P | Puntato € | Lordo € | Netto € | ROI % |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Prima: portafoglio filtrato | 117 | 53 | 28 | 36 | 4 | 65.43 | 1.62 | 2.23 | 81 | 85.90 | 4.90 | 6.05 |
| Dopo: portafoglio filtrato | 117 | 73 | 31 | 9 | 4 | 70.19 | 1.58 | 2.20 | 104 | 115.05 | 11.05 | 10.63 |
| Dopo: originario, inclusi non titolari partecipanti | 117 | 74 | 34 | 9 | 0 | 68.52 | 1.57 | 2.18 | 108 | 116.30 | 8.30 | 7.69 |

### Regole Sisal effettivamente recuperate

Somma del giocatore nominato e del suo eventuale sostituto diretto; per il subentrante non si sommano i dati del titolare uscente. Partecipazione anche breve valida; rimborso per mancata partecipazione. SOT includono legni nel contratto specifico, senza contare due volte un unico tiro palo-gol. Nessun supplementare nelle fixture MD2. [PDF Sisal, pagine stampate 441–442](https://www.sisal.it/content/dam/new-dam/italy/canali/sisal-it/doc-pdf/scommesse/info-scommesse/calcio.pdf). Documento corrente consultato il 15 ottobre, non copia immutabile datata al 13 ottobre; nessuna ricevuta di liquidazione Sisal acquisita.

### Registro dei 36 casi

| Caso / selectionId | Pronostico | Prima → dopo | Prova e calcolo | Fonti | Fonte necessaria se irrisolto |
| --- | --- | --- | --- | --- | --- |
| 1 / sisal:4858138:821927618:5376863469 | Lens - Sporting CP / Odsonne Édouard over 0,5 SOT · sostituto incluso · pali/traverse inclusi | GRIGIO → VERDE | Édouard entra al 58 per Ivanović: un SOT proprio al 62, corroborato dalla tabella individuale (33 minuti, 1 SOT). 1 > 0,5, senza contributi del predecessore. Non titolare ma partecipante; nessun VOID. | [1](https://www.statmuse.com/fc/match/-113884), [2](https://fbref.com/en/players/0562b7f1/matchlogs/2026-2027/Odsonne-Edouard-Match-Logs) | — |
| 2 / sisal:4858138:821927322:5376857359 | Lens - Sporting CP / Franjo Ivanović over 1,5 tiri · sostituto incluso | GRIGIO → VERDE | Due conclusioni fuori e una descritta in porta nella cronaca prima del cambio: almeno 3 tiri propri > 1,5. Non serve conoscere i tiri di Édouard. Eliminato il testo estraneo su Rashford. | [1](https://www.statmuse.com/fc/match/-113884) | — |
| 3 / sisal:4858138:821928592:5376859993 | Lens - Sporting CP / Odsonne Édouard over 3,5 tiri · sostituto incluso | GRIGIO → ROSSO | Riga FBref indicizzata del 13/10: subentrante, 33 minuti, 1 tiro e 1 SOT. Nessuna successiva uscita nella cronologia completa dei cambi: il DUO nominato Édouard vale 1 tiro, non 3 di Ivanović + 1. 1 < 3,5. Non titolare, non VOID. | [1](https://fbref.com/en/players/0562b7f1/matchlogs/2026-2027/Odsonne-Edouard-Match-Logs), [2](https://www.statmuse.com/fc/match/-113884) | — |
| 4 / sisal:4858138:821927323:5376857369 | Lens - Sporting CP / Issa Doumbia over 1,5 tiri · sostituto incluso | GRIGIO → VERDE | Cronaca: tiro fuori al 73 e gol al 74, entrambi prima del cambio con Pedro Lima. Almeno 2 tiri > 1,5. Nessuna dipendenza dal conteggio di Rashford o dal sostituto. | [1](https://www.statmuse.com/fc/match/-113884) | — |
| 5 / sisal:4858146:821922356:5376832575 | Arsenal - Lille / Bukayo Saka over 2,5 tiri · sostituto incluso | GRIGIO → ROSSO | Riga FBref del 13/10: subentrante, 26 minuti, 1 tiro (il gol), nessun cambio successivo. 1 < 2,5. Non si aggiunge il tiro di Madueke, uscito al suo ingresso. | [1](https://fbref.com/en/players/bc7dc64d/all_comps/Bukayo-Saka-Stats---All-Competitions), [2](https://www.statmuse.com/fc/match/-113886) | — |
| 6 / sisal:4858177:821890410:5376642298 | Atlético de Madrid - Manchester United / Ademola Lookman over 2,5 tiri · sostituto incluso | GRIGIO → ROSSO | Riga FBref del 13/10: subentrante, 20 minuti, 1 tiro/1 gol; resta in campo fino al termine. 1 < 2,5. I 3 tiri di Baena, che gli ha lasciato il posto, non si sommano al contratto Lookman. | [1](https://fbref.com/en/players/7c104bb7/all_comps/Ademola-Lookman-Stats---All-Competitions), [2](https://www.statmuse.com/fc/match/-113887) | — |
| 7 / sisal:4858180:822318867:5378989938 | Inter - Club Brugge / Hugo Vetlesen over 0,5 SOT · sostituto incluso · pali/traverse inclusi | GRIGIO → GRIGIO | FBref riporta 0 tiri/0 SOT in 60 minuti; precedente tabella StatMuse riporta 2 SOT. Cambio diretto con Félix Lemaréchal documentato. Perdita non dimostrata senza riconciliare anche SOT e legni del sostituto. | [1](https://www.statmuse.com/fc/match/-113889), [2](https://fbref.com/en/players/aa982b0f/matchlogs/2026-2027/summary/Hugo-Vetlesen-Match-Logs) | Referto UEFA/Opta individuale di Vetlesen e Lemaréchal, legni attribuiti e revisione del conteggio SOT. |
| 8 / sisal:4858143:822328741:5379081413 | Galatasaray - Barcelona / Victor Osimhen over 1,5 SOT · sostituto incluso · pali/traverse inclusi | GRIGIO → ROSSO | FBref: 1 tiro totale, 90 minuti, 0 SOT; cronaca descrive 1 SOT. Galatasaray ha 0 legni nella tabella e Osimhen non è sostituito: il contratto assume 0 oppure 1, comunque < 1,5. La discordanza sul conteggio resta annotata, ma non cambia l'esito. | [1](https://fbref.com/en/players/8c90fd7a/matchlogs/2026-2027/summary/Victor-Osimhen-Match-Logs), [2](https://www.statmuse.com/fc/match/-113890) | — |
| 9 / sisal:4858176:822440794:5379720627 | Leipzig - PSV Eindhoven / Christopher Nkunku over 0,5 SOT · sostituto incluso · pali/traverse inclusi | GRIGIO → GRIGIO | FBref: 90 minuti, 1 tiro, 0 SOT; cronaca StatMuse: SOT al 67. La soglia 0,5 separa le due interpretazioni. La conferma utente pregressa non è sostituita a un referto provider. | [1](https://www.statmuse.com/fc/match/-113892), [2](https://fbref.com/en/players/7c56da38/matchlogs/2026-2027/summary/Christopher-Nkunku-Match-Logs) | Opta/UEFA: classificazione del tiro al 67 e attribuzione di eventuali legni a Nkunku. |
| 10 / sisal:4858139:821934797:5376899039 | Villarreal - Napoli / Gerard Moreno over 1,5 tiri · sostituto incluso | GRIGIO → VERDE | Due tiri fuori distinti nella cronaca (prima del cambio diretto con Oluwaseyi): almeno 2 > 1,5. Rimossa la motivazione copiata da Rashford; sostituto non necessario. | [1](https://www.statmuse.com/fc/match/-113888) | — |
| 11 / sisal:4858181:822445310:5379737948 | Feyenoord - Como / Nacho Ferri over 2,5 tiri · sostituto incluso | GRIGIO → GRIGIO | FBref indicizzato riporta 1 tiro; cambio al 79 con Tobias van den Elshout confermato. Mancano tiri totali espliciti del sostituto: la sola assenza di tentativi nella cronaca non prova zero. | [1](https://www.statmuse.com/fc/match/-113893), [2](https://ofstats.com/matches/view/feyenoord-como-2026-10-14), [3](https://fbref.com/en/players/58468842/all_comps/Nacho-Ferri-Stats---All-Competitions) | Conteggio completo UEFA/Opta dei tiri di Ferri e Tobias van den Elshout nel 14/10, con ID verificati. |
| 12 / sisal:4858181:822445073:5379738881 | Feyenoord - Como / Nicolás Paz over 2,5 tiri · sostituto incluso | GRIGIO → VERDE | PlayerStats riporta 3 tiri di Nico Paz. La cronaca OFStats documenta tiro respinto al 56 e conclusioni fuori al 70 e 89; restano tiri totali, senza promuoverli a SOT. Almeno 3 > 2,5. | [1](https://playerstats.football/fixture/feyenoord/como/2026-10-14), [2](https://ofstats.com/matches/view/feyenoord-como-2026-10-14) | — |
| 13 / sisal:4858181:822308423:5379056413 | Feyenoord - Como / Feyenoord over 4,5 corner | GRIGIO → GRIGIO | Sky Sports e OFStats indicano 4 corner Feyenoord; StatMuse e altra tabella ne indicano 5. L'Over 4,5 cambia segno. Nessuna scelta della fonte in base al risultato desiderato. | [1](https://www.skysports.com/football/feyenoord-vs-como/stats/577626), [2](https://ofstats.com/matches/view/feyenoord-como-2026-10-14), [3](https://www.statmuse.com/fc/match/-113893) | Referto corner UEFA/Opta finale, con distinzione assegnati/eseguiti ed eventuale rettifica di fine partita. |
| 14 / sisal:4858181:822445407:5379748908 | Feyenoord - Como / Feyenoord over 3,5 tiri in porta | GRIGIO → VERDE | Sky Sports e PlayerStats riportano entrambi 5 SOT Feyenoord: 5 > 3,5. Il conflitto sui corner non invalida questa metrica concorde. | [1](https://www.skysports.com/football/feyenoord-vs-como/stats/577626), [2](https://playerstats.football/fixture/feyenoord/como/2026-10-14) | — |
| 15 / sisal:4858181:822445292:5379737866 | Feyenoord - Como / Nacho Ferri over 0,5 SOT · sostituto incluso · pali/traverse inclusi | GRIGIO → GRIGIO | Ferri ha 0 SOT nella tabella/FBref ma la cronaca lo descrive in porta. Feyenoord ha 2 legni complessivi non attribuiti qui ai giocatori; mancano dati completi del sostituto van den Elshout. Non basta 0 SOT standard per dichiarare perso il DUO con legni. | [1](https://www.statmuse.com/fc/match/-113893), [2](https://www.skysports.com/football/feyenoord-vs-como/stats/577626), [3](https://fbref.com/en/players/58468842/all_comps/Nacho-Ferri-Stats---All-Competitions) | Eventi di tiro con classificazione e legni per Ferri e van den Elshout, provider UEFA/Opta. |
| 16 / sisal:4858181:822444815:5379737104 | Feyenoord - Como / Nacho Ferri over 1,5 SOT · sostituto incluso · pali/traverse inclusi | GRIGIO → GRIGIO | Stesse lacune del contratto Ferri 0,5: attribuzione dei 2 legni di squadra e conteggi del sostituto non disponibili. Non esiste un limite superiore provato sotto 1,5. | [1](https://www.statmuse.com/fc/match/-113893), [2](https://www.skysports.com/football/feyenoord-vs-como/stats/577626) | Referto completo SOT+legni Ferri e van den Elshout, con assenza/presenza di altri cambi certificata. |
| 17 / sisal:4858182:822400587:5379489006 | Roma - Real Madrid / Paulo Dybala over 1,5 tiri · sostituto incluso | GRIGIO → VERDE | Dybala 1 tiro nei primi 45 minuti; sostituzione diretta con Rodrigo Mora, che la riga FBref del 14/10 accredita di 2 tiri. Somma DUO 1+2=3 > 1,5. | [1](https://fbref.com/en/players/e0921a4f/matchlogs/2026-2027/summary/Paulo-Dybala-Match-Logs), [2](https://fbref.com/en/players/fc94b80c/matchlogs/2026-2027/summary/Rodrigo-Mora-Match-Logs), [3](https://www.statmuse.com/fc/match/-113898) | — |
| 18 / sisal:4858182:822397215:5379468394 | Roma - Real Madrid / Paulo Dybala over 3,5 tiri · sostituto incluso | GRIGIO → ROSSO | Contratto originale 3,5: Dybala 1 + sostituto diretto Rodrigo Mora 2 = 3, inferiore a 3,5. Nessun trasferimento delle statistiche di un altro compagno. | [1](https://fbref.com/en/players/e0921a4f/matchlogs/2026-2027/summary/Paulo-Dybala-Match-Logs), [2](https://fbref.com/en/players/fc94b80c/matchlogs/2026-2027/summary/Rodrigo-Mora-Match-Logs), [3](https://www.statmuse.com/fc/match/-113898) | — |
| 19 / sisal:4858178:822473431:5379916496 | Aston Villa - Fenerbahçe / Nicolas Jackson over 2,5 tiri · sostituto incluso | GRIGIO → VERDE | Tabella StatMuse: 3 SOT propri; anche i due gol e il distinto tiro fuori della cronaca provano almeno 3 conclusioni. 3 > 2,5, senza bisogno del contributo di Abraham. | [1](https://www.statmuse.com/fc/match/-113895), [2](https://www.uefa.com/uefachampionsleague/news/02aa-21d3f8c574f1-e140f41454d4-1000--champions-league-round-up-real-madrid-and-paris-headline-r/) | — |
| 20 / sisal:4858178:822464266:5379907715 | Aston Villa - Fenerbahçe / Mason Greenwood over 0,5 SOT · sostituto incluso · pali/traverse inclusi | GRIGIO → VERDE | Riga FBref del 14/10: Greenwood, Fenerbahçe contro Aston Villa, 68 minuti, 3 tiri e 1 SOT. Il singolo SOT proprio basta per Over 0,5; nessuna assunzione su legni o Nene Dorgeles. | [1](https://fbref.com/en/players/58eee997/all_comps/Mason-Greenwood-Stats---All-Competitions), [2](https://www.statmuse.com/fc/match/-113895) | — |
| 21 / sisal:4858178:822464375:5379908171 | Aston Villa - Fenerbahçe / Johan Manzambi over 1,5 tiri · sostituto incluso | GRIGIO → VERDE | Tentativo individuale al minuto 8 e gol al 12: almeno due conclusioni distinte > 1,5. Il conflitto fra descrizione in porta e tabella SOT=1 non cambia il numero minimo di tiri totali: la prima conclusione può essere riclassificata senza cancellarla. Il contributo del sostituto João Gomes non è necessario; non si assegna un nuovo actual SOT. | [1](https://www.statmuse.com/fc/match/-113895), [2](https://www.uefa.com/uefachampionsleague/news/02aa-21d3f8c574f1-e140f41454d4-1000--champions-league-round-up-real-madrid-and-paris-headline-r/) | — |
| 22 / sisal:4858178:822481714:5379908219 | Aston Villa - Fenerbahçe / Mason Greenwood over 3,5 tiri · sostituto incluso | GRIGIO → VERDE | Righe FBref del 14/10: Greenwood 3 tiri in 68 minuti, Nene Dorgeles 1 tiro in 22. StatMuse documenta il cambio diretto: somma 4 > 3,5. | [1](https://fbref.com/en/players/58eee997/all_comps/Mason-Greenwood-Stats---All-Competitions), [2](https://fbref.com/en/players/e2f16dcc/all_comps/Nene-Dorgeles-Stats---All-Competitions), [3](https://www.statmuse.com/fc/match/-113895) | — |
| 23 / sisal:4858144:822494796:5380035442 | Shakhtar Donetsk - AEK Athens / Kauã Elias over 1,5 tiri · sostituto incluso | GRIGIO → GRIGIO | PlayerStats espone 1 tiro di Kauã Elias; al 87 entra Luca Meirelles. Mancano tiri totali completi e identificati del sostituto. Il suo xG pari a zero non prova zero tiri. | [1](https://www.statmuse.com/fc/match/-113899), [2](https://playerstats.football/fixture/shakhtar-donetsk/aek-athens/2026-10-14) | Referto individuale tiri di Kauã Elias e Luca Meirelles nel 14/10 da UEFA/Opta. |
| 24 / sisal:4858142:822436691:5379692496 | Bodø/Glimt - Borussia Dortmund / Patrick Berg over 1,5 tiri · sostituto incluso | GRIGIO → ROSSO | Successivo recupero della riga FBref indicizzata del 14/10: Berg, Bodø/Glimt contro Dortmund, 90 minuti e 1 tiro totale. Nessun sostituto; 1 < 1,5. Il profilo OFStats fermo al 10/10 è scartato e non interpretato come zero. | [1](https://www.statmuse.com/fc/match/10-14-2026-bod-vs-dor-113900), [2](https://fbref.com/en/players/e4114f5d/matchlogs/2026-2027/summary/Patrick-Berg-Match-Logs) | — |
| 25 / sisal:4858142:822436384:5379691483 | Bodø/Glimt - Borussia Dortmund / Bodø/Glimt over 10,5 tiri | GRIGIO → VERDE | Bodø/Glimt: 11 tiri totali, concordi tra Sky Sports e StatMuse. 11 > 10,5. I respinti restano parte del totale senza essere aggiunti una seconda volta. | [1](https://www.skysports.com/football/bodo-glimt-vs-borussia-dortmund/577625), [2](https://www.statmuse.com/fc/match/10-14-2026-bod-vs-dor-113900) | — |
| 26 / sisal:4858142:822436643:5379692328 | Bodø/Glimt - Borussia Dortmund / Sondre Auklend over 2,5 tiri · sostituto incluso | GRIGIO → GRIGIO | Risultato indicizzato OFStats espone 0 tiri e 90 minuti il 14/10, ma la vista corrente consultata è una copia precedente e non permette riconferma integrale. Nessun referto UEFA/Opta o secondo conteggio completo acquisito: non si dichiara perso dalla sola assenza di tiri narrati. | [1](https://www.statmuse.com/fc/match/10-14-2026-bod-vs-dor-113900), [2](https://ofstats.com/player/sondre-auklend) | Tabellino individuale datato 14/10, con tiri totali e 90 minuti di Auklend, preferibilmente UEFA/Opta. |
| 27 / sisal:4858174:822308666:5379057520 | Manchester City - Paris Saint-Germain / Manchester City over 4,5 corner | GRIGIO → VERDE | StatMuse registra 11 corner Manchester City e descrive almeno cinque esecuzioni distinte prima dell'intervallo. Anche senza il totale finale, il limite inferiore 5 supera 4,5. | [1](https://www.statmuse.com/fc/match/-113896) | — |
| 28 / sisal:4858174:822407528:5379562023 | Manchester City - Paris Saint-Germain / Ousmane Dembélé over 1,5 tiri · sostituto incluso | GRIGIO → VERDE | Dembélé segna, poi è sostituito direttamente da Ferran Torres. UEFA documenta il rigore di Torres parato nel finale: almeno 1 tiro di Dembélé + 1 di Torres = 2 > 1,5. Scartata l'attribuzione errata a Donnarumma nella cronaca StatMuse. | [1](https://www.statmuse.com/fc/match/-113896), [2](https://www.uefa.com/uefachampionsleague/news/02aa-21d3f8c574f1-e140f41454d4-1000--champions-league-round-up-real-madrid-and-paris-headline-r/) | — |
| 29 / sisal:4858175:822427746:5379618392 | Real Betis - Porto / Troy Parrott over 2,5 tiri · sostituto incluso | GRIGIO → GRIGIO | Cambio diretto Parrott → Cucho Hernández al 62, con gol del sostituto. Questo prova almeno 1 tiro, non il totale > 2,5. Mancano totali tiri esatti di entrambi. | [1](https://www.statmuse.com/fc/match/-113897), [2](https://www.uefa.com/uefachampionsleague/news/02aa-21d3f8c574f1-e140f41454d4-1000--champions-league-round-up-real-madrid-and-paris-headline-r/) | Tiri totali UEFA/Opta di Parrott e Cucho Hernández, inclusi respinti, fino al termine. |
| 30 / sisal:4858175:822427728:5379618338 | Real Betis - Porto / Troy Parrott over 0,5 SOT · sostituto incluso · pali/traverse inclusi | GRIGIO → VERDE | Cucho Hernández entra per Parrott al 62 e segna al 74. Almeno 1 SOT del sostituto diretto > 0,5; eventuali tiri e legni di Parrott non sono necessari. | [1](https://www.statmuse.com/fc/match/-113897), [2](https://www.uefa.com/uefachampionsleague/news/02aa-21d3f8c574f1-e140f41454d4-1000--champions-league-round-up-real-madrid-and-paris-headline-r/) | — |
| 31 / sisal:4858175:822427450:5379631228 | Real Betis - Porto / André Silva over 0,5 SOT · sostituto incluso · pali/traverse inclusi | GRIGIO → VERDE | André Silva esce per Samu al 59, Samu segna al 61: almeno 1 SOT del sostituto diretto > 0,5. Il palo-gol è una sola conclusione, non due. | [1](https://www.statmuse.com/fc/match/-113897), [2](https://www.uefa.com/uefachampionsleague/news/02aa-21d3f8c574f1-e140f41454d4-1000--champions-league-round-up-real-madrid-and-paris-headline-r/) | — |
| 32 / sisal:4858175:822427489:5379632168 | Real Betis - Porto / Porto over 10,5 tiri | GRIGIO → VERDE | Porto 11 tiri totali, concordi Sky Sports e StatMuse: 11 > 10,5. Nessuna somma aggiuntiva dei tiri respinti al totale già comprensivo. | [1](https://www.skysports.com/football/real-betis-vs-porto/6735654794811009232), [2](https://www.statmuse.com/fc/match/-113897) | — |
| 33 / sisal:4858175:822426842:5379630012 | Real Betis - Porto / Abde Ezzalzouli over 1,5 tiri · sostituto incluso | GRIGIO → VERDE | FBref indicizzato: 90 minuti e 5 tiri, di cui 2 SOT, nel Betis–Porto del 14/10. 5 > 1,5; non occorre un sostituto. | [1](https://fbref.com/en/players/bed68338/all_comps/Abde-Ezzalzouli-Stats---All-Competitions), [2](https://www.statmuse.com/fc/match/-113897) | — |
| 34 / sisal:4858175:822427716:5379618278 | Real Betis - Porto / Abde Ezzalzouli over 3,5 tiri · sostituto incluso | GRIGIO → VERDE | Stessa riga originale del 14/10: 5 tiri in 90 minuti. 5 > 3,5, senza modificare soglia, quota o previsione. | [1](https://fbref.com/en/players/bed68338/all_comps/Abde-Ezzalzouli-Stats---All-Competitions), [2](https://www.statmuse.com/fc/match/-113897) | — |
| 35 / sisal:4858140:822497290:5380053783 | Slovan Bratislava - Stuttgart / Deniz Undav over 2,5 tiri · sostituto incluso | GRIGIO → VERDE | Cronaca: una conclusione al 24, gol al 29 e ulteriore tentativo al 79; almeno 3 tiri propri > 2,5. Non è necessario contare due volte le due descrizioni della conclusione al 24. Sufficiente senza sommare compagni o sostituti. | [1](https://www.statmuse.com/fc/match/-113901), [2](https://www.uefa.com/uefachampionsleague/news/02aa-21d3f8c574f1-e140f41454d4-1000--champions-league-round-up-real-madrid-and-paris-headline-r/) | — |
| 36 / sisal:4858140:822491294:5379978203 | Slovan Bratislava - Stuttgart / Bilal El Khannouss over 1,5 tiri · sostituto incluso | GRIGIO → VERDE | El Khannouss effettua una conclusione al 44 prima di uscire al 81 per Demirović, che segna al 90. Il DUO ha almeno 2 tiri > 1,5; l'ulteriore tentativo al 62 non è necessario e la sua classificazione SOT resta separata. | [1](https://www.statmuse.com/fc/match/-113901), [2](https://www.uefa.com/uefachampionsleague/news/02aa-21d3f8c574f1-e140f41454d4-1000--champions-league-round-up-real-madrid-and-paris-headline-r/) | — |

### Mapping, sostituti e riconciliazioni

- Tre ragioni pregresse copiavano il testo Rashford/Amad sotto Ivanović, Doumbia e Gerard Moreno. Sostituite esclusivamente nell'audit con eventi delle rispettive gare, senza cambiare player ID o contratto.
- Édouard sostituisce Ivanović al 58; i tiri precedenti di Ivanović non appartengono al contratto nominato Édouard. Saka subentra a Madueke e Lookman a Baena: nessuna somma inversa.
- Nicolas/Nicolás/Nico Paz, Ferri Julia I./Ignacio Ferri Julià/Nacho Ferri e T. Elshout Van Den/Tobias van den Elshout sono alias espliciti contestualizzati per club e fixture. L'associazione usa il selectionId congelato e il canonicalPlayerId, mai similarità approssimativa.
- André Silva → Samu Aghehowa (S. Omorodion nelle cronache), Parrott → Cucho/J. Hernández, Dybala → Rodrigo Mora, Greenwood → Nene Dorgeles, El Khannouss → Ermedin Demirović: catene dirette documentate, non sostituti scelti per ruolo.
- StatMuse City–PSG attribuisce nella cronaca il rigore fallito a G. Donnarumma/Manchester City, mentre la cronaca UEFA identifica il tiro di Ferran Torres/PSG. L'evento nominativo StatMuse è scartato: per il DUO Dembélé si usa il tentativo di Torres documentato da UEFA e la sostituzione diretta documentata separatamente.
- StatMuse marca made a shot on target in cronaca per Ferri e Nkunku, mentre le tabelle e/o FBref riportano zero SOT. Non si trasferiscono questi eventi a un diverso giocatore e non si usa la descrizione generica come referto definitivo.

### Limiti del recupero

- Le righe FBref con data, avversario, minuti e intestazioni Sh/SoT sono state lette nel risultato indicizzato del motore di ricerca. L'apertura diretta restituisce 403: non sono presentate come referti ufficiali o pagine rilette integralmente. Estratti di ricerca conservati nella sottocartella di ricerca.
- Le pagine UEFA match non espongono tabelle individuali nel lettore; tentativi SPS.pdf per 2049584, 2049585, 2049580 e 2049586 non accessibili. Il round-up UEFA è accessibile.
- I conteggi parziali delle cronache sono utilizzati solo come limiti inferiori per OVER, mai per provare assenza di tiri o un ROSSO.
- Non si applica una maggioranza di siti a una discordanza che attraversa la soglia. Un conflitto non decisivo può invece essere mantenuto come intervallo: Osimhen 0 o 1 SOT, nessun legno e 90 minuti, resta sotto 1,5 in entrambe le versioni.
- Profilo OFStats di Berg restituisce una vista ferma al 10 ottobre; l'assenza della riga del 14 non è zero. Anche le differenze tra risultati indicizzati e viste correnti sono dichiarate.

I nove casi residui sono esplicitati singolarmente nel registro: nessun ROSSO da dato mancante, nessun VOID da semplice panchina e nessuna ricostruzione del forecast. Fonte primaria individuale preferibile: Player Summary Statistics UEFA oppure referto Opta del match con ID, tentativi, esito di tiro, legni e sostituzioni; per i corner serve il conteggio finale riconciliato.

## 1. Provenienza e cronologia

Il contenuto è estratto con `git show` dall’ultimo commit del file Schedina strettamente precedente al kickoff di ogni fixture (Europe/Rome, UTC+02). Sono controllati anche i timestamp di generazione del forecast e della quota nel contratto. Il commit è prova di disponibilità nel repository, non prova del momento di pubblicazione online: i log di deploy non sono presenti nel dataset di audit. Non si usa il timestamp globale attuale come prova per tutte le gare. Quote, probabilità, proiezioni, etichette e modificatori sono copiati dai blob, senza ricalcoli. JSON allegato conserva i contratti completi e SHA256 del payload originario.

Le selezioni tolte dopo la partita restano nel campione originale. Le selezioni tolte prima della partita sono archiviate separatamente: non vengono reintrodotte nel portafoglio finale. Il confronto operativo attuale è un controfattuale post-partita e non dimostra l’efficacia storica del filtro. Gli snapshot completi MD1 descritti nella Fase 10 erano post-kickoff: non sono sostituti degli originali MD2. Le proiezioni in Lettura richiamate dai contratti sono point forecast; non si trasformano in ulteriori scommesse senza quota e contratto pubblicato.

| Fixture | Data | Partita | Finale | Mercati | Commit | Disponibile alle |
| --- | --- | --- | --- | --- | --- | --- |
| ucl-2026-27-md02-01 | 2026-10-13 | Lens — Sporting CP | 0-2 | 6 | 8296bf6a | 2026-10-13T18:10:51+02:00 |
| ucl-2026-27-md02-02 | 2026-10-13 | Sabah — Slavia Praha | 2-0 | 2 | 8296bf6a | 2026-10-13T18:10:51+02:00 |
| ucl-2026-27-md02-03 | 2026-10-13 | Arsenal — Lille | 3-0 | 9 | c3f193ba | 2026-10-13T20:19:23+02:00 |
| ucl-2026-27-md02-04 | 2026-10-13 | Atlético de Madrid — Manchester United | 2-0 | 8 | c3f193ba | 2026-10-13T20:19:23+02:00 |
| ucl-2026-27-md02-05 | 2026-10-13 | Inter — Club Brugge | 3-4 | 7 | c3f193ba | 2026-10-13T20:19:23+02:00 |
| ucl-2026-27-md02-06 | 2026-10-13 | Galatasaray — Barcelona | 1-4 | 7 | c3f193ba | 2026-10-13T20:19:23+02:00 |
| ucl-2026-27-md02-07 | 2026-10-13 | Leipzig — PSV Eindhoven | 1-0 | 6 | c3f193ba | 2026-10-13T20:19:23+02:00 |
| ucl-2026-27-md02-08 | 2026-10-13 | Viking — Bayern München | 3-3 | 7 | c3f193ba | 2026-10-13T20:19:23+02:00 |
| ucl-2026-27-md02-09 | 2026-10-13 | Villarreal — Napoli | 3-1 | 6 | c3f193ba | 2026-10-13T20:19:23+02:00 |
| ucl-2026-27-md02-10 | 2026-10-14 | Feyenoord — Como | 3-2 | 8 | 0bca2cff | 2026-10-14T18:04:51+02:00 |
| ucl-2026-27-md02-11 | 2026-10-14 | LASK — Liverpool | 3-6 | 6 | 0bca2cff | 2026-10-14T18:04:51+02:00 |
| ucl-2026-27-md02-12 | 2026-10-14 | Roma — Real Madrid | 3-4 | 11 | d4ae4f28 | 2026-10-14T20:22:16+02:00 |
| ucl-2026-27-md02-13 | 2026-10-14 | Aston Villa — Fenerbahçe | 6-0 | 5 | d4ae4f28 | 2026-10-14T20:22:16+02:00 |
| ucl-2026-27-md02-14 | 2026-10-14 | Shakhtar Donetsk — AEK Athens | 3-1 | 4 | d4ae4f28 | 2026-10-14T20:22:16+02:00 |
| ucl-2026-27-md02-15 | 2026-10-14 | Bodø/Glimt — Borussia Dortmund | 1-0 | 5 | d4ae4f28 | 2026-10-14T20:22:16+02:00 |
| ucl-2026-27-md02-16 | 2026-10-14 | Manchester City — Paris Saint-Germain | 2-4 | 7 | d4ae4f28 | 2026-10-14T20:22:16+02:00 |
| ucl-2026-27-md02-17 | 2026-10-14 | Real Betis — Porto | 3-2 | 7 | d4ae4f28 | 2026-10-14T20:22:16+02:00 |
| ucl-2026-27-md02-18 | 2026-10-14 | Slovan Bratislava — Stuttgart | 0-3 | 6 | d4ae4f28 | 2026-10-14T20:22:16+02:00 |

## 2. Regole di esito e copertura

VERDE/ROSSO indicano verifica statistica del contratto. GRIGIO indica evidenza insufficiente o discordante; non produce perdita. VOID richiede prova della regola applicabile e della condizione di annullamento: nessun VOID viene dedotto dalla sola mancata titolarità. I non titolari sono identificati in un campo indipendente e tolti dalla simulazione filtrata. Le soglie sono quelle originali; i mercati risultati/gol usano il finale nei regolamentari.

Per DUO, un limite inferiore del solo giocatore può provare un OVER; non può provare una perdita. Una perdita richiede il totale completo del giocatore e del sostituto pertinente. Per SOT con legni inclusi non si usa automaticamente il solo SOT standard; i tiri respinti non diventano SOT. Non si applicano probabilità del singolo al contratto DUO. Le conferme utente restano visibili nel JSON come esiti comunicati, ma non risolvono una discordanza tra fonti ufficiali.

- Le nove pagine match UEFA del 14 ottobre espongono un guscio privo delle statistiche nel lettore web.
- Information kits UEFA non espone allegati nel lettore; tentativo PDF 2049584_TS.pdf non riuscito.
- StatMuse Feyenoord: 5 corner contro 4 in un feed secondario; dato non ammesso alla liquidazione. Bodø: tabella SOT di Berg/Hauge e cronaca non concordano, quindi niente actual SOT individuali esatti per queste righe. Il minimo di 3 tiri Hauge usa due conclusioni descritte in porta e una fuori, solo come limite inferiore secondario.
- Kasper Jørgensen: cronaca StatMuse documenta due tiri fuori prima del cambio al 45 con Flecker; Flecker segna due volte. Minimo aggregato DUO 4 tiri, non point actual del solo Jørgensen. Soulé: un SOT al 5 e un tiro fuori al 42, minimo 2 tiri. Haaland: due gol e una parata che impedisce la tripletta nella cronaca UEFA, minimo 3 conclusioni in porta.
- Gli actual individuali secondari sono associati con mapping esplicito al nome canonico esatto dello snapshot; nessun fuzzy matching. Kasper Jørgensen corrisponde a K. Mølgaard Jørgensen #20, Nacho Ferri a N. Ferri #19. Non equivalgono a referto ufficiale.

### Economia per livello di evidenza

| Segmento | Tot | V | P | Grigi | Esclusi | Hit % | Quota V | Quota P | Puntato € | Lordo € | Netto € | ROI % |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Finale prepartita, incluse verifiche statistiche non controverse | 117 | 73 | 31 | 9 | 4 | 70.19 | 1.58 | 2.20 | 104 | 115.05 | 11.05 | 10.63 |
| Solo risultato UEFA e minimi UEFA | 39 | 23 | 16 | 0 | 0 | 58.97 | 1.63 | 2.13 | 39 | 37.56 | -1.44 | -3.69 |
| Unione di tutti i contratti storicamente pubblicati (diagnostica) | 120 | 73 | 31 | 12 | 4 | 70.19 | 1.58 | 2.20 | 104 | 115.05 | 11.05 | 10.63 |

Il precedente archivio statistico dei 58 mercati dichiara 34 verdi e 24 rossi: applicando meccanicamente tali etichette il lordo sarebbe 55.56 € e il ROI -4.21%. **Questo numero non è ammesso come rendimento verificato**, perché include non titolari, interpretazioni DUO e controversie. Non è sommato al campione principale.

## 3. Rendimenti segmentati

Puntata unitaria di 1 € per contratto deciso e giocabile. Hit rate = V/(V+P); lordo = somma quote vinte; netto = lordo − puntato; ROI = netto/puntato. Quote medie separate per vinte e perse. Grigi ed esclusi non entrano nel denominatore. Nessuna multipla; correlazioni tra soglie e giocatori della stessa gara rendono le righe statisticamente dipendenti.

### Partita

| Segmento | Tot | V | P | Grigi | Esclusi | Hit % | Quota V | Quota P | Puntato € | Lordo € | Netto € | ROI % |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Lens - Sporting CP | 6 | 3 | 1 | 0 | 2 | 75.00 | 1.67 | 1.50 | 4 | 5.00 | 1.00 | 25.00 |
| Sabah - Slavia Praha | 2 | 1 | 1 | 0 | 0 | 50.00 | 3.75 | 1.57 | 2 | 3.75 | 1.75 | 87.50 |
| Arsenal - Lille | 9 | 3 | 5 | 0 | 1 | 37.50 | 1.29 | 2.38 | 8 | 3.88 | -4.12 | -51.50 |
| Atlético de Madrid - Manchester United | 8 | 2 | 5 | 0 | 1 | 28.57 | 1.98 | 2.35 | 7 | 3.95 | -3.05 | -43.57 |
| Inter - Club Brugge | 7 | 5 | 1 | 1 | 0 | 83.33 | 1.35 | 1.25 | 6 | 6.73 | 0.73 | 12.17 |
| Galatasaray - Barcelona | 7 | 3 | 4 | 0 | 0 | 42.86 | 1.20 | 2.18 | 7 | 3.60 | -3.40 | -48.57 |
| Leipzig - PSV Eindhoven | 6 | 2 | 3 | 1 | 0 | 40.00 | 1.67 | 2.51 | 5 | 3.33 | -1.67 | -33.40 |
| Viking - Bayern München | 7 | 5 | 2 | 0 | 0 | 71.43 | 1.75 | 2.00 | 7 | 8.73 | 1.73 | 24.71 |
| Villarreal - Napoli | 6 | 5 | 1 | 0 | 0 | 83.33 | 1.39 | 1.50 | 6 | 6.93 | 0.93 | 15.50 |
| Feyenoord - Como | 8 | 4 | 0 | 4 | 0 | 100.00 | 1.48 | N/D | 4 | 5.90 | 1.90 | 47.50 |
| LASK - Liverpool | 6 | 4 | 2 | 0 | 0 | 66.67 | 2.29 | 2.45 | 6 | 9.18 | 3.18 | 53.00 |
| Roma - Real Madrid | 11 | 7 | 4 | 0 | 0 | 63.64 | 1.46 | 2.22 | 11 | 10.22 | -0.78 | -7.09 |
| Aston Villa - Fenerbahçe | 5 | 5 | 0 | 0 | 0 | 100.00 | 1.55 | N/D | 5 | 7.75 | 2.75 | 55.00 |
| Shakhtar Donetsk - AEK Athens | 4 | 3 | 0 | 1 | 0 | 100.00 | 1.51 | N/D | 3 | 4.52 | 1.52 | 50.67 |
| Bodø/Glimt - Borussia Dortmund | 5 | 3 | 1 | 1 | 0 | 75.00 | 1.45 | 1.47 | 4 | 4.35 | 0.35 | 8.75 |
| Manchester City - Paris Saint-Germain | 7 | 7 | 0 | 0 | 0 | 100.00 | 1.65 | N/D | 7 | 11.54 | 4.54 | 64.86 |
| Real Betis - Porto | 7 | 6 | 0 | 1 | 0 | 100.00 | 1.54 | N/D | 6 | 9.24 | 3.24 | 54.00 |
| Slovan Bratislava - Stuttgart | 6 | 5 | 1 | 0 | 0 | 83.33 | 1.29 | 3.25 | 6 | 6.45 | 0.45 | 7.50 |

### Mercato

| Segmento | Tot | V | P | Grigi | Esclusi | Hit % | Quota V | Quota P | Puntato € | Lordo € | Netto € | ROI % |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Doppia chance | 9 | 6 | 3 | 0 | 0 | 66.67 | 1.46 | 1.88 | 9 | 8.76 | -0.24 | -2.67 |
| Tiri giocatore | 51 | 33 | 11 | 4 | 3 | 75.00 | 1.58 | 2.26 | 44 | 52.16 | 8.16 | 18.55 |
| Tiri in porta giocatore | 24 | 15 | 4 | 4 | 1 | 78.95 | 1.37 | 2.29 | 19 | 20.56 | 1.56 | 8.21 |
| Esito finale | 9 | 7 | 2 | 0 | 0 | 77.78 | 2.01 | 1.18 | 9 | 14.08 | 5.08 | 56.44 |
| Gol | 13 | 2 | 11 | 0 | 0 | 15.38 | 1.71 | 2.38 | 13 | 3.42 | -9.58 | -73.69 |
| Tiri squadra | 3 | 3 | 0 | 0 | 0 | 100.00 | 1.46 | N/D | 3 | 4.39 | 1.39 | 46.33 |
| Corner squadra | 5 | 4 | 0 | 1 | 0 | 100.00 | 1.85 | N/D | 4 | 7.42 | 3.42 | 85.50 |
| Tiri in porta squadra | 3 | 3 | 0 | 0 | 0 | 100.00 | 1.42 | N/D | 3 | 4.26 | 1.26 | 42.00 |

### Fascia quota

| Segmento | Tot | V | P | Grigi | Esclusi | Hit % | Quota V | Quota P | Puntato € | Lordo € | Netto € | ROI % |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| [1.50,2) | 28 | 13 | 12 | 3 | 0 | 52.00 | 1.70 | 1.65 | 25 | 22.07 | -2.93 | -11.72 |
| [1,1.50) | 57 | 47 | 4 | 3 | 3 | 92.16 | 1.24 | 1.32 | 51 | 58.48 | 7.48 | 14.67 |
| [3,+inf) | 12 | 4 | 5 | 2 | 1 | 44.44 | 3.81 | 3.62 | 9 | 15.25 | 6.25 | 69.44 |
| [2,3) | 20 | 9 | 10 | 1 | 0 | 47.37 | 2.14 | 2.50 | 19 | 19.25 | 0.25 | 1.32 |

### Preferiti e outsider (categorie esclusive)

| Segmento | Tot | V | P | Grigi | Esclusi | Hit % | Quota V | Quota P | Puntato € | Lordo € | Netto € | ROI % |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| preferito | 16 | 12 | 4 | 0 | 0 | 75.00 | 1.55 | 1.62 | 16 | 18.61 | 2.61 | 16.31 |
| altra | 75 | 52 | 14 | 6 | 3 | 78.79 | 1.40 | 1.63 | 66 | 72.99 | 6.99 | 10.59 |
| outsider | 24 | 9 | 11 | 3 | 1 | 45.00 | 2.61 | 3.05 | 20 | 23.45 | 3.45 | 17.25 |
| preferito e outsider | 2 | 0 | 2 | 0 | 0 | 0.00 | N/D | 2.65 | 2 | 0.00 | -2.00 | -100.00 |

### Giocatore

| Segmento | Tot | V | P | Grigi | Esclusi | Hit % | Quota V | Quota P | Puntato € | Lordo € | Netto € | ROI % |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Luis Suárez | 1 | 1 | 0 | 0 | 0 | 100.00 | 1.40 | N/D | 1 | 1.40 | 0.40 | 40.00 |
| Odsonne Édouard | 2 | 0 | 0 | 0 | 2 | N/D | N/D | N/D | 0 | 0.00 | 0.00 | N/D |
| Franjo Ivanović | 1 | 1 | 0 | 0 | 0 | 100.00 | 1.20 | N/D | 1 | 1.20 | 0.20 | 20.00 |
| Issa Doumbia | 1 | 1 | 0 | 0 | 0 | 100.00 | 2.40 | N/D | 1 | 2.40 | 1.40 | 140.00 |
| Bukayo Saka | 1 | 0 | 0 | 0 | 1 | N/D | N/D | N/D | 0 | 0.00 | 0.00 | N/D |
| Ayase Ueda | 3 | 0 | 3 | 0 | 0 | 0.00 | N/D | 2.33 | 3 | 0.00 | -3.00 | -100.00 |
| Eberechi Eze | 1 | 1 | 0 | 0 | 0 | 100.00 | 1.16 | N/D | 1 | 1.16 | 0.16 | 16.00 |
| Benjamin André | 1 | 0 | 1 | 0 | 0 | 0.00 | N/D | 2.50 | 1 | 0.00 | -1.00 | -100.00 |
| Ademola Lookman | 1 | 0 | 0 | 0 | 1 | N/D | N/D | N/D | 0 | 0.00 | 0.00 | N/D |
| Marcus Rashford | 3 | 0 | 3 | 0 | 0 | 0.00 | N/D | 2.55 | 3 | 0.00 | -3.00 | -100.00 |
| Alejandro Grimaldo | 1 | 1 | 0 | 0 | 0 | 100.00 | 2.00 | N/D | 1 | 2.00 | 1.00 | 100.00 |
| Lautaro Martínez | 1 | 1 | 0 | 0 | 0 | 100.00 | 1.16 | N/D | 1 | 1.16 | 0.16 | 16.00 |
| Nicolo Tresoldi | 1 | 1 | 0 | 0 | 0 | 100.00 | 1.57 | N/D | 1 | 1.57 | 0.57 | 57.00 |
| Hakan Çalhanoğlu | 1 | 1 | 0 | 0 | 0 | 100.00 | 1.12 | N/D | 1 | 1.12 | 0.12 | 12.00 |
| Marcus Thuram | 1 | 1 | 0 | 0 | 0 | 100.00 | 1.16 | N/D | 1 | 1.16 | 0.16 | 16.00 |
| Hugo Vetlesen | 1 | 0 | 0 | 1 | 0 | N/D | N/D | N/D | 0 | 0.00 | 0.00 | N/D |
| Victor Osimhen | 2 | 0 | 2 | 0 | 0 | 0.00 | N/D | 1.78 | 2 | 0.00 | -2.00 | -100.00 |
| Lamine Yamal | 1 | 1 | 0 | 0 | 0 | 100.00 | 1.12 | N/D | 1 | 1.12 | 0.12 | 12.00 |
| Dani Olmo | 2 | 1 | 1 | 0 | 0 | 50.00 | 1.20 | 2.75 | 2 | 1.20 | -0.80 | -40.00 |
| Sven Mijnans | 2 | 0 | 2 | 0 | 0 | 0.00 | N/D | 2.61 | 2 | 0.00 | -2.00 | -100.00 |
| Brajan Gruda | 1 | 1 | 0 | 0 | 0 | 100.00 | 1.33 | N/D | 1 | 1.33 | 0.33 | 33.00 |
| Christopher Nkunku | 1 | 0 | 0 | 1 | 0 | N/D | N/D | N/D | 0 | 0.00 | 0.00 | N/D |
| Harry Kane | 2 | 2 | 0 | 0 | 0 | 100.00 | 1.02 | N/D | 2 | 2.04 | 0.04 | 2.00 |
| Michael Olise | 1 | 1 | 0 | 0 | 0 | 100.00 | 1.12 | N/D | 1 | 1.12 | 0.12 | 12.00 |
| Peter Christiansen | 1 | 1 | 0 | 0 | 0 | 100.00 | 1.57 | N/D | 1 | 1.57 | 0.57 | 57.00 |
| Kristoffer Askildsen | 1 | 1 | 0 | 0 | 0 | 100.00 | 4.00 | N/D | 1 | 4.00 | 3.00 | 300.00 |
| Georges Mikautadze | 2 | 2 | 0 | 0 | 0 | 100.00 | 1.29 | N/D | 2 | 2.58 | 0.58 | 29.00 |
| Matteo Politano | 1 | 0 | 1 | 0 | 0 | 0.00 | N/D | 1.50 | 1 | 0.00 | -1.00 | -100.00 |
| Gerard Moreno | 1 | 1 | 0 | 0 | 0 | 100.00 | 1.25 | N/D | 1 | 1.25 | 0.25 | 25.00 |
| Giovanni Di Lorenzo | 1 | 1 | 0 | 0 | 0 | 100.00 | 1.80 | N/D | 1 | 1.80 | 0.80 | 80.00 |
| Nacho Ferri | 3 | 0 | 0 | 3 | 0 | N/D | N/D | N/D | 0 | 0.00 | 0.00 | N/D |
| Anis Hadj Moussa | 1 | 1 | 0 | 0 | 0 | 100.00 | 1.44 | N/D | 1 | 1.44 | 0.44 | 44.00 |
| Nicolás Paz | 1 | 1 | 0 | 0 | 0 | 100.00 | 1.16 | N/D | 1 | 1.16 | 0.16 | 16.00 |
| Kasper Jørgensen | 2 | 2 | 0 | 0 | 0 | 100.00 | 3.25 | N/D | 2 | 6.50 | 4.50 | 225.00 |
| Florian Wirtz | 1 | 1 | 0 | 0 | 0 | 100.00 | 1.40 | N/D | 1 | 1.40 | 0.40 | 40.00 |
| Donyell Malen | 1 | 1 | 0 | 0 | 0 | 100.00 | 1.16 | N/D | 1 | 1.16 | 0.16 | 16.00 |
| Kylian Mbappé | 1 | 1 | 0 | 0 | 0 | 100.00 | 1.02 | N/D | 1 | 1.02 | 0.02 | 2.00 |
| Matías Soulé | 1 | 1 | 0 | 0 | 0 | 100.00 | 1.33 | N/D | 1 | 1.33 | 0.33 | 33.00 |
| Paulo Dybala | 2 | 1 | 1 | 0 | 0 | 50.00 | 1.16 | 2.40 | 2 | 1.16 | -0.84 | -42.00 |
| Marten De Roon | 1 | 1 | 0 | 0 | 0 | 100.00 | 2.00 | N/D | 1 | 2.00 | 1.00 | 100.00 |
| Nicolas Jackson | 1 | 1 | 0 | 0 | 0 | 100.00 | 1.47 | N/D | 1 | 1.47 | 0.47 | 47.00 |
| Mason Greenwood | 2 | 2 | 0 | 0 | 0 | 100.00 | 1.75 | N/D | 2 | 3.50 | 1.50 | 75.00 |
| Johan Manzambi | 1 | 1 | 0 | 0 | 0 | 100.00 | 1.16 | N/D | 1 | 1.16 | 0.16 | 16.00 |
| Aboubakary Koita | 1 | 1 | 0 | 0 | 0 | 100.00 | 1.40 | N/D | 1 | 1.40 | 0.40 | 40.00 |
| Kauã Elias | 1 | 0 | 0 | 1 | 0 | N/D | N/D | N/D | 0 | 0.00 | 0.00 | N/D |
| Patrick Berg | 1 | 0 | 1 | 0 | 0 | 0.00 | N/D | 1.47 | 1 | 0.00 | -1.00 | -100.00 |
| Jens Petter Hauge | 1 | 1 | 0 | 0 | 0 | 100.00 | 1.33 | N/D | 1 | 1.33 | 0.33 | 33.00 |
| Sondre Auklend | 1 | 0 | 0 | 1 | 0 | N/D | N/D | N/D | 0 | 0.00 | 0.00 | N/D |
| Erling Haaland | 2 | 2 | 0 | 0 | 0 | 100.00 | 1.16 | N/D | 2 | 2.32 | 0.32 | 16.00 |
| Ousmane Dembélé | 1 | 1 | 0 | 0 | 0 | 100.00 | 1.16 | N/D | 1 | 1.16 | 0.16 | 16.00 |
| Enzo Fernández | 1 | 1 | 0 | 0 | 0 | 100.00 | 2.00 | N/D | 1 | 2.00 | 1.00 | 100.00 |
| Troy Parrott | 2 | 1 | 0 | 1 | 0 | 100.00 | 1.40 | N/D | 1 | 1.40 | 0.40 | 40.00 |
| André Silva | 1 | 1 | 0 | 0 | 0 | 100.00 | 1.44 | N/D | 1 | 1.44 | 0.44 | 44.00 |
| Abde Ezzalzouli | 2 | 2 | 0 | 0 | 0 | 100.00 | 1.85 | N/D | 2 | 3.70 | 1.70 | 85.00 |
| Deniz Undav | 2 | 2 | 0 | 0 | 0 | 100.00 | 1.21 | N/D | 2 | 2.41 | 0.41 | 20.50 |
| Bilal El Khannouss | 1 | 1 | 0 | 0 | 0 | 100.00 | 1.08 | N/D | 1 | 1.08 | 0.08 | 8.00 |

### Ruolo

| Segmento | Tot | V | P | Grigi | Esclusi | Hit % | Quota V | Quota P | Puntato € | Lordo € | Netto € | ROI % |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| squadra/partita | 42 | 25 | 16 | 1 | 0 | 60.98 | 1.69 | 2.13 | 41 | 42.33 | 1.33 | 3.24 |
| forward | 50 | 31 | 10 | 5 | 4 | 75.61 | 1.33 | 2.25 | 41 | 41.33 | 0.33 | 0.80 |
| midfielder | 21 | 13 | 5 | 3 | 0 | 72.22 | 1.62 | 2.32 | 18 | 21.09 | 3.09 | 17.17 |
| defender | 4 | 4 | 0 | 0 | 0 | 100.00 | 2.58 | N/D | 4 | 10.30 | 6.30 | 157.50 |

### Classifica economica descrittiva dei mercati

| Segmento | Tot | V | P | Grigi | Esclusi | Hit % | Quota V | Quota P | Puntato € | Lordo € | Netto € | ROI % |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Corner squadra | 5 | 4 | 0 | 1 | 0 | 100.00 | 1.85 | N/D | 4 | 7.42 | 3.42 | 85.50 |
| Esito finale | 9 | 7 | 2 | 0 | 0 | 77.78 | 2.01 | 1.18 | 9 | 14.08 | 5.08 | 56.44 |
| Tiri squadra | 3 | 3 | 0 | 0 | 0 | 100.00 | 1.46 | N/D | 3 | 4.39 | 1.39 | 46.33 |
| Tiri in porta squadra | 3 | 3 | 0 | 0 | 0 | 100.00 | 1.42 | N/D | 3 | 4.26 | 1.26 | 42.00 |
| Tiri giocatore | 51 | 33 | 11 | 4 | 3 | 75.00 | 1.58 | 2.26 | 44 | 52.16 | 8.16 | 18.55 |
| Tiri in porta giocatore | 24 | 15 | 4 | 4 | 1 | 78.95 | 1.37 | 2.29 | 19 | 20.56 | 1.56 | 8.21 |
| Doppia chance | 9 | 6 | 3 | 0 | 0 | 66.67 | 1.46 | 1.88 | 9 | 8.76 | -0.24 | -2.67 |
| Gol | 13 | 2 | 11 | 0 | 0 | 15.38 | 1.71 | 2.38 | 13 | 3.42 | -9.58 | -73.69 |

Classifica limitata agli esiti osservabili; un segmento con poche righe o copertura asimmetrica non dimostra superiorità.

## 4. Tutti i pronostici nell’ultimo snapshot prepartita

| ID selezione | Partita | Giocatore / ruolo | Contratto e soglia | Quota | P % | Etichetta | Sost. / legni | Esito | Base / motivo |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| sisal:4858138:810819234:5317120249 | Lens - Sporting CP | — | Lens o pareggio (1X) | 1.50 | 61.3 | preferito | false / false | ROSSO | OFFICIAL_SCORE: Finale 0-2, selezione 1X. |
| sisal:4858138:821926893:5376855525 | Lens - Sporting CP | Luis Suárez / forward | Luis Suárez over 2,5 tiri · sostituto incluso | 1.40 | N/D | altra | true / false | VERDE | REPOSITORY_STATISTICAL_VERIFICATION: 3 tiri individuali (StatMuse); sostituto incluso non necessario |
| sisal:4858138:821927618:5376863469 | Lens - Sporting CP | Odsonne Édouard / forward | Odsonne Édouard over 0,5 SOT · sostituto incluso · pali/traverse inclusi | 1.25 | N/D | altra | true / true | VERDE | PLAYER_LOWER_BOUND_AND_RULE: Édouard entra al 58 per Ivanović: un SOT proprio al 62, corroborato dalla tabella individuale (33 minuti, 1 SOT). 1 > 0,5, senza contributi del predecessore. Non titolare ma partecipante; nessun VOID. |
| sisal:4858138:821927322:5376857359 | Lens - Sporting CP | Franjo Ivanović / forward | Franjo Ivanović over 1,5 tiri · sostituto incluso | 1.20 | N/D | altra | true / false | VERDE | PLAYER_SHOTS_LOWER_BOUND: Due conclusioni fuori e una descritta in porta nella cronaca prima del cambio: almeno 3 tiri propri > 1,5. Non serve conoscere i tiri di Édouard. Eliminato il testo estraneo su Rashford. |
| sisal:4858138:821928592:5376859993 | Lens - Sporting CP | Odsonne Édouard / forward | Odsonne Édouard over 3,5 tiri · sostituto incluso | 3.25 | N/D | outsider | true / false | ROSSO | INDEXED_EXACT_PLAYER_ACTUAL_AND_RULE: Riga FBref indicizzata del 13/10: subentrante, 33 minuti, 1 tiro e 1 SOT. Nessuna successiva uscita nella cronologia completa dei cambi: il DUO nominato Édouard vale 1 tiro, non 3 di Ivanović + 1. 1 < 3,5. Non titolare, non VOID. |
| sisal:4858138:821927323:5376857369 | Lens - Sporting CP | Issa Doumbia / midfielder | Issa Doumbia over 1,5 tiri · sostituto incluso | 2.40 | N/D | outsider | true / false | VERDE | PLAYER_SHOTS_LOWER_BOUND: Cronaca: tiro fuori al 73 e gol al 74, entrambi prima del cambio con Pedro Lima. Almeno 2 tiri > 1,5. Nessuna dipendenza dal conteggio di Rashford o dal sostituto. |
| sisal:4858137:810810469:5317115820 | Sabah - Slavia Praha | — | Sabah (1) | 3.75 | 61.7 | altra | false / false | VERDE | OFFICIAL_SCORE: Finale 2-0, selezione 1. |
| sisal:4858137:810810961:5317134384 | Sabah - Slavia Praha | — | Totale partita over 2,5 gol | 1.57 | 65.5 | preferito | false / false | ROSSO | OFFICIAL_SCORE: Gol totali 2; OVER 2.5. |
| sisal:4858146:810822866:5317155562 | Arsenal - Lille | — | Arsenal (1) | 1.20 | 75.9 | altra | false / false | VERDE | OFFICIAL_SCORE: Finale 3-0, selezione 1. |
| sisal:4858146:821922356:5376832575 | Arsenal - Lille | Bukayo Saka / forward | Bukayo Saka over 2,5 tiri · sostituto incluso | 1.33 | N/D | altra | true / false | ROSSO | INDEXED_EXACT_PLAYER_ACTUAL_AND_RULE: Riga FBref del 13/10: subentrante, 26 minuti, 1 tiro (il gol), nessun cambio successivo. 1 < 2,5. Non si aggiunge il tiro di Madueke, uscito al suo ingresso. |
| sisal:4858146:821922408:5376832817 | Arsenal - Lille | Ayase Ueda / forward | Ayase Ueda over 0,5 SOT · sostituto incluso · pali/traverse inclusi | 1.75 | N/D | altra | true / true | ROSSO | REPOSITORY_STATISTICAL_VERIFICATION: Lille 0 tiri in porta e 0 pali/traverse complessivi (Sky Sport) |
| sisal:4858146:821921916:5376820147 | Arsenal - Lille | Eberechi Eze / midfielder | Eberechi Eze over 1,5 tiri · sostituto incluso | 1.16 | N/D | altra | true / false | VERDE | REPOSITORY_STATISTICAL_VERIFICATION: Almeno 3 conclusioni in porta di Eze (StatMuse) |
| sisal:4858146:810823359:5317157816 | Arsenal - Lille | — | Totale partita under 3,5 gol | 1.52 | 68.6 | preferito | false / false | VERDE | OFFICIAL_SCORE: Gol totali 3; UNDER 3.5. |
| sisal:4858146:821922449:5376832991 | Arsenal - Lille | Ayase Ueda / forward | Ayase Ueda over 1,5 tiri · sostituto incluso | 1.75 | N/D | altra | true / false | ROSSO | REPOSITORY_STATISTICAL_VERIFICATION: Ueda 1 tiro; sostituto Giroud 0 tiri |
| sisal:4858146:810823358:5317157812 | Arsenal - Lille | — | Totale partita under 2,5 gol | 2.40 | 46.4 | outsider | false / false | ROSSO | OFFICIAL_SCORE: Gol totali 3; UNDER 2.5. |
| sisal:4858146:821922371:5376832677 | Arsenal - Lille | Ayase Ueda / forward | Ayase Ueda over 2,5 tiri · sostituto incluso | 3.50 | N/D | outsider | true / false | ROSSO | REPOSITORY_STATISTICAL_VERIFICATION: Ueda 1 tiro; sostituto Giroud 0 tiri |
| sisal:4858146:821921851:5376819861 | Arsenal - Lille | Benjamin André / midfielder | Benjamin André over 0,5 tiri · sostituto incluso | 2.50 | N/D | outsider | true / false | ROSSO | REPOSITORY_STATISTICAL_VERIFICATION: André 0 tiri, ha giocato 90 minuti |
| sisal:4858177:810813713:5317148815 | Atlético de Madrid - Manchester United | — | Atlético de Madrid (1) | 1.95 | 53.2 | altra | false / false | VERDE | OFFICIAL_SCORE: Finale 2-0, selezione 1. |
| sisal:4858177:821890410:5376642298 | Atlético de Madrid - Manchester United | Ademola Lookman / forward | Ademola Lookman over 2,5 tiri · sostituto incluso | 1.25 | N/D | altra | true / false | ROSSO | INDEXED_EXACT_PLAYER_ACTUAL_AND_RULE: Riga FBref del 13/10: subentrante, 20 minuti, 1 tiro/1 gol; resta in campo fino al termine. 1 < 2,5. I 3 tiri di Baena, che gli ha lasciato il posto, non si sommano al contratto Lookman. |
| sisal:4858177:821888605:5376633847 | Atlético de Madrid - Manchester United | Marcus Rashford / forward | Marcus Rashford over 0,5 SOT · sostituto incluso · pali/traverse inclusi | 1.65 | N/D | altra | true / true | ROSSO | REPOSITORY_STATISTICAL_VERIFICATION: Rashford 0 SOT + Amad Diallo 0 SOT. Legno United attribuito a Bruno Fernandes, non a Rashford/Amad. |
| sisal:4858177:810814205:5317191046 | Atlético de Madrid - Manchester United | — | Totale partita over 2,5 gol | 1.60 | 65.5 | preferito | false / false | ROSSO | OFFICIAL_SCORE: Gol totali 2; OVER 2.5. |
| sisal:4858177:821888775:5376634522 | Atlético de Madrid - Manchester United | Marcus Rashford / forward | Marcus Rashford over 1,5 tiri · sostituto incluso | 1.50 | N/D | altra | true / false | ROSSO | REPOSITORY_STATISTICAL_VERIFICATION: Verifica tabellino individuale del 13/10/2026; per Rashford 1 tiro e sostituto Amad Diallo 0 tiri. |
| sisal:4858177:810814206:5317191050 | Atlético de Madrid - Manchester United | — | Totale partita over 3,5 gol | 2.50 | 43.6 | outsider | false / false | ROSSO | OFFICIAL_SCORE: Gol totali 2; OVER 3.5. |
| sisal:4858177:821888897:5376635025 | Atlético de Madrid - Manchester United | Marcus Rashford / forward | Marcus Rashford over 3,5 tiri · sostituto incluso | 4.50 | N/D | outsider | true / false | ROSSO | REPOSITORY_STATISTICAL_VERIFICATION: Verifica tabellino individuale del 13/10/2026; per Rashford 1 tiro e sostituto Amad Diallo 0 tiri. |
| sisal:4858177:821891749:5376648956 | Atlético de Madrid - Manchester United | Alejandro Grimaldo / defender | Alejandro Grimaldo over 0,5 SOT · sostituto incluso · pali/traverse inclusi | 2.00 | N/D | outsider | true / true | VERDE | REPOSITORY_STATISTICAL_VERIFICATION: Legno colpito da Grimaldo; contratto include pali/traverse. |
| sisal:4858180:810827979:5317179996 | Inter - Club Brugge | — | Inter (1) | 1.25 | 56.4 | altra | false / false | ROSSO | OFFICIAL_SCORE: Finale 3-4, selezione 1. |
| sisal:4858180:822319165:5378991126 | Inter - Club Brugge | Lautaro Martínez / forward | Lautaro Martínez over 2,5 tiri · sostituto incluso | 1.16 | N/D | altra | true / false | VERDE | REPOSITORY_STATISTICAL_VERIFICATION: Lautaro 12 tiri |
| sisal:4858180:822318885:5378990012 | Inter - Club Brugge | Nicolo Tresoldi / forward | Nicolo Tresoldi over 0,5 SOT · sostituto incluso · pali/traverse inclusi | 1.57 | N/D | altra | true / true | VERDE | REPOSITORY_STATISTICAL_VERIFICATION: Tresoldi autore di tre gol, almeno un tiro in porta |
| sisal:4858180:822318847:5378989876 | Inter - Club Brugge | Hakan Çalhanoğlu / midfielder | Hakan Çalhanoğlu over 1,5 tiri · sostituto incluso | 1.12 | N/D | altra | true / false | VERDE | REPOSITORY_STATISTICAL_VERIFICATION: Çalhanoğlu 2 tiri |
| sisal:4858180:822318899:5378990067 | Inter - Club Brugge | — | Club Brugge over 10,5 tiri | 1.72 | 60.7 | preferito | false / false | VERDE | REPOSITORY_STATISTICAL_VERIFICATION: 18 tiri totali del Club Brugge (Sky Sport) |
| sisal:4858180:822315691:5378999317 | Inter - Club Brugge | Marcus Thuram / forward | Marcus Thuram over 0,5 SOT · sostituto incluso · pali/traverse inclusi | 1.16 | N/D | altra | true / true | VERDE | REPOSITORY_STATISTICAL_VERIFICATION: Thuram 0 SOT, sostituto Francesco Esposito 1 SOT; sostituto incluso |
| sisal:4858180:822318867:5378989938 | Inter - Club Brugge | Hugo Vetlesen / midfielder | Hugo Vetlesen over 0,5 SOT · sostituto incluso · pali/traverse inclusi | 2.75 | N/D | outsider | true / true | GRIGIO | CONFLICT_CROSSES_THRESHOLD: FBref riporta 0 tiri/0 SOT in 60 minuti; precedente tabella StatMuse riporta 2 SOT. Cambio diretto con Félix Lemaréchal documentato. Perdita non dimostrata senza riconciliare anche SOT e legni del sostituto. |
| sisal:4858143:810812179:5317140495 | Galatasaray - Barcelona | — | Barcelona (2) | 1.28 | 52.4 | altra | false / false | VERDE | OFFICIAL_SCORE: Finale 1-4, selezione 2. |
| sisal:4858143:822328597:5379080809 | Galatasaray - Barcelona | Victor Osimhen / forward | Victor Osimhen over 3,5 tiri · sostituto incluso | 1.57 | N/D | altra | true / false | ROSSO | REPOSITORY_STATISTICAL_VERIFICATION: Victor Osimhen: 1 tiro in 90 minuti, nessun sostituto; Over 3,5 non raggiunto. |
| sisal:4858143:822328741:5379081413 | Galatasaray - Barcelona | Victor Osimhen / forward | Victor Osimhen over 1,5 SOT · sostituto incluso · pali/traverse inclusi | 2.00 | N/D | altra | true / true | ROSSO | OUTCOME_INVARIANT_TO_COUNT_CONFLICT: FBref: 1 tiro totale, 90 minuti, 0 SOT; cronaca descrive 1 SOT. Galatasaray ha 0 legni nella tabella e Osimhen non è sostituito: il contratto assume 0 oppure 1, comunque < 1,5. La discordanza sul conteggio resta annotata, ma non cambia l'esito. |
| sisal:4858143:822328638:5379080986 | Galatasaray - Barcelona | Lamine Yamal / forward | Lamine Yamal over 2,5 tiri · sostituto incluso | 1.12 | N/D | altra | true / false | VERDE | REPOSITORY_STATISTICAL_VERIFICATION: Cronaca StatMuse: Yamal 5 conclusioni (12, 25, 52, 63, 69 minuti), supera 2,5. |
| sisal:4858143:822328537:5379080617 | Galatasaray - Barcelona | Dani Olmo / forward | Dani Olmo over 1,5 tiri · sostituto incluso | 1.20 | N/D | altra | true / false | VERDE | REPOSITORY_STATISTICAL_VERIFICATION: Olmo 2 conclusioni (24 e 45); anche senza il sostituto supera 1,5. |
| sisal:4858143:810812673:5317142893 | Galatasaray - Barcelona | — | Totale partita under 3,5 gol | 2.40 | 46.8 | preferito e outsider | false / false | ROSSO | OFFICIAL_SCORE: Gol totali 5; UNDER 3.5. |
| sisal:4858143:822328609:5379080871 | Galatasaray - Barcelona | Dani Olmo / forward | Dani Olmo over 3,5 tiri · sostituto incluso | 2.75 | N/D | outsider | true / false | ROSSO | REPOSITORY_STATISTICAL_VERIFICATION: Olmo 2 conclusioni e Gabriel Jesus, suo sostituto, 1 conclusione: totale 3, inferiore a 4. |
| sisal:4858176:810827927:5317179754 | Leipzig - PSV Eindhoven | — | Pareggio o PSV Eindhoven (X2) | 2.30 | 61.7 | altra | false / false | ROSSO | OFFICIAL_SCORE: Finale 1-0, selezione X2. |
| sisal:4858176:822442814:5379721386 | Leipzig - PSV Eindhoven | Sven Mijnans / midfielder | Sven Mijnans over 2,5 tiri · sostituto incluso | 1.47 | N/D | altra | true / false | ROSSO | REPOSITORY_STATISTICAL_VERIFICATION: Mijnans: 2 tiri (7 e 51); sostituto Mikkel Hansen all’84, nessun tiro nella cronaca completa. |
| sisal:4858176:822440767:5379720511 | Leipzig - PSV Eindhoven | Brajan Gruda / forward | Brajan Gruda over 0,5 SOT · sostituto incluso · pali/traverse inclusi | 1.33 | N/D | altra | true / true | VERDE | REPOSITORY_STATISTICAL_VERIFICATION: Gruda marcatore al 75°, dunque almeno un tiro in porta |
| sisal:4858176:821951423:5376985276 | Leipzig - PSV Eindhoven | — | PSV Eindhoven over 4,5 corner | 2.00 | 57.4 | preferito | false / false | VERDE | REPOSITORY_STATISTICAL_VERIFICATION: 13 corner del PSV (Sky Sport) |
| sisal:4858176:822440794:5379720627 | Leipzig - PSV Eindhoven | Christopher Nkunku / midfielder | Christopher Nkunku over 0,5 SOT · sostituto incluso · pali/traverse inclusi | 1.16 | N/D | altra | true / true | GRIGIO | CONFLICT_CROSSES_THRESHOLD: FBref: 90 minuti, 1 tiro, 0 SOT; cronaca StatMuse: SOT al 67. La soglia 0,5 separa le due interpretazioni. La conferma utente pregressa non è sostituita a un referto provider. |
| sisal:4858176:822440956:5379722099 | Leipzig - PSV Eindhoven | Sven Mijnans / midfielder | Sven Mijnans over 1,5 SOT · sostituto incluso · pali/traverse inclusi | 3.75 | N/D | outsider | true / true | ROSSO | REPOSITORY_STATISTICAL_VERIFICATION: Mijnans: 1 tiro in porta (7), un tiro fuori (51); sostituto Hansen all’84 senza SOT/legni nella cronaca. |
| sisal:4858141:810811557:5317137107 | Viking - Bayern München | — | Bayern München (2) | 1.10 | 61.6 | altra | false / false | ROSSO | OFFICIAL_SCORE: Finale 3-3, selezione 2. |
| sisal:4858141:822324471:5379048990 | Viking - Bayern München | Harry Kane / forward | Harry Kane over 2,5 tiri · sostituto incluso | 1.02 | N/D | altra | true / false | VERDE | REPOSITORY_STATISTICAL_VERIFICATION: Harry Kane: 5 tiri, 90 minuti; Over 2,5 soddisfatto senza sostituto. |
| sisal:4858141:822325380:5379058260 | Viking - Bayern München | Harry Kane / forward | Harry Kane over 0,5 SOT · sostituto incluso · pali/traverse inclusi | 1.02 | N/D | altra | true / true | VERDE | REPOSITORY_STATISTICAL_VERIFICATION: Kane ha segnato 2 gol |
| sisal:4858141:822325406:5379058382 | Viking - Bayern München | Michael Olise / midfielder | Michael Olise over 2,5 tiri · sostituto incluso | 1.12 | N/D | altra | true / false | VERDE | REPOSITORY_STATISTICAL_VERIFICATION: Olise 2 SOT al 6° e 10°, più 1 tiro fuori al 32° |
| sisal:4858141:822307883:5379053237 | Viking - Bayern München | Peter Christiansen / forward | Peter Christiansen over 1,5 tiri · sostituto incluso | 1.57 | N/D | altra | true / false | VERDE | REPOSITORY_STATISTICAL_VERIFICATION: Christiansen 2 tiri in porta nel tabellino |
| sisal:4858141:810812050:5317139355 | Viking - Bayern München | — | Totale partita under 3,5 gol | 2.90 | 39.6 | preferito e outsider | false / false | ROSSO | OFFICIAL_SCORE: Gol totali 6; UNDER 3.5. |
| sisal:4858141:822325176:5379023059 | Viking - Bayern München | Kristoffer Askildsen / midfielder | Kristoffer Askildsen over 1,5 tiri · sostituto incluso | 4.00 | N/D | outsider | true / false | VERDE | REPOSITORY_STATISTICAL_VERIFICATION: Askildsen: 2 tiri e 90 minuti (FBref). |
| sisal:4858139:810811510:5317136887 | Villarreal - Napoli | — | Villarreal o pareggio (1X) | 1.30 | 64.8 | preferito | false / false | VERDE | OFFICIAL_SCORE: Finale 3-1, selezione 1X. |
| sisal:4858139:821933839:5376899635 | Villarreal - Napoli | Georges Mikautadze / forward | Georges Mikautadze over 2,5 tiri · sostituto incluso | 1.33 | N/D | altra | true / false | VERDE | REPOSITORY_STATISTICAL_VERIFICATION: Mikautadze 2 tiri (FBref) + Freeman sostituto diretto almeno 1 tiro bloccato al 78° (Futbol24). |
| sisal:4858139:821934911:5376899499 | Villarreal - Napoli | Georges Mikautadze / forward | Georges Mikautadze over 0,5 SOT · sostituto incluso · pali/traverse inclusi | 1.25 | N/D | altra | true / true | VERDE | REPOSITORY_STATISTICAL_VERIFICATION: Mikautadze segna al 23’: il gol basta per Over 0,5 SOT. |
| sisal:4858139:821933832:5376899615 | Villarreal - Napoli | Matteo Politano / forward | Matteo Politano over 1,5 tiri · sostituto incluso | 1.50 | N/D | altra | true / false | ROSSO | REPOSITORY_STATISTICAL_VERIFICATION: Politano 1 tiro + Neres 0 tiri = 1. Neres entra al 61° per Politano. |
| sisal:4858139:821934797:5376899039 | Villarreal - Napoli | Gerard Moreno / forward | Gerard Moreno over 1,5 tiri · sostituto incluso | 1.25 | N/D | altra | true / false | VERDE | PLAYER_SHOTS_LOWER_BOUND: Due tiri fuori distinti nella cronaca (prima del cambio diretto con Oluwaseyi): almeno 2 > 1,5. Rimossa la motivazione copiata da Rashford; sostituto non necessario. |
| sisal:4858139:821934696:5376893722 | Villarreal - Napoli | Giovanni Di Lorenzo / defender | Giovanni Di Lorenzo over 0,5 tiri · sostituto incluso | 1.80 | N/D | outsider | true / false | VERDE | REPOSITORY_STATISTICAL_VERIFICATION: 1 tiro in porta nel tabellino individuale, sufficiente per Over 0,5 tiri totali. |
| sisal:4858181:810829154:5317187926 | Feyenoord - Como | — | Feyenoord o pareggio (1X) | 1.85 | 61.8 | altra | false / false | VERDE | OFFICIAL_SCORE: Finale 3-2, selezione 1X. |
| sisal:4858181:822445310:5379737948 | Feyenoord - Como | Nacho Ferri / forward | Nacho Ferri over 2,5 tiri · sostituto incluso | 1.65 | N/D | altra | true / false | GRIGIO | REPLACEMENT_ACTUAL_INCOMPLETE: FBref indicizzato riporta 1 tiro; cambio al 79 con Tobias van den Elshout confermato. Mancano tiri totali espliciti del sostituto: la sola assenza di tentativi nella cronaca non prova zero. |
| sisal:4858181:822444069:5379739299 | Feyenoord - Como | Anis Hadj Moussa / forward | Anis Hadj Moussa over 0,5 SOT · sostituto incluso · pali/traverse inclusi | 1.44 | N/D | altra | true / true | VERDE | UEFA_LOWER_BOUND: Minimo documentato 1 shotsOnTarget > 0.5; il contributo del sostituto non è necessario. |
| sisal:4858181:822445073:5379738881 | Feyenoord - Como | Nicolás Paz / midfielder | Nicolás Paz over 2,5 tiri · sostituto incluso | 1.16 | N/D | altra | true / false | VERDE | PLAYER_SHOTS_LOWER_BOUND: PlayerStats riporta 3 tiri di Nico Paz. La cronaca OFStats documenta tiro respinto al 56 e conclusioni fuori al 70 e 89; restano tiri totali, senza promuoverli a SOT. Almeno 3 > 2,5. |
| sisal:4858181:822308423:5379056413 | Feyenoord - Como | — | Feyenoord over 4,5 corner | 1.85 | 65.5 | altra | false / false | GRIGIO | CONFLICT_CROSSES_THRESHOLD: Sky Sports e OFStats indicano 4 corner Feyenoord; StatMuse e altra tabella ne indicano 5. L'Over 4,5 cambia segno. Nessuna scelta della fonte in base al risultato desiderato. |
| sisal:4858181:822445407:5379748908 | Feyenoord - Como | — | Feyenoord over 3,5 tiri in porta | 1.45 | 83.2 | preferito | false / false | VERDE | CORROBORATED_TEAM_ACTUAL: Sky Sports e PlayerStats riportano entrambi 5 SOT Feyenoord: 5 > 3,5. Il conflitto sui corner non invalida questa metrica concorde. |
| sisal:4858181:822445292:5379737866 | Feyenoord - Como | Nacho Ferri / forward | Nacho Ferri over 0,5 SOT · sostituto incluso · pali/traverse inclusi | 1.44 | N/D | altra | true / true | GRIGIO | SOT_WOODWORK_AND_REPLACEMENT_UNRESOLVED: Ferri ha 0 SOT nella tabella/FBref ma la cronaca lo descrive in porta. Feyenoord ha 2 legni complessivi non attribuiti qui ai giocatori; mancano dati completi del sostituto van den Elshout. Non basta 0 SOT standard per dichiarare perso il DUO con legni. |
| sisal:4858181:822444815:5379737104 | Feyenoord - Como | Nacho Ferri / forward | Nacho Ferri over 1,5 SOT · sostituto incluso · pali/traverse inclusi | 3.00 | N/D | outsider | true / true | GRIGIO | SOT_WOODWORK_AND_REPLACEMENT_UNRESOLVED: Stesse lacune del contratto Ferri 0,5: attribuzione dei 2 legni di squadra e conteggi del sostituto non disponibili. Non esiste un limite superiore provato sotto 1,5. |
| sisal:4858179:810814883:5317194823 | LASK - Liverpool | — | Liverpool (2) | 1.28 | 60.5 | altra | false / false | VERDE | OFFICIAL_SCORE: Finale 3-6, selezione 2. |
| sisal:4858179:822421335:5379593659 | LASK - Liverpool | Kasper Jørgensen / defender | Kasper Jørgensen over 1,5 tiri · sostituto incluso | 2.00 | N/D | altra | true / false | VERDE | SECONDARY_LOWER_BOUND: Minimo documentato 4 shots > 1.5; il contributo del sostituto non è necessario. |
| sisal:4858179:822423448:5379557227 | LASK - Liverpool | Florian Wirtz / midfielder | Florian Wirtz over 0,5 SOT · sostituto incluso · pali/traverse inclusi | 1.40 | N/D | altra | true / true | VERDE | SECONDARY_LOWER_BOUND: Minimo documentato 4 shotsOnTarget > 0.5; il contributo del sostituto non è necessario. |
| sisal:4858179:810815376:5317198125 | LASK - Liverpool | — | Totale partita under 3,5 gol | 1.80 | 58 | preferito | false / false | ROSSO | OFFICIAL_SCORE: Gol totali 9; UNDER 3.5. |
| sisal:4858179:810815375:5317198121 | LASK - Liverpool | — | Totale partita under 2,5 gol | 3.10 | 35.9 | outsider | false / false | ROSSO | OFFICIAL_SCORE: Gol totali 9; UNDER 2.5. |
| sisal:4858179:822421392:5379593873 | LASK - Liverpool | Kasper Jørgensen / defender | Kasper Jørgensen over 2,5 tiri · sostituto incluso | 4.50 | N/D | outsider | true / false | VERDE | SECONDARY_LOWER_BOUND: Minimo documentato 4 shots > 2.5; il contributo del sostituto non è necessario. |
| sisal:4858182:810824498:5317163714 | Roma - Real Madrid | — | Roma o pareggio (1X) | 1.85 | 63 | altra | false / false | ROSSO | OFFICIAL_SCORE: Finale 3-4, selezione 1X. |
| sisal:4858182:822400406:5379468966 | Roma - Real Madrid | Donyell Malen / forward | Donyell Malen over 2,5 tiri · sostituto incluso | 1.16 | N/D | altra | true / false | VERDE | SECONDARY_LOWER_BOUND: Minimo documentato 3 shotsOnTarget > 2.5; il contributo del sostituto non è necessario. |
| sisal:4858182:822399568:5379481854 | Roma - Real Madrid | Kylian Mbappé / forward | Kylian Mbappé over 0,5 SOT · sostituto incluso · pali/traverse inclusi | 1.02 | N/D | altra | true / true | VERDE | UEFA_LOWER_BOUND: Minimo documentato 1 shotsOnTarget > 0.5; il contributo del sostituto non è necessario. |
| sisal:4858182:822397458:5379471995 | Roma - Real Madrid | Matías Soulé / midfielder | Matías Soulé over 1,5 tiri · sostituto incluso | 1.33 | N/D | altra | true / false | VERDE | SECONDARY_LOWER_BOUND: Minimo documentato 2 shots > 1.5; il contributo del sostituto non è necessario. |
| sisal:4858182:810824494:5317163698 | Roma - Real Madrid | — | Totale partita under 3,5 gol | 1.72 | 59.7 | altra | false / false | ROSSO | OFFICIAL_SCORE: Gol totali 7; UNDER 3.5. |
| sisal:4858182:822328128:5379068529 | Roma - Real Madrid | — | Roma over 4,5 corner | 2.10 | 58.4 | altra | false / false | VERDE | SECONDARY_TEAM_ACTUAL: corners: 5, soglia 4.5. |
| sisal:4858182:822399841:5379482976 | Roma - Real Madrid | — | Roma over 3,5 tiri in porta | 1.45 | 78.1 | preferito | false / false | VERDE | SECONDARY_TEAM_ACTUAL: shotsOnTarget: 7, soglia 3.5. |
| sisal:4858182:822400587:5379489006 | Roma - Real Madrid | Paulo Dybala / midfielder | Paulo Dybala over 1,5 tiri · sostituto incluso | 1.16 | N/D | altra | true / false | VERDE | DIRECT_REPLACEMENT_SUM: Dybala 1 tiro nei primi 45 minuti; sostituzione diretta con Rodrigo Mora, che la riga FBref del 14/10 accredita di 2 tiri. Somma DUO 1+2=3 > 1,5. |
| sisal:4858182:810824493:5317163694 | Roma - Real Madrid | — | Totale partita under 2,5 gol | 2.90 | 37.5 | outsider | false / false | ROSSO | OFFICIAL_SCORE: Gol totali 7; UNDER 2.5. |
| sisal:4858182:822397215:5379468394 | Roma - Real Madrid | Paulo Dybala / midfielder | Paulo Dybala over 3,5 tiri · sostituto incluso | 2.40 | N/D | outsider | true / false | ROSSO | DIRECT_REPLACEMENT_SUM: Contratto originale 3,5: Dybala 1 + sostituto diretto Rodrigo Mora 2 = 3, inferiore a 3,5. Nessun trasferimento delle statistiche di un altro compagno. |
| sisal:4858182:822399634:5379482130 | Roma - Real Madrid | Marten De Roon / midfielder | Marten De Roon over 0,5 tiri · sostituto incluso | 2.00 | N/D | outsider | true / false | VERDE | UEFA_LOWER_BOUND: Minimo documentato 1 shots > 0.5; il contributo del sostituto non è necessario. |
| sisal:4858178:810814257:5317191197 | Aston Villa - Fenerbahçe | — | Aston Villa (1) | 1.62 | 70.2 | preferito | false / false | VERDE | OFFICIAL_SCORE: Finale 6-0, selezione 1. |
| sisal:4858178:822473431:5379916496 | Aston Villa - Fenerbahçe | Nicolas Jackson / forward | Nicolas Jackson over 2,5 tiri · sostituto incluso | 1.47 | N/D | altra | true / false | VERDE | PLAYER_SHOTS_LOWER_BOUND: Tabella StatMuse: 3 SOT propri; anche i due gol e il distinto tiro fuori della cronaca provano almeno 3 conclusioni. 3 > 2,5, senza bisogno del contributo di Abraham. |
| sisal:4858178:822464266:5379907715 | Aston Villa - Fenerbahçe | Mason Greenwood / forward | Mason Greenwood over 0,5 SOT · sostituto incluso · pali/traverse inclusi | 1.25 | N/D | altra | true / true | VERDE | INDEXED_PLAYER_SOT_LOWER_BOUND: Riga FBref del 14/10: Greenwood, Fenerbahçe contro Aston Villa, 68 minuti, 3 tiri e 1 SOT. Il singolo SOT proprio basta per Over 0,5; nessuna assunzione su legni o Nene Dorgeles. |
| sisal:4858178:822464375:5379908171 | Aston Villa - Fenerbahçe | Johan Manzambi / midfielder | Johan Manzambi over 1,5 tiri · sostituto incluso | 1.16 | N/D | altra | true / false | VERDE | PLAYER_SHOTS_LOWER_BOUND: Tentativo individuale al minuto 8 e gol al 12: almeno due conclusioni distinte > 1,5. Il conflitto fra descrizione in porta e tabella SOT=1 non cambia il numero minimo di tiri totali: la prima conclusione può essere riclassificata senza cancellarla. Il contributo del sostituto João Gomes non è necessario; non si assegna un nuovo actual SOT. |
| sisal:4858178:822481714:5379908219 | Aston Villa - Fenerbahçe | Mason Greenwood / forward | Mason Greenwood over 3,5 tiri · sostituto incluso | 2.25 | N/D | outsider | true / false | VERDE | DIRECT_REPLACEMENT_SUM: Righe FBref del 14/10: Greenwood 3 tiri in 68 minuti, Nene Dorgeles 1 tiro in 22. StatMuse documenta il cambio diretto: somma 4 > 3,5. |
| sisal:4858144:810821027:5317129797 | Shakhtar Donetsk - AEK Athens | — | Shakhtar Donetsk o pareggio (1X) | 1.50 | 66.4 | altra | false / false | VERDE | OFFICIAL_SCORE: Finale 3-1, selezione 1X. |
| sisal:4858144:822490878:5379976360 | Shakhtar Donetsk - AEK Athens | Aboubakary Koita / forward | Aboubakary Koita over 1,5 tiri · sostituto incluso | 1.40 | N/D | altra | true / false | VERDE | SECONDARY_LOWER_BOUND: Minimo documentato 2 shots > 1.5; il contributo del sostituto non è necessario. |
| sisal:4858144:822326236:5379066966 | Shakhtar Donetsk - AEK Athens | — | AEK Athens under 4,5 corner | 1.62 | 63.7 | preferito | false / false | VERDE | SECONDARY_TEAM_ACTUAL: corners: 2, soglia 4.5. |
| sisal:4858144:822494796:5380035442 | Shakhtar Donetsk - AEK Athens | Kauã Elias / forward | Kauã Elias over 1,5 tiri · sostituto incluso | 1.25 | N/D | altra | true / false | GRIGIO | REPLACEMENT_ACTUAL_INCOMPLETE: PlayerStats espone 1 tiro di Kauã Elias; al 87 entra Luca Meirelles. Mancano tiri totali completi e identificati del sostituto. Il suo xG pari a zero non prova zero tiri. |
| sisal:4858142:810820323:5317125221 | Bodø/Glimt - Borussia Dortmund | — | Bodø/Glimt o pareggio (1X) | 1.75 | 65.9 | altra | false / false | VERDE | OFFICIAL_SCORE: Finale 1-0, selezione 1X. |
| sisal:4858142:822436691:5379692496 | Bodø/Glimt - Borussia Dortmund | Patrick Berg / midfielder | Patrick Berg over 1,5 tiri · sostituto incluso | 1.47 | N/D | altra | true / false | ROSSO | INDEXED_EXACT_PLAYER_ACTUAL: Successivo recupero della riga FBref indicizzata del 14/10: Berg, Bodø/Glimt contro Dortmund, 90 minuti e 1 tiro totale. Nessun sostituto; 1 < 1,5. Il profilo OFStats fermo al 10/10 è scartato e non interpretato come zero. |
| sisal:4858142:822436328:5379691269 | Bodø/Glimt - Borussia Dortmund | Jens Petter Hauge / forward | Jens Petter Hauge over 1,5 tiri · sostituto incluso | 1.33 | N/D | altra | true / false | VERDE | SECONDARY_LOWER_BOUND: Minimo documentato 3 shots > 1.5; il contributo del sostituto non è necessario. |
| sisal:4858142:822436384:5379691483 | Bodø/Glimt - Borussia Dortmund | — | Bodø/Glimt over 10,5 tiri | 1.27 | 90.2 | preferito | false / false | VERDE | CORROBORATED_TEAM_ACTUAL: Bodø/Glimt: 11 tiri totali, concordi tra Sky Sports e StatMuse. 11 > 10,5. I respinti restano parte del totale senza essere aggiunti una seconda volta. |
| sisal:4858142:822436643:5379692328 | Bodø/Glimt - Borussia Dortmund | Sondre Auklend / midfielder | Sondre Auklend over 2,5 tiri · sostituto incluso | 4.00 | N/D | outsider | true / false | GRIGIO | INDEX_CURRENT_PAGE_MISMATCH: Risultato indicizzato OFStats espone 0 tiri e 90 minuti il 14/10, ma la vista corrente consultata è una copia precedente e non permette riconferma integrale. Nessun referto UEFA/Opta o secondo conteggio completo acquisito: non si dichiara perso dalla sola assenza di tiri narrati. |
| sisal:4858174:810826340:5317172512 | Manchester City - Paris Saint-Germain | — | Paris Saint-Germain (2) | 3.00 | 52.6 | altra | false / false | VERDE | OFFICIAL_SCORE: Finale 2-4, selezione 2. |
| sisal:4858174:822414877:5379541937 | Manchester City - Paris Saint-Germain | Erling Haaland / forward | Erling Haaland over 2,5 tiri · sostituto incluso | 1.20 | N/D | altra | true / false | VERDE | UEFA_LOWER_BOUND: Minimo documentato 3 shotsOnTarget > 2.5; il contributo del sostituto non è necessario. |
| sisal:4858174:822415651:5379562391 | Manchester City - Paris Saint-Germain | Erling Haaland / forward | Erling Haaland over 0,5 SOT · sostituto incluso · pali/traverse inclusi | 1.12 | N/D | altra | true / true | VERDE | UEFA_LOWER_BOUND: Minimo documentato 3 shotsOnTarget > 0.5; il contributo del sostituto non è necessario. |
| sisal:4858174:822308666:5379057520 | Manchester City - Paris Saint-Germain | — | Manchester City over 4,5 corner | 1.70 | 65.5 | altra | false / false | VERDE | TEAM_CORNERS_LOWER_BOUND: StatMuse registra 11 corner Manchester City e descrive almeno cinque esecuzioni distinte prima dell'intervallo. Anche senza il totale finale, il limite inferiore 5 supera 4,5. |
| sisal:4858174:822410688:5379527485 | Manchester City - Paris Saint-Germain | — | Paris Saint-Germain over 3,5 tiri in porta | 1.36 | 77.7 | preferito | false / false | VERDE | UEFA_LOWER_BOUND: Quattro marcatori PSG nella cronaca UEFA: almeno quattro SOT, sufficienti per Over 3,5. |
| sisal:4858174:822407528:5379562023 | Manchester City - Paris Saint-Germain | Ousmane Dembélé / forward | Ousmane Dembélé over 1,5 tiri · sostituto incluso | 1.16 | N/D | altra | true / false | VERDE | OFFICIAL_EVENT_AND_DIRECT_REPLACEMENT: Dembélé segna, poi è sostituito direttamente da Ferran Torres. UEFA documenta il rigore di Torres parato nel finale: almeno 1 tiro di Dembélé + 1 di Torres = 2 > 1,5. Scartata l'attribuzione errata a Donnarumma nella cronaca StatMuse. |
| sisal:4858174:822410566:5379526973 | Manchester City - Paris Saint-Germain | Enzo Fernández / midfielder | Enzo Fernández over 0,5 SOT · sostituto incluso · pali/traverse inclusi | 2.00 | N/D | outsider | true / true | VERDE | UEFA_LOWER_BOUND: Minimo documentato 1 shotsOnTargetAndWoodwork > 0.5; il contributo del sostituto non è necessario. |
| sisal:4858175:810827383:5317178572 | Real Betis - Porto | — | Real Betis o pareggio (1X) | 1.30 | 67.6 | altra | false / false | VERDE | OFFICIAL_SCORE: Finale 3-2, selezione 1X. |
| sisal:4858175:822427746:5379618392 | Real Betis - Porto | Troy Parrott / forward | Troy Parrott over 2,5 tiri · sostituto incluso | 1.65 | N/D | altra | true / false | GRIGIO | REPLACEMENT_SHOTS_TOTAL_MISSING: Cambio diretto Parrott → Cucho Hernández al 62, con gol del sostituto. Questo prova almeno 1 tiro, non il totale > 2,5. Mancano totali tiri esatti di entrambi. |
| sisal:4858175:822427728:5379618338 | Real Betis - Porto | Troy Parrott / forward | Troy Parrott over 0,5 SOT · sostituto incluso · pali/traverse inclusi | 1.40 | N/D | altra | true / true | VERDE | SCORING_DIRECT_REPLACEMENT: Cucho Hernández entra per Parrott al 62 e segna al 74. Almeno 1 SOT del sostituto diretto > 0,5; eventuali tiri e legni di Parrott non sono necessari. |
| sisal:4858175:822427450:5379631228 | Real Betis - Porto | André Silva / forward | André Silva over 0,5 SOT · sostituto incluso · pali/traverse inclusi | 1.44 | N/D | altra | true / true | VERDE | SCORING_DIRECT_REPLACEMENT: André Silva esce per Samu al 59, Samu segna al 61: almeno 1 SOT del sostituto diretto > 0,5. Il palo-gol è una sola conclusione, non due. |
| sisal:4858175:822427489:5379632168 | Real Betis - Porto | — | Porto over 10,5 tiri | 1.40 | 74.4 | preferito | false / false | VERDE | CORROBORATED_TEAM_ACTUAL: Porto 11 tiri totali, concordi Sky Sports e StatMuse: 11 > 10,5. Nessuna somma aggiuntiva dei tiri respinti al totale già comprensivo. |
| sisal:4858175:822426842:5379630012 | Real Betis - Porto | Abde Ezzalzouli / forward | Abde Ezzalzouli over 1,5 tiri · sostituto incluso | 1.20 | N/D | altra | true / false | VERDE | INDEXED_EXACT_PLAYER_ACTUAL: FBref indicizzato: 90 minuti e 5 tiri, di cui 2 SOT, nel Betis–Porto del 14/10. 5 > 1,5; non occorre un sostituto. |
| sisal:4858175:822427716:5379618278 | Real Betis - Porto | Abde Ezzalzouli / forward | Abde Ezzalzouli over 3,5 tiri · sostituto incluso | 2.50 | N/D | outsider | true / false | VERDE | INDEXED_EXACT_PLAYER_ACTUAL: Stessa riga originale del 14/10: 5 tiri in 90 minuti. 5 > 3,5, senza modificare soglia, quota o previsione. |
| sisal:4858140:810819779:5317123379 | Slovan Bratislava - Stuttgart | — | Pareggio o Stuttgart (X2) | 1.06 | 65.9 | altra | false / false | VERDE | OFFICIAL_SCORE: Finale 0-3, selezione X2. |
| sisal:4858140:822497290:5380053783 | Slovan Bratislava - Stuttgart | Deniz Undav / forward | Deniz Undav over 2,5 tiri · sostituto incluso | 1.25 | N/D | altra | true / false | VERDE | PLAYER_SHOTS_LOWER_BOUND: Cronaca: una conclusione al 24, gol al 29 e ulteriore tentativo al 79; almeno 3 tiri propri > 2,5. Non è necessario contare due volte le due descrizioni della conclusione al 24. Sufficiente senza sommare compagni o sostituti. |
| sisal:4858140:822496187:5380045189 | Slovan Bratislava - Stuttgart | Deniz Undav / forward | Deniz Undav over 0,5 SOT · sostituto incluso · pali/traverse inclusi | 1.16 | N/D | altra | true / true | VERDE | UEFA_LOWER_BOUND: Minimo documentato 1 shotsOnTarget > 0.5; il contributo del sostituto non è necessario. |
| sisal:4858140:822491294:5379978203 | Slovan Bratislava - Stuttgart | Bilal El Khannouss / midfielder | Bilal El Khannouss over 1,5 tiri · sostituto incluso | 1.08 | N/D | altra | true / false | VERDE | SCORING_DIRECT_REPLACEMENT: El Khannouss effettua una conclusione al 44 prima di uscire al 81 per Demirović, che segna al 90. Il DUO ha almeno 2 tiri > 1,5; l'ulteriore tentativo al 62 non è necessario e la sua classificazione SOT resta separata. |
| sisal:4858140:810819775:5317123351 | Slovan Bratislava - Stuttgart | — | Totale partita under 3,5 gol | 1.90 | 60.8 | preferito | false / false | VERDE | OFFICIAL_SCORE: Gol totali 3; UNDER 3.5. |
| sisal:4858140:810819774:5317123345 | Slovan Bratislava - Stuttgart | — | Totale partita under 2,5 gol | 3.25 | 38.5 | outsider | false / false | ROSSO | OFFICIAL_SCORE: Gol totali 3; UNDER 2.5. |

## 5. Diagnosi dei pronostici persi

A = errore matematico; B = dati di partenza; C = variabilità/evento; D = scelta mercato/quota. Nessuna perdita singola prova A. Un errore di dati richiede confronto con input originali: non si deduce B dal solo scarto rispetto al risultato. Per ogni perdita riportiamo ciò che è realmente osservato e lasciamo aperta la causa non identificabile.

| Partita | Pronostico perso | P % / pareggio quota % | Reale / confronto | Categoria e conclusione |
| --- | --- | --- | --- | --- |
| Lens - Sporting CP | Lens o pareggio (1X) | 61.3 / 66.67 | Finale 0-2, selezione 1X. | D: EV originale negativo; priorità di test selettore. A/C non separabili da una gara. |
| Lens - Sporting CP | Odsonne Édouard over 3,5 tiri · sostituto incluso | N/D / 30.77 | Riga FBref indicizzata del 13/10: subentrante, 33 minuti, 1 tiro e 1 SOT. Nessuna successiva uscita nella cronologia completa dei cambi: il DUO nominato Édouard vale 1 tiro, non 3 di Ivanović + 1. 1 < 3,5. Non titolare, non VOID. | A/B/C/D non identificabili dai soli dati disponibili; nessuna attribuzione causale automatica. |
| Sabah - Slavia Praha | Totale partita over 2,5 gol | 65.5 / 63.69 | Gol totali 2; OVER 2.5. | A/B/C/D non identificabili dai soli dati disponibili; nessuna attribuzione causale automatica. |
| Arsenal - Lille | Bukayo Saka over 2,5 tiri · sostituto incluso | N/D / 75.19 | Riga FBref del 13/10: subentrante, 26 minuti, 1 tiro (il gol), nessun cambio successivo. 1 < 2,5. Non si aggiunge il tiro di Madueke, uscito al suo ingresso. | A/B/C/D non identificabili dai soli dati disponibili; nessuna attribuzione causale automatica. |
| Arsenal - Lille | Ayase Ueda over 0,5 SOT · sostituto incluso · pali/traverse inclusi | N/D / 57.14 | Lille 0 tiri in porta e 0 pali/traverse complessivi (Sky Sport) | A/B/C/D non identificabili dai soli dati disponibili; nessuna attribuzione causale automatica. |
| Arsenal - Lille | Ayase Ueda over 1,5 tiri · sostituto incluso | N/D / 57.14 | Ueda 1 tiro; sostituto Giroud 0 tiri | A/B/C/D non identificabili dai soli dati disponibili; nessuna attribuzione causale automatica. |
| Arsenal - Lille | Totale partita under 2,5 gol | 46.4 / 41.67 | Gol totali 3; UNDER 2.5. | A/B/C/D non identificabili dai soli dati disponibili; nessuna attribuzione causale automatica. |
| Arsenal - Lille | Ayase Ueda over 2,5 tiri · sostituto incluso | N/D / 28.57 | Ueda 1 tiro; sostituto Giroud 0 tiri | A/B/C/D non identificabili dai soli dati disponibili; nessuna attribuzione causale automatica. |
| Arsenal - Lille | Benjamin André over 0,5 tiri · sostituto incluso | N/D / 40.00 | André 0 tiri, ha giocato 90 minuti | A/B/C/D non identificabili dai soli dati disponibili; nessuna attribuzione causale automatica. |
| Atlético de Madrid - Manchester United | Ademola Lookman over 2,5 tiri · sostituto incluso | N/D / 80.00 | Riga FBref del 13/10: subentrante, 20 minuti, 1 tiro/1 gol; resta in campo fino al termine. 1 < 2,5. I 3 tiri di Baena, che gli ha lasciato il posto, non si sommano al contratto Lookman. | A/B/C/D non identificabili dai soli dati disponibili; nessuna attribuzione causale automatica. |
| Atlético de Madrid - Manchester United | Marcus Rashford over 0,5 SOT · sostituto incluso · pali/traverse inclusi | N/D / 60.61 | Rashford 0 SOT + Amad Diallo 0 SOT. Legno United attribuito a Bruno Fernandes, non a Rashford/Amad. | A/B/C/D non identificabili dai soli dati disponibili; nessuna attribuzione causale automatica. |
| Atlético de Madrid - Manchester United | Totale partita over 2,5 gol | 65.5 / 62.50 | Gol totali 2; OVER 2.5. | A/B/C/D non identificabili dai soli dati disponibili; nessuna attribuzione causale automatica. |
| Atlético de Madrid - Manchester United | Marcus Rashford over 1,5 tiri · sostituto incluso | N/D / 66.67 | Verifica tabellino individuale del 13/10/2026; per Rashford 1 tiro e sostituto Amad Diallo 0 tiri. | A/B/C/D non identificabili dai soli dati disponibili; nessuna attribuzione causale automatica. |
| Atlético de Madrid - Manchester United | Totale partita over 3,5 gol | 43.6 / 40.00 | Gol totali 2; OVER 3.5. | A/B/C/D non identificabili dai soli dati disponibili; nessuna attribuzione causale automatica. |
| Atlético de Madrid - Manchester United | Marcus Rashford over 3,5 tiri · sostituto incluso | N/D / 22.22 | Verifica tabellino individuale del 13/10/2026; per Rashford 1 tiro e sostituto Amad Diallo 0 tiri. | A/B/C/D non identificabili dai soli dati disponibili; nessuna attribuzione causale automatica. |
| Inter - Club Brugge | Inter (1) | 56.4 / 80.00 | Finale 3-4, selezione 1. | D: EV originale negativo; priorità di test selettore. A/C non separabili da una gara. |
| Galatasaray - Barcelona | Victor Osimhen over 3,5 tiri · sostituto incluso | N/D / 63.69 | Victor Osimhen: 1 tiro in 90 minuti, nessun sostituto; Over 3,5 non raggiunto. | A/B/C/D non identificabili dai soli dati disponibili; nessuna attribuzione causale automatica. |
| Galatasaray - Barcelona | Victor Osimhen over 1,5 SOT · sostituto incluso · pali/traverse inclusi | N/D / 50.00 | FBref: 1 tiro totale, 90 minuti, 0 SOT; cronaca descrive 1 SOT. Galatasaray ha 0 legni nella tabella e Osimhen non è sostituito: il contratto assume 0 oppure 1, comunque < 1,5. La discordanza sul conteggio resta annotata, ma non cambia l'esito. | A/B/C/D non identificabili dai soli dati disponibili; nessuna attribuzione causale automatica. |
| Galatasaray - Barcelona | Totale partita under 3,5 gol | 46.8 / 41.67 | Gol totali 5; UNDER 3.5. | A/B/C/D non identificabili dai soli dati disponibili; nessuna attribuzione causale automatica. |
| Galatasaray - Barcelona | Dani Olmo over 3,5 tiri · sostituto incluso | N/D / 36.36 | Olmo 2 conclusioni e Gabriel Jesus, suo sostituto, 1 conclusione: totale 3, inferiore a 4. | A/B/C/D non identificabili dai soli dati disponibili; nessuna attribuzione causale automatica. |
| Leipzig - PSV Eindhoven | Pareggio o PSV Eindhoven (X2) | 61.7 / 43.48 | Finale 1-0, selezione X2. | A/B/C/D non identificabili dai soli dati disponibili; nessuna attribuzione causale automatica. |
| Leipzig - PSV Eindhoven | Sven Mijnans over 2,5 tiri · sostituto incluso | N/D / 68.03 | Mijnans: 2 tiri (7 e 51); sostituto Mikkel Hansen all’84, nessun tiro nella cronaca completa. | A/B/C/D non identificabili dai soli dati disponibili; nessuna attribuzione causale automatica. |
| Leipzig - PSV Eindhoven | Sven Mijnans over 1,5 SOT · sostituto incluso · pali/traverse inclusi | N/D / 26.67 | Mijnans: 1 tiro in porta (7), un tiro fuori (51); sostituto Hansen all’84 senza SOT/legni nella cronaca. | A/B/C/D non identificabili dai soli dati disponibili; nessuna attribuzione causale automatica. |
| Viking - Bayern München | Bayern München (2) | 61.6 / 90.91 | Finale 3-3, selezione 2. | D: EV originale negativo; priorità di test selettore. A/C non separabili da una gara. |
| Viking - Bayern München | Totale partita under 3,5 gol | 39.6 / 34.48 | Gol totali 6; UNDER 3.5. | A/B/C/D non identificabili dai soli dati disponibili; nessuna attribuzione causale automatica. |
| Villarreal - Napoli | Matteo Politano over 1,5 tiri · sostituto incluso | N/D / 66.67 | Politano 1 tiro + Neres 0 tiri = 1. Neres entra al 61° per Politano. | A/B/C/D non identificabili dai soli dati disponibili; nessuna attribuzione causale automatica. |
| LASK - Liverpool | Totale partita under 3,5 gol | 58 / 55.56 | Gol totali 9; UNDER 3.5. | A/B/C/D non identificabili dai soli dati disponibili; nessuna attribuzione causale automatica. |
| LASK - Liverpool | Totale partita under 2,5 gol | 35.9 / 32.26 | Gol totali 9; UNDER 2.5. | A/B/C/D non identificabili dai soli dati disponibili; nessuna attribuzione causale automatica. |
| Roma - Real Madrid | Roma o pareggio (1X) | 63 / 54.05 | Finale 3-4, selezione 1X. | A/B/C/D non identificabili dai soli dati disponibili; nessuna attribuzione causale automatica. |
| Roma - Real Madrid | Totale partita under 3,5 gol | 59.7 / 58.14 | Gol totali 7; UNDER 3.5. | A/B/C/D non identificabili dai soli dati disponibili; nessuna attribuzione causale automatica. |
| Roma - Real Madrid | Totale partita under 2,5 gol | 37.5 / 34.48 | Gol totali 7; UNDER 2.5. | A/B/C/D non identificabili dai soli dati disponibili; nessuna attribuzione causale automatica. |
| Roma - Real Madrid | Paulo Dybala over 3,5 tiri · sostituto incluso | N/D / 41.67 | Contratto originale 3,5: Dybala 1 + sostituto diretto Rodrigo Mora 2 = 3, inferiore a 3,5. Nessun trasferimento delle statistiche di un altro compagno. | A/B/C/D non identificabili dai soli dati disponibili; nessuna attribuzione causale automatica. |
| Bodø/Glimt - Borussia Dortmund | Patrick Berg over 1,5 tiri · sostituto incluso | N/D / 68.03 | Successivo recupero della riga FBref indicizzata del 14/10: Berg, Bodø/Glimt contro Dortmund, 90 minuti e 1 tiro totale. Nessun sostituto; 1 < 1,5. Il profilo OFStats fermo al 10/10 è scartato e non interpretato come zero. | A/B/C/D non identificabili dai soli dati disponibili; nessuna attribuzione causale automatica. |
| Slovan Bratislava - Stuttgart | Totale partita under 2,5 gol | 38.5 / 30.77 | Gol totali 3; UNDER 2.5. | A/B/C/D non identificabili dai soli dati disponibili; nessuna attribuzione causale automatica. |

I conteggi individuali esatti seguenti sono secondari e servono alla diagnostica del singolo, non alla liquidazione DUO. Minuti effettivi possono differire di uno dal minuto visualizzato della sostituzione. Osservazioni deduplicate per fixture + canonicalPlayerId.

| Partita | Giocatore | Ruolo | Min previsti | Min reali | Tiri previsti | Tiri reali | SOT previsti | SOT reali | Fonte |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Arsenal - Lille | Benjamin André | midfielder | 84.6 | 90 | 0.86 | 0 | 0.27 | N/D | data/sources/champions-verification-md02-2026-10-14.json (Playmakerstats; verifica pregressa, non riconfermata live) |
| Galatasaray - Barcelona | Victor Osimhen | forward | 84.6 | 90 | 4.29 | 1 | 1.95 | N/D | data/sources/champions-verification-md02-2026-10-14.json (FBref; verifica pregressa, non riconfermata live) |
| Viking - Bayern München | Harry Kane | forward | 84.6 | 90 | 3.48 | 5 | 1.85 | N/D | data/sources/champions-verification-md02-2026-10-14.json (FBref; verifica pregressa, non riconfermata live) |
| Viking - Bayern München | Kristoffer Askildsen | midfielder | 84.6 | 90 | 1.82 | 2 | 0.49 | N/D | data/sources/champions-verification-md02-2026-10-14.json (FBref; verifica pregressa, non riconfermata live) |
| Feyenoord - Como | Nacho Ferri | forward | 84.6 | 78 | 3.73 | N/D | 1.52 | 0 | https://www.statmuse.com/fc/match/10-14-2026-fey-vs-com-113893 |
| Feyenoord - Como | Anis Hadj Moussa | forward | 84.6 | 89 | 3.24 | N/D | 1.32 | 3 | https://www.statmuse.com/fc/match/10-14-2026-fey-vs-com-113893 |
| LASK - Liverpool | Kasper Jørgensen | defender | 84.6 | 45 | 2.06 | N/D | 0.62 | 0 | https://www.statmuse.com/fc/match/-113894 |
| Roma - Real Madrid | Donyell Malen | forward | 84.6 | 90 | 4.03 | N/D | 1.65 | 3 | https://www.statmuse.com/fc/match/-113898 |
| Roma - Real Madrid | Matías Soulé | midfielder | 84.6 | 62 | 2.19 | N/D | 0.72 | 1 | https://www.statmuse.com/fc/match/-113898 |
| Roma - Real Madrid | Paulo Dybala | midfielder | 84.6 | 45 | 2.57 | N/D | 0.98 | 0 | https://www.statmuse.com/fc/match/-113898 |
| Roma - Real Madrid | Marten De Roon | midfielder | 84.6 | 90 | 0.84 | N/D | 0.22 | 1 | https://www.statmuse.com/fc/match/-113898 |

Il confronto mostra casi di 45 minuti contro 84,6 attesi: è un rischio concreto da testare sul modello di esposizione, senza stimare qui un nuovo coefficiente. Non sono disponibili dati strutturati completi e riconciliati per possesso, zone di tiro, tiri concessi per ruolo, cronologia del punteggio e rossi su tutte le 18 gare. Queste cause restano N/D; non si costruiscono spiegazioni tattiche a posteriori. Il finale non misura il volume dei tiri. La cronaca UEFA documenta una rimonta tardiva a Roma, utile come contesto ma insufficiente per attribuire causalmente gli errori di previsione.

## 6. Valutazione matematica

Brier e log loss binari sono calcolati soltanto sulla probabilità originale dell’esatto contratto con esito deciso; logaritmo naturale, nessun clipping necessario (P strettamente fra 0 e 1). Nessuna probabilità DUO ricostruita. Non sono score multiclass 1X2 e non misurano il modello su tutte le opzioni disponibili.

| Campione | n | Brier | Log loss | P media | Frequenza osservata |
| --- | --- | --- | --- | --- | --- |
| Statisticamente verificato | 41 | 0.1867 | 0.557 | 0.6094 | 0.6098 |
| Solo UEFA | 32 | 0.2107 | 0.6106 | 0.5834 | 0.5 |
| Benchmark banale P=0,5 sullo stesso campione | 41 | 0.25 | 0.6931 | 0.5 | — |

### Calibrazione per decili

| Fascia | n | P media | Frequenza | Brier | Log loss |
| --- | --- | --- | --- | --- | --- |
| [30,40)% | 4 | 0.3787 | 0 | 0.1436 | 0.4763 |
| [40,50)% | 3 | 0.456 | 0 | 0.2081 | 0.6091 |
| [50,60)% | 8 | 0.5601 | 0.625 | 0.2545 | 0.7024 |
| [60,70)% | 19 | 0.6382 | 0.6842 | 0.2143 | 0.6196 |
| [70,80)% | 5 | 0.7526 | 1 | 0.062 | 0.285 |
| [80,90)% | 1 | 0.832 | 1 | 0.0282 | 0.1839 |
| [90,100)% | 1 | 0.902 | 1 | 0.0096 | 0.1031 |

### Probabilità per mercato e soglia

| Mercato:soglia | n | Brier | Log loss |
| --- | --- | --- | --- |
| Doppia chance:esito | 9 | 0.2082 | 0.6059 |
| Tiri giocatore:2.5 | 0 | N/D | N/D |
| Tiri in porta giocatore:0.5 | 0 | N/D | N/D |
| Tiri giocatore:1.5 | 0 | N/D | N/D |
| Tiri giocatore:3.5 | 0 | N/D | N/D |
| Esito finale:esito | 9 | 0.2019 | 0.5913 |
| Gol:2.5 | 6 | 0.2485 | 0.6922 |
| Gol:3.5 | 7 | 0.2159 | 0.6227 |
| Tiri giocatore:0.5 | 0 | N/D | N/D |
| Tiri squadra:10.5 | 3 | 0.0765 | 0.2994 |
| Tiri in porta giocatore:1.5 | 0 | N/D | N/D |
| Corner squadra:4.5 | 4 | 0.1513 | 0.4918 |
| Tiri in porta squadra:3.5 | 3 | 0.042 | 0.2278 |

### Point forecast del singolo (campione secondario parziale)

| Metrica | n | MAE | RMSE | Bias predetto-osservato |
| --- | --- | --- | --- | --- |
| shots | 4 | 1.4625 | 1.8646 | 0.6125 |
| sot | 7 | 1.03 | 1.1331 | -0.1386 |
| minutes | 11 | 13.2 | 18.793 | 6.5091 |

| Ruolo | n SOT | MAE SOT | RMSE SOT | Bias SOT |
| --- | --- | --- | --- | --- |
| midfielder | 3 | 0.68 | 0.741 | -0.0267 |
| forward | 3 | 1.5167 | 1.5226 | -0.5033 |
| defender | 1 | 0.62 | 0.62 | 0.62 |

| Squadra | n SOT | MAE SOT | RMSE SOT | Bias SOT |
| --- | --- | --- | --- | --- |
| Lille | 0 | N/D | N/D | N/D |
| Galatasaray | 0 | N/D | N/D | N/D |
| Bayern München | 0 | N/D | N/D | N/D |
| Viking | 0 | N/D | N/D | N/D |
| Feyenoord | 2 | 1.6 | 1.602 | -0.08 |
| LASK | 1 | 0.62 | 0.62 | 0.62 |
| Roma | 4 | 0.8475 | 0.9314 | -0.3575 |

Benchmark repository: `output/reports/champions-model-calibration-audit-2026-10-11.md`, baseline A MD1, 6 gare/30 giocatori: tiri MAE 1,855, RMSE 2,301, bias +0,169; SOT MAE 0,887, RMSE 1,029, bias +0,211. Il campione MD2 qui disponibile è diverso, parziale e selezionato: nessun delta accoppiato o prova di miglioramento. Il benchmark storico B è CHRONOLOGY_BLOCKED e C UNCALIBRATED. I backtest su competizioni differenti non certificano automaticamente la trasferibilità alle squadre Champions. MAE/RMSE tiri restano N/D dove mancano actual esatti: non si usano limiti inferiori come valori osservati.

### Incertezza e protocollo di approvazione

Le 18 gare sono al massimo 18 cluster indipendenti; molte selezioni sono correlate e la copertura incompleta può essere informativa. Nessuna conclusione definitiva dai decili sparsi. Per i test futuri usare intervalli al 95% con bootstrap per fixture, confronti accoppiati sul medesimo universo congelato e correzione per confronti multipli. Non presentiamo intervalli i.i.d. sulle selezioni come se fossero indipendenti. Nessuna modifica candidata è stata stimata o validata su questa giornata.

Bootstrap descrittivo, 3.000 repliche per fixture, seed 20261015: ROI 95% [-8.00; 30.05]%, Brier 95% [0.15; 0.22]. Intervalli condizionati agli esiti disponibili; non risolvono missing informativo, discordanza provider o liquidazione non certificata.

## 7. Miglioramenti proposti e verdetti

| Priorità / componente | Verdetto | Problema e prove | Impatto / evidenza / complessità / rischio | Implementazione candidata | Backtest e criteri di approvazione |
| --- | --- | --- | --- | --- | --- |
| P0 Provenienza e referti | MODIFICARE | Snapshot per fixture recuperabili da Git; actual incompleti e controversie nei 58 mercati. | Alto / alta / media / basso | Archivio append-only prima del kickoff con hash, contratto esatto, ID, input e fonti; actual con missing distinto da zero. Solo proposta. | Replay fixture per fixture: 100% cutoff rispettati, nessuna perdita da missing, esclusioni e denominatori riconciliati. |
| P0 Semantica DUO e legni | MANTENERE | Probabilità DUO null e incompatibilità esplicita del singolo già presenti. | Alto / alta / bassa / basso | Mantenere null, non trasferire P; acquisire regole versione/data e catena sostituzioni prima di un eventuale modello. | Test contratti e riconciliazione Sisal; zero esiti non provati; eventuale modello valutato solo su test futuro congelato. |
| P1 Minutaggio previsto | TESTARE | 84,6 minuti ricorrenti contro actual secondari anche di 45 minuti. | Alto / limitata / alta / medio | Confrontare modello attuale con esposizione individuale usando solo input disponibili prima della gara; non adattare 84,6 al solo MD2. | Training precedente e test successivo separati per data, stesso universo giocatori; MAE minuti e MAE/RMSE tiri/SOT devono migliorare con CI paired senza regressioni rilevanti per ruolo. |
| P1 Selettore e quota | TESTARE | Contratti originali con EV negativo; preferito non equivale a valore economico. | Alto / alta descrittiva / media / medio | Replay dei criteri esistenti; confrontare una policy candidata predefinita senza cambiare pesi matematici. | Confronto prospettico con quota disponibile al cutoff; ROI netto e profitto con CI per fixture, Brier non peggiore; controllo di copertura e selezione. Nessun filtro retroattivo presentato come profitto reale. |
| P2 Formula volumi individuali | MANTENERE | Actual esatti insufficienti e benchmark MD1 non accoppiato. | Medio / bassa / alta / alto | Conservare formula attuale; raccogliere actual identificati e campione completo prima di nuovi coefficienti. | Test temporale separato e paired: MAE/RMSE/bias per tiri e SOT, con controllo ruoli e squadre; approvare solo miglioramento robusto. |
| P2 Risultato e gol | TESTARE | Score probabilistici disponibili su subset; numerose soglie correlate. | Medio / limitata / media / medio | Valutare calibrazione predefinita su periodi precedenti, senza rifit MD2. | Brier/log loss ed errore calibrazione su holdout; CI paired favorevoli e nessun peggioramento dei mercati collegati. |
| P2 League Strength, matchup e tattica | MANTENERE | Assenza di confronto causale e actual di zone/ruoli completi. | Potenzialmente alto / insufficiente / alta / alto | Nessun nuovo boost per campionato, ruolo o andamento ex post. | Ablation walk-forward su leghe separate e holdout: MAE/RMSE, Brier/log loss; stabilità per lega. |
| P2 Corner e volumi squadra | TESTARE | Copertura ufficiale incompleta; discordanza corner Feyenoord. | Medio / insufficiente / media / medio | Riconciliare provider e definizioni prima di calibrare. | Ripetere benchmark alle stesse soglie; migliorare scoring e ROI senza usare gare MD2 per scegliere parametri. |
| P3 Filtro titolari | MANTENERE | Non titolari presenti nell’archivio originario; rimozioni operative successive. | Alto / alta / bassa / basso | Mantenere policy canonica e archivio tecnico separato. Nessun aggiornamento durante audit. | Snapshot operativi al cutoff, sincronizzazione e recupero selezioni salvate; zero non titolari operativi dopo XI ufficiale. |

MODIFICARE è una raccomandazione per infrastruttura di audit e raccolta, non una modifica eseguita al motore. Non esistono evidenze sufficienti per approvare oggi un nuovo coefficiente matematico.

## 8. Limiti e dati mancanti

- 75 contratti finali senza probabilità contrattuale originale: esclusi da Brier/log loss, non da eventuale verifica statistica.
- 9 esiti grigi nel campione finale; ROI definitivo non identificabile.
- Prova di pubblicazione online non disponibile; Git documenta disponibilità locale.
- Actual tiri individuali esatti e catene complete DUO mancanti per molti casi; nessuna sostituzione retroattiva.
- Nessuna ricevuta o liquidazione ufficiale Sisal acquisita.
- Nessun nuovo pronostico, backfill di probabilità, refit o build del sito.
- La copertura del confronto player è quella dei contratti pubblicati, non tutti i 22 titolari o l’intera rosa.

## Appendice A — contratti pubblicati e rimossi prima del kickoff

| ID selezione | Partita | Giocatore / ruolo | Contratto e soglia | Quota | P % | Etichetta | Sost. / legni | Esito | Base / motivo |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| sisal:4858178:822473467:5379916640 | Aston Villa - Fenerbahçe | Emiliano Buendía / forward | Emiliano Buendía over 1,5 tiri · sostituto incluso | 1.16 | N/D | altra | true / false | GRIGIO | MISSING_EXACT_CONTRACT_ACTUALS: Actual esatti di giocatore, sostituto e legni non disponibili o non riconciliati. |
| sisal:4858142:822436226:5379691978 | Bodø/Glimt - Borussia Dortmund | Serhou Guirassy / forward | Serhou Guirassy over 0,5 SOT · sostituto incluso · pali/traverse inclusi | 1.16 | N/D | altra | true / true | GRIGIO | MISSING_EXACT_CONTRACT_ACTUALS: Actual esatti di giocatore, sostituto e legni non disponibili o non riconciliati. |
| sisal:4858174:822414864:5379541855 | Manchester City - Paris Saint-Germain | Khvicha Kvaratskhelia / forward | Khvicha Kvaratskhelia over 0,5 SOT · sostituto incluso · pali/traverse inclusi | 1.47 | N/D | altra | true / true | GRIGIO | MISSING_EXACT_CONTRACT_ACTUALS: Actual esatti di giocatore, sostituto e legni non disponibili o non riconciliati. |

## Appendice B — fonti e riproducibilità

- [Risultati UEFA delle 18 gare](https://www.uefa.com/uefachampionsleague/news/02a8-2174c9e9019d-f909a77bd77a-1000--2026-27-uefa-champions-league-all-the-league-phase-fixtures/).
- [Cronaca ufficiale del 14 ottobre](https://www.uefa.com/uefachampionsleague/news/02aa-21d3f8c574f1-e140f41454d4-1000--champions-league-round-up-real-madrid-and-paris-headline-r/).
- [Regolamento calcio Sisal](https://www.sisal.it/content/dam/new-dam/italy/canali/sisal-it/doc-pdf/scommesse/info-scommesse/calcio.pdf): recuperate le clausole esatte alle pagine stampate 441–442; nessuna liquidazione ufficiale acquisita.
- Fonti per riga: URL nel JSON allegato; actual player nelle tabelle precedenti.
- Verifiche pregresse: data/sources/champions-verification-md02-2026-10-14.json; conferme conservate separatamente in champions-verification-confirmations-2026-10-14.json.
- Riproduzione: node output/reports/build-champions-post-match-audit-2026-10-15.cjs. Scrittura limitata ai due file di report MD/JSON.
- Follow-up: champions-md2-gray-recovery-before.json congela l'universo iniziale; champions-md2-gray-recovery-evidence.json documenta solo i 36 casi; champions-md2-gray-research conserva gli estratti recuperati, senza modificare i database del sito.

### Controlli eseguiti

18 fixture, 117 contratti finali, 3 archiviati prima del kickoff; duplicati 0, timestamp non ammissibili 0. 9049 file dati/script/JS/CSS verificati identici tramite SHA256 prima/dopo; riconciliazione conteggi e puntate superata. Nessuna necessità di test UI: nessun file del sito modificato.
