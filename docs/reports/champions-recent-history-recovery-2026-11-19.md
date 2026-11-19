# Recupero statistiche dello storico recente Champions

Integrazione descrittiva da archivi interni ESPN e FotMob, senza acquisizioni nuove, modifiche ai motori o sostituzione di valori già presenti.

- Supplemento verificabile: `data/sources/champions-team-history-supplement.json`; conserva URL, percorso raw, SHA-256 e timestamp per ogni evidenza.
- Ricostruzione: `node scripts/build-champions-history-supplement.cjs`, quindi build del sito Champions.
- Controlli identità: ID provider canonico, data, campo, risultato e unicità della gara; ID avversario verificato quando disponibile nel registro canonico. Nessun abbinamento approssimativo per nome.
- FotMob: soli totali del periodo All; xG distinto da xGOT; valori discordanti o mancanti restano null. Rossi zero solo quando esplicitamente registrati.
- ESPN: ID evento e di entrambe le squadre, data e punteggio verificati sul riepilogo originale; esclusi riepiloghi con volumi tutti nulli/zero dal recupero dei rossi.
- Il supplemento riempie esclusivamente campi null e non entra nei pronostici.

## Esito

5.054 componenti statistiche recuperate nell'intero storico. Nelle ultime dieci gare delle squadre delle Letture CL5, 1.262 celle pubbliche passano da N/D a valore verificato:

| Metrica | Celle recuperate |
|---|---:|
| xG | 708 |
| Cartellini | 430 |
| Falli | 58 |
| Tiri | 22 |
| SOT | 22 |
| Corner | 22 |

Restano mancanti i valori delle qualificazioni Sabah–Levski Sofia (7 e 14 agosto 2025) e Sabah–Petrocub (24 e 31 luglio 2025), su entrambi i lati. Gli archivi esaminati non permettono di certificarli; nessuno zero è stato dedotto dall'assenza di statistiche.

`scripts/test-champions-team-history.cjs`: PASS, conservazione integrale dei valori esistenti, evidenza dei recuperi e idempotenza. Build Champions completato. Controllo browser mirato delle Letture MD2/3/4/5 a 1440 e 390 px; test contratti e selezioni salvate: 54 fixture, 902 contratti e 630 selezioni verificate.

Nessun commit, push o deploy.
