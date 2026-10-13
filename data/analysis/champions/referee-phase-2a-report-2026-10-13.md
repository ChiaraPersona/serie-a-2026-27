# Champions League 2026/27 — Fase 2A arbitrale

Data di controllo: **2026-10-13**. Stato: **BLOCKED**. Stato calibrazione: **NOT_READY_FOR_CALIBRATION**. Nessun pronostico arbitrale è pubblicato e nessun builder attivo o file UI è collegato al modulo.

## Esito esecutivo

L'archivio MD2 supera la validazione cronologica e numerica per **18/18 arbitri**. I **19/19 snapshot** sono hash-validi e precedono i rispettivi kickoff; l'intervallo di acquisizione è 2026-10-13T13:23:42.6695201Z–2026-10-13T13:23:52.0917753Z, mentre il primo kickoff è 2026-10-13T16:45:00.000Z. Le ultime 10 sono complete, uniche, ordinate dalla più recente alla meno recente e precedenti al kickoff per **18/18 arbitri**.

Il modulo separato è pronto come **strato di feature e controllo**, ma **non è pronto per calibrare o produrre probabilità**. Mancano soprattutto una tabella storica match-level Champions con arbitro e target, snapshot pre-match delle covariate e timestamp orari certificati per le formazioni.

## Copertura dei 18 arbitri

| # | Arbitro | UCL corrente n | UCL storico n | Carriera n | Ultime n | Cronologia | Anomalia |
|---:|---|---:|---:|---:|---:|---|---|
| 01 | Igor Pajač | 0 | 2 | 120 | 10 | PASS | — |
| 02 | Sebastian Gishamer | 0 | 4 | 137 | 10 | PASS | — |
| 03 | Felix Zwayer | 1 | 28 | 206 | 10 | PASS | — |
| 04 | Glenn Nyberg | 3 | 21 | 176 | 10 | PASS | — |
| 05 | Rohit Saggi | 1 | 8 | 166 | 10 | PASS | — |
| 06 | Marco Guida | 1 | 18 | 139 | 10 | PASS | — |
| 07 | Nicholas Walsh | 1 | 4 | 179 | 10 | PASS | 179/180 preservato |
| 08 | Georgi Kabakov | 1 | 7 | 184 | 10 | PASS | — |
| 09 | Daniel Siebert | 1 | 18 | 110 | 10 | PASS | — |
| 10 | Donatas Rumšas | 1 | 14 | 61 | 10 | PASS | — |
| 11 | Tobias Stieler | 0 | 18 | 181 | 10 | PASS | — |
| 12 | François Letexier | 1 | 31 | 191 | 10 | PASS | — |
| 13 | Ivan Kružliak | 1 | 18 | 70 | 10 | PASS | — |
| 14 | Chris Kavanagh | 1 | 6 | 197 | 10 | PASS | — |
| 15 | Urs Schnyder | 0 | 8 | 163 | 10 | PASS | — |
| 16 | Sven Jablonski | 2 | 7 | 173 | 10 | PASS | — |
| 17 | Clément Turpin | 1 | 41 | 211 | 10 | PASS | — |
| 18 | Irfan Peljto | 1 | 23 | 72 | 10 | PASS | — |

Copertura positiva UCL corrente: **14/18**; UCL storico: **18/18**. Un campione con n=0 resta esplicitamente vuoto: non viene sostituito o fuso con il campionato nazionale.

## Controlli eseguiti

- Ogni snapshot raw è precedente al kickoff della partita assegnata; nessuna osservazione post-kickoff è stata inclusa o ha richiesto esclusione.
- Per righe stagione/competizione, aggregati di gruppo e ultime 10 sono riconciliati partite, gialli, rossi, falli, rigori, medie e totale cartellini. Le tolleranze coprono solo l'arrotondamento esposto dal provider.
- Gli Over recenti sono ricalcolati sulle soglie esatte: almeno 4, 5 e 6 totalCards. Gli Over carriera 4,5/5,5 sono validati come frequenze esposte; l'Over 3,5 carriera resta null.
- totalCards significa yellowCards + redCards. Non è sinonimo di gialli e non usa booking points.
- Gli ID canonici sono 18 e univoci. Sven Jablonski usa il provider ID 191; 33247 resta registrato come duplicato rifiutato.
- Nicholas Walsh conserva l'anomalia sorgente: 179 nel riepilogo carriera, 180 nella somma delle righe atomiche. Nessuna correzione artificiale.

## Dati già disponibili nel repository

