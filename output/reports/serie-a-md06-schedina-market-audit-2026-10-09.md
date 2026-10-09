# Serie A 2026/27 — Audit completo mercati Schedina MD6

Data audit: 2026-10-09  
Ambito: sola lettura; nessuna modifica a codice, dati, policy, generatori, Engine V2 o interfaccia.

## Esito sintetico

- La pagina MD6 espone **35 selezioni uniche**: 3 dalla Schedina-modello e 32 da MyCombo Safe.
- Lo snapshot Sisal contiene **23.341 mercati**, **77.247 esiti con quota numerica valida** e **52.803 esiti aperti/giocabili con quota numerica**.
- Solo **198 esiti** sono materializzati nel confronto canonico V2 con probabilità, quota equa ed EV. Il collo di bottiglia principale non è la disponibilità delle quote, ma la trasformazione da esito Sisal a target canonico valutabile.
- Dei 35 esiti visibili, soltanto **10** hanno una valutazione numerica effettivamente collegata alla riga mostrata; **25** sono visualizzati come MyCombo Safe con `NOT_MODELLED`.
- Applicando soltanto le nuove regole richieste, la copertura scenderebbe da **35 a 32**: una doppia chance 12 e due giocatori non presenti negli XI probabili.
- Sono stati classificati **128 esiti nel Gruppo A**, **886 nel Gruppo B** e **51.754 nel Gruppo C**. I gruppi sono esclusivi rispetto ai 52.803 esiti aperti: `35 + 128 + 886 + 51.754 = 52.803`.
- Il recupero meccanico di tutto il Gruppo A porterebbe lo Scenario C a **160 selezioni**, ma non è una raccomandazione editoriale: 94 dei 128 esiti hanno EV negativo e solo 13 risultano `qualifies=true` nel confronto V2.
- Non risultano eliminazioni per deduplicazione nell'istantanea corrente. Il calo maggiore avviene prima: policy, fascia quota, selezione del portafoglio e mancata valutazione canonica.

## Metodo e definizioni

L'audit ha letto lo snapshot normalizzato, le previsioni V2, il contratto di selezione, i portafogli MyCombo e il renderer. Per ricostruire i passaggi intermedi del generatore MyCombo è stato eseguito un replay diagnostico in memoria con le scritture su file disabilitate.

Le unità di conteggio sono distinte così:

- **mercato**: contenitore Sisal, per esempio “U/O CORNER”;
- **esito**: singola scelta quotata, per esempio “Over 7,5”;
- **candidato**: esito trasformato dal generatore in una possibile gamba;
- **componente MyCombo**: gamba presente in uno dei portafogli Safe, Balanced o Aggressive;
- **selezione unica visibile**: riga finale dopo unione e deduplicazione nel frontend.

Una quota è considerata numericamente valida se finita e almeno 1. Per la copertura effettiva viene inoltre richiesto che l'esito sia aperto/giocabile. I 24.444 esiti con quota numerica ma stato non disponibile sono tenuti separati e non trasformati in “assenza” o zero.

## Pipeline ricostruita

```text
snapshot raw Sisal .json.gz
  -> normalize-sisal-odds.js / scripts/sisal/normalize
  -> data/normalized/odds/sisal/serie-a.json
  -> validate-sisal-odds.js
  -> predictions.json (Engine 4.13.0, confronti canonici V2)
  -> build-md06-betting-decision-package.mjs
  -> betting-selection-contract.js
  -> generate-mycombo-md01.js
       policy -> compatibilità -> soglie -> fascia quota -> beam portfolio
  -> build-predictions.js
       valutazioni delle gambe e assessment dei portafogli
  -> data/normalized/schedina-md06.json
  -> js/pages/betting.js
       Schedina-modello + MyCombo Safe -> filtro quote/compatibilità -> dedup selectionId
  -> schedina.html?giornata=6
```

Il wrapper `scripts/build-betting-matchday.js` esegue, nell'ordine, validazione quote, integrazione del decision package, generazione MyCombo, build delle previsioni, seconda integrazione e controlli finali.

### Snapshot e provenienza

- Provider: Sisal.
- `retrievedAt`: `2026-10-09T10:43:00.203Z`.
- Raw: `data/raw/odds/sisal/serie-a/2026-10-09T10-43-00-203Z.json.gz`.
- Acquisizione: `public-page-browser-cdp`.
- Eventi: 10 trovati, 10 associati, 0 non associati.

## Conteggio sorgente per partita

