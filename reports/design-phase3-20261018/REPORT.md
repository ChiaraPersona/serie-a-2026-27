# Armonizzazione grafica — Fase 3

Intervento sui componenti condivisi, realizzato per blocchi A–F. Nessun restyling
delle singole pagine e nessun nuovo contenitore HTML. Le Fasi 0–2 restano il
riferimento; `css/tokens.css` continua a definire i valori semantici.

## 1. File modificati da questo intervento

- `css/component-system.css`: nuovo modulo condiviso, con selettori espliciti
  per famiglie di componenti. Non aggiunge regole globali a .card, .grid, table,
  th o td e non contiene dichiarazioni !important.
- `css/styles.css`: importa il nuovo modulo dopo player-statistics.css.
  Entry point di 994 byte; ordine degli altri moduli conservato.
- `css/tokens.css`: aggiunto solo `--ds-color-on-accent: #FFFFFF`, per il testo
  dei controlli sul blu di azione nei due temi.
- 31 shell HTML: rinfrescati i collegamenti CSS e i relativi hash attraverso
  `applyStyleLinks()` di `scripts/site-styles.js`, senza builder di dati.
- Questa directory: baseline, verifiche e screenshot interni.

Nessun renderer, store, file dati o motore è stato scritto da questo intervento.
Il checkout contiene anche il lavoro concorrente sulle fotografie: vedere la
sezione dedicata, prima di attribuire tutte le differenze Git alla Fase 3.

## 2. Componenti armonizzati

| Blocco | Famiglie | Scelte applicate | Controlli mirati |
| --- | --- | --- | --- |
| A | Archivio/futuro Letture, pannelli Giocatori, schede arbitro | Gerarchia aperta / pannello leggero | 8 viste |
| B | Card partita, card Coppa, card squadra, navigazione Home | Raggi per ruolo, palette e interazioni conservate | 8 viste |
| C | Classifiche, rosa, tabella Giocatori, statistiche Letture, filtri | Inter, bordi, celle, intestazioni, focus | 10 viste |
| D | Progressi, confronti, canali d'attacco, indicatori arbitrali | Altezze e raggi per ruolo, numeri tabulari | 8 viste |
| E | Selettori, filtri, controlli compatti e pannelli personali | Superfici e stati a due temi | 10 viste |
| F | Testo del profilo nel comparatore Giocatori | Wrapping locale, senza cambiare colonne o griglie | 2 viste |

### Tre livelli dei contenitori

- **Livello 1 — sezione aperta:** archivio e giornate future delle Letture perdono
  il bordo/fondo decorativo esterno. Sezioni editoriali già aperte rimangono tali.
  Contenuti e ordine non cambiano.
- **Livello 2 — pannello leggero:** statistiche Giocatori e relativo comparatore
  usano glass discreto, bordo semantico, raggio pannello 24px e ombra condivisa.
  Le schede arbitrali mantengono una superficie più discreta e raggio card 16px.
- **Livello 3 — card protagonista:** partite e Coppa usano il raggio card 16px;
  squadra e navigazione mantengono un profilo più ampio da pannello. Sono
  conservati gradienti, colori squadra, glass, flip e ombre caratterizzanti.
  Le righe compatte dell'archivio non vengono trasformate in card arrotondate.

I pannelli personali mantengono la propria funzione di drawer/dialog; non sono
uniformati alle card partita e non ricevono un nuovo contenitore esterno.

### Tabelle e filtri

- Famiglie di tabelle nominate esplicitamente, senza reset globale.
- Inter e numeri tabulari; testo ordinario delle tabelle 12px, intestazioni
  principali 11px. Le micro-tabelle arbitrali mantengono 10/9px.
- Celle ordinarie: padding verticale 12px su desktop e 10px su mobile;
  padding orizzontale secondo il ruolo della famiglia.
- Conservati padding degli header sticky a più righe, top/left delle colonne,
  allineamenti, larghezze minime, colgroup e ordine delle colonne.
- Bordi e hover/focus raccordati ai token. Conservati evidenziazione della
  colonna attiva e colori semantici dei valori.
- Filtri, input e select: bordo e superficie del tema, raggio controllo 8px,
  focus visibile. Nessuna opzione, handler o griglia modificata.

### Barre e pulsanti

- Progressi minuti: 4px; confronti e canali d'attacco: 8px; micro-barre arbitro:
  6px. Raggi coerenti con la funzione, senza modificare le larghezze calcolate.
- Colori squadra, esiti, cartellini e variabili arbitrali preservati.
- Controlli: raggio 8px, testo e superfici del tema; stati attivi su blu con
  testo bianco. Focus di 2px con offset 3px.
- CTA dei pannelli personali: forma a pillola, blu di azione e ombra flottante.
- Nessuna nuova altezza minima universale: il controllo compatto del comparatore
  resta 32px. Disabled e gli effetti interattivi esistenti vengono rispettati.

### Overflow locale

