# Pagine squadra: template editoriale

## Analisi e perimetro

Il renderer condiviso è js/team-squads.js; scripts/build-site.js genera le 20 shell HTML. Le pagine individuali usano #team-squad-app, mentre la directory squadre usa js/app.js: i due percorsi restano distinti. Il campo è js/components/lineup-field.mjs, condiviso con le Letture, e non è stato modificato.

Dipendenze esistenti: scripts/standings.js, scripts/objective-metrics.js, fetch dei JSON squadra/obiettivi/squadre/partite/profili tattici. Nessuna nuova dipendenza. Light Glass e Dark Glass riusano i token esistenti --glass-light-bg e --glass-dark-bg (basi #DCE9EC e #172E40); nessuna nuova variante.

## Struttura

1. Identità: stemma, nome, città, stadio, allenatore, modulo, navigazione.
2. La stagione in numeri: posizione calcolata dalla classifica esistente, punti, partite, gol fatti/subiti dai risultati esistenti. I mancanti restano N/D.
3. Formazione e stile: stesso campo e stessa griglia esterna, senza grande superficie esterna. Quattro indicatori disponibili del profilo storico, con periodo esplicito; per Frosinone si usano le metriche alternative già verificate del medesimo profilo (gol/gara, gialli/gara, partite, modulo), senza stimare possesso o passaggi assenti. Il profilo completo resta espandibile con fonti e limiti.
4. Statistiche approfondite: sintesi Attacco/Difesa/Possesso e costruzione; pannello inizialmente chiuso con tutti i valori già esposti, risultati, disciplina, casa/trasferta, stagioni 2026/27 e 2025/26, canali d'attacco e indicatori obiettivo. Le liste statistiche sono ora tabelle semantiche, mantenendo tutte le coppie etichetta/valore.
5. I protagonisti: primo classificato per gol, tiri e assist con lo stesso ordinamento originale; tutte le nove classifiche Top 3 e la rosa completa rimangono nei pannelli, con filtri e dettagli calciatore.
6. Comparatore: riga compatta e pannello chiuso con il componente originale, autocomplete, totali e /90.

I pannelli usano details/summary nativi, controllo da tastiera e aria-expanded sincronizzato con toggle; i tre principali hanno aria-controls. Nessun doppio caricamento dei dataset.

## File di implementazione

- js/team-squads.js: template e divulgazione progressiva; calcoli e ordinamenti originali riutilizzati.
- css/team.css: regole confinate a #team-squad-app.team-editorial, senza modificare board/campo/giocatori.
- css/styles.css: sola versione cache dell'import team.css.
- scripts/build-site.js: --team-pages-only salta policy, dataset e pagine estranee; aggiorna solo le 20 shell squadra.
- scripts/team-pages/test.js: aspettative aggiornate al nuovo ordine editoriale.
- scripts/check-team-editorial.cjs: audit browser ripetibile con baseline salvata.

Shell generate (solo versioni cache):

- statistiche-squadra/atalanta.html
- statistiche-squadra/bologna.html
- statistiche-squadra/cagliari.html
- statistiche-squadra/como.html
- statistiche-squadra/fiorentina.html
- statistiche-squadra/frosinone.html
- statistiche-squadra/genoa.html
- statistiche-squadra/inter.html
- statistiche-squadra/juventus.html
- statistiche-squadra/lazio.html
- statistiche-squadra/lecce.html
- statistiche-squadra/milan.html
- statistiche-squadra/monza.html
- statistiche-squadra/napoli.html
- statistiche-squadra/parma.html
- statistiche-squadra/roma.html
- statistiche-squadra/sassuolo.html
- statistiche-squadra/torino.html
- statistiche-squadra/udinese.html
- statistiche-squadra/venezia.html

## Verifiche

- 20/20 squadre a 1440px; Atalanta, Inter (dati completi) e Frosinone (profilo tattico parziale) anche a 768 e 390px: 26 layout.
- Confronto con baseline precedente a questa richiesta: identici tutti i valori delle statistiche stagionali (11 gruppi per squadra), nove classifiche, rosa completa, comparatore iniziale e markup interno del campo.
- Geometria e stili di ogni elemento renderizzato nel campo invariati, tolleranza 0.01px per arrotondamenti; zero collisioni tra i giocatori. Le definizioni SVG invisibili non hanno coordinate utili e sono escluse dalle sole coordinate relative.
- I tre pannelli principali partono chiusi e si aprono/chiudono da tastiera. Selezione comparatore, dettagli calciatore, stagione precedente, filtri rosa e tabelle complete verificati.
- Nessun overflow orizzontale della pagina, anche con pannelli e rosa aperti; lo scorrimento delle tabelle ampie resta interno.
- 10 confronti browser sulle altre pagine: homepage, directory squadre, Lettura, Schedina e Champions a 1440/390px; dimensioni e stili identici al CSS precedente entro 0.02px.
- Superati node scripts/team-pages/test.js, node scripts/test-css-modules.js, node scripts/test-lineup-field.mjs e controllo sintassi JS.

| Viewport | Campo prima | Campo dopo | Risultato |
|---|---|---|---|
| 1440px | 521.1875 × 600px | 521.1875 × 600px | Invariato, nessuna collisione |
| 768px | 574 × 600px | 574 × 600px | Invariato, nessuna collisione |
| 390px | 314 × 520px | 314 × 520px | Invariato, nessuna collisione |

Screenshot Atalanta, Inter e Frosinone: TEAM-WIDTH.png (iniziali), TEAM-WIDTH-expanded.png (pannelli aperti), TEAM-WIDTH-field-before/after.png (campi). Evidenze numeriche in baseline-report.json, responsive-report.json e outside-regressions.json.

## Limiti e stato finale

Nessun problema funzionale aperto nei controlli eseguiti. Le lacune delle fonti restano tali: nessuna stima aggiunta, nessuno zero sostituito a un valore mancante. Non sono stati modificati dataset, formule, motore statistico, pronostici o quote. Nessun commit, push o deploy eseguito da questa attività.