“Esiti quotati” include anche quote sospese/chiuse; “esiti aperti” è l'universo usato per la copertura A/B/C. “Canonici V2” coincide, in questa istantanea, con probabilità, quota equa ed EV disponibili.

| Partita | Mercati | Esiti quotati | Esiti aperti | Canonici V2 | P disponibili | Fair disponibili | EV calcolabili | Visibili |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Genoa–Fiorentina | 2.268 | 7.456 | 5.156 | 20 | 20 | 20 | 20 | 4 |
| Inter–Parma | 2.519 | 8.309 | 5.573 | 18 | 18 | 18 | 18 | 2 |
| Napoli–Frosinone | 2.373 | 7.667 | 5.207 | 20 | 20 | 20 | 20 | 3 |
| Como–Roma | 2.594 | 8.186 | 5.541 | 20 | 20 | 20 | 20 | 4 |
| Lazio–Monza | 2.391 | 7.880 | 5.410 | 20 | 20 | 20 | 20 | 4 |
| Lecce–Bologna | 2.357 | 7.912 | 5.457 | 20 | 20 | 20 | 20 | 4 |
| Sassuolo–Milan | 2.513 | 8.126 | 5.496 | 20 | 20 | 20 | 20 | 3 |
| Cagliari–Juventus | 2.413 | 7.974 | 5.423 | 20 | 20 | 20 | 20 | 3 |
| Atalanta–Venezia | 1.885 | 6.701 | 4.682 | 20 | 20 | 20 | 20 | 4 |
| Torino–Udinese | 2.028 | 7.036 | 4.858 | 20 | 20 | 20 | 20 | 4 |
| **Totale** | **23.341** | **77.247** | **52.803** | **198** | **198** | **198** | **198** | **35** |

I 52.605 esiti aperti che non possiedono una riga canonica V2 non sono automaticamente “sbagliati”: la maggior parte appartiene a mercati non supportati, non normalizzati o non collegati a un target predittivo. Non è possibile suddividerli tutti in “semantica ambigua” e “assenza dati” senza una tassonomia canonica completa delle 77.247 selezioni; attribuire conteggi più precisi sarebbe arbitrario.

## Fasi esclusive del generatore MyCombo

Questa tabella usa candidati, non tutti gli esiti Sisal. Le esclusioni Under, falli e corner per tempo sono mutuamente esclusive nella costruzione corrente; la fascia quota è applicata dopo la policy.

| Partita | Candidati grezzi | Under | Falli individuali | Corner per tempo | Dopo policy | Fuori quota 1,15–1,85 | Pool finale | Safe | Safe respinte dal frontend | Visibili finali |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Genoa–Fiorentina | 101 | 18 | 20 | 4 | 59 | 24 | 35 | 4 | 1 | 4 |
| Inter–Parma | 177 | 17 | 16 | 6 | 138 | 104 | 34 | 3 | 1 | 2 |
| Napoli–Frosinone | 108 | 17 | 16 | 8 | 67 | 33 | 34 | 4 | 1 | 3 |
| Como–Roma | 225 | 13 | 36 | 8 | 168 | 109 | 59 | 3 | 0 | 4 |
| Lazio–Monza | 121 | 13 | 28 | 6 | 74 | 42 | 32 | 4 | 0 | 4 |
| Lecce–Bologna | 109 | 15 | 20 | 4 | 70 | 38 | 32 | 4 | 0 | 4 |
| Sassuolo–Milan | 175 | 15 | 16 | 4 | 140 | 93 | 47 | 3 | 0 | 3 |
| Cagliari–Juventus | 141 | 13 | 32 | 6 | 90 | 48 | 42 | 3 | 0 | 3 |
| Atalanta–Venezia | 148 | 6 | 43 | 0 | 99 | 58 | 41 | 4 | 0 | 4 |
| Torino–Udinese | 67 | 4 | 12 | 0 | 51 | 24 | 27 | 4 | 1 | 4 |
| **Totale** | **1.372** | **131** | **239** | **46** | **956** | **573** | **383** | **36** | **4** | **35** |

Nota: le quattro gambe Safe respinte per incompatibilità DUO sono Ranieri (Genoa–Fiorentina), Diouf (Inter–Parma), Di Lorenzo (Napoli–Frosinone) e Unai Gómez (Torino–Udinese). Genoa, Como e Torino ricevono inoltre una selezione dalla Schedina-modello; per questo il totale visibile non coincide sempre con `Safe - respinte`.

### Componenti e deduplicazione

