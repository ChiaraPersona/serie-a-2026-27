# Exact Score Baselines M1 / M2

Generated: 2026-10-03T09:55:53.102Z

RETROSPECTIVE RESEARCH ONLY · NOT VALIDATED PROSPECTIVELY

## IMPLEMENTATION VERDICT

M1 and M2 executed offline with explicit prespecified EXPERIMENTAL configuration. M0 goal expectations and score distributions are unchanged. No M3, production integration, promotion, parameter search or MD6 predictions.

## PRODUCTION ISOLATION

8177 protected files checked before/after; changed files: 0. Package/build commands unchanged. Source, V2/profile, player-market, continuous evaluator and public UI files remain frozen.

## MD6 IMMUTABILITY CHECK

MD6 file SHA-256 before/after: `bb12972bedf482ab4210a11256ee3af1b68f442d264d3bdb106419c7aee38f78`. Snapshot manifest SHA-256: `d8c236c7e8bf6aa92a425cd14e479cb9f20c8fa150029ecc0f1b8c2d82119b4d`. Both unchanged. Ten V2 inputs remain pending; actual home/away goals null. M1/M2 entry point rejects MD6; no exact-score predictions generated for it.

## RETROSPECTIVE SAMPLE

50 matches through MD5; COMMON SAMPLE 50. Every row has target exclusion, earlier matchdays and event date before cutoff. Historical provider revisions are not original pre-match vintages. Available model samples: M0=50, M1=50, M2=50.

## M0 BENCHMARK

Unchanged league means AS-OF, with prior-season league fallback for MD1. No new stabilization or formula is applied to M0.

| Model | N | MAE H | MAE A | MAE Total | Score LogLoss | Exact Hit | Top3 | Top5 | 1X2 RPS | BTTS Brier | O2.5 Brier |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| M0 | 50 | 0.9251 | 0.8593 | 1.2264 | 2.9825 | 12.0% | 32.0% | 46.0% | 0.2496 | 0.2457 | 0.2580 |
| M1 | 50 | 0.7677 | 0.8376 | 1.1758 | 2.8316 | 10.0% | 34.0% | 50.0% | 0.1912 | 0.2725 | 0.2627 |
| M2 | 50 | 0.7875 | 0.7892 | 1.1439 | 2.8109 | 14.0% | 46.0% | 56.0% | 0.2028 | 0.2509 | 0.2344 |

## M1 TEAM GOALS FORMULA

`lambdaHome = leagueHomeRate * homeAttackStrength * awayDefensiveWeakness`

`lambdaAway = leagueAwayRate * awayAttackStrength * homeDefensiveWeakness`

Each strength is its stabilized venue rate divided by the appropriate league venue rate: home attack/away conceded use league home; away attack/home conceded use league away. No separate home multiplier duplicates the venue context.

## M1 SHRINKAGE

With k=12, S(y,n,p)=(n*y+k*p)/(n+k), or p if observations unavailable. First shrink **disjoint non-venue** observations, converted using the as-of league venue ratio, toward historical venue prior; then shrink target-venue observations toward that borrowed prior.

If w_o=n_other/(n_other+k), w_v=n_venue/(n_venue+k): priorWeight=(1-w_v)*(1-w_o); currentWeight=1-priorWeight; venue current weight=w_v; other-venue current weight=(1-w_v)*w_o. Their sum is one and current observations are never reused. With one observation its weight is 1/13; with two split across venues total current weight is 1-(12/13)^2.

The pseudo-count principle and k=12 are reused from the existing Team Profiles methodology without importing/changing production. This is EXPERIMENTAL, prespecified, not optimized on these outcomes. Registry/config records all values.

## M1 PRIOR/FALLBACK

Prior hierarchy: supplied completed Serie A 2025/26 team venue GF/GA -> team overall historical GF/GA adjusted by league venue context -> league rate. Current league rates are AS-OF, historical league rates only when no current evidence. Frosinone/Monza/Venezia have no Serie A prior and use declared league fallback. No Serie B equivalence, last-N form or team-specific overrides. Historical goals are supplied standings aggregates; original match-level prior IDs are unavailable and explicitly marked AGGREGATE_ONLY.

## M1 RESULTS

N=50; Score LogLoss=2.8316; mean home/away MAE=0.8027; RPS=0.1912. These point estimates improve on M0, but BTTS/O1.5/O2.5 may deteriorate and superiority is not established.

## M2 XG COVERAGE

Current referts: home xG 50/50; away xG 50/50; complete 50; missing none; teams affected none.

| MD | N | Home xG | Away xG | Complete | Missing |
| --- | --- | --- | --- | --- | --- |
| 1 | 10 | 10 | 10 | 10 | 0 |
| 2 | 10 | 10 | 10 | 10 | 0 |
| 3 | 10 | 10 | 10 | 10 | 0 |
| 4 | 10 | 10 | 10 | 10 | 0 |
| 5 | 10 | 10 | 10 | 10 | 0 |

Historical Understat: 380/380 complete 2025/26 matches; acquired 2026-08-04T15:05:50.257Z, before MD1. Missing team priors: frosinone, monza, venezia. Provider scale comparability between current StatMuse and historical Understat is UNVERIFIED; no conversion is invented.

