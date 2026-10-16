# Specifica tecnica UX — Letture Serie A e Champions League

Data: 16 ottobre 2026. Fase 2: specifica e matrice di copertura, senza implementazione.

Le 40 decisioni UX sono requisiti approvati. Nomi dei nuovi moduli, breakpoint e token indicati qui sono scelte progettuali della specifica, non funzionalità già implementate. Le disponibilità derivano dall'audit e dalla lettura dei file locali; non certificano completezza o attualità delle fonti esterne.

## 1. Perimetro e invarianti

Unificare esclusivamente i dettagli `lettura.html?match=…` della Serie A e `champions-league.html?match=…` della Champions. Conservare route, navigazione di ritorno e collegamenti esistenti. Indici, calendari, pagine squadra, motivazione autonoma, Coppa Italia e pagina Schedina non sono oggetto di restyling.

La nuova schedina integrata è una vista dello store personale esistente, non un secondo archivio. Non cambiare selezionabilità, sincronizzazione, formule, quote, probabilità, criteri, identificativi, modificatori o comportamento dei controlli.

Una struttura identica non implica dati identici. Tutte le sezioni strutturali rimangono presenti; contenuti, azioni e approfondimenti dipendono dalle capacità reali della fixture. Nessuna nuova fonte, importazione, attivazione di mercati o estensione dei gate per giornata è inclusa nel lavoro grafico.

I file applicativi non vengono modificati in questa fase. Non eseguire build, commit, push o deploy.

## 2. Architettura definitiva e ordine

Contenitore editoriale di massimo **1050 px**, centrato. Ordine DOM identico in entrambe le competizioni e a tutte le larghezze:

| Ordine | ID futuro | Sezione | Contenuto e componenti |
|---|---|---|---|
| 0 | — | Navigazione contestuale | Ritorno all'elenco, competizione, giornata, stato gara |
| 1 | `lettura-testata` | Testata | Stemmi grandi, nomi simmetrici, VS centrale, data/orario Europe/Rome, risultato reale separato quando conclusa, indicatori originali del modello, qualità dati compatta |
| 2 | — | Navigazione delle sezioni | Barra sticky; mini-intestazione con i nomi quando la testata esce dal viewport |
| 3 | `lettura-scenario` | Scenario principale | Gol attesi del modello, tiri, SOT, corner, barre, risultato centrale e alternative, interpretazione e spiegazione del matchup, contesto/motivazione disponibile |
| 4 | `lettura-pronostici` | Pronostici | Righe compatte, filtri combinabili, evidenziati/outsider, dettagli, modificatori e tre indicatori distinti; combinazioni esistenti in approfondimento |
| 5 | `lettura-formazioni` | Formazioni | Un campo orizzontale con entrambe le squadre, moduli, allenatori, disponibilità, fonte e stato |
| 6 | `lettura-giocatori` | Giocatori | Ricerca, schede Tiri / SOT / Outsider e mini-dashboard individuali |
| 7 | `lettura-disciplina` | Disciplina | Schede Squadre / Arbitro / Ammoniti; designazione completa e fonti |
| 8 | `lettura-tattica` | Analisi tattica | Sintesi visibile, schede Casa / Ospite / Duelli, baseline, direzioni d'attacco; zone tiro e mini-campo solo con dati adeguati |
| 9 | `lettura-storico` | Forma e storico | Schede Forma recente / Precedenti / Storico, cronologie espandibili e statistiche squadra di approfondimento |
| 10 | `lettura-verifica` | Risultati e verifica | Prepartita: stato informativo. Postpartita: confronto previsto/reale, tabellino, eventi, statistiche individuali, MVP disponibile, esiti originali e riepilogo economico attribuito |
| 11 | `lettura-fonti` | Fonti e metodo | Provenienza, stagioni, campioni, copertura, date, limitazioni e riferimenti agli archivi tecnici disponibili |

Il pannello schedina è un unico elemento fuori dal flusso delle sezioni, aperto dal pulsante flottante. Contiene stato del contesto, selezioni, modificatori, quote, avvisi e totale secondo lo store esistente. Non occupa una colonna permanente che riduca i 1050 px del contenuto.

I contenuti spostati mantengono collegamenti compatibili: prevedere alias per gli anchor esistenti effettivamente usati, verificandone prima i riferimenti. Non duplicare pannelli per preservare un vecchio anchor.

## 3. Matrice delle 40 decisioni

Legenda: **D** dati/contratti esistenti, da adattare; **P** sola presentazione o interazione da costruire; **V** richiede verifica di copertura; **N/D** fonte sufficiente non accertata. La copertura è progettuale, non una dichiarazione di completamento.