- Safe: 36 occorrenze.
- Balanced: 49 occorrenze.
- Aggressive: 62 occorrenze.
- Totale occorrenze nei portafogli: 147.
- Selection ID unici tra i tre profili: 106.
- Riutilizzi fra profili: 41; sono consentiti e non sono duplicati interni al singolo portafoglio.
- Dedup candidati del generatore: 0 rimossi.
- Dedup finale del frontend: 0 rimossi.
- Unione finale: 3 selezioni modello + 32 Safe accettate = 35.

## Policy attuale e policy desiderata

La policy corrente, in `scripts/betting-market-policy.js`, esclude Under, falli individuali e corner per periodo/finestra. Permette i corner full-match. `T.R.` non viene interpretato come primo/secondo tempo: `CALCI ANGOLO 1X2 T.R.` viene quindi correttamente trattato come mercato a tempo regolamentare e normalizzato come `1X2 CORNER`.

La **doppia chance 12 non è esclusa oggi**. La nuova decisione la escluderà nella fase successiva. Tra le 35 selezioni attuali ne è interessata una: Lazio–Monza, quota 1,25.

## Soglie e condizioni decisionali

| Regola | File / funzione | Valore effettivo | Candidati interessati | Effetto e possibilità di esposizione senza cambiare V2 |
|---|---|---|---:|---|
| Under esclusi | `scripts/betting-market-policy.js` / `isExcludedMarketName` | Tutti gli Under | 131 candidati | Policy; recuperabili solo cambiando la policy, quindi fuori Gruppo A/B. |
| Falli individuali esclusi | stesso file | Tutti | 239 | Policy esplicita; non esporre. |
| Corner per periodo esclusi | stesso file | Primo/secondo tempo o finestra | 46 | Policy esplicita; i full-match restano ammessi. |
| Doppia chance 12 | policy desiderata, non implementata | Escludere `12` | 1 visibile; 10 righe canoniche complessive nel confronto corrente | Richiede una modifica di policy, non del modello. |
| Compatibilità scenario | `scripts/generate-mycombo-md01.js` / costruzione candidati canonici | `scenarioCompatible === true` | 70 righe del Gruppo A oggi fuori | È un gate decisionale; le probabilità esistono già. |
| Probabilità minima | stesso file | almeno 45% | 3 righe del Gruppo A dopo i gate precedenti | Esporre richiederebbe modificare la soglia/strato editoriale, non V2. |
| Doppia chance migliore | stesso file | una sola variante DC per partita | Gate per mercato | Riduce varianti correlate; nessuna modifica V2 necessaria. |
| Famiglie canoniche | stesso file | 1X2, DC, goals, BTTS, team-goal | limita i candidati canonici | Altre famiglie possono essere collegate solo se esiste già un predicato validato. |
| Fascia quota MD6 | stesso file | 1,15–1,85 incluse | 573 dei 956 post-policy | È il maggiore filtro numerico nel pool MyCombo. |
| Volume supportato | stesso file | solo Over; margine di coerenza 0,8 per SOT/corner | parte dei candidati volume | Supporto già esistente per full-match; serve collegamento stabile della valutazione. |
| Soglia giocatore | stesso file | max 3,5 tiri; max 1,5 SOT; max 1,5 falli; solo Over | limita mercati individuali | Le probabilità individuali non sono equivalenti ai target commerciali DUO. |
| Pool top-N | stesso file / beam search | primi 120 | 0 rimossi: pool massimo 59 | Inattivo su MD6. |
| Beam portfolio | stesso file | massimo 500 stati | non quantificabile come esclusione singola | Ottimizza quota target e coerenza; non modifica V2. |
| Gambe Safe | stesso file | 3–6, preferite 3 | pool 383 → 36 Safe | 347 candidati non scelti nel Safe per target quota, sovrapposizioni, semantica e ranking. |
| Gambe Balanced | stesso file | 4–7, preferite 4 | 49 occorrenze | Non visualizzate nella griglia finale corrente. |
| Gambe Aggressive | stesso file | 5–8, preferite 5 | 62 occorrenze | Non visualizzate nella griglia finale corrente. |
| Unicità | stesso file | `providerSelectionId`, `semanticKey`, `overlapKey` | 0 dedup candidati in questa istantanea | Previene duplicati reali e sovrapposizioni nello stesso portafoglio. |
| Limiti rischio portafoglio | `scripts/predictions/decision-layer.js` / `PROFILE_LIMITS` | Safe 42/58/1; Balanced 56/72/2; Aggressive 72/88/3; EV prudente min 0 | assessment successivo alla composizione | Sono soglie di assessment, non il gate che produce le 35 righe correnti. |
| Classificazione giocatori | `scripts/build-md06-betting-decision-package.mjs` / `classifyPlayerCandidate` | `ESCLUSO`, `WATCH`, `OUTSIDER`, `PRINCIPALE`, `INTERESSANTE` | 353 ID 1+ verificati, tutti DUO incompatibili | Non certifica EV del target DUO; non va usata per inventare probabilità. |
| Filtro frontend | `js/pages/betting.js` / `hasVerifiedPlayableQuote` | quota/identità/policy/compatibilità | 4 gambe Safe con `INCOMPATIBILE_DUO`; 25 visibili senza eval | Non richiede P/fair/EV per le gambe Safe e ignora il warning se lo status è `NOT_EVALUATED`. |

