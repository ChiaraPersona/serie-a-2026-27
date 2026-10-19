# Champions League MD3 — designazioni e profili arbitrali

Integrazione locale delle 18 designazioni consegnate nel pacchetto del 19 ottobre 2026. I CSV e JSON sono stati confrontati campo per campo; ogni riga è associata a una sola fixture mediante uguaglianza esatta di data, squadra di casa e ospite, quindi salvata con il fixture ID canonico. Nessuna nuova ricerca generale. La conferma UEFA è quella documentata nel pacchetto fornito, senza affermare una nuova verifica online.

## Associazioni e statistiche mostrate

Le medie nazionali sono campioni misti 2025/26–2026/27: il campionato specifico non è indicato nel pacchetto e non è stato dedotto dalla nazionalità dell’arbitro. Le medie Champions sono storiche, con periodo iniziale/finale e cutoff non certificati. Nessuna media è chiamata stagione corrente o ultime dieci.

| Fixture | Partita | Arbitro | Campione | n | Gialli/gara | Cartellini/gara | Falli/gara |
|---|---|---|---|---:|---:|---:|---:|
| ucl-2026-27-md03-01 | Fenerbahçe – Slavia Praha | Ricardo de Burgos | Nazionale misto 2025/26–2026/27 | 24 | 4,08 | — | 22,92 |
| ucl-2026-27-md03-02 | Sabah – Borussia Dortmund | Javier Alberola Rojas | Nazionale misto 2025/26–2026/27 | 25 | 4,28 | — | 27,68 |
| ucl-2026-27-md03-03 | Roma – Slovan Bratislava | Sandro Schärer | Champions storico | 15 | — | 3,67 | — |
| ucl-2026-27-md03-04 | Porto – PSV Eindhoven | Daniel Siebert | Champions storico | 20 | — | 5,25 | — |
| ucl-2026-27-md03-05 | Liverpool – Villarreal | Szymon Marciniak | Champions storico | 23 | — | 3,65 | — |
| ucl-2026-27-md03-06 | Manchester City – AEK Athens | Willy Delajod | Champions storico | 2 | — | 4,00 | — |
| ucl-2026-27-md03-07 | Paris Saint-Germain – Barcelona | Michael Oliver | Champions storico | 26 | — | 4,73 | — |
| ucl-2026-27-md03-08 | Napoli – Bodø/Glimt | José María Sánchez Martínez | Champions storico | 2 | — | 4,50 | — |
| ucl-2026-27-md03-09 | Stuttgart – Atlético de Madrid | Serdar Gözübüyük | Champions storico | 16 | — | 5,00 | — |
| ucl-2026-27-md03-10 | Como – Manchester United | Sven Jablonski | Champions storico | 9 | — | 2,78 | — |
| ucl-2026-27-md03-11 | Lille – Galatasaray | Rade Obrenovič | Non disponibile | — | — | — | — |
| ucl-2026-27-md03-12 | Aston Villa – Viking | Sebastian Gishamer | Non disponibile | — | — | — | — |
| ucl-2026-27-md03-13 | Club Brugge – Lens | Luís Godinho | Champions storico | 2 | — | 4,50 | — |
| ucl-2026-27-md03-14 | Bayern München – Arsenal | Davide Massa | Champions storico | 23 | — | 3,65 | — |
| ucl-2026-27-md03-15 | Inter – Shakhtar Donetsk | Harm Osmers | Nazionale misto 2025/26–2026/27 | 15 | 4,33 | — | 20,27 |
| ucl-2026-27-md03-16 | Real Madrid – Leipzig | István Kovács | Champions storico | 28 | — | 4,79 | — |
| ucl-2026-27-md03-17 | Real Betis – Feyenoord | Simone Sozza | Champions storico | 6 | — | 4,83 | — |
| ucl-2026-27-md03-18 | Sporting CP – LASK | Nicholas Walsh | Non disponibile | — | — | — | — |

## Omissioni e semantica

