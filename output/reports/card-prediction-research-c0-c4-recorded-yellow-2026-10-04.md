# Card Prediction Engine V2 — RECORDED_YELLOW research

Generated: 2026-10-03T23:33:48.833Z

> **OBSERVATIONAL TARGET — NOT BOOKMAKER-CERTIFIED**

All C0–C4 outputs remain **RESEARCH**. They estimate the observational source-event target defined below; they are not Sisal settlement probabilities and cannot be promoted by this task.

## A. TARGET AUDIT

- **RECORDED_YELLOW (recorded-yellow-v1)**: at least one canonical ordinary `yellow` event associated with the candidate in a completed match whose disciplinary feed is complete. Bench, post-match and context-unknown ordinary yellows remain observational positives. `yellowRedCard`, straight red and unknown categories do not independently count.
- **PLAYER_YELLOW (card-targets-v1)**: unchanged strict market-certified target. Historical market context remains insufficiently certified, so unavailable stays unavailable.
- The observational and market-certified layers remain separate in retrospective rows, the model registry, the MD6 preview and the future-actual join contract.

## B. DATASET

| Measure | Value |
| --- | --- |
| Completed matches | 50 |
| Matches with reconstructible pre-match universe | 49 |
| Pre-match candidates | 2037 |
| Eligible observational targets | 2037 |
| Positive RECORDED_YELLOW | 145 |
| Negative RECORDED_YELLOW | 1892 |
| Excluded | 0 |
| Projected starters | 1078 |
| Projected reserves | 959 |
| Unresolved playerId retained | 25 |
| Ordinary yellows outside projected universe | 17 |
| Observed rate | 7.12% |

The reconstructed probable-lineup universe contains 2037 rows across 49 of the 50 completed matches. Milan–Venezia MD2 is excluded because its probable-lineup capture is timestamped after kickoff; reconstructing it from actuals would leak. All 50 discipline feeds are complete for the observational scope. Ordinary-yellow players outside this universe are reported but never appended post hoc.

By matchday:

| MD | N | Eligible | Positive |
| --- | --- | --- | --- |
| 1 | 220 | 220 | 22 |
| 2 | 416 | 416 | 25 |
| 3 | 476 | 476 | 34 |
| 4 | 461 | 461 | 24 |
| 5 | 464 | 464 | 40 |

## C. LEAKAGE AUDIT

Status: **PASS**. Target and future matches are excluded by exact kickoff; same-day matches require explicit pre-kickoff completion. Current aggregates, fouls, opponent signals, referee evidence and Expected Minutes use only earlier matches and timestamp-gated sources. Actual minutes, actual starter state and substitutions are diagnostics only. Date-only official XI data are not mixed into the primary probable-lineup sample.

Limitation: this is an event-time reconstruction, not a claim that every historical feature vector was frozen at the time.

## D. C0 — ROLE / LEAGUE PRIOR

C0 uses a Jeffreys Beta-Binomial league posterior, followed by broad-role and sufficiently mature detailed-role shrinkage with 12 equivalent observations. The target player is removed from the population pool. MD1 exposes the prior-only limitation instead of borrowing future information.

## E. C1 — INDIVIDUAL DISCIPLINE

C1 adds timestamped 2025/26 Serie A ordinary-yellow/minutes aggregates at 0.5 historical weight plus current-season prior-match evidence. Samples are exposure-tempered and shrunk by 12 prior-equivalent observations. Overlapping provider season totals are deduplicated as-of, while genuine named multi-club rows are summed. Other competitions and bookmaker context are not pooled.

Transition C1−C0: **POSSIBLY_BETTER**.

## F. C2 — EXPECTED MINUTES AND FOULS

Expected Minutes follow the prespecified production-engine policy on timestamped historical totals and prior current-season appearances, and are available only for projected starters. Reserves remain null. Expected Minutes and stabilized historical/current fouls/90 enter as ridge-regularized log-odds offsets fitted inside each walk-forward training fold. Actual target-match minutes never enter.

| Ablation | N | Brier | Log loss | ROC-AUC | PR-AUC | Predicted rate |
| --- | --- | --- | --- | --- | --- | --- |
| C1_NO_EXPECTED_MINUTES | 2037 | 0.068951 | 0.259180 | 0.633005 | 0.106284 | 10.02% |
| C1_PLUS_EXPECTED_MINUTES | 2037 | 0.069281 | 0.262117 | 0.605827 | 0.097904 | 9.34% |
| C1_PLUS_FOULS | 2037 | 0.068964 | 0.259302 | 0.632728 | 0.106221 | 10.02% |
| FULL_C2 | 2037 | 0.069290 | 0.262238 | 0.605491 | 0.097822 | 9.34% |
| C2_PLUS_TEAM | 2037 | 0.069290 | 0.262238 | 0.605491 | 0.097822 | 9.34% |
| C2_PLUS_HOME | 2037 | 0.069378 | 0.263123 | 0.596189 | 0.096046 | 9.00% |

- Expected Minutes vs C1: **INCONCLUSIVE**.
- Fouls vs C1: **INCONCLUSIVE**.
- Expected Minutes + fouls vs C1: **INCONCLUSIVE**.

Foul evidence: current available=1342, historical available=1365, combined stabilized feature=1949, missing=88; prior-equivalent minutes=450. Raw current rates are never used directly; 450 league-equivalent minutes plus discounted prior-season evidence stabilize the feature. Role-specific foul coefficients are not justified by this sample.

