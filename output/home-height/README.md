# Regressione altezza homepage

Misure in CSS px, Edge headless, viewport alto 1000 px, dati locali invariati. Baseline: `f6d1afa8^` (prima della sequenza Dentro la stagione). Ogni versione storica usa CSS e JavaScript del proprio commit, con gli stessi dati attuali: ricostruzione del layout, non fotografia dei dati storici. Stato dopo: HEAD `cafbee36`.

Il commit Glass `8bacb55c` non aumenta le dimensioni rispetto ad `ab048a87`. La regressione del calendario nasce in `a69c72a0`: min-height 44px della Lettura + padding 12px per lato + bordo 1px = 69px. Il layout precedente aveva righe da 53px. La correzione usa min-height 28px da 761px, mantenendo il target 44px sul mobile. Padding superiore calendario 22 -> 18px; margine intestazione 18 -> 12px.

| Larghezza | Elemento | Precedente | Dopo interventi | Corretto | Regola / evidenza |
|---|---|---:|---:|---:|---|
| 1440 | Pagina intera | 3344.00 | 3517.00 | 3347.00 | Somma delle sezioni |
| 1440 | Calendario | 619.00 | 792.19 | 622.19 | padding-top, margin-bottom intestazione; righe |
| 1440 | Riga calendario (prima partita) | 53.00 | 69.00 | 53.00 | `.home-match-reading` min-height (solo >=761px) |
| 1440 | Card editoriale (prima) | 304.50 | 387.09 | 302.09 | Stretch desktop; min-height 240px tablet / 230px mobile introdotti in f6d1afa8 |
| 1440 | Riga classifica | 57.00 | 57.00 | 57.00 | Nessuna variazione: td padding 13px / 10px mobile |
| 1440 | Hero | 473.11 | 473.11 | 473.11 | Invariata |
| 768 | Pagina intera | 3366.00 | 3617.00 | 3447.00 | Somma delle sezioni |
| 768 | Calendario | 619.00 | 789.50 | 619.50 | padding-top, margin-bottom intestazione; righe |
| 768 | Riga calendario (prima partita) | 53.00 | 69.00 | 53.00 | `.home-match-reading` min-height (solo >=761px) |
| 768 | Card editoriale (prima) | 129.16 | 240.00 | 240.00 | Stretch desktop; min-height 240px tablet / 230px mobile introdotti in f6d1afa8 |
| 768 | Riga classifica | 57.00 | 57.00 | 57.00 | Nessuna variazione: td padding 13px / 10px mobile |
| 768 | Hero | 360.00 | 360.00 | 360.00 | Invariata |
| 390 | Pagina intera | 4059.00 | 3892.00 | 3886.00 | Somma delle sezioni |
| 390 | Calendario | 881.47 | 799.94 | 793.94 | padding-top, margin-bottom intestazione; righe |
| 390 | Riga calendario (prima partita) | 75.19 | 70.84 | 70.84 | `.home-match-reading` min-height (solo >=761px) |
| 390 | Card editoriale (prima) | 108.50 | 230.00 | 230.00 | Stretch desktop; min-height 240px tablet / 230px mobile introdotti in f6d1afa8 |
| 390 | Riga classifica | 51.00 | 51.00 | 51.00 | Nessuna variazione: td padding 13px / 10px mobile |
| 390 | Hero | 460.00 | 460.00 | 460.00 | Invariata |

I nuovi selettori classifica restano da 36px. La struttura, le celle e le altezze del tabellone non cambiano. I gap delle sezioni non sono stati aumentati dal commit Glass. Il line-height di Giornata 7 (1.35) e tutti i colori/effetti Glass sono preservati. Le card editoriali su tablet/mobile mantengono lo spazio necessario al contenuto grafico aggiunto (icone e descrizioni); la loro altezza non viene forzata alle vecchie card prive di icone. Su mobile la pagina era gia piu corta della baseline: nessun ripristino artificiale verso un’altezza maggiore.

Verifica automatica: nessun overflow alle tre larghezze; hero, navbar, footer, tabella e selettori identici prima/dopo entro 0.01px. `node scripts/test-css-modules.js`: superato. Screenshot completi HEAD-*.png e corrected-*.png nella stessa cartella. Nessun build dati, commit, push o deploy.
