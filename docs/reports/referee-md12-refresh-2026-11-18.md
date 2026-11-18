# Aggiornamento arbitrale MD12 — 18 novembre 2026

Aggiornate soltanto le dieci designazioni della dodicesima giornata Serie A e le rispettive sezioni delle Letture. Fonte ufficiale: https://www.aia-figc.it/news/serie-a-enilive-designazioni-12a-giornata-28854/ (18 novembre 2026), corrispondente al link legacy ID28854 fornito dall'utente. Sestine complete nella fonte canonica `data/sources/referee-assignments-2026-27.json`; copia HTML interna in `data/raw/referee-stats/md12-history-2026-11-18/aia-designations.html.gz`. Ricerca e identità documentate in `docs/reports/serie-a-md12-referee-research-2026-11-18.md`.

Acquisiti tutti i dieci profili Calciotel con identità esatta e nove profili OFStats; il profilo OFStats di Arena restituisce HTTP404. Recuperati 100 tabellini su 113 richiesti. Errori, URL, data di recupero e hash rimangono nei manifest interni. Nessuna associazione per nomi approssimativi.

Archivio risultante `data/normalized/referee-history/md12-2026-27.json`: 2.843 gare accettate e 83 record in quarantena. Copertura parziale: non equivale a certificazione stagionale completa. Tutte le dieci schede hanno cinque gare precedenti alla fixture, medie recenti e stagionali con denominatori effettivi. Dati mancanti/discordanti restano null e sono presentati come trattino/N/D. Gialli ordinari e seconde ammonizioni sono distinti; nessuna liquidazione bookmaker viene inferita.

Eseguita la pipeline esistente: import-official-calendar --referee-matchday 12; refresh-matchday-history; build-referee-history-database con --include-current-season; fetch-md07-match-details con --matchday 12; ricostruzione database; build-reading-referee-history --matchday 12; build-site --presentation-only --readings-index-only --matchday 12 con SPATIAL_CAPTURE_DISABLED=1.

Verifiche superate:

- Identità e sestine conformi al blocco canonico AIA; calendario, risultati e fixture estranee identici alla copia precedente salvo sola designazione MD12.
- Cinque righe cronologiche, cutoff, medie ricalcolate con analisi esistente, quarantena esclusa e metriche discordanti null.
- Proiezioni arbitrali delle fixture estranee preservate integralmente. Hash invariati di predictions.json e tutti i dataset schedina*.json presenti prima dell'aggiornamento.
- test-reading-referee-history.mjs e test-referee-dashboard.mjs.
- test-reading-browser-data.mjs eseguito limitando il ciclo alle dieci fixture MD12: risultati, pronostici, contratti pubblicati e cataloghi salvati coerenti con i canonici.
- check-referee-md08-refresh.cjs --matchday 12: 20 controlli a 1440px e 390px; date, medie recenti/stagionali, assenza di provenienza pubblica, link, overflow ed errori JavaScript. Evidenze: `reports/referee-md12-refresh/browser.json` e immagini Napoli–Torino.

Il test globale test-reading-browser-data.mjs fallisce su `contract changed fiorentina-como-2026-27-md-07`, fixture estranea non rigenerata da questo aggiornamento. Dettagli in `output/referee-md12-refresh/global-browser-data-test.log`. Nessuna modifica ai contratti della settima giornata per aggirare il controllo.

Fonti, provider e URL rimangono interni. Nessuna modifica a formule, pesi, criteri di approvazione, previsioni o quote. Le modifiche Champions preesistenti sono state preservate. Nessun commit, push o deploy.
