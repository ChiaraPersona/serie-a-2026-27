# Overview Champions 2026/27

Modificati soltanto `js/pages/champions.js` e `css/champions.css`. Nessuna modifica all'HTML generato, ai dati, motori, pronostici, quote, contratti, store o renderer delle Letture. Nessuna rigenerazione, commit, push o deploy.

## Risultato

- Sfondo blu notte continuo con sfumature diffuse, navbar e footer scuri, testi e controlli leggibili. Il CSS usa esclusivamente la presenza del contenitore `.champions-overview` direttamente in `#app`: le viste squadra e Lettura non attivano il tema.
- Hero “Tutte le notti d'Europa” conservata, incluso il suo gradiente. Colori, gradienti, contenuto e collegamenti di tutte le 144 card confrontati con la versione precedente e invariati.
- Terza giornata predefinita: 18 fixture già presenti, tutte senza risultati nel dataset. Filtri, titolo del calendario, contesto della hero e conteggio si aggiornano insieme. Le scelte manuali rimangono attive fino a una nuova selezione o al reset esplicito.
- Prima e seconda giornata in archivio, chiuse inizialmente ed espandibili anche da tastiera; tutte le 36 gare e le Letture esistenti conservate.
- La seconda giornata ha soltanto 9 risultati su 18 nel calendario corrente: archiviata come scelta di presentazione, con etichetta “9/18 risultati disponibili”, senza dichiarare concluse le 9 gare ancora `scheduled` o ricostruire risultati.
- Riepilogo punti riferito alla fase campionato, 27/144 gare concluse; conteggi e calcoli già presenti conservati. Il timestamp originale viene identificato come snapshot del calendario, senza presentarlo come nuova verifica dei risultati.

## Verifiche

- Edge headless a 1440, 768 e 390 px: giornata 3, 18 gare, archivi 1/2 chiusi/aperti, ricerca tramite filtri giornata/squadra, scelta manuale preservata, reset, menu mobile e assenza di overflow/errori console.
- Confronto delle 144 card: HTML, URL, colore e gradiente invariati.
- Quattordici confronti DOM/stili a 1440/390: squadre Inter/Roma, Lettura Inter–Club Brugge, Lettura MD1 legacy, Lettura Milan–Atalanta, Coppa Italia, Schedina MD7. Nessuna regressione rilevata. Nei link assoluti del fallback è normalizzata soltanto la porta casuale del server locale; il recupero dell'hash originale è documentato in `baseline-origin.json`.
- Test esistenti superati: `test-champions-reading-page.mjs`, `test-champions-team-page.mjs` (36 squadre), `test-champions-branding.js`; `git diff --check` superato.
- Due letture iniziali stabili. Hash dei 13635 file tracciati della baseline: ammesse solo le due modifiche UI previste; nessuna variazione inattesa. HEAD della baseline e finale `fe04f0bb08b91dcf056d4ab01771275e5650b0e3`. Rispetto al primo controllo Git (`e21a9d3f`) un commit esterno aveva registrato soltanto report della precedente attività, senza variazioni dei contenuti applicativi.

## Artefatti

In questa directory: `before.json`, `after.json`, `integrity.json`, `baseline-origin.json`, script locali `check.cjs`, `visual.cjs`, `inspect.cjs`, `control-inspect.cjs`, due HTML diagnostici `control-0.html` / `control-1.html`, questo documento e screenshot `overview-*`, `calendar-*`, `calendar-top-*`, `archive-*`, `full-*` per 1440/768/390, oltre a `inspect.png`.

Gli HTML diagnostici sono copie statiche della vista di controllo, non nuove pagine applicative.
