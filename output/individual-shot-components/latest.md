# Baseline, matchup e riconciliazione dei tiri

Giocatori-gara con traccia: 948; con almeno una variante calcolabile: 948; con replay di allocazione verificato: 885; confronti temporali: 478.

## Definizioni delle varianti

- historicalPriorOnly: Replace current-regularized baseline by serialized historical role prior; rerun original allocation with unchanged team target.
- noIndividualMatchup: Set individual matchup to one; rerun original allocation with unchanged team target. Team-level matchup remains in team target.
- noReconciliation: Use stabilized baseline times original minutes and matchup without team scaling or redistribution.
- uniformAllocation: Keep original raw player proportions and original team target; remove specialized redistribution.
- legacyTeamTarget: Use archived legacyVolumeProjection target and rerun original allocation. Not a full no-team-matchup replay.
- substituteBudget: Retain original player shares but reserve the empirical prior same-version substitute shot share from the full team target; fitted on earlier complete matchdays only. Added after structural diagnosis, exploratory.

Archived implementation in isolated VM; original outputs must reproduce within 0.015 shots/player. Historical prior and some factors serialized with rounding; interventions are serialized-input approximations, not full engine reruns.

## Passaggi della previsione

| Versione | Passaggio | N | Tiri previsti | Tiri osservati | Bias | MAE |
|---|---|---:|---:|---:|---:|---:|
| engine-4.13.0:player-2 | historicalPriorExposure | 780 | 0.988593 | 1.224359 | -0.235766 | 0.914571 |
| engine-4.13.0:player-2 | baselineExposure | 780 | 1.034451 | 1.224359 | -0.189908 | 0.914695 |
| engine-4.13.0:player-2 | rawFull | 780 | 1.044431 | 1.224359 | -0.179928 | 0.9049 |
| engine-4.13.0:player-2 | final | 780 | 1.302615 | 1.224359 | 0.078256 | 0.936333 |
| engine-4.16.0:player-2 | historicalPriorExposure | 168 | 1.01227 | 1.166667 | -0.154397 | 0.846373 |
| engine-4.16.0:player-2 | baselineExposure | 168 | 1.05241 | 1.166667 | -0.114257 | 0.841215 |
| engine-4.16.0:player-2 | rawFull | 168 | 1.08478 | 1.166667 | -0.081887 | 0.845781 |
| engine-4.16.0:player-2 | final | 168 | 1.431012 | 1.166667 | 0.264345 | 0.917679 |

## Totale squadra, titolari e subentrati

| Versione | Squadre-gara con somme verificate | Totale squadra previsto | Totale reale | Tiri titolari reali | Tiri subentrati reali |
|---|---:|---:|---:|---:|---:|
| engine-4.13.0:player-2 | 100 | 12.8158 | 14.6 | 12.04 | 2.56 |
| engine-4.16.0:player-2 | 22 | 14.209091 | 14.136364 | 11.590909 | 2.545455 |

La riconciliazione attribuisce il totale squadra ai soli giocatori di movimento dell’undici proiettato. Il totale reale comprende i subentrati; le somme di tutti i giocatori sono state verificate contro i totali squadra prima di stimare la quota dei subentrati. Il budget dei subentrati del test usa soltanto le giornate complete precedenti della stessa versione, mai quelle di verifica.

## Confronti sulle giornate successive

