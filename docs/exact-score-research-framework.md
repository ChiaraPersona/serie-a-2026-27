# Match Outcome & Exact Score Research Framework

The subsequent M1/M2 experiment is documented in [Exact Score Baselines M1/M2](exact-score-baselines-m1-m2.md). Run `npm run research:exact-score -- --models league,team-goals,xg --through-matchday 5` for its prespecified experimental hierarchical shrinkage, audited historical Understat xG priors, common-sample evaluation and paired bootstrap. The original no-argument M0 command and legacy explicit-configuration behavior remain supported; M0 estimates/distributions stay frozen. Historical xG marked unavailable in the original phase below is now audited and available in the new study adapter, with cross-provider comparability explicitly unverified. No original V2 process snapshots are backfilled.

This is an isolated offline laboratory. Prediction Engine V2, team profiles, player markets, reconciliation, MD6 snapshots and public pages remain frozen. Its target is **a probability distribution over all plausible home/away scores**, not a single predicted score. `modalScore` is only the largest cell of that distribution.

## Isolation and commands

All implementation is under `scripts/research/exact-score/`; the dedicated test is `scripts/test-exact-score-research.js`. All generated files are confined to `data/analysis/exact-score-research/`. Production builds and renderers have no imports from this namespace. The research command hashes protected tracked and non-ignored untracked files before and after execution, including the snapshot manifest, snapshots, V2 engine, profiles, sources, generated predictions, public JS/CSS and HTML. It reads the continuous evaluation artifact without running or changing that evaluator.

```text
npm run research:exact-score
npm run test:exact-score
```

The default research command validates temporal input contracts and frozen snapshot/manifest integrity, reconstructs MD1–MD5 retrospective inputs, runs the untuned League Average benchmark, executes synthetic tests, and writes its report. It never writes production predictions or prospective goal-scoring predictions. MD6+ actuals are excluded at the loader and evaluator boundaries even if future source updates contain them. Errors fail closed with a nonzero exit; repair research infrastructure before continuing.

Goals and xG baselines have working interfaces but need **explicit experimental policy**. No shrinkage aggressiveness or coverage threshold is selected by default. For example, to explore a caller-specified policy later:

```text
npm run research:exact-score -- --prior-equivalent-matches <positive-number> --minimum-xg-coverage <fraction-in-0..1>
```

These switches log their values as research configuration; they do not fit or optimize them. Tests use 12 prior-equivalent matches and full xG coverage purely to exercise infrastructure. That test policy is neither a selected model nor a production coefficient. Do not tune it on the 50 historical results and declare a winner.

## Architecture and contracts

`contracts.d.ts` formally defines `ExactScoreFeatureVector`, provenance, the three layers, model prediction interface, fitting boundary, dependency candidate and oracle/error-decomposition interfaces. `contracts.js` supplies the authoritative feature definitions and runtime temporal checks. The generated feature-vector and evaluation JSON Schemas describe structural fields; structural validation alone cannot establish absence of leakage. Runtime checks also verify source match identity, status, date, matchday, season, competition, actual availability and class separation.

The fundamental targets are `homeGoals` and `awayGoals`. Observed raw xG is always called `currentXGF`, `currentXGA`, etc. Goal-model outputs are `lambdaHome` and `lambdaAway`; raw xG is never silently substituted for lambda. Actuals live alongside the vector in a separate dataset block and never inside its feature object.

`predictMatch(vector)` returns lambdaHome/lambdaAway, scoreMatrix, outcomeProbabilities, diagnostics, modelId/modelVersion and RESEARCH state, or `null` when necessary evidence/configuration is absent. Each baseline gets the same validated vector. No individual players, individual Expected Minutes, shooters, bookmaker odds or implied probabilities are accepted. Frozen V2 **team** outputs may already incorporate lineup/player information; adding individual signals would duplicate it.

### Layer A — Goal strength

Separate league environment, home/away attack and home/away defensive strength. Future interfaces expose `homeAttackStrength`, `awayAttackStrength`, `homeDefensiveStrength`, `awayDefensiveStrength`, league averages and explicit prior policy. Historical goals, xG and opponent-adjusted production can inform this layer when valid evidence/configuration exists. League goal/xG environment is recomputed strictly as-of, never from current season final statistics.

The opening round retains all fixtures, zero observed matches, missing current rates and declared previous-season league fallback. Historical home/away averages come from the completed 2025/26 Serie A standings, whose supplied availability date precedes the target season. Team venue priors are kept distinct from league means. Absence of a Serie A team prior is flagged in the promoted/no-Serie-A-history diagnostic; it does not prove promotion or imply Serie B equivalence. Cross-competition baselines require a separately validated adapter; this adapter never substitutes Serie B figures. Maturity/weights remain null when not supplied by a valid snapshot; no research maturity formula is invented.

