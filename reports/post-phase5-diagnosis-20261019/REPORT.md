# Diagnosi post-Fase 5 — 19 ottobre 2026

Report diagnostico. **Nessun file di produzione modificato e nessuna
correzione applicata**, neppure ai temi o alle hero. Nessun builder, commit,
push o deploy. I file nuovi di questa directory sono soltanto evidenze interne.

## Risultati principali

| Problema | Diagnosi |
| --- | --- |
| Letture → Schedina | Rimozione esplicita dei mercati dalle due viste, confermata anche dai test aggiornati nel medesimo commit. Non è un guasto CSS o del catalogo. Ripristinarla è una decisione funzionale, non un semplice pulsante mancante. |
| Legacy Lens–Sporting | Il renderer riceve già `finished` e 0–2, ma stampa comunque “prepartita” e VS. Difetto locale del template, senza divergenza dei dati effettivamente passati. |
| Tema Schedina Champions | Manca una selezione del tema al primo rendering sulle pagine `data-page="betting"`; il bootstrap attuale non viene caricato lì. Necessario un hook di competizione distinto da quello delle Letture. |
| MyCombo/Preferiti | MyCombo recente accorpato ai mercati per partita; componente separato rimasto per MD5. Preferito è un attributo editoriale dei dati, non una raccolta personale. MD7 non contiene `isPreferred:true`; Champions MD2 conserva invece 18 flag, ma il relativo elenco e i badge sono stati rimossi esplicitamente dalla UI. |
| Nomi lunghi Champions | Colonna logo mobile non comprimibile da 110 px e gap di 14 px restringono il titolo; il wrapping di emergenza può lasciare una lettera isolata. Proposta CSS intrinseca locale, ancora da collaudare prima di applicarla. |

Il precedente report di audit non aveva ancora ricostruito queste scelte
storiche. In particolare, l’assenza della sezione nelle Letture **non viene
più classificata genericamente come regressione delle Fasi 0–5**.

## 1. Letture → Schedina

### 1. Causa verificata

Il commit `d746ad77` («grafici e pronostici», 18 ottobre 2026) ha rimosso:

- import e chiamata di `installForecasts()` nella shell universale;
- definizione della sezione `pronostici` e classificazione dei relativi nodi;
- chiamata di `renderSharedForecasts()` nel renderer legacy Serie A;
- collegamenti dai giocatori ai mercati pubblicati.

Nello stesso commit sono stati modificati i test: la sezione Pronostici deve
essere assente anche per partite non concluse; l’audit universale verifica
zero mercati nel layout. Questo dimostra una **rimozione esplicita nel codice
e nel contratto di test**. Il solo repository non dimostra quale conversazione
o decisione di prodotto l’abbia autorizzata: non attribuisco all’utente
un’intenzione che non è provata dalla cronologia tecnica.

### 2. File, funzioni e percorso completo

1. `data/normalized/schedina-md07.json` → `marketCatalog.matches[].selections`.
2. `js/services/data-service.js`, `createDataService().load()` → carica lo
   stesso dataset e applica la policy titolari condivisa.
3. `js/pages/shared-forecast-contract.mjs`, `sharedForecastsForMatch()` →
   identità, pubblicazione, ammissibilità, quota o previsione canonica e ranking.
4. `js/pages/readings.js`, `render()` → ricava `schedina-md07.json` dall’ID
   fixture e passa `marketCatalog` a `readingPrototypeDetail()` e all’adapter.
5. `js/pages/reading-detail/serie-a-adapter.mjs`, `adaptSerieAReading()` →
   conserva le selezioni nel modello universale; **caricarle nel modello non
   significa renderizzarle**.
6. `js/pages/reading-detail/shell.mjs`, `readingSections()` e
   `mountReadingShell()` → non montano più la UI dei pronostici.
7. `js/pages/reading-detail/forecasts.mjs` conserva `installForecasts()` e
   `canPickReading()`, ma non viene più installato dalla shell.
8. `js/pages/personal-betslip-store.mjs` → store condiviso, chiave
   `serie-a-2026-27:personal-betslip:v1`, contesti separati per competizione,
   stagione e giornata; `setContext/add/remove/reconcile/subscribe`.
9. `js/pages/betting.js`, `matchdayWorkspaceContent()`,
   `registerSelection()` e `initializePersonalBetslip()` → montano il catalogo
   corrente nella Schedina e registrano le selezioni nel medesimo store.

### 3. Comportamento attuale