## M2 XG FORMULA

`lambdaHome = leagueHomeXG * homeAttackStrength * awayDefensiveWeakness`

`lambdaAway = leagueAwayXG * awayAttackStrength * homeDefensiveWeakness`

Each strength is its stabilized venue rate divided by the appropriate league venue rate: home attack/away conceded use league home; away attack/home conceded use league away. No separate home multiplier duplicates the venue context.

Rates are xGF/xGA. Observed goals, finishing and goalkeeper residuals never correct lambda. Historical/current xG are source-labelled; lambda is the goal-distribution output, not a renamed raw xG statistic.

## M2 SHRINKAGE

Same two-stage disjoint-evidence shrinkage as M1, k=12. Current xGF/xGA coverage is checked separately per component; the declared complete-coverage policy is 1. Missing values remain null. If current coverage fails, that component uses an available historical/team/league prior and records the coverage fallback.

## M2 PRIOR/FALLBACK

Understat historical venue xGF/xGA -> historical overall xGF/xGA adjusted by league venue context -> league xG prior. Unknown/missing team prior uses league, including promoted teams. Opening-round current evidence is empty and historical xG supplies the environment. If neither current nor historical xG environment is available, M2 is non-evaluable; goals are never substituted for xG. No xG historical values are invented.

## M2 RESULTS

N=50; Score LogLoss=2.8109; mean home/away MAE=0.7883; RPS=0.2028; Top3=46.0%; Top5=56.0%. Point estimates add signal; prospective validity remains unknown.

## COMMON-SAMPLE COMPARISON

All main comparisons use exactly 50 common identities, identical vectors/cutoffs, temporal folds and score-matrix code. MODEL AVAILABLE SAMPLE is separately available in the JSON; unavailable predictions cannot silently be counted as zeros. M0/M1/M2 differ only in lambda estimation.

## M0 vs M1

Delta=newer-minus-older; lower is better for losses/MAE/RPS, higher for coverage/probability. Status: **INSUFFICIENT**.

| Metric | Delta | Improvement direction |
| --- | --- | --- |
| scoreLogLoss | -0.1509 | LOWER |
| oneXtwoRPS | -0.0584 | LOWER |
| meanGoalMAE | -0.0895 | LOWER |
| homeGoalsMAE | -0.1574 | LOWER |
| awayGoalsMAE | -0.0217 | LOWER |
| totalGoalsMAE | -0.0506 | LOWER |
| homeGoalsRMSE | -0.2336 | LOWER |
| awayGoalsRMSE | -0.0218 | LOWER |
| totalGoalsRMSE | -0.0554 | LOWER |
| actualScoreProbability | 0.0114 | HIGHER |
| exactHitRate | -0.0200 | HIGHER |
| top3Coverage | 0.0200 | HIGHER |
| top5Coverage | 0.0400 | HIGHER |
| meanActualScoreRank | -0.8800 | LOWER |
| medianActualScoreRank | -0.5000 | LOWER |
| oneXtwoLogLoss | -0.1717 | LOWER |
| bttsBrier | 0.0269 | LOWER |
| bttsLogLoss | 0.0580 | LOWER |
| over15Brier | 0.0261 | LOWER |
| over25Brier | 0.0047 | LOWER |
| over35Brier | -0.0188 | LOWER |

## M0 vs M2

Delta=newer-minus-older; lower is better for losses/MAE/RPS, higher for coverage/probability. Status: **INSUFFICIENT**.

| Metric | Delta | Improvement direction |
| --- | --- | --- |
| scoreLogLoss | -0.1716 | LOWER |
| oneXtwoRPS | -0.0468 | LOWER |
| meanGoalMAE | -0.1039 | LOWER |
| homeGoalsMAE | -0.1376 | LOWER |
| awayGoalsMAE | -0.0701 | LOWER |
| totalGoalsMAE | -0.0825 | LOWER |
| homeGoalsRMSE | -0.2157 | LOWER |
| awayGoalsRMSE | -0.0494 | LOWER |
| totalGoalsRMSE | -0.1527 | LOWER |
| actualScoreProbability | 0.0089 | HIGHER |
| exactHitRate | 0.0200 | HIGHER |
| top3Coverage | 0.1400 | HIGHER |
| top5Coverage | 0.1000 | HIGHER |
| meanActualScoreRank | -1.0600 | LOWER |
| medianActualScoreRank | -2.0000 | LOWER |
| oneXtwoLogLoss | -0.1505 | LOWER |
| bttsBrier | 0.0052 | LOWER |
| bttsLogLoss | 0.0104 | LOWER |
| over15Brier | -0.0078 | LOWER |
| over25Brier | -0.0236 | LOWER |
| over35Brier | -0.0132 | LOWER |

## M1 vs M2

Delta=newer-minus-older; lower is better for losses/MAE/RPS, higher for coverage/probability. Status: **INSUFFICIENT**.

