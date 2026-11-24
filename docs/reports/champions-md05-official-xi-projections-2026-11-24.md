# Champions MD5: proiezioni da undici ufficiali

Il filtro documentale richiedeva sia undici sia panchina ufficiali, mentre consentiva già le proiezioni degli undici probabili con rosa provvisoria. Su richiesta dell'utente, gli undici ufficiali possono ora usare la stessa copertura provvisoria della rosa. La panchina resta non confermata; `officialBenchVerified` registra il dato effettivo. Formule, pesi, budget minuti, riconciliazione dei volumi e approvazione statistica restano invariati.

Ricalcolata soltanto `ucl-2026-27-md05-02`, Galatasaray–Aston Villa: nove titolari di movimento per squadra con proiezioni, nove selezioni DUO suggerite con contratti e quote verificati. Batrakov e Harwood-Bellis restano senza proiezioni per storico/minuti insufficienti; i portieri sono esclusi dalle metriche di tiro. Probabilità, fair odds ed EV dei contratti DUO restano null. Nessuna selezione è promossa ad approvata statisticamente.

Verifiche: test di regressione `test-champions-official-xi-projection.cjs` prima rosso e poi verde; `test-champions-md04.cjs --matchday 5`; `test-personal-betslip.mjs`; filtro titolari ufficiali; build sito Champions; browser MD5 a 1440 e 390 px con tutte le 18 Letture, sincronizzazione Schedina, selezioni salvate e regressioni MD3/MD4. Le fixture estranee restano invariate secondo il controllo del builder e della suite MD5. Evidenze browser in `output/champions-md05/browser/report.json`.

Il ricalcolo non aggiorna la data delle osservazioni individuali sottostanti e non certifica liquidazioni o rendimento. Commit e push autorizzati esplicitamente dall'utente; le modifiche locali estranee non fanno parte di questa correzione.
