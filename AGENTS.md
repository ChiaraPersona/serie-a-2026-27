# Formazioni ufficiali e mercati individuali

Quando l'utente consegna una formazione ufficiale, acquisire entrambi gli undici nella fonte canonica della competizione. Lo stato probabile non attiva il filtro definitivo.

Per le sole fixture aggiornate, eseguire i builder esistenti di integrazione e previsione, utilizzando statistiche individuali, minuti previsti, ruolo, avversario e matchup. Non cambiare formule, pesi o criteri di approvazione. Confrontare ogni mercato individuale pubblicato con gli undici ufficiali, inclusi preferiti, cartellini, DUO, sostituti e pali/traverse. Rimuovere i non titolari dalle selezioni operative e conservarli esclusivamente nell'archivio tecnico.

Cercare alternative tra i titolari dopo il ricalcolo dei builder esistenti. Aggiungere una nuova selezione soltanto se supera i criteri già approvati e dispone di una quota provider verificata per lo stesso contratto. Non trasferire la previsione del giocatore escluso; non inventare quote o probabilità DUO. In mancanza di un'alternativa valida eliminare senza sostituire. Non aggiungere sostituzioni retroattive a gare concluse.

Eseguire `node scripts/apply-official-starter-policy.js` e il build del sito dopo ogni aggiornamento ufficiale. Il registro condiviso viene letto anche dal contratto BetSelection; il servizio dati e MyCombo applicano lo stesso filtro. Per nuove competizioni collegare la fonte ufficiale al registro in `scripts/apply-official-starter-policy.js`, usando fixture ID e player ID canonici; nessun lookup per nomi approssimativi.

Verificare esclusioni, sincronizzazione Lettura/Schedina/Preferiti/MyCombo, rigenerazione e selezioni salvate precedentemente. Preservare quote, soglie, modificatori e fixture estranee. Eseguire i test pertinenti e controllare desktop/mobile. Separare verifiche statistiche da liquidazioni certificate e rendimento originario da rendimento filtrato. Non eseguire commit, push o deploy senza autorizzazione.

## Regola permanente: fonti solo interne

Non mostrare nell'interfaccia pubblica del sito Serie A e Champions League sezioni Fonti/Provenienza, elenchi, collegamenti, provider o note dedicati alle fonti dei dati. Conservare integralmente fonti, URL, metadati, archivi e documentazione nei file interni e continuare a verificarli per ogni aggiornamento. Non alterare statistiche, calcoli, motori o informazioni operative per applicare questa regola. Le nuove pagine devono usare la policy condivisa `js/public-presentation.js` e non aggiungere nuove sezioni pubbliche sulle fonti. Conservare attribuzioni e avvisi legalmente obbligatori: marcarli con `data-required-attribution` o `data-legal-notice`, senza nasconderli come provenienza statistica. Conservare inoltre stato ufficiale/probabile, limiti statistici e indicazioni N/D, esprimendoli senza riferimenti alle fonti.

## Economia del contesto Codex

- Partire da nomi e percorsi (`rg --files`, `rg -l`) in directory pertinenti; cercare poi simboli e righe mirate. Consultare [la mappa operativa](docs/codex-operational-map.md) prima di riscoprire una pipeline.
- Escludere inizialmente da ricerche generiche dipendenze, raw, archivi, `tmp/`, `output/`, `outputs/`, `reports/` e `work/`; aprirli esplicitamente quando pertinenti. Non identificarli come radice del progetto.
- Per JSON grandi estrarre con un parser solo fixture/player ID, campi, conteggi o campioni necessari; evitare dump integrali e ricerche testuali su intere righe JSON minificate.
- Per verifiche UI riutilizzare proiezioni leggere e riepiloghi esistenti; verificare gli originali per identità, contratti, calcoli, provenienza e dettagli omessi. Non rigenerare dati per la sola consultazione.
- Restituire sintesi, errori pertinenti e percorsi delle evidenze; ampliare progressivamente letture e output quando necessario, senza omettere verifiche obbligatorie. Prima di eseguire un comando controllarne gli effetti: nomi `test`, `audit` o `presentation-only` non garantiscono sola lettura.
