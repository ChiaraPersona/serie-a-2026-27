# Chiusura nona giornata — 29 ottobre 2026

Frosinone–Lecce 5–1 e Fiorentina–Atalanta 2–2 registrate come concluse: dieci risultati su dieci. Calendario, aggregati squadre/giocatori e payload del sito rigenerati. Nessun commit, push o deploy.

Frosinone–Lecce: referto StatMuse completo, undici confrontati con il registro ufficiale, statistiche individuali riconciliate con i totali squadra per tiri, tiri in porta, falli e pali/traverse. Corretto il cambio nel riscaldamento Geubbels → Paco Esteban, usando ID canonici già presenti nel registro identità. Nessuna nuova selezione retroattiva; policy titolari rieseguita, nessuna ulteriore selezione rimossa.

Fiorentina–Atalanta: risultato 2–2 disponibile nel titolo del report StatMuse; la pagina non espone ancora il payload GameState. Stato conclusa confermato dall'utente. Statistiche finali, cronologia marcatori, cartellini e sostituzioni restano non disponibili, senza zeri presunti. Sky riportava il medesimo punteggio e una cronologia ancora live; non è stata usata per certificare statistiche finali. Le formazioni ufficiali già registrate sono conservate.

Verifiche: confronto integrale delle fixture estranee e degli aggregati delle altre squadre con baseline; hash invariati di pronostici, letture, schedina, catalogo e quote. Test policy titolari, BetSelection, schedina personale e proiezioni di entrambe le Letture superati. Build presentazione completato con scrittura HTML atomica per aggirare errori intermittenti Windows in apertura dei file esistenti. Acquisizione prospettica disabilitata durante il build. Esiti statistici distinti da liquidazioni bookmaker certificate; nessuna modifica a formule, pesi o contratti DUO.

Fonti interne:
- https://www.statmuse.com/fc/match/10-29-2026-fro-vs-lec-112165
- https://www.statmuse.com/fc/match/10-29-2026-fio-vs-ata-112157
- https://www.calciolecce.it/2026/10/29/si-fa-male-geubbels-nel-riscaldamento-gioca-esteban/
- https://www.ansa.it/sito/notizie/sport/calcio/2026/10/29/serie-a-frosinone-lecce-5-1_44c0974e-1c00-4c24-9832-d87b69095f8e.html
- https://sport.sky.it/calcio/serie-a/partite/2026/giornata-9/fiorentina-atalanta

Baseline, HTML compressi, integrità e screenshot: `output/md09-last-two-2026-10-29/`. Importatore: `scripts/update-results-md09-last-two-2026-10-29.cjs` (esecuzione singola, baseline protetta). Test: `scripts/test-results-md09-last-two-2026-10-29.cjs`; verifica browser: `scripts/check-results-md09-last-two-2026-10-29.cjs`.

Controlli browser superati a 1440 e 390 px: risultati corretti nelle due Letture, stato PARTITA CONCLUSA, selezioni disabilitate, Home e Schedina senza overflow o errori JavaScript. Screenshot mobile della Home verificato visivamente.
