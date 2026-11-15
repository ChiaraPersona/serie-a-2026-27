# Documentazione del progetto

Questo indice organizza la documentazione interna. Le descrizioni dei modelli e
le misure riportate nei resoconti valgono nel contesto indicato da ciascun file:
non costituiscono una nuova approvazione o una verifica dello stato corrente.

## Punti di ingresso

- [Presentazione e manutenzione del progetto](../README.md)
- [Istruzioni per gli agenti](../AGENTS.md)
- [Mappa operativa: dati, builder, consumatori e controlli](codex-operational-map.md)

## Guide operative e presentazione

- [App installabile](app-installabile.md)
- [GitHub Pages](github-pages-deployment.md)
- [Commit e lock Git residui](git-lock-recovery.md)
- [Archivio quote Sisal suddiviso per evento](sisal-dataset-storage.md)
- [Database storico arbitrale MD7](referee-history-database.md)
- [Reading referee dashboard](referee-dashboard-presentation.md)
- [Specifica tecnica UX — Letture Serie A e Champions League](specifica-ux-letture-unificate-fase-2.md)

## Champions League


- [Scenario Champions: motore condiviso](champions-shared-scenario.md)
- [Champions MD4: pronostici con probabili canoniche](champions-md04-probable-forecasts.md)
- [Lettura Champions collegata al rating europeo](champions-european-reading.md)
- [Elo iniziale stimato per squadre con poco storico europeo](champions-elo-initial-prior.md)
- [Previsione xGOT Champions](champions-xgot-forecast.md)
- [Verifica prospettica dei mercati Champions](champions-market-prospective.md)

## Modelli e protocolli di ricerca


- [Card data and targets v1 — Phase 1, 3 October 2026](card-data-targets-v1.md)
- [Card C0–C4 research protocol, RECORDED_YELLOW r2 — 4 October 2026](card-prediction-research-c0-c4.md)
- [Match Outcome & Exact Score Research Framework](exact-score-research-framework.md)
- [Exact Score Baselines M1 / M2](exact-score-baselines-m1-m2.md)
- [Prediction Engine V2 — evaluation diagnostica](prediction-calibration-v2.md)
- [Continuous Prediction Engine V2 evaluation](prediction-continuous-evaluation-v2.md)
- [Coordinate territoriali per le proiezioni individuali](player-spatial-validation.md)
- [Congelamento e verifica prospettica delle zone di tiro](spatial-prospective-validation.md)
- [Duelli e rischio disciplinare: verifica delle fonti primarie](disciplinary-tactical-methods-sources-2026-10-24.md)
- [Rischio disciplinare, duelli e canali: proposta di analisi](disciplinary-tactical-model-proposal-2026-10-24.md)
- [Prototipo descrittivo dei duelli — 24 ottobre 2026](disciplinary-tactical-prototype-2026-10-24.md)

## xGOT


- [xG sui Tiri in porta (xGOT)](xgot.md)
- [xGOT operativo e statistiche pubbliche](xgot-operational.md)
- [Storico xGOT: acquisizione di due stagioni](xgot-seasons.md)
- [xGOT: riconciliazione e confronto fuori campione](xgot-validation-results.md)
- [xGOT v2: dati, ricerca e confronto prospettico](xgot-v2-progress.md)
## Report e archivi tecnici

- [Indice dei report storici](reports/README.md): aggiornamenti di giornate, audit e verifiche datate.
- `../data/analysis/`: risultati di ricerca, conservati insieme agli artefatti analizzati.
- `../reports/` e `../output/`: evidenze, baseline e output tecnici; le copie interne appartengono al relativo esperimento.

Il report Exact Score in `exact-score-baselines-m1-m2.md` è generato anche in
`../data/analysis/exact-score-research/baselines-m1-m2-report.md` dal runner di
ricerca. La duplicazione è intenzionale; modificare il generatore prima di
cambiarne l'organizzazione.

I README nelle cartelle dati, asset e script restano vicini ai materiali che
descrivono. `git-commit-recovery.md` conserva il precedente percorso della guida
Git e rimanda alla guida unificata.
