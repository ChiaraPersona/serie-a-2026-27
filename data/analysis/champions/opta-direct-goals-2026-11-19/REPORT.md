# Prova isolata: gol direttamente dai rating Opta

Esperimento esplorativo del 19 novembre 2026. Nessuna modifica alle Letture operative.

## Protocollo e modello

Protocollo scritto prima del fit in `protocol.json`. Split cronologico 57 / 42 / 37; refit finale sulle prime 99 gare. Nessun rating corrente usato per predire risultati passati. Il test è già stato consultato per la precedente calibrazione 1X2 e non è un nuovo holdout vergine.

`log(lambda_H) = mu + homeAdvantage/2 + ratingGapSlope*(rating_H-rating_A)/10`

`log(lambda_A) = mu - homeAdvantage/2 - ratingGapSlope*(rating_H-rating_A)/10`

Poisson indipendenti. Le medie sono gol previsti dal modello, non xG/xGOT osservati. Nessun bonus lega, prior Elo o correzione xGOT. Supporto adattivo con coda omessa non superiore a 1e-13 per squadra; medie analitiche.

Parametri congelati: `{"type": "independent-poisson-opta-gap", "mu": 0.4947060186874824, "homeAdvantage": 0.20914894980766086, "ratingGapSlope": 0.3358608131460828, "gapScale": 10, "regularization": 0.1, "trainingMatches": 99, "trainedThrough": "2025-05-31", "extraLeagueBonus": false}`.

## Test cronologico

| Modello | NLL punteggio ↓ | MAE gol/squadra ↓ | MAE gol totali ↓ | Log loss 1X2 ↓ | Corretti 1X2 |
|---|---:|---:|---:|---:|---:|
| Gol diretti Opta | 3.0979 | 0.9745 | 1.1903 | 0.9147 | 22/37 |
| Medie casa/trasferta costanti | 3.2249 | 1.0729 | 1.2187 | 0.9859 | 20/37 |
| Calibrazione Opta 1X2 congelata, senza xGOT | N/D | N/D | N/D | 0.9030 | 22/37 |

Il riferimento a medie costanti è stimato sulle stesse prime 99 gare. La calibrazione 1X2 non fornisce una distribuzione dei punteggi: NLL punteggio e MAE gol restano N/D. Non è disponibile un confronto storico equo con tutta la Lettura corrente.

## Incertezza appaiata

- scoreNllVsConstant: delta -0.1270; intervallo descrittivo 95% [-0.2470, -0.0099], 17 date, 37 gare. Delta negativo favorisce il candidato.
- outcomeLogLossVsFrozenOpta: delta 0.0117; intervallo descrittivo 95% [-0.0463, 0.0693], 17 date, 37 gare. Delta negativo favorisce il candidato.

## Anteprima prossima giornata

I confronti sotto sono descrittivi tra due previsioni, non misure di precisione. La probabilità 1X2 candidata deriva dalla stessa Poisson dei suoi gol; non è miscelata con quella operativa.

| Gara | Gol attuali | Gol diretti Opta | 1/X/2 candidato |
|---|---:|---:|---:|
| Bodø/Glimt – LASK | 2.39–1.23 | 2.18–1.23 | 59.0% / 20.2% / 20.8% |
| Galatasaray – Aston Villa | 1.98–1.61 | 1.56–1.73 | 34.9% / 23.0% / 42.2% |
| Arsenal – Borussia Dortmund | 1.72–0.77 | 2.31–1.17 | 62.9% / 19.0% / 18.0% |
| Como – AEK Athens | 1.58–0.74 | 2.20–1.22 | 59.6% / 20.0% / 20.4% |
| Feyenoord – Porto | 1.55–1.54 | 1.56–1.72 | 35.2% / 23.0% / 41.7% |
| Manchester City – Napoli | 1.99–0.94 | 2.41–1.12 | 66.0% / 18.0% / 16.0% |
| Leipzig – Lens | 2.19–1.33 | 1.98–1.36 | 51.8% / 21.8% / 26.4% |
| Real Madrid – PSV Eindhoven | 2.38–1.34 | 2.29–1.17 | 62.4% / 19.2% / 18.4% |
| Slovan Bratislava – Real Betis | 1.71–1.72 | 1.34–2.00 | 25.6% / 21.6% / 52.8% |
| Sabah – Barcelona | 1.42–2.04 | 1.13–2.39 | 16.4% / 18.3% / 65.3% |
| Slavia Praha – Villarreal | 1.64–1.34 | 1.84–1.47 | 46.4% / 22.6% / 30.9% |
| Atlético de Madrid – Viking | 1.87–1.12 | 2.09–1.28 | 56.0% / 20.9% / 23.0% |
| Club Brugge – Liverpool | 2.01–1.46 | 1.66–1.62 | 39.4% / 23.1% / 37.5% |
| Inter – Stuttgart | 2.65–1.50 | 2.11–1.27 | 56.7% / 20.8% / 22.5% |
| Shakhtar Donetsk – Fenerbahçe | 1.28–1.06 | 1.60–1.68 | 36.8% / 23.1% / 40.1% |
| Lille – Bayern München | 1.29–1.74 | 1.24–2.17 | 21.1% / 20.3% / 58.6% |
| Paris Saint-Germain – Roma | 2.02–1.04 | 2.23–1.21 | 60.4% / 19.8% / 19.8% |
| Sporting CP – Manchester United | 2.07–1.22 | 1.83–1.47 | 46.1% / 22.7% / 31.2% |

## Limiti e stato

- 136 matches, 35 currently selected Champions clubs, selection bias and small test
- Sabah not in historical fit; its current gap is in numerical range but sparsely represented
- Historical test ends 2026-01-21; applying the model to the November 2026 snapshot introduces temporal distribution shift
- Independent collector timestamps do not certify Opta publication time
- Poisson independence/equidispersion and symmetric goal response may be misspecified
- Current full Reading cannot be fairly backtested without the historical prematch technical inputs
- No claim about shots, SOT, corner, bookings, DUO probabilities, odds, EV or settlement

La specifica impone `lambda_H*lambda_A=exp(2*mu)`: il divario di forza modifica simmetricamente i gol e fa crescere il totale. Solo sette delle 99 gare di fit hanno |gap| >= 10. Sabah non è nel fit: anche se il gap numerico è nel range, il trasferimento al club resta da validare.

## Evidenze interne

- Dati storici con ID e date: `data/analysis/champions/opta-historical-feasibility-2026-11-18/historical-match-pairs.jsonl.gz`.
- Disponibilità e identità: `data/analysis/champions/opta-historical-feasibility-2026-11-18/archive-content-audit.json`.
- Confronto 1X2 congelato: `data/analysis/champions/opta-calibration-2026-11-18/results.json`.
- Snapshot primario corrente: `data/sources/champions-opta-club-ratings-2026-27.json`.
- Calcolo riproducibile: `scripts/research/calibrate-opta-goals.py`; input e hash in `results.json`.

Tutti gli hash protetti risultano invariati. Stato `EXPERIMENTAL_NOT_PROMOTED`: nessun builder operativo, commit, push o deploy.