I limiti rischio sono, nell'ordine, rischio medio massimo / rischio evento massimo / dipendenze forti massime; tutti i profili richiedono EV prudente minimo 0. Nel selettore di raccomandazioni separato dell'Engine esistono inoltre fasce Safe (`P >= 58`, quota `<= 2`), Balanced (`P 38–65`, quota `1,6–3,5`) e Aggressive (`P 18–45`, quota `>= 2,5`), ma non sono il meccanismo che compone i portafogli MD6 qui visualizzati.

È presente anche un difetto latente: il generatore passa `candidate.overlapKey` a `isExcludedMarketName` invece del nome mercato. Nell'istantanea corrente rimuove 0 candidati perché i mercati vietati sono già bloccati prima, ma non è una garanzia robusta.

## Mercati recuperabili

### Classificazione esclusiva per partita

| Partita | Visibili | Gruppo A | Gruppo B | Gruppo C | Totale aperti |
|---|---:|---:|---:|---:|---:|
| Genoa–Fiorentina | 4 | 12 | 54 | 5.086 | 5.156 |
| Inter–Parma | 2 | 12 | 131 | 5.428 | 5.573 |
| Napoli–Frosinone | 3 | 13 | 60 | 5.131 | 5.207 |
| Como–Roma | 4 | 13 | 160 | 5.364 | 5.541 |
| Lazio–Monza | 4 | 13 | 67 | 5.326 | 5.410 |
| Lecce–Bologna | 4 | 13 | 63 | 5.377 | 5.457 |
| Sassuolo–Milan | 3 | 13 | 133 | 5.347 | 5.496 |
| Cagliari–Juventus | 3 | 14 | 82 | 5.324 | 5.423 |
| Atalanta–Venezia | 4 | 13 | 91 | 4.574 | 4.682 |
| Torino–Udinese | 4 | 12 | 45 | 4.797 | 4.858 |
| **Totale** | **35** | **128** | **886** | **51.754** | **52.803** |

### Gruppo A — Recuperabili immediatamente: 128

Sono righe canoniche non visibili, con quota aperta, P, quota equa ed EV già presenti, non vietate dalla policy desiderata. Sono state escluse soltanto da gate decisionali o limiti di composizione.

- Famiglie: team-goal 39, 1X2 29, goals 26, BTTS 18, doppia chance 16.
- Motivi esclusivi, nell'ordine dei gate: 70 incompatibili con lo scenario, 3 sotto il 45%, 17 fuori fascia 1,15–1,85, 36 non scelte per portafoglio/semantica.
- EV: 34 positive e 94 negative; solo 13 con `qualifies=true`.

Esempi reali, non raccomandazioni:

- Inter–Parma, vittoria Parma: quota 20, P 10,10%, fair 9,90, EV +102,10%; scenario incompatibile.
- Napoli–Frosinone, vittoria Frosinone: quota 6,50, P 26,20%, fair 3,81, EV +70,50%; scenario incompatibile.
- Torino–Udinese, Over 3,5: quota 3,60, P 40,40%, fair 2,48, EV +45,40%; scenario incompatibile.
- Torino–Udinese, vittoria Udinese: quota 3,25, P 44,60%, fair 2,24, EV +45,00%; sotto la soglia P 45%.
- Torino–Udinese, Over 2,5: quota 2,00, P 62,60%, fair 1,60, EV +25,20%; fuori dalla fascia quota MyCombo.

### Gruppo B — Recuperabili con interventi tecnici: 886

