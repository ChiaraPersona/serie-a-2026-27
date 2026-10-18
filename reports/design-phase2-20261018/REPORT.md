# Armonizzazione grafica — Fase 2

Intervento limitato a canvas, temi, geometria esterna, titoli editoriali,
navbar e footer. Nessuna fase successiva avviata. Nessun framework, contenitore
o renderer introdotto; nessun builder di dati o previsioni eseguito.

## File modificati

- `css/page-background.css`: i canvas consumano `--ds-page-background` e
  `--ds-color-page`; rimossi i gradienti duplicati del tema perla.
- `css/site-layout.css`: geometria esterna e tipografia editoriale con ruoli
  espliciti; navbar a due temi; spaziature del footer. Nessuna regola su strong.
- `css/reading-detail.css`: canvas delle Letture allineato al tema condiviso,
  gutter e padding esterni dai token, intestazioni editoriali in Anton.
- 31 shell HTML: aggiornati esclusivamente i collegamenti CSS con gli hash
  del percorso di presentazione `applyStyleLinks()` di `scripts/site-styles.js`.
  Elenco completo in `changed-html.json`.
- File interni di baseline, verifiche e screenshot in questa directory.

`css/tokens.css` è rimasto invariato ed è il riferimento del lavoro.
Nessuna modifica ai renderer JavaScript, a initial-presentation.js o alla
policy public-presentation.js. Struttura e ordine delle sezioni HTML invariati.

## Regole applicate

### Canvas e temi

- Serie A e Coppa Italia: perla #F8F7F4 e i quattro gradienti ghiaccio dei token.
- Anche le Letture Serie A utilizzano ora questo canvas, invece della precedente
  combinazione verde/grigio specifica.
- Champions: base #07152C e gradienti blu condivisi su indice, schede squadra,
  approfondimenti e fallback legacy. Glass blu e palette delle squadre conservati.
- Lo stato statico `body[data-page=champions]` seleziona il tema senza attendere
  il codice applicativo. Il bootstrap delle Letture rimane parser-blocking e
  utilizza gli attributi già esistenti.
- Le barre sticky delle Letture ricevono lo stesso canvas con base opaca,
  mantenendo la leggibilità durante lo scorrimento.

### Geometria

- Contenitore massimo 1050px; gutter 24px, ridotto a 16px fino a 600px.
- Navbar, main e contenuto del footer hanno identica larghezza e allineamento
  in tutte le 60 combinazioni controllate.
- Pagine ordinarie: padding esterno 32/64px, 24px in alto su mobile.
- Home: padding 24/48px; sezioni principali distanziate di 48px.
- Sezioni principali ordinarie: 64px su desktop e 48px su mobile.
- Intestazioni esterne: margine inferiore 24px.
- Le Letture mantengono la propria struttura e usano gutter condiviso e
  padding 24/64px; su mobile il padding superiore passa da 16 a 24px.
- Nessun overflow nascosto sul documento, nessuna riscrittura delle griglie
  funzionali o delle proprietà di scorrimento delle tabelle.

### Tipografia

- H1 principali ordinari: Anton, clamp(40px,4vw,48px), interlinea 1.15.
- Le due hero principali esistenti, Home e Champions, possono arrivare a 76px,
  attraverso il token dedicato. Immagine della Home e decorazioni conservate.
- H2 editoriali individuati esplicitamente: Anton,
  clamp(24px,3vw,32px), interlinea 1.15, peso 400.
- Inter e le dimensioni esistenti rimangono su dati, tabelle, filtri,
  sottotitoli tecnici e intestazioni interne dei componenti.
- Nessuna regola globale aggiunta a h2, h3 o strong. Nessuna modifica a quote,
  punteggi, nomi/coordinate dei giocatori o titoli tecnici dei pannelli.
- L'H1 accessibile ma invisibile della shell Lettura non è un titolo visivo:
  le sue dimensioni precedenti rimangono intatte. Anche il titolo tecnico
  del referto nel fallback legacy resta distinto dall'H1 principale di pagina.
- Il titolo esterno del comparatore è incluso nella scala editoriale: questo
  riduce l'altezza totale del pannello, senza alterarne controlli o risultati.

### Navbar e footer

- Navbar ancora arrotondata e sticky, stessi link e breakpoint del menu.
- Glass, testo, stato attivo e focus utilizzano i token del tema corrente.
- Menu mobile scuro su Champions; il pulsante Menu ha superficie e testo
  coerenti, eliminando la precedente combinazione testo chiaro/superficie chiara.
