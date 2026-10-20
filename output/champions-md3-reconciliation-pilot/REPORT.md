# Champions MD3: correzione di precisione e pilota isolato

Data: 20 ottobre 2026, prima di Fenerbahçe–Slavia Praha. Base: `output/champions-md3-statistics-audit/REPORT.md`, `coverage.csv`, `missing-starters.json`. Nessun builder globale o output congelato è stato rigenerato.

## Fenerbahçe e test

`scaleShotProjections` arrotondava ogni quota individuale a due decimali prima del controllo di squadra. I 16 giocatori eleggibili producevano 17,54 tiri contro 17,57 previsti (−0,03), pur avendo fattore non limitato 1,132863 e somma non arrotondata pari al target. I SOT erano 7,14/7,14. Il controllo `|delta| <= 0,02` respingeva tutti i dieci titolari di movimento.

La funzione ora conserva il risultato originale se passa; in caso contrario ripete *lo stesso calcolo* a quattro decimali e lo accetta solo se passa il controllo già esistente. Target, pesi, fattori limite 0,72–1,35 e tolleranza 0,02 restano invariati; nessun residuo viene assegnato a un giocatore. Il pilota produce 17,5700 tiri e 7,1401 SOT, differenze 0 e +0,0001. Dieci titolari Fenerbahçe sono eleggibili **nella simulazione**, a condizione che l'XI probabile rimanga quello locale.

`node scripts/test-champions-md3-reconciliation-precision.cjs`: PASS; conservazione, idempotenza, input immutato, allocazione tramite fattore identico; 24 squadre prima operative identiche; solo Fenerbahçe, Bayern e Club Brugge passano di nuovo. `node scripts/test-champions-md3-offline.js`, `node scripts/test-champions-md3-probable.mjs` e `node scripts/test-champions-md3-publication.mjs`: PASS. `node scripts/test-champions-md3-lineup-managed.mjs`: FAIL sull'hash protetto di `data/normalized/champions-registered-squads-2026-27.json`; il file non è modificato nella working tree e il test usa uno snapshot hash preesistente. La parte precedente del test (integrazione/schedina) non ha fallito.

## Sei squadre richieste

| Squadra | Differenza a 2 decimali tiri/SOT | Differenza a 4 decimali | Diagnosi |
|---|---:|---:|---|
| Bayern München | 0 / −0,03 | −0,0002 / 0 | Solo arrotondamento; 10 titolari sbloccabili |
| Club Brugge | −0,02 / +0,03 | −0,0001 / +0,0001 | Solo arrotondamento; 10 titolari sbloccabili |
| Como | −2,21 / −0,97 | −2,2199 / −0,9615 | Fattori al limite 1,35; Kaiki Bruno e Mattia Liberali senza minuti idonei |
| Lille | 0 / −0,15 | +0,0002 / −0,1288 | Fattore SOT al limite 1,35; Loun Srdanović senza minuti idonei |
| Manchester United | −0,02 / +0,04 | +0,0001 / +0,0369 | Fattore SOT al limite 0,72; Ayden Heaven senza minuti idonei |
| Roma | −1,80 / −0,79 | −1,8144 / −0,8026 | Fattori al limite 1,35, volumi individuali insufficienti per il target |

Tutte e sei hanno target di squadra presenti; non è emerso un conflitto d'identità che spieghi questi blocchi. Como, Lille, Manchester United e Roma rimangono bloccate: non è stata alzata la tolleranza né superato il limite del fattore.

## Slavia Praha

`slavia-evidence.cjs` collega **solo in memoria** l'ID provider storico esatto di ciascun titolare ai raw già importati, applica il cutoff prepartita e la funzione esistente `estimateExpectedMinutes` (minimo tre partenze esatte). Nove minuti condizionali sono calcolabili: Markovič 90, Zima 80,6, Vlček 84,5, Holeš 51, Sadílek 82,6, Moses 73,4, Provod 87,6, Šturm 90, Chorý 74,2. Gli ID partita e i dati per90 sono in `slavia-evidence.json`. Non sono stati copiati nei dati normalizzati: la policy `TEAM_ONLY`, la base incompleta e la panchina non documentata impediscono ancora la proiezione.