Questi esiti hanno quota valida e semantica riconoscibile, ma oggi non possiedono una riga completa P/fair/EV collegata. Non vengono attribuite probabilità sostitutive.

| Famiglia | Quantità | Diagnosi |
|---|---:|---|
| U/O corner full-match, soli Over ammessi | 21 | Predicato volume esistente, valutazione non materializzata sulla riga non selezionata. |
| U/O corner squadra full-match, soli Over | 32 | Come sopra. |
| U/O SOT partita, soli Over | 32 | Predicato volume esistente. |
| U/O SOT squadra, soli Over | 25 | Predicato volume esistente. |
| Multigoal | 105 | Predicato score-matrix esistente. |
| Multigoal squadra | 71 | Predicato score-matrix esistente. |
| U/O gol squadra, soli Over | 27 | Predicato score-matrix esistente. |
| Entrambe almeno X SOT | 15 | Predicato volume esistente. |
| `CALCI ANGOLO 1X2 T.R.` | 5 | Semantica consentita; serve predicato/normalizzazione esplicita per 1/X/2 corner. |
| DUO giocatore SOT | 336 | Segnale individuale esistente, target commerciale diverso e non validato. |
| DUO giocatore tiri | 217 | Segnale individuale esistente, target commerciale diverso e non validato. |
| **Totale** | **886** | 328 collegabili a valutatori già presenti, 5 corner 1X2 da normalizzare, 553 DUO non certificabili come probabilità individuali. |

I 328 esiti supportati dai predicati esistenti non vengono valutati in modo indipendente: `assessConfiguredPortfolio` è all-or-nothing. Se una sola gamba del portafoglio è non supportata, l'assessment ritorna `null` e tutte le gambe perdono la valutazione collegata.

### Gruppo C — Non recuperabili attualmente: 51.754

È il residuo degli esiti aperti. Comprende mercati fuori dalla tassonomia candidata, target non supportati, identità giocatore non riconciliate e semantiche insufficienti o ambigue. Non è corretto assegnare P/fair/EV senza nuovi dati o validazione.

Separatamente, **24.444** esiti hanno quota numerica ma stato chiuso/sospeso/non giocabile nello snapshot: non sono inclusi nei gruppi A/B/C e non vanno trattati come quota zero.

## Titolarità giocatori

Fonte primaria disponibile: `data/sources/probable-lineups-md6-2026-27.json`, provenienza Fantacalcio.it, importata il `2026-10-09T13:14:40`. Copertura: 20 squadre, 220 titolari probabili, 230 riserve, 1 nome non associato. `data/sources/official-lineups-2026-27.json` non contiene ancora formazioni ufficiali MD6; pertanto nessun giocatore può essere classificato “titolare ufficiale”. Non sono emersi conflitti tra fonti ufficiali e probabili perché la fonte ufficiale è assente.

Tra le 35 righe visibili, 5 riguardano giocatori:

- Akor Adams, Éderson e Nuno Tavares: titolari probabili.
- Pio Esposito e Omari Hutchinson: panchinari nelle probabili; verrebbero esclusi dalla nuova regola.

Tutti e cinque i mercati sono DUO e includono il sostituto. Questo non rende il giocatore nominato automaticamente titolare. Il matcher corrente ha ammesso Pio Esposito e Hutchinson pur non essendo negli XI probabili: è prova che la corrispondenza testuale non sta imponendo l'identità del titolare. Il problema riguarda almeno 2 delle 35 selezioni attuali; la quantificazione sull'intero snapshot non è affidabile finché i `providerPlayerId` non vengono collegati al roster canonico.

Le sole assessment verificate oggi coprono 353 ID di mercati 1+ su 200 titolari probabili di movimento: 163 tiri e 190 SOT. Tutti sono correttamente marcati semanticamente incompatibili con la probabilità individuale, perché il target Sisal è DUO e, per i SOT, include anche pali/traverse.

## Audit delle 35 selezioni visibili

“V2 disponibile ma non agganciata” significa che esiste una riga canonica per lo stesso esito, ma la gamba Safe visualizzata non porta con sé la valutazione. “Ammessa” si riferisce alla nuova policy richiesta, non a una certificazione di valore.

