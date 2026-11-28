# Budget con minutaggio condizionato alla titolarità

Existing archived expectedMinutes function and weights, supplied recent mean and sample count from valid recent STARTS only; same joint shot budget.

Il modello operativo usa anche recentAverageMinutes calcolato su tutte le ultime gare di squadra, compresi panchina e assenza. Qui la funzione e i pesi esistenti ricevono invece media e numerosità delle sole recenti partenze da titolare con minuti noti. Nessun peso del motore operativo viene modificato.

## Copertura

engine-4.16.0:player-2: 21/32 squadre-gara complete. Minuti su stessi undici e squadre: {"n":16,"predictedStarterMinutes":797.61875,"actualStarterMinutes":794.0625,"predictedSubstituteMinutes":102.38125,"actualSubstituteMinutes":105.9375}.
engine-4.13.0:player-2: 52/88 squadre-gara complete. Minuti su stessi undici e squadre: {"n":40,"predictedStarterMinutes":800.345,"actualStarterMinutes":793.05,"predictedSubstituteMinutes":99.655,"actualSubstituteMinutes":106.925}.

## Confronto minuti sugli stessi casi

engine-4.16.0:player-2: {"n":13,"previousStarterMinutes":698.338462,"conditionalStarterMinutes":799.161538,"actualStarterMinutes":790.384615,"previousStarterMinuteMAE":92.046154,"conditionalStarterMinuteMAE":36.084615}.
engine-4.13.0:player-2: {"n":24,"previousStarterMinutes":720.166667,"conditionalStarterMinutes":801,"actualStarterMinutes":797.875,"previousStarterMinuteMAE":79.65,"conditionalStarterMinuteMAE":27.733333}.

## Confronto con probabilità originali

| Versione | Soglia | N | Gare | Brier originale | Brier prototipo | Differenza | IC95% per gara |
|---|---:|---:|---:|---:|---:|---:|---|
| engine-4.16.0:player-2 | 1+ | 0 | 0 | N/D | N/D | N/D | null |
| engine-4.16.0:player-2 | 2+ | 0 | 0 | N/D | N/D | N/D | null |
| engine-4.16.0:player-2 | 3+ | 0 | 0 | N/D | N/D | N/D | null |
| engine-4.13.0:player-2 | 1+ | 370 | 24 | 0.216936 | 0.215155 | -0.001781 | [-0.009878,0.006834] |
| engine-4.13.0:player-2 | 2+ | 370 | 24 | 0.178195 | 0.168631 | -0.009563 | [-0.018034,-0.000944] |
| engine-4.13.0:player-2 | 3+ | 370 | 24 | 0.113091 | 0.106088 | -0.007003 | [-0.01259,-0.000715] |

Confronto appaiato aggiuntivo contro il precedente budget sulle stesse righe in latest.json: versusPreviousJoint.

## Limiti

- Post-diagnosis exploratory variant; no independent confirmatory validation or correction for multiple experiments.
- Starter baseline, serialized lineup role, matchup, team shot total and relative allocation per minute remain unchanged.
- Bench role proxies, capacity assumptions, availability uncertainty and abstention policy of first prototype remain.
- Versions remain separate; no current-engine validation without enough later complete matchdays.
- New coverage can differ: comparison against previous prototype is additionally paired on common players and common team minute budgets.
- Current features are reconstructed with exact archived IDs only; results assess the reconstructed prototype, not a causal isolation of one coefficient.
- No DUO inference, operational integration or modification of previous frozen forecasts.

Nessuna modifica a sito, previsioni pubblicate o sette snapshot prospettici già congelati.