| N. | Decisione | Componenti / sede | Copertura e criterio di accettazione |
|---|---|---|---|
| 1 | Architettura ibrida | ReadingShell, sezioni 1–11 | P: stesso ordine, inventario funzionale completo per entrambi i dettagli |
| 2 | Testata simmetrica | MatchHero | D/P: stemmi, VS, data e indicatori con unità e significato originali |
| 3 | Scenario con KPI e interpretazione | ScenarioSummary, MetricComparison, ScoreForecast | D/V: nessuna derivazione nuova; gol del modello distinti da xG osservato |
| 4 | Pronostici compatti filtrabili | ForecastList, ForecastFilters | D/P: tutti i record pubblicati ammessi restano raggiungibili |
| 5 | Campo unico orizzontale | DualLineupField | D/P: due undici nello stesso campo, elenco accessibile equivalente |
| 6 | Schede Tiri/SOT/Outsider | PlayerExplorer | D/V: classificazioni originali, nessun nuovo outsider calcolato in UI |
| 7 | Squadre/Arbitro/Ammoniti | DisciplineTabs | D/P: tre schede sempre presenti, stati mancanti locali |
| 8 | Sintesi e Casa/Ospite/Duelli | TacticalTabs, TacticalSummary | D/V: sintesi attribuita; duelli non dedotti dalle coordinate del modulo |
| 9 | Tre schede storiche | HistoryTabs | D/V: forma, H2H e storico separati per stagione e competizione |
| 10 | Editoriale, max 1050 px | ReadingShell | P: nessuna pagina esterna modificata, overflow pagina assente |
| 11 | Navigazione sticky | SectionNav | P: sezioni raggiungibili da tastiera; intestazioni non coperte |
| 12 | Apertura flottante schedina | BetslipTrigger | P: conteggio coerente con lo store, area sicura e nessun contenuto coperto |
| 13 | Qualità compatta espandibile | DataQualityDisclosure | D/P: mostra coperture e limitazioni senza creare uno score sintetico |
| 14 | Evidenziati e outsider filtrabili | ForecastFilters | D/P: vista per ID sul medesimo catalogo, nessuna duplicazione |
| 15 | Dettagli e modificatori | ForecastRow, ContractDisclosure | D/P: identità e semantiche integrali conservate |
| 16 | Ufficiali al posto delle probabili | LineupPresentation | D/P: priorità per fixture; nessun confronto delle differenze; archivio tecnico preservato |
| 17 | Esiti originali e riepilogo | OutcomeBadge, EconomicSummary | D/V: perimetro originale/filtrato esplicito, certificazione mai inferita |
| 18 | Mobile compatto completo | ResponsiveShell | P: nessuna funzione esclusa dal solo breakpoint |
| 19 | Colori casa/ospite | SideLegend, confronto metriche | P: colori distinti con etichette e pattern, anche in tema notte |
| 20 | Titoli grafici con icone | SectionHeading | P: heading semantici; icone decorative non lette due volte |
| 21 | Mini-dashboard giocatore | PlayerDetail | D/V: aggregati/minuti presenti; andamento solo con serie individuale verificata |
| 22 | Previsto/reale immutabile | ForecastActualComparison | V: serve previsione pre-kickoff provata; altrimenti confronto dichiarato non disponibile |
| 23 | Mini-testata sticky | CompactMatchHeader | P: visibile all'uscita hero, nessuna duplicazione di H1 o focus |
| 24 | Probabilità/quota/EV distinti | ForecastIndicators | D/P: unità esplicite, null conservati, DUO non eredita probabilità singola |
| 25 | Laterale/bottom sheet | PersonalBetslipPanel | D/P: medesimo store, focus restituito e stato mantenuto al resize |
| 26 | Confronti e grafici squadra | TeamStatsComparison | D/V: separare osservato, storico e previsto; grafici da serie reali |
| 27 | Zone e percentuali tiro | ShotZonePanel | N/D: richiede tiri effettuati/concessi classificati, denominatore e orientamento verificati |
| 28 | Mini-campo e duello | TacticalZoneExplorer | N/D/V: nessuna associazione zona-giocatore inventata; fallback informativo |
| 29 | Arbitro e ultime direzioni | RefereeProfile, RefereeHistory | D/V: Champions ha `last10`; Serie A richiede join su partite arbitrate, non su medie aggregate |
| 30 | Card ammoniti e mercati | BookingCandidateCard | D/V: risk score distinto da probabilità; link a contratti esistenti per ID |
| 31 | Ultime partite espandibili | MatchTimeline | D/V: solo eventi con ID, data e fonte; nessun trend da aggregati |
| 32 | Precedenti riepilogo/dettaglio | HeadToHeadPanel | D/P: preservare limite, campione e natura UEFA/domestica |
| 33 | Filtri combinabili | ForecastFilters | D/P: AND fra dimensioni, OR interno a selezioni multiple, reset e conteggio |
| 34 | Ricerca giocatori collegata | PlayerSearch | D/P: navigazione per player ID, nessun join approssimativo per nome |
| 35 | Mancanze locali | CoverageState | P: zero reale, assenza dati e nessun qualificato restano distinguibili |
| 36 | Aggiornamenti mirati | SectionProvenance, SectionRenderer | D/P: timestamp della fonte pertinente, niente polling o timestamp di apertura spacciato per aggiornamento |
| 37 | Animazioni leggere | MotionTokens | P: movimento ridotto elimina transizioni non essenziali, nessuna informazione dipende dall'animazione |
| 38 | Tipografia e densità | TypographyTokens | P: testo normale almeno 16 px; metadati almeno 12 px; zoom 200% e reflow verificati |
| 39 | Componenti e due temi | ReadingTheme | P: Serie A perla; Champions notte; stessi componenti e nessuna fuga CSS |
| 40 | Responsive/accessibilità/integrità | Test matrix | P/V: test dati, tastiera e screenshot sulle tre fixture; gate descritti nella sezione 12 |

## 4. Fonti reali e mappa componenti

Tutti i percorsi sono relativi alla radice del repository. I nuovi adattatori non modificano questi file. Un file sorgente di costruzione non diventa automaticamente un endpoint browser: si usano i dataset già caricati oppure, previa verifica, risorse statiche già presenti. Eventuali nuove trasformazioni persistenti richiedono un blocco distinto dal restyling.

