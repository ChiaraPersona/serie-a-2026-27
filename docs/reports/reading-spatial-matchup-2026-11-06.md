# Aggiornamento delle zone di conclusione — 6 novembre 2026

La sezione «Dove si incontrano attacco e difesa» è stata aggiornata con i due referti mancanti della giornata 9 e i dieci della giornata 10, riutilizzando gli snapshot locali completi. ID del referto e data sono stati confrontati con il calendario canonico; hash e percorsi sono conservati nel manifest interno. Per Fiorentina–Atalanta è stato utilizzato il referto completo del 31 ottobre, poiché il precedente snapshot non contiene lo stato della gara.

- Copertura: 100/100 gare concluse, 97 utilizzabili; rimangono escluse Cagliari–Inter MD2, Como–Parma MD4 e Sassuolo–Juventus MD4 per discordanza dei totali.
- 2.893 tentativi senza autogol, 318 gol, 311 gol riconciliati; sette gol non utilizzabili conservati nell'archivio tecnico. Il nuovo caso è un'identità non risolta in Frosinone–Lecce MD9.
- Nove registrazioni escluse: otto parate attribuite al portiere e un duplicato vuoto.
- Contesto tecnico: 200 osservazioni su 100 gare; 199 con allenatore identificato e 199 con undici completi.
- Rigenerati indice e 380 dettagli Lettura con il build di presentazione, disabilitando le acquisizioni prospettiche.

Formule, criteri, quote e selezioni non modificati. Ogni confronto conserva il cutoff strettamente anteriore alla data della fixture; nessuna gara utilizza il proprio risultato. Nessun aggiornamento delle formazioni ufficiali. Fonti e metadati restano interni. Nessun commit, push o deploy.

Il test `scripts/test-reading-spatial-matchup.cjs` supera i 380 controlli di cutoff e coerenza delle proiezioni, riconciliazione, rigori, autogol, coordinate e quarantena. I conteggi attesi sono aggiornati al nuovo archivio; l'asserzione sul markup segue la presentazione corrente senza il riquadro dei limiti precedentemente rimosso.

La verifica browser comprende anche Cagliari–Frosinone MD11, oltre alle regressioni storiche e Champions, a 1440, 390 e 320 pixel. Evidenze: `output/reading-spatial-2026-11-06/browser-check.json` e schermate nella stessa directory.