| Foul band | Model | N | Positive | Observed | Predicted | Brier | Bias | ROC-AUC | PR-AUC | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| HIGH_>1.25X | C0 | 355 | 38 | 10.70% | 8.86% | 0.094768 | 0.018444 | 0.592894 | 0.173012 | DESCRIPTIVE_ONLY |
| HIGH_>1.25X | C1 | 355 | 38 | 10.70% | 10.87% | 0.095280 | -0.001671 | 0.586087 | 0.139588 | DESCRIPTIVE_ONLY |
| HIGH_>1.25X | C2 | 355 | 38 | 10.70% | 10.00% | 0.095740 | 0.007071 | 0.571310 | 0.132885 | DESCRIPTIVE_ONLY |
| HIGH_>1.25X | C3 | 355 | 38 | 10.70% | 10.00% | 0.095740 | 0.007071 | 0.571310 | 0.132885 | DESCRIPTIVE_ONLY |
| HIGH_>1.25X | C4 | 355 | 38 | 10.70% | 10.00% | 0.095740 | 0.007071 | 0.571310 | 0.132885 | DESCRIPTIVE_ONLY |
| LOW_<0.75X | C0 | 192 | 8 | 4.17% | 4.29% | 0.039372 | -0.001211 | 0.626698 | 0.106039 | DESCRIPTIVE_ONLY |
| LOW_<0.75X | C1 | 192 | 8 | 4.17% | 4.88% | 0.038494 | -0.007152 | 0.670516 | 0.262314 | DESCRIPTIVE_ONLY |
| LOW_<0.75X | C2 | 192 | 8 | 4.17% | 4.19% | 0.039325 | -0.000240 | 0.622622 | 0.130951 | DESCRIPTIVE_ONLY |
| LOW_<0.75X | C3 | 192 | 8 | 4.17% | 4.19% | 0.039325 | -0.000240 | 0.622622 | 0.130951 | DESCRIPTIVE_ONLY |
| LOW_<0.75X | C4 | 192 | 8 | 4.17% | 4.19% | 0.039325 | -0.000240 | 0.622622 | 0.130951 | DESCRIPTIVE_ONLY |
| MISSING | C0 | 88 | 8 | 9.09% | 50.00% | 0.250000 | -0.409091 | 0.500000 | 0.090909 | DESCRIPTIVE_ONLY |
| MISSING | C1 | 88 | 8 | 9.09% | 36.64% | 0.162352 | -0.275462 | 0.605469 | 0.116335 | DESCRIPTIVE_ONLY |
| MISSING | C2 | 88 | 8 | 9.09% | 36.64% | 0.162352 | -0.275462 | 0.605469 | 0.116335 | DESCRIPTIVE_ONLY |
| MISSING | C3 | 88 | 8 | 9.09% | 36.64% | 0.162352 | -0.275462 | 0.605469 | 0.116335 | DESCRIPTIVE_ONLY |
| MISSING | C4 | 88 | 8 | 9.09% | 36.64% | 0.162352 | -0.275462 | 0.605469 | 0.116335 | DESCRIPTIVE_ONLY |
| NEAR_LEAGUE_0.75-1.25X | C0 | 1402 | 91 | 6.49% | 8.24% | 0.060662 | -0.017482 | 0.603578 | 0.086930 | DESCRIPTIVE_ONLY |
| NEAR_LEAGUE_0.75-1.25X | C1 | 1402 | 91 | 6.49% | 8.84% | 0.060593 | -0.023448 | 0.629559 | 0.108324 | DESCRIPTIVE_ONLY |
| NEAR_LEAGUE_0.75-1.25X | C2 | 1402 | 91 | 6.49% | 8.16% | 0.060855 | -0.016678 | 0.592740 | 0.099854 | DESCRIPTIVE_ONLY |
| NEAR_LEAGUE_0.75-1.25X | C3 | 1402 | 91 | 6.49% | 8.16% | 0.060855 | -0.016678 | 0.592740 | 0.099854 | DESCRIPTIVE_ONLY |
| NEAR_LEAGUE_0.75-1.25X | C4 | 1402 | 91 | 6.49% | 8.16% | 0.060855 | -0.016678 | 0.592740 | 0.099854 | DESCRIPTIVE_ONLY |

Tiny-current-sample high-foul-rate audit (raw rates are diagnostic; the model uses only the stabilized feature):

| Match | Player | Current fouls | Current min | Raw /90 | Historical fouls | Historical min | Stabilized log ratio | C1 | C1+fouls |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| napoli-como-2026-27-md-02 | Ivan Smolcic | 1 | 2 | 45.000000 | 26 | 1662 | 0.183779 | 0.165219 | 0.165219 |
| cagliari-inter-2026-27-md-02 | Kingstone Mutandwa | 2 | 4 | 45.000000 | N/D | N/D | 0.273201 | 0.060196 | 0.060196 |
| frosinone-venezia-2026-27-md-03 | Daniel Birligea | 1 | 2 | 45.000000 | N/D | N/D | 0.161904 | 0.080481 | 0.080481 |
| cagliari-inter-2026-27-md-02 | Giuseppe Aurelio | 1 | 4 | 22.500000 | N/D | N/D | 0.142397 | 0.071895 | 0.071895 |
| lazio-genoa-2026-27-md-02 | Adam Žulevič | 1 | 4 | 22.500000 | N/D | N/D | 0.142397 | 0.060196 | 0.060196 |
| cagliari-lecce-2026-27-md-03 | Giuseppe Aurelio | 1 | 4 | 22.500000 | N/D | N/D | 0.153803 | 0.058371 | 0.059346 |
| atalanta-cagliari-2026-27-md-04 | Giuseppe Aurelio | 1 | 4 | 22.500000 | N/D | N/D | 0.155261 | 0.052067 | 0.051890 |
| udinese-cagliari-2026-27-md-05 | Giuseppe Aurelio | 1 | 4 | 22.500000 | N/D | N/D | 0.156273 | 0.056196 | 0.056332 |
| frosinone-venezia-2026-27-md-03 | Florian Grillitsch | 2 | 9 | 20.000000 | N/D | N/D | 0.289847 | 0.107171 | 0.107171 |
| genoa-frosinone-2026-27-md-04 | Florian Grillitsch | 2 | 9 | 20.000000 | N/D | N/D | 0.285390 | 0.144623 | 0.143809 |

## G. C3 — OPPONENT / MATCHUP

Only a temporally trained, uncertainty-separated and persistent opponent foul-drawing signal may modify C2. WATCH, UNKNOWN and INACTIVE signals are neutral; direct-duel and channel effects are unavailable. C3=C2 is an allowed result.

| Signal | Feature N | Effect | Interval | Persistence | Maturity | Status | Used |
| --- | --- | --- | --- | --- | --- | --- | --- |
| OPPONENT_FOUL_DRAWING | 1817 | 0.097857 | -0.858599 to 1.054314 | {"early":{"beta":0.0220649509215368,"se":0.4969062764419818,"interval":[-0.9518713509047475,0.9960012527478211],"status":"TRAINING_ONLY_MAP_NORMAL_APPROXIMATION","n":558,"positives":31,"matches":12,"ridge":4},"late":{"beta":0.07749942426182267,"se":0.4909247448469028,"interval":[-0.8847130756381067,1.039711924161752],"status":"TRAINING_ONLY_MAP_NORMAL_APPROXIMATION","n":1027,"positives":74,"matches":22,"ridge":4},"sameSign":true} | MATURE | INACTIVE | NO |
| ROLE_CARD_PRESSURE | 1764 | NOT_ESTIMABLE | N/D | NOT_ESTIMABLE | IMMATURE | WATCH | NO |
| DIRECT_DUEL | 0 | NOT_ESTIMABLE | N/D | NOT_ESTIMABLE | UNKNOWN | UNKNOWN | NO |
| FLANK_CENTRAL_PRESSURE | 0 | NOT_ESTIMABLE | N/D | NOT_ESTIMABLE | UNKNOWN | UNKNOWN | NO |
| OPPONENT_YELLOW_DRAWING | 0 | NOT_ESTIMABLE | N/D | NOT_ESTIMABLE | UNKNOWN | UNKNOWN | NO |
| TEAM_DISCIPLINE_ABLATION | 1817 | 0.048862 | -0.442379 to 0.540103 | {"early":{"beta":0.09100129233377152,"se":0.3055022018488466,"interval":[-0.5077830232899677,0.6897856079575108],"status":"TRAINING_ONLY_MAP_NORMAL_APPROXIMATION","n":558,"positives":31,"matches":12,"ridge":4},"late":{"beta":-0.02230734111990795,"se":0.3312130372233887,"interval":[-0.6714848940777498,0.6268702118379339],"status":"TRAINING_ONLY_MAP_NORMAL_APPROXIMATION","n":1027,"positives":74,"matches":22,"ridge":4},"sameSign":false} | MATURE | INACTIVE | NO |
| HOME_AWAY_ABLATION | 2037 | -0.250001 | -0.496482 to -0.003521 | {"early":{"beta":-0.6131933971631418,"se":0.18662617659915517,"interval":[-0.978980703297486,-0.24740609102879768],"status":"TRAINING_ONLY_MAP_NORMAL_APPROXIMATION","n":778,"positives":53,"matches":22,"ridge":4},"late":{"beta":0.1088758649823234,"se":0.15742378218621442,"interval":[-0.19967474810265687,0.4174264780673037],"status":"TRAINING_ONLY_MAP_NORMAL_APPROXIMATION","n":1027,"positives":74,"matches":22,"ridge":4},"sameSign":false} | MATURE | INACTIVE | NO |

