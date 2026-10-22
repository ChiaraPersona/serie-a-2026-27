# Lettura Serie A MD8 - verifica interna

- 10 partite, 20 squadre, 220 probabili titolari e 232 riserve; 452 identità collegate. Nessuna formazione ufficiale MD8 e nessun filtro definitivo anticipato.
- Snapshot probabili verificato su Fantacalcio.it; undici e dettagli invariati rispetto allo snapshot locale precedente.
- 200 giocatori di movimento modellati: minuti attesi, tiri, SOT, soglie individuali e candidati cartellino.
- Formule, parametri, soglie e validazione MD6 invariati. Previsioni e schede delle altre giornate preservate.
- Quote del 22 ottobre 2026, precedenti a tutte le gare MD8; confronto esterno al modello. Nessuna acquisizione o modifica quote.
- Catalogo Lettura dedicato: 1233 contratti; 122 selezioni pubblicabili; 369 contratti senza probabilità modellistica verificata.
- Falli squadra presenti come campo per tutte le gare; N/D per frosinone, venezia, monza. I mercati falli individuali restano esclusi dalle proposte operative dalla MD6 secondo la policy vigente.
- Identità non risolta: Wiafe, Genoa, sourceId 7608, ballottaggio. Nessun ID canonico inventato.
- Altre lacune: formazioni ufficiali, meteo attendibile e conferma definitiva delle indisponibilità. Le segnalazioni editoriali sono visibili e separate dai dubbi.
- Nessuna probabilità DUO viene ricavata dalla sola probabilità del singolo; rispettate le differenze per sostituti e pali/traverse.
- 10 dettagli verificati a 1440 e 390 px (20 casi), senza errori JS o overflow; formazioni probabili, disponibilità, filtri e cataloghi verificati.
- Test passati: test-reading-md08.cjs; test-probable-lineups.js; test-predictions.js; test-reading-browser-data.mjs (380 fixture); git diff --check.
- Schedina, MyCombo, giornate precedenti, grafica e altre sezioni non rigenerate. Nessun commit, push o deploy.

## Riproduzione

1. Acquisire solo la fonte MD8 con scripts/import-fantacalcio-probable-lineups.js --matchday 8 (controlla la giornata della pagina).
2. Eseguire node --experimental-require-module scripts/build-reading-md08.cjs. Se gli undici divergono dall’integrazione squadra esistente, il comando si ferma per evitare proiezioni obsolete.
3. Eseguire node scripts/build-site.js --presentation-only --readings-index-only --matchday 8.
4. Eseguire node scripts/test-reading-md08.cjs.

## Fixture

| Partita | Contratti | Pubblicati |
|---|---:|---:|
| torino-monza-2026-27-md-08 | 174 | 20 |
| cagliari-bologna-2026-27-md-08 | 173 | 18 |
| como-sassuolo-2026-27-md-08 | 165 | 18 |
| napoli-roma-2026-27-md-08 | 166 | 18 |
| lazio-parma-2026-27-md-08 | 168 | 22 |
| inter-fiorentina-2026-27-md-08 | 81 | 6 |
| atalanta-frosinone-2026-27-md-08 | 80 | 5 |
| genoa-venezia-2026-27-md-08 | 73 | 5 |
| lecce-juventus-2026-27-md-08 | 76 | 5 |
| udinese-milan-2026-27-md-08 | 77 | 5 |

## Integrazione designazioni AIA MD8

Fonte ufficiale pubblicata il 21/10/2026, acquisita il 23/10/2026. Importati i dieci sestetti completi nella fonte canonica e nel calendario. Storico arbitrale con cinque gare disponibili antecedenti alla fixture per tutti i dieci arbitri. Ricalcolata solo la MD8: tutti i 50 candidati cartellino usano il campione storico dell’arbitro designato. Gol attesi e probabilità 1X2 invariati. Parametri e quote preservati.
