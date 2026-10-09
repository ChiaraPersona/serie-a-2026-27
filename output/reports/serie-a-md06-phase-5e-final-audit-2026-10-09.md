# Serie A 2026/27 — Fase 5E: audit finale della Schedina MD6

Audit eseguito: 2026-10-10 (Europe/Rome)  
Snapshot quote: 2026-10-09T10:43:00.203Z  
Esito complessivo: **PASS con disclosure non bloccanti**  
Decisione: **la Schedina MD6 è pronta per la pubblicazione nello stato auditato**. Non sono richieste correzioni strutturali prima della pubblicazione. Se nel frattempo diventano disponibili le formazioni ufficiali MD6, il controllo titolarità deve essere rieseguito prima di pubblicare.

La Fase 5E non ha aggiunto mercati e non ha modificato Engine V2, quote, probabilità, MyCombo, MD1–MD5, Champions o policy. Le Fasi 5C e 5D restano diagnostiche: zero nuovi mercati SOT/corner B3 e zero nuovi DUO autorizzati.

## 1. Conteggi effettivi

| Voce | Atteso | Effettivo | Esito |
|---|---:|---:|---|
| Partite | 10 | 10 | PASS |
| Selezioni | 383 | 383 | PASS |
| Valutate | 367 | 367 | PASS |
| NOT_MODELLED | 16 | 16 | PASS |
| EV positivo | 67 | 67 | PASS |
| EV negativo | 300 | 300 | PASS |
| EV zero | 0 | 0 | PASS |

Origine catalogo: 128 `gruppo-a`, 20 `dnb-b1`, 203 `gruppo-b2`, 3 `schedina-modello`, 29 `mycombo-safe`.

Confronto Fase 5B.2:

- 160/160 righe del catalogo precedente conservate.
- 20/20 DNB presenti.
- 203/203 B2 presenti.
- ID B2 mancanti rispetto alla Fase 5B.1: 0.
- ID B2 inattesi: 0.
- Selezioni scomparse o duplicate: 0.

## 2. Integrità catalogo, quote e identità

- `selectionId` unici: **383/383**.
- `providerSelectionId` unici: **383/383**.
- Riconciliazione catalogo → normalizzato Sisal → raw Sisal: **383/383 esatta** per matchId, ID mercato/esito, mercato, variante, esito, soglia, quota e stato.
- Quote: **383/383** numeriche, ≥1, aperte e `AVAILABLE_AT_SNAPSHOT`.
- Identità provider: **383/383 `VERIFIED_PROVIDER_IDS`**.
- Provenienza quota presente per tutte le righe: provider Sisal, URL, snapshot normalizzato, raw e metodo di acquisizione.
- Raw verificato: `data/raw/odds/sisal/serie-a/2026-10-09T10-43-00-203Z.json.gz`.
- Normalizzato verificato: `data/normalized/odds/sisal/serie-a.json`.

I dieci `matchId` del catalogo coincidono con gli eventi MD6 riconciliati. Nessuna quota o selezione è stata aggiornata durante l'audit.

## 3. Integrità delle 367 valutazioni

Tipi serializzati:

| Tipo | Righe | Verifica |
|---|---:|---|
| `CANONICAL_DIRECT` | 164 | 158 riconducibili a `predictions.marketComparison`; 6 a combinazioni congelate in `predictions.combinations` |
| `DERIVED_B2_SCORE_MATRIX` | 203 | 203/203 ricalcolate |
| Totale valutate | 367 | PASS |

Per tutte le 367 righe i valori pubblicati sono stati confrontati con la sorgente canonica senza modificarli. Le 144 righe valutate precedenti alla Fase 5B.2 coincidono con i valori congelati; DNB e B2 aggiungono rispettivamente 20 e 203 valutazioni.

### Mercati binari/canonici

- Le probabilità, fair ed EV delle 138 righe canoniche non-DNB provenienti da `marketComparison` coincidono con l'Engine.
- Le altre 6 righe canoniche provengono dalle combinazioni V2 congelate e coincidono su probabilità, fair ed EV.
- Nessuna probabilità è stata reinterpretata in base al segno dell'EV.

### Draw No Bet

- **20/20** DNB replicati dalla matrice punteggi.
- Probabilità visualizzata: condizionata all'assenza del pareggio.
- Fair: `1 / P(vittoria | non pareggio)`.
- EV: `P(vittoria) × quota + P(pareggio) − 1`.
- Il pareggio è un push/rimborso sul tempo regolamentare.
- La formula binaria `P condizionata × quota − 1` non è usata ed è esplicitamente rifiutata dai test.

### B2

- **203/203** righe replicate con matrice punteggi discreta normalizzata.
- Famiglie: 105 Multigoal partita, 71 Multigoal squadra, 27 Over gol squadra.
- Predicati inclusivi e lato casa/trasferta verificati.
- Cinque matrici per riga: centrale + quattro perturbazioni λ ±10%.
- Probabilità prudente: minimo delle cinque.
- Fair: `1 / P prudente`; EV: `P prudente × quota − 1`.
- Somma delle celle di ogni matrice: 1 entro la tolleranza numerica.

