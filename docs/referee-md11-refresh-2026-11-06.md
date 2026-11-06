# Statistiche arbitri MD11 — 6 novembre 2026

Aggiornate le dieci schede arbitrali delle Letture MD11 tramite la pipeline descrittiva esistente. Acquisiti sette profili Calciotel e dieci OFStats, verificando l'identità esatta. Per Sacchi, Feliciani e Allegretta manca un URL Calciotel nel registro verificato; utilizzati gli altri riscontri disponibili senza associazioni approssimative.

Archiviate 151 schede di gara su 160 richieste; nove HTTP 404 conservati nel manifest interno. Database: 2.426 gare accettate e 61 record in quarantena. Copertura parziale, valori mancanti o discordanti null; nessuna certificazione di completezza stagionale o liquidazione bookmaker.

Archivio: `data/normalized/referee-history/md11-2026-27.json`. Evidenze: `data/raw/referee-stats/md11-history-2026-11-06/`. Proiezione: `data/generated/reading-referee-history.json`. Tutte le dieci schede mostrano cinque gare precedenti alla fixture e medie stagionali con denominatori effettivi. Fonti e URL rimangono interni.

Eseguiti refresh-matchday-history, build-referee-history-database con --include-current-season, acquisizione dettagli, ricostruzione database e build-reading-referee-history --matchday 11. Build sito con --readings-index-only --presentation-only --matchday 11 e SPATIAL_CAPTURE_DISABLED=1.

Superati test-referee-md11-refresh.cjs, test-reading-referee-history.mjs, test-referee-dashboard.mjs e 20 controlli desktop/mobile. Il controllo browser condiviso verifica le medie recenti nella tabella e quelle stagionali negli indicatori, secondo il layout attuale. Evidenze: `reports/referee-md11-refresh/browser.json`. Nessun overflow, errore JavaScript o provenienza pubblica. Verificata integrità delle schede estranee e, tramite hash, di calendario, pronostici e Schedina MD11. Nessun commit, push o deploy.