### Layer B — Process adjustment

`processAdjustment` is an interface only: no coefficients, fitted effects or definitive lambda adjustment. Feature families cover observed and predicted team shots/SOT, paired xG-per-shot, available serialized matchup adjustments, suppression/vulnerability, and offensive/defensive maturity. The central question is how much shots/SOT add beyond xG and goal history.

Finishing `GF - xGF` and goalkeeping `GA - xGA` residuals are paired historical diagnostics. Shrinkage policy is pending and they are never fed into a strong coefficient or assumed to persist. A shot-quality ratio is explicitly distinguished from an independent chance-quality measurement. Unavailable chance-quality suppression, historical xG, weights or game-state evidence stay null.

### Layer C — Goal distribution

The generic independent Poisson component receives lambda; it does not estimate it. The common distribution adapter derives every market and diagnostic from the same score matrix. Alternative dependency distributions remain FUTURE_ONLY.

## Feature contract and provenance

Groups: `GOAL_HISTORY`, `XG_PROCESS`, `SHOT_PROCESS`, `SOT_PROCESS`, `CHANCE_QUALITY`, `DEFENSIVE_SUPPRESSION`, `HOME_AWAY`, `MATURITY`, `MATCHUP`. Every scalar has a value or null, group, source path/hash, full target cutoff, CURRENT/HISTORICAL/MIXED/CONTEXT period, OBSERVED/PREDICTED/CONTEXT kind, AVAILABLE/UNAVAILABLE, contributing match IDs/sample, available-before timestamp where known, competition, season and explanatory note. Missing is never zero. A genuine zero observed SOT/rate is retained; zero matches is a count, not a zero rate.

Available observed features include scoring/conceding averages, venue averages, failed-to-score/clean-sheet/BTTS/goal-total rates, xGF/xGA, shots/SOT for and allowed, paired xG/shot for and against, finishing/goalkeeping residuals, venue, matchday, sample counts and coverage. Predicted team shots/SOT and serialized interaction/maturity come only from validated immutable snapshots. A serialized vulnerability signal is not relabelled as defensive suppression.

For retrospectively reconstructed inputs, latest V2 predictions/profiles are **not** replayed into earlier rounds. Process prediction and unavailable matchup/maturity features remain null. Observed facts can be reconstructed by event date, but original pre-match provider revisions are not recoverable; every retrospective row states `originalPrematchAvailabilityProven: false`.

MD6 inputs validate snapshot SHA-256 and manifest identity/class. Snapshot goal aggregates and predicted team process are kept from the frozen payload. Supplemental observed league/venue/ratio features have their own normalized-source provenance and are explicitly reconstructed as-of. These supplemental features are not claimed to have been part of the original V2 freeze, and no exact-score prediction is made from them in this phase. Future prospective exact-score snapshots must freeze **the entire vector and configuration** before kickoff, including supplemental features.

## Leakage rules and fitting boundary

The cutoff is before the first kickoff of the target matchday, with `matchdayExclusive = targetMatchday`, explicit target ID exclusion and completed-only history. Contributing facts must be from the current competition/season, a strictly earlier matchday and a date before cutoff. End-of-day bounds conservatively exclude a postponed earlier-round match played after the cutoff. Current source revision times are recorded as a retrospective limitation rather than confused with event times.

Historical priors must be previous completed Serie A season with an availability date before target. Target scores, shots/SOT/xG, future matchdays, LIVE results, awarded outcomes, individual player inputs and quote inputs cannot enter pre-match features. MD6 actual goals always remain null/UNAVAILABLE, never zero.

Any future learned parameter must record training IDs and matchdays, first/last MD, training cutoff, feature set and objective. `assertTrainingBoundary` checks these against canonical finished matches and their dates. No fit on target or globally over the entire season then evaluation on earlier rounds. Temporal validation must govern hyperparameters; no team/player hand tuning. Analytic baselines estimate means from as-of inputs without learning free coefficients; their per-match feature provenance records the underlying observations and cutoff. Registry `training` remains null when no fitting occurs.

## Baseline ladder

| Level | Model | Status |
|---|---|---|
| M0 | `league-poisson-r0` / LEAGUE_AVERAGE_BASELINE | executable default benchmark; current home/away league means, previous-season league fallback |
| M1 | `goals-poisson-r0` / TEAM_GOALS_BASELINE | executable with explicit shrinkage policy; experimental multiplicative attack x opponent defense |
| M2 | `xg-poisson-r0` / XG_BASELINE | executable with explicit coverage/shrinkage policy; unavailable when venue xGF/xGA evidence absent |
| M3 | `process-poisson-r0` / PROCESS_BASELINE | interface only; no optimized weights |
| M4 | advanced | future only |

