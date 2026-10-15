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

## Correzioni mirate e motivazioni

Sono stati modificati esclusivamente nove test esistenti e aggiunti tre supporti di test più una suite dei guard. Nessuna modifica produttiva del Blocco 1.

| File | Correzione e copertura |
|---|---|
| scripts/team-pages/test.js:301 | Pulsanti stagione corrente/archivio e stili al posto del separatore testuale superato; conservate le modifiche concorrenti al campo. |
| scripts/team-pages/test-completed-teams.js:7 | ID attesi dal listone attivo canonico, parità esatta fra fonte/generato/team, unicità e minimo 20; statistiche storiche confrontate integralmente, competizioni estere ammesse solo se esplicite e con provenienza. Nessun nuovo conteggio hardcoded. |
| scripts/team-pages/test-all-teams.js:43 | Fonte della giornata effettivamente pubblicata, provider/scope/URL e coerenza matchday; non MD5 letterale. |
| scripts/test-champions-md02-integration.js:11 | Le 79 chiamate assert originarie rimangono sulla revisione c3f193bae2ebe6407693004489e6ffd8685ca63f: nessun hash/expected originale cambiato. Aggiunto controllo corrente separato. |
| scripts/test-support/champions-md02-current.js:7 | 42 chiamate assert con loop su 18 fixture, 396 titolari, 28.109 mercati e 92.818 selezioni; fonti ufficiali, ID, minuti, soglie, modificatori DUO/legni, quote e null P/fair odds/EV. Metadata snapshot quote verificato storicamente; contratti correnti confrontati direttamente col provider normalizzato corrente. |
| scripts/test-champions-pilot-predictions.js:70 | Riferimenti statici allineati al parametro analysis.fixtureId, activePilot e alle sezioni correnti; invariati controlli quantitativi. Il rendering reale è verificato anche dalla suite Letture. |
| scripts/test-champions-reading-page.mjs:122 | Parità esatta degli ID ordinati con Schedina e pulsanti, tutte le label canoniche, esclusioni archiviate assenti e pulsanti disabilitati per gare concluse; Lookman non deve ricomparire. |
| scripts/test-official-starter-policy.cjs:3 | Eliminata chiamata del test a buildRegistry, che persiste il registro. Verifica fonte/registro, sette archiviati correnti e riconciliazione distinta della coorte originale 58/54; quote/soglie/modificatori preservati, purge/reject MyCombo mantenuti. |
| scripts/test-champions-full-data-coverage.js:93 | Hash originario del builder verificato nel commit be95b1470714b023932f82da13586612c1c085b5; controlli semantici dei dati correnti e raw invariati mantenuti. |
| scripts/test-champions-historical-recovery-audit.js:103 | Calendario e builder verificati nelle revisioni esatte. Prova renderer mancante raccolta come errore, senza saltare i successivi controlli raw/report e senza trasformarla in PASS. |
| scripts/test-support/historical-files.js:13 | Lettore Git con commit completo obbligatorio, niente path traversal; fallback solo a revisioni esplicitamente riesaminate e hash originale verificato. Non certifica immutabilità dei file vivi al posto dei test correnti. |
| scripts/test-support/read-only-test.cjs:1 | Preload che impedisce scritture filesystem dalle suite. Tentativi writeFileSync con byte già identici sono confrontati e soppressi; cambiamenti effettivi sono respinti prima della scrittura. |
| scripts/test-historical-file-guards.cjs:1 | Prove negative: hash errato, evidenza storica assente, riferimento HEAD non fissato e path traversal devono fallire. |

### Copertura delle asserzioni

Il conteggio seguente misura chiamate assert nel sorgente, non il numero dinamico di verifiche: i loop controllano molte più righe.

| Suite | Prima (a84b0d46) | Dopo |
|---|---:|---:|
| team-pages/test.js | 206 | 206 |
| test-completed-teams.js | 21 | 26 |
| test-all-teams.js | 41 | 42 |
| MD2 integration | 79 | 79 + 42 nel supporto corrente |
| pilot-predictions | 69 | 69 |
| reading-page | 148 | 152 |
| official-starter-policy | 22 | 30 |
| full-data-coverage | 49 | 48 + guard delegato verificato nel supporto |
| historical-recovery | 66 | 66 + guard delegato |

Le asserzioni di hash originali sono conservate nel loro contesto storico. Una chiamata assert della full-data è sostituita da assertHistoricalFile, non rimossa senza controllo. I supporti aggiungono quattro assert di integrità storica e sei test positivi/negativi dedicati.

## Verifica finale delle 21 suite