| Metric | Delta | Improvement direction |
| --- | --- | --- |
| scoreLogLoss | -0.0207 | LOWER |
| oneXtwoRPS | 0.0116 | LOWER |
| meanGoalMAE | -0.0143 | LOWER |
| homeGoalsMAE | 0.0197 | LOWER |
| awayGoalsMAE | -0.0484 | LOWER |
| totalGoalsMAE | -0.0319 | LOWER |
| homeGoalsRMSE | 0.0178 | LOWER |
| awayGoalsRMSE | -0.0276 | LOWER |
| totalGoalsRMSE | -0.0973 | LOWER |
| actualScoreProbability | -0.0025 | HIGHER |
| exactHitRate | 0.0400 | HIGHER |
| top3Coverage | 0.1200 | HIGHER |
| top5Coverage | 0.0600 | HIGHER |
| meanActualScoreRank | -0.1800 | LOWER |
| medianActualScoreRank | -1.5000 | LOWER |
| oneXtwoLogLoss | 0.0213 | LOWER |
| bttsBrier | -0.0217 | LOWER |
| bttsLogLoss | -0.0476 | LOWER |
| over15Brier | -0.0339 | LOWER |
| over25Brier | -0.0283 | LOWER |
| over35Brier | 0.0056 | LOWER |

## BOOTSTRAP UNCERTAINTY

Prespecified paired match bootstrap: 4000 resamples, seed 20261003; identical indices for each comparison. The same match retains all its derived-market observations. Nominal 95% intervals are exploratory. Family-adjusted primary intervals use Bonferroni across three comparisons x four metrics (99.6% confidence).

| Comparison | Unit | Clusters | LogLoss CI95 | LogLoss adjusted CI | RPS adjusted CI | MAE adjusted CI |
| --- | --- | --- | --- | --- | --- | --- |
| M1_minus_M0 | match | 50 | -0.3290 .. 0.0250 | -0.4147 .. 0.0993 | -0.1107 .. -0.0060 | -0.2169 .. 0.0359 |
| M1_minus_M0 | matchday | 5 | -0.3653 .. 0.0571 | -0.4329 .. 0.1778 | -0.1069 .. -0.0052 | -0.2062 .. 0.0307 |
| M2_minus_M0 | match | 50 | -0.3150 .. -0.0339 | -0.3913 .. 0.0283 | -0.1023 .. 0.0116 | -0.2263 .. 0.0189 |
| M2_minus_M0 | matchday | 5 | -0.2743 .. -0.0690 | -0.3144 .. -0.0213 | -0.0870 .. -0.0028 | -0.1872 .. -0.0149 |
| M2_minus_M1 | match | 50 | -0.1089 .. 0.0659 | -0.1479 .. 0.1031 | -0.0151 .. 0.0356 | -0.1009 .. 0.0656 |
| M2_minus_M1 | matchday | 5 | -0.1561 .. 0.1148 | -0.2028 .. 0.1497 | -0.0255 .. 0.0428 | -0.1068 .. 0.0750 |

BETTER/WORSE require family-adjusted paired intervals to agree for score LogLoss, RPS and mean goal MAE; mixed or zero-crossing intervals are INSUFFICIENT. SIMILAR only for identical primary per-match contributions; no equivalence margin inferred.

Only <=5 matchdays: the separately reported matchday clustered intervals are unstable and cannot establish temporal robustness. Repeated teams, retrospective revisions and provider differences remain outside the match bootstrap's guarantees.

## SCORE LOG LOSS

Primary distribution metric: -log(P(actual score)); epsilon is evaluation-only.

| Model | LogLoss | Mean P(actual) | Median P(actual) |
| --- | --- | --- | --- |
| M0 | 2.9825 | 0.0672 | 0.0744 |
| M1 | 2.8316 | 0.0786 | 0.0783 |
| M2 | 2.8109 | 0.0761 | 0.0826 |

## GOAL MAE/RMSE

| Model | H MAE | A MAE | Total MAE | H RMSE | A RMSE | Total RMSE | H bias actual-lambda | A bias actual-lambda | Total bias actual-lambda |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| M0 | 0.9251 | 0.8593 | 1.2264 | 1.1873 | 1.0801 | 1.5694 | 0.1997 | 0.0933 | 0.2931 |
| M1 | 0.7677 | 0.8376 | 1.1758 | 0.9538 | 1.0583 | 1.5140 | 0.2450 | 0.3224 | 0.5674 |
| M2 | 0.7875 | 0.7892 | 1.1439 | 0.9716 | 1.0307 | 1.4167 | -0.0849 | 0.1997 | 0.1148 |

Existing evaluator bias (predicted-actual) is preserved; these explicitly named diagnostics use the requested actual-minus-predicted convention.

## EXACT HIT

**Exact score hit rate is a secondary metric.**

| Model | Exact Hit |
| --- | --- |
| M0 | 12.0% |
| M1 | 10.0% |
| M2 | 14.0% |

## TOP-3 / TOP-5

| Model | Top3 Coverage | Top5 Coverage |
| --- | --- | --- |
| M0 | 32.0% | 46.0% |
| M1 | 34.0% | 50.0% |
| M2 | 46.0% | 56.0% |

## ACTUAL SCORE RANK

| Model | Mean | Median | Unavailable |
| --- | --- | --- | --- |
| M0 | 7.8000 | 6.0000 | 0 |
| M1 | 6.9200 | 5.5000 | 0 |
| M2 | 6.7400 | 4.0000 | 0 |

