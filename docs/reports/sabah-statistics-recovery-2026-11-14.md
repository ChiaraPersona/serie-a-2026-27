# Recupero statistico Sabah — 14 novembre 2026

Il precedente N/D della previsione xGOT non derivava dalla sola assenza di xGOT:
il dataset di ricerca conteneva già sei precedenti utilizzabili. Mancavano i SOT
previsti perché il profilo quantitativo era ancora associato alle qualificazioni
Conference, con zero righe utilizzabili dal motore condiviso.

Verificati online scheda FotMob 951893 e referto domestico 5987550: quest'ultimo
non espone statistiche aggregate né eventi di tiro. I nove referti domestici già
acquisiti non espongono xGOT, tiri o SOT. Nessuna imputazione di questi valori.

Acquisiti e archiviati gli otto referti dei preliminari Champions 2026/27,
riconciliati per ID, data, competizione e coppia di squadre con il calendario
originale della scheda 951893. Sette gare nei 90 minuti entrano nella fonte
canonica: 3 in casa, 4 fuori. La gara 5987809 resta nell'archivio originale ma
è esclusa dal profilo perché contiene supplementari. Ogni riga conserva URL,
timestamp e SHA-256. I campi disciplinari mancanti restano null.

Il profilo Sabah ora usa `uefa.champions_qual` e la corrispondenza esatta FotMob
951893. L'importatore canonico riapplica il recupero dagli archivi disponibili.
Il motore continua a richiedere sei gare e due per sede, senza nuove formule o
pesi. La normalizzazione resta quella del fallback europeo esistente: questa
base di sette partite non equivale a una baseline domestica ampia o validata.

Rigenerati gli scenari futuri MD5–8. L'esito 1X2 europeo mantiene la sua policy
distinta: il recupero dei volumi non aggiunge automaticamente precedenti al
registro Elo e non approva selezioni, quote o probabilità DUO.

Archivi: `data/raw/xgot/sabah-recovery-2026-11-14/`.
Fonte canonica: `data/sources/champions-pilot-match-stats-2025-27.json`.
Test: `scripts/test-sabah-recovered-baseline.cjs` e suite xGOT/scenari Champions.
UI desktop/mobile: `reports/champions-xgot-forecast/browser-audit.json`.
