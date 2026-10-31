# Fiorentina–Atalanta: completamento referto

Il 31 ottobre 2026 il report StatMuse espone il payload completo precedentemente assente. Integrati risultato 2–2 (intervallo 0–1), 30 partecipanti, statistiche individuali e di squadra, quattro marcatori con assist, cinque ammonizioni, otto sostituzioni e panchine. Identità risolte tramite registro canonico o corrispondenza esatta con la rosa; undici confrontati con le formazioni ufficiali già registrate. Tiri, tiri in porta, falli e pali/traverse individuali riconciliati con i totali squadra. Spettatori e MVP restano null: non disponibili come dati verificati.

Fonte interna: https://www.statmuse.com/fc/match/10-29-2026-fio-vs-ata-112157

Eseguiti import calendario, aggregazione squadre/giocatori, policy titolari (zero ulteriori rimozioni) e build presentazione MD9 con acquisizione prospettica disabilitata. Nessun ricalcolo retroattivo dei pronostici; hash di letture, pronostici, schedina MD9, catalogo, indice quote e formazioni ufficiali invariati. Fixture e dati delle altre squadre confrontati integralmente con la baseline. Statistiche osservate distinte dalla liquidazione certificata del bookmaker.

Importatore: `scripts/complete-fiorentina-atalanta-2026-10-31.cjs`. Verifica: `scripts/test-fiorentina-atalanta-complete.cjs`. Baseline, referto compresso e report: `output/fiorentina-atalanta-complete-2026-10-31/`. Il precedente test di chiusura MD9 del 29 ottobre descrive la vecchia copertura parziale ed è superato, per questa fixture, dal nuovo test.

Test policy titolari/MyCombo, contratto BetSelection, persistenza schedina personale e proiezioni Lettura per 380 fixture superati. Build completato. Nessun commit, push o deploy.

Controlli browser superati a 1440 e 390 px: risultati e stato conclusa corretti, selezioni della partita disabilitate, Home e Schedina senza overflow o errori JavaScript. Durante le verifiche finali è intervenuto lavoro concorrente sulla MD10: `predictions.json` è cambiato dopo il controllo hash riuscito dell'importatore, anche nei metadati e nelle combinazioni della fixture conclusa. Queste modifiche non sono state ripristinate; il nuovo test segnala separatamente la deriva successiva all'importazione.
