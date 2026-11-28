# Calibrazione sperimentale dei tiri individuali

Una correzione additiva sulle log-odds, condivisa tra le soglie 1+/2+/3+, stimata soltanto sulle giornate complete precedenti della stessa versione. Penalizzazione fissa 5; peso totale uno per giocatore-gara. Nessuna ricerca della variante migliore.

Verifica temporale retrospettiva esplorativa: i risultati aggregati del campione erano già stati esaminati. La verifica prospettica nuova resta distinta.

| Versione | Giornate verifica | Evento | N | Brier originale | Brier calibrato | Differenza | IC 95% differenza per gara |
|---|---|---|---:|---:|---:|---:|---|
| engine-4.12.0:player-2 | Nessuna | shots1Plus | 0 | N/D | N/D | N/D | null |
| engine-4.12.0:player-2 | Nessuna | shots2Plus | 0 | N/D | N/D | N/D | null |
| engine-4.12.0:player-2 | Nessuna | shots3Plus | 0 | N/D | N/D | N/D | null |
| engine-4.13.0:player-2 | 9, 10, 11 | shots1Plus | 478 | 0.2149 | 0.21607 | 0.001176 | [-0.003543,0.006063] |
| engine-4.13.0:player-2 | 9, 10, 11 | shots2Plus | 478 | 0.1667 | 0.16561 | -0.001094 | [-0.004711,0.002322] |
| engine-4.13.0:player-2 | 9, 10, 11 | shots3Plus | 478 | 0.10648 | 0.10614 | -0.000336 | [-0.002688,0.001976] |
| engine-4.16.0:player-2 | Nessuna | shots1Plus | 0 | N/D | N/D | N/D | null |
| engine-4.16.0:player-2 | Nessuna | shots2Plus | 0 | N/D | N/D | N/D | null |
| engine-4.16.0:player-2 | Nessuna | shots3Plus | 0 | N/D | N/D | N/D | null |

Differenza negativa: errore inferiore con calibrazione. Intervalli ottenuti ricampionando gare intere; non eliminano tutta la dipendenza tra giocatori ripetuti.

engine-4.12.0:player-2: INSUFFICIENT_COMPLETE_MATCHDAYS_FOR_TEMPORAL_VERIFICATION.
engine-4.13.0:player-2: NO_CONSISTENT_IMPROVEMENT_SHOWN_DO_NOT_PROMOTE.
engine-4.16.0:player-2: INSUFFICIENT_COMPLETE_MATCHDAYS_FOR_TEMPORAL_VERIFICATION.

## Prova prospettica

Fixture congelate o preservate: 7. Fixture non ammesse: 2.

- cagliari-milan-2026-27-md-13: 20 giocatori, EXISTING_FIRST_PRESERVED.
- como-juventus-2026-27-md-13: 20 giocatori, EXISTING_FIRST_PRESERVED.
- inter-genoa-2026-27-md-13: 20 giocatori, EXISTING_FIRST_PRESERVED.
- lecce-atalanta-2026-27-md-13: 20 giocatori, EXISTING_FIRST_PRESERVED.
- roma-monza-2026-27-md-13: 20 giocatori, EXISTING_FIRST_PRESERVED.
- sassuolo-napoli-2026-27-md-13: 20 giocatori, EXISTING_FIRST_PRESERVED.
- udinese-fiorentina-2026-27-md-13: 20 giocatori, EXISTING_FIRST_PRESERVED.
- Esclusa frosinone-parma-2026-27-md-13: NOT_VERIFIABLY_FUTURE_AT_CAPTURE.
- Esclusa torino-lazio-2026-27-md-13: NOT_VERIFIABLY_FUTURE_AT_CAPTURE.

La 4.16 usa solo la giornata completa MD12 per la nuova ipotesi sperimentale: nessun trasferimento dei parametri 4.13. Nessuna approvazione statistica.

## Tiri in porta

Diagnostica per versione e fasce di probabilità in latest.json, senza calibrazione SOT o trasferimento della correzione dei tiri.

## Limiti e integrità

- Retrospective temporal replay after inspecting aggregate historical results; not an untouched confirmatory holdout.
- One shared logit shift across shots thresholds preserves ordering; player-match weight is one across targets.
- Versions never pooled. Historical fold thresholds are fixed; no hyperparameter search.
- Current 4.16 has too few complete matchdays for historical calibration verification.
- SOT is diagnostic only. DUO, odds, EV and operational engines are unchanged.
- New prospective forecasts are frozen once; no standing automation or automatic builder integration is installed.

Input verificati per hash prima e dopo. File prospettici immutabili in prospective/<fixture>/first.json; protocollo in protocol.json. Nessuna modifica al sito o ai pronostici pubblicati.
