# Card C0–C4 research protocol, RECORDED_YELLOW r2 — 4 October 2026

All models and outputs are **RESEARCH** and carry the label **OBSERVATIONAL TARGET — NOT BOOKMAKER-CERTIFIED**. The executable prespecification is `scripts/research/cards/config.js`; configuration and implementation SHA-256 values are recorded in the model registry. Research commands are isolated from production builds and never publish, promote, or overwrite Player Market snapshots.

## Two targets that must never be merged

`RECORDED_YELLOW` is the observational response for this research: in a completed match with a complete disciplinary feed, it is 1 when the canonical source records at least one ordinary `yellow` for the candidate and 0 otherwise. Bench, post-match and context-unknown ordinary yellows remain observational positives. A `yellowRedCard`, straight red, or unknown card category alone is not an ordinary-yellow positive. An incomplete disciplinary feed produces null, never zero. Canonical player ID is preferred; an exact normalized name within the same team is retained transparently when `playerId` is null.

`PLAYER_YELLOW` remains the strict bookmaker-certified target defined by the existing market rules. It requires market-eligibility context that the retrospective sources do not always certify. Its nulls, voids and reasons remain separate. No `RECORDED_YELLOW` estimate is described as a Sisal probability or used to settle a market.

## Cohort and as-of reconstruction

The primary cohort is the full candidate universe from each genuinely pre-kickoff probable-lineup source, including projected starters, reserves and unresolved name-only rows. Actual starters and participants are never substituted into that universe. The target match and every future match are excluded at the exact Europe/Rome kickoff. Same-day earlier matches require an explicit completion timestamp; otherwise they are excluded. Official-XI data without a genuine pre-kickoff timestamp remain a separate unavailable information set.

Features may use only sources available before the target kickoff. Target-match actual minutes, starter state, substitutions and fouls are diagnostics only. Historical aggregates must be timestamped before the cutoff. Prior-season evidence is restricted to Serie A. The reconstruction is labelled `RETROSPECTIVE_RESEARCH`; it is not represented as a historically frozen feature snapshot.

## C0–C4 ladder

- **C0:** Jeffreys league reference plus broad-role and supported detailed-role Beta-Binomial shrinkage. The target player's evidence is excluded from the population pool.
- **C1:** C0 plus exposure-tempered current prior-match evidence and timestamped 2025/26 Serie A ordinary-yellow/minutes aggregates, with prior-season weight 0.5 and 12 equivalent prior observations. Overlapping provider season totals are deduplicated as-of: the latest most-complete `N/D` season aggregate replaces overlapping club rows; without an aggregate, one most-complete row per named club is retained and genuine multi-club rows are summed.
- **C2:** C1 plus pre-match Expected Minutes and stabilized historical/current fouls/90. Expected Minutes follow the predeclared production-engine policy and are available only for projected starters; reserves stay null. Ridge coefficients are fitted inside each walk-forward training fold. Missing features are neutral.
- **C3:** C2 plus only an ACTIVE, temporally trained, uncertainty-separated and persistent opponent foul-drawing signal. WATCH, UNKNOWN and INACTIVE mean C3=C2. Direct-duel and channel features are not invented.
- **C4:** C3 plus only mature, persistent same-competition player-target referee evidence available before kickoff. Missing designation, known neutral estimate and insufficient evidence have distinct neutral states. Aggregate referee yellows remain descriptive.

Team disciplinary environment and home/away are independent ablations, not automatically retained. Every probability is bounded and labelled `pRecordedYellow_C0` through `pRecordedYellow_C4`; `bookmakerProbability` remains null.

## Evaluation and uncertainty

The primary walk-forward comparison uses one common reconstructible sample. The initial research gate requires at least 20 match clusters, 20 positives and 20 negatives. Metrics are Brier score, log loss, ROC-AUC, non-interpolated average precision, observed/predicted rates, calibration-in-the-large, identifiable slope, fixed calibration bins, and top-1/3/5 ranking diagnostics with explicit tie bounds.

Two thousand paired bootstrap draws resample complete match clusters with fixed seed 20261004. Nine prespecified comparisons use family-adjusted intervals: the four adjacent C0–C4 transitions, Expected Minutes, fouls, their combined C2 contribution, team environment and home/away. Labels are `BETTER_WITH_EVIDENCE`, `POSSIBLY_BETTER`, `SIMILAR`, `INCONCLUSIVE`, or insufficient. A research leader is declared only when the sequential evidence supports it; otherwise the correct result is `UNRESOLVED`. Retrospective leadership never implies production candidacy.

Legacy `riskScore` is ranking-only. It is never divided by a constant or treated as a calibrated probability; selection bias from the five-candidate archive is disclosed.

## MD6 prospective contract

The dry-run preview is a separate Card research artifact, not a Player Market snapshot. It contains ten fixtures, candidates, C0–C4 values, fallbacks, sample sizes, Expected Minutes and reliability, foul inputs, matchup/referee states, target definitions, model/configuration hashes and source provenance. No actual outcome field is allowed.

Final freeze requires valid schema/hash, a pre-kickoff run, sufficiently fresh probable lineups and all required referee designations. The writer is immutable by default. A pre-kickoff replacement requires a reason and archives the previous revision; post-kickoff replacement is rejected. Future `RECORDED_YELLOW` and `PLAYER_YELLOW` actuals are joined as separate layers.

## Isolation and integrity

The protected manifest covers the production card engine/output, MD6 Player Market snapshot and manifest, exact-score research, Team Profiles V2, betting/odds/settlement archives, prediction modules, and public HTML/CSS/JS. These hashes must be byte-identical before and after the run. Out-of-scope concurrent repository work is reported separately and is neither modified nor re-authorized by this task.

Research artifacts live in `data/analysis/card-prediction-research/`; final reports are `output/reports/card-prediction-research-c0-c4-recorded-yellow-2026-10-04.{md,json}`. The normal research run creates only a non-final MD6 preview. No publication or production integration is permitted.
