# Esperimento sul ranking dei probabili ammoniti

9 novembre 2026 · Serie A 2026–27

| Variante | Gialli centrati | Esattamente 3/5 | Almeno 3/5 | Liste con nomi diversi rispetto al riferimento |
| --- | ---: | ---: | ---: | ---: |
| Ranking attuale ricostruito | 49/300 (16,3%) | 3 | 5 | — |
| Punteggio × minuti attesi / 90 | 56/300 (18,7%) | 3 | 4 | 55 |
| Cinque punteggi più alti senza quota per squadra | 48/300 (16,0%) | 3 | 5 | 5 |

Ricostruzione sulle stesse 60 partite delle giornate 6–11. In 35 gare i referti riportano almeno tre ammoniti distinti. I tassi di almeno tre centrati su queste gare sono rispettivamente 14,3%, 11,4% e 14,3%. Il punteggio con i minuti riutilizza la stima prepartita del motore e mantiene la presenza di entrambe le squadre. La variante senza quota conserva il punteggio originario. Ogni variante conta soltanto il giallo ordinario al giocatore indicato.

Le liste storiche sono ricalcolate dal motore attuale con gli input locali, incluso il contesto della formazione oggi disponibile. Il builder esclude la giornata target dagli aggregati recenti, ma la ricostruzione non certifica la disponibilità prepartita di tutti gli input. Il riferimento ricostruito ha 49 centrati. L’audit separato delle liste conservate in Lettura ne aveva rilevati 48 nello stesso intervallo. Il confronto storico resta esplorativo.

## Verifica prospettica

Il 9 novembre alle 20:34 italiane sono state congelate le tre liste per tutte le dieci partite della 12ª giornata. Lo snapshot contiene i candidati, i metadati degli undici di riferimento in stato probabile, il ranking, i minuti attesi, l’orario del calcio d’inizio e le impronte del codice. Gli undici sono proiezioni di squadra disponibili al momento della cattura. Il file è in `data/analysis/card-prediction-research/ranking-comparison-md12.json`.

```powershell
node scripts/research/cards/compare-rankings.cjs reconstruct 6 7 8 9 10 11
node scripts/research/cards/compare-rankings.cjs freeze 12
node scripts/research/cards/compare-rankings.cjs evaluate 12
```

Il secondo comando documenta la cattura già eseguita e rifiuta la sovrascrittura. Il terzo legge lo snapshot e confronta le liste con i gialli quando arrivano referti completi.

## Duelli difensivi e corsie d’attacco

Sulle 60 partite, il metodo precedente nominava un avversario diretto in 25 casi su 505 candidati difensori. In 23 di quei 25 casi indicava un altro difensore. Il filtro sperimentale considera attaccanti e centrocampisti sulla corsia opposta, vista dalla prospettiva avversaria. Per i centrali considera anche gli avversari che occupano il corridoio centrale. Se più giocatori con dati di falli subiti risultano compatibili, il fattore individuale resta neutro. La quota d’attacco per corsia era già nel punteggio e mantiene il peso precedente.

La variante ha trovato 78 opposizioni nominative con dati utilizzabili, ha cambiato i nomi in 10 liste e ha centrato 49 gialli su 300. Ha ottenuto 2 partite da esattamente 3/5 e 4 da almeno 3/5. Il riferimento ricostruito ha centrato 49 gialli, 3 partite da esattamente 3/5 e 5 da almeno 3/5. Il confronto isola il filtro tattico e usa lo stesso campione retrospettivo.

Le descrizioni in Lettura applicano il filtro di ruolo e corsia. I nomi indicano opposizioni possibili e dipendono dai ruoli disponibili. La variante di punteggio resta sperimentale. La cattura originale della 12ª giornata precede questa variante.

## Combinazione delle tre modifiche

Sulle stesse 60 partite, la combinazione moltiplica il punteggio con i duelli corretti per i minuti attesi divisi per 90 e seleziona i cinque punteggi più alti senza quota per squadra. Ha centrato 57 gialli su 300 (19,0%), contro 49 del riferimento e 56 della variante con i soli minuti attesi. Ha cambiato i nomi in 55 liste. Le partite da esattamente 3/5 sono salite da 3 a 4. Quelle da almeno 3/5 sono rimaste 5 su 60, pari a 5 su 35 tra le partite con almeno tre ammoniti effettivi. Anche questo confronto è retrospettivo. La combinazione è successiva alla cattura originale della 12ª giornata.

