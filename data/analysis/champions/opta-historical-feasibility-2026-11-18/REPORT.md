# Passo 1: disponibilita dello storico Opta

Verifica del 18 novembre 2026. Nessun modello operativo modificato.

## Risultato

Esiste una via ufficiale per interrogare i ranking per data: feed TM14, parametro `rankDt`, autenticazione OAuth. La documentazione non equivale a disponibilita locale di un dataset autorizzato: nessun rating storico e stato acquisito in questa fase.

Il file Opta dell'archivio pubblico individuato su GitHub risulta caricato e aggiornato il 14 gennaio 2026. I metadati non permettono di utilizzarlo come prova di osservazioni raccolte nei mesi settembre-novembre 2026. Non abbiamo ispezionato il contenuto CSV e non affermiamo una data massima interna diversa dai metadati.

## Copertura richiesta e controlli eseguiti

- 72 fixture concluse; 144 rating squadra/data necessari, su 8 date conservative.
- 18 fixture dispongono delle Letture MD3 congelate prima del calcio d'inizio: integrita SHA-256 e cronologia controllate.
- 36 identita UEFA canoniche univoche; mapping degli ID Opta ancora da verificare con la fonte acquisita.
- 0 rating storici acquisiti; 0 fixture storiche complete per il candidato.
- Snapshot attuale del 18 novembre escluso da tutte le 72 partite precedenti.
- Se la fonte espone solo una data, richiesta la giornata anteriore al cutoff; l'ora di aggiornamento e le revisioni richiedono comunque verifica.

Date richieste: 7, 8, 9 settembre; 12, 13, 19 ottobre; 2, 3 novembre 2026. Il numero di date non coincide con le date delle gare perche il cutoff MD3 e la prima Lettura congelata e si usa il giorno precedente per il feed a sola data.

## Passaggi successivi e dipendenze

1. Acquisire export storico ufficiale oppure archivio datato verificabile; mantenere raw, hash, mapping ID e prova della disponibilita storica. Non inviare richieste a terzi o acquistare servizi automaticamente.
2. Preparare la calibrazione solo su un campione di rating e risultati antecedente al test. Le 72 gare gia viste restano esplorative; non scegliere i pesi per riprodurne gli esiti.
3. Generare Letture sperimentali attraverso il collegamento probabilita-esiti esistente, dopo aver calibrato il candidato. Nessun secondo bonus campionato.
4. Congelare baseline e candidato prima delle prossime gare; la prossima giornata del calendario interno inizia il 24 novembre. La sola raccolta di un ranking non costituisce una previsione completa o una calibrazione.

In assenza di un dataset storico verificato non si dichiara un confronto predittivo o una calibrazione completati. E possibile iniziare a raccogliere snapshot prospettici, ma non retrodatare l'acquisizione odierna.

## Evidenze

- [Documentazione ufficiale TM14](https://developers.statsperform.com/feed-tm14-season-power-rankings).
- [Repository dell'archivio pubblico](https://github.com/tonyelhabr/club-rankings).
- [Metadati release GitHub](https://api.github.com/repos/tonyelhabr/club-rankings/releases/tags/club-rankings), riepilogo locale `public-archive-metadata.json`.
- Ricerca dettagliata: `docs/reports/champions-opta-historical-source-research-2026-11-18.md`.
- Requisiti per fixture, cutoff, hash e gate: `protocol-and-requirements.json`.
- Riproduzione del controllo locale: `node scripts/research/champions-opta-historical-feasibility.cjs`. Scrive soltanto il protocollo in questa cartella; non acquisisce dati esterni e non genera pronostici.