M1 shrinks venue GF/GA toward available historical Serie A team-venue priors, otherwise the relevant league mean. It normalizes attack and opposing defense by the corresponding league venue means and combines their strengths multiplicatively with league environment. M2 uses venue xGF/xGA with **paired, independently checked attack/defense coverage**, shrinking toward the as-of league venue xG environment. This is a declared research interaction to test, not an endorsed formula. xG is a feature in that estimator; lambda is the resulting parameter of the scoring distribution. Zero/absent league normalization environment yields unavailable M1/M2, not division by zero.

The registry records version, feature groups, distribution, fitted flag, RESEARCH/production=false, creation time, configuration, training/cutoff and notes. A higher level must improve out-of-sample over the preceding level; this phase does not claim it does.

## Score matrix, tails and coherence

`independentPoissonScoreMatrix(lambdaHome, lambdaAway)` computes `P(H=i,A=j) = Poisson(i;lambdaHome) * Poisson(j;lambdaAway)` on dynamic rectangular support at least 0..6 on each axis. Marginals start at the mode using log-factorial and recurse both directions. A geometric upper bound controls omitted upper tails; default combined tail bound is at most 1e-12. There is no factorial overflow, fixed 6-goal truncation, probability clamping or renormalization. Resource-limit or uncontrolled-tail requests fail explicitly; default support limit is 512 per axis.

The represented sum is approximately one; `tailMass`, `tailBound`, `representedMass` and numerical error are reported. Tail mass is not arbitrarily allocated to a named score or market. Derived probabilities and complements conserve mass within the reported tail/numerical tolerance (validation 1e-9). Exact point probabilities outside support are analytically available for this Poisson distribution; actual-score rank outside represented support is explicitly null. Future distributions must declare their point/tail policy.

- 1X2: sum cells above/on/below diagonal in HOME/DRAW/AWAY order.
- BTTS YES: both goals positive; NO: all other cells.
- Over/Under 0.5/1.5/2.5/3.5/4.5: sum by total; Over probabilities must decrease as the line increases.
- Modal score/probability, deterministic Top1/3/5, cumulative Top3/Top5 probability mass and matrix entropy come from the same cells. Ties sort by home goals then away goals.
- Entropy is a separate uncertainty diagnostic and is never converted into invented model confidence.

Conditional independence is an **assumption**, not an established truth. The PMF reference is the [SciPy Poisson documentation](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.poisson.html).

## Evaluation and calibration

`exact-score-evaluation.json` holds model/sample IDs and temporal coverage; home, away and total goal MAE/RMSE/bias; score log loss; actual-score probability/rank; modal hit rate; prominent Top3/Top5 coverage; multiclass 1X2 Brier/log loss/normalized RPS; BTTS and separate O1.5/O2.5/O3.5 Brier/log loss/ECE; calibration; low-score/draw diagnostics; uncertainty and per-match diagnostics. Probabilities and lambda are never rounded before scoring; report formatting alone rounds values.

`scoreSurprise = -log(P(actual score))`. Epsilon 1e-15 is applied only by the evaluation log function, never to predictions. Missing outcome/probability yields unavailable metrics, never an invented observation. `Exact score hit rate is a secondary metric.`