Ranks refer to the represented matrix with deterministic ties; outside support is N/D, point probability remains analytic for independent Poisson.

## 1X2 RPS

| Model | RPS | LogLoss | Multiclass Brier |
| --- | --- | --- | --- |
| M0 | 0.2496 | 1.0799 | 0.6561 |
| M1 | 0.1912 | 0.9082 | 0.5328 |
| M2 | 0.2028 | 0.9294 | 0.5479 |

HOME/DRAW/AWAY order, normalized cumulative squared errors /2; all probabilities derived from the shared matrix.

## BTTS

| Model | Brier | LogLoss | Predicted YES | Actual YES | Actual-predicted bias |
| --- | --- | --- | --- | --- | --- |
| M0 | 0.2457 | 0.6846 | 0.5279 | 0.5800 | 0.0521 |
| M1 | 0.2725 | 0.7426 | 0.4223 | 0.5800 | 0.1577 |
| M2 | 0.2509 | 0.6950 | 0.5137 | 0.5800 | 0.0663 |

## OVER/UNDER

| Model | O1.5 Brier | O2.5 Brier | O3.5 Brier | O2.5 LogLoss | O2.5 actual-predicted bias |
| --- | --- | --- | --- | --- | --- |
| M0 | 0.1517 | 0.2580 | 0.2078 | 0.7092 | 0.0585 |
| M1 | 0.1778 | 0.2627 | 0.1890 | 0.7252 | 0.1320 |
| M2 | 0.1440 | 0.2344 | 0.1946 | 0.6612 | 0.0175 |

## CALIBRATION

Reliability bins for home/draw/away, BTTS and O2.5 are stored with sample counts, predicted/observed means and ECE. All are **EXPLORATORY_SMALL_RETROSPECTIVE_SAMPLE**; bins below ten observations are descriptive only. Goal lambda bins carry counts and are never interpreted as calibrated with insufficient observations.

| Model | Home ECE | Draw ECE | Away ECE | BTTS ECE | O2.5 ECE |
| --- | --- | --- | --- | --- | --- |
| M0 | 0.0826 | 0.0841 | 0.0426 | 0.0951 | 0.0585 |
| M1 | 0.0970 | 0.1233 | 0.1275 | 0.1577 | 0.1825 |
| M2 | 0.0920 | 0.0517 | 0.1014 | 0.1009 | 0.1891 |

## LOW-SCORE DIAGNOSTIC

| Model | Score | Predicted frequency | Actual frequency | Actual-predicted |
| --- | --- | --- | --- | --- |
| M0 | 0-0 | 0.0758 | 0.0000 | -0.0758 |
| M0 | 1-0 | 0.0954 | 0.0800 | -0.0154 |
| M0 | 0-1 | 0.0982 | 0.1000 | 0.0018 |
| M0 | 1-1 | 0.1243 | 0.1200 | -0.0043 |
| M1 | 0-0 | 0.1079 | 0.0000 | -0.1079 |
| M1 | 1-0 | 0.1203 | 0.0800 | -0.0403 |
| M1 | 0-1 | 0.1095 | 0.1000 | -0.0095 |
| M1 | 1-1 | 0.1144 | 0.1200 | 0.0056 |
| M2 | 0-0 | 0.0656 | 0.0000 | -0.0656 |
| M2 | 1-0 | 0.0947 | 0.0800 | -0.0147 |
| M2 | 0-1 | 0.0803 | 0.1000 | 0.0197 |
| M2 | 1-1 | 0.1085 | 0.1200 | 0.0115 |

Exploratory only; no dependence/low-score correction applied. Complete observed-scoreline frequency versus average predicted mass is in scorelineFrequency in JSON.

## DRAW DIAGNOSTIC

| Model | Mean predicted draw | Actual draw rate | Actual-predicted |
| --- | --- | --- | --- |
| M0 | 0.2641 | 0.1800 | -0.0841 |
| M1 | 0.2635 | 0.1800 | -0.0835 |
| M2 | 0.2317 | 0.1800 | -0.0517 |

## LAMBDA DISTRIBUTION

| Model | Side | Mean | Median | Min | Max | Std | Between-match variance | Distinct |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| M0 | home | 1.2803 | 1.2763 | 1.1500 | 1.4750 | 0.1122 | 0.0126 | 5 |
| M0 | away | 1.3267 | 1.3000 | 1.1500 | 1.5500 | 0.1493 | 0.0223 | 5 |
| M1 | home | 1.2350 | 1.1016 | 0.5469 | 2.9622 | 0.5070 | 0.2571 | 50 |
| M1 | away | 1.0976 | 1.0499 | 0.3403 | 2.0508 | 0.4273 | 0.1826 | 50 |
| M2 | home | 1.5649 | 1.4274 | 0.8574 | 3.2599 | 0.5441 | 0.2961 | 50 |
| M2 | away | 1.2203 | 1.1978 | 0.5012 | 2.1791 | 0.3767 | 0.1419 | 50 |

M0 has common league rates within each round. Nonzero variance is reported for M1/M2; no arbitrary threshold is inferred for near-collapse.

## EXTREME LAMBDA CHECK