| Componente | Serie A | Champions | Regola |
|---|---|---|---|
| MatchHero / calendario fixture | `data/normalized/matches.json`; `teams.json`; `data/teams/index.json` | `data/normalized/champions-league-2026-27.json`, `teamBranding` | Identità da ID canonici; date e fuso preservati |
| Indicatori e score | `predictions.json`: `confidence`, `surprise`, `scoreForecast`, `exactScores`, `verdict` | `champions-pilot-predictions[-md02]-2026-27.json`; `champions-surprise-factor-md01-2026-27.json` quando applicabile | Nessuna conversione arbitraria di confidenza fra scale |
| Scenario e matchup | `predictions.json`: `expectedGoals`, `teamProjections`, `matchProjection`, interazioni V2 | Pilot: `expectedGoals`, `teamProjections`, `matchProjection`; MD2 `teamPrediction` nell'integrazione | Unità e significato degli intervalli originali |
| Contesto editoriale | `readings.json` con sette sezioni; `data/team-objectives.json` | `champions-motivation-md01-2026-27.json`; contesto normalizzato pertinente | Assenza di motivazione MD2 non colmata con MD1; nessun nuovo aggiustamento |
| ForecastList | `schedina.json` o `schedina-mdXX.json#marketCatalog`, con `shared-forecast-contract.mjs` | `schedina-champions-md02.json#fixtures[].selections`; ramo MD1: `champions-player-markets-md01-2026-27.json` e Schedina MD1 | Percorsi di pubblicazione distinti, senza uniformare l'ammissibilità |
| Cataloghi / audit tecnici | Cataloghi e valutazioni già disponibili alle superfici esistenti | `champions-md02-integration-2026-27.json#fixtures[].oddsEvent`; `champions-md02-audit-display.json` per il suo perimetro audit | Catalogo provider, pronostico pubblicato e archivio non sono lo stesso elenco |
| Formazioni | `data/teams/index.json`: `officialLineups` e directory; fonte canonica `data/sources/official-lineups-2026-27.json`; probabili per giornata | Integrazione MD2: `lineups`, `lineupStatus`, `editorialLineups`, `availability`; fonti ufficiali/probabili Champions | Ufficiale solo per la fixture corretta; fonte per lato se diversa |
| Disponibilità, moduli, allenatori | Directory e `data/teams/<id>.json`; `readings[].sections.availability` | Integrazione e `champions-registered-squads-2026-27.json` | Registrato UEFA non significa disponibile, convocato o titolare |
| PlayerExplorer | `predictions[].shooters`, `likelyBooked`; profili giocatore verificati nelle schede squadra | Ramo MD1 `champions-player-markets-md01-2026-27.json`; MD2 proiezioni individuali pubblicate nella Schedina e storico `champions-player-stats-2025-26.json` | Dati individuali collegati solo con ID canonico verificato; nessuna nuova graduatoria |
| Trend giocatore | Risultati individuali disponibili e relativi ID/data; copertura da verificare per ogni metrica | Storico individuale e fonti di risultato disponibili; cronologia completa non garantita dal totale stagionale | Aggregati per stagione non generano una serie temporale |
| Disciplina squadra | Proiezioni `fouls/cards` e `likelyBooked` in `predictions.json` | Pilot `cards`, proiezioni squadra; candidati nel ramo individuale se presenti | Nessun moltiplicatore arbitrale nuovo |
| RefereeProfile | `matches[].refereeAssignment`; `data/generated/reading-referee-profiles-2025-26.json` | Calendario `refereeAssignment`; `champions-referee-history-2026-10-13.json` | Medie, campioni e incarichi distinti |
| RefereeHistory | `data/normalized/referee-matches/2025-26/<competizione>.json`, join esatto con arbitro e date da verificare | `referees[].last10`, campioni stagionali e gruppi | Non presentare Serie A+Serie B come solo Serie A; esplicitare il campione |
| Baseline tattica | `team-style-profiles.json`; matchup/attacco in `predictions.json` | `team-style-profiles.json`; profili pilot come fallback dichiarato | Baseline storica separata dal pronostico |
| Canali d'attacco | `teamProjections[].attackChannels` ove presente | `champions-attack-channels-2025-26.json#profiles[].attackChannels` | Sinistra/centro/destra sono canali, non coordinate tiro |
| ShotZonePanel | Nessuna fonte spaziale sufficiente accertata | Nessuna fonte spaziale sufficiente accertata | Stato informativo; vietati percentuali e heatmap dedotte |
| TacticalZoneExplorer | `likelyBooked[].directOpponent` è evidenza testuale; mancano relazioni spaziali verificate uniformi | Baseline e formazioni non costituiscono un dataset dei duelli | Eventuali duelli testuali restano tali; nessuna collocazione geografica dedotta |
| Forma / storico squadra | `matches.json`; dati delle schede squadra, con copertura da verificare | `champions-pilot-match-stats-2025-27.json` alla base del pilot; `uefa-team-history-2026-27.json`; calendario | Pilot espone anche aggregati: verificare eventi accessibili prima di progettare dettagli cliccabili |
| H2H | `data/generated/head-to-head/first-leg-2026-27.json`; sommario leggero per l'indice invariato | `champions-head-to-head-2026-27.json` | Limiti e competizioni del dataset mantenuti |
| Risultati ed eventi | `matches.json`: `score`, `halfTimeScore`, `scorers`, `bookings`, `substitutions`, `teamStats`, `playerStats`, `mvp`, `resultCoverage`, `resultSource` | Calendario `matchReport`; `data/sources/champions-results-md02-2026-27.json` alimenta il settlement esistente | Null distinti da liste vuote verificate |
| Esiti / economia | Valutazioni e settlement esistenti della Schedina e registri pertinenti, incluso `card-settlement-records.json` | Schedina MD2: `settlement`, report di verifica e archivio audit separato | Non ricostruire un settlement dal colore della riga |
| Confronto previsto/reale | `data/predictions/snapshots/manifest.json`, snapshot disponibili; verificarne fixture e cronologia | Snapshot prepartita già esistenti se provati; verificare copertura MD2 | Il JSON corrente da solo non prova la previsione originaria |
| Schedina integrata | `personal-betslip-store.mjs`, contratti e contesto Serie A attuali | Stesso store, contratti e contesto Champions attuali | Nessuna nuova chiave storage o normalizzazione autonoma dei contesti |
| Qualità / fonti | `dataQuality`, diagnostica, copertura dei risultati, metadati delle singole fonti | `dataQuality`, `coverage`, `generationSync`, metadati integrazione e quote | `generatedAt` non equivale a verifica provider |

