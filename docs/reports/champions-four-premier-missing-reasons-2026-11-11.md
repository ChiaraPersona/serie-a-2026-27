# Perché mancano i dati dei quattro giocatori Premier — 11 novembre 2026

Ricerca primaria per Taylor Harwood-Bellis, Rayan Aït-Nouri, Manuel Ugarte e Tynan Thompson. Dati della stagione 2026/27; campionato senior, coppe e giovanili separati. Nessuna modifica ai dataset, al codice, alle formule, alle quote o alle selezioni durante questa ricerca.

## Risultato

Non sono quattro errori di nome: un caso è un aggiornamento statistico effettivamente da acquisire, due hanno zero impieghi Premier esplicitamente riportati e uno è un giovane con statistiche positive in Premier League 2.

| Giocatore | Campionato senior 2026/27 acquisibile | Spiegazione supportata |
|---|---|---|
| Taylor Harwood-Bellis | Aston Villa, Premier: 1 presenza, 90 minuti | Prima presenza Premier con Villa soltanto l’8 novembre, successiva al cutoff del vecchio archivio; aggiunto alla rosa locale dopo la costruzione del database individuale |
| Rayan Aït-Nouri | Manchester City, Premier: 0 presenze, 0 minuti | Il dato Premier è zero esplicito, distinto da 2 presenze/33 minuti Champions e 2 presenze/134 minuti League Cup. Non è dimostrato un infortunio attuale come causa |
| Manuel Ugarte | Manchester United, Premier: 0 presenze, 0 minuti nel campione pubblicato | Lesione ai legamenti del ginocchio in giugno e successiva riabilitazione; registrazione nella rosa non equivale a presenza |
| Tynan Thompson | Nessun impiego senior verificato; riga PL2: 5 presenze, 257 minuti | Giocatore Under 21, arrivato dal Tottenham nel luglio 2026; i dati giovanili esistono, ma non sono Premier senior |

## Harwood-Bellis: aggiornamento temporale e mancata integrazione

