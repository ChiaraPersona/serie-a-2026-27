# Audit generale del progetto — attività incomplete

Data: 15 ottobre 2026, Europe/Rome. Base osservata: HEAD `c8c48026`, «probabili formazioni riadattate», 15 ottobre ore 23:08:50.

## Esito e criteri

L'inventario comprende **63 attività: 35 aperte, 20 completate e 8 superate**. Le aperte sono **23 PARZIALI, 7 SOSPESE e 5 DA VERIFICARE**. Non sono emerse attività NON INIZIATE comprovate come impegni approvati ancora vigenti. Le proposte di nuovi modelli e le attivazioni deliberatamente respinte non diventano lavori incompleti.

Il numero è esatto rispetto alle unità numerate di questo report; non certifica l'esistenza di tutti gli accordi eventualmente presenti in conversazioni esterne al repository. DA VERIFICARE indica insufficienza di prove, non un difetto confermato. Le stime sono orientative, escludono attese del calendario e reperibilità delle fonti. Nessuna criticità è classificata critica: non è stato dimostrato un guasto generale o una perdita irreversibile.

Unica scrittura intenzionale dell'audit: questo Markdown. Nessuna correzione, build, importazione, rigenerazione di dati, commit, push o deploy. Non sono stati interrogati account o fonti esterne. Lo status iniziale era pulito; durante l'analisi sono comparse modifiche a `output/horizontal-atalanta-sassuolo-2026-27-md-01-1280.png` e `output/horizontal-milan-atalanta-2026-27-md-07-1280.png`, lasciate intatte. Non si dichiara quindi immutato l'intero checkout condiviso.

## Metodo e storico ricostruito

Esaminati struttura, inventario Git, Markdown, report JSON selezionati, script e test pertinenti, roadmap e commenti, cronologia recente e storia mirata. Censimento delle directory: 380 file in `scripts`, 26 in `js`, 13 in `css`, 7 in `docs`, 115 in `output/reports`. Sono compresi `data/analysis`, `generated`, `normalized`, `sources`, `predictions`, gli output settlement e browser, l'archivio raw separato, `champions-2026-27` e il progetto adiacente FantaChampions. Non ogni riga di ogni raw compresso è stata letta.

Sequenza documentata:

- 3–4 ottobre: foundation e ricerca cartellini; framework e baseline exact-score.
- 9–11 ottobre: audit mercati Serie A, V2, freeze exact-score MD6 e verifiche ufficiali; recovery Champions e calibrazione iniziale.
- 13 ottobre: identità/actual MD1, freezer completo e candidato minuti subentranti, integrazione MD2, Fasi arbitrali 2B–2D.
- 14 ottobre: ufficiali Champions, filtro condiviso e settlement statistico.
- 15 ottobre: audit completo MD2 e ricerca miglioramenti; ulteriori restyle di home, card, maglie e formazioni.

I report successivi prevalgono sui precedenti soltanto per lo stesso oggetto. Un PASS che verifica correttamente un gate PARTIAL non certifica un modello pronto. I messaggi Git generici («migliorie», «design») non dimostrano promesse di funzionalità ulteriori.

## Riepilogo numerico

| Stato | Numero |
|---|---:|
| COMPLETATO | 20 |
| PARZIALE | 23 |
| SOSPESO | 7 |
| NON INIZIATO | 0 |
| DA VERIFICARE | 5 |
| SUPERATO | 8 |
| **Totale** | **63** |
| **Aperte** | **35** |

Le suite con più asserzioni fallite sono raggruppate per contratto, non contate una volta per assert. Le quattro squadre del recovery domestico sono separate perché hanno fonti e blocchi distinti. I 279 unavailable delle statistiche correnti Champions e i 157 non valutabili del candidato minuti appartengono a universi differenti e non si sommano.

## Elenco completo delle attività aperte, per priorità

| ID | Attività | Stato | Priorità |
|---|---|---|---|
| A01 | Valutazione prospettica exact-score MD6 | PARZIALE | alta |
| A02 | Raccolta prospettica V2 e maturazione del gate | PARZIALE | alta |
| A04 | Validazione distribuzioni SOT/corner | SOSPESO | alta |
| A05 | Cattura prospettica ricerca cartellini | SOSPESO | alta |
| A06 | Target cartellini certificato per contratto | PARZIALE | alta |
| A07 | Replay dello storico arbitrale dai raw archiviati | PARZIALE | alta |
| B01 | Recovery domestico Sabah | PARZIALE | alta |
| B02 | Recovery domestico Slavia Praha | PARZIALE | alta |
| B03 | Recovery domestico Shakhtar | PARZIALE | alta |
| B04 | Recovery domestico Slovan | PARZIALE | alta |
| B05 | Sette gare domestiche non riconciliate | PARZIALE | alta |
| B06 | Copertura statistica dei 970 registrati | PARZIALE | alta |
| B07 | 157 giocatori non valutabili nel candidato minuti | PARZIALE | alta |
| B08 | Disponibilità e rotazioni timestampate | PARZIALE | alta |
| B09 | Primo freeze completo Champions pre-kickoff | SOSPESO | alta |
| B10 | Validazione OOS del candidato minuti | SOSPESO | alta |
| B11 | Confronto cronologico paired A/B/C | SOSPESO | alta |
| B13 | Nove esiti grigi residui MD2 | PARZIALE | alta |
| B14 | Certificazione provider del settlement | DA VERIFICARE | alta |
| C01 | Suite rose/campo Serie A | PARZIALE | alta |
| C02 | Suite integrazione/Letture Champions | PARZIALE | alta |
| C03 | Test filtro titolari fermo a quattro esclusi | PARZIALE | alta |
| A03 | Diagnostiche V2 non identificabili | PARZIALE | media |
| A10 | Segnalazioni trasferimenti residue | DA VERIFICARE | media |
| B12 | Cinque delta List A temporalmente ambigui | DA VERIFICARE | media |
| B15 | Actual individuali esatti MD2 | PARZIALE | media |
| B16 | Follow-up futuro ricerca arbitrale | SOSPESO | media |
| C04 | Guard storici contro file vivi | PARZIALE | media |
| C05 | Copertura QA ultimi restyle | DA VERIFICARE | media |
| D01 | Riproducibilità build e percorso Pages | DA VERIFICARE | media |
| A08 | Valori di mercato mancanti | PARZIALE | bassa |
| A09 | Dettagli anagrafici/fisici mancanti | PARZIALE | bassa |
| D02 | Documentazione operativa superata | PARZIALE | bassa |
| F01 | Sostituzione proxy voto FantaChampions | PARZIALE | bassa |
| F02 | Verifica quotazioni FantaChampions prima dell'uso | SOSPESO | bassa |

F02 è un follow-up condizionato all'uso della rosa, non una richiesta di acquisto. B16 riguarda solo la verifica sperimentale futura documentata: la decisione NON ATTIVARE è conclusa.

## Schede dettagliate — Serie A

Ogni scheda riporta area/stato, obiettivo, realizzato, mancanza, motivo documentato, fonti, dipendenze, priorità, stima e prossima azione. Dove il motivo non è dimostrato non viene attribuito a una decisione dell'utente.

### A01 — Valutazione prospettica exact-score MD6

- **Area/stato/priorità:** Serie A, ricerca; PARZIALE; alta.
- **Obiettivo:** confrontare Engine 4.13.0 SHADOW, M0, M1 e M2 sugli stessi actual, senza ricalcolare previsioni.
- **Realizzato:** 10 gare/40 forecast congelati, evaluator e 57 asserzioni. `prospective-md06-evaluation.json` è ancora PENDING, commonSample.n=0, generato il 9 ottobre.
- **Manca:** join degli esiti e metriche head-to-head. La continuous evaluation V2 ha già 10 esiti e zero pending: la dipendenza che bloccava il follow-up appare risolta.
- **Motivo:** attesa degli esiti documentata; nessuna prova del successivo lancio dell'evaluator dedicato.
- **File:** `data/analysis/exact-score-research/prospective-md06-evaluation.json:8`, `output/reports/exact-score-md06-final-research-closure-2026-10-09.md:76`, `scripts/research/exact-score/evaluate-prospective-md06.js`, `data/analysis/prediction-continuous-evaluation-v2.json`.
- **Dipendenze:** risultati già presenti, integrità snapshot.
- **Impegno:** 0,5–1 giorno.
- **Prossima azione:** dopo autorizzazione, ispezionare ed eseguire solo l'evaluation dedicata; verificare 10 gare comuni e hash immutabili.

