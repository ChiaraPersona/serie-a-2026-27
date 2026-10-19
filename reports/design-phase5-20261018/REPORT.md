# Fase 5 — audit finale e consolidamento

## Esito complessivo

**Audit completato con punti aperti. La pubblicazione non viene dichiarata
pronta senza riserve.** La matrice responsive e l’integrità sono superate;
restano verifiche operative non concluse e incongruenze preesistenti da
valutare prima dell’approvazione finale.

Controllate 72 rotte a 1440, 1050, 901, 768, 390 e 320 px: **432 viste**.
Comprendono 16 rotte principali/approfondimenti, tutte le 20 schede Serie A
e tutte le 36 schede Champions. Nessun nuovo restyling o cambiamento di
struttura, contenuti, renderer, dati o motori.

## Stato delle sezioni

| Sezione | Stato | Evidenza e limiti |
| --- | --- | --- |
| Home | PASS | Hero fotografica e classifica preservate; corretto il contrasto del titolo PT. Ordinamento verificato a desktop/mobile. |
| Squadre | PASS | Griglia, loghi, flip e contenimento dei 20 retro-card verificati; responsive senza overflow. |
| Giocatori | PASS | Filtri, modalità comparatore, scroll interno, sticky header, focus e wrapping a 320 px verificati. |
| Indice Letture | PASS | Archivio apribile/richiudibile, card glass e navigazione preservati. |
| Letture Serie A — grafica | PASS | Vista universale e fallback controllati; testi, campi e dati invariati. |
| Lettura → Schedina | NON VERIFICATO | Cercate tutte le sei gare MD7 non concluse, in vista universale e legacy: nessuna azione di aggiunta esposta nelle Letture. Nessuna selezione inventata. |
| Allineamento Letture/Schedina | DA CORREGGERE / approfondire | Il catalogo contiene selezioni reali e la Schedina le espone, ma le Letture esaminate non offrono le azioni corrispondenti. Problema funzionale documentato, non modificato. |
| Coppa Italia | PASS | Accordion, collegamenti dei turni e tabellone preservati. |
| Champions principale | PASS | Tema notte, primo rendering, filtri giornata/squadra/reset, calendario, card e archivio verificati. |
| Letture Champions universali | PASS | Tema scuro e componenti presenti; verifica grafica e filtri formazioni superati. |
| Fallback legacy Champions | DA CORREGGERE | Lens–Sporting MD2 appare conclusa 0–2 nella vista universale, ma il fallback mostra ancora “prepartita” e VS. Preesistente e non corretto perché richiede intervenire nella presentazione applicativa del risultato. |
| Archivio Schedine | PASS | Nove card, apertura e navigazione verificate a desktop/mobile. |
| Schedina personale | PASS | Aggiunta di una selezione reale nella Schedina MD7, persistenza dopo reload e rimozione verificate a 1440/390. Questo PASS non vale per Lettura → Schedina. |
| Schedine Champions | DA CORREGGERE per coerenza del tema | Gli archivi funzionano, ma la route `schedina.html?competizione=champions&giornata=2` mantiene il tema chiaro della Schedina. Non soddisfa l’interpretazione estesa del requisito “tutta la sezione Champions blu notte”. Nessuna modifica del bootstrap o del renderer eseguita. |
| MyCombo, azione separata | NON VERIFICATO | Il workspace attuale non espone i vecchi pulsanti MyCombo usati dal controllo UI. Contratti delle 137 MyCombo verificati; non equivale al PASS dell’interazione separata. |
| Preferiti, azione separata | NON VERIFICATO | Nessuna riga operativa marcata `data-preferred=true` disponibile nel contesto esaminato. |
| 20 schede Serie A | PASS automatico; revisione visiva parziale | Tutte a sei larghezze: 120 viste. Ispezionati manualmente header/riepiloghi mobili di tutte le squadre nelle tavole. Non revisionata manualmente ogni riga di ogni scheda. |
| 36 schede Champions | PASS automatico; rifinitura visiva aperta | Tutte a sei larghezze: 216 viste. Ispezionati manualmente header/riepiloghi mobili di tutte le squadre. Alcuni nomi lunghi hanno spezzature poco eleganti, descritte sotto. |
| Fantacalcio e Arbitri | PASS automatico di caricamento/responsive | Inclusi nella matrice; controllati visivamente i riepiloghi mobili. Nessuna nuova verifica completa dei loro motori o di tutte le interazioni. |