- Fiorentina–Como MD7, universale e legacy: nessuna riga operativa, pulsante
  `data-rd-pick` o collegamento `data-market-link` nel DOM; nessun errore JS.
- MD7: 217 selezioni pubblicate nel catalogo. Fra queste, 197 superano
  `hasVerifiedPlayableQuote()` e 20 sono previsioni canoniche del modello.
- Le sei fixture ancora `scheduled` **nei file del progetto** comprendono
  140 selezioni pubblicate. Lo stato del dataset non viene dedotto dalla data
  odierna né aggiornato durante questo audit.
- Le 20 canoniche sono quattro per Fiorentina–Como, Milan–Atalanta,
  Juventus–Lazio, Monza–Cagliari e Parma–Torino. Udinese–Lecce ne ha zero.
- `canPickReading()` ammette solo Serie A MD7 non conclusa e contratto
  `isCanonicalModelForecast()`. Non ammette automaticamente tutte le 197
  selezioni con quota provider.
- I collegamenti «Esiti nella Schedina» sono una navigazione d’archivio per
  specifici contesti conclusi, non una nuova interazione di aggiunta. Quello
  Serie A attuale è previsto per MD6, quello Champions per MD2.

### 4. Comportamento previsto ricostruito

Il contratto corrente del layout è: analisi nelle Letture, mercati nella
Schedina. Il precedente contratto consentiva l’aggiunta dalla Lettura alle
sole previsioni canoniche ammesse, con lo stesso store e gli stessi ID.

Non risultano altre azioni nascoste o un nuovo comando che abbia sostituito
silenziosamente «Aggiungi» nella Lettura. Il modulo esistente conserva una
funzione, ma la sua mancata installazione è esplicita.

### 5. Correzione minima proposta

**Nessun ripristino automatico consigliato come bugfix.** Serve prima scegliere
il contratto desiderato:

- Se le Letture devono restare analitiche: nessun pulsante da aggiungere;
  aggiornare soltanto le aspettative dei test end-to-end e, se richiesto,
  valutare un collegamento alla Schedina anche per le gare aperte.
- Se si vuole ripristinare il comportamento precedente: riattivare il modulo
  esistente e la relativa sezione della shell; nel legacy riattivare il
  registro e il binding già esistente. Riutilizzare store, ID, contesto e
  gate attuali, senza creare un nuovo renderer indipendente.
- Rendere aggiungibili anche le selezioni provider oggi escluse da
  `canPickReading()` è un’ulteriore modifica del contratto: non va inclusa
  implicitamente nel ripristino.

### 6. Rischio di regressione

**Medio** per un ripristino: doppio binding universale/legacy, contesti o
reconciliation parziali, selezioni concluse riattivate, totali forzati in
assenza di quota, ritorno di contenuti pubblici sulle fonti. Il ripristino
richiede anche l’aggiornamento dei test che oggi impongono zero mercati.

### 7. Test necessari dopo eventuale autorizzazione

- Fixture reali con e senza previsione canonica; Fiorentina–Como è adatta
  al percorso reale del contratto precedente, Udinese–Lecce al controllo negativo.
- Aggiunta/rimozione, reload, Lettura → Schedina → Lettura e deduplica per ID.
- Identità dei contratti prima/dopo, quota assente `—`, totale non inventato.
- Fixture concluse non operative; policy ufficiali titolari e selezioni salvate.
- Universale/legacy, competizioni e giornate separate, tastiera/focus.
- Fonti interne ancora non esposte nella UI.

## 2. Fallback legacy Champions: Lens–Sporting MD2

### 1. Causa verificata

`js/pages/champions.js` costruisce `requestedFixture` unendo il pilot al
calendario: lo stato e il risultato del calendario hanno priorità.
Per Lens–Sporting il calendario contiene `finished`, `home:0`, `away:2`.
Il pilot grezzo ha `status:"experimental-detailed"`, che è uno stato del
prodotto analitico: **non viene usato al posto del finale disponibile**.

La stessa `requestedFixture` viene passata sia all’adapter universale sia a
`pilotReadingDetail()`. Quest’ultimo contiene però letterali «prepartita» e
`<b>VS</b>` nel template della testata. La divergenza nasce lì, non nel dato.

### 2. File e funzioni

- `js/pages/champions.js`: `render()`, costruzione `requestedFixture`,
  `pilotReadingDetail()` e `matchReport()`.
