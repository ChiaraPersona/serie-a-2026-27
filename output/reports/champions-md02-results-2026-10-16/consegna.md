# Risultati sportivi Champions MD2 — completamento 16 ottobre 2026

Copertura conclusiva: **18/18 fixture MD2**, ID canonici univoci, 78 gol. La prima giornata e tutte le fixture estranee alle nove integrazioni sono invariate. Terza giornata ancora predefinita; seconda giornata archiviata e ora effettivamente conclusa nel calendario.

## Recupero e fonti

I nove punteggi erano già presenti come risultati sportivi in `output/reports/champions-post-match-audit-2026-10-15.json` e nell'archivio derivato `data/normalized/champions-md02-audit-display.json`, entrambi lasciati intatti. Prima di applicarli sono stati riconfermati tramite il [registro ufficiale UEFA delle 18 gare](https://www.uefa.com/uefachampionsleague/news/02a8-2174c9e9019d-f909a77bd77a-1000--2026-27-champions-league-all-the-league-phase-fixtures-a/) e il [riepilogo ufficiale del 14 ottobre](https://www.uefa.com/uefachampionsleague/news/02aa-21d3f8c574f1-e140f41454d4-1000--champions-league-round-up-real-madrid-and-paris-headline-r/). Squadre, data e punteggi concordano. Non sono stati dedotti dagli esiti delle scommesse.

Tutte le nove gare si sono disputate il 14 ottobre 2026. Prefisso degli ID: `ucl-2026-27-md02-`.

| Suffisso ID | Partita | Finale |
|---|---|---|
| 10 | Feyenoord – Como | 3–2 |
| 11 | LASK – Liverpool | 3–6 |
| 12 | Roma – Real Madrid | 3–4 |
| 13 | Aston Villa – Fenerbahçe | 6–0 |
| 14 | Shakhtar Donetsk – AEK Athens | 3–1 |
| 15 | Bodø/Glimt – Borussia Dortmund | 1–0 |
| 16 | Manchester City – Paris Saint-Germain | 2–4 |
| 17 | Real Betis – Porto | 3–2 |
| 18 | Slovan Bratislava – Stuttgart | 0–3 |

## File applicativi aggiornati

1. `data/sources/champions-results-md02-2026-27.json`: aggiunti nove report sportivi minimi; i nove report esistenti sono profondamente identici. Metadati aggiornati alla copertura 18/18.
2. `data/normalized/champions-league-2026-27.json`: stato `finished`, punteggio e report soltanto per le nove fixture; conteggio complessivo concluso 36, timestamp e provenienza del calendario aggiornati. Preservati nomi, date, orari, undici e tutti gli altri campi delle fixture, comprese MD1 e MD3–MD8.
3. `js/pages/champions.js`: una sola espressione di fallback dei marcatori. Una lista non acquisita mostra “Da verificare” se la squadra ha segnato; “Nessun gol” soltanto con risultato sportivo zero. Nessuna modifica grafica o ai calcoli.

Il builder sportivo esistente legge già il registro MD2 come overlay del calendario, perciò l'aggiornamento rimane nella sua fonte canonica. Non è stato eseguito alcun builder, importatore o settlement.

## Verifiche

- Registro: 144 fixture univoche, 18 ID MD2 senza duplicati/mancanti, 18 stati finali, 78 gol; tutte le fixture estranee e tutti i campi non sportivi preservati.
- Test superati: archivio audit MD2 (117 contratti originali invariati), pagina Lettura Champions, 36 pagine squadra, UI mercati MD2, schedina personale, sincronizzazione pronostici, `git diff --check`.
- Browser Edge: 29 controlli — overview a 1440/390 con MD3 selezionata e 18 risultati MD2 consultabili; tutte le nove Letture aggiornate; calendari delle 18 squadre coinvolte a 390px. Punteggi coerenti, nessun errore JavaScript/console o overflow.
- Integrità SHA-256: 13717 file preesistenti inventariati, 13714 protetti invariati e soltanto i tre file previsti modificati. Sono inclusi CSS e JavaScript del restyling già presenti nel working tree. HEAD invariato; nessun commit, push o deploy.

Non è stato eseguito il test storico `test-champions-results.js`: contiene conteggi dell'epoca MD1 (18 gare concluse/126 future), già superati dai 27 risultati presenti prima di questo intervento. Nessun valore atteso o snapshot è stato aggiornato per far passare un test.

## Limiti e separazione degli esiti

Nessun risultato sportivo MD2 resta non confermato. Marcatori e statistiche dettagliate delle nove integrazioni non sono stati importati: rimangono non acquisiti e non sono interpretati come zero. Nessuna liquidazione dei mercati, modifica dei grigi o nuova valutazione economica. Pronostici prepartita, quote, EV, soglie, modificatori, store, motori, integrazioni e audit/settlement precedenti sono byte per byte invariati.

## Artefatti nuovi

Solo questa directory: `work.cjs`, `browser.cjs`, `baseline.json`, `verified-results.json` (inclusi i nove collegamenti individuali UEFA), `integrity.json`, `browser-results.json`, questo documento e `archive-1440.png` / `archive-390.png`.
