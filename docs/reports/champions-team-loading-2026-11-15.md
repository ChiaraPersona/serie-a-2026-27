# Schede squadra Champions: proiezioni per club

Intervento locale del 15 novembre 2026, punto 3 dell'elenco di alleggerimento. Nessun commit, push o deploy.

## Risultato

Ogni scheda scarica una proiezione del club selezionato al posto dei tre archivi globali di rose registrate, registro giocatori MD3 e storico individuale. I dati canonici completi restano intatti per calcoli, ricostruzioni e verifiche interne.

Misure su Edge con gzip, cache vuota, font esterni esclusi e pacchetto pubblico rigoroso:

| Scheda | Tutti i JSON prima | Tutti i JSON dopo | Dati specifici club dopo |
| --- | ---: | ---: | ---: |
| Bayern | 1.573.456 byte | 747.410 byte | 15.917 byte |
| Bodø/Glimt | 1.573.456 byte | 745.579 byte | 14.086 byte |
| Fenerbahçe | 1.573.456 byte | 747.767 byte | 16.274 byte |
| Sabah | 1.573.456 byte | 740.416 byte | 8.923 byte |

Circa **52–53% in meno** sull'insieme dei download JSON di queste pagine. I tre archivi sostituiti richiedevano complessivamente circa 842 KB gzip. La misura di confronto include il piccolo indice introdotto dal nuovo caricatore anche nel percorso originale, con lista vuota per attivare gli archivi completi. La codifica storica precedente viene conservata nel confronto: non si confrontano arbitrariamente JSON completi con versioni già ottimizzate.

Il pacchetto completo passa da **264.881.836 a 261.831.860 byte**: **3.049.976 byte in meno**, circa **3,05 MB**. Le dimensioni del pacchetto sono prima della compressione HTTP. Le nuove proiezioni complete per club occupano 9.007.916 byte internamente e circa 4,60 MB nella copia pubblica compressa senza perdita di valori. Indice e codice aggiungono pochi KB.

Non è spazio liberato sul disco locale: i file canonici restano disponibili e le proiezioni sono copie aggiuntive. Il principale beneficio è il minor download e la minore quantità di dati da analizzare nel browser. Non sono stati misurati né modificati i tempi del motore dei pronostici.

## Implementazione e aggiornamenti

- `scripts/build-champions-team-data.cjs` prepara indice e 36 payload in `data/generated/champions-teams/`. Richiamato dal build delle pagine Champions dopo l'aggiornamento dello storico individuale. Comando autonomo: `npm run build:champions:teams`.
- La proiezione include la rosa selezionata, i numeri di maglia del club e lo storico del club. Dal registro MD3 include soltanto ID UEFA e storico precedente necessari al join esistente dove la rosa non possiede già quello storico. I dati completi esclusi dal browser rimangono negli originali.
- Abbinamenti esatti tramite ID UEFA e ID giocatore, con il solo alias canonico già esistente `bod-glimt` → `bodo-glimt`. Nessun lookup approssimativo.
- `js/pages/champions-team-data.mjs` condivide una richiesta per scheda e lascia procedere in parallelo le altre dipendenze. ID sconosciuti conservano la vista precedente; proiezioni incoerenti o incomplete generano un errore esplicito.
- Il filtro ufficiale resta applicato ai dati e le chiamate comuni della pagina continuano a richiedere il registro. Le proiezioni non introducono probabilità, quote, contratti, formule o sostituzioni.
- Il packager esclude gli originali globali MD3 e dello storico individuale; gli altri loro consumatori sono interni oppure usano già le proiezioni delle Letture. L'archivio rose completo resta pubblico perché serve alla panoramica Champions e agli altri dettagli.
- Si riusa il codec JSON senza perdita già esistente, soltanto nella copia di pubblicazione e soltanto quando diminuiscono sia i byte del pacchetto sia quelli gzip. Il caricatore standard ricostruisce i valori prima del rendering.
- Il manifest interno registra SHA-256 degli input e degli output: il packager rifiuta proiezioni non aggiornate. Un build identico riutilizza i file senza riscriverli. Il manifest è escluso dalla pubblicazione.
- Aggiornata la versione del modulo nella shell Champions per rinnovare il codice caricato dal browser. Nessuna nuova sezione pubblica sulle fonti; fonti e metadati interni conservati.

## Verifiche

- `npm run test:champions:teams:data`: tutti i 36 club, 144 viste confrontate integralmente: stagione corrente, storico di club, nazionali ufficiali e amichevoli. HTML identico, join giocatore identico, N/D preservati; nessuna richiesta ai tre archivi globali nelle schede valide.
- Verificati anche ID non validi, club sconosciuto, proiezione di un altro club e integrità degli originali.
- Edge, quattro club a 1440 e 390 px, due stagioni: **16 confronti visivi**, DOM identico e zero pixel differenti. Ricerca giocatori e cambio stagione funzionanti, nessun errore JS, dipendenza pubblica mancante o overflow.
- `test-package-pages.cjs --site output/champions-clubs-2026-11-15/site`: 2.345 file verificati; confronto completo dei JSON ricostruiti con gli originali, inclusi i payload delle Letture, e delle risorse statiche.
- Seconda esecuzione del compilatore: riuso delle 36 proiezioni confermato.

Evidenze e screenshot in `output/champions-clubs-2026-11-15/`, escluso da Git. Il riepilogo è `browser.json`. Il controllo browser ripetibile è `scripts/check-champions-team-data-browser.cjs`; richiede prima il pacchetto nella cartella `site/` indicata. Usa `PLAYWRIGHT_MODULES` se il runtime Playwright si trova in una directory diversa da quella locale predefinita.

Il confronto riguarda i quattro club e le due larghezze indicate. Non costituisce una misura del tempo di risposta del sito pubblicato o una verifica dei font esterni.