- `js/pages/reading-detail/champions-adapter.mjs`: `adaptChampionsReading()`.
- `js/pages/reading-detail/shell.mjs`: `heroMarkup()`.
- Dati letti: `champions-league-2026-27.json` e
  `champions-pilot-predictions-md02-2026-27.json`.

### 3–4. Attuale e previsto

Attuale: universale «Partita conclusa / Finale 0–2», legacy «prepartita / VS».
Previsto: entrambe le testate riflettono il ciclo partita canonico, mantenendo
chiaramente archiviate le proiezioni formulate prima della gara.

### 5. Correzione minima proposta

Nel solo template `pilotReadingDetail()`, derivare etichetta e risultato da
`fixture.status` e `fixture.score`, già ricevuti. Gestire correttamente lo
zero del Lens e distinguere stato concluso da eventuale risultato assente.
Nessuna modifica ai JSON, al pilot, alle probabilità o al tabellino.

### 6. Rischio

**Basso**, purché il condizionale riguardi la sola testata e non sostituisca
stime prepartita con risultati reali dentro le sezioni previsionali.

### 7. Test necessari

Lens–Sporting e altre concluse, gare `scheduled`, `live`, rinviate e risultato
mancante; confronto dei due layout, query `layout=legacy`, corretto 0–2,
hash dati e pronostici invariati.

## 3. Tema Schedina Champions

### 1. Causa verificata

`schedina.html` è una pagina `data-page="betting"`, anche quando la query
contiene `competizione=champions`. I token scuri si attivano invece con
`data-page="champions"` o `data-reading-detail-theme="champions"`.

`scripts/site-styles.js`, `applyStyleLinks()`, inserisce il bootstrap
sincrono `initial-presentation.js` soltanto per Letture e Champions.
Il bootstrap attuale riconosce inoltre solo le Letture con parametro `match`.

Verificato bloccando l’app: le due route Schedina Champions iniziano già con
`#F8F7F4`, nessun bootstrap e nessun hook scuro. Non è soltanto un ritardo
del renderer. La route senza `giornata` serve l’archivio MD1; con `giornata=2`
serve l’archivio MD2.

### 2. File e funzioni

`js/initial-presentation.js`; `scripts/site-styles.js` (`applyStyleLinks()`);
integrazione tramite `scripts/build-site.js`; `css/tokens.css`,
`css/page-background.css`, `css/betting.css`; shell `schedina.html`.
Da verificare, non riscrivere a priori: navbar in `css/site-layout.css`.

### 3–4. Attuale e previsto

Attuale: corpo e superfici Schedina chiari, pur con card Champions blu.
Previsto: tema notte coerente da prima del rendering per archivio MD1/MD2,
controlli, righe, dialog/pannello personale, stati focus/hover/disabilitati.
Schedina Serie A e archivio generale senza query restano chiari.

### 5. Correzione minima proposta

1. Estendere il bootstrap esistente alle pagine betting, eseguendolo subito
   dopo l’apertura del body, prima della navbar e del placeholder.
2. Leggere sincronicamente la query e impostare un attributo dedicato, per
   esempio `data-competition-theme="champions"`.
3. Collegare quel solo attributo ai token scuri esistenti; nessuna copia della palette.
4. Correggere nei soli componenti betting interessati i colori hardcoded
   chiari di controlli, righe e pannello personale. Preservare colori squadra,
   esiti e geometria. Una semplice sostituzione dello sfondo body è insufficiente.
5. Aggiornare le versioni degli asset nel solo percorso di presentazione.

Non cambiare `data-page` in `champions`: cambierebbe pagina/router. Non
riutilizzare `data-reading-detail-theme`: `js/core/app.js` lo cancella quando
manca `.rd-shell`, provocando il ritorno al tema chiaro dopo l’avvio.
L’inserimento del bootstrap va separato dalla decisione di caricare
`reading-detail.css`, che non serve alla Schedina.

### 6. Rischio

**Medio**: flash chiaro, tema scuro cancellato a fine render, leakage verso
Serie A, controlli bianchi su fondo scuro, contrasto degli esiti e pannello
mobile. Nessun motivo per toccare store, selezioni o criteri di ammissibilità.

### 7. Test necessari

App bloccata e rallentata, cache fredda/calda, MD1 senza giornata e MD2,
route Serie A e archivio generale, nessun flash, marker mantenuto dopo il
render; tutte le sei larghezze, menu/focus, contrasto delle superfici e stati,
apertura/rimozione del pannello personale e hash dei dati invariati.

## 4. MyCombo e Preferiti

### 1. Causa e storia verificate