### Disclosure di provenienza

Il catalogo conserva `modelVersion=4.13.0` e `predictionsGeneratedAt=2026-10-09T19:08:03.078Z` nelle sorgenti globali. **351/367** valutazioni ripetono inoltre versione e timestamp dentro la singola riga; **16/367** li ereditano solo dal blocco globale. Fra queste, **6** non hanno un oggetto `evaluation.provenance` locale, ma sono state ricondotte deterministicamente alle combinazioni congelate e replicate numericamente.

Questo è un rilievo **P2 non bloccante di tracciabilità**, non una differenza matematica. File coinvolti: `data/normalized/schedina-md06.json`, upstream `scripts/betting-selection-contract.js` e `scripts/md06-market-catalog.js`. Soluzione proposta per una fase successiva: rendere obbligatori `source`, `modelVersion` e `predictionGeneratedAt` in ogni valutazione modellata, senza ricalcolare i valori.

## 4. Mercati NOT_MODELLED

Le **16/16** righe:

- sono identificate e riconciliate con lo snapshot Sisal;
- hanno quota aperta e valida;
- sono `PLAYABLE` e selezionabili;
- serializzano `modelProbabilityPct`, `fairOdds` ed `expectedValuePct` come `null`;
- usano `kind=NOT_MODELLED` e non trasformano N/D in EV zero;
- mostrano trattini nella pagina per P, fair ed EV;
- vengono posizionate dopo le righe valutate nell'ordinamento automatico.

Famiglie: 5 Multigoal squadra, 3 DUO tiri totali, 2 SOT squadra, 2 Multigoal partita, 1 corner totali, 1 corner 1X2 T.R., 1 entrambe almeno X SOT, 1 SOT partita. La presenza nel catalogo non equivale a una valutazione o raccomandazione.

## 5. Policy e titolarità

| Controllo vietato | Occorrenze |
|---|---:|
| Under | 0 |
| Falli individuali | 0 |
| Corner per periodi/finestra | 0 |
| Doppia chance 12 | 0 |
| Giocatori riserva/non verificati | 0 |

Sono presenti tre mercati giocatore, tutti con identità verificata e stato `probable-starter`. La fonte effettiva è Fantacalcio.it, importata il `2026-10-09T13:14:40.957Z`.

Le formazioni ufficiali MD6 disponibili nel file locale sono **0**. La precedenza dell'ufficiale sulla probabile è coperta dal test dedicato, ma non può essere applicata finché non esiste una fixture MD6 ufficiale. Non è stata importata alcuna nuova selezione.

## 6. Interfaccia desktop e mobile

`schedina.html?giornata=6` è stato verificato realmente con Edge/Playwright a **1440×1000** e **390×844**.

PASS:

- dieci pannelli partita e 383 righe visibili;
- apertura/chiusura indipendente e comandi Apri tutte/Chiudi tutte;
- ordinamento EV decrescente, con NOT_MODELLED in coda;
- riga interamente cliccabile, stato `aria-pressed` e toggle da tastiera con Invio;
- 383/383 righe raggiungibili da tastiera;
- aggiunta, rimozione e persistenza dopo reload;
- quota combinata teorica aggiornata;
- colonna personale sticky desktop (`position: sticky` sul root);
- bottom sheet mobile (`position: fixed`, ruolo dialog);
- nessun overflow orizzontale e nessun errore JavaScript;
- nessun filtro, WATCH, top-N, numerazione o avviso di compatibilità reintrodotto.

Il primo avvio headless nel sandbox è fallito prima del caricamento pagina per un errore di avvio Edge/Crashpad. Il rerun autorizzato fuori dal sandbox e il benchmark successivo sono passati: è un limite dell'ambiente di test, non una regressione del sito.

## 7. Schedina personale

- Il totale usa il prodotto delle quote senza arrotondamenti intermedi; l'arrotondamento avviene solo in visualizzazione.
- Aggiunta/rimozione aggiornano immediatamente conteggio, stato riga e totale.
- Il `selectionId` impedisce duplicati.
- `localStorage` separa giornata e competizione; il ripristino è verificato.
- Una selezione NOT_MODELLED può essere conservata senza inventare P/fair/EV.
- Quote mancanti/chiuse, incompatibilità DUO, contraddizioni e selezioni non giocabili non producono una quota utilizzabile.
- La quota mostrata è dichiarata **teorica**. La combinabilità/accettazione Sisal resta una verifica separata.
- Nessuna indipendenza statistica fra selezioni correlate è presunta; overlap e contraddizioni sono segnalati.
- MyCombo non è stato modificato.

## 8. Prestazioni

Misure locali Edge headless, mediana di tre campioni per viewport:

| Metrica | 1440×1000 | 390×844 |
|---|---:|---:|
| Caricamento + rendering delle 383 righe | 1.881 s | 1.816 s |
| Apri tutte | 175 ms | 159 ms |
| Chiudi tutte | 48 ms | 39 ms |
| Aggiunta+rimozione schedina | 107 ms | 94 ms |
| Nodi DOM | 7.180 | 7.180 |
| Overflow orizzontale | 0 px | 0 px |
| Errori pagina | 0 | 0 |