- Formazioni probabili UEFA: 18 gare, 36 squadre, 396 giocatori. Il recupero è date-only: utilizzabile editorialmente, non come prova rigorosa pre-kickoff per calibrazione individuale.
- Giocatori integrati MD2: 396 righe; ID canonici 395, tasso cartellini 396, tasso falli 396, minuti 396.
- Archivio giocatori 2026/27: 970 giocatori, 691 con minuti, 621 completi e 279 non disponibili; dati fino a 2026-10-09. Lo storico 2025/26 contiene 970 giocatori, di cui 797 completi.
- Output cartellini attivo: una stima team-based esiste in 17/18 gare; candidati individuali pubblicati=0; refereeAdjustment null=18/18. Rimane invariato e non riceve input dalla Fase 2A.

## Proposta matematica senza pesi inventati

Per i totali, il candidato è un modello gerarchico negative-binomial match-level: `Y_m ~ NegBin(mu_m, phi)`, con `log(mu_m) = alpha_competizione-stagione + u_arbitro + beta^T x_partita`. Gli effetti arbitro sono parzialmente pooled; Champions, campionati nazionali e altre competizioni restano separati. Carriera e ultime 10 non sono sommati: le ultime 10 si sovrappongono alla carriera e potranno diventare solo una covariata con coefficiente appreso, oppure essere sostituite da righe match-level con decadimento temporale calibrato. Le probabilità Over 3,5/4,5/5,5 derivano dalla distribuzione predittiva solo dopo il fitting.

Per l'individuale, il target primario deve essere il giallo ordinario, separato da secondo giallo e rosso diretto. Il candidato è un modello gerarchico Bernoulli/hazard con partecipazione ed esposizione separate: tassi personali di gialli e falli, minuti attesi, ruolo, squadre/avversario e effetto arbitro. Coefficienti, shrinkage, soglie e conversioni in probabilità sono tutti da apprendere in walk-forward; Phase 2A non ne fissa nessuno.

L'affidabilità è un vettore strutturato, non un punteggio arbitrario: cronologia, identità, integrità, numerosità per campione, timing formazione, copertura giocatore e calibrazione out-of-sample. Gli stati ammessi sono BLOCKED, ELIGIBLE_FOR_CALIBRATION e CALIBRATED; oggi nessun record è CALIBRATED.

## Requisiti prima della calibrazione

- No match-level historical Champions training table currently joins referee assignment, pre-match team/player features and post-match card targets.
- Career and recent10 aggregates overlap and cannot identify independent weights or time decay.
- MD2 probable formations have date-only retrieval metadata, not a timestamp proving availability before each kickoff.
- No Champions individual-card calibration set currently freezes ordinary-yellow labels, minutes/participation and information available at prediction time.
- Eighteen future MD2 fixtures are a deployment cohort, not a calibration sample.

Servono quindi storico match-level con ID stabili, assegnazioni UEFA collegate agli esiti, snapshot pre-match di squadra/giocatore/formazione, target disciplinari non ambigui e validazione rolling-origin. Le metriche minime saranno MAE e log score per il conteggio, Brier e curve di calibrazione per gli Over, con confronto a baseline senza arbitro.

## Riproducibilità e regressioni

Sono congelati SHA-256 di 11 asset protetti: tiri/SOT, integrazione-letture, schedina, dati giocatori, formazioni, builder e renderer. Risultano byte-identici 9/11; 1 renderer ha ricevuto una modifica concorrente dell'utente dopo il baseline ed è registrato separatamente. Tutti gli 10/11 asset sono ammessi dal controllo, e nessuno importa o consuma il modulo Phase 2A. Il test ricalcola gli hash e ricostruisce l'output due volte.

I test archivio arbitri, schedina MD2 e lettura Champions passano. Il test pilot verifica tutti gli assert di dati e volumi fino alla riga 71, poi fallisce su una stringa UI attesa non più coincidente. Il test integrazione MD2 si arresta prima delle invarianti di volume perché conserva un hash atteso obsoleto per champions-league-2026-27.json (e2b70704c55d9528125ca5e29a204a383e27b8c6efb48871a6e6566ce7765c89, contro l'attuale 0c56f68c14f75007dcb3d90cb138bb27d7506db7751397692a2cbfec0c388485). Entrambi i fallimenti erano già presenti nello stato protetto: la Fase 2A non ha modificato quei file.

Durante il lavoro sono comparsi cambiamenti concorrenti non appartenenti alla Fase 2A in `css/champions.css`, `js/pages/champions.js` e `data/sources/champions-md02-phase12d-additions-2026-27.json`. Sono stati preservati e non inclusi tra i file arbitrali creati o modificati da questa fase.

## Verdetto

**ARCHIVIO VALIDATO; MODULO DIAGNOSTICO PRONTO; CALIBRAZIONE NON PRONTA.** La lacuna non è la copertura anagrafica dei 18 arbitri, ma il dataset di training match-level e temporalmente congelato necessario per stimare pesi e probabilità senza leakage.
