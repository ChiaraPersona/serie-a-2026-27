# Chiusura definitiva ricerca 1X2 / exact-score MD6

## A. Diagnosi delle anomalie

### Inter – Parma

Engine: λ 2.35/0.75; 1/X/2 73.1% / 16.8% / 10.2%. Sisal no-vig: 84.6% / 10.6% / 4.8%. Delta Engine-mercato: -11.5 pp / +6.1 pp / +5.4 pp.

EVIDENCE: La divergenza è reale e nasce meccanicamente da una separazione favorita-outsider meno estrema del mercato: Engine assegna 73,1% all'Inter contro 84,6% no-vig. M1 è il più vicino; M0 e M2 sono molto più piatti.

Causa classificata: **MODEL_MARKET_RELATIVE_STRENGTH_DIVERGENCE**. Causa parametrica finale: **CAUSE NOT ESTABLISHED**. Mapping, normalizzazione e lambda non sono invertiti; gli artefatti disponibili non contengono un'ablation isolata dei componenti Engine sufficiente ad attribuire la differenza a un singolo fattore.

### Napoli – Frosinone

Engine: λ 1.59/1.07; 1/X/2 49.4% / 25.0% / 25.6%. Sisal no-vig: 65.4% / 20.0% / 14.6%. Delta Engine-mercato: -16.0 pp / +5.1 pp / +11.0 pp.

EVIDENCE: Tutti e quattro i modelli sono meno estremi del mercato sulla favorita. Engine usa lambda 1,59/1,07, non dispone del blend xG comparabile e registra fallback-goals; M1/M2 dichiarano fallback di lega per il prior Serie A mancante del Frosinone.

Causa classificata: **PROMOTED_TEAM_PRIOR_AND_EARLY_SAMPLE_UNCERTAINTY**. Causa parametrica finale: **CAUSE NOT ESTABLISHED**. Sono verificati fallback e campione corrente di cinque gare, ma non è disponibile una decomposizione controfattuale che quantifichi quanto ciascun componente causi i 16,0 punti percentuali di differenza sulla vittoria Napoli.

### Como – Roma

Engine: λ 1.59/1.21; 1/X/2 46.2% / 24.8% / 29.1%. Sisal no-vig: 36.5% / 27.1% / 36.5%. Delta Engine-mercato: +9.7 pp / -2.3 pp / -7.4 pp.

EVIDENCE: Engine rende il Como favorito (46,2% contro 36,5% no-vig), mentre M1 è quasi equilibrato e M2 favorisce la Roma. Il segnale è quindi specifico della stima di forza relativa dell'Engine, non della matrice o del mapping.

Causa classificata: **ENGINE_SPECIFIC_RELATIVE_STRENGTH_DIRECTION**. Causa parametrica finale: **CAUSE NOT ESTABLISHED**. I componenti Engine mostrano xG attivo e differenze di attacco/difesa, ma senza ablation predefinita non si può isolare quale interazione capovolga l'ordine rispetto a M2 e al mercato.

## B. Confronto Engine/M0/M1/M2

| Partita | Engine 4.13.0 1/X/2 | M0 1/X/2 | M1 1/X/2 | M2 1/X/2 |
| --- | --- | --- | --- | --- |
| Genoa – Fiorentina | λ 1.35/1.37 · 36.7% / 25.7% / 37.6% | λ 1.48/1.42 · 39.0% / 24.8% / 36.3% | λ 1.22/1.23 · 36.1% / 27.3% / 36.7% | λ 1.31/1.43 · 34.5% / 25.5% / 40.0% |
| Inter – Parma | λ 2.35/0.75 · 73.1% / 16.8% / 10.2% | λ 1.48/1.42 · 39.0% / 24.8% / 36.3% | λ 2.3/0.51 · 77.9% / 15.5% / 6.6% | λ 2.09/1.15 · 59.0% / 20.7% / 20.3% |
| Napoli – Frosinone | λ 1.59/1.07 · 49.4% / 25.0% / 25.6% | λ 1.48/1.42 · 39.0% / 24.8% / 36.3% | λ 1.39/1.09 · 43.8% / 26.7% / 29.5% | λ 1.78/1.37 · 47.1% / 23.1% / 29.8% |
| Como – Roma | λ 1.59/1.21 · 46.2% / 24.8% / 29.1% | λ 1.48/1.42 · 39.0% / 24.8% / 36.3% | λ 1.17/1.14 · 36.5% / 28.3% / 35.2% | λ 1.55/1.72 · 34.8% / 23.0% / 42.2% |
| Lazio  – Monza | λ 1.87/1.19 · 53.2% / 22.6% / 24.2% | λ 1.48/1.42 · 39.0% / 24.8% / 36.3% | λ 1.79/1.13 · 52.9% / 23.2% / 23.9% | λ 1.45/1.42 · 38.3% / 24.9% / 36.8% |
| Lecce – Bologna | λ 0.9/1.56 · 21.7% / 25.5% / 52.8% | λ 1.48/1.42 · 39.0% / 24.8% / 36.3% | λ 0.66/1.33 · 18.4% / 28.6% / 53.0% | λ 1.26/1.57 · 30.6% / 24.8% / 44.6% |
| Sassuolo – Milan | λ 1.06/1.74 · 23.0% / 23.7% / 53.3% | λ 1.48/1.42 · 39.0% / 24.8% / 36.3% | λ 0.78/1.69 · 17.1% / 23.9% / 59.0% | λ 1.5/1.36 · 40.7% / 24.9% / 34.4% |
| Cagliari – Juventus | λ 0.97/1.51 · 24.3% / 25.9% / 49.8% | λ 1.48/1.42 · 39.0% / 24.8% / 36.3% | λ 0.69/0.96 · 25.2% / 34.2% / 40.6% | λ 1.1/1.54 · 27.3% / 25.4% / 47.3% |
| Atalanta – Venezia | λ 1.91/0.87 · 61.8% / 21.7% / 16.5% | λ 1.48/1.42 · 39.0% / 24.8% / 36.3% | λ 1.53/0.83 · 53.9% / 25.8% / 20.3% | λ 1.55/1.55 · 38.1% / 23.9% / 38.1% |
| Torino – Udinese | λ 1.48/1.77 · 32.4% / 23.0% / 44.6% | λ 1.48/1.42 · 39.0% / 24.8% / 36.3% | λ 1.49/1.65 · 34.6% / 23.6% / 41.8% | λ 1.51/1.38 · 40.5% / 24.8% / 34.7% |

