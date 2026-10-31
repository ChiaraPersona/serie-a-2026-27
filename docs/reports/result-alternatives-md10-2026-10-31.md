# Confronto vittoria / doppia chance, MD10

Richiesta: consentire 1X/X2 senza forzarli e senza preferire automaticamente la vittoria semplice. La regola precedente ordinava la forma 1X2 prima della doppia chance per la stessa tesi sportiva, indipendentemente dal prezzo.

La nuova opzione `verified-price-prudent-probability` confronta esclusivamente alternative già ammesse per la stessa tesi usando il valore prudente già calcolato (probabilità prudente e quota verificata), quindi la probabilità prudente a parità di valore. Non modifica modelli, formule, probabilità, quote o filtri di ammissione. Il valore può essere negativo: il confronto non aggiunge una nuova approvazione basata su EV positivo. L'ordinamento generale resta invariato. Le costruzioni Serie A dalla MD10 usano la nuova opzione; i comportamenti storici restano disponibili con `legacy`.

Aggiornamento del catalogo esistente soltanto per fixture MD10 ancora `scheduled`: Roma e Inter passano a X2; Como, Lazio e Atalanta a 1X. Bologna conserva 1X; Frosinone, Genoa, Juventus e Sassuolo conservano la vittoria. Il confronto non aggiunge entrambe le forme della stessa tesi. Nessun cambio ai contratti non relativi agli esiti o agli archivi conclusi.

Sincronizzati cataloghi Lettura/Schedina e proiezioni MD10. Controllati gli ID dei nuovi contratti contro lo snapshot normalizzato Sisal, la quota e il nome mercato, i filtri esistenti e le relazioni con gli altri pronostici. Il confronto con HEAD conferma l'integrità di tutti i campi dei contratti e delle valutazioni: cambiano solo le annotazioni di selezione degli esiti e i relativi riepiloghi.

Verifiche superate: `test-result-alternatives.cjs` (1X, X2, vittoria semplice, mancata verifica quota e compatibilità della policy storica), `test-schedina-md10.mjs` (223 contratti pubblicati con quota, sincronizzazione e salvataggi), `check-schedina-md10.cjs` (desktop/mobile, tutte le fixture, Lettura e persistenza). Il test generale storico `test-md06-suggested-forecasts.js` si ferma sul mercato MD6 di Franco Mastantuono assente dallo snapshot attuale, prima delle verifiche della nuova policy. Nessuna alterazione della baseline storica per farlo passare.

Evidenze interne: `reports/result-alternatives/md10.json`, `reports/md10-schedina/data-audit.json`, `reports/md10-schedina/browser-audit.json`. Nessun commit, push o deploy.
