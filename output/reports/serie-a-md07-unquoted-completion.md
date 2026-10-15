# MD7 — completamento senza quote

187 pronostici: 117 con quota e 70 senza quota. Conservati integralmente i 117 precedenti. Nessuna ricerca o acquisizione di quote; predictions.json e motore 4.13.0 invariati.

| Partita | Tiri aggiunti | SOT aggiunti | Totale pronostici | Senza quota |
| --- | ---: | ---: | ---: | ---: |
| fiorentina–como | 6 | 5 | 15 | 11 |
| milan–atalanta | 9 | 6 | 21 | 15 |
| juventus–lazio | 8 | 6 | 19 | 14 |
| monza–cagliari | 9 | 7 | 21 | 16 |
| parma–torino | 9 | 5 | 18 | 14 |

Aggiunti 50 mercati individuali standard e 20 mercati di squadra. Probabilità individuali V2 sul solo giocatore; nessuna conversione al DUO. Quote ed EV null, mostrati come —. I mercati squadra usano le distribuzioni già salvate e soltanto soglie con validazione PASS; selezionata una soglia per squadra e metrica con il criterio di bilanciamento esistente. Nessuna nuova calibrazione.

Selezioni senza quota aggiungibili e rimovibili da Lettura e Schedina, persistenti dopo reload. Se manca anche una quota, il totale economico è null/— per l’intera multipla, senza totale parziale. Nessun nuovo avviso o categoria.

Identità canonica stabile separata dagli ID provider. bindVerifiedForecastQuote accetta soltanto un contratto esatto per fixture, soggetto, metrica, soglia, direzione, periodo, DUO e inclusione pali/traverse. L’arricchimento mantiene ID e valutazione del modello; testato soltanto in memoria con quote sintetiche TEST_ONLY, senza scriverle nei dati. I forecast salvati sono mantenuti anche nelle successive build.

## Forecast individuali esclusi dai criteri esistenti

| Giocatore | Metrica | Motivo |
| --- | --- | --- |
| Beto | shots | READING_SUPPORT_BELOW_SHOTS_STANDARD |
| Beto | sot | READING_SUPPORT_BELOW_SOT_STANDARD |
| Jesús Rodriguez | sot | MODEL_THRESHOLD_NOT_SUPPORTED, READING_SUPPORT_BELOW_SOT_STANDARD |
| Lucas Da Cunha | shots | READING_SUPPORT_BELOW_SHOTS_STANDARD |
| Christian Pulisic | sot | READING_SUPPORT_BELOW_SOT_STANDARD |
| Rowe | sot | READING_SUPPORT_BELOW_SOT_STANDARD |
| Diego Moreira | sot | READING_SUPPORT_BELOW_SOT_STANDARD |
| Adrien Rabiot | sot | READING_SUPPORT_BELOW_SOT_STANDARD |
| Edon Zhegrova | shots | READING_SUPPORT_BELOW_SHOTS_STANDARD |
| Edon Zhegrova | sot | READING_SUPPORT_BELOW_SOT_STANDARD |
| Mattia Zaccagni | shots | READING_SUPPORT_BELOW_SHOTS_STANDARD |
| Mattia Zaccagni | sot | READING_SUPPORT_BELOW_SOT_STANDARD |
| Kenneth Taylor | shots | READING_SUPPORT_BELOW_SHOTS_STANDARD |
| Davide Frattesi | sot | MODEL_THRESHOLD_NOT_SUPPORTED, READING_SUPPORT_BELOW_SOT_STANDARD |
| Dany Mota | sot | READING_SUPPORT_BELOW_SOT_STANDARD |
| Harry Winks | shots | READING_SUPPORT_BELOW_SHOTS_STANDARD |
| Michel Adopo | sot | MODEL_THRESHOLD_NOT_SUPPORTED |
| José David Romero | shots | READING_SUPPORT_BELOW_SHOTS_STANDARD |
| José David Romero | sot | READING_SUPPORT_BELOW_SOT_STANDARD |
| Giovanni Simeone | sot | READING_SUPPORT_BELOW_SOT_STANDARD |
| Nikola Vlasic | sot | MODEL_THRESHOLD_NOT_SUPPORTED |

Sono 21 candidature individuali escluse: sostegno sotto lo standard tiri/SOT o soglia non supportata. Fra le soglie squadra candidate, 150 non superano il gate specifico e 112 non raggiungono il sostegno prudente minimo; le alternative idonee sono ordinate dal selettore esistente, con una sola soglia pubblicata per identità. Il dettaglio è in marketCatalog.unquotedPublication.excluded.

## Verifiche

PASS: preservazione dei 117 record precedenti; predictions.json identico byte per byte; nessuna modifica ai dati delle altre giornate, alle quote o alla Champions. PASS: test MD7, store storico, forecast sync, pubblicazione idempotente e sintassi. PASS: selezione di ciascuno dei 70 nuovi mercati, persistenza, rimozione, multipla mista con totale —; riassociazione simulata di quota e rifiuto del DUO. PASS browser a 1440px e 390px: tutte le dieci letture sincronizzate, selezioni dalla Lettura persistenti, nessun errore JavaScript o overflow.

Nessun commit, push o deploy eseguito.