Il commit `c21ec704` («render») introduce il workspace per partita e limita
il vecchio `myComboRoundContent()` separato alla MD5. Il commit `21319d71`
(«schedine») elimina dal workspace il sottoblocco MyCombo duplicato e conserva
le selezioni ammissibili nel registro per partita.

Il commit `8bacb55c` («migliorie») rimuove esplicitamente l’elenco Champions
«I 18 preferiti», le relative righe e il loro pulsante di aggiunta. Introduce
inoltre `hasVisiblePreferred()` per non mostrare i badge su selezioni Champions.
Il dataset MD2 conserva tuttora 18 selezioni `isPreferred:true`: qui l’assenza
della UI non deriva da mancanza dei dati, diversamente dalla MD7 Serie A.

Oggi `matchdayWorkspaceContent()` usa il catalogo pubblicato quando presente;
solo in sua assenza ricorre alle proposte precedenti e alle gambe Safe di
MyCombo con quota verificata. Deduplica per `selectionId` e poi registra le
azioni nel costruttore personale. Non è lecito dedurre che ogni gamba di ogni
combinazione debba apparire nella UI solo perché il suo contratto è valido.

### 2. File e funzioni

`js/pages/betting.js`: `myComboRoundContent()`, `bindMyComboInteractions()`,
`matchdayWorkspaceContent()`, `hasVisiblePreferred()`, `editorialBadges()`,
`selectableMarketRow()`, `registerSelection()`, `initializePersonalBetslip()`;
`shared-forecast-contract.mjs`; `personal-betslip-store.mjs`; cataloghi MD6/MD7
e `data/normalized/predictions.json`.

### 3. Interazioni effettivamente presenti

| Contesto letto nel browser | Disponibilità reale |
| --- | --- |
| MD5 | 9 card MyCombo e 86 vecchi pulsanti, tutti disabilitati nel contesto archiviato. |
| MD6 | 169 righe nel workspace; fra le origini pubblicate compare `mycombo-safe`. Nessun vecchio pulsante MyCombo separato. |
| MD7 | 217 righe e 140 azioni personali; mercato cliccabile con mouse o Enter/Spazio. Nessun vecchio pulsante MyCombo separato. |
| Preferiti MD7 | Zero righe `data-preferred=true`; tutte le 217 selezioni pubblicate hanno `isPreferred` diverso da `true`. |
| Preferiti Champions MD2 | 18 flag nei dati, zero righe/badge Preferiti nel DOM: elenco separato eliminato e badge soppressi esplicitamente. |

`hasVisiblePreferred()` mostra la stella solo se `isPreferred===true` e il
contesto della selezione non è Champions. È una **qualifica editoriale del
pronostico**; non risulta una raccolta utente salvata con un comando «Preferito».
La persistenza personale disponibile è quella della Schedina, con
`aria-pressed` per la selezione, non una seconda lista di bookmark.

### 4. Comportamento previsto ricostruito

MD6/MD7: usare i mercati pubblicati per partita e il pannello personale,
senza ripristinare automaticamente il vecchio blocco. Champions: il contratto UI attuale omette deliberatamente elenco e badge dei 18 preferiti, pur conservando i flag. Serie A: mostrare
il badge solo sui flag veri, senza creare preferenze dai ranking o dai test.
La correttezza delle 137 MyCombo validate dai test non dimostra la presenza
di 137 azioni MyCombo nell’interfaccia corrente.

### 5. Correzione minima proposta

Nessun guasto del renderer o dello store che spieghi una sparizione accidentale è dimostrato qui.
Aggiornare prima i test UI ai comandi realmente disponibili: righe dei
mercati, accordion della partita e pannello personale. Trattare la MD5
archiviata come controllo read-only.

Se si desidera di nuovo l’elenco Champions dei 18 preferiti, la correzione minima candidata è una proiezione dei flag già presenti sul catalogo/audit display corrente: stessi ID, stessi esiti e vincoli di consultazione delle gare concluse. Non duplicare registrazioni o ripristinare pulsanti operativi sulle gare archiviate. È una scelta funzionale da autorizzare, non un ripristino automatico.

Reintrodurre una lista MyCombo dedicata o una raccolta personale Preferiti
richiederebbe una scelta funzionale esplicita. Non farlo come riparazione
grafica. Se si vuole controllare il badge Preferito su dati reali, occorre
un contesto che contenga realmente quel flag; non modificarlo per il test.

### 6. Rischio