| Partita | Mercato canonico | Esito | Quota | Origine | Valutazione V2 sulla riga | MyCombo | Nuova policy | Titolarità |
|---|---|---|---:|---|---|---|---|---|
| Atalanta–Venezia | Entrambe almeno X SOT | Entrambe almeno 3 SOT | 1,38 | MyCombo Safe | No, `NOT_MODELLED` | Sì | Ammessa | — |
| Atalanta–Venezia | U/O tiri giocatore DUO | Adams almeno 3 tiri, sostituto incluso | 1,75 | MyCombo Safe | No, `NOT_MODELLED` | Sì | Ammessa | Probabile titolare |
| Atalanta–Venezia | U/O tiri giocatore DUO | Éderson almeno 2 tiri, sostituto incluso | 1,80 | MyCombo Safe | No, `NOT_MODELLED` | Sì | Ammessa | Probabile titolare |
| Atalanta–Venezia | Goals | Over 1,5 | 1,15 | MyCombo Safe | Disponibile nel V2, non agganciata | Sì | Ammessa | — |
| Cagliari–Juventus | Entrambe almeno X SOT | Entrambe almeno 3 SOT | 1,57 | MyCombo Safe | P 59,6%; fair 1,86; EV -15,8% | Sì | Ammessa | — |
| Cagliari–Juventus | Multigoal squadra | Cagliari 1–2 | 1,85 | MyCombo Safe | P 54,6%; fair 1,91; EV -3,1% | Sì | Ammessa | — |
| Cagliari–Juventus | U/O gol squadra | Juventus Over 1,5 | 1,72 | MyCombo Safe | P 45,2%; fair 2,50; EV -31,2% | Sì | Ammessa | — |
| Como–Roma | 1X2 corner | Corner T.R. esito 1 | 1,80 | MyCombo Safe | No, `NOT_MODELLED` | Sì | Ammessa | — |
| Como–Roma | Doppia chance | Como o pareggio 1X | 1,50 | Schedina-modello | P 70,9%; fair 1,41; EV +6,35% | No | Ammessa | — |
| Como–Roma | Multigoal | 3–5 | 1,85 | MyCombo Safe | No, `NOT_MODELLED` | Sì | Ammessa | — |
| Como–Roma | U/O SOT squadra | Como almeno 5 SOT | 1,50 | MyCombo Safe | No, `NOT_MODELLED` | Sì | Ammessa | — |
| Genoa–Fiorentina | Doppia chance | Genoa o pareggio 1X | 1,65 | Schedina-modello | P 62,2%; fair 1,61; EV +2,63% | No | Ammessa | — |
| Genoa–Fiorentina | Multigoal squadra | Genoa 1–3 | 1,40 | MyCombo Safe | No, `NOT_MODELLED` | Sì | Ammessa | — |
| Genoa–Fiorentina | U/O SOT squadra | Genoa almeno 4 SOT | 1,57 | MyCombo Safe | No, `NOT_MODELLED` | Sì | Ammessa | — |
| Genoa–Fiorentina | Goals | Over 1,5 | 1,30 | MyCombo Safe | Disponibile nel V2, non agganciata | Sì | Ammessa | — |
| Inter–Parma | Multigoal | 3–5 | 1,72 | MyCombo Safe | No, `NOT_MODELLED` | Sì | Ammessa | — |
| Inter–Parma | U/O SOT giocatore DUO | Pio Esposito almeno 2 SOT, sostituto incluso | 1,65 | MyCombo Safe | No, `NOT_MODELLED` | Sì | **Escludere: non titolare** | Panchina probabile |
| Lazio–Monza | Doppia chance | Nessun pareggio 12 | 1,25 | MyCombo Safe | Disponibile nel V2, non agganciata | Sì | **Escludere: DC 12** | — |
| Lazio–Monza | Multigoal squadra | Monza 1–2 | 1,75 | MyCombo Safe | No, `NOT_MODELLED` | Sì | Ammessa | — |
| Lazio–Monza | U/O tiri giocatore DUO | Nuno Tavares almeno 2 tiri, sostituto incluso | 1,80 | MyCombo Safe | No, `NOT_MODELLED` | Sì | Ammessa | Probabile titolare |
| Lazio–Monza | Goals | Over 1,5 | 1,27 | MyCombo Safe | Disponibile nel V2, non agganciata | Sì | Ammessa | — |
| Lecce–Bologna | 1X2 | Bologna vincente | 1,85 | MyCombo Safe | P 53,0%; fair 2,14; EV -13,5% | Sì | Ammessa | — |
| Lecce–Bologna | Entrambe almeno X SOT | Entrambe almeno 2 SOT | 1,17 | MyCombo Safe | P 68,9%; fair 1,61; EV -27,4% | Sì | Ammessa | — |
| Lecce–Bologna | Multigoal | 2–5 | 1,40 | MyCombo Safe | P 66,7%; fair 1,60; EV -12,5% | Sì | Ammessa | — |
| Lecce–Bologna | Multigoal squadra | Lecce 1–2 | 1,65 | MyCombo Safe | P 53,1%; fair 1,98; EV -16,5% | Sì | Ammessa | — |
| Napoli–Frosinone | BTTS | Entrambe segnano | 1,60 | MyCombo Safe | Disponibile nel V2, non agganciata | Sì | Ammessa | — |
| Napoli–Frosinone | Multigoal squadra | Napoli 1–2 | 1,85 | MyCombo Safe | No, `NOT_MODELLED` | Sì | Ammessa | — |
| Napoli–Frosinone | U/O corner | Partita almeno 8 corner | 1,27 | MyCombo Safe | No, `NOT_MODELLED` | Sì | Ammessa | — |
| Sassuolo–Milan | Multigoal squadra | Milan 2–4 | 1,85 | MyCombo Safe | No, `NOT_MODELLED` | Sì | Ammessa | — |
| Sassuolo–Milan | U/O SOT giocatore DUO | Hutchinson almeno 1 SOT, sostituto incluso | 1,57 | MyCombo Safe | No, `NOT_MODELLED` | Sì | **Escludere: non titolare** | Panchina probabile |
| Sassuolo–Milan | Goals | Over 2,5 | 1,72 | MyCombo Safe | Disponibile nel V2, non agganciata | Sì | Ammessa | — |
| Torino–Udinese | Doppia chance | Udinese o pareggio X2 | 1,57 | Schedina-modello | P 67,7%; fair 1,48; EV +6,29% | No | Ammessa | — |
| Torino–Udinese | BTTS | Entrambe segnano | 1,75 | MyCombo Safe | Disponibile nel V2, non agganciata | Sì | Ammessa | — |
| Torino–Udinese | Multigoal squadra | Torino 1–4 | 1,27 | MyCombo Safe | No, `NOT_MODELLED` | Sì | Ammessa | — |
| Torino–Udinese | U/O SOT | Partita almeno 7 SOT | 1,25 | MyCombo Safe | No, `NOT_MODELLED` | Sì | Ammessa | — |

