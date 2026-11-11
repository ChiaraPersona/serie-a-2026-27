# Seconda ricerca sui dati individuali Champions mancanti — 11 novembre 2026

Ricerca sulle fonti primarie e sugli archivi canonici del progetto. Nessuna modifica a dataset, formule, quote, previsioni o pagine pubbliche. Le fonti restano documentate soltanto internamente.

## Risultato

Le lacune non sono tutte assenze assolute: tre giocatori con minuti ma tiri/SOT N/D possiedono già evidenze aggiuntive per competizione. Le fonti esterne del LASK espongono inoltre statistiche più recenti, ma presentano snapshot discordanti. Non è corretto promuovere automaticamente tali valori nei totali esistenti.

## Classificazione completa delle 523 lacune dei minuti

Ricalcolo sulle rose correnti e sullo stesso abbinamento per ID impiegato dalla pagina; dettaglio riproducibile in `output/champions-second-research-local.json` e nei JSON canonici citati sotto.

- 317 giocatori non hanno un record associabile nel database corrente: 311 senza ID ESPN nella rosa, 6 con ID ESPN.
- 206 hanno un record associabile, ma `currentSeason.totals.minutes` resta null.
- 375 dei 523 non hanno ID ESPN nella rosa; questo gruppo si sovrappone ai precedenti e non va sommato.
- 36 dei 523, distribuiti su 22 squadre, possiedono `officialClubShooting.coveredTotals.appearances > 0`: sono piste di riconciliazione, non 36 lacune risolte né totali stagionali completi.
- Il database MD4 non offre ulteriori minuti valorizzati per questi 523 giocatori.

### Sei presenze positive già archiviate

Fonte primaria interna: `data/sources/champions-observed-performances-2026-27.json`, confrontata con `data/normalized/champions-player-stats-2026-27.json` mediante identità esatte. I minuti sono quelli delle osservazioni coperte e conservano i limiti del metodo di stima già dichiarato, non la certificazione dell'intera stagione.

| Giocatore | Squadra | Minuti nelle osservazioni Champions | Causa della lacuna nella tabella |
|---|---|---:|---|
| Hiroki Ito | Bayern | 17 | `entries` europeo presente, `totalsScope` domestico senza competizione e totali vuoti |
| Luke Chambers | Liverpool | 5 | Stesso disallineamento di ambito |
| Rayan Ait-Nouri | Manchester City | 33 | Stesso disallineamento di ambito |
| Kaique Pereira | Sporting CP | 180 | Stesso disallineamento di ambito |
| Ameen Al-Dakhil | Stuttgart | 4 | Stesso disallineamento di ambito |
| Maxence Caqueret | Como | 26 | Osservazione presente ma nessun record nel database corrente, anche cercando l'ID ESPN 265912 nell'intero archivio |

La causa è confermata anche da `scripts/import-champions-results-details.cjs:116-120`: l’importatore mantiene l’ambito dei totali preesistenti, aggiorna le evidenze UEFA separate e modifica i totali primari solo quando l’importazione tocca quel medesimo ambito. Il comportamento preserva la separazione fra competizioni; il limite è l’esposizione del solo totale selezionato nella pagina.

Questi sei casi dimostrano che “minuti N/D nel totale selezionato” non significa necessariamente “nessun dato individuale”. Per i primi cinque occorre una vista per competizione o una correzione esplicita dell'ambito, senza trasferire minuti europei nei totali domestici. Caqueret richiede ricostruzione del record canonico dall'osservazione verificata. Nessuna di queste modifiche è stata effettuata durante la ricerca.

## Tre casi con minuti disponibili e tiri/SOT mancanti

Evidenza primaria locale: `data/normalized/champions-player-stats-2026-27.json`, squadre `club-brugge` e `lask`, oggetti `currentSeason` e `officialClubShooting`. I valori seguenti sono reperti dell'archivio, non una nuova certificazione esterna dell'intera stagione.

| Giocatore | ID ESPN | Totale domestico usato dalla pagina | Evidenza aggiuntiva interna | Esito |
|---|---|---|---|---|
| Andrej Vasovic, Club Brugge | 395631 | 1 presenza, 9 minuti, tiri/SOT null | Pro League: 1 presenza, 0 tiri, 0 SOT; `fullSeasonVerified=false` | Candidato da riconciliare sulla stessa gara e finestra; non dedurre zero stagionale |
| Daniel Elfadli, LASK | 343993 | 1 presenza, 90 minuti, tiri/SOT null | Bundesliga austriaca: 1 presenza, 0/0, FotMob; esiste separatamente una presenza Champions | Candidato domestico da verificare per referto; tenere separata la gara Champions |
| Sasa Kalajdzic, LASK | 259131 | 2 presenze, 171 minuti, tiri/SOT null | Bundesliga austriaca FotMob: 4 presenze, 9 tiri, 3 SOT; `coverageDifference=true` | Campioni diversi: vietato inserire 9/3 nel totale delle due presenze ESPN |

