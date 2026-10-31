# Udinese–Roma MD10 — undici ufficiali

Aggiornamento locale del 31 ottobre 2026 su comunicazione dell'utente: 22 titolari riconciliati con ID canonici, entrambe le formazioni 3-4-2-1. Gli altri giocatori delle rose canoniche sono riserve secondo l'indicazione ricevuta. Numeri di maglia riutilizzati dalle anagrafiche, nessun impiego effettivo presunto.

Eseguiti il builder previsionale esistente con filtro sulla sola fixture `udinese-roma-2026-27-md-10`, catalogo con modelli e validazione congelati già approvati, publisher condiviso, `apply-official-starter-policy.js` e build Lettura/Schedina. Formule, pesi e criteri invariati. Previsioni, Letture e cataloghi delle altre fixture identici al backup precedente. Il build ha acquisito gli snapshot prospettici previsti dai protocolli attivi per le gare ancora acquisibili; rimangono ricerca separata.

Nessun contratto precedente riguardava un non titolare dei nuovi undici. Il ricalcolo ha superato i precedenti DUO Davis 1+ tiri in porta, Soulé 1+ tiri in porta e Davis 2+ tiri. Ammessi con gli stessi criteri e quote verificate: Davis DUO 2+ tiri in porta a 3.50, Soulé DUO 2+ tiri in porta a 2.75 (pali/traverse inclusi in entrambi), Davis DUO 3+ tiri a 2.25. Nessuna previsione trasferita da giocatori esclusi. Probabilità, quota equa ed EV DUO restano null/N/D. Quote, soglie, contratti e modificatori delle selezioni mantenute sono identici al backup. Nessuna liquidazione o modifica al rendimento.

Superati: `test-udinese-roma-md10-official.mjs` (identità, filtro di tutte le riserve, tiratori solo titolari, isolamento, contratti, DUO, archivio e simulazione esplicita di vecchio salvataggio relativo a una riserva), `test-udinese-roma-md10-projection.mjs`, `test-schedina-md10.mjs` (212 esiti pubblici quotati sull'intera giornata), `test-official-starter-policy.cjs` (anche MyCombo), `test-betting-selection-contract.js`, `test-personal-betslip.mjs`, `git diff --check`. I test sintetici non scrivono quote o contratti nei dati operativi.

Browser Edge a 1440 e 390 px: tutti i 22 nomi ufficiali sul campo, due intestazioni ufficiali, assenza dei tre vecchi contratti, nessun overflow o errore JavaScript. Verificati Lettura e Schedina; Edge avviato fuori dalla sandbox per il limite noto dell'ambiente.

Evidenze in `output/udinese-roma-md10-official/`: `before.json.gz` (backup compresso), `prediction.json`, `report.json`, `validation.json` e quattro screenshot. Nessun commit, push o deploy.