Confronto con audit iniziale: **12 PASS / 9 FAIL → 18 PASS / 3 FAIL**. Sulle sole nove suite inizialmente fallite: **0 PASS / 9 FAIL → 8 PASS / 1 FAIL**. Le altre due failure finali sono nuove rispetto all'audit e derivano dai cambi concorrenti MD7; non sono state corrette fuori ambito.

Esecuzione finale con `node --require ./scripts/test-support/read-only-test.cjs <script>`. Il primo giro con guard aveva bloccato anche il tentativo di riscrittura identica del registro da import di BetSelection; il guard ora lo sopprime senza scrivere e le due suite interessate sono state rieseguite con PASS. Non è stato modificato il contratto produttivo o il comportamento MyCombo.

| Suite | Audit 15 ottobre | Finale |
|---|---|---|
| scripts/validate-data.js | PASS | PASS |
| scripts/team-pages/test.js | FAIL | PASS |
| scripts/team-pages/test-completed-teams.js | FAIL | PASS |
| scripts/team-pages/test-all-teams.js | FAIL | PASS |
| scripts/test-app-modules.mjs | PASS | FAIL |
| scripts/test-champions-md02-integration.js | FAIL | PASS |
| scripts/test-betting-selection-contract.js | PASS | PASS |
| scripts/test-personal-betslip.mjs | PASS | PASS |
| scripts/test-forecast-sync.js | PASS | PASS |
| scripts/test-champions-official-formations.mjs | PASS | PASS |
| scripts/test-prediction-evaluation-v2.js | PASS | PASS |
| scripts/test-future-data-readiness.js | PASS | PASS |
| scripts/test-champions-full-data-coverage.js | FAIL | PASS |
| scripts/test-champions-reading-page.mjs | FAIL | PASS |
| scripts/test-official-starter-policy.cjs | FAIL | PASS |
| scripts/test-css-modules.js | PASS | PASS |
| scripts/test-probable-lineups.js | PASS | PASS |
| scripts/test-player-identities.js | PASS | PASS |
| scripts/test-fantasy-listone.js | PASS | FAIL |
| scripts/test-champions-pilot-predictions.js | FAIL | PASS |
| scripts/test-champions-historical-recovery-audit.js | FAIL | FAIL |

Test aggiuntivi: `test-historical-file-guards.cjs` PASS; `test-lineup-field.mjs` PASS (tre fixture, 22 giocatori, posizioni/specchiatura/spaziatura). Nessuna nuova verifica grafica o cambiamento di layout effettuato.

## Problemi rimasti aperti

1. **C04 PARZIALE — prova storica renderer.** Il digest `205fbcaf2e011b143cb40eb6d75308fa410fd87ac6b736644765a5f9720d2a38` non è stato ritrovato nelle revisioni raggiungibili di `js/pages/champions.js`, nemmeno convertendo LF/CRLF. La suite conserva FAIL con `HISTORICAL_EVIDENCE_MISSING`, dopo aver completato gli altri controlli. Serve una copia originale verificabile o altra evidenza storica; non si riscrive il manifest congelato.
2. **Fuori C01–C04 — test-app-modules.mjs:45.** Regex pretende esattamente rounds 1–6 con parentesi chiusa dopo MD6; il lavoro concorrente ha aggiunto MD7. Classificazione TEST OBSOLETO, nessuna correzione qui.
3. **Fuori C01–C04 — test-fantasy-listone.js:58.** Fonte probabili MD7 e generated.sources.probableLineups.matchday=6. DISALLINEAMENTO DATI; richiederebbe workflow Fantacalcio distinto/rigenerazione, non eseguita.

## Integrità e concorrenza

Il checkout non è rimasto globalmente immutato: lavori esterni hanno creato `a84b0d46` e poi `fc2ac369`, aggiornando fra l'altro dati e selezioni MD7, renderer Schedina, package e builder correlati. Il secondo commit ha incluso anche file test di questo lavoro mentre erano nel checkout condiviso. **Questo agente non ha eseguito alcun commit, push, deploy, build o importer e non ha annullato commit esterni.** L'inclusione concorrente nel commit non è attribuita a un'azione Git di questo Blocco.

Confronto SHA-256 delle directory immediatamente prima delle correzioni e al controllo finale:

