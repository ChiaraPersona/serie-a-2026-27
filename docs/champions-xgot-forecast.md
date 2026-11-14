# Previsione xGOT Champions

Stima di squadra sperimentale, richiesta il 14 novembre 2026. Non validata e
separata da valori osservati, probabilità degli esiti e selezioni operative.

Il builder degli scenari moltiplica i SOT centrali del motore esistente per la
qualità xGOT/SOT attesa. La qualità riusa `featureFactors(..., 'quality')`:
rapporti offensivi e concessi dall'avversario normalizzati per competizione,
regressione con esposizione a priori di 30 SOT, media geometrica, almeno sei
gare per squadra, ultime venti presenze entro 550 giorni. Il rapporto risultante
è riportato alla media xGOT/SOT Champions disponibile prima della previsione
e limitato a [0, 1]. Non è una nuova validazione della variante di ricerca.

Solo dati antecedenti alla gara e acquisiti entro la generazione. Nessuna
imputazione: senza identità canoniche, campione o SOT previsti, xGOT previsto
resta null/N/D. Nessuna previsione individuale o DUO viene dedotta.

Output: `xgotForecast` in `data/generated/champions-shared-scenarios.json`.
La Lettura espone «xGOT previsto · sperimentale» separato da «xGOT osservato / gara».
Il builder conserva le righe concluse. Formula, pesi, quote e criteri dei mercati
esistenti restano invariati.

Verifica: `node scripts/test-champions-xgot-forecast.cjs` e suite scenari condivisi.