## Correzioni effettuate

### 1. Contrasto PT nella classifica Home

- Problema: testo da 11 px `#a77416` su superficie `#eef4f6`, contrasto
  **3,67:1**, inferiore a 4,5:1.
- Causa: `.standings-table th:nth-child(3)` eredita l’oro usato anche nei dati.
- Correzione: soltanto nell’header della classifica Home, colore `#805b16`;
  rapporto misurato **5,52:1**. Nessun cambiamento ai valori della colonna.
- Selettore: `body[data-page="home"] .home-standings .standings-table thead th:nth-child(3):not(.standings-column-active)`.
- Verifiche: Home ricontrollata alle sei larghezze; ordinamento PT a
  1440/390 con testo attivo bianco e sfondo blu preservati.
- Evidenze: `contrast-before.json`, `contrast.json`, `contrast-fix.json`,
  `home-final.json`, screenshot `home-final-*` e `pt-sorted-*`.

### 2. Consolidamento del CSS Giocatori

Eliminate soltanto due dichiarazioni:

1. `text-align:left` nella prima regola di `.player-comparator-head article`,
   sovrascritta incondizionatamente da `text-align:center` con lo stesso
   selettore più avanti nello stesso modulo.
2. `grid-template-columns:minmax(0,1fr)` nel blocco mobile dei controlli del
   comparatore, già identico alla dichiarazione non condizionata.

Confrontati gli stili degli elementi della pagina alle sei larghezze,
sostituendo nello stesso DOM il foglio consolidato con la copia originale:
**sei confronti identici**, incluso `text-align`. Nessun nuovo `!important`.
Evidenze in `cleanup.json` e `final-qa.json`.

## Audit della cascata e dei token

- Catalogo: 49 token `--ds-*`; sette senza riferimenti CSS diretti nel
  campione statico: `--ds-text-compact`, `--ds-text-body`,
  `--ds-title-subsection`, `--ds-control-min-height`,
  `--ds-control-font-size`, `--ds-control-padding-block`,
  `--ds-control-padding-inline`.
- **Conservati**: assenza di riferimenti CSS non dimostra che sia sicuro
  eliminare il catalogo o rompere il contratto di compatibilità.
- `site-layout.css`: individuate successive definizioni di geometria e
  titoli, comprese le regole `.page-heading` che prevalgono sui vecchi stili
  hero. Conservate: la loro specificità gestisce le eccezioni esistenti.
- `component-system.css`: le regole esplicite per famiglie di controlli e
  tabelle prevalgono intenzionalmente sulla palette legacy. Non rimosse.
- `reading-detail.css`: mantenute le dichiarazioni legacy `!important`;
  non dimostrata una rimozione sicura sull’intera cascata.
- Nessuna riscrittura generale e nessuna eliminazione basata soltanto su una
  ricerca testuale. Risultati statici in `css-audit.json`.

## Verifiche eseguite

