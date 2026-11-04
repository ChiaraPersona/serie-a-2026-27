# Audit interno: confronto forza delle 36 squadre Champions

Verifica del 4 novembre 2026. Ambito: disponibilità dei dati locali canonici e protocollo di confronto; nessuna modifica a pronostici, quote, formule operative o sito pubblico. I riferimenti seguenti sono file primari del progetto, consultati direttamente.

## Base europea e aggiornamento

- `data/normalized/uefa-1x2-model-2026-27.json`: modello generato il 2 settembre 2026, storico fino al 30 maggio 2026, 1.469 gare. Parametri congelati: vantaggio casa 80, K 40, drawBase 0,22, drawScale 600, seasonRetention 1, pesi competizione unitari.
- `scripts/backtest-uefa-1x2.js`, funzioni `predict` e `runSequence`: previsione logistica sul divario Elo con scala 400, probabilità del pareggio limitata fra 0,12 e 0,34; aggiornamento Elo sul punteggio atteso comprensivo di mezzo pareggio. Le gare dello stesso giorno sono previste insieme prima degli aggiornamenti. Replicare questa semantica nel confronto interno, evitando contaminazione cronologica.
- `data/sources/champions-team-history-map-2026-27.json`: 36 mapping `{team, uefaTeamId}`. Sono identità esplicite; non sostituirli con corrispondenze approssimative dei nomi.
- `data/normalized/champions-league-2026-27.json`: array `fixtures`, con `id`, `date`, `status`, `score:{home,away}` e identità delle squadre; 63 gare `finished`, 81 `scheduled` al momento della lettura. Il calendario è un aggregato: verificare i punteggi rispetto agli aggiornamenti canonici di giornata.
- `data/sources/champions-results-md01-2026-27.json` fino a `champions-results-md04-2026-27.json`: aggiornamenti per `fixtureId`. MD1 contiene 18 fixture; MD4 contiene 9 fixture concluse. MD4 espone `status`, `score`, `sourceUrl`, `statistics`, `rawPath`. Escludere da Elo selezioni e verifiche di liquidazione.

Un Elo aggiornato con queste 63 gare rimane un aggiornamento Champions, non un aggiornamento completo dell'intero grafo europeo: il modello originario comprende anche Europa League e Conference. Esplicitare questa copertura se non si acquisiscono contemporaneamente i risultati correnti delle altre due competizioni.

## Forma domestica e prestazioni

`data/sources/champions-pilot-match-stats-2025-27.json` contiene 5.012 partite, 4.408 classificate complete e 36 squadre. Metadati `asOf` e `cutoffDate`: 2 novembre 2026; la data massima effettivamente osservata nelle partite è il 31 ottobre 2026. Non presentare il 2 novembre come ultima partita disponibile.

Schema utile:

```text
teams[]: {id, name, espnTeamId, league, leagueName, baselineKind}
matches[]: {
  eventId, season, league, date,
  home/away: {providerTeamId, canonicalTeamId?, name, score,
    statistics:{totalShots,shotsOnTarget,wonCorners,foulsCommitted,yellowCards}},
  coverage?, missing?,
  source:{provider,url,summaryUrl,retrievedAt,rawFile?}
}
```

4.982 record provengono da ESPN, 30 da FotMob. Gli ID provider appartengono a namespace distinti. Per ESPN collegare `providerTeamId` esclusivamente a `espnTeamId`; per supplementi FotMob usare soltanto `canonicalTeamId` esplicito o un mapping verificato. Esempio supplementare: `eventId=fotmob:5772138`, Slovan Bratislava indicato da `away.canonicalTeamId=slovan-bratislava`. Non confrontare numericamente ID ESPN e FotMob.

Filtrando stagione 2026-27, campionato domestico e identità esplicite, tutte le squadre tranne Sabah e Slavia Praha dispongono di almeno cinque osservazioni domestiche. Sabah e Slavia hanno rispettivamente `league=uefa.europa.conf_qual` e `league=uefa.champions`, `baselineKind=uefa-fallback`: quelle righe non sono forma domestica e devono restare separate. Il conteggio va accompagnato da intervallo effettivo, numero di statistiche non mancanti e copertura degli avversari.

Le metriche dichiarate sono tiri, tiri in porta, corner, falli e gialli. Gli xG non fanno parte dello schema canonico: xG confrontabili restano `null`/`N/D`, senza ricavarli dai tiri. Medie di tiri devono utilizzare denominatori separati per ogni metrica, senza equiparare assenza e zero. Confronti fra provider sono descrittivi, con copertura dichiarata, finché non si documentano definizioni equivalenti.

`data/sources/champions-team-coverage-refresh-2026-11-02.json` conserva `schedules`, `matches` e `failures` dei supplementi; è il riferimento per provenienza e limiti. `data/normalized/champions-domestic-recovery-2026-27.json` è invece una precedente acquisizione parziale, al 9 ottobre, su quattro squadre: non descrive la copertura aggiornata dell'intero campione.

## Fallback e affidabilità

`scripts/champions/league-strength.js` calcola la mediana Elo dei club europei di una federazione, con almeno tre club. Affidabilità per numerosità: 3–4 bassa, 5–7 media, almeno 8 alta; meno di tre evidenza insufficiente. Si tratta di numerosità, non di accuratezza predittiva certificata. `resolveOpponentStrength` privilegia il rating diretto e usa poi mediana della federazione o fallback neutro esplicitamente marcato. La correzione interna al campionato risulta non calibrata. La selezione dei club europei introduce un bias rispetto all'intero campionato, dichiarato nel modulo.

Non attribuire automaticamente la mediana nazionale a ogni avversario domestico. Se il mapping UEFA dell'avversario manca, mostrare copertura diretta e lasciare la correzione non disponibile oppure etichettare separatamente il fallback. Non chiamare una media di punti grezzi “forma corretta per avversario”.

## Protocollo consigliato

1. Salvare un confronto interno delle 36 squadre con Elo congelato, Elo aggiornato solo tramite risultati verificati, numero di aggiornamenti e ultima gara usata.
2. Conservare separati punti per gara, bilancio gol, tiri fatti/concessi e tiri in porta fatti/concessi nella stagione corrente. Dichiarare la finestra e le assenze di dati. Non combinare con pesi nuovi in un indice pubblico.
3. Per il confronto predittivo usare valutazione cronologica: prima prevedere tutte le gare del giorno con lo stato precedente, poi applicare i risultati del giorno. Confrontare aggiornamento Elo con base congelata sugli stessi incontri tramite log loss, Brier e accuratezza; riportare numerosità e limiti del campione.
4. La valutazione eseguita ora su gare pregresse è retrospettiva con separazione temporale. La validazione prospettica richiede congelare previsioni prima di gare future; non presentare il backtest come evidenza prospettica.
5. Per aggiungere una correzione domestica al modello occorrono mapping verificati degli avversari, regola esplicita e test cronologici separati. Finché tali condizioni mancano, mantenere il dato come descrittivo e la correzione come `N/D`.

Il confronto è ricerca interna: nessuna conversione Elo→tiri o DUO, nessuna sostituzione di selezioni e nessuna modifica delle formule operative è giustificata da questo audit.
