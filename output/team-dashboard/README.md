# Restyling statistiche squadra — 15 ottobre 2026

## Modifiche
- Template unico per tutte le 20 squadre, con panoramica e copertura dati, statistiche per argomento, tattica e giocatori in una pagina continua.
- Superfici basate sui token glass chiaro/scuro esistenti; nessuna dipendenza aggiunta.
- Griglie responsive, tabelle allineate, comparatore e classifiche uniformati.
- Campo verticale con portiere in basso e spaziatura adattata al numero di giocatori di ciascuna linea.
- Il componente `renderLineupField` aggiunge l'opzione `orientation: "vertical"`; l'orientamento predefinito resta orizzontale.
- Riutilizzati `lineupPositions`, `renderLineupKit`, palette, fantasie e CSS delle maglie delle Letture. Nessuna duplicazione dei disegni delle maglie.

## File
- js/team-squads.js
- js/components/lineup-field.mjs
- css/team.css
- css/styles.css
- scripts/build-site.js
- scripts/team-pages/test.js (assert sui renderer adeguati al componente condiviso)
- scripts/test-lineup-field.mjs
- scripts/check-team-dashboard.cjs
- statistiche-squadra/*.html (20 shell rigenerate, versione asset aggiornata)
- output/team-dashboard/ (baseline dei contenuti, screenshot e rapporto responsive)

## Verifiche
- Build sito completato. Questo intervento non ha modificato statistiche o fonti; durante la verifica un altro lavoro ha aggiornato formazioni e dati nella cartella condivisa, preservati integralmente.
- Atalanta, Juventus, Parma e Napoli a 1440, 1280, 768 e 390 px: 16 verifiche, senza overflow pagina e senza sovrapposizioni tra giocatori; portiere in basso.
- Verificati anche cambio giocatore del comparatore e apertura/chiusura delle schede individuali a 390 px, senza errori JavaScript.
- Il browser di audit serve copie Git iniziali dei JSON squadra per isolare il restyling dagli aggiornamenti concorrenti, senza riscrivere file.
- Confronto prima/dopo identico per tutti gli indicatori stagionali, stile di gioco, classifiche, risultati iniziali del comparatore, rosa e collegamenti delle quattro squadre.
- Screenshot delle sezioni Atalanta disponibili accanto alle catture complete.
- Campo orizzontale Milan–Atalanta delle Letture a 1280 px: screenshot prima/dopo identico pixel per pixel, 22 giocatori.
- Test componenti formazioni: 3 fixture, 22 giocatori in orizzontale e 11 per campo verticale, sorgenti non mutate.
- Test CSS superato. Test moduli applicazione inizialmente superato; dopo l'aggiornamento concorrente della Schedina alla MD7 si arresta sull'assert legacy che richiede esattamente le prime sei giornate (scripts/test-app-modules.mjs:45). Nessuna modifica alla Schedina da parte di questo intervento.

## Limite del test generale
`scripts/team-pages/test.js`, dopo gli adeguamenti degli assert alla struttura condivisa, supera i controlli delle pagine squadra e si arresta sul controllo preesistente della homepage: "I selettori classifica devono essere link testuali separati da una barra" (riga 301, contratto standings-switch-separator). La homepage non fa parte di questo intervento. Una precedente discrepanza MD6/MD7 è scomparsa durante l'aggiornamento concorrente dei dati.

Nessun commit, push o deploy. Le modifiche preesistenti in output restano preservate.
