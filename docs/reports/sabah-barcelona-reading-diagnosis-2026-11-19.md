# Diagnosi Sabah–Barcelona, Lettura MD5

Verifica del 19 novembre 2026 sulla fixture `ucl-2026-27-md05-10`.
Nessuna modifica a formule, parametri o previsioni operative durante questa diagnosi.

## Valore riprodotto

`data/generated/champions-shared-scenarios.json`, generato alle
`2026-11-19T14:17:36.346Z`, assegna 1,45 gol attesi al Sabah e 2,03 al Barcelona.
Probabilità 1/X/2: 26,9507 / 17,8084 / 55,2410 per cento.
Controllo browser Chrome a 1440 e 390 px: entrambi i valori coincidono,
Barcelona è correttamente il lato ospite; nessun errore JavaScript.
Screenshot: `output/sabah-barcelona-diagnosis/scenario-{1440,390}.png`.

## Catena causale

1. `scripts/champions/shared-scenario.cjs` normalizza i conteggi rispetto alle
   medie dei rispettivi campionati e li porta sulla media comune. Questo tratta
   la produzione relativa alla propria lega; non certifica una comparabilità
   della forza degli avversari fra Premyer Liqa e Liga. I profili sono marcati
   `goalRatesOnTargetScale`, quindi il motore non aggiunge un'ulteriore correzione
   di divisione. La base prima del condizionamento europeo è 1,59 / 1,85.
2. Il condizionamento della matrice tramite Elo produce 1,45 / 2,03.
   La matrice e i valori attesi sono internamente coerenti: un valore basso
   percepito non giustifica una soglia numerica arbitraria di test.
3. Sabah ha quattro presenze nel registro europeo. Il rating grezzo 1464,22
   diventa 1507,68 con il prior stimato. Il segnale domestico positivo vale
   244,95 punti prima della combinazione con il paese e della riduzione per
   quattro presenze. `domesticTransferExponent` manca nel modello attivo:
   il codice registra fattore 1 e metodo `unscaled-legacy`, anche con
   associazione al posto 44 su 45. È un limite del trasferimento di forza,
   non un'identità o un risultato da correggere senza evidenza.
4. Esperimento diagnostico: ricostruendo la matrice tecnica dalla matrice
   pubblicata e sostituendo alle probabilità finali quelle dei rating grezzi,
   si ottiene 1,37 / 2,12 e vittoria Barcelona al 60,44%. Il confronto rimuove
   sia il prior sia la piccola correzione xGOT sull'1X2; non è una nuova previsione
   approvata e non è stato pubblicato. Mostra che il prior da solo non spiega
   tutta la compressione del divario.

## Copertura e metodo attivo

Al cutoff del dataset pubblicato: otto partite domestiche Sabah (tre in casa,
cinque fuori; 15 gol fatti, sei subiti) su 23 gare disponibili della lega;
50 partite Barcelona (25 per sede; 143 fatti, 49 subiti) su 450 gare della lega.
Campioni e periodi differenti richiedono cautela. Il builder usa 2025/26 e
2026/27 per Barcelona e gli ultimi otto per la forma; questi conteggi non sono
soltanto la stagione corrente.

La policy operativa resta `data/sources/champions-european-result-policy.json`,
tipo `EUROPEAN_RATING_RESULT`, con prior da dati domestici. Il controllo che
richiede un risultato Opta fallisce sul dataset corrente: il metodo individuale
Opta non è attivo. Gli audit Opta presenti non equivalgono a un'integrazione.

Gli hash degli input di scenario coincidono con i file correnti, salvo
`data/normalized/xgot-team-research-v2.json`, aggiornato dopo la generazione:
nessun replay numerico con quel file corrente viene dichiarato identico alla
previsione pubblicata. Le analisi sopra usano componenti e matrice pubblicati.

## Esito

Nessun errore di rendering o inversione delle squadre riscontrato.
Il confronto fra campionati e il prior sperimentale rendono il risultato
discutibile; la mancata attivazione del metodo Opta è una discrepanza operativa.
Non aumentare manualmente i gol attesi né modificare pesi per ottenere un esito
desiderato. Prima di sostituire il metodo servono rating di club verificati,
identità Sabah risolta e cutoff compatibili; quindi ricalcolo coerente delle
sole gare future e verifica delle componenti collegate. Nessuna misura di
precisione dimostrata da questo singolo caso.
