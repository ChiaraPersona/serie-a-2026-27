# Aggiornamento completo delle basi squadra — MD11

6 novembre 2026. Motore 4.16.0. Estensione esplicitamente autorizzata a tiri totali, corner, falli, cartellini, gol attesi e risultati esatti per tutte le squadre. Nessun commit, push o deploy.

## Modifica

Le cinque basi di conteggio (tiri, SOT, corner, falli e gialli) incorporano i referti canonici della stagione corrente precedenti alla fixture. Il taglio e esclusivo per giornata e data; sono ammesse solo gare concluse, con fixture target sempre esclusa e valori mancanti mai convertiti in zero. Nel campione MD11 sono disponibili dieci gare e statistiche complete per ciascuna delle venti squadre.

Lo storico Serie A comparabile resta un prior equivalente a dodici gare. Quando manca, viene impiegata la distribuzione realmente osservata della lega con forza equivalente a quattro gare, senza equiparare le statistiche Serie B alla Serie A. Produzione propria, produzione degli avversari affrontati dall'opponente e recente mantengono i pesi 45/35/20. Per i falli, la componente contro l'opponente rappresenta i falli commessi dalle squadre che lo affrontano. Per i gialli resta un descrittore del contesto disciplinare degli avversari affrontati, non una relazione causale o una probabilita individuale calibrata.

Tiri/SOT/falli usano il campione corrente complessivo regolarizzato verso il prior per sede. Corner e gialli usano le osservazioni correnti della sede pertinente regolarizzate verso lo storico per sede e anche la componente recente regolarizzata: la variante iniziale con recente grezzo aumentava il rumore. La numerosita globale e distinta dai campioni per sede. Le scelte 12/4 non sono state ottimizzate su questo breve campione.

Le ultime otto gare appartengono ora alla stagione corrente, con decadimento 0,82; per corner/gialli il valore pesato viene ulteriormente regolarizzato verso il prior. Non sono applicati sopra la nuova base i precedenti correttivi generali di produzione e concessione degli stessi volumi. Restano i fattori contestuali esistenti per attacco, possesso e undici previsto. La precisione della formazione continua a essere confrontata con il riferimento storico originale, evitando di alterarne il denominatore con i nuovi tiri.

Le distribuzioni empiriche storiche di falli e gialli provengono dai referti canonici completi Serie A 2025/26: non sono ricavate dalle sole righe visibili di un elenco arbitri. I gialli non vengono confusi con secondi gialli, rossi o un totale aggregato di tutti gli eventi disciplinari. Il contratto dati della nuova stima squadra lo dichiara; i riskScore dei singoli ammoniti restano euristiche comparative senza probabilita calibrata.

## Gol, xG e risultati esatti

I tassi attacco/difesa complessivi e per sede vengono aggiornati con i gol segnati/subiti correnti regolarizzati. Per le neopromosse la prior e di lega, senza applicare nuovamente il vecchio abbattimento di divisione ai tassi gia espressi sulla scala Serie A. Gli xG correnti prodotti e concessi aggiornano i profili storici quando presenti, rendendo utilizzabile la copertura corrente anche dove mancava il vecchio profilo. Il recente xG usa le ultime otto gare correnti pesate. Gli xG osservati restano distinti dai gol attesi del modello.

Non sono stati cambiati i pesi del nucleo gol, il contributo xG del 25%, i correttivi H2H, l'eventuale contributo xGOT gia autorizzato, o il metodo Poisson. Gli input correnti aggiornano la stessa matrice da cui discendono probabilita 1X2, mercati gol, risultati esatti, risultato centrale e moda assoluta. Nessun punteggio e corretto manualmente.

I metadati separano la validazione storica del precedente nucleo dalla nuova integrazione: `modelValidation.currentTeamAdaptation.statisticallyValidated=false`. Le metriche del vecchio backtest non sono presentate come validazione dell'adattamento 4.16.

## Confronto temporale diagnostico

`node scripts/research/current-team-baseline-audit.cjs` confronta 50 fixture MD6-10, 100 osservazioni squadra per conteggio, usando solo giornate precedenti alla fixture. I conteggi sono confrontati con contesto neutro; il confronto gol ha undici neutri, nessuna quota e una forma recente comune semplificata. Non ricostruisce gli originali snapshot prepartita e non e un backtest completo delle selezioni. I risultati sono stati esaminati dopo aver visto il problema; la variante prudente corner/gialli e stata scelta dopo la prima diagnostica. Non esiste un holdout intatto.

| Grandezza | MAE base storica/proxy | MAE nuova base |
| --- | ---: | ---: |
| Tiri totali | 4,516 | 4,071 |
| SOT | 2,083 | 1,976 |
| Corner | 2,132 | 2,168 |
| Falli | 3,279 | 3,088 |
| Gialli | 1,004 | 0,992 |