L’[annuncio ufficiale Southampton del 1° settembre](https://www.southamptonfc.com/en/news/article/harwood-bellis-completes-villa-move) conferma il trasferimento definitivo all’Aston Villa. La [scheda ufficiale Villa](https://www.avfc.co.uk/teams/mens/taylorharwood-bellis) conferma arrivo a settembre e riporta 3 presenze/270 minuti senza un filtro campionato esplicito: questi totali non vanno chiamati Premier.

La [notizia ufficiale Villa dell’8 novembre](https://www.avfc.co.uk/news/2026/november/08/prematch-manchester-united-v-aston-villa-team-news/) dichiara che la gara contro Manchester United è stata la sua prima presenza Premier per Villa, dopo due presenze Carabao Cup. La [carriera Opta](https://theanalyst.com/players/4253/taylor-harwood-bellis/career) espone 1 presenza/90 minuti Premier 2026/27 con Villa e, separatamente, 1 presenza/90 minuti Championship con Southampton nello stesso anno: non sommare club e competizioni.

La pagina Opta match log è dinamica: il risultato indicizzato espone il titolare dell’8 novembre, mentre una successiva apertura diretta rende solo le intestazioni. Per il conteggio si usa la riga di carriera numerica acquisibile, corroborata dalla fonte del club e dal referto ESPN controllato dal parent.

Riscontro locale del parent: `data/raw/champions-squads-2026-10-29/audit.json`, squadra Aston Villa, registra Harwood-Bellis/UEFA 250117505 tra gli aggiunti del 29 ottobre. Il database MD3 precedente non lo contiene, il MD4 lo contiene senza provider e il vecchio storico statistico non lo contiene. La rosa è stata aggiornata senza una nuova costruzione completa del database corrente. Inoltre la prima gara Premier è successiva al cutoff 20 ottobre. È una lacuna reale di aggiornamento, non una prova di errore ortografico.

## Aït-Nouri: zero Premier, presenza nelle coppe

La [pagina Opta](https://theanalyst.com/players/4362/rayan-ait-nouri) espone esplicitamente 0/0 in Premier League 2026/27, 2/33 in Champions e 2/134 in League Cup. La [carriera per competizione](https://theanalyst.com/players/4362/rayan-ait-nouri/career) conferma la riga Premier corrente a zero. Le acquisizioni indicizzate consultate sono di circa due/quattro giorni precedenti la verifica, non un feed live.

Il [team news ufficiale City per la prima giornata](https://beta.mancity.com/news/mens/manchester-city-v-bournemouth-team-news-tactics-63923078) lo elenca tra i sostituti. Questo riscontro e i dati delle coppe dimostrano che lo zero Premier non corrisponde a un’identità inesistente. La stampa descrive uno scarso impiego per scelta tecnica, ma in questa ricerca non è stata trovata una conferma primaria sufficiente per trasformare tale interpretazione in una motivazione ufficiale. Nessun infortunio corrente verificato viene assegnato.

Nel database locale l’ID ESPN 272512 è coerente e sono già presenti 33 minuti Champions. I totali domestici null non derivano quindi da un nome non riconosciuto, ma dal fatto che non esiste una riga domestica positiva nell’aggregato acquisito.

## Ugarte: infortunio documentato

La [comunicazione pubblicata dalla Premier League il 28 giugno](https://www.premierleague.com/en/news/4676926/manuel-ugarte-injury-update) riporta la conferma del Manchester United della lesione ai legamenti del ginocchio subita con l’Uruguay. Il [team news ufficiale United per Como](https://www.manutd.com/en/news/press-conference-team-news-for-como-v-united) lo indica ancora tra gli indisponibili di lungo periodo. La [carriera Opta](https://theanalyst.com/players/4167/manuel-ugarte/career), con crawl del mese precedente, espone 0 presenze e 0 minuti Premier 2026/27, separati dagli anni precedenti.

L’URL United sulla riabilitazione dell’11 settembre (`https://www.manutd.com/en/news/ugarte-continues-his-rehab-at-carrington`) compare nell’indice ma l’apertura ha restituito 403; non è necessario per la diagnosi, già supportata dal comunicato primario della lega. Non viene inventata una data di rientro. L’ID corrente 241468 non presenta un conflitto di nome nell’archivio.

## Thompson: statistiche giovanili, non prima squadra

Il [profilo ufficiale Manchester United Under 21](https://www.manutd.com/en/teams/under-21s-team/tynan-thompson) conferma identità, nascita il 17 aprile 2008 e arrivo dal Tottenham il 20 luglio 2026. La classificazione Under 21 non dipende dall’assenza/presenza della sigla Lista B nel nostro registro.

Il [profilo FotMob 1681978](https://www.fotmob.com/players/1681978/tynan-thompson) espone esplicitamente Premier League 2 2026/27: 5 gare, 257 minuti, 0 gol, 3 assist, 6 tiri, 3 SOT. Il match log include l’ultima gara giovanile dell’8 novembre e lo distingue dalla panchina senza ingresso in Como–United del 21 ottobre. La [scheda Opta](https://theanalyst.com/players/8155/tynan-thompson) espone 0 presenze/0 minuti Champions; non è una riga Premier e non va usata per certificare quel campionato.

Il caso è quindi una mancata copertura del giovanile nel dataset senior, non una dimostrata assenza di statistiche calcistiche in generale. Nessun infortunio attuale confermato viene attribuito. Non importare i 257 minuti PL2 come Premier o Champions.

## Controverifica ESPN diretta del parent

Risposte conservate in `data/raw/champions-four-premier-2026-11-11/`. Usata la stagione esplicita `/leagues/eng.1/seasons/2026/athletes/{id}/eventlog`, evitando il parametro season ignorato scoperto nella ricerca precedente.

- Harwood-Bellis: quattro eventi played=true nel registro, ma tre referti riportano appearances=0 (19 settembre, 17 e 31 ottobre). Solo l’evento 401879240 dell’8 novembre contiene appearances=1 e titolarità da 90 minuti.
- Aït-Nouri: sei eventi played=true, ma tutti i referti controllati (23 e 28 agosto, 5 e 20 settembre, 17 e 24 ottobre) riportano appearances=0 e nessun ingresso. Il flag played non basta per contare presenze.
- Thompson: 38 elementi con played=false. Coerente con nessun impiego senior, ma insufficiente da solo a certificare ogni competizione.
- Ugarte: solo `$ref`, senza events. Una risposta vuota non prova zero: il riscontro numerico è Opta, il motivo dell’assenza è supportato dai comunicati ufficiali.

Queste verifiche spiegano perché non si devono promuovere automaticamente i flag dei registri o gli zeri di catalogo nei dati pubblici. I referti e le righe esplicite per stagione/competizione hanno precedenza.

Manifest delle 14 acquisizioni API (quattro registri e dieci referti), con URL, timestamp e hash: `output/champions-four-premier-evidence-manifest.json`. Nessun dataset di produzione modificato nella verifica.
