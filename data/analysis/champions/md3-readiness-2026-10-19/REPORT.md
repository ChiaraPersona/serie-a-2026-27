# Champions MD3 — chiusura Pacchetto 2 e preparazione

## Implementato

Nessuna importazione dal Pacchetto 2. Conservati byte per byte dataset corrente, ledger, raw e report del Pacchetto 1: 817 prestazioni, 519 giocatori, 31 squadre. Corretto il solo test current-season; aggiunti audit offline, manifest per le 18 fixture e gate interno testato per la generazione individuale. Nessun motore o builder di previsione modificato.

| Pacchetto 2 | Esito sul database locale aggiornato |
|---|---:|
| Candidate domestiche | 34 |
| Duplicati già presenti | 6, quattro PSV e due Galatasaray |
| Quarantena mantenuta | 28 |
| Nuove approvate / importate | 0 / 0 |

Il confronto dei duplicati verifica atleta provider, squadra provider, competizione, ID e data incontro nelle entry correnti. Non si basa sul vecchio export. Le altre 28 righe non risultano nuove prestazioni autorizzate: conservano le esclusioni dei pacchetti; 20 segnalano statistiche di tiro di squadra inutilizzabili, 8 conflitto squadra/rosa, tutte e 28 minuti mancanti. Il conflitto squadra/rosa è inoltre verificato con gli ID squadra canonici locali. Nessuna nuova acquisizione o seconda certificazione delle statistiche in quarantena è stata eseguita; i relativi flag statistici provengono dai documenti forniti e non sono stati trasformati in autorizzazioni.

## Copertura individuale delle 32 squadre

La rosa locale delle 32 squadre contiene 861 giocatori: 652 con minuti positivi e tiri/SOT disponibili nel campione corrente; 729 nello storico; 637 in entrambi. Sono disponibilità statistiche, non approvazioni automatiche di proiezioni o mercati.

Non sono disponibili XI probabili né panchine MD3. Non è quindi possibile indicare quali lacune riguardino i veri titolari probabili o i principali subentranti senza inventarne il ruolo nella partita. Il triage è sulla rosa registrata e verrà incrociato con gli XI/panchine quando forniti. Non sono state riutilizzate come MD3 le formazioni di giornate precedenti.

| Squadra | Rosa | Corrente con minuti+tiri+SOT | Storico con minuti+tiri+SOT | Entrambi | Solo corrente | Solo storico |
|---|---:|---:|---:|---:|---:|---:|
| Real Madrid | 35 | 21 | 28 | 21 | 0 | 7 |
| Inter | 23 | 20 | 22 | 20 | 0 | 2 |
| Napoli | 23 | 22 | 23 | 22 | 0 | 1 |
| Arsenal | 22 | 19 | 21 | 19 | 0 | 2 |
| Fenerbahçe | 36 | 21 | 26 | 21 | 0 | 5 |
| Roma | 24 | 22 | 21 | 20 | 2 | 1 |
| Como | 21 | 20 | 21 | 20 | 0 | 1 |
| Leipzig | 22 | 20 | 22 | 20 | 0 | 2 |
| AEK Athens | 22 | 19 | 21 | 19 | 0 | 2 |
| Aston Villa | 23 | 22 | 22 | 22 | 0 | 0 |
| Atlético de Madrid | 24 | 21 | 23 | 20 | 1 | 3 |
| Barcelona | 25 | 23 | 23 | 22 | 1 | 1 |
| Bayern München | 24 | 19 | 23 | 19 | 0 | 4 |
| Bodø/Glimt | 32 | 21 | 21 | 20 | 1 | 1 |
| Borussia Dortmund | 28 | 16 | 23 | 16 | 0 | 7 |
| Club Brugge | 25 | 15 | 20 | 14 | 1 | 6 |
| Feyenoord | 46 | 22 | 25 | 20 | 2 | 5 |
| Galatasaray | 33 | 20 | 22 | 20 | 0 | 2 |
| LASK | 32 | 19 | 17 | 15 | 4 | 2 |
| Lens | 25 | 22 | 22 | 20 | 2 | 2 |
| Liverpool | 25 | 16 | 22 | 16 | 0 | 6 |
| Manchester City | 23 | 19 | 21 | 19 | 0 | 2 |
| Lille | 24 | 23 | 24 | 23 | 0 | 1 |
| Manchester United | 25 | 19 | 22 | 19 | 0 | 3 |
| Paris Saint-Germain | 26 | 21 | 23 | 21 | 0 | 2 |
| Porto | 33 | 20 | 28 | 20 | 0 | 8 |
| PSV Eindhoven | 23 | 20 | 23 | 20 | 0 | 3 |
| Real Betis | 25 | 22 | 24 | 22 | 0 | 2 |
| Stuttgart | 32 | 21 | 24 | 21 | 0 | 3 |
| Viking | 30 | 26 | 27 | 25 | 1 | 2 |
| Villarreal | 25 | 22 | 22 | 22 | 0 | 0 |
| Sporting CP | 25 | 19 | 23 | 19 | 0 | 4 |

