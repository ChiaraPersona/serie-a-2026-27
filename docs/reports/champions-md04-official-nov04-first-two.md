# Formazioni ufficiali del 4 novembre 2026, prime due gare

Acquisite dalle quattro immagini utente archiviate in `data/sources/official-lineup-evidence/champions-md04-nov04-first-two/` le formazioni di AEK–Real Madrid e Fenerbahçe–Liverpool: 44 titolari e 44 riserve con ID canonici verificati. Moduli 4-4-2 / 4-2-3-1 e 4-3-3 / 4-2-3-1. Numeri di maglia trascritti dalle immagini, inclusi Arriaga 16, Varga 19 e Peprah 21.

Eseguiti importazione ufficiale, registro condiviso, builder MD4 `--official --fixtures ucl-2026-27-md04-10,ucl-2026-27-md04-11`, filtro titolari e build delle pagine Champions/Schedina. Formule, pesi e criteri invariati. Restano 15 contratti individuali operativi nelle due gare. I due precedenti contratti di Barnabás Varga sono archiviati e rimossi anche dalle selezioni personali ripristinate. Nessuna probabilità DUO inventata, nessuna liquidazione certificata. Quote, identità e modificatori dei contratti mantenuti sono invariati. Le altre 16 fixture sono identiche nella Schedina, nelle proiezioni individuali e negli scenari condivisi.

Il controllo browser ha identificato un problema esistente: il caricamento generico filtrava le riserve anche dall'elenco descrittivo MD4. `js/services/data-service.js` conserva ora questo dataset descrittivo; i cataloghi operativi restano filtrati. Il test `scripts/test-champions-md04-lineup-loading.mjs` verifica entrambe le proprietà.

Verifiche superate: test MD4 (18 gare, contratti esatti), scenari condivisi, filtro titolari/identità/modificatori/MyCombo, audit delle due gare e ripristino selezioni salvate, controllo diretto dell'assenza di X secche selezionate, `git diff --check`, 44 stati browser desktop/mobile. Evidenze in `output/official-md04-nov04-first-two/`.

Il test storico `test-champions-no-draw.mjs` fallisce il confronto immutabile dei contratti individuali con la fotografia del 2 novembre: quella baseline precede gli aggiornamenti ufficiali e non rappresenta il catalogo corrente. Non è stato modificato né dichiarato superato. L'invariante corrente di assenza X secche è verificata direttamente e dal browser.

Il builder esistente ha inoltre registrato le revisioni prospettiche automatiche, mantenendo i primi snapshot. Nessun commit, push o deploy.