N'Guessan: ID locale del provider statistico 220165, ID UEFA 250223131; UEFA registra una presenza e 75 minuti, ma i raw locali idonei sono zero e manca una base storica tiri/SOT. Ayaosi: ID UEFA 250223128, Sisal 1093235 già associato al suo ID canonico nell'archivio contratti MD2; **l'ID del provider statistico** resta assente. UEFA registra due presenze e 180 minuti. Per entrambi le pagine UEFA consultate non espongono un conteggio esplicito completo di tiri/SOT compatibile con i per90 richiesti; nemmeno le presenze UEFA raggiungono il minimo locale di tre partenze esatte. Il resoconto Slavia di Sabah documenta N'Guessan titolare fino al 75' e Ayaosi titolare, ma la cronaca non è un dataset completo di tiri/SOT.

La previsione UEFA del 20 ottobre mette Ayaosi nel probabile XI e N'Guessan fuori dal probabile XI; non è una formazione ufficiale. Non risulta documentata una lista completa di convocati/panchina per Fenerbahçe–Slavia. La formazione locale congelata differisce anche per altri nomi: la simulazione resta condizionata a quel vecchio XI probabile e non aggiorna il registro ufficiale.

## Simulazione Fenerbahçe–Slavia

`node output/champions-md3-reconciliation-pilot/simulate.cjs` legge gli output congelati, sostituisce **solo in memoria** le 16 proiezioni Fenerbahçe, calcola le cinque probabilità dei dieci titolari con `starterThresholds`, integra i contratti con la funzione condivisa MD7 e applica il selettore preliminare alla sola fixture. I dettagli sono in `simulation.json`.

Dieci titolari hanno proiezioni e probabilità condizionali. Quattro contratti quotati sono ammessi dal filtro tecnico di previsione: Greenwood e Muriqi 3+ tiri DUO e 2+ SOT DUO. Sono tutti contratti giocatore+eventuale sostituto: la probabilità **congiunta** non è generata dal modello, dunque P ed EV restano N/D e il selettore non li pubblica. Sei altri candidati singoli sono esclusi dal criterio MD7 per sostegno alla soglia/lettura insufficiente. La selezione preliminare resta le sei scelte collettive congelate, con gli stessi ID, probabilità e quote. Nessuna previsione è approvata statisticamente.

Copertura: **230 → 260** titolari di movimento con proiezioni utilizzabili in simulazione (Fenerbahçe +10, Bayern +10, Club Brugge +10); includendo le riserve condizionali, **405 → 459** giocatori. I file pubblicati restano rispettivamente a 230 e 405, perché nessun builder è stato eseguito.

## Ancora necessario

1. Acquisire identità del provider statistico, almeno tre partenze esatte e serie complete minuti/tiri/SOT per Ayaosi e N'Guessan, o documentare una nuova formazione probabile/ufficiale con XI e panchina verificati; mantenere l'isolamento se i dati restano insufficienti.
2. Verificare convocati e panchina delle due squadre e la discordanza con la previsione UEFA recente prima di usare le proiezioni Fenerbahçe in una pubblicazione.
3. Per Como, Lille, Manchester United e Roma recuperare minutaggi mancanti e/o statistiche individuali sufficienti; la precisione numerica non risolve i fattori al limite.
4. Gestire separatamente, con un modello approvato, le probabilità congiunte dei contratti DUO. Fino ad allora P/EV DUO N/D.
5. Aggiornare lo snapshot hash del test di gestione formazioni solo dopo una revisione separata del suo input protetto, senza toccare le rose in questo lavoro.

Fonti esterne consultate solo per questa ricerca mirata: [UEFA N'Guessan](https://www.uefa.com/uefachampionsleague/clubs/players/250223131--ange-n-guessan/), [UEFA Ayaosi](https://www.uefa.com/uefachampionsleague/clubs/players/250223128--emmanuel-ayaosi/), [UEFA XI previsti MD3](https://www.uefa.com/uefachampionsleague/news/02aa-21dd60778d8f-1ea14fd92256-1000--champions-league-predicted-line-ups-matchday-3-team-news-/), [Slavia–Sabah](https://www.slavia.cz/cze/match/7147).