### A02 — Raccolta prospettica V2 e maturazione del gate

- **Area/stato/priorità:** Serie A V2; PARZIALE; alta.
- **Obiettivo:** accumulare evidenza indipendente per distinguere segnali persistenti da rumore.
- **Realizzato:** 10 cluster/200 osservazioni prospettiche MD6; zero invalid/pending; MODEL_CHANGE_GATE CLOSED, exact-score COLLECTING.
- **Manca:** altre giornate congelate e valutate. Il gate dati exact-score richiede 100 gare, 10 giornate e coperture prescritte (80% xG/goal features, 90% shots/SOT).
- **Motivo:** numerosità e finestre temporali insufficienti; non mancata implementazione del motore.
- **File:** `docs/prediction-continuous-evaluation-v2.md:8`, `:38`; `data/predictions/snapshots/manifest.json`; `data/analysis/prediction-continuous-evaluation-v2.json`.
- **Dipendenze:** input aggiornati e cutoff delle giornate future.
- **Impegno:** circa 0,5 giorno per ciclo, oltre al calendario.
- **Prossima azione:** prossimo ciclo prospettico, mai ricostruzione di snapshot originali dopo la gara.

### A03 — Diagnostiche V2 non identificabili dagli snapshot

- **Area/stato/priorità:** calibrazione V2; PARZIALE; media.
- **Obiettivo:** validare confidenza e ablation fedeli.
- **Realizzato:** FULL, no-current, no-history, no-minutes e matchup approssimato.
- **Manca:** modelConfidence autonomo e counterfactual esatti di interazione avversario/recency; persistenza su nuove giornate.
- **Motivo:** campi non serializzati; ricostruzione fedele non disponibile dal payload congelato.
- **File:** `docs/prediction-calibration-v2.md:132`, `:140`, `:180`, `:229`.
- **Dipendenze:** A02; eventuale nuovo contratto futuro da autorizzare.
- **Impegno:** 1–3 giorni per disegno/cattura, poi calendario.
- **Prossima azione:** specificare i campi da catturare nei prossimi snapshot; mantenere N/D sugli storici.

### A04 — Validazione prospettica distribuzioni SOT/corner

- **Area/stato/priorità:** mercati squadra/partita; SOSPESO; alta.
- **Obiettivo:** validare CDF per soglia e mercati congiunti della Fase 5C.
- **Realizzato:** 110 contratti diagnosticati; 0 recuperabili in sicurezza, 15 congiunti SOT distinti, 5 corner 1X2 senza distribuzione idonea.
- **Manca:** intere distribuzioni congelate pre-kickoff e almeno 100 gare concluse, holdout e confronto delle famiglie previste.
- **Motivo:** INSUFFICIENT_DATA; simulabilità non equivale a promozione.
- **File:** `output/reports/serie-a-md06-phase-5c-volume-validation-2026-10-09.md`, sezioni 7–8; `scripts/research/volume-validation/run.js`.
- **Dipendenze:** A02, actual e quote allo stesso cutoff.
- **Impegno:** 1–3 giorni preparazione, diverse giornate raccolta.
- **Prossima azione:** verificare cattura di media/SD/intervalli/versione/hash; raccogliere prima di cambiare famiglie o formule.

### A05 — Cattura prospettica della ricerca cartellini

- **Area/stato/priorità:** cartellini research; SOSPESO; alta.
- **Obiettivo:** snapshot separato dal Player Market V2, realmente prepartita.
- **Realizzato:** readiness e preview MD6; snapshotCreated=false; `data/predictions/card-snapshots` contiene solo README.
- **Manca:** cattura futura con input freschi, manifest immutabile e actual separati. La finestra MD6 è trascorsa e non è recuperabile come freeze originale.
- **Motivo:** rinvio per probabili anticipate e designazioni incomplete, dichiarato nel readiness.
- **File:** `data/analysis/card-prediction-research/md6-readiness.json`, `data/predictions/card-snapshots/README.md`, `output/reports/card-prediction-research-c0-c4-recorded-yellow-2026-10-04.md:383`.
- **Dipendenze:** input futuri datati; A06 per target certificato.
- **Impegno:** 1–2 giorni e calendario.
- **Prossima azione:** classificare la readiness MD6 come storica e preparare un cutoff futuro; non retrodatare.

### A06 — Target cartellini certificato per il contratto

- **Area/stato/priorità:** disciplina/settlement; PARZIALE; alta.
- **Obiettivo:** separare RECORDED_YELLOW da PLAYER_YELLOW liquidabile secondo il contratto.
- **Realizzato:** foundation, target distinti e C0–C4 research; nessuna promozione automatica del giallo osservato.
- **Manca:** certificazione di partecipazione, periodo, panchina/staff/post-partita e target storico omogeneo.
- **Motivo:** contesto event-level insufficiente. L'esclusione dai mercati operativi è corretta e non va rimossa.
- **File:** `docs/card-data-targets-v1.md`, report C0–C4 del 4 ottobre; `output/reports/serie-a-md06-statistical-models-2026-10-10.md:32`.
- **Dipendenze:** referti certificabili e identità; A05 per futuro test.
- **Impegno:** 3–7 giorni per un pilota, fonte permettendo.
- **Prossima azione:** censire per fixture i campi certificati/mancanti; mai equiparare osservazione e settlement provider.

### A07 — Riproducibilità dello storico arbitrale dai raw archiviati

- **Area/stato/priorità:** infrastruttura/arbitri; PARZIALE; alta.
- **Obiettivo:** ricostruire aggregati e validare dai raw.
- **Realizzato:** nell'archivio separato sono presenti 770 gzip per stagione 2023/24, 2024/25 e 2025/26: 2.310 complessivi. Nel percorso attivo `data/raw/referee-stats` non ci sono gzip.
- **Manca:** riconciliazione di manifest, percorsi e copertura, più replay isolato. Il validatore legge direttamente il percorso attivo.
- **Motivo:** separazione fisica dell'archivio e percorso del consumatore; non è dimostrata perdita dei raw.
- **File:** `scripts/referee-stats/validate-season.js:20`; `seria-a-2026-27-raw-archive-2026-08-24/data/raw/referee-stats/espn/`; `output/reports/audit-cartellini-2026-10-03.md:130`.
- **Dipendenze:** integrità dell'archivio e allineamento fixture.
- **Impegno:** 1–2 giorni.
- **Prossima azione:** hash e lettura di un campione per stagione in copia isolata prima di qualsiasi ripristino.

### A08 — Valori di mercato delle rose

- **Area/stato/priorità:** database Serie A; PARZIALE; bassa.
- **Obiettivo:** valorizzare solo dati verificabili.
- **Realizzato:** 20 squadre e 533 righe rosa; censimento attuale: 29 marketValue null. Il report import dichiara anch'esso 29 missing, senza assumere identità perfetta degli elenchi.
- **Manca:** riconciliare gli elenchi e recuperare valori effettivamente pubblicati.
- **Motivo:** matching/copertura della fonte; null non è zero.
- **File:** `data/generated/team-pages/market-value-import-report.json`, `data/sources/team-pages/transfermarkt-market-values-2026-27.json`, `scripts/team-pages/import-market-values.js`, `data/teams/*.json`.
- **Dipendenze:** identità esatte e fonte disponibile.
- **Impegno:** 0,5–2 giorni.
- **Prossima azione:** confrontare i 29 null correnti con i missing dell'import, senza refresh generale.

### A09 — Dettagli anagrafici/fisici delle rose

