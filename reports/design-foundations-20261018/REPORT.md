# Design system — Fasi 0 e 1

## Ambito

Solo baseline, token e integrazione nella cascata. Nessun restyling delle pagine,
nessun builder di dati o pronostici, nessuna modifica alla struttura delle pagine.
Il blu notte Champions e le dimensioni H1 approvate sono definiti come token;
la migrazione dei componenti a quei valori appartiene alla fase successiva.

## Baseline

- Manifest SHA-256: `baseline-files.json`, 9610 file, inclusi 9037 file dati,
  45 file JavaScript e 479 file sotto scripts.
- Stato Git acquisito prima delle modifiche: `baseline-git.txt`.
- Modifiche estranee già presenti al momento del salvataggio: metadati recupero
  fotografie e script per dettagli delle licenze. Non modificati da questo lavoro.
- Snapshot delle 31 shell HTML: `baseline-html.json`.
- 20 viste browser: 10 percorsi a 1440 e 390 px, screenshot `before-*` / `after-*`.
- Percorsi: Home, Squadre, Inter, Giocatori, indice Letture, Lettura Serie A,
  Coppa Italia, indice Champions, Lettura Champions, Schedina MD7.
- Elementi protetti: hero, navbar, footer, campi e coordinate giocatori,
  tabelle e relativi scroller, filtri, comparatore, sezioni, link e selezioni.

## File di implementazione

- `css/tokens.css`: unico catalogo nuovo, namespace `--ds-*`, valori chiari e
  override scuri attraverso gli attributi di competizione e tema già esistenti.
- `css/styles.css`: import dei token prima di base.css; entry point di 980 byte.
- `css/base.css`: alias equivalenti per larghezza, spaziature e transizioni.
- `css/components.css`: alias equivalenti per Anton e Inter.
- 31 shell HTML: aggiunto il collegamento al catalogo token e aggiornati gli hash
  dei due CSS modificati tramite `applyStyleLinks()` di `scripts/site-styles.js`.
  Tutto il contenuto HTML esterno ai collegamenti CSS/bootstrap rimane identico.
- Questa directory: baseline, script di controllo ed evidenze interne.

Non sono stati modificati site-styles.js, initial-presentation.js, renderer,
policy pubblica, contratti, store, motori o file dati.
Questa affermazione riguarda le azioni di questo intervento: durante le verifiche
finali sono state rilevate modifiche concorrenti a `data/player-photos.json`,
`data/sources/team-pages/player-photo-approvals.json`,
`scripts/audit-player-photo-rights.cjs` e `scripts/build-player-photo-registry.cjs`.
Sono conservate senza interventi e registrate in `integrity.json` come
`concurrentOutsideScope`; il controllo iniziale, precedente a tali modifiche,
non rilevava variazioni nei file protetti. Non si dichiara identità finale
dell'intero dataset fotografico rispetto alla baseline.

## Token cromatici definitivi

| Suffisso di --ds- | Chiaro | Champions |
| --- | --- | --- |
| color-page | #F8F7F4 | #07152C |
| color-surface | #FFFFFF | #10233F |
| color-surface-soft | #EEF4F6 | #142D4D |
| color-text | #283A3B | #F2F6FF |
| color-text-muted | #52666D | #AFC3DC |
| color-border | #D6E1E5 | #304762 |
| color-accent | #1E5F9D | #71B8FF |
| color-accent-strong | #164C82 | #0D55CB |
| color-focus | #1E5F9D | #9EDBFF |
| color-glass | rgba(220,233,236,.78) | rgba(16,35,63,.86) |
| color-glass-border | rgba(255,255,255,.68) | rgba(147,200,255,.24) |

`--ds-page-background` contiene i gradienti ghiaccio/perla nel tema chiaro
e due gradienti blu nel tema scuro; `--ds-color-page` ne costituisce la base.
I componenti esistenti mantengono i rispettivi sfondi fino alla migrazione.

## Token comuni

