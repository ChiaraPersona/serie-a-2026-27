# Blocco 1 — affidabilità test C01–C04

## Diagnosi completata prima delle correzioni

Base iniziale c8c48026 con modifiche concorrenti già presenti. Nove suite rilanciate: 0 PASS, 9 FAIL. Durante la diagnosi un intervento esterno ha aggiornato fonti/generati MD7 e creato il commit a84b0d46; nessun commit è stato eseguito da questo lavoro. Le failure transitorie di dati in aggiornamento non vengono corrette rigenerando.

| Suite | Classificazione | Prova del contratto vigente |
|---|---|---|
| team-pages/test.js | TEST OBSOLETO, con DISALLINEAMENTO DATI transitorio esterno | Il campo condiviso era già aggiornato in concorrenza; MD7 acquisita prima dei generati causava official/probable discordante. Dopo completamento esterno resta assert separatore classifica, superato da pulsanti stagione in home.js, commit ab048a87. |
| team-pages/test-completed-teams.js | TEST OBSOLETO | Conteggi 32/36/36 precedenti a rose canoniche del listone attivo (24/28/26); build.js officializeSquad usa gli ID Fantacalcio. Giocatori trasferiti conservano statistiche estere con competizione esplicita, non solo Serie A/B. |
| team-pages/test-all-teams.js | TEST OBSOLETO | Fonte MD5 fissa contro matchday effettivo della formazione generata e fonte Fantacalcio MD7. |
| test-champions-md02-integration.js | PROBLEMA DI HASH/STORICITÀ + TEST OBSOLETO | L'intero test originale passa senza cambiare assert leggendo input/output dal commit c3f193bae2ebe6407693004489e6ffd8685ca63f. Le ufficiali sono poi passate da 9 a 18, altri input sono stati aggiornati per fixture. |
| test-champions-pilot-predictions.js | TEST OBSOLETO | Link reale usa analysis.fixtureId, route corrente passa ulteriori argomenti, titolo tattico e introduzione cambiati; i contratti funzionali persistono. |
| test-champions-reading-page.mjs | TEST OBSOLETO | Confronto con Schedina corrente: 7 selezioni, Lookman escluso dalla policy; non sono più 3 né deve riapparire il non titolare. |
| test-official-starter-policy.cjs | TEST OBSOLETO + effetto collaterale del test | Archivio condiviso contiene 7 righe, report storico 58/54 riguarda solo la coorte originaria. buildRegistry scrive il registro: il test va reso realmente read-only, verificando registro canonico/fonti e coorti distinte. |
| test-champions-full-data-coverage.js | PROBLEMA DI HASH/STORICITÀ | Hash builder originario ritrovato nel commit be95b1470714b023932f82da13586612c1c085b5; semantica dei dati correnti verificata separatamente. |
| test-champions-historical-recovery-audit.js | PROBLEMA DI HASH/STORICITÀ / DA APPROFONDIRE | Calendario originario ritrovato in 7313a681f94199deb8f6bb0a6e495b9fba02fe79; hash renderer 205fbcaf… non ritrovato nelle revisioni del percorso, anche con varianti LF/CRLF. Nessuna sostituzione dell'hash autorizzabile. |

Nessun BUG REALE di produzione è dimostrato dalle nove failure. Le ulteriori asserzioni sono state esplorate anche in memoria, raccogliendo gli errori senza scrivere sorgenti o dati: tali run sono diagnostici e non PASS di suite. Prima delle correzioni è stata completata la lettura di test, consumatori, report e storia mirata.

