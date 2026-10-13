# Champions League 2026/27 — Fase 10 complete pre-match forecast snapshots

Data audit: **2026-10-13**  
Gate finale: **PARTIAL**

## 1. Squadre e identità

- Squadre supportate: **36**.
- Giocatori registrati presenti nel dataset completo: **970**.
- Identità verificate Fase 9 integrate tramite overlay: **38** (37 exact-name-only + Mika Mármol Medina).
- Discrepanze List A temporalmente ambigue conservate come non-errori automatici: **5**.
- Registri protetti riscritti: **0**.

## 2. Forecast completo

| misura | valore |
|---|---:|
| giocatori registrati serializzati | 970 |
| giocatori forecast-eligible secondo il modello esistente | 360 |
| righe con tiri + SOT originali prodotti dalla formula esistente | 360 |
| copertura sui registrati | 37,1% |
| potenziali subentranti serializzati | 289 |
| potenziali subentranti con forecast | 0 |
| probabilità evento originali prodotte | 0 |

La vista top-5 esistente resta separata e invariata. Il dataset completo rende espliciti i minuti impliciti già usati dalla formula (84,6 per gli outfield titolari; 90 per il portiere), senza stimare minuti per panchinari o riserve. Per questi ultimi tiri, SOT e probabilità restano null.

## 3. Cronologia e salvataggio

- Fonte kickoff: UEFA, aggiornata il 9 ottobre 2026 e verificata il 13 ottobre 2026.
- Candidati prepartita validi in questa esecuzione: **0**.
- Ricalcoli post-kickoff: **18**.
- Snapshot storici modificati: **0**.

Il freezer usa creazione esclusiva e rifiuta: timestamp non precedente al kickoff, kickoff non verificato e copertura incompleta dei giocatori registrati. Un secondo tentativo identico è idempotente; contenuto diverso sullo stesso percorso genera conflitto e non sovrascrive il file.

## 4. Valutazione futura

Il processo di associazione actual/snapshot calcola MAE, RMSE e bias separatamente per le finestre `calibration`, `test` e `unassigned`. Il Brier viene calcolato soltanto quando nello snapshot esiste una probabilità evento originale. Nessuna calibrazione viene eseguita.

## 5. Blocchi residui

1. Il modello corrente non produce expected minutes per potenziali subentranti o riserve.
2. Senza expected minutes originali, non è lecito estendere tiri/SOT ai subentranti usando una nuova formula.
3. Il payload attuale riguarda MD1; essendo stato rigenerato dopo il kickoff, è classificato solo come ricalcolo e non può essere congelato come originale.
4. Nessuna probabilità evento individuale originale è serializzata dal modello player-volume corrente.
5. Servono input prepartita completi per MD3 prima di poter creare il primo snapshot realmente completo e cronologicamente valido.

## 6. Gate

**PARTIAL**

Formato completo, overlay identità, verifica cronologica, congelamento immutabile e valutatore futuro sono implementati. Il gate non è READY perché la copertura quantitativa dei potenziali subentranti è ancora bloccata a monte dall'assenza di expected minutes originali; il freezer impedisce di chiamare “completo” uno snapshot parziale.
