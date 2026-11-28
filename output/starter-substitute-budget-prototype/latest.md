# Prototipo del budget tiri: titolari e subentranti

Modello interno sperimentale: conserva baseline, matchup, minuti e quote relative dei titolari; aggiunge minuti e tiri delle riserve prima della normalizzazione comune al totale squadra.

I minuti residui per ruolo sono ripartiti con le precedenti presenze dalla panchina dei giocatori disponibili in rosa. Il limite per ogni riserva è 90 volte la frequenza storica di ingresso quando nominata in panchina. Dati e identità mancanti producono astensione, non uno zero. Per le baseline sono ammessi dati individuali storici oppure almeno due osservazioni correnti; il solo prior di ruolo non basta.

## Copertura e budget

| Versione | Squadre-gara | Complete | Astensioni | Minuti titolari | Minuti riserve | Tiri riserve previsti | Tiri riserve reali |
|---|---:|---:|---:|---:|---:|---:|---:|
| engine-4.13.0:player-2 | 100 | 72 | 28 | 719.884722 | 180.115278 | 2.688579 | 2.152778 |
| engine-4.16.0:player-2 | 22 | 19 | 3 | 720.626316 | 179.373684 | 3.040172 | 2.789474 |

## Controllo del minutaggio sullo stesso campione

engine-4.13.0:player-2: sullo stesso undici e sulle stesse 5 squadre-gara, minuti riserve previsti 164.64, osservati 70.4; minuti titolari previsti 735.36, osservati 829.6. Altri stati di copertura dei minuti: {"STANDARD_900_MINUTE_ACCOUNTING":46,"IDENTITY_OR_MINUTES_UNAVAILABLE":25,"NON_STANDARD_OR_INCONSISTENT_TOTAL_MINUTES":1}.
engine-4.16.0:player-2: sullo stesso undici e sulle stesse 0 squadre-gara, minuti riserve previsti null, osservati null; minuti titolari previsti null, osservati null. Altri stati di copertura dei minuti: {"STANDARD_900_MINUTE_ACCOUNTING":11,"IDENTITY_OR_MINUTES_UNAVAILABLE":7,"NON_STANDARD_OR_INCONSISTENT_TOTAL_MINUTES":1}.

## Confronto temporale

Stesse giornate di verifica della precedente analisi delle componenti; solo dati delle giornate precedenti negli input di ciascuna fixture.

| Versione | Soglia | N | Gare | Brier originale | Brier prototipo | Differenza | IC95% per gara |
|---|---:|---:|---:|---:|---:|---:|---|
| engine-4.13.0:player-2 | 1+ | 358 | 28 | 0.215555 | 0.216295 | 0.000739 | [-0.009753,0.01075] |
| engine-4.13.0:player-2 | 2+ | 358 | 28 | 0.171017 | 0.169982 | -0.001034 | [-0.01243,0.009724] |
| engine-4.13.0:player-2 | 3+ | 358 | 28 | 0.113485 | 0.113858 | 0.000373 | [-0.007024,0.007861] |
| engine-4.16.0:player-2 | 1+ | 0 | 0 | N/D | N/D | N/D | null |
| engine-4.16.0:player-2 | 2+ | 0 | 0 | N/D | N/D | N/D | null |
| engine-4.16.0:player-2 | 3+ | 0 | 0 | N/D | N/D | N/D | null |

Differenza negativa = errore minore. Non basta migliorare una soglia per promuovere il modello; valutare anche astensioni e ipotesi sulle riserve. Il controllo con la semplice quota empirica dei subentrati, sulle stesse righe, è in latest.json (empiricalReserveComparisons). Il sottocampione con l’intero undici previsto coincidente con quello effettivo è separato in strictXiComparisons.

## Astensioni

engine-4.13.0:player-2: {"UNASSIGNED_ROLE_MINUTES":28}
engine-4.16.0:player-2: {"UNASSIGNED_ROLE_MINUTES":3}

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
