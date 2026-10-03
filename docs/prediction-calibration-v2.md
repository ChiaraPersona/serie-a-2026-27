# Prediction Engine V2 — evaluation diagnostica

## EVALUATION VERDICT

Valutazione valida ma limitata a MD5. Il motore e rimasto congelato. Il campione consente metriche descrittive e confronto V1/V2 sullo stesso universo, non decisioni robuste di modifica.

## DATA COVERAGE

TOTAL MATCHES: 380  
COMPLETED MATCHES: 50  
EVALUABLE MATCHES: 10  
TOTAL PLAYER-MATCH OBSERVATIONS: 198  
Shots 99% · SOT 99% · minutes 99% · xG 99% · role 100% · detailed role 97.5%.

## LEAKAGE AUDIT

PASS: asOf cutoff esclusivo MD5, target escluso, sole gare concluse MD1-MD4; nessun duplicato. Le distinte ufficiali sono input pre-kickoff.

## WALK-FORWARD PROTOCOL

MD5 e costruita con evidenza corrente MD1-MD4. Gli snapshot V2 per MD1-MD4 non esistono e non sono stati ricreati retroattivamente.

## OVERALL SHOTS PERFORMANCE

N 198 · MAE 0.8906 · RMSE 1.1899 · bias 0.1308 · median AE 0.65.

## OVERALL SOT PERFORMANCE

N 198 · MAE 0.4153 · RMSE 0.5247 · bias 0.1224 · median AE 0.33.

## MARKET CALIBRATION

| Market | N | Brier | LogLoss | ECE | Bias |
|---|---:|---:|---:|---:|---:|
| shots1Plus | 198 | 0.2078 | 0.6086 | 0.069 | 0.0354 |
| shots2Plus | 198 | 0.1857 | 0.5568 | 0.0567 | 0.0218 |
| shots3Plus | 198 | 0.0897 | 0.2994 | 0.0492 | 0.0434 |
| sot1Plus | 198 | 0.1712 | 0.5137 | 0.0473 | 0.0473 |
| sot2Plus | 198 | 0.0354 | 0.1442 | 0.0534 | 0.0515 |

## BRIER SCORES

| Market | N | Brier | LogLoss | ECE | Bias |
|---|---:|---:|---:|---:|---:|
| shots1Plus | 198 | 0.2078 | 0.6086 | 0.069 | 0.0354 |
| shots2Plus | 198 | 0.1857 | 0.5568 | 0.0567 | 0.0218 |
| shots3Plus | 198 | 0.0897 | 0.2994 | 0.0492 | 0.0434 |
| sot1Plus | 198 | 0.1712 | 0.5137 | 0.0473 | 0.0473 |
| sot2Plus | 198 | 0.0354 | 0.1442 | 0.0534 | 0.0515 |

## LOG LOSS

Il log loss e calcolato con clipping epsilon soltanto nell'evaluation; le probabilita originali non sono modificate.

## ECE

ECE e maximum calibration error sono riportati per mercato nell'artifact JSON e vanno letti con N e Brier.

## RELIABILITY DIAGNOSTICS

Esempio 1+ shots:

| Predicted | N | Mean P | Actual Hit Rate | Gap |
|---|---:|---:|---:|---:|
| 17.3-44.6% | 39 | 0.3488 | 0.3077 | 0.0411 |
| 44.6-58.1% | 40 | 0.5169 | 0.6 | -0.0831 |
| 58.5-71.9% | 39 | 0.6553 | 0.5385 | 0.1168 |
| 72.2-85.3% | 40 | 0.7835 | 0.75 | 0.0335 |
| 86.3-98.5% | 40 | 0.9209 | 0.85 | 0.0709 |

Diagrammi separati salvati nell'artifact SVG.

## DISCRIMINATION

shots1Plus: ROC-AUC 0.7111, PR-AUC 0.781.  
shots2Plus: ROC-AUC 0.7347, PR-AUC 0.5978.  
shots3Plus: ROC-AUC 0.841, PR-AUC 0.4375.  
sot1Plus: ROC-AUC 0.7461, PR-AUC 0.5092.  
sot2Plus: ROC-AUC 0.8545, PR-AUC 0.2239.

## EXPECTED MINUTES ACCURACY

MAE 14.404 · RMSE 18.3512 · bias actual-expected 5.3606. Correlazione |errore minuti|/|errore tiri| -0.0428; SOT 0.0269. Non implica causalita.

## STARTER ACCURACY

Accuracy 0.9596; false starter rate 0.0404; missed starter rate N/D. Le prediction MD5 usano distinte ufficiali: misura allineamento dello snapshot, non accuratezza delle probabili formazioni. I non proiettati non sono osservabili nello snapshot, quindi missed starter rate e N/D.

