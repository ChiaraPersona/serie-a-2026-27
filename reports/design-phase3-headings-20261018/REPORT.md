# Fase 3 — integrazione intestazioni e sottotitoli

## Risultato

Intestazioni ordinarie basate su un solo ruolo `.page-heading`, compresa
Schedina sia nell’archivio sia nelle giornate. Rimossi i sottotitoli editoriali
dal markup generato; nessun paragrafo è stato nascosto tramite CSS.

I metadati di competizione, stagione e giornata restano visibili: nelle
intestazioni ordinarie condivise seguono il titolo, così la presenza di una
competizione non sposta verticalmente l’H1 rispetto alle altre pagine.
Non sono sottotitoli descrittivi. Conservati anche data, ora, stadio,
allenatore, modulo, nomi e informazioni statistiche degli approfondimenti.

## File modificati rispetto alla baseline di questa integrazione

| File | Intervento |
| --- | --- |
| `css/site-layout.css` | Ruolo condiviso per geometria, tipografia e metadati delle intestazioni ordinarie. Nessun nuovo `!important`. |
| `js/core/utils.js` | Il renderer `hero()` non emette più la descrizione editoriale; mantiene firma compatibile, metadati e contenuto accessorio operativo. Aggiunge il ruolo condiviso alle sole intestazioni ordinarie. |
| `js/pages/readings.js` | Intestazione dell’indice Letture con lo stesso ruolo; rimosse introduzione descrittiva e soprattitolo editoriale. |
| `js/pages/champions.js` | Rimossa la descrizione sotto il titolo della hero; spostata l’indicazione dinamica della giornata nel testo funzionale del calendario, mantenendo il selettore usato dai filtri. |
| `scripts/site-styles.js` | Invalidazione della cache del grafo JavaScript quando cambiano i renderer delle intestazioni; preservata la versione base di ogni pagina e mantenuta l’idempotenza. |
| 31 shell HTML | Aggiornati esclusivamente collegamenti/versioni delle risorse, usando `applyStyleLinks()` sulle shell presenti. Nessuna ricostruzione del contenuto. |
| Questa directory | Baseline, script, risultati e screenshot interni. |

Le shell comprendono gli 11 HTML alla radice e le 20 pagine in
`statistiche-squadra/`. Non sono stati modificati dati, motori, store,
componenti statistici o renderer delle schede squadra.

Il checkout conteneva già modifiche della Fase 3. Durante il lavoro HEAD è
avanzato a `45701dac` tramite un’operazione esterna a questo intervento:
per questo il solo diff finale rispetto a HEAD non rappresenta tutte le
modifiche qui descritte. Il confronto è stato eseguito contro le copie
acquisite prima dell’integrazione, conservate in `baseline/`. Non ho eseguito
commit, push o deploy e non ho ripristinato modifiche altrui.

## Regole applicate

- H1: `--ds-font-display` (Anton), `--ds-title-page` (`clamp(40px,4vw,48px)`),
  peso 400, interlinea `--ds-leading-title` (1,15), allineamento a sinistra,
  margine proprio zero e wrapping locale.
- Intestazione: superficie aperta, nessuna cornice o ombra decorativa;
  padding zero e margine inferiore `--ds-space-6` (32 px).
- Padding superiore del contenuto: 32 px, 24 px fino a 760 px;
  gutter e limite di 1050 px già esistenti mantenuti.
- Metadati: Inter, 12 px, peso 600, interlinea 1,55, distanza 8 px dall’H1.
- Il primo elemento successivo non somma un ulteriore margine superiore.
- Le hero principali Home e Champions mantengono struttura, carattere e
  scala maggiore; rimossa soltanto la descrizione editoriale.
- Nessuna regola aggiunta su `strong`, titoli tecnici, tabelle o card.

### Misurazioni H1: Squadre, Giocatori, Letture, Coppa Italia e Schedina

Le cinque pagine condividono questi valori effettivi, oltre a font, peso,
interlinea e margini identici. Coordinate in pixel nel viewport a scroll zero.

| Viewport | X | Y | Dimensione |
| --- | ---: | ---: | ---: |
| 1440 | 195 | 112 | 48 |
| 1050 | 24 | 112 | 42 |
| 901 | 24 | 112 | 40 |
| 768 | 24 | 102 | 40 |
| 390 | 16 | 94 | 40 |
| 320 | 16 | 94 | 40 |

## Differenze visive intenzionali

