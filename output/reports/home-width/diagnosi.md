# Homepage: diagnosi e verifica larghezza

Verifica locale in Microsoft Edge/Chromium, 16 ottobre 2026. Misure in CSS px, tolleranza delle asserzioni 1 px; nessun overflow residuo nemmeno intero. Artefatti completi: `before.json` e `after.json`.

## Causa riprodotta

In `css/responsive.css`, la media query `min-width:901px` impostava `.home-standings .table-wrap { overflow-x:visible }`. La tabella ha colonne fissate da `css/home.css`: prima colonna 54px, colonne dalla terza 72px. Anche con `width:100%;min-width:0`, il layout tabellare fisso conserva una larghezza minima effettiva di 918px. A viewport 901px il main misura 861px, la tabella parte da x=21 e termina a x=939: html e body diventano larghi 939px. Il difetto compare in tutte le sei viste della classifica.

Gli elementi oltre il viewport sono la tabella e suoi discendenti: thead, tbody, righe, ultima colonna th/td e relativo pulsante `.standings-sort`. L'elenco elemento per elemento, con rettangoli e contenitore di clipping, è in `before.json`, `initial.outside` e `states[].outside`. Dopo la correzione questi discendenti possono ancora avere rettangoli oltre il viewport ma sono racchiusi da `.table-wrap` con scroll interno e non allargano il documento. Nessun elemento privo di tale contenimento supera il viewport.

Non è stato riprodotto overflow alle cinque larghezze obbligatorie prima della modifica: l'estensione del controllo a 901px ha individuato la causa reale. Griglie dashboard e contenitori principali rientravano già nel viewport; non richiedevano modifiche. Nessun elemento `100vw`, trasformazione, posizione assoluta o pseudo-elemento è risultato responsabile dell'estensione del documento osservata. Il `100vw` presente nella prima regola storica di padding della navbar è sovrascritto dal padding della definizione finale.

## Correzione

- `css/responsive.css`: `.home-standings .table-wrap` mantiene `overflow-x:auto` anche da 901px; colonne e contenuti restano invariati.
- Stesso file: `body[data-page="home"]` definisce `--home-container-width` con la formula del main esistente. `.site-header`, `main` e `.site-footer-inner` usano questa stessa misura: massimo `var(--max)` = 1180px, margini 20px o 10px sotto 581px. Hero, dashboard e classifica rimangono nel main già condiviso. Il footer esterno resta a larghezza viewport.
- `css/styles.css`: versione dell'import responsive aggiornata.
- `scripts/check-home-width.cjs`: verifica ripetibile delle misure, allineamento, elementi esterni, viste classifica, navigazione giornate, menu e screenshot.

Nessun `overflow-x:hidden` aggiunto a html/body. Nessuna modifica a font, immagine hero, colori, card, dati, renderer o HTML. CSS servito direttamente: non è necessaria rigenerazione delle altre pagine.

## Misure

| Viewport (innerWidth) | html/body prima | html/body dopo | Contenitore dopo |
|---:|---:|---:|---:|
|1440|1440 / 1440|1440 / 1440|1180|
|1280|1280 / 1280|1280 / 1280|1180|
|1024|1024 / 1024|1024 / 1024|984|
|980|980 / 980|980 / 980|940|
|901|939 / 939|901 / 901|861|
|768|768 / 768|768 / 768|728|
|390|390 / 390|390 / 390|370|
|320|320 / 320|320 / 320|300|

Misure contenitori prima/dopo: a 768px navbar 748 -> 728, main/hero/dashboard/classifica 728 -> 728; a 390px interno footer 362 -> 370 e a 320px 292 -> 300. Desktop 1440/1280: tutti i contenitori restano 1180px. Rettangoli completi di navbar, main, hero, dashboard, calendario, classifica, table-wrap e footer nei JSON.

## Hero e screenshot

Una sola `main .hero` in tutte le prove, anche dopo navigazione e scroll fino al footer. Posizione calcolata `relative`, non fixed/sticky. La navbar è sticky; la hero non la segue. Il renderer `js/pages/home.js` inserisce una sola chiamata a `hero()` nel contenuto del main. Le catture full-page e viewport prodotte in questo controllo mostrano una sola hero. La duplicazione segnalata non è riproducibile; senza lo screenshot originario non si può certificare se dipendesse da stitching, cattura o altro. DOM lasciato invariato.

Screenshot finali: `after-1440-full.png`, `after-1440-viewport.png`, `after-390-full.png`, `after-390-viewport.png`.

## Validazione

PASS: otto viewport, sei viste classifica per viewport, menu aperto a 768/390/320, cambio giornata avanti/indietro, assenza errori JS, nessun elemento esterno non contenuto, allineamento dei cinque contenitori. PASS test CSS modulare e `git diff --check`. Nessun commit, push o deploy.