### Etichette quantitative

- `expectedGoals` del modello: «Gol attesi — modello». «xG osservato» solo per una statistica osservata che la fonte definisce xG.
- Probabilità: percentuale della valutazione del contratto, quando presente; adattatore consapevole delle unità originarie 0–1 / 0–100.
- Quota: numero decimale provider e data snapshot. Nessuna quota sintetica sostitutiva.
- EV: valore originale del contratto, separato dalla probabilità. Nessun ricalcolo frontend.
- Risk score ammonizione e stabilità del segnale: indicatori descrittivi, mai probabilità.
- Le barre comparative sono decorative rispetto ai valori testuali: scala condivisa fra casa/ospite della stessa metrica, unità esplicita, nessun confronto di lunghezze fra metriche diverse.
- Per null, dominio non applicabile o dati non confrontabili: niente barra quantitativa, grafico o zero fittizio.

## 5. Inventario funzionale da preservare

| Funzione esistente | Destinazione e protezione |
|---|---|
| Risultato centrale, alternative, sorpresa, confidenza e avvertenze | Testata/scenario; testi coerenti col metodo reale, non nuove spiegazioni matematiche |
| Numeri squadra, intervalli, corner e motivazioni V2 distinte per tiri/SOT | Scenario e dettagli statistiche; mantenere indicatori e limitazioni |
| Tiratori, minuti, allocazione, rischio sostituzione, soglie multiple e outsider | Schede giocatore; non appiattire in una singola raccomandazione |
| Probabili ammoniti, primo ammonito euristico, avversario diretto, fattore arbitrale | Disciplina; mantenere natura euristica e campioni |
| Squadra arbitrale AIA con assistenti, IV, VAR e AVAR; nazionalità e profili Champions | Scheda Arbitro; incarichi completi quando disponibili |
| Coach, modulo, probabili, riferimento, indisponibili e fonte | Formazioni; nessun ufficiale di altra fixture riutilizzato come ufficiale corrente |
| Baseline WhoScored, tratti attuali, fallback e direzioni d'attacco | Tattica; stagione e natura del dato sempre leggibili |
| Moduli editoriali e pannello evidenze pilota | Contesto, tattica e fonti secondo contenuto; nessuna perdita di evidenze specifiche |
| Pronostici pubblicati, evidenziati/preferiti dove previsti, outsider e classificazioni operative | Registro unico con filtri; non introdurre il badge preferito Champions oggi soppresso |
| Mercati senza quota, valutazioni non disponibili e contratti non modellati | Righe conservate; comportamento operativo originale invariato |
| DUO, sostituto, pali/traverse, periodo, soglia e limitazioni | Riga e dettagli contrattuali; gli aspetti che cambiano il significato devono essere riconoscibili anche da chi non espande |
| Combinazioni modello, qualità, incompatibilità e motivi N/D | Approfondimento Pronostici; distinte dalla schedina personale manuale |
| Catalogo provider, ricerca e consultazione tecnica nei rami che lo espongono | Accesso tecnico separato se già attivo; non promuovere automaticamente funzioni definite ma non montate |
| Aggiunta/rimozione MyCombo, deduplica, quote mutate, selezioni mancanti, avvisi relazioni | Pannello personale sullo store esistente; avvisi non soppressi per ragioni grafiche |
| Esclusioni Under/falli individuali/corner di periodo nei contesti cui si applicano | Applicate dallo store esistente; nessuna reimplementazione nei nuovi componenti |
| Filtro titolari e selezioni precedentemente salvate | Data service, BetSelection e store restano autorità; niente filtro solo visivo |
| Tabellino, marcatori, assist disponibili, cartellini e tipo, sostituzioni, statistiche e MVP | Risultati e verifica, con tutte le fonti e i null originali |
| Originale/filtrato, audit storico e conferme utente | Accessi e riepiloghi distinti; non reintrodurre esclusi nei pronostici operativi |
| Deep link, ritorni, errore fixture sconosciuta e archivi | Preservare route e messaggi; aggiornare solo il dettaglio autorizzato |
| Calendari, squadre, Coppa, pagine arbitrali e motivazione autonoma | Invariati; controlli di isolamento sui renderer condivisi |

I pannelli definiti ma non renderizzati non vengono eliminati né attivati automaticamente. Prima dell'estrazione, classificare ogni ramo come attivo, condizionale o tecnico non montato, con relativo test. Nessuna funzione va dichiarata inutile dal solo mancato utilizzo nella fixture campione.

## 6. Responsive e accessibilità

Breakpoint progettuali: mobile <768 px; tablet 768–1099 px; desktop >=1100 px. La scelta dipende dalla larghezza disponibile, senza user-agent detection. Gutter 16/24/32 px, inclusi nel contenitore tramite box sizing. Verifica a 320, 390, 768, 1024 e 1440 px.