### Anomalie delle 35

- 3 righe hanno status `EV_CALCOLABILE`, 7 `MODELLED_LEG`, 25 `NOT_MODELLED`.
- Il frontend accetta le 25 `NOT_MODELLED` perché per una gamba Safe non richiede una valutazione valida.
- Pio Esposito e Hutchinson sono panchinari probabili ma superano il matcher dei titolari.
- Lazio–Monza 12 viola la nuova policy, non quella attuale.
- Le 5 gambe giocatore visibili hanno warning `MODEL_BOOKMAKER_TARGET_MISMATCH`; lo status `NOT_EVALUATED` impedisce al filtro corrente di trattarlo come incompatibilità bloccante.
- Nessun duplicato di `selectionId` è stato trovato nelle 35 righe.
- Non sono stati rilevati Under, falli individuali o corner per tempo nelle 35.

## Simulazione copertura

Lo Scenario B usa le probabili aggiornate alle 13:14:40 e quindi resta condizionato fino alla pubblicazione delle formazioni ufficiali. Lo Scenario C aggiunge meccanicamente tutto il Gruppo A; non afferma che tutti gli esiti siano consigliabili.

| Partita | Scenario A attuale | Scenario B nuova policy | Scenario C nuova policy + Gruppo A |
|---|---:|---:|---:|
| Atalanta–Venezia | 4 | 4 | 17 |
| Cagliari–Juventus | 3 | 3 | 17 |
| Como–Roma | 4 | 4 | 17 |
| Genoa–Fiorentina | 4 | 4 | 16 |
| Inter–Parma | 2 | 1 | 13 |
| Lazio–Monza | 4 | 3 | 16 |
| Lecce–Bologna | 4 | 4 | 17 |
| Napoli–Frosinone | 3 | 3 | 16 |
| Sassuolo–Milan | 3 | 2 | 15 |
| Torino–Udinese | 4 | 4 | 16 |
| **Totale** | **35** | **32** | **160** |

Passaggi A → B: -1 DC12, -2 giocatori panchinari probabili. Passaggio B → C: +128 righe del Gruppo A.

## Regole che limitano maggiormente la copertura

