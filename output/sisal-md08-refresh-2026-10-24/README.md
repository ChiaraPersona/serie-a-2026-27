# Aggiornamento quote Sisal Serie A MD8 – 24 ottobre 2026

Aggiornamento incrementale delle sette gare ancora scheduled nel calendario canonico. Le tre gare finished restano identiche al dataset precedente. Nessuna rigenerazione di previsioni, Schedina o contratti pubblicati; nessuna promozione automatica dei nuovi mercati. Nessun commit, push o deploy.

Acquisizione pubblica con importatore esistente e browser headed; raw gzip e identificativi originali conservati. I tentativi headless hanno fallito prima di scrivere dati.

Totali: 18184 → 23950 mercati; 66838 → 78892 quote; 13187 → 18370 mercati giocatore.

| Gara | Mercati prima | Mercati dopo | Quote dopo | Nuovi contratti | Contratti non riproposti | Prezzi cambiati |
|---|---:|---:|---:|---:|---:|---:|
| torino-monza-2026-27-md-08 | 2590 | 2590 | 8362 | 0 | 0 | 0 |
| cagliari-bologna-2026-27-md-08 | 2401 | 2401 | 7962 | 0 | 0 | 0 |
| como-sassuolo-2026-27-md-08 | 2545 | 2545 | 8152 | 0 | 0 | 0 |
| napoli-roma-2026-27-md-08 | 2319 | 1887 | 6563 | 124 | 910 | 3126 |
| lazio-parma-2026-27-md-08 | 2522 | 2536 | 8307 | 111 | 10 | 2872 |
| inter-fiorentina-2026-27-md-08 | 1122 | 2408 | 7700 | 2730 | 84 | 1087 |
| atalanta-frosinone-2026-27-md-08 | 1139 | 2337 | 7607 | 2470 | 0 | 890 |
| genoa-venezia-2026-27-md-08 | 1226 | 2603 | 8688 | 2836 | 8 | 1162 |
| lecce-juventus-2026-27-md-08 | 1176 | 2287 | 7706 | 2366 | 70 | 1219 |
| udinese-milan-2026-27-md-08 | 1144 | 2356 | 7845 | 2501 | 2 | 2110 |

Le quote non riproposte dal provider restano nello snapshot precedente, senza essere presentate come attuali. Il dettaglio delle famiglie acquisite e i timestamp per gara sono in coverage.json. I nuovi mercati includono tiri/tiri in porta squadra e DUO, falli commessi/subiti, assist e parate, secondo disponibilità per singola gara. La presenza di una quota non implica disponibilità di una probabilità validata o approvazione operativa.

Verifiche: validate-sisal-odds.js --competition serie-a superato; confronto deepEqual delle tre gare concluse superato. Esiti suite Sisal riportati nella conversazione.
