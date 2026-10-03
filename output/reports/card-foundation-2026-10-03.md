# Card Data Integrity & Target Definition — PHASE 1

3 ottobre 2026 · repository locale serie-a-2026-27 · modello cartellini congelato.

La riparazione e i contratti sono implementati e verificati. La foundation non è ancora pronta per calibrare un target bookmaker: mancano contesti individuali certificati, la variante DUO delle etichette abbreviate deve essere verificata e i raw storici arbitri richiesti dai validator sono assenti. Nessuna pubblicazione, tuning o probabilità Card V2 validata.

## A. DATA MODEL

Core condiviso: [js/pages/disciplinary.mjs](C:/Users/utente/Desktop/seria-a-2026-27/js/pages/disciplinary.mjs); schema: [data/schemas/disciplinary-event.schema.json](C:/Users/utente/Desktop/seria-a-2026-27/data/schemas/disciplinary-event.schema.json). Versioni card-data-v1/card-targets-v1, distinte dalle versioni del motore.

| eventType | Definizione | Record evento | Sanzioni fisiche rappresentate | Punti standard se eleggibile |
| --- | --- | --- | --- | --- |
| yellow | Giallo ordinario | 1 | 1 | 1 |
| yellowRedCard | Secondo giallo con conseguente espulsione | 1 | 2 | 1 |
| redCard | Rosso diretto | 1 | 1 | 1 |
| unknown | Classificazione irrisolta | Evento preservato | N/D | N/D |

Campi: playerId, playerName, teamId; minute/addedTime; eventType; period; eventOrder; participationStatus; onPitchAtEvent, benchEvent, postMatchEvent; source, sourceEventType, classificationConfidence e contextSource. I campi di compatibilità player/card/team restano. Unknown/null non diventano gialli, rossi, false o zero. Nessun ID è costruito dal nome irrisolto.

Conservati tutti i 164 eventi MD1–MD5 di 50 referti: 162 yellow, 1 redCard, 1 yellowRedCard, zero duplicati esatti. I 164 periodi e i 164 stati post-match restano sconosciuti; lo stato on-pitch è verificabile per un solo evento (Sabelli, false). La completezza della lista non certifica l'eleggibilità per ogni mercato.

## B. TARGET DEFINITIONS

| Target | Esito positivo | Requisiti distinti |
| --- | --- | --- |
| PLAYER_YELLOW | Almeno un yellow ordinario eleggibile | yellowRedCard da solo e redCard non soddisfano questo target stretto |
| PLAYER_ANY_CARD | Almeno un yellow/yellowRedCard/redCard eleggibile | Regola, periodo, panchina/post-match e partecipazione noti |
| PLAYER_DUO_CARD | Giocatore OR suo diretto sostituto qualificato riceve una carta eleggibile | Sostituzioni complete, ID univoci, regola; nessuna formula di probabilità |
| FIRST_BOOKED_PLAYER | Autore del primo yellow ordinario eleggibile | Universo completo, clock/recupero, ordine ufficiale o insieme di ID a pari tempo, contesto campo/panchina/sostituzioni |
| TEAM_CARD_POINTS | Totale esatto secondo ruleId | Punti per categoria, massimo individuale, periodo e trattamento panchina/post-match espliciti |

Regola punti standard Sisal: 1 punto per giallo ordinario, 1 per espulsione da secondo giallo (il secondo giallo stesso è escluso), 1 per rosso diretto, massimo 2 per giocatore; tempi regolamentari e recupero; esclusi panchina, giocatori già sostituiti e carte dopo il fischio finale. Un giallo seguito dal secondo-giallo/espulsione produce due record, tre sanzioni fisiche e due punti eleggibili. bookings.length non è il target.

