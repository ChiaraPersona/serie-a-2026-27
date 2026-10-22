# Rimozione del Calendario per squadra

## Risultato

Funzionalità pubblica rimossa: shell parametrico `squadra.html?team=…`, route `team`, renderer dedicato, pulsante "Calendario completo" nelle 20 schede squadra e relativi stili desktop/mobile. Le schede statistiche `statistiche-squadra/*.html` restano disponibili.

## File eliminati

| File | Byte |
| --- | ---: |
| squadra.html | 3.137 |
| js/pages/matches.js | 7.873 |
| css/pages/team.css | 74.022 |
| Totale file eliminati | 85.032 |

Ulteriori 9.821 byte rimossi dalle sole regole esclusive in `css/team.css`, `css/responsive.css`, `css/buttons.css`; 2.996 byte recuperati rigenerando gli altri CSS per pagina. Totale recuperato nei file di produzione censiti: **97.849 byte (circa 97,8 KB)**. La misura esclude i nuovi test e i report di verifica.

Le dichiarazioni CSS condivise sono conservate: nei selettori misti è stata rimossa solo la parte relativa al calendario eliminato. Restano i moduli condivisi `css/team.css`, `css/matches.css` e il componente `js/components/match-card.js`.

## Dipendenze conservate

- Calendario Serie A e report completi delle partite: `data/normalized/matches.json`.
- Calendari UEFA e Coppa: `data/normalized/european-fixtures-2026-27.json`, `data/normalized/coppa-italia-2026-27.json`.
- Calendario, report e dati Champions: `data/normalized/champions-league-2026-27.json` e relativi archivi.
- Fonti canoniche, quote, previsioni, archivi tecnici, snapshot, statistiche e rose.
- Importatori e builder dei calendari condivisi, motori previsionali, Lettura, Schedina, Champions e pagine statistiche.

La verifica SHA-256 iniziale ha confermato invariati tutti i 408 file protetti dopo la build. Durante il lavoro è poi intervenuto un aggiornamento esterno di `data/sources/probable-lineups-md8-2026-27.json` e del relativo raw HTML: non è stato prodotto dalla rimozione e non è stato annullato. Il controllo successivo identifica solo quel file fra i 408 hash confrontati; gli altri 407 rimangono identici.

## Build e accessi

- Rimossa la pagina dalla lista di generazione e la route dal router.
- Rimossa l'entry del relativo CSS per pagina.
- La pulizia iniziale della build elimina eventuali copie residue di `squadra.html` e `css/pages/team.css` in tutti i modi di build.
- Aggiornata l'invalidazione della cache dell'applicazione includendo il router, oltre alla versione del renderer delle pagine squadra.
- Rimossi i percorsi ritirati dai controlli browser generali e le aspettative di calendario dai test esistenti; conservate le verifiche sui dati condivisi.
- Nessun collegamento al calendario rimasto nei renderer pubblici o nei JSON canonici/normalizzati verificati.

## Verifiche pertinenti

- Due build del sito `node scripts/build-site.js --presentation-only`: PASS, pagina rimossa non rigenerata; successivo aggiornamento dei soli shell: PASS.
- `test-team-calendar-retirement.cjs`: PASS, assenza file/CSS/route, dipendenze condivise presenti e pulizia verificata in sette modalità di build tramite filesystem simulato.
- `test-retired-sections.cjs`: PASS.
- `test-initial-render.cjs`: PASS su 27 shell pubblici, hash e generazione idempotente.
- `check-team-calendar-retirement.cjs`: PASS su 10 casi (1440/390 px). Contenuti invariati salvo il pulsante rimosso; nessun overflow o errore JavaScript; link locali esistenti; cinque collegamenti interni delle pagine squadra e menu mobile funzionanti.
- `test-reading-browser-data.mjs`: PASS su tutte le 380 fixture, risultati completi, previsioni, contratti, salvataggi e rose.
- `test-schedina-loading.mjs`: PASS.
- `test-champions-md3-browser-data.mjs`: PASS, 18 fixture, 1.796 contratti, 186 selezioni salvate esercitate.
- `git diff --check` sui file interessati: PASS.

Non è stato ripetuto l'audit completo. Nessun comando di commit, push o deploy eseguito da questa sessione.