| Componente | Desktop | Tablet | Mobile |
|---|---|---|---|
| Hero | Due lati simmetrici e centro; KPI su riga | Nomi multilinea senza troncamento essenziale | Stemmi/nome ai lati, VS centrale; data e indicatori sotto |
| Navigazione sticky | Link orizzontali e mini-header | Stessa struttura, scorrimento interno se necessario | Una barra scorrevole; mini-header compatto; nessun doppio livello che occupi gran parte dello schermo |
| Scenario / confronti | Confronti affiancati per metrica | Due colonne se leggibili | Metriche verticali, confronto casa/ospite ancora sullo stesso asse |
| Pronostici | Riga con tre indicatori separati | Testo su due righe, indicatori sempre etichettati | Scheda-riga compatta; tre indicatori sotto; dettagli espandibili |
| Filtri | Barra su più colonne | A capo, senza scroll pagina | Controllo espandibile, riepilogo filtri attivi e reset visibili |
| Campo formazioni | Un campo orizzontale con due undici | Medesimo campo con scroll locale se necessario | Medesimo campo con scroll locale esplicito; elenco completo alternativo accessibile, nessuna seconda copia attiva dei dati |
| Giocatori / ammoniti | Griglia 2–3 colonne secondo contenuto | Due colonne | Una colonna; ricerca e accesso dashboard invariati |
| Schede disciplina/tattica/storico | Tablist e pannello | Stesso modello | Tablist scorrevole o a capo, pannelli verticali |
| Grafici e timeline | Grafico con tabella equivalente | Dimensione adattiva | Dati e legenda leggibili; tabella se il grafico non è utile a questa larghezza |
| Tabellino | Eventi affiancati, tabelle | Eventi su due colonne | Eventi verticali; tabelle con scroll locale e intestazioni accessibili |
| Schedina | Drawer destro sovrapposto, larghezza max 420 px | Drawer destro, max larghezza viewport | Bottom sheet con altezza max 85dvh, contenuto scorrevole e area sicura |
| Fonti / stati mancanti | Inline/disclosure | Identico | Identico, URL lunghi spezzabili |

Requisiti trasversali:

- WCAG 2.2 AA come obiettivo di accettazione: contrasto testo normale >=4,5:1, testo grande >=3:1, elementi UI significativi >=3:1.
- Controlli principali con target 44×44 CSS px; focus visibile, ordine logico, nessun contenuto disponibile solo al passaggio del mouse.
- Un H1; gerarchia H2/H3 coerente, landmark, link di salto, tabelle con caption/intestazioni.
- Tab con ruoli, frecce, Home/End e selezione coerenti; disclosure su button/summary, mai su div non interattivo.
- Il click sulla riga pronostico non deve intercettare il pulsante dettagli o i link; controllo di selezione esplicito con stato accessibile.
- Drawer/sheet modale: titolo accessibile, focus iniziale, trap del focus, Escape e chiusura esplicita, restituzione al trigger, sfondo non interattivo e scroll bloccato. Nessun gesto di trascinamento obbligatorio.
- Al resize esiste un solo pannello e una sola selezione corrente; nessun remount dello store o perdita del focus.
- Navigazione sticky compensata da `scroll-margin-top`; trigger flottante sopra safe area e fuori dal contenuto essenziale; padding finale equivalente.
- Risultati filtro annunciati senza spostare il focus; nessun annuncio dell'intera pagina ad ogni selezione.
- `prefers-reduced-motion: reduce`: niente animazioni decorative, transizioni non necessarie o scroll forzato animato. Transizioni ordinarie brevi, circa 120–180 ms.

## 7. Stati e dati incompleti

Lo stato partita, lo stato delle formazioni, la copertura e lo stato contrattuale sono assi indipendenti; nessun unico badge li sostituisce.

| Stato | Comportamento |
|---|---|
| Prepartita con probabili | Etichetta probabile, fonte e data; selezioni secondo policy corrente, senza anticipare il filtro definitivo |
| Formazioni di riferimento | Etichetta esplicita; nessuna presentazione come XI confermato |
| Ufficiali parziali | Stato per lato; non dichiarare entrambe ufficiali se una sola confermata |
| Due XI ufficiali | Sostituiscono le probabili visibili; nessun diff; controlli e purga salvati restano quelli esistenti |
| Gara conclusa | Risultato reale distinto dal pronostico; esiti originali e report conservati; nessuna sostituzione retroattiva o nuovo pronostico operativo |
| Esito statistico | Etichetta e fonte statistica, compresa conferma utente; `officiallySettled: false` rispettato |
| Verifica operativa | Stato operativo esistente e motivazione; non equivale alla liquidazione del provider |
| Liquidazione certificata | Indicazione solo con prova esplicita già presente; nessuna inferenza dal risultato sportivo |
| Quota assente | Riga visibile; quota ed EV «—»; probabilità solo se valida per quel contratto; selezionabilità originale |
| Contratto non modellato | Proiezione individuale eventuale come riferimento separato; probabilità/EV DUO non disponibili |
| Nessun outsider qualificato | Stato valido del detector, distinto da dati mancanti |
| Zero osservato | Mostrare 0 solo se documentato e copertura adeguata |
| Dati parziali | Mostrare la parte verificata e spiegare metrica, stagione o lato mancante nella sezione |
| Zone tiro/duelli spaziali assenti | Sezione presente con testo «Dati spaziali non disponibili»; niente grafica quantitativa fittizia o mini-campo che suggerisca osservazioni reali |
| Fonte non raggiungibile / errore dataset | Errore locale e data dell'ultimo dato verificato se disponibile; azione di riprova su richiesta, nessun recupero automatico inventato |
| Fixture sconosciuta | Messaggio esplicito e ritorno al calendario/elenco; nessun abbinamento approssimativo |

