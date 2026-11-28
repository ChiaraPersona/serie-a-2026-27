# Prototipo del budget tiri: titolari e subentranti

Campione: LAST_PREMATCH_MATCHING_OFFICIAL_XI. Modello interno sperimentale: conserva baseline, matchup, minuti e quote relative dei titolari; aggiunge minuti e tiri delle riserve prima della normalizzazione comune al totale squadra.

I minuti residui per ruolo sono ripartiti con le precedenti presenze dalla panchina dei giocatori disponibili in rosa. Il limite per ogni riserva è 90 volte la frequenza storica di ingresso quando nominata in panchina. Dati e identità mancanti producono astensione, non uno zero. Per le baseline sono ammessi dati individuali storici oppure almeno due osservazioni correnti; il solo prior di ruolo non basta.

## Copertura e budget

| Versione | Squadre-gara | Complete | Astensioni | Minuti titolari | Minuti riserve | Tiri riserve previsti | Tiri riserve reali |
|---|---:|---:|---:|---:|---:|---:|---:|
| engine-4.13.0:player-2 | 88 | 34 | 54 | 713.285294 | 186.714706 | 2.745862 | 2.176471 |
| engine-4.16.0:player-2 | 32 | 21 | 11 | 704.985714 | 195.014286 | 3.206554 | 2.190476 |

## Controllo del minutaggio sullo stesso campione

engine-4.13.0:player-2: sullo stesso undici e sulle stesse 24 squadre-gara, minuti riserve previsti 179.833333, osservati 102.083333; minuti titolari previsti 720.166667, osservati 797.875. Altri stati di copertura dei minuti: {"STANDARD_900_MINUTE_ACCOUNTING":25,"NON_STANDARD_OR_INCONSISTENT_TOTAL_MINUTES":1,"IDENTITY_OR_MINUTES_UNAVAILABLE":8}.
engine-4.16.0:player-2: sullo stesso undici e sulle stesse 13 squadre-gara, minuti riserve previsti 201.661538, osservati 109.615385; minuti titolari previsti 698.338462, osservati 790.384615. Altri stati di copertura dei minuti: {"STANDARD_900_MINUTE_ACCOUNTING":13,"IDENTITY_OR_MINUTES_UNAVAILABLE":7,"NON_STANDARD_OR_INCONSISTENT_TOTAL_MINUTES":1}.

## Confronto temporale

Stesse giornate di verifica della precedente analisi delle componenti; solo dati delle giornate precedenti negli input di ciascuna fixture.

| Versione | Soglia | N | Gare | Brier originale | Brier prototipo | Differenza | IC95% per gara |
|---|---:|---:|---:|---:|---:|---:|---|
| engine-4.13.0:player-2 | 1+ | 270 | 19 | 0.226252 | 0.227332 | 0.00108 | [-0.00837,0.010711] |
| engine-4.13.0:player-2 | 2+ | 270 | 19 | 0.162205 | 0.153667 | -0.008538 | [-0.025637,0.008732] |
| engine-4.13.0:player-2 | 3+ | 270 | 19 | 0.095787 | 0.085019 | -0.010769 | [-0.016423,-0.004896] |
| engine-4.16.0:player-2 | 1+ | 0 | 0 | N/D | N/D | N/D | null |
| engine-4.16.0:player-2 | 2+ | 0 | 0 | N/D | N/D | N/D | null |
| engine-4.16.0:player-2 | 3+ | 0 | 0 | N/D | N/D | N/D | null |

Differenza negativa = errore minore. Non basta migliorare una soglia per promuovere il modello; valutare anche astensioni e ipotesi sulle riserve. Il controllo con la semplice quota empirica dei subentrati, sulle stesse righe, è in latest.json (empiricalReserveComparisons). Il sottocampione con l’intero undici previsto coincidente con quello effettivo è separato in strictXiComparisons.

## Astensioni

engine-4.13.0:player-2: {"UNASSIGNED_ROLE_MINUTES":53,"BENCH_BASELINE_OR_MATCHUP_PROXY_UNAVAILABLE":1}
engine-4.16.0:player-2: {"UNASSIGNED_ROLE_MINUTES":11}

## Ipotesi e limiti

- Retrospective exploratory prototype after inspecting historical results. No independent confirmatory validation.
- Starter baseline, minutes, matchup and relative allocation are preserved. Common team normalization is replaced by joint starter-plus-substitute normalization.
- Bench roles use canonical broad role; specific player-to-player substitution pairings are unknown.
- Bench matchup is an explicit same-role proxy from projected starters, not a measured individual matchup.
- Historical named-bench entry frequency is a capacity constraint, not a calibrated game-specific entry probability.
- Potential roster bench has unconfirmed availability unless an archived official named bench matches the projected XI.
- No role-only shots imputation: individual historical evidence or at least two observed current shooting appearances required; current-only players retain existing engine role regularization, explicitly tagged.
- Fixed formulas with no tuning or winner selection. Comparison uses identical players and original probabilities on each eligible team.
- Minute diagnostic requires exact full-XI agreement and total observed outfield minutes within one minute of 900; other totals are excluded without assuming they are necessarily wrong.
- Main player evaluation conditions on each compared player actually starting; a separate strict full-XI cohort is also reported.
- No DUO probability, odds, EV, operational integration, or changes to existing frozen prospective forecasts.

Dettaglio verificabile di candidati, minuti, slot, baseline, budget dei tiri e hash degli archivi in latest.json. Nessuna modifica ai pronostici pubblicati.