Gli URL conservati nelle evidenze sono [Vasovic, referto FotMob 5811746](https://www.fotmob.com/api/data/matchDetails?matchId=5811746), [Elfadli, referto 5845999](https://www.fotmob.com/api/data/matchDetails?matchId=5845999) e, per Kalajdzic, i referti FotMob 5845984, 5845989, 5845997 e 5845999. Il web tool non ha potuto acquisire il primo endpoint FotMob: l'evidenza locale non equivale a una nuova verifica online.

## Verifica esterna: fonti realmente consultate

### LASK

La [rosa ufficiale LASK](https://www.lask.at/de/m/teams/pros), consultata l'11 novembre, mostra Elfadli con 4 presenze e Kalajdzic con 6 presenze. La pagina include risultati fino al 7 novembre. La [scheda ufficiale Elfadli](https://www.lask.at/de/m/player/daniel-elfadli) restituita dal motore mostra invece 2 presenze, 105 minuti, 0 gol e 0 assist; la [scheda ufficiale Kalajdzic](https://www.lask.at/de/m/player/sasa-kalajdzic) mostra 5 presenze, 271 minuti, 1 gol e 1 assist. Le acquisizioni indicizzate delle singole schede hanno date differenti e non dichiarano chiaramente il cutoff statistico. Questi numeri dimostrano un percorso di recupero, ma richiedono riconciliazione gara per gara e identificazione della competizione prima dell'importazione. Non sono stati acquisiti nuovi tiri/SOT certificati dalle pagine del club.

### Identità UEFA di giocatori senza numeri

[William Saliba, UEFA ID 250127439](https://www.uefa.com/uefachampionsleague/clubs/players/250127439--william-saliba/) è identificato come difensore Arsenal. La [scheda statistiche UEFA](https://www.uefa.com/uefachampionsleague/clubs/players/250127439--william-saliba/statistics/) accessibile al web tool restituisce intestazione e confronti, senza statistiche numeriche. La scheda [Khari Ranson, UEFA ID 250190788](https://www.uefa.com/uefachampionsleague/clubs/players/250190788--khari-ranson/) conferma identità, Arsenal e ruolo portiere, ma non prova presenze né assenza di presenze.

La [pagina carriera Premier League di Saliba](https://www.premierleague.com/en/players/462424/william-saliba/career) compare nella ricerca con una riga 2026/27 a zero presenze; l'apertura diretta non restituisce le statistiche. Non è stata utilizzata per trasformare N/D in zero. La pagina UEFA delle gare restituita dal motore ha inoltre un crawl vecchio con appuntamenti già trascorsi ancora classificati futuri: non è utilizzabile come calendario aggiornato.

### Accessi non riusciti

- [Scheda ESPN Saliba ID 277385](https://www.espn.com/soccer/player/_/id/277385/william-saliba): challenge JavaScript/anti-bot.
- [Referto ESPN bel.1 401879005](https://site.api.espn.com/apis/site/v2/sports/soccer/bel.1/summary?event=401879005): non accessibile via web tool.
- [Referto ESPN aut.1 401881768](https://site.api.espn.com/apis/site/v2/sports/soccer/aut.1/summary?event=401881768): non accessibile via web tool.
- [Referto FotMob 5811746](https://www.fotmob.com/api/data/matchDetails?matchId=5811746): non accessibile via web tool.

Un accesso fallito descrive il limite di questa acquisizione, non dimostra che il provider non possieda dati.

## Prossimo recupero verificabile

1. Riconciliare Vasovic ed Elfadli sulle singole gare già archiviate: identità provider, competizione, data, minuti e definizioni tiri/SOT devono coincidere.
2. Per Kalajdzic ricostruire l'intera finestra domestica su un unico campione coerente; non innestare i tiri di quattro gare nei minuti di due.
3. Acquisire per gli altri casi referti individuali e roster ufficiali, separando nessuna presenza verificata, identità senza mapping e statistiche non acquisite.
4. Conservare N/D dove la seconda ricerca non ha prodotto dati numerici riconciliati; non propagare gli eventuali recuperi in pronostici o contratti DUO.
