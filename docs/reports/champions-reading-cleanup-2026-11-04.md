# Letture Champions — aggiornamento del 4 novembre 2026

## Presentazione condivisa

Rimosse dalle Letture Champions l'etichetta di copertura preliminare richiesta, la ripetizione 1/X/2, la nota estesa sui campioni, il dettaglio «Totali previsti · modello» e il paragrafo ripetuto sulle probabili. I badge ufficiale/probabile, i valori N/D e gli avvisi operativi individuali restano disponibili. Falli della squadra di casa allineati al colore degli altri indicatori di casa. Rimosso l'effetto hover dalla tabella arbitrale. Formule e pesi invariati.

Ripristinato il passaggio degli allenatori già documentati nell'archivio canonico alle formazioni mostrate, anche quando il record individuale non contiene il campo. I nomi restano collegati alla squadra; pulito il separatore testuale residuo nei nomi di alcuni profili.

## Probabili e panchine

Acquisite le nove pagine prepartita di oggi: 18 squadre, 198 titolari probabili e 192 panchinari probabili. Ordine tattico ricavato dall'indice esplicito nei dati strutturati, non dall'ordine della tabella testuale. Le panchine documentate sostituiscono il precedente completamento con l'intera rosa. I dati non vengono presentati come ufficiali.

Evidenze complete: `data/raw/champions-lineups/2026-11-04/manifest.json`, HTML delle singole partite e alias espliciti in `data/sources/lineups/champions-md04-preview-reviewed-aliases-20261104.json`. Corrispondenze esatte e alias verificati per squadra; nessun ID inventato. Cinque riserve restano prive di ID canonico: Alexiou, Kaloskamis, dos Santos, Júnior Almeida e Isayev. Nome/numero conservati, proiezioni individuali N/D.

Ricalcolate esclusivamente le nove fixture del 4 novembre mediante il builder MD4 esistente. Invariati i nove scenari delle gare concluse, verificati integralmente contro HEAD. Test contratti superato: 18 fixture, 272 selezioni pubblicate, 131 contratti DUO controllati, nessuna approvazione automatica. Quote, soglie e semantica provider verificate esattamente.

## Ultimo commit

Verificato `741424ae9` («champions league») sul build locale, con `scripts/check-champions-md04-results.cjs`, a 1440 e 390 px: Letture delle nove gare concluse accessibili; Successo e Guadagno visibili sull'archivio CL4; pannello di rendimento parziale assente nelle pagine Champions; liquidazioni già presenti coerenti (61 vinte, 75 perse). Nessuna nuova liquidazione.

## Verifiche

Superati `scripts/test-champions-md04.cjs` e `scripts/test-champions-shared-scenarios.cjs`. Il secondo usa esplicitamente lo stato prepartita del calendario al cutoff congelato, evitando di mescolare il test storico con lo stato concluso attuale.

`scripts/check-champions-md04-referees-browser.cjs`: 36 controlli sulle 18 Letture, desktop/mobile, inclusi testi rimossi, colore identico dei falli, due allenatori disponibili, blocco storico spostato, hover assente, fonti interne, assenza di overflow/errori JavaScript. Evidenze in `output/champions-md04-referee-statistics/verification.json`.

Build limitato alle pagine Champions/Schedina: `node scripts/build-site.js --presentation-only --champions-pages-only --matchday 4`. Nessun commit, push o deploy.

Superato anche `scripts/check-champions-md04-browser.cjs`: 44 stati desktop/mobile, 18 fixture, persistenza DUO, sincronizzazione Lettura/Schedina e regressione MD3. Il test di selezione usa partite ancora programmate, perché le gare concluse non sono più selezionabili. Evidenze in `output/champions-md04/reading-clean-20261104/`.