- 12 profili mostrano esclusivamente la media cartellini del campione storico Champions; 3 mostrano medie gialli e falli di un campione nazionale misto.
- Rade Obrenovič, Sebastian Gishamer e Nicholas Walsh: arbitro mostrato, tutte le medie e il campione numerico restano —.
- Rossi/gara assente in tutti i 18 profili: mostrato —, senza derivarlo da cartellini meno gialli. Assistenti, IV ufficiale, VAR, AVAR e nazionalità non sono inclusi nel pacchetto e sono omessi.
- Il campo cartellini mantiene la semantica aggregata del dato consegnato: non è rietichettato come gialli, non è sommato ai gialli e non gli si attribuisce una formula gialli+rossi non certificata.
- Nessuna serie delle ultime 5 o 10 partite, media della stagione corrente, frequenza Over, percentuale o correzione dei pronostici è stata ricostruita dai valori aggregati.
- I campioni di soli 2 incontri restano esplicitamente n=2; non sono promossi a campioni robusti.
- Le metriche mancanti restano null nei dati e — nella UI; le barre prive di valore non rappresentano uno zero osservato.
- Ogni profilo conserva competizione/categoria, stagioni quando disponibili, numerosità, metrica, definizione, URL, note e stato di affidabilità nei metadati interni. Tutti hanno predictionEligible=false, cutoffCertified=false e recentTenVerified=false.

## Implementazione

Designazioni canoniche in `data/sources/champions-referee-assignments-md03-2026-27.json`, separate dai profili in `data/sources/champions-referee-profiles-md03-2026-27.json`. Il builder esistente integra le designazioni nella fixture; il nuovo builder dei profili produce il dataset normalizzato usato solo dal renderer. Nessun motore di previsione importa questi profili.

Le URL `champions-league.html?match=ucl-2026-27-md03-XX` prima ricadevano sul calendario perché non esistono pronostici MD3. Ora aprono la testata della lettura e la sola sezione «Disciplina e profilo arbitrale». Non vengono inventate le sezioni mancanti, generati pronostici o modificati gli archivi.

Il renderer riutilizza la testata condivisa, l’icona arbitrale e le classi del dashboard approvato, senza nuove regole CSS o blocchi recenti non supportati. Le due esportazioni condivise (testata e icona) non modificano il comportamento dei renderer precedenti. Il file champions.js, già modificato localmente prima della richiesta, è stato preservato e ampliato con la sola diramazione MD3.

Il build sito è stato limitato alla shell Champions (`--champions-page-only --presentation-only`): aggiorna il cache version senza rigenerare dati, schedine, panchine o altre pagine. La policy pubblica `js/public-presentation.js` resta attiva; nessun URL o testo dedicato alle fonti è generato nel profilo.

## Verifiche

- PASS `test-champions-md3-referees.mjs`: 18 nomi esatti, metriche uguali al pacchetto, campioni separati, null/—, nessun uso modello e altre 126 fixture invariate.
- PASS `test-champions-reading-page.mjs`.
- PASS `test-reading-referee-history.mjs`.
- PASS `test-champions-referee-readings-md02-page.mjs`: regressione delle 18 pagine MD2.
- PASS `test-reading-detail-adapters.mjs` e `test-reading-detail-internals.mjs`.
- PASS browser Edge: tutte le 18 pagine a 1440, 390 e 320 px, 54 controlli. Nomi e ogni valore visualizzato confrontati con il dataset; nessun overflow, errore JavaScript, testo fonti o campione impropriamente stagionale/recente.
- Screenshot desktop/mobile ispezionati per campione nazionale, storico Champions e profilo senza statistiche.
- PASS `git diff --check` (soli avvisi di conversione LF/CRLF).

Confrontati 9875 file preesistenti con gli hash acquisiti all’inizio dell’intervento. Tra i dati esistenti cambia solo il calendario Champions: esclusivamente refereeAssignment delle 18 fixture MD3; gli altri campi di quelle fixture e le altre 126 fixture sono identici. Pronostici, Schedina, quote Sisal, identificativi dei mercati, risultati, statistiche individuali e dati Serie A sono rimasti identici. Nessuna modifica alle schedine salvate.

## File

File esistenti modificati in questo intervento:

- `data/normalized/champions-league-2026-27.json`.
- `js/pages/champions.js`.
- `js/pages/reading-detail/referee-dashboard.mjs`.
- `js/pages/reading-detail/shell.mjs`.
- `scripts/build-champions-league.js`.
- `scripts/build-site.js`.
- `champions-league.html` (sola shell e cache version).

Nuovi file: due fonti canoniche MD3, un dataset normalizzato dei profili, renderer MD3, importer offline, builder dei profili, test mirato, controllo browser e script report. Pacchetto estratto, mapping, snapshot precedenti, verifica hash, risultati browser e screenshot restano nella cartella interna di questo report. L’elenco completo è in `files-manifest.json`.

Limiti aperti: data limite e periodo dei campioni non certificati, nazionali specifici non indicati, tre arbitri senza statistiche. L’importazione è informativa e non risolve né aggira questi limiti. Nessun commit, push, deploy o ricalcolo definitivo eseguito.