| Ambito | File iniziali/finali | SHA prima | SHA dopo | Esito |
|---|---:|---|---|---|
| data | 8725/8725 | e1b6b3ee5fef228c872d8b0da0a60d11fc48e93c3af1a5a1688dfb67ce10a646 | 933366c3ad416c6e47920b8a1303ef8f7a3cf2bbc89f87c6331986fa6ca1793e | CAMBIATO IN CONCORRENZA |
| js | 26/26 | 894a3654f67c5d5079e8356751355e732c95b9d2f1ed7ca72aecc3a2b9913a30 | 5b6e2670d30f959a815d7c2fc613f2095209f147f4229be099893b83b8a60dd6 | CAMBIATO IN CONCORRENZA |
| css | 13/13 | 774a72bad7cdd68e921f03007fa8f0db04e00b24fd001db47a4212e16afc3b8d | 774a72bad7cdd68e921f03007fa8f0db04e00b24fd001db47a4212e16afc3b8d | IDENTICO |
| assets | 357/357 | ac5392fb1e384c8c3388636a097377b9390ba26e48bda6b4ae4c619dd2f355ac | ac5392fb1e384c8c3388636a097377b9390ba26e48bda6b4ae4c619dd2f355ac | IDENTICO |
| statistiche-squadra | 20/20 | 4ecc7887364c4c2bb769f9b9739ced3ff32dd8a66c1c3f5118820b578f301a4c | 4ecc7887364c4c2bb769f9b9739ced3ff32dd8a66c1c3f5118820b578f301a4c | IDENTICO |
| fantachampions-2026-27 | 13/13 | b5215147b86e69fe17703931ca3d6be0c9d3cef32e9899e611e5db8eb741b07d | b5215147b86e69fe17703931ca3d6be0c9d3cef32e9899e611e5db8eb741b07d | IDENTICO |
| seria-a-2026-27-raw-archive-2026-08-24 | 3503/3503 | 275f9ee4c1bb2ca9a33210aec40d658bb04807f80e8cf010f4285439994ee149 | 275f9ee4c1bb2ca9a33210aec40d658bb04807f80e8cf010f4285439994ee149 | IDENTICO |

Gli hash aggregati usano l'elenco ordinato `path SHA256(bytes)`; il cambiamento di data/js non è una regressione attribuita ai test. Per gli artefatti critici controllati sotto, confronto byte-per-byte con il commit iniziale c8c48026:

| Artefatto | SHA-256 finale | Uguale alla base iniziale |
|---|---|---|
| data/normalized/champions-md02-integration-2026-27.json | 260883e6decb02f64eb9a70b047583e3962512ce0beac225fee4c5fac84bbb64 | SÌ |
| data/normalized/schedina-champions-md02.json | b80378b653120749f54c6d4c235769ea3925ca13ac0eba03a09d648143dcf683 | SÌ |
| data/normalized/odds/sisal/champions-league.json | 14564ea2005592b9055926d0e5bc7e3e96be01d1962fdd151c76bb151424493f | SÌ |
| data/normalized/odds/sisal/serie-a.json | f20324ea92aff7519e40e0efe2e0445cb60348583dbda7cb46dcb14d79fa3a1f | SÌ |
| data/technical-archive/official-nonstarter-markets.json | 533d73e3eff3554baf5100e26b0d2c1d6324b117ef7909b86a8fa16ce96cee5e | SÌ |
| data/normalized/official-starter-registry.json | a538699da69fb4652b1e87cba2ad7cfcec265bbcc42fb323b7ca4d54e8cff060 | SÌ |
| data/predictions/snapshots/2026-27/md-06.json | bb12972bedf482ab4210a11256ee3af1b68f442d264d3bdb106419c7aee38f78 | SÌ |
| data/predictions/exact-score-research/2026-27/md-06.json | ca1715a6727ecd4578e7080492f183986de3af48c680afcdcc5975d9171a193d | SÌ |

Inoltre sono passati BetSelection, store personale, forecast sync, ufficiali e future-data. Il guard di test vieta modifiche effettive al filesystem da queste esecuzioni. Non si rivendica un'invarianza globale delle previsioni MD7, perché un altro lavoro le ha aggiornate in parallelo: gli interventi del Blocco 1 sono limitati ai file test/supporto e ai due report.

## Vincoli, stato delle attività e verdetto

- **C01 COMPLETATO:** tre suite rose/campo PASS; requisiti correnti, fonte canonica e statistiche conservate.
- **C02 COMPLETATO:** integrazione storica e corrente, pilot e rendering Letture PASS; nessun ripristino di non titolari.
- **C03 COMPLETATO:** archivio corrente/coorte storica distinti, registro verificato senza persistenza dal test e cache MyCombo verificata senza cambiarne il funzionamento.
- **C04 PARZIALE:** builder/calendario storici recuperati e guard separati; prova del vecchio renderer ancora mancante e FAIL conservato.

**Verdetto finale: PARTIAL.** Otto anomalie iniziali risolte con copertura conservata o rafforzata; una evidenza storica non disponibile e due disallineamenti concorrenti fuori ambito impediscono un PASS globale. Nessuna modifica a motore/coefficienti/formule, dati storici congelati, quote/soglie/modificatori, mercati o selezioni da questo agente. Nessun intervento grafico, aggiornamento formazioni o rigenerazione massiva. Blocco 2 non iniziato. Lavoro fermato per verifica dell'utente.
