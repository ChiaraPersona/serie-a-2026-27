# Storico individuale tiri per avversario nelle Letture Champions

Nelle schede giocatore espanse delle Letture MD3/MD4 sono mostrate le ultime cinque presenze osservate disponibili: data, avversario, minuti, tiri e SOT. La presentazione riusa le classi del registro Serie A, per titolari e riserve. Le identità sono canoniche, senza associazioni approssimative. La selezione esclude presenze successive alla gara e acquisizioni successive alla sua data. In mancanza di serie per partita viene mostrata l'indisponibilità; non si ricavano presenze dagli aggregati.

`scripts/build-champions-player-match-history.cjs` usa il medesimo adattatore delle osservazioni riconciliate e dei minuti verificati dei builder Champions. L'adattatore espone una proiezione descrittiva separata con avversario identificato dai team ID del referto, gara conclusa e data verificata. La proiezione `data/generated/champions-player-match-history.json` comprende 576 giocatori e 4.152 presenze, con cutoff del corpus al 20 ottobre. Fonti, URL e archivi originali rimangono nei file interni; nessuna provenienza viene esposta nell'interfaccia. Il nuovo storico è descrittivo e non certifica liquidazioni.

Il build delle pagine Champions rigenera automaticamente questa proiezione. Nessun ricalcolo dei pronostici; catalogo, quote, probabilità, formazioni e scenari esistenti sono invariati. Non eseguiti commit, push o deploy.

Verifiche: test storico (identità, zeri, dati mancanti, soglia temporale, escaping), test MD4 contratti esatti e caricamento panchine, 44 stati browser desktop/mobile delle 18 gare e regressione Schedina MD3. Il browser controlla lo storico di ogni giocatore, inclusi i panchinari, e acquisisce il dettaglio di Mbappé. Evidenze: `output/champions-player-match-history/browser/`.
