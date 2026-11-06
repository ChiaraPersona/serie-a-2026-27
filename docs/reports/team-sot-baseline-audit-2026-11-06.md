# SOT squadra: verifica della base e del limite offensivo

Data: 6 novembre 2026. Stato: ricerca isolata, nessuna modifica al motore operativo, ai pronostici, ai contratti o al sito.

## Risultato

Il 4,1 del Frosinone e riproducibile. La causa non e un campione corrente ignorato dal caricamento: il builder ricostruisce correttamente dieci gare. Il problema e il collegamento tra base dei volumi e profilo corrente: la prima legge i profili 2025/26 della Serie A, mentre il secondo incorpora il 2026/27 ma puo correggere la prima soltanto del 6%.

Le dieci gare canoniche del Frosinone hanno SOT 2, 6, 8, 6, 6, 1, 10, 10, 9, 8: totale 66, media 6,6. In casa 7,167 su sei gare; fuori 5,75 su quattro. Il profilo a cutoff MD11 ha media robusta 6,44 e riferimento regolarizzato 6,2, ottenuto con prior equivalente a 12 gare e peso corrente 10/22 = 45,5%. Il prior 6 proviene dalla Serie B 2025/26 e ha comparabilita limitata: non va equiparato direttamente alla Serie A.

## Percorso verificato

- `scripts/build-predictions.js` passa a `predictMatch` i profili volume 2025/26 e, separatamente, i profili matchup ricostruiti al cutoff della fixture. Il file persistito dei matchup contiene ancora otto gare, ma non e lo snapshot usato per questa previsione: il builder ne ricostruisce dieci in memoria.
- `volumeMetric` in `scripts/predictions/engine.js` legge storico per sede, concessioni avversarie per sede e `recent` del profilo volume. Questo `recent` appartiene al **2025/26**, non alle ultime gare 2026/27.
- Per il Frosinone il profilo volume Serie A 2025/26 non esiste. Il percorso ordinario usa `volumePrior`, con tiri 10,5 in assenza di `shotsPerGame` e precisione dell'undici: 3,52 SOT. Lo storico Serie B disponibile al builder matchup non viene passato come storico direttamente equivalente alla Serie A, coerentemente con la sua restrizione d'uso.
- Mancando anche il campione `recent`, i pesi 45/35/20 diventano 56,25/43,75/0. Il secondo input e 4,11 SOT concessi dal Cagliari in casa nel 2025/26. Gli aggiustamenti di contesto portano la base arrotondata a 3,9.
- `applyOwnOffensiveVolumeProfile` confronta 3,9 con 6,2: aumento richiesto 58,97%, consentito 6%. Risultato arrotondato 4,1. La correzione successiva SOT dell'avversario e zero.
- Il valore 6 e configurato in `data/sources/team-matchup-profiles-2026-27.json`, `offensiveAllocationPolicy.teamSotMaxAdjustmentPct`. Non e calcolato dalle dieci osservazioni. Questa verifica non ha individuato una validazione dedicata del valore esatto.

Replay con la funzione reale: target 6,2 -> 4,1; target 8 -> ancora 4,1. Il tetto rende la previsione insensibile a ulteriori aumenti del riferimento corrente.

## Esperimento riproducibile

Comando: `node scripts/research/team-sot-baseline-audit.cjs`.

Scrive soltanto `data/analysis/team-sot-baseline-audit-2026-11-06/audit.json`. Legge gli input canonici e usa il builder matchup in sola lettura. Non esegue builder di pronostici o sito.

Confronto temporale sulle giornate 6-10: 50 gare, 100 osservazioni squadra. Ogni stima corrente legge esclusivamente giornate precedenti a quella prevista. Il confronto isola la base SOT: non ricostruisce undici, precisione, possesso, tattica e interazioni avversarie storiche. Il riferimento operativo e quindi una **proxy**, non l'intero pronostico effettivamente pubblicato. Nel fallback della proxy la precisione e fissa a 0,34, mentre nel caso pubblicato dipende dai giocatori.

