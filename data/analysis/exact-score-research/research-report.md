# Match Outcome & Exact Score Research Framework

Generated: 2026-10-03T09:55:53.102Z

EXACT_SCORE_DATA_GATE: **INSUFFICIENT** · MODEL_CHANGE_GATE: **CLOSED** · maximum model state: **RESEARCH**.

Exact score hit rate is a secondary metric.

Retrospective data: 50 matches, MD1–MD5. Prospective: 10 immutable V2 snapshots, MD6; actuals unavailable, exact-score predictions 0.

Production isolation: 8177 protected files; changed 0. Synthetic assertions: 551.

## Same-sample retrospective metrics

| Model | Sample | Goal MAE H/A/T | Score LogLoss | Exact Hit | Top3 | Top5 | 1X2 RPS | BTTS Brier | O2.5 Brier |
|---|---:|---|---:|---:|---:|---:|---:|---:|---:|
| LEAGUE_AVERAGE_BASELINE | 50 | 0.9251 / 0.8593 / 1.2264 | 2.9825 | 0.1200 | 0.3200 | 0.4600 | 0.2496 | 0.2457 | 0.2580 |
| TEAM_GOALS_BASELINE | 50 | 0.7677 / 0.8376 / 1.1758 | 2.8316 | 0.1000 | 0.3400 | 0.5000 | 0.1912 | 0.2725 | 0.2627 |
| XG_BASELINE | 50 | 0.7875 / 0.7892 / 1.1439 | 2.8109 | 0.1400 | 0.4600 | 0.5600 | 0.2028 | 0.2509 | 0.2344 |
| PROCESS_BASELINE (INTERFACE_ONLY) | 0 | N/D | N/D | N/D | N/D | N/D | N/D | N/D | N/D |

Top-3 and Top-5 coverage are practical diagnostics. Current retrospective leader: xg-poisson-r0 — NOT VALIDATED PROSPECTIVELY; prespecified multi-metric ranking, no promotion.

## Diagnostic examples

Deterministic category selection; missing categories remain N/D. Full diagnostics for every evaluated match are in exact-score-evaluation.json.

| Category | Match | lambda H/A | Modal | Top 3 | Actual | P(actual) | Rank | Surprise |
|---|---|---|---|---|---|---:|---:|---:|
| modal hit | udinese-como-2026-27-md-01 | 1.2763 / 1.1500 | 1-1 | 1-1 (0.1297), 1-0 (0.1128), 0-1 (0.1016) | 1-1 | 0.1297 | 1 | 2.0426 |
| actual in top3, non-modal | bologna-lazio-2026-27-md-01 | 1.2763 / 1.1500 | 1-1 | 1-1 (0.1297), 1-0 (0.1128), 0-1 (0.1016) | 0-1 | 0.1016 | 3 | 2.2866 |
| actual outside top5 | genoa-napoli-2026-27-md-01 | 1.2763 / 1.1500 | 1-1 | 1-1 (0.1297), 1-0 (0.1128), 0-1 (0.1016) | 0-2 | 0.0584 | 8 | 2.8399 |
| highest surprise | inter-udinese-2026-27-md-04 | 1.3000 / 1.4333 | 1-1 | 1-1 (0.1211), 0-1 (0.0932), 1-2 (0.0868) | 5-3 | 0.0010 | 34 | 6.9208 |

## Limits and next step

- 50 retrospective matches / five matchdays do not validate a model
- No retrospective frozen V2 process features
- MD6 actuals prohibited; no prospective goal-scoring predictions exist
- No fitted process or dependency model, no definitive prior weights
- Retrospective event time is proven; original historical data vintages are not
- Historical Understat xG prior available; current/historical provider scale comparability unverified
- Model configuration prespecified; no search, fitting, or prospective model validation
- Paired match bootstrap exploratory; <=5 matchday clusters cannot establish temporal robustness

NEXT ACTION: REVIEW GOAL-STRENGTH BASELINES

Continue pre-kickoff frozen input collection, then collect outcomes and shots/SOT/xG coverage through the existing continuous evaluation workflow. This phase never imports MD6 actuals, generates MD6 goal predictions, changes the gate, promotes a model, or publishes UI output.