### Rendimento e confronto dopo la gara

Usare snapshot prepartita solo se fixture, contratto, data e anteriorità al calcio d'inizio sono verificabili. Non assumere che `predictions.json` corrente sia un archivio immutabile. Se manca la prova, mostrare il pronostico disponibile con la relativa provenienza, ma non dichiararlo previsione originaria né usarlo per una valutazione retrospettiva certificata.

Comparare solo metriche con medesimo significato, periodo e soggetto. Il totale tiri del singolo non è il reale di un DUO; gol attesi del modello e xG osservato sono grandezze distinte. Nessuna modifica degli snapshot o creazione retroattiva di timestamp.

Il riepilogo economico usa report esistenti con perimetro esplicito: singole/multiple, stake effettivo o convenzionale, decise/pending/void, campione originale o filtrato, fonte della verifica. Un report di giornata non diventa rendimento della singola fixture. Se manca un report coerente, riepilogo «N/D»; non assumere stake, combinabilità bookmaker o vincita certificata.

## 8. Adattatori separati e componenti condivisi

Struttura futura proposta, da introdurre solo dopo autorizzazione:

- `js/pages/reading-detail/serie-a-adapter.mjs`
- `js/pages/reading-detail/champions-adapter.mjs`
- `js/pages/reading-detail/view-model.mjs`
- `js/pages/reading-detail/components/` e `controller.mjs`
- `css/reading-detail.css`, con scope esclusivo della nuova radice del dettaglio.

I renderer attuali rimangono entry point e scelgono il nuovo ramo solo per il dettaglio della competizione autorizzata. Nessuna modifica della logica degli indici e dei rami squadra/Coppa. Modifiche allo shell generator eventualmente necessarie devono essere circoscritte agli asset del dettaglio e non rigenerare dati statistici come parte del restyling.

### View model di sola presentazione

Ogni adattatore produce una struttura comune:

```text
ReadingDetail
  fixture: id, competition, season, matchday, home, away, schedule, status
  theme: serie-a | champions
  capabilities: per-section availability and reason
  sections: ordered references to scenario, forecasts, lineups, players,
            discipline, tactics, history, verification, sources
  forecastRefs: selection IDs referencing original immutable contracts
  provenance: per-field/per-section source, season, sample, verifiedAt
  coverage: available | partial | unavailable | not-applicable | error
```

Ogni valore quantitativo conserva unità, natura `observed | forecast | interpretation | historical`, fonte e periodo. L'assenza di questi metadati non autorizza a inventarli. Le interpretazioni utilizzano testi/evidenze esistenti o descrizioni deterministiche dei valori, senza nuovi giudizi predittivi.

Gli adattatori possono formattare etichette, unità e ordinamento visivo; non possono calcolare proiezioni, probabilità, EV, soglie, ranking, outsider, settlement o criteri di selezione. Il contratto originale resta immutabile e viene passato allo store, non ricostruito dalle etichette visuali.

### Serie A

Riutilizzare `fixtureLineupForMatch`, `formationPresentation`, `sharedForecastsForMatch`, `forecastView` e i gate correnti. Leggere gli output V2 e conservare distinti risk score, stabilità e probabilità.

L'interazione diretta corrente MD7 e il gate `isCanonicalModelForecast` specifico per MD7 non vengono estesi ad altre giornate. Per Atalanta–Venezia conclusa la schedina resta consultabile nel suo contesto, senza rendere selezionabili righe storiche che oggi non lo sono. L'interfaccia comune può esporre un'azione informativa «Selezione non disponibile per questo stato».

### Champions

Conservare i rami MD1 e MD2: il primo ha mercati/combinazioni propri; il secondo legge integrazione e Schedina per fixture. Riutilizzare le routine contrattuali e di store esistenti senza generalizzare il contesto hardcoded MD2 o sostituire i dati MD1 con quelli MD2.

Il motore UEFA 1X2, il pilot dei volumi e le proiezioni individuali rimangono distinti. `teamPrediction.dataQuality` può contenere metadati precedenti all'XI ufficiale: mostrare lo stato formazione dall'autorità pertinente e rendere visibile l'eventuale diversa data di calcolo, senza correggere i dati a mano.

### Identità e sincronizzazione

Riutilizzare gli ID di contesto prodotti dai flussi esistenti; non unificare autonomamente stringhe come `champions` e `champions-league`. Verificarne il comportamento con lo store prima di collegare il pannello.

Azioni del controller: filtra, espandi, cambia scheda, apri dettaglio e invoca le operazioni già esistenti sullo store. Nessun nuovo algoritmo di `reconcile`, nessuna subscription di rete, nessun timer. Le notifiche interne aggiornano solo contatore, riga e pannello coinvolti. Non aggiungere sincronizzazione cross-tab se non già supportata.

## 9. Filtri, ricerca e assenza di duplicazioni

Un solo registro di riferimenti alle selezioni per fixture. La lista principale, il filtro evidenziati/outsider, le schede giocatore e la schedina referenziano lo stesso `selectionId`. Una selezione può avere più punti d'accesso, ma un solo stato nel catalogo/store.