| Controllo | Risultato reale |
| --- | --- |
| Matrice prima/dopo consolidamento | 432 viste per stato, nessun overflow del documento. |
| JavaScript e risorse locali | Zero errori JavaScript, zero risposte HTTP locali >=400, zero immagini rotte. |
| Contenuti protetti nel browser | Nessuna differenza in testi completi, link, immagini, posizioni inline dei giocatori, controlli, H1, temi e presenza dei sottotitoli. |
| Sottotitoli editoriali | Nessuna reintroduzione nelle rotte controllate. Metadati conservati. |
| Destinazioni interne | 516 destinazioni uniche controllate: file locali e identificativi delle partite validi. Non è un crawl delle destinazioni esterne. |
| Primo rendering | Sei casi verificati bloccando l’avvio dell’applicazione: temi Serie A/Champions, dettagli e legacy. Verificati CSS e pixel dello sfondo. Non include il tema della Schedina Champions, segnalato separatamente. |
| Menu mobile | Apertura/chiusura nei due temi e collegamenti verificati. |
| Tabelle | Scroll interno, tastiera e intestazioni sticky Giocatori verificati. |
| Letture | Filtri titolari/panchina, pannello personale e archivio verificati. |
| Coppa | Apertura/chiusura accordion verificata. |
| Champions | Filtri giornata/squadra/reset e indicazione dinamica del calendario verificati. |
| Schedina reale | `check-schedina-recovery.cjs`: 8 contesti desktop/mobile; MD6 169 righe, MD7 217, Champions MD2 117, MD1 52; aggiunta/reload/rimozione reali superati. |
| CSS | `test-css-modules.js`: superato, entry point 994 byte. |
| Store | `test-personal-betslip.mjs`: superato. |
| Contratti | `test-betting-selection-contract.js`: superato; 6 Schedina, 137 MyCombo e 137 prediction legs. |
| Tastiera | Focus visibile, attivazione filtro, scroll e wrapping locale a 320 px superati. Non è una verifica con screen reader. |
| Contrasto su superfici opache | 1.277 campioni di testo/controlli: dopo la correzione PT nessuno sotto la soglia adottata. Sono conteggiati anche campioni ripetuti; non 1.277 componenti distinti. |
| Glass e gradienti | 4.641 candidati esclusi dal calcolo automatico dello sfondo; revisione visiva rappresentativa. **NON VERIFICATA una conformità WCAG completa su tutti i gradienti e gli stati.** |
| Diff | `git diff --check`: superato. |

I campioni di contrasto coprono Home, Giocatori, Inter, Champions principale,
AEK, lettura Champions e Schedina MD7 a 390 px. Non viene esteso il loro
risultato a tutte le pagine, larghezze o superfici traslucide.

Il confronto degli hash degli stili contiene differenze per Home e fallback
Champions perché gli URL delle immagini CSS includono la porta effimera del
server di test. Non sono state presentate come regressioni o come identità
assoluta di tutti gli hash. L’equivalenza delle eliminazioni CSS è dimostrata
separatamente mediante sostituzione del foglio nello stesso DOM.

## Punti aperti e limiti

1. **Lettura → Schedina NON VERIFICATO**: ricerca effettuata su tutte le sei
   fixture MD7 non concluse, in entrambi i layout. Nelle viste universali è
   presente la shell, ma non vi sono pulsanti `data-rd-pick`; nei legacy non
   vi sono righe operative selezionabili. Il catalogo letto senza scritture
   contiene invece 17–30 selezioni per ciascuna di queste fixture; la Schedina
   espone 140 righe operative complessive. È necessario approfondire il
   collegamento delle selezioni nelle Letture. Nessuna diagnosi causale
   definitiva o modifica dei renderer è stata effettuata.
2. **Legacy Champions**: stato “prepartita/VS” non allineato alla vista
   universale conclusa di Lens–Sporting. Il difetto era già nella baseline.
3. **MyCombo/Preferiti separati NON VERIFICATI**: controlli UI disponibili
   diversi o assenti rispetto ai vecchi selettori. I test dei contratti e
   dello store non vengono usati per dichiarare superati questi percorsi UI.
4. **Tema Schedina Champions**: tema chiaro preesistente. Da riallineare se
   il requisito notte riguarda anche questo archivio, non soltanto le pagine
   `champions-league.html` e i loro approfondimenti. Non corretto con uno
   sfondo tardivo che introdurrebbe un primo rendering incoerente.