Tutte le probabilità derivano dalla matrice del rispettivo modello. Nessun ensemble e nessuna selezione retrospettiva del modello più favorevole.

## C. Evidenza di calibrazione

| Segnale | Classificazione | Evidenza |
| --- | --- | --- |
| Sovrastima pareggi | WEAK INDICATION | M0/M1/M2 prevedono in media 26.4%, 26.3%, 23.2% contro 18.0% osservato su 50 gare; campione retrospettivo breve. |
| Sovrastima outsider | NOT ESTABLISHED | M1 outsider 21.7% previsto vs 20.0% osservato; M2 23.4% vs 28.0%. Non emerge un eccesso comune. |
| Sottostima favorite | WEAK INDICATION | M1 52.0% previsto vs 62.0% osservato; M2 53.5% vs 54.0%. Indicazione non uniforme. |
| Lambda casa/trasferta mal calibrati | WEAK INDICATION | Bias totale actual-minus-lambda: M0 0.293, M1 0.567, M2 0.115. M1 appare più bassa, senza prova prospettica. |
| Eccessiva dispersione | NOT ESTABLISHED | Rapporto varianza/media osservato complessivo: casa 0.944, trasferta 0.807; il diagnostico esistente non prova overdispersione persistente. |
| Probabilità estreme | NOT ESTABLISHED | M1 non supera 80% in alcuna delle 50 gare; M2 lo fa in 2. Nessuna anomalia diffusa stabilita. |

Metriche retrospettive già disponibili su 50 gare: M0 RPS 0.2496, M1 0.1912, M2 0.2028. M2 resta leader descrittivo sullo score LogLoss, M1 sul RPS; nessuna superiorità è stabilita. Il backtest pluristagionale del nucleo retrodatabile copre 1201 gare, ma non identifica la calibrazione categoria-per-categoria del full Engine 4.13.0.

## D. Protocollo adottato

**PROSPECTIVE HEAD-TO-HEAD**: Engine 4.13.0 SHADOW, M0, M1 e M2 RESEARCH restano separati. Le quote Sisal sono soltanto benchmark esterno. Nessun ensemble, nessun M3/M4, nessun tuning verso il mercato, nessun vincitore scelto oggi.

## E. Snapshot create

| Artefatto | Timestamp | Copertura | SHA-256 |
| --- | --- | --- | --- |
| data/predictions/exact-score-research/2026-27/md-06.json | 2026-10-09T12:22:37.357Z | 10/10 partite · 40/40 previsioni | ca1715a6727ecd4578e7080492f183986de3af48c680afcdcc5975d9171a193d |
| data/predictions/exact-score-research/manifest.json | 2026-10-09T12:22:37.357Z | 40 record | d89e6ada1c46d533af026b04dd7a3e104c1ab52c28f1cc00718f0ec4ae71c424 |

Revision research: **3**. 2 sostituzioni controllate pre-kickoff sono registrate nel manifest; ultima motivazione: Restore the canonical M1/M2 source files unchanged and move prospective execution to a metadata-only adapter over the canonical frozen vectors; formulas and outputs unchanged.

Engine conserva il timestamp originario della snapshot immutabile del 3 ottobre e il nuovo `frozenAt`; M0/M1/M2 conservano l'ora effettiva di calcolo. Ogni prediction include lambda, 1X2, BTTS, O/U 2.5, matrice, top 3/top 5, provenance, fallback, maturity, configuration hash e snapshot hash.

## F. Valutazione

**EVALUATION PENDING**. Common sample: 0. L'evaluator legge le prediction congelate e non le ricalcola. Dopo i risultati produrrà score LogLoss, 1X2 RPS, Brier BTTS/O2.5, MAE gol, exact/top3/top5 e calibrazione sullo stesso campione.

## G. Test e integrità

Test focalizzati: **PASS**, 57 asserzioni. Leakage, matrici, 1X2, BTTS, O/U, cutoff, hash, immutabilità, common sample e integrità produzione verificati. Il guard repository storico del 3 ottobre è documentato ma non rieseguito.

Generazione snapshot: 11778 file protetti, modifiche 0, stato **PASS**.

## H. Decisione finale

Ricerca preliminare MD6 chiusa. Nessun modello è promosso o modificato. Il prossimo lavoro exact-score è esclusivamente la valutazione degli actual delle partite disputate.

`1X2 DIAGNOSTIC: COMPLETE`

`PROSPECTIVE MODELS: ENGINE_4.13.0 + M0 + M1 + M2`

`MD6 EXACT-SCORE SNAPSHOTS: FROZEN`

`MD6 MATCHES FROZEN: 10/10`

`PROSPECTIVE EVALUATION: PENDING`

`MODEL PROMOTION: NONE`

`PRODUCTION MODELS: UNCHANGED`

`EXISTING IMMUTABLE SNAPSHOTS: UNCHANGED`

`PRODUCTION INTEGRITY: PASS`

`EXACT-SCORE PRE-MD6 RESEARCH PHASE: CLOSED`