Diagnostic flags outside [0.25, 4], prespecified and **not clamps**. M0: 0 flagged; M1: 0 flagged; M2: 0 flagged. All lambdas finite/nonnegative; flagged records retained in JSON.

## TEAM DIAGNOSTICS

GF/GA here are sample totals, not independent observations. With <=5 matches per team, all team rows remain exploratory with inference N/D.

| Model | Team | N | Pred GF | Actual GF | Pred GA | Actual GA | GF MAE | GA MAE |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| M0 | atalanta | 5 | 6.6263 | 5 | 6.4083 | 7 | 0.6147 | 0.6583 |
| M0 | bologna | 5 | 6.5346 | 3 | 6.5000 | 6 | 1.0469 | 0.3800 |
| M0 | cagliari | 5 | 6.4833 | 5 | 6.5513 | 2 | 0.5233 | 0.9103 |
| M0 | como | 5 | 6.5000 | 9 | 6.5346 | 6 | 1.1800 | 0.3169 |
| M0 | fiorentina | 5 | 6.4083 | 6 | 6.6263 | 12 | 1.1083 | 1.2947 |
| M0 | frosinone | 5 | 6.5346 | 9 | 6.5000 | 4 | 1.1769 | 0.7800 |
| M0 | genoa | 5 | 6.4763 | 3 | 6.5583 | 10 | 0.6953 | 0.9417 |
| M0 | inter | 5 | 6.4763 | 15 | 6.5583 | 8 | 1.7847 | 0.8283 |
| M0 | juventus | 5 | 6.4083 | 8 | 6.6263 | 4 | 0.4383 | 1.2053 |
| M0 | lazio | 5 | 6.5000 | 8 | 6.5346 | 3 | 0.4400 | 0.9336 |
| M0 | lecce | 5 | 6.5000 | 5 | 6.5346 | 10 | 1.3200 | 1.2636 |
| M0 | milan | 5 | 6.5583 | 10 | 6.4763 | 4 | 0.8083 | 0.7753 |
| M0 | monza | 5 | 6.5583 | 8 | 6.4763 | 12 | 0.4683 | 1.3847 |
| M0 | napoli | 5 | 6.5000 | 7 | 6.5346 | 6 | 0.5200 | 1.1669 |
| M0 | parma | 5 | 6.5346 | 4 | 6.5000 | 7 | 0.7169 | 0.5000 |
| M0 | roma | 5 | 6.5346 | 14 | 6.5000 | 3 | 1.4931 | 0.8800 |
| M0 | sassuolo | 5 | 6.5000 | 9 | 6.5346 | 9 | 0.7800 | 0.5731 |
| M0 | torino | 5 | 6.6263 | 5 | 6.4083 | 8 | 0.6053 | 0.5683 |
| M0 | udinese | 5 | 6.5346 | 8 | 6.5000 | 11 | 1.0536 | 1.1800 |
| M0 | venezia | 5 | 6.5513 | 4 | 6.4833 | 13 | 1.0703 | 1.3033 |
| M1 | atalanta | 5 | 5.2437 | 5 | 5.4103 | 7 | 0.5326 | 0.7094 |
| M1 | bologna | 5 | 4.6947 | 3 | 5.5386 | 6 | 0.7557 | 0.4685 |
| M1 | cagliari | 5 | 4.7885 | 5 | 6.1608 | 2 | 0.5751 | 0.8322 |
| M1 | como | 5 | 7.6104 | 9 | 3.4933 | 6 | 1.1294 | 0.5448 |
| M1 | fiorentina | 5 | 4.7870 | 6 | 7.3475 | 12 | 1.0292 | 1.0848 |
| M1 | frosinone | 5 | 6.0350 | 9 | 5.9139 | 4 | 1.2717 | 0.8120 |
| M1 | genoa | 5 | 4.1411 | 3 | 7.3270 | 10 | 0.4893 | 1.0678 |
| M1 | inter | 5 | 10.4642 | 15 | 5.0647 | 8 | 1.3275 | 0.9690 |
| M1 | juventus | 5 | 6.8357 | 8 | 3.8142 | 4 | 0.4181 | 0.8740 |
| M1 | lazio | 5 | 4.9983 | 8 | 4.0650 | 3 | 0.8338 | 0.6878 |
| M1 | lecce | 5 | 3.5928 | 5 | 6.9288 | 10 | 1.0845 | 1.2789 |
| M1 | milan | 5 | 6.8182 | 10 | 4.3339 | 4 | 0.6364 | 0.6303 |
| M1 | monza | 5 | 6.3787 | 8 | 7.6322 | 12 | 0.4866 | 1.1320 |
| M1 | napoli | 5 | 6.4668 | 7 | 5.9656 | 6 | 0.5358 | 0.7872 |
| M1 | parma | 5 | 3.4207 | 4 | 6.5551 | 7 | 0.6836 | 0.2849 |
| M1 | roma | 5 | 8.9257 | 14 | 3.3301 | 3 | 1.0200 | 0.7907 |
| M1 | sassuolo | 5 | 6.2820 | 9 | 6.1112 | 9 | 0.8020 | 0.6042 |
| M1 | torino | 5 | 4.6794 | 5 | 8.4381 | 8 | 0.4875 | 0.1279 |
| M1 | udinese | 5 | 4.7733 | 8 | 7.4912 | 11 | 1.0610 | 0.9088 |
| M1 | venezia | 5 | 5.6923 | 4 | 5.7070 | 13 | 0.8937 | 1.4586 |
| M2 | atalanta | 5 | 7.8120 | 5 | 7.9241 | 7 | 0.6603 | 0.5658 |
| M2 | bologna | 5 | 6.3709 | 3 | 6.3604 | 6 | 0.8251 | 0.4839 |
| M2 | cagliari | 5 | 6.0546 | 5 | 7.4655 | 2 | 0.5919 | 1.0931 |
| M2 | como | 5 | 7.6581 | 9 | 5.1185 | 6 | 1.1501 | 0.3288 |
| M2 | fiorentina | 5 | 6.5732 | 6 | 7.6275 | 12 | 1.2166 | 1.0180 |
| M2 | frosinone | 5 | 6.3173 | 9 | 7.7191 | 4 | 1.0805 | 0.9286 |
| M2 | genoa | 5 | 5.6830 | 3 | 6.5610 | 10 | 0.5366 | 0.9381 |
| M2 | inter | 5 | 10.7136 | 15 | 4.7886 | 8 | 1.1540 | 0.9933 |
| M2 | juventus | 5 | 10.2084 | 8 | 3.9591 | 4 | 0.5186 | 0.8986 |
| M2 | lazio | 5 | 5.9675 | 8 | 5.8957 | 3 | 0.5949 | 0.8166 |
| M2 | lecce | 5 | 4.9610 | 5 | 9.1479 | 10 | 1.2275 | 1.1561 |
| M2 | milan | 5 | 8.5608 | 10 | 6.0909 | 4 | 0.3249 | 0.8087 |
| M2 | monza | 5 | 7.4186 | 8 | 7.2093 | 12 | 0.3361 | 1.0488 |
| M2 | napoli | 5 | 6.4269 | 7 | 6.3322 | 6 | 0.4908 | 0.8649 |
| M2 | parma | 5 | 4.0932 | 4 | 9.0570 | 7 | 0.6508 | 0.4114 |
| M2 | roma | 5 | 9.8828 | 14 | 5.0901 | 3 | 1.0489 | 0.8475 |
| M2 | sassuolo | 5 | 5.7360 | 9 | 8.6073 | 9 | 0.7489 | 0.2658 |
| M2 | torino | 5 | 5.5837 | 5 | 8.9626 | 8 | 0.5212 | 0.3832 |
| M2 | udinese | 5 | 5.5239 | 8 | 8.4649 | 11 | 1.0838 | 0.6912 |
| M2 | venezia | 5 | 7.7129 | 4 | 6.8766 | 13 | 1.0056 | 1.2247 |