- **Area/stato/priorità:** database Serie A; PARZIALE; bassa.
- **Obiettivo:** completare i campi previsti quando la fonte li pubblica.
- **Realizzato:** 533 giocatori; detailedRole sempre non nullo. Restano null: altezza 91, peso 158, piede 101, data di nascita 47.
- **Manca:** verifica campo/fonte e recupero dei soli dati reperibili; ruolo generico non equivale a errore.
- **Motivo:** copertura disomogenea; non è provato che ogni missing sia risolvibile.
- **File:** `scripts/team-pages/import-player-details.js`, `data/sources/team-pages/transfermarkt-player-details-2026-27.json`, `data/teams/`.
- **Dipendenze:** identità e fonti; A10 per eventuali ambiguità.
- **Impegno:** 1–3 giorni di censimento, recupero variabile.
- **Prossima azione:** elenco per giocatore/campo/fonte; preservare i null legittimi.

### A10 — Segnalazioni trasferimenti residue

- **Area/stato/priorità:** rose Serie A; DA VERIFICARE; media.
- **Obiettivo:** distinguere trasferimenti reali da lag del provider e giovani.
- **Realizzato:** transfer-check del 1 settembre: 20 team, 31 possibili arrivi e 156 possibili partenze; rose aggiornate successivamente.
- **Manca:** riconciliare quali segnalazioni restino pertinenti oggi. Non sono 187 trasferimenti da applicare.
- **Motivo:** report vecchio, non prova di errore corrente.
- **File:** `data/generated/team-pages/transfer-check.json`, `scripts/team-pages/check-transfers.js`, `data/teams/`.
- **Dipendenze:** confronto per ID corrente, poi fonti ufficiali datate.
- **Impegno:** 0,5–2 giorni.
- **Prossima azione:** eliminare logicamente i delta già risolti dal confronto, verificare solo i residui; nessuna importazione automatica.

## Schede dettagliate — Champions League

### B01 — Recovery domestico Sabah

- **Area/stato/priorità:** dati multilega; PARZIALE; alta.
- **Obiettivo:** completare il recupero domestico della Fase 7.
- **Realizzato:** API PFL ufficiale: 2 gare e 9 giocatori con minuti; zero tiri/SOT recuperati.
- **Manca:** minuti dei titolari e serie tiri/SOT indipendenti.
- **Motivo:** il feed identifica chi entra ma non il titolare sostituito; minuti titolari null.
- **File:** `output/reports/champions-data-recovery-audit-2026-10-09.md`, sezione A; `data/normalized/champions-domestic-recovery-2026-27.json`.
- **Dipendenze:** fonte alternativa, ID e cronologia.
- **Impegno:** 1–3 giorni, disponibilità non garantita.
- **Prossima azione:** acquisire una prova del campo mancante e riconciliare per gara; nessun minuto convenzionale inventato.

### B02 — Recovery domestico Slavia Praha

- **Area/stato/priorità:** dati multilega; PARZIALE; alta.
- **Obiettivo:** serie individuale completa e riconciliata.
- **Realizzato:** Chance Liga: 10 gare, 24 giocatori con minuti, tiri/SOT per 5 giocatori; totali squadra separati.
- **Manca:** serie completa per tutti i ruoli; zero gare promosse a riconciliazione esatta nel recovery.
- **Motivo:** tabelle tiri/SOT dipendenti dal ruolo, copertura incompleta.
- **File:** report recovery Fase 7, sezione A; `data/normalized/champions-domestic-recovery-2026-27.json`.
- **Dipendenze:** fonte indipendente e definizione omogenea.
- **Impegno:** 1–3 giorni, fonte permettendo.
- **Prossima azione:** completare una gara pilota prima di estendere l'importazione.

### B03 — Recovery domestico Shakhtar Donetsk

- **Area/stato/priorità:** dati multilega; PARZIALE; alta.
- **Obiettivo:** completare evidenza domestica individuale.
- **Realizzato:** UPL ufficiale: 5 gare e 24 giocatori con minuti; zero tiri/SOT nel recovery.
- **Manca:** tiri/SOT individuali comparabili.
- **Motivo:** limite dei referti recuperati; le identità risolte successivamente non aggiungono automaticamente statistiche.
- **File:** report recovery Fase 7, sezione A; raw in `data/raw/champions-recovery/2026-10-09/domestic/`; normalized recovery.
- **Dipendenze:** fonte alternativa e crosswalk esatto.
- **Impegno:** 1–3 giorni, reperibilità incerta.
- **Prossima azione:** verificare un referto alternativo completo senza inferire valori dai gol.

### B04 — Recovery domestico Slovan Bratislava

- **Area/stato/priorità:** dati multilega; PARZIALE; alta.
- **Obiettivo:** serie match-level verificabile.
- **Realizzato:** Niké Liga: 27 giocatori con minuti; numero gare N/D, zero tiri/SOT nel recovery.
- **Manca:** denominatore gare e serie tiri/SOT documentata.
- **Motivo:** dati disponibili insufficienti per una serie completa.
- **File:** report recovery Fase 7, sezione A; normalized recovery.
- **Dipendenze:** fixture/ID e fonte ufficiale o alternativa verificabile.
- **Impegno:** 1–3 giorni.
- **Prossima azione:** ricostruire prima il denominatore delle osservazioni, mantenendo N/D dove manca.

### B05 — Sette gare domestiche non confrontabili

- **Area/stato/priorità:** riconciliazione dati; PARZIALE; alta.
- **Obiettivo:** confronto indipendente fra totali squadra e serie individuale.
- **Realizzato:** recuperati totali Brugge 13/3 e LASK 26/4 e 16/6; sette casi ancora non confrontabili nella Fase 7.
- **Manca:** serie player per Fenerbahçe–Beşiktaş, AEK–Iraklis, Lommel–Brugge, Başakşehir–Galatasaray, Sturm–LASK, Hartberg–LASK, Sandefjord–Viking.
- **Motivo:** totale squadra isolato non prova la completezza dei player. Il recovery actual MD1 successivo riguarda altre gare.
- **File:** `output/reports/champions-data-recovery-audit-2026-10-09.md`, sezione B con providerFixtureId per ciascuna gara.
- **Dipendenze:** fonti indipendenti e semantica tiri/SOT.
- **Impegno:** 2–5 giorni, fonte permettendo.
- **Prossima azione:** partire dai tre casi con totale alternativo già acquisito, poi affrontare gli altri quattro.

### B06 — Copertura statistica dei 970 registrati

- **Area/stato/priorità:** database 36 squadre; PARZIALE; alta.
- **Obiettivo:** completare e classificare la copertura statistica dei registrati.
- **Realizzato:** corrente 2026/27: 621 completi, 70 parziali, 279 unavailable, 691 con minuti; storico 2025/26: 797 completi e 173 unavailable. Tutte le 36 squadre esistono.
- **Manca:** triage e recupero delle 349 righe correnti non complete quando esistano prove; distinguere nessuna presenza da ID o statistiche mancanti.
- **Motivo:** copertura provider e presenze disomogenee; non assenza delle squadre.
- **File:** `data/normalized/champions-player-stats-2026-27.json`, `champions-player-stats-2025-26.json`, `champions-registered-squads-2026-27.json`, campi summary.
- **Dipendenze:** B01–B05 e identità provider.
- **Impegno:** 1–2 giorni triage, recupero variabile.
- **Prossima azione:** suddividere i missing per causa prima di promettere copertura quantitativa totale.

### B07 — 157 giocatori non valutabili nel candidato minuti

- **Area/stato/priorità:** esposizione individuale; PARZIALE; alta.
- **Obiettivo:** estendere forecast nell'universo titolari/potenziali subentranti.
- **Realizzato:** universo 685; 528 con minuti; 496 forecast completi; 173/289 subentranti coperti.
- **Manca:** 82 ID provider, storia sufficiente per 66 casi panchina/ingresso e 9 titolari.
- **Motivo:** soglie minime non raggiunte. `completeForSnapshotUniverse=true` attesta classificazione completa, non forecast numerico per tutti.
- **File:** `output/reports/champions-substitute-minutes-2026-10-13.md`, sezioni 1–2; `data/analysis/champions/substitute-forecast-candidate-2026-10-13.json`; `scripts/champions/substitute-minutes.js`.
- **Dipendenze:** B06, nuove presenze datate e crosswalk esatti.
- **Impegno:** 2–5 giorni per ID recuperabili; calendario per storie insufficienti.
- **Prossima azione:** separare recupero ID dalla crescita del campione; non ridurre le soglie.

### B08 — Disponibilità e rotazioni timestampate