Filtri: squadra, giocatore, famiglia mercato, disponibilità quota, evidenziati/outsider. Dimensioni combinate in AND; valori multipli della stessa dimensione in OR. «Quota disponibile» è quella dello snapshot, non una verifica live. I filtri non modificano il contratto o l'ammissibilità.

Evidenziati significa flag editoriale/operativo già presente, secondo la competizione; non introdurre un nuovo punteggio o assegnare preferiti mancanti. Ricerca nomi per consultazione consentita; collegamenti fra dati e mercati esclusivamente tramite ID canonici, con identità irrisolta dichiarata.

La ricerca giocatore porta a scheda e pronostici collegati. Se non esiste mercato, mostra «Nessun pronostico pubblicato collegato»; non crearne uno. Se nessun elemento corrisponde ai filtri, mostra conteggio zero e reset senza nascondere la sezione.

Aggiornamenti mirati: utilizzare caricamenti e riconciliazioni già previsti; differenziare data fonte, verifica quota e generazione. In assenza di timestamp pertinente mostrare «Aggiornamento non disponibile». Vietato usare l'ora corrente o una data generale per tutte le sezioni.

## 10. Due temi, stesso layout

Token semantici sotto una radice dedicata al dettaglio: sfondo, superficie, testo, testo secondario, bordo, focus, casa, ospite, positivo, negativo, pending. Nomi finali da verificare contro il CSS esistente.

- Serie A: perla e sfumature diffuse leggere; superfici chiare, testo scuro.
- Champions: blu notte, superfici blu scuro, testo chiaro.
- Casa/ospite con colori distinguibili in entrambi i temi e sempre con nome/legenda. Stati positivo/negativo non confusi con colori delle squadre.
- Temi indipendenti da colori di brand e kit, che rimangono quelli delle fonti attuali.
- Nessuna regola generica su `.section`, `.card`, `body[data-page=champions]` o componenti condivisi che alteri calendario o pagine squadra. Applicazione del tema al solo dettaglio; eventuale sfondo pagina gestito con stato specifico, rimosso all'uscita.
- Nessuna nuova font esterna necessaria: partire da Inter/Anton presenti; gerarchia editoriale, metadati compatti e larghezze di lettura controllate.

## 11. Fixture campione e casi di prova

| Fixture | ID | Copertura d'uso |
|---|---|---|
| Atalanta–Venezia MD6 | `atalanta-venezia-2026-27-md-06` | Serie A conclusa, due proiezioni squadra, 20 giocatori nell'output tiratori, cinque candidati ammonizione, formazioni, arbitro, tabellino; cronologia snapshot da verificare |
| Inter–Club Brugge MD2 | `ucl-2026-27-md02-05` | Champions conclusa, due XI ufficiali, integrazione, selezioni, arbitro ed evidenze individuali; statistiche aggregate finali mancanti nel report rilevato |
| Milan–Atalanta MD7 | `milan-atalanta-2026-27-md-07` | Caso complementare scelto: il catalogo locale contiene 78 selezioni, di cui 15 con quota `UNAVAILABLE`; conteggi grezzi, non equivalenti ai soli pronostici pubblicati |

Gli expected dei test operativi MD7 vanno estratti tramite lo stesso filtro di pubblicazione della UI. Non usare il conteggio grezzo per imporre che tutti i record siano mostrati come pronostici giocabili.

Aggiungere in futuro fixture/test sintetici in memoria per probabili, ufficiali parziali, quota cambiata, identità irrisolta e fonte assente. Non modificare i dataset reali per simulare stati. Per verificare un ramo non coperto dai tre campioni, usare dati già presenti o fixture di test con provenienza dichiarata.

## 12. Strategia di regressione e accettazione

Baseline dell'audit precedente: passati `test-forecast-sync.js`, `test-personal-betslip.mjs`, `test-reading-prediction-v2.mjs` e `test-champions-reading-page.mjs`. Non rieseguiti durante questa fase documentale; non equivalgono a verifica visuale né all'intera suite.

Prima dell'implementazione:

1. Registrare stato Git e manifest hash di dati, motori, fonti, quote, snapshot e file protetti; nessun baseline aggiornato per far passare una regressione.
2. Registrare inventario per ramo, ID pubblicati, modificatori, quota e valutazione, stato titolari e contesto personale.
3. Verificare gli script prima di lanciarli: diversi comandi npm di test includono build; `build-site.js` richiama la policy e scrive artefatti. Non usare tali comandi come semplice controllo grafico.

Gate per ogni blocco applicativo futuro:

- Uguaglianza prima/dopo di motori, JSON protetti, forecast IDs e contratti; differenze ammesse soltanto nei file UI autorizzati.
- Parità delle funzioni attive e dei rami condizionali; nessun mercato senza quota perso; nessun nuovo mercato operativo.
- Test store: aggiunta/rimozione, duplicati, contesto, persistenza, quota cambiata, record mancante, rifiuto e purga non titolari, totale «—» se richiesto da quota mancante.
- Test componenti: valori null/zero, unità probabilità, DUO, modificatori, intervalli e stati di copertura.
- Test postpartita: snapshot originale immutabile, azioni storiche coerenti, confronto solo quando valido, fonte statistica distinta da liquidazione.
- Browser sulle tre fixture a 1440/1024/768/390/320 px, tastiera, zoom 200%, reduced motion, pannello aperto e chiuso, console e overflow.
- Controllo fuori perimetro su lettura Coppa, indice letture, calendario Champions, pagina squadra Champions e Schedina: nessuna differenza involontaria.