## MATCHDAY DIAGNOSTICS

| Model | MD | N | Label | Score LogLoss | RPS | Mean goal MAE | Top3 | Top5 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| M0 | 1 | 10 | PRIOR_ONLY | 2.8787 | 0.2652 | 0.8853 | 40.0% | 50.0% |
| M0 | 2 | 10 | AS_OF_CURRENT_AND_PRIOR | 2.9669 | 0.2691 | 0.9900 | 30.0% | 40.0% |
| M0 | 3 | 10 | AS_OF_CURRENT_AND_PRIOR | 2.9417 | 0.2326 | 0.7350 | 30.0% | 50.0% |
| M0 | 4 | 10 | AS_OF_CURRENT_AND_PRIOR | 3.4132 | 0.2478 | 1.0333 | 20.0% | 40.0% |
| M0 | 5 | 10 | AS_OF_CURRENT_AND_PRIOR | 2.7120 | 0.2335 | 0.8175 | 40.0% | 50.0% |
| M1 | 1 | 10 | PRIOR_ONLY | 2.4086 | 0.1733 | 0.6611 | 40.0% | 60.0% |
| M1 | 2 | 10 | AS_OF_CURRENT_AND_PRIOR | 2.5899 | 0.1542 | 0.8109 | 50.0% | 70.0% |
| M1 | 3 | 10 | AS_OF_CURRENT_AND_PRIOR | 2.9026 | 0.1577 | 0.7444 | 30.0% | 30.0% |
| M1 | 4 | 10 | AS_OF_CURRENT_AND_PRIOR | 3.6453 | 0.2429 | 1.0693 | 30.0% | 30.0% |
| M1 | 5 | 10 | AS_OF_CURRENT_AND_PRIOR | 2.6114 | 0.2279 | 0.7277 | 20.0% | 60.0% |
| M2 | 1 | 10 | PRIOR_ONLY | 2.5393 | 0.1689 | 0.7085 | 70.0% | 70.0% |
| M2 | 2 | 10 | AS_OF_CURRENT_AND_PRIOR | 2.7522 | 0.1958 | 0.9042 | 50.0% | 60.0% |
| M2 | 3 | 10 | AS_OF_CURRENT_AND_PRIOR | 2.8904 | 0.2013 | 0.7438 | 30.0% | 40.0% |
| M2 | 4 | 10 | AS_OF_CURRENT_AND_PRIOR | 3.3995 | 0.2521 | 0.9587 | 30.0% | 40.0% |
| M2 | 5 | 10 | AS_OF_CURRENT_AND_PRIOR | 2.4730 | 0.1960 | 0.6265 | 50.0% | 70.0% |