Transition C3−C2: **SIMILAR**.

## H. C4 — REFEREE

C4 distinguishes no designation, a known neutral estimate and informative known-referee evidence. Historical referee match totals are descriptive and shrunk toward the Serie A environment, but are not substituted for player-level walk-forward target evidence. Serie B is never pooled.

| Referee | Matches | Yellows | Raw / match | League relative | Shrunk / match | Prior weight | Coverage | Competition/source | Maturity | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Alberto Ruben Arena | 10 | 34 | 3.400000 | 0.945827 | 3.506220 | 0.545455 | [object Object] | serie-a/data/generated/referee-stats/2025-26/aggregates.json | IMMATURE | WATCH |
| Andrea Calzavara | 1 | 4 | 4.000000 | 1.112738 | 3.625911 | 0.923077 | [object Object] | serie-a/data/generated/referee-stats/2025-26/aggregates.json | IMMATURE | WATCH |
| Andrea Colombo | 14 | 64 | 4.570000 | 1.271303 | 4.120648 | 0.461538 | [object Object] | serie-a/data/generated/referee-stats/2025-26/aggregates.json | IMMATURE | WATCH |
| Andrea Zanotti | 1 | 3 | 3.000000 | 0.834553 | 3.548988 | 0.923077 | [object Object] | serie-a/data/generated/referee-stats/2025-26/aggregates.json | IMMATURE | WATCH |
| Antonio Rapuano | 7 | 27 | 3.860000 | 1.073792 | 3.691413 | 0.631579 | [object Object] | serie-a/data/generated/referee-stats/2025-26/aggregates.json | IMMATURE | WATCH |
| Daniele Chiffi | 13 | 31 | 2.380000 | 0.662079 | 2.965474 | 0.480000 | [object Object] | serie-a/data/generated/referee-stats/2025-26/aggregates.json | IMMATURE | WATCH |
| Daniele Doveri | 17 | 57 | 3.350000 | 0.931918 | 3.452995 | 0.413793 | [object Object] | serie-a/data/generated/referee-stats/2025-26/aggregates.json | IMMATURE | WATCH |
| Daniele Perenzoni | 1 | 3 | 3.000000 | 0.834553 | 3.548988 | 0.923077 | [object Object] | serie-a/data/generated/referee-stats/2025-26/aggregates.json | IMMATURE | WATCH |
| Davide Di Marco | 3 | 8 | 2.670000 | 0.742753 | 3.409123 | 0.800000 | [object Object] | serie-a/data/generated/referee-stats/2025-26/aggregates.json | IMMATURE | WATCH |
| Davide Massa | 15 | 65 | 4.330000 | 1.204539 | 4.005068 | 0.444444 | [object Object] | serie-a/data/generated/referee-stats/2025-26/aggregates.json | IMMATURE | WATCH |
| Ermanno Feliciani | 13 | 33 | 2.540000 | 0.706589 | 3.045474 | 0.480000 | [object Object] | serie-a/data/generated/referee-stats/2025-26/aggregates.json | IMMATURE | WATCH |
| Fabio Maresca | 10 | 40 | 4.000000 | 1.112738 | 3.778947 | 0.545455 | [object Object] | serie-a/data/generated/referee-stats/2025-26/aggregates.json | IMMATURE | WATCH |
| Federico La Penna | 13 | 43 | 3.310000 | 0.920791 | 3.445474 | 0.480000 | [object Object] | serie-a/data/generated/referee-stats/2025-26/aggregates.json | IMMATURE | WATCH |
| Francesco Fourneau | 11 | 45 | 4.090000 | 1.137775 | 3.832037 | 0.521739 | [object Object] | serie-a/data/generated/referee-stats/2025-26/aggregates.json | IMMATURE | WATCH |
| Gianluca Manganiello | 9 | 27 | 3.000000 | 0.834553 | 3.339850 | 0.571429 | [object Object] | serie-a/data/generated/referee-stats/2025-26/aggregates.json | IMMATURE | WATCH |
| Giovanni Ayroldi | 8 | 35 | 4.380000 | 1.218448 | 3.906842 | 0.600000 | [object Object] | serie-a/data/generated/referee-stats/2025-26/aggregates.json | IMMATURE | WATCH |
| Giuseppe Collu | 12 | 51 | 4.250000 | 1.182284 | 3.922368 | 0.500000 | [object Object] | serie-a/data/generated/referee-stats/2025-26/aggregates.json | IMMATURE | WATCH |
| Giuseppe Mucera | 2 | 6 | 3.000000 | 0.834553 | 3.509774 | 0.857143 | [object Object] | serie-a/data/generated/referee-stats/2025-26/aggregates.json | IMMATURE | WATCH |
| Juan Luca Sacchi | 10 | 38 | 3.800000 | 1.057101 | 3.688038 | 0.545455 | [object Object] | serie-a/data/generated/referee-stats/2025-26/aggregates.json | IMMATURE | WATCH |
| Kevin Bonacina | 10 | 33 | 3.300000 | 0.918009 | 3.460766 | 0.545455 | [object Object] | serie-a/data/generated/referee-stats/2025-26/aggregates.json | IMMATURE | WATCH |
| Livio Marinelli | 7 | 24 | 3.430000 | 0.954173 | 3.533518 | 0.631579 | [object Object] | serie-a/data/generated/referee-stats/2025-26/aggregates.json | IMMATURE | WATCH |
| Luca Pairetto | 10 | 53 | 5.300000 | 1.474378 | 4.369856 | 0.545455 | [object Object] | serie-a/data/generated/referee-stats/2025-26/aggregates.json | IMMATURE | WATCH |
| Luca Zufferli | 15 | 41 | 2.730000 | 0.759444 | 3.116179 | 0.444444 | [object Object] | serie-a/data/generated/referee-stats/2025-26/aggregates.json | IMMATURE | WATCH |
| Marco Di Bello | 11 | 26 | 2.360000 | 0.656515 | 3.005950 | 0.521739 | [object Object] | serie-a/data/generated/referee-stats/2025-26/aggregates.json | IMMATURE | WATCH |
| Marco Guida | 16 | 63 | 3.940000 | 1.096047 | 3.790602 | 0.428571 | [object Object] | serie-a/data/generated/referee-stats/2025-26/aggregates.json | IMMATURE | WATCH |
| Maria Sole Ferrieri Caputi | 2 | 9 | 4.500000 | 1.251830 | 3.724060 | 0.857143 | [object Object] | serie-a/data/generated/referee-stats/2025-26/aggregates.json | IMMATURE | WATCH |
| Mario Perri | 1 | 2 | 2.000000 | 0.556369 | 3.472065 | 0.923077 | [object Object] | serie-a/data/generated/referee-stats/2025-26/aggregates.json | IMMATURE | WATCH |
| Matteo Marcenaro | 12 | 49 | 4.080000 | 1.134993 | 3.839035 | 0.500000 | [object Object] | serie-a/data/generated/referee-stats/2025-26/aggregates.json | IMMATURE | WATCH |
| Matteo Marchetti | 13 | 44 | 3.380000 | 0.940264 | 3.485474 | 0.480000 | [object Object] | serie-a/data/generated/referee-stats/2025-26/aggregates.json | IMMATURE | WATCH |
| Maurizio Mariani | 14 | 54 | 3.860000 | 1.073792 | 3.736032 | 0.461538 | [object Object] | serie-a/data/generated/referee-stats/2025-26/aggregates.json | IMMATURE | WATCH |
| Michael Fabbri | 14 | 58 | 4.140000 | 1.151684 | 3.889879 | 0.461538 | [object Object] | serie-a/data/generated/referee-stats/2025-26/aggregates.json | IMMATURE | WATCH |
| Niccolò Turrini | 1 | 4 | 4.000000 | 1.112738 | 3.625911 | 0.923077 | [object Object] | serie-a/data/generated/referee-stats/2025-26/aggregates.json | IMMATURE | WATCH |
| Paride Tremolada | 2 | 14 | 7.000000 | 1.947291 | 4.081203 | 0.857143 | [object Object] | serie-a/data/generated/referee-stats/2025-26/aggregates.json | IMMATURE | WATCH |
| Simone Sozza | 15 | 47 | 3.130000 | 0.870717 | 3.338402 | 0.444444 | [object Object] | serie-a/data/generated/referee-stats/2025-26/aggregates.json | IMMATURE | WATCH |
| Valerio Crezzini | 8 | 27 | 3.380000 | 0.940264 | 3.506842 | 0.600000 | [object Object] | serie-a/data/generated/referee-stats/2025-26/aggregates.json | IMMATURE | WATCH |
| Federico Dionisi | 1 | 7 | 7.000000 | 1.947291 | 3.856680 | 0.923077 | [object Object] | serie-a/data/generated/referee-stats/2025-26/aggregates.json | IMMATURE | WATCH |
| Ivano Pezzuto | 1 | 4 | 4.000000 | 1.112738 | 3.625911 | 0.923077 | [object Object] | serie-a/data/generated/referee-stats/2025-26/aggregates.json | IMMATURE | WATCH |
| Luca Massimi | 1 | 6 | 6.000000 | 1.669107 | 3.779757 | 0.923077 | [object Object] | serie-a/data/generated/referee-stats/2025-26/aggregates.json | IMMATURE | WATCH |
| Marco Piccinini | 6 | 20 | 3.330000 | 0.926354 | 3.507602 | 0.666667 | [object Object] | serie-a/data/generated/referee-stats/2025-26/aggregates.json | IMMATURE | WATCH |
| Rosario Abisso | 10 | 35 | 3.500000 | 0.973646 | 3.551675 | 0.545455 | [object Object] | serie-a/data/generated/referee-stats/2025-26/aggregates.json | IMMATURE | WATCH |

