# Champions League 2026/27 — Fase 11 substitute minutes & full player forecast coverage

Data audit: **2026-10-13**  
Gate finale: **PARTIAL**

## 1. Copertura

| universo | totale | con expected minutes | copertura |
|---|---:|---:|---:|
| titolari | 396 | 355 | 89,6% |
| potenziali subentranti | 289 | 173 | 59,9% |
| universo snapshot | 685 | 528 | 77,1% |

- Giocatori esplicitamente non valutabili: **157**.
- Forecast completi tiri + SOT: **496** (titolari **323**, potenziali subentranti **173**).
- Squadre supportate: **36/36**.
- Riserve registrate non indicate in panchina: conservate nel payload come `registered-reserve`, fuori dall'universo minuti della partita.

## 2. Provenienza e qualità delle stime

La Serie A V2 viene riusata come architettura (minuti separati dai rate per 90, audit dell'evidenza e riconciliazione ai volumi squadra), ma **nessun coefficiente minuti Serie A è trasferito**. In particolare non sono usati i prior 79/76/74 né l'assunzione fissa di 22 minuti per subentro.

- Titolari: media aritmetica degli ultimi massimi 8 minuti osservati da titolare, con almeno 3 presenze esatte.
- Subentranti: frequenza osservata di ingresso su panchine nominate, moltiplicata per i minuti medi effettivi condizionati all'ingresso; minimo 3 panchine e 2 ingressi.
- Priorità alla stessa competizione UEFA; fallback documentato al campione cross-competition senza coefficienti di conversione.
- Tutti gli eventi e i relativi raw devono precedere il kickoff; anche `retrievedAt` deve essere non successivo al kickoff.
- Disponibilità/infortuni: non incorporati perché manca un feed individuale timestampato verificabile; nessuna assenza è inventata.

Qualità: high **203**, medium **282**, low **43**, none/non valutabile **157**. Campione UEFA-only **343**; fallback cross-competition **185**.

Motivi non valutabili: `insufficient-named-bench-or-exact-entry-history` 66; `insufficient-exact-starter-appearances` 9; `provider-player-id-unavailable` 82.

## 3. Modifiche matematiche solo Champions

1. Per i subentranti i minuti sono esposizione **non condizionata**: `P(ingresso | panchina nominata) × minuti medi se entra`.
2. Se la somma squadra supera 990 minuti, un unico fattore proporzionale la riporta al massimo regolamentare; i minuti mancanti non vengono assegnati a giocatori senza dati. Massima allocazione osservata: **990.0**.
3. I rate tiri/SOT per 90 e la prima riconciliazione player-volume esistente restano invariati; un secondo fattore Champions-only conserva esattamente il target squadra dopo l'espansione a titolari + subentranti.
4. Probabilità evento prodotte: **0**; restano null perché il motore non le produce.

Scarto massimo dopo arrotondamento rispetto ai target squadra: tiri **0.00**, SOT **0.00**.

## 4. Snapshot e cronologia

- I 18 fixture MD1 restano **ricalcoli post-kickoff**, non previsioni originali.
- Snapshot MD1 storici modificati: **0**.
- Il freezer accetta la copertura Fase 11 solo quando ogni titolare/potenziale subentrante è classificato e ogni giocatore valutabile ha tiri e SOT; continua a rifiutare timestamp post-kickoff o kickoff non verificati.
- Snapshot realmente congelati in questa fase: **0**, perché il dataset disponibile è MD1 e il timestamp di generazione è successivo ai kickoff.

## 5. Blocchi residui e gate

1. **157** giocatori non raggiungono le soglie minime oppure non hanno un provider ID verificato.
2. Manca un feed prepartita timestampato per disponibilità, infortuni e rotazioni documentate.
3. Non è presente un input completo di giornata futura da congelare prima del kickoff; MD1 non può essere retro-promosso a originale.
4. La qualità predittiva dei nuovi minuti non è calibrata né validata out-of-sample: questa fase non esegue calibrazione.

**Gate: PARTIAL.** L'estensione è operativa, auditabile e fail-closed sulle 36 squadre, ma non è READY finché restano giocatori non valutabili e non esiste almeno una giornata futura congelata pre-kickoff con successivo riscontro actual.