- **Area/stato/priorità:** input prepartita; PARZIALE; alta.
- **Obiettivo:** usare disponibilità documentate nell'esposizione prevista.
- **Realizzato:** il candidato dichiara availabilityData `not-integrated-no-timestamped-player-availability-feed-in-current-champions-inputs`.
- **Manca:** evidenza individuale datata verificabile e associata per ID.
- **Motivo:** assenza di feed idoneo; nessun infortunio/assenza inventato.
- **File:** candidato Fase 11, availabilityData; report substitute-minutes, blocchi residui.
- **Dipendenze:** fonte, canonicalPlayerId e kickoff.
- **Impegno:** 2–4 giorni per pilota.
- **Prossima azione:** campione documentale con publishedAt e retrievedAt separati prima dell'integrazione.

### B09 — Primo freeze completo Champions realmente pre-kickoff

- **Area/stato/priorità:** snapshot; SOSPESO; alta.
- **Obiettivo:** congelare universo completo per calibration/test futuri.
- **Realizzato:** freezer esclusivo, idempotenza e valutatore; candidati Fasi 10/11 sono ricalcoli MD1 post-kickoff. Directory canonica `data/predictions/champions/pre-match-snapshots` assente.
- **Manca:** input futuro valido, freeze e join actual successivo.
- **Motivo:** nessun candidato futuro ammissibile negli artefatti presenti; MD1 non può essere promosso a originale.
- **File:** `scripts/freeze-champions-pre-match-snapshot.js:12`, `scripts/evaluate-champions-complete-snapshots.js`, report complete-forecast e substitute-minutes del 13 ottobre.
- **Dipendenze:** B07–B08, classificazione completa e kickoff verificato; gli esclusi giustificati restano espliciti.
- **Impegno:** 1–2 giorni più calendario.
- **Prossima azione:** preparare la prossima giornata con input ammissibili, preservando ogni null motivato.

### B10 — Validazione OOS del modello minuti Fase 11

- **Area/stato/priorità:** ricerca minuti; SOSPESO; alta.
- **Obiettivo:** provare il beneficio dei nuovi minuti su dati non usati nel disegno.
- **Realizzato:** candidato, esposizione ingresso, massimo 990 minuti e riconciliazione volumi squadra.
- **Manca:** MAE/RMSE minuti e tiri/SOT su finestra futura indipendente, confrontata al modello operativo.
- **Motivo:** MD1 ricostruito dopo kickoff; il report dichiara qualità non calibrata OOS.
- **File:** report substitute-minutes, sezioni 3–5; `output/reports/champions-md2-improvement-research-2026-10-15.md`, confronto minuti.
- **Dipendenze:** B09 e actual completi.
- **Impegno:** 1–3 giorni di evaluation oltre alla raccolta.
- **Prossima azione:** preregistrare campione comune e criteri; non sostituire 84,6 sulla sola MD2.

### B11 — Confronto cronologico paired A/B/C

- **Area/stato/priorità:** calibrazione; SOSPESO; alta.
- **Obiettivo:** training/calibration/test separati sullo stesso universo.
- **Realizzato:** Fase 9: 18/18 gare, 94 osservazioni valide A, 7 incomplete; 422 actual oltre top-5 senza forecast originale.
- **Manca:** forecast B/C cronologicamente ammissibili, finestre indipendenti e probabilità originali dove il modello le emette.
- **Motivo:** B CHRONOLOGY_BLOCKED, C UNCALIBRATED; unica giornata test e forecast storici top-5-only.
- **File:** `output/reports/champions-historical-recovery-audit-2026-10-13.md`, sezioni 4–6; audit model-calibration dell'11 ottobre.
- **Dipendenze:** B09 e crescita temporale campione.
- **Impegno:** 2–4 giorni analisi più diverse finestre calendario.
- **Prossima azione:** usare benchmark aggiornato da 94 osservazioni, non quello vecchio da 30; vietato il backfill di probabilità.

### B12 — Cinque discrepanze UEFA List A temporalmente ambigue

- **Area/stato/priorità:** rose/eleggibilità; DA VERIFICARE; media.
- **Obiettivo:** distinguere omissione iniziale da registrazione successiva.
- **Realizzato:** 37 identità verificate, Mika risolto via overlay; 33 delta classificati, zero errori reali confermati.
- **Manca:** timestamp storico UEFA per cinque casi List A.
- **Motivo:** pagina corrente insufficiente a provare lo stato passato.
- **File:** report historical-recovery, sezioni 2 e 6; report complete-forecast, sezione 1.
- **Dipendenze:** documenti storici datati.
- **Impegno:** 0,5–2 giorni, prova forse non reperibile.
- **Prossima azione:** verificare solo quei cinque casi; conservare classificazione non-errori automatici in assenza di prova.

### B13 — Nove esiti grigi residui MD2

- **Area/stato/priorità:** risultati; PARZIALE; alta.
- **Obiettivo:** chiudere i contratti esatti con evidenza sufficiente.
- **Realizzato:** 117 contratti finali: 74 verdi, 34 rossi, 9 grigi; recuperati 27 dei 36 grigi iniziali.
- **Manca:** actual/catene sostituto diretto/legni o riconciliazione provider per i nove residui.
- **Motivo:** prova insufficiente o discordante; nessuna sconfitta da missing.
- **File:** `output/reports/champions-post-match-audit-2026-10-15.md` e `.json`; `output/champions-audit-browser-validation.json`.
- **Dipendenze:** contratto originale, fonti verificabili; B14 è separato.
- **Impegno:** 1–3 giorni, reperibilità incerta.
- **Prossima azione:** estrarre i nove ID grigi dal JSON e cercare solo la prova mancante.

### B14 — Certificazione provider e rendimento definitivo

- **Area/stato/priorità:** settlement; DA VERIFICARE; alta.
- **Obiettivo:** distinguere rendimento statistico da liquidazione ufficiale.
- **Realizzato:** esiti statistici e conferme utente conservati con provenienza; nessuna ricevuta/liquidazione Sisal acquisita nel report.
- **Manca:** eventuale prova provider per dichiarare settlement certificato; ROI definitivo limitato anche dai grigi.
- **Motivo:** documentazione disponibile statistica, non ricevute ufficiali. Non si presume che siano state effettuate puntate.
- **File:** post-match audit, limiti; `output/champions-md02-settlement/REPORT.md`.
- **Dipendenze:** B13 per chiusura statistica; documento eventualmente fornito dall'utente.
- **Impegno:** 0,5–1 giorno dopo disponibilità.
- **Prossima azione:** mantenere etichette distinte; riconciliare eventuali documenti senza automazione di account.

### B15 — Actual individuali esatti per il backtest MD2

- **Area/stato/priorità:** validazione player; PARZIALE; media.
- **Obiettivo:** errori puntuali su target omogenei e universo esplicito.
- **Realizzato:** point-score secondari parziali, esiti di soglia e fonti per riga; minimi documentati distinti dai conteggi esatti.
- **Manca:** minuti/tiri/SOT esatti sull'universo definito, catene e conflitti riconciliati.
- **Motivo:** una prova sufficiente per Over non identifica sempre il conteggio finale.
- **File:** report improvement-research del 15 ottobre, tabelle actual e limiti; post-match audit.
- **Dipendenze:** B13 non basta: esito contratto e actual puntuale sono oggetti differenti.
- **Impegno:** 2–5 giorni.
- **Prossima azione:** completare le righe identificate senza usare un limite inferiore come actual esatto.

### B16 — Follow-up futuro della ricerca arbitrale

- **Area/stato/priorità:** arbitri research; SOSPESO; media.
- **Obiettivo:** verifica preregistrata su stagione futura mai osservata, se si prosegue la ricerca.
- **Realizzato:** Fasi 2B/2C/2D concluse; 589/753 designazioni pre-kickoff, soltanto 38/753 almeno 48h; effetto arbitrale respinto.
- **Manca:** nuovo holdout intatto e migliore evidenza temporale ufficiale.
- **Motivo:** vantaggio non robusto; NON ATTIVARE è decisione conclusa, non implementazione mancante.
- **File:** `output/reports/champions-referee-phase-2d-2026-10-13.md`, raccomandazione e decisioni; report 2C e `docs/reports/champions-referee-phase-2b-2026-10-13.md`.
- **Dipendenze:** nuova stagione e fonti datate.
- **Impegno:** 1–3 giorni protocollo, lunga attesa calendario.
- **Prossima azione:** conservare il verdetto; nessuna integrazione di k=160 o correzione arbitrale operativa.

