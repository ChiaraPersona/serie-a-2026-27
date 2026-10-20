# Champions MD3: probabili formazioni e catalogo condiviso

Aggiornamento locale del 20 ottobre 2026. Nessun commit, push o deploy eseguito dall'agente.

## Risultato

- 36 undici BeSoccer, 396 titolari probabili, 32 squadre con almeno una variazione rispetto alla fonte precedente.
- Convocati documentati per 3 squadre; per le altre si usa la rosa completa disponibile, esclusi titolari, indisponibili, squalificati e dubbi. 707 panchinari complessivi.
- 78 pronostici nel catalogo operativo: 7 singole preesistenti e 71 individuali. 59 individuali hanno una quota DUO esatta; 12 sono previsioni individuali senza quota.
- Identità non risolta: João Simões, assente dalla rosa canonica corrente; nessun ID, dato o pronostico inventato.

## Flusso

Snapshot visibile e mappature individualmente verificate: data/raw/lineups/besoccer/champions-md03-2026-10-20.json. Importatore: scripts/import-champions-md3-besoccer.cjs. Fonte canonica: data/sources/champions-probable-formations-md03-2026-27.json.

Rigenerazione: node scripts/build-champions-md3-schedina.cjs, poi node scripts/build-site.js --md3-pages-only --presentation-only. Il primo comando esegue i builder esistenti delle proiezioni e del catalogo preliminare, quindi costruisce il catalogo operativo in data/normalized/schedina-champions-md03.json#marketCatalog. Lettura, Schedina e MyCombo leggono questo stesso catalogo.

La selezione individuale riusa rank-shooter-candidates e md06-player-forecast-integration: stessa classifica primaria, criteri di minuti/sostegno statistico, scelta delle soglie e contratto DUO della Serie A. Il modello statistico Champions esistente conserva formule e riconciliazione; non viene dichiarato calibrato come il modello Serie A. Le previsioni collettive restano quelle già calcolate: nessun coefficiente arbitrario sulle formazioni è stato aggiunto. Per la policy corrente sono esclusi Under, doppia chance 12, falli individuali e corner di frazione. Gli esclusi sono archiviati in data/technical-archive/champions-md03/policy-excluded.json.

I panchinari partecipano al budget minuti e alla riconciliazione dei volumi; non diventano titolari né ricevono automaticamente pronostici da titolare. I minuti non disponibili restano null; zero minuti osservati resta zero ed esclude la proiezione. Le soglie dei panchinari non sono modellate. Lo stato probabile non attiva il filtro ufficiale.

Le quote sono associate solo tramite ID provider già riconciliati nell'archivio Champions, fixture, giocatore, codice mercato e soglia esatti. Nessuna ricerca approssimativa nuova. Le quote del contratto DUO non sono applicate all'evento del solo giocatore: probabilità DUO, quota equa ed EV restano null. Le righe senza quote si comportano come le previsioni senza quota della Serie A; la combinazione non riceve un totale utilizzabile inventato.

I 7 contratti approvati originari sono preservati in slips. Cinque hanno una quota corrente diversa, registrata separatamente dalla quota originaria; la fonte provider corrente resta autorevole per il catalogo operativo.

## Verifiche

Superati: test-champions-md3-lineup-managed.mjs, test-champions-md3-probable.mjs, test-champions-md3-callups.mjs, test-champions-md3-squads.mjs, test-champions-md3-preliminary.mjs, test-personal-betslip.mjs, test-forecast-sync.js e test-schedina-md07.mjs.

Browser Edge: 1440, 390 e 320 px, tutte le 18 schede nella Schedina, stessi ID nelle Letture, panchine coerenti, selezione quotata e senza quota salvata e recuperata dopo reload/cambio pagina, nessun overflow né errore JavaScript. Evidenze: browser-results.json e screenshot reading-/schedina-*.png nella presente cartella.

Confronto SHA-256 prima/dopo di tutte le fonti e normalizzati estranei a MD3: invariati. Prima e seconda giornata Champions e Serie A non rigenerate. Contratti approvati originali invariati.

Test storico non superato: test-md06-suggested-forecasts.js cerca quote MD6 nello snapshot Serie A corrente; manca il mercato di forecast:v2:genoa-fiorentina-2026-27-md-06:franco-mastantuono:sot:2. Il controllo sui dati MD7 e i controlli mirati passano. I dati MD6 e lo snapshot Serie A sono invariati rispetto all'inizio del lavoro.
