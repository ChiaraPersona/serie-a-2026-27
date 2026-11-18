# Calibrazione sperimentale Opta 1X2

## Campione e metodo

57 gare per addestramento, 42 per selezione della regolarizzazione; modello rifittato sulle 99 gare precedenti al 1 luglio 2025. Test separato su 37 gare, dal 2025-09-17 al 2026-01-21. Nessuna modifica operativa.

Tre parametri: vantaggio casa, differenza dei rating individuali, propensione al pareggio. Nessun bonus aggiuntivo campionato. Le tre regolarizzazioni prefissate sono selezionate soltanto sulla log loss di validazione.

## Test cronologico

| Modello | Gare | Log loss (meno e meglio) | Brier (meno e meglio) | Esiti corretti |
|---|---:|---:|---:|---:|
| Opta calibrato | 37 | 0.9030 | 0.5323 | 22/37 (59.5%) |
| Elo esistente, replay retrospettivo | 37 | 0.9441 | 0.5663 | 21/37 (56.8%) |
| Frequenze addestramento + validazione | 37 | 0.9741 | 0.5864 | 20/37 (54.1%) |

## Differenze appaiate di log loss

- candidateVsElo: -0.0410; IC descrittivo 95% [-0.0936, 0.0202], 17 cluster di data.
- candidateVsFrequency: -0.0711; IC descrittivo 95% [-0.1464, 0.0071], 17 cluster di data.

Delta = Opta meno riferimento; negativo favorisce Opta. Gli intervalli non certificano disponibilita temporale del provider o validazione prospettica.

## Parametri congelati

{"type": "symmetric-multinomial-logit", "homeIntercept": 0.6906894602286507, "slopePerTenRatingPoints": 1.0304200103705112, "drawIntercept": -0.6437721807210015, "regularization": 0.1, "trainingMatches": 99, "trainedThrough": "2025-05-31", "ratingScale": "Opta 0-100", "extraLeagueBonus": false}

## Limiti

- Independent collector timestamp evidence, not provider publication certification
- Cohort selected from 35 current Champions participants, Sabah unresolved
- Existing Elo policy parameters were selected later: replay is a retrospective reference, not proof of original prematch forecast performance
- Calibration is 1X2 only; no full Reading, volume, DUO, EV or ROI claim

I rating individuali correnti e i loro intervalli non vanno trattati come probabilita. Questo esperimento produce una mappa 1X2 preliminare; non dimostra accuratezza di gol, tiri, SOT, corner, disciplina o rendimento. Nessuna promozione automatica.