## PRIMARY PERFORMANCE

| PRIMARY | 20 | 1.6235 | -0.1645 | 0.638 |
| SECOND PRIMARY | 18 | 1.3272 | 0.5372 | 0.6806 |

## SECONDARY PERFORMANCE

| SECONDARY | 103 | 0.7041 | 0.0002 | 0.3283 |

## OUTSIDER PERFORMANCE

N 31; control comparabile N 83. Risultati completi e falsi positivi nell'artifact JSON.

## ROLE PERFORMANCE

| Role | N | Shots MAE | Shots bias | SOT MAE |
|---|---:|---:|---:|---:|
| AM | 37 | 1.163 | -0.0916 | 0.5165 |
| CB | 57 | 0.6832 | -0.0098 | 0.2551 |
| CF/ST | 17 | 1.31 | 0.5559 | 0.8124 |
| CM | 49 | 0.8486 | 0.3298 | 0.4524 |
| FB/WB | 25 | 0.6752 | 0.0768 | 0.2788 |
| W | 13 | 1.0485 | 0.1777 | 0.4323 |

## TEAM PATTERNS

Tutte le 20 squadre sono presenti, ma ciascuna ha una sola gara: pattern strutturali INSUFFICIENT DATA.

## OPPONENT PATTERNS

Una sola osservazione-gara per avversario: INSUFFICIENT DATA.

## HOME/AWAY

| away | 99 | 0.9118 | 0.1884 | 0.3896 |
| home | 99 | 0.8693 | 0.0731 | 0.4409 |

## MATURITY PERFORMANCE

Solo EARLY (MD1-5) disponibile; DEVELOPING, MID SAMPLE e MATURE: N/D.

## CONFIDENCE VALIDATION

INSUFFICIENT DATA: modelConfidence non e serializzata come campo individuale autonomo. Non e stato inventato un proxy.

## MATCHUP FACTOR VALUE

Shadow no-matchup approssimato: delta FULL-minus-NO MATCHUP shots MAE 0.0097, SOT MAE 0.001. Con 10 cluster non autorizza modifiche.

## OPPONENT INTERACTION VALUE

INSUFFICIENT DATA: il counterfactual neutralizzato esatto non e serializzato dopo reconciliation.

## PERSISTENCE VALUE

Segmenti presenti nell'artifact; una sola giornata target non permette persistenza out-of-sample.

## STABILITY VALUE

Segmenti LOW/MEDIUM/HIGH presenti nell'artifact; interpretazione esplorativa.

## POISSON DIAGNOSTIC

Shots OVERDISPERSED (mean 1.1717, variance 1.9099); SOT POISSON-LIKE (mean 0.3131, variance 0.306).

## NEGATIVE BINOMIAL SHADOW TEST

Shadow in-sample con dispersione pooled method-of-moments. Risultato misto: migliora Brier/log loss/ECE su 2+ shots, ma non tutte le metriche su 1+ e 3+; DISTRIBUTION CANDIDATE limitato a ulteriore validazione, nessuna sostituzione di Poisson.

## SOT CONVERSION DIAGNOSTIC

N 121; predicted SOT/shots 0.3353, actual 0.2676, MAE ratio 0.3001.

## TEAM TARGET ERROR

Shots MAE 4.5935; SOT MAE 1.5085.

## PLAYER ALLOCATION ERROR

Counterfactual actual-team-volume (include opportunity dei sostituti): shots MAE 0.8265; SOT MAE 0.3879. Counterfactual matched-player-volume (isola le share nel perimetro modellato): shots MAE 0.7235; SOT MAE 0.3182.

## EXPECTED MINUTES ERROR

MAE 14.404; bias 5.3606; viste per banda nell'artifact.

## ERROR DECOMPOSITION

Decomposizione diagnostica, non causale e non additiva. Team environment, allocation, minutes, matchup shadow e probability error sono separati nell'artifact.

## ABLATION RESULTS

FULL V2, NO MATCHUP approssimato, NO CURRENT EVIDENCE, NO HISTORICAL SHRINKAGE e NO EXPECTED MINUTES sono disponibili. NO OPPONENT INTERACTION e NO RECENCY: INSUFFICIENT DATA per counterfactual fedele.

## BASELINE COMPARISON

Baseline A historical raw e B current-season raw calcolate senza matchup; role prior N/D; V1 usa lo stesso identico sample.

## V1 vs V2

Stesso sample N 198. Shots MAE V1 0.9431 vs V2 0.8906: BETTER. SOT MAE V1 0.4214 vs V2 0.4153: SIMILAR.