## Schede dettagliate — sito e infrastruttura

### C01 — Suite rose/campo Serie A

- **Area/stato/priorità:** test sito; PARZIALE; alta.
- **Obiettivo:** verifiche significative su rose, fonti e disposizione del campo.
- **Realizzato:** tre suite rilanciate, tre failure: Inter 24 contro 32, fonte Atalanta probable MD5, reverse() atteso nel renderer Letture.
- **Manca:** stabilire per ciascun caso contratto vigente e comportamento effettivo, poi intervenire su test o implementazione in base alle prove.
- **Motivo:** aspettative statiche precedenti e restyle recente; failure certa, bug UI non dimostrato.
- **File:** `scripts/team-pages/test-completed-teams.js:7`, `:13`; `test-all-teams.js:43`; `test.js:158`.
- **Dipendenze:** rose attuali, requisito campo e commit c8c48026.
- **Impegno:** 0,5–2 giorni.
- **Prossima azione:** confronto semantico prima di aggiornare expected; nessun indebolimento degli assert solo per ottenere verde.

### C02 — Suite integrazione/Letture Champions

- **Area/stato/priorità:** test Champions; PARZIALE; alta.
- **Obiettivo:** suite attendibile dopo ufficiali e restyle.
- **Realizzato:** falliscono hash ufficiali MD2, requisito link diretto pilot e conteggio Letture 7 contro 3; test rendering ufficiali passa.
- **Manca:** riconciliare versioni/hash e contratto di navigazione/card con i requisiti correnti.
- **Motivo:** failure già annotate nei report, ora riprodotte su HEAD; non tutte sono regressioni del prodotto.
- **File:** `scripts/test-champions-md02-integration.js:19`, `test-champions-pilot-predictions.js:70`, `test-champions-reading-page.mjs:122`.
- **Dipendenze:** UI vigente e fixture canoniche.
- **Impegno:** 1–2 giorni.
- **Prossima azione:** separare invarianti contrattuali da snapshot del contenuto e verificare il link effettivo.

### C03 — Test policy titolari fermo a quattro esclusi

- **Area/stato/priorità:** policy condivisa; PARZIALE; alta.
- **Obiettivo:** filtro coerente su Lettura/Schedina/Preferiti/MyCombo e selezioni salvate.
- **Realizzato:** policy, archivio e test presenti; test si ferma a 7 != 4.
- **Manca:** audit corrente fixture per fixture e prosecuzione dei controlli oltre il conteggio storico.
- **Motivo:** baseline precedente a ulteriori ufficiali; non è dimostrato un errore del filtro.
- **File:** `scripts/test-official-starter-policy.cjs:8`, `scripts/apply-official-starter-policy.js`, `data/technical-archive/official-nonstarter-markets.json`.
- **Dipendenze:** ufficiali canoniche e contratti salvati.
- **Impegno:** 0,5–1 giorno.
- **Prossima azione:** verificare i sette archiviati e tutte le selezioni operative, mantenendo quote/soglie/modificatori.

### C04 — Guard storici confrontati con file vivi

- **Area/stato/priorità:** test audit; PARZIALE; media.
- **Obiettivo:** verificare integrità storica nel corretto contesto.
- **Realizzato:** full-data coverage fallisce sull'hash builder; historical recovery sull'hash calendario vivo.
- **Manca:** separare replay storico e regressione corrente, provando l'origine Git dei delta.
- **Motivo:** manifest di fasi congelate confrontati con file successivamente aggiornati.
- **File:** `scripts/test-champions-full-data-coverage.js:93`, `test-champions-historical-recovery-audit.js:103`, relativi manifest Fasi 6/9.
- **Dipendenze:** commit e fonti della fase corretta.
- **Impegno:** 1–2 giorni.
- **Prossima azione:** replay in copia/commit corretti, senza riscrivere automaticamente i vecchi hash.

### C05 — Copertura QA degli ultimi restyle

- **Area/stato/priorità:** desktop/tablet/mobile; DA VERIFICARE; media.
- **Obiettivo:** accertare tutte le superfici modificate nell'ultima revisione.
- **Realizzato:** test moduli/CSS passano; prove browser audit Champions a 390/768/1440 senza overflow. Commit successivi modificano home, design, maglie e formazioni.
- **Manca:** prova che ciascuna superficie dell'ultimo commit sia stata controllata visivamente.
- **Motivo:** vecchi screenshot non certificano modifiche successive; nessun difetto grafico aggiuntivo è dimostrato da questo audit.
- **File:** `output/champions-audit-browser-validation.json`; `scripts/test-app-modules.mjs`; `js/pages/home.js`, `js/components/match-card.js`, renderer campo.
- **Dipendenze:** checkout stabile e C01–C03.
- **Impegno:** 0,5–1 giorno.
- **Prossima azione:** matrice pagina × viewport su commit definitivo; nuova sessione visuale non eseguita qui.

### D01 — Riproducibilità build e percorso Pages

- **Area/stato/priorità:** infrastruttura; DA VERIFICARE; media.
- **Obiettivo:** generazione integrale riproducibile e percorso pubblicazione documentato.
- **Realizzato:** builder/shell presenti; package concatena build/backtest con diversi target fissi fino MD6; `.github/workflows` assente.
- **Manca:** replay completo isolato, controllo differenze e configurazione effettiva GitHub Pages.
- **Motivo:** build non eseguito per preservare dati e pagine; remoto non interrogato. Assenza workflow non implica mancata pubblicazione.
- **File:** `package.json`, `README.md`, `scripts/build-site.js`.
- **Dipendenze:** copia isolata, C01–C04; autorizzazione successiva per rigenerare.
- **Impegno:** 0,5–2 giorni.
- **Prossima azione:** build in copia separata dopo autorizzazione; verifica hosting in sola lettura, senza deploy.

### D02 — Documentazione operativa rimasta a fasi superate

- **Area/stato/priorità:** documentazione; PARZIALE; bassa.
- **Obiettivo:** istruzioni fedeli a pipeline e stato delle stagioni.
- **Realizzato:** README parla ancora di 2023/24 e 2024/25 prepared-not-run, ma aggregati/raw archiviati esistono; continuous evaluator dichiara stages 2–7 not implemented, superato in parte da M0/M1/M2 research.
- **Manca:** distinguere esplicitamente produzione, ricerca completata e attivazioni escluse.
- **Motivo:** documentazione non aggiornata insieme alle fasi successive.
- **File:** `README.md`, `scripts/evaluate-continuous-predictions.js:361`, report closure exact-score del 9 ottobre.
- **Dipendenze:** A01 e A07 per stato effettivo.
- **Impegno:** 0,5 giorno.
- **Prossima azione:** revisione mirata dopo autorizzazione; non interpretare la vecchia roadmap come nuovi requisiti.

## Progetto adiacente FantaChampions

### F01 — Sostituzione proxy voto

- **Area/stato/priorità:** ottimizzatore; PARZIALE; bassa.
- **Obiettivo:** usare voti Fantacalcio osservati appena esista campione sufficiente.
- **Realizzato:** ottimizzatore, tre strategie e output validati; proxy voto base dichiarato nel report.
- **Manca:** voti omogenei, campione sufficiente e ricalcolo separato.
- **Motivo:** disponibilità dati condiziona il follow-up esplicito.
- **File:** `fantachampions-2026-27/output/report.md`, limiti punto 3; `scripts/run_analysis.py` del sottoprogetto.
- **Dipendenze:** fonte voti e criterio di sufficienza; nessun acquisto.
- **Impegno:** 1–3 giorni dopo disponibilità.
- **Prossima azione:** censire voti e target, mantenere esplicito il proxy finché insufficiente.

### F02 — Quotazioni correnti e disponibilità prima dell'uso

