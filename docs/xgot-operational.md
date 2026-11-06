# xGOT operativo e statistiche pubbliche

Attivazione del 6 novembre 2026 su richiesta esplicita dell'utente: «voglio che
l'xgot sia dentro le selezioni operative e che me le mostri nelle statistiche».
È un'attivazione **sperimentale autorizzata**, non una promozione certificata
dal backtest. La policy in `data/sources/xgot-operational-policy.json` conserva
`statisticallyValidated: false` e nessuna approvazione di probabilità DUO.

## Calcoli e selezioni

Motore 4.14.0. La variante di esecuzione xGOT/xG, normalizzata per competizione
e regredita verso la media, modifica i gol attesi con peso 10%. Richiede almeno
6 precedenti coperti per entrambe le squadre, usa al massimo le ultime 20 gare
entro 550 giorni e scarta dati successivi al cutoff o acquisiti dopo la previsione.
Nessuna imputazione: se manca copertura resta il modello precedente.

Il contributo entra nella matrice dei punteggi e nei relativi mercati 1X2,
doppia chance e gol, seguendo i criteri di ammissione già esistenti. I parametri
precedenti, inclusa la componente xG, restano invariati. Per i volumi tiri/SOT,
corner, falli e cartellini si conserva il game-state precedente all'xGOT: il
nuovo contributo ai gol non si trasferisce indirettamente ai mercati individuali.
Non vengono inventate probabilità DUO, quote, soglie, identità o liquidazioni.

Serie A MD11: componente applicata in 7 gare (Fiorentina-Juventus, Genoa-Milan,
Inter-Como, Napoli-Lazio, Parma-Bologna, Roma-Sassuolo, Torino-Lecce). Fallback
per Cagliari-Frosinone, Monza-Atalanta e Venezia-Udinese. Letture, Schedina e
MyCombo sono rigenerati dai builder esistenti. Le quote locali sono rimaste
byte-identiche e tutte le predizioni estranee alla MD11 sono rimaste invariate.

Champions MD5: 18 scenari futuri rigenerati, con xGOT applicato in 12. Il modello
europeo degli esiti incorpora soltanto la variazione relativa delle probabilità
dovuta all'xGOT, conservando insufficienze, stato preliminare, esclusione dell'X
secco e controlli di quota preesistenti. Le selezioni richiedono sempre il proprio
contratto verificato; gli scenari non equivalgono a nuove quote disponibili.
Le 18 righe MD4 concluse sono conservate intatte per le letture storiche.

## Statistiche visibili

`data/generated/xgot-statistics.json` contiene valori osservati, senza URL o
sezioni pubbliche di provenienza. Fonti e identificativi esterni restano nei
registri interni. Sono disponibili 52 squadre e 523 giocatori identificati con
almeno un campione individuale valido. Questi conteggi non certificano copertura
completa di stagioni, giocatori o competizioni.

- Statistiche giocatori: colonna xGOT per totale e /90, ordinabile e presente nel
  comparatore per periodo. Il campione parziale è dichiarato.
- Statistiche squadra Serie A e schede Champions: xGOT, xGOT/gara e gare coperte,
  separati per 2025/26 e 2026/27.
- Letture: avviso del contributo sperimentale nello scenario, xGOT osservato per
  gara nel campione precedente alla fixture e valori individuali espandibili.

L'xGOT osservato è distinto dai gol attesi del modello. I totali squadra possono
usare evidenza aggregata corroborata; i dati individuali usano soltanto gare
riconciliate tiro per tiro e valori offensivi coerenti. I rapporti /90 dividono
per i minuti delle stesse presenze coperte, non per tutti i minuti della stagione.
I campi mancanti restano N/D. Le letture escludono osservazioni successive alla
partita, anche quando lo storico globale disponibile è più recente.

## Costruzione e verifiche

- `node scripts/build-xgot-operational-stats.cjs`: proiezione descrittiva,
  aggiornata anche dal build del sito; riusa una cache con hash degli input.
- `node scripts/build-betting-matchday.js --matchday 11`: catena operativa Serie A.
- `node scripts/build-champions-shared-scenarios.cjs --matchday 5`: scenari futuri
  Champions, preservando le righe storiche.
- `node scripts/build-site.js --presentation-only --matchday 11`: shell e
  proiezioni UI; per questa attivazione `SPATIAL_CAPTURE_DISABLED=1` mantiene
  separati i precedenti esperimenti territoriali.

Test pertinenti: `test-xgot-operational.cjs`, `test-predictions.js`,
`test-schedina-md11.mjs`, `test-champions-shared-scenarios.cjs`,
`test-xgot-prospective.cjs` e `check-xgot-browser.cjs`. Gli ultimi controlli UI
coprono desktop 1440 px e mobile 390 px. Evidenze in `reports/xgot-operational/`.

La suite generale è stata aggiornata per confrontare i regressori MD6 con le
formazioni MD6, non con quelle MD11, e per non pretendere che gli archivi abbiano
la versione del nuovo motore. Le cifre degli archivi sono controllate anche con
un hash prima/dopo. Nessuna formula o soglia è alterata per correggere i test.

## Studio prospettico precedente

Le 7 catture originarie restano immutabili e si riferiscono al riferimento
precedente all'attivazione. I sorgenti metodologici originali sono archiviati
accanto allo studio. Non si aggiungono nuove catture alla vecchia versione dopo
il cambio motore: serve un nuovo protocollo. L'evaluatore può ancora confrontare
le probabilità già congelate con i risultati futuri, senza ricalcolarle e senza
cambiare i criteri; la revisione di compatibilità è registrata separatamente.

Nessun commit, push o deploy eseguito.