Maturity segments record only labels present in the traces (PRIOR_ONLY/PRIOR_DOMINATED/etc.); no developing category is created unless observed.

## MODEL DISAGREEMENT

Largest M1/M2 lambda differences, selected by absolute delta rather than outcome success:

| Match | M1 lambda H/A | M2 lambda H/A | Modal M1 | Modal M2 | Large difference |
| --- | --- | --- | --- | --- | --- |
| juventus-atalanta-2026-27-md-05 | 1.3535 / 0.7670 | 2.4221 / 0.6462 | 1-0 | 2-0 | true |
| atalanta-sassuolo-2026-27-md-01 | 1.3022 / 0.7588 | 2.3096 / 1.0136 | 1-0 | 2-1 | true |
| juventus-parma-2026-27-md-02 | 1.6250 / 0.3776 | 2.5511 / 0.5012 | 1-0 | 2-0 | true |
| milan-lecce-2026-27-md-05 | 1.3716 / 0.6351 | 2.2760 / 0.8080 | 1-0 | 2-0 | true |
| atalanta-cagliari-2026-27-md-04 | 1.3243 / 0.5279 | 2.1262 / 1.0475 | 1-0 | 2-1 | true |
| bologna-sassuolo-2026-27-md-03 | 0.9580 / 1.0782 | 1.6228 / 1.0895 | 0-1 | 1-1 | true |
| juventus-milan-2026-27-md-03 | 1.0947 / 0.8666 | 1.7502 / 0.8501 | 1-0 | 1-0 | true |
| atalanta-bologna-2026-27-md-02 | 1.3620 / 0.9785 | 1.9747 / 1.0562 | 1-0 | 1-1 | true |

All 1X2 differences and every match are retained in disagreement.

Largest improvement AND deterioration vs M0:

| Model | Category | Match | Actual | Delta score LogLoss | P actual M0 / model |
| --- | --- | --- | --- | --- | --- |
| M1 | largestImprovement | roma-fiorentina-2026-27-md-01 | 4-0 | -1.8154 | 0.0098 / 0.0600 |
| M1 | largestDeterioration | atalanta-cagliari-2026-27-md-04 | 1-2 | 1.0981 | 0.0868 / 0.0289 |
| M2 | largestImprovement | inter-monza-2026-27-md-01 | 4-1 | -1.5460 | 0.0112 / 0.0527 |
| M2 | largestDeterioration | venezia-lecce-2026-27-md-01 | 0-2 | 1.0205 | 0.0584 / 0.0211 |

## GOALS vs XG DIVERGENCE

Last pre-match cutoff through MD4; target outcomes excluded. GF/GA minus xGF/xGA are paired descriptive evidence and do not modify lambda.

| Team | N | GF/m | xGF/m | GA/m | xGA/m | GF-xGF | GA-xGA |
| --- | --- | --- | --- | --- | --- | --- | --- |
| atalanta | 4 | 1.2500 | 0.7850 | 1.2500 | 2.0325 | 0.4650 | -0.7825 |
| bologna | 4 | 0.5000 | 1.3125 | 1.2500 | 1.0075 | -0.8125 | 0.2425 |
| cagliari | 4 | 1.0000 | 0.9825 | 0.5000 | 1.6475 | 0.0175 | -1.1475 |
| como | 4 | 2.2500 | 1.7900 | 1.0000 | 1.2975 | 0.4600 | -0.2975 |
| fiorentina | 4 | 1.2500 | 1.8475 | 2.7500 | 1.3100 | -0.5975 | 1.4400 |
| frosinone | 4 | 1.7500 | 1.3375 | 1.0000 | 2.0500 | 0.4125 | -1.0500 |
| genoa | 4 | 0.5000 | 0.9125 | 2.0000 | 1.4700 | -0.4125 | 0.5300 |
| inter | 4 | 3.2500 | 3.0050 | 1.5000 | 1.2325 | 0.2450 | 0.2675 |
| juventus | 4 | 1.5000 | 1.6225 | 1.0000 | 0.4500 | -0.1225 | 0.5500 |
| lazio | 4 | 1.5000 | 1.5475 | 0.7500 | 1.0775 | -0.0475 | -0.3275 |
| lecce | 4 | 1.2500 | 1.2575 | 1.7500 | 2.4025 | -0.0075 | -0.6525 |
| milan | 4 | 1.7500 | 1.2700 | 1.0000 | 1.3750 | 0.4800 | -0.3750 |
| monza | 4 | 1.5000 | 1.8300 | 2.7500 | 0.9700 | -0.3300 | 1.7800 |
| napoli | 4 | 1.5000 | 1.6050 | 1.2500 | 1.4800 | -0.1050 | -0.2300 |
| parma | 4 | 0.5000 | 0.7525 | 1.5000 | 1.8650 | -0.2525 | -0.3650 |
| roma | 4 | 3.0000 | 2.8225 | 0.2500 | 0.6825 | 0.1775 | -0.4325 |
| sassuolo | 4 | 2.0000 | 1.7475 | 1.7500 | 1.3650 | 0.2525 | 0.3850 |
| torino | 4 | 1.0000 | 0.9925 | 1.7500 | 1.7450 | 0.0075 | 0.0050 |
| udinese | 4 | 2.0000 | 1.1450 | 2.5000 | 2.0375 | 0.8550 | 0.4625 |
| venezia | 4 | 1.0000 | 1.4300 | 2.7500 | 2.4975 | -0.4300 | 0.2525 |