Normalized RPS uses the cumulative squared errors in ordered HOME/DRAW/AWAY probabilities, divided by K-1 (2). Reversing HOME/AWAY ordering consistently gives the same score. It is one metric among several, never the sole model selection criterion. See [scoringrules RPS definition](https://scoringrules.readthedocs.io/en/latest/generated/scoringrules.rps_score.html); this framework explicitly documents its normalization convention.

Calibration bins store counts, mean probability/observed frequency and descriptive ECE. Goal calibration uses lambda ranges separately for home/away; score-distribution calibration tracks 0,1,2,3,4+ total goals. Low-score diagnostics separately track 0-0,1-0,0-1,1-1; draw has a separate probability/observed-frequency table. Goal mean versus sample variance is reported overall and by matchday. A small heterogeneous sample does not establish persistent conditional overdispersion. Red-card counts and penalty counts are retained when present, GAME_STATE_DISTORTED is an error-analysis annotation, and matches are not automatically excluded. Game-state timestamps and open-play xG stay null where unavailable.

## Walk-forward, common samples and ablation

Folds are train through MD(k-1) -> test MDk, starting with the opening prior-only fold. Training results must also be completed by the fold cutoff; postponed results cannot leak by matchday label. Models receive identical frozen input vectors/cutoffs, and comparisons evaluate **only the intersection of all executed model predictions**. Registry coverage lists unavailable matches explicitly. An unavailable model is excluded from comparison rather than presented with fabricated metrics; if an executed model has zero coverage, the common sample is empty.

Prospective and retrospective datasets, folds and metrics remain separate. The evaluator rejects mixed generation classes, model/match/cutoff mismatches and duplicate predictions. In this phase the default retrospective sample is 50; the explicit test Goals+xG configuration has a common sample of 28 because early venue xG histories are missing. These are pipeline checks, not evidence of an improved model. No random split or global full-season fitting occurs. `ablateFeatureGroups` masks excluded groups to null on a copy, preserving source provenance/cutoffs and the original common vector.

Correlation utility uses pairwise complete numeric values, records sample sizes and high-collinearity flags, and never removes features automatically. The generated diagnostic uses an operational minimum of 30 paired rows and |r| >= 0.9 only as flags, not promotion thresholds. Repeated team aggregates across fixtures are correlated observations. Nested ablations must compare Goals only -> +xG -> +shots -> +SOT -> +chance quality -> +matchup with the same sample, folds and loss functions. xG, shots and xG/shot cannot be counted as independent evidence without redundancy analysis.

Future uncertainty uses match or matchday clustered bootstrap with explicit sample/iteration policy; all markets derived from a match stay in its cluster. No intervals are asserted for insufficient prospective evidence. A deterministic bootstrap utility is tested but not used to promote a model.

## Counterfactual and error decomposition

`PREDICTED PROCESS` is the sole valid pre-match model scenario. `oracleTeamProcess` creates `ORACLE TEAM PROCESS` only for explicitly offline retrospective research, stores target actual shots/SOT in a separate counterfactual block and marks `predictionEligible=false`. The ordinary model interface rejects it. A future dedicated counterfactual runner can compare predicted vs oracle team process to quantify upstream team-target sensitivity; actual target shots/SOT must never enter real predictions.

The contract separates GOAL_STRENGTH_ERROR, TEAM_PROCESS_ERROR, GOAL_CONVERSION_ERROR, DISTRIBUTION_ERROR and DEPENDENCE_ERROR. Components remain null until controlled comparisons can identify them. Do not pretend a residual arithmetic split isolates causation.

## Dependency candidates and promotion

Dixon-Coles style low-score correction, bivariate Poisson and negative-binomial goal alternatives are FUTURE_ONLY interfaces; calling a dependency transformer now fails explicitly. Low-score correction requires separate temporal validation of 0-0,1-0,0-1,1-1. Negative binomial requires persistent overdispersion, sufficient sample and out-of-sample benefit. No candidate is declared superior now.

States RESEARCH, SHADOW, CANDIDATE, PRODUCTION are defined, but **every model in this phase is capped at RESEARCH, regardless of gate**. Promotion requires valid walk-forward, no leakage, sufficient temporal evidence, improvement over naive baseline, calibrated 1X2, acceptable goal MAE, improved score distribution, no severe consistency failures and a separate human decision. No arbitrary new numerical promotion thresholds are set.

The authoritative exact-score gate is read from `data/analysis/prediction-continuous-evaluation-v2.json`; its existing criteria are not changed. INSUFFICIENT/COLLECTING permit infrastructure and retrospective research only. READY_FOR_BASELINE_MODEL means readiness for a **separate prompt**, not automatic model promotion. Future SHADOW workflow: freeze full vector/model/configuration before kickoff -> join actuals after closure -> evaluate separately -> assess evidence -> human decision. No public 1X2/BTTS/O-U/exact-score UI is added here.

## Artifacts and next action

Generated artifacts: feature contract/vector schema; model registry; retrospective dataset; full retrospective prediction matrices; prospective frozen-input dataset (no exact-score predictions); evaluation/schema; validation/isolation report; Markdown research report with same-sample metric table and diagnostic examples. Examples include modal hit, actual Top3 non-modal, actual outside Top5 and maximum surprise, with N/D for unavailable categories, so successes are not the only examples shown.

**NEXT ACTION: CONTINUE PROSPECTIVE DATA COLLECTION** while the gate is INSUFFICIENT. Missing: prospective completed outcomes, frozen exact-score feature vectors/model outputs, coverage of goals/xG/shots/SOT, and enough independent temporal folds. MD6's existing ten V2 snapshots contain no actuals and are not an exact-score model evaluation sample. Continue the existing prospective collection workflow; do not implement V3, alter Player Prediction V2, promote a goal model or publish new predictions.
