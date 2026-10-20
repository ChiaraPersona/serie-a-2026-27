# Validazione Champions: sei punti

Generato: 2026-10-20T14:38:29.705Z. MyCombo escluso.

## Censimento

- 1469 risultati europei storici, 503 Champions: utilizzabili per esiti, non per inventare tiri o minuti.
- 189 gare Champions 2025/26 con statistiche locali; 189 complete per tiri/SOT/corner. Sono actual utilizzabili come riferimento storico; non sono probabilità MD3 prepartita.
- 36 fixture correnti concluse; actual di squadra: {"shots":36,"sot":36,"corners":34}.
- Replay comparativo del motore condiviso MD7: 94 gare training e 95 test, con input di data strettamente precedente. È diagnostico: versione diversa dal modello MD3 e ricevute storiche di disponibilità mancanti.
- 62 righe individuali con ID esatti; 30 osservazioni nel precedente audit rigoroso. I casi in conflitto sono quarantinati.
- Snapshot storici: [{"path":"data/normalized/champions-pilot-predictions-2026-27.json","versions":14,"fixtures":18,"prematchFixtures":18,"originalResultEventProbabilities":90,"scope":"LEGACY_MODEL_ONLY_NOT_MD3_VALIDATION","proof":"GIT_COMMITTER_TIMESTAMP_AND_SERIALIZED_GENERATION_TIME"},{"path":"data/normalized/champions-pilot-predictions-md02-2026-27.json","versions":1,"fixtures":18,"prematchFixtures":18,"originalResultEventProbabilities":90,"scope":"LEGACY_MODEL_ONLY_NOT_MD3_VALIDATION","proof":"GIT_COMMITTER_TIMESTAMP_AND_SERIALIZED_GENERATION_TIME"},{"path":"data/normalized/champions-player-markets-md01-2026-27.json","versions":11,"fixtures":18,"prematchFixtures":18,"originalResultEventProbabilities":0,"scope":"LEGACY_MODEL_ONLY_NOT_MD3_VALIDATION","proof":"GIT_COMMITTER_TIMESTAMP_AND_SERIALIZED_GENERATION_TIME"}]. Le metriche legacy sono descrittive e separate per modello; non validano il modello MD3.

## Protocollo operativo

1. Mercati separati per modello, metrica, soglia, scope, periodo e semantica del contratto.
2. Snapshot prima del kickoff, con hash dei file di input e della versione del modello; nessun replay retroattivo con gli input aggiornati di oggi.
3. Esiti confrontati per fixture/team/player ID; non titolari esclusi quando la probabilità è condizionata alla partenza; nessun DUO liquidato con i soli tiri del singolo.
4. Brier, log-loss, ECE, bias e MAE; stessi criteri numerici MD7 esportati dal modulo condiviso. Il campione conta fixture indipendenti, non le soglie duplicate.
5. Probabilità prudenziale e EV conservativo calcolati solo dopo PASS, con la deduzione MD7 invariata; nessuna probabilità ricostruita da una stima puntuale.
6. Registro dinamico di validazione per modello/evento, letto dalla pubblicazione. Cambio di versione, dati insufficienti o esiti successivi al kickoff impediscono l'approvazione.

## Stato attuale

Snapshot prospettici disponibili: 18. Osservazioni di test ammissibili: 0. Eventi in attesa di esito/dati: 1427. Approvazioni: 0.

Nessun nuovo coefficiente o calibratore è stato fittato: il modello è congelato. I campioni legacy appartengono a versioni differenti e restano diagnostici. Il backtest Elo non certifica il correttore motivazionale o la conversione Poisson; il test sui volumi domestici non certifica il modello MD3. Le probabilità storiche non serializzate restano N/D.

Gli snapshot sono acquisizioni locali a tempo di esecuzione, protette contro sovrascrittura e alterazioni rilevabili con hash; non sono attestazioni temporali di un'autorità esterna. Nessun commit eseguito.

Per aggiornare esiti e controlli: node scripts/build-champions-event-validation.cjs. Per un nuovo snapshot prima delle gare: aggiungere --capture-current.