**Per i corner il confronto non dimostra un miglioramento**: l'errore medio cresce di 0,036, mentre la sottostima media si riduce da -0,436 a -0,334. L'adattamento e applicato come aggiornamento corrente autorizzato, con regolarizzazione e validazione prospettica ancora pendente; non viene certificato come superiore al modello precedente. I miglioramenti piccoli dei gialli non sono conclusivi.

Nel confronto diagnostico gol, l'errore medio per squadra passa da 1,0544 a 1,0434; log-loss 1X2 da 0,9048 a 0,8889; Brier 1X2 da 0,5272 a 0,5163; log-loss del punteggio esatto da 3,3420 a 3,2489. I risultati centrali esatti passano da 3/50 a 5/50: il campione non consente conclusioni robuste sulla loro frequenza. Nessuna di queste metriche misura una liquidazione bookmaker o il rendimento economico.

Evidenze: `data/analysis/current-team-baseline-2026-11-06/temporal-diagnostic.json`; la prima variante meno regolarizzata e conservata in `temporal-diagnostic-naive.json`.

## Risultati operativi

I valori prima si riferiscono allo stato immediatamente successivo all'aggiornamento SOT 4.15; quelli dopo al motore completo 4.16.

| Squadra | Tiri prima/dopo | SOT prima/dopo | Corner prima/dopo | Falli prima/dopo | Gialli prima/dopo |
| --- | ---: | ---: | ---: | ---: | ---: |
| cagliari | 12,49 / 13,2 | 3,9 / 4 | 4,4 / 4,7 | 13,7 / 13 | 2 / 1,8 |
| frosinone | 12,27 / 17,5 | 6 / 5,8 | 5,9 / 6,2 | 14,9 / 13,5 | 2,4 / 1,7 |
| fiorentina | 13,3 / 14,9 | 4,7 / 4,7 | 4,8 / 5,1 | 12,5 / 11,3 | 2,1 / 2 |
| juventus | 16,2 / 15 | 5 / 5 | 5,1 / 5,4 | 12,1 / 12,6 | 1,3 / 1,6 |
| genoa | 11 / 12,1 | 4 / 4 | 4,2 / 4,4 | 12,4 / 11,1 | 1,6 / 1,7 |
| milan | 12,25 / 12,2 | 4,3 / 4,3 | 3,6 / 4,2 | 10,1 / 11,2 | 1,6 / 1,8 |
| inter | 16,68 / 18,1 | 5,8 / 5,8 | 6,3 / 6,3 | 13,1 / 11,4 | 1,7 / 1,6 |
| como | 13,5 / 15,3 | 5,4 / 5,4 | 4,4 / 4,2 | 13,5 / 10,1 | 2,1 / 1,7 |
| monza | 13,4 / 13,9 | 6,1 / 6 | 4,8 / 4,7 | 12,2 / 11,4 | 3 / 1,7 |
| atalanta | 13,1 / 14,4 | 4,6 / 4,7 | 4,3 / 4,3 | 12,2 / 10,9 | 1,5 / 1,5 |
| napoli | 13,7 / 15,5 | 5 / 5,1 | 5,4 / 5,6 | 11,2 / 10,8 | 1,2 / 1,6 |
| lazio | 11,48 / 12,8 | 4,1 / 4 | 3,4 / 3,7 | 10,1 / 10,4 | 2 / 1,8 |
| parma | 10,7 / 11,2 | 3,9 / 3,9 | 4,2 / 4,7 | 10,8 / 12,1 | 1,6 / 1,6 |
| bologna | 11,77 / 12,4 | 3,9 / 3,9 | 4 / 3,9 | 13,2 / 13,4 | 1,7 / 1,9 |
| roma | 14,7 / 16,2 | 5,6 / 5,6 | 5,4 / 5,8 | 13,8 / 11,8 | 1,7 / 1,7 |
| sassuolo | 10,8 / 11,7 | 4 / 4 | 3,6 / 3,8 | 11,7 / 11 | 2,2 / 2 |
| torino | 12,51 / 13,3 | 4,7 / 4,7 | 4,8 / 4,9 | 14 / 11,4 | 1,9 / 1,4 |
| lecce | 11,03 / 14,1 | 5,2 / 5,2 | 4,6 / 5,1 | 12,7 / 12,7 | 1,8 / 1,7 |
| venezia | 14,07 / 14,1 | 4 / 4 | 5,3 / 4,7 | 9,6 / 10 | 1,7 / 1,7 |
| udinese | 11,99 / 14,1 | 4,2 / 4,3 | 4,3 / 4,7 | 13,6 / 11,6 | 1,9 / 1,6 |

