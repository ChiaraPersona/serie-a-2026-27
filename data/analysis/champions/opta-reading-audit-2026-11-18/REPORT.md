# Audit retrospettivo ranking Opta e Letture Champions

## Esito interpretabile

Confronto di direzione, non rigenerazione delle Letture e non backtest predittivo. Rating Opta del 18 novembre successivo alle 72 gare analizzate.

## Letture congelate prima della MD3

| Aspetto | Campione appaiato | Lettura corretta | Segnale Opta corretto | Delta punti % | IC bootstrap 95% |
|---|---:|---:|---:|---:|---|
| Esito prevalente 1X2 | 18 | 10 (55.6%) | 12 (66.7%) | 11.1 | N/D |
| Direzione goals | 18 | 10 (55.6%) | 12 (66.7%) | 11.1 | 0.0 / 27.8 |
| Direzione shots | 17 | 12 (70.6%) | 10 (58.8%) | -11.8 | -35.3 / 11.8 |
| Direzione sot | 17 | 12 (70.6%) | 10 (58.8%) | -11.8 | -35.3 / 11.8 |
| Direzione corners | 17 | 7 (41.2%) | 10 (58.8%) | 17.6 | -5.9 / 41.2 |

Pareggi nei risultati e nei conteggi restano nel denominatore. Parità nei rating o nelle proiezioni sono astensioni ed escluse simmetricamente; dettagli nel JSON. Una direzione corretta non misura accuratezza del numero previsto.

## Confronto separato dei due indici sulle quattro giornate

| Giornata | Confrontabili | Vecchio indice corretto | Opta corretto | Cambi utili | Cambi dannosi |
|---|---:|---:|---:|---:|---:|
| 1 | 17 | 14 | 14 | 0 | 0 |
| 2 | 17 | 10 | 10 | 1 | 1 |
| 3 | 17 | 10 | 11 | 1 | 0 |
| 4 | 17 | 13 | 13 | 1 | 1 |
| Totale | 68 | 47 | 48 | 3 | 2 |

## Gare in cui cambia la direzione rispetto alla Lettura congelata

| Gara | Esito reale | Lettura | Opta |
|---|---|---|---|
| Fenerbahçe - Slavia Praha | 2-2 | 1 | 2 |
| Como - Manchester United | 4-1 | 2 | 1 |
| Lille - Galatasaray | 2-4 | 1 | 2 |
| Bayern München - Arsenal | 2-2 | 1 | 2 |

## Limiti

- Opta snapshot is dated 2026-11-18, after all evaluated matches: look-ahead contamination; no predictive validation claim.
- Direction-only sensitivity: stronger club is not an entire reading, and the candidate has no home advantage or draw model.
- Old ESI is a descriptive index, not the actual 1X2 engine: keep index-vs-index separate from frozen reading comparison.
- No arbitrary conversion from 0-100 Opta to Elo, probabilities, goals, volumes, DUO, EV or ROI.
- MAE/Brier/log loss improvement of the candidate is unavailable without a calibrated integration and historical prematch Opta ratings.
- Higher strength does not imply more fouls or cards; no directional proxy evaluated for discipline.
- Snapshot integrity is local pre-kickoff capture, not independent external timestamp certification.

Nessun file operativo, formula, quota o selezione modificato. Input e snapshot verificati con SHA-256.