Test pertinenti già presenti: `test-betting-selection-contract.js`, `test-official-starter-policy.cjs`, `test-schedina-md07.mjs`, test pagina/mercati/Schedina Champions MD2, test arbitri, risultati e snapshot; browser `check-forecast-sync-browser.cjs`. I test storici con snapshot Git devono essere affiancati da controlli sul dataset corrente, non sostituiti o reinterpretati come verifiche correnti.

I nuovi test devono verificare comportamento e invarianti, non replicare stringhe o l'implementazione. Separare errori preesistenti documentati dai problemi introdotti; non dichiarare l'intero sito validato dai soli test focalizzati.

## 13. Sequenza di implementazione futura e rollback

Ogni blocco richiede autorizzazione all'implementazione e un diff autonomo. Nessun commit, push o deploy implicito. Il rollback ripristina soltanto file UI del blocco, senza reset di dati, motori o lavoro estraneo.

| Blocco | Modifica futura | Verifica | Reversibilità |
|---|---|---|---|
| A | Inventario attivo per ramo, manifest protetto e test baseline | Nessun cambiamento dati | Solo artefatti di verifica |
| B | View model e due adattatori senza attivazione visuale | Confronto campo per campo e contratti immutati | Rimozione moduli non collegati |
| C | Shell, temi, hero e navigazione su campioni opt-in locali | Isolamento CSS, route e responsive | Ramo renderer precedente conservato durante il pilot |
| D | Scenario, KPI, qualità e fonti | Parità valori, unità, intervalli e spiegazioni | Ripristino del solo rendering sezioni |
| E | Pronostici e filtri, poi drawer/sheet sullo store esistente | Parità ID, quote/null, contesti, modificatori, persistenza e titolari | Ritorno ai controlli precedenti, storage invariato |
| F | Formazioni, giocatori e disciplina | XI per fixture, nessun nuovo ranking, trend incompleti corretti | Componenti sostituibili senza cambiare adattatori dati |
| G | Tattica e storico, con fallback zone/duelli | Nessun grafico inventato; fonti e campioni | Ripristino pannelli precedenti |
| H | Risultati, confronto e riepiloghi esistenti | Cronologia snapshot, esiti e perimetri economici | Nessuna scrittura su archivi o settlement |
| I | Estensione ai rami MD1/altre giornate supportate e verifica completa | Copertura funzioni, accessibilità e controlli fuori perimetro | Attivazione per ramo, non sostituzione globale immediata |
| L | Rimozione delle sole duplicazioni dimostrate e stabilizzazione | Suite pertinente e confronto finale | Diff di pulizia separato dalle funzionalità |

Il meccanismo opt-in è soltanto uno strumento locale temporaneo di implementazione, non una preferenza da introdurre nel prodotto. I moduli storici si possono rimuovere solo dopo copertura completa dei loro rami; non lasciare due implementazioni permanenti divergenti.

## 14. Dati e verifiche ancora necessari

| Tema | Cosa manca / va verificato | Decisione già fissata in assenza |
|---|---|---|
| Zone tiro effettuato/concesso | Coordinate o categorie reali, orientamento, campione, denominatore, periodo e fonte per entrambe | Sezione informativa; canali d'attacco separati e nominati correttamente |
| Duelli sul campo | Relazioni zona-giocatori documentate e identità canoniche, non sole posizioni nominali | Nessun duello spaziale sintetico; mantenere evidenze testuali disponibili |
| Trend giocatori | Serie per gara completa e confrontabile, non solo totali/per90 | Dashboard con aggregati disponibili, andamento N/D |
| Ultime direzioni arbitro Serie A | Join esatto, ordine date, competizioni, copertura e risorsa browser utilizzabile | Medie e designazione disponibili, trend N/D |
| Forma e storico multi-competizione | Eventi effettivamente accessibili e limiti per squadra; esclusione di gare successive alla fixture per analisi prepartita | Campione/periodo dichiarati e niente cronologia inventata |
| Snapshot originari | Esistenza, anteriorità e contratto per Atalanta–Venezia e Inter–Club Brugge | Niente confronto retrospettivo dichiarato originario senza prova |
| Economia per fixture | Report di perimetro coerente, stake e fonte; report giornata non sufficiente | Riepilogo N/D o report esistente con ambito dichiarato |
| Catalogo Champions non montato | Quali rami siano realmente accessibili oggi e quali solo definiti | Non eliminare codice né attivare nuove funzioni implicitamente |
| Regole per giornata | Gate MD7 Serie A e contesto MD2 Champions, stringhe competizione e azioni archivio | Preservare esattamente i gate; qualsiasi estensione è richiesta separata |
| Aggiornamenti mirati | Disponibilità di timestamp verificati per sezione e separazione fra stato XI e data previsione | Nessuna promessa live; metadati mancanti dichiarati |
| CSS e anchor | Specificità effettiva, riferimenti esterni agli anchor e sfondo del solo dettaglio Champions | Scope dedicato e alias soltanto dove necessari |
| Coverage funzionale | Rami non presenti nei campioni, inclusi MD1 e Coppa che condivide il renderer | Test dedicati prima dell'attivazione generale |

Non servono ulteriori decisioni per costruire la struttura e gli stati informativi. Le righe sopra limitano l'attivazione di specifici contenuti quantitativi, non autorizzano raccolte dati o cambi ai motori. Palette esatta, icone e microspaziature saranno verificabili nei campioni applicativi entro i vincoli definiti.

## 15. Stato della consegna

Specifica delle 40 decisioni coperta, architettura comune definita, adattatori distinti previsti e lacune dati esplicitate. È autorizzata in questa fase esclusivamente la documentazione. L'implementazione resta sospesa in attesa dell'autorizzazione dell'utente.
