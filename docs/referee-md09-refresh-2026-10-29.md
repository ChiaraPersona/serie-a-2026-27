# Statistiche arbitri MD9 — 29 ottobre 2026

Aggiornate le dieci Letture Serie A MD9 tramite la pipeline esistente. Ultime cinque gare e medie stagionali filtrate rigorosamente prima della data della fixture. Tutte le 514 fixture estranee del dataset arbitrale sono identiche a HEAD.

Acquisiti otto profili Calciotel e dieci profili OFStats con identità esatta; Sacchi e Feliciani non hanno URL Calciotel nel registro verificato. Nessuna associazione approssimativa. Dettagli: 136 archiviati su 140; quattro HTTP 404 nel manifest interno. Dati mancanti o discordanti restano null; campione disponibile parziale. Archivi e URL in data/raw/referee-stats/md09-history-2026-10-29/; database in data/normalized/referee-history/md09-2026-27.json.

Verifiche superate: test-reading-referee-history.mjs, test-referee-dashboard.mjs, check-referee-md08-refresh.cjs --matchday 9 (20 casi desktop/mobile, medie esatte, nessun overflow, provenienza pubblica o errore JS). Evidenze in reports/referee-md09-refresh/browser.json.

Build eseguito: build-site.js --reading-pages-only --presentation-only. Il build ha rigenerato anche le proiezioni condivise in data/generated/readings; mantenute dopo che la revisione automatica ha rifiutato il ripristino ampio per possibile lavoro concorrente. Nessun builder di previsioni o liquidazioni eseguito. Nessun commit, push o deploy.
