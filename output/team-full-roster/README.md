# La rosa completa

Sezione aggiunta nel template condiviso, subito dopo formazione e stile e prima delle statistiche approfondite. All'apertura sono visibili solo il titolo e “Visualizza rosa completa”.

Il pannello usa details/summary con ARIA sincronizzato e contiene quattro tabelle compatte (Portieri, Difensori, Centrocampisti, Attaccanti): nome, numero, ruolo, presenze, minuti, gol e assist. Le tabelle si possono scorrere internamente su mobile e sono accessibili da tastiera.

## Provenienza e completezza

- 20 rose, 533 giocatori: corrispondenza esatta degli ID di team.squad con tutti i giocatori attivi della fonte canonica data/sources/fantacalcio-quotations-2026-27.json; nessun filtro sulle presenze.
- La fonte rosa salvata nel progetto è aggiornata al 4 settembre 2026 per tutte le squadre. Questa verifica certifica la completezza rispetto allo snapshot locale; non certifica eventuali movimenti successivi. La data è visibile nel pannello, distinta da quella delle probabili formazioni.
- Nessun numero di maglia disponibile nei dataset attuali: tutti restano N/D. Il renderer mostra un numero soltanto se il dato viene fornito nel profilo. Nessun valore recuperato da nomi approssimativi, vecchie stagioni o formazioni della singola partita.
- Le statistiche riusano currentSquadLeaderboardRows: esclusivamente Serie A 2026/27 sui tabellini disponibili, senza includere il 2025/26. Un giocatore senza dati resta nella rosa con N/D; gli zero effettivamente presenti nei tabellini restano zero.

## Implementazione

- js/team-squads.js: nuova sezione fullSeasonRoster.
- css/team.css: tabelle compatte, selettori confinati al template individuale.
- css/styles.css e scripts/build-site.js: cache aggiornata e rigenerazione delle sole 20 shell HTML tramite --team-pages-only.
- scripts/check-team-editorial.cjs, scripts/team-pages/test.js: nuova sezione e verifica di tutti gli ID.
- scripts/test-no-shirt-numbers.js: consente soltanto il riferimento del renderer al numero, lasciando invariata la verifica dell'assenza del dato nei dataset attuali.

Dataset, campo, calcoli, classifiche e comparatore esistenti non modificati. Nessun commit, push o deploy.

Verifiche concluse: 26 layout browser (20 squadre a 1440px; Atalanta, Inter e Frosinone anche a 768 e 390px), tutti gli ID conservati, quattro gruppi per ruolo, pannelli aperti/chiusi da tastiera, nessun overflow della pagina. Passati anche i confronti preesistenti su campo, statistiche, classifiche, comparatore e filtri. Test team-pages, CSS e gestione numeri mancanti superati.