Transition C4−C3: **SIMILAR**.

## I. COMMON-SAMPLE TABLE

Primary comparison: SUFFICIENT_FOR_INITIAL_BASELINE_COMPARISON; common sample N=2037, positives=145, matches=49.

| Model | N | Positive | Brier | Log loss | ROC-AUC | PR-AUC | Predicted | Observed | Top1 hit | Top3 hit | Top5 hit |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C0 | 2037 | 145 | 0.072779 | 0.268271 | 0.612002 | 0.094723 | 9.78% | 7.12% | 6.12% | 28.57% | 42.86% |
| C1 | 2037 | 145 | 0.068951 | 0.259180 | 0.633005 | 0.106284 | 10.02% | 7.12% | 16.33% | 38.78% | 48.98% |
| C2 | 2037 | 145 | 0.069290 | 0.262238 | 0.605491 | 0.097822 | 9.34% | 7.12% | 12.24% | 34.69% | 36.73% |
| C3 | 2037 | 145 | 0.069290 | 0.262238 | 0.605491 | 0.097822 | 9.34% | 7.12% | 12.24% | 34.69% | 36.73% |
| C4 | 2037 | 145 | 0.069290 | 0.262238 | 0.605491 | 0.097822 | 9.34% | 7.12% | 12.24% | 34.69% | 36.73% |

Full available N by model: pRecordedYellow_C0=2037, pRecordedYellow_C1=2037, pRecordedYellow_C2=2037, pRecordedYellow_C3=2037, pRecordedYellow_C4=2037.

## J. INCREMENTAL VALUE

| Comparison | Added | Δ Brier | Δ log loss | Δ PR-AUC | Cluster interval Brier | Verdict |
| --- | --- | --- | --- | --- | --- | --- |
| C1_MINUS_C0 | individual disciplinary history | -0.003827 | -0.009091 | 0.011560 | -0.011136 to 0.000167 | POSSIBLY_BETTER |
| C2_MINUS_C1 | Expected Minutes plus fouls | 0.000339 | 0.003057 | -0.008461 | -0.000303 to 0.000987 | INCONCLUSIVE |
| C3_MINUS_C2 | ACTIVE opponent matchup only | 0.000000 | 0.000000 | 0.000000 | 0.000000 to 0.000000 | SIMILAR |
| C4_MINUS_C3 | mature pre-match referee evidence | 0.000000 | 0.000000 | 0.000000 | 0.000000 to 0.000000 | SIMILAR |
| EXPECTED_MINUTES_MINUS_C1 | pre-match Expected Minutes | 0.000330 | 0.002937 | -0.008379 | -0.000298 to 0.000971 | INCONCLUSIVE |
| FOULS_MINUS_C1 | stabilized historical/current fouls | 0.000013 | 0.000122 | -0.000063 | -0.000025 to 0.000063 | INCONCLUSIVE |
| MINUTES_PLUS_FOULS_MINUS_C1 | Expected Minutes plus fouls | 0.000339 | 0.003057 | -0.008461 | -0.000303 to 0.000987 | INCONCLUSIVE |
| TEAM_MINUS_C2 | team disciplinary environment | 0.000000 | 0.000000 | 0.000000 | 0.000000 to 0.000000 | SIMILAR |
| HOME_MINUS_C2 | home/away | 0.000087 | 0.000885 | -0.001777 | -0.000263 to 0.000579 | INCONCLUSIVE |

