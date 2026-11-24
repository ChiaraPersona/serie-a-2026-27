# Serie A MD12 — completamento 24 novembre 2026

Integrati i sei referti mancanti: Juventus–Venezia 4–0 (112187), Milan–Frosinone 5–1 (112190), Atalanta–Inter 4–4 (112192), Bologna–Udinese 1–1 (112193), Sassuolo–Genoa 0–2 (112194), Monza–Fiorentina 3–0 (112196).

Referti verificati e archiviati in data/raw/results/serie-a/2026-11-24/. URL originali e metadati sono conservati nei risultati canonici. Tutte le 10 fixture del turno risultano finished. Aggiornati calendario, statistiche squadre e giocatori, classifiche e proiezioni del sito. Nessun ricalcolo retroattivo delle previsioni e nessuna nuova selezione.

Controlli superati: riconciliazione marcatori/autogol, 11 titolari per squadra, somme individuali/squadra di tiri, tiri in porta, falli e legni; incremento classifica di 12 presenze squadra e 16 punti; hash invariati delle previsioni, cataloghi, quote e fonte ufficiale prepartita; fixture estranee identiche. Passano test-page-browser-data.cjs e test-schedina-loading.mjs. Build sito e filtro titolari completati. Browser Edge a 1440 e 390 px: risultati corretti nelle sei Letture, selezioni disattivate, Home/Schedina senza overflow o errori JavaScript.

Discrepanza interna: il referto Atalanta–Inter riporta Marco Sportiello titolare, il registro prepartita Marco Carnesecchi. I dati osservati sono conservati separatamente dal registro e dalle selezioni originarie; dettagli in output/md12-complete-2026-11-24/import-report.json. Nessuna identità irrisolta.

Limiti dei test generali: test-reading-result-availability.mjs cerca la proiezione rimossa di Atalanta–Venezia MD6; test-reading-browser-data.mjs assume che l'indice conservi tutte le fixture storiche, mentre il builder applica la policy di archivio. Entrambi falliscono su aspettative non allineate alla policy attuale; il controllo browser specifico del turno passa. Non rappresentano liquidazioni provider certificate: gli esiti sono verifiche statistiche dai referti.

Nessun commit, push o deploy. Modifiche preesistenti preservate.