La combinazione al 19,0% è il riferimento sperimentale preferito per i confronti successivi.

## Storico individuale dei gialli

La combinazione preferita usa già la frequenza disciplinare individuale della stagione precedente. La variante dedicata sostituisce la componente storica generica con il tasso dei soli gialli ordinari per 90 minuti. Combina la stagione precedente al 50% del suo minutaggio con le partite concluse prima della giornata target, quando i dati individuali di minuti e cartellini sono completi. La stima parte da 0,12 gialli per 90 su 900 minuti equivalenti, per limitare l’effetto dei campioni piccoli. Minuti attesi, duelli per ruolo e corsia e assenza della quota per squadra seguono la combinazione preferita.

Sulle stesse 60 partite la variante ha centrato 50 gialli su 300 (16,7%), contro 57 (19,0%) della preferita. Entrambe hanno ottenuto 4 partite da esattamente 3/5. Con almeno tre centrati sono state rispettivamente 4 e 5. La combinazione al 19,0% resta il riferimento sperimentale.

## Lista da uno a cinque nomi

La variante conserva l’ordine della combinazione preferita. Il numero di nomi è la somma dei gialli attesi per le due squadre, corretta con il fattore arbitrale regolarizzato e arrotondata all’intero più vicino, con minimo uno e massimo cinque. La stima di squadra considera produzione, gialli indotti dall’avversaria, casa o trasferta e gare precedenti alla giornata target. Con stima incompleta si conservano cinque nomi. Le liste fisse da tre e quattro verificano l’effetto del semplice taglio della lista.

| Lista | Gialli centrati | Almeno tre centrati |
| --- | ---: | ---: |
| Cinque nomi, riferimento | 57/300 (19,0%) | 5 |
| Adattiva | 35/212 (16,5%) | 2 |
| Quattro fissi | 39/240 (16,3%) | 2 |
| Tre fissi | 28/180 (15,6%) | 1 |

Nelle 60 partite ricostruite la lista adattiva ha scelto tre nomi 28 volte e quattro nomi 32 volte. Il fattore arbitrale ha cambiato la lunghezza in quattro gare. Il taglio ha tolto 88 nomi, tra cui 22 gialli centrati dal riferimento. Il test è retrospettivo. La cattura originale della 12ª giornata precede questa variante.

## Falli attesi per scegliere i nomi vicini al quinto

La variante ripartisce i falli attesi della squadra fra i candidati di movimento in base alla loro frequenza di falli commessi, ai minuti previsti e al fattore del duello. La stima di squadra tiene conto di casa, trasferta, avversario e gare precedenti. I falli attesi ordinano soltanto i candidati entro cinque punti dal quinto del ranking preferito, sulla scala del punteggio corretto per i minuti. I nomi sopra questa fascia sono confermati. Le liste hanno sempre cinque giocatori nel campione.

Sulle 60 gare ricostruite la variante ha centrato 54 gialli su 300 (18,0%) e tre partite con almeno 3/5. La preferita ha centrato 57 gialli su 300 (19,0%) e cinque partite con almeno 3/5. Sono cambiati i nomi in 49 gare. Dei 72 nomi inseriti, 14 hanno preso un giallo. Dei 72 sostituiti, 17 hanno preso un giallo.

Le due liste sono state congelate separatamente per le dieci partite della 12ª giornata il 9 novembre alle 22:59 italiane, prima dei calci d’inizio. Lo snapshot originale resta separato. Nella nuova cattura cambiano 13 nomi in nove partite. I risultati saranno valutabili con referti completi eseguendo `node scripts/research/cards/compare-rankings.cjs evaluate 12 --fouls`.

## Gialli per fallo rispetto al ruolo

Il tasso individuale combina i gialli ordinari e i falli commessi della stagione precedente e delle gare precedenti della stagione in corso con copertura completa. La media di riferimento per ruolo proviene dai totali della stagione precedente, con giocatori deduplicati per ID. Il tasso individuale è riportato verso la media con 30 falli equivalenti. Lo scarto regolarizzato modifica il punteggio della combinazione preferita al massimo del 10% in entrambe le direzioni. Se i dati mancano, il fattore è neutro. È un rapporto tra totali osservati, senza collegamento causale fra i singoli falli e i gialli.