Team effect: **SIMILAR**. Home/away: **INCONCLUSIVE**. Neither is automatically retained.

Team-level C2 diagnostic:

| Team | N | Positive | Observed | Predicted C2 | Brier C2 | Bias | ROC-AUC | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| atalanta | 97 | 4 | 4.12% | 7.26% | 0.039665 | -0.031391 | 0.717742 | DESCRIPTIVE_ONLY |
| bologna | 107 | 6 | 5.61% | 7.06% | 0.053938 | -0.014511 | 0.500000 | DESCRIPTIVE_ONLY |
| cagliari | 105 | 5 | 4.76% | 11.59% | 0.050370 | -0.068284 | 0.736000 | DESCRIPTIVE_ONLY |
| como | 112 | 4 | 3.57% | 10.88% | 0.051973 | -0.073058 | 0.185185 | DESCRIPTIVE_ONLY |
| fiorentina | 98 | 7 | 7.14% | 8.98% | 0.069107 | -0.018395 | 0.541601 | DESCRIPTIVE_ONLY |
| frosinone | 113 | 12 | 10.62% | 8.47% | 0.095755 | 0.021544 | 0.507426 | DESCRIPTIVE_ONLY |
| genoa | 106 | 9 | 8.49% | 10.84% | 0.087001 | -0.023474 | 0.576174 | DESCRIPTIVE_ONLY |
| inter | 105 | 8 | 7.62% | 11.08% | 0.070183 | -0.034567 | 0.713918 | DESCRIPTIVE_ONLY |
| juventus | 99 | 7 | 7.07% | 8.27% | 0.063414 | -0.012025 | 0.672360 | DESCRIPTIVE_ONLY |
| lazio | 98 | 6 | 6.12% | 8.43% | 0.058814 | -0.023040 | 0.561594 | DESCRIPTIVE_ONLY |
| lecce | 106 | 10 | 9.43% | 8.37% | 0.082094 | 0.010642 | 0.717708 | DESCRIPTIVE_ONLY |
| milan | 88 | 7 | 7.95% | 8.35% | 0.077023 | -0.003909 | 0.372134 | DESCRIPTIVE_ONLY |
| monza | 110 | 9 | 8.18% | 11.84% | 0.083637 | -0.036561 | 0.610561 | DESCRIPTIVE_ONLY |
| napoli | 97 | 4 | 4.12% | 10.59% | 0.051704 | -0.064683 | 0.462366 | DESCRIPTIVE_ONLY |
| parma | 108 | 8 | 7.41% | 10.77% | 0.080190 | -0.033639 | 0.596875 | DESCRIPTIVE_ONLY |
| roma | 102 | 8 | 7.84% | 8.44% | 0.069946 | -0.005950 | 0.675532 | DESCRIPTIVE_ONLY |
| sassuolo | 100 | 7 | 7.00% | 8.77% | 0.063924 | -0.017699 | 0.654378 | DESCRIPTIVE_ONLY |
| torino | 108 | 4 | 3.70% | 8.14% | 0.037571 | -0.044337 | 0.692308 | DESCRIPTIVE_ONLY |
| udinese | 95 | 9 | 9.47% | 10.85% | 0.092354 | -0.013796 | 0.627907 | DESCRIPTIVE_ONLY |
| venezia | 83 | 11 | 13.25% | 6.81% | 0.114160 | 0.064405 | 0.713384 | DESCRIPTIVE_ONLY |

Home/away C2 diagnostic:

| Side | N | Positive | Observed | Predicted C2 | Brier C2 | Bias | ROC-AUC | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| away | 1022 | 68 | 6.65% | 9.45% | 0.065366 | -0.027981 | 0.611304 | DESCRIPTIVE_ONLY |
| home | 1015 | 77 | 7.59% | 9.22% | 0.073241 | -0.016318 | 0.599812 | DESCRIPTIVE_ONLY |

## K. LEGACY RISK SCORE

The legacy score is ranking-only. Pre-match score intersections: 3. ROC-AUC=1.000000, PR-AUC=1.000000. Spearman rank correlations with C0–C4: C0=-1.000000, C1=-0.500000, C2=-0.500000, C3=-0.500000, C4=-0.500000. Brier and log loss are intentionally absent; no raw `riskScore` probability conversion is used. The five-candidate archive creates selection bias and is not the primary sample.

## L. ROLE RESULTS

