# Continuous Prediction Engine V2 evaluation

Generated: 2026-10-03T00:13:20.077Z · Model: player-market-v2 · Engine: 4.13.0

## Coverage and decision

Evaluated matchdays: none; prospective matchdays: 6; retrospective/legacy: 5.
Match clusters: 0 · player observations: 0 · gate: **MODEL_CHANGE_GATE: CLOSED** · exact-score data gate: **INSUFFICIENT** · next action: **COLLECT PROSPECTIVE SNAPSHOTS**.
When MODEL_CHANGE_GATE reaches REVIEW, `modelChangeReview` lists the persistent issue, markets, matchdays, N, effect size, adjusted uncertainty and a research-only intervention hypothesis, then requires a separate human decision. No intervention is applied.
Evaluation temporal maturity: {"EARLY":0,"DEVELOPING":0,"MID SAMPLE":0,"MATURE":0}. Model evidence maturity is separate: 20 team profiles; shrinkage maturity weight min/mean/max 0.5/0.5/0.5; player baseline stability levels {"low":52,"medium":74,"high":74}.

| Maturity | Evaluated match clusters |
|---|---:|
| EARLY | 0 |
| DEVELOPING | 0 |
| MID SAMPLE | 0 |
| MATURE | 0 |

## Persistent diagnostic signals

| Signal | First MD | Last MD | MDs observed | N | Effect | Direction | Cluster bootstrap 95% CI | Status |
|---|---:|---:|---|---:|---:|---|---|---|
| Team shots target bias | N/D | N/D | N/D | 0 | N/D | N/D | N/D | INSUFFICIENT |
| Team SOT target bias | N/D | N/D | N/D | 0 | N/D | N/D | N/D | INSUFFICIENT |
| CF/ST shots bias | N/D | N/D | N/D | 0 | N/D | N/D | N/D | INSUFFICIENT |
| SOT/shots conversion gap | N/D | N/D | N/D | 0 | N/D | N/D | N/D | INSUFFICIENT |

## Operational contract

Snapshots are one JSON file per matchday under `data/predictions/snapshots/2026-27/`; the manifest records deterministic match identity, schema/model versions, lineup state, SHA-256, and evaluation status. Snapshot payloads never receive actuals. Evaluation joins `matchId` to `data/normalized/matches.json`, the normalized canonical result source. Schema is version 3. When a production formula changes, increment `modelVersion`; existing snapshots remain on their original model version and are never rebuilt in place.

Run `npm run snapshot:predictions -- --matchday 6` before kickoff. Existing snapshots fail closed. A pre-kickoff replacement requires `--replace-prekickoff --reason "..."`; the old payload and hash are retained in file history and the manifest. Run `npm run evaluate:continuous` after updating canonical match results and player statistics. Neither command commits, pushes, deploys, or publishes.

Before matchday: refresh source inputs and lineups, build V2 preview, save/validate immutable snapshot and hash. After matchday: import results and stats, normalize, run continuous evaluation, review persistent signals. A closed gate never triggers a model change.

## Actual and exact-score dataset

Actual results joined: 0; pending: 10; invalid: 0. Exact-score feature/outcome rows: 0; gate: **INSUFFICIENT**. Each row keeps pre-match X_home / X_away separate from actual home/away goals. READY_FOR_BASELINE_MODEL requires at least 100 prospective matches, 80% actual-xG and goal-feature coverage, 90% shots/SOT coverage and 10 evaluated matchdays. All goal features use matches strictly earlier than the target matchday. The report does not create score probabilities or calculate exact-score model metrics.

Future roadmap: (1) prospective dataset; (2) home/away expected-goals baselines from historical goals, current goal averages and available xG; (3) independent Poisson score matrix; (4) calibration evaluation; (5) dependency and low-score correction comparison; (6) coherent 1X2/BTTS/Over-Under checks from the same goal distribution; (7) V2/V3 integration only after out-of-sample improvement. Stages 2–7 are not implemented.

## Trace limits

`modelConfidence` is N/D because the frozen engine does not calculate an individual confidence field. Production baseline confidence is serialized separately. The current serialized player allocations do not permit exact NO MATCHUP or NO OPPONENT INTERACTION replays after reconciliation; the evaluator reports the limitation instead of approximating them. No V1 snapshot exists for the same prospective match IDs.

## Legacy MD5 and prospective start

MD5 is retained as LEGACY EVALUATION SNAPSHOT (10 matches, 198 player observations); it has no reliable historical generatedAt and is excluded from prospective cumulative metrics.
PROSPECTIVE EVALUATION STARTS AT: MD6.

## Metrics contract

The JSON artifact holds pooled and matchday shots/SOT MAE, RMSE and bias; market Brier/log loss/ECE; team target and player allocation errors; SOT conversion split by role, tier, team and player; Poisson dispersion split by role, tier and Expected Minutes band when N ≥ 20, plus a negative-binomial shadow; expected-minutes diagnostics separated by lineup state; outsiders versus same-role secondary controls; V1/V2 availability; exact-score dataset coverage; pending, void/awarded and invalid matches; signal history and the compound model-change gate. Signal status uses NEW, WATCH, PERSISTENT, RESOLVED or INSUFFICIENT; MD5's initial CF/ST signal is retained as WATCH / INSUFFICIENT.

Do not use exact-score hit rate alone in any future model evaluation. Required measures include probability on actual score, score-matrix log loss, goal MAE, calibrated 1X2/BTTS/Over-Under, Ranked Probability Score and top-N score coverage.