## REGRESSION DIAGNOSTICS

REGRESSION_DIAGNOSTIC_ONLY flags at absolute residual >=0.5 per match: atalanta, bologna, cagliari, fiorentina, frosinone, genoa, juventus, lecce, monza, udinese. No finishing/goalkeeping adjustment or persistence claim.

## CURRENT RETROSPECTIVE LEADER

xg-poisson-r0 · **NOT VALIDATED PROSPECTIVELY**. Leader rule uses prespecified ordinal ranks across LogLoss, RPS, mean goal MAE, average Top3/Top5 and average ECE, with priority weights 5/4/3/2/1. This is a descriptive reporting rule, not a learned model parameter or superiority test; Exact Hit is excluded.

| Model | Weighted rank score | LL rank | RPS rank | MAE rank | Coverage rank | Calibration rank |
| --- | --- | --- | --- | --- | --- | --- |
| xg-poisson-r0 | 20.0000 | 1 | 2 | 1 | 1 | 2 |
| goals-poisson-r0 | 27.0000 | 2 | 1 | 2 | 2 | 3 |
| league-poisson-r0 | 43.0000 | 3 | 3 | 3 | 3 | 1 |

## M3 PROCESS BASELINE FEASIBILITY

**REQUIRES_PROSPECTIVE_PROCESS_DATA.** Previous completed-match shots/SOT/xG and xG-per-shot can be reconstructed AS-OF as RETROSPECTIVE_RECONSTRUCTION. Frozen pre-match V2 team targets, original lineup/player allocation and original interaction/profile states for MD1–MD5 cannot be recovered faithfully. No fake V2 snapshots are created. MD6 has real frozen process inputs, but this phase neither reads its outcomes nor makes goal predictions. Future M2 vs M3 predicted-process vs offline oracle comparison needs full pre-kickoff vectors on a common sample and a separate research prompt. Oracle remains ineligible for real predictions.

## MODEL REGISTRY

| Model | Version | State | Executed | Fitted |
| --- | --- | --- | --- | --- |
| LEAGUE_AVERAGE_BASELINE | r0.1 | RESEARCH | true | false |
| TEAM_GOALS_BASELINE | r1.0 | RESEARCH | true | false |
| XG_BASELINE | r1.0 | RESEARCH | true | false |
| PROCESS_BASELINE | r0.1 | RESEARCH | false | false |

M0: zero fitted coefficients; M1/M2: zero fitted coefficients, one shared shrinkage hyperparameter; M2 adds one coverage policy. No team/player overrides. Historical rates are observed aggregates with source provenance, not fitted free coefficients.

## FILES CREATED

Research config, historical-xG adapter, hierarchical baseline estimator, comparison/paired-bootstrap diagnostics, report renderer and baseline tests under scripts/research/exact-score/. New docs/exact-score-baselines-m1-m2.md; generated research config and baselines-m1-m2-report.md under data/analysis/exact-score-research/.

## FILES MODIFIED

Research-only models/features/contracts/schema/integrity/runner and dedicated test command; framework documentation linked here; research registry/dataset/prediction/evaluation/validation artifacts regenerated. No package.json or production files changed.

## COMMANDS

```text
npm run research:exact-score -- --models league,team-goals,xg --through-matchday 5
npm run test:exact-score
node scripts/research/exact-score/test-baselines.js
```

The original no-argument research command remains the unchanged M0-only default. Explicit legacy prior/coverage switches remain supported. M3 and --through-matchday 6 are rejected.

## TEST RESULTS

Framework synthetic assertions: 551; baseline synthetic assertions: 98. Temporal cutoff, MD1 prior-only, MD2 only MD1, no MD6 actual access, missing xG, promoted fallback, disjoint shrinkage, venue normalization, shared matrix, paired common samples, provenance and deterministic bootstrap tested. Repository tests additionally compare complete M0 predictions to the frozen reference, verify M2 lambda invariance when goal scores change, and check MD6/production hashes.

## REMAINING LIMITS

N<=50, <=5 rounds, no prospective exact-score sample. Original provider revisions unavailable; historical/current xG provider scales not harmonized. Bootstrap is exploratory; calibration/team/maturity bins are small. Independent Poisson remains an unvalidated dependence assumption. No winner or production promotion is inferred.

## NEXT ACTION

**NEXT ACTION: REVIEW GOAL-STRENGTH BASELINES**

Point estimates improve, but conservative paired intervals do not establish overall superiority; review the mixed distribution/market results without tuning on this sample. For M3: **NEXT ACTION: WAIT FOR PROSPECTIVE PROCESS DATA**. Continue frozen prospective collection separately. Stop here: no M3, V2 change, MD6 outcome use, MD6 exact-score predictions or promotion.