Sulle 60 partite la variante ha centrato 54/300 (18,0%), contro 57/300 (19,0%) della preferita. Entrambe hanno raggiunto almeno 3/5 in cinque partite. La variante ha ottenuto cinque partite da esattamente 3/5, contro quattro della preferita. Le liste sono cambiate in 31 gare. Tra i 32 nomi inseriti ci sono cinque gialli, contro otto tra i 32 sostituiti.

Le due liste sono state congelate per le dieci partite della 12ª giornata il 9 novembre alle 23:08 italiane. Per il confronto prospettico usare `node scripts/research/cards/compare-rankings.cjs evaluate 12 --propensity` quando saranno disponibili i referti.

## Gialli provocati dall’avversario diretto

Il test usa i 203 episodi riconciliati nel [rapporto dalla 1ª all’11ª giornata](gialli-provocati-avversari-md01-md11-2026-11-09.md). Il punteggio della combinazione preferita riceve un bonus del 2,5% per ogni partita distinta, in data precedente alla gara valutata, in cui l’avversario diretto compatibile del difensore ha provocato almeno un giallo documentato. Il bonus è limitato al 10%. In assenza di un abbinamento univoco o di episodi verificati, il fattore è neutro. Più gialli nella stessa gara contano come una sola evidenza di ripetibilità.

Nelle 60 partite delle giornate 6–11, almeno un difensore ha ricevuto il bonus in 20 gare. I cinque nomi selezionati coincidono in tutte le 60 partite. Entrambe le versioni hanno centrato 65 coppie DUO su 299 valutabili (21,7%), con quattro partite da esattamente 3/5 e cinque con almeno tre centrati. Il risultato descrive l’effetto di questa regola sulle liste. Le attribuzioni storiche sono parziali e ricostruite, quindi il confronto non misura la forza del segnale con una copertura completa.

La cattura dedicata della 12ª giornata è stata fissata il 9 novembre alle 23:32 italiane. Il bonus riguarda sette candidati in sei gare su dieci. I cinque nomi coincidono anche nella cattura prospettica. Per consultare gli esiti usare `node scripts/research/cards/compare-rankings.cjs evaluate 12 --duo --opponent-cards`.

## Rotazioni e rischio del subentrante DUO

Il test aggiunge alla combinazione preferita un contributo del cambio atteso. La coppia titolare–subentrante deve ricorrere almeno due volte nelle gare precedenti della stessa squadra. Il subentrante deve essere fuori dall’undici di riferimento e figurare nella panchina verificata prima della gara oppure avere giocato in almeno una delle ultime quattro partite. A parità di frequenza fra cambi plausibili il contributo è neutro.

Il contributo moltiplica la frequenza regolarizzata della sostituzione (eventi divisi per titolarità precedenti più due), la frazione dei 90 minuti attesi al cambio e la frequenza di gialli per 90 del subentrante, riportata verso 0,18 con 450 minuti equivalenti. La frazione attesa deriva dal minuto medio delle sostituzioni precedenti. Il risultato è riscalato a punti di ranking. Le partite nella stessa data della gara valutata restano escluse dagli input storici. Il sostituto effettivo della gara valutata entra soltanto nella verifica. La ricostruzione usa gli undici disponibili nel progetto e la copertura dei referti locali.

Sulle 60 gare, la preferita ha ottenuto 65/299 (21,7%) e la variante 62/299 (20,7%). Entrambe hanno raggiunto almeno tre coppie centrate in cinque partite ed esattamente 3/5 in quattro. Nelle otto gare con modifiche, è stato centrato uno dei nove nomi entrati contro quattro dei nove rimossi. Il modello ha proposto un subentrante per 220 candidati, in 16 casi da una panchina verificata. Dei 120 candidati con una sostituzione diretta osservata, ha indicato il subentrante effettivo in 60.

Le due liste sono state congelate prima del calcio d’inizio per tutte le dieci gare della 12ª giornata il 9 novembre alle 23:36 italiane. Due gare hanno un nome diverso. Gli esiti saranno verificabili con `node scripts/research/cards/compare-rankings.cjs evaluate 12 --duo --duo-rotation`.