Schedina perde il pannello autonomo dell’intestazione e si allinea alle altre
pagine ordinarie. Letture perde il rientro laterale specifico del titolo.
Le introduzioni editoriali rimosse non lasciano contenitori o spazi riservati.
I metadati condivisi passano sotto l’H1; i metadati delle schede squadra e
delle partite conservano la loro disposizione funzionale.

Non sono stati rimossi sottotitoli delle sezioni interne, istruzioni dei
filtri, descrizioni dei grafici o sintesi delle analisi. Nelle schede squadra
e nelle Letture esaminate, i testi sotto il titolo sono metadati da proteggere,
quindi non è stata necessaria una rimozione indiscriminata nei relativi renderer.

## Screenshot comparativi

Aprire `confronto.html`: 16 coppie prima/dopo, otto viste principali a 1440
e 390 px. Ogni immagine è apribile nella sua risoluzione originale.

Esempi Schedina:

- Desktop: `before-6-1440.png` / `after-6-1440.png`.
- Mobile: `before-6-390.png` / `after-6-390.png`.
- Giornata: `before-7-390.png` / `after-7-390.png`.

La baseline è stata acquisita prima di modificare i file. I dati sono gli
stessi nei due stati. Le animazioni vengono disattivate soltanto nel test
finale, per rendere ripetibili misurazioni e screenshot.

## Verifiche e risultati

| Verifica | Risultato |
| --- | --- |
| Confronto principale | 136 coppie prima/dopo: pagine principali, giornata Schedina, Fantacalcio, Arbitri, calendario squadra, Letture Serie A e Champions con layout universale e legacy alle sei larghezze; incluse 20 schede Serie A a 1440/390. |
| Schede Champions | Altre 72 coppie: tutte le 36 schede con ID canonici a 1440/390. Titoli, metadati, tabelle, formazioni, controlli e collegamenti invariati. |
| Overflow | Nessun overflow del documento nelle viste finali controllate. |
| Errori JavaScript | Nessun errore nelle navigazioni controllate. |
| Contenuti protetti | Identici prima/dopo: testo delle tabelle, giocatori e stili di posizione delle formazioni, controlli, collegamenti, numero di sezioni e metadati. |
| Primo rendering | 6 casi superati con applicazione bloccata prima dell’avvio: tema chiaro Serie A, tema scuro Champions, dettagli e fallback legacy. CSS caricati e colore di sfondo verificato anche sui pixel dello screenshot. |
| Funzionalità | Menu mobile nei due temi, filtro Giocatori, comparatore, scroll interno e colonne sticky, filtri formazioni Letture e pannello personale: verifiche superate. |
| Champions | L’indicazione dinamica della giornata conserva il proprio elemento nel calendario; nessun errore di inizializzazione o filtro. |
| Tastiera | Focus visibile, attivazione filtro e scorrimento tabella superati; controlli compatti conservati a 32 px. |
| Wrapping Giocatori | Correzione locale a 320 px ancora efficace; documento largo 320 px. |
| Store | `test-personal-betslip.mjs`: superato, inclusa persistenza. |
| Contratto selezioni | `test-betting-selection-contract.js`: superato; 6 Schedina, 137 MyCombo e 137 prediction legs verificate. |
| CSS | `test-css-modules.js`: superato; entry point 994 byte. |
| Cache | `applyStyleLinks()` idempotente sulle 31 shell; hash CSS e suffisso del grafo JS coerenti. |
| Sintassi | Controllo sintattico superato per i tre moduli JavaScript modificati. |
| Integrità dati | SHA-256 identici per tutti i 9.114 file in `data/`, ricontrollati al termine. Nessun nuovo file dati. |
| Diff | `git diff --check` superato. |

Sono stati usati soltanto il percorso di presentazione e test pertinenti:
nessun `npm run build`, builder dati, previsioni o aggiornamento formazioni.

I risultati dettagliati sono in `before.json`, `after.json`, `comparison.json`,
`champions-before.json`, `champions-after.json`, `champions-comparison.json`,
`focused.json` e `keyboard-store.json`. Una route supplementare con
`team=AEK` controlla il fallback per ID non riconosciuto; il controllo delle
36 schede autentiche usa separatamente tutti gli ID canonici.

## Limiti e problemi aperti

Non sono state rilevate regressioni nell’ambito verificato. La verifica UI
completa di una nuova selezione Lettura → Schedina non è stata esercitata:
nelle due Letture operative usate dal test non erano presenti righe
selezionabili. La persistenza è verificata dal test dello store; il limite
è registrato anche in `keyboard-store.json` e non è stato aggirato creando
selezioni artificiali o modificando dati.

La Fase 3 termina qui. Nessun avvio del restyling delle singole pagine.