| Role | Model | N | Positive | Observed | Predicted | Brier | Bias | ROC-AUC | PR-AUC | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| AM | C0 | 335 | 20 | 5.97% | 9.28% | 0.063066 | -0.033054 | 0.466825 | 0.076981 | DESCRIPTIVE_ONLY |
| AM | C1 | 335 | 20 | 5.97% | 9.23% | 0.057390 | -0.032646 | 0.644365 | 0.144214 | DESCRIPTIVE_ONLY |
| AM | C2 | 335 | 20 | 5.97% | 8.71% | 0.058066 | -0.027446 | 0.591667 | 0.125061 | DESCRIPTIVE_ONLY |
| AM | C3 | 335 | 20 | 5.97% | 8.71% | 0.058066 | -0.027446 | 0.591667 | 0.125061 | DESCRIPTIVE_ONLY |
| AM | C4 | 335 | 20 | 5.97% | 8.71% | 0.058066 | -0.027446 | 0.591667 | 0.125061 | DESCRIPTIVE_ONLY |
| CB | C0 | 380 | 44 | 11.58% | 13.27% | 0.111051 | -0.016936 | 0.430262 | 0.103103 | DESCRIPTIVE_ONLY |
| CB | C1 | 380 | 44 | 11.58% | 14.19% | 0.106095 | -0.026066 | 0.504261 | 0.141481 | DESCRIPTIVE_ONLY |
| CB | C2 | 380 | 44 | 11.58% | 12.87% | 0.106893 | -0.012912 | 0.471016 | 0.133811 | DESCRIPTIVE_ONLY |
| CB | C3 | 380 | 44 | 11.58% | 12.87% | 0.106893 | -0.012912 | 0.471016 | 0.133811 | DESCRIPTIVE_ONLY |
| CB | C4 | 380 | 44 | 11.58% | 12.87% | 0.106893 | -0.012912 | 0.471016 | 0.133811 | DESCRIPTIVE_ONLY |
| CF/ST | C0 | 120 | 9 | 7.50% | 9.68% | 0.080842 | -0.021776 | 0.336336 | 0.059611 | DESCRIPTIVE_ONLY |
| CF/ST | C1 | 120 | 9 | 7.50% | 8.90% | 0.076691 | -0.013953 | 0.372372 | 0.065168 | DESCRIPTIVE_ONLY |
| CF/ST | C2 | 120 | 9 | 7.50% | 8.39% | 0.076698 | -0.008932 | 0.398398 | 0.067658 | DESCRIPTIVE_ONLY |
| CF/ST | C3 | 120 | 9 | 7.50% | 8.39% | 0.076698 | -0.008932 | 0.398398 | 0.067658 | DESCRIPTIVE_ONLY |
| CF/ST | C4 | 120 | 9 | 7.50% | 8.39% | 0.076698 | -0.008932 | 0.398398 | 0.067658 | DESCRIPTIVE_ONLY |
| CM/DM | C0 | 214 | 28 | 13.08% | 14.91% | 0.121208 | -0.018305 | 0.399962 | 0.126099 | DESCRIPTIVE_ONLY |
| CM/DM | C1 | 214 | 28 | 13.08% | 13.72% | 0.116326 | -0.006351 | 0.504512 | 0.141548 | DESCRIPTIVE_ONLY |
| CM/DM | C2 | 214 | 28 | 13.08% | 12.71% | 0.116299 | 0.003743 | 0.497216 | 0.143449 | DESCRIPTIVE_ONLY |
| CM/DM | C3 | 214 | 28 | 13.08% | 12.71% | 0.116299 | 0.003743 | 0.497216 | 0.143449 | DESCRIPTIVE_ONLY |
| CM/DM | C4 | 214 | 28 | 13.08% | 12.71% | 0.116299 | 0.003743 | 0.497216 | 0.143449 | DESCRIPTIVE_ONLY |
| FB/WB | C0 | 392 | 21 | 5.36% | 8.09% | 0.059016 | -0.027315 | 0.395392 | 0.050944 | DESCRIPTIVE_ONLY |
| FB/WB | C1 | 392 | 21 | 5.36% | 9.21% | 0.055281 | -0.038556 | 0.558401 | 0.084950 | DESCRIPTIVE_ONLY |
| FB/WB | C2 | 392 | 21 | 5.36% | 8.53% | 0.055451 | -0.031717 | 0.543961 | 0.075016 | DESCRIPTIVE_ONLY |
| FB/WB | C3 | 392 | 21 | 5.36% | 8.53% | 0.055451 | -0.031717 | 0.543961 | 0.075016 | DESCRIPTIVE_ONLY |
| FB/WB | C4 | 392 | 21 | 5.36% | 8.53% | 0.055451 | -0.031717 | 0.543961 | 0.075016 | DESCRIPTIVE_ONLY |
| GK | C0 | 243 | 2 | 0.82% | 2.41% | 0.015686 | -0.015827 | 0.224066 | 0.007666 | DESCRIPTIVE_ONLY |
| GK | C1 | 243 | 2 | 0.82% | 2.34% | 0.011360 | -0.015130 | 0.491701 | 0.014110 | DESCRIPTIVE_ONLY |
| GK | C2 | 243 | 2 | 0.82% | 2.17% | 0.011386 | -0.013432 | 0.426349 | 0.011545 | DESCRIPTIVE_ONLY |
| GK | C3 | 243 | 2 | 0.82% | 2.17% | 0.011386 | -0.013432 | 0.426349 | 0.011545 | DESCRIPTIVE_ONLY |
| GK | C4 | 243 | 2 | 0.82% | 2.17% | 0.011386 | -0.013432 | 0.426349 | 0.011545 | DESCRIPTIVE_ONLY |
| UNKNOWN | C0 | 273 | 14 | 5.13% | 10.67% | 0.058055 | -0.055383 | 0.602041 | 0.072812 | DESCRIPTIVE_ONLY |
| UNKNOWN | C1 | 273 | 14 | 5.13% | 10.76% | 0.058406 | -0.056272 | 0.590044 | 0.072501 | DESCRIPTIVE_ONLY |
| UNKNOWN | C2 | 273 | 14 | 5.13% | 10.51% | 0.058608 | -0.053804 | 0.544677 | 0.069604 | DESCRIPTIVE_ONLY |
| UNKNOWN | C3 | 273 | 14 | 5.13% | 10.51% | 0.058608 | -0.053804 | 0.544677 | 0.069604 | DESCRIPTIVE_ONLY |
| UNKNOWN | C4 | 273 | 14 | 5.13% | 10.51% | 0.058608 | -0.053804 | 0.544677 | 0.069604 | DESCRIPTIVE_ONLY |
| W | C0 | 80 | 7 | 8.75% | 9.35% | 0.081111 | -0.006039 | 0.395303 | 0.212568 | DESCRIPTIVE_ONLY |
| W | C1 | 80 | 7 | 8.75% | 10.07% | 0.080491 | -0.013171 | 0.459883 | 0.201789 | DESCRIPTIVE_ONLY |
| W | C2 | 80 | 7 | 8.75% | 9.25% | 0.080966 | -0.005032 | 0.459883 | 0.188895 | DESCRIPTIVE_ONLY |
| W | C3 | 80 | 7 | 8.75% | 9.25% | 0.080966 | -0.005032 | 0.459883 | 0.188895 | DESCRIPTIVE_ONLY |
| W | C4 | 80 | 7 | 8.75% | 9.25% | 0.080966 | -0.005032 | 0.459883 | 0.188895 | DESCRIPTIVE_ONLY |

## M. EXPOSURE RESULTS