Dimensioni:

- `data/normalized/schedina-md06.json`: **2.288.880 byte** (2,18 MiB).
- `schedina.html`: 2.971 byte.
- `js/pages/betting.js`: 50.152 byte.
- `js/pages/personal-betslip-store.mjs`: 13.801 byte.
- Risorse trasferite nel test locale completo: circa **19,18 MB**.

Le interazioni sono reattive e il browser test non rileva blocchi. Il peso iniziale e i 7.180 nodi costituiscono tuttavia un rilievo **P2 non bloccante di performance**, soprattutto su rete/dispositivo mobile lento. Non è stato eseguito alcun refactoring. Soluzione futura: profiling su rete throttled e caricamento progressivo dei dati, mantenendo invariato il contratto del catalogo.

## 9. Regressioni

| Comando | Esito | Tempo osservato |
|---|---|---:|
| `npm run test:schedina` | PASS | 13,6 s |
| `npm run test:personal-betslip` | PASS | 9,6 s |
| `npm run test:css` | PASS | 9,5 s |
| `node --no-warnings scripts/test-app-modules.mjs` | PASS | 6,4 s |
| `node scripts/check-schedina-md06-browser.cjs` | PASS desktop+mobile nel rerun autorizzato | 15,8 s |
| `node scripts/audit-md06-phase-5e.cjs` | PASS con disclosure | 16,6 s |
| `git diff --check` | PASS | 6,4 s |

La suite Schedina completa include MD1–MD5, contratto BetSelection, formule score market, MD6 e schedina personale. Nessun test di regressione applicativo resta rosso.

## 10. Isolamento e anomalie

| Severità | Rilievo | Impatto | File |
|---|---|---|---|
| P2 | 16 valutazioni ereditano versione/timestamp dal catalogo; 6 non ripetono la provenance locale | Tracciabilità per-riga meno esplicita; valori comunque replicati | `data/normalized/schedina-md06.json`, builder/contract MD6 |
| P2 | JSON 2,18 MiB, ~19,18 MB di risorse e 7.180 nodi DOM | Rischio su mobile/rete lenta; nessun errore o blocco nei test | `data/normalized/schedina-md06.json`, `js/pages/betting.js` |
| INFO | 0 formazioni ufficiali MD6 disponibili | Le tre selezioni giocatore usano la probabile verificata | `data/sources/official-lineups-2026-27.json`, `data/sources/probable-lineups-md6-2026-27.json` |
| INFO | Primo avvio Edge bloccato dal sandbox | Nessun impatto prodotto; rerun reale PASS | ambiente di esecuzione |

Nessun file Engine, quote sorgente, MyCombo, MD1–MD5 o Champions presenta differenze locali rispetto a `HEAD`. Il controllo browser richiesto ha rigenerato `output/md06/schedina-1440x1000.png`: è un artefatto diagnostico, non un file di produzione e non deve essere incluso automaticamente nella pubblicazione.

## 11. Interventi indispensabili prima della pubblicazione

**Nessuna correzione indispensabile nello stato corrente.** Prima del comando di pubblicazione:

1. ricontrollare se sono comparse formazioni ufficiali MD6 e, in caso positivo, rieseguire soltanto l'audit titolarità;
2. pubblicare esattamente il payload auditato, senza rigenerare quote/probabilità;
3. non includere lo screenshot diagnostico modificato né gli artefatti di ricerca se la pubblicazione riguarda il solo sito.

I due P2 possono essere affrontati dopo la pubblicazione con attività dedicate; non autorizzano modifiche automatiche in Fase 5E.

## 12. File per la futura pubblicazione

La Fase 5E non introduce alcun delta di produzione. Per pubblicare il bundle web MD6 auditato da zero, il perimetro esatto specifico della pagina è:

- `schedina.html`
- `css/styles.css`
- `css/betting.css`
- `js/app.js`
- `js/pages/betting.js`
- `js/pages/personal-betslip-store.mjs`
- `data/normalized/schedina-md06.json`

Se il target di pubblicazione contiene già la UI precedente alla Fase 5B.2, il **delta runtime minimo** è soltanto:

- `data/normalized/schedina-md06.json`
- `js/pages/betting.js`

File diagnostici da conservare nel repository ma non necessari al payload pubblico:

- `scripts/audit-md06-phase-5e.cjs`
- `output/reports/serie-a-md06-phase-5e-final-audit-2026-10-09.md`
- report e JSON delle Fasi 5C/5D
- `output/md06/*.png`

## Conclusione

**PASS. La Schedina MD6 è pronta per la pubblicazione nello stato auditato: 383 selezioni, 367 valutate, 16 NOT_MODELLED, 67 EV positivi e 300 EV negativi.** DNB, B2, policy, titolarità disponibile, schedina personale, desktop/mobile e regressioni risultano coerenti. Restano soltanto due disclosure P2 non bloccanti: granularità della provenance per 16 righe e peso prestazionale del payload.