Problemi che possono incidere su MD3:

- 209 giocatori senza copertura corrente completa di minuti+tiri+SOT; 132 senza la corrispondente copertura storica. Non assegnati a un ipotetico undici.
- 117 con storico inferiore ai 700 minuti: è l'etichetta limited-history già prevista dal motore, non una nuova soglia inventata.
- 52 senza ESPN ID nel dataset corrente; questo non significa necessariamente identità UEFA sconosciuta. Gli overlay di identità UEFA non forniscono automaticamente un ID ESPN.
- 22 alias di player ID fra registro e dataset corrente, riconciliabili per ID provider esatto. Altri 4 record hanno nome esatto nel registro ma slug diverso e provider ID assente: Yasir Caklı, Çağan Sarıdikmen, Çağrı Fedai e Onur Kağan Yıldız. Nessuno è stato dichiarato fuori rosa a causa dello slug.
- ID squadra Bodø/Glimt: `bodo-glimt` nel campione corrente/config, `bod-glimt` in storico/registro. L’audit usa il nome squadra identico e univoco per riconoscere il caso; serve un mapping canonico esplicito prima del collegamento operativo. Nessuna ricerca approssimativa sui nomi.
- Giocatori realmente assenti dalla rosa locale dopo i join esatti: 0. Conflitti provider tra registri: 0. SOT superiori ai tiri nei campioni controllati: 0.
- I minuti Package 1 restano stimati; gli aggregati correnti non distinguono sempre esposizioni omogenee per metrica. La semplice presenza di un per90 non certifica la validità del rate per una previsione. Non si inferisce la frequenza di subentro dalle sole presenze in campo.

I problemi nominativi, minuti, disponibilità per stagione e ID sono in `team-coverage.json`; non viene prodotto un elenco pubblico delle fonti. Nessuna ulteriore ricerca individuale è stata svolta.

## Quattro squadre solo collettive

Il gate di volumi dettagliati riprende il contratto del builder esistente: almeno 6 gare complete, almeno 2 in casa e 2 fuori, medie finite per gol, tiri, SOT, corner, falli e gialli su entrambi i lati. I conteggi includono storico e stagione corrente del dataset di squadra già disponibile. Nessun nuovo coefficiente.

| Squadra | Gare complete | Casa / fuori | Gare correnti complete | Ultima completa | Volumi dettagliati supportati |
|---|---:|---|---:|---|---|
| Sabah | 1 | 0 / 1 | 1 | 2026-09-10 | No: campione insufficiente |
| Slavia Praha | 9 | 5 / 4 | 1 | 2026-09-10 | Sì, campione esistente |
| Shakhtar Donetsk | 15 | 7 / 8 | 1 | 2026-09-10 | Sì, campione esistente |
| Slovan Bratislava | 7 | 3 / 4 | 1 | 2026-09-09 | Sì, campione esistente |

Per Sabah restano utilizzabili solo gli output collettivi supportati dal percorso esistente risultato/gol; non si producono tiri/SOT dettagliati inventati. Per tutte e quattro le squadre, pronostici individuali esclusi per richiesta dell’utente anche quando esiste uno storico individuale. Nessun dato storico cancellato.

## Problemi effettivi delle 18 fixture

Presenti 18 partite e 36 squadre; Sisal contiene 27,211 mercati e 105,050 selezioni, di cui 68,478 aperte con quota >1 e 36,572 sospese. Le sospese non sono quote operative e non vengono trattate come errori né come dati utilizzabili.

ID evento/mercato/selezione e date canoniche verificati in locale per fixture. Nessun ID mancante o duplicato di selezione dentro gli eventi; nessuna selezione aperta priva di quota valida. Nessuna nuova verifica online della disponibilità commerciale: sono snapshot già raccolti. La presenza di mercati individuali non implica identità giocatore confermata, titolarità o previsione approvata.

Per tutte le gare: XI e panchine mancanti; collegamento del campione corrente al motore non attivo; nessuna lettura definitiva MD3 generata. Il gate resta chiuso.