| Expected Minutes band | Model | N | Positive | Observed | Predicted | Brier | Bias | ROC-AUC | PR-AUC | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 30-59 | C0 | 28 | 3 | 10.71% | N/D | NOT_ESTIMABLE | N/D | NOT_ESTIMABLE | NOT_ESTIMABLE | INSUFFICIENT_SAMPLE |
| 30-59 | C1 | 28 | 3 | 10.71% | N/D | NOT_ESTIMABLE | N/D | NOT_ESTIMABLE | NOT_ESTIMABLE | INSUFFICIENT_SAMPLE |
| 30-59 | C2 | 28 | 3 | 10.71% | N/D | NOT_ESTIMABLE | N/D | NOT_ESTIMABLE | NOT_ESTIMABLE | INSUFFICIENT_SAMPLE |
| 30-59 | C3 | 28 | 3 | 10.71% | N/D | NOT_ESTIMABLE | N/D | NOT_ESTIMABLE | NOT_ESTIMABLE | INSUFFICIENT_SAMPLE |
| 30-59 | C4 | 28 | 3 | 10.71% | N/D | NOT_ESTIMABLE | N/D | NOT_ESTIMABLE | NOT_ESTIMABLE | INSUFFICIENT_SAMPLE |
| 60-74 | C0 | 308 | 24 | 7.79% | 10.34% | 0.081048 | -0.025515 | 0.486942 | 0.079824 | DESCRIPTIVE_ONLY |
| 60-74 | C1 | 308 | 24 | 7.79% | 10.77% | 0.079216 | -0.029789 | 0.503081 | 0.082752 | DESCRIPTIVE_ONLY |
| 60-74 | C2 | 308 | 24 | 7.79% | 9.99% | 0.079454 | -0.021968 | 0.468750 | 0.076291 | DESCRIPTIVE_ONLY |
| 60-74 | C3 | 308 | 24 | 7.79% | 9.99% | 0.079454 | -0.021968 | 0.468750 | 0.076291 | DESCRIPTIVE_ONLY |
| 60-74 | C4 | 308 | 24 | 7.79% | 9.99% | 0.079454 | -0.021968 | 0.468750 | 0.076291 | DESCRIPTIVE_ONLY |
| 75+ | C0 | 742 | 81 | 10.92% | 12.50% | 0.113638 | -0.015812 | 0.563970 | 0.120557 | DESCRIPTIVE_ONLY |
| 75+ | C1 | 742 | 81 | 10.92% | 12.40% | 0.102705 | -0.014850 | 0.601025 | 0.139843 | DESCRIPTIVE_ONLY |
| 75+ | C2 | 742 | 81 | 10.92% | 10.84% | 0.103531 | 0.000769 | 0.591958 | 0.136326 | DESCRIPTIVE_ONLY |
| 75+ | C3 | 742 | 81 | 10.92% | 10.84% | 0.103531 | 0.000769 | 0.591958 | 0.136326 | DESCRIPTIVE_ONLY |
| 75+ | C4 | 742 | 81 | 10.92% | 10.84% | 0.103531 | 0.000769 | 0.591958 | 0.136326 | DESCRIPTIVE_ONLY |
| MISSING | C0 | 959 | 37 | 3.86% | 7.46% | 0.038257 | -0.036018 | 0.657882 | 0.066588 | DESCRIPTIVE_ONLY |
| MISSING | C1 | 959 | 37 | 3.86% | 7.91% | 0.039164 | -0.040535 | 0.653896 | 0.057666 | DESCRIPTIVE_ONLY |
| MISSING | C2 | 959 | 37 | 3.86% | 7.91% | 0.039172 | -0.040543 | 0.654262 | 0.057555 | DESCRIPTIVE_ONLY |
| MISSING | C3 | 959 | 37 | 3.86% | 7.91% | 0.039172 | -0.040543 | 0.654262 | 0.057555 | DESCRIPTIVE_ONLY |
| MISSING | C4 | 959 | 37 | 3.86% | 7.91% | 0.039172 | -0.040543 | 0.654262 | 0.057555 | DESCRIPTIVE_ONLY |

Expected-minus-actual minutes are post-match diagnostics only (squared-error correlation=-0.064631). Actual minutes never enter the feature vector. Reserve Expected Minutes are missing by design.

## N. SHRINKAGE STRESS TEST

| Case | Raw current rate | Current N | Historical N | Prior | Shrunk C1 | Fallback |
| --- | --- | --- | --- | --- | --- | --- |
| ALEX_JIMENEZ_TYPE_2_YELLOWS_45_MINUTES | 100.00% | 2 | 0 | 0.200000 | 0.232000 | CURRENT_INDIVIDUAL_SHRUNK |
| ONE_YELLOW_20_MINUTES | 100.00% | 1 | 0 | 0.200000 | 0.216327 | CURRENT_INDIVIDUAL_SHRUNK |
| TINY_SAMPLE_ZERO_YELLOWS | 0.00% | 2 | 0 | 0.200000 | 0.189474 | CURRENT_INDIVIDUAL_SHRUNK |
| LARGE_HIGH_RATE | 40.00% | 60 | 0 | 0.200000 | 0.366667 | CURRENT_INDIVIDUAL_SHRUNK |
| LARGE_LOW_RATE | 3.33% | 60 | 0 | 0.200000 | 0.061111 | CURRENT_INDIVIDUAL_SHRUNK |
| NEW_PLAYER_NO_HISTORY | N/D | 0 | 0 | 0.200000 | 0.200000 | SYNTHETIC_ROLE_PRIOR |
| HISTORICAL_ONLY | N/D | 0 | 40 | 0.200000 | 0.200000 | HISTORICAL_INDIVIDUAL_SHRUNK |
| CURRENT_CONTRADICTS_HISTORY | 80.00% | 5 | 60 | 0.200000 | 0.168085 | CURRENT_AND_HISTORICAL_SHRUNK |

The synthetic checks cover tiny extreme and zero samples, large high/low samples, new players, historical-only players and current/historical contradiction.

## O. MATCHUP MATURITY

No signal is forced ACTIVE. The table in G records sample, effect, interval, persistence, maturity, status and whether the signal can change C3.

## P. REFEREE MATURITY

The 2025/26 source contains 340/380 identified Serie A referee-matches. Unknown buckets and missing raw gzip coverage stay explicit. Descriptive referee totals have a different estimand from player RECORDED_YELLOW, so no uniform strict-referee multiplier is applied.

## Q. UNCERTAINTY / BOOTSTRAP

2000 paired bootstrap draws by **match**, seed 20261004. Intervals use family-wise alpha 0.05 across 9 prespecified comparisons. Players are never independently bootstrapped as the primary uncertainty unit.

Fallback usage (every probable row exposes all C0–C4 states):

| Layer | Fallback/state | Rows |
| --- | --- | --- |
| C0 | BROAD_ROLE_SHRUNK | 391 |
| C0 | DETAILED_ROLE_SHRUNK | 1548 |
| C0 | JEFFREYS_PRIOR_ONLY_NO_ELIGIBLE_TRAINING | 88 |
| C0 | LEAGUE_SHRUNK | 10 |
| C1 | BROAD_ROLE_SHRUNK | 171 |
| C1 | CURRENT_AND_HISTORICAL_SHRUNK | 843 |
| C1 | CURRENT_INDIVIDUAL_SHRUNK | 326 |
| C1 | DETAILED_ROLE_SHRUNK | 196 |
| C1 | HISTORICAL_INDIVIDUAL_SHRUNK | 471 |
| C1 | JEFFREYS_PRIOR_ONLY_NO_ELIGIBLE_TRAINING | 20 |
| C1 | LEAGUE_SHRUNK | 10 |
| C2ExpectedMinutes | EXPECTED_MINUTES_UNAVAILABLE_NEUTRAL | 959 |
| C2ExpectedMinutes | INSUFFICIENT_SAMPLE | 440 |
| C2ExpectedMinutes | TRAINING_ONLY_MAP_NORMAL_APPROXIMATION | 638 |
| C2Fouls | FOULS_UNAVAILABLE_NEUTRAL | 88 |
| C2Fouls | INSUFFICIENT_SAMPLE | 933 |
| C2Fouls | TRAINING_ONLY_MAP_NORMAL_APPROXIMATION | 1016 |
| C3 | INACTIVE | 417 |
| C3 | UNKNOWN | 402 |
| C3 | WATCH | 1218 |
| C4 | IMMATURE_REFEREE_TARGET_EVIDENCE | 835 |
| C4 | KNOWN_REFEREE_TARGET_EVIDENCE_UNAVAILABLE | 1202 |