| Fixture | Gol attesi prima | Gol attesi dopo | Centrale prima/dopo |
| --- | ---: | ---: | --- |
| cagliari-frosinone-2026-27-md-11 | 1,33-1,64 | 1,25-2,21 | 1-2 / 1-2 |
| fiorentina-juventus-2026-27-md-11 | 1,12-1,57 | 1,23-1,86 | 1-2 / 1-2 |
| genoa-milan-2026-27-md-11 | 1-1,76 | 1,04-1,91 | 1-2 / 1-2 |
| inter-como-2026-27-md-11 | 1,93-1,32 | 2-1,49 | 2-1 / 2-1 |
| monza-atalanta-2026-27-md-11 | 1,17-1,92 | 1,83-2,22 | 1-2 / 2-2 |
| napoli-lazio-2026-27-md-11 | 1,45-0,98 | 1,46-1,37 | 1-1 / 1-1 |
| parma-bologna-2026-27-md-11 | 1-1,34 | 1,01-1,47 | 1-1 / 1-1 |
| roma-sassuolo-2026-27-md-11 | 2,15-0,85 | 3-1,03 | 2-1 / 3-1 |
| torino-lecce-2026-27-md-11 | 1,7-1,24 | 1,87-1,34 | 2-1 / 2-1 |
| venezia-udinese-2026-27-md-11 | 1,15-1,53 | 1,35-1,63 | 1-2 / 1-2 |

In Cagliari-Frosinone il risultato centrale resta 1-2, ma cambiano i gol attesi: 1,33-1,64 -> 1,25-2,21. Il Frosinone passa a 17,5 tiri, 5,8 SOT, 6,2 corner, 13,5 falli e 1,7 gialli. Il lieve cambio SOT rispetto a 6,0 e conseguenza del contesto di gara aggiornato con i nuovi gol attesi, non di una correzione manuale.

## Cataloghi, isolamento e verifiche

Ricalcolate le dieci partite MD11 con i builder esistenti, poi rigenerate Letture, Schedina e proiezioni browser e completato il build di presentazione. Le selezioni operative condivise passano da 207 a 221: 38 inserimenti e 24 rimozioni, compresi cambi di soglia. I criteri di ammissione e la validazione congelata dei modelli statistici del catalogo non sono stati alterati. I contratti comuni verificati prima/dopo sono 1.724, con identita e quote preservate; il test del catalogo verifica tutti i contratti quotati contro market ID, selection ID, soglia e semantica dello snapshot provider.

Probabilita, quota equa ed EV dei contratti DUO individuali restano N/D. Non e stata creata una probabilita DUO dalla stima del solo giocatore. Nessuna fixture conclusa o estranea alla MD11 e stata ricalcolata nei dati canonici, nessuna liquidazione o precedente rendimento e stato riscritto. Gli altri motori di competizione non ricevono automaticamente le basi Serie A. Le nuove stime saranno applicate alle successive fixture Serie A quando il relativo builder le generera con il cutoff corretto.

Passati:

- `node scripts/test-current-team-baseline.cjs`: cinque basi correnti, esclusione target e futuro, sensibilita di gol/xG alle gare antecedenti, mancanti e assenza del doppio correttivo. Il test dei correttivi tiri/corner e fallito prima della modifica e passato dopo.
- `node scripts/test-current-sot-volume.cjs`: compatibilita del percorso SOT e preservazione degli input originali.
- `node scripts/check-current-team-refresh.cjs`: venti squadre, cinque conteggi, dieci coppie di gol attesi, identita quote, DUO N/D, isolamento storico, somme individuali riconciliate ai totali, SOT <= tiri, probabilita e risultati esatti ricalcolati indipendentemente dalla stessa matrice Poisson.
- Suite volumi storici, matchup delle venti squadre, motore pronostici e contratti UI Prediction V2.
- Test MD11 Schedina: 221 selezioni operative quotate, sincronizzazione Lettura/Schedina e salvataggio/ripristino di dieci selezioni.
- Test MD11 browser: tutte le dieci Letture e Schedina a 1440 e 390 pixel, senza errori JavaScript o overflow. Edge e stato eseguito fuori sandbox, come nella verifica precedente.
- `git diff --check`.

Confronto operativo dettagliato e cambi di selezione: `data/analysis/current-team-baseline-2026-11-06/operational-refresh.json`. Baseline precedente e log in `output/current-team-md11-2026-11-06/`; evidenze UI in `reports/md11-reading-refresh/` e `reports/md11-schedina/`. Le catture dei modelli spaziali sono state disabilitate durante il build, preservando la loro separazione dalle previsioni operative.