- **Area/stato/priorità:** proposta rosa; SOSPESO; bassa, condizionato all'uso.
- **Obiettivo:** confrontare nell'app le 28 quotazioni prima di un eventuale acquisto.
- **Realizzato:** proposta basata sul PDF iniziale, con avvertenza e piano cambi MD3–MD8/knockout.
- **Manca:** prezzi correnti e disponibilità alla scadenza effettiva; nessuna prova di acquisto.
- **Motivo:** verifica rinviata al momento dell'uso; nessun feed corrente certificato nel report.
- **File:** `fantachampions-2026-27/output/report.md`, limiti punti 1–2; `data/source-manifest.json` del sottoprogetto.
- **Dipendenze:** documenti/accesso dell'utente e intenzione di usare la rosa.
- **Impegno:** 1–2 ore quando i dati siano disponibili.
- **Prossima azione:** verificare solo in caso d'uso; nessuna automazione di account o acquisto.

## Attività completate e prove di chiusura

| ID | Attività | Evidenza sufficiente / limite |
|---|---|---|
| K01 | 20 squadre, 380 fixture, 20 loghi | `scripts/validate-data.js` PASS corrente: 38 giornate, 19 casa/19 fuori |
| K02 | Classifiche generale/casa/trasferta e profili tattici | stesso test PASS su coerenza e copertura 20/20; non certifica freschezza esterna |
| K03 | Modularizzazione sito e CSS | `test-app-modules.mjs` PASS, 9 pagine/4 componenti; `test-css-modules.js` PASS, 11 moduli |
| K04 | Probabili e identità Serie A | `test-probable-lineups.js` PASS: 220 titolari, 450 collegati; identità PASS su 1.910 righe referti e 1.696 ufficiali |
| K05 | Precedenza e rendering ufficiali Champions | `test-champions-official-formations.mjs` PASS corrente |
| K06 | Policy canonica e propagazione ai consumatori | `output/reports/champions-seven-official-2026-10-14.md`, report two-official e settlement; manutenzione test C03 distinta |
| K07 | Contratto BetSelection | `test-betting-selection-contract.js` PASS: 6 schedine, 137 MyCombo e 137 prediction legs |
| K08 | Store MyCombo personale | `test-personal-betslip.mjs` PASS: persistenza, deduplica, contesti e compatibilità |
| K09 | Sincronizzazione forecast | `test-forecast-sync.js` PASS, idempotenza e aggiornamenti espliciti quote |
| K10 | Esclusione doppia chance 12 dalla MD6 | `scripts/betting-market-policy.js:42` e `:58`, motivo DOUBLE_CHANCE_12_NOT_PLAYABLE |
| K11 | Listone Fantacalcio integrato | `test-fantasy-listone.js` PASS: 533 righe attive, 512 consigli quotati |
| K12 | Aggiornamento actual V2 MD6 | continuous evaluation del 13 ottobre: 10 gare/200 osservazioni, zero pending; distinto dal vecchio report da 198 |
| K13 | Future-data readiness V2 | `test-future-data-readiness.js` PASS, 30 controlli su cutoff, null/zero, riconciliazioni e maturazione |
| K14 | Verifica indipendente identità Champions Fase 9 | historical-recovery: 37/37 verificate, Mika risolto; non implica provider ID per tutti |
| K15 | Recupero actual MD1 | historical-recovery: 18/18 gare, 12 referti nuovi e 94 osservazioni valide |
| K16 | Formato completo, overlay e freezer Champions | complete-forecast Fase 10: 970 registrati, overlay 38, esclusività e evaluator implementati; primo freeze reale B09 aperto |
| K17 | Implementazione candidato minuti subentranti | Fase 11: 173 subentranti con forecast e riconciliazione volumi; OOS B10 ancora aperta |
| K18 | Ricerca arbitri Fasi 2B/2C/2D e decisione | report 2D finale: NON ATTIVARE; non è integrazione dimenticata |
| K19 | Audit MD2, recovery e vista audit responsive | `output/champions-audit-browser-validation.json`: 117 righe, 74/34/9, 390/768/1440 senza overflow, errors vuoto |
| K20 | Ricerca miglioramenti MD2 | report improvement-research 15 ottobre: simulazioni e verdetti conclusi, nessun nuovo coefficiente approvato |

## Attività superate, da non riaprire

| ID | Vecchia voce | Evidenza successiva |
|---|---|---|
| S01 | Mika Medina ancora irrisolto | Fase 9: Mika Mármol Medina, alias verificato; provider ID è problema distinto |
| S02 | 37 identità basate solo sul nome | Fase 9: 37/37 verificate con affiliazione indipendente |
| S03 | Baseline A MD1 solo 6 gare/30 osservazioni | Fase 9: 18 gare/94 osservazioni; limite top-5 resta B11 |
| S04 | Nessun subentrante Champions con forecast | Fase 11: 173; copertura totale ancora B07 |
| S05 | 36 grigi MD2 | Recovery successivo: 27 risolti, 9 residui B13 |
| S06 | V2 MD6 ancora pending | continuous evaluation 13 ottobre: zero pending; exact-score dedicato A01 distinto |
| S07 | Policy doppia chance 12 non implementata | Funzione e filtro operativi dalla MD6 |
| S08 | Assenza assoluta raw arbitrali | 2.310 gzip nell'archivio; resta A07 per percorso e replay |

Non sono superati i limiti residui solo perché una fase successiva esiste: la Fase 9 risolve le identità, non i sette referti domestici; la Fase 11 implementa minuti, non la loro validazione OOS.

## Test non distruttivi eseguiti

**21 suite dirette: 12 PASS e 9 FAIL**, Node v22.11.0. Nessun build o npm test aggregato, per evitare rigenerazioni/validazioni con scritture e mescolanza di fasi storiche. Gli avvisi MODULE_TYPELESS_PACKAGE_JSON non sono failure e non sono conteggiati come lavoro incompleto.

Tutti i percorsi seguenti partono da `scripts/`.

| Script | Esito | Riscontro |
|---|---|---|
| validate-data.js | PASS | calendario, 20 squadre/loghi, classifica, arbitri e profili |
| team-pages/test.js | FAIL | riga 158: reverse() atteso nelle Letture |
| team-pages/test-completed-teams.js | FAIL | riga 13: Inter 24 != 32 |
| team-pages/test-all-teams.js | FAIL | riga 43: fonte Atalanta probable MD5 |
| test-app-modules.mjs | PASS | 9 pagine e 4 componenti |
| test-champions-md02-integration.js | FAIL | riga 19: hash ufficiali attuale 62C9F38B… != 72172D79… |
| test-betting-selection-contract.js | PASS | 6 schedine, 137 MyCombo e 137 prediction legs |
| test-personal-betslip.mjs | PASS | store, contesti, persistenza |
| test-forecast-sync.js | PASS | idempotenza, quote esplicite, hash storici |
| test-champions-official-formations.mjs | PASS | precedenza ufficiali, panchine e render |
| test-prediction-evaluation-v2.js | PASS | 10 gare/198 osservazioni nel report legacy; continuous ha 200 |
| test-future-data-readiness.js | PASS | 30 controlli |
| test-champions-full-data-coverage.js | FAIL | riga 93: hash builder diverso dal manifest storico |
| test-champions-reading-page.mjs | FAIL | riga 122: 7 != 3 |
| test-official-starter-policy.cjs | FAIL | riga 8: 7 != 4 |
| test-css-modules.js | PASS | 11 moduli |
| test-probable-lineups.js | PASS | 220 titolari, 450 collegati, zero unmatched |
| test-player-identities.js | PASS | 1.910 righe giocatore referti, 1.696 ufficiali |
| test-fantasy-listone.js | PASS | 533 attivi, 512 consigli quotati |
| test-champions-pilot-predictions.js | FAIL | riga 70: requisito link diretto Letture |
| test-champions-historical-recovery-audit.js | FAIL | riga 103: hash calendario vivo diverso dal protetto |

Le 9 failure sono riprodotte, ma non sono 9 difetti di produzione provati. Gli assert successivi al primo errore non sono certificati. C01–C04 richiedono analisi semantica: nessun expected/hash è stato aggiornato per mascherare il problema.

## Lavori dimenticati e dipendenze oggi risolte

