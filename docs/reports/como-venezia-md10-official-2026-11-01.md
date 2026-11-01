# Como–Venezia MD10 — formazioni ufficiali

Aggiornamento locale del 1 novembre 2026 sulla comunicazione dell'utente: Como 4-2-3-1 (Cesc Fàbregas), Venezia 3-5-2 (Davide Nicola). Riconciliati tutti i 22 titolari con gli ID canonici. Gli altri giocatori delle rose canoniche sono registrati come riserve secondo l'indicazione ricevuta. Nessun minuto effettivo presunto; numeri di maglia dalle anagrafiche esistenti.

Ricalcolo limitato a `como-venezia-2026-27-md-10` con builder previsionale, catalogo e publisher esistenti; formule, pesi e criteri invariati. Eseguita la policy ufficiale e rigenerate Lettura/Schedina. Confrontati previsioni, Letture e cataloghi delle altre fixture con il backup: invariati.

Esclusi e archiviati Yeboah DUO 1+ tiri in porta (pali/traverse inclusi) e DUO 3+ tiri perché non titolare. Superato dal ricalcolo il precedente Ramón DUO 2+ tiri. Nuovi contratti ammessi dai criteri esistenti e verificati nello snapshot provider: Hainaut DUO 1+ tiri a 1.57 e Ramón DUO 1+ tiri a 1.20. Nessuna previsione trasferita dagli esclusi; probabilità, quota equa ed EV DUO restano null/N/D. Quote, contratti, soglie e modificatori delle selezioni mantenute invariati. Nessuna liquidazione o modifica al rendimento.

Il build ordinario acquisisce i congelamenti prospettici previsti dai protocolli attivi: rimangono ricerca separata dalle selezioni operative. Backup compresso, previsione candidata, report, validazione e screenshot in `output/como-venezia-md10-official/`.

Nessun commit, push o deploy.

Verifiche superate: `test-como-venezia-md10-official.mjs` (22 identità, riserve escluse, tiratori solo titolari, contratti/quote/soglie/modificatori, DUO null, archivio e vecchi salvataggi), `test-como-venezia-md10-projection.mjs`, `test-schedina-md10.mjs` (210 esiti pubblici quotati nella giornata), `test-official-starter-policy.cjs` (anche MyCombo), `test-betting-selection-contract.js`, `test-personal-betslip.mjs`, `test-forecast-contract-dedup.mjs`, `git diff --check`. Browser Edge a 1440/390 px: tutti i 22 nomi ufficiali sul campo, due intestazioni ufficiali, contratti rimossi assenti, nessun overflow o errore JavaScript; verificate Lettura e Schedina. Edge avviato fuori dalla sandbox per il limite noto dell'ambiente.
