# Recupero copertura squadra Champions — 2 novembre 2026

Ambito: le 18 squadre delle nove gare di martedì 3 novembre, con probabili canoniche già presenti. Ricerca delle gare dal 17 ottobre al 2 novembre; recupero anche della stagione corrente per Shakhtar, Slovan e LASK, che avevano riferimenti insufficienti o fermi a date precedenti. Nessun pronostico o contratto pubblico ricalcolato in questo aggiornamento.

## Risultato

Tutte le 18 squadre hanno ora osservazioni di campionato utilizzabili per gol, tiri, tiri in porta e corner fino al 30 o 31 ottobre. Le altre gare ufficiali recenti sono conservate nell'archivio integrativo, separate per competizione e periodo.

| Squadra con lacuna principale | Riferimento precedente | Riferimento disponibile ora |
|---|---|---|
| Shakhtar Donetsk | 12 gare europee della stagione precedente, ultima 7 maggio | 11 gare del campionato nazionale 2026/27, ultima 30 ottobre |
| Slovan Bratislava | 6 gare europee storiche, ultima 18 dicembre 2025 | 13 gare del campionato nazionale 2026/27, ultima 31 ottobre |
| LASK | Ultima gara utilizzabile 1 settembre | 11 gare della stagione corrente; 43 osservazioni complessive utilizzabili, ultima 31 ottobre |

Il confronto Shakhtar/Slovan cambia la competizione di riferimento: non rappresenta l'eliminazione dei vecchi dati europei, che sono integralmente conservati. Complessivamente sono stati aggiunti 64 record di referto al dataset canonico: 34 ESPN e 30 FotMob. I record non equivalgono necessariamente a nuove partite distinte: sei integrazioni del LASK affiancano precedenti referti parziali. I vecchi ID evento sono tutti presenti.

Sono stati verificati 115 referti integrativi su 118 individuati dai calendari. Tre referti con supplementari o rigori non sono ammessi come statistiche dei 90 minuti: Celje–Slovan del 26 agosto, LASK–Celtic del 25 agosto, LASK–Ried del 28 ottobre. Le acquisizioni originali sono conservate.

## Identità e valori mancanti

L'importatore esistente `scripts/import-champions-pilot-stats.js` ha aggiornato la sola stagione 2026/27 delle 18 squadre con cutoff 2 novembre. Il recupero integrativo è in `scripts/refresh-champions-team-coverage-20261102.cjs`. Calendari e referti sono verificati con ID provider esatti, data, squadre, stato finale e periodo. Nessuna associazione approssimativa delle identità.

I provider mantengono namespace distinti: gli ID squadra FotMob non vengono riscritti come ID ESPN. I relativi collegamenti espliciti sono in `teams[].statisticsProviderIds` del dataset canonico. L'adattatore `scripts/champions/shared-scenario.cjs` legge il namespace della singola osservazione. I dati nazionali di Shakhtar e Slovan sostituiscono il vecchio fallback europeo come input corrente, senza cambiare formule o pesi.

Alcuni referti ucraini hanno tiri, SOT e corner verificati ma mancano di falli e ammonizioni. Restano `partial`, con i valori mancanti `null`. L'adattatore ammette le metriche presenti e segnala la copertura disciplinare parziale; non inventa zeri o una copertura completa.

## Evidenze e controlli

- Dataset canonico: `data/sources/champions-pilot-match-stats-2025-27.json`.
- Referti integrativi e calendario atteso: `data/sources/champions-team-coverage-refresh-2026-11-02.json`.
- Raw compressi integrativi: `data/raw/champions-team-coverage/2026-11-02/`.
- Copia precedente, confronto per squadra e report: `output/champions-coverage-2026-11-02/`.
- Verifica: `node scripts/test-champions-coverage-20261102.cjs`.
- Regressione: `node scripts/test-champions-shared-scenarios.cjs`.

Il controllo degli input genera in memoria nove scenari con tiri/SOT/corner disponibili per entrambe le squadre, senza pubblicarli. Verifica anche cronologia, minimi per sede, identità, valori mancanti, conservazione dei vecchi ID e hash invariati di quote e pronostici pubblicati. La regressione conferma 20 previsioni complete Serie A identiche e controlli di cutoff, N/D e indipendenza dalle quote. La copertura recuperata non certifica automaticamente calibrazione, probabilità di soglia o EV dei mercati Champions.

Non è stato eseguito alcun commit, push o deploy.