**Basso** aggiornando test e documentazione; **medio/alto** ripristinando
vecchie UI: duplicati, esposizione di mercati non pubblicati, quote o contesti
non coerenti, aggiramento della policy titolari e falsi Preferiti.

### 7. Test necessari

ID delle righe uguali al catalogo pubblicato; deduplica, contesti, reload e
rimozione; gambe MyCombo pubblicate presenti una sola volta; MD5/MD6 concluse
non aggiungibili; badge solo con flag reale; nessuna equivalenza implicita
fra stella editoriale e selezione personale; unit test dei contratti separati
dai test UI.

## 5. Nomi lunghi Champions

### 1. Causa verificata

Nel breakpoint fino a 600 px, `css/champions.css` assegna alla sola identità
della scheda squadra un logo con `flex-basis/width/height:110px` e un gap di
14 px. Il pannello ha padding orizzontale di 18 px. A 390 px rimangono circa
196 px al testo, a 320 circa 126 px.

Il titolo mantiene la scala Anton del design system e il wrapping di
emergenza. Nomi come Galatasaray e Manchester City possono così spezzarsi
lasciando una sola lettera sulla riga successiva. Nessun dato è perso e non
è necessario ridurre i font di tutte le pagine.

### 2. File e selettori

`js/pages/champions.js`, `championsTeamDetail()` produce già la struttura
corretta; non richiede una modifica HTML. CSS coinvolto:
`.champions-team-identity`, `.champions-team-hero-logo` e titolo della relativa
identità in `css/champions.css`. La scala del titolo resta in `site-layout.css`.

### 3–4. Attuale e previsto

Attuale: logo e testo restano affiancati anche quando il titolo non ha spazio.
Previsto: conservare l’affiancamento quando il nome entra; consentire alla
sola identità troppo stretta di andare a capo in modo leggibile, con stesso
font e nessuna modifica alla hero principale Champions o Home.

### 5. Soluzione CSS locale proposta, non applicata né collaudata

Valutare il wrapping intrinseco dei due elementi, limitato alla scheda squadra
mobile: `flex-wrap:wrap` sull’identità; base intrinseca `min-content` per il
blocco testuale; wrapping d’emergenza del titolo che non riduca artificialmente
la larghezza minima a una singola lettera (`overflow-wrap:break-word` invece
di `anywhere` in questo ruolo). Quando la riga non basta, il blocco testuale
passa sotto il logo invece di comprimersi fino alla lettera isolata.

Il selettore deve restare confinato a
`body[data-page="champions"] .champions-team-detail .champions-team-identity`
nel breakpoint mobile. Non usare `.hero h1` globale, font più piccoli per
tutti o eccezioni scritte per nome della squadra.

È una **candidata tecnica da verificare**, non una soluzione già dichiarata
PASS. Se producesse troppi cambi riga nei nomi brevi, va scartata o ristretta
prima di applicarla; non si cambiano indiscriminatamente tutte le hero.

### 6. Rischio

**Medio/basso**: maggiore altezza soltanto nei casi stretti, possibili differenze
nei calcoli intrinseci e nel rapporto logo/titolo. Non coinvolge dati, campi,
rose o interazioni. Nessuna riduzione generalizzata del font.

### 7. Test necessari

Tutte le 36 schede a 320/390, campione a 768/901/1050/1440; Galatasaray,
Manchester City, Manchester United, Atlético, PSG e nomi brevi; confronto
prima/dopo delle identità che già entravano, coach e metadati integri, nessun
overflow e nessun cambiamento nelle hero principali.

## Evidenze, limiti e chiusura

- Ispezione corrente di sorgenti, contratti, dati e diff storici.
- Browser isolato: 9 rotte, più 2 casi con applicazione bloccata per osservare
  il primo rendering Schedina Champions. Zero errori JavaScript.
- Conteggi letti dal catalogo corrente in `catalog-evidence.json`.
- Risultati DOM in `browser-evidence.json`; rimozioni storiche in
  `history-evidence.diff`.
- Nessun test di una correzione futura viene dichiarato superato. Il CSS
  proposto per i nomi non è stato inserito né nei file né nella pagina.
- L’intenzione di prodotto dell’autore dei commit non viene inferita oltre
  quanto dimostrato dalle modifiche esplicite e dai test associati.
- Integrità finale documentata in `integrity.json`: tutti i file di produzione
  fotografati all’inizio risultano invariati.

**La diagnosi termina qui. Per procedere a qualunque correzione si attende
l’autorizzazione dell’utente, con la scelta del contratto Letture → Schedina.**