- Font corpo e dati: Inter, Segoe UI, Arial, sans-serif.
- Font titoli: Anton, Impact, sans-serif.
- Testo: meta 12px; compatto 14px; corpo 16px.
- H1 pagina: clamp(40px,4vw,48px); hero: clamp(40px,6vw,76px).
- H2: clamp(24px,3vw,32px); sottosezione: 20px.
- Interlinea corpo/titoli: 1.55 / 1.15.
- Scala spazi 1–8: 4, 8, 12, 16, 24, 32, 48, 64px.
- Larghezza massima: 1050px; gutter 24px, 16px fino a 600px.
- Raggi: controllo 8px; card 16px; pannello 24px; pillola 999px.
  Questi ruoli non impongono un raggio identico alle diverse famiglie di card.
- Bordo 1px; controllo min-height 44px, font 14px, padding 10px 16px.
- Glass: blur(22px) saturate(135%).
- Transizioni: .18s ease e .28s cubic-bezier(.22,.8,.22,1).
- Ombra card chiara: 0 8px 24px rgba(20,43,59,.09),
  inset 0 1px rgba(255,255,255,.2).
- Ombra card scura: 0 8px 24px rgba(0,7,28,.2),
  inset 0 1px rgba(255,255,255,.08).
- Ombra flottante chiara/scura: 0 20px 48px rgba(20,43,59,.16) /
  0 20px 48px rgba(0,7,28,.38).

## Compatibilità

- `--max` → `--ds-content-max`; `--max-width` continua a usare `--max`.
- `--space-1`…`--space-7` → corrispondenti `--ds-space-*`.
- `--font-body`, `--font-display` → corrispondenti `--ds-font-*`.
- `--transition-fast`, `--transition-base` → corrispondenti `--ds-transition-*`.
- Le famiglie legacy colori, glass, raggi, ombre e `--rd-*` / `--champions-*`
  rimangono intatte per evitare cambiamenti visivi indiretti.
- Il gutter legacy rimane invariato; il token nuovo ne replica la scala.

## Verifiche e limiti

- `integrity.json`: hash dei file protetti e 31 shell, 498 hash CSS verificati;
  6 combinazioni di rotta per il bootstrap dei temi, incluso layout=legacy.
- `before-browser.json` / `after-browser.json`: nessun errore JavaScript o
  overflow nelle 20 viste. Conteggi e link invariati; per i confronti fra server
  temporanei la porta localhost va normalizzata. Le variazioni geometriche
  campionate della Home sono inferiori a 0.00002px.
- `deterministic-check.cjs`: confronto nello stesso browser, CSS originali
  ricostruiti e verificati via hash, animazioni disabilitate in entrambi i casi.
  Risultati: `deterministic-pixels.json`; bootstrap senza app: `first-paint.json`.
  19 screenshot identici pixel per pixel; nell'indice Letture mobile soltanto
  13 pixel differiscono, con delta massimo 2/255 per canale. Dimensioni identiche
  in tutte le viste; nessuna regressione visibile rilevata.
- CSS modules: PASS.
- Personal betslip: PASS, inclusi deduplica, quote, contesti e persistenza.
- BetSelection: PASS, 6 Schedina e 137 MyCombo/137 prediction legs.
- App modules: errore preesistente; il test cerca una mappa esatta MD1–MD6,
  mentre la mappa esistente comprende MD7. Test e implementazione coincidono
  byte per byte con la baseline. Non corretto perché fuori ambito.
- Il primo avvio Edge nel sandbox non è riuscito; i confronti browser sono
  stati eseguiti con successo attraverso l'esecuzione autorizzata fuori sandbox.
- Non è stata eseguita una nuova esplorazione manuale di ogni filtro o di ogni
  partita. Contrasto dei futuri abbinamenti glass e breakpoint intermedi
  restano da verificare durante la migrazione dei componenti.

## Fase successiva proposta, non avviata

Migrare prima canvas e geometria esterna ai token, con tema blu notte esteso
all'indice Champions e agli approfondimenti. Poi intervenire sui ruoli
tipografici, una famiglia di componenti per volta. Mantenere card partita,
navigazione e statistiche come varianti funzionali distinte e usare questa
baseline per verificare separatamente ogni cambiamento autorizzato.