| Fixture | Partita | Mercati / selezioni | Mercati tiri / SOT giocatore | Limitazione specifica |
|---|---|---:|---:|---|
| ucl-2026-27-md03-01 | Fenerbahçe – Slavia Praha | 1879 / 6661 | 204 / 132 | Solo collettivo: Slavia Praha |
| ucl-2026-27-md03-02 | Sabah – Borussia Dortmund | 1424 / 5602 | 113 / 65 | Solo collettivo: Sabah; volumi dettagliati non supportati: Sabah |
| ucl-2026-27-md03-03 | Roma – Slovan Bratislava | 2498 / 7682 | 199 / 120 | Solo collettivo: Slovan Bratislava |
| ucl-2026-27-md03-04 | Porto – PSV Eindhoven | 1893 / 6690 | 201 / 128 | Blocco comune XI/panchine e collegamento motore |
| ucl-2026-27-md03-05 | Liverpool – Villarreal | 1853 / 6759 | 119 / 75 | Blocco comune XI/panchine e collegamento motore |
| ucl-2026-27-md03-06 | Manchester City – AEK Athens | 1711 / 6226 | 103 / 68 | Blocco comune XI/panchine e collegamento motore |
| ucl-2026-27-md03-07 | Paris Saint-Germain – Barcelona | 1819 / 6473 | 104 / 67 | Blocco comune XI/panchine e collegamento motore |
| ucl-2026-27-md03-08 | Napoli – Bodø/Glimt | 2427 / 7638 | 189 / 121 | Blocco comune XI/panchine e collegamento motore |
| ucl-2026-27-md03-09 | Stuttgart – Atlético de Madrid | 1675 / 6203 | 100 / 65 | Blocco comune XI/panchine e collegamento motore |
| ucl-2026-27-md03-10 | Como – Manchester United | 1642 / 5968 | 126 / 72 | Blocco comune XI/panchine e collegamento motore |
| ucl-2026-27-md03-11 | Lille – Galatasaray | 1164 / 5053 | 103 / 60 | Blocco comune XI/panchine e collegamento motore |
| ucl-2026-27-md03-12 | Aston Villa – Viking | 791 / 4358 | 0 / 0 | Blocco comune XI/panchine e collegamento motore |
| ucl-2026-27-md03-13 | Club Brugge – Lens | 807 / 4488 | 0 / 0 | Blocco comune XI/panchine e collegamento motore |
| ucl-2026-27-md03-14 | Bayern München – Arsenal | 1609 / 5803 | 106 / 67 | Blocco comune XI/panchine e collegamento motore |
| ucl-2026-27-md03-15 | Inter – Shakhtar Donetsk | 889 / 4661 | 0 / 0 | Solo collettivo: Shakhtar Donetsk |
| ucl-2026-27-md03-16 | Real Madrid – Leipzig | 1543 / 6013 | 117 / 76 | Blocco comune XI/panchine e collegamento motore |
| ucl-2026-27-md03-17 | Real Betis – Feyenoord | 865 / 4853 | 0 / 0 | Blocco comune XI/panchine e collegamento motore |
| ucl-2026-27-md03-18 | Sporting CP – LASK | 722 / 3919 | 0 / 0 | Blocco comune XI/panchine e collegamento motore |

## Proposta, non implementazione

Il documento `ENGINE-LINK-PROPOSAL.md` descrive formule attuali, differenza tra minuti storici/correnti/previsti, blending candidato già presente nel pilota AEK, rischi di sovrapposizione e piano di regressione/walk-forward. Il candidato mantiene il valore dello storico e considera canali corrente domestico e Champions separati; le altre competizioni non entrano automaticamente nel canale Champions.

I pesi 900/0.35 provengono dal pilota, non sono introdotti come nuovi pesi approvati. Nessun rate corrente è stato attivato: estendere il pilota alle 32 squadre e cambiare le probabilità sarebbe una modifica sostanziale. Occorre autorizzazione per un candidato offline e una successiva decisione di attivazione. Le soglie dei subentranti esistono già ma richiedono panchine documentate, non ricostruite dalle sole 817 presenze.

## Test e contratto temporale

Il test current-season ora verifica separatamente:

1. Cutoff dell’input collettivo: 9 ottobre, sorgente di squadra preservata.
2. Cutoff dell’aggiornamento individuale: 19 ottobre, ricavato dal manifest dell’import e dal ledger.
3. Acquisizione raw: confronto puntuale con retrievedAt, eventDate, eventId e asOf dei gzip; non viene confusa con la data delle partite o il vecchio cutoff di squadra.
4. Snapshot AEK congelato al 3 ottobre: verificato sul backup precedente all’integrazione con il suo hash originale, senza imporre che il nuovo campione live rimanga congelato.
5. Confronto statistico sull’esatto insieme di match ID delle entry AEK, evitando di confrontare un vecchio aggregato con tutti i raw recuperati successivamente; conservati controlli null/zero e future leakage.

