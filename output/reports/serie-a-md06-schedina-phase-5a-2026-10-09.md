# Serie A 2026/27 — Fase 5A: allineamento V2 e ampliamento Schedina MD6

Data verifica: 9 ottobre 2026  
Ambito: esclusivamente Serie A, 6ª giornata, catalogo mercati Schedina e relativo rendering.

## Esito

Fase 5A completata. Il catalogo MD6 espone **160 selezioni valide** sulle 10 partite: le **128 selezioni del Gruppo A** individuate nell’audit sono state tutte recuperate e nessuna è stata respinta dai controlli di identità quota, compatibilità, policy o coerenza V2.

Non sono state modificate formule, ranking, probabilità o quote dell’Engine V2. Non sono state generate nuove previsioni e non è stato rigenerato MyCombo.

## Riconciliazione del catalogo

| Passaggio | Conteggio |
|---|---:|
| Selezioni visibili iniziali | 35 |
| Escluse dalla nuova policy | 1 |
| Escluse per formazione | 2 |
| Selezioni iniziali trattenute | 32 |
| Gruppo A richiesto | 128 |
| Gruppo A recuperato | 128 |
| Gruppo A non recuperato | 0 |
| Catalogo finale | 160 |
| Con valutazione V2 completa | 144 |
| `NOT_MODELLED` | 16 |

Esclusioni applicate:

- doppia chance `12` Lazio–Monza: rimossa per policy;
- Pio Esposito: riserva nella formazione probabile disponibile, quindi escluso dai mercati giocatore;
- Omari Hutchinson: riserva nella formazione probabile disponibile, quindi escluso dai mercati giocatore.

Le 16 selezioni semanticamente valide ma non modellate restano visibili con probabilità, quota equa ed EV rappresentati da `—`. Non sono stati inventati valori. Le selezioni valutate sono ordinate automaticamente per EV decrescente; le `NOT_MODELLED` seguono in ordine stabile e deterministico.

## Conteggi finali per partita

| Partita | Selezioni |
|---|---:|
| Genoa–Fiorentina | 16 |
| Inter–Parma | 13 |
| Napoli–Frosinone | 16 |
| Como–Roma | 17 |
| Lazio–Monza | 16 |
| Lecce–Bologna | 17 |
| Sassuolo–Milan | 15 |
| Cagliari–Juventus | 17 |
| Atalanta–Venezia | 17 |
| Torino–Udinese | 16 |

Totale: **160**.

## Policy applicata

Dal catalogo giocabile MD6 sono esclusi:

- Under;
- falli individuali;
- corner riferiti a singoli tempi;
- doppia chance `12`.

Restano eleggibili i mercati corner sull’intera partita, inclusi Over corner, corner squadra e `CALCI ANGOLO 1X2 T.R.`. I mercati giocatore richiedono un titolare ufficiale; in assenza di formazione ufficiale è ammesso soltanto un titolare probabile. L’identità del giocatore deve essere riconciliata senza inventare associazioni.

Il `DRAW NO BET` non è stato aggiunto: non apparteneva al perimetro dei 128 candidati del Gruppo A definito dall’audit e includerlo avrebbe esteso impropriamente la Fase 5A verso il Gruppo B.

## Allineamento dati e letture

- Le 10 partite e i relativi `matchId` MD6 coincidono tra calendario e previsioni normalizzate.
- Snapshot quote Sisal usato: `2026-10-09T10:43:00.203Z`.
- Previsioni correnti: Engine `4.13.0`, snapshot già esistente del `2026-10-09T19:08:03.078Z`.
- Formazioni probabili Fantacalcio: import del `2026-10-09T13:14:40.957Z`, con 220 titolari, 230 riserve e 0 giocatori non riconciliati; non risultano formazioni ufficiali MD6 disponibili nel dataset corrente.
- Le pagine Lettura MD6 non hanno un secondo artefatto editoriale da ricalcolare: caricano le previsioni normalizzate correnti e le associano per `matchId` esatto. Sono quindi allineate ai nuovi dati senza produrre nuove previsioni né riscrivere archivi storici.

## Interfaccia

- Tutte le 160 selezioni valide sono consultabili per partita, senza taglio top-N.
- Rimossi barra categorie e menu di ordinamento.
- Conservati click sull’intera riga, stato selezionato, persistenza locale, rimozione con X rossa e quota combinata teorica.
- Layout desktop 70/30 preservato; su mobile il costruttore usa il bottom sheet.

Verifica browser automatizzata e ispezionata:

- 1440×1000: 10 pannelli, 160 righe, conteggi corretti, nessun overflow;
- 390×844: stessi dati, nessun overflow, bottom sheet apribile e utilizzabile;
- apertura/chiusura globale pannelli, ordinamento EV, trattini `NOT_MODELLED`, selezione, persistenza dopo reload, quota combinata e rimozione verificati.

Screenshot:

- `output/md06/schedina-1440x1000.png`
- `output/md06/schedina-390x844-betslip.png`

## File della Fase 5A

- `scripts/md06-market-catalog.js`
- `scripts/betting-market-policy.js`
- `scripts/build-md06-betting-decision-package.mjs`
- `data/normalized/schedina-md06.json`
- `js/pages/betting.js`
- `css/betting.css`
- `scripts/test-schedina-md06.js`
- `scripts/test-app-modules.mjs`
- `scripts/check-schedina-md06-browser.cjs`
- `output/reports/serie-a-md06-betting-selection-2026-10-09.json`
- `output/reports/serie-a-md06-betting-selection-2026-10-09.md`

## Verifiche eseguite

Tutte concluse con esito positivo:

- `npm run test:schedina`
- `npm run test:personal-betslip`
- `npm run test:css`
- `node --no-warnings scripts/test-app-modules.mjs`
- `node scripts/check-schedina-md06-browser.cjs`
- `git diff --check`

## Confini rispettati

Non sono stati modificati o rigenerati Engine V2, formule, probabilità, quote sorgente, MyCombo, Gruppo B, giornate MD1–MD5, Champions, commit, push o deploy. Le modifiche Champions e `package.json` già presenti nel worktree appartengono a lavoro preesistente e non sono state toccate in questa fase.