## R. RESEARCH LEADER

**UNRESOLVED** — C1_MINUS_C0_POSSIBLY_BETTER; simplest supported before the unresolved transition: C0. This is not a production candidacy decision.

## S. MD6 PROSPECTIVE READINESS

- Infrastructure: **READY**.
- Final snapshot: **WAIT FOR LATER PRE-KICKOFF REFRESH**.
- Preview: 10 matches, 458 candidates, schema/hash valid=true, actuals excluded=true.
- Freeze gates: PROBABLE_LINEUPS_EXPECTED_TO_CHANGE, REFEREE_DESIGNATIONS_INCOMPLETE.

The dry-run preview is separate from Player Market V2 and contains C0–C4, fallbacks, samples, exposure, fouls, matchup/referee state, both target definitions, and source/configuration hashes. No final snapshot was frozen. The writer is immutable by default, rejects post-kickoff capture, and requires a logged reason plus archived revision for a pre-kickoff replacement. Future actuals attach separately as RECORDED_YELLOW and strict PLAYER_YELLOW.

## T. PRODUCTION INTEGRITY

Status: **PASS**. Checked 133 task-required protected production files; 133 are byte-identical and changed protected files=0. Production riskScore, likelyBooked, firstBooked, shots/SOT, Team Profiles V2, exact-score research, MD6 Player Market snapshots, betting/odds archives, settlements and public pages were not changed.

Out-of-scope repository drift already present during the check: 19 files. Those files are reported separately and were not modified or re-authorized by this Card task.

## U. TESTS

11/12 suites passed; Card assertions=76/76; unexpected failures=0; known baseline blockers=1. The full evidence is recorded in `validation.json`. The known exact-score inventory blocker, if present, remains separately classified and is not a Card regression.

## V. FILES CHANGED

| File | Purpose |
| --- | --- |
| data/analysis/card-prediction-research/bootstrap.json | Machine-readable research artifact. |
| data/analysis/card-prediction-research/calibration-status.svg | Machine-readable research artifact. |
| data/analysis/card-prediction-research/card-snapshot.schema.json | Machine-readable research artifact. |
| data/analysis/card-prediction-research/config.json | Machine-readable research artifact. |
| data/analysis/card-prediction-research/evaluation.json | Machine-readable research artifact. |
| data/analysis/card-prediction-research/input-manifest.json | Machine-readable research artifact. |
| data/analysis/card-prediction-research/integrity-check-history.json | Machine-readable research artifact. |
| data/analysis/card-prediction-research/md6-readiness.json | Machine-readable research artifact. |
| data/analysis/card-prediction-research/md6-snapshot-preview.json | Machine-readable research artifact. |
| data/analysis/card-prediction-research/model-registry.json | Machine-readable research artifact. |
| data/analysis/card-prediction-research/parallel-work-authorization.json | Machine-readable research artifact. |
| data/analysis/card-prediction-research/production-before.json | Machine-readable research artifact. |
| data/analysis/card-prediction-research/production-protected-before-recorded-yellow.json | Machine-readable research artifact. |
| data/analysis/card-prediction-research/retrospective-player-match.json | Machine-readable research artifact. |
| data/analysis/card-prediction-research/sample-audit.json | Machine-readable research artifact. |
| data/analysis/card-prediction-research/validation.json | Machine-readable research artifact. |
| docs/card-prediction-research-c0-c4.md | Preregistered protocol and target separation. |
| output/reports/card-prediction-research-c0-c4-2026-10-03.json | Human- and machine-readable final research report. |
| output/reports/card-prediction-research-c0-c4-2026-10-03.md | Human- and machine-readable final research report. |
| output/reports/card-prediction-research-c0-c4-recorded-yellow-2026-10-04.json | Human- and machine-readable final research report. |
| output/reports/card-prediction-research-c0-c4-recorded-yellow-2026-10-04.md | Human- and machine-readable final research report. |
| package.json | Research-only commands. |
| scripts/research/cards/config.js | Isolated Card C0–C4 research implementation. |
| scripts/research/cards/data.js | Isolated Card C0–C4 research implementation. |
| scripts/research/cards/diagnostics.js | Isolated Card C0–C4 research implementation. |
| scripts/research/cards/integrity.js | Isolated Card C0–C4 research implementation. |
| scripts/research/cards/metrics.js | Isolated Card C0–C4 research implementation. |
| scripts/research/cards/models.js | Isolated Card C0–C4 research implementation. |
| scripts/research/cards/report.js | Isolated Card C0–C4 research implementation. |
| scripts/research/cards/run.js | Isolated Card C0–C4 research implementation. |
| scripts/research/cards/snapshot.js | Isolated Card C0–C4 research implementation. |
| scripts/test-card-prediction-research.js | Research regressions and integrity gates. |

No publication command was run.

## W. LIMITATIONS

- RECORDED_YELLOW is an observational source-event target and is never interchangeable with PLAYER_YELLOW.
- Retrospective feature state is reconstructed as-of from timestamped inputs; it is not a set of historically frozen feature snapshots.
- Date-only official lineups cannot prove capture before kickoff, so the primary comparison uses probable-lineup universes only.
- Reserve Expected Minutes remain null because no target-time unconditional participation distribution is preserved.
- Prior-season Serie A category totals do not certify bookmaker context; other competitions are not pooled.
- C4 has no active referee adjustment in this five-matchday sample; historical referee totals have a different estimand.
- Legacy archives yield only a tiny pre-match score intersection and remain ranking-only.
- Missing referee raw gzip files still block independent historical referee reconstruction.
- Jeffreys prior-only 0.5 affects earliest no-training rows and is a mathematical reference, not a calibrated league card rate.

CARD MODEL STATE: RESEARCH

OBSERVATIONAL TARGET: RECORDED_YELLOW

C0-C4 COMPARISON: VALID FOR INITIAL RESEARCH

RESEARCH LEADER: UNRESOLVED

MD6 SNAPSHOT INFRASTRUCTURE: READY

FINAL MD6 SNAPSHOT: WAIT FOR LATER PRE-KICKOFF REFRESH

BOOKMAKER-CERTIFIED CARD MODEL: NOT VALIDATED

PRODUCTION CARD MODEL: UNCHANGED

NO MODEL PROMOTION
