# Applicazione del rating europeo all'esito Champions

Richiesta utente del 4 novembre: «preferisco di gran lunga questo modello e ti chiedo di applicarlo». Applicazione locale completata alle fixture future MD4, senza commit, push o deploy.

## Comportamento

L'1X2 e le doppie chance usano lo stesso Elo semplice selezionato dal confronto di 27 configurazioni, aggiornato con lo storico europeo e le 63 gare Champions correnti concluse. Non sono aggiunti nuovi coefficienti di forma domestica o formazione. La configurazione canonica e l'autorizzazione sono in `data/sources/champions-european-result-policy.json`.

Sette fixture hanno una proposta di esito preliminare con contratto provider già verificato. AEK–Real passa a 26,489746% / 17,733565% / 55,776689%, con proposta Real vincente. Nei casi meno netti la scelta usa la protezione in doppia chance già disponibile; quote e identità dei contratti rimangono immutate. Non viene proposta la X secca e la quota minima rimane 1,08 inclusiva.

Lens–Como e Viking–Sabah hanno 1X2 e doppie chance N/D per storico europeo insufficiente. La distribuzione non viene inventata usando un campionato diverso o una squadra dal nome simile.

Le proposte restano PRELIMINARY e `qualifiedSelection=false`; autorizzazione di pubblicazione e approvazione statistica sono campi distinti. La probabilità prudenziale e l'EV non vengono fabbricati. Le proiezioni DUO conservano probabilità, quota equa ed EV N/D.

Gol attesi, tiri, SOT, corner, disciplina, proiezioni individuali, XI e relativi mercati rimangono quelli esistenti. I risultati esatti del vecchio modello non sono esposti come se derivassero dal nuovo rating. Il pannello Scenario chiarisce che gol e volumi sono stime separate dall'esito europeo. Confidenza e sorpresa del vecchio modello non sono attribuite al nuovo esito.

## Integrazione e conservazione

- `scripts/champions/european-result-policy.cjs` calcola il rating con cutoff rigoroso, risolve ID e applica la distribuzione a Scenario e contratti 1X2/doppia chance.
- Il builder MD4 e il refresh delle policy richiamano l'adattatore dopo i filtri generali; l'autorizzazione preliminare non viene annullata da un successivo filtro destinato ai modelli non autorizzati. Il builder standalone dello Scenario adotta il rating per le gare future dalla MD4.
- `scripts/apply-champions-european-results.cjs` aggiorna soltanto gli artefatti già esistenti senza ricalcolare gli altri mercati. Verifica identità/quote/modificatori, conservazione degli altri mercati, delle proiezioni e di tutte le fixture estranee.
- Stato precedente delle nove fixture e mercati di risultato archiviati in `data/technical-archive/champions-european-results/2026-11-04T16-42-09-550Z.json`. Le nove gare del 3 novembre restano integralmente identiche, comprese le vecchie previsioni.
- Le acquisizioni prospettiche registrano il nuovo model ID e gli hash di configurazione e implementazione. Le prime previsioni del precedente modello restano immutabili; le nuove sono revisioni o nuovi eventi di modello distinti, senza sommare revisioni come fixture indipendenti.
- MyCombo non riceve una probabilità congiunta. Una selezione personale AEK vincente già salvata conserva contratto e quota, viene aggiornata al 26,49% del nuovo modello e non viene sostituita automaticamente con Real. Non è più una proposta del modello.
- Sono aggiornate le versioni degli asset per evitare la visualizzazione di vecchi pannelli dalla cache.

## Verifiche

- Test integrazione europeo: sette contratti preliminari, due N/D, idempotenza, conservazione dei dati, autorizzazione distinta dal PASS, riconciliazione della selezione personale precedente.
- Test MD4: 18 fixture, 271 suggerimenti complessivi, 131 contratti DUO riconciliati e nessuna approvazione statistica inventata.
- Test gol: 232 probabilità e 100 coppie complementari concordano con la matrice Poisson invariata.
- Test Scenario: 20 previsioni Serie A identiche e controlli cutoff/N-D/gare concluse/indipendenza dalle quote.
- Test validazione eventi, filtro risultati e acquisizioni prospettiche: passano.
- Build di sola presentazione Champions MD4: passa.
- Controllo browser completo: 44 stati desktop/mobile, 18 fixture, sincronizzazione Lettura/Schedina, persistenza dei contratti e regressione MD3. Le probabilità del pannello europeo coincidono con il catalogo e non ricompare il vecchio risultato esatto.

Evidenze: `output/champions-european-results/application.json` e `output/champions-european-results/browser/`. Nessuna nuova formazione ufficiale acquisita: il filtro titolari non è stato rieseguito per questa sola sostituzione del modello di esito.