Non sono state modificate statistiche o date nei dataset per fare passare il test.

- PASS `test-champions-current-season-data.js`.
- PASS `test-champions-md3-readiness.js`.
- FAIL `test-champions-context-adjusted-baseline.js`.
- PASS `test-champions-substitute-forecasts.js`.
- PASS `git diff --check`.

Output completi in `test-results.json`. Il test del pilota AEK fallisce prima delle verifiche numeriche: il controllo congelato richiede hash builder 135788a773b8607db7f1386a1c9d6b5d2fb8560fdab914d652318bfe95691be5, mentre quello presente è 33f125092367f1d518d67bece8a55cc6b253e34cb9f114cb4233c80e79341cd7. Quest’ultimo coincide con l’hash rilevato all’inizio della sessione: il disallineamento è preesistente. Il controllo non è stato aggiornato per nascondere il problema. Va riconciliata la compatibilità del pilota con il builder prima di un’estensione. Il test subentranti passa, ma non dimostra la validazione del blending su tutte le squadre. Il nuovo test del gate include casi negativi per XI incompleto, panchina mancante, identità incerta, dati insufficienti, approvazione assente e contratto provider mancante. Le quattro squadre restano escluse anche con tutti gli altri input presenti.

Non ripetuti raccolta dati, audit Package 1, test grafici o build sito già conclusi: nessun componente pubblico è stato modificato. I risultati browser della sessione precedente restano documentati nel report Package 1; non sono presentati come nuove letture MD3 validate.

## File modificati e preservati

Unico file esistente modificato: `scripts/test-champions-current-season-data.js`.

Nuovi script:

- `scripts/champions/md3-readiness.js`: gate interno, non collegato ai builder di produzione.
- `scripts/audit-champions-md3-readiness.py`: audit locale e manifest, senza import o fetch.
- `scripts/test-champions-md3-readiness.js`: regressioni del gate e dei contratti MD3.
- `scripts/report-champions-md3-readiness.py`: report e risultati test mirati.

Nuovi artefatti interni sotto `data/analysis/champions/md3-readiness-2026-10-19/`: i due pacchetti estratti, snapshot hash, audit delle 34 righe, riepilogo Pacchetto 2, copertura delle squadre, manifest delle fixture, verifica di integrità, risultati test, proposta e questo report. Elenco puntuale in `files-manifest.json`.

Verificati 9864 file preesistenti: nessuna modifica ai dati o ai file Package 1. Quote Sisal, contratti, selezioni, motori Serie A/Champions ed esiti invariati. Nessun accesso o modifica alle schedine personali. Durante la sessione sono comparse modifiche concorrenti a js/pages/champions.js e css/champions.css, oltre a un commit esterno rilevato come 9ecdfd4b verifiche panchinari. Non ho eseguito quel commit né modificato quei due file, e non li ho ripristinati. La verifica hash li registra separatamente; non si afferma che l’intero workspace UI sia rimasto immutato.

## Attività ancora necessarie

1. Fornire o acquisire in un intervento autorizzato gli XI probabili e le panchine MD3, con mapping canonici; rieseguire poi il triage solo sui giocatori effettivamente candidati.
2. Approvare il candidato offline per tiri/SOT e la politica per i minuti stimati; verificare per metrica campioni, contesto e deduplicazione, senza pesi manuali.
3. Rendere espliciti i join squadra/giocatore e collegare il gate delle quattro squadre al futuro percorso MD3 prima di generare output individuali. Il modulo interno da solo non modifica il builder pubblico.
4. Predisporre output MD3 separati nei builder che non sono ancora parametrizzati: il builder di mercati legge calendario/predizioni generiche e scrive `champions-player-markets-md01-2026-27.json`; non va eseguito alla cieca per MD3. Il builder collettivo supporta già `--matchday 3`, ma non è stato eseguito.
5. Conservare N/D per i volumi dettagliati non supportati di Sabah; applicare analisi esclusivamente collettiva alle quattro squadre.
6. Solo dopo autorizzazione e controlli, generare preview MD3 isolate, validare desktop/mobile e successivamente decidere la generazione definitiva. Nessuna quota viene aggiornata da questa preparazione.

Nessun commit, push, deploy, importazione in quarantena, modifica alle 817 prestazioni o ricalcolo definitivo.
