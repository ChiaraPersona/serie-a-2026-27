# Recupero numeri di maglia Champions — 14 novembre 2026

Copertura: 1.288/1.288 giocatori, 36 squadre. 872 nuovi numeri e un alias di identità recuperato (Nico O’Reilly, 33). Numeri precedenti conservati. Nessuna modifica a statistiche, identità canoniche, composizione delle rose, disponibilità o previsioni.

Evidenze: pagine UEFA della stagione 2026/27 archiviate il 29 ottobre in `data/raw/champions-squads-2026-10-29/`; URL e SHA-256 conservati per ciascun record acquisito. Non è una nuova acquisizione live. Join per club e ID UEFA; alias O’Reilly riconciliato sul nome completo esatto univoco e numero verificato in archivio.

Registro: `data/sources/champions-shirt-numbers-2026-27.json`. Recupero ripetibile con `node scripts/recover-champions-shirt-numbers.cjs`; aggiorna solo i campi di presentazione.

| Squadra | Numeri recuperati |
|---|---:|
| aek-athens | 22 |
| arsenal | 23 |
| aston-villa | 66 |
| atletico-de-madrid | 0 |
| barcelona | 9 |
| bayern-munchen | 0 |
| bod-glimt | 32 |
| borussia-dortmund | 0 |
| club-brugge | 0 |
| como | 23 |
| fenerbahce | 34 |
| feyenoord | 46 |
| galatasaray | 0 |
| inter | 5 |
| lask | 32 |
| leipzig | 29 |
| lens | 35 |
| lille | 26 |
| liverpool | 18 |
| manchester-city | 3 |
| manchester-united | 4 |
| napoli | 0 |
| paris-saint-germain | 3 |
| porto | 35 |
| psv-eindhoven | 52 |
| real-betis | 51 |
| real-madrid | 10 |
| roma | 25 |
| sabah | 27 |
| shakhtar-donetsk | 29 |
| slavia-praha | 45 |
| slovan-bratislava | 29 |
| sporting-cp | 65 |
| stuttgart | 32 |
| viking | 30 |
| villarreal | 33 |

Verifiche dati: test numeri di maglia e rose registrate superati; confronto con HEAD conferma che il dataset normalizzato cambia solo nei numeri e nel relativo registro. Build Champions di presentazione completato.

Verifica UI: 72 controlli superati (36 rose a 1440 e 390 px), senza overflow o errori JavaScript. Evidenze in output/champions-squads-audit/.
