# Statistiche arbitri MD10 — 31 ottobre 2026

Aggiornate le dieci schede arbitrali delle Letture MD10, inclusa Maria Sole Ferrieri Caputi. Acquisiti dieci profili Calciotel e dieci OFStats con verifica esatta dell'identita. Archiviati 109 dettagli su 119; dieci HTTP 404 conservati nel manifest interno. Copertura parziale, metriche mancanti o discordanti null, incontri in quarantena esclusi. Ultime cinque gare e medie stagionali filtrate prima della data della fixture.

Archivio: data/normalized/referee-history/md10-2026-27.json. Evidenze originali e manifest: data/raw/referee-stats/md10-history-2026-10-31/. Proiezione: data/generated/reading-referee-history.json. Conservate integralmente tutte le 514 altre schede arbitrali.

Eseguiti refresh-matchday-history, build-referee-history-database con --include-current-season, acquisizione dettagli, ricostruzione database e build-reading-referee-history --matchday 10. Build: SPATIAL_CAPTURE_DISABLED=1 node scripts/build-site.js --readings-index-only --presentation-only --matchday 10. Nessun ricalcolo dei pronostici o liquidazioni.

Superati test-reading-referee-history.mjs, test-referee-dashboard.mjs, verifica dedicata MD10 di identita/cutoff/medie/quarantena e 20 controlli browser desktop/mobile con check-referee-md08-refresh.cjs --matchday 10. Evidenze: reports/referee-md10-refresh/browser.json. Nessun overflow, errore JavaScript o provenienza pubblica. Modifiche preesistenti e concorrenti preservate. Nessun commit, push o deploy.