| Market | Metric | V1 | V2 | Delta V2-V1 | Cluster-bootstrap 95% CI |
|---|---|---:|---:|---:|---|
| shots1Plus | brier | 0.208 | 0.2078 | -0.0002 | -0.0064 to 0.0062 · SIMILAR |
| shots1Plus | logLoss | 0.6055 | 0.6086 | 0.0031 | -0.0118 to 0.0175 · SIMILAR |
| shots2Plus | brier | 0.1895 | 0.1857 | -0.0038 | -0.01 to 0.003 · SIMILAR |
| shots2Plus | logLoss | 0.5643 | 0.5568 | -0.0075 | -0.0195 to 0.0039 · SIMILAR |
| shots3Plus | brier | 0.1023 | 0.0897 | -0.0126 | -0.0183 to -0.0069 · BETTER |
| shots3Plus | logLoss | 0.3254 | 0.2994 | -0.026 | -0.0377 to -0.0145 · BETTER |
| sot1Plus | brier | 0.1762 | 0.1712 | -0.005 | -0.0105 to 0.0002 · SIMILAR |
| sot1Plus | logLoss | 0.527 | 0.5137 | -0.0133 | -0.027 to -0.0003 · BETTER |
| sot2Plus | brier | 0.0363 | 0.0354 | -0.0009 | -0.0024 to 0.0007 · SIMILAR |
| sot2Plus | logLoss | 0.1457 | 0.1442 | -0.0015 | -0.0051 to 0.0026 · SIMILAR |

## EARLY vs MATURE

EARLY disponibile; DEVELOPING/MID/MATURE N/D. Non e possibile stabilire se il modello migliori con la maturity.

## BIGGEST ERROR CLUSTERS

Nessun cluster dichiarato strutturale: una sola giornata e molteplici confronti. Le tabelle complete permettono il monitoraggio futuro.

## CALIBRATION CANDIDATES

CALIBRATION CANDIDATE soltanto se i gap persistono su nuove giornate; oggi INSUFFICIENT DATA per ricalibrare.

## DISTRIBUTION CANDIDATES

Negative Binomial e un DISTRIBUTION CANDIDATE limitato al mercato 2+ shots: il vantaggio e in-sample e deve replicarsi walk-forward; nessuna modifica production.

## VOLUME OWNERSHIP CANDIDATES

INSUFFICIENT DATA: richiede fallimenti primary ripetuti su piu giornate.

## ROLE/MATCHUP CANDIDATES

INSUFFICIENT DATA: i segmenti hanno N esplicito ma non persistenza temporale.

## DATA QUALITY LIMITS

- INSUFFICIENT DATA: only one V2 matchday and 10 match clusters.
- INSUFFICIENT DATA: no DEVELOPING, MID SAMPLE or MATURE V2 outcomes.
- INSUFFICIENT DATA: modelConfidence is not serialized independently; confidence validation is N/D.
- INSUFFICIENT DATA: exact opponent-interaction and most ablation counterfactuals cannot be reconstructed from serialized output without changing/re-running the frozen engine.
- Multiple comparisons: segmented extremes are exploratory and require persistence across future matchdays.
- Starter accuracy is not a forecast score because MD5 used official lineups.

## PRIORITY PROBLEMS

HIGH — sample temporale insufficiente (una giornata V2), impatto su tutte le metriche e rischio elevato di overfitting. MEDIUM — modelConfidence e counterfactual exact ablations non serializzati. Nessun problema CRITICAL di leakage o duplicazione.

## FILES CREATED

- `data/analysis/prediction-calibration-v2.json`
- `data/analysis/prediction-reliability-v2.svg`
- `docs/prediction-calibration-v2.md`
- `scripts/evaluate-prediction-engine-v2.js`
- `scripts/test-prediction-evaluation-v2.js`

## FILES MODIFIED

- `package.json` (solo comandi evaluation/test)

## TESTS

Vedere output dei test: freeze audit, leakage, duplicati, monotonicita, copertura, same-sample V1/V2 e presenza delle sezioni obbligatorie.

## NEXT RECOMMENDED MODEL CHANGE

NEXT RECOMMENDED MODEL CHANGE: NO MODEL CHANGE YET — COLLECT MORE DATA

Evidence: un solo matchday V2 e 10 cluster. Affected markets: tutti. Expected benefit: evitare una modifica guidata dal rumore. Risks: attendere rallenta l'iterazione ma riduce fortemente overfitting. Required validation: aggiungere snapshot V2 immutabili e valutarli walk-forward almeno nelle fasce DEVELOPING e MID SAMPLE, mantenendo gli stessi test e bootstrap per partita.
