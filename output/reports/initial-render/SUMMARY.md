# Verifica primo rendering — 18 ottobre 2026

## Causa e correzione

Le letture inserivano la vista precedente nel DOM prima di attendere import JavaScript, CSS della lettura e dati di approfondimento. Il tema del body veniva impostato soltanto al montaggio finale. Il browser poteva quindi dipingere una vista intermedia realmente diversa.

Ora il CSS definitivo è bloccante nell'head; il tema della rotta viene impostato da uno script sincrono immediatamente dopo l'apertura del body, prima dei contenuti. Moduli e approfondimenti, incluso lo storico arbitrale aggiunto contemporaneamente nel workspace, vengono preparati prima di inserire il contenuto. Il montaggio conclusivo non contiene attese di rete.

I CSS globali mantengono esattamente l'ordine del manifest css/styles.css, esposti come link espliciti e versionati tramite hash del contenuto. Le versioni delle entry JavaScript delle letture sono aggiornate. Non sono state introdotte regole di occultamento della pagina o attese artificiali. Gli stili della vista legacy restano necessari alla relativa rotta e al fallback.

## Risultati

- 31 HTML pubblici: ordine CSS, caricamento bloccante, hash degli asset e generazione idempotente verificati.
- Matrice ricariche: 8 rotte rappresentative, 1440 e 390 px, ricarica normale, forzata tramite CDP ignoreCache e cache disabilitata; 48 casi prima e 48 dopo. Include homepage, indice e dettaglio Serie A, indice e dettaglio Champions, Schedina MD7, Inter e arbitri.
- Stress controllato: ritardo di 100 ms sulle risposte dei moduli della lettura, soltanto nel server di test. Fotogrammi con vista precedente: 192 prima, **0 dopo**. Zero errori JavaScript e zero CSS locali non caricati.
- Tema di sfondo delle letture: una sola variante osservata nei fotogrammi dopo la correzione, in tutte le modalità e dimensioni.
- Confronto separato su file congelati, con animazioni disattivate soltanto nel browser di test: 32 casi; **zero differenze nei testi, nei box geometrici e negli stili campionati**. Tutte le 16 coppie di schermate hanno dimensioni uguali; 10 sono identiche anche a livello di pixel. Le altre hanno differenze di rasterizzazione/caricamento non accompagnate da differenze nei box o negli stili campionati; non costituiscono un confronto pixel-perfect completo.
- Le misure locali non indicano una penalizzazione significativa del caricamento; la mediana di DOMContentLoaded nella matrice è 76 ms prima e 82,8 ms dopo. Non è un benchmark di rete o di produzione.

## Controlli del codice

Passano test-initial-render.cjs, test-css-modules.js, test-reading-detail-adapters.mjs, test-reading-detail-internals.mjs, test-reading-prediction-v2.mjs, test-champions-reading-page.mjs e test-reading-referee-history.mjs. git diff --check passa.

test-app-modules.mjs segnala un'asserzione preesistente sulla forma letterale del registro delle giornate in betting.js, file non modificato dalla correzione.

Il build utilizzato è scripts/build-site.js --presentation-only: rigenera gli HTML senza eseguire builder statistici o dei pronostici. Gli aggiornamenti concorrenti a storico arbitrale, tattica e relativi dati sono stati preservati; il confronto su file congelati evita di attribuirli a questa correzione. Nessun comando di commit, push o deploy è stato eseguito da questa sessione.

## Artefatti

- reload-matrix.json: matrice completa delle ricariche.
- report.json e differences.json: confronto grafico su file congelati.
- pixel-comparison.json e before/after PNG: schermate e confronto raster.
- scripts/check-initial-render.cjs: riproduzione del controllo; CHECK_VISUAL=1 seleziona il confronto grafico.
