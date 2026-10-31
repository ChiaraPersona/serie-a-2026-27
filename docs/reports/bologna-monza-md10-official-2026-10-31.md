# Bologna–Monza MD10 — formazioni ufficiali

Aggiornamento locale del 31 ottobre 2026 su comunicazione dell'utente. Acquisiti 22 titolari con ID canonici, moduli 3-4-2-1 per entrambe le squadre. Gli altri giocatori della rosa canonica sono registrati come riserve secondo l'indicazione dell'utente; nessun minuto effettivo di impiego presunto.

Eseguito il builder previsionale esistente soltanto per `bologna-monza-2026-27-md-10`, catalogo con modelli e validazione esistenti, policy ufficiali e build Lettura/Schedina. Formule, pesi e criteri invariati. Le previsioni, le Letture e i cataloghi delle altre fixture sono identici allo snapshot precedente. Corretto nell'orchestratore riutilizzato un riordino degli elenchi suggestions delle fixture estranee, ripristinando i valori originali.

Rimossi e archiviati i DUO Jay Robinson 1+ tiri in porta (pali/traverse inclusi) e 2+ tiri. Aggiunto il DUO Nicolò Cambiaghi 2+ tiri dopo ricalcolo e ammissione dei criteri esistenti, con contratto provider verificato. Quote, contratti, soglie e modificatori delle selezioni mantenute sono invariati. Probabilità, quota equa ed EV DUO restano null/N/D. Nessuna liquidazione o modifica al rendimento.

Verifiche superate: test-bologna-monza-md10-official.mjs (22 identità, isolamento, contratti, quote, DUO, archivio, vecchi salvataggi e rifiuto aggiunte dei non titolari), test-schedina-md10.mjs (213 esiti pubblici quotati sull'intera giornata e sincronizzazione), test-bologna-monza-md10-projection.mjs, test-official-starter-policy.cjs (anche MyCombo), test-betting-selection-contract.js, test-personal-betslip.mjs. Browser Lettura/Schedina a 1440 e 390 px: due formazioni ufficiali, esclusioni, nessun overflow o errore JavaScript. Edge eseguito fuori dalla sandbox, che ne impediva l'avvio. Un errore transitorio di scrittura del report Schedina è stato risolto con riesecuzione superata.

Il primo build ha acquisito gli snapshot prospettici previsti dai protocolli attivi; i successivi build di verifica hanno usato SPATIAL_CAPTURE_DISABLED=1. Questi artefatti restano ricerca separata dalle selezioni operative.

Evidenze: `output/bologna-monza-md10-official/report.json`, `validation.json`, screenshot `lettura-1440.png`, `lettura-390.png`, `schedina-1440.png`, `schedina-390.png`. Snapshot precedente in `before.json`. Nessun commit, push o deploy.
