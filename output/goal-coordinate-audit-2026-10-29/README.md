# Verifica preliminare delle coordinate gol Serie A 2026–27

Data: 29 ottobre 2026. Perimetro: le 88 gare concluse presenti nel registro canonico al momento dell'audit, per 274 gol. Non certifica eventuali gare concluse successivamente o non ancora registrate.

## Esito

La copertura delle coordinate è completa nel perimetro verificato: 274 eventi gol con coordinate numeriche, distribuiti su tutte le gare con gol. Il totale per partita coincide con entrambi i punteggi canonici dopo l'esclusione, solo nell'audit, di un evento vuoto duplicato. Nessuna coordinata esce dai limiti del campo usati dal renderer originale.

Non equivale ancora a un dataset pronto per la pubblicazione: 250 eventi hanno una corrispondenza esatta e univoca di nome/alias e minuto con i marcatori canonici; 24 restano segnalati. Le 69 gare interamente riconciliate sono un conteggio conservativo: alias non registrati e rappresentazioni diverse del recupero producono segnalazioni che non dimostrano, da sole, errori nei referti. L'audit non applica somiglianze di nome né correzioni dei minuti.

## Evidenze e anomalie

- Il registro `data/sources/match-results-2026-27.json` contiene 274 marcatori, senza coordinate. I referti HTML originali contengono `playByPlay.events[].coordinates`.
- Sono stati esaminati 100 referti locali, incluse copie alternative della stessa partita; sono state selezionate evidenze per tutte le 88 fixture mediante l'ID numerico dell'URL canonico. Dieci referti della giornata 6 sono stati scaricati nella sottocartella `raw/` di questo audit.
- Inter–Udinese, giornata 4: nove eventi grezzi per otto gol. Idrissa Guèye compare due volte al minuto base 90: un evento privo di coordinate e uno con coordinate e recupero esplicito. Il duplicato vuoto è registrato ed escluso esclusivamente dal conteggio dell'audit.
- Milan–Venezia, giornata 2: il marcatore canonico al minuto 89 è Thierry Correia; il referto grezzo e la pagina pubblica indicano un autogol di Redouane Halhal. È una discordanza reale da chiarire prima dell'associazione pubblica della posizione a un giocatore. Nessuna correzione è stata applicata.
- Sette eventi sono marcati come autogol: vanno mantenuti distinti dai normali tiri in gol. La posizione associata all'autogol non certifica il punto del tiro originario di un attaccante.

## Scala e significato

Il renderer pubblico StatMuse `https://www.statmuse.com/_astro/shots.CZns2Qwa.js`, salvato in `raw/shot-renderer.js`, usa un campo SVG `0 0 486.5 291.9` e trasforma i dati con:

```text
svgX = (10000 - x) * 486.5 / 10000
svgY = (6000 - y) * 291.9 / 6000
```

Questa verifica conferma scala e trasformazione visuale del provider. Le coordinate identificano la posizione associata all'evento tiro/gol sulla sua mappa: non sono coordinate di tracking certificate in metri e non identificano il punto d'ingresso del pallone nello specchio della porta. Un'eventuale normalizzazione di tutte le azioni verso una sola porta richiede una regola distinta per squadra e autogol.

## Riproduzione e limiti

Eseguire `scripts/audit-serie-a-goal-coordinates.cjs` con Node.js. Legge i dati canonici, gli HTML in `tmp/` e quelli in `output/goal-coordinate-audit-2026-10-29/raw/`; scrive soltanto `local-coverage.json` nella cartella dell'audit. Non scarica automaticamente nuovi referti, non aggiorna dataset operativi e non esegue builder.

`local-coverage.json` conserva risultati per fixture, referto selezionato, eventi, coordinate, clock originale, ID provider e controlli sui marcatori. Il campo `complete` indica esclusivamente disponibilità delle coordinate e compatibilità del punteggio, non approvazione all'integrazione.

Prima dell'integrazione: riconciliare i 24 eventi segnalati usando identità canoniche e clock espliciti, chiarire Milan–Venezia, rendere esplicita la deduplicazione e la rappresentazione degli autogol. Fonti e metadati rimangono interni secondo AGENTS.md.

Nessuna modifica ai dati del sito, alle formule o alle selezioni operative; nessun commit, push o deploy eseguito dall'audit.

Fonti esterne consultate: https://www.statmuse.com/fc/match/8-28-2026-mil-vs-ven-112091 ; https://seriea.balldontlie.io/ ; https://www.fotmob.com/leagues/55/overview/serie-a . La disponibilità dell'API BALLDONTLIE è documentata ma non è stata verificata con una chiave autenticata e non è necessaria per il risultato di copertura sopra riportato.
