# Integrazione Champions nell'analisi delle Letture Serie A

Il contesto delle Letture MD11 usa le gare concluse Serie A e Champions degli archivi canonici. L'integrazione è analitica, non un correttivo probabilistico calibrato.

`scripts/predictions/competition-context.cjs` costruisce per squadra le ultime otto gare antecedenti alla fixture, ultima gara/avversario/campo, distanza in giorni di calendario tra le date, numero di gare negli ultimi 7 e 14 giorni e numero di impegni Champions negli ultimi 14 giorni. Forma e medie di gol, tiri, SOT, corner, falli, possesso e xG hanno campioni distinti per competizione e conteggio effettivo dei valori disponibili. Non vengono dedotte rotazioni da calendario, né assimilata la forza degli avversari dei due tornei.

Il builder pronostici passa il contesto al motore, che lo conserva in `prediction.competitionContext`. Non entra nei moltiplicatori di gol, volumi, minuti o probabilità: non esiste ancora una calibrazione della normalizzazione tra tornei o degli effetti del carico. Il renderer Scenario lo espone accanto alla lettura della partita, e i segnali della sezione forma includono il calendario europeo. La nuova informazione non è soltanto una tabella cronologica.

`scripts/build-reading-competition-context.cjs --matchday 11` aggiorna solo fixture programmate, senza ricalcolare le previsioni. È collegato al builder MD11 per gli aggiornamenti successivi. Le fixture concluse e le altre giornate restano archiviate.

Copertura per una futura verifica temporale: 25 fixture Serie A concluse precedute da almeno una Champions per una delle due squadre. È inferiore alle 180 unità richieste dal criterio minimo condiviso dei modelli di conteggio, riutilizzato qui esclusivamente come controllo preliminare conservativo. Questo controllo di copertura non è un backtest e non trasferisce la validazione MD6 al contesto Champions. Mancano ancora normalizzazione per forza avversaria/competizione e verifica temporale di calibrazione ed errore. L'effetto sulle probabilità resta esplicitamente non validato e non applicato. Stato in `data/analysis/serie-a-champions-context-validation.json`.

Verifiche superate: cutoff, assenza di leakage dopo perturbazione dei risultati futuri, giorni di calendario, campioni separati, dati mancanti, gate di copertura, proiezioni, segnali testuali e confronto con la baseline locale. Probabilità, gol attesi, volumi, candidati individuali e Schedina sono invariati. Verificati anche i 130 contratti pubblici MD11 e i salvataggi. Build con acquisizione prospettica disabilitata; Letture Inter–Como e Torino–Lecce a 1440/390 px senza errori o overflow. Evidenze in `output/champions-reading-context/`.

Nessun commit, push o deploy.
