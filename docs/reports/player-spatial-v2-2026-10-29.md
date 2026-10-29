# Coordinate individuali: contesto e validazione progressiva v2

La v1 e i suoi congelamenti restano intatti. Questa revisione è ricerca isolata; nessuna selezione pubblica, quota, probabilità DUO o formula operativa cambia.

## Copertura verificata

Sono usati tutti i tentativi localizzati riconciliati, non soltanto i gol. L'audit dei raw copre 2569 eventi normalizzati e 1052 osservazioni di posizione iniziale. I soli contesti disponibili sono {"standard":2553,"penalty":16}. Standard non viene convertito in gioco aperto. Piazzati separati, tiri parati contro bloccati, xG per evento e ruolo dinamico restano N/D. I rigori e gli autogol sono esclusi dai profili spaziali.

## Cambiamenti

Ogni gara precedente riceve un peso di recenza, sovrapposizione con i dieci giocatori di movimento previsti e continuità dell'episodio dell'allenatore. Lo storico di un altro ciclo mantiene peso ridotto (0,35), senza confondere il ritorno dello stesso allenatore con continuità. Il profilo del singolo riduce ulteriormente il peso se posizione o lato iniziale differiscono dalla previsione; l'assenza di posizione verificata riduce il peso e resta dichiarata. Nessuna formazione effettiva della partita bersaglio entra nel backtest. Minuti e ruolo previsti provengono dalla baseline prepartita.

Le soglie v2 sono dichiarate prima dell'esecuzione: tre gare squadra, almeno due gare effettive pesate; due presenze e cinque tiri localizzati del giocatore, copertura almeno 80%. I campioni piccoli sono regolarizzati più fortemente (20 tiri equivalenti individuali, 30 difensivi), invece di introdurre correzioni piene su pochi tentativi. Il profilo di squadra usato come prior limita l'effetto anche per chi supera appena la soglia.

Due rami distinti: riallocazione con totali conservati e limite individuale 10%; correzione residua del volume del solo gruppo supportato con limite 5%. Non vengono sommati, né viene scelto automaticamente il vincitore storico. I SOT mantengono la precisione della baseline prima della riconciliazione; non viene stimata una nuova precisione per zona.

## Walk-forward

Prima di ogni giornata si stimano i coefficienti soltanto con gare di giornate precedenti concluse prima del cutoff. Servono cinque gare e due giornate di sviluppo; in mancanza il peso resta zero e la giornata non conta come test calibrato. 38 gare con supporto, 18 valutabili dopo sviluppo, 351 osservazioni individuali. Le stesse fixture e gli stessi esiti verificati sono usati per tutti i rami; il sottoinsieme titolari è registrato separatamente.

| Variante | Log loss tiri ↓ | Log loss SOT ↓ | MAE tiri ↓ | MAE SOT ↓ |
|---|---:|---:|---:|---:|
| baseline | 1.364199 | 0.769501 | 0.905118 | 0.471936 |
| allocation | 1.364199 | 0.769501 | 0.905118 | 0.471936 |
| volume | 1.364173 | 0.769508 | 0.905078 | 0.471935 |

- MD6: 0 gare di sviluppo; beta riallocazione 0, beta volume 0; stato INSUFFICIENT_PRIOR_TRAINING.
- MD7: 10 gare di sviluppo; beta riallocazione 0, beta volume 0; stato INSUFFICIENT_PRIOR_TRAINING.
- MD8: 20 gare di sviluppo; beta riallocazione 0, beta volume -0.025000000000000022; stato FITTED_PRIOR_MATCHDAYS_ONLY.
- MD9: 30 gare di sviluppo; beta riallocazione 0, beta volume -0.025000000000000022; stato FITTED_PRIOR_MATCHDAYS_ONLY.

L'incertezza è raggruppata per giornata: allocation: INSUFFICIENT (2 giornate); volume: INSUFFICIENT (2 giornate). Il passato già esplorato resta esplorativo anche con ordine cronologico corretto. Nessun beneficio operativo certificato e nessuna promozione automatica.

## Riproduzione

Eseguire npm run research:player-spatial:v2 e npm run test:player-spatial:v2. Risultati completi, motivi di astensione, vettori, fold e hash degli input in data/analysis/player-spatial-v2-2026-10-29/. Il runner controlla che i file operativi non siano cambiati. Le nuove previsioni v2 sono congelate separatamente dalla v1, con protocollo proprio; la prima cattura valida resta primaria e le revisioni non la sostituiscono.
