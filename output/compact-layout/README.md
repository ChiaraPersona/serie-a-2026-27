# Layout compatto condiviso — verifica 16 ottobre 2026

Modifiche esclusivamente CSS; nessun dato, previsione, campo formazioni o logica applicativa modificati. Nessun commit, push o deploy.

## File e regole
- css/base.css: --max 1180 -> 1050px; --page-gutter 24px; --container-width fluido.
- css/layout.css: navbar legata alla variabile condivisa; allineamento navbar/main/footer; solo homepage: padding superiore 38 -> 24px, sezioni principali 82 -> 48px, titolo-contenuto 26 -> 20px (classifica 18 -> 20px), spazio finale 120 -> 72px.
- css/home.css: righe calendario desktop padding verticale 12 -> 10px; min-height hero desktop 360 -> 320px. L'altezza reale della hero resta circa 473px a 1440px per conservare tutto il testo, immagine e punto focale invariati. Font e colori invariati.
- css/responsive.css: margini mobile 16px fino a 600px; regola finale condivisa per superare gli override storici. Correzione overflow tabella a 901px preservata.
- css/styles.css: versioni dei quattro moduli CSS aggiornate.

## Misure a 1440px
- Contenitore: 1180 -> 1050px; margini 130 -> 195px, navbar/main/footer allineati.
- Homepage: 3347 -> 3173px, -174px (-5,2%). La riduzione richiesta riguarda gli spazi eccessivi, non l'intera altezza della pagina.
- Calendario: 622,19 -> 582,19px; card laterali con la stessa altezza complessiva.
- Controllo con sola nuova larghezza, mantenendo tutte le spaziature precedenti: 3347px, contenitore 1050px. Nessun aumento netto dovuto al ritorno a capo a 1440px. La riduzione finale deriva dalla spaziatura e dal padding delle righe, non dalla riduzione dei font.

## Responsive
| Viewport | Contenitore finale | Altezza home finale | Overflow documento |
| --- | --- | --- | --- |
| 1920 | 1050 | 3173 | No |
| 1440 | 1050 | 3173 | No |
| 1280 | 1050 | 3169 | No |
| 1050 | 1002 | 3083 | No |
| 901 | 853 | 3283 | No |
| 768 | 720 | 3233 | No |
| 390 | 358 | 3796 | No |
| 320 | 288 | 4092 | No |

Homepage: 10 partite, 20 squadre per vista classifica; cambio giornata avanti/indietro, due stagioni, tre viste e ordinamento punti verificati a tutti gli otto viewport. Scorrimento tabella confinato al wrapper; nessuna colonna rimossa. Target Lettura mobile 44px preservato.

Altre pagine: 48 controlli completati sugli stessi otto viewport per statistiche squadre, Inter (pagina generata), Lettura Frosinone-Sassuolo MD7, Schedina, Coppa Italia e Champions League, attendendo la scomparsa del caricamento. Nessun overflow o errore JavaScript. Nessuna eccezione di larghezza necessaria. Controlli automatici geometrici sulle altre pagine; ispezione visiva degli screenshot homepage desktop e mobile.

Test: node scripts/test-css-modules.js e git diff --check superati. Non necessario rigenerare HTML o dati: gli stili sono condivisi e importati direttamente.

Evidenze: report.json, supplement.json, width-only.json; screenshot before/after a 1440 e 390px. check.cjs e supplement.cjs riproducono i controlli con Edge/Playwright. La cartella before conserva i CSS esatti precedenti per il confronto.