5. **Nomi lunghi Champions**: a 390 px alcune intestazioni spezzano in modo
   poco elegante Galatasaray e Manchester City. Causa riproducibile: logo
   mobile da 110 px più gap di 14 px, che riduce lo spazio del titolo.
   Nessuna perdita di testo o overflow. Registrato come rifinitura visiva
   **DA CORREGGERE**, senza cambiare ora la geometria approvata delle 36 hero.
6. **Accessibilità completa NON VERIFICATA**: nessun audit con screen reader,
   dispositivi reali o motori diversi da Edge/Chromium; contrasto glass e
   gradienti verificato visivamente a campione, non certificato su ogni pixel.
7. L’ispezione manuale delle 56 schede riguarda header/riepiloghi mobili;
   il controllo dell’intero documento e delle altre larghezze è automatico.
   Non si dichiara una revisione visiva manuale integrale di ogni scheda.

## Integrità e modifiche concorrenti

Confrontati gli hash prima di scrivere. **Invariati 9.114 file dati, 44 file
JavaScript e 470 file sotto `scripts/`**, inclusi builder e policy pubblica.
I file dati e JavaScript coincidono anche con la baseline protetta della
Fase 4. Intestazioni, foto già eliminate, rose, formazioni, quote e motori
preservati. Non sono state sovrascritte modifiche concorrenti.

Nessun builder di dati/previsioni, `npm run build`, commit, push o deploy.
Aggiornati gli hash CSS nelle shell attuali tramite `applyStyleLinks()`, con
controllo che tutto il resto dell’HTML rimanga identico e trasformazione
idempotente. Evidenza in `integrity.json`.

## Elenco completo dei file di produzione modificati

- `css/home.css`
- `css/player-statistics.css`
- `arbitri.html`
- `champions-league.html`
- `coppa-italia.html`
- `fantacalcio.html`
- `fonti.html`
- `index.html`
- `lettura.html`
- `schedina.html`
- `squadra.html`
- `statistiche-giocatori.html`
- `statistiche-squadre.html`
- `statistiche-squadra/atalanta.html`
- `statistiche-squadra/bologna.html`
- `statistiche-squadra/cagliari.html`
- `statistiche-squadra/como.html`
- `statistiche-squadra/fiorentina.html`
- `statistiche-squadra/frosinone.html`
- `statistiche-squadra/genoa.html`
- `statistiche-squadra/inter.html`
- `statistiche-squadra/juventus.html`
- `statistiche-squadra/lazio.html`
- `statistiche-squadra/lecce.html`
- `statistiche-squadra/milan.html`
- `statistiche-squadra/monza.html`
- `statistiche-squadra/napoli.html`
- `statistiche-squadra/parma.html`
- `statistiche-squadra/roma.html`
- `statistiche-squadra/sassuolo.html`
- `statistiche-squadra/torino.html`
- `statistiche-squadra/udinese.html`
- `statistiche-squadra/venezia.html`

I 31 HTML contengono esclusivamente nuove versioni CSS. Gli artefatti interni
sono in questa directory; `MANIFEST.json` ne elenca integralmente i file.

## Screenshot e prontezza alla pubblicazione

Aprire **`evidenze.html`** per screenshot desktop/mobile, pagine complete
rappresentative e accesso alle catture di tutte le 56 schede. Le tavole
`sheet-0.png` … `sheet-6.png` documentano l’ispezione dei riepiloghi mobili;
`main-sheet-0.png` e `main-sheet-1.png` raccolgono le rotte principali.
Per Home, le immagini `home-final-*` mostrano la correzione finale del contrasto.

**Parte grafica generale stabile; approvazione alla pubblicazione condizionata
alla valutazione dei punti aperti sopra.** Nessuna regressione introdotta
rilevata nelle verifiche eseguite, ma non viene dichiarata una completa
stabilità end-to-end di Letture, MyCombo e Preferiti, né conformità WCAG totale.

La Fase 5 termina qui. Si attende l’approvazione finale dell’utente.
