# Uniformità Letture Champions / Serie A

Verifica del 20 ottobre 2026.

## Modifiche
- `js/pages/champions.js`: MD3 montata tramite lo shell condiviso; catalogo completo e MyCombo collocati nei Pronostici.
- `js/pages/reading-detail/champions-layout.mjs`: adattamento di sola presentazione degli artefatti MD3; campo, scenario e analisi condivisi; conservazione delle proiezioni, delle disponibilità e dei campioni arbitrali separati.
- `js/pages/reading-detail/shell.mjs`: estensione del montaggio Champions prima della finalizzazione delle ancore.
- `js/pages/reading-detail/forecasts.mjs`: stessa tabella e stesso store della schedina; selezioni Champions abilitate solo con i gate esistenti, contesto originale conservato.
- `css/reading-detail.css`: palette dedicata Champions, fondale blu completo e campo blu; geometria condivisa invariata.
- `champions-league.html`: shell rigenerato con `--champions-page-only --presentation-only`.

## Verifiche superate
- Confronto visivo con Milan–Atalanta Serie A e Champions MD3/MD2 a 1440, 390 e 320 px.
- Ordine delle sette sezioni, ancore e focus; nessun overflow di pagina.
- Filtri titolari/panchinari; aggiunta e rimozione dalla schedina, dialog e persistenza dopo reload.
- Tutte le 18 fixture MD3 a 390 px: sette sezioni, nessun errore JavaScript, conteggio completo delle righe giocatore rispetto all'artefatto canonico (all-md3.json).
- Test: reading-detail-adapters, reading-detail-internals, personal-betslip, betting-selection-contract, champions-reading-page, champions-md3-probable, champions-md3-approved, champions-md3-referees, champions-md3-squads, champions-md3-lineup-managed, css-modules.
- `git diff --check` senza errori; nessuna modifica ai dati attribuibile a questo intervento.

La suite completa, che comprende builder statistici e importazioni, non è stata eseguita. Nessun commit, push o deploy eseguito da questo intervento. Il checkout contiene altre modifiche concorrenti, lasciate intatte.