- **A01** è il follow-up più netto: l'attesa dei risultati è terminata, ma il file exact-score conserva PENDING e campione zero.
- **A05** conserva readiness del 3 ottobre senza payload; la cattura MD6 non può essere completata retroattivamente.
- **B09** distingue formato/freezer implementato dall'effettiva cattura completa, ancora assente nel percorso canonico.
- **C01–C04** raccolgono failure già annotate e ancora riproducibili dopo gli interventi successivi.
- **A07** ha una dipendenza in parte risolta: raw reperibili nell'archivio; da verificare integrità, copertura e replay.
- **D02** evita falsi backlog: roadmap scritte prima di M0/M1/M2 e delle stagioni arbitrali non rappresentano lo stato finale.

## Decisioni concluse e proposte escluse dal backlog

- **NON ATTIVARE effetto arbitrale Champions:** decisione conclusa Fase 2D. B16 è solo il follow-up sperimentale futuro documentato, non una richiesta di integrazione.
- **DUO e legni:** probabilità/fair odds/EV null sono la scelta corretta finché il contratto non è modellato. Il modello completo DUO è proposta TESTARE P3, non requisito approvato incompiuto.
- **SCARTARE nella ricerca MD2:** moltiplicatori player globali/per lega, riduzioni uniformi arbitrarie e sostituzione del fit gol col solo prior. Non vanno implementati.
- Nuovo ramo gol, astensione EV, limiti esposizione e nuove ablation tattiche sono proposte TESTARE; non conteggiate come NON INIZIATO.
- M3/M4, V3, ensemble e correzioni low-score/dependency non diventano obblighi da una vecchia roadmap. Promozione richiede prove e decisione separata.
- Riserve registered-reserve fuori universo partita, null da nessuna presenza e ruoli generici documentati non sono automaticamente bug.
- Nessun file è dichiarato inutilizzato solo perché duplicato, `_tmp` o in output. Script report, snapshot e archivi possono servire alla ricostruzione; prima di rimuovere serve un grafo consumer.
- Nessuna promessa inevasa dimostrata di uniformare ulteriormente glass/navbar/card: restyle recenti esistono; C05 riguarda la prova di verifica.
- Nessuna prova di Pages non pubblicato o deploy fallito. Workflow assente non equivale a hosting assente.
- Il primo piano futuro FantaChampions MD3–MD8 è manutenzione condizionata al calendario, non un insieme di trasferimenti già dimenticati.

## Le dieci attività più importanti

1. **A01 — Valutare exact-score MD6:** dipendenza risolta, costo contenuto, follow-up esplicito ancora aperto.
2. **C03 — Verifica corrente filtro titolari:** protegge coerenza operativa e selezioni salvate.
3. **C02 — Riconciliare suite Champions:** rende nuovamente visibili regressioni reali dopo ufficiali e restyle.
4. **B13 — Nove grigi MD2:** limitano rendimento definitivo; chiusura solo con prove contrattuali.
5. **B09 — Freeze futuro completo Champions:** evita ulteriore perdita di evidenza prepartita.
6. **B07 — Provider ID e storie minuti:** blocco a monte della copertura, non risolvibile cambiando coefficienti.
7. **B08 — Disponibilità timestampata:** prerequisito dell'esposizione prepartita affidabile.
8. **A02 — Raccolta prospettica V2:** distingue rumore MD6 e bias persistenti.
9. **A07 — Replay raw arbitrali:** archivio reperibile, recupero di verificabilità senza inventare dati.
10. **B01–B05 — Programma recovery domestico:** cinque schede coordinate per una copertura multilega meno disomogenea, non ulteriori attività da sommare.

## Quick wins

- A01: evaluator già presente e verifica hash, dopo autorizzazione.
- A07: inventario/hash e lettura di un campione archiviato prima di ripristinare qualsiasi percorso.
- C03: audit dei sette esclusi e delle fixture correnti, senza indebolire il contratto.
- D02: revisione mirata delle istruzioni rimaste a fasi superate, dopo autorizzazione.
- A08: confronto report missing con i 29 null correnti, senza importazione generale.
- B12: ricerca limitata ai cinque delta con cronologia ambigua, senza riscrivere tutte le rose.

“Rapido” non significa che una fonte mancante sia certamente reperibile: nessuna promessa di chiusura dei grigi prima di trovare la prova.

## Roadmap operativa

| Ordine | Lavoro | Dipendenze e criterio di uscita |
|---|---|---|
| 1 | A01 e triage C01–C04 | Nessun refit, hash congelati invariati; test riferiti ai requisiti vigenti e failure residue spiegate |
| 2 | B13–B15 e A07 | Evidenze per contratto, missing espliciti, raw leggibili; B14 resta distinto dalla verifica statistica |
| 3 | B07–B08 e recovery B01–B06 | ID esatti, fonti timestampate, storie sufficienti; nessuna riduzione delle soglie |
| 4 | Prima del prossimo kickoff: B09, A02, A05 | Snapshot futuri, manifest immutabili, universo classificato; non attendere recuperi lunghi per catturare evidenza ammissibile |
| 5 | Dopo gli esiti: B10–B11 e A04 | Campione comune, holdout temporale e gate vigenti; nessuna scelta a posteriori sul MD2 |
| 6 | C05 e D01 | QA desktop/tablet/mobile e build in copia isolata su commit stabile; hosting verificato senza deploy |
| 7 | A08–A10, D02 e F01–F02 | Recupero mirato, documentazione, uso Fanta condizionato; nessun acquisto |
| 8 | B16 e crescita del campione | Stagione futura intatta; NON ATTIVARE resta valido fino a nuove prove e decisione distinta |

Le scadenze pre-kickoff prevalgono temporalmente sul completamento dei recuperi lunghi: perdere un cutoff crea un vuoto non riparabile con ricalcoli. Le stime non si sommano meccanicamente, perché molte attività condividono raccolta, fonti e attese. Ogni correzione o rigenerazione resta subordinata alla successiva autorizzazione dell'utente.

## Copertura e limiti della ricognizione

| Area richiesta | Verifica e limite |
|---|---|
| Serie A database/statistiche | Census 20 squadre/533 righe, test generali, missing e report import; nessun refresh fonti |
| V1/V2, calibrazione e backtest | Artefatti storici/prospettici separati, evaluation/future-data correnti; nessun tuning |
| Ufficiali, arbitri, quote, letture e schedine | Policy/contratti/sync, report Fasi 5A–E e ufficiali; invarianti di quote/soglie preservate |
| Champions 36 squadre | 970 registrati, summary attuali, Fasi 7–11; 33 delta UEFA non trasformati in errori |
| Adattamento multilega/referee | Benchmark distinti per target/competizione, Fasi 2B–D e ricerca MD2; nessuna trasferibilità presunta |
| Home/classifica/squadre/arbitri/partite/campo/maglie | Moduli, test e storia recente; QA visiva corrente complessiva C05 non certificata |
| Lettura/Schedina/Preferiti/MyCombo | Test contratti/store/sync e ufficiali PASS; filtro storico test da riconciliare |
| Responsive | Prove browser preesistenti 390/768/1440 lette; nessuna nuova sessione browser |
| Infrastruttura/duplicati/dipendenze | Package, percorsi, raw e consumatori mirati; nessuna rimozione basata sul solo nome |
| Build e Pages | Shell e comandi presenti; build e configurazione remota non verificati live |

Le ricerche TODO/FIXME/non implementato hanno richiesto triage: “metodo”, quote “sospese” e template di report non sono TODO. `M3 not implemented` è un'esclusione deliberata del comando research. Non è stata provata una promessa aggiuntiva ancora vigente da classificare NON INIZIATO. Le istruzioni AGENTS sulle ufficiali non richiedono l'esecuzione dei builder durante questo audit, perché non viene aggiornata alcuna formazione.

## Inventario sistematico dei Markdown tracciati

Letti per struttura e ricerca dei marker di lavoro: **73 documenti**. Le occorrenze sono un indice di triage, non attività aggiuntive; comprendono stati storici superati. I documenti chiave sono stati inoltre letti nelle sezioni di decisione e confrontati con artefatti/test correnti.