1. **Mancata materializzazione canonica**: 52.605 dei 52.803 esiti aperti non hanno una riga V2 completa.
2. **Fascia quota MyCombo 1,15–1,85**: elimina 573 dei 956 candidati post-policy.
3. **Policy esplicita**: elimina 416 candidati riconosciuti (131 Under, 239 falli, 46 corner per tempo).
4. **Composizione Safe**: seleziona 36 gambe da un pool di 383; 347 non entrano nel profilo Safe.
5. **Assessment all-or-nothing**: una gamba non supportata annulla l'assessment dell'intero portafoglio, anche per gambe già valutabili.
6. **Contratto DUO non allineato**: 553 candidati giocatore hanno segnale individuale ma non una probabilità valida per il target Sisal.
7. **Frontend permissivo verso `NOT_MODELLED`**: aumenta il numero mostrato, ma riduce la quota di righe con P/fair/EV verificabili.

## Raccomandazioni per la fase successiva

Ordinate per rapporto impatto/rischio, senza applicarle in questo audit:

1. **Applicare la nuova esclusione DC12 nel punto policy centrale**, con test su `T.R.` per garantire che i corner regolamentari restino ammessi. Impatto piccolo e rischio basso.
2. **Sostituire il matcher testuale delle formazioni con un join per identità canonica/provider ID** e dare priorità alle ufficiali; bloccare i panchinari nominati anche nei mercati DUO. Impatto alto sulla correttezza, rischio medio.
3. **Collegare alle gambe Safe le valutazioni canoniche già esistenti** per evitare che goals/BTTS/DC vengano mostrati come `NOT_MODELLED`. Impatto alto, nessun cambiamento al modello.
4. **Rendere l'assessment per-gamba, non all-or-nothing**, mantenendo N/D per la sola gamba non supportata. Impatto alto, rischio medio; non richiede alterare formule V2.
5. **Materializzare i 328 target già coperti da predicati score/volume** in un layer diagnostico o contrattuale, preservando provenienza e semantica. Impatto alto, rischio medio.
6. **Aggiungere una normalizzazione esplicita per `CALCI ANGOLO 1X2 T.R.`** e un predicato validato prima di produrre P/fair/EV. Impatto limitato, rischio medio.
7. **Non promuovere i 553 DUO da probabilità individuali** finché target, sostituto, pali/traverse e settlement non sono modellati/validati. Rischio alto; mantenere N/D.
8. **Correggere la chiamata policy sull'`overlapKey`** e aggiungere test regressivi. Impatto preventivo, rischio basso.

## File che richiederebbero modifiche nella fase successiva

Elenco minimo e mirato; nessun file è stato modificato in questo audit:

- `scripts/betting-market-policy.js`: aggiungere DC12 e consolidare i test di `T.R.`.
- `scripts/generate-mycombo-md01.js`: applicare la policy al vero nome mercato, rendere robusto il join titolarità e collegare le valutazioni esistenti alle gambe.
- `scripts/build-md06-betting-decision-package.mjs`: join identità giocatore/lineup e distinzione ufficiale-probabile-panchina.
- `scripts/betting-selection-contract.js`: rendere esplicito il contratto di valutazione e incompatibilità per le righe visualizzabili.
- `scripts/build-predictions.js`: conservare valutazioni per-gamba quando il portafoglio contiene una gamba non supportata.
- `js/pages/betting.js`: decidere esplicitamente se una gamba Safe senza valutazione può essere mostrata e rendere visibili N/D/warning senza equipararli a una valutazione.
- Test pertinenti in `scripts/test-schedina.js` e nei test della policy/contratto; aggiungere casi DC12, corner `T.R.`, panchinaro DUO e portafoglio misto.

Non è necessario modificare Engine V2 per i primi cinque interventi: la priorità è il collegamento tra dati già calcolati, contratto e renderer. Non vanno editati a mano gli artefatti generati `data/normalized/predictions.json`, `data/normalized/schedina-md06.json` o il file MyCombo sorgente.

## Stato Git e limiti dell'audit

Il working tree non era pulito durante la verifica: erano già presenti modifiche e numerosi file non tracciati nell'area Champions/multileague, inclusi `data/normalized/champions-player-stats-2026-27.json`, `data/sources/champions-pilot-match-stats-2025-27.json`, tre script Champions modificati e nuovi snapshot/report/script Champions. L'audit non li ha toccati né ha tentato di risolverli.

Unica aggiunta dell'audit: questo report Markdown. Non sono stati eseguiti commit, push, deploy, rigenerazioni MyCombo o modifiche applicative.
