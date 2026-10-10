# Serie A 2026/27 - modelli statistici Schedina MD6

Generato: 2026-10-10T12:29:26.892Z

## Esito

- Storico ricostruito e riconciliato: **380 partite / 760 prestazioni squadra**.
- Holdout temporale: **190 partite** (MD20-MD38), con aggiornamento walk-forward soltanto dopo ogni giornata conclusa.
- Famiglie validate: **corners-match-over, corners-1x2-fulltime, shots-1x2, sot-1x2, sot-match-over, shots-match-over, corners-team-over, sot-team-over, shots-team-over**.
- Valutazioni MD6 disponibili: **673**.

## Validazione

| Sottofamiglia | Cluster | Brier | Baseline | Delta | ECE | Bias | Gate |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| corners-match-over | 190 | 0.1784 | 0.1775 | +0.0009 | 0.0245 | 0.117 | PASS |
| corners-1x2-fulltime | 190 | 0.1839 | 0.1925 | -0.0086 | 0.0370 | 0.059 | PASS |
| shots-1x2 | 190 | 0.1559 | 0.1791 | -0.0232 | 0.0690 | 0.198 | PASS |
| sot-1x2 | 190 | 0.1721 | 0.1880 | -0.0160 | 0.0459 | 0.087 | PASS |
| sot-match-over | 190 | 0.0967 | 0.0977 | -0.0010 | 0.0246 | 0.174 | PASS |
| shots-match-over | 190 | 0.1584 | 0.1619 | -0.0034 | 0.0444 | 0.396 | PASS |
| corners-team-over | 190 | 0.1164 | 0.1194 | -0.0030 | 0.0107 | 0.059 | PASS |
| sot-team-over | 190 | 0.0808 | 0.0864 | -0.0056 | 0.0138 | 0.087 | PASS |
| shots-team-over | 190 | 0.1200 | 0.1297 | -0.0097 | 0.0201 | 0.198 | PASS |

Gate prespecificato: almeno 180 cluster, Delta Brier <= +0,005, ECE <= 0,08 e bias assoluto entro il limite della famiglia. Le probabilita prudenti sottraggono 2-5 punti percentuali in funzione dell'ECE del holdout.

## Contratti e limiti

- Tiri/SOT squadra e partita: tempi regolamentari; definizioni Sisal riconciliate con i conteggi storici.
- Corner: solo corner effettivamente battuti nei tempi regolamentari; somme e 1X2 sono calcolati dalla distribuzione discreta congiunta.
- Cartellini: **non promossi**. La regola Sisal e nota, ma gli aggregati storici non consentono di escludere con certezza panchina, staff, post-partita e giocatori gia sostituiti.
- Mercati giocatore: **non promossi**. I totali quotati sono DUO; i mercati standard rimasti sono per entrambi i tempi e non coincidono con il target V2 full-match.
