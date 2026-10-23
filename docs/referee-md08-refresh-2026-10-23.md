# Aggiornamento arbitri Serie A, giornata 8

Aggiornamento interno del 23 ottobre 2026. Ambito: le dieci fixture MD8, dal 23 al 25 ottobre; nessun cambiamento a previsioni, quote, contratti o liquidazioni.

Archivio: `data/normalized/referee-history/md08-2026-27.json`. Contiene 2.449 gare accettate e 79 record in quarantena per conflitti di data/identità/stagione. La copertura disponibile resta parziale, non certificata completa. Ogni lettura ha cinque gare precedenti e medie recenti/stagionali con denominatori distinti per metrica. I falli mancanti e i valori discordanti restano null. Le espulsioni positive non determinano da sole la separazione rosso diretto/doppio giallo. Rigori non ricavati dai tentativi.

Sono stati acquisiti dieci profili completi Calciotel, nove profili OFStats con identità esatta verificata (Arena: 404), 94 dettagli gara su 106 richiesti. I dodici dettagli non recuperati sono elencati nel manifest; non sono sostituiti con stime. Sono riutilizzate le statistiche delle gare concluse nel calendario canonico corrente, con riferimento al report originario e senza trasformarle in certificazioni di liquidazione.

Provenienza, URL, hash, osservazioni concorrenti ed errori restano in `data/raw/referee-stats/md08-history-2026-10-23/` e nell'archivio normalizzato. Nessun nuovo riferimento pubblico ai provider.

Rigenerazione, dalla radice del repository:

```text
node scripts/referee-stats/refresh-matchday-history.cjs --matchday 8 --as-of 2026-10-23
node scripts/build-referee-history-database.cjs --matchday 8 --as-of 2026-10-23 --manifest data/raw/referee-stats/md08-history-2026-10-23/manifest.json --include-current-season
node scripts/referee-stats/fetch-md07-match-details.cjs --matchday 8 --as-of 2026-10-23
node scripts/build-referee-history-database.cjs --matchday 8 --as-of 2026-10-23 --manifest data/raw/referee-stats/md08-history-2026-10-23/manifest.json --include-current-season
node scripts/build-reading-referee-history.js --matchday 8
node scripts/build-site.js --reading-pages-only --presentation-only
```

Verifiche superate: `test-referee-md08-refresh.cjs` (inclusa uguaglianza di tutte le fixture estranee rispetto a HEAD), `test-reading-referee-history.mjs`, `test-referee-dashboard.mjs`, `check-referee-md08-refresh.cjs` (20 casi: dieci fixture × 1440/390 px, medie esatte, cinque righe, nessun overflow, link di provenienza o errore JavaScript). Report e screenshot in `reports/referee-md08-refresh/`. L'avvio Edge nella sandbox non era disponibile; il controllo ha superato la verifica con esecuzione autorizzata fuori sandbox.