Fonti verificate: [Regolamento Sisal Calcio](https://www.sisal.it/content/dam/new-dam/italy/canali/sisal-it/doc-pdf/scommesse/info-scommesse/calcio.pdf), pagine stampate 428–429 per punti e 233–234 per la variante DUO esplicitamente comprensiva di panchina/rigori/post-partita. Le regole on-pitch e ALL_CONTEXTS sono contratti separati; quest'ultima richiede feed ALL_CONTEXTS certificato. L'etichetta locale CARTELLINO SI/NO (DUO) INC TS non identifica da sola la variante: è obbligatorio un cardRuleId esplicito prima del settlement corrente. Target individuale e DUO restano diversi.

## C. NORMALIZATION FIXES

Johan Vásquez, Genoa–Frosinone MD4: eventi invariati a 66' yellow e 86' yellowRedCard. I totali Genoa prima erano yellowCards=3, secondYellowCards=0, straightRedCards=1; dopo sono 2, 1, 0, includendo l'altro giallo ordinario della squadra. Il vecchio totale del provider è preservato in providerDiscipline e non interpreta la causa dell'espulsione. Il solo Vásquez ha un giallo ordinario e un'espulsione da secondo giallo, senza rosso diretto.

Stefano Sabelli, Genoa–Napoli MD1: evento yellow a 85' preservato. didNotPlay verificato determina UNUSED, onPitchAtEvent=false, benchEvent=true, contextSource=verified-didNotPlay. È una classificazione del partecipante inutilizzato, non una posizione fisica registrata indipendentemente. Periodo e postMatch restano unknown/null; la regola del mercato decide esclusione o void, non la cancellazione dell'evento.

L'importer non assegna più secondYellow=0 per convenzione né trasforma RedCards in straightRed. Eventi espliciti e copertura guidano i totali; classificazioni insufficienti restano unknown. Migrazione idempotente. Nei soli aggregati storici 2023/24 sono corretti 582 falsi zeri gialli senza copertura (56 righe arbitro + 526 arbitro-squadra), senza ricostruire eventi assenti.

## D. COVERAGE MODEL

| Stato | Significato |
| --- | --- |
| COMPLETE | Lista esplicitamente completa nel suo scope; [] può attestare zero. Contesto/identità hanno verifiche proprie. |
| PARTIAL | Conosciute alcune componenti; value finale null, knownSubtotal/knownComponents preservati. |
| UNAVAILABLE | Fonte esplicitamente assente o array mancante pur dichiarato completo. |
| UNKNOWN | Nessuna dichiarazione sufficiente; available generico non attesta feed disciplinare completo. |

yellow=1, secondYellow=null, straightRed=null mantiene yellow=1 e subtotal=1, ma allCards=null/PARTIAL. Tassi/starts/falli non diventano zero quando la partecipazione o l'esposizione è ignota. Le nuove copie storiche di ricerca non espongono cards/90 completo quando manca una categoria; l'input legacy del rischio non è riscritto.

## E. SETTLEMENT

| Caso | Prima | Ora, controllo corrente |
| --- | --- | --- |
| YES senza bookings | LOST | unavailable |
| NO senza bookings | WON | unavailable |
| Under punti; [] e coverage unavailable | WON | unavailable |
| Feed parziale | Possibile somma incompleta | unavailable; evidenze note preservate |
| [] con feed COMPLETE, regola/ID/partecipazione validi | Zero implicito | Zero certificato: YES lost / NO won |
| Evento secondYellow | Possibile rosso diretto | Categoria separata; regola specifica |
| Carta bench/post-match | Possibile inclusione generica | Eleggibilità per ruleId; contesto ignoto => unavailable |
| ID irrisolto o sostituzioni DUO incomplete | Possibile fallback implicito | unavailable |
| Non partecipazione verificata e regola definita | Variabile | void con reason; evento disciplinare conservato |

Gli esiti completati non vengono ricalcolati silenziosamente. Un registro separato conserva 25 esiti disciplinari pre-change e settleArchivedLeg espone recorded outcome, currentCheck, reviewRequired e provenienza legacy. Sono 17 gli esiti che il controllo strict non può ricertificare: 16 DUO senza ruleId verificato e un Under punti con contesto insufficiente. Lo stato storico visualizzato resta identico al precedente, annotato come archiviato/target da verificare; nessun esito viene dichiarato dimostrabilmente errato in assenza della regola/contesto. Odds, giocate e conteggi di settlement archiviati restano preservati.

| Partita | Selezione | Esito archiviato preservato | Controllo corrente / motivo |
| --- | --- | --- | --- |
| genoa-frosinone-2026-27-md-04 | Gabriele Bracaglia riceve un cartellino · sostituto incluso | won | unavailable: UNKNOWN_TARGET_OR_MARKET_RULE |
| lazio-milan-2026-27-md-04 | Pervis Estupiñan riceve un cartellino · sostituto incluso | lost | unavailable: UNKNOWN_TARGET_OR_MARKET_RULE |
| como-parma-2026-27-md-04 | Ivan Smolcic riceve un cartellino · sostituto incluso | void | unavailable: UNKNOWN_TARGET_OR_MARKET_RULE |
| torino-roma-2026-27-md-04 | Mario Hermoso riceve un cartellino · sostituto incluso | won | unavailable: UNKNOWN_TARGET_OR_MARKET_RULE |
| como-parma-2026-27-md-04 | Diego Carlos riceve un cartellino · sostituto incluso | lost | unavailable: UNKNOWN_TARGET_OR_MARKET_RULE |
| genoa-frosinone-2026-27-md-04 | Patrizio Masini riceve un cartellino · sostituto incluso | lost | unavailable: UNKNOWN_TARGET_OR_MARKET_RULE |
| lecce-monza-2026-27-md-04 | Lorenzo Lucchesi riceve un cartellino · sostituto incluso | lost | unavailable: UNKNOWN_TARGET_OR_MARKET_RULE |
| napoli-bologna-2026-27-md-04 | Arthur Theate riceve un cartellino · sostituto incluso | lost | unavailable: UNKNOWN_TARGET_OR_MARKET_RULE |
| venezia-lazio-2026-27-md-05 | Juan Jesus riceve un cartellino · sostituto incluso | won | unavailable: UNKNOWN_TARGET_OR_MARKET_RULE |
| udinese-cagliari-2026-27-md-05 | Zé Pedro riceve un cartellino · sostituto incluso | lost | unavailable: UNKNOWN_TARGET_OR_MARKET_RULE |
| roma-inter-2026-27-md-05 | Alessandro Bastoni riceve un cartellino · sostituto incluso | won | unavailable: UNKNOWN_TARGET_OR_MARKET_RULE |
| bologna-torino-2026-27-md-05 | Arthur Theate riceve un cartellino · sostituto incluso | lost | unavailable: UNKNOWN_TARGET_OR_MARKET_RULE |
| venezia-lazio-2026-27-md-05 | Ridgeciano Haps riceve un cartellino · sostituto incluso | void | unavailable: UNKNOWN_TARGET_OR_MARKET_RULE |
| roma-inter-2026-27-md-05 | Gianluca Mancini riceve un cartellino · sostituto incluso | won | unavailable: UNKNOWN_TARGET_OR_MARKET_RULE |
| udinese-cagliari-2026-27-md-05 | Christian Kabasele riceve un cartellino · sostituto incluso | lost | unavailable: UNKNOWN_TARGET_OR_MARKET_RULE |
| bologna-torino-2026-27-md-05 | Rafik Belghali riceve un cartellino · sostituto incluso | won | unavailable: UNKNOWN_TARGET_OR_MARKET_RULE |
| parma-cagliari-2026-27-md-01 | Under 5,5 punti cartellini | won | unavailable: CARD_POINTS_DATA_INSUFFICIENT |

Ridgeciano Haps resta void storico; una nuova verifica non inventa una mancata partecipazione né un'identità presente nel referto. Nessun record legacy è spacciato per actual target certificato.

## F. IDENTITIES

| MD6 likelyBooked | Numero |
| --- | --- |
| Candidati | 50 |
| Risolti direttamente su nome canonico/ID | 7 |
| Risolti tramite alias già verificato | 43 |
| Irrisolti | 0 |
| Collisioni | 0 |

playerId è primario, nome visualizzato preservato. Alias provengono dal registro verificato e dalle XI ufficiali già collegate, senza nuove identità ipotizzate. Deduplica solo della coppia teamId:playerId risolta; ambiguità non unificate. Fallback solo nome esplicitamente marcato. L'elenco completo dei 50 candidati/ID/metodo è nel rapporto JSON.

## G. CURRENT-SEASON FEATURES

587 righe correnti, incluse panchine inutilizzate. Disponibili appearances/starts/minutes, ordinaryYellows/secondYellowDismissals/straightReds, partite con almeno una carta registrata, eventi/90 e gialli/90, falli commessi/per90 e subiti dove presenti, sample sizes, completeSamples, known/missing components, provenienza e cutoff. Le 454 righe di giocatori entrati non sono il denominatore delle 587 righe dati complessive.

anyQualifyingCard nelle feature descrive ALL_RECORDED_CONTEXTS_DATA_ONLY e conta partite con carte registrate, senza certificare il mercato bookmaker. Le carte panchina sono dati, non esposizione in campo. Per ogni candidato pre-match sono escluse gara target, gare non finite e giornate future.

Expected Minutes e substitutionRisk referenziano l'output Player Market V2 serializzato; startingProbability ed expectedMinutesReliability restano null quando non serializzati. Stato XI conservato. Feature nuove: usedInLegacyRiskScore=false; nessun Expected Minutes o cartellino corrente viene inserito nella formula legacy.

## H. REFEREES

Campione descrittivo Serie A+B 2025/26: 760 gare nel dataset, 720 con arbitro identificato, 720 con gialli utilizzabili attribuibili, 2.853 gialli. Correzione 2.853/760 ≈ 3,75 a 2.853/720 = 3,9625 (UI 3,96). Restano 2.900 gialli-evento derivati già presenti: non sono forzati a coincidere con i totali squadra. Mancando i raw, sono preservati con source RETAINED_DERIVED_DATA, eventCoverage UNKNOWN, rawReconstructionAvailable=false.

Pool diverso e congelato del motore: Serie A 2025/26 regolare, 380 gare, 340 arbitri identificati + 40 nel bucket legacy provider:unknown, 1.366 gialli, media 3,594736842105263. È un denominatore di lega, non un campione attribuito a un arbitro nominato. File byte-for-byte invariato; nessuna propagazione del 3,9625 e nessun coefficiente ritoccato. Le nuove aggregazioni per arbitro escludono le gare senza identità. I profili nominali UI escludono il bucket anonimo.

Tutti i dataset normalizzati ESPN, incluse fasi/pilot (le colonne usable si riferiscono alle gare attribuibili; gzip è disponibilità dei file attesi, non dedotta dai JSON semplici):

| File | Gare dataset | Arbitro identificato | Gialli utilizzabili | Tutte categorie utilizzabili | Team-record gialli mancanti | Raw gzip / plain JSON |
| --- | --- | --- | --- | --- | --- | --- |
| data/normalized/referee-matches/2023-24/serie-a.json | 380 | 380 | 380 | 380 | 0 | 0 / 0 |
| data/normalized/referee-matches/2023-24/serie-b-playoff-final.json | 2 | 2 | 0 | 0 | 4 | 0 / 0 |
| data/normalized/referee-matches/2023-24/serie-b-playoff-preliminary.json | 2 | 2 | 0 | 0 | 4 | 0 / 0 |
| data/normalized/referee-matches/2023-24/serie-b-playoff-semifinal.json | 4 | 4 | 0 | 0 | 8 | 0 / 0 |
| data/normalized/referee-matches/2023-24/serie-b-playout.json | 2 | 2 | 0 | 0 | 4 | 0 / 0 |
| data/normalized/referee-matches/2023-24/serie-b.json | 380 | 380 | 0 | 0 | 760 | 0 / 0 |
| data/normalized/referee-matches/2024-25/serie-a.json | 380 | 380 | 380 | 380 | 0 | 0 / 0 |
| data/normalized/referee-matches/2024-25/serie-b-playoff-final.json | 2 | 2 | 2 | 2 | 0 | 0 / 0 |
| data/normalized/referee-matches/2024-25/serie-b-playoff-preliminary.json | 2 | 2 | 2 | 2 | 0 | 0 / 0 |
| data/normalized/referee-matches/2024-25/serie-b-playoff-semifinal.json | 4 | 4 | 4 | 4 | 0 | 0 / 0 |
| data/normalized/referee-matches/2024-25/serie-b-playout.json | 2 | 2 | 2 | 2 | 0 | 0 / 0 |
| data/normalized/referee-matches/2024-25/serie-b.json | 380 | 380 | 380 | 380 | 0 | 0 / 0 |
| data/normalized/referee-matches/2025-26/serie-a-pilot.json | 10 | 10 | 10 | 10 | 0 | 0 / 10 |
| data/normalized/referee-matches/2025-26/serie-a.json | 380 | 340 | 340 | 340 | 0 | 0 / 10 |
| data/normalized/referee-matches/2025-26/serie-b-pilot.json | 10 | 10 | 10 | 10 | 0 | 0 / 10 |
| data/normalized/referee-matches/2025-26/serie-b-playoff-final.json | 2 | 2 | 2 | 2 | 0 | 0 / 0 |
| data/normalized/referee-matches/2025-26/serie-b-playoff-preliminary.json | 2 | 2 | 2 | 2 | 0 | 0 / 0 |
| data/normalized/referee-matches/2025-26/serie-b-playoff-semifinal.json | 4 | 4 | 4 | 4 | 0 | 0 / 0 |
| data/normalized/referee-matches/2025-26/serie-b-playout.json | 2 | 2 | 2 | 2 | 0 | 0 / 0 |
| data/normalized/referee-matches/2025-26/serie-b.json | 380 | 380 | 380 | 380 | 0 | 0 / 10 |

Inventario aggregati ESPN; denominatori distinti per competizione/stage nelle righe del file e per singola coppia arbitro-squadra (non somme duplicate di gare):

| File | Righe arbitro | Righe arbitro-squadra | Gare attribuite sommate | Gare bucket anonimo | Righe gialli senza copertura |
| --- | --- | --- | --- | --- | --- |
| data/generated/referee-stats/2023-24/aggregates.json | 94 | 989 | 770 | 0 | 56 |
| data/generated/referee-stats/2024-25/aggregates.json | 98 | 968 | 770 | 0 | 0 |
| data/generated/referee-stats/2025-26/aggregates-pilot.json | 20 | 40 | 20 | 0 | 0 |
| data/generated/referee-stats/2025-26/aggregates.json | 93 | 967 | 730 | 40 | 0 |

| Aggregato / scope | Gare nel pool | Gare attribuite | Record squadra gialli coperti attribuiti |
| --- | --- | --- | --- |
| data/generated/referee-stats/2023-24/aggregates.json / serie-a / regular-season | 380 | 380 | 760 |
| data/generated/referee-stats/2023-24/aggregates.json / serie-b / regular-season | 380 | 380 | 0 |
| data/generated/referee-stats/2023-24/aggregates.json / serie-b / playoff-preliminary | 2 | 2 | 0 |
| data/generated/referee-stats/2023-24/aggregates.json / serie-b / playoff-final | 2 | 2 | 0 |
| data/generated/referee-stats/2023-24/aggregates.json / serie-b / playout | 2 | 2 | 0 |
| data/generated/referee-stats/2023-24/aggregates.json / serie-b / playoff-semifinal | 4 | 4 | 0 |
| data/generated/referee-stats/2024-25/aggregates.json / serie-a / regular-season | 380 | 380 | 760 |
| data/generated/referee-stats/2024-25/aggregates.json / serie-b / regular-season | 380 | 380 | 760 |
| data/generated/referee-stats/2024-25/aggregates.json / serie-b / playoff-final | 2 | 2 | 4 |
| data/generated/referee-stats/2024-25/aggregates.json / serie-b / playout | 2 | 2 | 4 |
| data/generated/referee-stats/2024-25/aggregates.json / serie-b / playoff-semifinal | 4 | 4 | 8 |
| data/generated/referee-stats/2024-25/aggregates.json / serie-b / playoff-preliminary | 2 | 2 | 4 |
| data/generated/referee-stats/2025-26/aggregates-pilot.json / serie-a / undefined | 10 | 10 | 20 |
| data/generated/referee-stats/2025-26/aggregates-pilot.json / serie-b / undefined | 10 | 10 | 20 |
| data/generated/referee-stats/2025-26/aggregates.json / serie-a / regular-season | 380 | 340 | 680 |
| data/generated/referee-stats/2025-26/aggregates.json / serie-b / regular-season | 380 | 380 | 760 |
| data/generated/referee-stats/2025-26/aggregates.json / serie-b / playout | 2 | 2 | 4 |
| data/generated/referee-stats/2025-26/aggregates.json / serie-b / playoff-final | 2 | 2 | 4 |
| data/generated/referee-stats/2025-26/aggregates.json / serie-b / playoff-semifinal | 4 | 4 | 8 |
| data/generated/referee-stats/2025-26/aggregates.json / serie-b / playoff-preliminary | 2 | 2 | 4 |

Serie B regolare 2023/24: tutti i 760 record squadra gialli sono mancanti, non zero; 380 gare identificate ma zero gare con gialli utilizzabili. Restano limiti di copertura anche nelle altre competizioni/fasi, documentati senza backfill. Nessun raw gzip atteso è presente per queste serie normalizzate; i 20 raw plain JSON 2025/26 sono campioni parziali, non una ricostruzione completa.

Altre fonti e denominatori:

| Fonte/file | Scope e denominatore | Copertura / uso |
| --- | --- | --- |
| data/normalized/referees.json | 42 arbitri CAN 2026/27; registro senza gare | Identità ufficiali, non campione statistico |
| data/normalized/referee-stats-2025-26.json | Snapshot dei soli 42 CAN: Serie A 354 presenze arbitro, 35 con campione >0; Serie B 215, 37 con campione >0 | Soccerbase / SbancoBet, date e scope propri; B può includere postseason. Nessun feed eventi completo; zero campione non evidenza di tasso zero |
| data/sources/team-referee-profiles-2025-26.json → data/normalized/team-referee-profiles.json | WhoScored: denominatore appearances di ogni coppia; 20 squadre, 17 con dati, 336 righe | 5 tabelle complete e 12 top-20; 3 squadre N/D Serie A; 313 collegamenti ESPN, fonti autonome |
| data/generated/reading-referee-profiles-2025-26.json | Serie A+B regolare, campione attribuibile e completo 720 | Profilo descrittivo corretto, eventi derivati conservati |
| data/sources/referee-assignments-2026-27.json | Designazioni MD1, MD2, MD3, MD4, MD5; nessun denominatore cartellini | MD6 assente: tutti i 50 candidati factor=1, NO_DESIGNATION_AVAILABLE |
| data/sources/champions-referee-assignments-2026-27.json | Designazioni Champions MD1 e dati referee evidence dichiarati dalla fonte | Competizione distinta, non unita al pool Serie A |
| data/normalized/referee-calendars/2023-24.json | 760 fixture di calendario, fasi esplicite | Nessun feed disciplinare; raw calendari Wikipedia corrispondenti |
| data/normalized/referee-calendars/2024-25.json | 760 fixture di calendario, fasi esplicite | Nessun feed disciplinare; raw calendari Wikipedia corrispondenti |
| data/normalized/referee-calendars/2025-26.json | 760 fixture di calendario, fasi esplicite | Nessun feed disciplinare; raw calendari Wikipedia corrispondenti |
| data/normalized/referee-aliases.json | Mappatura identità, non denominatore di gare | Non crea evidenza disciplinare |
| data/generated/referee-stats/{season}/import-report*.json e validation-report.json | Report amministrativi, non dataset di actuals | Stato import/validazione storico, non prova che oggi i raw siano presenti |
| data/raw/referee-stats/calendars/*.wikitext.txt e data/raw/referee-stats/espn/2025-26/{serie-a,serie-b}/*.json | 6 calendari e 20 payload campione | Nessun rebuilding impoverito eseguito |

Il fallback MD6 significa assenza di designazione; non arbitro medio, neutralità osservata o effetto verificato. Le unità del denominatore, le fonti e la copertura rimangono separate.

## I. LEGACY RISK SCORE

Fingerprint SHA-256 del blocco matematico comparato alla baseline originale: invariato. Coefficienti di rischio/ranking, arbitro e duello, logiche outsider e modelli protetti invariati. Tutti i 50 candidati MD6 conservano nomi, ordine e riskScore; shots/SOT, teamProjections, probabilità ed exact-score MD6 confrontati con la baseline risultano invariati.

Unica variazione numerica diagnostica necessariamente dovuta alla correzione dei dati Genoa: teamDisciplineFactor di Ostigard (ID leo-stigard) e Sow (djibril-sow) da 1,002 a 1,001, incluso riskComponents; riskScore finale e ranking invariati. Il file Team Profiles V2 resta byte-identico; la diversa componente transitoria viene dal dato corretto, non da tuning.

Conversioni censite:

| Percorso | Calcolo legacy preservato | Semantica ora esplicita |
| --- | --- | --- |
| scripts/generate-schedina-md02.js | clamp(riskScore / 150, 0.18, 0.62); fair odds come reciproco | Euristica non validata; proxy individuale non probabilità DUO |
| scripts/build-schedina.js | Stessa clamp; fair odds, EV, prodotto delle probabilità/quote | HEURISTIC_UNVALIDATED_INDIVIDUAL_PROXY_FOR_DUO, calibratedProbability=null |
| scripts/build-champions-schedina.js | Stessa clamp, reciproco, EV e combinazioni | Euristica non calibrata; archivi numerici non rigenerati |
| scripts/build-schedina.js — U/O punti | Poisson sul baseline gialli storico/fissa dispersione | UNVALIDATED_YELLOW_BASELINE_PROXY_FOR_CARD_POINTS, target distinto TEAM_CARD_POINTS |
| js/pages/betting.js — Serie A e Champions | Visualizza quote fair/EV storici e aggregati slip | Indice euristico non calibrato; quota derivata euristica; EV euristico non validato |
| scripts/build-champions-player-markets.js e js/pages/champions.js | Score comparativo, flag primo della classifica | Nessuna probabilità calibrata; soli metadati/etichette |

Nessuna trasformazione arbitraria sostitutiva è introdotta. Questi numeri legacy non sono usabili come probabilità Card V2 calibrate né come vantaggio statistico provato. Nessun nuovo snapshot o giocate archiviate sono rigenerati per applicare i metadati.

Stima squadra rinominata Gialli · baseline storica; contract HISTORICAL_YELLOW_CARD_BASELINE_FIXED_DISPERSION_NOT_ALL_DISCIPLINARY_EVENTS. Distribuzione/modello numerico invariati.

## J. FIRST BOOKED

possibleFirstBooked preservato solo per compatibilità; firstBookedHeuristic=true per rank 1, firstBookedProbability=null. UI Primo ammonito · euristica, senza probabilità. Il contratto actuals richiede eleggibilità, timestamp completo, universo dei giocatori, stato sostituzioni/panchina/post-partita. Pari timestamp senza ordine ufficiale producono insieme di ID; l'indice array non decide il vincitore.

## K. SNAPSHOT READINESS

Contratti separati: [data/schemas/card-snapshot.schema.json](C:/Users/utente/Desktop/seria-a-2026-27/data/schemas/card-snapshot.schema.json), [data/schemas/card-actuals.schema.json](C:/Users/utente/Desktop/seria-a-2026-27/data/schemas/card-actuals.schema.json), [data/predictions/card-snapshots/README.md](C:/Users/utente/Desktop/seria-a-2026-27/data/predictions/card-snapshots/README.md). Envelope snapshot con schema/ID/match/season/competition, generatedAt, cutoff, targetVersion e candidati. Candidato: playerId/nome/team/opponent/role/detailedRole, XI, expectedMinutes/reliability, startingProbability/substitutionRisk, campioni storici/correnti e falli, referee identity/status/evidence, duello, riskScore legacy, target/rule/version, coverage e model state. Probability è vincolata null in DATA_ONLY_NO_VALIDATED_CARD_MODEL; ruleId resta null finché non verificato.

Actuals distinti da snapshot: ordinaryYellow, secondYellowDismissal, straightRed; ANY individuale separato da duoQualifyingCard; primo minuto qualificante, participation/minutesPlayed, conteggi pitch/bench/post-match, teamCardPoints regolamentare documentato, eventi, coverage e reason eligibility. Campi assenti null, non zero. Provenienza evento/source field/normalization/target/fallback mantenuta o documentata nelle feature.

Nessun writer di snapshot Card V2 abilitato, nessun fake backfill, nessun inserimento nei Player Market MD6 congelati. 31/31 file protetti hanno SHA-256 identico: include snapshot MD6, manifest, archivi, giocate/odds, Team Profiles V2 e gli altri dati congelati. I dettagli expected/actual sono nel JSON.

## L. TESTS

| Verifica | Esito |
| --- | --- |
| Regressioni mirate foundation | 44 pass, 0 fail |
| Suite pertinenti complessive | 26/29 pass; 3 fail per raw preesistenti assenti |
| Browser Edge locale desktop/mobile | 28 pass, 0 fail; zero errori JS, nessun overflow rilevato |
| Snapshot/manifest/file protetti | 31/31 hash invariati |
| Ranking/rischio MD6 e modelli shots/score | Confronto baseline invariato |
| Schemi JSON | Generati e letti nei controlli contrattuali; nessuna certificazione di validatore JSON Schema esterno |
| git diff --check | Verificato separatamente prima della consegna |

Le 29 suite comprendono normalizzazione/settlement, identità, referti, predizioni, rendering V2, Team Profiles/volume/referee, future-data, Schedina MD1–MD5/void/risultati, snapshot immutabili, dati, JS/CSS, XI e Champions. Conteggi storici nei test mantenuti, non indeboliti: le aspettative archiviate verificano il registro; nuove suite testano separatamente il settlement strict. Il test browser copre tutte le 10 gare MD6 a 1280/390px, Vásquez, Sabelli, archivio MD5 e semantica Champions.

Blocker storici non riparati artificialmente:

| Validator | Motivo |
| --- | --- |
| scripts/referee-stats/validate-season.js --season 2023-24 | ENOENT raw gzip 679226.json.gz |
| scripts/referee-stats/validate-season.js --season 2024-25 | ENOENT raw gzip 712116.json.gz |
| scripts/referee-stats/validate-2025-26.js | ENOENT raw gzip 736790.json.gz |

Mancano 679226.json.gz (2023/24), 712116.json.gz (2024/25), 736790.json.gz (2025/26) nelle rispettive directory Serie A. Sono fallimenti di disponibilità raw, non risolti trasformando dati mancanti in zero o cambiando assertion. Output dettagliati: [output/reports/card-foundation-tests-2026-10-03.json](C:/Users/utente/Desktop/seria-a-2026-27/output/reports/card-foundation-tests-2026-10-03.json) e [output/reports/card-foundation-browser-2026-10-03.json](C:/Users/utente/Desktop/seria-a-2026-27/output/reports/card-foundation-browser-2026-10-03.json).

## M. FILES CHANGED

Elenco completo: 81 file, inclusi output locali e report. I file audit-cartellini già presenti prima di questo task non sono inclusi né modificati. Nessun commit/push/deploy; nessuna alterazione dei file protetti o giocate completate.

| File | Motivo |
| --- | --- |
| [champions-2026-27/motivazione.html](C:/Users/utente/Desktop/seria-a-2026-27/champions-2026-27/motivazione.html) | Rigenerazione locale del riferimento alle risorse aggiornate; nessuna pubblicazione. |
| [champions-league.html](C:/Users/utente/Desktop/seria-a-2026-27/champions-league.html) | Rigenerazione locale del riferimento alle risorse aggiornate; nessuna pubblicazione. |
| [css/matches.css](C:/Users/utente/Desktop/seria-a-2026-27/css/matches.css) | Badge distinto per eventi di tipo unknown, senza fallback grafico giallo. |
| [data/generated/card-target-definitions-v1.json](C:/Users/utente/Desktop/seria-a-2026-27/data/generated/card-target-definitions-v1.json) | Target e regole versionati; nessun modello statistico. |
| [data/generated/current-disciplinary-features-2026-27.json](C:/Users/utente/Desktop/seria-a-2026-27/data/generated/current-disciplinary-features-2026-27.json) | 587 campioni individuali correnti, incluse panchine; feature dati non usate nel rischio. |
| [data/generated/reading-referee-profiles-2025-26.json](C:/Users/utente/Desktop/seria-a-2026-27/data/generated/reading-referee-profiles-2025-26.json) | Denominatore attribuibile corretto; eventi ricchi preesistenti conservati con copertura non ricertificata. |
| [data/generated/referee-stats/2023-24/aggregates.json](C:/Users/utente/Desktop/seria-a-2026-27/data/generated/referee-stats/2023-24/aggregates.json) | 582 falsi zeri con copertura gialli assente corretti in null; nessuna ricostruzione raw. |
| [data/normalized/card-settlement-records.json](C:/Users/utente/Desktop/seria-a-2026-27/data/normalized/card-settlement-records.json) | Copia normalizzata del registro separato degli esiti storici. |
| [data/normalized/matches.json](C:/Users/utente/Desktop/seria-a-2026-27/data/normalized/matches.json) | Eventi/totali canonici e alias verificati propagati dal calendario/importer. |
| [data/normalized/predictions.json](C:/Users/utente/Desktop/seria-a-2026-27/data/normalized/predictions.json) | ID, semantica euristica, fallback arbitro e feature di ricerca; ranking/rischio MD6 invariati. |
| [data/predictions/card-snapshots/README.md](C:/Users/utente/Desktop/seria-a-2026-27/data/predictions/card-snapshots/README.md) | Contratto per catture future separate e immutabili; nessuna cattura storica o MD6 creata. |
| [data/schemas/card-actuals.schema.json](C:/Users/utente/Desktop/seria-a-2026-27/data/schemas/card-actuals.schema.json) | Schema separato di eventi, snapshot futuri o actuals; probabilità calibrata obbligatoriamente nulla. |
| [data/schemas/card-snapshot.schema.json](C:/Users/utente/Desktop/seria-a-2026-27/data/schemas/card-snapshot.schema.json) | Schema separato di eventi, snapshot futuri o actuals; probabilità calibrata obbligatoriamente nulla. |
| [data/schemas/disciplinary-event.schema.json](C:/Users/utente/Desktop/seria-a-2026-27/data/schemas/disciplinary-event.schema.json) | Schema separato di eventi, snapshot futuri o actuals; probabilità calibrata obbligatoriamente nulla. |
| [data/sources/card-foundation-protected-hashes-2026-10-03.json](C:/Users/utente/Desktop/seria-a-2026-27/data/sources/card-foundation-protected-hashes-2026-10-03.json) | 31 hash pre-change e fingerprint del blocco matematico congelato. |
| [data/sources/card-settlement-records-2026-10-03.json](C:/Users/utente/Desktop/seria-a-2026-27/data/sources/card-settlement-records-2026-10-03.json) | 25 esiti pre-change conservati con provenienza legacy; non certifica un nuovo target. |
| [data/sources/match-results-2026-27.json](C:/Users/utente/Desktop/seria-a-2026-27/data/sources/match-results-2026-27.json) | Migrazione canonica dei 164 eventi, contesti null e classificazione corretta delle espulsioni. |
| [data/teams/atalanta.json](C:/Users/utente/Desktop/seria-a-2026-27/data/teams/atalanta.json) | Rigenerazione dei totali disciplinari con copertura; componenti incomplete restano N/D, con evidenze note separate. |
| [data/teams/bologna.json](C:/Users/utente/Desktop/seria-a-2026-27/data/teams/bologna.json) | Rigenerazione dei totali disciplinari con copertura; componenti incomplete restano N/D, con evidenze note separate. |
| [data/teams/cagliari.json](C:/Users/utente/Desktop/seria-a-2026-27/data/teams/cagliari.json) | Rigenerazione dei totali disciplinari con copertura; componenti incomplete restano N/D, con evidenze note separate. |
| [data/teams/como.json](C:/Users/utente/Desktop/seria-a-2026-27/data/teams/como.json) | Rigenerazione dei totali disciplinari con copertura; componenti incomplete restano N/D, con evidenze note separate. |
| [data/teams/fiorentina.json](C:/Users/utente/Desktop/seria-a-2026-27/data/teams/fiorentina.json) | Rigenerazione dei totali disciplinari con copertura; componenti incomplete restano N/D, con evidenze note separate. |
| [data/teams/frosinone.json](C:/Users/utente/Desktop/seria-a-2026-27/data/teams/frosinone.json) | Rigenerazione dei totali disciplinari con copertura; componenti incomplete restano N/D, con evidenze note separate. |
| [data/teams/genoa.json](C:/Users/utente/Desktop/seria-a-2026-27/data/teams/genoa.json) | Rigenerazione dei totali disciplinari con copertura; componenti incomplete restano N/D, con evidenze note separate. |
| [data/teams/inter.json](C:/Users/utente/Desktop/seria-a-2026-27/data/teams/inter.json) | Rigenerazione dei totali disciplinari con copertura; componenti incomplete restano N/D, con evidenze note separate. |
| [data/teams/juventus.json](C:/Users/utente/Desktop/seria-a-2026-27/data/teams/juventus.json) | Rigenerazione dei totali disciplinari con copertura; componenti incomplete restano N/D, con evidenze note separate. |
| [data/teams/lazio.json](C:/Users/utente/Desktop/seria-a-2026-27/data/teams/lazio.json) | Rigenerazione dei totali disciplinari con copertura; componenti incomplete restano N/D, con evidenze note separate. |
| [data/teams/lecce.json](C:/Users/utente/Desktop/seria-a-2026-27/data/teams/lecce.json) | Rigenerazione dei totali disciplinari con copertura; componenti incomplete restano N/D, con evidenze note separate. |
| [data/teams/milan.json](C:/Users/utente/Desktop/seria-a-2026-27/data/teams/milan.json) | Rigenerazione dei totali disciplinari con copertura; componenti incomplete restano N/D, con evidenze note separate. |
| [data/teams/monza.json](C:/Users/utente/Desktop/seria-a-2026-27/data/teams/monza.json) | Rigenerazione dei totali disciplinari con copertura; componenti incomplete restano N/D, con evidenze note separate. |
| [data/teams/napoli.json](C:/Users/utente/Desktop/seria-a-2026-27/data/teams/napoli.json) | Rigenerazione dei totali disciplinari con copertura; componenti incomplete restano N/D, con evidenze note separate. |
| [data/teams/parma.json](C:/Users/utente/Desktop/seria-a-2026-27/data/teams/parma.json) | Rigenerazione dei totali disciplinari con copertura; componenti incomplete restano N/D, con evidenze note separate. |
| [data/teams/player-leaderboards.json](C:/Users/utente/Desktop/seria-a-2026-27/data/teams/player-leaderboards.json) | Rigenerazione dei totali disciplinari con copertura; componenti incomplete restano N/D, con evidenze note separate. |
| [data/teams/roma.json](C:/Users/utente/Desktop/seria-a-2026-27/data/teams/roma.json) | Rigenerazione dei totali disciplinari con copertura; componenti incomplete restano N/D, con evidenze note separate. |
| [data/teams/sassuolo.json](C:/Users/utente/Desktop/seria-a-2026-27/data/teams/sassuolo.json) | Rigenerazione dei totali disciplinari con copertura; componenti incomplete restano N/D, con evidenze note separate. |
| [data/teams/torino.json](C:/Users/utente/Desktop/seria-a-2026-27/data/teams/torino.json) | Rigenerazione dei totali disciplinari con copertura; componenti incomplete restano N/D, con evidenze note separate. |
| [data/teams/udinese.json](C:/Users/utente/Desktop/seria-a-2026-27/data/teams/udinese.json) | Rigenerazione dei totali disciplinari con copertura; componenti incomplete restano N/D, con evidenze note separate. |
| [data/teams/venezia.json](C:/Users/utente/Desktop/seria-a-2026-27/data/teams/venezia.json) | Rigenerazione dei totali disciplinari con copertura; componenti incomplete restano N/D, con evidenze note separate. |
| [docs/card-data-targets-v1.md](C:/Users/utente/Desktop/seria-a-2026-27/docs/card-data-targets-v1.md) | Specifica di tassonomia, target, regole, copertura, provenienza e contratti futuri. |
| [js/pages/betting-settlement.mjs](C:/Users/utente/Desktop/seria-a-2026-27/js/pages/betting-settlement.mjs) | Settlement disciplinare conservativo; registro storico distinto dal controllo corrente. |
| [js/pages/betting.js](C:/Users/utente/Desktop/seria-a-2026-27/js/pages/betting.js) | Etichette rischio/quote/EV euristici e stato archiviato con target da verificare. |
| [js/pages/champions.js](C:/Users/utente/Desktop/seria-a-2026-27/js/pages/champions.js) | Semantica comparativa del rischio e primo ammonito euristico. |
| [js/pages/disciplinary.mjs](C:/Users/utente/Desktop/seria-a-2026-27/js/pages/disciplinary.mjs) | Unica definizione condivisa di tassonomia, coverage, identità, eligibility e target actuals. |
| [js/pages/readings.js](C:/Users/utente/Desktop/seria-a-2026-27/js/pages/readings.js) | Gialli baseline storica, contesto fallback, primo ammonito euristico e tipo evento esplicito. |
| [js/team-squads.js](C:/Users/utente/Desktop/seria-a-2026-27/js/team-squads.js) | Totali incompleti non resi come interi cartellini certi. |
| [lettura.html](C:/Users/utente/Desktop/seria-a-2026-27/lettura.html) | Rigenerazione locale del riferimento alle risorse aggiornate; nessuna pubblicazione. |
| [output/reports/card-foundation-2026-10-03.json](C:/Users/utente/Desktop/seria-a-2026-27/output/reports/card-foundation-2026-10-03.json) | Evidenza riproducibile di audit, test o rapporto finale. |
| [output/reports/card-foundation-2026-10-03.md](C:/Users/utente/Desktop/seria-a-2026-27/output/reports/card-foundation-2026-10-03.md) | Evidenza riproducibile di audit, test o rapporto finale. |
| [output/reports/card-foundation-browser-2026-10-03.json](C:/Users/utente/Desktop/seria-a-2026-27/output/reports/card-foundation-browser-2026-10-03.json) | Evidenza riproducibile di audit, test o rapporto finale. |
| [output/reports/card-foundation-md06-1280.png](C:/Users/utente/Desktop/seria-a-2026-27/output/reports/card-foundation-md06-1280.png) | Cattura di verifica locale desktop/mobile. |
| [output/reports/card-foundation-md06-390.png](C:/Users/utente/Desktop/seria-a-2026-27/output/reports/card-foundation-md06-390.png) | Cattura di verifica locale desktop/mobile. |
| [output/reports/card-foundation-tests-2026-10-03.json](C:/Users/utente/Desktop/seria-a-2026-27/output/reports/card-foundation-tests-2026-10-03.json) | Evidenza riproducibile di audit, test o rapporto finale. |
| [package.json](C:/Users/utente/Desktop/seria-a-2026-27/package.json) | Comandi mirati per migrazione, contratti, test e report della foundation. |
| [schedina.html](C:/Users/utente/Desktop/seria-a-2026-27/schedina.html) | Rigenerazione locale del riferimento alle risorse aggiornate; nessuna pubblicazione. |
| [scripts/build-card-data-foundation.js](C:/Users/utente/Desktop/seria-a-2026-27/scripts/build-card-data-foundation.js) | Genera schemi, definizioni e dati correnti senza snapshot predittivi. |
| [scripts/build-champions-player-markets.js](C:/Users/utente/Desktop/seria-a-2026-27/scripts/build-champions-player-markets.js) | Solo metadati futuri/null/firstBookedHeuristic; formule invariate, archivio non rigenerato. |
| [scripts/build-champions-schedina.js](C:/Users/utente/Desktop/seria-a-2026-27/scripts/build-champions-schedina.js) | Annota trasformazione pseudo-probabilistica futura senza riscrivere giocate archiviate. |
| [scripts/build-predictions.js](C:/Users/utente/Desktop/seria-a-2026-27/scripts/build-predictions.js) | Arricchimento di identità/feature/exposure e reason fallback; feature nuove escluse dal rischio. |
| [scripts/build-reading-referee-profiles.js](C:/Users/utente/Desktop/seria-a-2026-27/scripts/build-reading-referee-profiles.js) | Denominatore delle gare attribuibili e protezione contro ricostruzione povera senza raw. |
| [scripts/build-schedina.js](C:/Users/utente/Desktop/seria-a-2026-27/scripts/build-schedina.js) | Metadati euristici per rischio/quote/EV/DUO e proxy gialli verso punti; numeri legacy invariati. |
| [scripts/build-site.js](C:/Users/utente/Desktop/seria-a-2026-27/scripts/build-site.js) | Versioni delle risorse per la rigenerazione locale. |
| [scripts/card-foundation-baseline.mjs](C:/Users/utente/Desktop/seria-a-2026-27/scripts/card-foundation-baseline.mjs) | Cattura iniziale forense delle predizioni/esiti; rifiuta sovrascrittura di baseline esistente. |
| [scripts/card-research-contracts.js](C:/Users/utente/Desktop/seria-a-2026-27/scripts/card-research-contracts.js) | Factory data-only per candidati/actuals con probabilità e contesto mancanti null. |
| [scripts/disciplinary-features.js](C:/Users/utente/Desktop/seria-a-2026-27/scripts/disciplinary-features.js) | Aggregati correnti e copie storiche di ricerca con copertura e cutoff; nessun contributo al riskScore. |
| [scripts/generate-schedina-md02.js](C:/Users/utente/Desktop/seria-a-2026-27/scripts/generate-schedina-md02.js) | Trasformazione legacy marcata euristica/non calibrata per eventuali nuove generazioni. |
| [scripts/import-official-calendar.js](C:/Users/utente/Desktop/seria-a-2026-27/scripts/import-official-calendar.js) | Propaga esclusivamente alias già verificati nel registro identità. |
| [scripts/import-statmuse-result.js](C:/Users/utente/Desktop/seria-a-2026-27/scripts/import-statmuse-result.js) | Tassonomia esplicita, ID irrisolti null e totali espulsione ricavati da eventi. |
| [scripts/predictions/engine.js](C:/Users/utente/Desktop/seria-a-2026-27/scripts/predictions/engine.js) | ID/alias verificati, deduplica non ambigua e diagnostica; blocco matematico equivalente. |
| [scripts/referee-stats/aggregate.js](C:/Users/utente/Desktop/seria-a-2026-27/scripts/referee-stats/aggregate.js) | Gare senza arbitro escluse dal per-referee e tassi consentiti solo con copertura completa. |
| [scripts/referee-stats/coverage.js](C:/Users/utente/Desktop/seria-a-2026-27/scripts/referee-stats/coverage.js) | Copertura dataset/metriche e known/missing components separati. |
| [scripts/repair-card-foundation.js](C:/Users/utente/Desktop/seria-a-2026-27/scripts/repair-card-foundation.js) | Migrazione idempotente della fonte attuale e dei soli falsi zeri storici. |
| [scripts/report-card-foundation.mjs](C:/Users/utente/Desktop/seria-a-2026-27/scripts/report-card-foundation.mjs) | Produce il rapporto A–N e inventario/hash/confronti in JSON. |
| [scripts/standings.js](C:/Users/utente/Desktop/seria-a-2026-27/scripts/standings.js) | Aggregati cartellini della classifica coverage-aware. |
| [scripts/team-pages/build.js](C:/Users/utente/Desktop/seria-a-2026-27/scripts/team-pages/build.js) | Totali, leaderboard e comparator disciplinari con metadati di copertura. |
| [scripts/test-card-foundation-browser.cjs](C:/Users/utente/Desktop/seria-a-2026-27/scripts/test-card-foundation-browser.cjs) | 28 verifiche UI desktop/mobile su tutte le MD6 e regressioni reali/archivio/Champions. |
| [scripts/test-card-foundation.mjs](C:/Users/utente/Desktop/seria-a-2026-27/scripts/test-card-foundation.mjs) | Regressioni di dati, settlement, identità, contesto, actuals, arbitri e immutabilità. |
| [scripts/test-player-identities.js](C:/Users/utente/Desktop/seria-a-2026-27/scripts/test-player-identities.js) | Null ammessi soltanto come fallback esplicitamente dichiarati; MD6 tutte risolte. |
| [scripts/test-schedina-md04.js](C:/Users/utente/Desktop/seria-a-2026-27/scripts/test-schedina-md04.js) | Conteggi storici originali verificati attraverso il registro separato, senza ridurre aspettative. |
| [scripts/test-schedina-md05-results.mjs](C:/Users/utente/Desktop/seria-a-2026-27/scripts/test-schedina-md05-results.mjs) | Esiti storici originali preservati; le verifiche strict sono testate separatamente. |
| [scripts/test-schedina.js](C:/Users/utente/Desktop/seria-a-2026-27/scripts/test-schedina.js) | Regressione degli esiti archiviati attraverso settleArchivedLeg; conteggi originali invariati. |
| [scripts/validate-card-foundation.mjs](C:/Users/utente/Desktop/seria-a-2026-27/scripts/validate-card-foundation.mjs) | Esegue 29 suite pertinenti e salva separatamente errori raw preesistenti. |

## N. FINAL VERDICT

La struttura dati e i controlli conservativi sono implementati. Non si autorizza ancora una calibrazione del target bookmaker: occorrono feed prospettici con periodo/pitch/bench/post-match/sostituzioni certificati, mapping verificato delle specifiche varianti DUO e ripristino/verifica dei raw referee storici necessari. Nessun risultato di questo task valida un modello statistico Card V2.

CARD DATA FOUNDATION NOT READY