| Versione | Variante | Soglia | N | Brier originale | Brier variante | Differenza | IC95% per gara |
|---|---|---:|---:|---:|---:|---:|---|
| engine-4.13.0:player-2 | historicalPriorOnly | 1+ | 415 | 0.211622 | 0.209187 | -0.002435 | [-0.005554,0.00054] |
| engine-4.13.0:player-2 | historicalPriorOnly | 2+ | 415 | 0.162626 | 0.160157 | -0.00247 | [-0.004928,-0.000017] |
| engine-4.13.0:player-2 | historicalPriorOnly | 3+ | 415 | 0.102163 | 0.101396 | -0.000767 | [-0.002754,0.001255] |
| engine-4.13.0:player-2 | noIndividualMatchup | 1+ | 415 | 0.211622 | 0.21325 | 0.001628 | [0.000825,0.002433] |
| engine-4.13.0:player-2 | noIndividualMatchup | 2+ | 415 | 0.162626 | 0.162933 | 0.000307 | [-0.000548,0.001239] |
| engine-4.13.0:player-2 | noIndividualMatchup | 3+ | 415 | 0.102163 | 0.101863 | -0.000299 | [-0.001156,0.000628] |
| engine-4.13.0:player-2 | noReconciliation | 1+ | 478 | 0.214896 | 0.223149 | 0.008252 | [-0.000278,0.017713] |
| engine-4.13.0:player-2 | noReconciliation | 2+ | 478 | 0.166702 | 0.163784 | -0.002917 | [-0.015882,0.008912] |
| engine-4.13.0:player-2 | noReconciliation | 3+ | 478 | 0.106476 | 0.101371 | -0.005104 | [-0.013952,0.002818] |
| engine-4.13.0:player-2 | uniformAllocation | 1+ | 478 | 0.214896 | 0.214805 | -0.000091 | [-0.000627,0.000437] |
| engine-4.13.0:player-2 | uniformAllocation | 2+ | 478 | 0.166702 | 0.166154 | -0.000547 | [-0.001095,-0.00002] |
| engine-4.13.0:player-2 | uniformAllocation | 3+ | 478 | 0.106476 | 0.106089 | -0.000386 | [-0.000871,0.000057] |
| engine-4.13.0:player-2 | legacyTeamTarget | 1+ | 345 | 0.215819 | 0.215422 | -0.000396 | [-0.003304,0.002081] |
| engine-4.13.0:player-2 | legacyTeamTarget | 2+ | 345 | 0.163795 | 0.165007 | 0.001212 | [-0.001539,0.003934] |
| engine-4.13.0:player-2 | legacyTeamTarget | 3+ | 345 | 0.10033 | 0.101371 | 0.001041 | [-0.000935,0.003191] |
| engine-4.13.0:player-2 | substituteBudget | 1+ | 478 | 0.214896 | 0.216654 | 0.001757 | [-0.005712,0.009684] |
| engine-4.13.0:player-2 | substituteBudget | 2+ | 478 | 0.166702 | 0.165249 | -0.001452 | [-0.010776,0.007258] |
| engine-4.13.0:player-2 | substituteBudget | 3+ | 478 | 0.106476 | 0.106452 | -0.000024 | [-0.006458,0.006307] |
| engine-4.16.0:player-2 | historicalPriorOnly | 1+ | 0 | N/D | N/D | N/D | null |
| engine-4.16.0:player-2 | historicalPriorOnly | 2+ | 0 | N/D | N/D | N/D | null |
| engine-4.16.0:player-2 | historicalPriorOnly | 3+ | 0 | N/D | N/D | N/D | null |
| engine-4.16.0:player-2 | noIndividualMatchup | 1+ | 0 | N/D | N/D | N/D | null |
| engine-4.16.0:player-2 | noIndividualMatchup | 2+ | 0 | N/D | N/D | N/D | null |
| engine-4.16.0:player-2 | noIndividualMatchup | 3+ | 0 | N/D | N/D | N/D | null |
| engine-4.16.0:player-2 | noReconciliation | 1+ | 0 | N/D | N/D | N/D | null |
| engine-4.16.0:player-2 | noReconciliation | 2+ | 0 | N/D | N/D | N/D | null |
| engine-4.16.0:player-2 | noReconciliation | 3+ | 0 | N/D | N/D | N/D | null |
| engine-4.16.0:player-2 | uniformAllocation | 1+ | 0 | N/D | N/D | N/D | null |
| engine-4.16.0:player-2 | uniformAllocation | 2+ | 0 | N/D | N/D | N/D | null |
| engine-4.16.0:player-2 | uniformAllocation | 3+ | 0 | N/D | N/D | N/D | null |
| engine-4.16.0:player-2 | legacyTeamTarget | 1+ | 0 | N/D | N/D | N/D | null |
| engine-4.16.0:player-2 | legacyTeamTarget | 2+ | 0 | N/D | N/D | N/D | null |
| engine-4.16.0:player-2 | legacyTeamTarget | 3+ | 0 | N/D | N/D | N/D | null |
| engine-4.16.0:player-2 | substituteBudget | 1+ | 0 | N/D | N/D | N/D | null |
| engine-4.16.0:player-2 | substituteBudget | 2+ | 0 | N/D | N/D | N/D | null |
| engine-4.16.0:player-2 | substituteBudget | 3+ | 0 | N/D | N/D | N/D | null |

## Campione comune a tutte le varianti

engine-4.13.0:player-2: 345 giocatori-gara in 28 gare. Confronti appaiati sullo stesso campione per tutte le varianti in latest.json, campo commonComparisons.
engine-4.16.0:player-2: 0 giocatori-gara in 0 gare. Confronti appaiati sullo stesso campione per tutte le varianti in latest.json, campo commonComparisons.

Esclusioni dal replay: {"MISSING_SERIALIZED_COMPONENTS":20,"ORIGINAL_REPLAY_OUTSIDE_ROUNDING_TOLERANCE":8}. Nessun valore mancante sostituito con un dato corrente o inventato.

Differenza negativa = errore inferiore. Le varianti sono interventi su input serializzati, con arrotondamenti, e non una validazione del modello nuovo.

## Esito della diagnosi

Nella 4.16 il passaggio dai tiri grezzi alla riconciliazione aumenta la media individuale da 1,085 a 1,431, contro 1,167 osservati nel campione confrontabile. Il totale squadra resta vicino al totale reale: il disallineamento si trova soprattutto tra volume dell’intera squadra e volume assegnato ai titolari.

Togliere la riconciliazione o il matchup non produce un miglioramento uniforme delle soglie. La baseline storica e la distribuzione uniforme mostrano piccoli vantaggi su alcune soglie, senza una conferma generale corretta per i confronti multipli. Anche la semplice riserva media per i subentrati non migliora uniformemente.

La prossima ipotesi tecnica è un budget distinto di minuti e tiri per titolari e subentrati, basato su giocatori e sostituzioni plausibili, conservando il totale squadra. Questo esperimento non lo certifica né trasferisce probabilità individuali ai contratti DUO.

I 142 giocatori-gara della vecchia 4.12 non espongono tutti i componenti necessari: nessuna traccia mancante è stata inventata. Otto squadre-gara restano fuori dai replay di allocazione perché il controllo di riproduzione supera la tolleranza; restano ammesse alle varianti dirette che non richiedono quel replay.

## Limiti

- Exploratory retrospective interventions after prior audits, not untouched confirmatory holdout.
- Fixed variants; no picking an apparent winning threshold and no automatic promotion.
- Teams lacking verified replay are excluded only from interventions requiring allocation replay; direct raw and uniform-share interventions remain available.
- Common original comparator uses identical players for each intervention; coverage can differ for unavailable legacy targets.
- Removing reconciliation changes total volume; removing matchup or baseline with reconciliation conserves team volume and changes player shares.
- Fixture-paired bootstrap does not fully account for repeated players or multiple variant comparisons.
- No approval, publication, changes to engine formulas, or edits of frozen prospective forecasts.

Verificati invariati anche 7 file di previsioni prospettiche già congelate. Dettagli di squadra, controlli di conservazione dei volumi e archivi in latest.json.