- Footer ancora blu, con contenuti, collegamenti e layout responsive esistenti.
  Uniformati font e spaziature, senza aggiungere elementi.

## Differenze visive intenzionali

1. Canvas Champions scuro anche prima del caricamento, al posto del perla.
2. Canvas delle Letture Serie A coerente con il resto del sito.
3. H1 ordinari più compatti; ritorno ad Anton su indice Letture e identità squadra.
4. H2 editoriali uniformi; titoli interni tecnici e numeri preservati.
5. Spazi esterni e footer ricondotti alla scala dei token.
6. Navbar coerente nelle due palette, compreso il menu mobile.

I cambiamenti di altezza delle sezioni e della pagina dovuti ai titoli sono attesi.
Non sono stati uniformati raggi, bordi, sfondi o ombre delle diverse card.

## Screenshot comparativi

Aprire [COMPARATIVI.md](C:/Users/utente/Desktop/seria-a-2026-27/reports/design-phase2-20261018/COMPARATIVI.md): contiene le 20 coppie prima/dopo
delle dieci rotte a 1440 e 390px, con screenshot completi e viewport.

La baseline originale della Fase 0/1 rimane in
`reports/design-foundations-20261018/`. È stata aggiunta una baseline immediata
prima della Fase 2 per separare le modifiche grafiche dagli aggiornamenti
preesistenti alle fotografie. Conteggi di sezioni e tabelle confrontati anche
con le 20 viste della baseline originaria.

## Test e risultati

- `before.json` e `after.json`: 10 rotte × 6 larghezze = 60 viste per stato.
  Larghezze: 1440, 1050, 901, 768, 390, 320px.
- `verification.json`: allineamento e massimo 1050px corretti in 60/60 viste.
- 192 confronti campionati di stili e testi dei componenti protetti: invariati.
  Inclusi card partita, card Coppa, tabelle, campi e intestazione punteggio.
- Nessun cambiamento dei collegamenti, del numero di sezioni/tabelle/controlli
  nelle 60 viste; nessun errore JavaScript.
- 31 shell HTML senza variazioni fuori dai collegamenti CSS/bootstrap;
  498 hash CSS corrispondenti ai contenuti serviti.
- `focused-final.json`: 6 verifiche con app bloccata, inclusi approfondimenti Champions,
  tema chiaro e legacy. Controllati caricamento CSS e pixel del canvas prima
  dell'avvio dell'applicazione; nessun fondo chiaro nei casi Champions.
- Menu mobile aperto/chiuso nei due temi: PASS, stessi 7 collegamenti.
- Filtro Giocatori, modalità per90 del comparatore e scorrimento interno della
  tabella: PASS.
- Filtri titolari/panchina e apertura/chiusura schedina nelle Letture delle due
  competizioni: PASS.
- Altre 4 rotte verificate a 390px: entrambi i fallback legacy, AEK Athens,
  calendario Inter; nessun overflow.
- `node scripts/test-css-modules.js`: PASS.
- `node scripts/test-personal-betslip.mjs`: PASS, inclusa persistenza.
- `node scripts/test-betting-selection-contract.js`: PASS.
- `git diff --check`: PASS.
- I file dati, motori, renderer, policy e identificativi sono stati confrontati
  con gli hash acquisiti prima di questo intervento. Nessuna nuova variazione
  fuori dall'ambito dei tre CSS e dei collegamenti delle shell.

## Problemi aperti e limiti

- **Giocatori a 320px:** overflow preesistente di 3px. La diagnosi identifica
  un testo lungo in `.player-comparator-head .player-photo-details p`, che supera
  la colonna stretta del profilo. Non deriva dalla rail dei filtri o dalla tabella.
  Nessun intervento sul comparatore, in rispetto della protezione richiesta.
  La stessa unica combinazione risulta in overflow prima e dopo: 59/60 viste
  senza overflow e nessuna regressione aggiunta.
- Le verifiche funzionali sono mirate; non è stata esercitata ogni selezione di
  ogni partita. MyCombo e Preferiti non sono stati modificati; i contratti comuni
  e lo store personale sono coperti dai test pertinenti.
- Il test generale app-modules aveva già una nota incongruenza MD1–MD6/MD7
  rilevata in Fase 1; non è stato modificato o presentato come superato.
- Modifiche preesistenti del lavoro sulle fotografie/diritti sono state lasciate
  intatte. Lo stato iniziale è registrato in `baseline-git.txt`.
- Nessun commit, push o deploy eseguito da questo intervento.

La Fase 2 si arresta qui. Eventuali interventi successivi su card, tabelle o
altri componenti richiedono un nuovo incarico.
