# Letture Champions con rating individuale Opta

Attivazione del 19 novembre 2026, su richiesta esplicita dell'utente:
«utilizza l'Opta e ricalcola le Letture». Le 72 fixture future MD5–MD8 usano
ora `OPTA_CLUB_RATING_RESULT`. Le 18 Letture concluse MD4 presenti nel medesimo
dataset restano identiche. Nessuna Lettura parallela e nessun ricalcolo retroattivo.

## Dati e identità

`data/sources/champions-opta-club-ratings-2026-27.json` contiene i 36 rating
individuali con identificativi UEFA e Opta, paese, metadati e hash della fonte.
Lo snapshot è stato acquisito dal sito ufficiale
<https://dataviz.theanalyst.com/opta-power-rankings/>: il dataset completo maschile
è un letterale JSON nello script pubblico `index.js`. L'importatore lo estrae
senza eseguire codice remoto. L'archivio originale compresso è
`data/raw/opta/2026-11-19/index.js.gz`; i metadati delle leghe sono conservati.

Le 35 identità già corroborate sono state ricontrollate sulla fonte primaria.
Sabah è ora risolto direttamente: `evvhmz4bq4dq1v9llaev1j97u`, Sabah FK,
Azerbaigian, lega `3428tckxcirwwh3o3jgc1m8ji`. Il Sabah malese ha un altro ID
e non entra nel modello. Rating osservati: Sabah 83,2843602567, Barcelona
97,5947952844. I valori sono indici su scala 0–100, non percentuali di vittoria.

`availableAt` registra l'osservazione dello snapshot, non una data di pubblicazione
del provider inventata. I rating non sono usati prima di quella disponibilità.
Questo snapshot non ricostruisce rating prepartita di gare già concluse.

## Modello e collegamento

`data/normalized/champions-opta-result-model.json` congela esattamente i parametri
già selezionati nella calibrazione del 18 novembre, senza nuovo fitting o tuning.
Il modulo `scripts/champions/opta-result-policy.cjs` usa:

```
strength = (homeIntercept + slopePerTenRatingPoints * (homeRating-awayRating)/10)/2
P(1,X,2) = softmax(strength, drawIntercept, -strength)
```

Nessun bonus campionato e nessun Elo/prior domestico aggiuntivo. Il vecchio
percorso resta disponibile soltanto per riproduzioni con cutoff precedente
all'attivazione. Dopo l'attivazione, rating o identità non verificabili producono
N/D, senza fallback silenzioso a Elo.

La correzione xGOT già autorizzata e il condizionamento congiunto preesistente
restano invariati: l'1X2 aggiorna la matrice dei punteggi; dalla stessa matrice
discendono gol attesi e risultati esatti. Tiri, SOT e corner ricevono il game-state
aggiornato, xGOT previsto segue i SOT; falli e gialli mantengono i requisiti
preesistenti sul campione condizionato all'esito. La base statistica domestica
non viene sostituita da un moltiplicatore arbitrario del rating. Le ipotesi
individuali di ammonizione restano comparative e separate dalle selezioni.

Il modello è sperimentale: la calibrazione 1X2 non dimostra accuratezza dei
conteggi o validazione prospettica. Nessuna probabilità DUO, quota o approvazione
statistica nuova. Fonti e provider restano interni, secondo la policy pubblica.

## Esito e verifica

Sabah–Barcelona passa da 1,45–2,03 a **1,42–2,04 gol attesi**, con probabilità
Barcelona dal 55,2410% al 55,4201%. La variazione piccola è il risultato effettivo
della calibrazione congelata; non viene forzata verso un punteggio desiderato.

Le 72 gare future hanno valori ricalcolati. Registro, quote, Schedine MD3/MD4,
previsioni Serie A e oggetti delle Letture concluse risultano invariati nei
controlli hash. Baseline e confronto sono in
`data/analysis/champions/opta-activation-2026-11-19/`.

Comandi:

```
node scripts/build-champions-shared-scenarios.cjs --all-future
node scripts/test-champions-opta-reading.cjs
node scripts/test-champions-european-reading.cjs
node scripts/test-champions-shared-scenarios.cjs
node scripts/test-champions-xgot-forecast.cjs
node scripts/build-site.js --presentation-only --champions-page-only
node scripts/check-champions-opta-reading.cjs
```

Il controllo Opta verifica parità numerica con le 37 previsioni Python del test
cronologico originale, simplex, monotonia, identità, cutoff, N/D, assenza di
prior/bonus, coerenza matrice/gol/SOT/xGOT e immutabilità degli archivi protetti.
Il browser verifica 22 fixture a 1440 e 390 px: tutte le 18 MD5, un esempio per
MD6–MD8 e una MD4 conclusa. Evidenze in `output/champions-opta-reading/`.

Build e test sono locali. Nessun commit, push o deploy eseguito.