Il solo testo del profilo riceve `min-width:0` e `overflow-wrap:anywhere`.
Il selettore comprende `.player-photo-details` e il suo nuovo nome equivalente
`.player-comparison-details`, introdotto dal lavoro parallelo sulle fotografie.
Non sono stati toccati griglie, coordinate o overflow del documento.

Il test di regressione alla larghezza originaria del testo, 45.5px, misura
scrollWidth 88px senza wrapping e 46px con wrapping, su clientWidth 46px.
Il documento misurato a 320px resta largo 320px.

## 3. Differenze visive intenzionali

1. Minore decorazione esterna nell'archivio Letture.
2. Pannelli statistici con superficie glass, bordo e ombra coerenti.
3. Raggi raccordati ai ruoli, preservando le diverse silhouette delle card.
4. Tabelle più coerenti per tipografia, padding e separatori; nessun dato nascosto.
5. Indicatori con altezza/raggio riconoscibili per famiglia.
6. Stati dei controlli coerenti nei due temi e wrapping del testo lungo.

Navbar, footer, hero, campi e formazioni mantengono la presentazione della Fase 2.

## 4. Screenshot comparativi

Aprire [COMPARATIVI.md](C:/Users/utente/Desktop/seria-a-2026-27/reports/design-phase3-20261018/COMPARATIVI.md).
Sono disponibili 20 coppie complete e viewport delle dieci rotte a 1440/390px.

Il confronto controllato usa le stesse risorse correnti nelle due versioni:
prima senza `component-system.css`, dopo con il modulo. Le risposte locali sono
congelate in memoria durante l'esecuzione, per non confondere gli aggiornamenti
fotografici concorrenti con l'effetto del CSS. Il riferimento originario prima
dei blocchi resta negli screenshot `before-*`, nel manifest SHA-256 e nei file
delle Fasi 0–2, che non sono stati sovrascritti.

## 5. Test e risultati

- `selector-usage.json`: mappa dell'uso dei selettori generici sulle dieci rotte,
  acquisita prima degli interventi.
- `block-A.json` … `block-F.json`: controlli dopo ciascun blocco; tutti superati.
- `isolated-final.json`: 10 rotte × 6 larghezze, con entrambe le versioni confrontate.
  Larghezze: 1440, 1050, 901, 768, 390 e 320px. Nessun overflow finale o errore JS.
- In ciascuna coppia confrontati link, sezioni, valori e colonne delle tabelle,
  offset sticky, campi/coordinate, gradienti delle card, colori e larghezze delle
  barre, stili e allineamento di navbar/footer: invariati.
- `focused.json`: 6 verifiche del primo rendering con app bloccata, compresi
  Champions, approfondimenti e legacy; nessun fondo chiaro nei casi Champions.
- Verificati menu mobile, filtri Giocatori, modalità del comparatore, scroll
  interno delle tabelle, filtri titolari/panchina e pannello personale Letture.
- Altre 4 rotte verificate: entrambi i fallback legacy, AEK Athens e calendario Inter.
- `keyboard-store.json`: attivazione filtro con Space, focus visibile, scroll
  con ArrowRight e intestazione sticky a 1px dal bordo durante lo scroll.
  Colori attivi stabilizzati: bianco su rgb(22,76,130). Controllo compatto 32px.
- Test CSS modules: PASS.
- Test store personale: PASS, inclusi deduplica, quote, contesti e persistenza.
- Test BetSelection: PASS, 6 Schedina e 137 MyCombo/137 prediction legs.
- `integrity.json`: 31 shell e 529 hash CSS verificati; zero nuove dichiarazioni
  !important. I file di implementazione di questo intervento sono elencati sopra.
- `git diff --check` sui CSS versionati di questo intervento: PASS; nuovo modulo
  controllato anche per spazi finali e assenza di !important.

## 6. Limiti, concorrenza e problemi aperti

- Il lavoro parallelo ha modificato/rimosso fotografie, metadati, CSS fotografici
  e renderer. `concurrent-changes.json` registra i file esterni rilevati rispetto
  alla baseline; non sono stati ripristinati o sovrascritti da questo intervento.
  Non si dichiara quindi identità dell'intero checkout o di tutti i dati rispetto
  allo stato iniziale. Il confronto isolato misura esclusivamente questo modulo CSS.
- Non è stato possibile esercitare un'aggiunta operativa Lettura→Schedina nelle
  due rotte candidate: non espongono righe selezionabili. La prova end-to-end è
  marcata NOT_AVAILABLE; la persistenza dello store è coperta dai test dedicati.
  Non sono stati inventati contratti, quote o selezioni per far passare la prova.
- Il diff check dell'intero checkout segnala una riga vuota finale in
  `css/player-statistics.css`, modificato dal lavoro concorrente. Il file non è
  stato ritoccato qui per correggere un cambiamento estraneo.
- Le verifiche sono rappresentative e mirate, non una prova di ogni fixture e
  ogni possibile combinazione di filtri. Nessuna nuova regressione rilevata
  nei controlli eseguiti.
- Nessun builder di dati/previsioni, commit, push o deploy eseguito da questo lavoro.

La Fase 3 si conclude qui. Nessun restyling delle singole pagine è stato avviato.