| Documento | Righe | Marker di triage |
|---|---:|---:|
| `AGENTS.md` | 11 | 1 |
| `README.md` | 55 | 1 |
| `assets/images/teams/monochrome/README.md` | 13 | 0 |
| `data/analysis/champions/referee-coverage-2026-10-13.md` | 44 | 1 |
| `data/analysis/champions/referee-phase-2a-report-2026-10-13.md` | 80 | 1 |
| `data/analysis/exact-score-research/baselines-m1-m2-report.md` | 527 | 1 |
| `data/analysis/exact-score-research/research-report.md` | 48 | 0 |
| `data/normalized/fixtures/README.md` | 3 | 0 |
| `data/normalized/results/README.md` | 3 | 0 |
| `data/predictions/card-snapshots/README.md` | 7 | 0 |
| `data/raw/README.md` | 7 | 0 |
| `data/sources/champions-referees/README.md` | 23 | 0 |
| `data/sources/readings/README.md` | 11 | 0 |
| `docs/card-data-targets-v1.md` | 77 | 3 |
| `docs/card-prediction-research-c0-c4.md` | 45 | 0 |
| `docs/exact-score-baselines-m1-m2.md` | 527 | 1 |
| `docs/exact-score-research-framework.md` | 134 | 1 |
| `docs/prediction-calibration-v2.md` | 260 | 2 |
| `docs/prediction-continuous-evaluation-v2.md` | 55 | 2 |
| `docs/reports/champions-referee-phase-2b-2026-10-13.md` | 154 | 1 |
| `fantachampions-2026-27/README.md` | 28 | 0 |
| `fantachampions-2026-27/output/report.md` | 310 | 0 |
| `output/champions-md02-settlement/REPORT.md` | 48 | 0 |
| `output/champions-motivation-md01-report.md` | 47 | 1 |
| `output/champions-results/update-report.md` | 11 | 0 |
| `output/reports/audit-cartellini-2026-10-03.md` | 195 | 9 |
| `output/reports/card-foundation-2026-10-03.md` | 346 | 8 |
| `output/reports/card-prediction-research-c0-c4-2026-10-03.md` | 379 | 6 |
| `output/reports/card-prediction-research-c0-c4-recorded-yellow-2026-10-04.md` | 464 | 0 |
| `output/reports/champions-complete-forecast-snapshots-2026-10-13.md` | 53 | 2 |
| `output/reports/champions-data-recovery-audit-2026-10-09.md` | 311 | 16 |
| `output/reports/champions-full-data-coverage-2026-10-09.md` | 725 | 14 |
| `output/reports/champions-historical-recovery-audit-2026-10-13.md` | 121 | 2 |
| `output/reports/champions-md02-final-audit-2026-10-13.md` | 149 | 1 |
| `output/reports/champions-md02-phase12-integration-2026-10-13.md` | 166 | 2 |
| `output/reports/champions-md02-phase12c-individual-2026-10-13.md` | 104 | 3 |
| `output/reports/champions-md02-phase12d-market-expansion-2026-10-13.md` | 160 | 1 |
| `output/reports/champions-md2-improvement-research-2026-10-15.md` | 422 | 2 |
| `output/reports/champions-model-calibration-audit-2026-10-11.md` | 136 | 4 |
| `output/reports/champions-player-coverage-audit-2026-10-09.md` | 116 | 0 |
| `output/reports/champions-post-match-audit-2026-10-15.md` | 585 | 5 |
| `output/reports/champions-referee-phase-2c-2026-10-13.md` | 158 | 0 |
| `output/reports/champions-referee-phase-2d-2026-10-13.md` | 181 | 0 |
| `output/reports/champions-seven-official-2026-10-14.md` | 81 | 0 |
| `output/reports/champions-substitute-minutes-2026-10-13.md` | 56 | 3 |
| `output/reports/champions-two-official-2026-10-14.md` | 135 | 0 |
| `output/reports/como-roma-md06-official-pre-match-2026-10-11.md` | 185 | 1 |
| `output/reports/exact-score-md06-final-research-closure-2026-10-09.md` | 106 | 4 |
| `output/reports/inter-parma-md06-official-pre-match-2026-10-10.md` | 140 | 4 |
| `output/reports/lazio-monza-md06-official-pre-match-2026-10-11.md` | 151 | 0 |
| `output/reports/lecce-bologna-md06-official-pre-match-2026-10-11.md` | 159 | 0 |
| `output/reports/md6-latest-operational-2026-10-03.md` | 9110 | 0 |
| `output/reports/napoli-frosinone-md06-official-pre-match-2026-10-10.md` | 144 | 4 |
| `output/reports/serie-a-md05-betting-decision-review-2026-10-09.md` | 70 | 1 |
| `output/reports/serie-a-md06-betting-selection-2026-10-09.md` | 286 | 0 |
| `output/reports/serie-a-md06-definitive-selection-2026-10-10.md` | 116 | 0 |
| `output/reports/serie-a-md06-group-b-audit-2026-10-09.md` | 161 | 0 |
| `output/reports/serie-a-md06-operational-player-analysis-2026-10-09.md` | 838 | 14 |
| `output/reports/serie-a-md06-phase-5b2-2026-10-09.md` | 86 | 3 |
| `output/reports/serie-a-md06-phase-5c-volume-validation-2026-10-09.md` | 269 | 3 |
| `output/reports/serie-a-md06-phase-5d-duo-audit-2026-10-09.md` | 167 | 2 |
| `output/reports/serie-a-md06-phase-5e-final-audit-2026-10-09.md` | 234 | 3 |
| `output/reports/serie-a-md06-scenario-coherence-2026-10-10.md` | 96 | 0 |
| `output/reports/serie-a-md06-schedina-market-audit-2026-10-09.md` | 335 | 4 |
| `output/reports/serie-a-md06-schedina-phase-5a-2026-10-09.md` | 118 | 0 |
| `output/reports/serie-a-md06-statistical-models-2026-10-10.md` | 33 | 0 |
| `output/reports/serie-a-md06-suggested-forecasts-2026-10-10.md` | 135 | 0 |
| `output/reports/sisal-md06-1x2-ev-forensic-audit-2026-10-09.md` | 257 | 0 |
| `output/reports/sisal-md06-duo-market-compatibility-2026-10-09.md` | 212 | 1 |
| `output/reports/sisal-md06-market-analysis-2026-10-09.md` | 360 | 2 |
| `scripts/head-to-head/README.md` | 23 | 1 |
| `scripts/referee-stats/README.md` | 41 | 1 |
| `scripts/sisal/IDENTIFIERS.md` | 37 | 0 |

## Cronologia Git recente di supporto

```text
c8c48026 2026-10-15 probabili formazioni riadattate
51c8bda9 2026-10-15 colori maglie
ee4453fd 2026-10-15 design
8bacb55c 2026-10-15 migliorie
ab048a87 2026-10-15 dentro la stagione 4
11dcc833 2026-10-15 estetica
a53b1515 2026-10-15 m
a69c72a0 2026-10-15 dentro la stagione 2
f6d1afa8 2026-10-15 dentro la stagione
e9119b62 2026-10-15 card champions
8a277805 2026-10-15 report partite
d4ae4f28 2026-10-14 schedine
0bca2cff 2026-10-14 champions
ccd051ad 2026-10-14 colore mercati
10d8f88a 2026-10-14 champions
da2e921f 2026-10-14 verde - rosso
c3f193ba 2026-10-13 ricalcoli
21171023 2026-10-13 champions league
e5841a4f 2026-10-13 arbitri
8296bf6a 2026-10-13 daje
5f8e486f 2026-10-13 champions league
ab525b96 2026-10-13 listone 18 preferiti
```

## Nota finale sul checkout condiviso

Al controllo conclusivo sono comparsi anche cambi concorrenti in `js/components/lineup-field.mjs`, `js/team-squads.js`, `output/team-dashboard/` e `scripts/check-team-dashboard.cjs`. Non sono stati scritti o rimossi da questo audit. Le verifiche sopra descrivono i file al momento del rispettivo lancio, precedente a questi ultimi cambi: C01/C05 vanno quindi rivalutati sul checkout stabilizzato, senza considerare le failure una certificazione del nuovo stato concorrente. `git diff --check` finale non segnala errori di whitespace; solo avvisi di conversione LF/CRLF. Le 35 schede aperte e i conteggi 23/7/5 sono stati riconciliati automaticamente con le intestazioni e con le 20 chiuse/8 superate.