La variante integra direttamente i dati correnti sia della squadra sia dell'avversario. Per ciascun lato combina media corrente complessiva e storico Serie A per sede con peso n/(n+12). Dove manca lo storico Serie A usa una prior media di lega meno forte, equivalente a quattro gare; quattro e un parametro esplorativo, non validato. Mantiene i pesi 45% produzione, 35% concessioni, 20% ultime otto gare, spostando queste ultime al 2026/27 con decadimento 0,82. Non aggiunge di nuovo il correttivo offensivo corrente sopra questa base: eviterebbe di contare due volte lo stesso segnale. La componente corrente per ora mescola sedi e avversari.

| Variante della base | Errore assoluto medio SOT | RMSE | Scostamento medio previsione - osservato |
| --- | ---: | ---: | ---: |
| Base storica + limite attuale, proxy | 2,0800 | 2,6508 | -0,8940 |
| Solo limite portato al 20%, proxy | 2,0780 | 2,6336 | -0,7540 |
| Dati correnti nella base, prior debole 4 | 1,9812 | 2,5357 | -0,5031 |
| Stessa variante con media corrente robusta p80 | 1,9943 | 2,5637 | -0,6019 |
| Dati correnti, prior 12 anche senza storico | 1,9965 | 2,5565 | -0,5514 |
| Sola media corrente della squadra | 2,1951 | 2,7568 | -0,1488 |

La variante raw/4 migliora l'errore medio della proxy del 4,75%. L'effetto e maggiore per le squadre prive di storico Serie A: MAE 2,2733 -> 1,8893 su appena 15 osservazioni. Per le altre: 2,0459 -> 1,9974. Alzare soltanto il tetto peggiora leggermente il gruppo delle altre squadre (MAE 2,0882).

La direzione si mantiene in MD6-8 (2,1950 -> 2,1187) e MD9-10 (1,9075 -> 1,7749). Questi intervalli sono stati esaminati dopo aver visto il problema: MD9-10 **non e un holdout intatto**. Un bootstrap descrittivo con 2.000 ricampionamenti di intere fixture e seed fisso fornisce differenza MAE candidata meno proxy [-0,2012; -0,0035] al 95%. Non include incertezza della scelta del modello, revisioni dei dati e approssimazione della proxy: non dimostra superiorita del motore completo.

Sul Frosinone la variante raw/4 produce 5,8265 SOT a contesto neutro: produzione regolarizzata 5,8669, concessioni Cagliari regolarizzate 4,6936, recente pesato 7,7179. Riapplicare approssimativamente il contesto ricavato dalla vecchia base arrotondata restituisce 6,0149. **Nessuno dei due valori e un nuovo pronostico approvato**. Il 6,0 non e un replay completo, ne un obiettivo a cui tarare la formula.

## Direzione consigliata e verifiche necessarie

1. Portare le gare correnti nella base SOT per tutte le squadre, usando esclusivamente risultati antecedenti alla fixture. L'assenza di storico comparabile deve ridurre la forza della prior, non bloccare l'apprendimento corrente.
2. Separare livello corrente, adattamento casa/trasferta e forza dell'avversario. Quattro trasferte del Frosinone richiedono regolarizzazione verso il dato complessivo; non conviene usare 5,75 senza regolarizzazione o copiare 6,6 in ogni gara.
3. Evitare che la stessa produzione corrente alimenti sia la base sia un ulteriore moltiplicatore offensivo. Conservare eventuali limiti per aggiustamenti residuali, da validare, invece di usarli per riparare una base mancante.
4. Validare il confronto con replay completo dove esistono snapshot prepartita; ampliare stagioni e squadre, verificando MAE, RMSE, bias e copertura degli intervalli per sede e per neopromosse. Non trattare i pesi esplorativi come approvati.
5. Congelare la candidata prima delle prossime gare e confrontarla prospetticamente con il motore attuale. Solo dopo la verifica aggiornare motore e pronostici futuri, con conservazione dei volumi squadra/giocatori e controlli sui consumer; nessuna conversione di probabilita individuali in DUO.

Controlli gia eseguiti nello script: replay del tetto pubblicato, conteggio e media delle dieci gare canoniche, esclusione del risultato della giornata target tramite perturbazione a 999 SOT, fallback finito senza gare correnti, previsioni sperimentali tutte finite. Nessuna modifica operativa, commit, push o deploy.
